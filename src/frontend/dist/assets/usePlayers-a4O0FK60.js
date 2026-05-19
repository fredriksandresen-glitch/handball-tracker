import { b as useActor, d as useQuery, e as createActor } from "./index-urhzO2zV.js";
import { e as enrichPlayersWithImages } from "./useFollowedPlayers-BzkFyYPh.js";
function usePlayers() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      if (!actor) return [];
      const players = await actor.getPlayers();
      return enrichPlayersWithImages(players);
    },
    enabled: !!actor && !isFetching,
    staleTime: 12e4
  });
}
function useSearchPlayers(term) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["searchPlayers", term],
    queryFn: async () => {
      if (!actor || !term.trim()) return [];
      const players = await actor.searchPlayers(term.trim());
      return enrichPlayersWithImages(players);
    },
    enabled: !!actor && !isFetching && term.trim().length > 0,
    staleTime: 3e4
  });
}
export {
  usePlayers as a,
  useSearchPlayers as u
};
