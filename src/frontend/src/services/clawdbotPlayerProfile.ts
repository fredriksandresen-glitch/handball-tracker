import teamLogoManifest from "../data/teamLogoManifest.json";
import elkjop2627StatsData from "../data/elkjop2627PlayerStats.json";
import firstDivision2627StatsData from "../data/firstDivision2627PlayerStats.json";
import akerRosterData from "../data/akerRoster.json";
import firstDivision2526StatsData from "../data/firstDivision2526PlayerStats.json";
import playerSeasonSpells2526Data from "../data/playerSeasonSpells2526.json";
import kjelsaasRosterData from "../data/kjelsaasRoster.json";
import voldaRosterData from "../data/voldaRoster.json";
import levangerRosterData from "../data/levangerRoster.json";
import asaneRosterData from "../data/asaneRoster.json";
import trondheimRosterData from "../data/trondheimRoster.json";
import gjovikRosterData from "../data/gjovikRoster.json";
import ravensRosterData from "../data/ravensRoster.json";
import stavangerRosterData from "../data/stavangerRoster.json";
import baekkelagetRosterData from "../data/baekkelagetRoster.json";
import haslumCurrentRosterData from "../data/haslumCurrentRoster.json";
import fyllingenRosterData from "../data/fyllingenRoster.json";
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
const VOLDA_LOGO_URL =
  "https://voldahandball.no/wp-content/uploads/sites/14/2022/05/Volda.svg";
const LEVANGER_LOGO_URL =
  "https://lhk.baksystem.no/assets/d4b73961-b69e-4061-bfc6-637b5e2b61d0?width=300&height=300&quality=100";
const ASANE_LOGO_URL =
  "https://aasane.admin.topphandball.no/wp-content/uploads/sites/59/2024/08/aasane-e1737718047504.png";
const TRONDHEIM_LOGO_URL =
  "https://trondheim.admin.topphandball.no/wp-content/uploads/sites/73/2024/08/trondheim-e1737719517913.png";
const GJOVIK_LOGO_URL =
  "https://gjovik.admin.topphandball.no/wp-content/uploads/sites/80/2025/05/Gjovik.png";
const RAVENS_LOGO_URL =
  "https://www.ravens.no/wp-content/uploads/sites/9/2022/10/ravens-1.svg";
const STAVANGER_LOGO_URL =
  "https://stavanger.topphandball.no/wp-content/uploads/sites/81/2025/05/Stavanger.png";
const BAEKKELAGET_LOGO_URL =
  "https://www.bskhe.no/wp-content/uploads/sites/16/2019/07/BSK.svg";
const FYLLINGEN_LOGO_URL =
  "https://fyllingenhandball.no/wp-content/uploads/2026/02/cropped-Fyllingen-logo-ny-scaled-1.png";
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
  teamName?: string | null;
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

type StaticPlayerSeasonSpell = {
  canonicalPlayerId: string;
  externalPlayerId: string;
  playerName: string;
  position?: string | null;
  teamName: string;
  leagueId: LeagueId;
  seasonId: SeasonId;
  spellType?: "loan" | "permanent";
  seasonStats: ClawdbotSeasonStats;
  goalkeeperStats?: ClawdbotGoalkeeperStats;
  recentMatches: ClawdbotRecentMatch[];
};

export type PlayerSeasonScope = {
  id: string;
  label: string;
  teamName?: string;
  leagueId: LeagueId;
  spellType?: "loan" | "permanent";
  profile: ClawdbotPlayerProfile;
};

const FIRST_DIVISION_2526_STATS_BY_ID = Object.fromEntries(
  (firstDivision2526StatsData as StaticPlayerStats[]).map((stats) => [
    stats.playerId,
    stats,
  ]),
) as Record<string, StaticPlayerStats>;

/**
 * Sesong 2026-27 hentet fra topphandball.no (import 2026-09-01).
 *
 * MERK: kilden gir kun sesongsummer, ingen kamp-for-kamp. Derfor er
 * recentMatches tom, og formkurver/«siste fem kamper» blir tomme for
 * inneværende sesong til vi finner et endepunkt med kampdata.
 */
const ELKJOP_2627_STATS_BY_ID = Object.fromEntries(
  (elkjop2627StatsData as StaticPlayerStats[]).map((stats) => [
    stats.playerId,
    stats,
  ]),
) as Record<string, StaticPlayerStats>;

const FIRST_DIVISION_2627_STATS_BY_ID = Object.fromEntries(
  (firstDivision2627StatsData as StaticPlayerStats[]).map((stats) => [
    stats.playerId,
    stats,
  ]),
) as Record<string, StaticPlayerStats>;

/**
 * Samlet oppslag for 2026-27 der ligaen kommer fra IMPORTEN, ikke fra
 * lagkonfigurasjonen (2026-09-01).
 *
 * Bakgrunn: STATIC_TEAM_CONFIGS mangler leagueId paa elitelagene, saa
 * getTeamLeagueId() ga dem "elite" som standard mens dataSeason manglet.
 * Resultatet var at kun Utleira og Flint passerte filteret for
 * inneværende sesong. Kilden vet hvilken turnering spilleren faktisk
 * spiller i, saa vi bruker den.
 */
const LIVE_2627_BY_ID: Record<
  string,
  { stats: StaticPlayerStats; league: LeagueId }
> = {};
for (const stats of elkjop2627StatsData as StaticPlayerStats[]) {
  LIVE_2627_BY_ID[stats.playerId] = { stats, league: ELITE_LEAGUE_ID };
}
for (const stats of firstDivision2627StatsData as StaticPlayerStats[]) {
  LIVE_2627_BY_ID[stats.playerId] = {
    stats,
    league: FIRST_DIVISION_LEAGUE_ID,
  };
}

const PLAYER_SEASON_SPELLS =
  playerSeasonSpells2526Data as StaticPlayerSeasonSpell[];

const PLAYER_SEASON_SPELLS_BY_KEY = PLAYER_SEASON_SPELLS.reduce<
  Record<string, StaticPlayerSeasonSpell[]>
>((index, spell) => {
  const key = `${spell.canonicalPlayerId}:${spell.seasonId}`;
  const records = index[key] ?? [];
  records.push(spell);
  index[key] = records;
  return index;
}, {});

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
  teamName?: string;
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
    name: "Volda",
    logoUrl: VOLDA_LOGO_URL,
    roster: voldaRosterData as StaticRosterPlayer[],
    statsUrl: "",
    dataSeason: CURRENT_SEASON_ID,
    leagueId: FIRST_DIVISION_LEAGUE_ID,
  },
  {
    name: "Levanger",
    logoUrl: LEVANGER_LOGO_URL,
    roster: levangerRosterData as StaticRosterPlayer[],
    statsUrl: "",
    dataSeason: CURRENT_SEASON_ID,
    leagueId: FIRST_DIVISION_LEAGUE_ID,
  },
  {
    name: "Åsane",
    logoUrl: ASANE_LOGO_URL,
    roster: asaneRosterData as StaticRosterPlayer[],
    statsUrl: "",
    dataSeason: CURRENT_SEASON_ID,
    leagueId: FIRST_DIVISION_LEAGUE_ID,
  },
  {
    name: "Trondheim",
    logoUrl: TRONDHEIM_LOGO_URL,
    roster: trondheimRosterData as StaticRosterPlayer[],
    statsUrl: "",
    dataSeason: CURRENT_SEASON_ID,
    leagueId: FIRST_DIVISION_LEAGUE_ID,
  },
  {
    name: "Gjøvik",
    logoUrl: GJOVIK_LOGO_URL,
    roster: gjovikRosterData as StaticRosterPlayer[],
    statsUrl: "",
    dataSeason: CURRENT_SEASON_ID,
    leagueId: FIRST_DIVISION_LEAGUE_ID,
  },
  {
    name: "Ravens",
    logoUrl: RAVENS_LOGO_URL,
    roster: ravensRosterData as StaticRosterPlayer[],
    statsUrl: "",
    dataSeason: CURRENT_SEASON_ID,
    leagueId: FIRST_DIVISION_LEAGUE_ID,
  },
  {
    name: "Stavanger",
    logoUrl: STAVANGER_LOGO_URL,
    roster: stavangerRosterData as StaticRosterPlayer[],
    statsUrl: "",
    dataSeason: CURRENT_SEASON_ID,
    leagueId: FIRST_DIVISION_LEAGUE_ID,
  },
  {
    name: "Bækkelaget",
    logoUrl: BAEKKELAGET_LOGO_URL,
    roster: baekkelagetRosterData as StaticRosterPlayer[],
    statsUrl: "",
    dataSeason: CURRENT_SEASON_ID,
    leagueId: FIRST_DIVISION_LEAGUE_ID,
  },
  {
    name: "Haslum",
    logoUrl: HASLUM_LOGO_URL,
    roster: haslumCurrentRosterData as StaticRosterPlayer[],
    statsUrl: "",
    dataSeason: CURRENT_SEASON_ID,
    leagueId: FIRST_DIVISION_LEAGUE_ID,
  },
  {
    name: "Fyllingen",
    logoUrl: FYLLINGEN_LOGO_URL,
    roster: fyllingenRosterData as StaticRosterPlayer[],
    statsUrl: "",
    dataSeason: CURRENT_SEASON_ID,
    leagueId: FIRST_DIVISION_LEAGUE_ID,
  },
  {
    name: "Byåsen Rekrutt",
    logoUrl: BYAASEN_LOGO_URL,
    roster: [],
    statsUrl: "",
    dataSeason: CURRENT_SEASON_ID,
    leagueId: FIRST_DIVISION_LEAGUE_ID,
  },
  {
    name: "Storhamar Rekrutt",
    logoUrl: STORHAMAR_LOGO_URL,
    roster: [],
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

const TEAM_LOGO_MANIFEST = teamLogoManifest as Record<string, string>;

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
  volda: VOLDA_LOGO_URL,
  levanger: LEVANGER_LOGO_URL,
  asane: ASANE_LOGO_URL,
  trondheim: TRONDHEIM_LOGO_URL,
  ravens: RAVENS_LOGO_URL,
  stavanger: STAVANGER_LOGO_URL,
  bækkelaget: BAEKKELAGET_LOGO_URL,
  fyllingen: FYLLINGEN_LOGO_URL,
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

  // Skill mellom bakspiller venstre/midt/hoyre slik rakilden gjor.
  // Verdiene finnes ikke i backend-enumet, men brukes som strenger i UI.
  if (normalized.includes("bakspiller")) {
    if (normalized.includes("venstre")) {
      return "BakspillerVenstre" as Position;
    }
    if (normalized.includes("hoyre") || normalized.includes("hyre")) {
      return "BakspillerHoyre" as Position;
    }
    if (normalized.includes("midt")) {
      return "BakspillerMidt" as Position;
    }
    return Position.Bakspiller;
  }

  // Tom eller ukjent posisjon skal ikke stille bli bakspiller.
  if (!normalized || normalized === "--" || normalized === "-") {
    return "Ukjent" as Position;
  }
  if (normalized.includes("kant")) {
    return "Ukjent" as Position;
  }

  return Position.Bakspiller;
}

function getPlayerStatsForSeason(
  player: StaticRosterPlayer,
  team: StaticTeamConfig,
  seasonId: SeasonId,
) {
  if (
    seasonId === ARCHIVE_SEASON_ID &&
    getTeamLeagueId(team) === FIRST_DIVISION_LEAGUE_ID
  ) {
    return FIRST_DIVISION_2526_STATS_BY_ID[player.id];
  }
  // Inneværende sesong kommer KUN fra topphandball.no-importen (2026-09-01).
  // Ingen fallback: mangler spilleren 2026-27-tall, skal hun vises uten tall.
  // Tidligere falt vi tilbake til loadTeamStats(), som ga 2025-26-tall
  // presentert som om de var inneværende sesong.
  if (seasonId === CURRENT_SEASON_ID) {
    return LIVE_2627_BY_ID[player.id]?.stats;
  }
  return loadTeamStats(team)[player.id];
}

function createStaticProfile(
  player: StaticRosterPlayer,
  team: StaticTeamConfig,
  seasonId: SeasonId = getTeamDataSeason(team),
): ClawdbotPlayerProfile {
  const playerStats = getPlayerStatsForSeason(player, team, seasonId);

  return {
    player: {
      id: player.id,
      name: player.name,
      imageUrl: resolveImageUrl(player.imageUrl),
      team: team.name,
      position: player.position,
      shirtNumber: player.shirtNumber,
      season: getSeason(seasonId).statsCode,
      tournament: `${getLeagueLabel(getTeamLeagueId(team), seasonId)} kvinner`,
    },
    seasonStats: playerStats?.seasonStats ?? {},
    goalkeeperStats: playerStats?.goalkeeperStats,
    recentMatches: playerStats?.recentMatches ?? [],
  };
}

function createStaticRosterProfile(
  player: StaticRosterPlayer,
  team: StaticTeamConfig,
  seasonId: SeasonId = getTeamDataSeason(team),
): ClawdbotPlayerProfile {
  return {
    player: {
      id: player.id,
      name: player.name,
      imageUrl: resolveImageUrl(player.imageUrl),
      team: team.name,
      position: player.position,
      shirtNumber: player.shirtNumber,
      season: getSeason(seasonId).statsCode,
      tournament: `${getLeagueLabel(getTeamLeagueId(team), seasonId)} kvinner`,
    },
    seasonStats: {},
    recentMatches: [],
  };
}

type StaticPlayerEntry = {
  player: StaticRosterPlayer;
  team: StaticTeamConfig;
};

const STATIC_PLAYER_INDEX: Record<string, StaticPlayerEntry[]> =
  STATIC_TEAM_CONFIGS.flatMap((team) =>
    team.roster.map((player) => [player.id, { player, team }] as const),
  ).reduce<Record<string, StaticPlayerEntry[]>>((index, [id, entry]) => {
    (index[id] ??= []).push(entry);
    return index;
  }, {});

function getStaticPlayerEntry(playerId: bigint, seasonId?: SeasonId) {
  const entries = STATIC_PLAYER_INDEX[playerId.toString()];
  if (!entries) return null;
  if (!seasonId) return entries[0] ?? null;

  const exactEntry = entries.find(
    (entry) => getTeamDataSeason(entry.team) === seasonId,
  );
  if (exactEntry) return exactEntry;

  if (seasonId === ARCHIVE_SEASON_ID) {
    return (
      entries.find(
        (entry) =>
          getTeamLeagueId(entry.team) === FIRST_DIVISION_LEAGUE_ID &&
          !!FIRST_DIVISION_2526_STATS_BY_ID[entry.player.id],
      ) ?? null
    );
  }

  // Spillere med importerte 2026-27-tall skal finnes selv om laget deres
  // mangler dataSeason i konfigurasjonen (2026-09-01).
  if (seasonId === CURRENT_SEASON_ID && LIVE_2627_BY_ID[playerId.toString()]) {
    return entries[0] ?? null;
  }

  return null;
}

export function getStaticProfile(
  playerId: bigint,
  seasonId?: SeasonId,
): ClawdbotPlayerProfile | null {
  const entry = getStaticPlayerEntry(playerId, seasonId);
  if (!entry) return null;
  return createStaticProfile(entry.player, entry.team, seasonId);
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function withMatchTeam(
  profile: ClawdbotPlayerProfile,
  teamName: string,
): ClawdbotPlayerProfile {
  return {
    ...profile,
    recentMatches: profile.recentMatches.map((match) => ({
      ...match,
      teamName,
    })),
  };
}

function combineSeasonProfiles(
  profiles: ClawdbotPlayerProfile[],
): ClawdbotPlayerProfile {
  const primary = profiles[0];
  const sum = (field: keyof ClawdbotSeasonStats) =>
    profiles.reduce(
      (total, profile) => total + Number(profile.seasonStats[field] ?? 0),
      0,
    );
  const matches = sum("matches");
  const goals = sum("goals");
  const shots = sum("shots");
  const assists = sum("assists");
  const mepTotal = roundToOneDecimal(sum("mepTotal"));

  return {
    player: primary.player,
    seasonStats: {
      matches,
      goals,
      shots,
      shotPercentage:
        shots > 0 ? roundToOneDecimal((goals / shots) * 100) : 0,
      assists,
      technicalErrors: sum("technicalErrors"),
      suspensions: sum("suspensions"),
      mepAvg: matches > 0 ? roundToOneDecimal(mepTotal / matches) : 0,
      mepTotal,
    },
    recentMatches: profiles
      .flatMap((profile) => profile.recentMatches)
      .sort((left, right) =>
        String(right.date ?? "").localeCompare(String(left.date ?? "")),
      ),
  };
}

export function getPlayerSeasonScopes(
  playerId: bigint,
  seasonId: SeasonId,
): PlayerSeasonScope[] {
  const spellRecords =
    PLAYER_SEASON_SPELLS_BY_KEY[`${playerId.toString()}:${seasonId}`] ?? [];
  if (spellRecords.length === 0) return [];

  const primaryEntry = getStaticPlayerEntry(playerId, seasonId);
  const primaryProfile = getStaticProfile(playerId, seasonId);
  const fallbackProfile = primaryProfile ?? getStaticProfile(playerId);
  if (!fallbackProfile) return [];

  const clubScopes: PlayerSeasonScope[] = [];
  if (primaryProfile && primaryEntry) {
    const teamName = primaryProfile.player.team ?? primaryEntry.team.name;
    clubScopes.push({
      id: slugify(teamName),
      label: teamName,
      teamName,
      leagueId: getTeamLeagueId(primaryEntry.team),
      profile: withMatchTeam(primaryProfile, teamName),
    });
  }

  for (const spell of spellRecords) {
    if (
      clubScopes.some(
        (scope) =>
          normalizeTeamLookup(scope.teamName) ===
          normalizeTeamLookup(spell.teamName),
      )
    ) {
      continue;
    }

    const profile: ClawdbotPlayerProfile = {
      player: {
        ...fallbackProfile.player,
        id: spell.canonicalPlayerId,
        name: fallbackProfile.player.name || spell.playerName,
        team: spell.teamName,
        position: spell.position ?? fallbackProfile.player.position,
        season: getSeason(spell.seasonId).statsCode,
        tournament: `${getLeagueLabel(spell.leagueId, spell.seasonId)} kvinner`,
      },
      seasonStats: spell.seasonStats,
      goalkeeperStats: spell.goalkeeperStats,
      recentMatches: spell.recentMatches.map((match) => ({
        ...match,
        teamName: spell.teamName,
      })),
    };

    clubScopes.push({
      id: slugify(spell.teamName),
      label: spell.teamName,
      teamName: spell.teamName,
      leagueId: spell.leagueId,
      spellType: spell.spellType,
      profile,
    });
  }

  if (clubScopes.length < 2) return [];

  return [
    {
      id: "combined",
      label: "Samlet",
      leagueId: clubScopes[0].leagueId,
      profile: combineSeasonProfiles(clubScopes.map((scope) => scope.profile)),
    },
    ...clubScopes,
  ];
}

/**
 * Bytter en ekstern logo-URL mot var egen lokale kopi (2026-08-27).
 * Logoene la tidligere pa klubbenes egne nettsider; la de om siden sin,
 * forsvant logoen fra appen. Se scripts/sync-team-logos.mjs.
 */
function toLocalLogo(url?: string) {
  if (!url) return undefined;
  return TEAM_LOGO_MANIFEST[url] ?? url;
}

export function getStaticTeamLogoUrl(team?: string | null) {
  const normalized = normalizeTeamLookup(team);
  const aliasLogo = Object.entries(STATIC_TEAM_LOGO_ALIASES).find(
    ([key]) =>
      normalized === key || normalized.includes(key) || key.includes(normalized),
  )?.[1];

  if (aliasLogo) return toLocalLogo(aliasLogo);

  return toLocalLogo(
    Object.entries(STATIC_TEAM_LOGOS).find(([key]) =>
      normalized === key || normalized.includes(key) || key.includes(normalized),
    )?.[1],
  );
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
      teamName: match.teamName ?? undefined,
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
    .flat()
    .filter(({ player, team }) => {
      const teamLeagueId = getTeamLeagueId(team);
      const live = LIVE_2627_BY_ID[player.id];
      const matchesSeason =
        !seasonId ||
        getTeamDataSeason(team) === seasonId ||
        (seasonId === ARCHIVE_SEASON_ID &&
          teamLeagueId === FIRST_DIVISION_LEAGUE_ID &&
          !!FIRST_DIVISION_2526_STATS_BY_ID[player.id]) ||
        (seasonId === CURRENT_SEASON_ID && !!live);

      // For 2026-27 er importens liga fasit — lagkonfigurasjonen er ufullstendig.
      const effectiveLeague =
        seasonId === CURRENT_SEASON_ID && live ? live.league : teamLeagueId;

      return matchesSeason && (!leagueId || effectiveLeague === leagueId);
    })
    .map(({ player, team }) =>
      mapClawdbotPlayer(createStaticRosterProfile(player, team, seasonId)),
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
  seasonId?: SeasonId,
): LeagueId | undefined {
  const entry = getStaticPlayerEntry(playerId, seasonId);
  return entry ? getTeamLeagueId(entry.team) : undefined;
}
