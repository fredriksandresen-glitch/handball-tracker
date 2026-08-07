export const CURRENT_SEASON_ID = "2026-27";
export const ARCHIVE_SEASON_ID = "2025-26";

export const ELITE_LEAGUE_ID = "elite";
export const FIRST_DIVISION_LEAGUE_ID = "first-division";

export type SeasonId = typeof CURRENT_SEASON_ID | typeof ARCHIVE_SEASON_ID;
export type LeagueId =
  | typeof ELITE_LEAGUE_ID
  | typeof FIRST_DIVISION_LEAGUE_ID;

export type Season = {
  id: SeasonId;
  label: string;
  statsCode: string;
  leagueName: string;
  isCurrent: boolean;
};

export type League = {
  id: LeagueId;
  label: string;
};

export const SEASONS: Season[] = [
  {
    id: CURRENT_SEASON_ID,
    label: "2026/27",
    statsCode: "2627",
    leagueName: "Elkjøp-ligaen",
    isCurrent: true,
  },
  {
    id: ARCHIVE_SEASON_ID,
    label: "2025/26",
    statsCode: "2526",
    leagueName: "REMA 1000-ligaen",
    isCurrent: false,
  },
];

export const LEAGUES: League[] = [
  { id: ELITE_LEAGUE_ID, label: "Eliteserien" },
  { id: FIRST_DIVISION_LEAGUE_ID, label: "1. divisjon" },
];

const TEAM_NAMES_BY_SEASON_AND_LEAGUE: Record<
  SeasonId,
  Record<LeagueId, string[]>
> = {
  [CURRENT_SEASON_ID]: {
    [ELITE_LEAGUE_ID]: [
      "Sola",
      "Storhamar",
      "Molde",
      "Larvik",
      "Tertnes",
      "Fredrikstad",
      "Gjerpen",
      "Flint",
      "Byåsen",
      "Fana",
      "Oppsal",
      "Follo Damer",
      "Utleira",
      "Fjellhammer",
    ],
    [FIRST_DIVISION_LEAGUE_ID]: ["Aker Topphåndball", "Kjelsås", "Volda", "Levanger", "Åsane", "Trondheim", "Gjøvik", "Ravens", "Stavanger", "Bækkelaget", "Haslum"],
  },
  [ARCHIVE_SEASON_ID]: {
    [ELITE_LEAGUE_ID]: [
      "Sola",
      "Storhamar",
      "Molde",
      "Larvik",
      "Tertnes",
      "Fana",
      "Fredrikstad",
      "Byåsen",
      "Gjerpen",
      "Follo Damer",
      "Oppsal",
      "Fjellhammer",
      "Haslum",
      "Ravens",
    ],
    [FIRST_DIVISION_LEAGUE_ID]: [],
  },
};

export function isSeasonId(value: unknown): value is SeasonId {
  return value === CURRENT_SEASON_ID || value === ARCHIVE_SEASON_ID;
}

export function isLeagueId(value: unknown): value is LeagueId {
  return value === ELITE_LEAGUE_ID || value === FIRST_DIVISION_LEAGUE_ID;
}

export function normalizeSeasonId(value: unknown): SeasonId {
  return isSeasonId(value) ? value : CURRENT_SEASON_ID;
}

export function normalizeLeagueId(value: unknown): LeagueId {
  return isLeagueId(value) ? value : ELITE_LEAGUE_ID;
}

export function getSeason(seasonId: SeasonId) {
  return SEASONS.find((season) => season.id === seasonId) ?? SEASONS[0];
}

export function getLeagueLabel(leagueId: LeagueId, seasonId: SeasonId) {
  if (leagueId === ELITE_LEAGUE_ID) return getSeason(seasonId).leagueName;
  return LEAGUES.find((league) => league.id === leagueId)?.label ?? "1. divisjon";
}

function normalizeTeamName(value: string) {
  return value
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isTeamInSeason(
  teamName: string,
  seasonId: SeasonId,
  leagueId?: LeagueId,
) {
  const normalized = normalizeTeamName(teamName);
  const leagueTeamNames = leagueId
    ? TEAM_NAMES_BY_SEASON_AND_LEAGUE[seasonId][leagueId]
    : Object.values(TEAM_NAMES_BY_SEASON_AND_LEAGUE[seasonId]).flat();

  return leagueTeamNames.some(
    (name) => normalizeTeamName(name) === normalized,
  );
}
