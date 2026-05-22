import playerStatsData from "../data/fjellhammerPlayerStats.json";
import fjellhammerRosterData from "../data/fjellhammerRoster.json";
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
const DEFAULT_TEAM = "Fjellhammer";
const DEFAULT_TEAM_LOGO_URL =
  "https://www.fjellhammer.no/wp-content/uploads/sites/19/2020/01/fjellhammer.svg";
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

type ClawdbotRecentMatch = {
  matchId: string;
  date?: string | null;
  opponent?: string | null;
  homeAway?: "home" | "away" | string | null;
  goals?: number | null;
  shots?: number | null;
  assists?: number | null;
  technicalErrors?: number | null;
  suspensions?: number | null;
  mep?: number | null;
};

export type ClawdbotPlayerProfile = {
  player: ClawdbotPlayer;
  seasonStats: ClawdbotSeasonStats;
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
  recentMatches: ClawdbotRecentMatch[];
};

export type EnrichedPlayerMatchStats = PlayerMatchStats & {
  date?: string;
  opponent?: string;
  homeAway?: string;
  mep?: number;
};

const FJELLHAMMER_ROSTER = fjellhammerRosterData as StaticRosterPlayer[];
const PLAYER_STATS = playerStatsData as StaticPlayerStats[];
const PLAYER_STATS_BY_ID = Object.fromEntries(
  PLAYER_STATS.map((stats) => [stats.playerId, stats]),
);

function createStaticProfile(player: StaticRosterPlayer): ClawdbotPlayerProfile {
  const playerStats = PLAYER_STATS_BY_ID[player.id];

  return {
    player: {
      id: player.id,
      name: player.name,
      imageUrl: player.imageUrl,
      team: DEFAULT_TEAM,
      position: player.position,
      shirtNumber: player.shirtNumber,
      season: DEFAULT_SEASON,
      tournament: DEFAULT_TOURNAMENT,
    },
    seasonStats: playerStats?.seasonStats ?? {},
    recentMatches: playerStats?.recentMatches ?? [],
  };
}

const STATIC_PLAYER_PROFILES: Record<string, ClawdbotPlayerProfile> =
  Object.fromEntries(
    FJELLHAMMER_ROSTER.map((player) => [player.id, createStaticProfile(player)]),
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
  return (team ?? "").toLowerCase().includes("fjellhammer")
    ? DEFAULT_TEAM_LOGO_URL
    : undefined;
}

function sanitizeProfile(profile: ClawdbotPlayerProfile): ClawdbotPlayerProfile {
  return {
    player: profile.player,
    seasonStats: profile.seasonStats ?? {},
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

  return {
    id: playerId,
    playerId,
    season: profile.player.season ?? DEFAULT_SEASON,
    matchesPlayed: BigInt(matches),
    totalGoals: toOptionalBigInt(profile.seasonStats.goals),
    totalShots: toOptionalBigInt(profile.seasonStats.shots),
    shootingPercent: profile.seasonStats.shotPercentage ?? undefined,
    totalAssists: toOptionalBigInt(profile.seasonStats.assists),
    technicalFaults: toOptionalBigInt(profile.seasonStats.technicalErrors),
    totalTwoMin: toOptionalBigInt(profile.seasonStats.suspensions),
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
    const shots = match.shots ?? undefined;

    return {
      id: toBigInt(match.matchId, BigInt(index + 1)),
      playerId,
      matchId: toBigInt(match.matchId, BigInt(index + 1)),
      goals: toOptionalBigInt(match.goals),
      shots: toOptionalBigInt(match.shots),
      shotPct:
        goals !== undefined && shots !== undefined && shots > 0
          ? (goals / shots) * 100
          : undefined,
      assists: toOptionalBigInt(match.assists),
      turnovers: toOptionalBigInt(match.technicalErrors),
      twoMinSuspensions: toOptionalBigInt(match.suspensions),
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
