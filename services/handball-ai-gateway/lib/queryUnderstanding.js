function normalizeText(value) {
  return String(value ?? "")
    .toLocaleLowerCase("nb-NO")
    .replace(/[æä]/g, "ae")
    .replace(/[øö]/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function levenshteinDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array(right.length + 1);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function tokenMatches(questionToken, nameToken) {
  if (questionToken === nameToken || questionToken === `${nameToken}s`) {
    return true;
  }

  return (
    questionToken.length >= 5 &&
    nameToken.length >= 5 &&
    levenshteinDistance(questionToken, nameToken) <= 1
  );
}

function findPlayerByTokens(question, players) {
  const questionTokens = tokenize(question);
  if (questionTokens.length === 0) return null;

  const ranked = [];
  for (const player of players) {
    const nameTokens = tokenize(player.name);
    if (nameTokens.length < 2) continue;

    const firstNameMatched = questionTokens.some((token) =>
      tokenMatches(token, nameTokens[0]),
    );
    const lastNameMatched = questionTokens.some((token) =>
      tokenMatches(token, nameTokens[nameTokens.length - 1]),
    );
    if (!firstNameMatched || !lastNameMatched) continue;

    const matchedNameTokens = nameTokens.filter((nameToken) =>
      questionTokens.some((questionToken) =>
        tokenMatches(questionToken, nameToken),
      ),
    );
    const exactMatches = matchedNameTokens.filter((nameToken) =>
      questionTokens.includes(nameToken),
    ).length;

    ranked.push({
      player,
      score:
        100 +
        matchedNameTokens.length * 10 +
        exactMatches * 2 -
        nameTokens.length,
    });
  }

  ranked.sort((left, right) => right.score - left.score);
  if (ranked.length === 0) return null;
  if (ranked.length > 1 && ranked[0].score === ranked[1].score) return null;
  return ranked[0].player;
}

function fuzzyMatchTeamName(input, teamNames) {
  const normalizedInput = normalizeText(input);
  if (!normalizedInput) return null;

  let best = null;
  for (const name of teamNames) {
    const normalizedName = normalizeText(name);
    if (normalizedName === normalizedInput) return name;
    if (
      normalizedName.includes(normalizedInput) ||
      normalizedInput.includes(normalizedName)
    ) {
      return name;
    }

    const distance = levenshteinDistance(normalizedInput, normalizedName);
    const similarity = 1 - distance / Math.max(normalizedInput.length, normalizedName.length);
    if (similarity >= 0.7 && (!best || distance < best.distance)) {
      best = { name, distance };
    }
  }

  return best?.name ?? null;
}

function extractClubFromQuestion(question) {
  const normalized = String(question).toLocaleLowerCase("nb-NO");
  const patterns = [
    /\bda\s+hun\s+spilte\s+(?:for|i)\s+([\p{L}\s-]+?)(?=\s+i\s+fjor|\s+forrige|\?|$)/iu,
    /\bspilte\s+(?:for|i)\s+([\p{L}\s-]+?)(?=\s+i\s+fjor|\s+forrige|\?|$)/iu,
    /\bfor\s+([\p{L}\s-]+?)(?=\s+i\s+fjor|\s+forrige|\?|$)/iu,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function resolveSeason(question, contextSeason) {
  const normalized = String(question).toLocaleLowerCase("nb-NO");
  const explicitSeason = normalized.match(/\b(20\d{2})\s*[-/]\s*(\d{2})\b/);
  if (explicitSeason) return `${explicitSeason[1]}-${explicitSeason[2]}`;

  if (
    contextSeason === "2026-27" &&
    /\bi fjor\b|\bforr?i?g(?:e|ie) sesong\b|\bsist(?:e)? sesong\b|\bfjorårets?\b/.test(
      normalized,
    )
  ) {
    return "2025-26";
  }

  return contextSeason || "2025-26";
}

module.exports = {
  extractClubFromQuestion,
  findPlayerByTokens,
  fuzzyMatchTeamName,
  levenshteinDistance,
  normalizeText,
  resolveSeason,
  tokenize,
};
