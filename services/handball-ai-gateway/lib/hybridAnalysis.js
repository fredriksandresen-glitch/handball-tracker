const { normalizeText } = require("./queryUnderstanding");

function isTeammatePositionComparisonQuestion(question) {
  const normalized = normalizeText(question);
  const asksForComparison =
    /\b(sammenlign(?:e|er|ing)?|rapport|opp mot|forskjell(?:en|er)?)\b/.test(
      normalized,
    );
  const referencesTeammate =
    /\b(andre|annen|lagkamerat(?:en)?|samme posisjon|venstrekant(?:en)?|hoyrekant(?:en)?)\b/.test(
      normalized,
    );
  const referencesCurrentTeam =
    /\b(lag(?:et)?|spiller|begynt|overgang|aker|naa)\b/.test(normalized);

  return asksForComparison && referencesTeammate && referencesCurrentTeam;
}

function findCurrentTeamPositionPeers(player, playersById) {
  if (!player?.currentTeamName || !player?.position) return [];

  const playerIds = new Set([
    String(player.playerId),
    String(player.canonicalId),
    ...(player.externalIds ?? []).map(String),
  ]);
  const currentTeam = normalizeText(player.currentTeamName);

  return Object.values(playersById)
    .filter((candidate) => {
      if (!candidate?.currentTeamName || candidate.position !== player.position) {
        return false;
      }
      const candidateIds = [
        candidate.playerId,
        candidate.canonicalId,
        ...(candidate.externalIds ?? []),
      ].map(String);
      return (
        normalizeText(candidate.currentTeamName) === currentTeam &&
        !candidateIds.some((id) => playerIds.has(id))
      );
    })
    .sort((left, right) => left.name.localeCompare(right.name, "nb"));
}

function chooseSharedLeague(players, season) {
  const leagueSets = players.map(
    (player) =>
      new Set(
        (player.seasonSegments ?? [])
          .filter((segment) => !season || segment.season === season)
          .map((segment) => segment.league)
          .filter(Boolean),
      ),
  );
  if (leagueSets.some((leagues) => leagues.size === 0)) return null;

  const shared = [...leagueSets[0]].filter((league) =>
    leagueSets.slice(1).every((leagues) => leagues.has(league)),
  );
  return ["first-division", "elite"].find((league) => shared.includes(league)) ??
    shared[0] ??
    null;
}

function leagueLabel(league) {
  return league === "first-division" ? "1. divisjon" : "Eliteserien";
}

function playerFact(player) {
  const metrics = player.metrics;
  return {
    playerId: player.playerId,
    name: player.name,
    position: player.position,
    historicalTeams: player.teams,
    currentTeamName: player.currentTeamName,
    sample: {
      games: metrics.games,
      minutes: metrics.minutes,
      minutesPerGame: metrics.minutesPerGame,
    },
    production: {
      goals: metrics.goals,
      goalsPerGame: metrics.goalsPerGame,
      goalsPer60: metrics.goalsPer60,
      assists: metrics.assists,
      assistsPer60: metrics.assistsPer60,
      shots: metrics.shots,
      shotPercentage: metrics.shotPercentage,
      technicalErrors: metrics.technicalErrors,
    },
    impact: {
      mepTotal: metrics.mepTotal,
      mepPerGame: metrics.mepPerGame,
      mepPer60: metrics.mepPer60,
      formLastFive: metrics.formLastFive,
      mepConsistency: metrics.mepConsistency,
    },
    bestMatch: metrics.bestMatch,
    percentiles: player.percentiles,
    positionAverage: player.positionAverage,
    positionSampleSize: player.peerSampleSize,
    teamStanding: player.standing,
    goalContribution: player.goalContribution,
  };
}

function buildComparisonFacts(report, currentTeamName) {
  return {
    season: report.season,
    league: report.league,
    leagueLabel: leagueLabel(report.league),
    currentTeamName,
    comparisonRule:
      "Sammenligningen bruker bare kamper fra samme liga og sesong. Lagplassering brukes som kontekst, ikke som en kunstig matematisk korreksjon.",
    players: report.players.map(playerFact),
    teamContext: report.comparison.teamContext,
  };
}

function buildComparisonFallbackAnswer(report, currentTeamName) {
  const [reference, teammate] = report.players;
  const left = reference.metrics;
  const right = teammate.metrics;

  let answer = `Jeg fant den andre spilleren i samme posisjon hos ${currentTeamName}: ${teammate.name}.\n\n`;
  answer += `For å gjøre sammenligningen mest mulig rettferdig bruker jeg bare ${leagueLabel(report.league)} i ${report.season}. `;
  answer += `${reference.name} vurderes dermed ut fra perioden i ${reference.teams.join(" og ")}, mens ${teammate.name} vurderes ut fra ${teammate.teams.join(" og ")}.\n\n`;
  answer += `${reference.name}:\n`;
  answer += `- ${left.games} kamper, ${left.goals} mål på ${left.shots} skudd (${left.shotPercentage}%)\n`;
  answer += `- ${left.goalsPerGame} mål per kamp og ${left.goalsPer60} mål per 60 minutter\n`;
  answer += `- ${left.assists} assist, MEP ${left.mepTotal} totalt og ${left.mepPerGame} per kamp\n`;
  answer += `- ${left.minutesPerGame} minutter per kamp, form-MEP ${left.formLastFive} over de fem siste\n\n`;
  answer += `- ${reference.goalContribution.appearanceGoalShare}% av ${reference.teams.join(" og ")} sine registrerte mål i kampene hun deltok i (${reference.goalContribution.playerGoals} av ${reference.goalContribution.teamGoalsInAppearances})\n`;
  if (reference.standing) {
    answer += `- Laget endte på ${reference.standing.rank}. plass med ${reference.standing.points} poeng og målforskjell ${reference.standing.goalDifference}\n\n`;
  }
  answer += `${teammate.name}:\n`;
  answer += `- ${right.games} kamper, ${right.goals} mål på ${right.shots} skudd (${right.shotPercentage}%)\n`;
  answer += `- ${right.goalsPerGame} mål per kamp og ${right.goalsPer60} mål per 60 minutter\n`;
  answer += `- ${right.assists} assist, MEP ${right.mepTotal} totalt og ${right.mepPerGame} per kamp\n`;
  answer += `- ${right.minutesPerGame} minutter per kamp, form-MEP ${right.formLastFive} over de fem siste\n`;
  answer += `- ${teammate.goalContribution.appearanceGoalShare}% av ${teammate.teams.join(" og ")} sine registrerte mål i kampene hun deltok i (${teammate.goalContribution.playerGoals} av ${teammate.goalContribution.teamGoalsInAppearances})\n`;
  if (teammate.standing) {
    answer += `- Laget endte på ${teammate.standing.rank}. plass med ${teammate.standing.points} poeng og målforskjell ${teammate.standing.goalDifference}\n`;
  }
  answer += `\n`;
  answer += `Datadrevet vurdering:\n`;
  answer += `${teammate.name} har det sterkeste og tryggeste rådatagrunnlaget: flere kamper, høyere skuddeffektivitet, flere assist per 60 minutter, høyere MEP per kamp og bedre form over de fem siste. `;
  answer += `${reference.name} hadde mer spilletid per registrerte kamp og et litt høyere målsnitt per kamp, men utvalget hennes er vesentlig mindre. `;
  if (report.comparison.teamContext) {
    answer += `${reference.name} leverte samtidig for et klart svakere lag: ${reference.standing.teamName} endte ${reference.standing.rank}., mens ${teammate.standing.teamName} endte ${teammate.standing.rank}. Det gjør bidraget hennes mer interessant enn råtallene alene viser, uten at vi kan regne det om til et sikkert prestasjonstillegg. `;
  }
  answer += `Tallene peker fortsatt mot at ${teammate.name} starter med et forsprang i kampen om venstrekantrollen, mens ${reference.name} viste at hun kan produsere når hun får mye spilletid og en stor andel av lagets avslutningsansvar. `;
  answer += `Vi mangler kampdata og rollefordeling i ${currentTeamName} for 2026-27, så dette er en vurdering av utgangspunktet, ikke en konklusjon om hvem som faktisk vil spille mest.`;
  return answer;
}

function buildComparisonModelPrompts({
  question,
  conversation,
  report,
  currentTeamName,
}) {
  const facts = buildComparisonFacts(report, currentTeamName);
  const recentConversation = Array.isArray(conversation)
    ? conversation.slice(-4).map((message) => ({
        role: message.role,
        content: String(message.content ?? "").slice(0, 800),
      }))
    : [];

  const systemPrompt = `Du er analyse-laget i Handball Tracker. Svar på norsk som en erfaren håndballanalytiker.
Du får et ferdig kontrollert, strukturert datagrunnlag. Bruk bare fakta og tall som finnes der.
Skill tydelig mellom dokumenterte prestasjoner, rimelige tolkninger og det vi ikke vet.
Sammenlign rolle, volum, effektivitet, MEP, form, spilletid og størrelsen på utvalget.
Ta eksplisitt hensyn til sluttplassering, poeng, målforskjell og spillerens andel av lagets mål i kampene hun deltok i. Produksjon på et svakere lag kan være mer imponerende, men ikke lag en oppdiktet styrkejustert score og ikke anta årsakssammenheng.
Ikke påstå noe om trenerens planer, skader eller fremtidig rolle. Ikke gjør nye tallberegninger.
Gi en tydelig konklusjon, men marker usikkerheten når spillerne har ulikt antall kamper.`;
  const userPrompt = `Brukerens spørsmål:\n${question}\n\nSiste samtalekontekst:\n${JSON.stringify(recentConversation)}\n\nKontrollert sammenligningsgrunnlag:\n${JSON.stringify(facts)}\n\nSkriv en grundig, lesbar analyse på maksimalt 550 ord.`;

  return { facts, systemPrompt, userPrompt };
}

function numberTokens(value) {
  return String(value ?? "")
    .match(/\d+(?:[.,]\d+)?/g)
    ?.map((token) => token.replace(",", ".")) ?? [];
}

function findUnsupportedNumberTokens(answer, groundedValues) {
  const allowed = new Set(numberTokens(JSON.stringify(groundedValues)));
  return [
    ...new Set(numberTokens(answer).filter((token) => !allowed.has(token))),
  ];
}

module.exports = {
  buildComparisonFacts,
  buildComparisonFallbackAnswer,
  buildComparisonModelPrompts,
  chooseSharedLeague,
  findCurrentTeamPositionPeers,
  findUnsupportedNumberTokens,
  isTeammatePositionComparisonQuestion,
};
