const fs = require("node:fs");
const path = require("node:path");

const root = process.env.GITHUB_WORKSPACE || process.cwd();
const filePath = path.join(root, "src", "frontend", "src", "pages", "PlayerPage.tsx");
let source = fs.readFileSync(filePath, "utf8");

source = source.replace(
  `  CalendarDays,
  Shield,`,
  `  CalendarDays,
  Search,
  Shield,`,
);
source = source.replace(
  `  TrendingUp,
  Users,`,
  `  TrendingUp,
  Users,
  X,`,
);

const start = source.indexOf("function PlayerComparison({");
const end = source.indexOf("\nfunction Tabs(", start);
if (start === -1 || end === -1) {
  throw new Error("Could not locate PlayerComparison block");
}

const replacement = `function PlayerComparison({
  player,
  seasonStats,
}: {
  player: Player;
  seasonStats: PlayerSeasonStats | null | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return getStaticPlayers()
      .filter((candidate) => candidate.id !== player.id)
      .map((candidate) => {
        const profile = getStaticProfile(candidate.id);
        if (!profile) return null;
        const stats = mapClawdbotSeasonStats(profile);
        const teamName = profile.player.team ?? getStaticTeamName(candidate.id);
        const samePosition = candidate.position === player.position;
        const otherClub = candidate.teamId !== player.teamId;
        const searchable = [candidate.name, teamName, profile.player.position ?? ""]
          .join(" ")
          .toLowerCase();
        const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
        const score =
          (samePosition ? 1000 : 0) +
          (otherClub ? 100 : 0) +
          (stats.mepAvg ?? 0) +
          Number(stats.matchesPlayed) / 100;

        return {
          player: candidate,
          stats,
          teamName,
          samePosition,
          otherClub,
          matchesQuery,
          score,
        };
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> =>
        Boolean(candidate && candidate.matchesQuery && hasUsefulStats(candidate.stats)),
      )
      .sort((a, b) => {
        if (a.samePosition !== b.samePosition) return a.samePosition ? -1 : 1;
        if (a.otherClub !== b.otherClub) return a.otherClub ? -1 : 1;
        return b.score - a.score;
      })
      .slice(0, normalizedQuery ? 8 : 5);
  }, [player.id, player.position, player.teamId, query]);

  const selected = selectedId
    ? candidates.find((candidate) => candidate.player.id.toString() === selectedId) ??
      null
    : null;

  if (!seasonStats) return null;

  const keeper = isGK(player.position);
  const currentTeam = getStaticTeamName(player.id);
  const rows =
    selected === null
      ? []
      : keeper
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

  if (!isOpen) {
    return (
      <section className="mx-4" data-ocid="player-comparison-collapsed">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full rounded-2xl border border-border bg-card px-4 py-4 flex items-center justify-between gap-4 hover:border-primary/45 hover:bg-card/80 transition-colors text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="size-10 rounded-xl bg-primary/12 border border-primary/30 flex items-center justify-center shrink-0">
              <Users className="size-5 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="font-display font-black text-sm text-foreground">
                Sammenlign spiller
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Søk eller velg forslag i samme posisjon
              </p>
            </div>
          </div>
          <ArrowRight className="size-5 text-muted-foreground shrink-0" />
        </button>
      </section>
    );
  }

  return (
    <section className="mx-4 space-y-3" data-ocid="player-comparison">
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
                Sammenlign
              </p>
              <h2 className="font-display font-black text-lg text-foreground">
                Finn spiller å måle mot
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setQuery("");
                setSelectedId(null);
              }}
              className="size-9 rounded-full border border-border bg-background/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              aria-label="Lukk sammenligning"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedId(null);
              }}
              placeholder="Søk spiller, lag eller posisjon"
              className="w-full h-11 rounded-xl bg-background border border-border pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60"
            />
          </div>

          {candidates.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {candidates.map((candidate) => {
                const active = candidate.player.id.toString() === selectedId;
                return (
                  <button
                    key={candidate.player.id.toString()}
                    type="button"
                    onClick={() => setSelectedId(candidate.player.id.toString())}
                    className={cn(
                      "min-w-[178px] rounded-xl border p-2 text-left transition-colors",
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
                          className="size-10 rounded-lg object-cover object-top bg-muted shrink-0"
                        />
                      ) : (
                        <div className="size-10 rounded-lg bg-muted shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-display font-black text-foreground truncate">
                          {candidate.player.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {candidate.teamName} · MEP {formatDecimal(candidate.stats.mepAvg)}
                        </p>
                        <p className="text-[9px] uppercase tracking-wider text-primary font-display font-bold truncate">
                          {candidate.samePosition ? "Samme posisjon" : "Annen posisjon"}
                          {candidate.otherClub ? " · annet lag" : ""}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-background/35 px-3 py-4 text-center text-sm text-muted-foreground">
              Ingen spillere funnet. Prøv et annet navn eller lag.
            </div>
          )}
        </div>

        {selected ? (
          <>
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
                  Valgt spiller
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
          </>
        ) : (
          <div className="px-4 py-5 text-center text-sm text-muted-foreground">
            Velg en spiller over for å se sammenligningen.
          </div>
        )}
      </div>
    </section>
  );
}
`;

source = `${source.slice(0, start)}${replacement}${source.slice(end)}`;

if (!source.includes("player-comparison-collapsed")) {
  throw new Error("Collapsed comparison state was not inserted");
}
if (!source.includes("Søk spiller, lag eller posisjon")) {
  throw new Error("Comparison search input was not inserted");
}

fs.writeFileSync(filePath, source);
