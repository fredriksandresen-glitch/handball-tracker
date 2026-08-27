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

/**
 * Grupperte posisjonsfiltre (designgjennomgang 2026-08-27).
 * For var det ti like piller pa rad som ma scrolles horisontalt pa mobil.
 * Na: fem hovedvalg, og undernivaaet for backer vises kun nar "Back" er valgt.
 */
type PositionGroup = {
  id: string;
  label: string;
  members: string[];
  subFilters?: { value: string; label: string }[];
};

const POSITION_GROUPS: PositionGroup[] = [
  { id: "all", label: "Alle", members: [] },
  { id: "Keeper", label: POSITION_LABELS.Keeper, members: ["Keeper"] },
  {
    id: "Kant",
    label: "Kant",
    members: ["VenstreKant", "HoyreKant"],
    subFilters: [
      { value: "VenstreKant", label: "Venstre" },
      { value: "HoyreKant", label: "Høyre" },
    ],
  },
  {
    id: "Back",
    label: "Back",
    members: [
      "Bakspiller",
      "BakspillerVenstre",
      "BakspillerMidt",
      "BakspillerHoyre",
    ],
    subFilters: [
      { value: "BakspillerVenstre", label: "Venstre" },
      { value: "BakspillerMidt", label: "Midt" },
      { value: "BakspillerHoyre", label: "Høyre" },
    ],
  },
  { id: "Linje", label: POSITION_LABELS.Linje, members: ["Linje"] },
  { id: "Ukjent", label: POSITION_LABELS.Ukjent, members: ["Ukjent"] },
];

const INITIAL_RESULT_LIMIT = 12;
/** Hvor mange nye spillere som lastes hver gang man scroller til bunnen. */
const RESULT_PAGE_SIZE = 12;

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

function normalizeSearchValue(value: string) {
  return value
    .toLocaleLowerCase("nb")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^a-z0-9æøå]+/gi, " ")
    .trim();
}

function matchesSearchQuery(searchText: string, query: string) {
  const searchableTokens = normalizeSearchValue(searchText).split(/\s+/);
  const queryTokens = normalizeSearchValue(query).split(/\s+/).filter(Boolean);
  return queryTokens.every((queryToken) =>
    searchableTokens.some((token) => token.startsWith(queryToken)),
  );
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
  const [positionGroup, setPositionGroup] = useState<string>("all");
  const [positionSub, setPositionSub] = useState<string | null>(null);
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
  const sourcePlayers = hasQuery
    ? allPlayers.filter((player) =>
        matchesSearchQuery(player.searchText, debouncedQuery),
      )
    : allPlayers;

  const activeGroup =
    POSITION_GROUPS.find((group) => group.id === positionGroup) ??
    POSITION_GROUPS[0];

  // Teller pa hovedgruppene, basert pa gjeldende sokeresultat.
  const groupCounts = new Map<string, number>();
  for (const group of POSITION_GROUPS) {
    groupCounts.set(
      group.id,
      group.id === "all"
        ? sourcePlayers.length
        : sourcePlayers.filter((player) =>
            group.members.includes(getPositionValue(player)),
          ).length,
    );
  }

  const filteredResults =
    positionGroup === "all"
      ? sourcePlayers
      : sourcePlayers.filter((player) => {
          const position = getPositionValue(player);
          return positionSub
            ? position === positionSub
            : activeGroup.members.includes(position);
        });

  const sortedResults = [...filteredResults].sort((a, b) =>
    comparePlayersBySort(a, b, sortMode),
  );

  const isInitialBrowse = !hasQuery;
  const totalResultCount = sortedResults.length;

  // Uendelig scroll (2026-08-27): for viste vi kun 12 spillere og ba brukeren
  // soke for aa se resten. Na lastes flere automatisk naar man scroller.
  const [visibleCount, setVisibleCount] = useState(INITIAL_RESULT_LIMIT);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Start pa nytt naar sokeord eller filter endres.
  useEffect(() => {
    setVisibleCount(INITIAL_RESULT_LIMIT);
  }, [debouncedQuery, positionGroup, positionSub]);

  const results = sortedResults.slice(0, visibleCount);
  const hasMore = visibleCount < totalResultCount;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((current) =>
            Math.min(current + RESULT_PAGE_SIZE, totalResultCount),
          );
        }
      },
      { rootMargin: "400px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, totalResultCount]);

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

      {/* ── Posisjonsfilter: gruppert segmentkontroll ────────────────────
          Designgjennomgang 2026-08-27: erstatter ti like piller. Antall vises
          per gruppe, og undernivaaet dukker opp kun for valgt gruppe. */}
      <div className="space-y-2" data-ocid="position-filter-pills">
        <div className="inline-flex flex-wrap gap-1 rounded-xl bg-muted p-1">
          {POSITION_GROUPS.map((group) => {
            const count = groupCounts.get(group.id) ?? 0;
            const isActive = positionGroup === group.id;
            if (group.id === "Ukjent" && count === 0) return null;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => {
                  setPositionGroup(group.id);
                  setPositionSub(null);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-display font-bold transition-smooth",
                  isActive
                    ? "bg-card text-foreground shadow-subtle"
                    : "text-muted-foreground hover:text-foreground",
                  group.id === "Ukjent" && !isActive && "opacity-60",
                )}
                data-ocid={`filter-pill-${group.id}`}
              >
                {group.label}
                <span
                  className={cn(
                    "rounded-md px-1.5 text-[10px] font-bold tabular-nums",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "bg-card/70 text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {activeGroup.subFilters && (
          <div className="inline-flex flex-wrap gap-1 rounded-xl bg-muted p-1">
            <button
              type="button"
              onClick={() => setPositionSub(null)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-display font-bold transition-smooth",
                positionSub === null
                  ? "bg-card text-foreground shadow-subtle"
                  : "text-muted-foreground hover:text-foreground",
              )}
              data-ocid="filter-sub-all"
            >
              Alle {activeGroup.label.toLowerCase()}er
            </button>
            {activeGroup.subFilters.map((sub) => (
              <button
                key={sub.value}
                type="button"
                onClick={() => setPositionSub(sub.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-display font-bold transition-smooth",
                  positionSub === sub.value
                    ? "bg-card text-foreground shadow-subtle"
                    : "text-muted-foreground hover:text-foreground",
                )}
                data-ocid={`filter-sub-${sub.value}`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
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
                  : `Ingen spillere funnet i ${activeGroup.label}`}
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
