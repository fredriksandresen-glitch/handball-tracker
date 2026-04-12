import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { usePlayerSeasonStats } from "../hooks/usePlayer";
import { usePlayers } from "../hooks/usePlayers";
import type { Player, PlayerSeasonStats, Position } from "../types/handball";
import { POSITION_LABELS } from "../types/handball";

interface Props {
  playerId: bigint;
  position: Position;
  /** Compact mode: auto-select top 2, show fewer rows */
  compact?: boolean;
}

// ─── stat definitions ─────────────────────────────────────────────────────────
interface StatDef {
  key: string;
  label: string;
  compute: (s: PlayerSeasonStats) => number | undefined;
  decimals?: number;
  higherBetter?: boolean;
}

const BASE_STATS: StatDef[] = [
  {
    key: "goals",
    label: "Mål / kamp",
    compute: (s) =>
      s.totalGoals !== undefined && s.matchesPlayed > 0n
        ? Number(s.totalGoals) / Number(s.matchesPlayed)
        : undefined,
    decimals: 2,
    higherBetter: true,
  },
  {
    key: "minutes",
    label: "Min / kamp",
    compute: (s) =>
      s.totalMinutes !== undefined && s.matchesPlayed > 0n
        ? Number(s.totalMinutes) / Number(s.matchesPlayed)
        : undefined,
    decimals: 1,
    higherBetter: true,
  },
  {
    key: "assists",
    label: "Assists / kamp",
    compute: (s) =>
      s.totalAssists !== undefined && s.matchesPlayed > 0n
        ? Number(s.totalAssists) / Number(s.matchesPlayed)
        : undefined,
    decimals: 2,
    higherBetter: true,
  },
  {
    key: "yellow",
    label: "Gule kort",
    compute: (s) =>
      s.totalYellowCards !== undefined && s.matchesPlayed > 0n
        ? Number(s.totalYellowCards) / Number(s.matchesPlayed)
        : undefined,
    decimals: 2,
    higherBetter: false,
  },
  {
    key: "twomin",
    label: "2-min / kamp",
    compute: (s) =>
      s.totalTwoMin !== undefined && s.matchesPlayed > 0n
        ? Number(s.totalTwoMin) / Number(s.matchesPlayed)
        : undefined,
    decimals: 2,
    higherBetter: false,
  },
];
const KEEPER_STATS: StatDef[] = [
  {
    key: "saves",
    label: "Redninger / kamp",
    compute: (s) =>
      s.totalSaves !== undefined && s.matchesPlayed > 0n
        ? Number(s.totalSaves) / Number(s.matchesPlayed)
        : undefined,
    decimals: 1,
    higherBetter: true,
  },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmt(val: number | undefined, decimals = 1): string {
  if (val === undefined) return "–";
  return val.toFixed(decimals);
}

// ─── fixed-slot stats hooks ───────────────────────────────────────────────────
function useAllSamePosStats(ids: bigint[]) {
  const id = (n: number) => ids[n] ?? 0n;
  const r0 = usePlayerSeasonStats(id(0));
  const r1 = usePlayerSeasonStats(id(1));
  const r2 = usePlayerSeasonStats(id(2));
  const r3 = usePlayerSeasonStats(id(3));
  const r4 = usePlayerSeasonStats(id(4));
  const r5 = usePlayerSeasonStats(id(5));
  const r6 = usePlayerSeasonStats(id(6));
  const r7 = usePlayerSeasonStats(id(7));
  const r8 = usePlayerSeasonStats(id(8));
  const r9 = usePlayerSeasonStats(id(9));
  const r10 = usePlayerSeasonStats(id(10));
  const r11 = usePlayerSeasonStats(id(11));
  const all = [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11];
  const isLoading = all
    .slice(0, Math.max(ids.length, 1))
    .some((r) => r.isLoading);
  const map = new Map<string, PlayerSeasonStats | null>();
  for (let i = 0; i < ids.length; i++)
    map.set(ids[i].toString(), all[i].data ?? null);
  return { map, isLoading };
}

// ─── Big stat bar row ─────────────────────────────────────────────────────────
interface BarEntry {
  playerId: string;
  name: string;
  value: number | undefined;
  isPrimary: boolean;
}

function StatBarRow({
  def,
  entries,
  avg,
}: { def: StatDef; entries: BarEntry[]; avg: number | undefined }) {
  const validEntries = entries.filter((e) => e.value !== undefined);
  if (validEntries.length === 0) return null;

  const maxVal = Math.max(
    ...validEntries.map((e) => e.value ?? 0),
    avg ?? 0,
    0.01,
  );
  const higherBetter = def.higherBetter !== false;

  // Find winner (best value)
  const sorted = [...validEntries].sort((a, b) =>
    higherBetter
      ? (b.value ?? 0) - (a.value ?? 0)
      : (a.value ?? 0) - (b.value ?? 0),
  );
  const winnerId = sorted[0]?.playerId;

  return (
    <div
      className="rounded-xl bg-card border border-border p-3 space-y-2.5"
      data-ocid="comparison-stat-row"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
          {def.label}
        </span>
        {avg !== undefined && (
          <span className="text-[10px] text-muted-foreground/60 font-body">
            ⌀ {fmt(avg, def.decimals)}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {entries.map((entry) => {
          const val = entry.value;
          const pct =
            val !== undefined && maxVal > 0
              ? Math.max((val / maxVal) * 100, 2)
              : 0;
          const isWinner = entry.playerId === winnerId;
          const rank =
            sorted.findIndex((s) => s.playerId === entry.playerId) + 1;

          return (
            <div
              key={entry.playerId}
              className={cn(
                "rounded-lg p-2",
                isWinner ? "bg-primary/8 border border-primary/20" : "",
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {/* Rank badge */}
                <span
                  className={cn(
                    "size-4.5 rounded-full flex items-center justify-center text-[9px] font-display font-black flex-shrink-0",
                    rank === 1
                      ? "bg-primary/20 text-primary"
                      : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  {rank}
                </span>
                <span
                  className={cn(
                    "text-[12px] font-display font-semibold flex-1 min-w-0 truncate",
                    entry.isPrimary
                      ? "text-primary"
                      : isWinner
                        ? "text-foreground font-bold"
                        : "text-muted-foreground",
                  )}
                >
                  {entry.name}
                  {entry.isPrimary && (
                    <span className="ml-1 text-[9px] text-primary/60">
                      (deg)
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-[13px] font-display font-bold flex-shrink-0",
                    isWinner
                      ? "text-primary"
                      : entry.isPrimary
                        ? "text-primary"
                        : "text-foreground",
                  )}
                >
                  {fmt(val, def.decimals)}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isWinner
                      ? "bg-primary"
                      : entry.isPrimary
                        ? "bg-primary/70"
                        : "bg-muted-foreground/40",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Player chip ──────────────────────────────────────────────────────────────
function PlayerChip({
  player,
  selected,
  onToggle,
}: { player: Player; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-display font-semibold border transition-smooth truncate max-w-[130px]",
        selected
          ? "bg-primary/20 border-primary/50 text-primary"
          : "bg-muted/40 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
      data-ocid="comparison-player-chip"
    >
      {player.name.split(" ").at(-1)}
    </button>
  );
}

function SkeletonTable() {
  return (
    <div className="space-y-2 mt-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export function ComparisonTab({ playerId, position, compact = false }: Props) {
  const { data: allPlayers, isLoading: loadingPlayers } = usePlayers();
  const [selected, setSelected] = useState<bigint[]>([]);

  const samePosPlayers = useMemo(() => {
    if (!allPlayers) return [];
    return allPlayers.filter(
      (p) => p.position === position && p.id !== playerId,
    );
  }, [allPlayers, position, playerId]);

  const suggestions = useMemo(
    () => samePosPlayers.slice(0, 5),
    [samePosPlayers],
  );

  // Auto-select top 2 in compact mode
  const autoSelected = useMemo(() => {
    if (!compact) return [];
    return samePosPlayers.slice(0, 2).map((p) => p.id);
  }, [compact, samePosPlayers]);

  const activeSelected = compact ? autoSelected : selected;

  function togglePlayer(id: bigint) {
    setSelected((prev) => {
      if (prev.some((x) => x === id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  const allIds = useMemo(() => {
    const core = [playerId, ...activeSelected];
    const extraSrc = samePosPlayers
      .filter((p) => !core.some((id) => id === p.id))
      .slice(0, 12 - core.length);
    return [...core, ...extraSrc.map((p) => p.id)];
  }, [playerId, activeSelected, samePosPlayers]);

  const { map: statsMap, isLoading: loadingStats } = useAllSamePosStats(allIds);

  const isKeeper = position === "Keeper";
  const statDefs = isKeeper
    ? [...BASE_STATS.filter((s) => s.key !== "goals"), ...KEEPER_STATS]
    : BASE_STATS;
  const visibleDefs = compact ? statDefs.slice(0, 2) : statDefs;

  const allStatsForAvg = useMemo(() => {
    const out: PlayerSeasonStats[] = [];
    for (const [, s] of statsMap) {
      if (s) out.push(s);
    }
    return out;
  }, [statsMap]);

  const avgMap = useMemo(() => {
    const result = new Map<string, number>();
    for (const def of statDefs) {
      const vals = allStatsForAvg
        .map((s) => def.compute(s))
        .filter((v): v is number => v !== undefined);
      if (vals.length > 0)
        result.set(def.key, vals.reduce((a, b) => a + b, 0) / vals.length);
    }
    return result;
  }, [allStatsForAvg, statDefs]);

  if (loadingPlayers) return <SkeletonTable />;

  if (samePosPlayers.length < 1) {
    return (
      <div
        className="text-center py-8 text-muted-foreground text-sm rounded-xl bg-card border border-border"
        data-ocid="comparison-no-players"
      >
        Ingen sammenlignbare spillere funnet
      </div>
    );
  }

  const primaryStats = statsMap.get(playerId.toString());
  const posLabel = POSITION_LABELS[position] ?? position;
  const primaryPlayer = allPlayers?.find((p) => p.id === playerId);
  const primaryName = primaryPlayer?.name.split(" ").at(-1) ?? "Deg";

  const selectedPlayers = activeSelected
    .map((id) => allPlayers?.find((p) => p.id === id))
    .filter(Boolean) as Player[];

  // Build entries array for each stat
  const allParticipants: {
    playerId: bigint;
    name: string;
    isPrimary: boolean;
    stats: PlayerSeasonStats | null;
  }[] = [
    {
      playerId,
      name: primaryName,
      isPrimary: true,
      stats: primaryStats ?? null,
    },
    ...selectedPlayers.map((p) => ({
      playerId: p.id,
      name: p.name.split(" ").at(-1) ?? "",
      isPrimary: false,
      stats: statsMap.get(p.id.toString()) ?? null,
    })),
  ];

  // ─── Compact Mode ──────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="space-y-2" data-ocid="comparison-compact">
        {loadingStats ? (
          <SkeletonTable />
        ) : (
          visibleDefs.map((def) => {
            const entries: BarEntry[] = allParticipants.map((p) => ({
              playerId: p.playerId.toString(),
              name: p.name,
              value: p.stats ? def.compute(p.stats) : undefined,
              isPrimary: p.isPrimary,
            }));
            return (
              <StatBarRow
                key={def.key}
                def={def}
                entries={entries}
                avg={avgMap.get(def.key)}
              />
            );
          })
        )}
      </div>
    );
  }

  // ─── Full Mode ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4" data-ocid="comparison-tab">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
          Sammenligning: <span className="text-primary">{posLabel}</span>
        </p>
        <span className="text-[10px] text-muted-foreground">
          Velg opp til 3
        </span>
      </div>

      {/* Player chips */}
      <div className="flex flex-wrap gap-2" data-ocid="comparison-chips">
        {suggestions.map((p) => (
          <PlayerChip
            key={p.id.toString()}
            player={p}
            selected={selected.some((x) => x === p.id)}
            onToggle={() => togglePlayer(p.id)}
          />
        ))}
      </div>

      {/* Bar graph comparison */}
      {loadingStats ? (
        <SkeletonTable />
      ) : (
        <div className="space-y-3">
          {visibleDefs.map((def) => {
            const entries: BarEntry[] = allParticipants.map((p) => ({
              playerId: p.playerId.toString(),
              name: p.name,
              value: p.stats ? def.compute(p.stats) : undefined,
              isPrimary: p.isPrimary,
            }));
            const hasAny = entries.some((e) => e.value !== undefined);
            if (!hasAny) return null;
            return (
              <StatBarRow
                key={def.key}
                def={def}
                entries={entries}
                avg={avgMap.get(def.key)}
              />
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-primary/30" />
          Best i kategorien
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-muted" />
          Lavere
        </span>
      </div>
    </div>
  );
}
