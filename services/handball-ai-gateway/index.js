const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { HttpAgent, Actor } = require('@dfinity/agent');
const { IDL } = require('@dfinity/candid');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
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
  isDetailedPlayerQuestion,
  isEndSeasonPotentialQuestion,
  isGroupTeamContextFollowUp,
  isPreviousSeasonFormFollowUp,
  isRecruitmentQuestion,
  normalizeText,
  rankPlayerCandidates,
  isPlayerFollowUpQuestion,
  isPositionBenchmarkQuestion,
  resolveSeason,
} = require('./lib/queryUnderstanding');
const {
  STAT_DATASETS,
  analyzeBestAgainstTeam,
  analyzeBestPlayerForTeam,
  analyzeBestForm,
  analyzeLatestTeamMatch,
  analyzeRecruitmentCandidates,
  analyzeEndSeasonMepTrend,
  buildStatsDataset,
  compareFormWithStandings,
  findBestMatchForPlayer,
  findSeasonSegment,
  summarizePlayerPerformance,
} = require('./lib/statsDataset');
const { buildComparisonReport } = require('./lib/comparisonReport');
const { createComparisonPdf } = require('./lib/comparisonPdf');
const {
  buildComparisonFallbackAnswer,
  buildComparisonModelPrompts,
  chooseSharedLeague,
  findCurrentTeamPositionPeers,
  findUnsupportedNumberTokens,
  isTeammatePositionComparisonQuestion,
} = require('./lib/hybridAnalysis');
const {
  buildRecruitmentFallbackAnswer,
  buildRecruitmentModelPrompts,
} = require('./lib/recruitmentAnalysis');
const {
  buildPositionBenchmarkFacts,
  buildPositionBenchmarkFallbackAnswer,
  buildPositionBenchmarkModelPrompts,
} = require('./lib/positionBenchmarkAnalysis');
const {
  buildPlayerResolutionPrompts,
  parsePlayerResolution,
} = require('./lib/entityResolution');
const {
  buildMepTrendFallbackAnswer,
  buildMepTrendModelPrompts,
} = require('./lib/trendAnalysis');
const {
  assessHandballRequest,
  runHandballAgent,
} = require('./lib/handballAgent');
const {
  isOpenClawAgentConfigured,
  probeOpenClawAgent,
  publicOpenClawConfig,
  runOpenClawHandballAgent,
} = require('./lib/openClawAgent');

// ─── Candid Opt / BigInt helpers ───────────────────────────────────────────

function unwrapCandidOpt(value) {
  if (!Array.isArray(value)) return value ?? null;
  return value.length > 0 ? value[0] : null;
}

function unwrapOptField(value) {
  if (Array.isArray(value) && value.length === 0) return null;
  const v = Array.isArray(value) ? value[0] : value;
  if (v === null || v === undefined) return null;
  if (typeof v === 'bigint') {
    return v <= Number.MAX_SAFE_INTEGER ? Number(v) : String(v);
  }
  return v;
}

function fmtEvidence(value) {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'bigint') return String(value);
  return String(value);
}

// ─── JSON Stats Data Loader ────────────────────────────────────────────────

const ICP_ASSET_BASE = process.env.ICP_ASSET_BASE_URL ||
  'https://hrzvs-liaaa-aaaap-qusna-cai.icp0.io/data';
const LOCAL_STATS_DIR = '/tmp/handball-icp-deploy-cache/src/frontend/public/data/player-stats';
const LOCAL_SEARCH_INDEX = '/tmp/handball-icp-deploy-cache/src/frontend/public/data/search-player-index.json';
const ARCHIVE_STANDINGS_PATHS = [
  process.env.ARCHIVE_STANDINGS_FILE,
  path.resolve(__dirname, 'data/leagueStandingsArchive.json'),
  path.resolve(__dirname, '../../src/frontend/src/data/leagueStandingsArchive.json'),
  '/tmp/handball-icp-deploy-cache/src/frontend/src/data/leagueStandingsArchive.json',
].filter(Boolean);
const FIRST_DIVISION_STANDINGS_PATHS = [
  process.env.FIRST_DIVISION_ARCHIVE_STANDINGS_FILE,
  path.resolve(__dirname, 'data/firstDivisionStandingsArchive2526.json'),
  '/tmp/handball-icp-deploy-cache/services/handball-ai-gateway/data/firstDivisionStandingsArchive2526.json',
].filter(Boolean);

function loadArchiveStandings(paths) {
  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) {
        const standings = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (Array.isArray(standings) && standings.length > 0) return standings;
      }
    } catch (error) {
      console.error(`[standings] Failed to load ${filePath}:`, error.message);
    }
  }
  return [];
}

const archiveStandings = loadArchiveStandings(ARCHIVE_STANDINGS_PATHS);
const firstDivisionArchiveStandings = loadArchiveStandings(
  FIRST_DIVISION_STANDINGS_PATHS,
);

let jsonStatsCache = {
  playersById: null,
  allMatches: null,
  source: null,
  timestamp: 0
};
let jsonStatsLoadPromise = null;
const JSON_CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchJson(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    return null;
  }
}

async function loadJsonStatsFromICP() {
  const searchIndex = await fetchJson(`${ICP_ASSET_BASE}/search-player-index.json`);
  if (!Array.isArray(searchIndex)) return null;

  const loadedFiles = await Promise.all(
    STAT_DATASETS.map(async (dataset) => ({
      ...dataset,
      data: await fetchJson(`${ICP_ASSET_BASE}/player-stats/${dataset.file}`),
    })),
  );
  const dataset = buildStatsDataset(searchIndex, loadedFiles);
  return { ...dataset, source: 'icp-asset-canister' };
}

async function loadJsonStatsFromLocal() {
  try {
    if (!fs.existsSync(LOCAL_SEARCH_INDEX)) return null;
    const searchIndex = JSON.parse(fs.readFileSync(LOCAL_SEARCH_INDEX, 'utf8'));
    const loadedFiles = STAT_DATASETS.map((dataset) => {
      const filePath = path.join(LOCAL_STATS_DIR, dataset.file);
      return {
        ...dataset,
        data: fs.existsSync(filePath)
          ? JSON.parse(fs.readFileSync(filePath, 'utf8'))
          : null,
      };
    });
    const dataset = buildStatsDataset(searchIndex, loadedFiles);
    return { ...dataset, source: 'local-deploy-cache' };
  } catch (err) {
    console.error('Local fallback failed:', err.message);
    return null;
  }
}

async function loadJsonStats() {
  const now = Date.now();
  if (now - jsonStatsCache.timestamp < JSON_CACHE_TTL_MS && jsonStatsCache.playersById) {
    return jsonStatsCache;
  }
  if (jsonStatsLoadPromise) return jsonStatsLoadPromise;

  jsonStatsLoadPromise = (async () => {
    let result = await loadJsonStatsFromICP();
    if (!result || Object.keys(result.playersById).length === 0) {
      console.log('[stats] ICP asset canister unavailable, using local fallback');
      result = await loadJsonStatsFromLocal();
    } else {
      console.log('[stats] Loaded from ICP asset canister');
    }

    jsonStatsCache = result
      ? { ...result, timestamp: Date.now() }
      : { playersById: {}, allMatches: [], source: 'none', timestamp: Date.now() };
    return jsonStatsCache;
  })();

  try {
    return await jsonStatsLoadPromise;
  } finally {
    jsonStatsLoadPromise = null;
  }
}

// ─── Deterministic answer builders ─────────────────────────────────────────

function buildBestAgainstAnswer(analysis) {
  const top = analysis.topPlayer;
  const runnersUp = analysis.rankings.slice(1, 3);
  let answer = `${top.playerName} (${top.playerTeam}) hadde høyest samlet MEP mot ${analysis.opponentTeam}. `;
  answer += `Hun spilte ${top.matches} kamp${top.matches > 1 ? 'er' : ''} med samlet MEP ${top.totalMep.toFixed(1)} `;
  answer += `(snitt MEP ${top.avgMep} per kamp), ${top.totalGoals} mål og ${top.totalAssists} assist.\n\n`;

  if (runnersUp.length > 0) {
    answer += 'Andre plasseringer:\n';
    runnersUp.forEach((p, i) => {
      answer += `${i + 2}. ${p.playerName} (${p.playerTeam}): MEP ${p.totalMep.toFixed(1)} i ${p.matches} kamp${p.matches > 1 ? 'er' : ''}, ${p.totalGoals} mål\n`;
    });
  }

  answer += `\nRangeringen er basert på samlet MEP. MEP-snitt per kamp er vist som forklaring.`;
  return answer;
}

function buildPlayerStatsAnswer(player, stat, teams, requestedSeason) {
  const statSeason = stat.season || 'ukjent';
  const teamName = teams.find(t => t.id === player.teamId)?.name || 'Ukjent';
  const positionStr = JSON.stringify(player.position)
    .replace(/[{}"]/g, '')
    .replace(/:null/g, '')
    .replace(/VenstreKant/g, 'venstre kant')
    .replace(/HoyreKant/g, 'høyre kant')
    .replace(/Bakspiller/g, 'bakspiller')
    .replace(/Keeper/g, 'keeper')
    .replace(/Linje/g, 'linje');
  let answer = `${player.name} spiller for ${teamName} på posisjon ${positionStr}.\n\n`;

  if (requestedSeason && requestedSeason !== statSeason) {
    answer += `Tilgjengelig statistikk gjelder sesong ${statSeason}, ikke ${requestedSeason}. `;
    answer += `${requestedSeason} har ikke startet eller har ikke tilgjengelig statistikk ennå.\n\n`;
  }

  answer += `Sesongstatistikk ${statSeason}:\n`;
  answer += `- Kamper: ${unwrapOptField(stat.matchesPlayed) || 'N/A'}\n`;
  answer += `- Mål: ${unwrapOptField(stat.totalGoals) || 0}\n`;
  answer += `- Assist: ${unwrapOptField(stat.totalAssists) || 0}\n`;
  answer += `- Skudd: ${unwrapOptField(stat.totalShots) || 0}\n`;
  if (stat.shootingPercent) {
    answer += `- Målprosent: ${Math.round(unwrapOptField(stat.shootingPercent) * 100) / 100}%\n`;
  }
  if (stat.mepTotal) {
    answer += `- MEP: ${fmtEvidence(unwrapOptField(stat.mepTotal))}\n`;
  }
  if (stat.goalsPerGame) {
    answer += `- Mål per kamp: ${Math.round(unwrapOptField(stat.goalsPerGame) * 100) / 100}\n`;
  }
  return answer;
}

function buildBestFormAnswer(analysis) {
  const top = analysis.topPlayer;
  const runnersUp = analysis.rankings.slice(1, 5);
  let answer = `${top.playerName} (${top.playerTeam}) var i best form over de ${analysis.matchCount} siste kampene i ${analysis.season}. `;
  answer += `Hun hadde snitt MEP ${top.avgMep}, samlet MEP ${top.totalMep}, ${top.totalGoals} mål og ${top.totalAssists} assist.\n\n`;

  if (runnersUp.length > 0) {
    answer += 'Topp 5 basert på snitt MEP:\n';
    answer += `1. ${top.playerName} (${top.playerTeam}): ${top.avgMep}\n`;
    runnersUp.forEach((player, index) => {
      answer += `${index + 2}. ${player.playerName} (${player.playerTeam}): ${player.avgMep}\n`;
    });
  }

  answer += `\nBare spillere med minst ${analysis.matchCount} registrerte kamper i perioden er med. Form er målt som gjennomsnittlig MEP.`;
  return answer;
}

function singularPositionLabel(position) {
  return {
    VenstreKant: 'venstre kant',
    HoyreKant: 'høyre kant',
    Bakspiller: 'bakspiller',
    Linje: 'linjespiller',
    Keeper: 'keeper',
  }[position] ?? 'ukjent posisjon';
}

function buildLatestTeamMatchAnswer(analysis) {
  const venue = analysis.homeAway === 'home' ? 'hjemme' : 'borte';
  const topPosition = analysis.topPosition;
  const topPlayer = analysis.topPlayer;
  let answer = `${analysis.teamName} sin siste registrerte kamp var ${venue} mot ${analysis.opponent} ${analysis.date} i ${analysis.season}. `;
  if (analysis.usedFallbackSeason) {
    answer += `Det finnes ikke nyere kampdata i valgt sesong, så jeg bruker siste tilgjengelige kamp. `;
  }
  answer += `Laget scoret ${analysis.teamGoals} registrerte mål.\n\n`;
  answer += `${singularPositionLabel(topPosition.position)} var posisjonen som scoret mest, med ${topPosition.goals} mål. `;
  const positionScorers = topPosition.players
    .map((player) => `${player.playerName} (${player.goals})`)
    .join(', ');
  if (positionScorers) answer += `Målscorere fra posisjonen: ${positionScorers}.\n\n`;
  answer += `${topPlayer.playerName} scoret flest for ${analysis.teamName}, med ${topPlayer.goals} mål`;
  answer += `, ${topPlayer.assists} assist og MEP ${topPlayer.mep}.`;
  return answer;
}

function buildBestTeamPlayerAnswer(analysis) {
  const top = analysis.topPlayer;
  const runnersUp = analysis.rankings.slice(1, 3);
  let answer = `${top.playerName} var den høyest rangerte spilleren for ${analysis.teamName} i ${analysis.season}, basert på samlet MEP blant spillere med minst ${analysis.minimumGames} kamper. `;
  if (analysis.usedFallbackSeason) {
    answer += `Det finnes ikke kampdata for den valgte sesongen, så jeg bruker siste tilgjengelige sesong. `;
  }
  answer += `Hun hadde MEP ${top.totalMep} totalt (${top.mepPerGame} per kamp), ${top.goals} mål og ${top.assists} assist på ${top.games} kamper.\n\n`;
  if (runnersUp.length > 0) {
    answer += 'Nærmeste utfordrere:\n';
    runnersUp.forEach((player, index) => {
      answer += `${index + 2}. ${player.playerName}: MEP ${player.totalMep}, ${player.goals} mål på ${player.games} kamper\n`;
    });
  }
  answer += `\n«Beste» er her definert som høyest samlet MEP. Det må leses sammen med rolle, spilletid og antall kamper.`;
  return answer;
}

function buildTeamContextFormAnswer(comparison) {
  const winner = comparison.mostImpressive;
  const candidates = comparison.candidates;
  if (!winner) {
    return `Jeg kan ikke peke ut én spiller uten å velge en mer subjektiv vekting mellom form og lagplassering. Rå form og sluttabell peker på ulike kandidater.`;
  }

  let answer = `${winner.playerName} (${winner.playerTeam}) er den mest imponerende når lagplasseringen tas med. `;
  answer += `Hun hadde høyest snitt-MEP i gruppen med ${winner.avgMep}, samtidig som ${winner.playerTeam} endte på ${winner.standing.rank}. plass med ${winner.standing.points} poeng.\n\n`;
  answer += `Sammenligningsgrunnlag:\n`;
  candidates.forEach((player, index) => {
    answer += `${index + 1}. ${player.playerName}: snitt-MEP ${player.avgMep}, ${player.playerTeam} på ${player.standing.rank}. plass\n`;
  });
  answer += `\nDette er en kvalitativ vurdering: Sarah topper den målte formen selv om laget hennes var klart lavest plassert av de fem. `;
  answer += `Det viser ikke alene hvor mye hun påvirket lagets resultater, men gjør prestasjonen mer bemerkelsesverdig i denne sammenligningen.`;
  return answer;
}

function buildJsonPlayerStatsAnswer(player, requestedSeason) {
  const stats = player.seasonStats;
  const statsSeason = player.season;
  const segments = player.seasonSegments ?? [];
  const clubNames = segments.map((segment) => segment.teamName);
  let answer = `${player.name} representerte ${clubNames.join(' og ') || player.seasonTeamName} i ${statsSeason}.\n\n`;

  if (requestedSeason !== statsSeason) {
    answer += `Det finnes ennå ingen kampstatistikk for ${requestedSeason}. `;
    answer += `Siste tilgjengelige sesong er ${statsSeason}:\n`;
  } else {
    answer += `Sesongstatistikk ${statsSeason}:\n`;
  }

  for (const segment of segments) {
    const segmentStats = segment.seasonStats ?? {};
    answer += `- ${segment.teamName}: ${segmentStats.matches ?? 0} kamper, ${segmentStats.goals ?? 0} mål, ${segmentStats.assists ?? 0} assist, MEP ${segmentStats.mepTotal ?? 0}\n`;
  }
  if (segments.length > 1) {
    answer += `\nTotalt for sesongen:\n`;
  }
  answer += `- Kamper: ${stats.matches ?? 0}\n`;
  answer += `- Mål: ${stats.goals ?? 0}\n`;
  answer += `- Assist: ${stats.assists ?? 0}\n`;
  answer += `- Skudd: ${stats.shots ?? 0}\n`;
  answer += `- Målprosent: ${stats.shotPercentage ?? 0}%\n`;
  answer += `- Samlet MEP: ${stats.mepTotal ?? 0}\n`;
  return answer;
}

function positionLabel(position) {
  const labels = {
    VenstreKant: 'venstrekanter',
    HoyreKant: 'høyrekanter',
    Bakspiller: 'bakspillere',
    Linje: 'linjespillere',
    Keeper: 'keepere',
  };
  return labels[position] ?? 'spillere i samme posisjon';
}

function segmentLeagueLabel(segment) {
  return segment.league === 'first-division' ? '1. divisjon' : 'Eliteserien';
}

function buildDetailedPlayerSummary(player, performance, requestedSeason, isTransferQuestion, segmentPerformances = []) {
  const stats = performance.seasonStats;
  let answer = `${player.name} spilte for ${segmentPerformances.map(({ segment }) => segment.teamName).join(' og ') || player.seasonTeamName} i ${player.season}. `;
  const loan = segmentPerformances.find(({ segment }) => segment.spellType === 'loan');
  if (loan) answer += `${loan.segment.teamName}-perioden var et utlån. `;
  answer += `Totalt er hun registrert med ${stats.matches ?? performance.matches} kamper og ${performance.totalPlayTime} spilletid.\n`;

  for (const { segment, performance: segmentPerformance } of segmentPerformances) {
    const segmentStats = segmentPerformance.seasonStats;
    const peer = segmentPerformance.peerComparison;
    const best = segmentPerformance.bestMatch;
    answer += `\n${segment.teamName}, ${segmentLeagueLabel(segment)}:\n`;
    answer += `- ${segmentStats.matches ?? segmentPerformance.matches} kamper, ${segmentPerformance.totalPlayTime} totalt og ${segmentPerformance.averagePlayTime} i snitt\n`;
    answer += `- ${segmentStats.goals ?? 0} mål på ${segmentStats.shots ?? 0} skudd (${segmentStats.shotPercentage ?? 0}%), ${segmentStats.assists ?? 0} assist\n`;
    const suspensionLabel = segmentPerformance.suspensions === 1
      ? 'utvisning'
      : 'utvisninger';
    answer += `- ${segmentPerformance.technicalErrors} tekniske feil, ${segmentPerformance.suspensions} ${suspensionLabel} og samlet MEP ${segmentStats.mepTotal ?? 0}\n`;
    if (best) {
      answer += `- Beste kamp: ${best.homeAway === 'home' ? 'hjemme' : 'borte'} mot ${best.opponent} ${best.date}, MEP ${best.mep}, ${best.goals} mål på ${best.shots} skudd\n`;
    }
    if (peer.mepTotal && peer.shotPercentage && peer.goalsPerMatch) {
      answer += `- Blant ${positionLabel(peer.position)} med minst ${peer.minimumMatches} kamper i samme divisjon: MEP-plass ${peer.mepTotal.rank}/${peer.mepTotal.total}, mål per kamp ${peer.goalsPerMatch.rank}/${peer.goalsPerMatch.total}, skuddprosent ${peer.shotPercentage.rank}/${peer.shotPercentage.total}\n`;
    }
  }

  if (segmentPerformances.length > 1) {
    answer += `\nSamlet 2025/26: ${stats.goals ?? 0} mål på ${stats.shots ?? 0} skudd (${stats.shotPercentage ?? 0}%), ${stats.assists ?? 0} assist og MEP ${stats.mepTotal ?? 0}.\n`;
  }

  if (requestedSeason !== player.season) {
    answer += `\nDet finnes ennå ingen kampstatistikk for ${requestedSeason}.`;
  }

  if (isTransferQuestion && player.currentTeamName) {
    answer += `\nVurdering av overgangen til ${player.currentTeamName}:\n`;
    const elite = segmentPerformances.find(({ segment }) => segment.league === 'elite');
    const firstDivision = segmentPerformances.find(({ segment }) => segment.league === 'first-division');
    if (elite && firstDivision) {
      const eliteStats = elite.performance.seasonStats;
      const firstStats = firstDivision.performance.seasonStats;
      answer += `Utlånet gir et bedre sammenligningsgrunnlag enn Fjellhammer-tallene alene. I eliteserien hadde hun ${eliteStats.goals ?? 0} mål og MEP ${eliteStats.mepTotal ?? 0} på ${eliteStats.matches ?? 0} kamper; for Kjelsås i 1. divisjon hadde hun ${firstStats.goals ?? 0} mål, ${firstStats.shotPercentage ?? 0}% uttelling og MEP ${firstStats.mepTotal ?? 0} på ${firstStats.matches ?? 0} kamper. `;
      answer += `Det tyder på at hun fikk en større og mer produktiv rolle på nivået Aker spiller på. Derfor framstår overgangen som sportslig fornuftig dersom målet er mer ansvar og jevn spilletid. `;
    } else {
      answer += `En overgang til 1. divisjon kan gi mer spilletid og større ansvar. `;
    }
    answer += `Dette er fortsatt en forsiktig vurdering basert på et begrenset antall kamper. Vi mangler rolleplanen i Aker og kampdata fra 2026-27, så utfallet kan ikke fastslås ennå.`;
  }

  return answer;
}

function buildBestMatchAnswer(playerName, bestMatch, seasonStats, statsSeason, currentTeamName, previousTeamName, isTransferQuestion) {
  let answer = '';

  // Part 1: Best match
  answer += `${playerName}s beste kamp for ${previousTeamName} var ${bestMatch.date} mot ${bestMatch.opponent} (${bestMatch.homeAway === 'home' ? 'hjemme' : 'borte'}).\n\n`;
  answer += `Kampstatistikk:\n`;
  answer += `- MEP: ${bestMatch.mep}\n`;
  answer += `- Mål: ${bestMatch.goals}\n`;
  answer += `- Assist: ${bestMatch.assists}\n`;
  answer += `- Skudd: ${bestMatch.shots}${bestMatch.shotPercentage ? ' (' + bestMatch.shotPercentage + '%)' : ''}\n`;
  answer += `- Spilletid: ${bestMatch.playTime}\n`;
  if (bestMatch.technicalErrors !== undefined) {
    answer += `- Tekniske feil: ${bestMatch.technicalErrors}\n`;
  }
  if (bestMatch.suspensions !== undefined) {
    answer += `- Utvisninger: ${bestMatch.suspensions}\n`;
  }

  // Part 2: Season stats
  if (seasonStats) {
    const ss = typeof seasonStats === 'object' && !Array.isArray(seasonStats) ? seasonStats : {};
    answer += `\nSesongstatistikk for ${previousTeamName} (${statsSeason}):\n`;
    answer += `- Kamper: ${ss.matches || 'N/A'}\n`;
    answer += `- Mål: ${ss.goals || 0}\n`;
    answer += `- Skudd: ${ss.shots || 0}${ss.shotPercentage ? ' (' + ss.shotPercentage + '%)' : ''}\n`;
    answer += `- Assist: ${ss.assists || 0}\n`;
    answer += `- Tekniske feil: ${ss.technicalErrors || 0}\n`;
    answer += `- Utvisninger: ${ss.suspensions || 0}\n`;
    answer += `- Samlet MEP: ${ss.mepTotal !== undefined ? ss.mepTotal : (ss.mepAvg !== undefined ? ss.mepAvg : 'N/A')}\n`;
  }

  // Part 3: Transfer evaluation (only if asked)
  if (isTransferQuestion && currentTeamName) {
    answer += `\nOvergang til ${currentTeamName}:\n`;
    answer += `${currentTeamName} spiller i 1. divisjon i sesongen 2026-27. `;
    answer += `Det finnes ennå ingen kampstatistikk for ${playerName} i ${currentTeamName} `;
    answer += `fordi sesongen ikke har startet. Det er derfor for tidlig å vurdere `;
    answer += `om overgangen var vellykket basert på resultater.\n\n`;
    answer += `Som en generell vurdering (ikke et faktum): `;
    answer += `En overgang til et lag i 1. divisjon kan være fornuftig `;
    answer += `dersom den gir mer spilletid eller en større rolle på laget, `;
    answer += `men dette avhenger av sportslige planer som ikke er tilgjengelige i dataene.`;
  }

  return answer;
}

// ─── Circuit breaker for Moonshot ──────────────────────────────────────────

let moonshotCircuit = {
  last429: 0,
  isOpen: false,
  cooldownMs: 60 * 1000
};

function isMoonshotCircuitOpen() {
  if (!moonshotCircuit.isOpen) return false;
  if (Date.now() - moonshotCircuit.last429 > moonshotCircuit.cooldownMs) {
    moonshotCircuit.isOpen = false;
    return false;
  }
  return true;
}

function tripMoonshotCircuit() {
  moonshotCircuit.last429 = Date.now();
  moonshotCircuit.isOpen = true;
}

async function callAiModel(systemPrompt, userPrompt) {
  if (isMoonshotCircuitOpen()) {
    throw new Error('Moonshot circuit breaker open');
  }

  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error('MOONSHOT_API_KEY not configured');
  }

  const response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.MOONSHOT_MODEL || 'kimi-k3',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 2000
    })
  });

  if (response.status === 429) {
    tripMoonshotCircuit();
    throw new Error(`AI API error: 429`);
  }
  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ─── Express Setup ─────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);

const DEFAULT_ALLOWED_ORIGINS = [
  'https://hrzvs-liaaa-aaaap-qusna-cai.icp0.io',
  'https://hrzvs-liaaa-aaaap-qusna-cai.raw.icp0.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173'
];
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
  : DEFAULT_ALLOWED_ORIGINS;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.sendStatus(204);
  }
  next();
});

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

app.use(express.json({ limit: '32kb' }));

// ICP Backend setup
const BACKEND_CANISTER_ID = process.env.ICP_BACKEND_CANISTER_ID ||
  'lj6bx-dyaaa-aaaap-qumhq-cai';
const ICP_HOST = process.env.ICP_HOST || 'https://icp-api.io';

const idlFactory = ({ IDL }) => {
  const Position = IDL.Variant({
    'Bakspiller': IDL.Null, 'HoyreKant': IDL.Null,
    'Keeper': IDL.Null, 'Linje': IDL.Null, 'VenstreKant': IDL.Null
  });
  const Player = IDL.Record({
    'id': IDL.Nat, 'imageUrl': IDL.Opt(IDL.Text), 'isActive': IDL.Bool,
    'jerseyNumber': IDL.Opt(IDL.Nat), 'name': IDL.Text,
    'nationality': IDL.Opt(IDL.Text), 'position': Position,
    'slug': IDL.Text, 'teamId': IDL.Nat
  });
  const Team = IDL.Record({
    'goalDifference': IDL.Opt(IDL.Int), 'id': IDL.Nat,
    'logoUrl': IDL.Opt(IDL.Text), 'matchesPlayed': IDL.Opt(IDL.Nat),
    'name': IDL.Text, 'points': IDL.Opt(IDL.Nat),
    'slug': IDL.Text, 'standingsRank': IDL.Opt(IDL.Nat)
  });
  const PlayerSeasonStats = IDL.Record({
    'assistsPerGame': IDL.Opt(IDL.Float64), 'awarded7m': IDL.Opt(IDL.Nat),
    'fieldGoalPercent': IDL.Opt(IDL.Float64), 'fieldGoals': IDL.Opt(IDL.Nat),
    'fieldShots': IDL.Opt(IDL.Nat), 'goals7m': IDL.Opt(IDL.Nat),
    'goalsPerGame': IDL.Opt(IDL.Float64), 'id': IDL.Nat,
    'matchesPlayed': IDL.Nat, 'mepAvg': IDL.Opt(IDL.Float64),
    'mepTotal': IDL.Opt(IDL.Float64), 'percent7m': IDL.Opt(IDL.Float64),
    'playerId': IDL.Nat, 'provoked7m': IDL.Opt(IDL.Nat),
    'season': IDL.Text, 'shootingPercent': IDL.Opt(IDL.Float64),
    'shots7m': IDL.Opt(IDL.Nat), 'technicalFaults': IDL.Opt(IDL.Nat),
    'totalAssists': IDL.Opt(IDL.Nat), 'totalGoals': IDL.Opt(IDL.Nat),
    'totalMinutes': IDL.Opt(IDL.Nat), 'totalRedCards': IDL.Opt(IDL.Nat),
    'totalSaves': IDL.Opt(IDL.Nat), 'totalShots': IDL.Opt(IDL.Nat),
    'totalTwoMin': IDL.Opt(IDL.Nat), 'totalYellowCards': IDL.Opt(IDL.Nat)
  });

  return IDL.Service({
    'getPlayers': IDL.Func([], [IDL.Vec(Player)], ['query']),
    'getTeams': IDL.Func([], [IDL.Vec(Team)], ['query']),
    'getPlayerSeasonStats': IDL.Func([IDL.Nat], [IDL.Opt(PlayerSeasonStats)], ['query']),
    'getAllPlayerSeasonStats': IDL.Func([], [IDL.Vec(PlayerSeasonStats)], ['query']),
  });
};

const agent = new HttpAgent({ host: ICP_HOST, fetch });
const backend = Actor.createActor(idlFactory, { agent, canisterId: BACKEND_CANISTER_ID });

let cache = { players: null, teams: null, seasonStats: null, timestamp: 0 };
const CACHE_TTL_MS = 60 * 1000;

async function refreshCache() {
  const now = Date.now();
  if (now - cache.timestamp < CACHE_TTL_MS && cache.players) return;
  try {
    const [players, teams, seasonStats] = await Promise.all([
      backend.getPlayers(), backend.getTeams(), backend.getAllPlayerSeasonStats()
    ]);
    cache = { players, teams, seasonStats, timestamp: now };
  } catch (err) {
    console.error('Cache refresh failed:', err.message);
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiAgent: publicOpenClawConfig(),
  });
});

app.get('/health/ai', async (req, res) => {
  const result = await probeOpenClawAgent();
  res.status(result.status === 'degraded' ? 503 : 200).json(result);
});

async function prepareComparisonReport(req) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const season = body.season === '2026-27' ? '2026-27' : '2025-26';
  const league = body.league === 'first-division'
    ? 'first-division'
    : 'elite';
  const { playersById, source } = await loadJsonStats();
  const report = buildComparisonReport({
    playerIds: body.playerIds,
    playersById,
    season,
    league,
    standings:
      league === 'first-division'
        ? firstDivisionArchiveStandings
        : archiveStandings,
  });
  return { report, source };
}

app.post('/v1/handball/comparisons', async (req, res) => {
  try {
    const { report, source } = await prepareComparisonReport(req);
    res.json({ ...report, dataSource: source });
  } catch (error) {
    res.status(400).json({
      error: 'comparison-report-unavailable',
      message: error.message,
    });
  }
});

app.post('/v1/handball/reports/player-comparison.pdf', async (req, res) => {
  try {
    const { report } = await prepareComparisonReport(req);
    const pdf = await createComparisonPdf(report);
    const filename = `handball-tracker-${report.season}-spillersammenligning.pdf`;
    res
      .status(200)
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.length),
        'Cache-Control': 'no-store',
      })
      .send(pdf);
  } catch (error) {
    res.status(400).json({
      error: 'comparison-report-unavailable',
      message: error.message,
    });
  }
});

// Main chat endpoint
app.post('/v1/handball/chat', async (req, res) => {
  const startTime = Date.now();
  const requestId = 'analysis-' + Date.now();
  let analysisMode = 'unknown';
  let modelCalled = false;
  let dataSource = 'none';
  let openClawAttempted = false;

  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        id: requestId, answer: 'Invalid request format', status: 'insufficient-data',
        evidence: [], sources: [], missingData: ['request body'], followUpQuestions: []
      });
    }

    const { question, context, conversation } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        id: requestId, answer: 'Missing or invalid question', status: 'insufficient-data',
        evidence: [], sources: [], missingData: ['question'], followUpQuestions: []
      });
    }
    if (question.length > 500) {
      return res.status(400).json({
        id: requestId, answer: 'Question too long (max 500 characters)', status: 'insufficient-data',
        evidence: [], sources: [], missingData: [], followUpQuestions: []
      });
    }
    const safety = assessHandballRequest(question);
    if (!safety.allowed) {
      return res.json({
        id: requestId,
        answer: safety.answer,
        status: 'answered',
        generatedByAi: false,
        evidence: [],
        sources: [],
        missingData: [],
        followUpQuestions: [],
      });
    }

    const requestedSeason = resolveSeason(question, context && context.season ? context.season : null);
    const requestedLeague = context?.league === 'first-division'
      ? 'first-division'
      : 'elite';
    const normalizedQuestion = question.toLowerCase();

    // Load JSON stats
    const { playersById, allMatches, source: statsSource } = await loadJsonStats();
    dataSource = statsSource || 'none';

    // Refresh ICP cache
    await refreshCache();
    if (!cache.players || !cache.teams) {
      return res.status(503).json({
        id: requestId, answer: 'Data source temporarily unavailable', status: 'insufficient-data',
        evidence: [], sources: [], missingData: ['player data', 'team data'], followUpQuestions: ['Prøv igjen om et øyeblikk']
      });
    }

    const { players, teams, seasonStats } = cache;
    let evidence = [];
    let sources = [];
    let deterministicAnswer = null;
    let hybridAnswer = null;
    let hybridGeneratedByAi = false;
    let reportAttachment = null;

    // ─── Extract potential club from question ───────────────────────────
    const extractedClub = extractClubFromQuestion(question);
    const normalizedSearchQuestion = normalizeText(question);
    const directBestFormQuestion = isBestFormQuestion(question);
    const previousBestFormRetry = isPreviousSeasonFormFollowUp(question)
      ? findPreviousBestFormQuestion(conversation)
      : null;
    const effectiveBestFormQuestion = directBestFormQuestion
      ? question
      : previousBestFormRetry;
    const requestedMatchCount = Math.min(
      10,
      Math.max(
        1,
        extractRequestedMatchCount(effectiveBestFormQuestion, 5),
      ),
    );
    const previousBestFormQuestion = isGroupTeamContextFollowUp(question)
      ? findPreviousBestFormQuestion(conversation)
      : null;
    const reportFollowUp = isComparisonReportFollowUp(question);
    const previousComparisonQuestion = reportFollowUp
      ? findPreviousComparisonQuestion(conversation)
      : null;
    const historicalTeamNames = [
      ...new Set(allMatches.map((match) => match.playerTeam).filter(Boolean)),
    ];
    const mentionedTeam = findTeamMention(question, historicalTeamNames);
    const asksAboutLatestTeamMatch = Boolean(
      mentionedTeam &&
        /\bsiste\s+kamp(?:en)?\b/.test(normalizedSearchQuestion) &&
        /\b(maal|score|scora|scorte|posisjon|spiller)\b/.test(
          normalizedSearchQuestion,
        ),
    );
    const asksForBestTeamPlayer = Boolean(
      mentionedTeam &&
        /\bbest(?:e)?\s+spiller(?:en)?\b/.test(normalizedSearchQuestion),
    );
    const asksForRecruitment = isRecruitmentQuestion(question);
    const asksForEndSeasonPotential = isEndSeasonPotentialQuestion(question);
    const asksForPdf = reportFollowUp || /\bpdf\b/.test(normalizedSearchQuestion);
    const handballAgentState = {
      playersById,
      allMatches,
      defaultSeason: requestedSeason,
      defaultLeague: requestedLeague,
      standings: {
        elite: archiveStandings,
        firstDivision: firstDivisionArchiveStandings,
      },
    };

    // OpenClaw runs the real, stateful agent loop. Report requests stay on the
    // deterministic PDF path because they also need a binary attachment.
    if (
      isOpenClawAgentConfigured() &&
      String(process.env.OPENCLAW_AGENT_MODE ?? 'primary').toLowerCase() === 'primary' &&
      !asksForPdf
    ) {
      openClawAttempted = true;
      analysisMode = 'openclaw-handball-agent';
      try {
        modelCalled = true;
        const openClawResult = await runOpenClawHandballAgent({
          question,
          conversation,
          context,
          state: handballAgentState,
          validateNumbers: findUnsupportedNumberTokens,
        });
        evidence.push({
          label: 'Clawdbot håndballagent',
          value: openClawResult.toolNames.length > 0
            ? `Brukte verktøy: ${openClawResult.toolNames.join(', ')}`
            : 'Ingen dataverktøy ble brukt',
        });
        if (openClawResult.entityIds.length > 0) {
          sources.push({
            label: `Strukturerte håndballdata fra ${dataSource === 'icp-asset-canister' ? 'ICP asset-canister' : 'lokal cache'}`,
            method: openClawResult.toolNames.join(','),
            entityIds: openClawResult.entityIds,
            observedAt: new Date().toISOString(),
          });
        }
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] ${requestId} analysisMode=${analysisMode} provider=${openClawResult.provider} tools=${openClawResult.toolNames.join(',')} dataSource=${dataSource} duration=${duration}ms`);
        return res.json({
          id: requestId,
          answer: openClawResult.answer,
          status: openClawResult.status === 'refused' ? 'answered' : openClawResult.status,
          generatedByAi: openClawResult.generatedByAi,
          evidence,
          sources,
          missingData: openClawResult.status === 'insufficient-data'
            ? ['relevant handball data']
            : [],
          followUpQuestions: [],
        });
      } catch (error) {
        console.warn(`[${requestId}] OpenClaw primary unavailable; using local analysis fallback: ${error.message}`);
      }
    }

    // ─── Check for "best against team" (motstander) ─────────────────────
    const bestAgainstMatch = normalizedQuestion.match(/\bbest\b.*\bmot\b\s+([\wæøåäöü\s-]+?)(?:\s+i\s+(?:fjor|år)|\s+forrige|\s+sist|\s+siste|\s+sesong|$)/i) ||
                              normalizedQuestion.match(/\bspilte\b.*\bbest\b.*\bmot\b\s+([\wæøåäöü\s-]+?)(?:\s+i\s+(?:fjor|år)|\s+forrige|\s+sist|\s+siste|\s+sesong|$)/i);

    if (asksForEndSeasonPotential) {
      analysisMode = 'hybrid-end-season-mep-trend';
      const analysis = analyzeEndSeasonMepTrend(
        allMatches,
        requestedSeason,
        5,
        requestedLeague,
      );
      if (!analysis.found || analysis.candidates.length === 0) {
        return res.json({
          id: requestId,
          answer: `Jeg fant ikke fem avslutningskamper med en positiv MEP-kurve for nok spillere i ${requestedSeason}.`,
          status: 'insufficient-data',
          generatedByAi: false,
          evidence: [],
          sources: [],
          missingData: [`Fem avslutningskamper per spiller i ${requestedSeason}`],
          followUpQuestions: [],
        });
      }

      const fallbackAnswer = buildMepTrendFallbackAnswer(analysis);
      const prompts = buildMepTrendModelPrompts({
        question,
        conversation,
        analysis,
      });
      evidence.push({
        label: `Positiv MEP-kurve ved sesongslutt ${requestedSeason}`,
        value: `${analysis.candidates.length} kandidater basert på de fem siste kampene`,
      });
      sources.push({
        label: `Kampstatistikk fra ${dataSource === 'icp-asset-canister' ? 'ICP asset-canister' : 'lokal cache'}`,
        method: 'player-stats/*PlayerStats.json',
        entityIds: analysis.candidates.map((candidate) => candidate.playerId),
        observedAt: new Date().toISOString(),
      });
      try {
        modelCalled = true;
        const modelAnswer = await callAiModel(
          prompts.systemPrompt,
          prompts.userPrompt,
        );
        const unsupportedNumbers = findUnsupportedNumberTokens(
          modelAnswer,
          prompts.facts,
        );
        if (unsupportedNumbers.length > 0) {
          throw new Error(
            `Grounding validation rejected numbers: ${unsupportedNumbers.join(', ')}`,
          );
        }
        hybridAnswer = modelAnswer.trim();
        hybridGeneratedByAi = true;
      } catch (error) {
        console.error(`[${requestId}] MEP trend model fallback:`, error.message);
        analysisMode = 'hybrid-end-season-mep-trend-fallback';
        hybridAnswer = fallbackAnswer;
      }
    } else if (previousBestFormQuestion) {
      analysisMode = 'deterministic-form-team-context';
      const previousSeason = resolveSeason(
        previousBestFormQuestion,
        context && context.season ? context.season : null,
      );
      const previousNormalized = normalizeText(previousBestFormQuestion);
      const previousMatchCount = Math.min(
        10,
        Math.max(1, extractRequestedMatchCount(previousNormalized, 5)),
      );
      const formAnalysis = analyzeBestForm(
        allMatches,
        previousSeason,
        previousMatchCount,
        requestedLeague,
      );
      const comparison = compareFormWithStandings(
        formAnalysis,
        previousSeason === '2025-26'
          ? requestedLeague === 'first-division'
            ? firstDivisionArchiveStandings
            : archiveStandings
          : [],
        5,
      );

      if (!comparison.found) {
        return res.json({
          id: requestId,
          answer: 'Jeg fant formgruppen fra forrige spørsmål, men mangler en komplett sluttabell for å gjøre en trygg lagjustert sammenligning.',
          status: 'insufficient-data', evidence: [], sources: [],
          missingData: [`Komplett sluttabell for ${previousSeason}`],
          followUpQuestions: []
        });
      }

      const winner = comparison.mostImpressive ?? comparison.rawLeader;
      evidence.push({
        label: 'Form sett opp mot lagplassering',
        value: `${winner.playerName}: snitt-MEP ${winner.avgMep}, ${winner.playerTeam} på ${winner.standing?.rank ?? 'ukjent'}. plass`,
        playerId: winner.playerId
      });
      sources.push({
        label: 'Kampstatistikk fra ICP asset-canister',
        method: 'player-stats/*PlayerStats.json',
        entityIds: comparison.candidates.map(player => player.playerId),
        observedAt: new Date().toISOString()
      });
      sources.push({
        label: `Sluttabell ${previousSeason} fra appens versjonskontrollerte data`,
        method: 'leagueStandingsArchive.json',
        entityIds: comparison.candidates.map(player => player.standing.primeTeamId),
        observedAt: new Date().toISOString()
      });
      deterministicAnswer = buildTeamContextFormAnswer(comparison);
    } else if (effectiveBestFormQuestion) {
      analysisMode = 'deterministic-best-form';
      const formSeason = previousBestFormRetry
        ? resolveSeason(question, context && context.season ? context.season : null)
        : requestedSeason;
      const analysis = analyzeBestForm(
        allMatches,
        formSeason,
        requestedMatchCount,
        requestedLeague,
      );

      if (!analysis.found) {
        return res.json({
          id: requestId,
          answer: `Jeg fant ikke nok kampdata til å rangere form over ${requestedMatchCount} kamper i ${formSeason}.`,
          status: 'insufficient-data', evidence: [], sources: [],
          missingData: [`Minst ${requestedMatchCount} kamper per spiller i ${formSeason}`],
          followUpQuestions: ['Vil du prøve en annen sesong eller færre kamper?']
        });
      }

      const top = analysis.topPlayer;
      evidence.push({
        label: `Best form, siste ${requestedMatchCount} kamper`,
        value: `${top.playerName}: snitt MEP ${top.avgMep}, ${top.totalGoals} mål`,
        playerId: top.playerId
      });
      sources.push({
        label: `Kampstatistikk fra ${dataSource === 'icp-asset-canister' ? 'ICP asset-canister' : 'lokal cache'}`,
        method: 'player-stats/*PlayerStats.json',
        entityIds: analysis.rankings.slice(0, 5).map(player => player.playerId),
        observedAt: new Date().toISOString()
      });
      deterministicAnswer = buildBestFormAnswer(analysis);
    } else if (bestAgainstMatch && !normalizedQuestion.includes(' for ')) {
      analysisMode = 'deterministic-best-against';
      const rawOpponent = bestAgainstMatch[1].replace(/\s*(i fjor|forrige|sist|siste|sesong)\s*$/i, '').trim();
      const teamNames = [...new Set(allMatches.map(m => m.opponent))];
      const resolvedOpponent = fuzzyMatchTeamName(rawOpponent, teamNames);

      if (!resolvedOpponent) {
        return res.json({
          id: requestId,
          answer: `Jeg fant ingen kamper mot laget «${rawOpponent}» i datasettet. Sjekk stavemåten eller prøv et annet lagnavn.`,
          status: 'insufficient-data', evidence: [], sources: [],
          missingData: [`Kamper mot ${rawOpponent}`], followUpQuestions: ['Hvilket lag ønsker du å se statistikk mot?']
        });
      }

      const analysis = analyzeBestAgainstTeam(resolvedOpponent, allMatches);
      if (!analysis.found) {
        return res.json({
          id: requestId, answer: analysis.reason, status: 'insufficient-data',
          evidence: [], sources: [], missingData: [`Kamper mot ${resolvedOpponent}`],
          followUpQuestions: ['Vil du se statistikk for et annet lag?']
        });
      }

      const top = analysis.topPlayer;
      evidence.push({
        label: `Best mot ${resolvedOpponent}`,
        value: `${top.playerName}: MEP ${top.totalMep.toFixed(1)} i ${top.matches} kamper`,
        playerId: top.playerId
      });
      sources.push({
        label: `Kampstatistikk fra ${dataSource === 'icp-asset-canister' ? 'ICP asset-canister' : 'lokal cache'}`,
        method: 'player-stats/*PlayerStats.json',
        entityIds: analysis.rankings.slice(0, 5).map(p => p.playerId),
        observedAt: new Date().toISOString()
      });

      deterministicAnswer = buildBestAgainstAnswer(analysis);
    } else if (asksAboutLatestTeamMatch) {
      analysisMode = 'deterministic-latest-team-match';
      let analysis = analyzeLatestTeamMatch(mentionedTeam, allMatches, {
        season: requestedSeason,
        league: requestedLeague,
      });
      if (!analysis.found) {
        analysis = analyzeLatestTeamMatch(mentionedTeam, allMatches, {
          season: requestedSeason,
        });
      }
      if (!analysis.found) {
        return res.json({
          id: requestId,
          answer: analysis.reason,
          status: 'insufficient-data',
          generatedByAi: false,
          evidence: [],
          sources: [],
          missingData: [`Kampdata for ${mentionedTeam}`],
          followUpQuestions: [],
        });
      }
      evidence.push({
        label: `Siste kamp for ${mentionedTeam}`,
        value: `${analysis.date} mot ${analysis.opponent}, ${analysis.teamGoals} mål`,
        matchId: String(analysis.matchId),
      });
      evidence.push({
        label: 'Flest mål fra posisjon',
        value: `${singularPositionLabel(analysis.topPosition.position)}: ${analysis.topPosition.goals} mål`,
      });
      evidence.push({
        label: 'Toppscorer i kampen',
        value: `${analysis.topPlayer.playerName}: ${analysis.topPlayer.goals} mål`,
        playerId: analysis.topPlayer.playerId,
      });
      sources.push({
        label: `Kampstatistikk fra ${dataSource === 'icp-asset-canister' ? 'ICP asset-canister' : 'lokal cache'}`,
        method: 'player-stats/*PlayerStats.json',
        entityIds: analysis.players.map((player) => player.playerId),
        observedAt: new Date().toISOString(),
      });
      deterministicAnswer = buildLatestTeamMatchAnswer(analysis);
    } else if (asksForBestTeamPlayer) {
      analysisMode = 'deterministic-best-team-player';
      let analysis = analyzeBestPlayerForTeam(mentionedTeam, allMatches, {
        season: requestedSeason,
        league: requestedLeague,
      });
      if (!analysis.found) {
        analysis = analyzeBestPlayerForTeam(mentionedTeam, allMatches, {
          season: requestedSeason,
        });
      }
      if (!analysis.found) {
        return res.json({
          id: requestId,
          answer: analysis.reason,
          status: 'insufficient-data',
          generatedByAi: false,
          evidence: [],
          sources: [],
          missingData: [`Spillerstatistikk for ${mentionedTeam}`],
          followUpQuestions: [],
        });
      }
      evidence.push({
        label: `Høyest samlet MEP for ${mentionedTeam}`,
        value: `${analysis.topPlayer.playerName}: ${analysis.topPlayer.totalMep}`,
        playerId: analysis.topPlayer.playerId,
      });
      sources.push({
        label: `Sesongstatistikk fra ${dataSource === 'icp-asset-canister' ? 'ICP asset-canister' : 'lokal cache'}`,
        method: 'player-stats/*PlayerStats.json',
        entityIds: analysis.rankings.slice(0, 5).map((player) => player.playerId),
        observedAt: new Date().toISOString(),
      });
      deterministicAnswer = buildBestTeamPlayerAnswer(analysis);
    } else if (asksForRecruitment) {
      analysisMode = 'hybrid-wing-recruitment';
      const analysis = analyzeRecruitmentCandidates(playersById, {
        season: '2025-26',
        minimumGames: 4,
      });
      if (!analysis.found) {
        return res.json({
          id: requestId,
          answer: 'Jeg fant ingen kantspillere med tilstrekkelig kampgrunnlag for en rekrutteringsanalyse.',
          status: 'insufficient-data',
          generatedByAi: false,
          evidence: [],
          sources: [],
          missingData: ['Kantspillere med minst fire kamper'],
          followUpQuestions: [],
        });
      }

      for (const candidate of analysis.candidates) {
        const standings = candidate.league === 'first-division'
          ? firstDivisionArchiveStandings
          : archiveStandings;
        const teamName = candidate.teams[0];
        const matchedStandingName = fuzzyMatchTeamName(
          teamName,
          standings.map((standing) => standing.name),
        );
        candidate.standing = standings.find(
          (standing) => standing.name === matchedStandingName,
        ) ?? null;
      }

      const fallbackAnswer = buildRecruitmentFallbackAnswer(analysis);
      const prompts = buildRecruitmentModelPrompts({
        question,
        conversation,
        analysis,
      });
      evidence.push({
        label: 'Scoutinggrunnlag for kantspillere',
        value: `${analysis.candidates.length} kandidater med minst ${analysis.minimumGames} kamper i ${analysis.season}`,
      });
      sources.push({
        label: `Kampstatistikk fra ${dataSource === 'icp-asset-canister' ? 'ICP asset-canister' : 'lokal cache'}`,
        method: 'player-stats/*PlayerStats.json',
        entityIds: analysis.candidates.map((candidate) => candidate.playerId),
        observedAt: new Date().toISOString(),
      });

      try {
        modelCalled = true;
        const modelAnswer = await callAiModel(
          prompts.systemPrompt,
          prompts.userPrompt,
        );
        const unsupportedNumbers = findUnsupportedNumberTokens(
          modelAnswer,
          prompts.facts,
        );
        if (unsupportedNumbers.length > 0) {
          throw new Error(
            `Grounding validation rejected numbers: ${unsupportedNumbers.join(', ')}`,
          );
        }
        hybridAnswer = modelAnswer.trim();
        hybridGeneratedByAi = true;
      } catch (error) {
        console.error(`[${requestId}] Recruitment model fallback:`, error.message);
        analysisMode = 'hybrid-wing-recruitment-fallback';
        hybridAnswer = fallbackAnswer;
      }
    } else {
      // ─── Player lookup ────────────────────────────────────────────────
      analysisMode = 'player-lookup';
      let targetPlayer = null;
      const jsonPlayers = Object.values(playersById).map(player => ({
        ...player,
        id: player.playerId
      }));

      // Try entity hints first
      if (context && context.entities) {
        for (const entity of context.entities) {
          if (entity.type === 'player' && entity.id) {
            targetPlayer = jsonPlayers.find(player => String(player.id) === String(entity.id)) ||
              players.find(player => String(player.id) === String(entity.id));
            if (targetPlayer) break;
          }
        }
      }

      const isBestMatchQuestion = /\bbeste\s+kamp\b|\bbest\s+kamp\b/i.test(question);
      const playerLookupQuestion = previousComparisonQuestion ?? question;
      if (!targetPlayer) {
        targetPlayer = findPlayerByTokens(playerLookupQuestion, jsonPlayers) ||
          findPlayerByTokens(playerLookupQuestion, players);
      }
      if (
        !targetPlayer &&
        (isPlayerFollowUpQuestion(question) || reportFollowUp)
      ) {
        targetPlayer = findPlayerFromConversation(conversation, jsonPlayers) ||
          findPlayerFromConversation(conversation, players);
      }
      if (!targetPlayer) {
        const playerCandidates = rankPlayerCandidates(
          playerLookupQuestion,
          jsonPlayers,
        );
        if (playerCandidates.length > 0) {
          const prompts = buildPlayerResolutionPrompts({
            question: playerLookupQuestion,
            conversation,
            candidates: playerCandidates,
          });
          try {
            modelCalled = true;
            const resolution = await callAiModel(
              prompts.systemPrompt,
              prompts.userPrompt,
            );
            targetPlayer = parsePlayerResolution(
              resolution,
              playerCandidates,
            );
          } catch (error) {
            console.error(`[${requestId}] Model-assisted player resolution failed:`, error.message);
          }
        }
      }

      if (targetPlayer) {
        const isTransferQuestion = /\bbytte(?:t)?\b|\bovergang(?:en)?\b|\baker\b/i.test(question);
        const isDetailedQuestion = isDetailedPlayerQuestion(question);
        const isTeammateComparison =
          isTeammatePositionComparisonQuestion(question) ||
          Boolean(previousComparisonQuestion);
        const isPositionBenchmark = isPositionBenchmarkQuestion(question);
        const playerId = String(targetPlayer.id);
        const jsonPlayerData = playersById[playerId] || null;

        if (jsonPlayerData?.seasonStats && isTeammateComparison) {
          analysisMode = 'hybrid-current-team-position-comparison';
          const teammates = findCurrentTeamPositionPeers(
            jsonPlayerData,
            playersById,
          ).slice(0, 3);

          if (teammates.length === 0) {
            return res.json({
              id: requestId,
              answer: `Jeg fant ${jsonPlayerData.name}, men ingen annen spiller i samme posisjon hos ${jsonPlayerData.currentTeamName} med tilgjengelig historisk statistikk.`,
              status: 'insufficient-data',
              evidence: [],
              sources: [],
              missingData: [
                `Historisk statistikk for andre ${jsonPlayerData.position}-spillere hos ${jsonPlayerData.currentTeamName}`,
              ],
              followUpQuestions: [],
            });
          }

          const comparisonPlayers = [jsonPlayerData, ...teammates];
          let comparisonSeason = requestedSeason;
          let comparisonLeague = chooseSharedLeague(
            comparisonPlayers,
            comparisonSeason,
          );

          if (!comparisonLeague && Array.isArray(conversation)) {
            for (let index = conversation.length - 1; index >= 0; index -= 1) {
              const message = conversation[index];
              if (message?.role !== 'user') continue;
              const candidateSeason = resolveSeason(
                message.content,
                context?.season ?? null,
              );
              const candidateLeague = chooseSharedLeague(
                comparisonPlayers,
                candidateSeason,
              );
              if (candidateLeague) {
                comparisonSeason = candidateSeason;
                comparisonLeague = candidateLeague;
                break;
              }
            }
          }

          if (!comparisonLeague && requestedSeason !== '2025-26') {
            comparisonSeason = '2025-26';
            comparisonLeague = chooseSharedLeague(
              comparisonPlayers,
              comparisonSeason,
            );
          }

          if (!comparisonLeague) {
            return res.json({
              id: requestId,
              answer: `Jeg fant spillerne, men ikke kampstatistikk fra samme liga og sesong som kan sammenlignes på en trygg måte.`,
              status: 'insufficient-data',
              evidence: [],
              sources: [],
              missingData: ['Felles historisk liga og sesong for spillerne'],
              followUpQuestions: [],
            });
          }

          const report = buildComparisonReport({
            playerIds: comparisonPlayers.map((player) => player.playerId),
            playersById,
            season: comparisonSeason,
            league: comparisonLeague,
            standings:
              comparisonLeague === 'first-division'
                ? firstDivisionArchiveStandings
                : archiveStandings,
          });
          const fallbackAnswer = buildComparisonFallbackAnswer(
            report,
            jsonPlayerData.currentTeamName,
          );
          const prompts = buildComparisonModelPrompts({
            question,
            conversation,
            report,
            currentTeamName: jsonPlayerData.currentTeamName,
          });

          evidence.push({
            label: `Sammenligning i ${comparisonSeason}`,
            value: `${report.players.map((player) => player.name).join(' mot ')}, ${comparisonLeague === 'first-division' ? '1. divisjon' : 'Eliteserien'}`,
            playerId,
          });
          for (const player of report.players) {
            evidence.push({
              label: player.name,
              value: `${player.metrics.games} kamper, ${player.metrics.goals} mål, ${player.metrics.shotPercentage}% uttelling, MEP ${player.metrics.mepTotal}`,
              playerId: player.playerId,
            });
          }
          sources.push({
            label: `Rollejustert kampanalyse fra ${dataSource === 'icp-asset-canister' ? 'ICP asset-canister' : 'lokal cache'}`,
            method: `player-stats/${[
              ...new Set(
                comparisonPlayers.flatMap((player) => player.sourceFiles ?? []),
              ),
            ].join(',')}`,
            entityIds: report.players.map((player) => player.playerId),
            observedAt: new Date().toISOString(),
          });

          if (reportFollowUp) {
            analysisMode = 'deterministic-comparison-report-follow-up';
            hybridAnswer = `PDF-rapporten med sammenligningen mellom ${report.players.map((player) => player.name).join(' og ')} er klar for nedlasting.`;
          } else {
            try {
              modelCalled = true;
              const modelAnswer = await callAiModel(
                prompts.systemPrompt,
                prompts.userPrompt,
              );
              const unsupportedNumbers = findUnsupportedNumberTokens(
                modelAnswer,
                {
                  facts: prompts.facts,
                  question,
                  conversation,
                },
              );
              if (unsupportedNumbers.length > 0) {
                throw new Error(
                  `Grounding validation rejected numbers: ${unsupportedNumbers.join(', ')}`,
                );
              }
              hybridAnswer = modelAnswer.trim();
              hybridGeneratedByAi = true;
            } catch (error) {
              console.error(`[${requestId}] Grounded comparison model fallback:`, error.message);
              analysisMode = 'hybrid-current-team-position-comparison-fallback';
              hybridAnswer = fallbackAnswer;
            }
          }

          if (/\bpdf\b|\brapport(?:en)?\b/i.test(question)) {
            try {
              const pdf = await createComparisonPdf(report);
              if (pdf.length > 1_000_000) {
                throw new Error(`PDF is too large: ${pdf.length} bytes`);
              }
              const reportNames = report.players
                .map((player) => normalizeText(player.name).replace(/\s+/g, '-'))
                .join('-vs-');
              reportAttachment = {
                filename: `handball-tracker-${report.season}-${reportNames}.pdf`,
                mimeType: 'application/pdf',
                contentBase64: pdf.toString('base64'),
              };
            } catch (error) {
              console.error(`[${requestId}] PDF generation failed:`, error.message);
            }
          }
        } else if (jsonPlayerData?.seasonStats && isPositionBenchmark) {
          analysisMode = 'hybrid-position-benchmark';
          const segmentPerformances = (jsonPlayerData.seasonSegments ?? []).map(
            (segment) => ({
              segment,
              performance: summarizePlayerPerformance(
                jsonPlayerData,
                playersById,
                { teamName: segment.teamName, league: segment.league },
              ),
            }),
          );
          const facts = buildPositionBenchmarkFacts(
            jsonPlayerData,
            segmentPerformances,
          );
          const fallbackAnswer = buildPositionBenchmarkFallbackAnswer(
            jsonPlayerData,
            segmentPerformances,
          );
          const prompts = buildPositionBenchmarkModelPrompts({
            question,
            conversation,
            facts,
          });
          evidence.push({
            label: `Posisjonssammenligning ${jsonPlayerData.season}`,
            value: `${jsonPlayerData.name} mot spillere i samme posisjon med minst fem kamper`,
            playerId,
          });
          sources.push({
            label: `Kamp- og sesongstatistikk fra ${dataSource === 'icp-asset-canister' ? 'ICP asset-canister' : 'lokal cache'}`,
            method: `player-stats/${jsonPlayerData.sourceFiles.join(',')}`,
            entityIds: [playerId],
            observedAt: new Date().toISOString(),
          });
          try {
            modelCalled = true;
            const modelAnswer = await callAiModel(
              prompts.systemPrompt,
              prompts.userPrompt,
            );
            const unsupportedNumbers = findUnsupportedNumberTokens(
              modelAnswer,
              facts,
            );
            if (unsupportedNumbers.length > 0) {
              throw new Error(
                `Grounding validation rejected numbers: ${unsupportedNumbers.join(', ')}`,
              );
            }
            hybridAnswer = modelAnswer.trim();
            hybridGeneratedByAi = true;
          } catch (error) {
            console.error(`[${requestId}] Position benchmark fallback:`, error.message);
            analysisMode = 'hybrid-position-benchmark-fallback';
            hybridAnswer = fallbackAnswer;
          }
        } else if (isBestMatchQuestion && extractedClub) {
          analysisMode = 'deterministic-best-match';
          const seasonTeamNames = [...new Set(
            jsonPlayers.flatMap(player =>
              player.seasonTeamNames?.length
                ? player.seasonTeamNames
                : [player.seasonTeamName],
            ).filter(Boolean)
          )];
          const previousTeamName = fuzzyMatchTeamName(extractedClub, seasonTeamNames);
          const bestMatch = previousTeamName
            ? findBestMatchForPlayer(playerId, previousTeamName, allMatches)
            : null;

          if (!bestMatch) {
            return res.json({
              id: requestId,
              answer: `Jeg fant ingen kamper for ${targetPlayer.name} i ${extractedClub} i datasettet.`,
              status: 'insufficient-data', evidence: [], sources: [],
              missingData: [`Kamper for ${targetPlayer.name} i ${extractedClub}`],
              followUpQuestions: ['Vil du se statistikk for en annen spiller eller klubb?']
            });
          }

          const seasonSegment = jsonPlayerData
            ? findSeasonSegment(jsonPlayerData, previousTeamName)
            : null;
          const seasonStatsData = seasonSegment?.seasonStats ?? null;
          const currentTeamName = jsonPlayerData?.currentTeamName &&
            normalizeText(jsonPlayerData.currentTeamName) !== normalizeText(previousTeamName)
            ? jsonPlayerData.currentTeamName
            : null;

          evidence.push({
            label: `Beste kamp for ${previousTeamName}`,
            value: `${bestMatch.date} mot ${bestMatch.opponent}, MEP ${bestMatch.mep}`,
            playerId: playerId
          });
          evidence.push({
            label: 'Kampbidrag',
            value: `${bestMatch.goals} mål, ${bestMatch.assists} assist, ${bestMatch.playTime}`,
            playerId: playerId
          });
          if (seasonStatsData) {
            evidence.push({
              label: `Sesong ${jsonPlayerData.season}`,
              value: `${seasonStatsData.matches ?? 0} kamper, ${seasonStatsData.goals ?? 0} mål`,
              playerId: playerId
            });
          }
          sources.push({
            label: `Kampstatistikk fra ${dataSource === 'icp-asset-canister' ? 'ICP asset-canister' : 'lokal cache'}`,
            method: `player-stats/${seasonSegment?.sourceFile || jsonPlayerData?.sourceFile || '*PlayerStats.json'}`,
            entityIds: [playerId],
            observedAt: new Date().toISOString()
          });

          deterministicAnswer = buildBestMatchAnswer(
            targetPlayer.name,
            bestMatch,
            seasonStatsData,
            jsonPlayerData?.season || requestedSeason,
            currentTeamName,
            previousTeamName,
            isTransferQuestion
          );
        } else if (jsonPlayerData?.seasonStats && isDetailedQuestion) {
          analysisMode = 'deterministic-detailed-player-summary';
          const performance = summarizePlayerPerformance(jsonPlayerData, playersById);
          const segmentPerformances = (jsonPlayerData.seasonSegments ?? []).map(
            (segment) => ({
              segment,
              performance: summarizePlayerPerformance(
                jsonPlayerData,
                playersById,
                { teamName: segment.teamName, league: segment.league },
              ),
            }),
          );
          const stats = jsonPlayerData.seasonStats;
          evidence.push({
            label: `Detaljert sesongstatistikk ${jsonPlayerData.season}`,
            value: `${stats.matches ?? 0} kamper, ${performance.totalPlayTime} spilletid, MEP ${stats.mepTotal ?? 0}`,
            playerId
          });
          for (const { segment, performance: segmentPerformance } of segmentPerformances) {
            evidence.push({
              label: `${segment.teamName}, ${segmentLeagueLabel(segment)}`,
              value: `${segmentPerformance.seasonStats.matches ?? 0} kamper, ${segmentPerformance.seasonStats.goals ?? 0} mål, MEP ${segmentPerformance.seasonStats.mepTotal ?? 0}`,
              playerId,
            });
          }
          sources.push({
            label: `Kamp- og sesongstatistikk fra ${dataSource === 'icp-asset-canister' ? 'ICP asset-canister' : 'lokal cache'}`,
            method: `player-stats/${jsonPlayerData.sourceFiles.join(',')}`,
            entityIds: [playerId],
            observedAt: new Date().toISOString()
          });
          deterministicAnswer = buildDetailedPlayerSummary(
            jsonPlayerData,
            performance,
            requestedSeason,
            isTransferQuestion,
            segmentPerformances,
          );
        } else if (jsonPlayerData?.seasonStats) {
          analysisMode = 'deterministic-player-stats';
          const stats = jsonPlayerData.seasonStats;
          evidence.push({
            label: `Sesongstatistikk ${jsonPlayerData.season}`,
            value: `${stats.goals ?? 0} mål, ${stats.assists ?? 0} assist, ${stats.shots ?? 0} skudd`,
            playerId
          });
          sources.push({
            label: `Sesongstatistikk fra ${dataSource === 'icp-asset-canister' ? 'ICP asset-canister' : 'lokal cache'}`,
            method: `player-stats/${jsonPlayerData.sourceFile}`,
            entityIds: [playerId],
            observedAt: new Date().toISOString()
          });
          deterministicAnswer = buildJsonPlayerStatsAnswer(jsonPlayerData, requestedSeason);
        } else {
          let playerSeasonStat = null;
          try {
            const raw = await backend.getPlayerSeasonStats(targetPlayer.id);
            playerSeasonStat = unwrapCandidOpt(raw);
          } catch (err) {
            console.error('Failed to fetch player stats:', err.message);
          }

          if (playerSeasonStat) {
            evidence.push({
              label: 'Sesongstatistikk',
              value: `${fmtEvidence(unwrapOptField(playerSeasonStat.totalGoals))} mål`,
              playerId: String(targetPlayer.id)
            });
            sources.push({
              label: 'Sesongstatistikk fra ICP',
              method: 'getPlayerSeasonStats',
              entityIds: [String(targetPlayer.id)],
              observedAt: new Date().toISOString()
            });
            deterministicAnswer = buildPlayerStatsAnswer(targetPlayer, playerSeasonStat, teams, requestedSeason);
            analysisMode = 'deterministic-player-stats';
          }
        }
      }
    }

    if (hybridAnswer) {
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] ${requestId} analysisMode=${analysisMode} modelCalled=${modelCalled} dataSource=${dataSource} duration=${duration}ms`);
      return res.json({
        id: requestId,
        answer: hybridAnswer,
        status: 'answered',
        generatedByAi: hybridGeneratedByAi,
        evidence,
        sources,
        missingData: [],
        report: reportAttachment,
        followUpQuestions: [
          'Vil du lage en PDF-rapport av sammenligningen?',
          'Vil du sammenligne formkurvene kamp for kamp?',
        ],
      });
    }

    // ─── Return deterministic answer if we have one ─────────────────────
    if (deterministicAnswer) {
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] ${requestId} analysisMode=${analysisMode} modelCalled=${modelCalled} dataSource=${dataSource} duration=${duration}ms`);
      return res.json({
        id: requestId,
        answer: deterministicAnswer,
        status: 'answered',
        generatedByAi: false,
        evidence,
        sources,
        missingData: [],
        followUpQuestions: ['Vil du se statistikk for en annen spiller?', 'Vil du sammenligne med et annet lag?']
      });
    }

    // ─── Agentic fallback for open-ended handball questions ─────────────
    analysisMode = 'agentic-handball';
    let agentResult = null;
    if (isOpenClawAgentConfigured() && !openClawAttempted) {
      openClawAttempted = true;
      try {
        modelCalled = true;
        agentResult = await runOpenClawHandballAgent({
          question,
          conversation,
          context,
          state: handballAgentState,
          validateNumbers: findUnsupportedNumberTokens,
        });
        analysisMode = 'openclaw-handball-agent-fallback';
      } catch (error) {
        console.warn(`[${requestId}] OpenClaw fallback unavailable; using local agent: ${error.message}`);
      }
    }
    if (!agentResult) {
      agentResult = await runHandballAgent({
        question,
        conversation,
        context,
        state: handballAgentState,
        callModel: async (systemPrompt, userPrompt) => {
          modelCalled = true;
          return callAiModel(systemPrompt, userPrompt);
        },
        validateNumbers: findUnsupportedNumberTokens,
      });
    }
    evidence.push({
      label: agentResult.provider === 'openclaw'
        ? 'Clawdbot håndballagent'
        : 'Kontrollert håndballagent',
      value: agentResult.toolNames.length > 0
        ? `Brukte verktøy: ${agentResult.toolNames.join(', ')}`
        : 'Ingen dataverktøy ble brukt',
    });
    if (agentResult.entityIds.length > 0) {
      sources.push({
        label: `Strukturerte håndballdata fra ${dataSource === 'icp-asset-canister' ? 'ICP asset-canister' : 'lokal cache'}`,
        method: agentResult.toolNames.join(','),
        entityIds: agentResult.entityIds,
        observedAt: new Date().toISOString(),
      });
    }

    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${requestId} analysisMode=${analysisMode} modelCalled=${modelCalled} tools=${agentResult.toolNames.join(',')} dataSource=${dataSource} duration=${duration}ms`);

    return res.json({
      id: requestId,
      answer: agentResult.answer,
      status: agentResult.status === 'refused' ? 'answered' : agentResult.status,
      generatedByAi: agentResult.generatedByAi,
      evidence,
      sources,
      missingData:
        agentResult.status === 'insufficient-data'
          ? ['relevant handball data']
          : [],
      followUpQuestions: [],
    });

  } catch (err) {
    console.error('Unhandled error:', err);
    res.status(500).json({
      id: requestId, answer: 'En uventet feil oppstod. Prøv igjen senere.',
      status: 'insufficient-data', evidence: [], sources: [],
      missingData: ['server error'], followUpQuestions: []
    });
  }
});

app.use((error, _req, res, next) => {
  if (error?.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  return next(error);
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Handball AI service listening on port ${PORT}`);
  void Promise.all([loadJsonStats(), refreshCache()]).catch(error => {
    console.error('Initial cache warmup failed:', error.message);
  });
  if (String(process.env.AI_WORKER_ENABLED).toLowerCase() === 'true') {
    const { startAiWorker } = require('./worker');
    void startAiWorker().catch(error => {
      console.error('AI worker failed to start:', error.message);
    });
  }
});
