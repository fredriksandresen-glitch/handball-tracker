import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { createActor } from "../backend";
import type { Match, Player, Team } from "../types/handball";

export function useTeam(id: bigint) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Team | null>({
    queryKey: ["team", id.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getTeam(id);
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

export function useNextMatchForTeam(teamId: bigint) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Match | null>({
    queryKey: ["nextMatch", teamId.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getNextMatchForTeam(teamId);
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

export function usePlayersByTeam(teamId: bigint) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Player[]>({
    queryKey: ["playersByTeam", teamId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPlayersByTeam(teamId);
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}
