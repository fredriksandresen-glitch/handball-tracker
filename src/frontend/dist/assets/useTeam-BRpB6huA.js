import { c as createLucideIcon, b as useActor, d as useQuery, e as createActor } from "./index-CPElKy7J.js";
import { f as getStaticTeam, c as getStaticPlayers } from "./clawdbotPlayerProfile-CiM1Xaxo.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
];
const ArrowLeft = createLucideIcon("arrow-left", __iconNode$1);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
];
const ArrowRight = createLucideIcon("arrow-right", __iconNode);
function useTeam(id) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["team", id.toString()],
    queryFn: async () => {
      const staticTeam = getStaticTeam(id);
      if (staticTeam) return staticTeam;
      if (!actor) return null;
      return actor.getTeam(id);
    },
    enabled: !isFetching || !!getStaticTeam(id),
    staleTime: 6e4
  });
}
function useNextMatchForTeam(teamId) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["nextMatch", teamId.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getNextMatchForTeam(teamId);
    },
    enabled: !isFetching,
    staleTime: 6e4
  });
}
function usePlayersByTeam(teamId) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["playersByTeam", teamId.toString()],
    queryFn: async () => {
      const staticPlayers = getStaticPlayers().filter(
        (player) => player.teamId === teamId
      );
      if (staticPlayers.length > 0) return staticPlayers;
      if (!actor) return [];
      return actor.getPlayersByTeam(teamId);
    },
    enabled: !isFetching || getStaticPlayers().length > 0,
    staleTime: 6e4
  });
}
export {
  ArrowLeft as A,
  ArrowRight as a,
  usePlayersByTeam as b,
  useNextMatchForTeam as c,
  useTeam as u
};
