import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  Handshake,
  Minus,
  Search,
  Shield,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PositionBadge } from "../components/PositionBadge";
import { LeagueSelect, useSelectedLeague } from "../components/LeagueSelect";
import { SeasonSelect, useSelectedSeason } from "../components/SeasonSelect";
import { SkeletonCard } from "../components/SkeletonCard";
import {
  getLeagueLabel,
  getSeason,
  type LeagueId,
  type SeasonId,
} from "../data/seasons";
import { usePlayers } from "../hooks/usePlayers";
import { useTeams } from "../hooks/useTeams";
import {
  getStaticProfile,
  getStaticTeamLogoUrl,
  mapClawdbotMatchStats,
  mapClawdbotSeasonStats,
  type EnrichedPlayerMatchStats,
} from "../services/clawdbotPlayerProfile";
import {
  POSITION_LABELS,
  Position,
  type Player,
  type PlayerSeasonStats,
} from "../types/handball";

type ToplistMode = "form" | "goals" | "assists" | "keepers" | "mep";
type PositionOption = "all" | Position;

type TopInsight = {
  seasonStats?: PlayerSeasonStats;
  matches: EnrichedPlayerMatchStats[];
  sparkValues: number[];
  formAvg?: number;
  previousFormAvg?: number;
  latestMep?: number;
  latestSaves?: number;
  latestSavePct?: number;
  previousSavePct?: number;
  totalGoals?: number;
  previousTotalGoals?: number;
  shootingPercent?: number;
  goalsPerGame?: number;
  totalAssists?: number;
  previousTotalAssists?: number;
  assistsPerGame?: number;
  technicalFaults?: number;
  mepAvg?: number;
  mepTotal?: number;
  previousMepTotal?: number;
  matchesPlayed?: number;
};

type RankingRow = {
  player: Player;
  teamName?: string;
  teamLogoUrl?: string;
  insight: TopInsight;
  rankChange: number;
};

const TOPLIST_MODES: { value: ToplistMode; label: string }[] = [
  { value: "form", label: "Best form" },
  { value: "goals", label: "Måldronning" },
  { value: "assists", label: "Tilrettelegger" },
  { value: "keepers", label: "Keeperform" },
  { value: "mep", label: "Sesong MEP" },
];

const POSITION_OPTIONS: { value: PositionOption; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: Position.Keeper, label: "Keeper" },
  { value: Position.VenstreKant, label: "V. kant" },
  { value: Position.HoyreKant, label: "H. kant" },
  { value: Position.Linje, label: "Linje" },
  { value: Position.Bakspiller, label: "Bakspiller" },
];

const MODE_COPY: Record<ToplistMode, { title: string; text: string }> = {
  form: {
    title: "Best form",
    text: "Rangert på snitt MEP siste 5 kamper.",
  },
  goals: {
    title: "Måldronning",
    text: "Flest mål totalt, med uttelling og mål per kamp.",
  },
  assists: {
    title: "Tilretteleggeren",
    text: "Flest assist totalt, med assist per kamp.",
  },
  keepers: {
    title: "Keeperform",
    text: "Keepere rangert på redningsprosent siste kamp.",
  },
  mep: {
    title: "Sesong MEP",
    text: "Beste totalbidrag gjennom sesongen.",
  },
};

function getMatchDate(match: EnrichedPlayerMatchStats) {
  return match.date ?? match.matchId.toString();
}

function asNumber(value: bigint | undefined) {
  return value === undefined ? undefined : Number(value);
}

function formatNumber(value: number | undefined, digits = 0) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
}

function formatPercent(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return `${value.toFixed(1)}%`;
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : undefined;
}

function getTopInsight(player: Player): TopInsight {
  const profile = getStaticProfile(player.id);
  if (!profile) return { matches: [], sparkValues: [] };

  const seasonStats = mapClawdbotSeasonStats(profile);
  const matches = (mapClawdbotMatchStats(profile) as EnrichedPlayerMatchStats[])
    .filter((match) => typeof match.mep === "number")
    .sort((a, b) => getMatchDate(a).localeCompare(getMatchDate(b)));
  const currentWindow = matches.slice(-5);
  const previousWindow = matches.slice(-6, -1);
  const latestMatch = matches.at(-1);
  const previousMatch = matches.at(-2);
  const sparkValues = currentWindow.map((match) => match.mep ?? 0);
  const totalGoals = asNumber(seasonStats.totalGoals);
  const totalAssists = asNumber(seasonStats.totalAssists);
  const mepTotal = seasonStats.mepTotal;
  const latestGoals = asNumber(latestMatch?.goals) ?? 0;
  const latestAssists = asNumber(latestMatch?.assists) ?? 0;
  const latestMep = latestMatch?.mep;

  return {
    seasonStats,
    matches,
    sparkValues,
    formAvg: average(sparkValues) ?? seasonStats.mepAvg,
    previousFormAvg: average(previousWindow.map((match) => match.mep ?? 0)),
    latestMep,
    latestSaves:
      latestMatch?.saves === undefined ? undefined : Number(latestMatch.saves),
    latestSavePct: latestMatch?.savePct,
    previousSavePct: previousMatch?.savePct,
    totalGoals,
    previousTotalGoals:
      totalGoals === undefined ? undefined : Math.max(totalGoals - latestGoals, 0),
    shootingPercent: seasonStats.shootingPercent,
    goalsPerGame: seasonStats.goalsPerGame,
    totalAssists,
    previousTotalAssists:
      totalAssists === undefined
        ? undefined
        : Math.max(totalAssists - latestAssists, 0),
    assistsPerGame: seasonStats.assistsPerGame,
    technicalFaults: asNumber(seasonStats.technicalFaults),
    mepAvg: seasonStats.mepAvg,
    mepTotal,
    previousMepTotal:
      mepTotal === undefined || latestMep === undefined
        ? undefined
        : mepTotal - latestMep,
    matchesPlayed: Number(seasonStats.matchesPlayed),
  };
}

function isRelevantPlayer(player: Player, mode: ToplistMode) {
  if (mode === "keepers") return player.position === Position.Keeper;
  return player.position !== Position.Keeper;
}

function getCurrentScore(mode: ToplistMode, insight: TopInsight) {
  if (mode === "goals") return insight.totalGoals ?? 0;
  if (mode === "assists") return insight.totalAssists ?? 0;
  if (mode === "keepers") return insight.latestSavePct ?? 0;
  if (mode === "mep") return insight.mepTotal ?? 0;
  return insight.formAvg ?? 0;
}

function getPreviousScore(mode: ToplistMode, insight: TopInsight) {
  if (mode === "goals") return insight.previousTotalGoals ?? insight.totalGoals ?? 0;
  if (mode === "assists") {
    return insight.previousTotalAssists ?? insight.totalAssists ?? 0;
  }
  if (mode === "keepers") return insight.previousSavePct ?? 0;
  if (mode === "mep") return insight.previousMepTotal ?? insight.mepTotal ?? 0;
  return insight.previousFormAvg ?? insight.formAvg ?? 0;
}

function tieBreaker(mode: ToplistMode, insight: TopInsight) {
  if (mode === "keepers") return insight.latestSaves ?? 0;
  if (mode === "goals") return insight.goalsPerGame ?? 0;
  if (mode === "assists") return insight.assistsPerGame ?? 0;
  return insight.matchesPlayed ?? 0;
}

function filterPlayers(
  players: Player[],
  mode: ToplistMode,
  position: PositionOption,
) {
  return players.filter((player) => {
    if (!isRelevantPlayer(player, mode)) return false;
    if (position === "all") return true;
    return player.position === position;
  });
}

function sortRankedPlayers(
  players: Player[],
  mode: ToplistMode,
  insights: Map<string, TopInsight>,
  previous = false,
) {
  return [...players].sort((a, b) => {
    const ai = insights.get(a.id.toString()) ?? getTopInsight(a);
    const bi = insights.get(b.id.toString()) ?? getTopInsight(b);
    const scoreA = previous ? getPreviousScore(mode, ai) : getCurrentScore(mode, ai);
    const scoreB = previous ? getPreviousScore(mode, bi) : getCurrentScore(mode, bi);

    return (
      scoreB - scoreA ||
      tieBreaker(mode, bi) - tieBreaker(mode, ai) ||
      a.name.localeCompare(b.name)
    );
  });
}

function getMetricCells(mode: ToplistMode, insight: TopInsight) {
  if (mode === "goals") {
    return [
      { label: "Mål", value: formatNumber(insight.totalGoals), primary: true },
      { label: "Treff%", value: formatPercent(insight.shootingPercent) },
      { label: "Mål/k", value: formatNumber(insight.goalsPerGame, 1) },
    ];
  }

  if (mode === "assists") {
    return [
      { label: "Assist", value: formatNumber(insight.totalAssists), primary: true },
      { label: "Assist/k", value: formatNumber(insight.assistsPerGame, 1) },
      { label: "Tek.feil", value: formatNumber(insight.technicalFaults) },
    ];
  }

  if (mode === "keepers") {
    return [
      { label: "Red%", value: formatPercent(insight.latestSavePct), primary: true },
      { label: "Redn.", value: formatNumber(insight.latestSaves) },
      { label: "MEP 5", value: formatNumber(insight.formAvg, 1) },
    ];
  }

  if (mode === "mep") {
    return [
      { label: "Total", value: formatNumber(insight.mepTotal, 1), primary: true },
      { label: "Snitt", value: formatNumber(insight.mepAvg, 1) },
      { label: "Kamper", value: formatNumber(insight.matchesPlayed) },
    ];
  }

  return [
    { label: "MEP 5", value: formatNumber(insight.formAvg, 1), primary: true },
    { label: "Siste", value: formatNumber(insight.latestMep, 1) },
    { label: "Total", value: formatNumber(insight.mepTotal, 1) },
  ];
}

function getHeroStats(mode: ToplistMode, count: number, topInsight?: TopInsight) {
  if (mode === "goals") {
    return [
      { icon: Trophy, label: "Leder", value: formatNumber(topInsight?.totalGoals) },
      { icon: Target, label: "Treff%", value: formatPercent(topInsight?.shootingPercent) },
      { icon: Shield, label: "Spillere", value: count.toString() },
    ];
  }
  if (mode === "assists") {
    return [
      { icon: Handshake, label: "Leder", value: formatNumber(topInsight?.totalAssists) },
      { icon: Target, label: "Assist/k", value: formatNumber(topInsight?.assistsPerGame, 1) },
      { icon: Shield, label: "Spillere", value: count.toString() },
    ];
  }
  if (mode === "keepers") {
    return [
      { icon: Trophy, label: "Leder", value: formatPercent(topInsight?.latestSavePct) },
      { icon: Target, label: "Redn.", value: formatNumber(topInsight?.latestSaves) },
      { icon: Shield, label: "Keepere", value: count.toString() },
    ];
  }
  if (mode === "mep") {
    return [
      { icon: Trophy, label: "Leder", value: formatNumber(topInsight?.mepTotal, 1) },
      { icon: Target, label: "Snitt", value: formatNumber(topInsight?.mepAvg, 1) },
      { icon: Shield, label: "Spillere", value: count.toString() },
    ];
  }
  return [
    { icon: Trophy, label: "Leder", value: formatNumber(topInsight?.formAvg, 1) },
    { icon: Target, label: "Siste", value: formatNumber(topInsight?.latestMep, 1) },
    { icon: Shield, label: "Spillere", value: count.toString() },
  ];
}

function TeamLogo({
  teamName,
  logoUrl,
}: {
  teamName?: string;
  logoUrl?: string;
}) {
  const resolvedLogo = logoUrl ?? getStaticTeamLogoUrl(teamName);

  if (!resolvedLogo) {
    return (
      <span className="size-8 flex items-center justify-center shrink-0">
        <Shield className="size-5 text-muted-foreground" />
      </span>
    );
  }

  return (
    <span className="size-8 flex items-center justify-center shrink-0">
      <img src={resolvedLogo} alt="" className="size-8 object-contain" />
    </span>
  );
}

function RankMovement({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-chart-2/15 px-2 py-0.5 text-[10px] font-mono font-bold text-chart-2">
        <ArrowUp className="size-3" />
        {change}
      </span>
    );
  }

  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-mono font-bold text-destructive">
        <ArrowDown className="size-3" />
        {Math.abs(change)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-muted/45 px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground">
      <Minus className="size-3" />
      0
    </span>
  );
}

function TopStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-background/70 border border-border px-3 py-3 min-w-0">
      <div className="flex items-center gap-2 text-primary mb-1">
        <Icon className="size-3.5" />
        <span className="text-[9px] uppercase tracking-widest font-display font-bold truncate">
          {label}
        </span>
      </div>
      <p className="font-display font-black text-xl text-foreground tabular-nums truncate">
        {value}
      </p>
    </div>
  );
}

function RankingListItem({
  row,
  rank,
  mode,
  season,
  league,
}: {
  row: RankingRow;
  rank: number;
  mode: ToplistMode;
  season: SeasonId;
  league: LeagueId;
}) {
  const metricCells = getMetricCells(mode, row.insight);

  return (
    <Link
      to="/player/$id"
      params={{ id: row.player.id.toString() }}
      search={{ season, league }}
      className="group grid grid-cols-[34px_1fr_auto] items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 hover:border-primary/45 hover:bg-card/80 transition-colors"
      data-ocid="toplist-row"
    >
      <div className="text-center">
        <p className="font-display font-black text-lg text-foreground tabular-nums">
          {rank}
        </p>
        <RankMovement change={row.rankChange} />
      </div>

      <div className="min-w-0 flex items-center gap-3">
        <TeamLogo teamName={row.teamName} logoUrl={row.teamLogoUrl} />
        <div className="min-w-0">
          <p className="font-display font-black text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {row.player.name}
          </p>
          <div className="mt-1 flex items-center gap-2 min-w-0">
            <PositionBadge position={row.player.position} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-right min-w-[138px] sm:min-w-[190px]">
        {metricCells.map((item) => (
          <div key={item.label} className="min-w-0">
            <p
              className={cn(
                "font-mono font-black leading-none tabular-nums truncate",
                item.primary ? "text-lg text-primary" : "text-sm text-foreground",
              )}
            >
              {item.value}
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-widest text-muted-foreground truncate">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </Link>
  );
}

function RankingList({
  rows,
  mode,
  season,
  league,
}: {
  rows: RankingRow[];
  mode: ToplistMode;
  season: SeasonId;
  league: LeagueId;
}) {
  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <RankingListItem
          key={row.player.id.toString()}
          row={row}
          rank={index + 1}
          mode={mode}
          season={season}
          league={league}
        />
      ))}
    </div>
  );
}

export default function FavoritesPage() {
  const seasonId = useSelectedSeason();
  const leagueId = useSelectedLeague();
  const season = getSeason(seasonId);
  const leagueLabel = getLeagueLabel(leagueId, seasonId);
  const [mode, setMode] = useState<ToplistMode>("form");
  const [positionFilter, setPositionFilter] = useState<PositionOption>("all");
  const { data: players = [], isLoading } = usePlayers(seasonId, leagueId);
  const { data: teams = [] } = useTeams(seasonId, leagueId);

  const teamMap = useMemo(
    () => new Map(teams.map((team) => [team.id.toString(), team])),
    [teams],
  );

  const insights = useMemo(
    () => new Map(players.map((player) => [player.id.toString(), getTopInsight(player)])),
    [players],
  );

  const activePositionFilter =
    mode === "keepers" && positionFilter !== "all"
      ? Position.Keeper
      : positionFilter;

  const rankedRows = useMemo(() => {
    const filtered = filterPlayers(players, mode, activePositionFilter).filter(
      (player) => (insights.get(player.id.toString())?.matchesPlayed ?? 0) > 0,
    );
    const current = sortRankedPlayers(filtered, mode, insights);
    const previous = sortRankedPlayers(filtered, mode, insights, true);
    const previousRanks = new Map(
      previous.map((player, index) => [player.id.toString(), index + 1]),
    );

    return current.slice(0, 30).map((player, index) => {
      const profile = getStaticProfile(player.id);
      const team = teamMap.get(player.teamId.toString());
      const teamName = team?.name ?? profile?.player.team;
      const previousRank = previousRanks.get(player.id.toString()) ?? index + 1;

      return {
        player,
        teamName,
        teamLogoUrl: team?.logoUrl ?? getStaticTeamLogoUrl(teamName),
        insight: insights.get(player.id.toString()) ?? getTopInsight(player),
        rankChange: previousRank - (index + 1),
      };
    });
  }, [activePositionFilter, insights, mode, players, teamMap]);

  const topInsight = rankedRows[0]?.insight;
  const heroStats = getHeroStats(mode, rankedRows.length, topInsight);
  const copy = MODE_COPY[mode];

  function handleModeChange(nextMode: ToplistMode) {
    setMode(nextMode);
    if (nextMode === "keepers") setPositionFilter("all");
  }

  if (isLoading) {
    return (
      <div className="space-y-3" data-ocid="toplist-loading">
        <SkeletonCard variant="player" />
        <SkeletonCard variant="player" />
        <SkeletonCard variant="player" />
      </div>
    );
  }

  return (
    <div className="space-y-5" data-ocid="toplist-page">
      <section className="rounded-2xl bg-card border border-border p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-primary font-display font-bold mb-1">
              Toppliste
            </p>
            <h1 className="font-display font-black text-2xl text-foreground leading-tight">
              {copy.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {copy.text}
            </p>
            <p className="mt-1 text-xs font-display font-bold text-primary">
              {leagueLabel} · {season.label}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <SeasonSelect compact />
            <div className="size-11 rounded-full bg-primary/12 border border-primary/30 flex items-center justify-center text-primary">
              <Trophy className="size-5" />
            </div>
          </div>
        </div>

        <LeagueSelect />

        <div className="grid grid-cols-3 gap-2">
          {heroStats.map((stat) => (
            <TopStat
              key={stat.label}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
            />
          ))}
        </div>
      </section>

      <div className="space-y-3">
        <div
          className="flex items-center gap-2 overflow-x-auto no-scrollbar"
          data-ocid="toplist-filter-pills"
        >
          {TOPLIST_MODES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => handleModeChange(item.value)}
              className={cn(
                "flex-shrink-0 rounded-full px-4 py-2 text-xs font-display font-bold border transition-smooth",
                mode === item.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/40",
              )}
              data-ocid={`toplist-mode-${item.value}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div
          className="flex items-center gap-2 overflow-x-auto no-scrollbar"
          data-ocid="toplist-position-filter"
        >
          {POSITION_OPTIONS.filter(
            (option) => mode !== "keepers" || option.value === "all" || option.value === Position.Keeper,
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPositionFilter(option.value)}
              className={cn(
                "flex-shrink-0 rounded-full px-3 py-1.5 text-[11px] font-display font-bold border transition-smooth",
                activePositionFilter === option.value
                  ? "bg-muted text-foreground border-primary/45"
                  : "bg-card text-muted-foreground border-border hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {rankedRows.length === 0 ? (
        <div className="min-h-[45vh] flex flex-col items-center justify-center text-center px-6 rounded-2xl bg-card border border-border">
          <Search className="size-10 text-muted-foreground mb-4" />
          <h2 className="font-display font-bold text-lg text-foreground">
            {season.isCurrent ? "Ingen statistikk ennå" : "Ingen spillere funnet"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-[260px]">
            {season.isCurrent
              ? "Topplisten fylles når kampene i den nye sesongen er i gang."
              : "Prøv en annen posisjon eller kategori."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground">
              Topp {rankedRows.length}{" "}
              {mode === "keepers" ? "keepere" : "spillere"}
            </p>
            <span className="text-[10px] uppercase tracking-widest font-display font-bold text-primary">
              {activePositionFilter === "all"
                ? TOPLIST_MODES.find((item) => item.value === mode)?.label
                : POSITION_LABELS[activePositionFilter]}
            </span>
          </div>
          <RankingList
            rows={rankedRows}
            mode={mode}
            season={seasonId}
            league={leagueId}
          />
        </div>
      )}
    </div>
  );
}
