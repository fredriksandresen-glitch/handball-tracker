#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const dataDir = path.join(frontendDir, "src/data");
const outputPath = path.join(
  frontendDir,
  "public/data/search-player-index.json",
);

const teams = [
  ["Aker Topph\u00e5ndball", "akerRoster.json"],
  ["Kjels\u00e5s", "kjelsaasRoster.json"],
  ["Volda", "voldaRoster.json"],
  ["Levanger", "levangerRoster.json"],
  ["\u00c5sane", "asaneRoster.json"],
  ["Trondheim", "trondheimRoster.json"],
  ["Gj\u00f8vik", "gjovikRoster.json"],
  ["Ravens", "ravensRoster.json"],
  ["Stavanger", "stavangerRoster.json"],
  ["B\u00e6kkelaget", "baekkelagetRoster.json"],
  ["Haslum", "haslumCurrentRoster.json"],
  ["Fyllingen", "fyllingenRoster.json"],
  ["Fjellhammer", "fjellhammerRoster.json", "fjellhammerPlayerStats.json"],
  ["Larvik", "larvikRoster.json", "larvikPlayerStats.json"],
  ["Fana", "fanaRoster.json", "fanaPlayerStats.json"],
  ["Follo Damer", "folloRoster.json", "folloPlayerStats.json"],
  ["Fredrikstad", "fredrikstadRoster.json", "fredrikstadPlayerStats.json"],
  ["Gjerpen", "gjerpenRoster.json", "gjerpenPlayerStats.json"],
  ["Haslum", "haslumRoster.json", "haslumPlayerStats.json"],
  ["By\u00e5sen", "byaasenRoster.json", "byaasenPlayerStats.json"],
  ["Molde", "moldeRoster.json", "moldePlayerStats.json"],
  ["Oppsal", "oppsalRoster.json", "oppsalPlayerStats.json"],
  ["Sola", "solaRoster.json", "solaPlayerStats.json"],
  ["Storhamar", "storhamarRoster.json", "storhamarPlayerStats.json"],
  ["Tertnes", "tertnesRoster.json", "tertnesPlayerStats.json"],
  ["Utleira", "utleiraRoster.json"],
];

function readJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, filename), "utf8"));
}

function normalize(value = "") {
  return value
    .toLowerCase()
    .replace(/\u00e6/g, "ae")
    .replace(/\u00f8/g, "o")
    .replace(/\u00e5/g, "a")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "");
}

function mapPosition(position) {
  const value = normalize(position);
  if (
    value.includes("keeper") ||
    value.includes("malvakt") ||
    value.includes("mlvakt")
  ) {
    return "Keeper";
  }
  if (value.includes("kant") && value.includes("venstre")) {
    return "VenstreKant";
  }
  if (value.includes("kant") && value.includes("hoyre")) {
    return "HoyreKant";
  }
  if (value.includes("linje") || value.includes("strek")) return "Linje";
  return "Bakspiller";
}

function stableTeamId(teamName) {
  let hash = 0;
  for (const character of teamName) {
    hash = (hash * 31 + character.charCodeAt(0)) % 1_000_000;
  }
  return String(hash || 1);
}

function createInsight(stats = {}) {
  const seasonStats = stats.seasonStats ?? {};
  const mepMatches = (stats.recentMatches ?? [])
    .filter((match) => typeof match.mep === "number")
    .sort((a, b) =>
      String(a.date ?? a.matchId).localeCompare(String(b.date ?? b.matchId)),
    )
    .slice(-5);
  const sparkValues = mepMatches.map((match) => match.mep ?? 0);
  const latestMatch = mepMatches.at(-1);
  const latestMep = sparkValues.at(-1);
  const formAvg = sparkValues.length
    ? sparkValues.reduce((sum, value) => sum + value, 0) / sparkValues.length
    : seasonStats.mepAvg;
  const matches = seasonStats.matches ?? 0;
  const goalsPerGame = matches > 0 ? (seasonStats.goals ?? 0) / matches : 0;

  return {
    mepAvg: seasonStats.mepAvg,
    sparkValues,
    formAvg,
    latestMep,
    hotScore:
      (formAvg ?? 0) * 12 +
      (seasonStats.mepAvg ?? 0) * 5 +
      goalsPerGame * 4 +
      Math.min(matches, 26) / 10,
    totalGoals: seasonStats.goals,
    latestGoals: latestMatch?.goals,
    latestSaves: latestMatch?.saves,
    latestSavePct: latestMatch?.savePercentage,
  };
}

const imageManifest = readJson("playerImageManifest.json");
const entriesById = new Map();

for (const [teamName, rosterFile, statsFile] of teams) {
  const roster = readJson(rosterFile);
  const statsById = statsFile
    ? new Map(readJson(statsFile).map((stats) => [stats.playerId, stats]))
    : new Map();

  for (const player of roster) {
    const originalImageUrl = player.imageUrl ?? undefined;
    const imageUrl = originalImageUrl
      ? (imageManifest[originalImageUrl] ??
        imageManifest[originalImageUrl.split("?")[0]] ??
        originalImageUrl)
      : undefined;
    const entry = {
      id: String(player.id),
      name: player.name,
      teamId: stableTeamId(teamName),
      teamName,
      position: mapPosition(player.position),
      rawPosition: player.position ?? "",
      shirtNumber: player.shirtNumber ?? null,
      imageUrl,
      stats: statsById.get(String(player.id)),
    };
    const existing = entriesById.get(entry.id) ?? [];
    existing.push(entry);
    entriesById.set(entry.id, existing);
  }
}

const searchIndex = [...entriesById.values()].flatMap((entries) => {
  const insight = createInsight(entries[0]?.stats);
  return entries.map(({ stats: _stats, rawPosition, ...entry }) => ({
    ...entry,
    searchText: `${entry.name} ${entry.teamName} ${rawPosition}`.toLowerCase(),
    insight,
  }));
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(searchIndex)}\n`);
console.log(
  `Generated lightweight search index for ${searchIndex.length} players.`,
);
