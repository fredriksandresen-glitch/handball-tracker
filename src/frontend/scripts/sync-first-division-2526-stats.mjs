import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "..");
const dataRoot = path.join(frontendRoot, "src", "data");
const compactOutputPath = path.join(
  dataRoot,
  "firstDivision2526PlayerStats.json",
);
const fullOutputPath = path.join(
  dataRoot,
  "firstDivision2526FullPlayerStats.json",
);
const seasonSpellsOutputPath = path.join(
  dataRoot,
  "playerSeasonSpells2526.json",
);
const identityRegistryPath = path.join(dataRoot, "playerIdentityRegistry.json");

const PRIME_URL = "https://admin.topphandball.no/apps/prime/prime.php";
const TOURNAMENT_ID = "436256";
const SEASON = "2025-26";
const TOURNAMENT_NAME = "1. divisjon kvinner, 2526";

const teams = [
  { id: "816397", name: "Aker Topphandball" },
  { id: "723391", name: "B\u00e6kkelaget" },
  { id: "710438", name: "Flint" },
  { id: "223999", name: "Gj\u00f8vik" },
  { id: "224837", name: "Glassverket" },
  { id: "224860", name: "Kjels\u00e5s" },
  { id: "224372", name: "Levanger" },
  { id: "802270", name: "Pors" },
  { id: "224507", name: "Stavanger" },
  { id: "224178", name: "Storhamar Rekrutt" },
  { id: "985298", name: "Trondheim Topphandball" },
  { id: "532136", name: "Utleira" },
  { id: "532788", name: "Volda" },
  { id: "453275", name: "\u00c5sane" },
];

function decodeHtml(value = "") {
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&aring;/gi, (match) => (match[1] === "A" ? "A" : "a"))
    .replace(/&oslash;/gi, (match) => (match[1] === "O" ? "O" : "o"))
    .replace(/&aelig;/gi, (match) => (match[1] === "A" ? "Ae" : "ae"))
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&ndash;/g, "-")
    .replace(/&#(d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function stripHtml(value = "") {
  return decodeHtml(
    String(value)
      .replace(/<span class="d-none">.*?<\/span>/gs, "")
      .replace(/<[^>]+>/g, ""),
  ).trim();
}

function normalize(value = "") {
  return stripHtml(value)
    .toLowerCase()
    .replace(/ae/g, "a")
    .replace(/oe/g, "o")
    .replace(/aa/g, "a")
    .replace(/\u00e6/g, "a")
    .replace(/\u00f8/g, "o")
    .replace(/\u00e5/g, "a")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toNumber(value) {
  const parsed = Number.parseFloat(
    stripHtml(value).replace("%", "").replace(",", "."),
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function toInt(value) {
  return Math.round(toNumber(value));
}

function parseDate(value) {
  const [day, month, year] = stripHtml(value).split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

async function postPrime(body) {
  const form = new URLSearchParams(body);
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(PRIME_URL, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: form,
      });
      if (!response.ok) throw new Error(`Prime returned ${response.status}`);
      const payload = await response.json();
      return payload.markup ?? "";
    } catch (error) {
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  return "";
}

function parseCells(row) {
  const cells = new Map();
  for (const cell of row.matchAll(
    /<t[dh][^>]*data-title="(?<title>[^"]+)"[^>]*>(?<value>.*?)<\/t[dh]>/gs,
  )) {
    cells.set(normalize(cell.groups.title), stripHtml(cell.groups.value));
  }
  return cells;
}

function parsePlayer(row) {
  const link = row.match(/player_id=(?<id>\d+)"[^>]*>(?<name>.*?)<\/a>/s);
  if (!link?.groups?.id) return null;
  return {
    playerId: link.groups.id,
    playerName: stripHtml(link.groups.name),
  };
}

function summaryFromCells(cells) {
  const read = (title) => cells.get(normalize(title));
  const shots = toInt(read("Total skudd"));
  const isGoalkeeper = cells.has(normalize("Redninger")) || cells.has(normalize("Redningsprosent"));
  const seasonStats = {
    matches: toInt(read("Antall kamper")),
    goals: toInt(read("Total m\u00e5l")),
    shots,
    shotPercentage: toNumber(read("Total uttelling")),
    assists: toInt(read("Assist")),
    technicalErrors: toInt(read("Teknisk feil")),
    suspensions: toInt(read("2 min utvisning")),
    mepAvg: toNumber(read("Snitt MEP")),
    mepTotal: toNumber(read("Total MEP")),
  };
  const goalkeeperStats = isGoalkeeper
    ? {
        saves: toInt(read("Redninger")),
        savePercentage: toNumber(read("Redningsprosent")),
        goalsConceded: toInt(read("Baklengsm\u00e5l")),
        shotsAgainst: shots,
      }
    : undefined;

  return {
    position: read("Posisjon") || null,
    playTime: read("Spillertid") || null,
    seasonStats,
    goalkeeperStats,
  };
}

async function getTeamSummaries(team) {
  const markup = await postPrime({
    template: "stats/table.php",
    id: team.id,
    queryString: `tournaments/${TOURNAMENT_ID}/incidents/?usenif&size=1000&summarized=true`,
    queryType: "stats_team",
    container: ".prime-stats-container",
  });
  const players = [];
  for (const rowMatch of markup.matchAll(
    /<tr class="prime-player-stats-row.*?<\/tr>/gs,
  )) {
    const player = parsePlayer(rowMatch[0]);
    if (!player) continue;
    players.push({
      ...player,
      ...summaryFromCells(parseCells(rowMatch[0])),
      teamId: team.id,
      teamName: team.name,
      league: "first-division",
      season: SEASON,
      recentMatches: [],
    });
  }
  return players;
}

async function getMatches() {
  const markup = await postPrime({
    template: "stats/statsmatches.php",
    id: TOURNAMENT_ID,
    queryString: `tournaments/${TOURNAMENT_ID}/matches/?size=500&from=#$#START#$#&to=#$#NOW#$#&sort=desc&usenif`,
    queryType: "stats_tournament",
    container: ".prime-stats-container",
  });
  const matches = [];
  const pattern = /<div class="matchstats-wrapper">\s*<button[^>]*data-id="(?<id>\d+)"[^>]*data-hometeam="(?<homeTeam>\d+)"[^>]*data-awayteam="(?<awayTeam>\d+)"(?<body>.*?)<\/button>/gs;
  for (const match of markup.matchAll(pattern)) {
    const body = match.groups.body;
    const date = body.match(
      /<span class="prime-date[^>]*>(?<date>.*?)<\/span>/s,
    )?.groups.date;
    const title = body.match(
      /<h3 class="prime-match-title[^>]*>(?<title>.*?)<\/h3>/s,
    )?.groups.title;
    const tournament = body.match(
      /<span class="prime-tournament prime-season[^>]*>(?<tournament>.*?)<\/span>/s,
    )?.groups.tournament;
    if (!date || !title || stripHtml(tournament) !== TOURNAMENT_NAME) continue;
    const [homeName, awayName] = stripHtml(title)
      .split(" - ")
      .map((part) => part.trim());
    if (!homeName || !awayName) continue;
    matches.push({
      matchId: match.groups.id,
      homeTeam: match.groups.homeTeam,
      awayTeam: match.groups.awayTeam,
      homeName,
      awayName,
      date: parseDate(date),
    });
  }
  return matches;
}

function deriveGoals(goalsValue, shotsValue, percentageValue) {
  const goals = toInt(goalsValue);
  const shots = toInt(shotsValue);
  const percentage = toNumber(percentageValue);
  if (goals > 0 || shots === 0 || percentage === 0) return goals;
  return Math.round((shots * percentage) / 100);
}

async function getMatchStats(match) {
  const markup = await postPrime({
    template: "stats/table.php",
    id: match.matchId,
    queryString: `matches/${match.matchId}/incidents/?usenif&size=1000`,
    queryType: "stats_matches",
    container: "",
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
  });
  const rows = [];
  for (const rowMatch of markup.matchAll(
    /<tr class="prime-player-stats-row.*?<\/tr>/gs,
  )) {
    const player = parsePlayer(rowMatch[0]);
    if (!player) continue;
    const cells = parseCells(rowMatch[0]);
    const read = (title) => cells.get(normalize(title));
    const totalShots = read("Total skudd");
    const totalPercentage = read("Total uttelling");
    const fieldShots = read("Spillerskudd");
    const fieldPercentage = read("Uttelling spill");
    const sevenMeterShots = read("Skudd 7m");
    const sevenMeterPercentage = read("Uttelling 7m");
    const teamId = player.playerId.startsWith(match.homeTeam)
      ? match.homeTeam
      : match.awayTeam;
    const homeAway = teamId === match.homeTeam ? "home" : "away";
    const isGoalkeeper = cells.has(normalize("Redninger")) || cells.has(normalize("Redningsprosent"));
    const entry = {
      matchId: match.matchId,
      date: match.date,
      opponent: homeAway === "home" ? match.awayName : match.homeName,
      homeAway,
      goals: deriveGoals(read("Total m\u00e5l"), totalShots, totalPercentage),
      shots: toInt(totalShots),
      shotPercentage: toNumber(totalPercentage),
      fieldGoals: deriveGoals(read("Spillerm\u00e5l"), fieldShots, fieldPercentage),
      fieldShots: toInt(fieldShots),
      fieldShotPercentage: toNumber(fieldPercentage),
      sevenMeterGoals: deriveGoals(read("M\u00e5l 7m"), sevenMeterShots, sevenMeterPercentage),
      sevenMeterShots: toInt(sevenMeterShots),
      sevenMeterShotPercentage: toNumber(sevenMeterPercentage),
      assists: toInt(read("Assist")),
      technicalErrors: toInt(read("Teknisk feil")),
      causedSevenMeters: toInt(read("For\u00e5rsaket 7m")),
      awardedSevenMeters: toInt(read("Tildelt 7m")),
      warnings: toInt(read("Advarsel")),
      suspensions: toInt(read("2 min utvisning")),
      redCards: toInt(read("R\u00f8dt kort")),
      playTime: read("Spillertid") || "00:00:00",
      mep: toNumber(read("Total MEP")),
    };
    if (isGoalkeeper) {
      entry.saves = toInt(read("Redninger"));
      entry.savePercentage = toNumber(read("Redningsprosent"));
      entry.goalsConceded = toInt(read("Baklengsm\u00e5l"));
      entry.shotsAgainst = toInt(read("Total skudd"));
    }
    rows.push({ playerId: player.playerId, teamId, entry });
  }
  return rows;
}

async function mapConcurrent(items, concurrency, task) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await task(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

function addIdentityMetadata(players, registry) {
  const identitiesByName = new Map();
  const identitiesByExternalId = new Map();
  for (const identity of registry.players ?? []) {
    const key = normalize(identity.displayName);
    const entries = identitiesByName.get(key) ?? [];
    entries.push(identity);
    identitiesByName.set(key, entries);
    for (const alias of identity.aliases ?? []) {
      identitiesByExternalId.set(String(alias.externalId), identity);
    }
  }
  for (const player of players) {
    const directIdentity = identitiesByExternalId.get(String(player.playerId));
    const identities = directIdentity
      ? [directIdentity]
      : (identitiesByName.get(normalize(player.playerName)) ?? []);
    if (identities.length !== 1) continue;
    const identity = identities[0];
    player.canonicalId = identity.canonicalId;
    player.canonicalPlayerId =
      identity.aliases?.find((alias) => alias.source === "club-roster")
        ?.externalId ?? player.playerId;
    if (
      identity.canonicalId === "1000095" &&
      normalize(player.teamName) === "kjelsas"
    ) {
      player.spellType = "loan";
    }
  }
}

function compactCurrentPlayerStats(players) {
  const compactByPlayerId = new Map();
  for (const player of players) {
    if (!player.canonicalPlayerId) continue;
    const playerId = String(player.canonicalPlayerId);
    const existing = compactByPlayerId.get(playerId);
    if (!existing) {
      compactByPlayerId.set(playerId, {
        playerId,
        seasonStats: { ...player.seasonStats },
        ...(player.goalkeeperStats
          ? { goalkeeperStats: { ...player.goalkeeperStats } }
          : {}),
        recentMatches: [],
      });
      continue;
    }

    const stats = existing.seasonStats;
    const incoming = player.seasonStats;
    for (const field of [
      "matches",
      "goals",
      "shots",
      "assists",
      "technicalErrors",
      "suspensions",
      "mepTotal",
    ]) {
      stats[field] = Number(stats[field] ?? 0) + Number(incoming[field] ?? 0);
    }
    stats.shotPercentage =
      stats.shots > 0
        ? Math.round((stats.goals / stats.shots) * 1000) / 10
        : 0;
    stats.mepTotal = Math.round(stats.mepTotal * 10) / 10;
    stats.mepAvg =
      stats.matches > 0
        ? Math.round((stats.mepTotal / stats.matches) * 10) / 10
        : 0;
  }
  return [...compactByPlayerId.values()].sort((left, right) =>
    left.playerId.localeCompare(right.playerId),
  );
}

function extractSeasonSpells(players) {
  return players
    .filter((player) => player.spellType && player.canonicalPlayerId)
    .map((player) => ({
      canonicalPlayerId: String(player.canonicalPlayerId),
      externalPlayerId: String(player.playerId),
      playerName: player.playerName,
      position: player.position,
      teamName: player.teamName,
      leagueId: player.league,
      seasonId: player.season,
      spellType: player.spellType,
      seasonStats: player.seasonStats,
      ...(player.goalkeeperStats
        ? { goalkeeperStats: player.goalkeeperStats }
        : {}),
      recentMatches: player.recentMatches,
    }));
}

async function main() {
  if (process.argv.includes("--reuse-generated")) {
    const summaries = JSON.parse(
      await readFile(fullOutputPath, "utf8").catch(() =>
        readFile(compactOutputPath, "utf8"),
      ),
    );
    const registry = JSON.parse(await readFile(identityRegistryPath, "utf8"));
    addIdentityMetadata(summaries, registry);
    const compactStats = compactCurrentPlayerStats(summaries);
    const seasonSpells = extractSeasonSpells(summaries);
    await writeFile(fullOutputPath, `${JSON.stringify(summaries)}\n`);
    await writeFile(
      compactOutputPath,
      `${JSON.stringify(compactStats, null, 2)}\n`,
    );
    await writeFile(
      seasonSpellsOutputPath,
      `${JSON.stringify(seasonSpells, null, 2)}\n`,
    );
    console.log(
      `Reused generated data: ${summaries.length} full, ${compactStats.length} compact players and ${seasonSpells.length} multi-club spells.`,
    );
    return;
  }

  console.log(`Fetching ${SEASON} summaries for ${teams.length} teams...`);
  const summaries = (
    await mapConcurrent(teams, 3, async (team) => {
      const players = await getTeamSummaries(team);
      console.log(`${team.name}: ${players.length} players`);
      return players;
    })
  ).flat();
  const playersById = new Map(
    summaries.map((player) => [player.playerId, player]),
  );

  const matches = await getMatches();
  console.log(`Fetching detailed statistics for ${matches.length} matches...`);
  const matchRows = await mapConcurrent(matches, 4, async (match, index) => {
    const rows = await getMatchStats(match);
    if ((index + 1) % 20 === 0 || index + 1 === matches.length) {
      console.log(`Matches: ${index + 1}/${matches.length}`);
    }
    return rows;
  });
  for (const rows of matchRows) {
    for (const { playerId, teamId, entry } of rows) {
      const player = playersById.get(playerId);
      if (!player || player.teamId !== teamId) continue;
      player.recentMatches.push(entry);
    }
  }

  for (const player of summaries) {
    player.recentMatches.sort((left, right) =>
      right.date.localeCompare(left.date),
    );
  }
  const registry = JSON.parse(await readFile(identityRegistryPath, "utf8"));
  addIdentityMetadata(summaries, registry);
  summaries.sort(
    (left, right) =>
      teams.findIndex((team) => team.id === left.teamId) -
        teams.findIndex((team) => team.id === right.teamId) ||
      left.playerName.localeCompare(right.playerName, "nb"),
  );
  await writeFile(fullOutputPath, `${JSON.stringify(summaries)}\n`);
  const compactStats = compactCurrentPlayerStats(summaries);
  const seasonSpells = extractSeasonSpells(summaries);
  await writeFile(
    compactOutputPath,
    `${JSON.stringify(compactStats, null, 2)}\n`,
  );
  await writeFile(
    seasonSpellsOutputPath,
    `${JSON.stringify(seasonSpells, null, 2)}\n`,
  );

  const linnea = summaries.find(
    (player) => normalize(player.playerName) === "linnea aula",
  );
  console.log(
    `Wrote ${summaries.length} full, ${compactStats.length} compact players and ${seasonSpells.length} multi-club spells. Linnea: ${linnea?.seasonStats.goals ?? "not found"} goals, ${linnea?.recentMatches.length ?? 0} matches.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
