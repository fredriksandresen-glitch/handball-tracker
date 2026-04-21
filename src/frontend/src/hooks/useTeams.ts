import { useMockActor } from "./useMockActor";
import { useQuery } from "@tanstack/react-query";
import { createActor } from "../backend-mock";
import type { Match, Team } from "../types/handball";

export function useTeams() {
  const { actor, isFetching } = useMockActor();
  return useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTeams();
    },
    enabled: !!actor && !isFetching,
    staleTime: 120_000,
  });
}

export function useUpcomingMatches() {
  const { actor, isFetching } = useMockActor();
  return useQuery<Match[]>({
    queryKey: ["upcomingMatches"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUpcomingMatches();
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}
