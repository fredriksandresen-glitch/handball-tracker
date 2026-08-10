import type { Match } from "../types/handball";
import { MatchStatus } from "../types/handball";
import type { LeagueId } from "./seasons";

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

const ELITE_UPCOMING_MATCHES: MatchEntry[] = [
  {
    matchId: 8393077,
    startTime: "2026-08-26T18:15:00+02:00",
    homeTeamName: "Storhamar",
    awayTeamName: "Gjerpen",
    venue: "OBOS Arena",
  },
  {
    matchId: 8393054,
    startTime: "2026-08-30T16:00:00+02:00",
    homeTeamName: "Molde",
    awayTeamName: "Fjellhammer",
    venue: "Molde Arena",
  },
  {
    matchId: 8393056,
    startTime: "2026-08-30T16:00:00+02:00",
    homeTeamName: "Flint",
    awayTeamName: "Gjerpen",
    venue: "Sparebanken Norge Arena",
  },
  {
    matchId: 8393055,
    startTime: "2026-08-30T17:00:00+02:00",
    homeTeamName: "Sola",
    awayTeamName: "Fredrikstad",
    venue: "Åsenhallen A",
  },
  {
    matchId: 8393053,
    startTime: "2026-08-30T17:00:00+02:00",
    homeTeamName: "Tertnes",
    awayTeamName: "Oppsal",
    venue: "Åsane Arena",
  },
  {
    matchId: 8393052,
    startTime: "2026-08-30T18:00:00+02:00",
    homeTeamName: "Larvik",
    awayTeamName: "Fana",
    venue: "Jotron Arena",
  },
  {
    matchId: 8393050,
    startTime: "2026-08-30T19:15:00+02:00",
    homeTeamName: "Byåsen",
    awayTeamName: "Utleira",
    venue: "Trondheim Spektrum D",
  },
  {
    matchId: 8393051,
    startTime: "2026-08-30T15:00:00+02:00",
    homeTeamName: "Storhamar",
    awayTeamName: "Follo Damer",
    venue: "OBOS Arena",
  },
];

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

export function getStaticNextMatchForTeam(
  teamName: string,
  leagueId?: LeagueId,
): NextMatchResult | null {
  const matches =
    leagueId === "elite" ? ELITE_UPCOMING_MATCHES : UPCOMING_MATCHES;
  const entry = matches.find(
    (match) =>
      match.homeTeamName === teamName || match.awayTeamName === teamName,
  );
  if (!entry) return null;

  return {
    match: toMatch(entry, leagueId),
    homeTeamName: entry.homeTeamName,
    awayTeamName: entry.awayTeamName,
  };
}
