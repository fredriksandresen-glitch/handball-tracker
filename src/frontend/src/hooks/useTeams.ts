import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { createActor } from "../backend";
import { getStaticTeams } from "../services/clawdbotPlayerProfile";
import type { Match, Team } from "../types/handball";

export function useTeams() {
  const staticTeams = getStaticTeams();

  return useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: async () => staticTeams,
    initialData: staticTeams,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useUpcomingMatches() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Match[]>({
    queryKey: ["upcomingMatches"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUpcomingMatches();
    },
    enabled: !isFetching,
    staleTime: 60_000,
  });
}
