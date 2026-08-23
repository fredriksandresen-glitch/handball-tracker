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
].map(([file, teamName]) => ({
  file,
  teamName,
  league: "elite",
  season: "2025-26",
}));

STAT_DATASETS.push({
  file: "firstDivision2526FullPlayerStats.json",
  teamName: null,
  league: "first-division",
  season: "2025-26",
});

function round1(value) {
  return Math.round(value * 10) / 10;
}

function aggregateSeasonStats(segments) {
  const totals = segments.reduce(
    (sum, segment) => {
      const stats = segment.seasonStats ?? {};
      for (const field of [
        "matches",
        "goals",
        "shots",
        "assists",
        "technicalErrors",
        "suspensions",
        "mepTotal",
      ]) {
        sum[field] += Number(stats[field] ?? 0);
      }
      return sum;
    },
    {
      matches: 0,
      goals: 0,
      shots: 0,
      assists: 0,
      technicalErrors: 0,
      suspensions: 0,
      mepTotal: 0,
    },
  );

  totals.mepTotal = round1(totals.mepTotal);
  return {
    ...totals,
    shotPercentage:
      totals.shots > 0 ? round1((totals.goals / totals.shots) * 100) : 0,
    mepAvg:
      totals.matches > 0 ? round1(totals.mepTotal / totals.matches) : 0,
  };
}

function normalizeDatasetPosition(position) {
  const value = normalizeText(position);
  if (value.includes("keeper") || value.includes("malvakt")) return "Keeper";
  if (value.includes("kant") && value.includes("venstre")) return "VenstreKant";
  if (value.includes("kant") && value.includes("hoyre")) return "HoyreKant";
  if (value.includes("linje") || value.includes("strek")) return "Linje";
  return value ? "Bakspiller" : null;
}

function buildStatsDataset(searchIndex, loadedFiles) {
  const playerIndex = new Map(
    searchIndex.map((player) => [String(player.id), player]),
  );
  const canonicalByExternalId = new Map();
  for (const { data } of loadedFiles) {
    if (!Array.isArray(data)) continue;
    for (const playerStats of data) {
      if (!playerStats.canonicalId) continue;
      canonicalByExternalId.set(
        String(playerStats.playerId),
        String(playerStats.canonicalId),
      );
      if (playerStats.canonicalPlayerId) {
        canonicalByExternalId.set(
          String(playerStats.canonicalPlayerId),
          String(playerStats.canonicalId),
        );
      }
    }
  }

  const playersByCanonicalId = new Map();
  const allMatches = [];

  for (const { data, file, league, season, teamName } of loadedFiles) {
    if (!Array.isArray(data)) continue;

    for (const playerStats of data) {
      const externalPlayerId = String(playerStats.playerId);
      const canonicalId =
        String(playerStats.canonicalId ?? "") ||
        canonicalByExternalId.get(externalPlayerId) ||
        externalPlayerId;
      const preferredPlayerId = String(
        playerStats.canonicalPlayerId ?? externalPlayerId,
      );
      const indexedPlayer =
        playerIndex.get(preferredPlayerId) ?? playerIndex.get(externalPlayerId);
      const segmentTeamName = playerStats.teamName ?? teamName;
      if (!segmentTeamName) continue;
      const player = playersByCanonicalId.get(canonicalId) ?? {
        playerId: preferredPlayerId,
        canonicalId,
        externalIds: [],
        name: indexedPlayer?.name ?? playerStats.playerName ?? "Ukjent",
        imageUrl: indexedPlayer?.imageUrl ?? null,
        currentTeamName: indexedPlayer?.teamName ?? null,
        position:
          indexedPlayer?.position ??
          normalizeDatasetPosition(playerStats.position),
        seasonTeamName: segmentTeamName,
        seasonTeamNames: [],
        season,
        sourceFile: file,
        sourceFiles: [],
        matches: [],
        seasonSegments: [],
        seasonStats: null,
      };

      if (!player.externalIds.includes(externalPlayerId)) {
        player.externalIds.push(externalPlayerId);
      }
      if (!player.seasonTeamNames.includes(segmentTeamName)) {
        player.seasonTeamNames.push(segmentTeamName);
      }
      if (!player.sourceFiles.includes(file)) player.sourceFiles.push(file);

      const segment = {
        externalPlayerId,
        teamName: segmentTeamName,
        league: playerStats.league ?? league ?? null,
        season: playerStats.season ?? season,
        sourceFile: file,
        seasonStats: playerStats.seasonStats ?? null,
        spellType: playerStats.spellType ?? null,
        matches: [],
      };

      for (const match of playerStats.recentMatches ?? []) {
        const normalizedMatch = {
          ...match,
          playerId: player.playerId,
          externalPlayerId,
          playerName: player.name,
          playerTeam: segmentTeamName,
          league: segment.league,
          season: segment.season,
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
        segment.matches.push(normalizedMatch);
        allMatches.push(normalizedMatch);
      }

      player.seasonSegments.push(segment);
      playersByCanonicalId.set(canonicalId, player);
    }
  }

  const playersById = {};
  for (const player of playersByCanonicalId.values()) {
    player.seasonStats = aggregateSeasonStats(player.seasonSegments);
    playersById[player.playerId] = player;
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

function scopedSegments(player, options = {}) {
  const segments = player?.seasonSegments ?? [];
  if (segments.length === 0) return [];
  return segments.filter(
    (segment) =>
      (!options.teamName ||
        normalizeText(segment.teamName) === normalizeText(options.teamName)) &&
      (!options.league || segment.league === options.league),
  );
}

function summarizePlayerPerformance(player, playersById, options = {}) {
  const selectedSegments = scopedSegments(player, options);
  const matches =
    selectedSegments.length > 0
      ? selectedSegments.flatMap((segment) => segment.matches ?? [])
      : (player?.matches ?? []);
  const seasonStats =
    selectedSegments.length > 0
      ? aggregateSeasonStats(selectedSegments)
      : (player?.seasonStats ?? {});
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
  const eligiblePeers = Object.values(playersById)
    .map((candidate) => {
      const candidateSegments = scopedSegments(candidate, {
        league: options.league,
      });
      if (options.league && candidateSegments.length === 0) return null;
      return {
        ...candidate,
        seasonStats:
          candidateSegments.length > 0
            ? aggregateSeasonStats(candidateSegments)
            : candidate.seasonStats,
      };
    })
    .filter(
      (candidate) =>
        candidate &&
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

function findSeasonSegment(player, teamName) {
  return (
    player?.seasonSegments?.find(
      (segment) =>
        normalizeText(segment.teamName) === normalizeText(teamName),
    ) ?? null
  );
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

function analyzeBestForm(
  allMatches,
  season,
  matchCount = 5,
  league = "elite",
) {
  const matchesByPlayer = new Map();

  for (const match of allMatches) {
    if (season && match.season !== season) continue;
    if (league && match.league !== league) continue;
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

function compareFormWithStandings(formAnalysis, standings, limit = 5) {
  const standingByTeam = new Map(
    standings.map((standing) => [normalizeText(standing.name), standing]),
  );
  const candidates = formAnalysis.rankings.slice(0, limit).map((player) => ({
    ...player,
    standing: standingByTeam.get(normalizeText(player.playerTeam)) ?? null,
  }));
  const candidatesWithStanding = candidates.filter((player) => player.standing);
  const rawLeader = candidates[0] ?? null;
  const lowestPlacedTeamPlayer = [...candidatesWithStanding].sort(
    (left, right) =>
      right.standing.rank - left.standing.rank || right.avgMep - left.avgMep,
  )[0] ?? null;

  return {
    found: candidates.length > 0 && candidatesWithStanding.length === candidates.length,
    candidates,
    rawLeader,
    mostImpressive:
      rawLeader?.playerId === lowestPlacedTeamPlayer?.playerId
        ? rawLeader
        : null,
    season: formAnalysis.season,
    matchCount: formAnalysis.matchCount,
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
  compareFormWithStandings,
  findBestMatchForPlayer,
  findSeasonSegment,
  formatPlayTime,
  parsePlayTimeSeconds,
  summarizePlayerPerformance,
};
