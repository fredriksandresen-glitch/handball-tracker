import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { createActor } from "../backend";
import { getStaticTeams } from "../services/clawdbotPlayerProfile";
import type { Match, Team } from "../types/handball";

export function useTeams() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: async () => {
      const staticTeams = getStaticTeams();
      if (staticTeams.length > 0) return staticTeams;

      if (!actor) return [];
      return actor.getTeams();
    },
    enabled: !isFetching || getStaticTeams().length > 0,
    staleTime: 120_000,
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
