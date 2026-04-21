import { c as createLucideIcon, r as reactExports, j as jsxRuntimeExports, g as Skeleton, a as cn, h as useParams, i as useRouter, P as Position, L as Link, U as Users } from "./index-BrTjiQrP.js";
import { B as Button } from "./button-CpNExvJA.js";
import { a as usePlayerSeasonStats, b as usePlayer, c as usePlayerMatchStats } from "./usePlayer-C3a-quHL.js";
import { a as usePlayers } from "./usePlayers-7fjKvlK1.js";
import { b as POSITION_LABELS, P as PositionBadge, c as useIsFollowing, d as useFollowPlayer, a as useUnfollowPlayer } from "./useFollowedPlayers-B96IBvp4.js";
import { u as useTeam, A as ArrowLeft, a as ArrowRight, b as useNextMatchForTeam, C as Clock, M as MapPin } from "./useTeam-tdwq3tr2.js";
import { f as formatMatchDate, g as getCountdown } from "./handballService-Dbax6PK1.js";
import { S as Shield } from "./shield-Bu1_p0xX.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$4 = [
  ["path", { d: "M12 5v14", key: "s699le" }],
  ["path", { d: "m19 12-7 7-7-7", key: "1idqje" }]
];
const ArrowDown = createLucideIcon("arrow-down", __iconNode$4);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$3 = [
  ["path", { d: "m5 12 7-7 7 7", key: "hav0vg" }],
  ["path", { d: "M12 19V5", key: "x0mq9r" }]
];
const ArrowUp = createLucideIcon("arrow-up", __iconNode$3);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$2 = [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]];
const ChevronRight = createLucideIcon("chevron-right", __iconNode$2);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]];
const LoaderCircle = createLucideIcon("loader-circle", __iconNode$1);
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
      d: "M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15",
      key: "143lza"
    }
  ],
  ["path", { d: "M11 12 5.12 2.2", key: "qhuxz6" }],
  ["path", { d: "m13 12 5.88-9.8", key: "hbye0f" }],
  ["path", { d: "M8 7h8", key: "i86dvs" }],
  ["circle", { cx: "12", cy: "17", r: "5", key: "qbz8iq" }],
  ["path", { d: "M12 18v-2h-.5", key: "fawc4q" }]
];
const Medal = createLucideIcon("medal", __iconNode);
const BASE_STATS = [
  {
    key: "goals",
    label: "Mål / kamp",
    compute: (s) => s.totalGoals !== void 0 && s.matchesPlayed > 0n ? Number(s.totalGoals) / Number(s.matchesPlayed) : void 0,
    decimals: 2,
    higherBetter: true
  },
  {
    key: "minutes",
    label: "Min / kamp",
    compute: (s) => s.totalMinutes !== void 0 && s.matchesPlayed > 0n ? Number(s.totalMinutes) / Number(s.matchesPlayed) : void 0,
    decimals: 1,
    higherBetter: true
  },
  {
    key: "assists",
    label: "Assists / kamp",
    compute: (s) => s.totalAssists !== void 0 && s.matchesPlayed > 0n ? Number(s.totalAssists) / Number(s.matchesPlayed) : void 0,
    decimals: 2,
    higherBetter: true
  },
  {
    key: "yellow",
    label: "Gule kort",
    compute: (s) => s.totalYellowCards !== void 0 && s.matchesPlayed > 0n ? Number(s.totalYellowCards) / Number(s.matchesPlayed) : void 0,
    decimals: 2,
    higherBetter: false
  },
  {
    key: "twomin",
    label: "2-min / kamp",
    compute: (s) => s.totalTwoMin !== void 0 && s.matchesPlayed > 0n ? Number(s.totalTwoMin) / Number(s.matchesPlayed) : void 0,
    decimals: 2,
    higherBetter: false
  }
];
const KEEPER_STATS = [
  {
    key: "saves",
    label: "Redninger / kamp",
    compute: (s) => s.totalSaves !== void 0 && s.matchesPlayed > 0n ? Number(s.totalSaves) / Number(s.matchesPlayed) : void 0,
    decimals: 1,
    higherBetter: true
  }
];
function fmt$1(val, decimals = 1) {
  if (val === void 0) return "–";
  return val.toFixed(decimals);
}
function useAllSamePosStats(ids) {
  const id = (n2) => ids[n2] ?? 0n;
  const r0 = usePlayerSeasonStats(id(0));
  const r1 = usePlayerSeasonStats(id(1));
  const r2 = usePlayerSeasonStats(id(2));
  const r3 = usePlayerSeasonStats(id(3));
  const r4 = usePlayerSeasonStats(id(4));
  const r5 = usePlayerSeasonStats(id(5));
  const r6 = usePlayerSeasonStats(id(6));
  const r7 = usePlayerSeasonStats(id(7));
  const r8 = usePlayerSeasonStats(id(8));
  const r9 = usePlayerSeasonStats(id(9));
  const r10 = usePlayerSeasonStats(id(10));
  const r11 = usePlayerSeasonStats(id(11));
  const all = [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11];
  const isLoading = all.slice(0, Math.max(ids.length, 1)).some((r) => r.isLoading);
  const map = /* @__PURE__ */ new Map();
  for (let i = 0; i < ids.length; i++)
    map.set(ids[i].toString(), all[i].data ?? null);
  return { map, isLoading };
}
function StatBarRow({
  def,
  entries,
  avg
}) {
  var _a;
  const validEntries = entries.filter((e) => e.value !== void 0);
  if (validEntries.length === 0) return null;
  const maxVal = Math.max(
    ...validEntries.map((e) => e.value ?? 0),
    avg ?? 0,
    0.01
  );
  const higherBetter = def.higherBetter !== false;
  const sorted = [...validEntries].sort(
    (a, b) => higherBetter ? (b.value ?? 0) - (a.value ?? 0) : (a.value ?? 0) - (b.value ?? 0)
  );
  const winnerId = (_a = sorted[0]) == null ? void 0 : _a.playerId;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "rounded-xl bg-card border border-border p-3 space-y-2.5",
      "data-ocid": "comparison-stat-row",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground", children: def.label }),
          avg !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-muted-foreground/60 font-body", children: [
            "⌀ ",
            fmt$1(avg, def.decimals)
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: entries.map((entry) => {
          const val = entry.value;
          const pct = val !== void 0 && maxVal > 0 ? Math.max(val / maxVal * 100, 2) : 0;
          const isWinner = entry.playerId === winnerId;
          const rank = sorted.findIndex((s) => s.playerId === entry.playerId) + 1;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: cn(
                "rounded-lg p-2",
                isWinner ? "bg-primary/8 border border-primary/20" : ""
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: cn(
                        "size-4.5 rounded-full flex items-center justify-center text-[9px] font-display font-black flex-shrink-0",
                        rank === 1 ? "bg-primary/20 text-primary" : "bg-muted/60 text-muted-foreground"
                      ),
                      children: rank
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "span",
                    {
                      className: cn(
                        "text-[12px] font-display font-semibold flex-1 min-w-0 truncate",
                        entry.isPrimary ? "text-primary" : isWinner ? "text-foreground font-bold" : "text-muted-foreground"
                      ),
                      children: [
                        entry.name,
                        entry.isPrimary && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 text-[9px] text-primary/60", children: "(deg)" })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: cn(
                        "text-[13px] font-display font-bold flex-shrink-0",
                        isWinner ? "text-primary" : entry.isPrimary ? "text-primary" : "text-foreground"
                      ),
                      children: fmt$1(val, def.decimals)
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1.5 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: cn(
                      "h-full rounded-full transition-all duration-500",
                      isWinner ? "bg-primary" : entry.isPrimary ? "bg-primary/70" : "bg-muted-foreground/40"
                    ),
                    style: { width: `${pct}%` }
                  }
                ) })
              ]
            },
            entry.playerId
          );
        }) })
      ]
    }
  );
}
function PlayerChip({
  player,
  selected,
  onToggle
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      onClick: onToggle,
      className: cn(
        "px-3 py-1.5 rounded-full text-xs font-display font-semibold border transition-smooth truncate max-w-[130px]",
        selected ? "bg-primary/20 border-primary/50 text-primary" : "bg-muted/40 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
      ),
      "data-ocid": "comparison-player-chip",
      children: player.name.split(" ").at(-1)
    }
  );
}
function SkeletonTable() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 mt-2", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-20 w-full rounded-xl" }, i)) });
}
function ComparisonTab({ playerId, position, compact = false }) {
  const { data: allPlayers, isLoading: loadingPlayers } = usePlayers();
  const [selected, setSelected] = reactExports.useState([]);
  const samePosPlayers = reactExports.useMemo(() => {
    if (!allPlayers) return [];
    return allPlayers.filter(
      (p) => p.position === position && p.id !== playerId
    );
  }, [allPlayers, position, playerId]);
  const suggestions = reactExports.useMemo(
    () => samePosPlayers.slice(0, 5),
    [samePosPlayers]
  );
  const autoSelected = reactExports.useMemo(() => {
    if (!compact) return [];
    return samePosPlayers.slice(0, 2).map((p) => p.id);
  }, [compact, samePosPlayers]);
  const activeSelected = compact ? autoSelected : selected;
  function togglePlayer(id) {
    setSelected((prev) => {
      if (prev.some((x) => x === id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }
  const allIds = reactExports.useMemo(() => {
    const core = [playerId, ...activeSelected];
    const extraSrc = samePosPlayers.filter((p) => !core.some((id) => id === p.id)).slice(0, 12 - core.length);
    return [...core, ...extraSrc.map((p) => p.id)];
  }, [playerId, activeSelected, samePosPlayers]);
  const { map: statsMap, isLoading: loadingStats } = useAllSamePosStats(allIds);
  const isKeeper = position === "Keeper";
  const statDefs = isKeeper ? [...BASE_STATS.filter((s) => s.key !== "goals"), ...KEEPER_STATS] : BASE_STATS;
  const visibleDefs = compact ? statDefs.slice(0, 2) : statDefs;
  const allStatsForAvg = reactExports.useMemo(() => {
    const out = [];
    for (const [, s] of statsMap) {
      if (s) out.push(s);
    }
    return out;
  }, [statsMap]);
  const avgMap = reactExports.useMemo(() => {
    const result = /* @__PURE__ */ new Map();
    for (const def of statDefs) {
      const vals = allStatsForAvg.map((s) => def.compute(s)).filter((v) => v !== void 0);
      if (vals.length > 0)
        result.set(def.key, vals.reduce((a, b) => a + b, 0) / vals.length);
    }
    return result;
  }, [allStatsForAvg, statDefs]);
  if (loadingPlayers) return /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonTable, {});
  if (samePosPlayers.length < 1) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "text-center py-8 text-muted-foreground text-sm rounded-xl bg-card border border-border",
        "data-ocid": "comparison-no-players",
        children: "Ingen sammenlignbare spillere funnet"
      }
    );
  }
  const primaryStats = statsMap.get(playerId.toString());
  const posLabel = POSITION_LABELS[position] ?? position;
  const primaryPlayer = allPlayers == null ? void 0 : allPlayers.find((p) => p.id === playerId);
  const primaryName = (primaryPlayer == null ? void 0 : primaryPlayer.name.split(" ").at(-1)) ?? "Deg";
  const selectedPlayers = activeSelected.map((id) => allPlayers == null ? void 0 : allPlayers.find((p) => p.id === id)).filter(Boolean);
  const allParticipants = [
    {
      playerId,
      name: primaryName,
      isPrimary: true,
      stats: primaryStats ?? null
    },
    ...selectedPlayers.map((p) => ({
      playerId: p.id,
      name: p.name.split(" ").at(-1) ?? "",
      isPrimary: false,
      stats: statsMap.get(p.id.toString()) ?? null
    }))
  ];
  if (compact) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", "data-ocid": "comparison-compact", children: loadingStats ? /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonTable, {}) : visibleDefs.map((def) => {
      const entries = allParticipants.map((p) => ({
        playerId: p.playerId.toString(),
        name: p.name,
        value: p.stats ? def.compute(p.stats) : void 0,
        isPrimary: p.isPrimary
      }));
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        StatBarRow,
        {
          def,
          entries,
          avg: avgMap.get(def.key)
        },
        def.key
      );
    }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", "data-ocid": "comparison-tab", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground", children: [
        "Sammenligning: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-primary", children: posLabel })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: "Velg opp til 3" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2", "data-ocid": "comparison-chips", children: suggestions.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      PlayerChip,
      {
        player: p,
        selected: selected.some((x) => x === p.id),
        onToggle: () => togglePlayer(p.id)
      },
      p.id.toString()
    )) }),
    loadingStats ? /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonTable, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: visibleDefs.map((def) => {
      const entries = allParticipants.map((p) => ({
        playerId: p.playerId.toString(),
        name: p.name,
        value: p.stats ? def.compute(p.stats) : void 0,
        isPrimary: p.isPrimary
      }));
      const hasAny = entries.some((e) => e.value !== void 0);
      if (!hasAny) return null;
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        StatBarRow,
        {
          def,
          entries,
          avg: avgMap.get(def.key)
        },
        def.key
      );
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-4 text-[10px] text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block size-2.5 rounded-sm bg-primary/30" }),
        "Best i kategorien"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block size-2.5 rounded-sm bg-muted" }),
        "Lavere"
      ] })
    ] })
  ] });
}
const TABS = [
  { id: "sesong", label: "Sesong" },
  { id: "kamp", label: "Kamphistorikk" },
  { id: "form", label: "Formkurve" }
];
function n(v) {
  return v !== void 0 ? Number(v) : void 0;
}
function fmt(v) {
  return v !== void 0 ? v.toString() : "—";
}
function isGK(pos) {
  return pos === Position.Keeper;
}
function usePositionStats(position) {
  const { data: allPlayers } = usePlayers();
  return { posLabel: POSITION_LABELS[position] ?? position, allPlayers };
}
function StatChip({
  label,
  value,
  highlight
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "flex flex-col items-center px-3 py-2 rounded-xl border",
        highlight ? "bg-primary/10 border-primary/30" : "bg-card border-border"
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: cn(
              "font-display font-bold text-lg leading-none",
              highlight ? "text-primary" : "text-foreground"
            ),
            children: value
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5", children: label })
      ]
    }
  );
}
function FormBarChart({
  stats,
  gk
}) {
  const recent = [...stats].sort((a, b) => Number(a.matchId - b.matchId)).slice(-5);
  const values = recent.map(
    (s) => gk ? Number(s.saves ?? 0n) : Number(s.goals ?? 0n)
  );
  const maxVal = Math.max(...values, 1);
  const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const statLabel = gk ? "Redninger" : "Mål";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl bg-card border border-border p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end gap-2 h-28", children: [
      recent.map((s, i) => {
        const val = values[i];
        const pct = maxVal > 0 ? val / maxVal * 100 : 0;
        const isLast = i === recent.length - 1;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "flex-1 flex flex-col items-center justify-end gap-1",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: cn(
                    "text-[10px] font-bold leading-none",
                    isLast ? "text-primary" : "text-muted-foreground"
                  ),
                  children: val > 0 ? val : ""
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: cn(
                    "w-full rounded-t-sm transition-all duration-500 min-h-[3px]",
                    isLast ? "bg-primary" : "bg-primary/40"
                  ),
                  style: { height: `${Math.max(pct, 3)}%` }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] text-muted-foreground", children: i + 1 })
            ]
          },
          s.id.toString()
        );
      }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute pointer-events-none" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mt-3 pt-2 border-t border-border/50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-muted-foreground", children: [
        statLabel,
        " per kamp"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] font-display font-bold text-primary", children: [
        "Snitt: ",
        avg.toFixed(1),
        " ",
        statLabel.toLowerCase(),
        "/kamp"
      ] })
    ] })
  ] });
}
function PositionIndicator({
  player,
  seasonStats
}) {
  const { posLabel } = usePositionStats(player.position);
  const gk = isGK(player.position);
  const mc = Math.max(Number(seasonStats.matchesPlayed), 1);
  const primaryStat = gk ? Number(seasonStats.totalSaves ?? 0n) / mc : Number(seasonStats.totalGoals ?? 0n) / mc;
  const statName = gk ? "redninger" : "mål";
  const posAvg = gk ? 7.8 : 3.5;
  const isAbove = primaryStat > posAvg;
  const diff = Math.abs(primaryStat - posAvg).toFixed(1);
  const samePosPrimary = gk ? 8.2 : 4.9;
  const samePosCount = 4;
  const rank = primaryStat >= samePosPrimary ? 1 : primaryStat >= posAvg ? 2 : primaryStat >= posAvg * 0.8 ? 3 : 4;
  const rankColor = rank === 1 ? "text-yellow-400 border-yellow-400/40 bg-yellow-400/10" : rank === 2 ? "text-slate-300 border-slate-300/40 bg-slate-300/10" : rank === 3 ? "text-amber-600 border-amber-600/40 bg-amber-600/10" : "text-muted-foreground border-border bg-muted/40";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-4 space-y-2", "data-ocid": "position-indicator", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: cn(
          "flex items-center gap-3 rounded-xl border px-4 py-3",
          isAbove ? "bg-chart-2/10 border-chart-2/30" : "bg-destructive/10 border-destructive/30"
        ),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: cn(
                "size-8 rounded-full flex items-center justify-center flex-shrink-0",
                isAbove ? "bg-chart-2/20" : "bg-destructive/20"
              ),
              children: isAbove ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { className: "size-4 text-chart-2" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { className: "size-4 text-destructive" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "p",
              {
                className: cn(
                  "text-[13px] font-display font-bold",
                  isAbove ? "text-chart-2" : "text-destructive"
                ),
                children: [
                  isAbove ? "Over snittet" : "Under snittet",
                  " for ",
                  posLabel,
                  "e"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground mt-0.5", children: [
              primaryStat.toFixed(1),
              " ",
              statName,
              "/kamp · snitt ",
              posAvg.toFixed(1),
              " ",
              "· ",
              isAbove ? "+" : "-",
              diff
            ] })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex items-center gap-3 rounded-xl bg-card border border-border px-4 py-3",
        "data-ocid": "position-ranking",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: cn(
                "size-9 rounded-full border flex items-center justify-center flex-shrink-0 font-display font-black text-sm",
                rankColor
              ),
              children: rank <= 3 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Medal, { className: "size-4" }) : `#${rank}`
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[13px] font-display font-bold text-foreground", children: [
              "Rangering: #",
              rank,
              " av ",
              samePosCount,
              " ",
              posLabel,
              "e"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground", children: [
              "Basert på ",
              statName,
              " per kamp · ",
              primaryStat.toFixed(1),
              "/kamp"
            ] })
          ] }),
          rank <= 3 && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: cn(
                "text-[10px] font-display font-bold px-2 py-0.5 rounded-full border",
                rankColor
              ),
              children: rank === 1 ? "Gull" : rank === 2 ? "Sølv" : "Bronse"
            }
          )
        ]
      }
    )
  ] });
}
function FollowButton({ playerId }) {
  const { data: isFollowing } = useIsFollowing(playerId);
  const follow = useFollowPlayer();
  const unfollow = useUnfollowPlayer();
  const isLoading = follow.isPending || unfollow.isPending;
  if (isFollowing) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        variant: "outline",
        onClick: () => unfollow.mutate(playerId),
        disabled: isLoading,
        className: "flex-1 h-12 rounded-full font-display font-bold tracking-wide border-primary text-primary hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition-smooth text-base",
        "data-ocid": "player-unfollow-btn",
        children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : "✓ FØLGER"
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Button,
    {
      onClick: () => follow.mutate(playerId),
      disabled: isLoading,
      className: "flex-1 h-12 rounded-full font-display font-bold tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth shadow-md text-base",
      "data-ocid": "player-follow-btn",
      children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : "+ FØLG SPILLER"
    }
  );
}
function PlayerHero({
  player,
  teamName,
  teamId
}) {
  const initials = player.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border-b border-border px-4 pt-5 pb-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-4 mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-shrink-0 relative", children: [
        player.imageUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: player.imageUrl,
            alt: player.name,
            className: "size-24 rounded-2xl object-cover border-2 border-primary/40"
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/40 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display font-bold text-3xl text-primary", children: initials }) }),
        player.jerseyNumber !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute -bottom-2 -right-2 size-7 rounded-full bg-primary text-primary-foreground font-display font-black text-[11px] flex items-center justify-center border-2 border-background", children: player.jerseyNumber.toString() })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0 pt-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-display font-bold text-2xl text-foreground leading-tight break-words", children: player.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 mt-1.5 flex-wrap", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(PositionBadge, { position: player.position, size: "md" }),
          player.isActive && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-chart-2/15 text-chart-2 border border-chart-2/30 font-display font-semibold uppercase tracking-wide", children: "Aktiv" })
        ] }),
        teamName && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Link,
          {
            to: "/team/$id",
            params: { id: teamId.toString() },
            className: "inline-flex items-center gap-1.5 mt-2.5 text-sm font-display font-semibold text-primary hover:text-primary/80 transition-colors group",
            "data-ocid": "player-team-link",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "size-3.5 opacity-70" }),
              teamName,
              /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(FollowButton, { playerId: player.id }),
      teamName && /* @__PURE__ */ jsxRuntimeExports.jsx(
        Link,
        {
          to: "/team/$id",
          params: { id: teamId.toString() },
          "data-ocid": "player-team-btn",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "outline",
              className: "h-12 px-4 rounded-full border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-smooth",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "size-4" })
            }
          )
        }
      )
    ] })
  ] });
}
function NextMatchModule({
  player,
  teamName
}) {
  const { data: match, isLoading } = useNextMatchForTeam(player.teamId);
  const [countdown, setCountdown] = reactExports.useState("");
  const opponentId = match ? match.homeTeamId === player.teamId ? match.awayTeamId : match.homeTeamId : void 0;
  const { data: opponentTeam } = useTeam(opponentId ?? 0n);
  reactExports.useEffect(() => {
    if (!match) return;
    const update = () => setCountdown(getCountdown(match.startTime));
    update();
    const id = setInterval(update, 6e4);
    return () => clearInterval(id);
  }, [match]);
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-4 rounded-2xl border border-primary/20 bg-card p-4 space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-24" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-6 w-48" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-10 w-full rounded-xl" })
    ] });
  }
  if (!match) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-4 rounded-2xl border border-border bg-card/60 p-4 flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "size-5 text-muted-foreground flex-shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Ingen kommende kamp planlagt" })
    ] });
  }
  const isHome = match.homeTeamId === player.teamId;
  const opponentName = (opponentTeam == null ? void 0 : opponentTeam.name) ?? "Motstander";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "mx-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/8 to-primary/3 overflow-hidden",
      "data-ocid": "next-match-module",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 pt-3 pb-2 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-display font-bold uppercase tracking-widest text-primary", children: "Neste kamp" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: cn(
                "text-[10px] font-display font-bold uppercase tracking-wide px-2 py-0.5 rounded-full",
                isHome ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              ),
              children: isHome ? "HJEMME" : "BORTE"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 pb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-display font-bold text-foreground text-base leading-tight", children: [
            teamName ?? "Laget",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground font-normal", children: "vs" }),
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-primary", children: opponentName })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 flex-wrap mt-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5 text-xs text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "size-3.5" }),
              formatMatchDate(match.startTime)
            ] }),
            match.venue && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5 text-xs text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { className: "size-3.5" }),
              match.venue
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-4 mb-4 mt-2 rounded-xl bg-primary/15 border border-primary/25 px-4 py-3 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground uppercase tracking-wide", children: "Kampstart om" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display font-bold text-primary text-xl", children: countdown || getCountdown(match.startTime) })
        ] })
      ]
    }
  );
}
function QuickStatsRow({
  player,
  seasonStats
}) {
  const gk = isGK(player.position);
  const mc = Number((seasonStats == null ? void 0 : seasonStats.matchesPlayed) ?? 1n) || 1;
  const chips = reactExports.useMemo(() => {
    var _a;
    if (!seasonStats) return [];
    const result = [
      { label: "Kamper", value: seasonStats.matchesPlayed.toString() }
    ];
    if (gk) {
      if (seasonStats.totalSaves !== void 0) {
        result.push({
          label: "Red/kamp",
          value: (Number(seasonStats.totalSaves) / mc).toFixed(1),
          highlight: true
        });
      }
    } else {
      if (seasonStats.totalGoals !== void 0) {
        result.push({
          label: "Mål/kamp",
          value: (Number(seasonStats.totalGoals) / mc).toFixed(2),
          highlight: true
        });
      }
      if (seasonStats.totalAssists !== void 0) {
        result.push({
          label: "Assists",
          value: ((_a = n(seasonStats.totalAssists)) == null ? void 0 : _a.toString()) ?? "—"
        });
      }
    }
    if (seasonStats.totalMinutes !== void 0) {
      result.push({
        label: "Min/kamp",
        value: Math.round(Number(seasonStats.totalMinutes) / mc).toString()
      });
    }
    return result.slice(0, 4);
  }, [seasonStats, gk, mc]);
  if (!seasonStats || chips.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4", "data-ocid": "quick-stats-row", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-4 gap-2", children: chips.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    StatChip,
    {
      label: c.label,
      value: c.value,
      highlight: c.highlight
    },
    c.label
  )) }) });
}
function TeamNavCard({
  teamId,
  teamName
}) {
  if (!teamName) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Link,
    {
      to: "/team/$id",
      params: { id: teamId.toString() },
      className: "mx-4 flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-4 hover:border-primary/40 hover:bg-card/80 transition-smooth group",
      "data-ocid": "team-nav-card",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "size-4.5 text-primary" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Se hele lagstallen" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-bold text-foreground text-sm", children: teamName })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" })
      ]
    }
  );
}
function StatRow({
  label,
  value,
  highlight
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between py-2.5 border-b border-border/40 last:border-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        className: cn(
          "font-mono font-bold text-sm tabular-nums",
          highlight ? "text-primary" : "text-foreground"
        ),
        children: value
      }
    )
  ] });
}
function StatGroup({
  title,
  rows
}) {
  if (rows.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border bg-card overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 py-2.5 bg-muted/40 border-b border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground", children: title }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4", children: rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      StatRow,
      {
        label: row.label,
        value: row.value,
        highlight: row.highlight
      },
      row.label
    )) })
  ] });
}
function fmtPct(v) {
  if (v === void 0 || v === null) return null;
  return `${v.toFixed(1)}%`;
}
function fmtAvg1(v) {
  if (v === void 0 || v === null) return null;
  return v.toFixed(1);
}
function fmtAvg2(v) {
  if (v === void 0 || v === null) return null;
  return v.toFixed(2);
}
function fmtBig(v, alwaysShow) {
  if (v === void 0 || v === null) return null;
  if (!alwaysShow && v === 0n) return null;
  return Number(v).toString();
}
function SeasonTab({
  stats,
  player
}) {
  function row(label, value, highlight) {
    if (value === null) return null;
    return { label, value, highlight };
  }
  function compact(arr) {
    return arr.filter((x) => x !== null);
  }
  const goalsGroup = compact([
    row("Total mål", fmtBig(stats.totalGoals, true), !isGK(player.position)),
    row("Total uttelling %", fmtPct(stats.shootingPercent)),
    row("Total skudd", fmtBig(stats.totalShots)),
    row("Snitt mål/kamp", fmtAvg1(stats.goalsPerGame))
  ]);
  const fieldGoalsGroup = compact([
    row("Spillermål", fmtBig(stats.fieldGoals)),
    row("Spillerskudd", fmtBig(stats.fieldShots)),
    row("Uttelling spill", fmtPct(stats.fieldGoalPercent))
  ]);
  const sevenMGroup = compact([
    row("Mål 7M", fmtBig(stats.goals7m)),
    row("Skudd 7M", fmtBig(stats.shots7m)),
    row("Uttelling 7M", fmtPct(stats.percent7m))
  ]);
  const assistGroup = compact([
    row("Assist", fmtBig(stats.totalAssists)),
    row("Assist snitt/kamp", fmtAvg1(stats.assistsPerGame)),
    row("Teknisk feil", fmtBig(stats.technicalFaults)),
    row("Forårsaket 7M", fmtBig(stats.provoked7m)),
    row("Tildelt 7M", fmtBig(stats.awarded7m))
  ]);
  const disciplineGroup = compact([
    row("Advarsel", fmtBig(stats.totalYellowCards)),
    row("2 min utvisning", fmtBig(stats.totalTwoMin)),
    row("Rødt kort", fmtBig(stats.totalRedCards)),
    row("Antall kamper", Number(stats.matchesPlayed).toString(), true),
    row("Spillertid (min)", fmtBig(stats.totalMinutes, true))
  ]);
  const mepGroup = compact([
    row("Snitt MEP", fmtAvg2(stats.mepAvg), true),
    row("Total MEP", fmtAvg2(stats.mepTotal), true)
  ]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", "data-ocid": "season-stats-tab", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] uppercase tracking-widest text-muted-foreground font-display font-semibold", children: [
      "Sesong ",
      stats.season
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StatGroup, { title: "Mål og skudd", rows: goalsGroup }),
    fieldGoalsGroup.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(StatGroup, { title: "Spillemål", rows: fieldGoalsGroup }),
    sevenMGroup.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(StatGroup, { title: "7-meter", rows: sevenMGroup }),
    assistGroup.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(StatGroup, { title: "Assist og disiplin", rows: assistGroup }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StatGroup, { title: "Disiplin og tid", rows: disciplineGroup }),
    mepGroup.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(StatGroup, { title: "MEP", rows: mepGroup })
  ] });
}
function MatchTab({ stats }) {
  const hasAssists = stats.some((s) => s.assists !== void 0);
  const hasTwoMin = stats.some((s) => s.twoMinSuspensions !== void 0);
  const hasYellow = stats.some((s) => s.yellowCards !== void 0);
  const hasRed = stats.some((s) => s.redCards !== void 0);
  const hasSaves = stats.some((s) => s.saves !== void 0);
  if (stats.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-12 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm", children: "Ingen kampstatistikk tilgjengelig" }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto -mx-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-xs min-w-[320px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left pl-4 pb-2 text-muted-foreground font-display uppercase tracking-wider text-[10px] w-8", children: "#" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-center pb-2 text-muted-foreground font-display uppercase tracking-wider text-[10px]", children: "Min" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-center pb-2 text-muted-foreground font-display uppercase tracking-wider text-[10px]", children: "Mål" }),
      hasAssists && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-center pb-2 text-muted-foreground font-display uppercase tracking-wider text-[10px]", children: "Ass" }),
      hasSaves && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-center pb-2 text-muted-foreground font-display uppercase tracking-wider text-[10px]", children: "Red" }),
      hasTwoMin && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-center pb-2 text-muted-foreground font-display uppercase tracking-wider text-[10px]", children: "2m" }),
      hasYellow && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-center pb-2 text-muted-foreground font-display uppercase tracking-wider text-[10px]", children: "GK" }),
      hasRed && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-center pr-4 pb-2 text-muted-foreground font-display uppercase tracking-wider text-[10px]", children: "Rød" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: stats.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "tr",
      {
        className: cn(
          "border-b border-border/50",
          i % 2 === 0 ? "bg-card/40" : "bg-transparent"
        ),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "pl-4 py-2.5 text-muted-foreground text-[11px]", children: i + 1 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-center py-2.5 font-display font-semibold text-foreground", children: fmt(s.minutesPlayed) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-center py-2.5 font-display font-bold text-primary", children: s.goals !== void 0 ? s.goals.toString() : "—" }),
          hasAssists && /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-center py-2.5 text-foreground", children: s.assists !== void 0 ? s.assists.toString() : "—" }),
          hasSaves && /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-center py-2.5 font-display font-bold text-primary", children: s.saves !== void 0 ? s.saves.toString() : "—" }),
          hasTwoMin && /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-center py-2.5 text-foreground", children: s.twoMinSuspensions !== void 0 ? s.twoMinSuspensions.toString() : "—" }),
          hasYellow && /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-center py-2.5", children: s.yellowCards !== void 0 && s.yellowCards > 0n ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block size-3 rounded-sm bg-chart-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "—" }) }),
          hasRed && /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-center pr-4 py-2.5", children: s.redCards !== void 0 && s.redCards > 0n ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block size-3 rounded-sm bg-chart-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "—" }) })
        ]
      },
      s.id.toString()
    )) })
  ] }) });
}
function FormTab({ stats, gk }) {
  const statLabel = gk ? "Redninger" : "Mål";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground uppercase tracking-widest font-display", children: [
      statLabel,
      " per kamp – siste ",
      Math.min(stats.length, 5)
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(FormBarChart, { stats, gk })
  ] });
}
function PlayerPageSkeleton() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "animate-pulse", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border-b border-border px-4 pt-5 pb-5 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "size-24 rounded-2xl flex-shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 space-y-2 pt-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-7 w-44" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 mt-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-5 w-20 rounded-full" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-5 w-14 rounded-full" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-32 mt-1" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-12 w-full rounded-full" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-4 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "mx-4 h-32 rounded-2xl" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-4 gap-2 mx-4", children: [...Array(4)].map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-14 rounded-xl" }, i)
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "mx-4 h-20 rounded-2xl" })
    ] })
  ] });
}
function PlayerPage() {
  const { id } = useParams({ from: "/player/$id" });
  const router = useRouter();
  const playerId = BigInt(id);
  const [activeTab, setActiveTab] = reactExports.useState("sesong");
  const [showFullComparison, setShowFullComparison] = reactExports.useState(false);
  const { data: player, isLoading: playerLoading } = usePlayer(playerId);
  const { data: seasonStats, isLoading: seasonLoading } = usePlayerSeasonStats(playerId);
  const { data: matchStats = [], isLoading: matchLoading } = usePlayerMatchStats(playerId);
  const { data: team } = useTeam((player == null ? void 0 : player.teamId) ?? 0n);
  const isLoading = playerLoading || seasonLoading || matchLoading;
  if (isLoading && !player) return /* @__PURE__ */ jsxRuntimeExports.jsx(PlayerPageSkeleton, {});
  if (!player) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center py-20 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "size-12 text-muted-foreground" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm", children: "Spiller ikke funnet" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => router.history.back(), children: "Tilbake" })
    ] });
  }
  const gk = isGK(player.position);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col min-h-full pb-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 pt-3 pb-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => router.history.back(),
        className: "flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors",
        "data-ocid": "back-btn",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "size-4" }),
          "Tilbake"
        ]
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PlayerHero,
      {
        player,
        teamName: team == null ? void 0 : team.name,
        teamId: player.teamId
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-5 pt-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(NextMatchModule, { player, teamName: team == null ? void 0 : team.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(QuickStatsRow, { player, seasonStats }),
      seasonStats && /* @__PURE__ */ jsxRuntimeExports.jsx(PositionIndicator, { player, seasonStats }),
      matchStats.length >= 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-4 space-y-2", "data-ocid": "form-chart-section", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] uppercase tracking-widest text-muted-foreground font-display font-semibold", children: [
          "Form siste ",
          Math.min(matchStats.length, 5),
          " kamper"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FormBarChart, { stats: matchStats, gk })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-display font-bold text-foreground tracking-tight", children: "Sammenlign med lignende spillere" }),
          !showFullComparison && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setShowFullComparison(true),
              className: "text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-display font-semibold",
              "data-ocid": "expand-comparison-btn",
              children: [
                "Vis full ",
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-3.5" })
              ]
            }
          )
        ] }),
        showFullComparison ? /* @__PURE__ */ jsxRuntimeExports.jsx(ComparisonTab, { playerId: player.id, position: player.position }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          ComparisonTab,
          {
            playerId: player.id,
            position: player.position,
            compact: true
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TeamNavCard, { teamId: player.teamId, teamName: team == null ? void 0 : team.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex rounded-xl bg-card border border-border overflow-hidden", children: TABS.map((tab) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => setActiveTab(tab.id),
            className: cn(
              "flex-1 py-2.5 text-[11px] font-display font-semibold uppercase tracking-wide transition-colors",
              activeTab === tab.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            ),
            "data-ocid": `tab-${tab.id}`,
            children: tab.label
          },
          tab.id
        )) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4", children: [
          activeTab === "sesong" && (seasonStats ? /* @__PURE__ */ jsxRuntimeExports.jsx(SeasonTab, { stats: seasonStats, player }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-10 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm", children: "Ingen sesongsstatistikk tilgjengelig" }) })),
          activeTab === "kamp" && /* @__PURE__ */ jsxRuntimeExports.jsx(MatchTab, { stats: matchStats }),
          activeTab === "form" && (matchStats.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(FormTab, { stats: matchStats, gk }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-10 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm", children: "Ingen kampdata for formkurve" }) }))
        ] })
      ] })
    ] })
  ] });
}
export {
  PlayerPage as default
};
