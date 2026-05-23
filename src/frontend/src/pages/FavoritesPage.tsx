import { cn } from "@/lib/utils";
import {
  Flame,
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

type HotlistMode = "hot" | "form" | "mep" | "goals" | "keepers";

type HotInsight = {
  seasonStats?: PlayerSeasonStats;
  sparkValues: number[];
  formAvg?: number;
  latestMep?: number;
  latestGoals?: number;
  latestSaves?: number;
  latestSavePct?: number;
  totalGoals?: number;
  mepAvg?: number;
  hotScore: number;
};

const HOTLIST_MODES: { value: HotlistMode; label: string }[] = [
  { value: "hot", label: "Heitest" },
  { value: "form", label: "Beste form" },
  { value: "mep", label: "Snitt MEP" },
  { value: "goals", label: "Mål" },
  { value: "keepers", label: "Keepere" },
];

function getMatchDate(match: EnrichedPlayerMatchStats) {
  return match.date ?? match.matchId.toString();
}

function asNumber(value: bigint | undefined) {
  return value === undefined ? undefined : Number(value);
}

function getHotInsight(player: Player): HotInsight {
  const profile = getStaticProfile(player.id);
  if (!profile) return { sparkValues: [], hotScore: 0 };

  const seasonStats = mapClawdbotSeasonStats(profile);
  const mepMatches = (mapClawdbotMatchStats(profile) as EnrichedPlayerMatchStats[])
    .filter((match) => typeof match.mep === "number")
    .sort((a, b) => getMatchDate(a).localeCompare(getMatchDate(b)))
    .slice(-5);
  const latestMatch = mepMatches.at(-1);
  const sparkValues = mepMatches.map((match) => match.mep ?? 0);
  const latestMep = sparkValues.at(-1);
  const formAvg = sparkValues.length
    ? sparkValues.reduce((sum, value) => sum + value, 0) / sparkValues.length
    : seasonStats.mepAvg;
  const goalsPerGame = seasonStats.goalsPerGame ?? 0;
  const keeperLift =
    player.position === Position.Keeper
      ? (latestMatch?.savePct ?? 0) / 10 + Number(latestMatch?.saves ?? 0n) / 3
      : 0;
  const hotScore =
    (formAvg ?? 0) * 12 +
    (seasonStats.mepAvg ?? 0) * 5 +
    goalsPerGame * 4 +
    keeperLift +
    Math.min(Number(seasonStats.matchesPlayed), 26) / 10;

  return {
    seasonStats,
    sparkValues,
    formAvg,
    latestMep,
    latestGoals:
      latestMatch?.goals === undefined ? undefined : Number(latestMatch.goals),
    latestSaves:
      latestMatch?.saves === undefined ? undefined : Number(latestMatch.saves),
    latestSavePct: latestMatch?.savePct,
    totalGoals: asNumber(seasonStats.totalGoals),
    mepAvg: seasonStats.mepAvg,
    hotScore,
  };
}

function sortHotPlayers(
  players: Player[],
  mode: HotlistMode,
  insights: Map<string, HotInsight>,
) {
  const sorted = [...players];
  if (mode === "keepers") {
    return sorted
      .filter((player) => player.position === Position.Keeper)
      .sort((a, b) => {
        const ai = insights.get(a.id.toString()) ?? getHotInsight(a);
        const bi = insights.get(b.id.toString()) ?? getHotInsight(b);
        return (
          (bi.latestMep ?? 0) - (ai.latestMep ?? 0) ||
          (bi.latestSavePct ?? 0) - (ai.latestSavePct ?? 0) ||
          (bi.latestSaves ?? 0) - (ai.latestSaves ?? 0)
        );
      });
  }

  return sorted.sort((a, b) => {
    const ai = insights.get(a.id.toString()) ?? getHotInsight(a);
    const bi = insights.get(b.id.toString()) ?? getHotInsight(b);
    if (mode === "form") return (bi.formAvg ?? 0) - (ai.formAvg ?? 0);
    if (mode === "mep") return (bi.mepAvg ?? 0) - (ai.mepAvg ?? 0);
    if (mode === "goals") return (bi.totalGoals ?? 0) - (ai.totalGoals ?? 0);
    return bi.hotScore - ai.hotScore;
  });
}

function HotlistCard({
  player,
  teamName,
  insight,
  index,
}: {
  player: Player;
  teamName?: string;
  insight: HotInsight;
  index: number;
}) {
  const { data: following, isLoading: checkingFollow } = useIsFollowing(
    player.id,
  );
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
        latestMep={insight.latestMep}
        latestGoals={insight.latestGoals}
        latestSaves={insight.latestSaves}
        latestSavePct={insight.latestSavePct}
        sparkValues={insight.sparkValues}
      />
    </motion.div>
  );
}

function HotStat({
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

export default function FavoritesPage() {
  const [mode, setMode] = useState<HotlistMode>("hot");
  const { data: players = [], isLoading } = usePlayers();
  const { data: teams = [] } = useTeams();

  const teamMap = useMemo(
    () => new Map(teams.map((team) => [team.id.toString(), team.name])),
    [teams],
  );

  const insights = useMemo(
    () =>
      new Map(
        players.map((player) => [player.id.toString(), getHotInsight(player)]),
      ),
    [players],
  );

  const hotPlayers = useMemo(
    () => sortHotPlayers(players, mode, insights).slice(0, 20),
    [players, mode, insights],
  );

  const topPlayer = hotPlayers[0];
  const topInsight = topPlayer
    ? insights.get(topPlayer.id.toString()) ?? getHotInsight(topPlayer)
    : undefined;

  if (isLoading) {
    return (
      <div className="space-y-3" data-ocid="hotlist-loading">
        <SkeletonCard variant="player" />
        <SkeletonCard variant="player" />
        <SkeletonCard variant="player" />
      </div>
    );
  }

  return (
    <div className="space-y-5" data-ocid="hotlist-page">
      <section className="rounded-2xl bg-card border border-border p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-primary font-display font-bold mb-1">
              Hotlist
            </p>
            <h1 className="font-display font-black text-2xl text-foreground leading-tight">
              Spillere i flyt
            </h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Rangert på MEP-form, siste kamp og sesongnivå.
            </p>
          </div>
          <div className="size-11 rounded-full bg-primary/12 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0">
            <Flame className="size-5" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <HotStat
            icon={Trophy}
            label="Topp"
            value={topPlayer ? (topPlayer.name.split(" ").at(-1) ?? "-") : "-"}
          />
          <HotStat
            icon={Target}
            label="MEP sist"
            value={topInsight?.latestMep?.toFixed(1) ?? "-"}
          />
          <HotStat icon={Shield} label="Spillere" value={players.length.toString()} />
        </div>
      </section>

      <div
        className="flex items-center gap-2 overflow-x-auto scrollbar-none"
        data-ocid="hotlist-filter-pills"
      >
        {HOTLIST_MODES.map((item) => (
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
            data-ocid={`hotlist-mode-${item.value}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {hotPlayers.length === 0 ? (
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
              Topp {hotPlayers.length} {mode === "keepers" ? "keepere" : "spillere"}
            </p>
            <span className="text-[10px] uppercase tracking-widest font-display font-bold text-primary">
              {HOTLIST_MODES.find((item) => item.value === mode)?.label}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {hotPlayers.map((player, index) => (
              <HotlistCard
                key={player.id.toString()}
                player={player}
                teamName={teamMap.get(player.teamId.toString())}
                insight={insights.get(player.id.toString()) ?? getHotInsight(player)}
                index={index}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
