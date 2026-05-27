import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { createActor } from "../backend";
import {
  getStaticPlayers,
  searchStaticPlayers,
} from "../services/clawdbotPlayerProfile";
import type { Player } from "../types/handball";
import { enrichPlayersWithImages } from "../utils/playerImages";

export function usePlayers() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Player[]>({
    queryKey: ["players"],
    queryFn: async () => {
      const staticPlayers = getStaticPlayers();
      if (staticPlayers.length > 0) {
        return enrichPlayersWithImages(staticPlayers);
      }

      if (!actor) return [];
      return enrichPlayersWithImages(await actor.getPlayers());
    },
    enabled: !isFetching || getStaticPlayers().length > 0,
    staleTime: 120_000,
  });
}

export function useSearchPlayers(term: string) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Player[]>({
    queryKey: ["searchPlayers", term],
    queryFn: async () => {
      if (!term.trim()) return [];

      const staticPlayers = searchStaticPlayers(term);
      if (staticPlayers.length > 0) {
        return enrichPlayersWithImages(staticPlayers);
      }

      if (!actor) return [];
      return enrichPlayersWithImages(await actor.searchPlayers(term.trim()));
    },
    enabled: !isFetching && term.trim().length > 0,
    staleTime: 30_000,
  });
}
