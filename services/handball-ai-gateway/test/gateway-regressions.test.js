const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  extractClubFromQuestion,
  findPlayerByTokens,
  fuzzyMatchTeamName,
  resolveSeason,
} = require("../lib/queryUnderstanding");
const {
  STAT_DATASETS,
  analyzeBestAgainstTeam,
  buildStatsDataset,
  findBestMatchForPlayer,
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
