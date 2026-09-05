function leagueLabel(league) {
  return league === "first-division" ? "1. divisjon" : "Eliteserien";
}

function buildMepTrendFacts(analysis) {
  return {
    season: analysis.season,
    league: analysis.league,
    matchCount: analysis.matchCount,
    method:
      "Kandidatene har fem registrerte avslutningskamper. Kurvestigning er lineær MEP-endring per kamp; tidlig-sent-endring sammenligner snittet av de to første og to siste kampene.",
    limitation:
      "Positiv sluttkurve er et utviklingssignal, ikke en prognose eller garanti for neste sesong.",
    candidates: analysis.candidates,
  };
}

function buildMepTrendFallbackAnswer(analysis) {
  let answer = `Spillere med tydeligst positiv MEP-kurve i de ${analysis.matchCount} siste kampene av ${analysis.season} i ${leagueLabel(analysis.league)}:\n`;
  analysis.candidates.slice(0, 8).forEach((candidate, index) => {
    answer += `${index + 1}. ${candidate.playerName} (${candidate.playerTeam}): MEP-serie ${candidate.mepValues.join(" → ")}, stigning ${candidate.slopePerMatch} per kamp, snitt ${candidate.averageMep} og endring fra tidlig til sent ${candidate.earlyToLateChange}\n`;
  });
  answer +=
    "\nDette rangerer positiv avslutning på sesongen, ikke sikkert framtidig potensial. Rolle, alder, skader, motstand og forventet spilletid neste sesong er ikke med i datagrunnlaget.";
  return answer;
}

function buildMepTrendModelPrompts({ question, conversation, analysis }) {
  const facts = buildMepTrendFacts(analysis);
  const systemPrompt = `Du er analyse-laget i Handball Tracker. Svar på norsk som en erfaren håndballanalytiker.
Bruk bare det kontrollerte MEP-grunnlaget. Identifiser spillerne med mest interessant positiv sluttkurve, men vurder også nivået på MEP-snittet, stabilitet, mål, assist og om kurven drives av én enkelt kamp.
Skill tydelig mellom dokumentert formutvikling og framtidig potensial. Ikke lov at noen vil lykkes neste sesong, og ikke finn på alder, kontrakt, skader eller rolle.
Ikke lag nye tall. Forklar hvorfor hver anbefalt spiller er interessant og hvilke forbehold som gjelder.`;
  const userPrompt = `Spørsmål:\n${question}\n\nSiste samtalekontekst:\n${JSON.stringify((conversation ?? []).slice(-4))}\n\nKontrollert MEP-trendgrunnlag:\n${JSON.stringify(facts)}\n\nSkriv en tydelig analyse på maksimalt 550 ord.`;
  return { facts, systemPrompt, userPrompt };
}

module.exports = {
  buildMepTrendFacts,
  buildMepTrendFallbackAnswer,
  buildMepTrendModelPrompts,
};
