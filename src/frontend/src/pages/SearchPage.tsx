import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlayerCard } from "../components/PlayerCard";
import { SkeletonCard } from "../components/SkeletonCard";
import {
  useFollowPlayer,
  useIsFollowing,
  useUnfollowPlayer,
} from "../hooks/useFollowedPlayers";
import { usePlayers, useSearchPlayers } from "../hooks/usePlayers";
import { useTeams } from "../hooks/useTeams";
import {
  POSITION_LABELS,
  type Player,
  type PositionFilter,
} from "../types/handball";

// ─── Position filter pills ────────────────────────────────────────────────────

const POSITION_FILTERS: { value: PositionFilter; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "Keeper", label: POSITION_LABELS.Keeper },
  { value: "VenstreKant", label: POSITION_LABELS.VenstreKant },
  { value: "HoyreKant", label: POSITION_LABELS.HoyreKant },
  { value: "Linje", label: POSITION_LABELS.Linje },
  { value: "Bakspiller", label: POSITION_LABELS.Bakspiller },
];

// ─── Single result row ────────────────────────────────────────────────────────

function SearchResult({
  player,
  teamName,
}: { player: Player; teamName?: string }) {
  const { data: following, isLoading: checkingFollow } = useIsFollowing(
    player.id,
  );
  const followMutation = useFollowPlayer();
  const unfollowMutation = useUnfollowPlayer();

  return (
    <PlayerCard
      player={player}
      teamName={teamName}
      isFollowing={following ?? false}
      onFollow={() => followMutation.mutate(player.id)}
      onUnfollow={() => unfollowMutation.mutate(player.id)}
      isLoading={
        checkingFollow || followMutation.isPending || unfollowMutation.isPending
      }
    />
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: rawResults, isLoading } = useSearchPlayers(debouncedQuery);
  const { data: teams } = useTeams();
  const { data: allPlayers } = usePlayers();

  const teamMap = new Map<string, string>(
    (teams ?? []).map((t) => [t.id.toString(), t.name]),
  );

  const totalPlayers = allPlayers?.length ?? 0;
  const totalTeams = teams?.length ?? 0;

  // Filter by position client-side
  const results =
    positionFilter === "all"
      ? rawResults
      : rawResults?.filter((p) => p.position.toString() === positionFilter);

  // Debounce input → query
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(val);
    }, 300);
  }, []);

  const handleClear = useCallback(() => {
    setInputValue("");
    setDebouncedQuery("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const hasQuery = debouncedQuery.trim() !== "";
  const showSkeletons = isLoading && hasQuery;
  const showNoResults =
    !isLoading && results !== undefined && results.length === 0 && hasQuery;
  const showResults = results && results.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Search input ─────────────────────────────────────────────── */}
      <div className="relative flex items-center" data-ocid="search-input-wrap">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={inputValue}
          onChange={handleChange}
          placeholder="Søk etter spillernavn, lag eller posisjon"
          className="pl-10 pr-10 h-11 bg-card border-border placeholder:text-muted-foreground text-foreground rounded-xl focus-visible:ring-primary/50"
          data-ocid="search-input"
          autoFocus
          autoComplete="off"
          inputMode="search"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Tøm søk"
            data-ocid="search-clear-btn"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* ── Position filter pills ─────────────────────────────────────── */}
      <div
        className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar"
        data-ocid="position-filter-pills"
      >
        {POSITION_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setPositionFilter(value)}
            className={cn(
              "flex-shrink-0 h-7 px-3.5 rounded-full text-[11px] font-display font-semibold tracking-wide uppercase transition-smooth border",
              positionFilter === value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
            data-ocid={`filter-pill-${value}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Empty prompt (no query typed yet) ────────────────────────── */}
      {!hasQuery && (
        <div
          className="flex flex-col items-center justify-center py-16 gap-4 text-center"
          data-ocid="search-empty-prompt"
        >
          <div className="size-16 rounded-full bg-card border border-border flex items-center justify-center shadow-elevated">
            <Search className="size-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-display font-semibold text-foreground text-base">
              Finn din neste favorittspiller
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[260px]">
              Søk etter spillernavn, lag eller posisjon
            </p>
          </div>
          {totalPlayers > 0 && (
            <p
              className="text-xs text-muted-foreground/70 bg-card border border-border rounded-full px-3 py-1"
              data-ocid="data-status"
            >
              Viser {totalPlayers} spillere fra {totalTeams} lag
            </p>
          )}
        </div>
      )}

      {/* ── Loading skeletons ─────────────────────────────────────────── */}
      {showSkeletons && (
        <div className="space-y-3" data-ocid="search-loading">
          <SkeletonCard variant="player" />
          <SkeletonCard variant="player" />
          <SkeletonCard variant="player" />
          <SkeletonCard variant="player" />
        </div>
      )}

      {/* ── No results ────────────────────────────────────────────────── */}
      {showNoResults && (
        <div
          className="flex flex-col items-center justify-center py-14 gap-3 text-center"
          data-ocid="search-no-results"
        >
          <div className="size-14 rounded-full bg-card border border-border flex items-center justify-center">
            <Search className="size-6 text-muted-foreground opacity-50" />
          </div>
          <div>
            <p className="font-display font-semibold text-foreground">
              Ingen treff
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Ingen spillere funnet for «{debouncedQuery}»
            </p>
          </div>
        </div>
      )}

      {/* ── Results list ──────────────────────────────────────────────── */}
      {showResults && !showSkeletons && (
        <div data-ocid="search-results">
          <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground px-0.5 mb-3">
            {results.length} {results.length === 1 ? "spiller" : "spillere"}{" "}
            funnet
          </p>
          <div className="grid grid-cols-2 gap-3">
            {results.map((player) => (
              <SearchResult
                key={player.id.toString()}
                player={player}
                teamName={teamMap.get(player.teamId.toString())}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
