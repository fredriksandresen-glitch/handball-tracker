import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { createActor } from "../backend";
import type { Player } from "../types/handball";
import { enrichPlayersWithImages } from "../utils/playerImages";

export function usePlayers() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Player[]>({
    queryKey: ["players"],
    queryFn: async () => {
      if (!actor) return [];
      const players = await actor.getPlayers();
      return enrichPlayersWithImages(players);
    },
    enabled: !!actor && !isFetching,
    staleTime: 120_000,
  });
}

export function useSearchPlayers(term: string) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Player[]>({
    queryKey: ["searchPlayers", term],
    queryFn: async () => {
      if (!actor || !term.trim()) return [];
      const players = await actor.searchPlayers(term.trim());
      return enrichPlayersWithImages(players);
    },
    enabled: !!actor && !isFetching && term.trim().length > 0,
    staleTime: 30_000,
  });
}
