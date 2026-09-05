import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { getRoleForPrincipal, type AppRole } from "../data/roles";

/**
 * Leser rollen til den innloggede brukeren (2026-08-31).
 * Returnerer ogsaa principalet, slik at det kan kopieres fra kontomenyen.
 */
export function useAppRole(): {
  principal?: string;
  role: AppRole;
  isCoach: boolean;
  isAuthenticated: boolean;
} {
  const { identity } = useInternetIdentity();
  const raw = identity?.getPrincipal();
  const isAuthenticated = Boolean(raw && !raw.isAnonymous());
  const principal = isAuthenticated ? raw?.toText() : undefined;
  const role = getRoleForPrincipal(principal);
  return { principal, role, isCoach: role === "trener", isAuthenticated };
}
