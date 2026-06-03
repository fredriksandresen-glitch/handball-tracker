import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "..");
const dataRoot = path.join(frontendRoot, "src", "data");
const PRIME_URL = "https://admin.topphandball.no/apps/prime/prime.php";
const TOURNAMENT_NAME = "REMA 1000-ligaen kvinner, 2526";

const teams = [
  { name: "Fjellhammer", id: "223982", stats: "fjellhammerPlayerStats.json" },
  { name: "Larvik", id: "223994", stats: "larvikPlayerStats.json" },
  { name: "Fana", id: "225474", stats: "fanaPlayerStats.json" },
  { name: "Fredrikstad", id: "441651", stats: "fredrikstadPlayerStats.json" },
  { name: "Gjerpen", id: "453373", stats: "gjerpenPlayerStats.json" },
  { name: "Byåsen", id: "454116", stats: "byaasenPlayerStats.json" },
  { name: "Molde", id: "775789", stats: "moldePlayerStats.json" },
  { name: "Sola", id: "223983", stats: "solaPlayerStats.json" },
];

function stripHtml(value = "") {
  return String(value)
    .replace(/<span class="d-none">.*?<\/span>/gs, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&aring;/g, "å")
    .replace(/&oslash;/g, "ø")
    .replace(/&aelig;/g, "æ")
    .replace(/&Aring;/g, "Å")
    .replace(/&Oslash;/g, "Ø")
    .replace(/&AElig;/g, "Æ")
    .replace(/&amp;/g, "&")
    .trim();
}

function toNumber(value) {
  const clean = stripHtml(value).replace("%", "").replace(",", ".");
  const parsed = Number.parseFloat(clean);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toInt(value) {
  return Math.round(toNumber(value));
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function parseDate(value) {
  const [day, month, year] = stripHtml(value).split("/").map((part) => part.trim().padStart(2, "0"));
  return `${year}-${month}-${day}`;
}

async function postPrime(body) {
  const form = new URLSearchParams(body);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(PRIME_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: form,
      });

      if (!response.ok) throw new Error(`Prime returned ${response.status}`);
      const text = await response.text();
      const json = JSON.parse(text);
      return json.markup ?? "";
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  return "";
}

async function getTeamMatches(team) {
  const queryString = `teams/${team.id}/matches/?size=500&from=#$#START#$#&to=#$#NOW#$#&sort=desc&usenif`;
  const markup = await postPrime({
    template: "stats/statsmatches.php",
    id: team.id,
    queryString,
    queryType: "stats_team",
    container: ".prime-stats-container",
  });

  const matches = [];
  const blockPattern = /<div class="matchstats-wrapper">\s*<button[^>]*data-id="(?<id>\d+)"[^>]*data-hometeam="(?<homeTeam>\d+)"[^>]*data-awayteam="(?<awayTeam>\d+)"(?<body>.*?)<\/button>/gs;

  for (const match of markup.matchAll(blockPattern)) {
    const body = match.groups.body;
    const date = body.match(/<span class="prime-date[^>]*>(?<date>.*?)<\/span>/s)?.groups.date;
    const title = body.match(/<h3 class="prime-match-title[^>]*>(?<title>.*?)<\/h3>/s)?.groups.title;
    const tournament = body.match(/<span class="prime-tournament prime-season[^>]*>(?<tournament>.*?)<\/span>/s)?.groups.tournament;

    if (!date || !title || stripHtml(tournament) !== TOURNAMENT_NAME) continue;

    const [homeName, awayName] = stripHtml(title).split(" - ").map((part) => part.trim());
    if (!homeName || !awayName) continue;

    const homeAway = homeName === team.name ? "home" : "away";
    matches.push({
      matchId: match.groups.id,
      homeTeam: match.groups.homeTeam,
      awayTeam: match.groups.awayTeam,
      date: parseDate(date),
      title: `${homeName} - ${awayName}`,
      opponent: homeAway === "home" ? awayName : homeName,
      homeAway,
    });
  }

  return matches;
}

async function parseMatchStats(match) {
  const markup = await postPrime({
    template: "stats/table.php",
    id: match.matchId,
    queryString: `matches/${match.matchId}/incidents/?usenif&size=1000`,
    queryType: "stats_matches",
    container: "",
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
  });

  const rows = new Map();
  for (const rowMatch of markup.matchAll(/<tr class="prime-player-stats-row.*?<\/tr>/gs)) {
    const row = rowMatch[0];
    const player = row.match(/player_id=(?<id>\d+)"[^>]*>(?<name>.*?)<\/a>/s);
    if (!player?.groups?.id) continue;

    const cells = new Map();
    for (const cell of row.matchAll(/<t[dh][^>]*data-title="(?<title>[^"]+)"[^>]*>(?<value>.*?)<\/t[dh]>/gs)) {
      cells.set(stripHtml(cell.groups.title), stripHtml(cell.groups.value));
    }

    const isKeeper = cells.has("Redninger") || cells.has("Redningsprosent");
    const entry = {
      matchId: match.matchId,
      date: match.date,
      opponent: match.opponent,
      homeAway: match.homeAway,
      goals: toInt(cells.get("Total mål") ?? cells.get("Mål")),
      shots: toInt(cells.get("Total skudd")),
      shotPercentage: toNumber(cells.get("Total uttelling")),
      fieldGoals: toInt(cells.get("Spillermål")),
      fieldShots: toInt(cells.get("Spillerskudd")),
      fieldShotPercentage: toNumber(cells.get("Uttelling spill")),
      sevenMeterGoals: toInt(cells.get("Mål 7m")),
      sevenMeterShots: toInt(cells.get("Skudd 7m")),
      sevenMeterShotPercentage: toNumber(cells.get("Uttelling 7m")),
      assists: toInt(cells.get("Assist")),
      technicalErrors: toInt(cells.get("Teknisk feil")),
      causedSevenMeters: toInt(cells.get("Forårsaket 7m")),
      awardedSevenMeters: toInt(cells.get("Tildelt 7m")),
      warnings: toInt(cells.get("Advarsel")),
      suspensions: toInt(cells.get("2 min utvisning")),
      redCards: toInt(cells.get("Rødt kort")),
      playTime: stripHtml(cells.get("Spillertid")),
      mep: toNumber(cells.get("Total MEP")),
    };

    if (isKeeper) {
      entry.saves = toInt(cells.get("Redninger"));
      entry.savePercentage = toNumber(cells.get("Redningsprosent"));
      entry.goalsConceded = toInt(cells.get("Baklengsmål"));
      entry.shotsAgainst = toInt(cells.get("Total skudd"));
    }

    rows.set(player.groups.id, entry);
  }

  return rows;
}

function aggregateSeason(row) {
  const matches = row.recentMatches ?? [];
  const sum = (key) =>
    matches.reduce((total, match) => total + (Number(match[key]) || 0), 0);
  const matchCount = matches.length;
  const goals = sum("goals");
  const shots = sum("shots");
  const assists = sum("assists");
  const technicalErrors = sum("technicalErrors");
  const suspensions = sum("suspensions");
  const mepTotal = round1(sum("mep"));

  row.seasonStats = {
    matches: matchCount,
    goals,
    shots,
    shotPercentage: shots > 0 ? round1((goals / shots) * 100) : 0,
    assists,
    technicalErrors,
    suspensions,
    mepAvg: matchCount > 0 ? round1(mepTotal / matchCount) : 0,
    mepTotal,
  };

  const saves = sum("saves");
  const shotsAgainst = sum("shotsAgainst");
  if (shotsAgainst > 0 || row.goalkeeperStats) {
    const goalsConceded = sum("goalsConceded");
    const savePercentage =
      shotsAgainst > 0 ? round1((saves / shotsAgainst) * 100) : 0;

    row.seasonStats.shots = shotsAgainst;
    row.seasonStats.shotPercentage = savePercentage;
    row.goalkeeperStats = {
      saves,
      savePercentage,
      goalsConceded,
      shotsAgainst,
    };
  }
}

async function enrichTeam(team, matchStatsCache) {
  const statsPath = path.join(dataRoot, team.stats);
  const statsRows = JSON.parse(
    (await readFile(statsPath, "utf8")).replace(/^\uFEFF/, ""),
  );
  const histories = new Map(statsRows.map((row) => [String(row.playerId), []]));
  const matches = await getTeamMatches(team);

  console.log(`Full match history: ${team.name}, ${matches.length} league matches`);

  for (const match of matches) {
    if (!matchStatsCache.has(match.matchId)) {
      matchStatsCache.set(match.matchId, await parseMatchStats(match));
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    const rows = matchStatsCache.get(match.matchId);
    for (const [playerId, list] of histories.entries()) {
      const entry = rows.get(playerId);
      if (entry) list.push(entry);
    }
  }

  for (const row of statsRows) {
    row.recentMatches = histories
      .get(String(row.playerId))
      .sort((a, b) => b.date.localeCompare(a.date));
    aggregateSeason(row);
  }

  await writeFile(statsPath, `${JSON.stringify(statsRows)}\n`);
}

async function main() {
  if (process.env.SKIP_MATCH_HISTORY_ENRICHMENT === "1") {
    console.log("Skipping full match history enrichment.");
    return;
  }

  try {
    const matchStatsCache = new Map();
    for (const team of teams) {
      await enrichTeam(team, matchStatsCache);
    }
  } catch (error) {
    console.warn("Full match history enrichment failed, continuing with checked-in data.");
    console.warn(error);
  }
}

await main();
