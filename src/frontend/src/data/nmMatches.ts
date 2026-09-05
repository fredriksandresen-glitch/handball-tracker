import raw from "./nmMatches2627.json";

export type NmMatch = {
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
};

const data = raw as {
  tournamentId: number;
  season: string;
  label: string;
  matches: NmMatch[];
};

export const NM_SEASON = data.season;
export const NM_LABEL = data.label;

function normalize(value: string) {
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

// Klubb-suffikser som ikke skiller lag fra hverandre. Backend kan gi
// "Larvik Handball Klubb" der appen viser "Larvik", og NM-kilden gir
// "Storhamar Handball Elite". Alle skal treffe samme lag.
// MERK: "rekrutt" staar bevisst IKKE her - Byaasen og Byaasen Rekrutt
// er to ulike lag og skal aldri slaas sammen.
const GENERIC_TOKENS = new Set([
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

function canonicalTokens(value: string) {
  return normalize(value)
    .split(" ")
    .filter((token) => token && !GENERIC_TOKENS.has(token));
}

function sameTeam(a: string, b: string) {
  const left = canonicalTokens(a);
  const right = canonicalTokens(b);
  if (left.length === 0 || right.length === 0) return false;

  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;

  // Alle tokens i det korteste navnet maa ligge forrest i det lengste,
  // slik at "Flint" treffer "Flint Tonsberg".
  for (let i = 0; i < shorter.length; i += 1) {
    if (shorter[i] !== longer[i]) return false;
  }

  // Ekstra ord som "rekrutt" eller "2" betyr et annet lag.
  const extra = longer.slice(shorter.length);
  return !extra.some((token) => token === "rekrutt" || /^\d+$/.test(token));
}

/** Alle NM-kamper for et lag, eldste forst. */
export function getNmMatchesForTeam(teamName: string | undefined | null): NmMatch[] {
  if (!teamName) return [];
  return data.matches.filter(
    (match) =>
      (match.homeTeam && sameTeam(match.homeTeam, teamName)) ||
      (match.awayTeam && sameTeam(match.awayTeam, teamName)) ||
      sameTeam(match.homeName, teamName) ||
      sameTeam(match.awayName, teamName),
  );
}

/** Kampen sett fra lagets side: motstander, hjemme/borte og resultat. */
export function describeNmMatch(match: NmMatch, teamName: string) {
  const isHome =
    (!!match.homeTeam && sameTeam(match.homeTeam, teamName)) ||
    sameTeam(match.homeName, teamName);
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

export function hasNmMatches(teamName: string | undefined | null) {
  return getNmMatchesForTeam(teamName).length > 0;
}
