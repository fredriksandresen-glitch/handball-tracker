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
      if (!actor) return getStaticTeams();
      const teams = await actor.getTeams();
      return teams.length > 0 ? teams : getStaticTeams();
    },
    enabled: !isFetching,
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
