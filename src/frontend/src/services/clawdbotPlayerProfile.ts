import byaasenRosterData from "../data/byaasenRoster.json";
import fanaRosterData from "../data/fanaRoster.json";
import fjellhammerRosterData from "../data/fjellhammerRoster.json";
import folloRosterData from "../data/folloRoster.json";
import fredrikstadRosterData from "../data/fredrikstadRoster.json";
import gjerpenRosterData from "../data/gjerpenRoster.json";
import larvikRosterData from "../data/larvikRoster.json";
import moldeRosterData from "../data/moldeRoster.json";
import solaRosterData from "../data/solaRoster.json";
import storhamarRosterData from "../data/storhamarRoster.json";
import tertnesRosterData from "../data/tertnesRoster.json";
import { Position } from "../types/handball";
import type {
  Player,
  PlayerMatchStats,
  PlayerSeasonStats,
  Team,
} from "../types/handball";

const DEFAULT_CLAWDBOT_API_BASE =
  "https://statistical-fotos-return-importance.trycloudflare.com";

const CLAWDBOT_API_BASE =
  import.meta.env.VITE_CLAWDBOT_API_BASE ?? DEFAULT_CLAWDBOT_API_BASE;

const DEFAULT_SEASON = "2526";
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
const LARVIK_LOGO_URL =
  "https://www.larvikhk.no/wp-content/uploads/sites/7/2019/08/larvikhk.svg";
const MOLDE_LOGO_URL =
  "https://www.handballjentan.no/wp-content/uploads/sites/8/2021/07/MOLDE-ELITE-LOGO.svg";
const SOLA_LOGO_URL =
  "https://sola-hk.no/wp-content/uploads/sites/10/2022/10/SOLA-GUL.svg";
const STORHAMAR_LOGO_URL =
  "https://storhamar.topphandball.no/wp-content/uploads/sites/11/2022/10/Storhamar.svg";
const TERTNES_LOGO_URL =
  "https://tertneshandball.admin.topphandball.no/wp-content/uploads/sites/12/2022/10/Tertnes-2.svg";
const DEFAULT_TOURNAMENT = "REMA 1000-ligaen kvinner";

function normalizeTeamLookup(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

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
  imageUrl: string;
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
};

function statsById(stats: StaticPlayerStats[]) {
  return Object.fromEntries(stats.map((item) => [item.playerId, item]));
}

function assetUrl(path: string) {
  return new URL(path, import.meta.url).href;
}

function loadTeamStats(team: StaticTeamConfig) {
  if (team.statsById) return team.statsById;
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

const STATIC_TEAM_CONFIGS: StaticTeamConfig[] = [
  {
    name: "Fjellhammer",
    logoUrl: FJELLHAMMER_LOGO_URL,
    roster: fjellhammerRosterData as StaticRosterPlayer[],
    statsUrl: assetUrl("../data/fjellhammerPlayerStats.json"),
  },
  {
    name: "Larvik",
    logoUrl: LARVIK_LOGO_URL,
    roster: larvikRosterData as StaticRosterPlayer[],
    statsUrl: assetUrl("../data/larvikPlayerStats.json"),
  },
  {
    name: "Fana",
    logoUrl: FANA_LOGO_URL,
    roster: fanaRosterData as StaticRosterPlayer[],
    statsUrl: assetUrl("../data/fanaPlayerStats.json"),
  },
  {
    name: "Follo Damer",
    logoUrl: FOLLO_LOGO_URL,
    roster: folloRosterData as StaticRosterPlayer[],
    statsUrl: assetUrl("../data/folloPlayerStats.json"),
  },
  {
    name: "Fredrikstad",
    logoUrl: FREDRIKSTAD_LOGO_URL,
    roster: fredrikstadRosterData as StaticRosterPlayer[],
    statsUrl: assetUrl("../data/fredrikstadPlayerStats.json"),
  },
  {
    name: "Gjerpen",
    logoUrl: GJERPEN_LOGO_URL,
    roster: gjerpenRosterData as StaticRosterPlayer[],
    statsUrl: assetUrl("../data/gjerpenPlayerStats.json"),
  },
  {
    name: "ByÃ¥sen",
    logoUrl: BYAASEN_LOGO_URL,
    roster: byaasenRosterData as StaticRosterPlayer[],
    statsUrl: assetUrl("../data/byaasenPlayerStats.json"),
  },
  {
    name: "Molde",
    logoUrl: MOLDE_LOGO_URL,
    roster: moldeRosterData as StaticRosterPlayer[],
    statsUrl: assetUrl("../data/moldePlayerStats.json"),
  },
  {
    name: "Sola",
    logoUrl: SOLA_LOGO_URL,
    roster: solaRosterData as StaticRosterPlayer[],
    statsUrl: assetUrl("../data/solaPlayerStats.json"),
  },
  {
    name: "Storhamar",
    logoUrl: STORHAMAR_LOGO_URL,
    roster: storhamarRosterData as StaticRosterPlayer[],
    statsUrl: assetUrl("../data/storhamarPlayerStats.json"),
  },
  {
    name: "Tertnes",
    logoUrl: TERTNES_LOGO_URL,
    roster: tertnesRosterData as StaticRosterPlayer[],
    statsUrl: assetUrl("../data/tertnesPlayerStats.json"),
  },
];

const STATIC_TEAM_LOGOS = Object.fromEntries(
  STATIC_TEAM_CONFIGS.map((team) => [normalizeTeamLookup(team.name), team.logoUrl]),
);

const STATIC_TEAM_LOGO_ALIASES: Record<string, string> = {
  "follo": FOLLO_LOGO_URL,
  "follo damer": FOLLO_LOGO_URL,
  "follo hk damer": FOLLO_LOGO_URL,
  "sola": SOLA_LOGO_URL,
  "sola hk": SOLA_LOGO_URL,
  "storhamar": STORHAMAR_LOGO_URL,
  "storhamar hÃ¥ndball elite": STORHAMAR_LOGO_URL,
  "storhamar handball elite": STORHAMAR_LOGO_URL,
  "tertnes": TERTNES_LOGO_URL,
  "tertnes elite": TERTNES_LOGO_URL,
  "tertnes hÃ¥ndball elite": TERTNES_LOGO_URL,
  "tertnes handball elite": TERTNES_LOGO_URL,
};

function createStaticProfile(
  player: StaticRosterPlayer,
  team: StaticTeamConfig,
): ClawdbotPlayerProfile {
  const playerStats = loadTeamStats(team)[player.id];

  return {
    player: {
      id: player.id,
      name: player.name,
      imageUrl: player.imageUrl,
      team: team.name,
      position: player.position,
      shirtNumber: player.shirtNumber,
      season: DEFAULT_SEASON,
      tournament: DEFAULT_TOURNAMENT,
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
      imageUrl: player.imageUrl,
      team: team.name,
      position: player.position,
      shirtNumber: player.shirtNumber,
      season: DEFAULT_SEASON,
      tournament: DEFAULT_TOURNAMENT,
    },
    seasonStats: {},
    recentMatches: [],
  };
}

const STATIC_PLAYER_INDEX: Record<
  string,
  { player: StaticRosterPlayer; team: StaticTeamConfig }
> =
  Object.fromEntries(
    STATIC_TEAM_CONFIGS.flatMap((team) =>
      team.roster.map((player) => [player.id, { player, team }]),
    ),
  );

export function getStaticProfile(playerId: bigint): ClawdbotPlayerProfile | null {
  const entry = STATIC_PLAYER_INDEX[playerId.toString()];
  return entry ? createStaticProfile(entry.player, entry.team) : null;
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapPosition(position?: string | null): Position {
  const normalized = (position ?? "").toLowerCase();

  if (normalized.includes("keeper") || normalized.includes("mÃ¥lvakt")) {
    return Position.Keeper;
  }

  if (normalized.includes("kant") && normalized.includes("venstre")) {
    return Position.VenstreKant;
  }

  if (
    normalized.includes("kant") &&
    (normalized.includes("hÃ¸yre") || normalized.includes("hoyre"))
  ) {
    return Position.HoyreKant;
  }

  if (normalized.includes("linje") || normalized.includes("strek")) {
    return Position.Linje;
  }

  return Position.Bakspiller;
}

function stableTeamId(team?: string | null) {
  const source = team || "unknown-team";
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % 1_000_000;
  }
  return BigInt(hash || 1);
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
    imageUrl: profile.player.imageUrl || undefined,
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
    season: profile.player.season ?? DEFAULT_SEASON,
    matchesPlayed: BigInt(matches),
    totalGoals: toOptionalBigInt(profile.seasonStats.goals),
    totalShots: toOptionalBigInt(
      goalkeeper?.shotsAgainst ?? profile.seasonStats.shots,
    ),
    shootingPercent: goalkeeper?.savePercentage ?? profile.seasonStats.shotPercentage ?? undefined,
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

export function getStaticPlayers(): Player[] {
  return Object.values(STATIC_PLAYER_INDEX).map(({ player, team }) =>
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

export function getStaticTeams(): Team[] {
  return STATIC_TEAM_CONFIGS.map((team) => {
    const id = stableTeamId(team.name);

    return {
      id,
      name: team.name,
      slug: slugify(team.name),
      logoUrl: getStaticTeamLogoUrl(team.name),
    };
  });
}

export function getStaticTeam(id: bigint): Team | null {
  return getStaticTeams().find((team) => team.id === id) ?? null;
}
