import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createActor } from "../backend";
import type {
  Player,
  PlayerMatchStats,
  PlayerSeasonStats,
} from "../types/handball";

export function usePlayer(id: bigint) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Player | null>({
    queryKey: ["player", id.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getPlayer(id);
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

export function usePlayerMatchStats(playerId: bigint) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<PlayerMatchStats[]>({
    queryKey: ["playerMatchStats", playerId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPlayerMatchStats(playerId);
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

export function usePlayerSeasonStats(playerId: bigint) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<PlayerSeasonStats | null>({
    queryKey: ["playerSeasonStats", playerId.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getPlayerSeasonStats(playerId);
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

// Batch hook: returns a map of playerId -> PlayerMatchStats[]
// Uses individual usePlayerMatchStats calls to leverage query cache
function useSingleMatchStats(id: bigint, enabled: boolean) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<PlayerMatchStats[]>({
    queryKey: ["playerMatchStats", id.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPlayerMatchStats(id);
    },
    enabled: enabled && !!actor && !isFetching,
    staleTime: 60_000,
  });
}

export function usePlayerMatchStatsBatch(
  ids: bigint[],
): Record<string, PlayerMatchStats[]> {
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

  return useMemo(() => {
    const map: Record<string, PlayerMatchStats[]> = {};
    const results = [r0, r1, r2, r3, r4];
    for (let i = 0; i < ids.length && i < 5; i++) {
      map[ids[i].toString()] = results[i].data ?? [];
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, r0, r1, r2, r3, r4]);
}
