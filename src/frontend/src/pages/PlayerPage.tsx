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
  ChevronDown,
  Search,
  Shield,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { MatchCard } from "../components/MatchCard";
import { PositionBadge } from "../components/PositionBadge";
import { useSelectedLeague } from "../components/LeagueSelect";
import { SeasonSelect, useSelectedSeason } from "../components/SeasonSelect";
import { getNationalTeamInfo } from "../data/nationalTeamPlayers";
import {
  getLeagueLabel,
  getSeason,
  type LeagueId,
  type SeasonId,
} from "../data/seasons";
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
import { resolveImageUrl } from "../utils/playerImages";
import { getTeamLogoClassName } from "../utils/teamLogoStyles";
import { useNextMatchForTeam, useTeam } from "../hooks/useTeam";
import {
  getStaticPlayerLeagueId,
  getStaticPlayers,
  getStaticProfile,
  mapClawdbotSeasonStats,
  type EnrichedPlayerMatchStats,
} from "../services/clawdbotPlayerProfile";
import type {
  Player,
  PlayerMatchStats,
  PlayerSeasonStats,
} from "../types/handball";
import { Position } from "../types/handball";

type Tab = "season" | "matches" | "form";

const CLUB_LOGOS: Record<string, string> = {
  aker: "https://akerth.no/wp-content/uploads/sites/3/2021/11/aker.svg",
  kjelsås:
    "https://kjelsaas.topphandball.no/wp-content/uploads/sites/82/2025/05/Kjelsaas-favicon.png",
  volda:
    "https://voldahandball.no/wp-content/uploads/sites/14/2022/05/Volda.svg",
  levanger:
    "https://lhk.baksystem.no/assets/d4b73961-b69e-4061-bfc6-637b5e2b61d0?width=300&height=300&quality=100",
  åsane:
    "https://aasane.admin.topphandball.no/wp-content/uploads/sites/59/2024/08/aasane-e1737718047504.png",
  trondheim:
    "https://trondheim.admin.topphandball.no/wp-content/uploads/sites/73/2024/08/trondheim-e1737719517913.png",
  gjøvik:
    "https://gjovik.admin.topphandball.no/wp-content/uploads/sites/80/2025/05/Gjovik.png",
  ravens:
    "https://www.ravens.no/wp-content/uploads/sites/9/2022/10/ravens-1.svg",
  stavanger:
    "https://stavanger.topphandball.no/wp-content/uploads/sites/81/2025/05/Stavanger.png",
  bækkelaget:
    "https://www.bskhe.no/wp-content/uploads/sites/16/2019/07/BSK.svg",
  fyllingen:
    "https://fyllingenhandball.no/wp-content/uploads/2026/02/cropped-Fyllingen-logo-ny-scaled-1.png",
  haslum:
    "https://haslum.topphandball.no/wp-content/uploads/sites/30/2021/07/haslum.svg",
  byåsen: "https://byaasen.no/wp-content/uploads/sites/4/2022/10/byaasen.svg",
  fjellhammer:
    "https://www.fjellhammer.no/wp-content/uploads/sites/19/2020/01/fjellhammer.svg",
  larvik: "https://www.larvikhk.no/wp-content/uploads/sites/7/2019/08/larvikhk.svg",
  molde:
    "https://www.handballjentan.no/wp-content/uploads/sites/8/2021/07/MOLDE-ELITE-LOGO.svg",
  utleira:
    "https://utleira.topphandball.no/wp-content/uploads/sites/66/2024/08/utleira-logo.png",
  flint:
    "https://flinthandball.admin.topphandball.no/wp-content/uploads/sites/33/2022/10/flint_fav.png",
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

function getStaticTeamName(playerId: bigint) {
  return getStaticProfile(playerId)?.player.team ?? "Ukjent lag";
}

function hasUsefulStats(stats: PlayerSeasonStats) {
  return Number(stats.matchesPlayed) > 0 || (stats.mepAvg ?? 0) !== 0;
}

function compareDelta(
  base: number | undefined,
  other: number | undefined,
  higherIsBetter = true,
) {
  if (base === undefined || other === undefined) return null;
  const delta = other - base;
  const good = higherIsBetter ? delta > 0 : delta < 0;
  const bad = higherIsBetter ? delta < 0 : delta > 0;
  return { delta, good, bad };
}

function TeamLogo({ teamName, size = "sm" }: { teamName?: string; size?: "sm" | "md" }) {
  const logoUrl = getClubLogo(teamName);
  const boxClass = size === "md" ? "size-10" : "size-5";
  const imgClass = size === "md" ? "size-10" : "size-5";

  if (!logoUrl) {
    return <Shield className={size === "md" ? "size-5 text-primary" : "size-4"} />;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center shrink-0",
        boxClass,
      )}
    >
      <img src={logoUrl} alt="" className={cn("object-contain", imgClass, getTeamLogoClassName(teamName))} />
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
  season,
  league,
}: {
  player: Player;
  teamName?: string;
  teamId: bigint;
  season: SeasonId;
  league: LeagueId;
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
  const nationalTeam = getNationalTeamInfo(player.id);

  function handleFollowClick() {
    if (isFollowing) unfollowMutation.mutate(player.id);
    else followMutation.mutate(player.id);
  }

  return (
    <section className="bg-card border-b border-border px-4 py-5">
      <div className="flex items-start gap-4">
        {resolveImageUrl(player.imageUrl) ? (
          <img
            src={resolveImageUrl(player.imageUrl)}
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
          <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground leading-tight break-words">
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
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {nationalTeam?.logoUrl && (
                  <a
                    href={nationalTeam.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex size-9 items-center justify-center p-0"
                    title={nationalTeam.teamLabel}
                  >
                    <img
                      src={nationalTeam.logoUrl}
                      alt={nationalTeam.teamLabel}
                      className="max-h-full max-w-full object-contain"
                    />
                  </a>
                )}

                <Link
                  to="/team/$id"
                  params={{ id: teamId.toString() }}
                  search={{ season, league }}
                  className="inline-flex items-center gap-2 text-sm font-display font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  <TeamLogo teamName={teamName} />
                  {teamName}
                  <ArrowRight className="size-4" />
                </Link>
              </div>

              {nationalTeam && (
                <p className="text-[11px] font-display font-bold uppercase tracking-widest text-muted-foreground">
                  Landslagsspiller
                </p>
              )}
            </div>
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
          <Link
            to="/team/$id"
            params={{ id: teamId.toString() }}
            search={{ season, league }}
          >
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

  const keeper = isGK(player.position);
  const matches = Math.max(Number(stats.matchesPlayed), 1);
  const totalGoals = asNumber(stats.totalGoals);
  const totalSaves = asNumber(stats.totalSaves);
  const shotsAgainst = asNumber(stats.totalShots);
  const savesPerMatch = totalSaves === undefined ? undefined : totalSaves / matches;
  const goalsPerMatch = totalGoals === undefined ? undefined : totalGoals / matches;

  if (keeper) {
    return (
      <section className="px-4" data-ocid="key-stats">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Snitt MEP" value={formatDecimal(stats.mepAvg)} detail={matches + " kamper"} highlight />
          <StatCard label="Rednings%" value={formatPct(stats.shootingPercent)} detail="sesongsnitt" />
          <StatCard label="Redninger" value={formatNumber(totalSaves)} detail={savesPerMatch === undefined ? undefined : savesPerMatch.toFixed(1) + " per kamp"} />
          <StatCard label="Skudd mot" value={formatNumber(shotsAgainst)} detail="totalt" />
        </div>
      </section>
    );
  }

  return (
    <section className="px-4" data-ocid="key-stats">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Snitt MEP" value={formatDecimal(stats.mepAvg)} detail={matches + " kamper"} highlight />
        <StatCard label="Total MEP" value={formatDecimal(stats.mepTotal)} detail="sesongscore" />
        <StatCard label="Mål" value={formatNumber(totalGoals)} detail={goalsPerMatch === undefined ? undefined : goalsPerMatch.toFixed(2) + " per kamp"} />
        <StatCard
          label="Assists"
          value={formatNumber(stats.totalAssists)}
          detail={stats.assistsPerGame === undefined ? undefined : stats.assistsPerGame.toFixed(1) + " per kamp"}
        />
      </div>
    </section>
  );
}

function FormOverview({
  player,
  stats,
}: {
  player: Player;
  stats: PlayerMatchStats[];
}) {
  const keeper = isGK(player.position);
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
  const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const last = values.at(-1);
  const best = values.length ? Math.max(...values) : undefined;

  if (recent.length === 0) return null;

  return (
    <section className="mx-4 space-y-3" data-ocid="form-overview">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">MEP siste {recent.length} kamper</p>
          <h2 className="font-display font-black text-lg text-foreground">Formkurve basert på prestasjonsscore</h2>
        </div>
        <Activity className="size-5 text-primary" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-primary/12 border border-primary/35 px-3 py-2"><p className="text-[9px] uppercase tracking-widest text-muted-foreground">Siste</p><p className="font-display font-black text-2xl text-primary leading-none tabular-nums">{formatDecimal(last)}</p></div>
          <div className="rounded-xl bg-muted/35 border border-border px-3 py-2"><p className="text-[9px] uppercase tracking-widest text-muted-foreground">Snitt</p><p className="font-display font-black text-2xl text-foreground leading-none tabular-nums">{avg.toFixed(1)}</p></div>
          <div className="rounded-xl bg-muted/35 border border-border px-3 py-2"><p className="text-[9px] uppercase tracking-widest text-muted-foreground">Beste</p><p className="font-display font-black text-2xl text-foreground leading-none tabular-nums">{formatDecimal(best)}</p></div>
        </div>

        <div className="h-28 rounded-xl bg-background/45 border border-border/60 px-3 pt-3 pb-2 flex items-end gap-2">
          {recent.map((match) => {
            const value = match.mep ?? 0;
            const height = 18 + ((value - min) / range) * 70;
            const isLast = match === recent.at(-1);
            return (
              <div key={match.id.toString()} className="flex-1 h-full flex flex-col justify-end gap-1 min-w-0">
                <div className="flex-1 flex items-end justify-center">
                  <div className={cn("w-full max-w-12 rounded-t-lg transition-all duration-500", value < 0 ? "bg-destructive/70" : isLast ? "bg-primary" : "bg-primary/45")} style={{ height: height + "%" }} />
                </div>
                <p className={cn("text-center text-[11px] font-mono font-bold tabular-nums truncate", isLast ? "text-primary" : "text-muted-foreground")}>{formatDecimal(value)}</p>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          {recent.map((match) => {
            const value = match.mep ?? 0;
            const isLast = match === recent.at(-1);
            const keeperLine = (match.date ?? "Siste kamp") + " · " + formatNumber(match.saves) + " redninger · " + formatPct(match.savePct);
            const playerLine = (match.date ?? "Siste kamp") + " · " + formatNumber(match.goals) + " mål · " + formatNumber(match.assists) + " assist";
            return (
              <div key={match.id.toString() + "-row"} className={cn("rounded-xl border px-3 py-2 flex items-center justify-between gap-3", isLast ? "border-primary/45 bg-primary/8" : "border-border bg-background/35")}>
                <div className="min-w-0"><p className="font-display font-bold text-sm text-foreground truncate">{match.opponent ? "mot " + match.opponent : "Kamp"}</p><p className="text-xs text-muted-foreground">{keeper ? keeperLine : playerLine}</p></div>
                <div className="text-right shrink-0"><p className={cn("font-display font-black text-2xl leading-none tabular-nums", value < 0 ? "text-destructive" : isLast ? "text-primary" : "text-foreground")}>{formatSigned(value)}</p><p className="text-[9px] uppercase tracking-widest text-muted-foreground">MEP</p></div>
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

  const keeper = isGK(player.position);
  const matches = Math.max(Number(stats.matchesPlayed), 1);
  const totalGoals = asNumber(stats.totalGoals) ?? 0;
  const totalAssists = asNumber(stats.totalAssists) ?? 0;
  const totalSaves = asNumber(stats.totalSaves) ?? 0;
  const shotsAgainst = asNumber(stats.totalShots) ?? 0;
  const goalsAgainst = Math.max(shotsAgainst - totalSaves, 0);
  const savesPerMatch = totalSaves / matches;
  const directContributions = totalGoals + totalAssists;
  const contributionPerMatch = directContributions / matches;
  const technicalFaults = asNumber(stats.technicalFaults) ?? 0;
  const assistFaultBalance = totalAssists - technicalFaults;

  if (keeper) {
    return (
      <section className="mx-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-4 flex items-center gap-3"><div className="size-11 rounded-xl bg-primary/15 flex items-center justify-center"><Award className="size-5 text-primary" /></div><div><p className="font-display font-black text-primary text-sm">Keeperprofil: {formatPct(stats.shootingPercent)} redningsprosent</p><p className="text-xs text-muted-foreground">{totalSaves} redninger · {savesPerMatch.toFixed(1)} per kamp</p></div></div>
        <div className="rounded-2xl border border-border bg-card px-4 py-4 flex items-center gap-3"><div className="size-11 rounded-xl bg-chart-2/10 border border-chart-2/25 flex items-center justify-center"><Target className="size-5 text-chart-2" /></div><div><p className="font-display font-black text-foreground text-sm">{shotsAgainst} skudd mot · {goalsAgainst} mål imot</p><p className="text-xs text-muted-foreground">Snitt MEP {formatDecimal(stats.mepAvg)} · total MEP {formatDecimal(stats.mepTotal)}</p></div></div>
      </section>
    );
  }

  return (
    <section className="mx-4 grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-4 flex items-center gap-3"><div className="size-11 rounded-xl bg-primary/15 flex items-center justify-center"><Award className="size-5 text-primary" /></div><div><p className="font-display font-black text-primary text-sm">Angrepsbidrag: {formatDecimal(stats.mepAvg)} i snitt MEP</p><p className="text-xs text-muted-foreground">Total MEP {formatDecimal(stats.mepTotal)} gjennom {matches} kamper.</p></div></div>
      <div className="rounded-2xl border border-border bg-card px-4 py-4 flex items-center gap-3"><div className="size-11 rounded-xl bg-chart-2/10 border border-chart-2/25 flex items-center justify-center"><Target className="size-5 text-chart-2" /></div><div><p className="font-display font-black text-foreground text-sm">{directContributions} målpoeng · {contributionPerMatch.toFixed(1)} per kamp</p><p className="text-xs text-muted-foreground">Assist/teknisk-feil balanse: {formatSigned(assistFaultBalance, 0)} · uttelling {formatPct(stats.shootingPercent)}</p></div></div>
    </section>
  );
}

function SeasonDetails({
  player,
  stats,
}: {
  player: Player;
  stats: PlayerSeasonStats;
}) {
  const keeper = isGK(player.position);
  const matches = Math.max(Number(stats.matchesPlayed), 1);
  const totalSaves = asNumber(stats.totalSaves);
  const shotsAgainst = asNumber(stats.totalShots);
  const goalsAgainst = totalSaves === undefined || shotsAgainst === undefined ? undefined : Math.max(shotsAgainst - totalSaves, 0);
  const keeperRows = [["Snitt MEP", formatDecimal(stats.mepAvg)], ["Total MEP", formatDecimal(stats.mepTotal)], ["Redninger", formatNumber(totalSaves)], ["Redningsprosent", formatPct(stats.shootingPercent)], ["Skudd mot", formatNumber(shotsAgainst)], ["Mål imot", formatNumber(goalsAgainst)], ["Redninger/kamp", totalSaves === undefined ? "-" : (totalSaves / matches).toFixed(2)], ["Assists", formatNumber(stats.totalAssists)], ["Tekniske feil", formatNumber(stats.technicalFaults)], ["2 min", formatNumber(stats.totalTwoMin)], ["Kamper", stats.matchesPlayed.toString()]];
  const playerRows = [["Snitt MEP", formatDecimal(stats.mepAvg)], ["Total MEP", formatDecimal(stats.mepTotal)], ["Total mål", formatNumber(stats.totalGoals)], ["Skudd", formatNumber(stats.totalShots)], ["Uttelling", formatPct(stats.shootingPercent)], ["Mål/kamp", stats.goalsPerGame?.toFixed(2) ?? "-"], ["Assists", formatNumber(stats.totalAssists)], ["Assists/kamp", stats.assistsPerGame?.toFixed(2) ?? "-"], ["Tekniske feil", formatNumber(stats.technicalFaults)], ["2 min", formatNumber(stats.totalTwoMin)], ["Kamper", stats.matchesPlayed.toString()]];
  const rows = keeper ? keeperRows : playerRows;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/35 flex items-center justify-between"><p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">Sesong {stats.season}</p><span className="text-[10px] uppercase tracking-widest text-primary font-display font-bold">{keeper ? "Keeperdata" : "MEP først"}</span></div>
      <div className="px-4">{rows.map(([label, value], index) => (<div key={label} className="flex items-center justify-between py-3 border-b border-border/45 last:border-0"><span className="text-sm text-muted-foreground">{label}</span><span className={cn("font-mono font-bold text-sm tabular-nums", index < 2 ? "text-primary" : "text-foreground")}>{value}</span></div>))}</div>
    </div>
  );
}

function MatchHistory({
  player,
  stats,
}: {
  player: Player;
  stats: PlayerMatchStats[];
}) {
  const keeper = isGK(player.position);
  const [openMatchId, setOpenMatchId] = useState<string | null>(null);
  const matches = [...(stats as EnrichedPlayerMatchStats[])].sort((a, b) => getMatchDate(b).localeCompare(getMatchDate(a)));

  if (matches.length === 0) return <div className="py-12 text-center text-sm text-muted-foreground">Ingen kampstatistikk tilgjengelig</div>;

  const getDetailRows = (match: EnrichedPlayerMatchStats) => [
    ["Spillermål", formatNumber(match.fieldGoals ?? match.goals)],
    ["Spillerskudd", formatNumber(match.fieldShots ?? match.shots)],
    ["Uttelling", formatPct(match.fieldShotPercentage ?? match.shotPct)],
    ["Mål 7m", formatNumber(match.sevenMeterGoals)],
    ["Skudd 7m", formatNumber(match.sevenMeterShots)],
    ["Uttelling 7m", formatPct(match.sevenMeterShotPercentage)],
    ["Assist", formatNumber(match.assists)],
    ["Teknisk feil", formatNumber(match.turnovers)],
    ["Forårsaket 7m", formatNumber(match.causedSevenMeters)],
    ["Tildelt 7m", formatNumber(match.awardedSevenMeters)],
    ["Advarsel", formatNumber(match.warnings)],
    ["2 min utvisning", formatNumber(match.twoMinSuspensions)],
    ["Rødt kort", formatNumber(match.redCards)],
    ["Spillertid", match.playTime || "-"],
    ["Total MEP", formatDecimal(match.mep)],
  ];

  const getKeeperRows = (match: EnrichedPlayerMatchStats) => [
    ["Redninger", formatNumber(match.saves)],
    ["Redningsprosent", formatPct(match.savePct)],
    ["Skudd mot", formatNumber(match.shotsAgainst ?? match.shots)],
    ["Baklengsmål", formatNumber(match.goalsConceded)],
    ...getDetailRows(match),
  ];

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-[1fr_52px_52px_52px_24px] gap-2 px-4 py-2 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold"><span>Kamp</span><span className="text-right">MEP</span><span className="text-right">{keeper ? "Red" : "Mål"}</span><span className="text-right">{keeper ? "Red%" : "Ass"}</span><span /></div>
      {matches.map((match) => {
        const id = match.id.toString();
        const isOpen = openMatchId === id;
        const rows = keeper ? getKeeperRows(match) : getDetailRows(match);

        return (
          <div key={id} className="border-b border-border/45 last:border-0">
            <button
              type="button"
              onClick={() => setOpenMatchId(isOpen ? null : id)}
              className="grid w-full grid-cols-[1fr_52px_52px_52px_24px] gap-2 px-4 py-3 text-sm text-left hover:bg-muted/25 transition-colors"
            >
              <span className="min-w-0">
                <span className="block font-display font-bold text-foreground truncate">{match.opponent ? "mot " + match.opponent : "Kamp"}</span>
                <span className="block text-xs text-muted-foreground truncate">{match.date ?? "Kamp " + match.matchId.toString()}</span>
              </span>
              <span className="text-right font-bold text-primary tabular-nums">{formatDecimal(match.mep)}</span>
              <span className="text-right text-foreground tabular-nums">{keeper ? formatNumber(match.saves) : formatNumber(match.goals)}</span>
              <span className="text-right text-foreground tabular-nums">{keeper ? formatPct(match.savePct) : formatNumber(match.assists)}</span>
              <ChevronDown className={cn("mt-0.5 size-4 text-muted-foreground transition-transform", isOpen && "rotate-180 text-primary")} />
            </button>

            {isOpen && (
              <div className="px-4 pb-4">
                <div className="rounded-xl border border-border/70 bg-background/45 overflow-hidden">
                  <div className="grid grid-cols-3 gap-px bg-border/45">
                    {rows.map(([label, value]) => (
                      <div key={label} className="min-w-0 bg-card px-3 py-2.5">
                        <p className="truncate text-[9px] uppercase tracking-widest text-muted-foreground font-display font-bold">{label}</p>
                        <p className={cn("mt-1 truncate font-mono text-sm font-bold tabular-nums", label === "Total MEP" ? "text-primary" : "text-foreground")}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PlayerComparison({
  player,
  seasonStats,
}: {
  player: Player;
  seasonStats: PlayerSeasonStats | null | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return getStaticPlayers()
      .filter((candidate) => candidate.id !== player.id)
      .map((candidate) => {
        const profile = getStaticProfile(candidate.id);
        if (!profile) return null;
        const stats = mapClawdbotSeasonStats(profile);
        const teamName = profile.player.team ?? getStaticTeamName(candidate.id);
        const samePosition = candidate.position === player.position;
        const otherClub = candidate.teamId !== player.teamId;
        const searchable = [candidate.name, teamName, profile.player.position ?? ""]
          .join(" ")
          .toLowerCase();
        const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
        const score =
          (samePosition ? 1000 : 0) +
          (otherClub ? 100 : 0) +
          (stats.mepAvg ?? 0) +
          Number(stats.matchesPlayed) / 100;

        return {
          player: candidate,
          stats,
          teamName,
          samePosition,
          otherClub,
          matchesQuery,
          score,
        };
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> =>
        Boolean(candidate && candidate.matchesQuery && hasUsefulStats(candidate.stats)),
      )
      .sort((a, b) => {
        if (a.samePosition !== b.samePosition) return a.samePosition ? -1 : 1;
        if (a.otherClub !== b.otherClub) return a.otherClub ? -1 : 1;
        return b.score - a.score;
      })
      .slice(0, normalizedQuery ? 8 : 5);
  }, [player.id, player.position, player.teamId, query]);

  const selected = selectedId
    ? candidates.find((candidate) => candidate.player.id.toString() === selectedId) ??
      null
    : null;

  if (!seasonStats) return null;

  const keeper = isGK(player.position);
  const currentTeam = getStaticTeamName(player.id);
  const rows =
    selected === null
      ? []
      : keeper
        ? [
            {
              label: "Snitt MEP",
              base: seasonStats.mepAvg,
              other: selected.stats.mepAvg,
              format: (value: number | undefined) => formatDecimal(value),
            },
            {
              label: "Kamper",
              base: Number(seasonStats.matchesPlayed),
              other: Number(selected.stats.matchesPlayed),
              format: (value: number | undefined) => formatNumber(value),
            },
            {
              label: "Rednings%",
              base: seasonStats.shootingPercent,
              other: selected.stats.shootingPercent,
              format: (value: number | undefined) => formatPct(value),
            },
            {
              label: "Redninger",
              base: asNumber(seasonStats.totalSaves),
              other: asNumber(selected.stats.totalSaves),
              format: (value: number | undefined) => formatNumber(value),
            },
            {
              label: "Skudd mot",
              base: asNumber(seasonStats.totalShots),
              other: asNumber(selected.stats.totalShots),
              format: (value: number | undefined) => formatNumber(value),
            },
            {
              label: "Tekn. feil",
              base: asNumber(seasonStats.technicalFaults),
              other: asNumber(selected.stats.technicalFaults),
              format: (value: number | undefined) => formatNumber(value),
              higherIsBetter: false,
            },
          ]
        : [
            {
              label: "Snitt MEP",
              base: seasonStats.mepAvg,
              other: selected.stats.mepAvg,
              format: (value: number | undefined) => formatDecimal(value),
            },
            {
              label: "Kamper",
              base: Number(seasonStats.matchesPlayed),
              other: Number(selected.stats.matchesPlayed),
              format: (value: number | undefined) => formatNumber(value),
            },
            {
              label: "Mål",
              base: asNumber(seasonStats.totalGoals),
              other: asNumber(selected.stats.totalGoals),
              format: (value: number | undefined) => formatNumber(value),
            },
            {
              label: "Mål/kamp",
              base: seasonStats.goalsPerGame,
              other: selected.stats.goalsPerGame,
              format: (value: number | undefined) => formatDecimal(value, 2),
            },
            {
              label: "Assists",
              base: asNumber(seasonStats.totalAssists),
              other: asNumber(selected.stats.totalAssists),
              format: (value: number | undefined) => formatNumber(value),
            },
            {
              label: "Tekn. feil",
              base: asNumber(seasonStats.technicalFaults),
              other: asNumber(selected.stats.technicalFaults),
              format: (value: number | undefined) => formatNumber(value),
              higherIsBetter: false,
            },
          ];

  if (!isOpen) {
    return (
      <section className="mx-4" data-ocid="player-comparison-collapsed">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full rounded-2xl border border-border bg-card px-4 py-4 flex items-center justify-between gap-4 hover:border-primary/45 hover:bg-card/80 transition-colors text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="size-10 rounded-xl bg-primary/12 border border-primary/30 flex items-center justify-center shrink-0">
              <Users className="size-5 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="font-display font-black text-sm text-foreground">
                Sammenlign spiller
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Søk eller velg forslag i samme posisjon
              </p>
            </div>
          </div>
          <ArrowRight className="size-5 text-muted-foreground shrink-0" />
        </button>
      </section>
    );
  }

  return (
    <section className="mx-4 space-y-3" data-ocid="player-comparison">
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
                Sammenlign
              </p>
              <h2 className="font-display font-black text-lg text-foreground">
                Finn spiller å måle mot
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setQuery("");
                setSelectedId(null);
              }}
              className="size-9 rounded-full border border-border bg-background/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              aria-label="Lukk sammenligning"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedId(null);
              }}
              placeholder="Søk spiller, lag eller posisjon"
              className="w-full h-11 rounded-xl bg-background border border-border pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60"
            />
          </div>

          {candidates.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {candidates.map((candidate) => {
                const active = candidate.player.id.toString() === selectedId;
                return (
                  <button
                    key={candidate.player.id.toString()}
                    type="button"
                    onClick={() => setSelectedId(candidate.player.id.toString())}
                    className={cn(
                      "min-w-[178px] rounded-xl border p-2 text-left transition-colors",
                      active
                        ? "border-primary/60 bg-primary/12"
                        : "border-border bg-background/40 hover:border-primary/35",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {resolveImageUrl(candidate.player.imageUrl) ? (
                        <img
                          src={resolveImageUrl(candidate.player.imageUrl)}
                          alt=""
                          className="size-10 rounded-lg object-cover object-top bg-muted shrink-0"
                        />
                      ) : (
                        <div className="size-10 rounded-lg bg-muted shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-display font-black text-foreground truncate">
                          {candidate.player.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {candidate.teamName} · MEP {formatDecimal(candidate.stats.mepAvg)}
                        </p>
                        <p className="text-[9px] uppercase tracking-wider text-primary font-display font-bold truncate">
                          {candidate.samePosition ? "Samme posisjon" : "Annen posisjon"}
                          {candidate.otherClub ? " · annet lag" : ""}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-background/35 px-3 py-4 text-center text-sm text-muted-foreground">
              Ingen spillere funnet. Prøv et annet navn eller lag.
            </div>
          )}
        </div>

        {selected ? (
          <>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 p-4 border-b border-border bg-background/25">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
                  Denne spilleren
                </p>
                <p className="font-display font-black text-sm text-foreground truncate">
                  {player.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">{currentTeam}</p>
              </div>
              <div className="self-center rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-display font-bold text-primary">
                VS
              </div>
              <div className="min-w-0 text-right">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
                  Valgt spiller
                </p>
                <p className="font-display font-black text-sm text-foreground truncate">
                  {selected.player.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">{selected.teamName}</p>
              </div>
            </div>

            <div className="divide-y divide-border/55">
              {rows.map((row) => {
                const delta = compareDelta(row.base, row.other, row.higherIsBetter ?? true);
                return (
                  <div
                    key={row.label}
                    className="grid grid-cols-[1fr_92px_1fr] items-center gap-2 px-4 py-3"
                  >
                    <p className="text-right font-mono font-bold text-sm text-foreground tabular-nums">
                      {row.format(row.base)}
                    </p>
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
                        {row.label}
                      </p>
                      {delta && Math.abs(delta.delta) > 0.01 && (
                        <p
                          className={cn(
                            "mt-0.5 text-[10px] font-mono font-bold tabular-nums",
                            delta.good && "text-chart-2",
                            delta.bad && "text-destructive",
                            !delta.good && !delta.bad && "text-muted-foreground",
                          )}
                        >
                          {formatSigned(delta.delta, row.label === "Kamper" ? 0 : 1)}
                        </p>
                      )}
                    </div>
                    <p className="font-mono font-bold text-sm text-foreground tabular-nums">
                      {row.format(row.other)}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="px-4 py-5 text-center text-sm text-muted-foreground">
            Velg en spiller over for å se sammenligningen.
          </div>
        )}
      </div>
    </section>
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
  const seasonId = useSelectedSeason();
  const selectedLeagueId = useSelectedLeague();
  const season = getSeason(seasonId);
  const { id } = useParams({ from: "/player/$id" });
  const router = useRouter();
  const playerId = BigInt(id);
  const leagueId =
    getStaticPlayerLeagueId(playerId, seasonId) ?? selectedLeagueId;
  const leagueLabel = getLeagueLabel(leagueId, seasonId);
  const [activeTab, setActiveTab] = useState<Tab>("season");

  const { data: player, isLoading: playerLoading } = usePlayer(playerId, seasonId);
  const { data: seasonStats, isLoading: seasonLoading } =
    usePlayerSeasonStats(playerId, seasonId);
  const { data: matchStats = [], isLoading: matchLoading } =
    usePlayerMatchStats(playerId, seasonId);
  const hasSeasonSnapshot = !!getStaticProfile(playerId, seasonId);
  const { data: team } = useTeam(
    hasSeasonSnapshot ? (player?.teamId ?? 0n) : 0n,
    seasonId,
    leagueId,
  );
  const { data: nextMatchResult } = useNextMatchForTeam(
    player?.teamId ?? 0n,
    seasonId,
    leagueId,
  );

  const isLoading = playerLoading || seasonLoading || matchLoading;
  const visibleSeasonStats =
    seasonStats && hasUsefulStats(seasonStats) ? seasonStats : null;

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
      <div className="px-4 pt-3 pb-1 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.history.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Tilbake
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs font-display font-bold text-muted-foreground">
            {leagueLabel}
          </span>
          <SeasonSelect compact />
        </div>
      </div>

      <PlayerHero
        player={player}
        teamName={team?.name}
        teamId={player.teamId}
        season={seasonId}
        league={leagueId}
      />

      {nextMatchResult && (
        <div className="px-4 pt-4">
          <MatchCard
            match={nextMatchResult.match}
            teamId={player.teamId}
            homeTeamName={nextMatchResult.homeTeamName}
            awayTeamName={nextMatchResult.awayTeamName}
          />
        </div>
      )}

      <div className="flex flex-col gap-5 pt-5">
        <KeyStats player={player} stats={visibleSeasonStats} />
        <InsightCards player={player} stats={visibleSeasonStats} />
        {!hasSeasonSnapshot && (
          <div className="mx-4 rounded-xl border border-border bg-card px-4 py-4 text-sm text-muted-foreground">
            Spilleren har ingen registrert lagtilknytning eller statistikk for {season.label}.
          </div>
        )}
        <PlayerComparison player={player} seasonStats={visibleSeasonStats} />
        <FormOverview player={player} stats={matchStats} />

        <Tabs active={activeTab} onChange={setActiveTab} />

        <div className="px-4">
          {activeTab === "season" &&
            (visibleSeasonStats ? (
              <SeasonDetails player={player} stats={visibleSeasonStats} />
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Ingen sesongstatistikk tilgjengelig
              </div>
            ))}
          {activeTab === "matches" && <MatchHistory player={player} stats={matchStats} />}
          {activeTab === "form" && <FormOverview player={player} stats={matchStats} />}
        </div>
      </div>
    </div>
  );
}
