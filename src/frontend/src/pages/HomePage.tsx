import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Search, Shield, SlidersHorizontal, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { FeedPlayerCard } from "../components/FeedPlayerCard";
import { SkeletonCard } from "../components/SkeletonCard";
import { useFeedEvents } from "../hooks/useFeedEvents";
import {
  useFollowedPlayers,
  useUnfollowPlayer,
} from "../hooks/useFollowedPlayers";
import { usePlayerMatchStatsBatch } from "../hooks/usePlayer";
import { useTeams } from "../hooks/useTeams";
import { POSITION_LABELS, Position } from "../types/handball";
import type {
  Player,
  PlayerMatchStats,
  SortField,
  Team,
} from "../types/handball";
import type { EnrichedPlayerMatchStats } from "../services/clawdbotPlayerProfile";

// ── Constants ─────────────────────────────────────────────────────────────
const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "activity", label: "Siste aktivitet" },
  { value: "goals", label: "Flest mål" },
  { value: "minutes", label: "Mest spilletid" },
  { value: "form", label: "Beste form" },
];

const ALL_POSITIONS = Object.values(Position) as string[];

// ── Helpers ───────────────────────────────────────────────────────────────
function getTeamName(teamId: bigint, teams: Team[]): string {
  return teams.find((t) => t.id === teamId)?.name ?? "";
}

type StatsMap = Record<string, PlayerMatchStats[]>;

function statsFor(player: Player, statsMap: StatsMap): EnrichedPlayerMatchStats[] {
  return (statsMap[player.id.toString()] ?? []) as EnrichedPlayerMatchStats[];
}

function matchSortKey(match: EnrichedPlayerMatchStats): string {
  return match.date ?? match.matchId.toString().padStart(20, "0");
}

/** Latest match date as a comparable number. 0 = no data. */
function lastActivity(player: Player, statsMap: StatsMap): number {
  const keys = statsFor(player, statsMap).map((m) => matchSortKey(m));
  if (keys.length === 0) return 0;
  const newest = keys.sort()[keys.length - 1];
  const parsed = Date.parse(newest);
  return Number.isNaN(parsed) ? keys.length : parsed;
}

function totalGoals(player: Player, statsMap: StatsMap): number {
  return statsFor(player, statsMap).reduce(
    (sum, m) => sum + Number(m.goals ?? 0n),
    0,
  );
}

/** playTime is "MM:SS" or "H:MM:SS" or a plain number of minutes. */
function parsePlayTime(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string" || value.trim() === "") return 0;
  const parts = value.split(":").map((p) => Number(p));
  if (parts.some((p) => Number.isNaN(p))) return 0;
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
  if (parts.length === 2) return parts[0] + parts[1] / 60;
  return parts[0];
}

function totalMinutes(player: Player, statsMap: StatsMap): number {
  return statsFor(player, statsMap).reduce(
    (sum, m) =>
      sum +
      (m.minutesPlayed !== undefined
        ? Number(m.minutesPlayed)
        : parsePlayTime(m.playTime)),
    0,
  );
}

/** Average MEP over the last 3 matches, else average goals. */
function formScore(player: Player, statsMap: StatsMap): number {
  const matches = statsFor(player, statsMap)
    .slice()
    .sort((a, b) => matchSortKey(a).localeCompare(matchSortKey(b)));
  if (matches.length === 0) return 0;

  const recent = matches.slice(-3);
  const meps = recent
    .map((m) => m.mep)
    .filter((v): v is number => typeof v === "number");
  if (meps.length > 0) {
    return meps.reduce((s, v) => s + v, 0) / meps.length;
  }
  return (
    recent.reduce((s, m) => s + Number(m.goals ?? 0n), 0) / recent.length
  );
}

function sortPlayers(
  players: Player[],
  sort: SortField,
  statsMap: StatsMap,
): Player[] {
  const score =
    sort === "activity"
      ? lastActivity
      : sort === "goals"
        ? totalGoals
        : sort === "minutes"
          ? totalMinutes
          : formScore;

  return [...players].sort((a, b) => {
    const diff = score(b, statsMap) - score(a, statsMap);
    // Stable, predictable tiebreak so the list never looks random.
    return diff !== 0 ? diff : a.name.localeCompare(b.name, "nb");
  });
}

// ── Empty state ───────────────────────────────────────────────────────────
function EmptyFeed() {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-20 text-center min-h-[60vh]"
      data-ocid="feed-empty-state"
    >
      <div className="relative mb-6">
        <div className="size-24 rounded-full bg-primary/8 border border-primary/20 flex items-center justify-center">
          <Users className="size-10 text-primary/60" />
        </div>
        <div className="absolute -bottom-1 -right-1 size-8 rounded-full bg-muted border border-border flex items-center justify-center">
          <span className="text-base">⭐</span>
        </div>
      </div>
      <h2 className="font-display font-black text-2xl text-foreground mb-2 leading-tight tracking-tight">
        Ingen spillere fulgt ennå
      </h2>
      <p className="text-muted-foreground text-sm leading-relaxed max-w-[280px] mb-8">
        Følg spillere for å se dem her. Søk etter en spiller eller utforsk et
        lag.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-[280px]">
        <Link
          to="/search"
          className="flex items-center justify-center gap-2.5 rounded-xl bg-primary text-primary-foreground font-display font-bold text-[15px] px-6 py-3.5 transition-smooth hover:bg-primary/90 shadow-subtle"
          data-ocid="empty-state-search-link"
        >
          <Search className="size-4.5" />
          Søk etter spillere
        </Link>
        <Link
          to="/teams"
          className="flex items-center justify-center gap-2.5 rounded-xl bg-card border border-border text-foreground font-display font-bold text-[15px] px-6 py-3.5 transition-smooth hover:border-primary/40 hover:bg-muted/40"
          data-ocid="empty-state-teams-link"
        >
          <Shield className="size-4.5" />
          Se lag
        </Link>
      </div>
    </div>
  );
}

// ── Sort pills ────────────────────────────────────────────────────────────
function SortPills({
  active,
  onChange,
}: { active: SortField; onChange: (v: SortField) => void }) {
  return (
    <div
      className="flex gap-2 overflow-x-auto scrollbar-none"
      data-ocid="feed-sort-pills"
    >
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-display font-semibold border transition-smooth",
            active === opt.value
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
          )}
          data-ocid={`sort-${opt.value}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────
function FilterBar({
  positions,
  teams,
  activePos,
  activeTeamId,
  onPosChange,
  onTeamChange,
}: {
  positions: string[];
  teams: Team[];
  activePos: string;
  activeTeamId: string;
  onPosChange: (v: string) => void;
  onTeamChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeCount =
    (activePos !== "all" ? 1 : 0) + (activeTeamId !== "all" ? 1 : 0);
  if (positions.length === 0 && teams.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-display font-semibold border transition-smooth",
          open || activeCount > 0
            ? "bg-primary/15 border-primary/40 text-primary"
            : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
        )}
        data-ocid="feed-filter-toggle"
      >
        <SlidersHorizontal className="size-3" />
        Filter
        {activeCount > 0 && (
          <span className="size-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold leading-none">
            {activeCount}
          </span>
        )}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {positions.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 font-display font-semibold">
                Posisjon
              </p>
              <div
                className="flex gap-2 flex-wrap"
                data-ocid="feed-position-filter"
              >
                {["all", ...positions].map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => onPosChange(pos)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-display font-semibold border transition-smooth",
                      activePos === pos
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/40",
                    )}
                  >
                    {pos === "all" ? "Alle" : (POSITION_LABELS[pos] ?? pos)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {teams.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 font-display font-semibold">
                Lag
              </p>
              <div
                className="flex gap-2 flex-wrap"
                data-ocid="feed-team-filter"
              >
                {[
                  { id: "all" as unknown as bigint, name: "Alle lag" },
                  ...teams,
                ].map((t) => {
                  const key =
                    t.id === ("all" as unknown as bigint)
                      ? "all"
                      : t.id.toString();
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onTeamChange(key)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-display font-semibold border transition-smooth",
                        activeTeamId === key
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:border-primary/40",
                      )}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── HomePage ──────────────────────────────────────────────────────────────
export default function HomePage() {
  const [sort, setSort] = useState<SortField>("activity");
  const [posFilter, setPosFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");

  const { data: followedPlayers = [], isLoading: loadingPlayers } =
    useFollowedPlayers();
  const { data: feedEvents = [], isLoading: loadingFeed } = useFeedEvents();
  const { data: allTeams = [] } = useTeams();
  const unfollow = useUnfollowPlayer();

  // Fetch match stats for all followed players (for form bars)
  const followedIds = useMemo(
    () => followedPlayers.map((p) => p.id),
    [followedPlayers],
  );
  const matchStatsMap = usePlayerMatchStatsBatch(followedIds);

  const followedPositions = useMemo(() => {
    const set = new Set<string>();
    for (const p of followedPlayers) {
      if (ALL_POSITIONS.includes(p.position as string))
        set.add(p.position as string);
    }
    return Array.from(set);
  }, [followedPlayers]);

  const followedTeams = useMemo(
    () =>
      allTeams.filter((t) =>
        new Set(followedPlayers.map((p) => p.teamId)).has(t.id),
      ),
    [followedPlayers, allTeams],
  );

  const displayedPlayers = useMemo(() => {
    let filtered = followedPlayers;
    if (posFilter !== "all")
      filtered = filtered.filter((p) => (p.position as string) === posFilter);
    if (teamFilter !== "all")
      filtered = filtered.filter((p) => p.teamId.toString() === teamFilter);
    return sortPlayers(filtered, sort, matchStatsMap);
  }, [followedPlayers, posFilter, teamFilter, sort, matchStatsMap]);

  const isLoading = loadingPlayers || loadingFeed;
  const hasFollowed = followedPlayers.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* ── Sticky header ───────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-card border-b border-border shadow-subtle px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-black text-xl text-foreground tracking-tight leading-none">
              Din feed
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-body">
              {hasFollowed
                ? `${followedPlayers.length} spiller${followedPlayers.length !== 1 ? "e" : ""} fulgt`
                : "Følg spillere for å bygge din feed"}
            </p>
          </div>
          <Link
            to="/search"
            className="size-9 rounded-full bg-muted flex items-center justify-center border border-border hover:border-primary/40 transition-smooth"
            aria-label="Søk etter spillere"
            data-ocid="header-search-btn"
          >
            <Search className="size-4 text-muted-foreground" />
          </Link>
        </div>
        {hasFollowed && (
          <>
            <SortPills active={sort} onChange={setSort} />
            <FilterBar
              positions={followedPositions}
              teams={followedTeams}
              activePos={posFilter}
              activeTeamId={teamFilter}
              onPosChange={setPosFilter}
              onTeamChange={setTeamFilter}
            />
          </>
        )}
      </div>

      {/* ── Scrollable feed ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-2 sm:p-3 grid grid-cols-2 gap-2 sm:gap-3" data-ocid="feed-skeleton">
            <SkeletonCard variant="feed" />
            <SkeletonCard variant="feed" />
            <SkeletonCard variant="feed" />
            <SkeletonCard variant="feed" />
          </div>
        ) : !hasFollowed ? (
          <EmptyFeed />
        ) : displayedPlayers.length === 0 ? (
          <div className="px-4 py-12 text-center" data-ocid="feed-no-results">
            <p className="text-muted-foreground text-sm">
              Ingen spillere matcher filteret ditt.
            </p>
            <button
              type="button"
              onClick={() => {
                setPosFilter("all");
                setTeamFilter("all");
              }}
              className="mt-3 text-primary text-sm font-semibold hover:underline"
            >
              Nullstill filter
            </button>
          </div>
        ) : (
          <div
            className="p-2 sm:p-3 grid grid-cols-2 gap-2 sm:gap-3 pb-6"
            data-ocid="feed-list"
          >
            {displayedPlayers.map((player, idx) => (
              <FeedPlayerCard
                key={player.id.toString()}
                player={player}
                teamName={getTeamName(player.teamId, allTeams)}
                feedEvents={feedEvents.filter((e) => e.playerId === player.id)}
                matchStats={matchStatsMap[player.id.toString()] ?? []}
                onUnfollow={() => unfollow.mutate(player.id)}
                isUnfollowLoading={unfollow.isPending}
                index={idx}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
