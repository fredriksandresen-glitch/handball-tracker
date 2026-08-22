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
        };
        player.matches.push(normalizedMatch);
        allMatches.push(normalizedMatch);
      }

      playersById[playerId] = player;
    }
  }

  return { allMatches, playersById };
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
  buildStatsDataset,
  findBestMatchForPlayer,
};
