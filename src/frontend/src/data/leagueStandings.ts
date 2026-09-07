import {
  ARCHIVE_SEASON_ID,
  CURRENT_SEASON_ID,
  ELITE_LEAGUE_ID,
  FIRST_DIVISION_LEAGUE_ID,
  type LeagueId,
  type SeasonId,
} from "./seasons";
import archiveStandingsData from "./leagueStandingsArchive.json";
import currentEliteStandingsData from "./leagueStandingsCurrentElite.json";
import currentFirstDivisionStandingsData from "./leagueStandingsCurrentFirstDivision.json";

export type LeagueStanding = {
  name: string;
  primeTeamId: string;
  rank: number;
  previousRank: number;
  rankDelta: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

// Tabellene regnes ut fra topphandball sine kampresultater av
// scripts/sync-league-standings.mjs og bakes inn i repoet.
// Flyttet hit fra apps/handball-build 2026-09-07: den checkouten deployet
// fra en gammel branch via cron og overskrev nyere arbeid. En kilde, ett sted.
const currentStandings: LeagueStanding[] = currentEliteStandingsData;

const currentFirstDivisionTeams: LeagueStanding[] =
  currentFirstDivisionStandingsData;

const archiveStandings: LeagueStanding[] = archiveStandingsData;

export const leagueStandingsBySeasonAndLeague: Record<
  SeasonId,
  Record<LeagueId, LeagueStanding[]>
> = {
  [CURRENT_SEASON_ID]: {
    [ELITE_LEAGUE_ID]: currentStandings,
    [FIRST_DIVISION_LEAGUE_ID]: currentFirstDivisionTeams,
  },
  [ARCHIVE_SEASON_ID]: {
    [ELITE_LEAGUE_ID]: archiveStandings,
    [FIRST_DIVISION_LEAGUE_ID]: [],
  },
};

export const leagueStandingsBySeason: Record<SeasonId, LeagueStanding[]> = {
  [CURRENT_SEASON_ID]: currentStandings,
  [ARCHIVE_SEASON_ID]: archiveStandings,
};

export const leagueStandings = archiveStandings;
