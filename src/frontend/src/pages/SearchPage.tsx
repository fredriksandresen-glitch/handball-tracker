import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, TrendingUp, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlayerCard } from "../components/PlayerCard";
import { SkeletonCard } from "../components/SkeletonCard";
import { POSITION_LABELS, type PositionFilter } from "../data/positionMetadata";
import {
  useSearchFollowPlayer,
  useSearchIsFollowing,
  useSearchUnfollowPlayer,
} from "../hooks/useSearchFollowing";
import type { Player } from "../types/handball";

// ─── Position filter pills ────────────────────────────────────────────────────

type SortMode = "hot" | "form" | "goals" | "mep" | "name";

const SORT_FILTERS: { value: SortMode; label: string }[] = [
  { value: "hot", label: "Heitest" },
  { value: "form", label: "Beste form" },
  { value: "goals", label: "Flest mål" },
  { value: "mep", label: "Snitt MEP" },
  { value: "name", label: "Navn" },
];

const POSITION_FILTERS: { value: PositionFilter; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "Keeper", label: POSITION_LABELS.Keeper },
  { value: "VenstreKant", label: POSITION_LABELS.VenstreKant },
  { value: "HoyreKant", label: POSITION_LABELS.HoyreKant },
  { value: "Linje", label: POSITION_LABELS.Linje },
  { value: "Bakspiller", label: POSITION_LABELS.Bakspiller },
];

const INITIAL_RESULT_LIMIT = 12;

function getPositionValue(player: Player) {
  return String(player.position);
}

type PlayerSearchInsight = {
  mepAvg?: number;
  sparkValues: number[];
  formAvg?: number;
  latestMep?: number;
  hotScore: number;
  totalGoals?: number;
  latestGoals?: number;
  latestSaves?: number;
  latestSavePct?: number;
};

type SearchIndexEntry = {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  position: string;
  shirtNumber: number | null;
  imageUrl?: string;
  searchText: string;
  insight: PlayerSearchInsight;
};

type SearchPlayer = Player & {
  teamName: string;
  searchText: string;
  insight: PlayerSearchInsight;
};

let searchPlayersPromise: Promise<SearchPlayer[]> | undefined;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function loadSearchPlayers() {
  searchPlayersPromise ??= fetch("/data/search-player-index.json").then(
    async (response) => {
      if (!response.ok) throw new Error("Search index unavailable");
      const entries = (await response.json()) as SearchIndexEntry[];
      return entries.map(
        (entry): SearchPlayer => ({
          id: BigInt(entry.id),
          name: entry.name,
          slug: slugify(entry.name),
          isActive: true,
          jerseyNumber:
            entry.shirtNumber === null ? undefined : BigInt(entry.shirtNumber),
          imageUrl: entry.imageUrl,
          teamId: BigInt(entry.teamId),
          position: entry.position as Player["position"],
          teamName: entry.teamName,
          searchText: entry.searchText,
          insight: entry.insight,
        }),
      );
    },
  );
  return searchPlayersPromise;
}

function comparePlayersBySort(
  a: SearchPlayer,
  b: SearchPlayer,
  sortMode: SortMode,
) {
  const ai = a.insight;
  const bi = b.insight;

  if (sortMode === "name") return a.name.localeCompare(b.name, "nb");
  if (sortMode === "goals") return (bi.totalGoals ?? 0) - (ai.totalGoals ?? 0);
  if (sortMode === "mep") return (bi.mepAvg ?? 0) - (ai.mepAvg ?? 0);
  if (sortMode === "form") return (bi.formAvg ?? 0) - (ai.formAvg ?? 0);
  return bi.hotScore - ai.hotScore;
}

// ─── Single result row ────────────────────────────────────────────────────────

function SearchResult({
  player,
  teamName,
  insight,
  imagePriority = false,
}: {
  player: Player;
  teamName?: string;
  insight: PlayerSearchInsight;
  imagePriority?: boolean;
}) {
  const { data: following, isLoading: checkingFollow } = useSearchIsFollowing(
    player.id,
  );
  const followMutation = useSearchFollowPlayer();
  const unfollowMutation = useSearchUnfollowPlayer();

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
      latestMep={insight.latestMep}
      latestGoals={insight.latestGoals}
      latestSaves={insight.latestSaves}
      latestSavePct={insight.latestSavePct}
      sparkValues={insight.sparkValues}
      followOverlay
      imagePriority={imagePriority}
    />
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("all");
  const [sortMode] = useState<SortMode>("hot");
  const [allPlayers, setAllPlayers] = useState<SearchPlayer[]>([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [playersFailed, setPlayersFailed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadSearchPlayers()
      .then((players) => {
        if (!cancelled) setAllPlayers(players);
      })
      .catch(() => {
        if (!cancelled) setPlayersFailed(true);
      })
      .finally(() => {
        if (!cancelled) setPlayersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const totalPlayers = allPlayers.length;
  const totalTeams = new Set(
    allPlayers.map((player) => player.teamId.toString()),
  ).size;

  const hasQuery = debouncedQuery.trim() !== "";
  const normalizedQuery = debouncedQuery.trim().toLocaleLowerCase("nb");
  const sourcePlayers = hasQuery
    ? allPlayers.filter((player) => player.searchText.includes(normalizedQuery))
    : allPlayers;

  const filteredResults =
    positionFilter === "all"
      ? sourcePlayers
      : sourcePlayers.filter((p) => getPositionValue(p) === positionFilter);

  const sortedResults = [...filteredResults].sort((a, b) =>
    comparePlayersBySort(a, b, sortMode),
  );

  const isInitialBrowse = !hasQuery;
  const results = isInitialBrowse
    ? sortedResults.slice(0, INITIAL_RESULT_LIMIT)
    : sortedResults;
  const totalResultCount = sortedResults.length;

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

  const showSkeletons = playersLoading;
  const showNoResults =
    !showSkeletons && (playersFailed || results.length === 0);
  const showResults = results.length > 0;
  const showEmptyPrompt = !showResults && !showNoResults && !showSkeletons;

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

      {/* ── Empty prompt ──────────────────────────────────────────────── */}
      {showEmptyPrompt && (
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

      {/* ── No results ───────────────────────────────────────────────── */}
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
              {playersFailed
                ? "Spillerlisten kunne ikke lastes"
                : "Ingen treff"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {playersFailed
                ? "Prøv igjen om litt."
                : hasQuery
                  ? `Ingen spillere funnet for «${debouncedQuery}»`
                  : `Ingen spillere funnet i ${POSITION_LABELS[positionFilter] ?? "filteret"}`}
            </p>
          </div>
        </div>
      )}

      {/* ── Results list ──────────────────────────────────────────────── */}
      {showResults && !showSkeletons && (
        <div data-ocid="search-results">
          <div className="flex items-center justify-between gap-3 px-0.5 mb-3">
            <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
              {isInitialBrowse && totalResultCount > results.length
                ? `Viser ${results.length} av ${totalResultCount} spillere`
                : `${results.length} ${results.length === 1 ? "spiller" : "spillere"} funnet`}
            </p>
            <p className="text-[10px] font-display font-bold uppercase tracking-widest text-primary">
              {SORT_FILTERS.find((item) => item.value === sortMode)?.label}
            </p>
          </div>
          {isInitialBrowse && totalResultCount > results.length && (
            <p className="mb-3 px-0.5 text-xs text-muted-foreground">
              Søk for å filtrere hele spillerlisten.
            </p>
          )}
          <div className="-mx-2 grid grid-cols-2 gap-2 sm:mx-0 sm:gap-3">
            {results.map((player, index) => (
              <SearchResult
                key={`${player.id}-${player.teamId}-${index}`}
                player={player}
                teamName={player.teamName}
                insight={player.insight}
                imagePriority={index === 0}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
