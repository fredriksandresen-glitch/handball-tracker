const fs = require("node:fs");
const path = require("node:path");

const TEAM_ID = "223994";
const TEAM_NAME = "Larvik";
const TEAM_LOGO_URL = "https://www.larvikhk.no/wp-content/uploads/sites/7/2019/08/larvikhk.svg";
const SEASON = "2526";
const TOURNAMENT_ID = "436336";
const TOURNAMENT = "REMA 1000-ligaen kvinner";
const PRIME_URL = "https://topphandball.nth2025.webcore.no/apps/prime/prime.php";

const root = process.env.GITHUB_WORKSPACE || process.cwd();
const srcRoot = path.join(root, "src", "frontend", "src");
const dataDir = path.join(srcRoot, "data");

function decodeEntities(value = "") {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;/g, "-")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(html = "") {
  return decodeEntities(html.replace(/<[^>]+>/g, " "));
}

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const normalized = String(value)
    .replace(/\s+/g, "")
    .replace("%", "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeName(value) {
  return decodeEntities(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function prime(data) {
  const body = new URLSearchParams({
    ...data,
    admin_settings: "{}",
    site_settings: "{}",
  });
  const response = await fetch(PRIME_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body,
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Prime returned non-JSON: ${text.slice(0, 300)}`);
  }
  if (payload.result !== "success") {
    throw new Error(`Prime failed: ${text.slice(0, 300)}`);
  }
  return payload.markup || "";
}

function parseRoster(markup) {
  const cards = [...markup.matchAll(/<div class="prime-roster-card"[\s\S]*?(?=<div class="prime-roster-card"|$)/g)];
  return cards
    .map((match) => {
      const card = match[0];
      const id = card.match(/player_id=(\d+)/)?.[1] || "";
      const number = toNumber(card.match(/data-player-number="([^"]+)"/)?.[1]);
      const imageUrl = decodeEntities(card.match(/background:url\(([^)]+)\)/)?.[1] || "");
      const title = stripHtml(card.match(/<h2 class="title prime-player w-100">([\s\S]*?)<\/h2>/)?.[1] || "");
      const name = title.replace(/^\d+\s*:\s*/, "").trim();
      const hidden = stripHtml(card.match(/<small class="d-none">([\s\S]*?)<\/small>/)?.[1] || "");
      const hiddenParts = hidden.split(",").map((part) => part.trim()).filter(Boolean);
      const position = hiddenParts.at(-1) || "Bakspiller";
      if (!id || !name) return null;
      return { id, name, imageUrl, position, shirtNumber: number };
    })
    .filter(Boolean)
    .sort((a, b) => a.shirtNumber - b.shirtNumber || a.name.localeCompare(b.name, "nb"));
}

function parseCells(row) {
  const cells = {};
  const regex = /<td[^>]*data-title="([^"]*)"[^>]*>([\s\S]*?)<\/td>/g;
  for (const match of row.matchAll(regex)) {
    cells[decodeEntities(match[1])] = stripHtml(match[2]);
  }
  return cells;
}

function parsePlayerRows(markup) {
  const rows = [...markup.matchAll(/<tr[\s\S]*?<\/tr>/g)];
  return rows
    .map((match) => {
      const row = match[0];
      const playerId = row.match(/player_id=(\d+)/)?.[1] || row.match(/data-player-id="(\d+)"/)?.[1] || "";
      const cells = parseCells(row);
      const name =
        cells.Spiller ||
        cells.Navn ||
        stripHtml(row.match(/<a[^>]*player_id=\d+[^>]*>([\s\S]*?)<\/a>/)?.[1] || "");
      if (!playerId || !name) return null;
      return { playerId, name, cells };
    })
    .filter(Boolean);
}

function parseMatches(markup) {
  const wrappers = [
    ...markup.matchAll(/<div class="matchstats-wrapper">[\s\S]*?(?=<div class="matchstats-wrapper"|$)/g),
  ];
  return wrappers
    .map((match) => {
      const wrapper = match[0];
      const button = wrapper.match(/<button[\s\S]*?<\/button>/)?.[0] || wrapper;
      const homeTeamId = button.match(/data-hometeam="(\d+)"/)?.[1];
      const awayTeamId = button.match(/data-awayteam="(\d+)"/)?.[1];
      if (homeTeamId !== TEAM_ID && awayTeamId !== TEAM_ID) return null;
      const matchId = button.match(/data-id="(\d+)"/)?.[1] || "";
      const rawDate = stripHtml(button.match(/<span class="prime-date[^"]*">([\s\S]*?)<\/span>/)?.[1] || "");
      const dateParts = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      const date = dateParts ? `${dateParts[3]}-${dateParts[2]}-${dateParts[1]}` : rawDate;
      const teamsText = stripHtml(button.match(/<h3 class="prime-match-title[^"]*">([\s\S]*?)<\/h3>/)?.[1] || "");
      if (!matchId) return null;
      return { matchId, date, teamsText, homeTeamId, awayTeamId };
    })
    .filter(Boolean);
}

function inferOpponent(match) {
  const clean = decodeEntities(match.teamsText).replace(/\s+/g, " ").trim();
  const parts = clean
    .split(/\s+-\s+|\s+–\s+|\s+vs\.?\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  const larvikIndex = parts.findIndex((part) => normalizeName(part).includes("larvik"));
  if (larvikIndex >= 0 && parts.length > 1) {
    return parts[larvikIndex === 0 ? 1 : 0].replace(/\d+.*$/, "").trim();
  }
  return clean.replace(/Larvik/gi, "").replace(/\d+[-:]\d+.*/, "").trim() || undefined;
}

function homeAway(match) {
  if (match.homeTeamId === TEAM_ID) return "home";
  if (match.awayTeamId === TEAM_ID) return "away";
  return undefined;
}

function pick(cells, labels) {
  for (const label of labels) {
    if (cells[label] !== undefined && cells[label] !== "") return cells[label];
  }
  return undefined;
}

function buildSeasonStats(row, isKeeper) {
  const cells = row?.cells || {};
  const matches = toNumber(pick(cells, ["Kamper", "K", "Antall kamper"]));
  const mepTotal = toNumber(pick(cells, ["MEP", "Total MEP", "Mep"]));
  const mepAvg =
    matches > 0
      ? Number((mepTotal / matches).toFixed(2))
      : toNumber(pick(cells, ["Snitt MEP", "MEP snitt"]));

  if (isKeeper) {
    const saves = toNumber(pick(cells, ["Redninger", "Redn.", "R"]));
    const goalsConceded = toNumber(
      pick(cells, ["Baklengsmål", "Mål imot", "Baklengs", "Mål mot"]),
    );
    const shotsAgainst =
      toNumber(pick(cells, ["Skudd mot", "Skudd", "S"])) || saves + goalsConceded;
    const savePercentage =
      toNumber(pick(cells, ["Redningsprosent", "Redning %", "Red%", "Uttelling %"])) ||
      (shotsAgainst > 0 ? Number(((saves / shotsAgainst) * 100).toFixed(1)) : 0);

    return {
      seasonStats: {
        matches,
        goals: toNumber(pick(cells, ["Total mål", "Mål", "M"])),
        shots: shotsAgainst,
        shotPercentage: savePercentage,
        assists: toNumber(pick(cells, ["Assist", "Assists", "A"])),
        technicalErrors: toNumber(pick(cells, ["Teknisk feil", "Tekniske feil", "TF"])),
        suspensions: toNumber(pick(cells, ["2 min utvisning", "2 min", "Utvisninger"])),
        mepAvg,
        mepTotal,
      },
      goalkeeperStats: { saves, savePercentage, goalsConceded, shotsAgainst },
    };
  }

  return {
    seasonStats: {
      matches,
      goals: toNumber(pick(cells, ["Total mål", "Mål", "M"])),
      shots: toNumber(pick(cells, ["Total skudd", "Skudd", "S"])),
      shotPercentage: toNumber(pick(cells, ["Total uttelling", "Uttelling %", "Skudd %", "Mål %"])),
      assists: toNumber(pick(cells, ["Assist", "Assists", "A"])),
      technicalErrors: toNumber(pick(cells, ["Teknisk feil", "Tekniske feil", "TF"])),
      suspensions: toNumber(pick(cells, ["2 min utvisning", "2 min", "Utvisninger"])),
      mepAvg,
      mepTotal,
    },
  };
}

function buildMatchStats(row, match, isKeeper) {
  const cells = row?.cells || {};
  const base = {
    matchId: match.matchId,
    date: match.date,
    opponent: inferOpponent(match),
    homeAway: homeAway(match),
    goals: toNumber(pick(cells, ["Total mål", "Mål", "M"])),
    shots: toNumber(pick(cells, ["Total skudd", "Skudd", "S"])),
    assists: toNumber(pick(cells, ["Assist", "Assists", "A"])),
    technicalErrors: toNumber(pick(cells, ["Teknisk feil", "Tekniske feil", "TF"])),
    suspensions: toNumber(pick(cells, ["2 min utvisning", "2 min", "Utvisninger"])),
    mep: toNumber(pick(cells, ["Total MEP", "MEP", "Mep"])),
  };

  if (!isKeeper) return base;

  const saves = toNumber(pick(cells, ["Redninger", "Redn.", "R"]));
  const goalsConceded = toNumber(
    pick(cells, ["Baklengsmål", "Mål imot", "Baklengs", "Mål mot"]),
  );
  const shotsAgainst =
    toNumber(pick(cells, ["Skudd mot", "Skudd", "S"])) || saves + goalsConceded;
  const savePercentage =
    toNumber(pick(cells, ["Redningsprosent", "Redning %", "Red%", "Uttelling %"])) ||
    (shotsAgainst > 0 ? Number(((saves / shotsAgainst) * 100).toFixed(1)) : 0);

  return { ...base, saves, savePercentage, goalsConceded, shotsAgainst };
}

function patchFile(filePath, patcher) {
  const before = fs.readFileSync(filePath, "utf8");
  const after = patcher(before);
  if (after === before) return false;
  fs.writeFileSync(filePath, after);
  return true;
}

function patchService() {
  const filePath = path.join(srcRoot, "services", "clawdbotPlayerProfile.ts");
  patchFile(filePath, (source) => {
    let output = source
      .replace(
        'import playerStatsData from "../data/fjellhammerPlayerStats.json";\nimport fjellhammerRosterData from "../data/fjellhammerRoster.json";',
        'import fjellhammerPlayerStatsData from "../data/fjellhammerPlayerStats.json";\nimport fjellhammerRosterData from "../data/fjellhammerRoster.json";\nimport larvikPlayerStatsData from "../data/larvikPlayerStats.json";\nimport larvikRosterData from "../data/larvikRoster.json";',
      )
      .replace(
        'const DEFAULT_TEAM = "Fjellhammer";\nconst DEFAULT_TEAM_LOGO_URL =\n  "https://www.fjellhammer.no/wp-content/uploads/sites/19/2020/01/fjellhammer.svg";',
        'const FJELLHAMMER_LOGO_URL =\n  "https://www.fjellhammer.no/wp-content/uploads/sites/19/2020/01/fjellhammer.svg";\nconst LARVIK_LOGO_URL =\n  "https://www.larvikhk.no/wp-content/uploads/sites/7/2019/08/larvikhk.svg";',
      );

    const oldBlock = `const FJELLHAMMER_ROSTER = fjellhammerRosterData as StaticRosterPlayer[];
const PLAYER_STATS = playerStatsData as StaticPlayerStats[];
const PLAYER_STATS_BY_ID = Object.fromEntries(
  PLAYER_STATS.map((stats) => [stats.playerId, stats]),
);

function createStaticProfile(player: StaticRosterPlayer): ClawdbotPlayerProfile {
  const playerStats = PLAYER_STATS_BY_ID[player.id];

  return {
    player: {
      id: player.id,
      name: player.name,
      imageUrl: player.imageUrl,
      team: DEFAULT_TEAM,
      position: player.position,
      shirtNumber: player.shirtNumber,
      season: DEFAULT_SEASON,
      tournament: DEFAULT_TOURNAMENT,
    },
    seasonStats: playerStats?.seasonStats ?? {},
    goalkeeperStats: playerStats?.goalkeeperStats,
    recentMatches: playerStats?.recentMatches ?? [],
  };
}

const STATIC_PLAYER_PROFILES: Record<string, ClawdbotPlayerProfile> =
  Object.fromEntries(
    FJELLHAMMER_ROSTER.map((player) => [player.id, createStaticProfile(player)]),
  );`;

    const newBlock = `type StaticTeamConfig = {
  name: string;
  logoUrl: string;
  roster: StaticRosterPlayer[];
  statsById: Record<string, StaticPlayerStats>;
};

function statsById(stats: StaticPlayerStats[]) {
  return Object.fromEntries(stats.map((item) => [item.playerId, item]));
}

const STATIC_TEAM_CONFIGS: StaticTeamConfig[] = [
  {
    name: "Fjellhammer",
    logoUrl: FJELLHAMMER_LOGO_URL,
    roster: fjellhammerRosterData as StaticRosterPlayer[],
    statsById: statsById(fjellhammerPlayerStatsData as StaticPlayerStats[]),
  },
  {
    name: "Larvik",
    logoUrl: LARVIK_LOGO_URL,
    roster: larvikRosterData as StaticRosterPlayer[],
    statsById: statsById(larvikPlayerStatsData as StaticPlayerStats[]),
  },
];

const STATIC_TEAM_LOGOS = Object.fromEntries(
  STATIC_TEAM_CONFIGS.map((team) => [team.name.toLowerCase(), team.logoUrl]),
);

function createStaticProfile(
  player: StaticRosterPlayer,
  team: StaticTeamConfig,
): ClawdbotPlayerProfile {
  const playerStats = team.statsById[player.id];

  return {
    player: {
      id: player.id,
      name: player.name,
      imageUrl: player.imageUrl,
      team: team.name,
      position: player.position,
      shirtNumber: player.shirtNumber,
      season: DEFAULT_SEASON,
      tournament: DEFAULT_TOURNAMENT,
    },
    seasonStats: playerStats?.seasonStats ?? {},
    goalkeeperStats: playerStats?.goalkeeperStats,
    recentMatches: playerStats?.recentMatches ?? [],
  };
}

const STATIC_PLAYER_PROFILES: Record<string, ClawdbotPlayerProfile> =
  Object.fromEntries(
    STATIC_TEAM_CONFIGS.flatMap((team) =>
      team.roster.map((player) => [player.id, createStaticProfile(player, team)]),
    ),
  );`;

    output = output.replace(oldBlock, newBlock);
    output = output.replace(
      `function teamLogoUrl(team?: string | null) {
  return (team ?? "").toLowerCase().includes("fjellhammer")
    ? DEFAULT_TEAM_LOGO_URL
    : undefined;
}`,
      `function teamLogoUrl(team?: string | null) {
  const normalized = (team ?? "").toLowerCase();
  return Object.entries(STATIC_TEAM_LOGOS).find(([key]) =>
    normalized.includes(key),
  )?.[1];
}`,
    );
    if (output.includes("DEFAULT_TEAM") || output.includes("DEFAULT_TEAM_LOGO_URL")) {
      throw new Error("Service patch left old team constants behind");
    }
    return output;
  });
}

function patchPlayerPage() {
  const filePath = path.join(srcRoot, "pages", "PlayerPage.tsx");
  patchFile(filePath, (source) =>
    source.replace(
      `const CLUB_LOGOS: Record<string, string> = {
  fjellhammer:
    "https://www.fjellhammer.no/wp-content/uploads/sites/19/2020/01/fjellhammer.svg",
};`,
      `const CLUB_LOGOS: Record<string, string> = {
  fjellhammer:
    "https://www.fjellhammer.no/wp-content/uploads/sites/19/2020/01/fjellhammer.svg",
  larvik: "https://www.larvikhk.no/wp-content/uploads/sites/7/2019/08/larvikhk.svg",
};`,
    ),
  );
}

async function main() {
  const rosterMarkup = await prime({
    template: "listing/players/roster.php",
    id: TEAM_ID,
    queryString: `teams/${TEAM_ID}/players?usenif&size=500`,
    queryType: "roster-players",
    container: ".prime-roster-all.players",
  });
  const roster = parseRoster(rosterMarkup);
  if (roster.length < 10) {
    throw new Error(`Expected Larvik roster, got ${roster.length} players`);
  }

  const seasonMarkup = await prime({
    template: "stats/table.php",
    id: TEAM_ID,
    queryString: `tournaments/${TOURNAMENT_ID}/incidents/?usenif&size=1000&summarized=true`,
    queryType: "stats_team",
    container: ".prime-stats-container",
  });
  const seasonRows = parsePlayerRows(seasonMarkup);
  const seasonById = Object.fromEntries(seasonRows.map((row) => [row.playerId, row]));

  const matchesMarkup = await prime({
    template: "stats/statsmatches.php",
    id: TOURNAMENT_ID,
    queryString: `tournaments/${TOURNAMENT_ID}/matches/?size=500&from=#$#START#$#&to=#$#NOW#$#&sort=desc&usenif`,
    queryType: "stats_tournament",
    container: ".prime-stats-container",
  });
  const matches = parseMatches(matchesMarkup);

  const matchRowsByPlayer = new Map();
  let incidentRowCount = 0;
  for (const match of matches) {
    const markup = await prime({
      template: "stats/table.php",
      id: match.matchId,
      queryString: `matches/${match.matchId}/incidents/?usenif&size=1000`,
      queryType: "stats_matches",
      container: "",
      homeTeam: match.homeTeamId || "",
      awayTeam: match.awayTeamId || "",
    });
    const rows = parsePlayerRows(markup);
    incidentRowCount += rows.length;
    for (const row of rows) {
      if (!seasonById[row.playerId] && !roster.some((player) => player.id === row.playerId)) continue;
      const list = matchRowsByPlayer.get(row.playerId) || [];
      list.push({ match, row });
      matchRowsByPlayer.set(row.playerId, list);
    }
  }

  const stats = roster.map((player) => {
    const isKeeper = /keeper|målvakt/i.test(player.position);
    const seasonData = buildSeasonStats(seasonById[player.id], isKeeper);
    const recentMatches = (matchRowsByPlayer.get(player.id) || [])
      .map(({ match, row }) => buildMatchStats(row, match, isKeeper))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    return {
      playerId: player.id,
      ...seasonData,
      recentMatches,
    };
  });

  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, "larvikRoster.json"),
    `${JSON.stringify(roster, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(dataDir, "larvikPlayerStats.json"),
    `${JSON.stringify(stats, null, 2)}\n`,
  );

  patchService();
  patchPlayerPage();

  const missingSeason = roster
    .filter((player) => !seasonById[player.id])
    .map((player) => player.name);

  console.log(
    JSON.stringify(
      {
        team: TEAM_NAME,
        players: roster.length,
        seasonRows: seasonRows.length,
        matches: matches.length,
        incidentRows: incidentRowCount,
        missingSeason,
        logo: TEAM_LOGO_URL,
        tournament: TOURNAMENT,
        season: SEASON,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
