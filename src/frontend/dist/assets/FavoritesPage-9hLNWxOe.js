import { c as createLucideIcon, r as reactExports, P as Position, j as jsxRuntimeExports, f as SkeletonCard, T as Trophy, a as cn, S as Search, L as Link } from "./index-CPElKy7J.js";
import { a as POSITION_LABELS, P as PositionBadge } from "./PositionBadge-CSTguUIW.js";
import { a as usePlayers } from "./usePlayers-C-xHH6cL.js";
import { u as useTeams } from "./useTeams-BRTMhY6Q.js";
import { g as getStaticProfile, b as getStaticTeamLogoUrl, m as mapClawdbotSeasonStats, a as mapClawdbotMatchStats } from "./clawdbotPlayerProfile-CiM1Xaxo.js";
import { T as Target } from "./target-B6NtXfdb.js";
import { S as Shield } from "./shield-9XBg_EMN.js";
import { A as ArrowUp, a as ArrowDown, M as Minus } from "./minus-CLmpXCnE.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "m11 17 2 2a1 1 0 1 0 3-3", key: "efffak" }],
  [
    "path",
    {
      d: "m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4",
      key: "9pr0kb"
    }
  ],
  ["path", { d: "m21 3 1 11h-2", key: "1tisrp" }],
  ["path", { d: "M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3", key: "1uvwmv" }],
  ["path", { d: "M3 4h8", key: "1ep09j" }]
];
const Handshake = createLucideIcon("handshake", __iconNode);
const TOPLIST_MODES = [
  { value: "form", label: "Best form" },
  { value: "goals", label: "Måldronning" },
  { value: "assists", label: "Tilrettelegger" },
  { value: "keepers", label: "Keeperform" },
  { value: "mep", label: "Sesong MEP" }
];
const POSITION_OPTIONS = [
  { value: "all", label: "Alle" },
  { value: Position.Keeper, label: "Keeper" },
  { value: Position.VenstreKant, label: "V. kant" },
  { value: Position.HoyreKant, label: "H. kant" },
  { value: Position.Linje, label: "Linje" },
  { value: Position.Bakspiller, label: "Bakspiller" }
];
const MODE_COPY = {
  form: {
    title: "Best form",
    text: "Rangert på snitt MEP siste 5 kamper."
  },
  goals: {
    title: "Måldronning",
    text: "Flest mål totalt, med uttelling og mål per kamp."
  },
  assists: {
    title: "Tilretteleggeren",
    text: "Flest assist totalt, med assist per kamp."
  },
  keepers: {
    title: "Keeperform",
    text: "Keepere rangert på redningsprosent siste kamp."
  },
  mep: {
    title: "Sesong MEP",
    text: "Beste totalbidrag gjennom sesongen."
  }
};
function getMatchDate(match) {
  return match.date ?? match.matchId.toString();
}
function asNumber(value) {
  return value === void 0 ? void 0 : Number(value);
}
function formatNumber(value, digits = 0) {
  if (value === void 0 || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
}
function formatPercent(value) {
  if (value === void 0 || Number.isNaN(value)) return "-";
  return `${value.toFixed(1)}%`;
}
function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : void 0;
}
function getTopInsight(player) {
  const profile = getStaticProfile(player.id);
  if (!profile) return { matches: [], sparkValues: [] };
  const seasonStats = mapClawdbotSeasonStats(profile);
  const matches = mapClawdbotMatchStats(profile).filter((match) => typeof match.mep === "number").sort((a, b) => getMatchDate(a).localeCompare(getMatchDate(b)));
  const currentWindow = matches.slice(-5);
  const previousWindow = matches.slice(-6, -1);
  const latestMatch = matches.at(-1);
  const previousMatch = matches.at(-2);
  const sparkValues = currentWindow.map((match) => match.mep ?? 0);
  const totalGoals = asNumber(seasonStats.totalGoals);
  const totalAssists = asNumber(seasonStats.totalAssists);
  const mepTotal = seasonStats.mepTotal;
  const latestGoals = asNumber(latestMatch == null ? void 0 : latestMatch.goals) ?? 0;
  const latestAssists = asNumber(latestMatch == null ? void 0 : latestMatch.assists) ?? 0;
  const latestMep = latestMatch == null ? void 0 : latestMatch.mep;
  return {
    seasonStats,
    matches,
    sparkValues,
    formAvg: average(sparkValues) ?? seasonStats.mepAvg,
    previousFormAvg: average(previousWindow.map((match) => match.mep ?? 0)),
    latestMep,
    latestSaves: (latestMatch == null ? void 0 : latestMatch.saves) === void 0 ? void 0 : Number(latestMatch.saves),
    latestSavePct: latestMatch == null ? void 0 : latestMatch.savePct,
    previousSavePct: previousMatch == null ? void 0 : previousMatch.savePct,
    totalGoals,
    previousTotalGoals: totalGoals === void 0 ? void 0 : Math.max(totalGoals - latestGoals, 0),
    shootingPercent: seasonStats.shootingPercent,
    goalsPerGame: seasonStats.goalsPerGame,
    totalAssists,
    previousTotalAssists: totalAssists === void 0 ? void 0 : Math.max(totalAssists - latestAssists, 0),
    assistsPerGame: seasonStats.assistsPerGame,
    technicalFaults: asNumber(seasonStats.technicalFaults),
    mepAvg: seasonStats.mepAvg,
    mepTotal,
    previousMepTotal: mepTotal === void 0 || latestMep === void 0 ? void 0 : mepTotal - latestMep,
    matchesPlayed: Number(seasonStats.matchesPlayed)
  };
}
function isRelevantPlayer(player, mode) {
  if (mode === "keepers") return player.position === Position.Keeper;
  return player.position !== Position.Keeper;
}
function getCurrentScore(mode, insight) {
  if (mode === "goals") return insight.totalGoals ?? 0;
  if (mode === "assists") return insight.totalAssists ?? 0;
  if (mode === "keepers") return insight.latestSavePct ?? 0;
  if (mode === "mep") return insight.mepTotal ?? 0;
  return insight.formAvg ?? 0;
}
function getPreviousScore(mode, insight) {
  if (mode === "goals") return insight.previousTotalGoals ?? insight.totalGoals ?? 0;
  if (mode === "assists") {
    return insight.previousTotalAssists ?? insight.totalAssists ?? 0;
  }
  if (mode === "keepers") return insight.previousSavePct ?? 0;
  if (mode === "mep") return insight.previousMepTotal ?? insight.mepTotal ?? 0;
  return insight.previousFormAvg ?? insight.formAvg ?? 0;
}
function tieBreaker(mode, insight) {
  if (mode === "keepers") return insight.latestSaves ?? 0;
  if (mode === "goals") return insight.goalsPerGame ?? 0;
  if (mode === "assists") return insight.assistsPerGame ?? 0;
  return insight.matchesPlayed ?? 0;
}
function filterPlayers(players, mode, position) {
  return players.filter((player) => {
    if (!isRelevantPlayer(player, mode)) return false;
    if (position === "all") return true;
    return player.position === position;
  });
}
function sortRankedPlayers(players, mode, insights, previous = false) {
  return [...players].sort((a, b) => {
    const ai = insights.get(a.id.toString()) ?? getTopInsight(a);
    const bi = insights.get(b.id.toString()) ?? getTopInsight(b);
    const scoreA = previous ? getPreviousScore(mode, ai) : getCurrentScore(mode, ai);
    const scoreB = previous ? getPreviousScore(mode, bi) : getCurrentScore(mode, bi);
    return scoreB - scoreA || tieBreaker(mode, bi) - tieBreaker(mode, ai) || a.name.localeCompare(b.name);
  });
}
function getMetricCells(mode, insight) {
  if (mode === "goals") {
    return [
      { label: "Mål", value: formatNumber(insight.totalGoals), primary: true },
      { label: "Treff%", value: formatPercent(insight.shootingPercent) },
      { label: "Mål/k", value: formatNumber(insight.goalsPerGame, 1) }
    ];
  }
  if (mode === "assists") {
    return [
      { label: "Assist", value: formatNumber(insight.totalAssists), primary: true },
      { label: "Assist/k", value: formatNumber(insight.assistsPerGame, 1) },
      { label: "Tek.feil", value: formatNumber(insight.technicalFaults) }
    ];
  }
  if (mode === "keepers") {
    return [
      { label: "Red%", value: formatPercent(insight.latestSavePct), primary: true },
      { label: "Redn.", value: formatNumber(insight.latestSaves) },
      { label: "MEP 5", value: formatNumber(insight.formAvg, 1) }
    ];
  }
  if (mode === "mep") {
    return [
      { label: "Total", value: formatNumber(insight.mepTotal, 1), primary: true },
      { label: "Snitt", value: formatNumber(insight.mepAvg, 1) },
      { label: "Kamper", value: formatNumber(insight.matchesPlayed) }
    ];
  }
  return [
    { label: "MEP 5", value: formatNumber(insight.formAvg, 1), primary: true },
    { label: "Siste", value: formatNumber(insight.latestMep, 1) },
    { label: "Total", value: formatNumber(insight.mepTotal, 1) }
  ];
}
function getHeroStats(mode, count, topInsight) {
  if (mode === "goals") {
    return [
      { icon: Trophy, label: "Leder", value: formatNumber(topInsight == null ? void 0 : topInsight.totalGoals) },
      { icon: Target, label: "Treff%", value: formatPercent(topInsight == null ? void 0 : topInsight.shootingPercent) },
      { icon: Shield, label: "Spillere", value: count.toString() }
    ];
  }
  if (mode === "assists") {
    return [
      { icon: Handshake, label: "Leder", value: formatNumber(topInsight == null ? void 0 : topInsight.totalAssists) },
      { icon: Target, label: "Assist/k", value: formatNumber(topInsight == null ? void 0 : topInsight.assistsPerGame, 1) },
      { icon: Shield, label: "Spillere", value: count.toString() }
    ];
  }
  if (mode === "keepers") {
    return [
      { icon: Trophy, label: "Leder", value: formatPercent(topInsight == null ? void 0 : topInsight.latestSavePct) },
      { icon: Target, label: "Redn.", value: formatNumber(topInsight == null ? void 0 : topInsight.latestSaves) },
      { icon: Shield, label: "Keepere", value: count.toString() }
    ];
  }
  if (mode === "mep") {
    return [
      { icon: Trophy, label: "Leder", value: formatNumber(topInsight == null ? void 0 : topInsight.mepTotal, 1) },
      { icon: Target, label: "Snitt", value: formatNumber(topInsight == null ? void 0 : topInsight.mepAvg, 1) },
      { icon: Shield, label: "Spillere", value: count.toString() }
    ];
  }
  return [
    { icon: Trophy, label: "Leder", value: formatNumber(topInsight == null ? void 0 : topInsight.formAvg, 1) },
    { icon: Target, label: "Siste", value: formatNumber(topInsight == null ? void 0 : topInsight.latestMep, 1) },
    { icon: Shield, label: "Spillere", value: count.toString() }
  ];
}
function TeamLogo({
  teamName,
  logoUrl
}) {
  const resolvedLogo = logoUrl ?? getStaticTeamLogoUrl(teamName);
  if (!resolvedLogo) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-8 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "size-5 text-muted-foreground" }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-8 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: resolvedLogo, alt: "", className: "size-8 object-contain" }) });
}
function RankMovement({ change }) {
  if (change > 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-0.5 rounded-full bg-chart-2/15 px-2 py-0.5 text-[10px] font-mono font-bold text-chart-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { className: "size-3" }),
      change
    ] });
  }
  if (change < 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-0.5 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-mono font-bold text-destructive", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { className: "size-3" }),
      Math.abs(change)
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-0.5 rounded-full bg-muted/45 px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Minus, { className: "size-3" }),
    "0"
  ] });
}
function TopStat({
  icon: Icon,
  label,
  value
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl bg-background/70 border border-border px-3 py-3 min-w-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-primary mb-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3.5" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] uppercase tracking-widest font-display font-bold truncate", children: label })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-black text-xl text-foreground tabular-nums truncate", children: value })
  ] });
}
function RankingListItem({
  row,
  rank,
  mode
}) {
  const metricCells = getMetricCells(mode, row.insight);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Link,
    {
      to: "/player/$id",
      params: { id: row.player.id.toString() },
      className: "group grid grid-cols-[34px_1fr_auto] items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 hover:border-primary/45 hover:bg-card/80 transition-colors",
      "data-ocid": "toplist-row",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-black text-lg text-foreground tabular-nums", children: rank }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(RankMovement, { change: row.rankChange })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TeamLogo, { teamName: row.teamName, logoUrl: row.teamLogoUrl }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-black text-sm text-foreground truncate group-hover:text-primary transition-colors", children: row.player.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 flex items-center gap-2 min-w-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PositionBadge, { position: row.player.position }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 gap-2 text-right min-w-[138px] sm:min-w-[190px]", children: metricCells.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "p",
            {
              className: cn(
                "font-mono font-black leading-none tabular-nums truncate",
                item.primary ? "text-lg text-primary" : "text-sm text-foreground"
              ),
              children: item.value
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[9px] uppercase tracking-widest text-muted-foreground truncate", children: item.label })
        ] }, item.label)) })
      ]
    }
  );
}
function RankingList({
  rows,
  mode
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: rows.map((row, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    RankingListItem,
    {
      row,
      rank: index + 1,
      mode
    },
    row.player.id.toString()
  )) });
}
function FavoritesPage() {
  var _a, _b;
  const [mode, setMode] = reactExports.useState("form");
  const [positionFilter, setPositionFilter] = reactExports.useState("all");
  const { data: players = [], isLoading } = usePlayers();
  const { data: teams = [] } = useTeams();
  const teamMap = reactExports.useMemo(
    () => new Map(teams.map((team) => [team.id.toString(), team])),
    [teams]
  );
  const insights = reactExports.useMemo(
    () => new Map(players.map((player) => [player.id.toString(), getTopInsight(player)])),
    [players]
  );
  const activePositionFilter = mode === "keepers" && positionFilter !== "all" ? Position.Keeper : positionFilter;
  const rankedRows = reactExports.useMemo(() => {
    const filtered = filterPlayers(players, mode, activePositionFilter);
    const current = sortRankedPlayers(filtered, mode, insights);
    const previous = sortRankedPlayers(filtered, mode, insights, true);
    const previousRanks = new Map(
      previous.map((player, index) => [player.id.toString(), index + 1])
    );
    return current.slice(0, 30).map((player, index) => {
      const profile = getStaticProfile(player.id);
      const team = teamMap.get(player.teamId.toString());
      const teamName = (team == null ? void 0 : team.name) ?? (profile == null ? void 0 : profile.player.team);
      const previousRank = previousRanks.get(player.id.toString()) ?? index + 1;
      return {
        player,
        teamName,
        teamLogoUrl: (team == null ? void 0 : team.logoUrl) ?? getStaticTeamLogoUrl(teamName),
        insight: insights.get(player.id.toString()) ?? getTopInsight(player),
        rankChange: previousRank - (index + 1)
      };
    });
  }, [activePositionFilter, insights, mode, players, teamMap]);
  const topInsight = (_a = rankedRows[0]) == null ? void 0 : _a.insight;
  const heroStats = getHeroStats(mode, rankedRows.length, topInsight);
  const copy = MODE_COPY[mode];
  function handleModeChange(nextMode) {
    setMode(nextMode);
    if (nextMode === "keepers") setPositionFilter("all");
  }
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", "data-ocid": "toplist-loading", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "player" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "player" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "player" })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", "data-ocid": "toplist-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-2xl bg-card border border-border p-4 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] uppercase tracking-widest text-primary font-display font-bold mb-1", children: "Toppliste" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-display font-black text-2xl text-foreground leading-tight", children: copy.title }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1 leading-relaxed", children: copy.text })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-11 rounded-full bg-primary/12 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trophy, { className: "size-5" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 gap-2", children: heroStats.map((stat) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        TopStat,
        {
          icon: stat.icon,
          label: stat.label,
          value: stat.value
        },
        stat.label
      )) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "flex items-center gap-2 overflow-x-auto no-scrollbar",
          "data-ocid": "toplist-filter-pills",
          children: TOPLIST_MODES.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => handleModeChange(item.value),
              className: cn(
                "flex-shrink-0 rounded-full px-4 py-2 text-xs font-display font-bold border transition-smooth",
                mode === item.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
              ),
              "data-ocid": `toplist-mode-${item.value}`,
              children: item.label
            },
            item.value
          ))
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "flex items-center gap-2 overflow-x-auto no-scrollbar",
          "data-ocid": "toplist-position-filter",
          children: POSITION_OPTIONS.filter(
            (option) => mode !== "keepers" || option.value === "all" || option.value === Position.Keeper
          ).map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => setPositionFilter(option.value),
              className: cn(
                "flex-shrink-0 rounded-full px-3 py-1.5 text-[11px] font-display font-bold border transition-smooth",
                activePositionFilter === option.value ? "bg-muted text-foreground border-primary/45" : "bg-card text-muted-foreground border-border hover:text-foreground"
              ),
              children: option.label
            },
            option.value
          ))
        }
      )
    ] }),
    rankedRows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-[45vh] flex flex-col items-center justify-center text-center px-6 rounded-2xl bg-card border border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "size-10 text-muted-foreground mb-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-display font-bold text-lg text-foreground", children: "Ingen spillere funnet" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1 max-w-[260px]", children: "Prøv en annen posisjon eller kategori." })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground", children: [
          "Topp ",
          rankedRows.length,
          " ",
          mode === "keepers" ? "keepere" : "spillere"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase tracking-widest font-display font-bold text-primary", children: activePositionFilter === "all" ? (_b = TOPLIST_MODES.find((item) => item.value === mode)) == null ? void 0 : _b.label : POSITION_LABELS[activePositionFilter] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(RankingList, { rows: rankedRows, mode })
    ] })
  ] });
}
export {
  FavoritesPage as default
};
