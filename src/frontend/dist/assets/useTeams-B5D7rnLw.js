import { b as useQuery, d as useMockActor } from "./index-BUh7ltUv.js";
function useTeams() {
  const { actor } = useMockActor();
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTeams();
    },
    enabled: !!actor && true,
    staleTime: 12e4
  });
}
function useUpcomingMatches() {
  const { actor } = useMockActor();
  return useQuery({
    queryKey: ["upcomingMatches"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUpcomingMatches();
    },
    enabled: !!actor && true,
    staleTime: 6e4
  });
}
export {
  useUpcomingMatches as a,
  useTeams as u
};
