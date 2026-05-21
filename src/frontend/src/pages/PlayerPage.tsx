import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, useParams, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Shield,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PositionBadge } from "../components/PositionBadge";
import {
  usePlayer,
  usePlayerMatchStats,
  usePlayerSeasonStats,
} from "../hooks/usePlayer";
import { useTeam } from "../hooks/useTeam";
import type {
  Player,
  PlayerMatchStats,
  PlayerSeasonStats,
} from "../types/handball";
import { Position } from "../types/handball";

type Tab = "season" | "matches" | "form";

function isGK(position: Position) {
  return position === Position.Keeper;
}

function asNumber(value: bigint | undefined) {
  return value === undefined ? undefined : Number(value);
}

function formatNumber(value: number | bigint | undefined) {
  if (value === undefined) return "-";
  return typeof value === "bigint" ? value.toString() : value.toString();
}

function formatPct(value: number | undefined) {
  return value === undefined ? "-" : `${value.toFixed(1)}%`;
}

function StatCard({
  label,
  value,
  detail,
  highlight,
}: {
  label: string;
  value: string;
  detail?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 min-h-[78px] flex flex-col justify-center",
        highlight
          ? "bg-primary/12 border-primary/40"
          : "bg-card border-border",
      )}
    >
      <p
        className={cn(
          "font-display font-black text-3xl leading-none tabular-nums",
          highlight ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
        {label}
      </p>
      {detail && <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>}
    </div>
  );
}

function PlayerHero({
  player,
  teamName,
  teamId,
}: {
  player: Player;
  teamName?: string;
  teamId: bigint;
}) {
  const initials = player.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="bg-card border-b border-border px-4 py-5">
      <div className="flex items-start gap-4">
        {player.imageUrl ? (
          <img
            src={player.imageUrl}
            alt={player.name}
            className="size-24 rounded-2xl object-cover border-2 border-primary/40"
          />
        ) : (
          <div className="size-24 rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-cyan-950 border-2 border-primary/40 flex items-center justify-center">
            <span className="font-display font-black text-3xl text-primary">
              {initials}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0 pt-1">
          <h1 className="font-display font-black text-3xl text-foreground leading-tight break-words">
            {player.name}
          </h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <PositionBadge position={player.position} size="md" />
            {player.isActive && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-chart-2/15 text-chart-2 border border-chart-2/30 font-display font-bold uppercase tracking-wide">
                Aktiv
              </span>
            )}
          </div>

          {teamName && (
            <Link
              to="/team/$id"
              params={{ id: teamId.toString() }}
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-display font-bold text-primary hover:text-primary/80 transition-colors"
            >
              <Shield className="size-4" />
              {teamName}
              <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <Button className="flex-1 h-12 rounded-full font-display font-black tracking-widest bg-primary text-primary-foreground hover:bg-primary/90">
          + FØLG SPILLER
        </Button>
        {teamName && (
          <Link to="/team/$id" params={{ id: teamId.toString() }}>
            <Button
              variant="outline"
              className="h-12 px-4 rounded-full border-border text-muted-foreground hover:text-primary hover:border-primary/40"
            >
              <Users className="size-4" />
            </Button>
          </Link>
        )}
      </div>
    </section>
  );
}

function KeyStats({
  player,
  stats,
}: {
  player: Player;
  stats: PlayerSeasonStats | null | undefined;
}) {
  if (!stats) return null;

  const matches = Math.max(Number(stats.matchesPlayed), 1);
  const totalGoals = asNumber(stats.totalGoals);
  const totalSaves = asNumber(stats.totalSaves);
  const primaryValue = isGK(player.position) ? totalSaves : totalGoals;
  const primaryLabel = isGK(player.position) ? "Redninger" : "Mål";
  const perMatch = primaryValue === undefined ? undefined : primaryValue / matches;

  return (
    <section className="px-4" data-ocid="key-stats">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label={primaryLabel}
          value={formatNumber(primaryValue)}
          detail="totalt denne sesongen"
          highlight
        />
        <StatCard
          label={`${primaryLabel}/kamp`}
          value={perMatch === undefined ? "-" : perMatch.toFixed(2)}
          detail={`${matches} kamper`}
        />
        <StatCard
          label="Assists"
          value={formatNumber(stats.totalAssists)}
          detail={
            stats.assistsPerGame === undefined
              ? undefined
              : `${stats.assistsPerGame.toFixed(1)} per kamp`
          }
        />
        <StatCard
          label="Uttelling"
          value={formatPct(stats.shootingPercent)}
          detail={
            stats.totalShots === undefined
              ? undefined
              : `${stats.totalShots.toString()} skudd`
          }
        />
      </div>
    </section>
  );
}

function FormOverview({
  stats,
  gk,
}: {
  stats: PlayerMatchStats[];
  gk: boolean;
}) {
  const recent = useMemo(
    () => [...stats].sort((a, b) => Number(a.matchId - b.matchId)).slice(-5),
    [stats],
  );

  const values = recent.map((match) =>
    gk ? Number(match.saves ?? 0n) : Number(match.goals ?? 0n),
  );
  const max = Math.max(...values, 1);
  const avg = values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
  const last = values.at(-1) ?? 0;
  const best = Math.max(...values, 0);
  const label = gk ? "Redninger" : "Mål";

  if (recent.length === 0) return null;

  return (
    <section className="mx-4 space-y-3" data-ocid="form-overview">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
            Form siste {recent.length} kamper
          </p>
          <h2 className="font-display font-black text-lg text-foreground">
            Siste kamp: {last} {label.toLowerCase()}
          </h2>
        </div>
        <TrendingUp className="size-5 text-primary" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-primary/12 border border-primary/35 px-3 py-2">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
              Siste
            </p>
            <p className="font-display font-black text-2xl text-primary leading-none">
              {last}
            </p>
          </div>
          <div className="rounded-xl bg-muted/35 border border-border px-3 py-2">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
              Snitt
            </p>
            <p className="font-display font-black text-2xl text-foreground leading-none">
              {avg.toFixed(1)}
            </p>
          </div>
          <div className="rounded-xl bg-muted/35 border border-border px-3 py-2">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
              Beste
            </p>
            <p className="font-display font-black text-2xl text-foreground leading-none">
              {best}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {recent.map((match, index) => {
            const value = values[index];
            const shots = Number(match.shots ?? 0n);
            const shotPct =
              match.shotPct ?? (shots > 0 && !gk ? (value / shots) * 100 : undefined);
            const isLast = index === recent.length - 1;
            const width = `${Math.max((value / max) * 100, 5)}%`;

            return (
              <div
                key={match.id.toString()}
                className={cn(
                  "rounded-xl border px-3 py-2",
                  isLast
                    ? "border-primary/45 bg-primary/8"
                    : "border-border bg-background/35",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm text-foreground">
                      {isLast ? "Siste kamp" : `Kamp ${index + 1}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {shots > 0 && !gk
                        ? `${shots} skudd · ${shotPct?.toFixed(0)}% uttelling`
                        : "Kampstatistikk"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "font-display font-black text-2xl leading-none tabular-nums",
                        isLast ? "text-primary" : "text-foreground",
                      )}
                    >
                      {value}
                    </p>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
                      {label}
                    </p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isLast ? "bg-primary" : "bg-primary/45",
                    )}
                    style={{ width }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function InsightCards({
  player,
  stats,
}: {
  player: Player;
  stats: PlayerSeasonStats | null | undefined;
}) {
  if (!stats) return null;

  const matches = Math.max(Number(stats.matchesPlayed), 1);
  const primaryTotal = isGK(player.position)
    ? Number(stats.totalSaves ?? 0n)
    : Number(stats.totalGoals ?? 0n);
  const primaryPerMatch = primaryTotal / matches;
  const positionAverage = isGK(player.position) ? 7.8 : 3.5;
  const diff = primaryPerMatch - positionAverage;

  return (
    <section className="mx-4 space-y-2">
      <div className="rounded-2xl border border-chart-2/30 bg-chart-2/10 px-4 py-3 flex items-center gap-3">
        <div className="size-9 rounded-full bg-chart-2/15 flex items-center justify-center">
          <TrendingUp className="size-5 text-chart-2" />
        </div>
        <div>
          <p className="font-display font-black text-chart-2 text-sm">
            Over snittet for posisjonen
          </p>
          <p className="text-xs text-muted-foreground">
            {primaryPerMatch.toFixed(1)} mål/kamp · snitt {positionAverage.toFixed(1)} · +{diff.toFixed(1)}
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center gap-3">
        <div className="size-9 rounded-full bg-yellow-400/10 border border-yellow-400/35 flex items-center justify-center">
          <Target className="size-5 text-yellow-400" />
        </div>
        <div>
          <p className="font-display font-black text-foreground text-sm">
            Toppnivå i rollen
          </p>
          <p className="text-xs text-muted-foreground">
            Scorer høyt, skaper mye og holder {formatPct(stats.shootingPercent)} uttelling.
          </p>
        </div>
      </div>
    </section>
  );
}

function SeasonDetails({ stats }: { stats: PlayerSeasonStats }) {
  const rows = [
    ["Total mål", formatNumber(stats.totalGoals)],
    ["Skudd", formatNumber(stats.totalShots)],
    ["Uttelling", formatPct(stats.shootingPercent)],
    ["Mål/kamp", stats.goalsPerGame?.toFixed(2) ?? "-"],
    ["Assists", formatNumber(stats.totalAssists)],
    ["Assists/kamp", stats.assistsPerGame?.toFixed(2) ?? "-"],
    ["Tekniske feil", formatNumber(stats.technicalFaults)],
    ["2 min", formatNumber(stats.totalTwoMin)],
    ["Kamper", stats.matchesPlayed.toString()],
  ];

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/35">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
          Sesong {stats.season}
        </p>
      </div>
      <div className="px-4">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between py-3 border-b border-border/45 last:border-0"
          >
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="font-mono font-bold text-sm text-foreground tabular-nums">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchHistory({ stats }: { stats: PlayerMatchStats[] }) {
  const matches = [...stats].sort((a, b) => Number(b.matchId - a.matchId));

  if (matches.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Ingen kampstatistikk tilgjengelig
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-[1fr_56px_56px_56px] gap-2 px-4 py-2 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
        <span>Kamp</span>
        <span className="text-right">Mål</span>
        <span className="text-right">Skudd</span>
        <span className="text-right">Ass</span>
      </div>
      {matches.map((match, index) => (
        <div
          key={match.id.toString()}
          className="grid grid-cols-[1fr_56px_56px_56px] gap-2 px-4 py-3 border-b border-border/45 last:border-0 text-sm"
        >
          <span className="text-muted-foreground">
            {index === 0 ? "Siste kamp" : `Kamp ${index + 1}`}
          </span>
          <span className="text-right font-bold text-primary">
            {formatNumber(match.goals)}
          </span>
          <span className="text-right text-foreground">
            {formatNumber(match.shots)}
          </span>
          <span className="text-right text-foreground">
            {formatNumber(match.assists)}
          </span>
        </div>
      ))}
    </div>
  );
}

function Tabs({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
    { id: "season", label: "Sesong", icon: BarChart3 },
    { id: "matches", label: "Kamper", icon: CalendarDays },
    { id: "form", label: "Form", icon: TrendingUp },
  ];

  return (
    <div className="px-4">
      <div className="grid grid-cols-3 rounded-xl bg-card border border-border overflow-hidden">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "flex items-center justify-center gap-1.5 py-3 text-[11px] font-display font-bold uppercase tracking-wide transition-colors",
              active === id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PlayerPage() {
  const { id } = useParams({ from: "/player/$id" });
  const router = useRouter();
  const playerId = BigInt(id);
  const [activeTab, setActiveTab] = useState<Tab>("season");

  const { data: player, isLoading: playerLoading } = usePlayer(playerId);
  const { data: seasonStats, isLoading: seasonLoading } =
    usePlayerSeasonStats(playerId);
  const { data: matchStats = [], isLoading: matchLoading } =
    usePlayerMatchStats(playerId);
  const { data: team } = useTeam(player?.teamId ?? 0n);

  const isLoading = playerLoading || seasonLoading || matchLoading;

  if (isLoading && !player) {
    return (
      <div className="px-4 py-20 text-center text-muted-foreground">
        Laster spillerprofil...
      </div>
    );
  }

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
      <div className="px-4 pt-3 pb-1">
        <button
          type="button"
          onClick={() => router.history.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Tilbake
        </button>
      </div>

      <PlayerHero player={player} teamName={team?.name} teamId={player.teamId} />

      <div className="flex flex-col gap-5 pt-5">
        <KeyStats player={player} stats={seasonStats} />
        <InsightCards player={player} stats={seasonStats} />
        <FormOverview stats={matchStats} gk={gk} />

        {team?.name && (
          <Link
            to="/team/$id"
            params={{ id: player.teamId.toString() }}
            className="mx-4 flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-4 hover:border-primary/40 hover:bg-card/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Users className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Se hele lagstallen</p>
                <p className="font-display font-black text-foreground text-sm">
                  {team.name}
                </p>
              </div>
            </div>
            <ArrowRight className="size-5 text-muted-foreground" />
          </Link>
        )}

        <Tabs active={activeTab} onChange={setActiveTab} />

        <div className="px-4">
          {activeTab === "season" &&
            (seasonStats ? (
              <SeasonDetails stats={seasonStats} />
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Ingen sesongstatistikk tilgjengelig
              </div>
            ))}
          {activeTab === "matches" && <MatchHistory stats={matchStats} />}
          {activeTab === "form" && <FormOverview stats={matchStats} gk={gk} />}
        </div>
      </div>
    </div>
  );
}
