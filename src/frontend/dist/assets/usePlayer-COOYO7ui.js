import { r as reactExports, b as useQuery, d as useMockActor } from "./index-BUh7ltUv.js";
function usePlayer(id) {
  const { actor } = useMockActor();
  return useQuery({
    queryKey: ["player", id.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getPlayer(id);
    },
    enabled: !!actor && true,
    staleTime: 6e4
  });
}
function usePlayerMatchStats(playerId) {
  const { actor } = useMockActor();
  return useQuery({
    queryKey: ["playerMatchStats", playerId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPlayerMatchStats(playerId);
    },
    enabled: !!actor && true,
    staleTime: 6e4
  });
}
function usePlayerSeasonStats(playerId) {
  const { actor } = useMockActor();
  return useQuery({
    queryKey: ["playerSeasonStats", playerId.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getPlayerSeasonStats(playerId);
    },
    enabled: !!actor && true,
    staleTime: 6e4
  });
}
function useSingleMatchStats(id, enabled) {
  const { actor } = useMockActor();
  return useQuery({
    queryKey: ["playerMatchStats", id.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPlayerMatchStats(id);
    },
    enabled: enabled && !!actor && true,
    staleTime: 6e4
  });
}
function usePlayerMatchStatsBatch(ids) {
  const id0 = ids[0] ?? 0n;
  const id1 = ids[1] ?? 0n;
  const id2 = ids[2] ?? 0n;
  const id3 = ids[3] ?? 0n;
  const id4 = ids[4] ?? 0n;
  const r0 = useSingleMatchStats(id0, ids.length > 0);
  const r1 = useSingleMatchStats(id1, ids.length > 1);
  const r2 = useSingleMatchStats(id2, ids.length > 2);
  const r3 = useSingleMatchStats(id3, ids.length > 3);
  const r4 = useSingleMatchStats(id4, ids.length > 4);
  return reactExports.useMemo(() => {
    const map = {};
    const results = [r0, r1, r2, r3, r4];
    for (let i = 0; i < ids.length && i < 5; i++) {
      map[ids[i].toString()] = results[i].data ?? [];
    }
    return map;
  }, [ids, r0, r1, r2, r3, r4]);
}
export {
  usePlayerSeasonStats as a,
  usePlayer as b,
  usePlayerMatchStats as c,
  usePlayerMatchStatsBatch as u
};
