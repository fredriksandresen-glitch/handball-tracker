#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../src/data");
const outputPath = path.join(dataDir, "currentSeasonRosterAdditions2627.json");
const primeUrl = "https://admin.topphandball.no/apps/prime/prime.php";
const settingsUrl = "https://topphandball.no/statistikk/";

const teams = [
  { id: "454116", name: "Byåsen", leagueId: "elite" },
  { id: "225474", name: "Fana", leagueId: "elite" },
  { id: "223982", name: "Fjellhammer", leagueId: "elite" },
  { id: "710438", name: "Flint", leagueId: "elite" },
  { id: "583889", name: "Follo Damer", leagueId: "elite" },
  { id: "441651", name: "Fredrikstad", leagueId: "elite" },
  { id: "453373", name: "Gjerpen", leagueId: "elite" },
  { id: "223994", name: "Larvik", leagueId: "elite" },
  { id: "775789", name: "Molde", leagueId: "elite" },
  { id: "441915", name: "Oppsal", leagueId: "elite" },
  { id: "223983", name: "Sola", leagueId: "elite" },
  { id: "746223", name: "Storhamar", leagueId: "elite" },
  { id: "470538", name: "Tertnes", leagueId: "elite" },
  { id: "532136", name: "Utleira", leagueId: "elite" },
  { id: "816397", name: "Aker Topphåndball", leagueId: "first-division" },
  { id: "223997", name: "Byåsen Rekrutt", leagueId: "first-division" },
  { id: "223985", name: "Bækkelaget", leagueId: "first-division" },
  { id: "224174", name: "Fyllingen", leagueId: "first-division" },
  { id: "223999", name: "Gjøvik", leagueId: "first-division" },
  { id: "450329", name: "Ravens", leagueId: "first-division" },
  { id: "928836", name: "Haslum", leagueId: "first-division" },
  { id: "224860", name: "Kjelsås", leagueId: "first-division" },
  { id: "224372", name: "Levanger", leagueId: "first-division" },
  { id: "224507", name: "Stavanger", leagueId: "first-division" },
  { id: "224178", name: "Storhamar Rekrutt", leagueId: "first-division" },
  { id: "985298", name: "Trondheim", leagueId: "first-division" },
  { id: "532788", name: "Volda", leagueId: "first-division" },
  { id: "453275", name: "Åsane", leagueId: "first-division" },
];

const rosterFiles = [
  "akerRoster.json",
  "kjelsaasRoster.json",
  "voldaRoster.json",
  "levangerRoster.json",
  "asaneRoster.json",
  "trondheimRoster.json",
  "gjovikRoster.json",
  "ravensRoster.json",
  "stavangerRoster.json",
  "baekkelagetRoster.json",
  "haslumCurrentRoster.json",
  "fyllingenRoster.json",
  "fjellhammerRoster.json",
  "larvikRoster.json",
  "fanaRoster.json",
  "folloRoster.json",
  "fredrikstadRoster.json",
  "gjerpenRoster.json",
  "haslumRoster.json",
  "byaasenRoster.json",
  "moldeRoster.json",
  "oppsalRoster.json",
  "solaRoster.json",
  "storhamarRoster.json",
  "tertnesRoster.json",
  "utleiraRoster.json",
];

function readJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, filename), "utf8"));
}

function extractSettings(html, name) {
  const marker = `const ${name} = `;
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`${name} is missing from ${settingsUrl}`);

  const jsonStart = start + marker.length;
  const end = html.indexOf(";", jsonStart);
  if (end < 0) throw new Error(`${name} is incomplete on ${settingsUrl}`);
  return html.slice(jsonStart, end);
}

async function fetchTeamRoster(team, settings) {
  const queryString = `teams/${team.id}/players?usenif&size=500`;
  const body = new URLSearchParams({
    template: "listing/players/roster.php",
    id: team.id,
    queryString,
    queryType: "roster-players",
    container: ".prime-roster-all.players",
    admin_settings: settings.admin,
    site_settings: settings.site,
  });
  const response = await fetch(primeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Origin: "https://topphandball.no",
      Referer: settingsUrl,
      "User-Agent": "HandballTracker roster sync",
    },
    body,
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(`${team.name}: HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.result !== "success" || typeof payload.response !== "string") {
    throw new Error(`${team.name}: invalid Prime response`);
  }

  const records = Object.values(JSON.parse(payload.response));
  return records.filter((record) => record && typeof record === "object");
}

function rosterPlayer(record, fallback, team) {
  return {
    id: String(fallback.playerId),
    name: record?.name?.trim() || fallback.playerName,
    imageUrl: record?.image_hires || record?.image || undefined,
    position: record?.position?.trim() || fallback.position || "",
    shirtNumber: Number.isFinite(Number(record?.number))
      ? Number(record.number)
      : 0,
    teamName: team.name,
    leagueId: team.leagueId,
    sourceTeamId: team.id,
  };
}

async function main() {
  const settingsResponse = await fetch(settingsUrl, {
    headers: { "User-Agent": "HandballTracker roster sync" },
  });
  if (!settingsResponse.ok) {
    throw new Error(`Settings page returned HTTP ${settingsResponse.status}`);
  }
  const settingsHtml = await settingsResponse.text();
  const settings = {
    admin: extractSettings(settingsHtml, "ADMIN_SETTINGS"),
    site: extractSettings(settingsHtml, "SITE_SETTINGS"),
  };

  const existingIds = new Set(
    rosterFiles
      .flatMap((filename) => readJson(filename))
      .map((player) => String(player.id)),
  );
  const currentStats = [
    ...readJson("elkjop2627PlayerStats.json"),
    ...readJson("firstDivision2627PlayerStats.json"),
  ];
  const missingStats = currentStats.filter(
    (stats) => !existingIds.has(String(stats.playerId)),
  );

  const officialById = new Map();
  const teamRosters = await Promise.all(
    teams.map(async (team) => ({
      team,
      roster: await fetchTeamRoster(team, settings),
    })),
  );
  for (const { team, roster } of teamRosters) {
    for (const player of roster) {
      officialById.set(String(player.id), { player, team });
    }
    process.stdout.write(`Fetched ${team.name}: ${roster.length} records\n`);
  }

  const unresolved = [];
  const additions = missingStats.map((stats) => {
    const playerId = String(stats.playerId);
    const official = officialById.get(playerId);
    if (official) return rosterPlayer(official.player, stats, official.team);

    const team = teams.find((candidate) => playerId.startsWith(candidate.id));
    if (!team) {
      unresolved.push(`${playerId} ${stats.playerName}`);
      return null;
    }

    process.stderr.write(
      `No roster record for ${stats.playerName}; using stats fields for ${team.name}.\n`,
    );
    return rosterPlayer(null, stats, team);
  });

  if (unresolved.length > 0) {
    throw new Error(`Unresolved team assignments:\n${unresolved.join("\n")}`);
  }

  const sorted = additions
    .filter(Boolean)
    .sort(
      (left, right) =>
        left.leagueId.localeCompare(right.leagueId) ||
        left.teamName.localeCompare(right.teamName, "nb") ||
        left.name.localeCompare(right.name, "nb"),
    );

  fs.writeFileSync(outputPath, `${JSON.stringify(sorted, null, 2)}\n`);
  const withImages = sorted.filter((player) => player.imageUrl).length;
  console.log(
    `Wrote ${sorted.length} roster additions (${withImages} with images) to ${outputPath}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
