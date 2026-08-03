import { b as useActor, d as useQuery, e as createActor } from "./index-CPElKy7J.js";
import { c as getStaticPlayers, e as enrichPlayersWithImages, s as searchStaticPlayers } from "./clawdbotPlayerProfile-CiM1Xaxo.js";
const STATIC_STALE_TIME = Number.POSITIVE_INFINITY;
const STATIC_GC_TIME = 30 * 6e4;
function usePlayers() {
  const { actor, isFetching } = useActor(createActor);
  const staticPlayers = getStaticPlayers();
  const hasStaticPlayers = staticPlayers.length > 0;
  return useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      if (hasStaticPlayers) {
        return enrichPlayersWithImages(staticPlayers);
      }
      if (!actor) return [];
      return enrichPlayersWithImages(await actor.getPlayers());
    },
    enabled: hasStaticPlayers || !isFetching,
    initialData: hasStaticPlayers ? enrichPlayersWithImages(staticPlayers) : void 0,
    staleTime: hasStaticPlayers ? STATIC_STALE_TIME : 12e4,
    gcTime: STATIC_GC_TIME
  });
}
function useSearchPlayers(term) {
  const { actor, isFetching } = useActor(createActor);
  const trimmedTerm = term.trim();
  const hasStaticPlayers = getStaticPlayers().length > 0;
  return useQuery({
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
    staleTime: hasStaticPlayers ? STATIC_STALE_TIME : 3e4,
    gcTime: STATIC_GC_TIME
  });
}
export {
  usePlayers as a,
  useSearchPlayers as u
};
