function rankAssessment(rank, total) {
  if (!rank || !total) return "ukjent plassering";
  const share = rank / total;
  if (share <= 0.25) return "øvre firedel";
  if (share <= 0.5) return "øvre halvdel";
  if (share <= 0.75) return "nedre halvdel";
  return "nedre firedel";
}

function buildPositionBenchmarkFacts(player, segmentPerformances) {
  return {
    playerId: player.playerId,
    name: player.name,
    position: player.position,
    season: player.season,
    comparisonRule:
      "Sammenligningen omfatter spillere i samme posisjon og divisjon med minst fem kamper.",
    segments: segmentPerformances.map(({ segment, performance }) => ({
      teamName: segment.teamName,
      league: segment.league,
      seasonStats: performance.seasonStats,
      totalPlayTime: performance.totalPlayTime,
      averagePlayTime: performance.averagePlayTime,
      bestMatch: performance.bestMatch,
      peerComparison: performance.peerComparison,
    })),
  };
}

function buildPositionBenchmarkFallbackAnswer(player, segmentPerformances) {
  let answer = `${player.name} sammenlignet med andre i samme posisjon i ${player.season}:\n`;
  for (const { segment, performance } of segmentPerformances) {
    const peer = performance.peerComparison;
    const stats = performance.seasonStats;
    const rates = peer.playerRates;
    const averages = peer.positionAverages;
    answer += `\n${segment.teamName}, ${segment.league === "first-division" ? "1. divisjon" : "Eliteserien"}:\n`;
    answer += `- MEP per kamp: ${rates.mepPerMatch} mot posisjonssnitt ${averages.mepPerMatch}\n`;
    answer += `- Mål per kamp: ${rates.goalsPerMatch} mot posisjonssnitt ${averages.goalsPerMatch}\n`;
    answer += `- Assist per kamp: ${rates.assistsPerMatch} mot posisjonssnitt ${averages.assistsPerMatch}\n`;
    answer += `- Skuddprosent: ${rates.shotPercentage}% mot posisjonssnitt ${averages.shotPercentage}%\n`;
    for (const [label, ranking] of [
      ["MEP per kamp", peer.mepPerMatch],
      ["Mål per kamp", peer.goalsPerMatch],
      ["Skuddprosent", peer.shotPercentage],
    ]) {
      answer += ranking
        ? `- ${label}: plass ${ranking.rank}/${ranking.total} (${rankAssessment(ranking.rank, ranking.total)})\n`
        : `- ${label}: ikke nok kamper til plassering\n`;
    }
    answer += `- Grunnlag: ${stats.matches} kamper, ${stats.goals} mål, ${stats.assists} assist og ${stats.shotPercentage}% uttelling\n`;
  }
  answer +=
    "\nDette viser hvor hun rangerte i de registrerte nøkkeltallene, men ikke forsvarsbidrag, taktisk rolle eller kontraktsverdi.";
  return answer;
}

function buildPositionBenchmarkModelPrompts({ question, conversation, facts }) {
  const systemPrompt = `Du er analyse-laget i Handball Tracker. Svar på norsk som en erfaren håndballanalytiker.
Bruk bare det kontrollerte datagrunnlaget. Forklar hva spillerens rangeringer betyr i praksis, og skill mellom volum, effektivitet og samlet MEP.
Ta hensyn til antall kamper og spilletid. Ikke finn på tall eller opplysninger om forsvar, skader, kontrakt eller trenerens vurdering.
Gi en tydelig, nyansert konklusjon og pek på både styrker og forbedringsområder.`;
  const recentConversation = Array.isArray(conversation)
    ? conversation.slice(-4)
    : [];
  const userPrompt = `Spørsmål:\n${question}\n\nSiste samtalekontekst:\n${JSON.stringify(recentConversation)}\n\nKontrollert posisjonssammenligning:\n${JSON.stringify(facts)}\n\nSkriv en analyse på maksimalt 400 ord.`;
  return { systemPrompt, userPrompt };
}

module.exports = {
  buildPositionBenchmarkFacts,
  buildPositionBenchmarkFallbackAnswer,
  buildPositionBenchmarkModelPrompts,
};
