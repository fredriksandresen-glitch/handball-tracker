import {
  ARCHIVE_SEASON_ID,
  CURRENT_SEASON_ID,
  ELITE_LEAGUE_ID,
  FIRST_DIVISION_LEAGUE_ID,
  type LeagueId,
  type SeasonId,
} from "./seasons";
import archiveStandingsData from "./leagueStandingsArchive.json";

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

const currentTeamNames = [
  ["Sola", "223983"],
  ["Storhamar", "746223"],
  ["Molde", "775789"],
  ["Larvik Håndball Klubb", "223994"],
  ["Tertnes", "470538"],
  ["Fredrikstad", "441651"],
  ["Gjerpen", "453373"],
  ["Flint", "710438"],
  ["Byåsen", "454116"],
  ["Fana", "225474"],
  ["Oppsal", "441915"],
  ["Follo Damer", "583889"],
  ["Utleira", "532136"],
  ["Fjellhammer", "223982"],
] as const;

const currentStandings: LeagueStanding[] = currentTeamNames.map(
  ([name, primeTeamId], index) => ({
    name,
    primeTeamId,
    rank: index + 1,
    previousRank: index + 1,
    rankDelta: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }),
);

const currentFirstDivisionTeams: LeagueStanding[] = [
  {
    name: "Aker Topphåndball",
    primeTeamId: "816397",
    rank: 1,
    previousRank: 1,
    rankDelta: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    name: "Kjelsås",
    primeTeamId: "224860",
    rank: 2,
    previousRank: 2,
    rankDelta: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    name: "Volda",
    primeTeamId: "532788",
    rank: 3,
    previousRank: 3,
    rankDelta: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    name: "Levanger",
    primeTeamId: "224372",
    rank: 4,
    previousRank: 4,
    rankDelta: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    name: "Åsane",
    primeTeamId: "453275",
    rank: 5,
    previousRank: 5,
    rankDelta: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    name: "Trondheim",
    primeTeamId: "985298",
    rank: 6,
    previousRank: 6,
    rankDelta: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    name: "Gjøvik",
    primeTeamId: "223999",
    rank: 7,
    previousRank: 7,
    rankDelta: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    name: "Ravens",
    primeTeamId: "948459",
    rank: 8,
    previousRank: 8,
    rankDelta: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    name: "Stavanger",
    primeTeamId: "224507",
    rank: 9,
    previousRank: 9,
    rankDelta: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    name: "Bækkelaget",
    primeTeamId: "223985",
    rank: 10,
    previousRank: 10,
    rankDelta: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    name: "Haslum",
    primeTeamId: "928836",
    rank: 11,
    previousRank: 11,
    rankDelta: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    name: "Fyllingen",
    primeTeamId: "224174",
    rank: 12,
    previousRank: 12,
    rankDelta: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    name: "Byåsen Rekrutt",
    primeTeamId: "454116",
    rank: 13,
    previousRank: 13,
    rankDelta: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    name: "Storhamar Rekrutt",
    primeTeamId: "746223",
    rank: 14,
    previousRank: 14,
    rankDelta: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
];

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
