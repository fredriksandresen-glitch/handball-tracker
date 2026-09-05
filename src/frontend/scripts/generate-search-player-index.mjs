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
  // Tom eller ukjent posisjon skal IKKE stille bli "Bakspiller".
  // Da forsvinner spillere inn i feil gruppe og blir usynlige i filtre.
  if (!value || value === "--" || value === "-") return "Ukjent";
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
  if (value.includes("bakspiller")) {
    if (value.includes("venstre")) return "BakspillerVenstre";
    if (value.includes("hoyre")) return "BakspillerHoyre";
    if (value.includes("midt") || value.includes("midte"))
      return "BakspillerMidt";
    return "Bakspiller";
  }
  if (value.includes("kant")) return "Ukjent";
  return "Bakspiller";
}

function stableTeamId(teamName) {
  let hash = 0;
  for (const character of teamName) {
    hash = (hash * 31 + character.charCodeAt(0)) % 1_000_000;
  }
  return String(hash || 1);
}

/** Keeperkamper med faerre skudd enn dette gir ikke meningsfull prosent. */
const MIN_KEEPER_SHOTS = 5;

function createInsight(stats = {}, position = "") {
  const seasonStats = stats.seasonStats ?? {};
  // Keepere maales paa redningsprosent, ikke MEP (2026-08-27). MEP er laget
  // for utespillere og sier lite om en keepers prestasjon.
  const isKeeper = position === "Keeper";
  const mepMatches = (stats.recentMatches ?? [])
    .filter((match) =>
      isKeeper
        ? typeof match.savePercentage === "number" &&
          (match.shotsAgainst ?? 0) >= MIN_KEEPER_SHOTS
        : typeof match.mep === "number",
    )
    .sort((a, b) =>
      String(a.date ?? a.matchId).localeCompare(String(b.date ?? b.matchId)),
    )
    .slice(-5);
  const sparkValues = mepMatches.map((match) =>
    isKeeper ? (match.savePercentage ?? 0) : (match.mep ?? 0),
  );
  const latestMatch = mepMatches.at(-1);
  const latestMep = sparkValues.at(-1);
  const formAvg = sparkValues.length
    ? sparkValues.reduce((sum, value) => sum + value, 0) / sparkValues.length
    : seasonStats.mepAvg;
  const matches = seasonStats.matches ?? 0;
  const goalsPerGame = matches > 0 ? (seasonStats.goals ?? 0) / matches : 0;

  // Referanselinje for formgrafen: sesongsnittet for den maalestokken
  // spilleren faktisk vises paa. For keepere er mepAvg meningslos.
  const keeperShots = (stats.recentMatches ?? []).filter(
    (match) =>
      typeof match.savePercentage === "number" &&
      (match.shotsAgainst ?? 0) >= MIN_KEEPER_SHOTS,
  );
  const keeperSeasonAvg = keeperShots.length
    ? keeperShots.reduce((sum, m) => sum + (m.savePercentage ?? 0), 0) /
      keeperShots.length
    : undefined;
  const formReference = isKeeper ? keeperSeasonAvg : seasonStats.mepAvg;

  // hotScore blandet to skalaer (2026-08-27): formAvg er ~1,5 for utespillere
  // (MEP) og ~25 for keepere (prosent). Ganget med 12 ga det keeperne 300 mot
  // 18, og de fylte hele topplista. Keepertall normaliseres na til MEP-skala:
  // 25 % redning tilsvarer 0, og hvert 8. prosentpoeng teller som 1 MEP.
  const normalizedForm = isKeeper
    ? ((formAvg ?? 25) - 25) / 8
    : (formAvg ?? 0);
  const normalizedSeason = isKeeper
    ? ((keeperSeasonAvg ?? 25) - 25) / 8
    : (seasonStats.mepAvg ?? 0);

  return {
    mepAvg: seasonStats.mepAvg,
    sparkValues,
    formAvg,
    formReference,
    latestMep,
    hotScore:
      normalizedForm * 12 +
      normalizedSeason * 5 +
      goalsPerGame * 4 +
      Math.min(matches, 26) / 10,
    totalGoals: seasonStats.goals,
    latestGoals: latestMatch?.goals,
    latestSaves: latestMatch?.saves,
    latestSavePct: latestMatch?.savePercentage,
  };
}

/**
 * Inneværende sesong (2026-09-01).
 *
 * Sokeindeksen ble bygget fra 2025-26-statistikkfilene, helt uavhengig av
 * 2026-27-importen. Det ga fjorarets tall i Sok, topplister og AI-svar selv
 * etter at ny sesong var importert (Sarah Deari Solheim viste 200 mal mot
 * reelle 5). Na overstyrer 2026-27-tallene, og spillere uten kamper i ar far
 * blanke felter i stedet for gamle tall.
 */
const live2627ById = new Map();
for (const file of [
  "elkjop2627PlayerStats.json",
  "firstDivision2627PlayerStats.json",
]) {
  try {
    for (const stats of readJson(file)) {
      live2627ById.set(String(stats.playerId), stats);
    }
  } catch {
    // Fila mangler forelopig — indeksen bygges da uten inneværende sesong.
  }
}

const imageManifest = readJson("playerImageManifest.json");
const identityReviews = readJson("playerIdentityReviews.json");
const currentExternalIdByAlias = new Map();
for (const review of identityReviews.merges) {
  for (const externalId of review.externalIds) {
    currentExternalIdByAlias.set(String(externalId), review.currentExternalId);
  }
}
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
      // 2026-27 vinner. Ingen fallback til fjoraret — se live2627ById over.
      stats: live2627ById.get(String(player.id)),
    };
    const existing = entriesById.get(entry.id) ?? [];
    existing.push(entry);
    entriesById.set(entry.id, existing);
  }
}

const searchIndex = [...entriesById.values()].flatMap((entries) => {
  const preferredExternalId = currentExternalIdByAlias.get(entries[0]?.id);
  if (preferredExternalId && preferredExternalId !== entries[0]?.id) return [];
  const insight = createInsight(entries[0]?.stats, entries[0]?.position);
  return entries
    .slice(0, 1)
    .map(({ stats: _stats, rawPosition, ...entry }) => ({
      ...entry,
      rawPosition,
      searchText:
        `${entry.name} ${entry.teamName} ${rawPosition}`.toLowerCase(),
      insight,
    }));
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(searchIndex)}\n`);
console.log(
  `Generated lightweight search index for ${searchIndex.length} players.`,
);
