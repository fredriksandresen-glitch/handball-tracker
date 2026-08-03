import { j as jsxRuntimeExports, a as cn, u as useNavigate, r as reactExports, S as Search, X, f as SkeletonCard } from "./index-CPElKy7J.js";
import { B as Button } from "./button-CFSQC4X0.js";
import { g as getNationalTeamInfo } from "./nationalTeamPlayers-DQ_sXgLF.js";
import { r as resolveImageUrl, g as getStaticProfile, m as mapClawdbotSeasonStats, a as mapClawdbotMatchStats } from "./clawdbotPlayerProfile-CiM1Xaxo.js";
import { P as PositionBadge, a as POSITION_LABELS } from "./PositionBadge-CSTguUIW.js";
import { b as useIsFollowing, c as useFollowPlayer, a as useUnfollowPlayer } from "./useFollowedPlayers-BHB52LVt.js";
import { u as useSearchPlayers, a as usePlayers } from "./usePlayers-C-xHH6cL.js";
import { u as useTeams } from "./useTeams-BRTMhY6Q.js";
function Input({ className, type, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "input",
    {
      type,
      "data-slot": "input",
      className: cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      ),
      ...props
    }
  );
}
function Sparkline({ values }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const W = 40;
  const H = 18;
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
      className: "flex-shrink-0 opacity-90",
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
            strokeLinejoin: "round",
            opacity: "0.85"
          }
        )
      ]
    }
  );
}
function PlayerImageFallback({ initials }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-200 via-slate-300 to-slate-500 dark:from-slate-800 dark:via-slate-700 dark:to-slate-950", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex flex-col items-center justify-center opacity-55", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-16 rounded-full bg-white/45 dark:bg-white/15 border border-white/40" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 h-24 w-28 rounded-t-full bg-white/35 dark:bg-white/12 border border-white/25" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute bottom-8 font-display font-black text-5xl text-white/45 dark:text-white/20", children: initials })
  ] }) });
}
function PlayerCard({
  player,
  teamName,
  isFollowing,
  onFollow,
  onUnfollow,
  isLoading,
  className,
  goals,
  minutes,
  latestMep,
  latestGoals,
  latestSaves,
  latestSavePct,
  statItems,
  sparkValues = [],
  sparkLabel = "Form",
  followOverlay = false
}) {
  const navigate = useNavigate();
  const [imageFailed, setImageFailed] = reactExports.useState(false);
  const displayGoals = latestGoals ?? goals;
  const genericStats = (statItems == null ? void 0 : statItems.filter((item) => item.value !== "")) ?? [];
  const hasGenericStats = genericStats.length > 0;
  const hasStats = hasGenericStats || latestMep !== void 0 || latestSaves !== void 0 || latestSavePct !== void 0 || displayGoals !== void 0 || minutes !== void 0;
  const hasSpark = sparkValues.length >= 2;
  const nationalTeam = getNationalTeamInfo(player.id);
  const initials = player.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  function handleCardClick() {
    navigate({ to: "/player/$id", params: { id: player.id.toString() } });
  }
  function handleFollowClick(e) {
    e.stopPropagation();
    if (isFollowing) {
      onUnfollow == null ? void 0 : onUnfollow();
    } else {
      onFollow == null ? void 0 : onFollow();
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "relative w-full rounded-2xl overflow-hidden transition-smooth hover:shadow-elevated group",
        className
      ),
      "data-ocid": "player-card",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: handleCardClick,
            "aria-label": `Vis profil for ${player.name}`,
            className: "relative block w-full aspect-[3/4.45] sm:aspect-[3/4] bg-muted text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            children: [
              (nationalTeam == null ? void 0 : nationalTeam.countryCode) === "FI" && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  className: "absolute inset-0 z-0 bg-white",
                  "aria-hidden": "true",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-y-0 left-[31%] w-[16%] bg-[#002f6c]" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-x-0 top-[38%] h-[16%] bg-[#002f6c]" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(PlayerImageFallback, { initials }),
              resolveImageUrl(player.imageUrl) && !imageFailed && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "img",
                {
                  src: resolveImageUrl(player.imageUrl),
                  alt: player.name,
                  loading: "lazy",
                  decoding: "async",
                  onError: () => setImageFailed(true),
                  className: "absolute inset-0 z-10 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 z-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent" }),
              nationalTeam && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-3 top-3 z-30 rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[10px] font-display font-black uppercase tracking-wide text-white shadow-subtle backdrop-blur-md", children: nationalTeam.countryCode }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute bottom-0 left-0 right-0 z-30 px-3.5 pb-3.5 pt-12", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PositionBadge, { position: player.position, variant: "overlay" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-black text-white leading-tight text-base truncate drop-shadow-sm", children: player.name }),
                teamName && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-white/70 truncate mt-0.5 font-body", children: teamName }),
                hasStats && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between mt-2 pt-2 border-t border-white/15 gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-3 min-w-0", children: hasGenericStats ? genericStats.slice(0, 3).map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        className: cn(
                          "block leading-none tabular-nums truncate",
                          item.emphasis ? "font-display font-black text-xl text-white" : "font-display font-bold text-lg text-white/90"
                        ),
                        children: item.value
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[8px] uppercase tracking-wide text-white/60 mt-0.5 truncate", children: item.label })
                  ] }, `${item.label}-${item.value}`)) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    latestMep !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-display font-black text-xl text-white leading-none tabular-nums", children: latestMep.toFixed(1) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[8px] uppercase tracking-wide text-white/60 mt-0.5", children: "MEP sist" })
                    ] }),
                    latestSaves !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-display font-bold text-lg text-white/90 leading-none tabular-nums", children: latestSaves }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[8px] uppercase tracking-wide text-white/60 mt-0.5", children: "Redn." })
                    ] }),
                    latestSavePct !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "block font-display font-bold text-lg text-white/90 leading-none tabular-nums", children: [
                        latestSavePct.toFixed(1),
                        "%"
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[8px] uppercase tracking-wide text-white/60 mt-0.5", children: "Red%" })
                    ] }),
                    displayGoals !== void 0 && latestSaves === void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-display font-black text-xl text-white leading-none", children: displayGoals }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[9px] uppercase tracking-wide text-white/60 mt-0.5", children: "Mål" })
                    ] }),
                    minutes !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-display font-bold text-lg text-white/90 leading-none", children: minutes }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[9px] uppercase tracking-wide text-white/60 mt-0.5", children: "Min" })
                    ] })
                  ] }) }),
                  hasSpark && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-end gap-0.5 flex-shrink-0", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkline, { values: sparkValues }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] uppercase tracking-wide text-white/50", children: sparkLabel })
                  ] })
                ] })
              ] })
            ]
          }
        ),
        followOverlay && (onFollow || onUnfollow) && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: isFollowing ? "outline" : "default",
            size: "sm",
            onClick: handleFollowClick,
            disabled: isLoading,
            className: cn(
              "absolute top-2.5 right-2.5 z-20 h-8 rounded-full px-3 text-[11px] font-display font-black shadow-elevated backdrop-blur-md",
              isFollowing ? "border-primary/50 bg-black/45 text-primary hover:bg-destructive/80 hover:text-white hover:border-destructive/60" : "bg-primary text-primary-foreground hover:bg-primary/90"
            ),
            "data-ocid": isFollowing ? "player-unfollow-btn" : "player-follow-btn",
            children: isFollowing ? "✓ FØLGER" : "+ FØLG"
          }
        ),
        !followOverlay && (onFollow || onUnfollow) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-1 pt-2 pb-1", children: isFollowing ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outline",
            size: "sm",
            onClick: handleFollowClick,
            disabled: isLoading,
            className: "w-full h-9 rounded-full text-xs font-display font-bold border-primary/40 text-primary hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40",
            "data-ocid": "player-unfollow-btn",
            children: "✓ FØLGER"
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            size: "sm",
            onClick: handleFollowClick,
            disabled: isLoading,
            className: "w-full h-9 rounded-full text-xs font-display font-bold bg-primary text-primary-foreground hover:bg-primary/90",
            "data-ocid": "player-follow-btn",
            children: "+ FØLG"
          }
        ) })
      ]
    }
  );
}
const SORT_FILTERS = [
  { value: "hot", label: "Heitest" },
  { value: "form", label: "Beste form" },
  { value: "goals", label: "Flest mål" },
  { value: "mep", label: "Snitt MEP" },
  { value: "name", label: "Navn" }
];
const POSITION_FILTERS = [
  { value: "all", label: "Alle" },
  { value: "Keeper", label: POSITION_LABELS.Keeper },
  { value: "VenstreKant", label: POSITION_LABELS.VenstreKant },
  { value: "HoyreKant", label: POSITION_LABELS.HoyreKant },
  { value: "Linje", label: POSITION_LABELS.Linje },
  { value: "Bakspiller", label: POSITION_LABELS.Bakspiller }
];
const INITIAL_RESULT_LIMIT = 30;
function getPositionValue(player) {
  return String(player.position);
}
function getMatchDate(match) {
  return match.date ?? match.matchId.toString();
}
function asNumber(value) {
  return value === void 0 ? void 0 : Number(value);
}
function getPlayerSearchInsight(player) {
  const profile = getStaticProfile(player.id);
  if (!profile) return { sparkValues: [], hotScore: 0 };
  const seasonStats = mapClawdbotSeasonStats(profile);
  const mepMatches = mapClawdbotMatchStats(profile).filter((match) => typeof match.mep === "number").sort((a, b) => getMatchDate(a).localeCompare(getMatchDate(b))).slice(-5);
  const sparkValues = mepMatches.map((match) => match.mep ?? 0);
  const latestMatch = mepMatches.at(-1);
  const latestMep = sparkValues.at(-1);
  const formAvg = sparkValues.length ? sparkValues.reduce((sum, value) => sum + value, 0) / sparkValues.length : seasonStats.mepAvg;
  const goalsPerGame = seasonStats.goalsPerGame ?? 0;
  const matches = Number(seasonStats.matchesPlayed);
  const hotScore = (formAvg ?? 0) * 12 + (seasonStats.mepAvg ?? 0) * 5 + goalsPerGame * 4 + Math.min(matches, 26) / 10;
  return {
    seasonStats,
    sparkValues,
    formAvg,
    latestMep,
    hotScore,
    totalGoals: asNumber(seasonStats.totalGoals),
    latestGoals: (latestMatch == null ? void 0 : latestMatch.goals) === void 0 ? void 0 : Number(latestMatch.goals),
    latestSaves: (latestMatch == null ? void 0 : latestMatch.saves) === void 0 ? void 0 : Number(latestMatch.saves),
    latestSavePct: latestMatch == null ? void 0 : latestMatch.savePct
  };
}
function comparePlayersBySort(a, b, sortMode, insights) {
  var _a, _b;
  const ai = insights.get(a.id.toString()) ?? getPlayerSearchInsight(a);
  const bi = insights.get(b.id.toString()) ?? getPlayerSearchInsight(b);
  if (sortMode === "name") return a.name.localeCompare(b.name, "nb");
  if (sortMode === "goals") return (bi.totalGoals ?? 0) - (ai.totalGoals ?? 0);
  if (sortMode === "mep") {
    return (((_a = bi.seasonStats) == null ? void 0 : _a.mepAvg) ?? 0) - (((_b = ai.seasonStats) == null ? void 0 : _b.mepAvg) ?? 0);
  }
  if (sortMode === "form") return (bi.formAvg ?? 0) - (ai.formAvg ?? 0);
  return bi.hotScore - ai.hotScore;
}
function SearchResult({
  player,
  teamName,
  insight
}) {
  const { data: following, isLoading: checkingFollow } = useIsFollowing(
    player.id
  );
  const followMutation = useFollowPlayer();
  const unfollowMutation = useUnfollowPlayer();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    PlayerCard,
    {
      player,
      teamName,
      isFollowing: following ?? false,
      onFollow: () => followMutation.mutate(player.id),
      onUnfollow: () => unfollowMutation.mutate(player.id),
      isLoading: checkingFollow || followMutation.isPending || unfollowMutation.isPending,
      latestMep: insight.latestMep,
      latestGoals: insight.latestGoals,
      latestSaves: insight.latestSaves,
      latestSavePct: insight.latestSavePct,
      sparkValues: insight.sparkValues,
      followOverlay: true
    }
  );
}
function SearchPage() {
  var _a;
  const [inputValue, setInputValue] = reactExports.useState("");
  const [debouncedQuery, setDebouncedQuery] = reactExports.useState("");
  const [positionFilter, setPositionFilter] = reactExports.useState("all");
  const [sortMode, setSortMode] = reactExports.useState("hot");
  const debounceRef = reactExports.useRef(null);
  const { data: rawResults, isLoading } = useSearchPlayers(debouncedQuery);
  const { data: teams } = useTeams();
  const { data: allPlayers } = usePlayers();
  const teamMap = new Map(
    (teams ?? []).map((t) => [t.id.toString(), t.name])
  );
  const totalPlayers = (allPlayers == null ? void 0 : allPlayers.length) ?? 0;
  const totalTeams = (teams == null ? void 0 : teams.length) ?? 0;
  const hasQuery = debouncedQuery.trim() !== "";
  const sourcePlayers = hasQuery ? rawResults : allPlayers;
  const playerInsights = new Map(
    (sourcePlayers ?? []).map((player) => [
      player.id.toString(),
      getPlayerSearchInsight(player)
    ])
  );
  const filteredResults = positionFilter === "all" ? sourcePlayers : sourcePlayers == null ? void 0 : sourcePlayers.filter((p) => getPositionValue(p) === positionFilter);
  const sortedResults = filteredResults ? [...filteredResults].sort(
    (a, b) => comparePlayersBySort(a, b, sortMode, playerInsights)
  ) : void 0;
  const isInitialBrowse = !hasQuery;
  const results = sortedResults ? isInitialBrowse ? sortedResults.slice(0, INITIAL_RESULT_LIMIT) : sortedResults : void 0;
  const totalResultCount = (sortedResults == null ? void 0 : sortedResults.length) ?? 0;
  const handleChange = reactExports.useCallback((e) => {
    const val = e.target.value;
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(val);
    }, 300);
  }, []);
  const handleClear = reactExports.useCallback(() => {
    setInputValue("");
    setDebouncedQuery("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);
  reactExports.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);
  const showSkeletons = isLoading && hasQuery;
  const showNoResults = !isLoading && results !== void 0 && results.length === 0;
  const showResults = results !== void 0 && results.length > 0;
  const showEmptyPrompt = !showResults && !showNoResults && !showSkeletons;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center", "data-ocid": "search-input-wrap", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Input,
        {
          value: inputValue,
          onChange: handleChange,
          placeholder: "Søk etter spillernavn, lag eller posisjon",
          className: "pl-10 pr-10 h-11 bg-card border-border placeholder:text-muted-foreground text-foreground rounded-xl focus-visible:ring-primary/50",
          "data-ocid": "search-input",
          autoFocus: true,
          autoComplete: "off",
          inputMode: "search"
        }
      ),
      inputValue && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: handleClear,
          className: "absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors",
          "aria-label": "Tøm søk",
          "data-ocid": "search-clear-btn",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-4" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "flex gap-2 overflow-x-auto pb-0.5 no-scrollbar",
        "data-ocid": "position-filter-pills",
        children: POSITION_FILTERS.map(({ value, label }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => setPositionFilter(value),
            className: cn(
              "flex-shrink-0 h-7 px-3.5 rounded-full text-[11px] font-display font-semibold tracking-wide uppercase transition-smooth border",
              positionFilter === value ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            ),
            "data-ocid": `filter-pill-${value}`,
            children: label
          },
          value
        ))
      }
    ),
    showEmptyPrompt && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex flex-col items-center justify-center py-16 gap-4 text-center",
        "data-ocid": "search-empty-prompt",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-16 rounded-full bg-card border border-border flex items-center justify-center shadow-elevated", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "size-7 text-muted-foreground" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-semibold text-foreground text-base", children: "Finn din neste favorittspiller" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1 max-w-[260px]", children: "Søk etter spillernavn, lag eller posisjon" })
          ] }),
          totalPlayers > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "p",
            {
              className: "text-xs text-muted-foreground/70 bg-card border border-border rounded-full px-3 py-1",
              "data-ocid": "data-status",
              children: [
                "Viser ",
                totalPlayers,
                " spillere fra ",
                totalTeams,
                " lag"
              ]
            }
          )
        ]
      }
    ),
    showSkeletons && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", "data-ocid": "search-loading", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "player" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "player" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "player" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "player" })
    ] }),
    showNoResults && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex flex-col items-center justify-center py-14 gap-3 text-center",
        "data-ocid": "search-no-results",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-14 rounded-full bg-card border border-border flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "size-6 text-muted-foreground opacity-50" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-semibold text-foreground", children: "Ingen treff" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1", children: hasQuery ? `Ingen spillere funnet for «${debouncedQuery}»` : `Ingen spillere funnet i ${POSITION_LABELS[positionFilter] ?? "filteret"}` })
          ] })
        ]
      }
    ),
    showResults && !showSkeletons && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "search-results", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3 px-0.5 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground", children: isInitialBrowse && totalResultCount > results.length ? `Viser ${results.length} av ${totalResultCount} spillere` : `${results.length} ${results.length === 1 ? "spiller" : "spillere"} funnet` }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-display font-bold uppercase tracking-widest text-primary", children: (_a = SORT_FILTERS.find((item) => item.value === sortMode)) == null ? void 0 : _a.label })
      ] }),
      isInitialBrowse && totalResultCount > results.length && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-3 px-0.5 text-xs text-muted-foreground", children: "Søk for å filtrere hele spillerlisten." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "-mx-2 grid grid-cols-2 gap-2 sm:mx-0 sm:gap-3", children: results.map((player) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        SearchResult,
        {
          player,
          teamName: teamMap.get(player.teamId.toString()),
          insight: playerInsights.get(player.id.toString()) ?? getPlayerSearchInsight(player)
        },
        player.id.toString()
      )) })
    ] })
  ] });
}
export {
  SearchPage as default
};
