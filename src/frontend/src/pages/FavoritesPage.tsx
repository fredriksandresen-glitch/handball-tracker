import { cn } from "@/lib/utils";
import {
  Handshake,
  Search,
  Shield,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { PlayerCard } from "../components/PlayerCard";
import { SkeletonCard } from "../components/SkeletonCard";
import {
  useFollowPlayer,
  useIsFollowing,
  useUnfollowPlayer,
} from "../hooks/useFollowedPlayers";
import { usePlayers } from "../hooks/usePlayers";
import { useTeams } from "../hooks/useTeams";
import {
  getStaticProfile,
  mapClawdbotMatchStats,
  mapClawdbotSeasonStats,
  type EnrichedPlayerMatchStats,
} from "../services/clawdbotPlayerProfile";
import {
  Position,
  type Player,
  type PlayerSeasonStats,
} from "../types/handball";

type ToplistMode = "form" | "goals" | "assists" | "keepers" | "mep";

type CardStat = {
  value: string;
  label: string;
  emphasis?: boolean;
};

type TopInsight = {
  seasonStats?: PlayerSeasonStats;
  sparkValues: number[];
  formAvg?: number;
  latestMep?: number;
  latestSaves?: number;
  latestSavePct?: number;
  totalGoals?: number;
  shootingPercent?: number;
  goalsPerGame?: number;
  totalAssists?: number;
  assistsPerGame?: number;
  technicalFaults?: number;
  mepAvg?: number;
  mepTotal?: number;
};

const TOPLIST_MODES: { value: ToplistMode; label: string }[] = [
  { value: "form", label: "Best form" },
  { value: "goals", label: "Måldronning" },
  { value: "assists", label: "Tilrettelegger" },
  { value: "keepers", label: "Keeperform" },
  { value: "mep", label: "Sesong MEP" },
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

function getTopInsight(player: Player): TopInsight {
  const profile = getStaticProfile(player.id);
  if (!profile) return { sparkValues: [] };

  const seasonStats = mapClawdbotSeasonStats(profile);
  const mepMatches = (mapClawdbotMatchStats(profile) as EnrichedPlayerMatchStats[])
    .filter((match) => typeof match.mep === "number")
    .sort((a, b) => getMatchDate(a).localeCompare(getMatchDate(b)))
    .slice(-5);
  const latestMatch = mepMatches.at(-1);
  const sparkValues = mepMatches.map((match) => match.mep ?? 0);
  const formAvg = sparkValues.length
    ? sparkValues.reduce((sum, value) => sum + value, 0) / sparkValues.length
    : seasonStats.mepAvg;

  return {
    seasonStats,
    sparkValues,
    formAvg,
    latestMep: sparkValues.at(-1),
    latestSaves: latestMatch?.saves === undefined ? undefined : Number(latestMatch.saves),
    latestSavePct: latestMatch?.savePct,
    totalGoals: asNumber(seasonStats.totalGoals),
    shootingPercent: seasonStats.shootingPercent,
    goalsPerGame: seasonStats.goalsPerGame,
    totalAssists: asNumber(seasonStats.totalAssists),
    assistsPerGame: seasonStats.assistsPerGame,
    technicalFaults: asNumber(seasonStats.technicalFaults),
    mepAvg: seasonStats.mepAvg,
    mepTotal: seasonStats.mepTotal,
  };
}

function sortTopPlayers(
  players: Player[],
  mode: ToplistMode,
  insights: Map<string, TopInsight>,
) {
  const sorted = [...players];
  if (mode === "keepers") {
    return sorted
      .filter((player) => player.position === Position.Keeper)
      .sort((a, b) => {
        const ai = insights.get(a.id.toString()) ?? getTopInsight(a);
        const bi = insights.get(b.id.toString()) ?? getTopInsight(b);
        return (
          (bi.latestSavePct ?? 0) - (ai.latestSavePct ?? 0) ||
          (bi.latestSaves ?? 0) - (ai.latestSaves ?? 0) ||
          (bi.formAvg ?? 0) - (ai.formAvg ?? 0)
        );
      });
  }

  const fieldPlayers = sorted.filter((player) => player.position !== Position.Keeper);
  return fieldPlayers.sort((a, b) => {
    const ai = insights.get(a.id.toString()) ?? getTopInsight(a);
    const bi = insights.get(b.id.toString()) ?? getTopInsight(b);
    if (mode === "goals") return (bi.totalGoals ?? 0) - (ai.totalGoals ?? 0);
    if (mode === "assists") return (bi.totalAssists ?? 0) - (ai.totalAssists ?? 0);
    if (mode === "mep") return (bi.mepTotal ?? 0) - (ai.mepTotal ?? 0);
    return (bi.formAvg ?? 0) - (ai.formAvg ?? 0);
  });
}

function getCardStats(mode: ToplistMode, insight: TopInsight): CardStat[] {
  if (mode === "goals") {
    return [
      { value: formatNumber(insight.totalGoals), label: "Mål", emphasis: true },
      { value: formatPercent(insight.shootingPercent), label: "Treff%" },
      { value: formatNumber(insight.goalsPerGame, 1), label: "Mål/k" },
    ];
  }

  if (mode === "assists") {
    return [
      { value: formatNumber(insight.totalAssists), label: "Assist", emphasis: true },
      { value: formatNumber(insight.assistsPerGame, 1), label: "Assist/k" },
      { value: formatNumber(insight.technicalFaults), label: "Tek.feil" },
    ];
  }

  if (mode === "keepers") {
    return [
      { value: formatPercent(insight.latestSavePct), label: "Red%", emphasis: true },
      { value: formatNumber(insight.latestSaves), label: "Redn." },
      { value: formatNumber(insight.formAvg, 1), label: "MEP 5" },
    ];
  }

  if (mode === "mep") {
    return [
      { value: formatNumber(insight.mepTotal, 1), label: "Total MEP", emphasis: true },
      { value: formatNumber(insight.mepAvg, 1), label: "Snitt" },
      { value: formatNumber(insight.seasonStats ? Number(insight.seasonStats.matchesPlayed) : undefined), label: "Kamper" },
    ];
  }

  return [
    { value: formatNumber(insight.formAvg, 1), label: "Snitt MEP 5", emphasis: true },
    { value: formatNumber(insight.mepTotal, 1), label: "Total MEP" },
  ];
}

function ToplistCard({
  player,
  teamName,
  insight,
  mode,
  index,
}: {
  player: Player;
  teamName?: string;
  insight: TopInsight;
  mode: ToplistMode;
  index: number;
}) {
  const { data: following, isLoading: checkingFollow } = useIsFollowing(player.id);
  const followMutation = useFollowPlayer();
  const unfollowMutation = useUnfollowPlayer();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04 }}
    >
      <PlayerCard
        player={player}
        teamName={teamName}
        isFollowing={following ?? false}
        onFollow={() => followMutation.mutate(player.id)}
        onUnfollow={() => unfollowMutation.mutate(player.id)}
        isLoading={
          checkingFollow || followMutation.isPending || unfollowMutation.isPending
        }
        statItems={getCardStats(mode, insight)}
        sparkValues={insight.sparkValues}
        sparkLabel="MEP-form"
        followOverlay
      />
    </motion.div>
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

function getHeroStats(mode: ToplistMode, count: number, topInsight?: TopInsight) {
  if (mode === "goals") {
    return [
      { icon: Trophy, label: "Mål", value: formatNumber(topInsight?.totalGoals) },
      { icon: Target, label: "Treff%", value: formatPercent(topInsight?.shootingPercent) },
      { icon: Shield, label: "Spillere", value: count.toString() },
    ];
  }
  if (mode === "assists") {
    return [
      { icon: Handshake, label: "Assist", value: formatNumber(topInsight?.totalAssists) },
      { icon: Target, label: "Assist/k", value: formatNumber(topInsight?.assistsPerGame, 1) },
      { icon: Shield, label: "Spillere", value: count.toString() },
    ];
  }
  if (mode === "keepers") {
    return [
      { icon: Trophy, label: "Red%", value: formatPercent(topInsight?.latestSavePct) },
      { icon: Target, label: "Redn.", value: formatNumber(topInsight?.latestSaves) },
      { icon: Shield, label: "Keepere", value: count.toString() },
    ];
  }
  if (mode === "mep") {
    return [
      { icon: Trophy, label: "Total MEP", value: formatNumber(topInsight?.mepTotal, 1) },
      { icon: Target, label: "Snitt", value: formatNumber(topInsight?.mepAvg, 1) },
      { icon: Shield, label: "Spillere", value: count.toString() },
    ];
  }
  return [
    { icon: Trophy, label: "MEP 5", value: formatNumber(topInsight?.formAvg, 1) },
    { icon: Target, label: "Total MEP", value: formatNumber(topInsight?.mepTotal, 1) },
    { icon: Shield, label: "Spillere", value: count.toString() },
  ];
}

export default function FavoritesPage() {
  const [mode, setMode] = useState<ToplistMode>("form");
  const { data: players = [], isLoading } = usePlayers();
  const { data: teams = [] } = useTeams();

  const teamMap = useMemo(
    () => new Map(teams.map((team) => [team.id.toString(), team.name])),
    [teams],
  );

  const insights = useMemo(
    () => new Map(players.map((player) => [player.id.toString(), getTopInsight(player)])),
    [players],
  );

  const topPlayers = useMemo(
    () => sortTopPlayers(players, mode, insights).slice(0, 20),
    [players, mode, insights],
  );

  const topPlayer = topPlayers[0];
  const topInsight = topPlayer
    ? insights.get(topPlayer.id.toString()) ?? getTopInsight(topPlayer)
    : undefined;
  const heroStats = getHeroStats(mode, topPlayers.length, topInsight);
  const copy = MODE_COPY[mode];

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
          <div>
            <p className="text-[10px] uppercase tracking-widest text-primary font-display font-bold mb-1">
              Toppliste
            </p>
            <h1 className="font-display font-black text-2xl text-foreground leading-tight">
              {copy.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {copy.text}
            </p>
          </div>
          <div className="size-11 rounded-full bg-primary/12 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0">
            <Trophy className="size-5" />
          </div>
        </div>

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

      <div
        className="flex items-center gap-2 overflow-x-auto scrollbar-none"
        data-ocid="toplist-filter-pills"
      >
        {TOPLIST_MODES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setMode(item.value)}
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

      {topPlayers.length === 0 ? (
        <div className="min-h-[45vh] flex flex-col items-center justify-center text-center px-6 rounded-2xl bg-card border border-border">
          <Search className="size-10 text-muted-foreground mb-4" />
          <h2 className="font-display font-bold text-lg text-foreground">
            Ingen spillere funnet
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-[260px]">
            Vi trenger litt mer statistikk før denne listen kan rangeres.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground">
              Topp {topPlayers.length} {mode === "keepers" ? "keepere" : "spillere"}
            </p>
            <span className="text-[10px] uppercase tracking-widest font-display font-bold text-primary">
              {TOPLIST_MODES.find((item) => item.value === mode)?.label}
            </span>
          </div>
          <div className="-mx-2 grid grid-cols-2 gap-2 sm:mx-0 sm:gap-3">
            {topPlayers.map((player, index) => (
              <ToplistCard
                key={player.id.toString()}
                player={player}
                teamName={teamMap.get(player.teamId.toString())}
                insight={insights.get(player.id.toString()) ?? getTopInsight(player)}
                mode={mode}
                index={index}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
