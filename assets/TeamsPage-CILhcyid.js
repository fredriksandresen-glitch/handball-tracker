import { j as jsxRuntimeExports, L as Link, a as cn, e as SkeletonCard } from "./index-BrTjiQrP.js";
import { f as formatMatchDate } from "./handballService-Dbax6PK1.js";
import { S as Shield } from "./shield-Bu1_p0xX.js";
import { T as Trophy } from "./trophy-BLR5dJLX.js";
import { u as useTeams, a as useUpcomingMatches } from "./useTeams-DWX26GYj.js";
import { m as motion } from "./proxy-DJ0N1V57.js";
function TeamCard({ team, nextMatch, opponentName, className }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Link,
    {
      to: "/team/$id",
      params: { id: team.id.toString() },
      className: cn(
        "block rounded-xl bg-card border border-border p-4 transition-smooth hover:border-primary/40 hover:shadow-elevated",
        className
      ),
      "data-ocid": "team-card-link",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          team.logoUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "img",
            {
              src: team.logoUrl,
              alt: team.name,
              className: "size-10 rounded-lg object-contain flex-shrink-0"
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 border border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "size-5 text-muted-foreground" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-bold text-foreground truncate text-[15px]", children: team.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mt-0.5", children: [
              team.standingsRank !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 text-xs text-muted-foreground", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Trophy, { className: "size-3" }),
                team.standingsRank.toString(),
                ". plass"
              ] }),
              team.points !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
                team.points.toString(),
                " p"
              ] })
            ] })
          ] }),
          team.matchesPlayed !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right flex-shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg font-display font-bold text-primary", children: team.matchesPlayed.toString() }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground uppercase tracking-wide", children: "Kamper" })
          ] })
        ] }),
        nextMatch && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 pt-3 border-t border-border", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground uppercase tracking-wide mb-1", children: "Neste kamp" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-foreground font-medium", children: opponentName ? `vs ${opponentName}` : "Kamp kommende" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground mt-0.5", children: formatMatchDate(nextMatch.startTime) })
        ] })
      ]
    }
  );
}
function TeamsPage() {
  const { data: teams, isLoading } = useTeams();
  const { data: upcomingMatches } = useUpcomingMatches();
  const teamNextMatch = /* @__PURE__ */ new Map();
  for (const m of upcomingMatches ?? []) {
    const hKey = m.homeTeamId.toString();
    const aKey = m.awayTeamId.toString();
    if (!teamNextMatch.has(hKey)) teamNextMatch.set(hKey, m);
    if (!teamNextMatch.has(aKey)) teamNextMatch.set(aKey, m);
  }
  const teamNames = new Map(
    (teams ?? []).map((t) => [t.id.toString(), t.name])
  );
  const sorted = [...teams ?? []].sort((a, b) => {
    const rankA = a.standingsRank !== void 0 ? Number(a.standingsRank) : 999;
    const rankB = b.standingsRank !== void 0 ? Number(b.standingsRank) : 999;
    return rankA - rankB;
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", "data-ocid": "teams-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-1 space-y-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-display font-black text-2xl tracking-tight text-foreground", children: "REMA 1000-ligaen" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground font-body", children: "Damenes handball — 2024/25" })
    ] }),
    !isLoading && sorted.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "size-4 text-primary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-display font-bold text-foreground", children: [
          sorted.length,
          " lag"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-4 w-px bg-border" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Trophy, { className: "size-3.5 text-muted-foreground" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "Trykk på et lag for å se spillerstallen" })
      ] })
    ] }),
    isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: ["a", "b", "c", "d", "e", "f"].map((k) => /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "team" }, k)) }) : sorted.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex flex-col items-center justify-center py-16 text-center space-y-3",
        "data-ocid": "teams-empty",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-16 rounded-2xl bg-muted flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "size-8 text-muted-foreground" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-bold text-lg text-foreground", children: "Ingen lag funnet" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground max-w-xs", children: "Lagene lastes snart. Prøv å oppdatere siden." })
        ]
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: sorted.map((team, i) => {
      const nextMatch = teamNextMatch.get(team.id.toString());
      const opponentId = nextMatch ? nextMatch.homeTeamId === team.id ? nextMatch.awayTeamId.toString() : nextMatch.homeTeamId.toString() : void 0;
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        motion.div,
        {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: i * 0.04 },
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TeamCard,
            {
              team,
              nextMatch,
              opponentName: opponentId ? teamNames.get(opponentId) : void 0
            }
          )
        },
        team.id.toString()
      );
    }) })
  ] });
}
export {
  TeamsPage as default
};
