import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Principal } from "@icp-sdk/core/principal";
import { createActor } from "../backend";
import type { AppRole } from "../data/roles";

/**
 * Rollestyring mot backend (F11).
 *
 * Rollene ligger i canisteren, ikke i frontend-koden. Backend haandhever
 * tilgangen paa caller - denne hooken viser bare det backend allerede har
 * bestemt. Se FUNKSJONSBESKRIVELSE.md F11.3.
 */

/** Backend bruker Candid-variant: { supporter: null } osv. */
type BackendRole =
  | { supporter: null }
  | { trener: null }
  | { admin: null };

export type RoleAssignment = {
  principal: string;
  role: AppRole;
  teamId?: bigint;
  assignedBy: string;
  assignedAt: bigint;
};

export type RoleAuditEntry = {
  id: bigint;
  changedBy: string;
  subject: string;
  previousRole?: AppRole;
  newRole: AppRole;
  teamId?: bigint;
  at: bigint;
};

function fromBackendRole(role: BackendRole): AppRole {
  if ("admin" in role) return "admin";
  if ("trener" in role) return "trener";
  return "supporter";
}

function toBackendRole(role: AppRole): BackendRole {
  if (role === "admin") return { admin: null };
  if (role === "trener") return { trener: null };
  return { supporter: null };
}

function firstOrUndefined<T>(opt: [] | [T]): T | undefined {
  return opt.length > 0 ? opt[0] : undefined;
}

/**
 * Identiteten som noekkel for cachen.
 *
 * BEKREFTET 2026-09-07: useInternetIdentity holder tilstanden i useState inne
 * i hver provider, saa hver InternetIdentityProvider starter med
 * identity = undefined og hydrerer asynkront. useActor lager da foerst en
 * ANONYM actor. Uten principal i queryKey ble det anonyme svaret
 * (isAdmin: false) liggende i cachen og vist til en innlogget admin.
 * useActor har principalet i sin egen queryKey - vi maa gjoere det samme.
 */
function useIdentityKey() {
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal();
  const isAuthenticated = Boolean(principal && !principal.isAnonymous());
  return {
    identityKey: isAuthenticated ? principal!.toText() : "anonymous",
    isAuthenticated,
  };
}

/** Min rolle slik BACKEND ser den. */
export function useBackendRole() {
  const { actor, isFetching } = useActor(createActor);
  const { identityKey, isAuthenticated } = useIdentityKey();
  return useQuery({
    queryKey: ["backendRole", identityKey],
    queryFn: async () => {
      if (!actor) return null;
      const res = await actor.getMyRole();
      return {
        role: fromBackendRole(res.role as BackendRole),
        teamId: firstOrUndefined(res.teamId as [] | [bigint]),
        isAdmin: res.isAdmin as boolean,
      };
    },
    // Ikke spoer backend foer identiteten er hydrert - et anonymt svar er
    // korrekt, men ubrukelig, og ville bare forurenset cachen.
    enabled: isAuthenticated && !isFetching && Boolean(actor),
    staleTime: 30_000,
  });
}

export function useRoleAssignments(enabled: boolean) {
  const { actor, isFetching } = useActor(createActor);
  const { identityKey, isAuthenticated } = useIdentityKey();
  return useQuery<RoleAssignment[]>({
    queryKey: ["roleAssignments", identityKey],
    queryFn: async () => {
      if (!actor) return [];
      const rows = await actor.listRoleAssignments();
      return rows.map((r) => ({
        principal: r.subject.toText(),
        role: fromBackendRole(r.role as BackendRole),
        teamId: firstOrUndefined(r.teamId as [] | [bigint]),
        assignedBy: r.assignedBy.toText(),
        assignedAt: r.assignedAt,
      }));
    },
    enabled: enabled && isAuthenticated && !isFetching && Boolean(actor),
  });
}

export function useRoleAuditLog(enabled: boolean) {
  const { actor, isFetching } = useActor(createActor);
  const { identityKey, isAuthenticated } = useIdentityKey();
  return useQuery<RoleAuditEntry[]>({
    queryKey: ["roleAuditLog", identityKey],
    queryFn: async () => {
      if (!actor) return [];
      const rows = await actor.listRoleAuditLog();
      return rows
        .map((r) => ({
          id: r.id,
          changedBy: r.changedBy.toText(),
          subject: r.subject.toText(),
          previousRole: (() => {
            const prev = firstOrUndefined(r.previousRole as [] | [BackendRole]);
            return prev ? fromBackendRole(prev) : undefined;
          })(),
          newRole: fromBackendRole(r.newRole as BackendRole),
          teamId: firstOrUndefined(r.teamId as [] | [bigint]),
          at: r.at,
        }))
        .sort((a, b) => Number(b.at - a.at));
    },
    enabled: enabled && isAuthenticated && !isFetching && Boolean(actor),
  });
}

export function useSetUserRole() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      principal: string;
      role: AppRole;
      teamId?: bigint;
    }) => {
      if (!actor) throw new Error("Ingen forbindelse til backend");
      // Kaster hvis principalet er ugyldig - bedre enn aa sende soppel
      // til canisteren og faa en kryptisk feil tilbake.
      const subject = Principal.fromText(input.principal.trim());
      const teamId: [] | [bigint] =
        input.teamId === undefined ? [] : [input.teamId];
      return actor.setUserRole(subject, toBackendRole(input.role), teamId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roleAssignments"] });
      queryClient.invalidateQueries({ queryKey: ["roleAuditLog"] });
      queryClient.invalidateQueries({ queryKey: ["backendRole"] });
    },
  });
}
