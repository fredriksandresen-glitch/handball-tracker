import { c as createLucideIcon, M as MatchStatus, j as jsxRuntimeExports, H as House, a as cn, h as useParams, u as useNavigate, r as reactExports, P as Position, g as Skeleton, L as Link, U as Users } from "./index-BrTjiQrP.js";
import { B as Button } from "./button-CpNExvJA.js";
import { g as getCountdown, f as formatMatchDate } from "./handballService-Dbax6PK1.js";
import { C as Clock, M as MapPin, u as useTeam, c as usePlayersByTeam, b as useNextMatchForTeam, A as ArrowLeft, a as ArrowRight } from "./useTeam-tdwq3tr2.js";
import { u as useFollowedPlayers, d as useFollowPlayer, c as useIsFollowing, a as useUnfollowPlayer, P as PositionBadge } from "./useFollowedPlayers-B96IBvp4.js";
import { c as usePlayerMatchStats } from "./usePlayer-C3a-quHL.js";
import { u as useTeams } from "./useTeams-DWX26GYj.js";
import { S as Shield } from "./shield-Bu1_p0xX.js";
import { m as motion } from "./proxy-DJ0N1V57.js";
import { T as Trophy } from "./trophy-BLR5dJLX.js";
import { U as User } from "./user-BnzOrMEL.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$2 = [
  ["path", { d: "M18 6 7 17l-5-5", key: "116fxf" }],
  ["path", { d: "m22 10-7.5 7.5L13 16", key: "ke71qq" }]
];
const CheckCheck = createLucideIcon("check-check", __iconNode$2);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [
  ["path", { d: "M15 3h6v6", key: "1q9fwt" }],
  ["path", { d: "M10 14 21 3", key: "gplh6r" }],
  ["path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6", key: "a6xqqp" }]
];
const ExternalLink = createLucideIcon("external-link", __iconNode$1);
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
      d: "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",
      key: "zw3jo"
    }
  ],
  [
    "path",
    {
      d: "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",
      key: "1wduqc"
    }
  ],
  [
    "path",
    {
      d: "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",
      key: "kqbvx6"
    }
  ]
];
const Layers = createLucideIcon("layers", __iconNode);
function MatchCard({
  match,
  teamId,
  homeTeamName,
  awayTeamName,
  className,
  showCountdown = true
}) {
  const isHome = teamId !== void 0 && match.homeTeamId === teamId;
  const isAway = teamId !== void 0 && match.awayTeamId === teamId;
  const isUpcoming = match.status === MatchStatus.Upcoming;
  const opponent = isHome ? awayTeamName : isAway ? homeTeamName : null;
  const locationLabel = isHome ? "HJEMME" : isAway ? "BORTE" : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "rounded-xl bg-card border border-border p-4 space-y-2",
        match.status === MatchStatus.Live && "border-chart-3/50 bg-chart-3/5",
        className
      ),
      "data-ocid": "match-card",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground", children: "Neste kamp" }),
          match.status === MatchStatus.Live && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 text-[10px] font-bold text-chart-3 uppercase tracking-wide", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-1.5 rounded-full bg-chart-3 animate-pulse" }),
            "Live"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-bold text-foreground text-base truncate flex-1 min-w-0", children: opponent ? `vs ${opponent}` : `${homeTeamName ?? "?"} — ${awayTeamName ?? "?"}` }),
          isUpcoming && showCountdown && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-primary font-display font-bold text-sm flex-shrink-0", children: getCountdown(match.startTime) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 flex-wrap", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 text-xs text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "size-3" }),
            formatMatchDate(match.startTime)
          ] }),
          locationLabel && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wide", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(House, { className: "size-3" }),
            locationLabel
          ] }),
          match.venue && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 text-xs text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { className: "size-3" }),
            match.venue
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            disabled: true,
            title: "Kampvisning kommer snart",
            className: "flex items-center gap-1 text-xs text-muted-foreground cursor-not-allowed opacity-50",
            "data-ocid": "match-view-btn",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-3" }),
              "Se kampvisning"
            ]
          }
        ) })
      ]
    }
  );
}
const POSITION_GROUPS = [
  { keys: [Position.Keeper], label: "Keepere" },
  { keys: [Position.Bakspiller], label: "Bakspillere" },
  { keys: [Position.VenstreKant, Position.HoyreKant], label: "Kantspillere" },
  { keys: [Position.Linje], label: "Linjespillere" }
];
function RosterPlayerCard({
  player,
  teamName
}) {
  const { data: isFollowing } = useIsFollowing(player.id);
  const followMutation = useFollowPlayer();
  const unfollowMutation = useUnfollowPlayer();
  const { data: matchStats = [] } = usePlayerMatchStats(player.id);
  const lastStat = reactExports.useMemo(() => {
    if (!matchStats.length) return null;
    return [...matchStats].sort((a, b) => Number(b.matchId - a.matchId))[0];
  }, [matchStats]);
  const lastGoals = lastStat ? Number((lastStat == null ? void 0 : lastStat.goals) ?? 0) : null;
  const lastMins = lastStat ? Number((lastStat == null ? void 0 : lastStat.minutesPlayed) ?? 0) : null;
  function handleFollow(e) {
    e.preventDefault();
    e.stopPropagation();
    if (isFollowing) {
      unfollowMutation.mutate(player.id);
    } else {
      followMutation.mutate(player.id);
    }
  }
  const isMutating = followMutation.isPending || unfollowMutation.isPending;
  const following = isFollowing ?? false;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Link,
    {
      to: "/player/$id",
      params: { id: player.id.toString() },
      className: "block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl",
      "data-ocid": "roster-player-card",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-muted", children: [
        player.imageUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: player.imageUrl,
            alt: player.name,
            className: "absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/60", children: /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "size-14 text-muted-foreground/40" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: handleFollow,
            disabled: isMutating,
            "aria-label": following ? "Slutt å følge" : "Følg spiller",
            className: cn(
              "absolute top-2.5 right-2.5 z-10 rounded-full transition-smooth",
              "min-w-[44px] h-[24px] px-2 flex items-center justify-center gap-1 text-[10px] font-display font-bold border backdrop-blur-sm",
              following ? "bg-white/20 border-white/30 text-white hover:bg-destructive/60 hover:border-destructive/60" : "bg-primary border-primary text-primary-foreground hover:bg-primary/80",
              isMutating && "opacity-50 pointer-events-none"
            ),
            "data-ocid": following ? "player-unfollow-btn" : "player-follow-btn",
            children: following ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCheck, { className: "size-3" }),
              "Følger"
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "size-3" }),
              "Følg"
            ] })
          }
        ),
        player.jerseyNumber !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-2.5 left-2.5 size-7 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display font-black text-[11px] text-white leading-none", children: player.jerseyNumber.toString() }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute bottom-0 left-0 right-0 px-3 pb-3 pt-10", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(PositionBadge, { position: player.position, variant: "overlay" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-black text-white text-[13px] leading-tight truncate mt-1 group-hover:text-primary/90 transition-colors drop-shadow-sm", children: player.name }),
          teamName && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-white/60 truncate font-body mt-0.5", children: teamName }),
          (lastGoals !== null || lastMins !== null && lastMins > 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mt-2 pt-2 border-t border-white/15", children: [
            lastGoals !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: cn(
                    "font-display font-black text-base leading-none",
                    lastGoals > 0 ? "text-primary" : "text-white/50"
                  ),
                  children: lastGoals
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[9px] text-white/50 uppercase tracking-wide mt-0.5", children: "Mål" })
            ] }),
            lastMins !== null && lastMins > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display font-bold text-sm leading-none text-white/80", children: lastMins }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[9px] text-white/50 uppercase tracking-wide mt-0.5", children: "Min" })
            ] })
          ] })
        ] })
      ] })
    }
  );
}
function SkeletonRosterCard() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-2xl overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "w-full aspect-[3/4]" }) });
}
function TeamPage() {
  const { id } = useParams({ from: "/team/$id" });
  const teamId = BigInt(id);
  const navigate = useNavigate();
  const { data: team, isLoading: loadingTeam } = useTeam(teamId);
  const { data: players = [], isLoading: loadingPlayers } = usePlayersByTeam(teamId);
  const { data: nextMatch } = useNextMatchForTeam(teamId);
  const { data: allTeams = [] } = useTeams();
  const { data: followedPlayers = [] } = useFollowedPlayers();
  const followPlayer = useFollowPlayer();
  const followedIds = reactExports.useMemo(
    () => new Set(followedPlayers.map((p) => p.id.toString())),
    [followedPlayers]
  );
  const teamsMap = reactExports.useMemo(() => {
    const map = {};
    for (const t of allTeams) map[t.id.toString()] = t.name;
    return map;
  }, [allTeams]);
  const homeTeamName = nextMatch ? teamsMap[nextMatch.homeTeamId.toString()] : void 0;
  const awayTeamName = nextMatch ? teamsMap[nextMatch.awayTeamId.toString()] : void 0;
  const allFollowed = players.length > 0 && players.every((p) => followedIds.has(p.id.toString()));
  function handleFollowAll() {
    const unfollowed = players.filter((p) => !followedIds.has(p.id.toString()));
    for (const p of unfollowed) followPlayer.mutate(p.id);
  }
  const groupedPlayers = reactExports.useMemo(
    () => POSITION_GROUPS.map((group) => ({
      label: group.label,
      players: players.filter(
        (p) => group.keys.includes(p.position)
      )
    })).filter((g) => g.players.length > 0),
    [players]
  );
  if (loadingTeam || loadingPlayers) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", "data-ocid": "team-page-loading", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => navigate({ to: "/teams" }),
          className: "flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground transition-colors",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "size-3.5" }),
            "Alle lag"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl bg-card border border-border p-5 space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "size-14 rounded-xl flex-shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-5 w-36" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-3.5 w-24" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 gap-3 pt-4 border-t border-border", children: [1, 2, 3].map((k) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-7 w-10" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-2.5 w-12" })
        ] }, k)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-20" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-3", children: [1, 2, 3, 4, 5, 6].map((k) => /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonRosterCard, {}, k)) })
      ] })
    ] });
  }
  if (!team) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-16 space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "size-10 text-muted-foreground mx-auto" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground font-body", children: "Lag ikke funnet" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/teams", className: "text-primary text-sm block", children: "← Tilbake til lag" })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 -mt-2", "data-ocid": "team-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => navigate({ to: "/teams" }),
        className: "flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground transition-colors",
        "data-ocid": "team-back-btn",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "size-3.5" }),
          "Alle lag"
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      motion.div,
      {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
        className: "rounded-xl bg-card border border-border p-5",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
            team.logoUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "img",
              {
                src: team.logoUrl,
                alt: team.name,
                className: "size-14 rounded-xl object-contain border border-border flex-shrink-0 bg-muted"
              }
            ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-14 rounded-xl bg-muted flex items-center justify-center border border-border flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "size-7 text-muted-foreground" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-display font-black text-xl text-foreground truncate", children: team.name }),
              team.standingsRank !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-1 text-sm text-muted-foreground mt-0.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Trophy, { className: "size-3.5 text-primary" }),
                team.standingsRank.toString(),
                ". plass i ligaen"
              ] })
            ] })
          ] }),
          (team.matchesPlayed !== void 0 || team.points !== void 0 || team.goalDifference !== void 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border", children: [
            team.matchesPlayed !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-display font-black text-xl text-foreground", children: team.matchesPlayed.toString() }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground uppercase tracking-wide", children: "Kamper" })
            ] }),
            team.points !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-display font-black text-xl text-primary", children: team.points.toString() }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground uppercase tracking-wide", children: "Poeng" })
            ] }),
            team.goalDifference !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: cn(
                    "block font-display font-black text-xl",
                    team.goalDifference >= 0n ? "text-chart-2" : "text-destructive"
                  ),
                  children: team.goalDifference > 0n ? `+${team.goalDifference}` : team.goalDifference.toString()
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground uppercase tracking-wide", children: "Målforskjell" })
            ] })
          ] })
        ]
      }
    ),
    nextMatch && /* @__PURE__ */ jsxRuntimeExports.jsx(
      MatchCard,
      {
        match: nextMatch,
        teamId: team.id,
        homeTeamName,
        awayTeamName
      }
    ),
    players.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", "data-ocid": "team-roster", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "size-4 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-display font-semibold text-foreground", children: [
            players.length,
            " spillere"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            size: "sm",
            variant: allFollowed ? "outline" : "default",
            disabled: allFollowed || followPlayer.isPending,
            onClick: handleFollowAll,
            className: cn(
              "h-8 px-4 rounded-full text-xs font-display font-bold gap-1.5",
              allFollowed ? "border-primary/40 text-primary" : "bg-primary text-primary-foreground hover:bg-primary/90"
            ),
            "data-ocid": "team-follow-all-btn",
            children: allFollowed ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCheck, { className: "size-3.5" }),
              "Følger alle"
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "size-3.5" }),
              "Følg alle"
            ] })
          }
        )
      ] }),
      groupedPlayers.map((group, gi) => /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "data-ocid": "team-position-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-3 px-0.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "size-3.5 text-muted-foreground flex-shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[11px] font-display font-bold uppercase tracking-widest text-muted-foreground", children: group.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto text-[10px] text-muted-foreground/60 font-body", children: group.players.length })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-3", children: group.players.map((player, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          motion.div,
          {
            initial: { opacity: 0, scale: 0.95 },
            animate: { opacity: 1, scale: 1 },
            transition: { delay: gi * 0.05 + i * 0.04, duration: 0.25 },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(RosterPlayerCard, { player, teamName: team.name })
          },
          player.id.toString()
        )) })
      ] }, group.label))
    ] }) : (
      /* Empty state */
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "rounded-xl bg-card border border-border py-14 flex flex-col items-center gap-3",
          "data-ocid": "team-roster-empty",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "size-10 text-muted-foreground" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground text-center font-body", children: "Ingen spillere i stallen" })
          ]
        }
      )
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl bg-card border border-border/60 px-5 py-4 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "size-4 text-muted-foreground flex-shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-body text-muted-foreground", children: "Utforsk andre lag" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Link,
        {
          to: "/teams",
          className: "flex items-center gap-1 text-primary text-sm font-display font-semibold hover:opacity-80 transition-opacity",
          "data-ocid": "team-explore-cta",
          children: [
            "Alle lag",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-3.5" })
          ]
        }
      )
    ] })
  ] });
}
export {
  TeamPage as default
};
