import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSelectedLeague } from "../components/LeagueSelect";
import { SeasonSelect, useSelectedSeason } from "../components/SeasonSelect";
import { cn } from "@/lib/utils";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  ChevronRight,
  Layers,
  ListFilter,
  Shield,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { MatchCard } from "../components/MatchCard";
import { PositionBadge } from "../components/PositionBadge";
import {
  useFollowPlayer,
  useFollowedPlayers,
  useIsFollowing,
  useUnfollowPlayer,
} from "../hooks/useFollowedPlayers";
import { usePlayerMatchStats } from "../hooks/usePlayer";
import {
  useNextMatchForTeam,
  usePlayersByTeam,
  useTeam,
} from "../hooks/useTeam";
import { resolveImageUrl } from "../utils/playerImages";
import { getTeamLogoClassName } from "../utils/teamLogoStyles";
import {
  CUP_SEASON,
  describeCupMatch,
  getCupMatchesForTeam,
} from "../utils/cupFixtures";
import { useTeams } from "../hooks/useTeams";
import {
  getLeagueLabel,
  getSeason,
  type LeagueId,
  type SeasonId,
} from "../data/seasons";
import {
  getStaticProfile,
  getStaticTeamLeagueId,
  mapClawdbotMatchStats,
  mapClawdbotSeasonStats,
} from "../services/clawdbotPlayerProfile";
import type { Player } from "../types/handball";
import { Position } from "../types/handball";

// ─── Position groups ─────────────────────────────────────────────────────────
const POSITION_GROUPS = [
  { keys: [Position.Keeper], label: "Keepere" },
  { keys: [Position.Bakspiller], label: "Bakspillere" },
  { keys: [Position.VenstreKant, Position.HoyreKant], label: "Kantspillere" },
  { keys: [Position.Linje], label: "Linjespillere" },
] as const;

type RosterSort =
  | "position"
  | "form"
  | "mep"
  | "goals"
  | "assists"
  | "twoMin";

type RosterMetricKey = Exclude<RosterSort, "position">;

type RosterMetrics = Record<RosterMetricKey, number | undefined>;

const ROSTER_SORT_OPTIONS: { value: RosterSort; label: string }[] = [
  { value: "position", label: "Posisjon" },
  { value: "form", label: "Best form" },
  { value: "mep", label: "Sesong-MEP" },
  { value: "goals", label: "Mål" },
  { value: "assists", label: "Assists" },
  { value: "twoMin", label: "2 minutter" },
];

const ROSTER_METRIC_LABELS: Record<RosterMetricKey, string> = {
  form: "MEP siste 5",
  mep: "MEP total",
  goals: "Mål",
  assists: "Assists",
  twoMin: "2 min",
};

function toNumber(value: bigint | undefined) {
  return value === undefined ? undefined : Number(value);
}

function average(values: number[]) {
  if (!values.length) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getRosterMetrics(player: Player, season: SeasonId): RosterMetrics {
  const profile = getStaticProfile(player.id, season);
  if (!profile) {
    return {
      form: undefined,
      mep: undefined,
      goals: undefined,
      assists: undefined,
      twoMin: undefined,
    };
  }

  const seasonStats = mapClawdbotSeasonStats(profile);
  const recentMep = mapClawdbotMatchStats(profile)
    .filter((match) => typeof match.mep === "number")
    .sort((a, b) => {
      const aKey = a.date ?? a.matchId.toString();
      const bKey = b.date ?? b.matchId.toString();
      return aKey.localeCompare(bKey);
    })
    .slice(-5)
    .map((match) => match.mep as number);

  return {
    form: average(recentMep) ?? seasonStats.mepAvg,
    mep: seasonStats.mepTotal,
    goals: toNumber(seasonStats.totalGoals),
    assists: toNumber(seasonStats.totalAssists),
    twoMin: toNumber(seasonStats.totalTwoMin),
  };
}

function formatRosterMetric(sort: RosterMetricKey, value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "-";
  if (sort === "form" || sort === "mep") return value.toFixed(1);
  return Math.round(value).toString();
}

// ─── Grid card with stats + follow ────────────────────────────────────────────
function RosterPlayerCard({
  player,
  teamName,
  season,
  league,
  rankingMetric,
}: {
  player: Player;
  teamName?: string;
  season: SeasonId;
  league: LeagueId;
  rankingMetric?: {
    label: string;
    value: string;
  };
}) {
  const { data: isFollowing } = useIsFollowing(player.id);
  const followMutation = useFollowPlayer();
  const unfollowMutation = useUnfollowPlayer();
  const { data: matchStats = [] } = usePlayerMatchStats(player.id, season);

  const lastStat = useMemo(() => {
    if (!matchStats.length) return null;
    return [...matchStats].sort((a, b) => Number(b.matchId - a.matchId))[0];
  }, [matchStats]);

  const keeper = player.position === Position.Keeper;
  const lastGoals = !keeper && lastStat ? Number(lastStat?.goals ?? 0) : null;
  const lastSaves = keeper && lastStat ? Number(lastStat?.saves ?? 0) : null;
  const lastSavePct = keeper && lastStat ? lastStat.savePct : undefined;
  const lastMins = lastStat ? Number(lastStat?.minutesPlayed ?? 0) : null;

  function handleFollow(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isFollowing) {
      unfollowMutation.mutate(player.id);
    } else {
      followMutation.mutate(player.id);
    }
  }

  const isMutating = followMutation.isPending || unfollowMutation.isPending;
  const following = isFollowing ?? false;
  const imageUrl = resolveImageUrl(player.imageUrl);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link
      to="/player/$id"
      params={{ id: player.id.toString() }}
      search={{ season, league }}
      className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
      data-ocid="roster-player-card"
    >
      {/* Poster card */}
      <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-muted">
        <div
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/60"
          aria-hidden="true"
        >
          <User className="size-14 text-muted-foreground/40" />
        </div>
        {imageUrl && !imageFailed && (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Follow button — top right */}
        <button
          type="button"
          onClick={handleFollow}
          disabled={isMutating}
          aria-label={following ? "Slutt å følge" : "Følg spiller"}
          className={cn(
            "absolute top-2.5 right-2.5 z-10 rounded-full transition-smooth",
            "min-w-[44px] h-[24px] px-2 flex items-center justify-center gap-1 text-[10px] font-display font-bold border backdrop-blur-sm",
            following
              ? "bg-white/20 border-white/30 text-white hover:bg-destructive/60 hover:border-destructive/60"
              : "bg-primary border-primary text-primary-foreground hover:bg-primary/80",
            isMutating && "opacity-50 pointer-events-none",
          )}
          data-ocid={following ? "player-unfollow-btn" : "player-follow-btn"}
        >
          {following ? (
            <>
              <CheckCheck className="size-3" />
              Følger
            </>
          ) : (
            <>
              <User className="size-3" />
              Følg
            </>
          )}
        </button>

        {/* Jersey number — top left */}
        {player.jerseyNumber !== undefined && (
          <div className="absolute top-2.5 left-2.5 size-7 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <span className="font-display font-black text-[11px] text-white leading-none">
              {player.jerseyNumber.toString()}
            </span>
          </div>
        )}

        {/* Info overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-10">
          <PositionBadge position={player.position} variant="overlay" />
          <p className="font-display font-black text-white text-[13px] leading-tight truncate mt-1 group-hover:text-primary/90 transition-colors drop-shadow-sm">
            {player.name}
          </p>
          {teamName && (
            <p className="text-[10px] text-white/60 truncate font-body mt-0.5">
              {teamName}
            </p>
          )}

          {/* Selected ranking metric or last match stats */}
          {rankingMetric ? (
            <div className="mt-2 pt-2 border-t border-white/15">
              <span className="font-display font-black text-base leading-none text-primary">
                {rankingMetric.value}
              </span>
              <p className="text-[9px] text-white/50 uppercase tracking-wide mt-0.5">
                {rankingMetric.label}
              </p>
            </div>
          ) : (
            (lastGoals !== null ||
              lastSaves !== null ||
              (lastMins !== null && lastMins > 0)) && (
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/15">
              {keeper && lastSaves !== null && (
                <div>
                  <span className={cn("font-display font-black text-base leading-none", lastSaves > 0 ? "text-primary" : "text-white/50")}>{lastSaves}</span>
                  <p className="text-[9px] text-white/50 uppercase tracking-wide mt-0.5">Redn.</p>
                </div>
              )}
              {keeper && lastSavePct !== undefined && (
                <div>
                  <span className="font-display font-bold text-sm leading-none text-white/80">{lastSavePct.toFixed(1)}%</span>
                  <p className="text-[9px] text-white/50 uppercase tracking-wide mt-0.5">Red%</p>
                </div>
              )}
              {!keeper && lastGoals !== null && (
                <div>
                  <span className={cn("font-display font-black text-base leading-none", lastGoals > 0 ? "text-primary" : "text-white/50")}>{lastGoals}</span>
                  <p className="text-[9px] text-white/50 uppercase tracking-wide mt-0.5">Mål</p>
                </div>
              )}
              {!keeper && lastMins !== null && lastMins > 0 && (
                <div>
                  <span className="font-display font-bold text-sm leading-none text-white/80">{lastMins}</span>
                  <p className="text-[9px] text-white/50 uppercase tracking-wide mt-0.5">Min</p>
                </div>
              )}
            </div>
            )
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton grid card ────────────────────────────────────────────────────────
function SkeletonRosterCard() {
  return (
    <div className="rounded-2xl overflow-hidden">
      <Skeleton className="w-full aspect-[3/4]" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TeamPage() {
  const seasonId = useSelectedSeason();
  const selectedLeagueId = useSelectedLeague();
  const season = getSeason(seasonId);
  const { id } = useParams({ from: "/team/$id" });
  const teamId = BigInt(id);
  const leagueId = getStaticTeamLeagueId(teamId) ?? selectedLeagueId;
  const leagueLabel = getLeagueLabel(leagueId, seasonId);
  const navigate = useNavigate();

  const { data: team, isLoading: loadingTeam } = useTeam(teamId, seasonId, leagueId);
  const { data: players = [], isLoading: loadingPlayers } =
    usePlayersByTeam(teamId, seasonId, leagueId);
  const { data: nextMatchResult } = useNextMatchForTeam(teamId, seasonId, leagueId);
  const { data: allTeams = [] } = useTeams(seasonId, leagueId);
  const { data: followedPlayers = [] } = useFollowedPlayers();
  const followPlayer = useFollowPlayer();
  const [rosterSort, setRosterSort] = useState<RosterSort>("position");
  const [cupExpanded, setCupExpanded] = useState(false);

  const cupMatches = useMemo(
    () => getCupMatchesForTeam(team?.name),
    [team?.name],
  );

  const followedIds = useMemo(
    () => new Set(followedPlayers.map((p) => p.id.toString())),
    [followedPlayers],
  );

  const teamsMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of allTeams) map[t.id.toString()] = t.name;
    return map;
  }, [allTeams]);

  const nextMatch = nextMatchResult?.match;
  const homeTeamName =
    nextMatchResult?.homeTeamName ??
    (nextMatch ? teamsMap[nextMatch.homeTeamId.toString()] : undefined);
  const awayTeamName =
    nextMatchResult?.awayTeamName ??
    (nextMatch ? teamsMap[nextMatch.awayTeamId.toString()] : undefined);

  const allFollowed =
    players.length > 0 &&
    players.every((p) => followedIds.has(p.id.toString()));

  function handleFollowAll() {
    const unfollowed = players.filter((p) => !followedIds.has(p.id.toString()));
    for (const p of unfollowed) followPlayer.mutate(p.id);
  }

  const playerMetrics = useMemo(() => {
    const metrics = new Map<string, RosterMetrics>();
    for (const player of players) {
      metrics.set(player.id.toString(), getRosterMetrics(player, seasonId));
    }
    return metrics;
  }, [players, seasonId]);

  const groupedPlayers = useMemo(
    () =>
      POSITION_GROUPS.map((group) => ({
        label: group.label,
        players: players.filter((p) =>
          (group.keys as readonly string[]).includes(p.position as string),
        ),
      })).filter((g) => g.players.length > 0),
    [players],
  );

  const rankedPlayers = useMemo(() => {
    if (rosterSort === "position") return players;
    return [...players].sort((a, b) => {
      const aValue = playerMetrics.get(a.id.toString())?.[rosterSort];
      const bValue = playerMetrics.get(b.id.toString())?.[rosterSort];
      if (aValue === undefined && bValue !== undefined) return 1;
      if (aValue !== undefined && bValue === undefined) return -1;
      return (
        (bValue ?? 0) - (aValue ?? 0) ||
        a.name.localeCompare(b.name, "nb")
      );
    });
  }, [playerMetrics, players, rosterSort]);

  // ─── Loading state ───────────────────────────────────────────────────────
  if (loadingTeam || loadingPlayers) {
    return (
      <div className="space-y-4" data-ocid="team-page-loading">
        <button
          type="button"
          onClick={() => navigate({ to: "/teams", search: { season: seasonId, league: leagueId } })}
          className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Alle lag
        </button>
        {/* Team header skeleton */}
        <div className="rounded-xl bg-card border border-border p-5 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
            {[1, 2, 3].map((k) => (
              <div key={k} className="flex flex-col items-center gap-1">
                <Skeleton className="h-7 w-10" />
                <Skeleton className="h-2.5 w-12" />
              </div>
            ))}
          </div>
        </div>
        {/* Roster skeleton grid */}
        <div className="space-y-4">
          <Skeleton className="h-4 w-20" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <SkeletonRosterCard key={k} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Team not found ───────────────────────────────────────────────────────
  if (!team) {
    return (
      <div className="text-center py-16 space-y-3">
        <Shield className="size-10 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground font-body">Lag ikke funnet</p>
        <Link to="/teams" search={{ season: seasonId, league: leagueId }} className="text-primary text-sm block">
          ← Tilbake til lag
        </Link>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 -mt-2" data-ocid="team-page">
      {/* Back navigation */}
      <button
        type="button"
        onClick={() => navigate({ to: "/teams", search: { season: seasonId, league: leagueId } })}
        className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground transition-colors"
        data-ocid="team-back-btn"
      >
        <ArrowLeft className="size-3.5" />
        Alle lag
      </button>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-display font-bold text-muted-foreground">
          {leagueLabel} · {season.label}
        </p>
        <SeasonSelect compact />
      </div>

      {/* ── Team hero card ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl bg-card border border-border p-5"
      >
        <div className="flex items-center gap-4">
          {team.logoUrl ? (
            <img
              src={team.logoUrl}
              alt={team.name}
              className={cn("size-14 object-contain flex-shrink-0", getTeamLogoClassName(team.name))}
            />
          ) : (
            <div className="size-14 rounded-xl bg-muted flex items-center justify-center border border-border flex-shrink-0">
              <Shield className="size-7 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-black text-xl text-foreground truncate">
              {team.name}
            </h1>
            {team.standingsRank !== undefined && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <Trophy className="size-3.5 text-primary" />
                {team.standingsRank.toString()}. plass i ligaen
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        {(team.matchesPlayed !== undefined ||
          team.points !== undefined ||
          team.goalDifference !== undefined) && (
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
            {team.matchesPlayed !== undefined && (
              <div className="text-center">
                <span className="block font-display font-black text-xl text-foreground">
                  {team.matchesPlayed.toString()}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Kamper
                </span>
              </div>
            )}
            {team.points !== undefined && (
              <div className="text-center">
                <span className="block font-display font-black text-xl text-primary">
                  {team.points.toString()}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Poeng
                </span>
              </div>
            )}
            {team.goalDifference !== undefined && (
              <div className="text-center">
                <span
                  className={cn(
                    "block font-display font-black text-xl",
                    team.goalDifference >= 0n
                      ? "text-chart-2"
                      : "text-destructive",
                  )}
                >
                  {team.goalDifference > 0n
                    ? `+${team.goalDifference}`
                    : team.goalDifference.toString()}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Målforskjell
                </span>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Next match ── */}
      {nextMatch && (
        <MatchCard
          match={nextMatch}
          teamId={team.id}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          opponentLink={{ season: seasonId, league: leagueId }}
        />
      )}

      {/* ── NM (cup) ── */}
      {cupMatches.length > 0 && team && (
        <div className="space-y-3" data-ocid="team-nm-section">
          <button
            type="button"
            onClick={() => setCupExpanded((v) => !v)}
            aria-expanded={cupExpanded}
            className={cn(
              "w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors",
              cupExpanded
                ? "border-primary/50 bg-primary/5"
                : "border-border bg-card hover:border-primary/40",
            )}
            data-ocid="team-nm-toggle"
          >
            <span className="flex items-center gap-2">
              <Trophy className="size-4 text-primary" />
              <span className="text-sm font-display font-bold text-foreground">
                {`NM ${CUP_SEASON.replace("-", "/")}`}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {cupMatches.length} {cupMatches.length === 1 ? "kamp" : "kamper"}
              </span>
            </span>
            <ChevronRight
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                cupExpanded && "rotate-90",
              )}
            />
          </button>
          {cupExpanded && (
            <ul className="space-y-2" data-ocid="team-nm-list">
              {cupMatches.map((match) => {
                const view = describeCupMatch(match, team.name);
                return (
                  <li
                    key={match.id}
                    className="rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            {view.isHome ? "H" : "B"}
                          </span>
                          <span className="truncate text-sm font-display font-semibold text-foreground">
                            {view.opponent}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {match.kickoff
                            ? new Date(match.kickoff * 1000).toLocaleDateString("nb-NO", {
                                day: "2-digit",
                                month: "short",
                              })
                            : "Dato ikke satt"}
                        </span>
                      </div>
                      {match.played ? (
                        <span
                          className={cn(
                            "shrink-0 font-display font-bold tabular-nums",
                            view.won && "text-primary",
                            view.lost && "text-muted-foreground",
                          )}
                        >
                          {view.teamScore}–{view.opponentScore}
                        </span>
                      ) : (
                        <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
                          Ikke spilt
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {/* ── Roster ── */}
      {players.length > 0 ? (
        <div className="space-y-5" data-ocid="team-roster">
          {/* Roster controls */}
          <div className="bg-card border border-border rounded-xl px-4 py-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                <span className="text-sm font-display font-semibold text-foreground">
                  {players.length} spillere
                </span>
              </div>
              <Button
                size="sm"
                variant={allFollowed ? "outline" : "default"}
                disabled={allFollowed || followPlayer.isPending}
                onClick={handleFollowAll}
                className={cn(
                  "h-8 px-4 rounded-full text-xs font-display font-bold gap-1.5",
                  allFollowed
                    ? "border-primary/40 text-primary"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
                data-ocid="team-follow-all-btn"
              >
                {allFollowed ? (
                  <>
                    <CheckCheck className="size-3.5" />
                    Følger alle
                  </>
                ) : (
                  <>
                    <Users className="size-3.5" />
                    Følg alle
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-border">
              <ListFilter className="size-4 text-muted-foreground" />
              <span className="text-xs font-display font-bold text-muted-foreground">
                Sorter etter
              </span>
              <Select
                value={rosterSort}
                onValueChange={(value) => setRosterSort(value as RosterSort)}
              >
                <SelectTrigger
                  size="sm"
                  className="ml-auto w-[148px] bg-background"
                  aria-label="Sorter spillerstall"
                  data-ocid="roster-sort-select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROSTER_SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Position groups or a single ranked roster */}
          {rosterSort === "position" ? (
            groupedPlayers.map((group, gi) => (
              <section key={group.label} data-ocid="team-position-group">
                <div className="flex items-center gap-2 mb-3 px-0.5">
                  <Layers className="size-3.5 text-muted-foreground flex-shrink-0" />
                  <h3 className="text-[11px] font-display font-bold uppercase tracking-widest text-muted-foreground">
                    {group.label}
                  </h3>
                  <span className="ml-auto text-[10px] text-muted-foreground/60 font-body">
                    {group.players.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {group.players.map((player, i) => (
                    <motion.div
                      key={player.id.toString()}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: gi * 0.05 + i * 0.04, duration: 0.25 }}
                    >
                      <RosterPlayerCard
                        player={player}
                        teamName={team.name}
                        season={seasonId}
                        league={leagueId}
                      />
                    </motion.div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <section data-ocid="team-ranked-roster">
              <div className="flex items-center gap-2 mb-3 px-0.5">
                <ListFilter className="size-3.5 text-muted-foreground flex-shrink-0" />
                <h3 className="text-[11px] font-display font-bold uppercase tracking-widest text-muted-foreground">
                  Rangert etter{" "}
                  {ROSTER_SORT_OPTIONS.find((option) => option.value === rosterSort)
                    ?.label}
                </h3>
                <span className="ml-auto text-[10px] text-muted-foreground/60 font-body">
                  {rankedPlayers.length}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {rankedPlayers.map((player, index) => {
                  const value =
                    playerMetrics.get(player.id.toString())?.[rosterSort];
                  return (
                    <motion.div
                      key={player.id.toString()}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: Math.min(index * 0.03, 0.3),
                        duration: 0.25,
                      }}
                    >
                      <RosterPlayerCard
                        player={player}
                        teamName={team.name}
                        season={seasonId}
                        league={leagueId}
                        rankingMetric={{
                          label: ROSTER_METRIC_LABELS[rosterSort],
                          value: formatRosterMetric(rosterSort, value),
                        }}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      ) : (
        /* Empty state */
        <div
          className="rounded-xl bg-card border border-border py-14 flex flex-col items-center gap-3"
          data-ocid="team-roster-empty"
        >
          <Users className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center font-body">
            {season.isCurrent
              ? `Spillerstallen for ${season.label} er ikke kvalitetssikret ennå`
              : "Ingen spillere i stallen"}
          </p>
        </div>
      )}

      {/* ── Discovery CTA ── */}
      <div className="rounded-xl bg-card border border-border/60 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Shield className="size-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-body text-muted-foreground">
            Utforsk andre lag
          </span>
        </div>
        <Link
          to="/teams"
          search={{ season: seasonId, league: leagueId }}
          className="flex items-center gap-1 text-primary text-sm font-display font-semibold hover:opacity-80 transition-opacity"
          data-ocid="team-explore-cta"
        >
          Alle lag
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
