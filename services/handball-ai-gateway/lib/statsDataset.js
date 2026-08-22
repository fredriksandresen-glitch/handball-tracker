const { normalizeText } = require("./queryUnderstanding");

const STAT_DATASETS = [
  ["fjellhammerPlayerStats.json", "Fjellhammer"],
  ["larvikPlayerStats.json", "Larvik"],
  ["fanaPlayerStats.json", "Fana"],
  ["fredrikstadPlayerStats.json", "Fredrikstad"],
  ["gjerpenPlayerStats.json", "Gjerpen"],
  ["haslumPlayerStats.json", "Haslum"],
  ["byaasenPlayerStats.json", "Byåsen"],
  ["moldePlayerStats.json", "Molde"],
  ["oppsalPlayerStats.json", "Oppsal"],
  ["solaPlayerStats.json", "Sola"],
  ["folloPlayerStats.json", "Follo Damer"],
  ["storhamarPlayerStats.json", "Storhamar"],
  ["tertnesPlayerStats.json", "Tertnes"],
].map(([file, teamName]) => ({ file, teamName, season: "2025-26" }));

function buildStatsDataset(searchIndex, loadedFiles) {
  const playerIndex = new Map(
    searchIndex.map((player) => [String(player.id), player]),
  );
  const playersById = {};
  const allMatches = [];

  for (const { data, file, season, teamName } of loadedFiles) {
    if (!Array.isArray(data)) continue;

    for (const playerStats of data) {
      const playerId = String(playerStats.playerId);
      const indexedPlayer = playerIndex.get(playerId);
      const player = playersById[playerId] ?? {
        playerId,
        name: indexedPlayer?.name ?? "Ukjent",
        currentTeamName: indexedPlayer?.teamName ?? null,
        position: indexedPlayer?.position ?? null,
        seasonTeamName: teamName,
        season,
        sourceFile: file,
        matches: [],
        seasonStats: playerStats.seasonStats ?? null,
      };

      for (const match of playerStats.recentMatches ?? []) {
        const normalizedMatch = {
          ...match,
          playerId,
          playerName: player.name,
          playerTeam: teamName,
          season,
          sourceFile: file,
          goals: match.goals ?? 0,
          assists: match.assists ?? 0,
          shots: match.shots ?? 0,
          mep: match.mep ?? 0,
          technicalErrors: match.technicalErrors ?? 0,
          suspensions: match.suspensions ?? 0,
          warnings: match.warnings ?? 0,
          redCards: match.redCards ?? 0,
        };
        player.matches.push(normalizedMatch);
        allMatches.push(normalizedMatch);
      }

      playersById[playerId] = player;
    }
  }

  return { allMatches, playersById };
}

function parsePlayTimeSeconds(value) {
  const parts = String(value ?? "")
    .split(":")
    .map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return 0;
  }
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function formatPlayTime(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function competitionRank(players, playerId, readMetric) {
  const sorted = [...players].sort(
    (left, right) => readMetric(right) - readMetric(left),
  );
  const playerIndex = sorted.findIndex(
    (player) => String(player.playerId) === String(playerId),
  );
  if (playerIndex < 0) return null;

  const playerValue = readMetric(sorted[playerIndex]);
  const rank =
    sorted.filter((player) => readMetric(player) > playerValue).length + 1;
  return { rank, total: sorted.length, value: playerValue };
}

function summarizePlayerPerformance(player, playersById) {
  const matches = player?.matches ?? [];
  const seasonStats = player?.seasonStats ?? {};
  const totalPlayTimeSeconds = matches.reduce(
    (sum, match) => sum + parsePlayTimeSeconds(match.playTime),
    0,
  );
  const averagePlayTimeSeconds =
    matches.length > 0 ? totalPlayTimeSeconds / matches.length : 0;
  const sortedByMep = [...matches].sort((left, right) => right.mep - left.mep);
  const sortedByPlayTime = [...matches].sort(
    (left, right) =>
      parsePlayTimeSeconds(right.playTime) - parsePlayTimeSeconds(left.playTime),
  );
  const eligiblePeers = Object.values(playersById).filter(
    (candidate) =>
      candidate.position === player.position &&
      Number(candidate.seasonStats?.matches ?? 0) >= 5,
  );

  return {
    matches: matches.length,
    totalPlayTime: formatPlayTime(totalPlayTimeSeconds),
    averagePlayTime: formatPlayTime(averagePlayTimeSeconds),
    longestPlayTime: sortedByPlayTime[0]?.playTime ?? "00:00:00",
    shortestPlayTime: sortedByPlayTime.at(-1)?.playTime ?? "00:00:00",
    matchesAtLeast50Minutes: matches.filter(
      (match) => parsePlayTimeSeconds(match.playTime) >= 50 * 60,
    ).length,
    warnings: matches.reduce((sum, match) => sum + (match.warnings ?? 0), 0),
    suspensions: matches.reduce(
      (sum, match) => sum + (match.suspensions ?? 0),
      0,
    ),
    technicalErrors: matches.reduce(
      (sum, match) => sum + (match.technicalErrors ?? 0),
      0,
    ),
    redCards: matches.reduce((sum, match) => sum + (match.redCards ?? 0), 0),
    bestMatch: sortedByMep[0] ?? null,
    peerComparison: {
      position: player.position,
      minimumMatches: 5,
      mepTotal: competitionRank(
        eligiblePeers,
        player.playerId,
        (candidate) => Number(candidate.seasonStats?.mepTotal ?? 0),
      ),
      shotPercentage: competitionRank(
        eligiblePeers,
        player.playerId,
        (candidate) => Number(candidate.seasonStats?.shotPercentage ?? 0),
      ),
      goalsPerMatch: competitionRank(
        eligiblePeers,
        player.playerId,
        (candidate) => {
          const stats = candidate.seasonStats ?? {};
          return Number(stats.goals ?? 0) / Math.max(Number(stats.matches ?? 0), 1);
        },
      ),
    },
    seasonStats,
  };
}

function analyzeBestAgainstTeam(opponentTeam, allMatches) {
  const relevantMatches = allMatches.filter(
    (match) => normalizeText(match.opponent) === normalizeText(opponentTeam),
  );
  if (relevantMatches.length === 0) {
    return {
      found: false,
      reason: `Ingen kamper mot ${opponentTeam} funnet i datasettet.`,
    };
  }

  const players = new Map();
  for (const match of relevantMatches) {
    const aggregate = players.get(match.playerId) ?? {
      playerId: match.playerId,
      playerName: match.playerName,
      playerTeam: match.playerTeam,
      matches: 0,
      totalMep: 0,
      totalGoals: 0,
      totalAssists: 0,
      totalShots: 0,
    };
    aggregate.matches += 1;
    aggregate.totalMep += match.mep;
    aggregate.totalGoals += match.goals;
    aggregate.totalAssists += match.assists;
    aggregate.totalShots += match.shots;
    players.set(match.playerId, aggregate);
  }

  const rankings = [...players.values()]
    .map((player) => ({
      ...player,
      avgMep:
        player.matches > 0
          ? Math.round((player.totalMep / player.matches) * 100) / 100
          : 0,
    }))
    .sort((left, right) => right.totalMep - left.totalMep);

  return {
    found: true,
    opponentTeam,
    rankings: rankings.slice(0, 10),
    topPlayer: rankings[0] ?? null,
    totalMatches: relevantMatches.length,
  };
}

function analyzeBestForm(allMatches, season, matchCount = 5) {
  const matchesByPlayer = new Map();

  for (const match of allMatches) {
    if (season && match.season !== season) continue;
    const playerMatches = matchesByPlayer.get(match.playerId) ?? [];
    playerMatches.push(match);
    matchesByPlayer.set(match.playerId, playerMatches);
  }

  const rankings = [];
  for (const [playerId, matches] of matchesByPlayer) {
    const recentMatches = [...matches]
      .sort((left, right) =>
        String(left.date ?? left.matchId).localeCompare(
          String(right.date ?? right.matchId),
        ),
      )
      .slice(-matchCount);
    if (recentMatches.length < matchCount) continue;

    const totalMep = recentMatches.reduce((sum, match) => sum + match.mep, 0);
    const latestMatch = recentMatches.at(-1);
    rankings.push({
      playerId,
      playerName: latestMatch.playerName,
      playerTeam: latestMatch.playerTeam,
      matches: recentMatches.length,
      totalMep: Math.round(totalMep * 10) / 10,
      avgMep: Math.round((totalMep / recentMatches.length) * 100) / 100,
      totalGoals: recentMatches.reduce((sum, match) => sum + match.goals, 0),
      totalAssists: recentMatches.reduce((sum, match) => sum + match.assists, 0),
      recentMatches,
    });
  }

  rankings.sort(
    (left, right) =>
      right.avgMep - left.avgMep || right.totalMep - left.totalMep,
  );

  return {
    found: rankings.length > 0,
    season,
    matchCount,
    rankings: rankings.slice(0, 10),
    topPlayer: rankings[0] ?? null,
  };
}

function findBestMatchForPlayer(playerId, clubName, allMatches) {
  return (
    allMatches
      .filter(
        (match) =>
          String(match.playerId) === String(playerId) &&
          (!clubName || normalizeText(match.playerTeam) === normalizeText(clubName)),
      )
      .sort((left, right) => right.mep - left.mep)[0] ?? null
  );
}

module.exports = {
  STAT_DATASETS,
  analyzeBestAgainstTeam,
  analyzeBestForm,
  buildStatsDataset,
  findBestMatchForPlayer,
  formatPlayTime,
  parsePlayTimeSeconds,
  summarizePlayerPerformance,
};
