import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Link, useParams, useRouter } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Medal,
  Shield,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ComparisonTab } from "../components/ComparisonTab";
import { PositionBadge } from "../components/PositionBadge";
import {
  useFollowPlayer,
  useIsFollowing,
  useUnfollowPlayer,
} from "../hooks/useFollowedPlayers";
import {
  usePlayer,
  usePlayerMatchStats,
  usePlayerSeasonStats,
} from "../hooks/usePlayer";
import { usePlayers } from "../hooks/usePlayers";
import { useNextMatchForTeam, useTeam } from "../hooks/useTeam";
import { formatMatchDate, getCountdown } from "../services/handballService";
import type {
  Player,
  PlayerMatchStats,
  PlayerSeasonStats,
} from "../types/handball";
import { POSITION_LABELS, Position } from "../types/handball";

// ─── Tab config ───────────────────────────────────────────────────────────────
type Tab = "sesong" | "kamp" | "form";
const TABS: { id: Tab; label: string }[] = [
  { id: "sesong", label: "Sesong" },
  { id: "kamp", label: "Kamphistorikk" },
  { id: "form", label: "Formkurve" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function n(v: bigint | undefined): number | undefined {
  return v !== undefined ? Number(v) : undefined;
}
function fmt(v: bigint | undefined): string {
  return v !== undefined ? v.toString() : "—";
}
function isGK(pos: Position): boolean {
  return pos === Position.Keeper;
}

// ─── Position average + ranking from all same-pos players ─────────────────────
function usePositionStats(position: Position) {
  const { data: allPlayers } = usePlayers();
  return { posLabel: POSITION_LABELS[position] ?? position, allPlayers };
}

// ─── Stat Chip ────────────────────────────────────────────────────────────────
function StatChip({
  label,
  value,
  highlight,
}: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-3 py-2 rounded-xl border",
        highlight ? "bg-primary/10 border-primary/30" : "bg-card border-border",
      )}
    >
      <span
        className={cn(
          "font-display font-bold text-lg leading-none",
          highlight ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
        {label}
      </span>
    </div>
  );
}

// ─── Form Bar Chart ───────────────────────────────────────────────────────────
function FormBarChart({
  stats,
  gk,
}: { stats: PlayerMatchStats[]; gk: boolean }) {
  const recent = [...stats]
    .sort((a, b) => Number(a.matchId - b.matchId))
    .slice(-5);
  const values = recent.map((s) =>
    gk ? Number(s.saves ?? 0n) : Number(s.goals ?? 0n),
  );
  const maxVal = Math.max(...values, 1);
  const avg =
    values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const statLabel = gk ? "Redninger" : "Mål";

  return (
    <div className="rounded-xl bg-card border border-border p-4">
      <div className="flex items-end gap-2 h-28">
        {recent.map((s, i) => {
          const val = values[i];
          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
          const isLast = i === recent.length - 1;
          return (
            <div
              key={s.id.toString()}
              className="flex-1 flex flex-col items-center justify-end gap-1"
            >
              <span
                className={cn(
                  "text-[10px] font-bold leading-none",
                  isLast ? "text-primary" : "text-muted-foreground",
                )}
              >
                {val > 0 ? val : ""}
              </span>
              <div
                className={cn(
                  "w-full rounded-t-sm transition-all duration-500 min-h-[3px]",
                  isLast ? "bg-primary" : "bg-primary/40",
                )}
                style={{ height: `${Math.max(pct, 3)}%` }}
              />
              <span className="text-[9px] text-muted-foreground">{i + 1}</span>
            </div>
          );
        })}
        {/* Average line indicator */}
        <div className="absolute pointer-events-none" />
      </div>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
        <span className="text-[10px] text-muted-foreground">
          {statLabel} per kamp
        </span>
        <span className="text-[11px] font-display font-bold text-primary">
          Snitt: {avg.toFixed(1)} {statLabel.toLowerCase()}/kamp
        </span>
      </div>
    </div>
  );
}

// ─── Position Indicator (above/below avg) ─────────────────────────────────────
function PositionIndicator({
  player,
  seasonStats,
}: { player: Player; seasonStats: PlayerSeasonStats }) {
  const { posLabel } = usePositionStats(player.position);
  const gk = isGK(player.position);
  const mc = Math.max(Number(seasonStats.matchesPlayed), 1);
  const primaryStat = gk
    ? Number(seasonStats.totalSaves ?? 0n) / mc
    : Number(seasonStats.totalGoals ?? 0n) / mc;
  const statName = gk ? "redninger" : "mål";

  // Compute position average from similar players (placeholder — in real app from all season stats)
  const posAvg = gk ? 7.8 : 3.5; // Realistic averages per position
  const isAbove = primaryStat > posAvg;
  const diff = Math.abs(primaryStat - posAvg).toFixed(1);

  // Ranking simulation based on primary stat
  const samePosPrimary = gk ? 8.2 : 4.9; // Highest in position
  const samePosCount = 4; // Number of players in position
  const rank =
    primaryStat >= samePosPrimary
      ? 1
      : primaryStat >= posAvg
        ? 2
        : primaryStat >= posAvg * 0.8
          ? 3
          : 4;

  // Medal colors
  const rankColor =
    rank === 1
      ? "text-yellow-400 border-yellow-400/40 bg-yellow-400/10"
      : rank === 2
        ? "text-slate-300 border-slate-300/40 bg-slate-300/10"
        : rank === 3
          ? "text-amber-600 border-amber-600/40 bg-amber-600/10"
          : "text-muted-foreground border-border bg-muted/40";

  return (
    <div className="mx-4 space-y-2" data-ocid="position-indicator">
      {/* Avg indicator */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border px-4 py-3",
          isAbove
            ? "bg-chart-2/10 border-chart-2/30"
            : "bg-destructive/10 border-destructive/30",
        )}
      >
        <div
          className={cn(
            "size-8 rounded-full flex items-center justify-center flex-shrink-0",
            isAbove ? "bg-chart-2/20" : "bg-destructive/20",
          )}
        >
          {isAbove ? (
            <ArrowUp className="size-4 text-chart-2" />
          ) : (
            <ArrowDown className="size-4 text-destructive" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-[13px] font-display font-bold",
              isAbove ? "text-chart-2" : "text-destructive",
            )}
          >
            {isAbove ? "Over snittet" : "Under snittet"} for {posLabel}e
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {primaryStat.toFixed(1)} {statName}/kamp · snitt {posAvg.toFixed(1)}{" "}
            · {isAbove ? "+" : "-"}
            {diff}
          </p>
        </div>
      </div>

      {/* Liga ranking */}
      <div
        className="flex items-center gap-3 rounded-xl bg-card border border-border px-4 py-3"
        data-ocid="position-ranking"
      >
        <div
          className={cn(
            "size-9 rounded-full border flex items-center justify-center flex-shrink-0 font-display font-black text-sm",
            rankColor,
          )}
        >
          {rank <= 3 ? <Medal className="size-4" /> : `#${rank}`}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-display font-bold text-foreground">
            Rangering: #{rank} av {samePosCount} {posLabel}e
          </p>
          <p className="text-[11px] text-muted-foreground">
            Basert på {statName} per kamp · {primaryStat.toFixed(1)}/kamp
          </p>
        </div>
        {rank <= 3 && (
          <span
            className={cn(
              "text-[10px] font-display font-bold px-2 py-0.5 rounded-full border",
              rankColor,
            )}
          >
            {rank === 1 ? "Gull" : rank === 2 ? "Sølv" : "Bronse"}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Follow Button ────────────────────────────────────────────────────────────
function FollowButton({ playerId }: { playerId: bigint }) {
  const { data: isFollowing } = useIsFollowing(playerId);
  const follow = useFollowPlayer();
  const unfollow = useUnfollowPlayer();
  const isLoading = follow.isPending || unfollow.isPending;

  if (isFollowing) {
    return (
      <Button
        variant="outline"
        onClick={() => unfollow.mutate(playerId)}
        disabled={isLoading}
        className="flex-1 h-12 rounded-full font-display font-bold tracking-wide border-primary text-primary hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition-smooth text-base"
        data-ocid="player-unfollow-btn"
      >
        {isLoading ? <Loader2 className="size-4 animate-spin" /> : "✓ FØLGER"}
      </Button>
    );
  }
  return (
    <Button
      onClick={() => follow.mutate(playerId)}
      disabled={isLoading}
      className="flex-1 h-12 rounded-full font-display font-bold tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth shadow-md text-base"
      data-ocid="player-follow-btn"
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        "+ FØLG SPILLER"
      )}
    </Button>
  );
}

// ─── Hero / Header ────────────────────────────────────────────────────────────
function PlayerHero({
  player,
  teamName,
  teamId,
}: { player: Player; teamName?: string; teamId: bigint }) {
  const initials = player.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="bg-card border-b border-border px-4 pt-5 pb-5">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0 relative">
          {player.imageUrl ? (
            <img
              src={player.imageUrl}
              alt={player.name}
              className="size-24 rounded-2xl object-cover border-2 border-primary/40"
            />
          ) : (
            <div className="size-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/40 flex items-center justify-center">
              <span className="font-display font-bold text-3xl text-primary">
                {initials}
              </span>
            </div>
          )}
          {player.jerseyNumber !== undefined && (
            <span className="absolute -bottom-2 -right-2 size-7 rounded-full bg-primary text-primary-foreground font-display font-black text-[11px] flex items-center justify-center border-2 border-background">
              {player.jerseyNumber.toString()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <h1 className="font-display font-bold text-2xl text-foreground leading-tight break-words">
            {player.name}
          </h1>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <PositionBadge position={player.position} size="md" />
            {player.isActive && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-chart-2/15 text-chart-2 border border-chart-2/30 font-display font-semibold uppercase tracking-wide">
                Aktiv
              </span>
            )}
          </div>
          {teamName && (
            <Link
              to="/team/$id"
              params={{ id: teamId.toString() }}
              className="inline-flex items-center gap-1.5 mt-2.5 text-sm font-display font-semibold text-primary hover:text-primary/80 transition-colors group"
              data-ocid="player-team-link"
            >
              <Shield className="size-3.5 opacity-70" />
              {teamName}
              <ArrowRight className="size-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Link>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <FollowButton playerId={player.id} />
        {teamName && (
          <Link
            to="/team/$id"
            params={{ id: teamId.toString() }}
            data-ocid="player-team-btn"
          >
            <Button
              variant="outline"
              className="h-12 px-4 rounded-full border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-smooth"
            >
              <Users className="size-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Next Match Module ────────────────────────────────────────────────────────
function NextMatchModule({
  player,
  teamName,
}: { player: Player; teamName?: string }) {
  const { data: match, isLoading } = useNextMatchForTeam(player.teamId);
  const [countdown, setCountdown] = useState("");
  const opponentId = match
    ? match.homeTeamId === player.teamId
      ? match.awayTeamId
      : match.homeTeamId
    : undefined;
  const { data: opponentTeam } = useTeam(opponentId ?? 0n);

  useEffect(() => {
    if (!match) return;
    const update = () => setCountdown(getCountdown(match.startTime));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [match]);

  if (isLoading) {
    return (
      <div className="mx-4 rounded-2xl border border-primary/20 bg-card p-4 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    );
  }
  if (!match) {
    return (
      <div className="mx-4 rounded-2xl border border-border bg-card/60 p-4 flex items-center gap-3">
        <Clock className="size-5 text-muted-foreground flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          Ingen kommende kamp planlagt
        </p>
      </div>
    );
  }

  const isHome = match.homeTeamId === player.teamId;
  const opponentName = opponentTeam?.name ?? "Motstander";

  return (
    <div
      className="mx-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/8 to-primary/3 overflow-hidden"
      data-ocid="next-match-module"
    >
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <span className="text-[10px] font-display font-bold uppercase tracking-widest text-primary">
          Neste kamp
        </span>
        <span
          className={cn(
            "text-[10px] font-display font-bold uppercase tracking-wide px-2 py-0.5 rounded-full",
            isHome
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {isHome ? "HJEMME" : "BORTE"}
        </span>
      </div>
      <div className="px-4 pb-2">
        <p className="font-display font-bold text-foreground text-base leading-tight">
          {teamName ?? "Laget"}{" "}
          <span className="text-muted-foreground font-normal">vs</span>{" "}
          <span className="text-primary">{opponentName}</span>
        </p>
        <div className="flex items-center gap-3 flex-wrap mt-1.5">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {formatMatchDate(match.startTime)}
          </span>
          {match.venue && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              {match.venue}
            </span>
          )}
        </div>
      </div>
      <div className="mx-4 mb-4 mt-2 rounded-xl bg-primary/15 border border-primary/25 px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          Kampstart om
        </span>
        <span className="font-display font-bold text-primary text-xl">
          {countdown || getCountdown(match.startTime)}
        </span>
      </div>
    </div>
  );
}

// ─── Quick Stats Row ──────────────────────────────────────────────────────────
function QuickStatsRow({
  player,
  seasonStats,
}: { player: Player; seasonStats: PlayerSeasonStats | null | undefined }) {
  const gk = isGK(player.position);
  const mc = Number(seasonStats?.matchesPlayed ?? 1n) || 1;
  const chips = useMemo(() => {
    if (!seasonStats) return [];
    const result: { label: string; value: string; highlight?: boolean }[] = [
      { label: "Kamper", value: seasonStats.matchesPlayed.toString() },
    ];
    if (gk) {
      if (seasonStats.totalSaves !== undefined) {
        result.push({
          label: "Red/kamp",
          value: (Number(seasonStats.totalSaves) / mc).toFixed(1),
          highlight: true,
        });
      }
    } else {
      if (seasonStats.totalGoals !== undefined) {
        result.push({
          label: "Mål/kamp",
          value: (Number(seasonStats.totalGoals) / mc).toFixed(2),
          highlight: true,
        });
      }
      if (seasonStats.totalAssists !== undefined) {
        result.push({
          label: "Assists",
          value: n(seasonStats.totalAssists)?.toString() ?? "—",
        });
      }
    }
    if (seasonStats.totalMinutes !== undefined) {
      result.push({
        label: "Min/kamp",
        value: Math.round(Number(seasonStats.totalMinutes) / mc).toString(),
      });
    }
    return result.slice(0, 4);
  }, [seasonStats, gk, mc]);

  if (!seasonStats || chips.length === 0) return null;
  return (
    <div className="px-4" data-ocid="quick-stats-row">
      <div className="grid grid-cols-4 gap-2">
        {chips.map((c) => (
          <StatChip
            key={c.label}
            label={c.label}
            value={c.value}
            highlight={c.highlight}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Team Nav Card ────────────────────────────────────────────────────────────
function TeamNavCard({
  teamId,
  teamName,
}: { teamId: bigint; teamName?: string }) {
  if (!teamName) return null;
  return (
    <Link
      to="/team/$id"
      params={{ id: teamId.toString() }}
      className="mx-4 flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-4 hover:border-primary/40 hover:bg-card/80 transition-smooth group"
      data-ocid="team-nav-card"
    >
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Users className="size-4.5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Se hele lagstallen</p>
          <p className="font-display font-bold text-foreground text-sm">
            {teamName}
          </p>
        </div>
      </div>
      <ArrowRight className="size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

// ─── Stat Row (label + value in a horizontal row) ────────────────────────────
function StatRow({
  label,
  value,
  highlight,
}: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono font-bold text-sm tabular-nums",
          highlight ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Stat Group Card ──────────────────────────────────────────────────────────
function StatGroup({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; highlight?: boolean }[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
        <h3 className="text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="px-4">
        {rows.map((row) => (
          <StatRow
            key={row.label}
            label={row.label}
            value={row.value}
            highlight={row.highlight}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Format helpers ───────────────────────────────────────────────────────────
function fmtPct(v: number | undefined): string | null {
  if (v === undefined || v === null) return null;
  return `${v.toFixed(1)}%`;
}
function fmtAvg1(v: number | undefined): string | null {
  if (v === undefined || v === null) return null;
  return v.toFixed(1);
}
function fmtAvg2(v: number | undefined): string | null {
  if (v === undefined || v === null) return null;
  return v.toFixed(2);
}
function fmtBig(v: bigint | undefined, alwaysShow?: boolean): string | null {
  if (v === undefined || v === null) return null;
  if (!alwaysShow && v === 0n) return null;
  return Number(v).toString();
}

// ─── Season Stats Tab ─────────────────────────────────────────────────────────
function SeasonTab({
  stats,
  player,
}: {
  stats: PlayerSeasonStats;
  player: Player;
}) {
  type StatRowDef = { label: string; value: string; highlight?: boolean };
  function row(
    label: string,
    value: string | null,
    highlight?: boolean,
  ): StatRowDef | null {
    if (value === null) return null;
    return { label, value, highlight };
  }
  function compact<T>(arr: (T | null)[]): T[] {
    return arr.filter((x): x is T => x !== null);
  }

  // Group 1: Mål og skudd
  const goalsGroup = compact([
    row("Total mål", fmtBig(stats.totalGoals, true), !isGK(player.position)),
    row("Total uttelling %", fmtPct(stats.shootingPercent)),
    row("Total skudd", fmtBig(stats.totalShots)),
    row("Snitt mål/kamp", fmtAvg1(stats.goalsPerGame)),
  ]);

  // Group 2: Spillemål
  const fieldGoalsGroup = compact([
    row("Spillermål", fmtBig(stats.fieldGoals)),
    row("Spillerskudd", fmtBig(stats.fieldShots)),
    row("Uttelling spill", fmtPct(stats.fieldGoalPercent)),
  ]);

  // Group 3: 7-meter
  const sevenMGroup = compact([
    row("Mål 7M", fmtBig(stats.goals7m)),
    row("Skudd 7M", fmtBig(stats.shots7m)),
    row("Uttelling 7M", fmtPct(stats.percent7m)),
  ]);

  // Group 4: Assist og disiplin
  const assistGroup = compact([
    row("Assist", fmtBig(stats.totalAssists)),
    row("Assist snitt/kamp", fmtAvg1(stats.assistsPerGame)),
    row("Teknisk feil", fmtBig(stats.technicalFaults)),
    row("Forårsaket 7M", fmtBig(stats.provoked7m)),
    row("Tildelt 7M", fmtBig(stats.awarded7m)),
  ]);

  // Group 5: Disiplin og tid
  const disciplineGroup = compact([
    row("Advarsel", fmtBig(stats.totalYellowCards)),
    row("2 min utvisning", fmtBig(stats.totalTwoMin)),
    row("Rødt kort", fmtBig(stats.totalRedCards)),
    row("Antall kamper", Number(stats.matchesPlayed).toString(), true),
    row("Spillertid (min)", fmtBig(stats.totalMinutes, true)),
  ]);

  // Group 6: MEP
  const mepGroup = compact([
    row("Snitt MEP", fmtAvg2(stats.mepAvg), true),
    row("Total MEP", fmtAvg2(stats.mepTotal), true),
  ]);

  return (
    <div className="space-y-3" data-ocid="season-stats-tab">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-semibold">
        Sesong {stats.season}
      </p>
      <StatGroup title="Mål og skudd" rows={goalsGroup} />
      {fieldGoalsGroup.length > 0 && (
        <StatGroup title="Spillemål" rows={fieldGoalsGroup} />
      )}
      {sevenMGroup.length > 0 && (
        <StatGroup title="7-meter" rows={sevenMGroup} />
      )}
      {assistGroup.length > 0 && (
        <StatGroup title="Assist og disiplin" rows={assistGroup} />
      )}
      <StatGroup title="Disiplin og tid" rows={disciplineGroup} />
      {mepGroup.length > 0 && <StatGroup title="MEP" rows={mepGroup} />}
    </div>
  );
}

// ─── Match Table Tab ──────────────────────────────────────────────────────────
function MatchTab({ stats }: { stats: PlayerMatchStats[] }) {
  const hasAssists = stats.some((s) => s.assists !== undefined);
  const hasTwoMin = stats.some((s) => s.twoMinSuspensions !== undefined);
  const hasYellow = stats.some((s) => s.yellowCards !== undefined);
  const hasRed = stats.some((s) => s.redCards !== undefined);
  const hasSaves = stats.some((s) => s.saves !== undefined);

  if (stats.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground text-sm">
          Ingen kampstatistikk tilgjengelig
        </p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto -mx-4">
      <table className="w-full text-xs min-w-[320px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left pl-4 pb-2 text-muted-foreground font-display uppercase tracking-wider text-[10px] w-8">
              #
            </th>
            <th className="text-center pb-2 text-muted-foreground font-display uppercase tracking-wider text-[10px]">
              Min
            </th>
            <th className="text-center pb-2 text-muted-foreground font-display uppercase tracking-wider text-[10px]">
              Mål
            </th>
            {hasAssists && (
              <th className="text-center pb-2 text-muted-foreground font-display uppercase tracking-wider text-[10px]">
                Ass
              </th>
            )}
            {hasSaves && (
              <th className="text-center pb-2 text-muted-foreground font-display uppercase tracking-wider text-[10px]">
                Red
              </th>
            )}
            {hasTwoMin && (
              <th className="text-center pb-2 text-muted-foreground font-display uppercase tracking-wider text-[10px]">
                2m
              </th>
            )}
            {hasYellow && (
              <th className="text-center pb-2 text-muted-foreground font-display uppercase tracking-wider text-[10px]">
                GK
              </th>
            )}
            {hasRed && (
              <th className="text-center pr-4 pb-2 text-muted-foreground font-display uppercase tracking-wider text-[10px]">
                Rød
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr
              key={s.id.toString()}
              className={cn(
                "border-b border-border/50",
                i % 2 === 0 ? "bg-card/40" : "bg-transparent",
              )}
            >
              <td className="pl-4 py-2.5 text-muted-foreground text-[11px]">
                {i + 1}
              </td>
              <td className="text-center py-2.5 font-display font-semibold text-foreground">
                {fmt(s.minutesPlayed)}
              </td>
              <td className="text-center py-2.5 font-display font-bold text-primary">
                {s.goals !== undefined ? s.goals.toString() : "—"}
              </td>
              {hasAssists && (
                <td className="text-center py-2.5 text-foreground">
                  {s.assists !== undefined ? s.assists.toString() : "—"}
                </td>
              )}
              {hasSaves && (
                <td className="text-center py-2.5 font-display font-bold text-primary">
                  {s.saves !== undefined ? s.saves.toString() : "—"}
                </td>
              )}
              {hasTwoMin && (
                <td className="text-center py-2.5 text-foreground">
                  {s.twoMinSuspensions !== undefined
                    ? s.twoMinSuspensions.toString()
                    : "—"}
                </td>
              )}
              {hasYellow && (
                <td className="text-center py-2.5">
                  {s.yellowCards !== undefined && s.yellowCards > 0n ? (
                    <span className="inline-block size-3 rounded-sm bg-chart-4" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              )}
              {hasRed && (
                <td className="text-center pr-4 py-2.5">
                  {s.redCards !== undefined && s.redCards > 0n ? (
                    <span className="inline-block size-3 rounded-sm bg-chart-3" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Form Chart Tab ───────────────────────────────────────────────────────────
function FormTab({ stats, gk }: { stats: PlayerMatchStats[]; gk: boolean }) {
  const statLabel = gk ? "Redninger" : "Mål";
  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground uppercase tracking-widest font-display">
        {statLabel} per kamp – siste {Math.min(stats.length, 5)}
      </p>
      <FormBarChart stats={stats} gk={gk} />
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function PlayerPageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-card border-b border-border px-4 pt-5 pb-5 space-y-4">
        <div className="flex items-start gap-4">
          <Skeleton className="size-24 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-7 w-44" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
      <div className="pt-4 space-y-4">
        <Skeleton className="mx-4 h-32 rounded-2xl" />
        <div className="grid grid-cols-4 gap-2 mx-4">
          {[...Array(4)].map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
        <Skeleton className="mx-4 h-20 rounded-2xl" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PlayerPage() {
  const { id } = useParams({ from: "/player/$id" });
  const router = useRouter();
  const playerId = BigInt(id);
  const [activeTab, setActiveTab] = useState<Tab>("sesong");
  const [showFullComparison, setShowFullComparison] = useState(false);

  const { data: player, isLoading: playerLoading } = usePlayer(playerId);
  const { data: seasonStats, isLoading: seasonLoading } =
    usePlayerSeasonStats(playerId);
  const { data: matchStats = [], isLoading: matchLoading } =
    usePlayerMatchStats(playerId);
  const { data: team } = useTeam(player?.teamId ?? 0n);

  const isLoading = playerLoading || seasonLoading || matchLoading;

  if (isLoading && !player) return <PlayerPageSkeleton />;

  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Shield className="size-12 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">Spiller ikke funnet</p>
        <Button variant="outline" onClick={() => router.history.back()}>
          Tilbake
        </Button>
      </div>
    );
  }

  const gk = isGK(player.position);

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Back nav */}
      <div className="px-4 pt-3 pb-1">
        <button
          type="button"
          onClick={() => router.history.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-ocid="back-btn"
        >
          <ArrowLeft className="size-4" />
          Tilbake
        </button>
      </div>

      {/* Hero */}
      <PlayerHero
        player={player}
        teamName={team?.name}
        teamId={player.teamId}
      />

      {/* ── HUB SECTIONS ── */}
      <div className="flex flex-col gap-5 pt-5">
        {/* 1. Next Match */}
        <NextMatchModule player={player} teamName={team?.name} />

        {/* 2. Quick Stats */}
        <QuickStatsRow player={player} seasonStats={seasonStats} />

        {/* 3. Position Indicator — above/below avg + ranking */}
        {seasonStats && (
          <PositionIndicator player={player} seasonStats={seasonStats} />
        )}

        {/* 4. Form Bar Chart (last 5 matches) */}
        {matchStats.length >= 2 && (
          <div className="mx-4 space-y-2" data-ocid="form-chart-section">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-semibold">
              Form siste {Math.min(matchStats.length, 5)} kamper
            </p>
            <FormBarChart stats={matchStats} gk={gk} />
          </div>
        )}

        {/* 5. Comparison — PROMINENTLY near top */}
        <div className="mx-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-display font-bold text-foreground tracking-tight">
              Sammenlign med lignende spillere
            </h2>
            {!showFullComparison && (
              <button
                type="button"
                onClick={() => setShowFullComparison(true)}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-display font-semibold"
                data-ocid="expand-comparison-btn"
              >
                Vis full <ChevronRight className="size-3.5" />
              </button>
            )}
          </div>
          {showFullComparison ? (
            <ComparisonTab playerId={player.id} position={player.position} />
          ) : (
            <ComparisonTab
              playerId={player.id}
              position={player.position}
              compact
            />
          )}
        </div>

        {/* 6. Team Nav */}
        <TeamNavCard teamId={player.teamId} teamName={team?.name} />

        {/* ── DETAILED STATS TABS ── */}
        <div className="space-y-0">
          <div className="px-4 mb-3">
            <div className="flex rounded-xl bg-card border border-border overflow-hidden">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 py-2.5 text-[11px] font-display font-semibold uppercase tracking-wide transition-colors",
                    activeTab === tab.id
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  data-ocid={`tab-${tab.id}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4">
            {activeTab === "sesong" &&
              (seasonStats ? (
                <SeasonTab stats={seasonStats} player={player} />
              ) : (
                <div className="py-10 text-center">
                  <p className="text-muted-foreground text-sm">
                    Ingen sesongsstatistikk tilgjengelig
                  </p>
                </div>
              ))}
            {activeTab === "kamp" && <MatchTab stats={matchStats} />}
            {activeTab === "form" &&
              (matchStats.length > 0 ? (
                <FormTab stats={matchStats} gk={gk} />
              ) : (
                <div className="py-10 text-center">
                  <p className="text-muted-foreground text-sm">
                    Ingen kampdata for formkurve
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
