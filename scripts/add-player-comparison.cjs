const fs = require("node:fs");
const path = require("node:path");

const root = process.env.GITHUB_WORKSPACE || process.cwd();
const filePath = path.join(root, "src", "frontend", "src", "pages", "PlayerPage.tsx");
let source = fs.readFileSync(filePath, "utf8");

source = source.replace(
  'import type { EnrichedPlayerMatchStats } from "../services/clawdbotPlayerProfile";',
  'import {\n  getStaticPlayers,\n  getStaticProfile,\n  mapClawdbotSeasonStats,\n  type EnrichedPlayerMatchStats,\n} from "../services/clawdbotPlayerProfile";',
);

source = source.replace(
  `function getMatchDate(match: EnrichedPlayerMatchStats) {
  return match.date ?? match.matchId.toString();
}
`,
  `function getMatchDate(match: EnrichedPlayerMatchStats) {
  return match.date ?? match.matchId.toString();
}

function getStaticTeamName(playerId: bigint) {
  return getStaticProfile(playerId)?.player.team ?? "Ukjent lag";
}

function hasUsefulStats(stats: PlayerSeasonStats) {
  return Number(stats.matchesPlayed) > 0 || (stats.mepAvg ?? 0) !== 0;
}

function compareDelta(
  base: number | undefined,
  other: number | undefined,
  higherIsBetter = true,
) {
  if (base === undefined || other === undefined) return null;
  const delta = other - base;
  const good = higherIsBetter ? delta > 0 : delta < 0;
  const bad = higherIsBetter ? delta < 0 : delta > 0;
  return { delta, good, bad };
}
`,
);

source = source.replace(
  `function Tabs({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {`,
  `function PlayerComparison({
  player,
  seasonStats,
}: {
  player: Player;
  seasonStats: PlayerSeasonStats | null | undefined;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const candidates = useMemo(() => {
    return getStaticPlayers()
      .filter((candidate) => candidate.id !== player.id)
      .map((candidate) => {
        const profile = getStaticProfile(candidate.id);
        if (!profile) return null;
        const stats = mapClawdbotSeasonStats(profile);
        const teamName = profile.player.team ?? getStaticTeamName(candidate.id);
        const samePosition = candidate.position === player.position;
        const otherClub = candidate.teamId !== player.teamId;
        const score =
          (samePosition ? 1000 : 0) +
          (otherClub ? 100 : 0) +
          (stats.mepAvg ?? 0) +
          Number(stats.matchesPlayed) / 100;

        return { player: candidate, stats, teamName, samePosition, otherClub, score };
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> =>
        Boolean(candidate && candidate.samePosition && hasUsefulStats(candidate.stats)),
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [player.id, player.position, player.teamId]);

  const selected =
    candidates.find((candidate) => candidate.player.id.toString() === selectedId) ??
    candidates[0];

  if (!seasonStats || candidates.length === 0) return null;

  const keeper = isGK(player.position);
  const currentTeam = getStaticTeamName(player.id);
  const rows = keeper
    ? [
        {
          label: "Snitt MEP",
          base: seasonStats.mepAvg,
          other: selected.stats.mepAvg,
          format: (value: number | undefined) => formatDecimal(value),
        },
        {
          label: "Kamper",
          base: Number(seasonStats.matchesPlayed),
          other: Number(selected.stats.matchesPlayed),
          format: (value: number | undefined) => formatNumber(value),
        },
        {
          label: "Rednings%",
          base: seasonStats.shootingPercent,
          other: selected.stats.shootingPercent,
          format: (value: number | undefined) => formatPct(value),
        },
        {
          label: "Redninger",
          base: asNumber(seasonStats.totalSaves),
          other: asNumber(selected.stats.totalSaves),
          format: (value: number | undefined) => formatNumber(value),
        },
        {
          label: "Skudd mot",
          base: asNumber(seasonStats.totalShots),
          other: asNumber(selected.stats.totalShots),
          format: (value: number | undefined) => formatNumber(value),
        },
        {
          label: "Tekn. feil",
          base: asNumber(seasonStats.technicalFaults),
          other: asNumber(selected.stats.technicalFaults),
          format: (value: number | undefined) => formatNumber(value),
          higherIsBetter: false,
        },
      ]
    : [
        {
          label: "Snitt MEP",
          base: seasonStats.mepAvg,
          other: selected.stats.mepAvg,
          format: (value: number | undefined) => formatDecimal(value),
        },
        {
          label: "Kamper",
          base: Number(seasonStats.matchesPlayed),
          other: Number(selected.stats.matchesPlayed),
          format: (value: number | undefined) => formatNumber(value),
        },
        {
          label: "Mål",
          base: asNumber(seasonStats.totalGoals),
          other: asNumber(selected.stats.totalGoals),
          format: (value: number | undefined) => formatNumber(value),
        },
        {
          label: "Mål/kamp",
          base: seasonStats.goalsPerGame,
          other: selected.stats.goalsPerGame,
          format: (value: number | undefined) => formatDecimal(value, 2),
        },
        {
          label: "Assists",
          base: asNumber(seasonStats.totalAssists),
          other: asNumber(selected.stats.totalAssists),
          format: (value: number | undefined) => formatNumber(value),
        },
        {
          label: "Tekn. feil",
          base: asNumber(seasonStats.technicalFaults),
          other: asNumber(selected.stats.technicalFaults),
          format: (value: number | undefined) => formatNumber(value),
          higherIsBetter: false,
        },
      ];

  return (
    <section className="mx-4 space-y-3" data-ocid="player-comparison">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
            Sammenlign
          </p>
          <h2 className="font-display font-black text-lg text-foreground">
            Spillere i samme posisjon
          </h2>
        </div>
        <Users className="size-5 text-primary" />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-3 border-b border-border bg-muted/20">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {candidates.map((candidate) => {
              const active = candidate.player.id === selected.player.id;
              return (
                <button
                  key={candidate.player.id.toString()}
                  type="button"
                  onClick={() => setSelectedId(candidate.player.id.toString())}
                  className={cn(
                    "min-w-[160px] rounded-xl border p-2 text-left transition-colors",
                    active
                      ? "border-primary/60 bg-primary/12"
                      : "border-border bg-background/40 hover:border-primary/35",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {candidate.player.imageUrl ? (
                      <img
                        src={candidate.player.imageUrl}
                        alt=""
                        className="size-9 rounded-lg object-cover object-top bg-muted shrink-0"
                      />
                    ) : (
                      <div className="size-9 rounded-lg bg-muted shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-display font-black text-foreground truncate">
                        {candidate.player.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {candidate.teamName} · MEP {formatDecimal(candidate.stats.mepAvg)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 p-4 border-b border-border bg-background/25">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
              Denne spilleren
            </p>
            <p className="font-display font-black text-sm text-foreground truncate">
              {player.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">{currentTeam}</p>
          </div>
          <div className="self-center rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-display font-bold text-primary">
            VS
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
              Forslag
            </p>
            <p className="font-display font-black text-sm text-foreground truncate">
              {selected.player.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">{selected.teamName}</p>
          </div>
        </div>

        <div className="divide-y divide-border/55">
          {rows.map((row) => {
            const delta = compareDelta(row.base, row.other, row.higherIsBetter ?? true);
            return (
              <div
                key={row.label}
                className="grid grid-cols-[1fr_92px_1fr] items-center gap-2 px-4 py-3"
              >
                <p className="text-right font-mono font-bold text-sm text-foreground tabular-nums">
                  {row.format(row.base)}
                </p>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
                    {row.label}
                  </p>
                  {delta && Math.abs(delta.delta) > 0.01 && (
                    <p
                      className={cn(
                        "mt-0.5 text-[10px] font-mono font-bold tabular-nums",
                        delta.good && "text-chart-2",
                        delta.bad && "text-destructive",
                        !delta.good && !delta.bad && "text-muted-foreground",
                      )}
                    >
                      {formatSigned(delta.delta, row.label === "Kamper" ? 0 : 1)}
                    </p>
                  )}
                </div>
                <p className="font-mono font-bold text-sm text-foreground tabular-nums">
                  {row.format(row.other)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Tabs({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {`,
);

source = source.replace(
  `  const { data: team } = useTeam(player?.teamId ?? 0n);

  const isLoading = playerLoading || seasonLoading || matchLoading;`,
  `  const { data: team } = useTeam(player?.teamId ?? 0n);
  const [selectedCompareId, setSelectedCompareId] = useState<string | null>(null);
  void selectedCompareId;
  void setSelectedCompareId;

  const isLoading = playerLoading || seasonLoading || matchLoading;`,
);

source = source.replace(
  `        <KeyStats player={player} stats={seasonStats} />
        <InsightCards player={player} stats={seasonStats} />
        <FormOverview player={player} stats={matchStats} />`,
  `        <KeyStats player={player} stats={seasonStats} />
        <InsightCards player={player} stats={seasonStats} />
        <PlayerComparison player={player} seasonStats={seasonStats} />
        <FormOverview player={player} stats={matchStats} />`,
);

source = source.replace(
  `  const { data: team } = useTeam(player?.teamId ?? 0n);
  const [selectedCompareId, setSelectedCompareId] = useState<string | null>(null);
  void selectedCompareId;
  void setSelectedCompareId;

  const isLoading = playerLoading || seasonLoading || matchLoading;`,
  `  const { data: team } = useTeam(player?.teamId ?? 0n);

  const isLoading = playerLoading || seasonLoading || matchLoading;`,
);

if (!source.includes("function PlayerComparison")) {
  throw new Error("PlayerComparison was not inserted");
}
if (!source.includes("getStaticPlayers")) {
  throw new Error("Static player imports were not added");
}

fs.writeFileSync(filePath, source);
