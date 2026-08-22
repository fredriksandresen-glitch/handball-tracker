const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { HttpAgent, Actor } = require('@dfinity/agent');
const { IDL } = require('@dfinity/candid');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ─── Candid Opt / BigInt helpers ───────────────────────────────────────────

function unwrapCandidOpt(value) {
  if (!Array.isArray(value)) return value ?? null;
  return value.length > 0 ? value[0] : null;
}

function unwrapOptField(value) {
  if (!Array.isArray(value) || value.length === 0) return null;
  const v = value[0];
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

// ─── Text normalization ────────────────────────────────────────────────────

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[æä]/g, 'ae')
    .replace(/[øö]/g, 'oe')
    .replace(/[å]/g, 'aa')
    .replace(/[\s-]+/g, ' ')
    .trim();
}

function stripGenitive(text) {
  // Remove trailing 's (genitive) for matching
  return text.replace(/['’]s\b/g, '').replace(/s\b/g, '');
}

function tokenize(text) {
  return normalizeText(text).split(/\s+/).filter(t => t.length >= 2);
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

// ─── Robust player lookup ──────────────────────────────────────────────────

function findPlayerByTokens(question, players) {
  const qTokens = tokenize(question);
  const qNormalized = normalizeText(question);
  const qNoGen = stripGenitive(qNormalized);

  let bestMatch = null;
  let bestScore = -1;

  for (const player of players) {
    const name = player.name;
    const nameTokens = tokenize(name);
    const nameNormalized = normalizeText(name);
    const nameNoGen = stripGenitive(nameNormalized);

    // Score 1: Exact match (case insensitive)
    if (qNormalized.includes(nameNormalized)) {
      return player;
    }

    // Score 2: Match without genitive
    if (qNormalized.includes(nameNoGen) || qNoGen.includes(nameNoGen)) {
      return player;
    }

    // Score 3: Token overlap - require at least 2 tokens to match for multi-word names
    const matchedTokens = nameTokens.filter(nt =>
      qTokens.some(qt => qt.includes(nt) || nt.includes(qt) || levenshteinDistance(qt, nt) <= 1)
    );

    // Skip if not enough tokens match (require at least 2 for 3+ token names, or all for 2-token names)
    const minRequired = nameTokens.length >= 3 ? 2 : nameTokens.length;
    if (matchedTokens.length < minRequired) continue;

    const tokenScore = matchedTokens.length / nameTokens.length;

    // Score 4: Fuzzy similarity on full name
    const dist = levenshteinDistance(qNormalized, nameNormalized);
    const maxLen = Math.max(qNormalized.length, nameNormalized.length);
    const fuzzyScore = maxLen > 0 ? 1 - dist / maxLen : 0;

    // Combine scores - prioritize token matches
    let score = tokenScore * 0.8 + fuzzyScore * 0.2;

    // Bonus: if all matched tokens are significant (first and last name), boost score
    if (matchedTokens.length >= 2) {
      score += 0.2;
    }

    if (score > 0.5 && score > bestScore) {
      bestScore = score;
      bestMatch = player;
    }
  }

  return bestMatch;
}

function fuzzyMatchTeamName(input, teamNames) {
  const normalizedInput = normalizeText(input);
  let bestMatch = null;
  let bestScore = Infinity;

  for (const name of teamNames) {
    const normalizedName = normalizeText(name);
    if (normalizedName === normalizedInput) return name;
    if (normalizedName.includes(normalizedInput) || normalizedInput.includes(normalizedName)) {
      return name;
    }
    const dist = levenshteinDistance(normalizedInput, normalizedName);
    const maxLen = Math.max(normalizedInput.length, normalizedName.length);
    const similarity = 1 - dist / maxLen;
    if (similarity > 0.7 && dist < bestScore) {
      bestScore = dist;
      bestMatch = name;
    }
  }
  return bestMatch;
}

// ─── Extract club from question ────────────────────────────────────────────

function extractClubFromQuestion(question) {
  const normalized = question.toLowerCase();

  // Patterns for "playing FOR a club"
  const forPatterns = [
    /\bfor\s+([\wæøåäöü\s-]+?)(?:\s+i\s+|\s+eller\s+|\s+\?|$)/i,
    /\bi\s+([\wæøåäöü\s-]+?)\b/i,
    /\bspilte\s+(?:for|i)\s+([\wæøåäöü\s-]+?)(?:\s+|\?|$)/i,
    /\bda\s+hun\s+spilte\s+(?:for|i)\s+([\wæøåäöü\s-]+?)(?:\s+|\?|$)/i,
  ];

  for (const pattern of forPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const club = match[1].trim();
      // Exclude common non-club words
      if (!/\b(fjor|år|sesong|kamp|mål|assist|skudd|mep)\b/i.test(club)) {
        return club;
      }
    }
  }
  return null;
}

// ─── JSON Stats Data Loader ────────────────────────────────────────────────

const ICP_ASSET_BASE = 'https://hrzvs-liaaa-aaaap-qusna-cai.icp0.io/data';
const LOCAL_STATS_DIR = '/tmp/handball-icp-deploy-cache/src/frontend/public/data/player-stats';
const LOCAL_SEARCH_INDEX = '/tmp/handball-icp-deploy-cache/src/frontend/public/data/search-player-index.json';

let jsonStatsCache = {
  playersById: null,
  allMatches: null,
  source: null,
  timestamp: 0
};
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
  if (!searchIndex) return null;

  const playerIdToName = {};
  for (const p of searchIndex) {
    playerIdToName[p.id] = { name: p.name, teamName: p.teamName };
  }

  const playersById = {};
  const allMatches = [];

  const teamNames = [...new Set(searchIndex.map(p => p.teamName).filter(Boolean))];
  const teamFiles = teamNames.map(t => {
    const normalized = normalizeText(t).replace(/\s+/g, '');
    return `${normalized}PlayerStats.json`;
  });

  for (const file of teamFiles) {
    const data = await fetchJson(`${ICP_ASSET_BASE}/player-stats/${file}`);
    if (!data) continue;
    for (const player of data) {
      const pid = player.playerId;
      const playerInfo = playerIdToName[pid] || { name: 'Ukjent', teamName: 'Ukjent' };
      if (!playersById[pid]) {
        playersById[pid] = { playerId: pid, name: playerInfo.name, teamName: playerInfo.teamName, matches: [], seasonStats: player.seasonStats || null };
      }
      for (const match of player.recentMatches || []) {
        const rec = {
          playerId: pid, playerName: playerInfo.name, playerTeam: playerInfo.teamName,
          date: match.date, opponent: match.opponent, homeAway: match.homeAway,
          goals: match.goals || 0, assists: match.assists || 0, shots: match.shots || 0,
          mep: match.mep || 0, shotPercentage: match.shotPercentage || 0, playTime: match.playTime || '00:00:00',
          technicalErrors: match.technicalErrors || 0, suspensions: match.suspensions || 0
        };
        playersById[pid].matches.push(rec);
        allMatches.push(rec);
      }
    }
  }

  return { playersById, allMatches, source: 'icp-asset-canister' };
}

async function loadJsonStatsFromLocal() {
  const playersById = {};
  const allMatches = [];

  try {
    let searchIndex = [];
    if (fs.existsSync(LOCAL_SEARCH_INDEX)) {
      searchIndex = JSON.parse(fs.readFileSync(LOCAL_SEARCH_INDEX, 'utf8'));
    }
    const playerIdToName = {};
    for (const p of searchIndex) {
      playerIdToName[p.id] = { name: p.name, teamName: p.teamName };
    }

    if (fs.existsSync(LOCAL_STATS_DIR)) {
      const files = fs.readdirSync(LOCAL_STATS_DIR).filter(f => f.endsWith('PlayerStats.json'));
      for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(LOCAL_STATS_DIR, file), 'utf8'));
        for (const player of data) {
          const pid = player.playerId;
          const playerInfo = playerIdToName[pid] || { name: 'Ukjent', teamName: 'Ukjent' };
          if (!playersById[pid]) {
            playersById[pid] = { playerId: pid, name: playerInfo.name, teamName: playerInfo.teamName, matches: [], seasonStats: player.seasonStats || null };
          }
          for (const match of player.recentMatches || []) {
            const rec = {
              playerId: pid, playerName: playerInfo.name, playerTeam: playerInfo.teamName,
              date: match.date, opponent: match.opponent, homeAway: match.homeAway,
              goals: match.goals || 0, assists: match.assists || 0, shots: match.shots || 0,
              mep: match.mep || 0, shotPercentage: match.shotPercentage || 0, playTime: match.playTime || '00:00:00',
              technicalErrors: match.technicalErrors || 0, suspensions: match.suspensions || 0
            };
            playersById[pid].matches.push(rec);
            allMatches.push(rec);
          }
        }
      }
    }
  } catch (err) {
    console.error('Local fallback failed:', err.message);
  }

  return { playersById, allMatches, source: 'local-deploy-cache' };
}

async function loadJsonStats() {
  const now = Date.now();
  if (now - jsonStatsCache.timestamp < JSON_CACHE_TTL_MS && jsonStatsCache.playersById) {
    return jsonStatsCache;
  }

  let result = await loadJsonStatsFromICP();
  if (!result || Object.keys(result.playersById).length === 0) {
    console.log('[stats] ICP asset canister unavailable, using local fallback');
    result = await loadJsonStatsFromLocal();
  } else {
    console.log('[stats] Loaded from ICP asset canister');
  }

  jsonStatsCache = { ...result, timestamp: now };
  return jsonStatsCache;
}

function resolveSeason(question, contextSeason) {
  const normalized = question.toLowerCase();
  const seasonPatterns = [
    { pattern: /2025[-/]26|2025\/26/, season: '2025-26' },
    { pattern: /2026[-/]27|2026\/27/, season: '2026-27' },
    { pattern: /2024[-/]25|2024\/25/, season: '2024-25' }
  ];
  for (const { pattern, season } of seasonPatterns) {
    if (pattern.test(normalized)) return season;
  }
  if (contextSeason === '2026-27') {
    if (/\bi fjor\b|\bforrige sesong\b|\bsist sesong\b|\bsiste sesong\b|\bi fjorårets?\b/.test(normalized)) {
      return '2025-26';
    }
  }
  return contextSeason || '2025-26';
}

// ─── Analysis functions ────────────────────────────────────────────────────

function analyzeBestAgainstTeam(opponentTeam, allMatches) {
  const relevantMatches = allMatches.filter(m =>
    normalizeText(m.opponent) === normalizeText(opponentTeam)
  );
  if (relevantMatches.length === 0) {
    return { found: false, reason: `Ingen kamper mot ${opponentTeam} funnet i datasettet.` };
  }

  const playerStats = {};
  for (const match of relevantMatches) {
    const pid = match.playerId;
    if (!playerStats[pid]) {
      playerStats[pid] = {
        playerId: pid, playerName: match.playerName, playerTeam: match.playerTeam,
        matches: 0, totalMep: 0, totalGoals: 0, totalAssists: 0, totalShots: 0
      };
    }
    playerStats[pid].matches++;
    playerStats[pid].totalMep += match.mep;
    playerStats[pid].totalGoals += match.goals;
    playerStats[pid].totalAssists += match.assists;
    playerStats[pid].totalShots += match.shots;
  }

  const rankings = Object.values(playerStats).map(p => ({
    ...p,
    avgMep: p.matches > 0 ? Math.round((p.totalMep / p.matches) * 100) / 100 : 0
  }));
  rankings.sort((a, b) => b.totalMep - a.totalMep);

  return {
    found: true, opponentTeam, totalMatches: relevantMatches.length,
    rankings: rankings.slice(0, 10), topPlayer: rankings[0] || null
  };
}

function findBestMatchForPlayer(playerId, clubName, allMatches) {
  let playerMatches = allMatches.filter(m => m.playerId === playerId);

  if (clubName) {
    // Filter to matches where player represented this club
    playerMatches = playerMatches.filter(m =>
      normalizeText(m.playerTeam) === normalizeText(clubName)
    );
  }

  if (playerMatches.length === 0) {
    return null;
  }

  // Sort by MEP descending
  playerMatches.sort((a, b) => b.mep - a.mep);
  return playerMatches[0];
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

function buildBestMatchAnswer(playerName, bestMatch, seasonStats, currentTeamName, previousTeamName, isTransferQuestion) {
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
    answer += `\nSesongstatistikk for ${previousTeamName} (2025-26):\n`;
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
      model: 'kimi-k3',
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

const ALLOWED_ORIGINS = [
  'https://hrzvs-liaaa-aaaap-qusna-cai.icp0.io',
  'https://hrzvs-liaaa-aaaap-qusna-cai.raw.icp0.io',
  'http://localhost:5173',
  'http://localhost:3000'
];

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
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown'
});
app.use(limiter);

app.use(express.json({ limit: '32kb' }));

// ICP Backend setup
const BACKEND_CANISTER_ID = 'lj6bx-dyaaa-aaaap-qumhq-cai';
const ICP_HOST = 'https://icp-api.io';

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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main chat endpoint
app.post('/v1/handball/chat', async (req, res) => {
  const startTime = Date.now();
  const requestId = 'analysis-' + Date.now();
  let analysisMode = 'unknown';
  let modelCalled = false;
  let dataSource = 'none';

  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        id: requestId, answer: 'Invalid request format', status: 'insufficient-data',
        evidence: [], sources: [], missingData: ['request body'], followUpQuestions: []
      });
    }

    const { question, context } = req.body;
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

    const requestedSeason = resolveSeason(question, context && context.season ? context.season : null);
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

    // ─── Extract potential club from question ───────────────────────────
    const extractedClub = extractClubFromQuestion(question);

    // ─── Check for "best against team" (motstander) ─────────────────────
    const bestAgainstMatch = normalizedQuestion.match(/\bbest\b.*\bmot\b\s+([\wæøåäöü\s-]+?)(?:\s+i\s+(?:fjor|år)|\s+forrige|\s+sist|\s+siste|\s+sesong|$)/i) ||
                              normalizedQuestion.match(/\bspilte\b.*\bbest\b.*\bmot\b\s+([\wæøåäöü\s-]+?)(?:\s+i\s+(?:fjor|år)|\s+forrige|\s+sist|\s+siste|\s+sesong|$)/i);

    if (bestAgainstMatch && !normalizedQuestion.includes(' for ')) {
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
    } else {
      // ─── Player lookup (with robust token matching) ───────────────────
      analysisMode = 'player-lookup';
      let targetPlayer = null;

      // Try entity hints first
      if (context && context.entities) {
        for (const entity of context.entities) {
          if (entity.type === 'player' && entity.id) {
            targetPlayer = players.find(p => String(p.id) === String(entity.id));
          }
        }
      }

      // Robust token-based matching
      const isBestMatchQuestion = /\bbeste\s+kamp\b|\bbest\s+kamp\b/i.test(question);

      if (!targetPlayer) {
        // For "best match for club" questions, search ONLY in JSON stats (not ICP)
        if (isBestMatchQuestion && extractedClub && playersById && Object.keys(playersById).length > 0) {
          console.log('[DEBUG] isBestMatchQuestion=true, extractedClub=' + extractedClub + ', playersById count=' + Object.keys(playersById).length);
          const jsonPlayersList = Object.values(playersById).map(jp => ({ name: jp.name, id: jp.playerId }));
          console.log('[DEBUG] jsonPlayersList has', jsonPlayersList.length, 'players');
          console.log('[DEBUG] Linnea in list:', jsonPlayersList.find(p => p.name.includes('Linnea')));
          const jsonMatch = findPlayerByTokens(question, jsonPlayersList);
          console.log('[DEBUG] findPlayerByTokens result:', jsonMatch ? jsonMatch.name : 'null');
          if (jsonMatch) {
            targetPlayer = { id: jsonMatch.id, name: jsonMatch.name, teamId: 0, position: { Bakspiller: null }, slug: '', isActive: true };
          }
        }
        // For other questions, search JSON stats first, then ICP
        else if (playersById && Object.keys(playersById).length > 0) {
          const jsonPlayersList = Object.values(playersById).map(jp => ({ name: jp.name, id: jp.playerId }));
          const jsonMatch = findPlayerByTokens(question, jsonPlayersList);
          if (jsonMatch) {
            targetPlayer = { id: jsonMatch.id, name: jsonMatch.name, teamId: 0, position: { Bakspiller: null }, slug: '', isActive: true };
          }
          // Fallback to ICP players if no JSON match
          if (!targetPlayer) {
            targetPlayer = findPlayerByTokens(question, players);
          }
        } else {
          targetPlayer = findPlayerByTokens(question, players);
        }
      }

      if (targetPlayer) {
        const isTransferQuestion = /\bbytte\b|\bovergang\b|\baker\b/i.test(question);

        if (isBestMatchQuestion && extractedClub) {
          analysisMode = 'deterministic-best-match';

          // Find best match for this player in the specified club
          const playerId = String(targetPlayer.id);
          const bestMatch = findBestMatchForPlayer(playerId, extractedClub, allMatches);

          if (!bestMatch) {
            return res.json({
              id: requestId,
              answer: `Jeg fant ingen kamper for ${targetPlayer.name} i ${extractedClub} i datasettet.`,
              status: 'insufficient-data', evidence: [], sources: [],
              missingData: [`Kamper for ${targetPlayer.name} i ${extractedClub}`],
              followUpQuestions: ['Vil du se statistikk for en annen spiller eller klubb?']
            });
          }

          // Get season stats from JSON data
          const jsonPlayerData = playersById[playerId];
          const seasonStatsData = jsonPlayerData ? jsonPlayerData.seasonStats : null;

          // Determine current team from search index or ICP
          let currentTeamName = null;
          let previousTeamName = extractedClub;

          // Try to find current team from ICP data
          const playerFromICP = players.find(p => String(p.id) === playerId);
          if (playerFromICP) {
            const team = teams.find(t => t.id === playerFromICP.teamId);
            if (team) currentTeamName = team.name;
          }

          // Fallback to JSON data for team info
          if (!currentTeamName && jsonPlayerData) {
            currentTeamName = jsonPlayerData.teamName;
            if (currentTeamName === previousTeamName) {
              // Player hasn't moved, no transfer to evaluate
              currentTeamName = null;
            }
          }

          evidence.push({
            label: `Beste kamp for ${previousTeamName}`,
            value: `${bestMatch.date} mot ${bestMatch.opponent}, MEP ${bestMatch.mep}`,
            playerId: playerId
          });
          evidence.push({
            label: 'Sesongstatistikk',
            value: `${seasonStatsData ? (seasonStatsData.matches || 'N/A') + ' kamper' : 'N/A'}`,
            playerId: playerId
          });
          sources.push({
            label: `Kampstatistikk fra ${dataSource === 'icp-asset-canister' ? 'ICP asset-canister' : 'lokal cache'}`,
            method: 'player-stats/*PlayerStats.json',
            entityIds: [playerId],
            observedAt: new Date().toISOString()
          });

          deterministicAnswer = buildBestMatchAnswer(
            targetPlayer.name,
            bestMatch,
            seasonStatsData,
            currentTeamName,
            previousTeamName,
            isTransferQuestion
          );
        } else {
          // Regular player stats lookup
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

    // ─── Return deterministic answer if we have one ─────────────────────
    if (deterministicAnswer) {
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] ${requestId} analysisMode=${analysisMode} modelCalled=false dataSource=${dataSource} duration=${duration}ms`);
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

    // ─── Fallback to AI model for open-ended questions ──────────────────
    const systemPrompt = `Du er en håndballekspert som hjelper brukere med spørsmål om norsk håndball.
Du har tilgang til data fra REMA 1000-ligaen (eliteserien) og 1. divisjon.
Svar på norsk. Bruk kun data fra konteksten under. Hvis data mangler, si det tydelig.
Ikke finn på tall som ikke finnes i dataene.`;

    const userPrompt = `Spørsmål: ${question}\n\nTilgjengelig data:\nIngen spesifikk data funnet for dette spørsmålet.\n\nSvar konsist og presist. Hvis data mangler, forklar hva som mangler.`;

    let answer;
    try {
      modelCalled = true;
      answer = await callAiModel(systemPrompt, userPrompt);
    } catch (err) {
      console.error(`[${requestId}] AI call failed:`, err.message);
      return res.status(503).json({
        id: requestId,
        answer: 'AI-tjenesten er midlertidig utilgjengelig. Prøv igjen senere.',
        status: 'insufficient-data',
        evidence: [], sources: [], missingData: ['AI model response'],
        followUpQuestions: ['Prøv igjen om et øyeblikk']
      });
    }

    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${requestId} analysisMode=${analysisMode} modelCalled=true dataSource=${dataSource} duration=${duration}ms`);

    res.json({
      id: requestId,
      answer: answer.trim(),
      status: evidence.length > 0 ? 'answered' : 'insufficient-data',
      generatedByAi: true,
      evidence,
      sources,
      missingData: evidence.length === 0 ? ['relevant data for question'] : [],
      followUpQuestions: [
        'Vil du se statistikk for en annen spiller?',
        'Vil du sammenligne med et annet lag?'
      ]
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

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Handball AI service listening on port ${PORT}`);
});
