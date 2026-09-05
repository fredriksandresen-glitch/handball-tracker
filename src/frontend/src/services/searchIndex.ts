/**
 * Delt lasting av spillersokeindeksen (2026-08-31).
 *
 * Fila er ~181 kB og ble tidligere hentet av tre uavhengige moduler
 * (aiChat, SearchPage, AiPlayerChips) med hver sin promise-cache. Pa
 * AI-siden betydde det at samme fil ble lastet ned to ganger.
 *
 * Na deler alle denne ene cachen. Forste kaller starter nedlastingen,
 * resten venter pa samme promise.
 */
export type SearchIndexEntry = {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  position: string;
  rawPosition?: string;
  shirtNumber: number | null;
  imageUrl?: string;
  searchText: string;
  insight: {
    mepAvg?: number;
    sparkValues: number[];
    formReference?: number;
    formAvg?: number;
    latestMep?: number;
    hotScore: number;
    totalGoals?: number;
    latestGoals?: number;
    latestSaves?: number;
    latestSavePct?: number;
  };
};

let indexPromise: Promise<SearchIndexEntry[]> | undefined;

/** Henter indeksen. Trygg a kalle fra flere steder — lastes kun en gang. */
export function loadPlayerSearchIndex(): Promise<SearchIndexEntry[]> {
  indexPromise ??= fetch("/data/search-player-index.json")
    .then(async (response) => {
      if (!response.ok) return [];
      return (await response.json()) as SearchIndexEntry[];
    })
    .catch(() => []);
  return indexPromise;
}
