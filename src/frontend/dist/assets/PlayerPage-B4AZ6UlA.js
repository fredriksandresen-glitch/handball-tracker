import { c as createLucideIcon, g as useParams, h as useRouter, r as reactExports, j as jsxRuntimeExports, L as Link, a as cn, U as Users, X, S as Search, P as Position } from "./index-CPElKy7J.js";
import { B as Button } from "./button-CFSQC4X0.js";
import { P as PositionBadge } from "./PositionBadge-CSTguUIW.js";
import { g as getNationalTeamInfo } from "./nationalTeamPlayers-DQ_sXgLF.js";
import { b as useIsFollowing, c as useFollowPlayer, a as useUnfollowPlayer } from "./useFollowedPlayers-BHB52LVt.js";
import { a as usePlayer, b as usePlayerSeasonStats, c as usePlayerMatchStats } from "./usePlayer-Cl8t9O8f.js";
import { r as resolveImageUrl, c as getStaticPlayers, g as getStaticProfile, m as mapClawdbotSeasonStats } from "./clawdbotPlayerProfile-CiM1Xaxo.js";
import { u as useTeam, A as ArrowLeft, a as ArrowRight } from "./useTeam-BRpB6huA.js";
import { S as Shield } from "./shield-9XBg_EMN.js";
import { T as Target } from "./target-B6NtXfdb.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$5 = [
  [
    "path",
    {
      d: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",
      key: "169zse"
    }
  ]
];
const Activity = createLucideIcon("activity", __iconNode$5);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$4 = [
  [
    "path",
    {
      d: "m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526",
      key: "1yiouv"
    }
  ],
  ["circle", { cx: "12", cy: "8", r: "6", key: "1vp47v" }]
];
const Award = createLucideIcon("award", __iconNode$4);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$3 = [
  ["path", { d: "M8 2v4", key: "1cmpym" }],
  ["path", { d: "M16 2v4", key: "4m81vk" }],
  ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2", key: "1hopcy" }],
  ["path", { d: "M3 10h18", key: "8toen8" }],
  ["path", { d: "M8 14h.01", key: "6423bh" }],
  ["path", { d: "M12 14h.01", key: "1etili" }],
  ["path", { d: "M16 14h.01", key: "1gbofw" }],
  ["path", { d: "M8 18h.01", key: "lrp35t" }],
  ["path", { d: "M12 18h.01", key: "mhygvu" }],
  ["path", { d: "M16 18h.01", key: "kzsmim" }]
];
const CalendarDays = createLucideIcon("calendar-days", __iconNode$3);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$2 = [
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16", key: "c24i48" }],
  ["path", { d: "M18 17V9", key: "2bz60n" }],
  ["path", { d: "M13 17V5", key: "1frdt8" }],
  ["path", { d: "M8 17v-3", key: "17ska0" }]
];
const ChartColumn = createLucideIcon("chart-column", __iconNode$2);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]];
const ChevronDown = createLucideIcon("chevron-down", __iconNode$1);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M16 7h6v6", key: "box55l" }],
  ["path", { d: "m22 7-8.5 8.5-5-5L2 17", key: "1t1m79" }]
];
const TrendingUp = createLucideIcon("trending-up", __iconNode);
const CLUB_LOGOS = {
  byåsen: "https://byaasen.no/wp-content/uploads/sites/4/2022/10/byaasen.svg",
  fjellhammer: "https://www.fjellhammer.no/wp-content/uploads/sites/19/2020/01/fjellhammer.svg",
  larvik: "https://www.larvikhk.no/wp-content/uploads/sites/7/2019/08/larvikhk.svg",
  molde: "https://www.handballjentan.no/wp-content/uploads/sites/8/2021/07/MOLDE-ELITE-LOGO.svg"
};
function getClubLogo(teamName) {
  var _a;
  const normalized = (teamName == null ? void 0 : teamName.toLowerCase()) ?? "";
  return (_a = Object.entries(CLUB_LOGOS).find(([key]) => normalized.includes(key))) == null ? void 0 : _a[1];
}
function isGK(position) {
  return position === Position.Keeper;
}
function asNumber(value) {
  return value === void 0 ? void 0 : Number(value);
}
function formatNumber(value) {
  if (value === void 0) return "-";
  return typeof value === "bigint" ? value.toString() : value.toString();
}
function formatDecimal(value, digits = 1) {
  return value === void 0 ? "-" : value.toFixed(digits);
}
function formatPct(value) {
  return value === void 0 ? "-" : `${value.toFixed(1)}%`;
}
function formatSigned(value, digits = 1) {
  if (value === void 0) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}
function getMatchDate(match) {
  return match.date ?? match.matchId.toString();
}
function getStaticTeamName(playerId) {
  var _a;
  return ((_a = getStaticProfile(playerId)) == null ? void 0 : _a.player.team) ?? "Ukjent lag";
}
function hasUsefulStats(stats) {
  return Number(stats.matchesPlayed) > 0 || (stats.mepAvg ?? 0) !== 0;
}
function compareDelta(base, other, higherIsBetter = true) {
  if (base === void 0 || other === void 0) return null;
  const delta = other - base;
  const good = higherIsBetter ? delta > 0 : delta < 0;
  const bad = higherIsBetter ? delta < 0 : delta > 0;
  return { delta, good, bad };
}
function TeamLogo({ teamName, size = "sm" }) {
  const logoUrl = getClubLogo(teamName);
  const boxClass = size === "md" ? "size-10" : "size-5";
  const imgClass = size === "md" ? "size-10" : "size-5";
  if (!logoUrl) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: size === "md" ? "size-5 text-primary" : "size-4" });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: cn(
        "inline-flex items-center justify-center shrink-0",
        boxClass
      ),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: logoUrl, alt: "", className: cn("object-contain", imgClass) })
    }
  );
}
function StatCard({
  label,
  value,
  detail,
  highlight
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "rounded-xl border px-4 py-3 min-h-[82px] flex flex-col justify-center overflow-hidden",
        highlight ? "bg-primary/12 border-primary/45 shadow-[inset_0_0_0_1px_rgba(18,224,214,0.12)]" : "bg-card border-border"
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            className: cn(
              "font-display font-black text-3xl leading-none tabular-nums",
              highlight ? "text-primary" : "text-foreground"
            ),
            children: value
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold", children: label }),
        detail && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: detail })
      ]
    }
  );
}
function PlayerHero({
  player,
  teamName,
  teamId
}) {
  const { data: isFollowing = false, isLoading: checkingFollow } = useIsFollowing(player.id);
  const followMutation = useFollowPlayer();
  const unfollowMutation = useUnfollowPlayer();
  const isFollowLoading = checkingFollow || followMutation.isPending || unfollowMutation.isPending;
  const initials = player.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const nationalTeam = getNationalTeamInfo(player.id);
  function handleFollowClick() {
    if (isFollowing) unfollowMutation.mutate(player.id);
    else followMutation.mutate(player.id);
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "bg-card border-b border-border px-4 py-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-4", children: [
      resolveImageUrl(player.imageUrl) ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        "img",
        {
          src: resolveImageUrl(player.imageUrl),
          alt: player.name,
          className: "size-28 rounded-2xl object-cover object-top border-2 border-primary/40 bg-muted"
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-28 rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-cyan-950 border-2 border-primary/40 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display font-black text-3xl text-primary", children: initials }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0 pt-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-display font-black text-3xl text-foreground leading-tight break-words", children: player.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mt-2 flex-wrap", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(PositionBadge, { position: player.position, size: "md" }),
          player.isActive && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-chart-2/15 text-chart-2 border border-chart-2/30 font-display font-bold uppercase tracking-wide", children: "Aktiv" })
        ] }),
        teamName && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
            (nationalTeam == null ? void 0 : nationalTeam.logoUrl) && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "a",
              {
                href: nationalTeam.sourceUrl,
                target: "_blank",
                rel: "noreferrer",
                className: "inline-flex size-9 items-center justify-center p-0",
                title: nationalTeam.teamLabel,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "img",
                  {
                    src: nationalTeam.logoUrl,
                    alt: nationalTeam.teamLabel,
                    className: "max-h-full max-w-full object-contain"
                  }
                )
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Link,
              {
                to: "/team/$id",
                params: { id: teamId.toString() },
                className: "inline-flex items-center gap-2 text-sm font-display font-bold text-primary hover:text-primary/80 transition-colors",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TeamLogo, { teamName }),
                  teamName,
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-4" })
                ]
              }
            )
          ] }),
          nationalTeam && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-display font-bold uppercase tracking-widest text-muted-foreground", children: "Landslagsspiller" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 mt-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          type: "button",
          onClick: handleFollowClick,
          disabled: isFollowLoading,
          variant: isFollowing ? "outline" : "default",
          className: cn(
            "flex-1 h-12 rounded-full font-display font-black tracking-widest",
            isFollowing ? "border-primary/40 text-primary hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40" : "bg-primary text-primary-foreground hover:bg-primary/90"
          ),
          children: isFollowing ? "✓ FØLGER" : "+ FØLG SPILLER"
        }
      ),
      teamName && /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/team/$id", params: { id: teamId.toString() }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "outline",
          className: "h-12 px-4 rounded-full border-border text-muted-foreground hover:text-primary hover:border-primary/40",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "size-4" })
        }
      ) })
    ] })
  ] });
}
function KeyStats({
  player,
  stats
}) {
  if (!stats) return null;
  const keeper = isGK(player.position);
  const matches = Math.max(Number(stats.matchesPlayed), 1);
  const totalGoals = asNumber(stats.totalGoals);
  const totalSaves = asNumber(stats.totalSaves);
  const shotsAgainst = asNumber(stats.totalShots);
  const savesPerMatch = totalSaves === void 0 ? void 0 : totalSaves / matches;
  const goalsPerMatch = totalGoals === void 0 ? void 0 : totalGoals / matches;
  if (keeper) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "px-4", "data-ocid": "key-stats", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Snitt MEP", value: formatDecimal(stats.mepAvg), detail: matches + " kamper", highlight: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Rednings%", value: formatPct(stats.shootingPercent), detail: "sesongsnitt" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Redninger", value: formatNumber(totalSaves), detail: savesPerMatch === void 0 ? void 0 : savesPerMatch.toFixed(1) + " per kamp" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Skudd mot", value: formatNumber(shotsAgainst), detail: "totalt" })
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "px-4", "data-ocid": "key-stats", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Snitt MEP", value: formatDecimal(stats.mepAvg), detail: matches + " kamper", highlight: true }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Total MEP", value: formatDecimal(stats.mepTotal), detail: "sesongscore" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Mål", value: formatNumber(totalGoals), detail: goalsPerMatch === void 0 ? void 0 : goalsPerMatch.toFixed(2) + " per kamp" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      StatCard,
      {
        label: "Assists",
        value: formatNumber(stats.totalAssists),
        detail: stats.assistsPerGame === void 0 ? void 0 : stats.assistsPerGame.toFixed(1) + " per kamp"
      }
    )
  ] }) });
}
function FormOverview({
  player,
  stats
}) {
  const keeper = isGK(player.position);
  const recent = reactExports.useMemo(() => {
    return stats.filter((match) => typeof match.mep === "number").sort((a, b) => getMatchDate(a).localeCompare(getMatchDate(b))).slice(-5);
  }, [stats]);
  const values = recent.map((match) => match.mep ?? 0);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = Math.max(max - min, 1);
  const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const last = values.at(-1);
  const best = values.length ? Math.max(...values) : void 0;
  if (recent.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mx-4 space-y-3", "data-ocid": "form-overview", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold", children: [
          "MEP siste ",
          recent.length,
          " kamper"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-display font-black text-lg text-foreground", children: "Formkurve basert på prestasjonsscore" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "size-5 text-primary" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border bg-card p-4 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl bg-primary/12 border border-primary/35 px-3 py-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[9px] uppercase tracking-widest text-muted-foreground", children: "Siste" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-black text-2xl text-primary leading-none tabular-nums", children: formatDecimal(last) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl bg-muted/35 border border-border px-3 py-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[9px] uppercase tracking-widest text-muted-foreground", children: "Snitt" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-black text-2xl text-foreground leading-none tabular-nums", children: avg.toFixed(1) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl bg-muted/35 border border-border px-3 py-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[9px] uppercase tracking-widest text-muted-foreground", children: "Beste" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-black text-2xl text-foreground leading-none tabular-nums", children: formatDecimal(best) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-28 rounded-xl bg-background/45 border border-border/60 px-3 pt-3 pb-2 flex items-end gap-2", children: recent.map((match) => {
        const value = match.mep ?? 0;
        const height = 18 + (value - min) / range * 70;
        const isLast = match === recent.at(-1);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 h-full flex flex-col justify-end gap-1 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 flex items-end justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("w-full max-w-12 rounded-t-lg transition-all duration-500", value < 0 ? "bg-destructive/70" : isLast ? "bg-primary" : "bg-primary/45"), style: { height: height + "%" } }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: cn("text-center text-[11px] font-mono font-bold tabular-nums truncate", isLast ? "text-primary" : "text-muted-foreground"), children: formatDecimal(value) })
        ] }, match.id.toString());
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: recent.map((match) => {
        const value = match.mep ?? 0;
        const isLast = match === recent.at(-1);
        const keeperLine = (match.date ?? "Siste kamp") + " · " + formatNumber(match.saves) + " redninger · " + formatPct(match.savePct);
        const playerLine = (match.date ?? "Siste kamp") + " · " + formatNumber(match.goals) + " mål · " + formatNumber(match.assists) + " assist";
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("rounded-xl border px-3 py-2 flex items-center justify-between gap-3", isLast ? "border-primary/45 bg-primary/8" : "border-border bg-background/35"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-bold text-sm text-foreground truncate", children: match.opponent ? "mot " + match.opponent : "Kamp" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: keeper ? keeperLine : playerLine })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: cn("font-display font-black text-2xl leading-none tabular-nums", value < 0 ? "text-destructive" : isLast ? "text-primary" : "text-foreground"), children: formatSigned(value) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[9px] uppercase tracking-widest text-muted-foreground", children: "MEP" })
          ] })
        ] }, match.id.toString() + "-row");
      }) })
    ] })
  ] });
}
function InsightCards({
  player,
  stats
}) {
  if (!stats) return null;
  const keeper = isGK(player.position);
  const matches = Math.max(Number(stats.matchesPlayed), 1);
  const totalGoals = asNumber(stats.totalGoals) ?? 0;
  const totalAssists = asNumber(stats.totalAssists) ?? 0;
  const totalSaves = asNumber(stats.totalSaves) ?? 0;
  const shotsAgainst = asNumber(stats.totalShots) ?? 0;
  const goalsAgainst = Math.max(shotsAgainst - totalSaves, 0);
  const savesPerMatch = totalSaves / matches;
  const directContributions = totalGoals + totalAssists;
  const contributionPerMatch = directContributions / matches;
  const technicalFaults = asNumber(stats.technicalFaults) ?? 0;
  const assistFaultBalance = totalAssists - technicalFaults;
  if (keeper) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mx-4 grid grid-cols-1 md:grid-cols-2 gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-primary/30 bg-primary/10 px-4 py-4 flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-11 rounded-xl bg-primary/15 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Award, { className: "size-5 text-primary" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-display font-black text-primary text-sm", children: [
            "Keeperprofil: ",
            formatPct(stats.shootingPercent),
            " redningsprosent"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
            totalSaves,
            " redninger · ",
            savesPerMatch.toFixed(1),
            " per kamp"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border bg-card px-4 py-4 flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-11 rounded-xl bg-chart-2/10 border border-chart-2/25 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Target, { className: "size-5 text-chart-2" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-display font-black text-foreground text-sm", children: [
            shotsAgainst,
            " skudd mot · ",
            goalsAgainst,
            " mål imot"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
            "Snitt MEP ",
            formatDecimal(stats.mepAvg),
            " · total MEP ",
            formatDecimal(stats.mepTotal)
          ] })
        ] })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mx-4 grid grid-cols-1 md:grid-cols-2 gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-primary/30 bg-primary/10 px-4 py-4 flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-11 rounded-xl bg-primary/15 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Award, { className: "size-5 text-primary" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-display font-black text-primary text-sm", children: [
          "Angrepsbidrag: ",
          formatDecimal(stats.mepAvg),
          " i snitt MEP"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
          "Total MEP ",
          formatDecimal(stats.mepTotal),
          " gjennom ",
          matches,
          " kamper."
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border bg-card px-4 py-4 flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-11 rounded-xl bg-chart-2/10 border border-chart-2/25 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Target, { className: "size-5 text-chart-2" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-display font-black text-foreground text-sm", children: [
          directContributions,
          " målpoeng · ",
          contributionPerMatch.toFixed(1),
          " per kamp"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
          "Assist/teknisk-feil balanse: ",
          formatSigned(assistFaultBalance, 0),
          " · uttelling ",
          formatPct(stats.shootingPercent)
        ] })
      ] })
    ] })
  ] });
}
function SeasonDetails({
  player,
  stats
}) {
  var _a, _b;
  const keeper = isGK(player.position);
  const matches = Math.max(Number(stats.matchesPlayed), 1);
  const totalSaves = asNumber(stats.totalSaves);
  const shotsAgainst = asNumber(stats.totalShots);
  const goalsAgainst = totalSaves === void 0 || shotsAgainst === void 0 ? void 0 : Math.max(shotsAgainst - totalSaves, 0);
  const keeperRows = [["Snitt MEP", formatDecimal(stats.mepAvg)], ["Total MEP", formatDecimal(stats.mepTotal)], ["Redninger", formatNumber(totalSaves)], ["Redningsprosent", formatPct(stats.shootingPercent)], ["Skudd mot", formatNumber(shotsAgainst)], ["Mål imot", formatNumber(goalsAgainst)], ["Redninger/kamp", totalSaves === void 0 ? "-" : (totalSaves / matches).toFixed(2)], ["Assists", formatNumber(stats.totalAssists)], ["Tekniske feil", formatNumber(stats.technicalFaults)], ["2 min", formatNumber(stats.totalTwoMin)], ["Kamper", stats.matchesPlayed.toString()]];
  const playerRows = [["Snitt MEP", formatDecimal(stats.mepAvg)], ["Total MEP", formatDecimal(stats.mepTotal)], ["Total mål", formatNumber(stats.totalGoals)], ["Skudd", formatNumber(stats.totalShots)], ["Uttelling", formatPct(stats.shootingPercent)], ["Mål/kamp", ((_a = stats.goalsPerGame) == null ? void 0 : _a.toFixed(2)) ?? "-"], ["Assists", formatNumber(stats.totalAssists)], ["Assists/kamp", ((_b = stats.assistsPerGame) == null ? void 0 : _b.toFixed(2)) ?? "-"], ["Tekniske feil", formatNumber(stats.technicalFaults)], ["2 min", formatNumber(stats.totalTwoMin)], ["Kamper", stats.matchesPlayed.toString()]];
  const rows = keeper ? keeperRows : playerRows;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border bg-card overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-3 border-b border-border bg-muted/35 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold", children: [
        "Sesong ",
        stats.season
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase tracking-widest text-primary font-display font-bold", children: keeper ? "Keeperdata" : "MEP først" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4", children: rows.map(([label, value], index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between py-3 border-b border-border/45 last:border-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-muted-foreground", children: label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("font-mono font-bold text-sm tabular-nums", index < 2 ? "text-primary" : "text-foreground"), children: value })
    ] }, label)) })
  ] });
}
function MatchHistory({
  player,
  stats
}) {
  const keeper = isGK(player.position);
  const [openMatchId, setOpenMatchId] = reactExports.useState(null);
  const matches = [...stats].sort((a, b) => getMatchDate(b).localeCompare(getMatchDate(a)));
  if (matches.length === 0) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-12 text-center text-sm text-muted-foreground", children: "Ingen kampstatistikk tilgjengelig" });
  const getDetailRows = (match) => [
    ["Spillermål", formatNumber(match.fieldGoals ?? match.goals)],
    ["Spillerskudd", formatNumber(match.fieldShots ?? match.shots)],
    ["Uttelling", formatPct(match.fieldShotPercentage ?? match.shotPct)],
    ["Mål 7m", formatNumber(match.sevenMeterGoals)],
    ["Skudd 7m", formatNumber(match.sevenMeterShots)],
    ["Uttelling 7m", formatPct(match.sevenMeterShotPercentage)],
    ["Assist", formatNumber(match.assists)],
    ["Teknisk feil", formatNumber(match.turnovers)],
    ["Forårsaket 7m", formatNumber(match.causedSevenMeters)],
    ["Tildelt 7m", formatNumber(match.awardedSevenMeters)],
    ["Advarsel", formatNumber(match.warnings)],
    ["2 min utvisning", formatNumber(match.twoMinSuspensions)],
    ["Rødt kort", formatNumber(match.redCards)],
    ["Spillertid", match.playTime || "-"],
    ["Total MEP", formatDecimal(match.mep)]
  ];
  const getKeeperRows = (match) => [
    ["Redninger", formatNumber(match.saves)],
    ["Redningsprosent", formatPct(match.savePct)],
    ["Skudd mot", formatNumber(match.shotsAgainst ?? match.shots)],
    ["Baklengsmål", formatNumber(match.goalsConceded)],
    ...getDetailRows(match)
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border bg-card overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[1fr_52px_52px_52px_24px] gap-2 px-4 py-2 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Kamp" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-right", children: "MEP" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-right", children: keeper ? "Red" : "Mål" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-right", children: keeper ? "Red%" : "Ass" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
    ] }),
    matches.map((match) => {
      const id = match.id.toString();
      const isOpen = openMatchId === id;
      const rows = keeper ? getKeeperRows(match) : getDetailRows(match);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-border/45 last:border-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setOpenMatchId(isOpen ? null : id),
            className: "grid w-full grid-cols-[1fr_52px_52px_52px_24px] gap-2 px-4 py-3 text-sm text-left hover:bg-muted/25 transition-colors",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-display font-bold text-foreground truncate", children: match.opponent ? "mot " + match.opponent : "Kamp" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-xs text-muted-foreground truncate", children: match.date ?? "Kamp " + match.matchId.toString() })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-right font-bold text-primary tabular-nums", children: formatDecimal(match.mep) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-right text-foreground tabular-nums", children: keeper ? formatNumber(match.saves) : formatNumber(match.goals) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-right text-foreground tabular-nums", children: keeper ? formatPct(match.savePct) : formatNumber(match.assists) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: cn("mt-0.5 size-4 text-muted-foreground transition-transform", isOpen && "rotate-180 text-primary") })
            ]
          }
        ),
        isOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border/70 bg-background/45 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 gap-px bg-border/45", children: rows.map(([label, value]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 bg-card px-3 py-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-[9px] uppercase tracking-widest text-muted-foreground font-display font-bold", children: label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: cn("mt-1 truncate font-mono text-sm font-bold tabular-nums", label === "Total MEP" ? "text-primary" : "text-foreground"), children: value })
        ] }, label)) }) }) })
      ] }, id);
    })
  ] });
}
function PlayerComparison({
  player,
  seasonStats
}) {
  const [isOpen, setIsOpen] = reactExports.useState(false);
  const [query, setQuery] = reactExports.useState("");
  const [selectedId, setSelectedId] = reactExports.useState(null);
  const candidates = reactExports.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return getStaticPlayers().filter((candidate) => candidate.id !== player.id).map((candidate) => {
      const profile = getStaticProfile(candidate.id);
      if (!profile) return null;
      const stats = mapClawdbotSeasonStats(profile);
      const teamName = profile.player.team ?? getStaticTeamName(candidate.id);
      const samePosition = candidate.position === player.position;
      const otherClub = candidate.teamId !== player.teamId;
      const searchable = [candidate.name, teamName, profile.player.position ?? ""].join(" ").toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      const score = (samePosition ? 1e3 : 0) + (otherClub ? 100 : 0) + (stats.mepAvg ?? 0) + Number(stats.matchesPlayed) / 100;
      return {
        player: candidate,
        stats,
        teamName,
        samePosition,
        otherClub,
        matchesQuery,
        score
      };
    }).filter(
      (candidate) => Boolean(candidate && candidate.matchesQuery && hasUsefulStats(candidate.stats))
    ).sort((a, b) => {
      if (a.samePosition !== b.samePosition) return a.samePosition ? -1 : 1;
      if (a.otherClub !== b.otherClub) return a.otherClub ? -1 : 1;
      return b.score - a.score;
    }).slice(0, normalizedQuery ? 8 : 5);
  }, [player.id, player.position, player.teamId, query]);
  const selected = selectedId ? candidates.find((candidate) => candidate.player.id.toString() === selectedId) ?? null : null;
  if (!seasonStats) return null;
  const keeper = isGK(player.position);
  const currentTeam = getStaticTeamName(player.id);
  const rows = selected === null ? [] : keeper ? [
    {
      label: "Snitt MEP",
      base: seasonStats.mepAvg,
      other: selected.stats.mepAvg,
      format: (value) => formatDecimal(value)
    },
    {
      label: "Kamper",
      base: Number(seasonStats.matchesPlayed),
      other: Number(selected.stats.matchesPlayed),
      format: (value) => formatNumber(value)
    },
    {
      label: "Rednings%",
      base: seasonStats.shootingPercent,
      other: selected.stats.shootingPercent,
      format: (value) => formatPct(value)
    },
    {
      label: "Redninger",
      base: asNumber(seasonStats.totalSaves),
      other: asNumber(selected.stats.totalSaves),
      format: (value) => formatNumber(value)
    },
    {
      label: "Skudd mot",
      base: asNumber(seasonStats.totalShots),
      other: asNumber(selected.stats.totalShots),
      format: (value) => formatNumber(value)
    },
    {
      label: "Tekn. feil",
      base: asNumber(seasonStats.technicalFaults),
      other: asNumber(selected.stats.technicalFaults),
      format: (value) => formatNumber(value),
      higherIsBetter: false
    }
  ] : [
    {
      label: "Snitt MEP",
      base: seasonStats.mepAvg,
      other: selected.stats.mepAvg,
      format: (value) => formatDecimal(value)
    },
    {
      label: "Kamper",
      base: Number(seasonStats.matchesPlayed),
      other: Number(selected.stats.matchesPlayed),
      format: (value) => formatNumber(value)
    },
    {
      label: "Mål",
      base: asNumber(seasonStats.totalGoals),
      other: asNumber(selected.stats.totalGoals),
      format: (value) => formatNumber(value)
    },
    {
      label: "Mål/kamp",
      base: seasonStats.goalsPerGame,
      other: selected.stats.goalsPerGame,
      format: (value) => formatDecimal(value, 2)
    },
    {
      label: "Assists",
      base: asNumber(seasonStats.totalAssists),
      other: asNumber(selected.stats.totalAssists),
      format: (value) => formatNumber(value)
    },
    {
      label: "Tekn. feil",
      base: asNumber(seasonStats.technicalFaults),
      other: asNumber(selected.stats.technicalFaults),
      format: (value) => formatNumber(value),
      higherIsBetter: false
    }
  ];
  if (!isOpen) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "mx-4", "data-ocid": "player-comparison-collapsed", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => setIsOpen(true),
        className: "w-full rounded-2xl border border-border bg-card px-4 py-4 flex items-center justify-between gap-4 hover:border-primary/45 hover:bg-card/80 transition-colors text-left",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-10 rounded-xl bg-primary/12 border border-primary/30 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "size-5 text-primary" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-black text-sm text-foreground", children: "Sammenlign spiller" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground truncate", children: "Søk eller velg forslag i samme posisjon" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-5 text-muted-foreground shrink-0" })
        ]
      }
    ) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "mx-4 space-y-3", "data-ocid": "player-comparison", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border bg-card overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-b border-border bg-muted/20 space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold", children: "Sammenlign" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-display font-black text-lg text-foreground", children: "Finn spiller å måle mot" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => {
              setIsOpen(false);
              setQuery("");
              setSelectedId(null);
            },
            className: "size-9 rounded-full border border-border bg-background/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors",
            "aria-label": "Lukk sammenligning",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-4" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            value: query,
            onChange: (event) => {
              setQuery(event.target.value);
              setSelectedId(null);
            },
            placeholder: "Søk spiller, lag eller posisjon",
            className: "w-full h-11 rounded-xl bg-background border border-border pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60"
          }
        )
      ] }),
      candidates.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2 overflow-x-auto pb-1", children: candidates.map((candidate) => {
        const active = candidate.player.id.toString() === selectedId;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => setSelectedId(candidate.player.id.toString()),
            className: cn(
              "min-w-[178px] rounded-xl border p-2 text-left transition-colors",
              active ? "border-primary/60 bg-primary/12" : "border-border bg-background/40 hover:border-primary/35"
            ),
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
              resolveImageUrl(candidate.player.imageUrl) ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                "img",
                {
                  src: resolveImageUrl(candidate.player.imageUrl),
                  alt: "",
                  className: "size-10 rounded-lg object-cover object-top bg-muted shrink-0"
                }
              ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-10 rounded-lg bg-muted shrink-0" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-display font-black text-foreground truncate", children: candidate.player.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-muted-foreground truncate", children: [
                  candidate.teamName,
                  " · MEP ",
                  formatDecimal(candidate.stats.mepAvg)
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[9px] uppercase tracking-wider text-primary font-display font-bold truncate", children: [
                  candidate.samePosition ? "Samme posisjon" : "Annen posisjon",
                  candidate.otherClub ? " · annet lag" : ""
                ] })
              ] })
            ] })
          },
          candidate.player.id.toString()
        );
      }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border bg-background/35 px-3 py-4 text-center text-sm text-muted-foreground", children: "Ingen spillere funnet. Prøv et annet navn eller lag." })
    ] }),
    selected ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[1fr_auto_1fr] gap-2 p-4 border-b border-border bg-background/25", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold", children: "Denne spilleren" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-black text-sm text-foreground truncate", children: player.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground truncate", children: currentTeam })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "self-center rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-display font-bold text-primary", children: "VS" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 text-right", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold", children: "Valgt spiller" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-black text-sm text-foreground truncate", children: selected.player.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground truncate", children: selected.teamName })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divide-y divide-border/55", children: rows.map((row) => {
        const delta = compareDelta(row.base, row.other, row.higherIsBetter ?? true);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "grid grid-cols-[1fr_92px_1fr] items-center gap-2 px-4 py-3",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-right font-mono font-bold text-sm text-foreground tabular-nums", children: row.format(row.base) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold", children: row.label }),
                delta && Math.abs(delta.delta) > 0.01 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "p",
                  {
                    className: cn(
                      "mt-0.5 text-[10px] font-mono font-bold tabular-nums",
                      delta.good && "text-chart-2",
                      delta.bad && "text-destructive",
                      !delta.good && !delta.bad && "text-muted-foreground"
                    ),
                    children: formatSigned(delta.delta, row.label === "Kamper" ? 0 : 1)
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono font-bold text-sm text-foreground tabular-nums", children: row.format(row.other) })
            ]
          },
          row.label
        );
      }) })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 py-5 text-center text-sm text-muted-foreground", children: "Velg en spiller over for å se sammenligningen." })
  ] }) });
}
function Tabs({ active, onChange }) {
  const tabs = [
    { id: "season", label: "Sesong", icon: ChartColumn },
    { id: "matches", label: "Kamper", icon: CalendarDays },
    { id: "form", label: "Form", icon: TrendingUp }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 rounded-xl bg-card border border-border overflow-hidden", children: tabs.map(({ id, label, icon: Icon }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick: () => onChange(id),
      className: cn(
        "flex items-center justify-center gap-1.5 py-3 text-[11px] font-display font-bold uppercase tracking-wide transition-colors",
        active === id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3.5" }),
        label
      ]
    },
    id
  )) }) });
}
function PlayerPage() {
  const { id } = useParams({ from: "/player/$id" });
  const router = useRouter();
  const playerId = BigInt(id);
  const [activeTab, setActiveTab] = reactExports.useState("season");
  const { data: player, isLoading: playerLoading } = usePlayer(playerId);
  const { data: seasonStats, isLoading: seasonLoading } = usePlayerSeasonStats(playerId);
  const { data: matchStats = [], isLoading: matchLoading } = usePlayerMatchStats(playerId);
  const { data: team } = useTeam((player == null ? void 0 : player.teamId) ?? 0n);
  const isLoading = playerLoading || seasonLoading || matchLoading;
  if (isLoading && !player) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 py-20 text-center text-muted-foreground", children: "Laster spillerprofil..." });
  }
  if (!player) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center py-20 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "size-12 text-muted-foreground" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm", children: "Spiller ikke funnet" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => router.history.back(), children: "Tilbake" })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col min-h-full pb-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 pt-3 pb-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => router.history.back(),
        className: "flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "size-4" }),
          "Tilbake"
        ]
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PlayerHero, { player, teamName: team == null ? void 0 : team.name, teamId: player.teamId }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-5 pt-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(KeyStats, { player, stats: seasonStats }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InsightCards, { player, stats: seasonStats }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(PlayerComparison, { player, seasonStats }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FormOverview, { player, stats: matchStats }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tabs, { active: activeTab, onChange: setActiveTab }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4", children: [
        activeTab === "season" && (seasonStats ? /* @__PURE__ */ jsxRuntimeExports.jsx(SeasonDetails, { player, stats: seasonStats }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-10 text-center text-sm text-muted-foreground", children: "Ingen sesongstatistikk tilgjengelig" })),
        activeTab === "matches" && /* @__PURE__ */ jsxRuntimeExports.jsx(MatchHistory, { player, stats: matchStats }),
        activeTab === "form" && /* @__PURE__ */ jsxRuntimeExports.jsx(FormOverview, { player, stats: matchStats })
      ] })
    ] })
  ] });
}
export {
  PlayerPage as default
};
