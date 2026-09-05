const {
  formatPlayTime,
  parsePlayTimeSeconds,
} = require("./statsDataset");
const { normalizeText } = require("./queryUnderstanding");

const MIN_PEER_MATCHES = 4;

function round(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function average(values) {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const mean = average(values);
  return Math.sqrt(
    average(values.map((value) => (value - mean) ** 2)),
  );
}

function percentile(values, value, higherIsBetter = true) {
  if (values.length < 2) return null;
  const favorable = values.filter((candidate) =>
    higherIsBetter ? candidate <= value : candidate >= value,
  ).length;
  return Math.round(((favorable - 1) / (values.length - 1)) * 100);
}

function resolvePlayer(playersById, playerId) {
  const id = String(playerId);
  return (
    playersById[id] ??
    Object.values(playersById).find(
      (player) =>
        String(player.canonicalId) === id ||
        player.externalIds?.some((externalId) => String(externalId) === id),
    ) ??
    null
  );
}

function scopedMatches(player, season, league) {
  return (player.seasonSegments ?? [])
    .filter(
      (segment) =>
        (!season || segment.season === season) &&
        (!league || segment.league === league),
    )
    .flatMap((segment) => segment.matches ?? [])
    .sort((left, right) => String(left.date).localeCompare(String(right.date)));
}

function teamNamesForScope(player, season, league) {
  return [
    ...new Set(
      (player.seasonSegments ?? [])
        .filter(
          (segment) =>
            (!season || segment.season === season) &&
            (!league || segment.league === league),
        )
        .map((segment) => segment.teamName),
    ),
  ];
}

function aggregateMatches(matches, position) {
  const totals = matches.reduce(
    (sum, match) => {
      sum.goals += Number(match.goals ?? 0);
      sum.shots += Number(match.shots ?? 0);
      sum.assists += Number(match.assists ?? 0);
      sum.technicalErrors += Number(match.technicalErrors ?? 0);
      sum.suspensions += Number(match.suspensions ?? 0);
      sum.warnings += Number(match.warnings ?? 0);
      sum.redCards += Number(match.redCards ?? 0);
      sum.mep += Number(match.mep ?? 0);
      sum.minutes += parsePlayTimeSeconds(match.playTime) / 60;
      sum.saves += Number(match.saves ?? 0);
      sum.shotsAgainst += Number(match.shotsAgainst ?? 0);
      return sum;
    },
    {
      goals: 0,
      shots: 0,
      assists: 0,
      technicalErrors: 0,
      suspensions: 0,
      warnings: 0,
      redCards: 0,
      mep: 0,
      minutes: 0,
      saves: 0,
      shotsAgainst: 0,
    },
  );
  const games = matches.length;
  const per60Factor = totals.minutes > 0 ? 60 / totals.minutes : 0;
  const mepValues = matches.map((match) => Number(match.mep ?? 0));
  const recentFive = matches.slice(-5);
  const recentThree = matches.slice(-3);
  const priorThree = matches.slice(-6, -3);
  const bestMatch = [...matches].sort(
    (left, right) => Number(right.mep ?? 0) - Number(left.mep ?? 0),
  )[0] ?? null;
  const keeper = position === "Keeper";

  return {
    games,
    minutes: round(totals.minutes),
    totalPlayTime: formatPlayTime(totals.minutes * 60),
    minutesPerGame: round(games > 0 ? totals.minutes / games : 0),
    goals: totals.goals,
    goalsPerGame: round(games > 0 ? totals.goals / games : 0, 2),
    goalsPer60: round(totals.goals * per60Factor, 2),
    assists: totals.assists,
    assistsPerGame: round(games > 0 ? totals.assists / games : 0, 2),
    assistsPer60: round(totals.assists * per60Factor, 2),
    shots: totals.shots,
    shotPercentage: round(
      totals.shots > 0 ? (totals.goals / totals.shots) * 100 : 0,
    ),
    technicalErrors: totals.technicalErrors,
    technicalErrorsPerGame: round(
      games > 0 ? totals.technicalErrors / games : 0,
      2,
    ),
    suspensions: totals.suspensions,
    warnings: totals.warnings,
    redCards: totals.redCards,
    mepTotal: round(totals.mep),
    mepPerGame: round(games > 0 ? totals.mep / games : 0, 2),
    mepPer60: round(totals.mep * per60Factor, 2),
    mepConsistency: round(standardDeviation(mepValues), 2),
    formLastFive: round(
      average(recentFive.map((match) => Number(match.mep ?? 0))),
      2,
    ),
    formTrend: round(
      average(recentThree.map((match) => Number(match.mep ?? 0))) -
        average(priorThree.map((match) => Number(match.mep ?? 0))),
      2,
    ),
    saves: keeper ? totals.saves : null,
    savePercentage:
      keeper && totals.shotsAgainst > 0
        ? round((totals.saves / totals.shotsAgainst) * 100)
        : null,
    bestMatch: bestMatch
      ? {
          date: bestMatch.date,
          opponent: bestMatch.opponent,
          homeAway: bestMatch.homeAway,
          mep: round(bestMatch.mep),
          goals: Number(bestMatch.goals ?? 0),
          assists: Number(bestMatch.assists ?? 0),
          shots: Number(bestMatch.shots ?? 0),
          playTime: bestMatch.playTime ?? "00:00:00",
          saves: keeper ? Number(bestMatch.saves ?? 0) : null,
        }
      : null,
    recentMatches: recentFive.map((match) => ({
      date: match.date,
      opponent: match.opponent,
      homeAway: match.homeAway,
      mep: round(match.mep),
      goals: Number(match.goals ?? 0),
      assists: Number(match.assists ?? 0),
      playTime: match.playTime ?? "00:00:00",
    })),
  };
}

function scopedPeerMetrics(playersById, season, league, position) {
  return Object.values(playersById)
    .filter((player) => player.position === position)
    .map((player) => aggregateMatches(scopedMatches(player, season, league), position))
    .filter((metrics) => metrics.games >= MIN_PEER_MATCHES);
}

function buildPercentiles(metrics, peers) {
  const value = (key) => peers.map((peer) => Number(peer[key] ?? 0));
  return {
    mepPerGame: percentile(value("mepPerGame"), metrics.mepPerGame),
    formLastFive: percentile(value("formLastFive"), metrics.formLastFive),
    goalsPer60: percentile(value("goalsPer60"), metrics.goalsPer60),
    assistsPer60: percentile(value("assistsPer60"), metrics.assistsPer60),
    shotPercentage: percentile(
      value("shotPercentage"),
      metrics.shotPercentage,
    ),
    minutesPerGame: percentile(
      value("minutesPerGame"),
      metrics.minutesPerGame,
    ),
    consistency: percentile(
      value("mepConsistency"),
      metrics.mepConsistency,
      false,
    ),
    savePercentage:
      metrics.savePercentage === null
        ? null
        : percentile(value("savePercentage"), metrics.savePercentage),
  };
}

function buildPositionAverage(peers) {
  const metricKeys = [
    "mepPerGame",
    "formLastFive",
    "goalsPer60",
    "assistsPer60",
    "shotPercentage",
    "minutesPerGame",
    "mepConsistency",
    "savePercentage",
  ];
  return Object.fromEntries(
    metricKeys.map((key) => {
      const values = peers
        .map((peer) => peer[key])
        .filter((value) => Number.isFinite(value));
      return [key, values.length > 0 ? round(average(values), 2) : null];
    }),
  );
}

function canonicalTeamName(value) {
  return normalizeText(value)
    .replace(/\b(topphaandball|topphandball|haandball|handball|elite|hk|th)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findStanding(teamNames, standings) {
  for (const teamName of teamNames) {
    const standing = standings.find(
      (candidate) =>
        canonicalTeamName(candidate.name) === canonicalTeamName(teamName),
    );
    if (standing) {
      return {
        rank: Number(standing.rank),
        teamName: standing.name,
        played: Number(standing.played ?? 0),
        points: Number(standing.points ?? 0),
        goalsFor: Number(standing.goalsFor ?? 0),
        goalsAgainst: Number(standing.goalsAgainst ?? 0),
        goalDifference: Number(
          standing.goalDifference ??
            Number(standing.goalsFor ?? 0) - Number(standing.goalsAgainst ?? 0),
        ),
      };
    }
  }
  return null;
}

function buildGoalContribution({ player, matches, playersById, season, league, standing }) {
  const appearanceMatchIds = new Set(matches.map((match) => String(match.matchId)));
  const teamNames = new Set(matches.map((match) => canonicalTeamName(match.playerTeam)));
  const seenPlayerMatches = new Set();
  let teamGoalsInAppearances = 0;

  for (const candidate of Object.values(playersById)) {
    for (const match of scopedMatches(candidate, season, league)) {
      if (
        !appearanceMatchIds.has(String(match.matchId)) ||
        !teamNames.has(canonicalTeamName(match.playerTeam))
      ) {
        continue;
      }
      const uniqueKey = `${match.matchId}:${match.externalPlayerId ?? match.playerId}`;
      if (seenPlayerMatches.has(uniqueKey)) continue;
      seenPlayerMatches.add(uniqueKey);
      teamGoalsInAppearances += Number(match.goals ?? 0);
    }
  }

  const playerGoals = matches.reduce(
    (sum, match) => sum + Number(match.goals ?? 0),
    0,
  );
  return {
    playerGoals,
    teamGoalsInAppearances,
    appearanceGoalShare: round(
      teamGoalsInAppearances > 0
        ? (playerGoals / teamGoalsInAppearances) * 100
        : 0,
      1,
    ),
    seasonTeamGoals: standing?.goalsFor || null,
    fullSeasonGoalShare:
      standing?.goalsFor > 0
        ? round((playerGoals / standing.goalsFor) * 100, 1)
        : null,
    scope:
      "Andel av lagets registrerte mål i kampene spilleren selv deltok i.",
  };
}

function buildTeamContext(players) {
  const ranked = players
    .filter((player) => player.standing)
    .sort((left, right) => left.standing.rank - right.standing.rank);
  if (ranked.length < 2) return null;
  const strongest = ranked[0];
  const weakest = ranked.at(-1);
  if (strongest.standing.rank === weakest.standing.rank) return null;
  return {
    strongestPlayerId: strongest.playerId,
    strongestTeam: strongest.standing,
    weakestPlayerId: weakest.playerId,
    weakestTeam: weakest.standing,
    rankGap: weakest.standing.rank - strongest.standing.rank,
    interpretation:
      `${weakest.name} leverte tallene for ${weakest.standing.teamName}, som endte ` +
      `${weakest.standing.rank}. mot ${strongest.standing.teamName} på ` +
      `${strongest.standing.rank}. plass. Produksjon på det svakere laget skal derfor ` +
      "løftes fram som kontekst, men omregnes ikke til en kunstig justert score.",
  };
}

function strongestSignals(player) {
  const labels = {
    mepPerGame: "MEP per kamp",
    formLastFive: "form siste fem",
    goalsPer60: "mål per 60 min",
    assistsPer60: "assist per 60 min",
    shotPercentage: "skuddprosent",
    minutesPerGame: "spilletid",
    consistency: "stabilitet",
    savePercentage: "redningsprosent",
  };
  return Object.entries(player.percentiles)
    .filter(([, value]) => Number.isFinite(value))
    .sort((left, right) => Number(right[1]) - Number(left[1]))
    .slice(0, 3)
    .map(([key, value]) => `${labels[key]} (${value}. persentil)`);
}

function buildComparisonSummary(players, samePosition) {
  const metricDefs = [
    ["mepPerGame", "høyest MEP per kamp", true],
    ["formLastFive", "best form siste fem", true],
    ["goalsPer60", "flest mål per 60 minutter", true],
    ["assistsPer60", "flest assist per 60 minutter", true],
    ["shotPercentage", "best skuddprosent", true],
    ["mepConsistency", "mest stabil MEP", false],
  ];
  const leaders = metricDefs.map(([key, label, higher]) => {
    const ranked = [...players].sort((left, right) =>
      higher
        ? right.metrics[key] - left.metrics[key]
        : left.metrics[key] - right.metrics[key],
    );
    return {
      metric: key,
      label,
      playerId: ranked[0].playerId,
      playerName: ranked[0].name,
      value: ranked[0].metrics[key],
    };
  });

  const teamContext = buildTeamContext(players);
  return {
    samePosition,
    verdict: samePosition
      ? teamContext
        ? `Spillerne er vurdert i samme rolle og liga. Råtallene må leses sammen med lagstyrken: ${teamContext.weakestTeam.teamName} endte ${teamContext.weakestTeam.rank}., mens ${teamContext.strongestTeam.teamName} endte ${teamContext.strongestTeam.rank}.`
        : "Spillerne er vurdert med samme rollegrunnlag. Ingen enkeltmåling avgjør hvem som er best totalt."
      : "Spillerne har ulike roller. Rapporten fremhever rollejusterte styrker og kårer ikke én universell vinner.",
    leaders,
    teamContext,
  };
}

function buildComparisonReport({
  playerIds,
  playersById,
  season,
  league,
  standings = [],
  generatedAt = new Date().toISOString(),
}) {
  const uniqueIds = [...new Set((playerIds ?? []).map(String))];
  if (uniqueIds.length < 2 || uniqueIds.length > 4) {
    throw new Error("Velg mellom 2 og 4 spillere.");
  }

  const resolved = uniqueIds.map((playerId) => resolvePlayer(playersById, playerId));
  const missingIds = uniqueIds.filter((_, index) => !resolved[index]);
  if (missingIds.length > 0) {
    throw new Error(`Fant ikke spillerdata for: ${missingIds.join(", ")}`);
  }

  const players = resolved.map((player) => {
    const matches = scopedMatches(player, season, league);
    if (matches.length === 0) {
      throw new Error(`${player.name} mangler kampdata for ${season}.`);
    }
    const metrics = aggregateMatches(matches, player.position);
    const peers = scopedPeerMetrics(playersById, season, league, player.position);
    const teams = teamNamesForScope(player, season, league);
    const standing = findStanding(teams, standings);
    const result = {
      playerId: player.playerId,
      canonicalId: player.canonicalId,
      name: player.name,
      position: player.position,
      teams,
      currentTeamName: player.currentTeamName,
      imageUrl: player.imageUrl,
      standing,
      goalContribution: buildGoalContribution({
        player,
        matches,
        playersById,
        season,
        league,
        standing,
      }),
      peerSampleSize: peers.length,
      metrics,
      percentiles: buildPercentiles(metrics, peers),
      positionAverage: buildPositionAverage(peers),
    };
    return { ...result, strengths: strongestSignals(result) };
  });
  const samePosition = players.every(
    (player) => player.position === players[0].position,
  );

  return {
    version: 1,
    reportId: `comparison-${Date.now()}`,
    generatedAt,
    title: `Spillersammenligning - ${players.map((player) => player.name).join(" vs. ")}`,
    season,
    league,
    players,
    comparison: buildComparisonSummary(players, samePosition),
    methodology: {
      formWindow: 5,
      peerMinimumMatches: MIN_PEER_MATCHES,
      consistency: "Standardavvik i MEP per kamp. Lavere verdi betyr jevnere prestasjoner.",
      percentiles: `Sammenlignet med spillere i samme posisjon, liga og sesong med minst ${MIN_PEER_MATCHES} kamper. Posisjonssnittet bruker den samme referansegruppen.`,
    },
    caveats: [
      "Rapporten beskriver registrerte prestasjoner og dokumenterer ikke taktisk rolle, skader eller trenervurderinger.",
      "Spillere med få kamper har større statistisk usikkerhet.",
      "Lagplassering brukes som kontekst, ikke som en matematisk korreksjon av spillerens nøkkeltall.",
      samePosition
        ? "MEP, effektivitet, volum og stabilitet må vurderes samlet."
        : "Direkte rangering mellom ulike posisjoner kan være misvisende.",
    ],
    sources: [
      "Kamp- og sesongstatistikk fra Handball Tracker sin ICP asset-canister.",
      league === "first-division"
        ? "Sluttabell for 1. divisjon 2025/26 fra Norges Håndballforbund, turnering 436256."
        : "Lagplassering fra arkivert sluttabell når tilgjengelig.",
    ],
  };
}

module.exports = {
  aggregateMatches,
  buildComparisonReport,
  resolvePlayer,
};
