import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActor } from "../backend";
import type { ProfixioStatus } from "../backend.d";

export function useProfixioStatus() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<ProfixioStatus>({
    queryKey: ["profixioStatus"],
    queryFn: async () => {
      if (!actor)
        return {
          isLive: false,
          dataSource: "mock",
          message: "Ikke tilkoblet",
          liveStatsCount: BigInt(0),
          lastSync: undefined,
        };
      return actor.getProfixioStatus();
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export interface DataStatus {
  playerCount: number;
  teamCount: number;
  dataSource: string;
  liveStatsCount: number;
  statsSource: string;
}

export function useDataStatus() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<DataStatus>({
    queryKey: ["dataStatus"],
    queryFn: async () => {
      if (!actor)
        return {
          playerCount: 0,
          teamCount: 0,
          dataSource: "mock",
          liveStatsCount: 0,
          statsSource: "mock",
        };

      // Try getDataStatus() if backend has added it, else fall back to counting
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const a = actor as any;
        if (typeof a.getDataStatus === "function") {
          const result = await a.getDataStatus();
          return {
            playerCount: Number(result.playerCount),
            teamCount: Number(result.teamCount),
            dataSource: result.dataSource as string,
            liveStatsCount: Number(result.liveStatsCount ?? 0),
            statsSource: (result.statsSource as string) ?? "mock",
          };
        }
      } catch {
        // fall through to manual count
      }

      // Fallback: count via existing methods
      const [players, teams, status] = await Promise.all([
        actor.getPlayers().catch(() => []),
        actor.getTeams().catch(() => []),
        actor.getProfixioStatus().catch(() => null),
      ]);

      return {
        playerCount: players.length,
        teamCount: teams.length,
        dataSource: status?.dataSource ?? (status?.isLive ? "live" : "mock"),
        liveStatsCount: Number(status?.liveStatsCount ?? 0),
        statsSource: "mock",
      };
    },
    enabled: !!actor && !isFetching,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}

export function useRefreshProfixio() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Ingen tilkobling");
      return actor.refreshFromProfixio();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profixioStatus"] });
      qc.invalidateQueries({ queryKey: ["dataStatus"] });
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["players"] });
      qc.invalidateQueries({ queryKey: ["upcomingMatches"] });
      qc.invalidateQueries({ queryKey: ["feedEvents"] });
    },
  });
}
