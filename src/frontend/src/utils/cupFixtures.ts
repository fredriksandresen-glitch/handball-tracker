import cupFixturesData from "../data/cupFixtures2627.json";

export interface CupMatch {
  id: string;
  kickoff: number | null;
  arena: string | null;
  homeName: string;
  awayName: string;
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore: number;
  awayScore: number;
  played: boolean;
}

interface CupFixtures {
  season: string;
  matches: CupMatch[];
}

const cupFixtures = cupFixturesData as CupFixtures;

export const CUP_SEASON = cupFixtures.season;

/**
 * NM-seksjonen er skjult 2026-08-27 etter avtale med Fredrik.
 * Grunn: cupFixtures2627.json er ikke synket — 11 av 39 kamper star som
 * uspilte 0-0 selv om de faktisk er spilt (bl.a. begge Fjellhammer-kampene).
 * Halvferdige data ser ut som en bug i demoen for Norges Handballforbund.
 *
 * Slik slar du den PA igjen: sett denne til true etter at
 * cupFixtures2627.json er oppdatert med ekte resultater.
 */
export const SHOW_CUP_SECTION = false;

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const NOISE_TOKENS = new Set([
  "hk",
  "il",
  "elite",
  "handball",
  "klubb",
  "bkl",
  "topphandball",
  "topphandballforening",
  "idrettslag",
  "handballforening",
  "damer",
  "kvinner",
  "senior",
]);

function tokenize(value: string): string[] {
  return normalizeName(value)
    .split(" ")
    .filter((token) => token && !NOISE_TOKENS.has(token));
}

export function isSameClub(a: string, b: string): boolean {
  const left = tokenize(a);
  const right = tokenize(b);
  if (left.length === 0 || right.length === 0) return false;
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  for (let i = 0; i < shorter.length; i += 1) {
    if (shorter[i] !== longer[i]) return false;
  }
  return !longer
    .slice(shorter.length)
    .some((token) => token === "rekrutt" || /^\d+$/.test(token));
}

export function getCupMatchesForTeam(teamName: string | undefined): CupMatch[] {
  if (!teamName) return [];
  return cupFixtures.matches.filter(
    (match) =>
      (match.homeTeam && isSameClub(match.homeTeam, teamName)) ||
      (match.awayTeam && isSameClub(match.awayTeam, teamName)) ||
      isSameClub(match.homeName, teamName) ||
      isSameClub(match.awayName, teamName),
  );
}

export interface CupMatchView {
  isHome: boolean;
  opponent: string;
  teamScore: number;
  opponentScore: number;
  won: boolean;
  lost: boolean;
}

export function describeCupMatch(match: CupMatch, teamName: string): CupMatchView {
  const isHome =
    (!!match.homeTeam && isSameClub(match.homeTeam, teamName)) ||
    isSameClub(match.homeName, teamName);
  const opponent = isHome ? match.awayName : match.homeName;
  const teamScore = isHome ? match.homeScore : match.awayScore;
  const opponentScore = isHome ? match.awayScore : match.homeScore;
  return {
    isHome,
    opponent,
    teamScore,
    opponentScore,
    won: match.played && teamScore > opponentScore,
    lost: match.played && teamScore < opponentScore,
  };
}
