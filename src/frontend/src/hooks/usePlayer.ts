import { useActor } from "@caffeineai/core-infrastructure";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createActor } from "../backend";
import {
  fetchClawdbotPlayerProfile,
  getStaticProfile,
  mapClawdbotMatchStats,
  mapClawdbotPlayer,
  mapClawdbotSeasonStats,
} from "../services/clawdbotPlayerProfile";
import type {
  Player,
  PlayerMatchStats,
  PlayerSeasonStats,
} from "../types/handball";

const STATIC_STALE_TIME = Number.POSITIVE_INFINITY;
const STATIC_GC_TIME = 30 * 60_000;

export function usePlayer(id: bigint) {
  const { actor, isFetching } = useActor(createActor);
  const staticProfile = getStaticProfile(id);

  return useQuery<Player | null>({
    queryKey: ["player", id.toString()],
    queryFn: async () => {
      if (staticProfile) return mapClawdbotPlayer(staticProfile);

      const clawdbotProfile = await fetchClawdbotPlayerProfile(id).catch(() => null);
      if (clawdbotProfile) return mapClawdbotPlayer(clawdbotProfile);

      if (!actor) return null;
      return actor.getPlayer(id);
    },
    enabled: !isFetching || !!staticProfile,
    initialData: staticProfile ? mapClawdbotPlayer(staticProfile) : undefined,
    staleTime: staticProfile ? STATIC_STALE_TIME : 60_000,
    gcTime: STATIC_GC_TIME,
  });
}

export function usePlayerMatchStats(playerId: bigint) {
  const { actor, isFetching } = useActor(createActor);
  const staticProfile = getStaticProfile(playerId);

  return useQuery<PlayerMatchStats[]>({
    queryKey: ["playerMatchStats", playerId.toString()],
    queryFn: async () => {
      if (staticProfile) return mapClawdbotMatchStats(staticProfile);

      const clawdbotProfile = await fetchClawdbotPlayerProfile(playerId).catch(
        () => null,
      );
      if (clawdbotProfile) return mapClawdbotMatchStats(clawdbotProfile);

      if (!actor) return [];
      return actor.getPlayerMatchStats(playerId);
    },
    enabled: !isFetching || !!staticProfile,
    initialData: staticProfile ? mapClawdbotMatchStats(staticProfile) : undefined,
    staleTime: staticProfile ? STATIC_STALE_TIME : 60_000,
    gcTime: STATIC_GC_TIME,
  });
}

export function usePlayerSeasonStats(playerId: bigint) {
  const { actor, isFetching } = useActor(createActor);
  const staticProfile = getStaticProfile(playerId);

  return useQuery<PlayerSeasonStats | null>({
    queryKey: ["playerSeasonStats", playerId.toString()],
    queryFn: async () => {
      if (staticProfile) return mapClawdbotSeasonStats(staticProfile);

      const clawdbotProfile = await fetchClawdbotPlayerProfile(playerId).catch(
        () => null,
      );
      if (clawdbotProfile) return mapClawdbotSeasonStats(clawdbotProfile);

      if (!actor) return null;
      return actor.getPlayerSeasonStats(playerId);
    },
    enabled: !isFetching || !!staticProfile,
    initialData: staticProfile
      ? mapClawdbotSeasonStats(staticProfile)
      : undefined,
    staleTime: staticProfile ? STATIC_STALE_TIME : 60_000,
    gcTime: STATIC_GC_TIME,
  });
}

export function usePlayerMatchStatsBatch(
  ids: bigint[],
): Record<string, PlayerMatchStats[]> {
  const uniqueIds = useMemo(
    () => Array.from(new Set(ids.map((id) => id.toString()))).map(BigInt),
    [ids],
  );

  const results = useQueries({
    queries: uniqueIds.map((id) => {
      const staticProfile = getStaticProfile(id);

      return {
        queryKey: ["playerMatchStats", id.toString()],
        queryFn: async () => {
          if (staticProfile) return mapClawdbotMatchStats(staticProfile);

          const clawdbotProfile = await fetchClawdbotPlayerProfile(id).catch(
            () => null,
          );
          if (clawdbotProfile) return mapClawdbotMatchStats(clawdbotProfile);

          return [];
        },
        enabled: true,
        initialData: staticProfile
          ? mapClawdbotMatchStats(staticProfile)
          : undefined,
        staleTime: staticProfile ? STATIC_STALE_TIME : 60_000,
        gcTime: STATIC_GC_TIME,
      };
    }),
  });

  return useMemo(() => {
    const map: Record<string, PlayerMatchStats[]> = {};
    for (let i = 0; i < uniqueIds.length; i++) {
      map[uniqueIds[i].toString()] =
        (results[i].data as PlayerMatchStats[] | undefined) ?? [];
    }
    return map;
  }, [uniqueIds, results]);
}
