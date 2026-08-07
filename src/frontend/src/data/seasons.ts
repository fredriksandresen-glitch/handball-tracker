export const CURRENT_SEASON_ID = "2026-27";
export const ARCHIVE_SEASON_ID = "2025-26";

export type SeasonId = typeof CURRENT_SEASON_ID | typeof ARCHIVE_SEASON_ID;

export type Season = {
  id: SeasonId;
  label: string;
  statsCode: string;
  leagueName: string;
  isCurrent: boolean;
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

const TEAM_NAMES_BY_SEASON: Record<SeasonId, string[]> = {
  [CURRENT_SEASON_ID]: [
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
  [ARCHIVE_SEASON_ID]: [
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
};

export function isSeasonId(value: unknown): value is SeasonId {
  return value === CURRENT_SEASON_ID || value === ARCHIVE_SEASON_ID;
}

export function normalizeSeasonId(value: unknown): SeasonId {
  return isSeasonId(value) ? value : CURRENT_SEASON_ID;
}

export function getSeason(seasonId: SeasonId) {
  return SEASONS.find((season) => season.id === seasonId) ?? SEASONS[0];
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

export function isTeamInSeason(teamName: string, seasonId: SeasonId) {
  const normalized = normalizeTeamName(teamName);
  return TEAM_NAMES_BY_SEASON[seasonId].some(
    (name) => normalizeTeamName(name) === normalized,
  );
}
