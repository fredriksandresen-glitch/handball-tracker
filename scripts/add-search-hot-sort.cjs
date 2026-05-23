const fs = require("node:fs");
const path = require("node:path");

const root = process.env.GITHUB_WORKSPACE || process.cwd();
const filePath = path.join(root, "src", "frontend", "src", "pages", "SearchPage.tsx");
let source = fs.readFileSync(filePath, "utf8");

source = source.replace(
  'import { Search, X } from "lucide-react";',
  'import { Search, TrendingUp, X } from "lucide-react";',
);

source = source.replace(
  'import { usePlayers, useSearchPlayers } from "../hooks/usePlayers";',
  'import { usePlayers, useSearchPlayers } from "../hooks/usePlayers";\nimport {\n  getStaticProfile,\n  mapClawdbotMatchStats,\n  mapClawdbotSeasonStats,\n  type EnrichedPlayerMatchStats,\n} from "../services/clawdbotPlayerProfile";',
);

source = source.replace(
  'import {\n  POSITION_LABELS,\n  type Player,\n  type PositionFilter,\n} from "../types/handball";',
  'import {\n  POSITION_LABELS,\n  type Player,\n  type PlayerSeasonStats,\n  type PositionFilter,\n} from "../types/handball";',
);

source = source.replace(
  'const POSITION_FILTERS: { value: PositionFilter; label: string }[] = [',
  'type SortMode = "hot" | "form" | "goals" | "mep" | "name";\n\nconst SORT_FILTERS: { value: SortMode; label: string }[] = [\n  { value: "hot", label: "Heitest" },\n  { value: "form", label: "Beste form" },\n  { value: "goals", label: "Flest mål" },\n  { value: "mep", label: "Snitt MEP" },\n  { value: "name", label: "Navn" },\n];\n\nconst POSITION_FILTERS: { value: PositionFilter; label: string }[] = [',
);

source = source.replace(
  `function getPositionValue(player: Player) {
  return String(player.position);
}
`,
  `function getPositionValue(player: Player) {
  return String(player.position);
}

type PlayerSearchInsight = {
  seasonStats?: PlayerSeasonStats;
  sparkValues: number[];
  formAvg?: number;
  latestMep?: number;
  hotScore: number;
  totalGoals?: number;
};

function getMatchDate(match: EnrichedPlayerMatchStats) {
  return match.date ?? match.matchId.toString();
}

function asNumber(value: bigint | undefined) {
  return value === undefined ? undefined : Number(value);
}

function getPlayerSearchInsight(player: Player): PlayerSearchInsight {
  const profile = getStaticProfile(player.id);
  if (!profile) return { sparkValues: [], hotScore: 0 };

  const seasonStats = mapClawdbotSeasonStats(profile);
  const mepMatches = (mapClawdbotMatchStats(profile) as EnrichedPlayerMatchStats[])
    .filter((match) => typeof match.mep === "number")
    .sort((a, b) => getMatchDate(a).localeCompare(getMatchDate(b)))
    .slice(-5);
  const sparkValues = mepMatches.map((match) => match.mep ?? 0);
  const latestMep = sparkValues.at(-1);
  const formAvg = sparkValues.length
    ? sparkValues.reduce((sum, value) => sum + value, 0) / sparkValues.length
    : seasonStats.mepAvg;
  const goalsPerGame = seasonStats.goalsPerGame ?? 0;
  const matches = Number(seasonStats.matchesPlayed);
  const hotScore =
    (formAvg ?? 0) * 12 +
    (seasonStats.mepAvg ?? 0) * 5 +
    goalsPerGame * 4 +
    Math.min(matches, 26) / 10;

  return {
    seasonStats,
    sparkValues,
    formAvg,
    latestMep,
    hotScore,
    totalGoals: asNumber(seasonStats.totalGoals),
  };
}

function comparePlayersBySort(
  a: Player,
  b: Player,
  sortMode: SortMode,
  insights: Map<string, PlayerSearchInsight>,
) {
  const ai = insights.get(a.id.toString()) ?? getPlayerSearchInsight(a);
  const bi = insights.get(b.id.toString()) ?? getPlayerSearchInsight(b);

  if (sortMode === "name") return a.name.localeCompare(b.name, "nb");
  if (sortMode === "goals") return (bi.totalGoals ?? 0) - (ai.totalGoals ?? 0);
  if (sortMode === "mep") {
    return (bi.seasonStats?.mepAvg ?? 0) - (ai.seasonStats?.mepAvg ?? 0);
  }
  if (sortMode === "form") return (bi.formAvg ?? 0) - (ai.formAvg ?? 0);
  return bi.hotScore - ai.hotScore;
}
`,
);

source = source.replace(
  `function SearchResult({
  player,
  teamName,
}: { player: Player; teamName?: string }) {`,
  `function SearchResult({
  player,
  teamName,
  insight,
}: {
  player: Player;
  teamName?: string;
  insight: PlayerSearchInsight;
}) {`,
);

source = source.replace(
  `      isLoading={
        checkingFollow || followMutation.isPending || unfollowMutation.isPending
      }
    />`,
  `      isLoading={
        checkingFollow || followMutation.isPending || unfollowMutation.isPending
      }
      goals={insight.totalGoals}
      sparkValues={insight.sparkValues}
    />`,
);

source = source.replace(
  '  const [positionFilter, setPositionFilter] = useState<PositionFilter>("all");',
  '  const [positionFilter, setPositionFilter] = useState<PositionFilter>("all");\n  const [sortMode, setSortMode] = useState<SortMode>("hot");',
);

source = source.replace(
  `  const results =
    positionFilter === "all"
      ? sourcePlayers
      : sourcePlayers?.filter((p) => getPositionValue(p) === positionFilter);`,
  `  const playerInsights = new Map(
    (sourcePlayers ?? []).map((player) => [
      player.id.toString(),
      getPlayerSearchInsight(player),
    ]),
  );

  const filteredResults =
    positionFilter === "all"
      ? sourcePlayers
      : sourcePlayers?.filter((p) => getPositionValue(p) === positionFilter);

  const results = filteredResults
    ? [...filteredResults].sort((a, b) =>
        comparePlayersBySort(a, b, sortMode, playerInsights),
      )
    : undefined;`,
);

source = source.replace(
  `      {/* ─── Empty prompt`,
  `      {/* ─── Sort filters ───────────────────────────────────────────── */}
      <div
        className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar"
        data-ocid="search-sort-pills"
      >
        {SORT_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setSortMode(value)}
            className={cn(
              "flex-shrink-0 h-8 px-3 rounded-full text-[11px] font-display font-semibold tracking-wide uppercase transition-smooth border inline-flex items-center gap-1.5",
              sortMode === value
                ? "bg-primary/15 text-primary border-primary/50"
                : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
            data-ocid={\`sort-pill-\${value}\`}
          >
            {(value === "hot" || value === "form") && <TrendingUp className="size-3.5" />}
            {label}
          </button>
        ))}
      </div>

      {/* ─── Empty prompt`,
);

source = source.replace(
  `          <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground px-0.5 mb-3">
            {results.length} {results.length === 1 ? "spiller" : "spillere"}{" "}
            funnet
          </p>`,
  `          <div className="flex items-center justify-between gap-3 px-0.5 mb-3">
            <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
              {results.length} {results.length === 1 ? "spiller" : "spillere"}{" "}
              funnet
            </p>
            <p className="text-[10px] font-display font-bold uppercase tracking-widest text-primary">
              {SORT_FILTERS.find((item) => item.value === sortMode)?.label}
            </p>
          </div>`,
);

source = source.replace(
  `              <SearchResult
                key={player.id.toString()}
                player={player}
                teamName={teamMap.get(player.teamId.toString())}
              />`,
  `              <SearchResult
                key={player.id.toString()}
                player={player}
                teamName={teamMap.get(player.teamId.toString())}
                insight={playerInsights.get(player.id.toString()) ?? getPlayerSearchInsight(player)}
              />`,
);

if (!source.includes('type SortMode = "hot"')) {
  throw new Error("SortMode was not inserted");
}
if (!source.includes("sparkValues={insight.sparkValues}")) {
  throw new Error("PlayerCard form values were not wired");
}

fs.writeFileSync(filePath, source);
