/**
 * Rollestyrt tilgang.
 *
 * Samme datagrunnlag, ulik inngang: en trener trenger noe helt annet enn en
 * supporter. Rollen bestemmes av hvilket Internet Identity-principal som er
 * logget inn — ingen egen brukerdatabase, ingen passord aa forvalte.
 *
 * OVERGANGSFASE (F11): denne fila er i ferd med aa bli erstattet av
 * rollelagring i backend-canisteren, slik at admin kan gi tilgang direkte i
 * appen uten redeploy. Fila beholdes som fallback til backend-rollene er
 * verifisert live. Se FUNKSJONSBESKRIVELSE.md F11.
 *
 * MERK: Internet Identity gir ULIKT principal per origin. Et principal hentet
 * paa icp0.io virker ikke paa raw.icp0.io eller et eget domene.
 */
export type AppRole = "supporter" | "trener" | "admin";

const ROLE_BY_PRINCIPAL: Record<string, AppRole> = {
  // Administrator — kan tildele roller til andre (lagt inn 2026-09-06)
  "uzelm-nlsyn-dklu2-lesds-h4vsy-6yiab-hbxxc-omxaa-kgkfe-mmkjp-wae": "admin",
  // Fredriks trenerkonto (lagt inn 2026-08-31)
  "qawja-zqpe7-54fec-umnik-ylxtj-2nhxv-st2ln-4dap7-zkhtw-oqeuf-iqe": "trener",
  // Demo-/visningskonto for trenerrollen (lagt inn 2026-09-06)
  "hmulj-qav6g-lktiw-7e74g-u6p2k-blsdd-twvjx-5zm7f-h4zkz-wu7ch-qae": "trener",
};

export function getRoleForPrincipal(principal?: string): AppRole {
  if (!principal) return "supporter";
  return ROLE_BY_PRINCIPAL[principal] ?? "supporter";
}

/** Sant naar minst ett principal er registrert som trener. */
export function hasCoachAccounts(): boolean {
  return Object.keys(ROLE_BY_PRINCIPAL).length > 0;
}

/**
 * Rene roller (endret 2026-09-06 etter tilbakemelding fra Fredrik):
 * admin arver IKKE trenertilgang. En administrator styrer tilgang, hen er
 * ikke automatisk trener for et lag. Skal samme person ha begge deler, maa
 * hen ha to kontoer - eller vi maa innfoere flere roller per principal.
 */
export function canAccessCoachTools(role: AppRole): boolean {
  return role === "trener";
}

export function canAdministerRoles(role: AppRole): boolean {
  return role === "admin";
}
