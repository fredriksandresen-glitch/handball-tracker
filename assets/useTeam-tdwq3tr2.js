import { c as createLucideIcon, b as useQuery, d as useMockActor } from "./index-BrTjiQrP.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$3 = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
];
const ArrowLeft = createLucideIcon("arrow-left", __iconNode$3);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$2 = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
];
const ArrowRight = createLucideIcon("arrow-right", __iconNode$2);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polyline", { points: "12 6 12 12 16 14", key: "68esgv" }]
];
const Clock = createLucideIcon("clock", __iconNode$1);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  [
    "path",
    {
      d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
      key: "1r0f0z"
    }
  ],
  ["circle", { cx: "12", cy: "10", r: "3", key: "ilqhr7" }]
];
const MapPin = createLucideIcon("map-pin", __iconNode);
function useTeam(id) {
  const { actor } = useMockActor();
  return useQuery({
    queryKey: ["team", id.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getTeam(id);
    },
    enabled: !!actor && true,
    staleTime: 6e4
  });
}
function useNextMatchForTeam(teamId) {
  const { actor } = useMockActor();
  return useQuery({
    queryKey: ["nextMatch", teamId.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getNextMatchForTeam(teamId);
    },
    enabled: !!actor && true,
    staleTime: 6e4
  });
}
function usePlayersByTeam(teamId) {
  const { actor } = useMockActor();
  return useQuery({
    queryKey: ["playersByTeam", teamId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPlayersByTeam(teamId);
    },
    enabled: !!actor && true,
    staleTime: 6e4
  });
}
export {
  ArrowLeft as A,
  Clock as C,
  MapPin as M,
  ArrowRight as a,
  useNextMatchForTeam as b,
  usePlayersByTeam as c,
  useTeam as u
};
