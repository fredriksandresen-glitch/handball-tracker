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

const FJELLHAMMER_ROSTER: StaticRosterPlayer[] = [
  {
    id: "2239826783348",
    name: "My Lervold",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/My-Lervold-Fjellhammer.png?v=1773826257",
    position: "Kantspiller venstre",
    shirtNumber: 2,
  },
  {
    id: "2239827978957",
    name: "Martine Tveter",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/Martine-Tveter-Fjellhammer.png?v=1773826257",
    position: "Bakspiller midt",
    shirtNumber: 4,
  },
  {
    id: "2239829220488",
    name: "Julie Rensmoen Benterud",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/Julie-Rensmoen-Benterud-Fjellhammer.png?v=1773826257",
    position: "Kantspiller høyre",
    shirtNumber: 5,
  },
  {
    id: "2239826718083",
    name: "Tuva Knai",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/Tuva-Knai-Fjellhammer.png?v=1773826257",
    position: "Linjespiller",
    shirtNumber: 6,
  },
  {
    id: "2239828127509",
    name: "Inga Sandvold",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/Inga-Sandvold-Fjellhammer.png?v=1773826257",
    position: "Linjespiller",
    shirtNumber: 7,
  },
  {
    id: "2239827803540",
    name: "Hannah Deari Solheim",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/Hannah-Deari-Solheim-Fjellhammer.png?v=1773826257",
    position: "Bakspiller midt",
    shirtNumber: 9,
  },
  {
    id: "2239829841766",
    name: "Mia Lundberg Lersbryggen",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/Mia-Lundberg-Lersbryggen-Fjellhammer.png?v=1773826257",
    position: "Bakspiller venstre",
    shirtNumber: 10,
  },
  {
    id: "2239826764122",
    name: "Sara Ashuri",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/Sara-Ashuri-Fjellhammer.png?v=1773826257",
    position: "Kantspiller venstre",
    shirtNumber: 11,
  },
  {
    id: "2239826781527",
    name: "Zaynab Elmrani",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/Zaynab-Elmrani-Fjellhammer.png?v=1773826257",
    position: "Målvakt",
    shirtNumber: 12,
  },
  {
    id: "2239828059504",
    name: "Sarah Deari Solheim",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/Sarah-Deari-Solheim-Fjellhammer.png?v=1773826257",
    position: "Bakspiller høyre",
    shirtNumber: 14,
  },
  {
    id: "2239829175115",
    name: "Christina Midtdal Nummestad",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/Christina-Midtdal-Nummestad-Fjellhammer.png?v=1773826257",
    position: "Bakspiller venstre",
    shirtNumber: 15,
  },
  {
    id: "2239828158679",
    name: "Marie Elstrand Munthe",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/Marie-Elstrand-Munthe-Fjellhammer.png?v=1773826257",
    position: "Bakspiller høyre",
    shirtNumber: 17,
  },
  {
    id: "22398210032285",
    name: "Linnea Isabel Ingeborg Aula",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/Linnea-Isabel-Ingeborg-Aula-Fjellhammer.png?v=1773826257",
    position: "Kantspiller venstre",
    shirtNumber: 18,
  },
  {
    id: "2239826890365",
    name: "Hedda Klippen Nilsen",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/Hedda-Klippen-Nilsen-Fjellhammer.png?v=1773826257",
    position: "Kantspiller høyre",
    shirtNumber: 20,
  },
  {
    id: "2239827369397",
    name: "Sunniva Sogn-Johansen",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/Sunniva-Sogn-Johansen-Fjellhammer.png?v=1773826257",
    position: "Linjespiller",
    shirtNumber: 22,
  },
  {
    id: "2239822885266",
    name: "Emma Egge Edner",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/Emma-Egge-Edner-Fjellhammer.png?v=1773826257",
    position: "Bakspiller høyre",
    shirtNumber: 25,
  },
  {
    id: "2239827495091",
    name: "Marthe Bjørnson Ulvåknippa",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/Marthe-Bjornson-Ulvaknippa-Fjellhammer.png?v=1773826257",
    position: "Bakspiller venstre",
    shirtNumber: 27,
  },
  {
    id: "2239829571781",
    name: "Mathilde Aas Fjelddalen",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/Mathilde-Aas-Fjelddalen-Fjellhammer.png?v=1773826257",
    position: "Bakspiller venstre",
    shirtNumber: 33,
  },
  {
    id: "2239825215136",
    name: "Ida Wall Bakken",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/Ida-Wall-Bakken-Fjellhammer.png?v=1773826257",
    position: "Målvakt",
    shirtNumber: 37,
  },
  {
    id: "2239829957836",
    name: "Stine Mellemstrand Bore",
    imageUrl:
      "https://nthapi.webcore.no/wp-content/uploads/2026/05/Stine-Mellemstrand-Bore-Fjellhammer.png?v=1773826257",
    position: "Bakspiller midt",
    shirtNumber: 72,
  },
];

const SARAH_SEASON_STATS: ClawdbotSeasonStats = {
  matches: 26,
  goals: 200,
  shots: 315,
  shotPercentage: 63.5,
  assists: 119,
  technicalErrors: 78,
  suspensions: 4,
};

const SARAH_RECENT_MATCHES: ClawdbotRecentMatch[] = [
  {
    matchId: "8208557",
    date: "2026-04-22",
    opponent: "Fana",
    homeAway: "away",
    goals: 8,
    shots: 16,
    assists: 10,
    technicalErrors: 6,
    suspensions: 0,
  },
  {
    matchId: "8208551",
    date: "2026-04-16",
    opponent: "Fredrikstad",
    homeAway: "home",
    goals: 3,
    shots: 7,
    assists: 4,
    technicalErrors: 4,
    suspensions: 0,
  },
  {
    matchId: "8208543",
    date: "2026-03-29",
    opponent: "Oppsal",
    homeAway: "home",
    goals: 11,
    shots: 19,
    assists: 6,
    technicalErrors: 3,
    suspensions: 0,
  },
  {
    matchId: "8208542",
    date: "2026-03-22",
    opponent: "Follo Damer",
    homeAway: "away",
    goals: 12,
    shots: 15,
    assists: 8,
    technicalErrors: 1,
    suspensions: 1,
  },
  {
    matchId: "8208529",
    date: "2026-03-18",
    opponent: "Molde",
    homeAway: "away",
    goals: 8,
    shots: 13,
    assists: 10,
    technicalErrors: 2,
    suspensions: 0,
  },
];

function createStaticProfile(player: StaticRosterPlayer): ClawdbotPlayerProfile {
  const isSarah = player.id === "2239828059504";

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
    seasonStats: isSarah ? SARAH_SEASON_STATS : {},
    recentMatches: isSarah ? SARAH_RECENT_MATCHES : [],
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
    goalsPerGame: matches > 0 ? goals / matches : undefined,
    assistsPerGame: matches > 0 ? assists / matches : undefined,
  };
}

export function mapClawdbotMatchStats(
  profile: ClawdbotPlayerProfile,
): PlayerMatchStats[] {
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
    });
  }

  return Array.from(uniqueTeams.values());
}

export function getStaticTeam(id: bigint): Team | null {
  return getStaticTeams().find((team) => team.id === id) ?? null;
}
