import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  canAccessCoachTools,
  canAdministerRoles,
  getRoleForPrincipal,
  type AppRole,
} from "../data/roles";

/**
 * Leser rollen til den innloggede brukeren.
 *
 * MERK: dette er kosmetikk, ikke tilgangskontroll. Aa skjule en fane hindrer
 * ingen i aa kalle backend direkte. Naar F11 lander maa hvert kall som endrer
 * roller eller leser trenerdata sjekke caller i backend.
 * Se FUNKSJONSBESKRIVELSE.md F11.3.
 */
export function useAppRole(): {
  principal?: string;
  role: AppRole;
  isCoach: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
} {
  const { identity } = useInternetIdentity();
  const raw = identity?.getPrincipal();
  const isAuthenticated = Boolean(raw && !raw.isAnonymous());
  const principal = isAuthenticated ? raw?.toText() : undefined;
  const role = getRoleForPrincipal(principal);
  return {
    principal,
    role,
    // Admin ser alt treneren ser. Derfor kapabilitet, ikke rollesammenligning.
    isCoach: canAccessCoachTools(role),
    isAdmin: canAdministerRoles(role),
    isAuthenticated,
  };
}
