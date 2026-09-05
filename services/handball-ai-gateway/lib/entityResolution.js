function buildPlayerResolutionPrompts({ question, conversation, candidates }) {
  const candidateFacts = candidates.map(({ player, score }) => ({
    id: String(player.id ?? player.playerId),
    name: player.name,
    currentTeamName: player.currentTeamName ?? player.teamName ?? null,
    historicalTeams: player.seasonTeamNames ?? [],
    position: player.position ?? null,
    textSimilarity: score,
  }));
  const systemPrompt = `Du er entitetsoppslaget i Handball Tracker. Velg spilleren brukeren sikter til blant kandidatene.
Tolerer skrivefeil, manglende mellomnavn og bøyninger. Bruk samtalehistorikken hvis spørsmålet er en oppfølging.
Svar kun med gyldig JSON i formatet {"playerId":"ID"} eller {"playerId":null}. Ikke skriv forklaring og ikke velg en ID som ikke finnes i kandidatlisten.`;
  const userPrompt = `Spørsmål:\n${question}\n\nSiste samtale:\n${JSON.stringify((conversation ?? []).slice(-4))}\n\nKandidater:\n${JSON.stringify(candidateFacts)}`;
  return { candidateFacts, systemPrompt, userPrompt };
}

function parsePlayerResolution(value, candidates) {
  const text = String(value ?? "").trim();
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) return null;
  try {
    const parsed = JSON.parse(jsonText);
    const playerId = parsed.playerId == null ? null : String(parsed.playerId);
    if (!playerId) return null;
    return candidates.find(
      ({ player }) =>
        String(player.id ?? player.playerId) === playerId,
    )?.player ?? null;
  } catch {
    return null;
  }
}

module.exports = {
  buildPlayerResolutionPrompts,
  parsePlayerResolution,
};
