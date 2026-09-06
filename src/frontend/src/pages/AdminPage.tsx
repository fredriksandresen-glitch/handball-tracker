import { Link } from "@tanstack/react-router";
import { AlertTriangle, History, ShieldCheck, UserCog } from "lucide-react";
import { useState } from "react";
import { LeagueSelect } from "../components/LeagueSelect";
import { SeasonSelect } from "../components/SeasonSelect";
import { useAppRole } from "../hooks/useAppRole";
import {
  useBackendRole,
  useRoleAssignments,
  useRoleAuditLog,
  useSetUserRole,
} from "../hooks/useRoles";
import { useTeams } from "../hooks/useTeams";
import { useSelectedLeague } from "../components/LeagueSelect";
import { useSelectedSeason } from "../components/SeasonSelect";
import type { AppRole } from "../data/roles";

const ROLE_LABEL: Record<AppRole, string> = {
  supporter: "Supporter",
  trener: "Trener",
  admin: "Administrator",
};

function formatTime(ns: bigint) {
  return new Date(Number(ns / 1_000_000n)).toLocaleString("nb-NO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shorten(principal: string) {
  if (principal.length <= 24) return principal;
  return `${principal.slice(0, 10)}…${principal.slice(-6)}`;
}

export default function AdminPage() {
  const seasonId = useSelectedSeason();
  const leagueId = useSelectedLeague();
  const { isAdmin: isAdminLocally, isAuthenticated, principal } = useAppRole();
  const { data: backendRole } = useBackendRole();
  const { data: teams = [] } = useTeams(seasonId, leagueId);

  // Backend er fasit. Den lokale sjekken bestemmer bare om vi i det hele
  // tatt spoer. Se FUNKSJONSBESKRIVELSE.md F11.3.
  const isAdmin = backendRole?.isAdmin ?? isAdminLocally;

  const { data: assignments = [] } = useRoleAssignments(isAdmin);
  const { data: audit = [] } = useRoleAuditLog(isAdmin);
  const setRole = useSetUserRole();

  const [subject, setSubject] = useState("");
  const [role, setRole_] = useState<AppRole>("trener");
  const [teamId, setTeamId] = useState("");

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
        <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 font-display font-bold text-foreground">
          Administrasjon
        </p>
        <p className="mx-auto mt-1 max-w-[280px] text-sm text-muted-foreground">
          Logg inn for å fortsette.
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-card px-5 py-8">
        <AlertTriangle className="size-7 text-muted-foreground" />
        <p className="mt-3 font-display font-bold text-foreground">
          Kontoen din har ikke administratortilgang
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Send principalet under til en administrator hvis du skal ha tilgang.
        </p>
        <code className="mt-3 block break-all rounded-lg bg-muted px-3 py-2 font-mono text-[11px] text-foreground">
          {principal}
        </code>
      </div>
    );
  }

  const canSubmit = subject.trim().length > 0 && !setRole.isPending;

  return (
    <div className="space-y-4" data-ocid="admin-page">
      <div className="flex flex-wrap items-center gap-2">
        <SeasonSelect compact />
        <LeagueSelect />
      </div>

      <section className="rounded-2xl border border-border bg-card">
        <div className="flex items-start gap-2.5 border-b border-border px-4 py-3">
          <UserCog className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <h2 className="font-display text-sm font-black text-foreground">
              Gi tilgang
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Lim inn brukerens principal. Hen finner det i kontomenyen.
            </p>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <label
              htmlFor="admin-principal"
              className="mb-1.5 block text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground"
            >
              Principal
            </label>
            <input
              id="admin-principal"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="abcde-fghij-…-cai"
              spellCheck={false}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
              data-ocid="admin-principal-input"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="min-w-[140px] flex-1">
              <label
                htmlFor="admin-role"
                className="mb-1.5 block text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground"
              >
                Rolle
              </label>
              <select
                id="admin-role"
                value={role}
                onChange={(e) => setRole_(e.target.value as AppRole)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-display text-sm font-bold text-foreground"
                data-ocid="admin-role-select"
              >
                <option value="supporter">Supporter</option>
                <option value="trener">Trener</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            {role === "trener" && (
              <div className="min-w-[140px] flex-1">
                <label
                  htmlFor="admin-team"
                  className="mb-1.5 block text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground"
                >
                  Lag
                </label>
                <select
                  id="admin-team"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-display text-sm font-bold text-foreground"
                  data-ocid="admin-team-select"
                >
                  <option value="">Alle lag</option>
                  {teams.map((t) => (
                    <option key={t.id.toString()} value={t.id.toString()}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              setRole.mutate(
                {
                  principal: subject,
                  role,
                  teamId: teamId ? BigInt(teamId) : undefined,
                },
                { onSuccess: () => setSubject("") },
              )
            }
            className="w-full rounded-lg bg-primary px-4 py-2.5 font-display text-sm font-black text-primary-foreground transition-opacity disabled:opacity-40"
            data-ocid="admin-save-role"
          >
            {setRole.isPending ? "Lagrer…" : "Lagre rolle"}
          </button>

          {setRole.isError && (
            <p className="text-[11px] text-destructive" role="alert">
              {setRole.error instanceof Error
                ? setRole.error.message
                : "Kunne ikke lagre rollen."}
            </p>
          )}
          {setRole.isSuccess && (
            <p className="text-[11px] text-chart-2">Rollen er lagret.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-display text-sm font-black text-foreground">
            Registrerte brukere ({assignments.length})
          </h2>
        </div>
        {assignments.length === 0 ? (
          <p className="px-4 py-4 text-[11px] text-muted-foreground">
            Ingen roller er tildelt ennå.
          </p>
        ) : (
          assignments.map((a) => (
            <div
              key={a.principal}
              className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[11px] text-foreground">
                  {shorten(a.principal)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {ROLE_LABEL[a.role]}
                  {a.teamId !== undefined
                    ? ` · ${teams.find((t) => t.id === a.teamId)?.name ?? `lag ${a.teamId}`}`
                    : ""}
                </p>
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {formatTime(a.assignedAt)}
              </span>
            </div>
          ))
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card">
        <div className="flex items-start gap-2.5 border-b border-border px-4 py-3">
          <History className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <h2 className="font-display text-sm font-black text-foreground">
              Revisjonslogg
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Hvem ga hvem tilgang, og når. Kan ikke endres i ettertid.
            </p>
          </div>
        </div>
        {audit.length === 0 ? (
          <p className="px-4 py-4 text-[11px] text-muted-foreground">
            Ingen endringer registrert ennå.
          </p>
        ) : (
          audit.map((e) => (
            <div
              key={e.id.toString()}
              className="border-b border-border/60 px-4 py-2.5 text-[11px] last:border-0"
            >
              <p className="text-foreground">
                <span className="font-mono">{shorten(e.subject)}</span>{" "}
                {e.previousRole
                  ? `${ROLE_LABEL[e.previousRole]} → ${ROLE_LABEL[e.newRole]}`
                  : `fikk ${ROLE_LABEL[e.newRole]}`}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                av <span className="font-mono">{shorten(e.changedBy)}</span> ·{" "}
                {formatTime(e.at)}
              </p>
            </div>
          ))
        )}
      </section>

      <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
        Rollene lagres i backend-canisteren og gjelder umiddelbart — ingen ny
        utrulling er nødvendig. Tilgangen håndheves av canisteren, ikke av
        appen.{" "}
        <Link to="/trener" search={{ season: seasonId, league: leagueId }} className="underline">
          Gå til trenerverktøyet
        </Link>
      </p>
    </div>
  );
}
