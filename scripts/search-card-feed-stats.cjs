const fs = require("node:fs");
const path = require("node:path");

const root = process.env.GITHUB_WORKSPACE || process.cwd();

function patch(relativePath, replacements) {
  const filePath = path.join(root, relativePath);
  let source = fs.readFileSync(filePath, "utf8");
  for (const [before, after] of replacements) {
    if (!source.includes(before)) {
      throw new Error(`Missing pattern in ${relativePath}: ${before}`);
    }
    source = source.replace(before, after);
  }
  fs.writeFileSync(filePath, source);
}

patch("src/frontend/src/components/PlayerCard.tsx", [
  [
    `  goals?: number;
  minutes?: number;
  sparkValues?: number[];`,
    `  goals?: number;
  minutes?: number;
  latestMep?: number;
  latestGoals?: number;
  latestSaves?: number;
  latestSavePct?: number;
  sparkValues?: number[];`,
  ],
  [
    `  goals,
  minutes,
  sparkValues = [],`,
    `  goals,
  minutes,
  latestMep,
  latestGoals,
  latestSaves,
  latestSavePct,
  sparkValues = [],`,
  ],
  [
    `  const hasStats = goals !== undefined || minutes !== undefined;`,
    `  const displayGoals = latestGoals ?? goals;
  const hasStats =
    latestMep !== undefined ||
    latestSaves !== undefined ||
    latestSavePct !== undefined ||
    displayGoals !== undefined ||
    minutes !== undefined;`,
  ],
  [
    `                {goals !== undefined && (
                  <div>
                    <span className="block font-display font-black text-xl text-white leading-none">
                      {goals}
                    </span>
                    <span className="block text-[9px] uppercase tracking-wide text-white/60 mt-0.5">
                      Mål
                    </span>
                  </div>
                )}
                {minutes !== undefined && (`,
    `                {latestMep !== undefined && (
                  <div>
                    <span className="block font-display font-black text-xl text-white leading-none tabular-nums">
                      {latestMep.toFixed(1)}
                    </span>
                    <span className="block text-[8px] uppercase tracking-wide text-white/60 mt-0.5">
                      MEP sist
                    </span>
                  </div>
                )}
                {latestSaves !== undefined && (
                  <div>
                    <span className="block font-display font-bold text-lg text-white/90 leading-none tabular-nums">
                      {latestSaves}
                    </span>
                    <span className="block text-[8px] uppercase tracking-wide text-white/60 mt-0.5">
                      Redn.
                    </span>
                  </div>
                )}
                {latestSavePct !== undefined && (
                  <div>
                    <span className="block font-display font-bold text-lg text-white/90 leading-none tabular-nums">
                      {latestSavePct.toFixed(1)}%
                    </span>
                    <span className="block text-[8px] uppercase tracking-wide text-white/60 mt-0.5">
                      Red%
                    </span>
                  </div>
                )}
                {displayGoals !== undefined && latestSaves === undefined && (
                  <div>
                    <span className="block font-display font-black text-xl text-white leading-none">
                      {displayGoals}
                    </span>
                    <span className="block text-[9px] uppercase tracking-wide text-white/60 mt-0.5">
                      Mål
                    </span>
                  </div>
                )}
                {minutes !== undefined && (`,
  ],
]);

patch("src/frontend/src/pages/SearchPage.tsx", [
  [
    `  totalGoals?: number;
};`,
    `  totalGoals?: number;
  latestGoals?: number;
  latestSaves?: number;
  latestSavePct?: number;
};`,
  ],
  [
    `  const latestMep = sparkValues.at(-1);
  const formAvg = sparkValues.length`,
    `  const latestMatch = mepMatches.at(-1);
  const latestMep = sparkValues.at(-1);
  const formAvg = sparkValues.length`,
  ],
  [
    `    latestMep,
    hotScore,
    totalGoals: asNumber(seasonStats.totalGoals),`,
    `    latestMep,
    hotScore,
    totalGoals: asNumber(seasonStats.totalGoals),
    latestGoals: latestMatch?.goals === undefined ? undefined : Number(latestMatch.goals),
    latestSaves: latestMatch?.saves === undefined ? undefined : Number(latestMatch.saves),
    latestSavePct: latestMatch?.savePct,`,
  ],
  [
    `      goals={insight.totalGoals}
      sparkValues={insight.sparkValues}`, 
    `      latestMep={insight.latestMep}
      latestGoals={insight.latestGoals}
      latestSaves={insight.latestSaves}
      latestSavePct={insight.latestSavePct}
      sparkValues={insight.sparkValues}`,
  ],
]);
