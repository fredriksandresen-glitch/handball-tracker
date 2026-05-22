import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, useParams, useRouter } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Award,
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
  useFollowPlayer,
  useIsFollowing,
  useUnfollowPlayer,
} from "../hooks/useFollowedPlayers";
import {
  usePlayer,
  usePlayerMatchStats,
  usePlayerSeasonStats,
} from "../hooks/usePlayer";
import { useTeam } from "../hooks/useTeam";
import type { EnrichedPlayerMatchStats } from "../services/clawdbotPlayerProfile";
import type {
  Player,
  PlayerMatchStats,
  PlayerSeasonStats,
} from "../types/handball";
import { Position } from "../types/handball";

type Tab = "season" | "matches" | "form";

const CLUB_LOGOS: Record<string, string> = {
  fjellhammer:
    "https://www.fjellhammer.no/wp-content/uploads/sites/19/2020/01/fjellhammer.svg",
};

function getClubLogo(teamName?: string) {
  const normalized = teamName?.toLowerCase() ?? "";
  return Object.entries(CLUB_LOGOS).find(([key]) => normalized.includes(key))?.[1];
}

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

function formatDecimal(value: number | undefined, digits = 1) {
  return value === undefined ? "-" : value.toFixed(digits);
}

function formatPct(value: number | undefined) {
  return value === undefined ? "-" : `${value.toFixed(1)}%`;
}

function formatSigned(value: number | undefined, digits = 1) {
  if (value === undefined) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function getMatchDate(match: EnrichedPlayerMatchStats) {
  return match.date ?? match.matchId.toString();
}

function TeamLogo({ teamName, size = "sm" }: { teamName?: string; size?: "sm" | "md" }) {
  const logoUrl = getClubLogo(teamName);
  const boxClass = size === "md" ? "size-10 rounded-xl" : "size-5 rounded-md";
  const imgClass = size === "md" ? "size-8" : "size-4";

  if (!logoUrl) {
    return <Shield className={size === "md" ? "size-5 text-primary" : "size-4"} />;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center bg-white border border-primary/25 shrink-0",
        boxClass,
      )}
    >
      <img src={logoUrl} alt="" className={cn("object-contain", imgClass)} />
    </span>
  );
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
        "rounded-xl border px-4 py-3 min-h-[82px] flex flex-col justify-center overflow-hidden",
        highlight
          ? "bg-primary/12 border-primary/45 shadow-[inset_0_0_0_1px_rgba(18,224,214,0.12)]"
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
  const { data: isFollowing = false, isLoading: checkingFollow } =
    useIsFollowing(player.id);
  const followMutation = useFollowPlayer();
  const unfollowMutation = useUnfollowPlayer();
  const isFollowLoading =
    checkingFollow || followMutation.isPending || unfollowMutation.isPending;

  const initials = player.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function handleFollowClick() {
    if (isFollowing) unfollowMutation.mutate(player.id);
    else followMutation.mutate(player.id);
  }

  return (
    <section className="bg-card border-b border-border px-4 py-5">
      <div className="flex items-start gap-4">
        {player.imageUrl ? (
          <img
            src={player.imageUrl}
            alt={player.name}
            className="size-28 rounded-2xl object-cover object-top border-2 border-primary/40 bg-muted"
          />
        ) : (
          <div className="size-28 rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-cyan-950 border-2 border-primary/40 flex items-center justify-center">
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
              className="inline-flex items-center gap-2 mt-3 text-sm font-display font-bold text-primary hover:text-primary/80 transition-colors"
            >
              <TeamLogo teamName={teamName} />
              {teamName}
              <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <Button
          type="button"
          onClick={handleFollowClick}
          disabled={isFollowLoading}
          variant={isFollowing ? "outline" : "default"}
          className={cn(
            "flex-1 h-12 rounded-full font-display font-black tracking-widest",
            isFollowing
              ? "border-primary/40 text-primary hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {isFollowing ? "✓ FØLGER" : "+ FØLG SPILLER"}
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
          label="Snitt MEP"
          value={formatDecimal(stats.mepAvg)}
          detail={`${matches} kamper`}
          highlight
        />
        <StatCard
          label="Total MEP"
          value={formatDecimal(stats.mepTotal)}
          detail="sesongscore"
        />
        <StatCard
          label={primaryLabel}
          value={formatNumber(primaryValue)}
          detail={perMatch === undefined ? undefined : `${perMatch.toFixed(2)} per kamp`}
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
      </div>
    </section>
  );
}

function FormOverview({ stats }: { stats: PlayerMatchStats[] }) {
  const recent = useMemo(() => {
    return (stats as EnrichedPlayerMatchStats[])
      .filter((match) => typeof match.mep === "number")
      .sort((a, b) => getMatchDate(a).localeCompare(getMatchDate(b)))
      .slice(-5);
  }, [stats]);

  const values = recent.map((match) => match.mep ?? 0);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = Math.max(max - min, 1);
  const avg = values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
  const last = values.at(-1);
  const best = values.length ? Math.max(...values) : undefined;

  if (recent.length === 0) return null;

  return (
    <section className="mx-4 space-y-3" data-ocid="form-overview">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
            MEP siste {recent.length} kamper
          </p>
          <h2 className="font-display font-black text-lg text-foreground">
            Formkurve basert på prestasjonsscore
          </h2>
        </div>
        <Activity className="size-5 text-primary" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-primary/12 border border-primary/35 px-3 py-2">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
              Siste
            </p>
            <p className="font-display font-black text-2xl text-primary leading-none tabular-nums">
              {formatDecimal(last)}
            </p>
          </div>
          <div className="rounded-xl bg-muted/35 border border-border px-3 py-2">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
              Snitt
            </p>
            <p className="font-display font-black text-2xl text-foreground leading-none tabular-nums">
              {avg.toFixed(1)}
            </p>
          </div>
          <div className="rounded-xl bg-muted/35 border border-border px-3 py-2">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
              Beste
            </p>
            <p className="font-display font-black text-2xl text-foreground leading-none tabular-nums">
              {formatDecimal(best)}
            </p>
          </div>
        </div>

        <div className="h-28 rounded-xl bg-background/45 border border-border/60 px-3 pt-3 pb-2 flex items-end gap-2">
          {recent.map((match) => {
            const value = match.mep ?? 0;
            const height = 18 + ((value - min) / range) * 70;
            const isLast = match === recent.at(-1);
            return (
              <div key={match.id.toString()} className="flex-1 h-full flex flex-col justify-end gap-1 min-w-0">
                <div className="flex-1 flex items-end justify-center">
                  <div
                    className={cn(
                      "w-full max-w-12 rounded-t-lg transition-all duration-500",
                      value < 0
                        ? "bg-destructive/70"
                        : isLast
                          ? "bg-primary"
                          : "bg-primary/45",
                    )}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <p
                  className={cn(
                    "text-center text-[11px] font-mono font-bold tabular-nums truncate",
                    isLast ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {formatDecimal(value)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          {recent.map((match) => {
            const value = match.mep ?? 0;
            const isLast = match === recent.at(-1);
            return (
              <div
                key={`${match.id.toString()}-row`}
                className={cn(
                  "rounded-xl border px-3 py-2 flex items-center justify-between gap-3",
                  isLast
                    ? "border-primary/45 bg-primary/8"
                    : "border-border bg-background/35",
                )}
              >
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm text-foreground truncate">
                    {match.opponent ? `mot ${match.opponent}` : "Kamp"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {match.date ?? "Siste kamp"} · {formatNumber(match.goals)} mål · {formatNumber(match.assists)} assist
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={cn(
                      "font-display font-black text-2xl leading-none tabular-nums",
                      value < 0
                        ? "text-destructive"
                        : isLast
                          ? "text-primary"
                          : "text-foreground",
                    )}
                  >
                    {formatSigned(value)}
                  </p>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
                    MEP
                  </p>
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
  const totalGoals = asNumber(stats.totalGoals) ?? 0;
  const totalAssists = asNumber(stats.totalAssists) ?? 0;
  const directContributions = totalGoals + totalAssists;
  const contributionPerMatch = directContributions / matches;
  const technicalFaults = asNumber(stats.technicalFaults) ?? 0;
  const assistFaultBalance = totalAssists - technicalFaults;
  const primaryLabel = isGK(player.position) ? "Keeperprofil" : "Angrepsbidrag";

  return (
    <section className="mx-4 grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-4 flex items-center gap-3">
        <div className="size-11 rounded-xl bg-primary/15 flex items-center justify-center">
          <Award className="size-5 text-primary" />
        </div>
        <div>
          <p className="font-display font-black text-primary text-sm">
            {primaryLabel}: {formatDecimal(stats.mepAvg)} i snitt MEP
          </p>
          <p className="text-xs text-muted-foreground">
            Total MEP {formatDecimal(stats.mepTotal)} gjennom {matches} kamper.
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card px-4 py-4 flex items-center gap-3">
        <div className="size-11 rounded-xl bg-chart-2/10 border border-chart-2/25 flex items-center justify-center">
          <Target className="size-5 text-chart-2" />
        </div>
        <div>
          <p className="font-display font-black text-foreground text-sm">
            {directContributions} målpoeng · {contributionPerMatch.toFixed(1)} per kamp
          </p>
          <p className="text-xs text-muted-foreground">
            Assist/teknisk-feil balanse: {formatSigned(assistFaultBalance, 0)} · uttelling {formatPct(stats.shootingPercent)}
          </p>
        </div>
      </div>
    </section>
  );
}

function SeasonDetails({ stats }: { stats: PlayerSeasonStats }) {
  const rows = [
    ["Snitt MEP", formatDecimal(stats.mepAvg)],
    ["Total MEP", formatDecimal(stats.mepTotal)],
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
      <div className="px-4 py-3 border-b border-border bg-muted/35 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
          Sesong {stats.season}
        </p>
        <span className="text-[10px] uppercase tracking-widest text-primary font-display font-bold">
          MEP først
        </span>
      </div>
      <div className="px-4">
        {rows.map(([label, value], index) => (
          <div
            key={label}
            className="flex items-center justify-between py-3 border-b border-border/45 last:border-0"
          >
            <span className="text-sm text-muted-foreground">{label}</span>
            <span
              className={cn(
                "font-mono font-bold text-sm tabular-nums",
                index < 2 ? "text-primary" : "text-foreground",
              )}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchHistory({ stats }: { stats: PlayerMatchStats[] }) {
  const matches = [...(stats as EnrichedPlayerMatchStats[])].sort((a, b) =>
    getMatchDate(b).localeCompare(getMatchDate(a)),
  );

  if (matches.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Ingen kampstatistikk tilgjengelig
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-[1fr_52px_52px_52px] gap-2 px-4 py-2 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
        <span>Kamp</span>
        <span className="text-right">MEP</span>
        <span className="text-right">Mål</span>
        <span className="text-right">Ass</span>
      </div>
      {matches.map((match) => (
        <div
          key={match.id.toString()}
          className="grid grid-cols-[1fr_52px_52px_52px] gap-2 px-4 py-3 border-b border-border/45 last:border-0 text-sm"
        >
          <span className="min-w-0">
            <span className="block font-display font-bold text-foreground truncate">
              {match.opponent ? `mot ${match.opponent}` : "Kamp"}
            </span>
            <span className="block text-xs text-muted-foreground truncate">
              {match.date ?? `Kamp ${match.matchId.toString()}`}
            </span>
          </span>
          <span className="text-right font-bold text-primary tabular-nums">
            {formatDecimal(match.mep)}
          </span>
          <span className="text-right text-foreground tabular-nums">
            {formatNumber(match.goals)}
          </span>
          <span className="text-right text-foreground tabular-nums">
            {formatNumber(match.assists)}
          </span>
        </div>
      ))}
    </div>
  );
}

function Tabs({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const tabs = [
    { id: "season" as const, label: "Sesong", icon: BarChart3 },
    { id: "matches" as const, label: "Kamper", icon: CalendarDays },
    { id: "form" as const, label: "Form", icon: TrendingUp },
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
        <FormOverview stats={matchStats} />

        {team?.name && (
          <Link
            to="/team/$id"
            params={{ id: player.teamId.toString() }}
            className="mx-4 flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-4 hover:border-primary/40 hover:bg-card/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              <TeamLogo teamName={team.name} size="md" />
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
          {activeTab === "form" && <FormOverview stats={matchStats} />}
        </div>
      </div>
    </div>
  );
}
