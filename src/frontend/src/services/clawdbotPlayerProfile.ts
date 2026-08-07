import akerRosterData from "../data/akerRoster.json";
import kjelsaasRosterData from "../data/kjelsaasRoster.json";
import byaasenRosterData from "../data/byaasenRoster.json";
import fanaRosterData from "../data/fanaRoster.json";
import fjellhammerRosterData from "../data/fjellhammerRoster.json";
import folloRosterData from "../data/folloRoster.json";
import fredrikstadRosterData from "../data/fredrikstadRoster.json";
import gjerpenRosterData from "../data/gjerpenRoster.json";
import haslumRosterData from "../data/haslumRoster.json";
import larvikRosterData from "../data/larvikRoster.json";
import moldeRosterData from "../data/moldeRoster.json";
import oppsalRosterData from "../data/oppsalRoster.json";
import solaRosterData from "../data/solaRoster.json";
import storhamarRosterData from "../data/storhamarRoster.json";
import tertnesRosterData from "../data/tertnesRoster.json";
import utleiraRosterData from "../data/utleiraRoster.json";
import {
  ARCHIVE_SEASON_ID,
  CURRENT_SEASON_ID,
  ELITE_LEAGUE_ID,
  FIRST_DIVISION_LEAGUE_ID,
  getLeagueLabel,
  getSeason,
  isTeamInSeason,
  type LeagueId,
  type SeasonId,
} from "../data/seasons";
import { Position } from "../types/handball";
import type {
  Player,
  PlayerMatchStats,
  PlayerSeasonStats,
  Team,
} from "../types/handball";
import { resolveImageUrl } from "../utils/playerImages";

const DEFAULT_CLAWDBOT_API_BASE =
  "https://statistical-fotos-return-importance.trycloudflare.com";

const CLAWDBOT_API_BASE =
  import.meta.env.VITE_CLAWDBOT_API_BASE ?? DEFAULT_CLAWDBOT_API_BASE;

const DEFAULT_SEASON_ID = ARCHIVE_SEASON_ID;

const AKER_LOGO_URL =
  "https://akerth.no/wp-content/uploads/sites/3/2021/11/aker.svg";
const KJELSAAS_LOGO_URL =
  "https://kjelsaas.topphandball.no/wp-content/uploads/sites/82/2025/05/Kjelsaas-favicon.png";
const BYAASEN_LOGO_URL =
  "https://byaasen.no/wp-content/uploads/sites/4/2022/10/byaasen.svg";
const FANA_LOGO_URL =
  "https://www.fanahandball.no/wp-content/uploads/sites/5/2024/05/Fana-IL-logo.svg";
const FJELLHAMMER_LOGO_URL =
  "https://www.fjellhammer.no/wp-content/uploads/sites/19/2020/01/fjellhammer.svg";
const FOLLO_LOGO_URL =
  "https://follohk-damer.topphandball.no/wp-content/uploads/sites/34/2026/01/follohokdamer-hvit.svg";
const FREDRIKSTAD_LOGO_URL = "/assets/team-logos/fredrikstad.svg";
const GJERPEN_LOGO_URL =
  "https://gjerpenhandball.no/wp-content/uploads/sites/36/2019/09/gjerpen.svg";
const HASLUM_LOGO_URL =
  "https://haslum.topphandball.no/wp-content/uploads/sites/30/2021/07/haslum.svg";
const LARVIK_LOGO_URL =
  "https://www.larvikhk.no/wp-content/uploads/sites/7/2019/08/larvikhk.svg";
const MOLDE_LOGO_URL =
  "https://www.handballjentan.no/wp-content/uploads/sites/8/2021/07/MOLDE-ELITE-LOGO.svg";
const OPPSAL_LOGO_URL =
  "https://www.oppsalhandball.no/wp-content/uploads/sites/38/2019/06/oppsal.svg";
const SOLA_LOGO_URL =
  "https://sola-hk.no/wp-content/uploads/sites/10/2022/10/SOLA-GUL.svg";
const STORHAMAR_LOGO_URL =
  "https://storhamar.topphandball.no/wp-content/uploads/sites/11/2022/10/Storhamar.svg";
const TERTNES_LOGO_URL =
  "https://tertneshandball.admin.topphandball.no/wp-content/uploads/sites/12/2022/10/Tertnes-2.svg";
const UTLEIRA_LOGO_URL =
  "https://utleira.topphandball.no/wp-content/uploads/sites/66/2024/08/utleira-logo.png";
const FLINT_LOGO_URL =
  "https://flinthandball.admin.topphandball.no/wp-content/uploads/sites/33/2022/10/flint_fav.png";

type ClawdbotPlayer = {
  id: string;
  name: string;
  imageUrl?: string | null;
  team?: string | null;
  position?: string | null;
  shirtNumber?: number | null;
  season?: string | null;
  tournament?: string | null;
};

type ClawdbotSeasonStats = {
  matches?: number | null;
  goals?: number | null;
  shots?: number | null;
  shotPercentage?: number | null;
  assists?: number | null;
  technicalErrors?: number | null;
  suspensions?: number | null;
  mepAvg?: number | null;
  mepTotal?: number | null;
};

type ClawdbotGoalkeeperStats = {
  saves?: number | null;
  savePercentage?: number | null;
  goalsConceded?: number | null;
  shotsAgainst?: number | null;
};

type ClawdbotRecentMatch = {
  matchId: string;
  date?: string | null;
  opponent?: string | null;
  homeAway?: "home" | "away" | string | null;
  goals?: number | null;
  shots?: number | null;
  shotPercentage?: number | null;
  fieldGoals?: number | null;
  fieldShots?: number | null;
  fieldShotPercentage?: number | null;
  sevenMeterGoals?: number | null;
  sevenMeterShots?: number | null;
  sevenMeterShotPercentage?: number | null;
  assists?: number | null;
  technicalErrors?: number | null;
  causedSevenMeters?: number | null;
  awardedSevenMeters?: number | null;
  warnings?: number | null;
  suspensions?: number | null;
  redCards?: number | null;
  playTime?: string | null;
  mep?: number | null;
  saves?: number | null;
  savePercentage?: number | null;
  goalsConceded?: number | null;
  shotsAgainst?: number | null;
};

export type ClawdbotPlayerProfile = {
  player: ClawdbotPlayer;
  seasonStats: ClawdbotSeasonStats;
  goalkeeperStats?: ClawdbotGoalkeeperStats;
  recentMatches: ClawdbotRecentMatch[];
};

type StaticRosterPlayer = {
  id: string;
  name: string;
  imageUrl?: string;
  position: string;
  shirtNumber: number;
};

type StaticPlayerStats = {
  playerId: string;
  seasonStats: ClawdbotSeasonStats;
  goalkeeperStats?: ClawdbotGoalkeeperStats;
  recentMatches: ClawdbotRecentMatch[];
};

export type EnrichedPlayerMatchStats = PlayerMatchStats & {
  date?: string;
  opponent?: string;
  homeAway?: string;
  mep?: number;
  goalsConceded?: bigint;
  shotsAgainst?: bigint;
  shotPercentage?: number;
  fieldGoals?: bigint;
  fieldShots?: bigint;
  fieldShotPercentage?: number;
  sevenMeterGoals?: bigint;
  sevenMeterShots?: bigint;
  sevenMeterShotPercentage?: number;
  causedSevenMeters?: bigint;
  awardedSevenMeters?: bigint;
  warnings?: bigint;
  redCards?: bigint;
  playTime?: string;
};

type StaticTeamConfig = {
  name: string;
  logoUrl: string;
  roster: StaticRosterPlayer[];
  statsUrl: string;
  statsById?: Record<string, StaticPlayerStats>;
  dataSeason?: SeasonId;
  leagueId?: LeagueId;
};

const STATIC_TEAM_CONFIGS: StaticTeamConfig[] = [
  {
    name: "Aker Topphåndball",
    logoUrl: AKER_LOGO_URL,
    roster: akerRosterData as StaticRosterPlayer[],
    statsUrl: "",
    dataSeason: CURRENT_SEASON_ID,
    leagueId: FIRST_DIVISION_LEAGUE_ID,
  },
  {
    name: "Kjelsås",
    logoUrl: KJELSAAS_LOGO_URL,
    roster: kjelsaasRosterData as StaticRosterPlayer[],
    statsUrl: "",
    dataSeason: CURRENT_SEASON_ID,
    leagueId: FIRST_DIVISION_LEAGUE_ID,
  },
  {
    name: "Fjellhammer",
    logoUrl: FJELLHAMMER_LOGO_URL,
    roster: fjellhammerRosterData as StaticRosterPlayer[],
    statsUrl: "/data/player-stats/fjellhammerPlayerStats.json",
  },
  {
    name: "Larvik",
    logoUrl: LARVIK_LOGO_URL,
    roster: larvikRosterData as StaticRosterPlayer[],
    statsUrl: "/data/player-stats/larvikPlayerStats.json",
  },
  {
    name: "Fana",
    logoUrl: FANA_LOGO_URL,
    roster: fanaRosterData as StaticRosterPlayer[],
    statsUrl: "/data/player-stats/fanaPlayerStats.json",
  },
  {
    name: "Follo Damer",
    logoUrl: FOLLO_LOGO_URL,
    roster: folloRosterData as StaticRosterPlayer[],
    statsUrl: "/data/player-stats/folloPlayerStats.json",
  },
  {
    name: "Fredrikstad",
    logoUrl: FREDRIKSTAD_LOGO_URL,
    roster: fredrikstadRosterData as StaticRosterPlayer[],
    statsUrl: "/data/player-stats/fredrikstadPlayerStats.json",
  },
  {
    name: "Gjerpen",
    logoUrl: GJERPEN_LOGO_URL,
    roster: gjerpenRosterData as StaticRosterPlayer[],
    statsUrl: "/data/player-stats/gjerpenPlayerStats.json",
  },
  {
    name: "Haslum",
    logoUrl: HASLUM_LOGO_URL,
    roster: haslumRosterData as StaticRosterPlayer[],
    statsUrl: "/data/player-stats/haslumPlayerStats.json",
  },
  {
    name: "Byåsen",
    logoUrl: BYAASEN_LOGO_URL,
    roster: byaasenRosterData as StaticRosterPlayer[],
    statsUrl: "/data/player-stats/byaasenPlayerStats.json",
  },
  {
    name: "Molde",
    logoUrl: MOLDE_LOGO_URL,
    roster: moldeRosterData as StaticRosterPlayer[],
    statsUrl: "/data/player-stats/moldePlayerStats.json",
  },
  {
    name: "Oppsal",
    logoUrl: OPPSAL_LOGO_URL,
    roster: oppsalRosterData as StaticRosterPlayer[],
    statsUrl: "/data/player-stats/oppsalPlayerStats.json",
  },
  {
    name: "Sola",
    logoUrl: SOLA_LOGO_URL,
    roster: solaRosterData as StaticRosterPlayer[],
    statsUrl: "/data/player-stats/solaPlayerStats.json",
  },
  {
    name: "Storhamar",
    logoUrl: STORHAMAR_LOGO_URL,
    roster: storhamarRosterData as StaticRosterPlayer[],
    statsUrl: "/data/player-stats/storhamarPlayerStats.json",
  },
  {
    name: "Tertnes",
    logoUrl: TERTNES_LOGO_URL,
    roster: tertnesRosterData as StaticRosterPlayer[],
    statsUrl: "/data/player-stats/tertnesPlayerStats.json",
  },
  {
    name: "Utleira",
    logoUrl: UTLEIRA_LOGO_URL,
    roster: utleiraRosterData as StaticRosterPlayer[],
    statsUrl: "",
    dataSeason: CURRENT_SEASON_ID,
  },
  {
    name: "Flint",
    logoUrl: FLINT_LOGO_URL,
    roster: [],
    statsUrl: "",
    dataSeason: CURRENT_SEASON_ID,
  },
];

function getTeamDataSeason(team: StaticTeamConfig): SeasonId {
  return team.dataSeason ?? DEFAULT_SEASON_ID;
}

function getTeamLeagueId(team: StaticTeamConfig): LeagueId {
  return team.leagueId ?? ELITE_LEAGUE_ID;
}

function normalizeTeamLookup(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/\u00e6/g, "ae")
    .replace(/\u00f8/g, "o")
    .replace(/\u00e5/g, "a")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stableTeamId(team?: string | null) {
  const source = team || "unknown-team";
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % 1_000_000;
  }
  return BigInt(hash || 1);
}

function toBigInt(value: string | number | null | undefined, fallback = 0n) {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    return BigInt(value);
  } catch {
    return fallback;
  }
}

function toOptionalBigInt(value: number | null | undefined) {
  return value === null || value === undefined ? undefined : BigInt(value);
}

function statsById(stats: StaticPlayerStats[]) {
  return Object.fromEntries(stats.map((item) => [item.playerId, item]));
}

function loadTeamStats(team: StaticTeamConfig) {
  if (team.statsById) return team.statsById;
  if (!team.statsUrl) return {};
  if (typeof XMLHttpRequest === "undefined") return {};

  try {
    const request = new XMLHttpRequest();
    request.open("GET", team.statsUrl, false);
    request.send(null);

    if (request.status < 200 || request.status >= 300) return {};

    const parsed = JSON.parse(request.responseText) as StaticPlayerStats[];
    team.statsById = statsById(parsed);
    return team.statsById;
  } catch {
    return {};
  }
}

const STATIC_TEAM_LOGOS = Object.fromEntries(
  STATIC_TEAM_CONFIGS.map((team) => [normalizeTeamLookup(team.name), team.logoUrl]),
);

const STATIC_TEAM_LOGO_ALIASES: Record<string, string> = {
  follo: FOLLO_LOGO_URL,
  "follo damer": FOLLO_LOGO_URL,
  "follo hk damer": FOLLO_LOGO_URL,
  haslum: HASLUM_LOGO_URL,
  "haslum topphandballforening": HASLUM_LOGO_URL,
  oppsal: OPPSAL_LOGO_URL,
  "oppsal håndball": OPPSAL_LOGO_URL,
  "oppsal handball": OPPSAL_LOGO_URL,
  sola: SOLA_LOGO_URL,
  "sola hk": SOLA_LOGO_URL,
  storhamar: STORHAMAR_LOGO_URL,
  "storhamar håndball elite": STORHAMAR_LOGO_URL,
  "storhamar handball elite": STORHAMAR_LOGO_URL,
  tertnes: TERTNES_LOGO_URL,
  "tertnes elite": TERTNES_LOGO_URL,
  "tertnes håndball elite": TERTNES_LOGO_URL,
  "tertnes handball elite": TERTNES_LOGO_URL,
  aker: AKER_LOGO_URL,
  "aker topphandball": AKER_LOGO_URL,
  kjelsas: KJELSAAS_LOGO_URL,
  utleira: UTLEIRA_LOGO_URL,
  "utleira il": UTLEIRA_LOGO_URL,
  flint: FLINT_LOGO_URL,
  "flint tonsberg": FLINT_LOGO_URL,
};

function mapPosition(position?: string | null): Position {
  const normalized = normalizeTeamLookup(position);

  if (
    normalized.includes("keeper") ||
    normalized.includes("malvakt") ||
    normalized.includes("mlvakt")
  ) {
    return Position.Keeper;
  }

  if (normalized.includes("kant") && normalized.includes("venstre")) {
    return Position.VenstreKant;
  }

  if (
    normalized.includes("kant") &&
    (normalized.includes("hoyre") || normalized.includes("hyre"))
  ) {
    return Position.HoyreKant;
  }

  if (normalized.includes("linje") || normalized.includes("strek")) {
    return Position.Linje;
  }

  return Position.Bakspiller;
}

function createStaticProfile(
  player: StaticRosterPlayer,
  team: StaticTeamConfig,
): ClawdbotPlayerProfile {
  const playerStats = loadTeamStats(team)[player.id];

  return {
    player: {
      id: player.id,
      name: player.name,
      imageUrl: resolveImageUrl(player.imageUrl),
      team: team.name,
      position: player.position,
      shirtNumber: player.shirtNumber,
      season: getSeason(getTeamDataSeason(team)).statsCode,
      tournament: `${getLeagueLabel(
        getTeamLeagueId(team),
        getTeamDataSeason(team),
      )} kvinner`,
    },
    seasonStats: playerStats?.seasonStats ?? {},
    goalkeeperStats: playerStats?.goalkeeperStats,
    recentMatches: playerStats?.recentMatches ?? [],
  };
}

function createStaticRosterProfile(
  player: StaticRosterPlayer,
  team: StaticTeamConfig,
): ClawdbotPlayerProfile {
  return {
    player: {
      id: player.id,
      name: player.name,
      imageUrl: resolveImageUrl(player.imageUrl),
      team: team.name,
      position: player.position,
      shirtNumber: player.shirtNumber,
      season: getSeason(getTeamDataSeason(team)).statsCode,
      tournament: `${getLeagueLabel(
        getTeamLeagueId(team),
        getTeamDataSeason(team),
      )} kvinner`,
    },
    seasonStats: {},
    recentMatches: [],
  };
}

const STATIC_PLAYER_INDEX: Record<
  string,
  { player: StaticRosterPlayer; team: StaticTeamConfig }
> = Object.fromEntries(
  STATIC_TEAM_CONFIGS.flatMap((team) =>
    team.roster.map((player) => [player.id, { player, team }]),
  ),
);

export function getStaticProfile(
  playerId: bigint,
  seasonId?: SeasonId,
): ClawdbotPlayerProfile | null {
  const entry = STATIC_PLAYER_INDEX[playerId.toString()];
  if (!entry) return null;
  if (seasonId && getTeamDataSeason(entry.team) !== seasonId) return null;
  return createStaticProfile(entry.player, entry.team);
}

export function getStaticTeamLogoUrl(team?: string | null) {
  const normalized = normalizeTeamLookup(team);
  const aliasLogo = Object.entries(STATIC_TEAM_LOGO_ALIASES).find(
    ([key]) =>
      normalized === key || normalized.includes(key) || key.includes(normalized),
  )?.[1];

  if (aliasLogo) return aliasLogo;

  return Object.entries(STATIC_TEAM_LOGOS).find(([key]) =>
    normalized === key || normalized.includes(key) || key.includes(normalized),
  )?.[1];
}

function sanitizeProfile(profile: ClawdbotPlayerProfile): ClawdbotPlayerProfile {
  return {
    player: profile.player,
    seasonStats: profile.seasonStats ?? {},
    goalkeeperStats: profile.goalkeeperStats,
    recentMatches: (profile.recentMatches ?? []).filter(
      (match) => match.matchId && match.date,
    ),
  };
}

export async function fetchClawdbotPlayerProfile(
  playerId: bigint,
): Promise<ClawdbotPlayerProfile | null> {
  const staticProfile = getStaticProfile(playerId);

  if (!CLAWDBOT_API_BASE) return staticProfile;

  try {
    const url = new URL("/player-profile", CLAWDBOT_API_BASE);
    url.searchParams.set("playerId", playerId.toString());

    const response = await fetch(url.toString());
    if (!response.ok) return staticProfile;

    const data = (await response.json()) as ClawdbotPlayerProfile;
    if (!data?.player?.id || !data?.player?.name) return staticProfile;

    return sanitizeProfile(data);
  } catch {
    return staticProfile;
  }
}

export function mapClawdbotPlayer(profile: ClawdbotPlayerProfile): Player {
  const playerId = toBigInt(profile.player.id);

  return {
    id: playerId,
    name: profile.player.name,
    slug: slugify(profile.player.name),
    isActive: true,
    jerseyNumber: toOptionalBigInt(profile.player.shirtNumber),
    imageUrl: resolveImageUrl(profile.player.imageUrl),
    teamId: stableTeamId(profile.player.team),
    position: mapPosition(profile.player.position),
  };
}

export function mapClawdbotSeasonStats(
  profile: ClawdbotPlayerProfile,
): PlayerSeasonStats {
  const playerId = toBigInt(profile.player.id);
  const matches = profile.seasonStats.matches ?? 0;
  const goals = profile.seasonStats.goals ?? 0;
  const assists = profile.seasonStats.assists ?? 0;
  const goalkeeper = profile.goalkeeperStats;

  return {
    id: playerId,
    playerId,
    season: profile.player.season ?? getSeason(DEFAULT_SEASON_ID).statsCode,
    matchesPlayed: BigInt(matches),
    totalGoals: toOptionalBigInt(profile.seasonStats.goals),
    totalShots: toOptionalBigInt(
      goalkeeper?.shotsAgainst ?? profile.seasonStats.shots,
    ),
    shootingPercent:
      goalkeeper?.savePercentage ?? profile.seasonStats.shotPercentage ?? undefined,
    totalAssists: toOptionalBigInt(profile.seasonStats.assists),
    technicalFaults: toOptionalBigInt(profile.seasonStats.technicalErrors),
    totalTwoMin: toOptionalBigInt(profile.seasonStats.suspensions),
    totalSaves: toOptionalBigInt(goalkeeper?.saves),
    mepAvg: profile.seasonStats.mepAvg ?? undefined,
    mepTotal: profile.seasonStats.mepTotal ?? undefined,
    goalsPerGame: matches > 0 ? goals / matches : undefined,
    assistsPerGame: matches > 0 ? assists / matches : undefined,
  };
}

export function mapClawdbotMatchStats(
  profile: ClawdbotPlayerProfile,
): EnrichedPlayerMatchStats[] {
  const playerId = toBigInt(profile.player.id);

  return profile.recentMatches.map((match, index) => {
    const goals = match.goals ?? undefined;
    const shots = match.shots ?? match.shotsAgainst ?? undefined;

    return {
      id: toBigInt(match.matchId, BigInt(index + 1)),
      playerId,
      matchId: toBigInt(match.matchId, BigInt(index + 1)),
      goals: toOptionalBigInt(match.goals),
      shots: toOptionalBigInt(match.shots ?? match.shotsAgainst),
      shotPct:
        match.shotPercentage ??
        (goals !== undefined && shots !== undefined && shots > 0
          ? (goals / shots) * 100
          : undefined),
      assists: toOptionalBigInt(match.assists),
      turnovers: toOptionalBigInt(match.technicalErrors),
      twoMinSuspensions: toOptionalBigInt(match.suspensions),
      saves: toOptionalBigInt(match.saves),
      savePct: match.savePercentage ?? undefined,
      goalsConceded: toOptionalBigInt(match.goalsConceded),
      shotsAgainst: toOptionalBigInt(match.shotsAgainst ?? match.shots),
      shotPercentage: match.shotPercentage ?? undefined,
      fieldGoals: toOptionalBigInt(match.fieldGoals),
      fieldShots: toOptionalBigInt(match.fieldShots),
      fieldShotPercentage: match.fieldShotPercentage ?? undefined,
      sevenMeterGoals: toOptionalBigInt(match.sevenMeterGoals),
      sevenMeterShots: toOptionalBigInt(match.sevenMeterShots),
      sevenMeterShotPercentage: match.sevenMeterShotPercentage ?? undefined,
      causedSevenMeters: toOptionalBigInt(match.causedSevenMeters),
      awardedSevenMeters: toOptionalBigInt(match.awardedSevenMeters),
      warnings: toOptionalBigInt(match.warnings),
      redCards: toOptionalBigInt(match.redCards),
      playTime: match.playTime ?? undefined,
      date: match.date ?? undefined,
      opponent: match.opponent ?? undefined,
      homeAway: match.homeAway ?? undefined,
      mep: match.mep ?? undefined,
    };
  });
}

export function getStaticPlayers(
  seasonId?: SeasonId,
  leagueId?: LeagueId,
): Player[] {
  return Object.values(STATIC_PLAYER_INDEX)
    .filter(
      ({ team }) =>
        (!seasonId || getTeamDataSeason(team) === seasonId) &&
        (!leagueId || getTeamLeagueId(team) === leagueId),
    )
    .map(({ player, team }) =>
      mapClawdbotPlayer(createStaticRosterProfile(player, team)),
    );
}

export function searchStaticPlayers(term: string): Player[] {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return [];

  return getStaticPlayers().filter((player) => {
    const profile = getStaticProfile(player.id);
    const team = profile?.player.team?.toLowerCase() ?? "";
    const position = profile?.player.position?.toLowerCase() ?? "";

    return (
      player.name.toLowerCase().includes(normalized) ||
      team.includes(normalized) ||
      position.includes(normalized)
    );
  });
}

export function getStaticTeams(
  seasonId?: SeasonId,
  leagueId?: LeagueId,
): Team[] {
  return STATIC_TEAM_CONFIGS.filter((team) => {
    const teamLeagueId = getTeamLeagueId(team);
    if (leagueId && teamLeagueId !== leagueId) return false;
    return !seasonId || isTeamInSeason(team.name, seasonId, teamLeagueId);
  }).map((team) => {
    const id = stableTeamId(team.name);

    return {
      id,
      name: team.name,
      slug: slugify(team.name),
      logoUrl: getStaticTeamLogoUrl(team.name),
    };
  });
}

export function getStaticTeam(
  id: bigint,
  seasonId?: SeasonId,
  leagueId?: LeagueId,
): Team | null {
  return getStaticTeams(seasonId, leagueId).find((team) => team.id === id) ?? null;
}

export function getStaticTeamLeagueId(id: bigint): LeagueId | undefined {
  const team = STATIC_TEAM_CONFIGS.find(
    (candidate) => stableTeamId(candidate.name) === id,
  );
  return team ? getTeamLeagueId(team) : undefined;
}

export function getStaticPlayerLeagueId(
  playerId: bigint,
): LeagueId | undefined {
  const entry = STATIC_PLAYER_INDEX[playerId.toString()];
  return entry ? getTeamLeagueId(entry.team) : undefined;
}
