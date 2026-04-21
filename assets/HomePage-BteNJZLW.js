import { c as createLucideIcon, u as useNavigate, F as FeedEventType, j as jsxRuntimeExports, a as cn, b as useQuery, d as useMockActor, r as reactExports, L as Link, S as Search, e as SkeletonCard, P as Position, U as Users } from "./index-BrTjiQrP.js";
import { c as computeFormSparkline, g as getCountdown, f as formatMatchDate } from "./handballService-Dbax6PK1.js";
import { P as PositionBadge, u as useFollowedPlayers, a as useUnfollowPlayer, b as POSITION_LABELS } from "./useFollowedPlayers-B96IBvp4.js";
import { m as motion } from "./proxy-DJ0N1V57.js";
import { u as usePlayerMatchStatsBatch } from "./usePlayer-C3a-quHL.js";
import { u as useTeams } from "./useTeams-DWX26GYj.js";
import { S as Shield } from "./shield-Bu1_p0xX.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["line", { x1: "21", x2: "14", y1: "4", y2: "4", key: "obuewd" }],
  ["line", { x1: "10", x2: "3", y1: "4", y2: "4", key: "1q6298" }],
  ["line", { x1: "21", x2: "12", y1: "12", y2: "12", key: "1iu8h1" }],
  ["line", { x1: "8", x2: "3", y1: "12", y2: "12", key: "ntss68" }],
  ["line", { x1: "21", x2: "16", y1: "20", y2: "20", key: "14d8ph" }],
  ["line", { x1: "12", x2: "3", y1: "20", y2: "20", key: "m0wm8r" }],
  ["line", { x1: "14", x2: "14", y1: "2", y2: "6", key: "14e1ph" }],
  ["line", { x1: "8", x2: "8", y1: "10", y2: "14", key: "1i6ji0" }],
  ["line", { x1: "16", x2: "16", y1: "18", y2: "22", key: "1lctlv" }]
];
const SlidersHorizontal = createLucideIcon("sliders-horizontal", __iconNode);
function Sparkline({ values }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const W = 48;
  const H = 20;
  const pts = values.map((v, i) => {
    const x = i / (values.length - 1) * W;
    const y = H - v / max * (H - 3) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      width: W,
      height: H,
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "Formkurve",
      className: "flex-shrink-0 opacity-80",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("title", { children: "Formkurve siste kamper" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "polyline",
          {
            points: pts.join(" "),
            fill: "none",
            strokeWidth: "1.8",
            stroke: "white",
            strokeLinecap: "round",
            strokeLinejoin: "round"
          }
        )
      ]
    }
  );
}
function NextMatchPill({ teamId }) {
  var _a, _b;
  const { actor } = useMockActor();
  const { data: nextMatch } = useQuery({
    queryKey: ["nextMatch", teamId.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getNextMatchForTeam(teamId);
    },
    enabled: !!actor && true,
    staleTime: 6e4
  });
  const { data: homeTeam } = useQuery({
    queryKey: ["team", ((_a = nextMatch == null ? void 0 : nextMatch.homeTeamId) == null ? void 0 : _a.toString()) ?? "none"],
    queryFn: async () => {
      if (!actor || !nextMatch) return null;
      return actor.getTeam(nextMatch.homeTeamId);
    },
    enabled: !!actor && true && !!nextMatch,
    staleTime: 12e4
  });
  const { data: awayTeam } = useQuery({
    queryKey: ["team", ((_b = nextMatch == null ? void 0 : nextMatch.awayTeamId) == null ? void 0 : _b.toString()) ?? "none"],
    queryFn: async () => {
      if (!actor || !nextMatch) return null;
      return actor.getTeam(nextMatch.awayTeamId);
    },
    enabled: !!actor && true && !!nextMatch,
    staleTime: 12e4
  });
  if (!nextMatch) return null;
  const isHome = nextMatch.homeTeamId === teamId;
  const opponentName = isHome ? awayTeam == null ? void 0 : awayTeam.name : homeTeam == null ? void 0 : homeTeam.name;
  const countdown = getCountdown(nextMatch.startTime);
  const dateStr = formatMatchDate(nextMatch.startTime);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 mt-1.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] uppercase tracking-wider text-white/50 font-display font-bold flex-shrink-0", children: "Neste" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-white/80 truncate min-w-0", children: [
      isHome ? "vs" : "@",
      " ",
      opponentName ?? "–"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-shrink-0 text-[9px] font-display font-bold text-white bg-white/15 px-1.5 py-0.5 rounded-full border border-white/20", children: countdown }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] text-white/50 hidden sm:block flex-shrink-0", children: dateStr })
  ] });
}
const TEAM_BG_CLASSES = {
  vipers: "bg-gradient-to-br from-purple-900 to-purple-700",
  storhamar: "bg-gradient-to-br from-red-900 to-red-700",
  larvik: "bg-gradient-to-br from-blue-900 to-blue-700",
  fjellhammer: "bg-gradient-to-br from-green-900 to-green-700",
  byåsen: "bg-gradient-to-br from-orange-900 to-orange-700",
  fana: "bg-gradient-to-br from-sky-900 to-sky-700",
  rælingen: "bg-gradient-to-br from-yellow-900 to-yellow-700",
  kolstad: "bg-gradient-to-br from-indigo-900 to-indigo-700",
  gjerpen: "bg-gradient-to-br from-teal-900 to-teal-700",
  oppsal: "bg-gradient-to-br from-rose-900 to-rose-700",
  fredrikstad: "bg-gradient-to-br from-cyan-900 to-cyan-700",
  stabæk: "bg-gradient-to-br from-lime-900 to-lime-700"
};
function placeholderBg(teamName) {
  const lower = teamName.toLowerCase();
  for (const [key, cls] of Object.entries(TEAM_BG_CLASSES)) {
    if (lower.includes(key)) return cls;
  }
  return "bg-gradient-to-br from-muted to-muted/70";
}
function FeedPlayerCard({
  player,
  teamName,
  feedEvents,
  onUnfollow,
  isUnfollowLoading,
  matchStats = [],
  index = 0
}) {
  const navigate = useNavigate();
  const lastGoalEvent = feedEvents.filter((e) => e.eventType === FeedEventType.GoalsScored).at(-1);
  const lastMinEvent = feedEvents.filter((e) => e.eventType === FeedEventType.MinutesPlayed).at(-1);
  const sparkValues = computeFormSparkline(
    matchStats.map((s) => ({ goals: s.goals }))
  );
  function handleCardClick() {
    navigate({ to: "/player/$id", params: { id: player.id.toString() } });
  }
  function handleUnfollow(e) {
    e.stopPropagation();
    onUnfollow();
  }
  const bgClass = placeholderBg(teamName);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    motion.button,
    {
      type: "button",
      onClick: handleCardClick,
      initial: { opacity: 0, scale: 0.96 },
      animate: { opacity: 1, scale: 1 },
      transition: { delay: index * 0.06, duration: 0.3 },
      whileHover: { scale: 1.02 },
      whileTap: { scale: 0.97 },
      "aria-label": `Vis profil for ${player.name}`,
      className: "w-full text-left rounded-2xl overflow-hidden cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-subtle hover:shadow-elevated transition-smooth",
      "data-ocid": "feed-player-card",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("relative w-full aspect-[3/4]", bgClass), children: [
        player.imageUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: player.imageUrl,
            alt: player.name,
            className: "absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center opacity-20", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display font-black text-7xl text-white", children: player.name.charAt(0).toUpperCase() }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" }),
        player.jerseyNumber !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-2.5 left-2.5 size-7 rounded-full bg-black/50 backdrop-blur-sm border border-white/25 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display font-black text-[11px] text-white leading-none", children: player.jerseyNumber.toString() }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: handleUnfollow,
            disabled: isUnfollowLoading,
            "aria-label": "Slutt å følge",
            className: "absolute top-2.5 right-2.5 size-7 rounded-full bg-black/50 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white/70 hover:bg-destructive/70 hover:text-white hover:border-destructive/60 transition-smooth",
            "data-ocid": "feed-player-unfollow",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm leading-none font-bold", children: "×" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute bottom-0 left-0 right-0 px-3 pb-3 pt-10", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PositionBadge, { position: player.position, variant: "overlay" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-black text-white text-sm leading-tight truncate drop-shadow-sm", children: player.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-white/65 truncate mt-0.5 font-body", children: teamName }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between mt-2 pt-2 border-t border-white/15", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3", children: [
              (lastGoalEvent == null ? void 0 : lastGoalEvent.statValue) !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-display font-black text-xl text-white leading-none", children: lastGoalEvent.statValue.toString() }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[8px] uppercase tracking-wide text-white/55 mt-0.5", children: "Mål sist" })
              ] }),
              (lastMinEvent == null ? void 0 : lastMinEvent.statValue) !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-display font-bold text-base text-white/85 leading-none", children: lastMinEvent.statValue.toString() }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[8px] uppercase tracking-wide text-white/55 mt-0.5", children: "Min" })
              ] })
            ] }),
            sparkValues.length >= 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-end gap-0.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkline, { values: sparkValues }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[8px] uppercase tracking-wide text-white/45", children: "Form" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(NextMatchPill, { teamId: player.teamId })
        ] })
      ] })
    }
  );
}
function useFeedEvents() {
  const { actor } = useMockActor();
  return useQuery({
    queryKey: ["feedEvents"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFeedEvents();
    },
    enabled: !!actor && true,
    staleTime: 6e4,
    refetchInterval: 12e4
  });
}
const SORT_OPTIONS = [
  { value: "activity", label: "Siste aktivitet" },
  { value: "goals", label: "Flest mål" },
  { value: "minutes", label: "Mest spilletid" },
  { value: "form", label: "Beste form" }
];
const ALL_POSITIONS = Object.values(Position);
function getTeamName(teamId, teams) {
  var _a;
  return ((_a = teams.find((t) => t.id === teamId)) == null ? void 0 : _a.name) ?? "";
}
function sortPlayers(players, sort, events) {
  const copy = [...players];
  if (sort === "activity") {
    return copy.sort((a, b) => {
      const aLast = Math.max(
        0,
        ...events.filter((e) => e.playerId === a.id).map((e) => Number(e.createdAt))
      );
      const bLast = Math.max(
        0,
        ...events.filter((e) => e.playerId === b.id).map((e) => Number(e.createdAt))
      );
      return bLast - aLast;
    });
  }
  if (sort === "goals") {
    return copy.sort((a, b) => {
      const aG = events.filter(
        (e) => e.playerId === a.id && e.eventType === FeedEventType.GoalsScored
      ).reduce((s, e) => s + Number(e.statValue ?? 0n), 0);
      const bG = events.filter(
        (e) => e.playerId === b.id && e.eventType === FeedEventType.GoalsScored
      ).reduce((s, e) => s + Number(e.statValue ?? 0n), 0);
      return bG - aG;
    });
  }
  if (sort === "minutes") {
    return copy.sort((a, b) => {
      const aM = events.filter(
        (e) => e.playerId === a.id && e.eventType === FeedEventType.MinutesPlayed
      ).reduce((s, e) => s + Number(e.statValue ?? 0n), 0);
      const bM = events.filter(
        (e) => e.playerId === b.id && e.eventType === FeedEventType.MinutesPlayed
      ).reduce((s, e) => s + Number(e.statValue ?? 0n), 0);
      return bM - aM;
    });
  }
  return copy.sort((a, b) => {
    const aF = events.filter(
      (e) => e.playerId === a.id && e.eventType === FeedEventType.GoalsScored
    ).length;
    const bF = events.filter(
      (e) => e.playerId === b.id && e.eventType === FeedEventType.GoalsScored
    ).length;
    return bF - aF;
  });
}
function EmptyFeed() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "flex flex-col items-center justify-center px-6 py-20 text-center min-h-[60vh]",
      "data-ocid": "feed-empty-state",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mb-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-24 rounded-full bg-primary/8 border border-primary/20 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "size-10 text-primary/60" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -bottom-1 -right-1 size-8 rounded-full bg-muted border border-border flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base", children: "⭐" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-display font-black text-2xl text-foreground mb-2 leading-tight tracking-tight", children: "Ingen spillere fulgt ennå" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm leading-relaxed max-w-[280px] mb-8", children: "Følg spillere for å se dem her. Søk etter en spiller eller utforsk et lag." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3 w-full max-w-[280px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Link,
            {
              to: "/search",
              className: "flex items-center justify-center gap-2.5 rounded-xl bg-primary text-primary-foreground font-display font-bold text-[15px] px-6 py-3.5 transition-smooth hover:bg-primary/90 shadow-subtle",
              "data-ocid": "empty-state-search-link",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "size-4.5" }),
                "Søk etter spillere"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Link,
            {
              to: "/teams",
              className: "flex items-center justify-center gap-2.5 rounded-xl bg-card border border-border text-foreground font-display font-bold text-[15px] px-6 py-3.5 transition-smooth hover:border-primary/40 hover:bg-muted/40",
              "data-ocid": "empty-state-teams-link",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "size-4.5" }),
                "Se lag"
              ]
            }
          )
        ] })
      ]
    }
  );
}
function SortPills({
  active,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "flex gap-2 overflow-x-auto scrollbar-none",
      "data-ocid": "feed-sort-pills",
      children: SORT_OPTIONS.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => onChange(opt.value),
          className: cn(
            "flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-display font-semibold border transition-smooth",
            active === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
          ),
          "data-ocid": `sort-${opt.value}`,
          children: opt.label
        },
        opt.value
      ))
    }
  );
}
function FilterBar({
  positions,
  teams,
  activePos,
  activeTeamId,
  onPosChange,
  onTeamChange
}) {
  const [open, setOpen] = reactExports.useState(false);
  const activeCount = (activePos !== "all" ? 1 : 0) + (activeTeamId !== "all" ? 1 : 0);
  if (positions.length === 0 && teams.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => setOpen((p) => !p),
        className: cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-display font-semibold border transition-smooth",
          open || activeCount > 0 ? "bg-primary/15 border-primary/40 text-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
        ),
        "data-ocid": "feed-filter-toggle",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SlidersHorizontal, { className: "size-3" }),
          "Filter",
          activeCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold leading-none", children: activeCount })
        ]
      }
    ),
    open && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-3", children: [
      positions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 font-display font-semibold", children: "Posisjon" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "flex gap-2 flex-wrap",
            "data-ocid": "feed-position-filter",
            children: ["all", ...positions].map((pos) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => onPosChange(pos),
                className: cn(
                  "rounded-full px-3 py-1 text-xs font-display font-semibold border transition-smooth",
                  activePos === pos ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40"
                ),
                children: pos === "all" ? "Alle" : POSITION_LABELS[pos] ?? pos
              },
              pos
            ))
          }
        )
      ] }),
      teams.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 font-display font-semibold", children: "Lag" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "flex gap-2 flex-wrap",
            "data-ocid": "feed-team-filter",
            children: [
              { id: "all", name: "Alle lag" },
              ...teams
            ].map((t) => {
              const key = t.id === "all" ? "all" : t.id.toString();
              return /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => onTeamChange(key),
                  className: cn(
                    "rounded-full px-3 py-1 text-xs font-display font-semibold border transition-smooth",
                    activeTeamId === key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40"
                  ),
                  children: t.name
                },
                key
              );
            })
          }
        )
      ] })
    ] })
  ] });
}
function HomePage() {
  const [sort, setSort] = reactExports.useState("activity");
  const [posFilter, setPosFilter] = reactExports.useState("all");
  const [teamFilter, setTeamFilter] = reactExports.useState("all");
  const { data: followedPlayers = [], isLoading: loadingPlayers } = useFollowedPlayers();
  const { data: feedEvents = [], isLoading: loadingFeed } = useFeedEvents();
  const { data: allTeams = [] } = useTeams();
  const unfollow = useUnfollowPlayer();
  const followedIds = reactExports.useMemo(
    () => followedPlayers.map((p) => p.id),
    [followedPlayers]
  );
  const matchStatsMap = usePlayerMatchStatsBatch(followedIds);
  const followedPositions = reactExports.useMemo(() => {
    const set = /* @__PURE__ */ new Set();
    for (const p of followedPlayers) {
      if (ALL_POSITIONS.includes(p.position))
        set.add(p.position);
    }
    return Array.from(set);
  }, [followedPlayers]);
  const followedTeams = reactExports.useMemo(
    () => allTeams.filter(
      (t) => new Set(followedPlayers.map((p) => p.teamId)).has(t.id)
    ),
    [followedPlayers, allTeams]
  );
  const displayedPlayers = reactExports.useMemo(() => {
    let filtered = followedPlayers;
    if (posFilter !== "all")
      filtered = filtered.filter((p) => p.position === posFilter);
    if (teamFilter !== "all")
      filtered = filtered.filter((p) => p.teamId.toString() === teamFilter);
    return sortPlayers(filtered, sort, feedEvents);
  }, [followedPlayers, posFilter, teamFilter, sort, feedEvents]);
  const isLoading = loadingPlayers || loadingFeed;
  const hasFollowed = followedPlayers.length > 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sticky top-0 z-20 bg-card border-b border-border shadow-subtle px-4 pt-4 pb-3 space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-display font-black text-xl text-foreground tracking-tight leading-none", children: "Din feed" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mt-0.5 font-body", children: hasFollowed ? `${followedPlayers.length} spiller${followedPlayers.length !== 1 ? "e" : ""} fulgt` : "Følg spillere for å bygge din feed" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Link,
          {
            to: "/search",
            className: "size-9 rounded-full bg-muted flex items-center justify-center border border-border hover:border-primary/40 transition-smooth",
            "aria-label": "Søk etter spillere",
            "data-ocid": "header-search-btn",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "size-4 text-muted-foreground" })
          }
        )
      ] }),
      hasFollowed && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SortPills, { active: sort, onChange: setSort }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FilterBar,
          {
            positions: followedPositions,
            teams: followedTeams,
            activePos: posFilter,
            activeTeamId: teamFilter,
            onPosChange: setPosFilter,
            onTeamChange: setTeamFilter
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto", children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 grid grid-cols-2 gap-3", "data-ocid": "feed-skeleton", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "feed" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "feed" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "feed" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "feed" })
    ] }) : !hasFollowed ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyFeed, {}) : displayedPlayers.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-12 text-center", "data-ocid": "feed-no-results", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm", children: "Ingen spillere matcher filteret ditt." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => {
            setPosFilter("all");
            setTeamFilter("all");
          },
          className: "mt-3 text-primary text-sm font-semibold hover:underline",
          children: "Nullstill filter"
        }
      )
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "p-3 grid grid-cols-2 gap-3 pb-6",
        "data-ocid": "feed-list",
        children: displayedPlayers.map((player, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          FeedPlayerCard,
          {
            player,
            teamName: getTeamName(player.teamId, allTeams),
            feedEvents: feedEvents.filter((e) => e.playerId === player.id),
            matchStats: matchStatsMap[player.id.toString()] ?? [],
            onUnfollow: () => unfollow.mutate(player.id),
            isUnfollowLoading: unfollow.isPending,
            index: idx
          },
          player.id.toString()
        ))
      }
    ) })
  ] });
}
export {
  HomePage as default
};
