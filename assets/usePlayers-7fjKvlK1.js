import { b as useQuery, d as useMockActor } from "./index-BrTjiQrP.js";
import { e as enrichPlayersWithImages } from "./useFollowedPlayers-B96IBvp4.js";
function usePlayers() {
  const { actor } = useMockActor();
  return useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      if (!actor) return [];
      const players = await actor.getPlayers();
      return enrichPlayersWithImages(players);
    },
    enabled: !!actor && true,
    staleTime: 12e4
  });
}
function useSearchPlayers(term) {
  const { actor } = useMockActor();
  return useQuery({
    queryKey: ["searchPlayers", term],
    queryFn: async () => {
      if (!actor || !term.trim()) return [];
      const players = await actor.searchPlayers(term.trim());
      return enrichPlayersWithImages(players);
    },
    enabled: !!actor && true && term.trim().length > 0,
    staleTime: 3e4
  });
}
export {
  usePlayers as a,
  useSearchPlayers as u
};
