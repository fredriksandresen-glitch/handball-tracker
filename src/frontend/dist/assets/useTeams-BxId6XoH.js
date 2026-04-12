import { b as useActor, d as useQuery, e as createActor } from "./index-urhzO2zV.js";
function useTeams() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTeams();
    },
    enabled: !!actor && !isFetching,
    staleTime: 12e4
  });
}
function useUpcomingMatches() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["upcomingMatches"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUpcomingMatches();
    },
    enabled: !!actor && !isFetching,
    staleTime: 6e4
  });
}
export {
  useUpcomingMatches as a,
  useTeams as u
};
