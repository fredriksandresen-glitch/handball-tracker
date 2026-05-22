const fs = require('fs');

const PRIME_URL = 'https://topphandball.nth2025.webcore.no/apps/prime/prime.php';
const TEAM_ID = '223982';
const TOURNAMENT_ID = '436336';
const ROSTER_PATH = 'src/frontend/src/data/fjellhammerRoster.json';
const STATS_PATH = 'src/frontend/src/data/fjellhammerPlayerStats.json';

async function prime(data) {
  const body = new URLSearchParams({
    ...data,
    admin_settings: '{}',
    site_settings: '{}',
  });
  const response = await fetch(PRIME_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body,
  });
  const text = await response.text();
  const json = JSON.parse(text);
  if (json.result !== 'success') {
    throw new Error(`Prime request failed: ${text.slice(0, 300)}`);
  }
  return json.markup;
}

function stripHtml(html) {
  return html
    .replace(/<span class="d-none">[\s\S]*?<\/span>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).replace('%', '').replace(',', '.').trim();
  if (!normalized || normalized === '-') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInt(value) {
  const parsed = toNumber(value);
  return parsed === null ? 0 : Math.trunc(parsed);
}

function round1(value) {
  return value === null || value === undefined ? null : Math.round(value * 10) / 10;
}

function parsePlayerRows(markup) {
  const rows = [];
  const rowMatches = markup.matchAll(/<tr class="prime-player-stats-row[\s\S]*?<\/tr>/g);

  for (const rowMatch of rowMatches) {
    const row = rowMatch[0];
    const playerMatch = row.match(/player_id=(\d+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!playerMatch) continue;

    const cells = {};
    const cellMatches = row.matchAll(/<t[dh][^>]*data-title="([^"]+)"[^>]*>([\s\S]*?)<\/t[dh]>/g);
    for (const cellMatch of cellMatches) {
      const title = cellMatch[1];
      if (!title || title === 'Spiller' || title === 'Posisjon') continue;
      cells[title] = stripHtml(cellMatch[2]);
    }

    rows.push({
      id: playerMatch[1],
      name: stripHtml(playerMatch[2]),
      cells,
    });
  }

  return rows;
}

function parseDate(dateText) {
  const match = dateText.trim().match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

function parseMatches(markup) {
  const matches = [];
  const buttonMatches = markup.matchAll(/<button class="prime-icon expander matchstats-expander[\s\S]*?<\/button>/g);

  for (const buttonMatch of buttonMatches) {
    const button = buttonMatch[0];
    const matchId = button.match(/data-id="(\d+)"/)?.[1];
    const homeTeamId = button.match(/data-hometeam="(\d+)"/)?.[1];
    const awayTeamId = button.match(/data-awayteam="(\d+)"/)?.[1];
    const date = parseDate(stripHtml(button.match(/<span class="prime-date[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? ''));
    const title = stripHtml(button.match(/<h3 class="prime-match-title[^>]*>([\s\S]*?)<\/h3>/)?.[1] ?? '');
    const score = stripHtml(button.match(/<span class="prime-arena[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '');

    if (!matchId || !homeTeamId || !awayTeamId) continue;
    if (homeTeamId !== TEAM_ID && awayTeamId !== TEAM_ID) continue;

    const [homeName, awayName] = title.split(' - ').map((part) => part.trim());
    matches.push({
      matchId,
      homeTeamId,
      awayTeamId,
      date,
      homeName,
      awayName,
      score,
      opponent: homeTeamId === TEAM_ID ? awayName : homeName,
      homeAway: homeTeamId === TEAM_ID ? 'home' : 'away',
    });
  }

  return matches;
}

function buildSeasonStats(cells, isKeeper) {
  return {
    matches: toInt(cells['Antall kamper']),
    goals: toInt(cells['Total mål'] ?? cells.Mål),
    shots: toInt(cells['Total skudd']),
    shotPercentage: isKeeper ? null : round1(toNumber(cells['Total uttelling'])),
    assists: toInt(cells.Assist),
    technicalErrors: toInt(cells['Teknisk feil']),
    suspensions: toInt(cells['2 min utvisning']),
    mepAvg: round1(toNumber(cells['Snitt MEP'])),
    mepTotal: round1(toNumber(cells['Total MEP'])),
  };
}

function buildGoalkeeperStats(cells) {
  return {
    saves: toInt(cells.Redninger),
    savePercentage: round1(toNumber(cells.Redningsprosent)),
    goalsConceded: toInt(cells.Baklengsmål),
    shotsAgainst: toInt(cells['Total skudd']),
  };
}

function buildMatchStats(match, cells, isKeeper) {
  const entry = {
    matchId: match.matchId,
    date: match.date,
    opponent: match.opponent,
    homeAway: match.homeAway,
    goals: toInt(cells['Total mål'] ?? cells.Mål),
    shots: toInt(cells['Total skudd']),
    assists: toInt(cells.Assist),
    technicalErrors: toInt(cells['Teknisk feil']),
    suspensions: toInt(cells['2 min utvisning']),
    mep: toNumber(cells['Total MEP']) ?? 0,
  };

  if (isKeeper) {
    entry.saves = toInt(cells.Redninger);
    entry.savePercentage = round1(toNumber(cells.Redningsprosent));
    entry.goalsConceded = toInt(cells.Baklengsmål);
    entry.shotsAgainst = toInt(cells['Total skudd']);
    entry.shots = entry.shotsAgainst;
  }

  return entry;
}

async function main() {
  const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf8'));
  const rosterById = Object.fromEntries(roster.map((player) => [player.id, player]));

  const seasonMarkup = await prime({
    template: 'stats/table.php',
    id: TEAM_ID,
    queryString: `tournaments/${TOURNAMENT_ID}/incidents/?usenif&size=1000&summarized=true`,
    queryType: 'stats_team',
    container: '.prime-stats-container',
  });
  const seasonRows = parsePlayerRows(seasonMarkup).filter((row) => rosterById[row.id]);
  const seasonById = Object.fromEntries(seasonRows.map((row) => [row.id, row]));

  const matchListMarkup = await prime({
    template: 'stats/statsmatches.php',
    id: TOURNAMENT_ID,
    queryString: `tournaments/${TOURNAMENT_ID}/matches/?size=500&from=#$#START#$#&to=#$#NOW#$#&sort=desc&usenif`,
    queryType: 'stats_tournament',
    container: '.prime-stats-container',
  });
  const matches = parseMatches(matchListMarkup);

  const matchRowsByPlayer = {};
  for (const match of matches) {
    const matchMarkup = await prime({
      template: 'stats/table.php',
      id: match.matchId,
      queryString: `matches/${match.matchId}/incidents/?usenif&size=1000`,
      queryType: 'stats_matches',
      container: '',
      homeTeam: match.homeTeamId,
      awayTeam: match.awayTeamId,
    });

    const rows = parsePlayerRows(matchMarkup).filter((row) => rosterById[row.id]);
    for (const row of rows) {
      const isKeeper = rosterById[row.id].position.toLowerCase().includes('målvakt') || row.cells.Redninger !== undefined;
      const entry = buildMatchStats(match, row.cells, isKeeper);
      if (!matchRowsByPlayer[row.id]) matchRowsByPlayer[row.id] = [];
      matchRowsByPlayer[row.id].push(entry);
    }
  }

  const stats = roster.map((player) => {
    const row = seasonById[player.id];
    const cells = row?.cells ?? {};
    const isKeeper = player.position.toLowerCase().includes('målvakt') || cells.Redninger !== undefined;
    const item = {
      playerId: player.id,
      seasonStats: buildSeasonStats(cells, isKeeper),
      recentMatches: matchRowsByPlayer[player.id] ?? [],
    };

    if (isKeeper) {
      item.goalkeeperStats = buildGoalkeeperStats(cells);
    }

    return item;
  });

  fs.writeFileSync(STATS_PATH, `${JSON.stringify(stats, null, 2)}\n`);

  const summary = {
    players: stats.length,
    seasonRows: seasonRows.length,
    matches: matches.length,
    matchRows: Object.values(matchRowsByPlayer).reduce((sum, rows) => sum + rows.length, 0),
    missingSeason: stats
      .filter((item) => !seasonById[item.playerId])
      .map((item) => rosterById[item.playerId].name),
  };
  fs.writeFileSync('scripts/fjellhammer-stats-sync-summary.json', `${JSON.stringify(summary, null, 2)}\n`);

  for (const path of [
    '.github/workflows/sync-fjellhammer-stats.yml',
    'scripts/sync-fjellhammer-stats.cjs',
    'scripts/.sync-fjellhammer-stats-trigger',
  ]) {
    if (fs.existsSync(path)) fs.rmSync(path, { force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
