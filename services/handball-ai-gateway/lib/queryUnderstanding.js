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
    questionToken.length >= 4 &&
    nameToken.length >= 4 &&
    levenshteinDistance(questionToken, nameToken) <= 1
  );
}

function tokenSimilarity(left, right) {
  if (tokenMatches(left, right)) return 1;
  return 1 - levenshteinDistance(left, right) / Math.max(left.length, right.length);
}

function rankPlayerCandidates(question, players, limit = 12) {
  const baseQuestionTokens = tokenize(question).filter(
    (token) => token.length >= 3,
  );
  const questionTokens = [
    ...baseQuestionTokens,
    ...baseQuestionTokens.slice(0, -1).map(
      (token, index) => `${token}${baseQuestionTokens[index + 1]}`,
    ),
  ];
  if (questionTokens.length === 0) return [];

  return players
    .map((player) => {
      const nameTokens = tokenize(player.name);
      if (nameTokens.length < 2) return null;
      const bestSimilarity = (nameToken) =>
        Math.max(
          ...questionTokens.map((questionToken) =>
            tokenSimilarity(questionToken, nameToken),
          ),
        );
      const firstNameSimilarity = bestSimilarity(nameTokens[0]);
      const lastNameSimilarity = bestSimilarity(nameTokens.at(-1));
      if (firstNameSimilarity < 0.45 || lastNameSimilarity < 0.55) return null;
      return {
        player,
        score: Math.round(
          (firstNameSimilarity * 0.45 + lastNameSimilarity * 0.55) * 1000,
        ) / 1000,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function fuzzySurnameMatches(questionToken, nameToken) {
  if (tokenMatches(questionToken, nameToken)) return true;
  if (questionToken.length < 8 || nameToken.length < 8) return false;

  const distance = levenshteinDistance(questionToken, nameToken);
  const similarity =
    1 - distance / Math.max(questionToken.length, nameToken.length);
  return similarity >= 0.7;
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
      fuzzySurnameMatches(token, nameTokens[nameTokens.length - 1]),
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

function isPlayerFollowUpQuestion(question) {
  return /\b(hun|henne|hennes|spilleren|overgangen)\b|\b(mer|mere)\s+detaljert\b|\butdyp/i.test(
    String(question ?? ""),
  );
}

function isDetailedPlayerQuestion(question) {
  const normalized = normalizeText(question);
  return /\b(detaljert|utdyp\w*|oppsummer\w*|vurder\w*|overgang\w*|spilletid|skuddprosent|aker|sammenlign\w*)\b|\bsamme posisjon\b|\bhvordan (gikk|spilte|presterte|gjorde)\b/.test(
    normalized,
  );
}

function isPositionBenchmarkQuestion(question) {
  const normalized = normalizeText(question);
  return (
    /\b(sammenlign\w*|opp mot|i forhold til|snitt\w*|gjennomsnitt\w*)\b/.test(
      normalized,
    ) &&
    /\b(andre|samme liga|hennes posisjon|samme posisjon|posisjon\w*|snitt\w*|gjennomsnitt\w*)\b/.test(
      normalized,
    )
  );
}

function findPlayerFromConversation(conversation, players) {
  if (!Array.isArray(conversation)) return null;

  for (let index = conversation.length - 1; index >= 0; index -= 1) {
    const message = conversation[index];
    if (message?.role !== "user" || typeof message.content !== "string") {
      continue;
    }
    const player = findPlayerByTokens(message.content, players);
    if (player) return player;
  }

  return null;
}

function isComparisonReportFollowUp(question) {
  const normalized = normalizeText(question);
  return (
    /\b(pdf|rapport(?:en)?)\b/.test(normalized) &&
    /\b(send|sende|lag|lage|last|laste|naa|igjen|meg)\b/.test(normalized)
  );
}

function isRecruitmentQuestion(question) {
  const normalized = normalizeText(question);
  const asksForCandidate = /\b(anbef\w*|kandidat\w*|hvilk\w*)\b/.test(
    normalized,
  );
  const recruitmentIntent =
    /\b(kontakt\w*|rekrut\w*|rekryt\w*|signer\w*|hent\w*)\b/.test(
      normalized,
    );
  const mentionsPlayerRole = /\b(kant\w*|spiller\w*)\b/.test(normalized);
  return asksForCandidate && recruitmentIntent && mentionsPlayerRole;
}

function findPreviousComparisonQuestion(conversation) {
  if (!Array.isArray(conversation)) return null;
  for (let index = conversation.length - 1; index >= 0; index -= 1) {
    const message = conversation[index];
    if (message?.role !== "user" || typeof message.content !== "string") {
      continue;
    }
    const normalized = normalizeText(message.content);
    if (
      /\b(sammenlign(?:e|er|ing)?|rapport)\b/.test(normalized) &&
      /\b(andre|annen|samme posisjon|venstrekant|hoyrekant|lagkamerat)\b/.test(
        normalized,
      )
    ) {
      return message.content;
    }
  }
  return null;
}

function findTeamMention(question, teamNames) {
  const normalizedQuestion = normalizeText(question);
  const questionTokens = normalizedQuestion.split(/\s+/).filter(Boolean);
  const ranked = [];

  for (const teamName of [...new Set(teamNames.filter(Boolean))]) {
    const normalizedTeam = normalizeText(teamName);
    const shortTeam = normalizedTeam
      .replace(/\b(topphaandball|topphandball|haandball|handball|elite|damer|hk|th)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const aliases = [...new Set([normalizedTeam, shortTeam].filter(Boolean))];
    let score = 0;
    for (const alias of aliases) {
      if (normalizedQuestion.includes(alias)) {
        score = Math.max(score, 100 + alias.length);
        continue;
      }
      const aliasTokens = alias.split(/\s+/).filter((token) => token.length >= 4);
      const tokenMatches = aliasTokens.filter((teamToken) =>
        questionTokens.some(
          (questionToken) =>
            questionToken === teamToken ||
            (questionToken.length >= 5 &&
              levenshteinDistance(questionToken, teamToken) <= 1),
        ),
      ).length;
      if (tokenMatches > 0) {
        score = Math.max(score, 60 + tokenMatches * 10 + aliasTokens.length);
      }
    }
    if (score > 0) ranked.push({ teamName, score });
  }

  ranked.sort((left, right) => right.score - left.score);
  if (ranked.length === 0) return null;
  if (ranked.length > 1 && ranked[0].score === ranked[1].score) return null;
  return ranked[0].teamName;
}

function isGroupTeamContextFollowUp(question) {
  const normalized = normalizeText(question);
  const referencesGroup = /\b(hvem av de|hvem av dem|hvem av disse|av de|av dem|disse spillerne)\b/.test(
    normalized,
  );
  const asksForTeamContext = /\b(imponerende|lag(?:et|ets|ene|plassering)|tabellplassering)\b/.test(
    normalized,
  );
  return referencesGroup && asksForTeamContext;
}

function isBestFormQuestion(question) {
  const normalized = normalizeText(question);
  return (
    /\bform\b/.test(normalized) &&
    /\b(best(?:e)?|topp)\b/.test(normalized) &&
    /\b(siste|kamp(?:en|ene)?)\b/.test(normalized)
  );
}

function isPreviousSeasonFormFollowUp(question) {
  const normalized = normalizeText(question);
  return (
    /\b(forr?i?g(?:e|ie) sesong|i fjor|fjoraar(?:et|ssesongen)?)\b/.test(
      normalized,
    ) &&
    /^(hva med|og|men|samme for|vis)\b/.test(normalized)
  );
}

function extractRequestedMatchCount(question, fallback = 5) {
  const normalized = normalizeText(question);
  const digitMatch = normalized.match(/\b(\d+)\s+siste\b/);
  if (digitMatch) return Number(digitMatch[1]);

  const numberWords = {
    en: 1,
    ett: 1,
    to: 2,
    tre: 3,
    fire: 4,
    fem: 5,
    seks: 6,
    sju: 7,
    syv: 7,
    aatte: 8,
    ni: 9,
    ti: 10,
  };
  const wordMatch = normalized.match(
    /\bsiste\s+(en|ett|to|tre|fire|fem|seks|sju|syv|aatte|ni|ti)\b/,
  );
  return wordMatch ? numberWords[wordMatch[1]] : fallback;
}

function findPreviousBestFormQuestion(conversation) {
  if (!Array.isArray(conversation)) return null;

  for (let index = conversation.length - 1; index >= 0; index -= 1) {
    const message = conversation[index];
    if (message?.role !== "user" || typeof message.content !== "string") {
      continue;
    }
    if (isBestFormQuestion(message.content)) return message.content;
  }

  return null;
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
    /\bi fjor\b|\bforr?i?g(?:e|ie) sesong\b|\bsist(?:e)? sesong\b|\bfjorårets?\b|\bfjorårs(?:sesong(?:en)?|statistikk(?:en)?)?\b/.test(
      normalized,
    )
  ) {
    return "2025-26";
  }

  return contextSeason || "2025-26";
}

module.exports = {
  extractClubFromQuestion,
  extractRequestedMatchCount,
  findPreviousComparisonQuestion,
  findPreviousBestFormQuestion,
  findPlayerFromConversation,
  findPlayerByTokens,
  findTeamMention,
  fuzzyMatchTeamName,
  isBestFormQuestion,
  isGroupTeamContextFollowUp,
  isComparisonReportFollowUp,
  isDetailedPlayerQuestion,
  isRecruitmentQuestion,
  isPreviousSeasonFormFollowUp,
  levenshteinDistance,
  normalizeText,
  rankPlayerCandidates,
  isPlayerFollowUpQuestion,
  isPositionBenchmarkQuestion,
  resolveSeason,
  tokenize,
};
