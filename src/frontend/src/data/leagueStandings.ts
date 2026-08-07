import {
  ARCHIVE_SEASON_ID,
  CURRENT_SEASON_ID,
  ELITE_LEAGUE_ID,
  FIRST_DIVISION_LEAGUE_ID,
  type LeagueId,
  type SeasonId,
} from "./seasons";

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
];

const archiveStandings: LeagueStanding[] = [
  { name: "Sola", primeTeamId: "223983", rank: 1, previousRank: 1, rankDelta: 0, played: 26, wins: 25, draws: 0, losses: 1, goalsFor: 865, goalsAgainst: 675, points: 50 },
  { name: "Storhamar", primeTeamId: "746223", rank: 2, previousRank: 2, rankDelta: 0, played: 26, wins: 22, draws: 1, losses: 3, goalsFor: 808, goalsAgainst: 630, points: 45 },
  { name: "Molde", primeTeamId: "775789", rank: 3, previousRank: 3, rankDelta: 0, played: 26, wins: 18, draws: 4, losses: 4, goalsFor: 844, goalsAgainst: 695, points: 40 },
  { name: "Larvik", primeTeamId: "223994", rank: 4, previousRank: 4, rankDelta: 0, played: 26, wins: 18, draws: 1, losses: 7, goalsFor: 806, goalsAgainst: 724, points: 37 },
  { name: "Tertnes", primeTeamId: "470538", rank: 5, previousRank: 5, rankDelta: 0, played: 26, wins: 14, draws: 2, losses: 10, goalsFor: 786, goalsAgainst: 730, points: 30 },
  { name: "Fana", primeTeamId: "225474", rank: 6, previousRank: 6, rankDelta: 0, played: 26, wins: 11, draws: 2, losses: 13, goalsFor: 742, goalsAgainst: 727, points: 24 },
  { name: "Fredrikstad", primeTeamId: "441651", rank: 7, previousRank: 8, rankDelta: 1, played: 26, wins: 11, draws: 2, losses: 13, goalsFor: 741, goalsAgainst: 729, points: 24 },
  { name: "Byåsen", primeTeamId: "454116", rank: 8, previousRank: 7, rankDelta: -1, played: 26, wins: 11, draws: 1, losses: 14, goalsFor: 734, goalsAgainst: 724, points: 23 },
  { name: "Gjerpen", primeTeamId: "453373", rank: 9, previousRank: 9, rankDelta: 0, played: 26, wins: 11, draws: 1, losses: 14, goalsFor: 707, goalsAgainst: 698, points: 23 },
  { name: "Follo Damer", primeTeamId: "583889", rank: 10, previousRank: 10, rankDelta: 0, played: 26, wins: 10, draws: 2, losses: 14, goalsFor: 721, goalsAgainst: 769, points: 22 },
  { name: "Oppsal", primeTeamId: "441915", rank: 11, previousRank: 11, rankDelta: 0, played: 26, wins: 9, draws: 1, losses: 16, goalsFor: 740, goalsAgainst: 795, points: 19 },
  { name: "Fjellhammer", primeTeamId: "223982", rank: 12, previousRank: 12, rankDelta: 0, played: 26, wins: 6, draws: 2, losses: 18, goalsFor: 696, goalsAgainst: 807, points: 14 },
  { name: "Haslum", primeTeamId: "928836", rank: 13, previousRank: 13, rankDelta: 0, played: 26, wins: 4, draws: 0, losses: 22, goalsFor: 635, goalsAgainst: 877, points: 8 },
  { name: "Ravens", primeTeamId: "948459", rank: 14, previousRank: 14, rankDelta: 0, played: 26, wins: 2, draws: 1, losses: 23, goalsFor: 632, goalsAgainst: 877, points: 5 },
];

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
