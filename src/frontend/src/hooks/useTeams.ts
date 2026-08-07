import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { createActor } from "../backend";
import { getStaticTeams } from "../services/clawdbotPlayerProfile";
import type { Match, Team } from "../types/handball";
import type { SeasonId } from "../data/seasons";

export function useTeams(seasonId?: SeasonId) {
  const staticTeams = getStaticTeams(seasonId);

  return useQuery<Team[]>({
    queryKey: ["teams", seasonId ?? "all"],
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
