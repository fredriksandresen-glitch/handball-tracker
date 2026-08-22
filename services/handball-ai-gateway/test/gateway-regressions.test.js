const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  extractClubFromQuestion,
  findPreviousBestFormQuestion,
  findPlayerFromConversation,
  findPlayerByTokens,
  fuzzyMatchTeamName,
  isGroupTeamContextFollowUp,
  isPlayerFollowUpQuestion,
  resolveSeason,
} = require("../lib/queryUnderstanding");
const {
  STAT_DATASETS,
  analyzeBestAgainstTeam,
  analyzeBestForm,
  buildStatsDataset,
  compareFormWithStandings,
  findBestMatchForPlayer,
  summarizePlayerPerformance,
} = require("../lib/statsDataset");

const frontendData = path.resolve(__dirname, "../../../src/frontend/public/data");
const searchIndex = JSON.parse(
  fs.readFileSync(path.join(frontendData, "search-player-index.json"), "utf8"),
);
const akerRoster = JSON.parse(
  fs.readFileSync(
    path.resolve(frontendData, "../../src/data/akerRoster.json"),
    "utf8",
  ),
);
for (const player of akerRoster) {
  const indexedPlayer = searchIndex.find(
    (entry) => String(entry.id) === String(player.id),
  );
  if (indexedPlayer) indexedPlayer.teamName = "Aker Topphåndball";
}
const loadedFiles = STAT_DATASETS.map((dataset) => ({
  ...dataset,
  data: JSON.parse(
    fs.readFileSync(
      path.join(frontendData, "player-stats", dataset.file),
      "utf8",
    ),
  ),
}));
const dataset = buildStatsDataset(searchIndex, loadedFiles);
const players = Object.values(dataset.playersById);
const archiveStandings = JSON.parse(
  fs.readFileSync(
    path.resolve(frontendData, "../../src/data/leagueStandingsArchive.json"),
    "utf8",
  ),
);

test("resolves Camilla Herrem and keeps her 2025/26 statistics", () => {
  const player = findPlayerByTokens(
    "Hvor mange mål hadde Camilla Herrem i 2025/26?",
    players,
  );

  assert.equal(player?.playerId, "2239837731486");
  assert.equal(player.seasonStats.goals, 113);
  assert.equal(resolveSeason("i 2025/26", "2026-27"), "2025-26");
});

test("resolves Linnea Aula without confusing her with Ada Aalstad", () => {
  const question =
    "hva var Linnea aulas beste kamp for fjellhammar i fjor? hva var statsen hennes? tenler du det var lurt å bytte til Aker?";
  const player = findPlayerByTokens(question, players);
  const rawClub = extractClubFromQuestion(question);
  const club = fuzzyMatchTeamName(
    rawClub,
    [...new Set(players.map((entry) => entry.seasonTeamName))],
  );
  const bestMatch = findBestMatchForPlayer(
    player?.playerId,
    club,
    dataset.allMatches,
  );

  assert.equal(player?.playerId, "22398210032285");
  assert.equal(player.name, "Linnea Isabel Ingeborg Aula");
  assert.equal(player.currentTeamName, "Aker Topphåndball");
  assert.equal(club, "Fjellhammer");
  assert.deepEqual(
    {
      assists: bestMatch?.assists,
      date: bestMatch?.date,
      goals: bestMatch?.goals,
      mep: bestMatch?.mep,
      opponent: bestMatch?.opponent,
    },
    {
      assists: 1,
      date: "2025-09-10",
      goals: 1,
      mep: 1.1,
      opponent: "Sola",
    },
  );
});

test("keeps both Fjellhammer best-player spellings deterministic", () => {
  const analysis = analyzeBestAgainstTeam("Fjellhammer", dataset.allMatches);

  assert.equal(analysis.found, true);
  assert.equal(analysis.topPlayer.playerId, "2254746888779");
  assert.equal(analysis.topPlayer.playerName, "Martine Kårigstad Andersen");
  assert.equal(analysis.topPlayer.totalMep, 13.8);
  assert.equal(
    fuzzyMatchTeamName("fjellhammar", ["Fjellhammer"]),
    "Fjellhammer",
  );
});

test("ranks the final five matches from the previous season", () => {
  const question = "hvem var i best form de 5 siste kampene forrgie sesong?";
  const season = resolveSeason(question, "2026-27");
  const analysis = analyzeBestForm(dataset.allMatches, season, 5);

  assert.equal(season, "2025-26");
  assert.equal(analysis.found, true);
  assert.equal(analysis.topPlayer.playerId, "2239828059504");
  assert.equal(analysis.topPlayer.playerName, "Sarah Deari Solheim");
  assert.equal(analysis.topPlayer.avgMep, 5.74);
  assert.equal(analysis.topPlayer.totalMep, 28.7);
  assert.equal(analysis.topPlayer.totalGoals, 42);
});

test("resolves a pronoun follow-up to Linnea from conversation history", () => {
  const question =
    "har du en mere detaljert oppsummering? og hva tenker du om overgangen hennes til Aker?";
  const conversation = [
    {
      role: "user",
      content: "hvordan vil du oppsummere fjorårssesongen til Linnea Aula?",
    },
    {
      role: "assistant",
      content: "Linnea representerte Fjellhammer i 2025-26.",
    },
  ];

  assert.equal(isPlayerFollowUpQuestion(question), true);
  assert.equal(
    resolveSeason("hvordan var fjorårssesongen?", "2026-27"),
    "2025-26",
  );
  assert.equal(
    findPlayerFromConversation(conversation, players)?.playerId,
    "22398210032285",
  );
});

test("summarizes Linnea's playing time, discipline and position comparison", () => {
  const linnea = dataset.playersById["22398210032285"];
  const summary = summarizePlayerPerformance(linnea, dataset.playersById);

  assert.equal(linnea.position, "VenstreKant");
  assert.equal(summary.totalPlayTime, "04:31:37");
  assert.equal(summary.averagePlayTime, "00:33:57");
  assert.equal(summary.matchesAtLeast50Minutes, 3);
  assert.equal(summary.technicalErrors, 3);
  assert.equal(summary.suspensions, 1);
  assert.equal(summary.warnings, 0);
  assert.equal(summary.redCards, 0);
  assert.equal(summary.bestMatch.opponent, "Sola");
  assert.deepEqual(summary.peerComparison.mepTotal, {
    rank: 26,
    total: 27,
    value: 0.3,
  });
  assert.equal(summary.peerComparison.shotPercentage.rank, 26);
});

test("resolves a group follow-up and compares form with final standings", () => {
  const conversation = [
    {
      role: "user",
      content: "Hvem var i best form siste 5 kampene forrige sesong?",
    },
    {
      role: "assistant",
      content: "Sarah Deari Solheim toppet en liste på fem spillere.",
    },
  ];
  const followUp =
    "hvem av de er mest imponerende med tanke på laget de spiller for?";
  const previousQuestion = findPreviousBestFormQuestion(conversation);
  const form = analyzeBestForm(
    dataset.allMatches,
    resolveSeason(previousQuestion, "2026-27"),
    5,
  );
  const comparison = compareFormWithStandings(form, archiveStandings, 5);

  assert.equal(isGroupTeamContextFollowUp(followUp), true);
  assert.equal(previousQuestion, conversation[0].content);
  assert.equal(comparison.found, true);
  assert.equal(comparison.mostImpressive.playerId, "2239828059504");
  assert.equal(comparison.mostImpressive.standing.rank, 12);
  assert.deepEqual(
    comparison.candidates.map((player) => player.standing.rank),
    [12, 3, 4, 1, 7],
  );
});
