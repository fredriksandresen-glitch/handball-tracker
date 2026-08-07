import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { createActor } from "../backend";
import {
  getStaticPlayers,
  searchStaticPlayers,
} from "../services/clawdbotPlayerProfile";
import type { Player } from "../types/handball";
import { enrichPlayersWithImages } from "../utils/playerImages";
import type { LeagueId, SeasonId } from "../data/seasons";

const STATIC_STALE_TIME = Number.POSITIVE_INFINITY;
const STATIC_GC_TIME = 30 * 60_000;

export function usePlayers(seasonId?: SeasonId, leagueId?: LeagueId) {
  const { actor, isFetching } = useActor(createActor);
  const staticPlayers = getStaticPlayers(seasonId, leagueId);
  const hasStaticPlayers = staticPlayers.length > 0;

  return useQuery<Player[]>({
    queryKey: ["players", seasonId ?? "all", leagueId ?? "all"],
    queryFn: async () => {
      if (hasStaticPlayers) {
        return enrichPlayersWithImages(staticPlayers);
      }

      if (!actor) return [];
      return enrichPlayersWithImages(await actor.getPlayers());
    },
    enabled: hasStaticPlayers || !isFetching,
    initialData: hasStaticPlayers
      ? enrichPlayersWithImages(staticPlayers)
      : undefined,
    staleTime: hasStaticPlayers ? STATIC_STALE_TIME : 120_000,
    gcTime: STATIC_GC_TIME,
  });
}

export function useSearchPlayers(term: string) {
  const { actor, isFetching } = useActor(createActor);
  const trimmedTerm = term.trim();
  const hasStaticPlayers = getStaticPlayers().length > 0;

  return useQuery<Player[]>({
    queryKey: ["searchPlayers", trimmedTerm],
    queryFn: async () => {
      if (!trimmedTerm) return [];

      const staticPlayers = searchStaticPlayers(trimmedTerm);
      if (hasStaticPlayers || staticPlayers.length > 0) {
        return enrichPlayersWithImages(staticPlayers);
      }

      if (!actor) return [];
      return enrichPlayersWithImages(await actor.searchPlayers(trimmedTerm));
    },
    enabled: trimmedTerm.length > 0 && (hasStaticPlayers || !isFetching),
    staleTime: hasStaticPlayers ? STATIC_STALE_TIME : 30_000,
    gcTime: STATIC_GC_TIME,
  });
}
