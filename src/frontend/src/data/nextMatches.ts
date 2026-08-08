import type { Match } from "../types/handball";
import { MatchStatus } from "../types/handball";

export type NextMatchResult = {
  match: Match;
  homeTeamName: string;
  awayTeamName: string;
};

type MatchEntry = {
  matchId: number;
  startTime: string;
  homeTeamName: string;
  awayTeamName: string;
  venue: string;
};

// Official 1st division fixtures from NHF, refreshed for the current season.
const UPCOMING_MATCHES: MatchEntry[] = [
  {
    matchId: 44650301,
    startTime: "2026-08-30T14:00:00+02:00",
    homeTeamName: "Fyllingen",
    awayTeamName: "Kjelsås",
    venue: "Framohallen",
  },
  {
    matchId: 44650302,
    startTime: "2026-08-30T15:00:00+02:00",
    homeTeamName: "Gjøvik",
    awayTeamName: "Bækkelaget",
    venue: "Gjøvik",
  },
  {
    matchId: 44650303,
    startTime: "2026-09-05T15:00:00+02:00",
    homeTeamName: "Levanger",
    awayTeamName: "Ravens",
    venue: "Trønderhallen",
  },
  {
    matchId: 44650304,
    startTime: "2026-09-06T14:00:00+02:00",
    homeTeamName: "Trondheim",
    awayTeamName: "Aker Topphåndball",
    venue: "Nidarøhallen",
  },
  {
    matchId: 44650305,
    startTime: "2026-09-06T15:30:00+02:00",
    homeTeamName: "Byåsen Rekrutt",
    awayTeamName: "Haslum",
    venue: "Byåsen Arena",
  },
  {
    matchId: 44650306,
    startTime: "2026-09-06T17:00:00+02:00",
    homeTeamName: "Volda",
    awayTeamName: "Storhamar Rekrutt",
    venue: "Volda Campus Sparebank 1 Arena",
  },
  {
    matchId: 44650307,
    startTime: "2026-09-06T18:00:00+02:00",
    homeTeamName: "Åsane",
    awayTeamName: "Stavanger",
    venue: "Åsane Arena",
  },
];

function stableTeamId(teamName: string): bigint {
  let hash = 0;
  for (let index = 0; index < teamName.length; index += 1) {
    hash = (hash * 31 + teamName.charCodeAt(index)) % 1_000_000;
  }
  return BigInt(hash || 1);
}

function toMatch(entry: MatchEntry): Match {
  return {
    matchId: BigInt(entry.matchId),
    homeTeamId: stableTeamId(entry.homeTeamName),
    awayTeamId: stableTeamId(entry.awayTeamName),
    startTime: BigInt(Date.parse(entry.startTime)) * 1_000_000n,
    status: MatchStatus.Upcoming,
    venue: entry.venue,
  } as unknown as Match;
}

export function getStaticNextMatchForTeam(
  teamName: string,
): NextMatchResult | null {
  const entry = UPCOMING_MATCHES.find(
    (match) =>
      match.homeTeamName === teamName || match.awayTeamName === teamName,
  );
  if (!entry) return null;

  return {
    match: toMatch(entry),
    homeTeamName: entry.homeTeamName,
    awayTeamName: entry.awayTeamName,
  };
}
