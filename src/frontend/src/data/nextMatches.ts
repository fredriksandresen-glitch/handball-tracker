import upcomingMatchesData from "./upcomingMatches.json";
import type { Match } from "../types/handball";
import { MatchStatus } from "../types/handball";
import type { LeagueId } from "./seasons";

export type NextMatchResult = {
  match: Match;
  /**
   * Lagnavn finnes kun i den statiske terminlisten. Backend-banen
   * (actor.getNextMatchForTeam) returnerer bare kampen, derfor er disse
   * valgfrie. MatchCard handterer allerede undefined.
   */
  homeTeamName?: string;
  awayTeamName?: string;
};

type MatchEntry = {
  matchId: number;
  startTime: string;
  homeTeamName: string;
  awayTeamName: string;
  venue: string;
  league?: string;
};

/**
 * Terminliste for inneverende sesong.
 *
 * Var tidligere en haandskrevet liste som stoppet 30. august 2026. Da var
 * alle kamper spilt, og "neste kamp" var tom for samtlige lag.
 * Synkes naa fra kilden av scripts/sync-upcoming-matches.mjs.
 */
const ALL_UPCOMING: MatchEntry[] = upcomingMatchesData as MatchEntry[];

function stableTeamId(teamName: string): bigint {
  let hash = 0;
  for (let index = 0; index < teamName.length; index += 1) {
    hash = (hash * 31 + teamName.charCodeAt(index)) % 1_000_000;
  }
  return BigInt(hash || 1);
}

function toMatch(entry: MatchEntry, leagueId?: LeagueId): Match {
  return {
    id: BigInt(entry.matchId),
    homeTeamId: stableTeamId(entry.homeTeamName),
    awayTeamId: stableTeamId(entry.awayTeamName),
    startTime: BigInt(Date.parse(entry.startTime)) * 1_000_000n,
    status: MatchStatus.Upcoming,
    venue: entry.venue,
    competition: leagueId === "elite" ? "Elkjøp-ligaen kvinner" : "1. divisjon kvinner",
  } as unknown as Match;
}

/**
 * Lagets neste kamp — den FOERSTE som ligger fram i tid.
 *
 * Tidligere tok denne bare foerste treff i lista uten aa se paa datoen, og
 * viste derfor spilte kamper som "neste kamp" (Molde-Fjellhammer 30.08 ble
 * vist 06.09). Naa filtreres spilte kamper bort og resten sorteres kronologisk.
 *
 * Returnerer null naar terminlisten ikke har flere kamper for laget. Da skal
 * den som kaller si det rett ut, ikke vise en gammel kamp.
 */
export function getStaticNextMatchForTeam(
  teamName: string,
  leagueId?: LeagueId,
  now: number = Date.now(),
): NextMatchResult | null {
  const upcomingForTeam = ALL_UPCOMING.filter(
    (match) =>
      (match.homeTeamName === teamName || match.awayTeamName === teamName) &&
      Date.parse(match.startTime) > now,
  ).sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));

  // Ligaen er en PREFERANSE, ikke et krav. Fjellhammer stod feilklassifisert
  // som 1. divisjon mens laget spiller i Elkjoep-ligaen; med hardt filter
  // ville kampene deres blitt usynlige. Feil liga skal ikke skjule en kamp.
  const entry =
    upcomingForTeam.find((match) => !leagueId || match.league === leagueId) ??
    upcomingForTeam[0];
  if (!entry) return null;

  return {
    match: toMatch(entry, leagueId),
    homeTeamName: entry.homeTeamName,
    awayTeamName: entry.awayTeamName,
  };
}
