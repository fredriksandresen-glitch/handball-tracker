const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  extractClubFromQuestion,
  extractRequestedMatchCount,
  findPreviousComparisonQuestion,
  findPreviousBestFormQuestion,
  findPlayerFromConversation,
  findPlayerByTokens,
  findTeamMention,
  fuzzyMatchTeamName,
  isBestFormQuestion,
  isComparisonReportFollowUp,
  isGroupTeamContextFollowUp,
  isPreviousSeasonFormFollowUp,
  isPlayerFollowUpQuestion,
  resolveSeason,
} = require("../lib/queryUnderstanding");
const {
  STAT_DATASETS,
  analyzeBestPlayerForTeam,
  analyzeBestAgainstTeam,
  analyzeBestForm,
  analyzeLatestTeamMatch,
  buildStatsDataset,
  compareFormWithStandings,
  findBestMatchForPlayer,
  summarizePlayerPerformance,
} = require("../lib/statsDataset");
const { buildComparisonReport } = require("../lib/comparisonReport");
const { createComparisonPdf } = require("../lib/comparisonPdf");
const {
  buildComparisonFallbackAnswer,
  buildComparisonModelPrompts,
  chooseSharedLeague,
  findCurrentTeamPositionPeers,
  findUnsupportedNumberTokens,
  isTeammatePositionComparisonQuestion,
} = require("../lib/hybridAnalysis");

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
const firstDivisionArchiveStandings = JSON.parse(
  fs.readFileSync(
    path.resolve(
      __dirname,
      "../data/firstDivisionStandingsArchive2526.json",
    ),
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

test("resolves Marthe Ulvaknippa despite the user's name misspelling", () => {
  const player = findPlayerByTokens(
    "hvordan gikk det for marte ullevålsknippa forrige sesong?",
    players,
  );

  assert.equal(player?.playerId, "2239827495091");
  assert.equal(player.name, "Marthe Bjørnson Ulvåknippa");
  assert.equal(player.seasonStats.matches, 25);
  assert.equal(player.seasonStats.goals, 58);
  assert.equal(player.seasonStats.assists, 41);
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
  const fjellhammer = summarizePlayerPerformance(
    linnea,
    dataset.playersById,
    { teamName: "Fjellhammer", league: "elite" },
  );
  const kjelsaas = summarizePlayerPerformance(
    linnea,
    dataset.playersById,
    { teamName: "Kjelsås", league: "first-division" },
  );

  assert.equal(linnea.position, "VenstreKant");
  assert.equal(linnea.seasonSegments.length, 2);
  assert.equal(summary.totalPlayTime, "11:06:25");
  assert.equal(summary.averagePlayTime, "00:44:26");
  assert.equal(summary.matchesAtLeast50Minutes, 9);
  assert.equal(summary.technicalErrors, 5);
  assert.equal(summary.suspensions, 1);
  assert.equal(summary.warnings, 0);
  assert.equal(summary.redCards, 0);
  assert.equal(summary.bestMatch.opponent, "Gjøvik");
  assert.equal(summary.bestMatch.goals, 8);
  assert.equal(summary.seasonStats.goals, 20);
  assert.equal(fjellhammer.seasonStats.goals, 2);
  assert.equal(kjelsaas.seasonStats.goals, 18);
  assert.equal(kjelsaas.seasonStats.shotPercentage, 62.1);
  assert.equal(kjelsaas.bestMatch.mep, 6.4);
  assert.deepEqual(fjellhammer.peerComparison.mepTotal, {
    rank: 26,
    total: 27,
    value: 0.3,
  });
  assert.equal(fjellhammer.peerComparison.shotPercentage.rank, 26);
});

test("resolves Aker's other left wing for a conversational comparison", () => {
  const question =
    "kan jeg få en rapport der du sammenligner henne mot den andre venstrekanten til Aker topphåndball der hun har begynt nå?";
  const linnea = dataset.playersById["22398210032285"];
  const teammates = findCurrentTeamPositionPeers(
    linnea,
    dataset.playersById,
  );

  assert.equal(isTeammatePositionComparisonQuestion(question), true);
  assert.equal(teammates.length, 1);
  assert.equal(teammates[0].name, "Milla Haugerstuen Breen");
  assert.equal(
    chooseSharedLeague([linnea, teammates[0]], "2025-26"),
    "first-division",
  );
});

test("builds a grounded Linnea and Milla comparison for Clawdbot", () => {
  const linnea = dataset.playersById["22398210032285"];
  const milla = dataset.playersById["8163978717973"];
  const report = buildComparisonReport({
    playerIds: [linnea.playerId, milla.playerId],
    playersById: dataset.playersById,
    season: "2025-26",
    league: "first-division",
    standings: firstDivisionArchiveStandings,
  });
  const fallback = buildComparisonFallbackAnswer(
    report,
    "Aker Topphåndball",
  );
  const prompts = buildComparisonModelPrompts({
    question: "Sammenlign henne med den andre venstrekanten i Aker.",
    conversation: [
      { role: "user", content: "Oppsummer forrige sesong til Linnea Aula." },
    ],
    report,
    currentTeamName: "Aker Topphåndball",
  });

  assert.equal(report.players[0].metrics.games, 7);
  assert.equal(report.players[0].metrics.goals, 18);
  assert.equal(report.players[1].metrics.games, 25);
  assert.equal(report.players[1].metrics.goals, 56);
  assert.equal(report.players[1].metrics.shotPercentage, 80);
  assert.equal(report.players[0].standing.rank, 11);
  assert.equal(report.players[1].standing.rank, 3);
  assert.equal(report.players[0].goalContribution.appearanceGoalShare, 9.5);
  assert.equal(report.players[0].goalContribution.teamGoalsInAppearances, 190);
  assert.equal(report.players[1].goalContribution.appearanceGoalShare, 6.9);
  assert.equal(report.players[1].goalContribution.teamGoalsInAppearances, 807);
  assert.match(fallback, /Milla Haugerstuen Breen/);
  assert.match(fallback, /sterkeste og tryggeste rådatagrunnlaget/);
  assert.match(fallback, /Kjelsås endte 11\./);
  assert.match(prompts.userPrompt, /Kontrollert sammenligningsgrunnlag/);
  assert.deepEqual(
    findUnsupportedNumberTokens(
      "Milla hadde 56 mål på 25 kamper og 80% uttelling.",
      prompts.facts,
    ),
    [],
  );
  assert.deepEqual(
    findUnsupportedNumberTokens("Milla hadde 999 mål.", prompts.facts),
    ["999"],
  );
});

test("ranks first-division form separately from elite form", () => {
  const analysis = analyzeBestForm(
    dataset.allMatches,
    "2025-26",
    5,
    "first-division",
  );

  assert.equal(analysis.found, true);
  assert.equal(analysis.topPlayer.recentMatches.length, 5);
  assert.equal(
    analysis.rankings.every((player) =>
      player.recentMatches.every(
        (match) => match.league === "first-division",
      ),
    ),
    true,
  );
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

test("understands direct and conversational best-form variants", () => {
  const firstQuestion = "Hvem er i best form de siste fem kampene?";
  const retryQuestion = "hva med forrige sesong?";
  const explicitQuestion =
    "hvem var de 5 beste spillerne forrige sesong basert på form for de 5 siste kampene?";
  const conversation = [
    { role: "user", content: firstQuestion },
    {
      role: "assistant",
      content: "Jeg fant ikke nok kampdata for 2026-27.",
    },
  ];

  assert.equal(isBestFormQuestion(firstQuestion), true);
  assert.equal(isBestFormQuestion(explicitQuestion), true);
  assert.equal(isPreviousSeasonFormFollowUp(retryQuestion), true);
  assert.equal(findPreviousBestFormQuestion(conversation), firstQuestion);
  assert.equal(extractRequestedMatchCount(firstQuestion), 5);
  assert.equal(extractRequestedMatchCount("de siste tre kampene"), 3);
  assert.equal(resolveSeason(retryQuestion, "2026-27"), "2025-26");
  assert.equal(resolveSeason(explicitQuestion, "2026-27"), "2025-26");

  const analysis = analyzeBestForm(dataset.allMatches, "2025-26", 5);
  assert.equal(analysis.topPlayer.playerName, "Sarah Deari Solheim");
  assert.equal(analysis.rankings.slice(0, 5).length, 5);
});

test("answers Fjellhammer's latest-match scorer and position questions", () => {
  const teamNames = [
    ...new Set(dataset.allMatches.map((match) => match.playerTeam)),
  ];
  const team = findTeamMention(
    "hvilken posisjon og spiller scorte mest mål for fjellhammar siste kampen de spilte?",
    teamNames,
  );
  const analysis = analyzeLatestTeamMatch(team, dataset.allMatches, {
    season: "2026-27",
    league: "elite",
  });

  assert.equal(team, "Fjellhammer");
  assert.equal(analysis.found, true);
  assert.equal(analysis.usedFallbackSeason, true);
  assert.equal(analysis.season, "2025-26");
  assert.ok(analysis.topPlayer);
  assert.ok(analysis.topPosition);
  assert.equal(analysis.teamGoals > 0, true);
});

test("answers best-player questions for Utleira using available history", () => {
  const teamNames = [
    ...new Set(dataset.allMatches.map((match) => match.playerTeam)),
  ];
  const team = findTeamMention(
    "hvemr er den beste spilleren til Utleira Forrige sesong+",
    teamNames,
  );
  const analysis = analyzeBestPlayerForTeam(team, dataset.allMatches, {
    season: "2025-26",
  });

  assert.equal(team, "Utleira");
  assert.equal(analysis.found, true);
  assert.equal(analysis.season, "2025-26");
  assert.equal(analysis.minimumGames, 4);
  assert.ok(analysis.topPlayer);
  assert.equal(analysis.topPlayer.games >= 4, true);
});

test("resolves a PDF follow-up to the previous comparison request", () => {
  const conversation = [
    {
      role: "user",
      content:
        "kan du sammenligne Linnea Aulas forrige sesong med den andre venstrekanten hos Aker? gi meg en god analyse og en PDF",
    },
    {
      role: "assistant",
      content: "Jeg fant Milla Haugerstuen Breen og sammenlignet spillerne.",
    },
  ];

  assert.equal(
    isComparisonReportFollowUp("kan du sende rapporten til meg nå?"),
    true,
  );
  assert.equal(
    findPreviousComparisonQuestion(conversation),
    conversation[0].content,
  );
});

test("builds a role-aware comparison report from match-level data", () => {
  const report = buildComparisonReport({
    playerIds: ["2239826783348", "2239826764122"],
    playersById: dataset.playersById,
    season: "2025-26",
    league: "elite",
    standings: archiveStandings,
    generatedAt: "2026-08-22T12:00:00.000Z",
  });

  assert.equal(report.players.length, 2);
  assert.equal(report.comparison.samePosition, true);
  assert.equal(report.players[0].name, "My Lervold");
  assert.equal(report.players[0].metrics.games, 23);
  assert.equal(report.players[0].metrics.goals, 55);
  assert.equal(report.players[0].metrics.recentMatches.length, 5);
  assert.equal(report.players[0].peerSampleSize >= 5, true);
  assert.equal(report.comparison.leaders.length, 6);
});

test("renders the comparison report as a valid PDF", async () => {
  const report = buildComparisonReport({
    playerIds: ["2239826783348", "2239826764122"],
    playersById: dataset.playersById,
    season: "2025-26",
    league: "elite",
    standings: archiveStandings,
    generatedAt: "2026-08-22T12:00:00.000Z",
  });
  const pdf = await createComparisonPdf(report, {
    fetchImpl: async () => ({
      ok: false,
      headers: { get: () => null },
    }),
  });

  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.equal(pdf.length > 10_000, true);
});
