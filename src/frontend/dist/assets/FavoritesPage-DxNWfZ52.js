import { c as createLucideIcon, j as jsxRuntimeExports, f as SkeletonCard, L as Link, g as Star, S as Search, r as reactExports } from "./index-urhzO2zV.js";
import { P as PlayerCard } from "./PlayerCard-Yq8EvZT1.js";
import { u as useFollowedPlayers, a as useUnfollowPlayer, d as useFollowPlayer } from "./useFollowedPlayers-BzkFyYPh.js";
import { a as usePlayers } from "./usePlayers-a4O0FK60.js";
import { u as useTeams } from "./useTeams-BxId6XoH.js";
import { m as motion } from "./proxy-Bzlgllao.js";
import { S as Shield } from "./shield-pPFJhFNE.js";
import "./button-Ca3rB_wU.js";
import "./user-BzLonnf2.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
  ["line", { x1: "19", x2: "19", y1: "8", y2: "14", key: "1bvyxn" }],
  ["line", { x1: "22", x2: "16", y1: "11", y2: "11", key: "1shjgl" }]
];
const UserPlus = createLucideIcon("user-plus", __iconNode);
function RecommendedPlayerCard({
  playerId,
  teamName
}) {
  const { data: allPlayers } = usePlayers();
  const { data: followedPlayers = [] } = useFollowedPlayers();
  const followMutation = useFollowPlayer();
  const player = allPlayers == null ? void 0 : allPlayers.find((p) => p.id === playerId);
  if (!player) return null;
  const isAlreadyFollowing = followedPlayers.some((p) => p.id === playerId);
  if (isAlreadyFollowing) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 rounded-xl bg-card border border-border px-3 py-2.5 min-w-[160px] flex-shrink-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-8 rounded-full bg-muted flex items-center justify-center border border-border flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-display font-bold text-muted-foreground", children: player.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-bold text-[12px] text-foreground truncate", children: player.name.split(" ").at(-1) }),
      teamName && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground truncate", children: teamName })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        onClick: () => followMutation.mutate(player.id),
        disabled: followMutation.isPending,
        "aria-label": `Følg ${player.name}`,
        className: "flex-shrink-0 size-7 rounded-full bg-primary/15 border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-smooth flex items-center justify-center",
        "data-ocid": "recommended-follow-btn",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(UserPlus, { className: "size-3.5" })
      }
    )
  ] });
}
function RecommendedSection() {
  const { data: followedPlayers = [] } = useFollowedPlayers();
  const { data: allPlayers = [] } = usePlayers();
  const { data: teams = [] } = useTeams();
  const teamMap = reactExports.useMemo(
    () => new Map(teams.map((t) => [t.id.toString(), t.name])),
    [teams]
  );
  const followedIds = new Set(followedPlayers.map((p) => p.id.toString()));
  const followedTeamIds = new Set(
    followedPlayers.map((p) => p.teamId.toString())
  );
  const suggestions = reactExports.useMemo(
    () => allPlayers.filter(
      (p) => !followedIds.has(p.id.toString()) && followedTeamIds.has(p.teamId.toString())
    ).slice(0, 4),
    [allPlayers, followedIds, followedTeamIds]
  );
  if (suggestions.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2.5", "data-ocid": "recommended-players", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground", children: "Anbefalte spillere" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2 overflow-x-auto scrollbar-none pb-1", children: suggestions.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      RecommendedPlayerCard,
      {
        playerId: p.id,
        teamName: teamMap.get(p.teamId.toString())
      },
      p.id.toString()
    )) })
  ] });
}
function EmptyFavorites() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "flex flex-col items-center justify-center min-h-[62vh] text-center px-6",
      "data-ocid": "favorites-empty",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Star, { className: "size-10 text-primary", strokeWidth: 1.5 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-display font-bold text-xl text-foreground mb-2", children: "Ingen favoritter ennå" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm leading-relaxed max-w-[280px] mb-8", children: "Du følger ingen spillere ennå. Utforsk lag eller søk etter spillere for å begynne å bygge feeden din." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row gap-3 w-full max-w-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Link,
            {
              to: "/search",
              className: "flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground font-display font-bold text-sm px-6 py-3 flex-1 transition-smooth hover:bg-primary/90",
              "data-ocid": "favorites-search-cta",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "size-4" }),
                "Søk spillere"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Link,
            {
              to: "/teams",
              className: "flex items-center justify-center gap-2 rounded-full bg-card border border-border text-foreground font-display font-bold text-sm px-6 py-3 flex-1 transition-smooth hover:border-primary/40",
              "data-ocid": "favorites-teams-cta",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "size-4" }),
                "Se lag"
              ]
            }
          )
        ] })
      ]
    }
  );
}
function FavoritesPage() {
  const { data: followedPlayers, isLoading } = useFollowedPlayers();
  const unfollowMutation = useUnfollowPlayer();
  const { data: teams } = useTeams();
  const teamMap = new Map(
    (teams ?? []).map((t) => [t.id.toString(), t.name])
  );
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", "data-ocid": "favorites-loading", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "player" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "player" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "player" })
    ] });
  }
  const players = followedPlayers ?? [];
  if (players.length === 0) return /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyFavorites, {});
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", "data-ocid": "favorites-list", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground", children: [
        players.length,
        " ",
        players.length === 1 ? "spiller" : "spillere",
        " fulgt"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Link,
        {
          to: "/search",
          className: "text-[11px] font-display font-semibold text-primary hover:underline",
          "data-ocid": "favorites-add-more",
          children: "+ Legg til"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-3", children: players.map((player, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      motion.div,
      {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: i * 0.06 },
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          PlayerCard,
          {
            player,
            teamName: teamMap.get(player.teamId.toString()),
            isFollowing: true,
            onUnfollow: () => unfollowMutation.mutate(player.id),
            isLoading: unfollowMutation.isPending
          }
        )
      },
      player.id.toString()
    )) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(RecommendedSection, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-2 border-t border-border mt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Link,
      {
        to: "/teams",
        className: "flex items-center justify-center gap-2 w-full rounded-xl bg-card border border-border py-3 text-sm font-display font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground transition-smooth",
        "data-ocid": "favorites-discover-teams",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "size-4" }),
          "Utforsk lag for å finne flere spillere"
        ]
      }
    ) })
  ] });
}
export {
  FavoritesPage as default
};
