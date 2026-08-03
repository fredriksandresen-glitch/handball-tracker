import { b as useActor, d as useQuery, e as createActor } from "./index-CPElKy7J.js";
import { d as getStaticTeams } from "./clawdbotPlayerProfile-CiM1Xaxo.js";
function useTeams() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const staticTeams = getStaticTeams();
      if (staticTeams.length > 0) return staticTeams;
      if (!actor) return [];
      return actor.getTeams();
    },
    enabled: !isFetching || getStaticTeams().length > 0,
    staleTime: 12e4
  });
}
export {
  useTeams as u
};
