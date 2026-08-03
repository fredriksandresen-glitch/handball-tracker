import { j as jsxRuntimeExports, T as Trophy, f as SkeletonCard, a as cn, L as Link } from "./index-CPElKy7J.js";
import { u as useTeams } from "./useTeams-BRTMhY6Q.js";
import { m as motion } from "./proxy-ZHkh6Rkm.js";
import { S as Shield } from "./shield-9XBg_EMN.js";
import { A as ArrowUp, a as ArrowDown, M as Minus } from "./minus-CLmpXCnE.js";
import "./clawdbotPlayerProfile-CiM1Xaxo.js";
const leagueStandings = [
  { name: "Sola", primeTeamId: "223983", rank: 1, previousRank: 1, rankDelta: 0, played: 26, wins: 25, draws: 0, losses: 1, goalsFor: 865, goalsAgainst: 675, points: 50 },
  { name: "Storhamar", primeTeamId: "746223", rank: 2, previousRank: 2, rankDelta: 0, played: 26, wins: 22, draws: 1, losses: 3, goalsFor: 808, goalsAgainst: 630, points: 45 },
  { name: "Molde", primeTeamId: "775789", rank: 3, previousRank: 3, rankDelta: 0, played: 26, wins: 18, draws: 4, losses: 4, goalsFor: 844, goalsAgainst: 695, points: 40 },
  { name: "Larvik", primeTeamId: "223994", rank: 4, previousRank: 4, rankDelta: 0, played: 26, wins: 18, draws: 1, losses: 7, goalsFor: 806, goalsAgainst: 724, points: 37 },
  { name: "Tertnes", primeTeamId: "470538", rank: 5, previousRank: 5, rankDelta: 0, played: 26, wins: 14, draws: 2, losses: 10, goalsFor: 786, goalsAgainst: 730, points: 30 },
  { name: "Fana", primeTeamId: "225474", rank: 6, previousRank: 6, rankDelta: 0, played: 26, wins: 11, draws: 2, losses: 13, goalsFor: 742, goalsAgainst: 727, points: 24 },
  { name: "Fredrikstad", primeTeamId: "441651", rank: 7, previousRank: 8, rankDelta: 1, played: 26, wins: 11, draws: 2, losses: 13, goalsFor: 741, goalsAgainst: 729, points: 24 },
  { name: "Byåsen", primeTeamId: "454116", rank: 8, previousRank: 7, rankDelta: -1, played: 26, wins: 11, draws: 1, losses: 14, goalsFor: 734, goalsAgainst: 724, points: 23 },
  { name: "Gjerpen", primeTeamId: "453373", rank: 9, previousRank: 9, rankDelta: 0, played: 26, wins: 11, draws: 1, losses: 14, goalsFor: 707, goalsAgainst: 698, points: 23 },
  { name: "Follo Damer", primeTeamId: "583889", rank: 10, previousRank: 10, rankDelta: 0, played: 26, wins: 10, draws: 2, losses: 14, goalsFor: 721, goalsAgainst: 769, points: 22 },
  { name: "Oppsal", primeTeamId: "441915", rank: 11, previousRank: 11, rankDelta: 0, played: 26, wins: 9, draws: 1, losses: 16, goalsFor: 740, goalsAgainst: 795, points: 19 },
  { name: "Fjellhammer", primeTeamId: "223982", rank: 12, previousRank: 12, rankDelta: 0, played: 26, wins: 6, draws: 2, losses: 18, goalsFor: 696, goalsAgainst: 807, points: 14 },
  { name: "Haslum", primeTeamId: "928836", rank: 13, previousRank: 13, rankDelta: 0, played: 26, wins: 4, draws: 0, losses: 22, goalsFor: 635, goalsAgainst: 877, points: 8 },
  { name: "Ravens", primeTeamId: "948459", rank: 14, previousRank: 14, rankDelta: 0, played: 26, wins: 2, draws: 1, losses: 23, goalsFor: 632, goalsAgainst: 877, points: 5 }
];
function normalizeName(value) {
  return value.toLowerCase().replace(/\u00e6/g, "ae").replace(/\u00f8/g, "o").replace(/\u00e5/g, "a").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function Movement({ delta }) {
  if (delta > 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-0.5 text-chart-2 font-mono font-bold", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { className: "size-3.5" }),
      delta
    ] });
  }
  if (delta < 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-0.5 text-destructive font-mono font-bold", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { className: "size-3.5" }),
      Math.abs(delta)
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center justify-center text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Minus, { className: "size-3.5" }) });
}
function TeamLogo({ team }) {
  if (team == null ? void 0 : team.logoUrl) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-8 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: team.logoUrl, alt: "", className: "size-8 object-contain" }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "size-4 text-muted-foreground" }) });
}
function StandingRow({
  standing,
  team,
  index
}) {
  const goalDifference = standing.goalsFor - standing.goalsAgainst;
  const hrefTeamId = team == null ? void 0 : team.id.toString();
  const content = /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[34px_minmax(140px,1fr)_46px_84px_44px_34px] md:grid-cols-[44px_minmax(220px,1fr)_60px_96px_80px_54px_40px] items-center gap-2 px-3 py-3 text-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono font-black text-foreground tabular-nums", children: standing.rank }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TeamLogo, { team }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-black text-foreground truncate", children: standing.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-muted-foreground uppercase tracking-widest", children: [
          standing.played,
          " kamper"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-black text-lg text-primary leading-none tabular-nums", children: standing.points }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[9px] uppercase tracking-widest text-muted-foreground", children: "P" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 text-center font-mono font-bold tabular-nums text-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: standing.wins }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: standing.draws }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: standing.losses })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "hidden md:block text-right font-mono font-bold text-muted-foreground tabular-nums", children: [
      standing.goalsFor,
      "-",
      standing.goalsAgainst
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: cn(
          "text-right font-mono font-bold tabular-nums",
          goalDifference > 0 && "text-chart-2",
          goalDifference < 0 && "text-destructive",
          goalDifference === 0 && "text-muted-foreground"
        ),
        children: goalDifference > 0 ? `+${goalDifference}` : goalDifference
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Movement, { delta: standing.rankDelta }) })
  ] });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    motion.div,
    {
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      transition: { delay: index * 0.025 },
      className: "border-b border-border/55 last:border-0",
      children: hrefTeamId ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        Link,
        {
          to: "/team/$id",
          params: { id: hrefTeamId },
          className: "block transition-colors hover:bg-muted/25",
          "data-ocid": "standings-team-row",
          children: content
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "opacity-80", "data-ocid": "standings-team-row-empty", children: content })
    }
  );
}
function TeamsPage() {
  const { data: teams, isLoading } = useTeams();
  const teamByName = /* @__PURE__ */ new Map();
  for (const team of teams ?? []) {
    teamByName.set(normalizeName(team.name), team);
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", "data-ocid": "teams-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-1 space-y-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-display font-black text-2xl tracking-tight text-foreground", children: "REMA 1000-ligaen" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground font-body", children: "Damenes håndball — 2025/26" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Trophy, { className: "size-4 text-primary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-display font-bold text-foreground", children: "Tabell" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-4 w-px bg-border" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "Trykk på et lag for å se spillerstallen" })
    ] }),
    isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: ["a", "b", "c", "d", "e", "f"].map((key) => /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "team" }, key)) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-2xl border border-border bg-card overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[34px_minmax(140px,1fr)_46px_84px_44px_34px] md:grid-cols-[44px_minmax(220px,1fr)_60px_96px_80px_54px_40px] items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "#" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Lag" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-right", children: "Poeng" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "grid grid-cols-3 text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "S" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "U" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "T" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden md:block text-right", children: "Mål" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-right", children: "+/-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-right", children: "Form" })
      ] }),
      leagueStandings.map((standing, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        StandingRow,
        {
          standing,
          team: teamByName.get(normalizeName(standing.name)),
          index
        },
        standing.primeTeamId
      ))
    ] })
  ] });
}
export {
  TeamsPage as default
};
