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
import type { SeasonId } from "../data/seasons";

const STATIC_STALE_TIME = Number.POSITIVE_INFINITY;
const STATIC_GC_TIME = 30 * 60_000;

export function usePlayer(id: bigint, seasonId?: SeasonId) {
  const { actor, isFetching } = useActor(createActor);
  const seasonProfile = getStaticProfile(id, seasonId);
  const staticProfile = seasonProfile ?? getStaticProfile(id);

  return useQuery<Player | null>({
    queryKey: ["player", id.toString(), seasonId ?? "all"],
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

export function usePlayerMatchStats(playerId: bigint, seasonId?: SeasonId) {
  const { actor, isFetching } = useActor(createActor);
  const staticProfile = getStaticProfile(playerId, seasonId);

  return useQuery<PlayerMatchStats[]>({
    queryKey: ["playerMatchStats", playerId.toString(), seasonId ?? "all"],
    queryFn: async () => {
      if (staticProfile) return mapClawdbotMatchStats(staticProfile);
      if (seasonId) return [];

      const clawdbotProfile = await fetchClawdbotPlayerProfile(playerId).catch(
        () => null,
      );
      if (clawdbotProfile) return mapClawdbotMatchStats(clawdbotProfile);

      if (seasonId) return [];
      if (!actor) return [];
      return actor.getPlayerMatchStats(playerId);
    },
    enabled: !isFetching || !!staticProfile,
    initialData: staticProfile ? mapClawdbotMatchStats(staticProfile) : undefined,
    staleTime: staticProfile ? STATIC_STALE_TIME : 60_000,
    gcTime: STATIC_GC_TIME,
  });
}

export function usePlayerSeasonStats(playerId: bigint, seasonId?: SeasonId) {
  const { actor, isFetching } = useActor(createActor);
  const staticProfile = getStaticProfile(playerId, seasonId);

  return useQuery<PlayerSeasonStats | null>({
    queryKey: ["playerSeasonStats", playerId.toString(), seasonId ?? "all"],
    queryFn: async () => {
      if (staticProfile) return mapClawdbotSeasonStats(staticProfile);
      if (seasonId) return null;

      const clawdbotProfile = await fetchClawdbotPlayerProfile(playerId).catch(
        () => null,
      );
      if (clawdbotProfile) return mapClawdbotSeasonStats(clawdbotProfile);

      if (seasonId) return null;
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
