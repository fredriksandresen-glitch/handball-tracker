function leagueLabel(league) {
  return league === "first-division" ? "1. divisjon" : "Eliteserien";
}

function buildRecruitmentFacts(analysis) {
  return {
    season: analysis.season,
    minimumGames: analysis.minimumGames,
    limitation:
      "Dette er en prestasjonsbasert scouting-shortlist. Kontrakt, tilgjengelighet, alder, skadehistorikk, lønn og spillerens egne ønsker er ukjent.",
    candidates: Object.values(analysis.byLeague)
      .flat()
      .map((candidate) => ({
        ...candidate,
        standing: candidate.standing ?? null,
      })),
  };
}

function buildRecruitmentFallbackAnswer(analysis) {
  let answer = `Jeg kan lage en prestasjonsbasert shortlist for ${analysis.season}, men ikke fastslå hvem som faktisk er tilgjengelig for overgang. Bare kantspillere med minst ${analysis.minimumGames} kamper er med.\n`;

  for (const league of ["elite", "first-division"]) {
    const candidates = analysis.byLeague[league] ?? [];
    if (candidates.length === 0) continue;
    answer += `\n${leagueLabel(league)}:\n`;
    candidates.slice(0, 5).forEach((candidate, index) => {
      const standing = candidate.standing
        ? `, laget endte ${candidate.standing.rank}.`
        : "";
      answer += `${index + 1}. ${candidate.name} (${candidate.teams.join("/")}, ${candidate.position === "VenstreKant" ? "venstre kant" : "høyre kant"}): MEP ${candidate.mepPerGame} per kamp, ${candidate.goalsPerGame} mål per kamp, ${candidate.shotPercentage}% uttelling og form-MEP ${candidate.formLastFive}${standing}\n`;
    });
  }

  answer +=
    "\nDette er ikke en ferdig signeringsanbefaling. Før kontakt bør klubben kontrollere rollebehov, kontrakt, alder, skadehistorikk, økonomi og om spilleren ønsker en overgang.";
  return answer;
}

function buildRecruitmentModelPrompts({ question, conversation, analysis }) {
  const facts = buildRecruitmentFacts(analysis);
  const recentConversation = Array.isArray(conversation)
    ? conversation.slice(-4).map((message) => ({
        role: message.role,
        content: String(message.content ?? "").slice(0, 800),
      }))
    : [];
  const systemPrompt = `Du er scouting- og analyse-laget i Handball Tracker. Svar på norsk som en erfaren sportslig leder i håndball.
Du får en kontrollert shortlist over kantspillere fra 2025-26. Bruk bare fakta og tall i datagrunnlaget.
Lag en praktisk shortlist med ulike spillerprofiler, ikke bare en rangering etter ett tall. Vurder produksjon, effektivitet, MEP, form, assist, spilletid, utvalgsstørrelse, divisjonsnivå og lagplassering.
Skill tydelig mellom dokumenterte prestasjoner og sportslig tolkning. Ikke påstå at en spiller er tilgjengelig, billig, skadefri eller interessert. Kontrakt, alder, skadehistorikk og økonomi er ukjent.
Tallfest aldri noe som ikke finnes i datagrunnlaget. Avslutt med hvilke opplysninger klubben må hente før eventuell kontakt.`;
  const userPrompt = `Brukerens spørsmål:\n${question}\n\nSiste samtalekontekst:\n${JSON.stringify(recentConversation)}\n\nKontrollert kandidatgrunnlag:\n${JSON.stringify(facts)}\n\nGi en tydelig og begrunnet scouting-shortlist på maksimalt 650 ord.`;
  return { facts, systemPrompt, userPrompt };
}

module.exports = {
  buildRecruitmentFacts,
  buildRecruitmentFallbackAnswer,
  buildRecruitmentModelPrompts,
};
