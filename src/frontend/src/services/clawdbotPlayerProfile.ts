import byaasenPlayerStatsData from "../data/byaasenPlayerStats.json";
import byaasenRosterData from "../data/byaasenRoster.json";
import fjellhammerPlayerStatsData from "../data/fjellhammerPlayerStats.json";
import fjellhammerRosterData from "../data/fjellhammerRoster.json";
import larvikPlayerStatsData from "../data/larvikPlayerStats.json";
import larvikRosterData from "../data/larvikRoster.json";
import moldePlayerStatsData from "../data/moldePlayerStats.json";
import moldeRosterData from "../data/moldeRoster.json";
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
const FJELLHAMMER_LOGO_URL =
  "https://www.fjellhammer.no/wp-content/uploads/sites/19/2020/01/fjellhammer.svg";
const LARVIK_LOGO_URL =
  "https://www.larvikhk.no/wp-content/uploads/sites/7/2019/08/larvikhk.svg";
const MOLDE_LOGO_URL =
  "https://www.handballjentan.no/wp-content/uploads/sites/8/2021/07/MOLDE-ELITE-LOGO.svg";
const DEFAULT_TOURNAMENT = "REMA 1000-ligaen kvinner";

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
  statsById: Record<string, StaticPlayerStats>;
};

function statsById(stats: StaticPlayerStats[]) {
  return Object.fromEntries(stats.map((item) => [item.playerId, item]));
}

const STATIC_TEAM_CONFIGS: StaticTeamConfig[] = [
  {
    name: "Fjellhammer",
    logoUrl: FJELLHAMMER_LOGO_URL,
    roster: fjellhammerRosterData as StaticRosterPlayer[],
    statsById: statsById(fjellhammerPlayerStatsData as StaticPlayerStats[]),
  },
  {
    name: "Larvik",
    logoUrl: LARVIK_LOGO_URL,
    roster: larvikRosterData as StaticRosterPlayer[],
    statsById: statsById(larvikPlayerStatsData as StaticPlayerStats[]),
  },
  {
    name: "Byåsen",
    logoUrl: BYAASEN_LOGO_URL,
    roster: byaasenRosterData as StaticRosterPlayer[],
    statsById: statsById(byaasenPlayerStatsData as StaticPlayerStats[]),
  },
  {
    name: "Molde",
    logoUrl: MOLDE_LOGO_URL,
    roster: moldeRosterData as StaticRosterPlayer[],
    statsById: statsById(moldePlayerStatsData as StaticPlayerStats[]),
  },
];

const STATIC_TEAM_LOGOS = Object.fromEntries(
  STATIC_TEAM_CONFIGS.map((team) => [team.name.toLowerCase(), team.logoUrl]),
);

function createStaticProfile(
  player: StaticRosterPlayer,
  team: StaticTeamConfig,
): ClawdbotPlayerProfile {
  const playerStats = team.statsById[player.id];

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

const STATIC_PLAYER_PROFILES: Record<string, ClawdbotPlayerProfile> =
  Object.fromEntries(
    STATIC_TEAM_CONFIGS.flatMap((team) =>
      team.roster.map((player) => [player.id, createStaticProfile(player, team)]),
    ),
  );

export function getStaticProfile(playerId: bigint): ClawdbotPlayerProfile | null {
  return STATIC_PLAYER_PROFILES[playerId.toString()] ?? null;
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

  if (normalized.includes("keeper") || normalized.includes("målvakt")) {
    return Position.Keeper;
  }

  if (normalized.includes("kant") && normalized.includes("venstre")) {
    return Position.VenstreKant;
  }

  if (
    normalized.includes("kant") &&
    (normalized.includes("høyre") || normalized.includes("hoyre"))
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

function teamLogoUrl(team?: string | null) {
  const normalized = (team ?? "").toLowerCase();
  return Object.entries(STATIC_TEAM_LOGOS).find(([key]) =>
    normalized.includes(key),
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
  return Object.values(STATIC_PLAYER_PROFILES).map(mapClawdbotPlayer);
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
  const uniqueTeams = new Map<string, Team>();

  for (const profile of Object.values(STATIC_PLAYER_PROFILES)) {
    const name = profile.player.team;
    if (!name) continue;

    const id = stableTeamId(name);
    uniqueTeams.set(id.toString(), {
      id,
      name,
      slug: slugify(name),
      logoUrl: teamLogoUrl(name),
    });
  }

  return Array.from(uniqueTeams.values());
}

export function getStaticTeam(id: bigint): Team | null {
  return getStaticTeams().find((team) => team.id === id) ?? null;
}
