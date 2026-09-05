/**
 * Rollestyrt tilgang (2026-08-31).
 *
 * Samme datagrunnlag, ulik inngang: en trener trenger noe helt annet enn en
 * supporter. Rollen bestemmes av hvilket Internet Identity-principal som er
 * logget inn — ingen egen brukerdatabase, ingen passord aa forvalte.
 *
 * SLIK LEGGER DU TIL EN TRENER:
 * 1. Logg inn med kontoen i appen
 * 2. Aapne kontomenyen oppe til hoyre og kopier principalet
 * 3. Lim det inn under, med rollen "trener"
 */
export type AppRole = "supporter" | "trener";

const ROLE_BY_PRINCIPAL: Record<string, AppRole> = {
  // Fredriks trenerkonto (lagt inn 2026-08-31)
  "qawja-zqpe7-54fec-umnik-ylxtj-2nhxv-st2ln-4dap7-zkhtw-oqeuf-iqe": "trener",
};

export function getRoleForPrincipal(principal?: string): AppRole {
  if (!principal) return "supporter";
  return ROLE_BY_PRINCIPAL[principal] ?? "supporter";
}

/** Sant naar minst ett principal er registrert som trener. */
export function hasCoachAccounts(): boolean {
  return Object.keys(ROLE_BY_PRINCIPAL).length > 0;
}
