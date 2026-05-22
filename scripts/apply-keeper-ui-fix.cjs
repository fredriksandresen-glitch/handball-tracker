const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceFunction(src, name, replacement) {
  const start = src.indexOf(`function ${name}`);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const brace = src.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(0, start) + replacement + src.slice(i + 1);
    }
  }
  throw new Error(`No end for ${name}`);
}

const statsPath = 'src/frontend/src/data/fjellhammerPlayerStats.json';
const stats = JSON.parse(read(statsPath));
const keeperMatchData = {
  '2239826781527': {
    '8208557': { saves: 14, savePercentage: 35.0, goalsConceded: 26, shotsAgainst: 40 },
    '8208551': { saves: 5, savePercentage: 22.7, goalsConceded: 17, shotsAgainst: 22 },
    '8208543': { saves: 3, savePercentage: 21.4, goalsConceded: 11, shotsAgainst: 14 },
    '8208542': { saves: 11, savePercentage: 34.4, goalsConceded: 21, shotsAgainst: 32 },
    '8208529': { saves: 3, savePercentage: 16.7, goalsConceded: 15, shotsAgainst: 18 },
  },
  '2239825215136': {
    '8208551': { saves: 5, savePercentage: 25.0, goalsConceded: 15, shotsAgainst: 20 },
    '8208543': { saves: 8, savePercentage: 29.6, goalsConceded: 19, shotsAgainst: 27 },
    '8208542': { saves: 1, savePercentage: 50.0, goalsConceded: 1, shotsAgainst: 2 },
    '8208529': { saves: 4, savePercentage: 20.0, goalsConceded: 16, shotsAgainst: 20 },
  },
};
for (const player of stats) {
  const matches = keeperMatchData[player.playerId];
  if (!matches) continue;
  for (const match of player.recentMatches ?? []) {
    if (matches[match.matchId]) Object.assign(match, matches[match.matchId]);
  }
}
write(statsPath, JSON.stringify(stats, null, 2) + '\n');

const playerPagePath = 'src/frontend/src/pages/PlayerPage.tsx';
let playerPage = read(playerPagePath);

const keyStatsNew = String.raw`function KeyStats({
  player,
  stats,
}: {
  player: Player;
  stats: PlayerSeasonStats | null | undefined;
}) {
  if (!stats) return null;

  const keeper = isGK(player.position);
  const matches = Math.max(Number(stats.matchesPlayed), 1);
  const totalGoals = asNumber(stats.totalGoals);
  const totalSaves = asNumber(stats.totalSaves);
  const shotsAgainst = asNumber(stats.totalShots);
  const savesPerMatch = totalSaves === undefined ? undefined : totalSaves / matches;
  const goalsPerMatch = totalGoals === undefined ? undefined : totalGoals / matches;

  if (keeper) {
    return (
      <section className="px-4" data-ocid="key-stats">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Snitt MEP"
            value={formatDecimal(stats.mepAvg)}
            detail={matches + " kamper"}
            highlight
          />
          <StatCard
            label="Rednings%"
            value={formatPct(stats.shootingPercent)}
            detail="sesongsnitt"
          />
          <StatCard
            label="Redninger"
            value={formatNumber(totalSaves)}
            detail={savesPerMatch === undefined ? undefined : savesPerMatch.toFixed(1) + " per kamp"}
          />
          <StatCard
            label="Skudd mot"
            value={formatNumber(shotsAgainst)}
            detail="totalt"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="px-4" data-ocid="key-stats">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Snitt MEP"
          value={formatDecimal(stats.mepAvg)}
          detail={matches + " kamper"}
          highlight
        />
        <StatCard
          label="Total MEP"
          value={formatDecimal(stats.mepTotal)}
          detail="sesongscore"
        />
        <StatCard
          label="Mål"
          value={formatNumber(totalGoals)}
          detail={goalsPerMatch === undefined ? undefined : goalsPerMatch.toFixed(2) + " per kamp"}
        />
        <StatCard
          label="Assists"
          value={formatNumber(stats.totalAssists)}
          detail={
            stats.assistsPerGame === undefined
              ? undefined
              : stats.assistsPerGame.toFixed(1) + " per kamp"
          }
        />
      </div>
    </section>
  );
}`;

const formOverviewNew = String.raw`function FormOverview({
  player,
  stats,
}: {
  player: Player;
  stats: PlayerMatchStats[];
}) {
  const keeper = isGK(player.position);
  const recent = useMemo(() => {
    return (stats as EnrichedPlayerMatchStats[])
      .filter((match) => typeof match.mep === "number")
      .sort((a, b) => getMatchDate(a).localeCompare(getMatchDate(b)))
      .slice(-5);
  }, [stats]);

  const values = recent.map((match) => match.mep ?? 0);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = Math.max(max - min, 1);
  const avg = values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
  const last = values.at(-1);
  const best = values.length ? Math.max(...values) : undefined;

  if (recent.length === 0) return null;

  return (
    <section className="mx-4 space-y-3" data-ocid="form-overview">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
            MEP siste {recent.length} kamper
          </p>
          <h2 className="font-display font-black text-lg text-foreground">
            Formkurve basert på prestasjonsscore
          </h2>
        </div>
        <Activity className="size-5 text-primary" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-primary/12 border border-primary/35 px-3 py-2">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Siste</p>
            <p className="font-display font-black text-2xl text-primary leading-none tabular-nums">{formatDecimal(last)}</p>
          </div>
          <div className="rounded-xl bg-muted/35 border border-border px-3 py-2">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Snitt</p>
            <p className="font-display font-black text-2xl text-foreground leading-none tabular-nums">{avg.toFixed(1)}</p>
          </div>
          <div className="rounded-xl bg-muted/35 border border-border px-3 py-2">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Beste</p>
            <p className="font-display font-black text-2xl text-foreground leading-none tabular-nums">{formatDecimal(best)}</p>
          </div>
        </div>

        <div className="h-28 rounded-xl bg-background/45 border border-border/60 px-3 pt-3 pb-2 flex items-end gap-2">
          {recent.map((match) => {
            const value = match.mep ?? 0;
            const height = 18 + ((value - min) / range) * 70;
            const isLast = match === recent.at(-1);
            return (
              <div key={match.id.toString()} className="flex-1 h-full flex flex-col justify-end gap-1 min-w-0">
                <div className="flex-1 flex items-end justify-center">
                  <div
                    className={cn(
                      "w-full max-w-12 rounded-t-lg transition-all duration-500",
                      value < 0 ? "bg-destructive/70" : isLast ? "bg-primary" : "bg-primary/45",
                    )}
                    style={{ height: height + "%" }}
                  />
                </div>
                <p className={cn("text-center text-[11px] font-mono font-bold tabular-nums truncate", isLast ? "text-primary" : "text-muted-foreground")}>{formatDecimal(value)}</p>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          {recent.map((match) => {
            const value = match.mep ?? 0;
            const isLast = match === recent.at(-1);
            const keeperLine = (match.date ?? "Siste kamp") + " · " + formatNumber(match.saves) + " redninger · " + formatPct(match.savePct);
            const playerLine = (match.date ?? "Siste kamp") + " · " + formatNumber(match.goals) + " mål · " + formatNumber(match.assists) + " assist";
            return (
              <div
                key={match.id.toString() + "-row"}
                className={cn("rounded-xl border px-3 py-2 flex items-center justify-between gap-3", isLast ? "border-primary/45 bg-primary/8" : "border-border bg-background/35")}
              >
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm text-foreground truncate">{match.opponent ? "mot " + match.opponent : "Kamp"}</p>
                  <p className="text-xs text-muted-foreground">{keeper ? keeperLine : playerLine}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn("font-display font-black text-2xl leading-none tabular-nums", value < 0 ? "text-destructive" : isLast ? "text-primary" : "text-foreground")}>{formatSigned(value)}</p>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">MEP</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}`;

const insightNew = String.raw`function InsightCards({
  player,
  stats,
}: {
  player: Player;
  stats: PlayerSeasonStats | null | undefined;
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
    return (
      <section className="mx-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-4 flex items-center gap-3">
          <div className="size-11 rounded-xl bg-primary/15 flex items-center justify-center"><Award className="size-5 text-primary" /></div>
          <div>
            <p className="font-display font-black text-primary text-sm">Keeperprofil: {formatPct(stats.shootingPercent)} redningsprosent</p>
            <p className="text-xs text-muted-foreground">{totalSaves} redninger · {savesPerMatch.toFixed(1)} per kamp</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-4 flex items-center gap-3">
          <div className="size-11 rounded-xl bg-chart-2/10 border border-chart-2/25 flex items-center justify-center"><Target className="size-5 text-chart-2" /></div>
          <div>
            <p className="font-display font-black text-foreground text-sm">{shotsAgainst} skudd mot · {goalsAgainst} mål imot</p>
            <p className="text-xs text-muted-foreground">Snitt MEP {formatDecimal(stats.mepAvg)} · total MEP {formatDecimal(stats.mepTotal)}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-4 grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-4 flex items-center gap-3">
        <div className="size-11 rounded-xl bg-primary/15 flex items-center justify-center"><Award className="size-5 text-primary" /></div>
        <div>
          <p className="font-display font-black text-primary text-sm">Angrepsbidrag: {formatDecimal(stats.mepAvg)} i snitt MEP</p>
          <p className="text-xs text-muted-foreground">Total MEP {formatDecimal(stats.mepTotal)} gjennom {matches} kamper.</p>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card px-4 py-4 flex items-center gap-3">
        <div className="size-11 rounded-xl bg-chart-2/10 border border-chart-2/25 flex items-center justify-center"><Target className="size-5 text-chart-2" /></div>
        <div>
          <p className="font-display font-black text-foreground text-sm">{directContributions} målpoeng · {contributionPerMatch.toFixed(1)} per kamp</p>
          <p className="text-xs text-muted-foreground">Assist/teknisk-feil balanse: {formatSigned(assistFaultBalance, 0)} · uttelling {formatPct(stats.shootingPercent)}</p>
        </div>
      </div>
    </section>
  );
}`;

const seasonNew = String.raw`function SeasonDetails({
  player,
  stats,
}: {
  player: Player;
  stats: PlayerSeasonStats;
}) {
  const keeper = isGK(player.position);
  const matches = Math.max(Number(stats.matchesPlayed), 1);
  const totalSaves = asNumber(stats.totalSaves);
  const shotsAgainst = asNumber(stats.totalShots);
  const goalsAgainst = totalSaves === undefined || shotsAgainst === undefined ? undefined : Math.max(shotsAgainst - totalSaves, 0);
  const keeperRows = [
    ["Snitt MEP", formatDecimal(stats.mepAvg)],
    ["Total MEP", formatDecimal(stats.mepTotal)],
    ["Redninger", formatNumber(totalSaves)],
    ["Redningsprosent", formatPct(stats.shootingPercent)],
    ["Skudd mot", formatNumber(shotsAgainst)],
    ["Mål imot", formatNumber(goalsAgainst)],
    ["Redninger/kamp", totalSaves === undefined ? "-" : (totalSaves / matches).toFixed(2)],
    ["Assists", formatNumber(stats.totalAssists)],
    ["Tekniske feil", formatNumber(stats.technicalFaults)],
    ["2 min", formatNumber(stats.totalTwoMin)],
    ["Kamper", stats.matchesPlayed.toString()],
  ];
  const playerRows = [
    ["Snitt MEP", formatDecimal(stats.mepAvg)],
    ["Total MEP", formatDecimal(stats.mepTotal)],
    ["Total mål", formatNumber(stats.totalGoals)],
    ["Skudd", formatNumber(stats.totalShots)],
    ["Uttelling", formatPct(stats.shootingPercent)],
    ["Mål/kamp", stats.goalsPerGame?.toFixed(2) ?? "-"],
    ["Assists", formatNumber(stats.totalAssists)],
    ["Assists/kamp", stats.assistsPerGame?.toFixed(2) ?? "-"],
    ["Tekniske feil", formatNumber(stats.technicalFaults)],
    ["2 min", formatNumber(stats.totalTwoMin)],
    ["Kamper", stats.matchesPlayed.toString()],
  ];
  const rows = keeper ? keeperRows : playerRows;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/35 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">Sesong {stats.season}</p>
        <span className="text-[10px] uppercase tracking-widest text-primary font-display font-bold">{keeper ? "Keeperdata" : "MEP først"}</span>
      </div>
      <div className="px-4">
        {rows.map(([label, value], index) => (
          <div key={label} className="flex items-center justify-between py-3 border-b border-border/45 last:border-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className={cn("font-mono font-bold text-sm tabular-nums", index < 2 ? "text-primary" : "text-foreground")}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}`;

const matchNew = String.raw`function MatchHistory({
  player,
  stats,
}: {
  player: Player;
  stats: PlayerMatchStats[];
}) {
  const keeper = isGK(player.position);
  const matches = [...(stats as EnrichedPlayerMatchStats[])].sort((a, b) =>
    getMatchDate(b).localeCompare(getMatchDate(a)),
  );

  if (matches.length === 0) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Ingen kampstatistikk tilgjengelig</div>;
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-[1fr_52px_52px_52px] gap-2 px-4 py-2 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
        <span>Kamp</span>
        <span className="text-right">MEP</span>
        <span className="text-right">{keeper ? "Red" : "Mål"}</span>
        <span className="text-right">{keeper ? "Red%" : "Ass"}</span>
      </div>
      {matches.map((match) => (
        <div key={match.id.toString()} className="grid grid-cols-[1fr_52px_52px_52px] gap-2 px-4 py-3 border-b border-border/45 last:border-0 text-sm">
          <span className="min-w-0">
            <span className="block font-display font-bold text-foreground truncate">{match.opponent ? "mot " + match.opponent : "Kamp"}</span>
            <span className="block text-xs text-muted-foreground truncate">{match.date ?? "Kamp " + match.matchId.toString()}</span>
          </span>
          <span className="text-right font-bold text-primary tabular-nums">{formatDecimal(match.mep)}</span>
          <span className="text-right text-foreground tabular-nums">{keeper ? formatNumber(match.saves) : formatNumber(match.goals)}</span>
          <span className="text-right text-foreground tabular-nums">{keeper ? formatPct(match.savePct) : formatNumber(match.assists)}</span>
        </div>
      ))}
    </div>
  );
}`;

for (const [name, replacement] of [
  ['KeyStats', keyStatsNew],
  ['FormOverview', formOverviewNew],
  ['InsightCards', insightNew],
  ['SeasonDetails', seasonNew],
  ['MatchHistory', matchNew],
]) {
  playerPage = replaceFunction(playerPage, name, replacement);
}
playerPage = playerPage.replaceAll('<FormOverview stats={matchStats} />', '<FormOverview player={player} stats={matchStats} />');
playerPage = playerPage.replace('<SeasonDetails stats={seasonStats} />', '<SeasonDetails player={player} stats={seasonStats} />');
playerPage = playerPage.replace('<MatchHistory stats={matchStats} />', '<MatchHistory player={player} stats={matchStats} />');
write(playerPagePath, playerPage);

const teamPath = 'src/frontend/src/pages/TeamPage.tsx';
let teamPage = read(teamPath);
teamPage = teamPage.replace(
`  const lastGoals = lastStat ? Number(lastStat?.goals ?? 0) : null;
  const lastMins = lastStat ? Number(lastStat?.minutesPlayed ?? 0) : null;`,
`  const keeper = player.position === Position.Keeper;
  const lastGoals = !keeper && lastStat ? Number(lastStat?.goals ?? 0) : null;
  const lastSaves = keeper && lastStat ? Number(lastStat?.saves ?? 0) : null;
  const lastSavePct = keeper && lastStat ? lastStat.savePct : undefined;
  const lastMins = lastStat ? Number(lastStat?.minutesPlayed ?? 0) : null;`
);
teamPage = teamPage.replace(
`          {(lastGoals !== null || (lastMins !== null && lastMins > 0)) && (
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/15">
              {lastGoals !== null && (
                <div>
                  <span
                    className={cn(
                      "font-display font-black text-base leading-none",
                      lastGoals > 0 ? "text-primary" : "text-white/50",
                    )}
                  >
                    {lastGoals}
                  </span>
                  <p className="text-[9px] text-white/50 uppercase tracking-wide mt-0.5">
                    Mål
                  </p>
                </div>
              )}
              {lastMins !== null && lastMins > 0 && (
                <div>
                  <span className="font-display font-bold text-sm leading-none text-white/80">
                    {lastMins}
                  </span>
                  <p className="text-[9px] text-white/50 uppercase tracking-wide mt-0.5">
                    Min
                  </p>
                </div>
              )}
            </div>
          )}`,
`          {(lastGoals !== null || lastSaves !== null || (lastMins !== null && lastMins > 0)) && (
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/15">
              {keeper && lastSaves !== null && (
                <div>
                  <span className={cn("font-display font-black text-base leading-none", lastSaves > 0 ? "text-primary" : "text-white/50")}>{lastSaves}</span>
                  <p className="text-[9px] text-white/50 uppercase tracking-wide mt-0.5">Redn.</p>
                </div>
              )}
              {keeper && lastSavePct !== undefined && (
                <div>
                  <span className="font-display font-bold text-sm leading-none text-white/80">{lastSavePct.toFixed(1)}%</span>
                  <p className="text-[9px] text-white/50 uppercase tracking-wide mt-0.5">Red%</p>
                </div>
              )}
              {!keeper && lastGoals !== null && (
                <div>
                  <span className={cn("font-display font-black text-base leading-none", lastGoals > 0 ? "text-primary" : "text-white/50")}>{lastGoals}</span>
                  <p className="text-[9px] text-white/50 uppercase tracking-wide mt-0.5">Mål</p>
                </div>
              )}
              {!keeper && lastMins !== null && lastMins > 0 && (
                <div>
                  <span className="font-display font-bold text-sm leading-none text-white/80">{lastMins}</span>
                  <p className="text-[9px] text-white/50 uppercase tracking-wide mt-0.5">Min</p>
                </div>
              )}
            </div>
          )}`
);
write(teamPath, teamPage);

const feedPath = 'src/frontend/src/components/FeedPlayerCard.tsx';
let feedCard = read(feedPath);
feedCard = feedCard.replace('import { FeedEventType } from "../types/handball";', 'import { FeedEventType, Position } from "../types/handball";');
feedCard = feedCard.replace(
`  const latestMatch = mepMatches.at(-1);
  const sparkValues = mepMatches.map((match) => match.mep ?? 0);
  const latestGoals = latestMatch?.goals ?? lastGoalEvent?.statValue;`,
`  const latestMatch = mepMatches.at(-1);
  const sparkValues = mepMatches.map((match) => match.mep ?? 0);
  const keeper = player.position === Position.Keeper;
  const latestGoals = keeper ? undefined : latestMatch?.goals ?? lastGoalEvent?.statValue;
  const latestSaves = keeper ? latestMatch?.saves : undefined;
  const latestSavePct = keeper ? latestMatch?.savePct : undefined;`
);
feedCard = feedCard.replace(
`              {latestGoals !== undefined && (
                <div>
                  <span className="block font-display font-bold text-base text-white/85 leading-none tabular-nums">
                    {latestGoals.toString()}
                  </span>
                  <span className="block text-[8px] uppercase tracking-wide text-white/55 mt-0.5">
                    Mål
                  </span>
                </div>
              )}`,
`              {latestSaves !== undefined && (
                <div>
                  <span className="block font-display font-bold text-base text-white/85 leading-none tabular-nums">
                    {latestSaves.toString()}
                  </span>
                  <span className="block text-[8px] uppercase tracking-wide text-white/55 mt-0.5">
                    Redn.
                  </span>
                </div>
              )}
              {latestSavePct !== undefined && (
                <div>
                  <span className="block font-display font-bold text-base text-white/85 leading-none tabular-nums">
                    {latestSavePct.toFixed(1)}%
                  </span>
                  <span className="block text-[8px] uppercase tracking-wide text-white/55 mt-0.5">
                    Red%
                  </span>
                </div>
              )}
              {latestGoals !== undefined && (
                <div>
                  <span className="block font-display font-bold text-base text-white/85 leading-none tabular-nums">
                    {latestGoals.toString()}
                  </span>
                  <span className="block text-[8px] uppercase tracking-wide text-white/55 mt-0.5">
                    Mål
                  </span>
                </div>
              )}`
);
write(feedPath, feedCard);

for (const path of [
  '.github/workflows/apply-keeper-ui-fix.yml',
  'scripts/apply-keeper-ui-fix.cjs',
  'scripts/.keeper-ui-fix-trigger',
]) {
  if (fs.existsSync(path)) fs.rmSync(path, { force: true });
}
