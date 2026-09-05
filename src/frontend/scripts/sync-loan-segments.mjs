#!/usr/bin/env node
/**
 * Fletter "laanesegmenter" inn i den kompakte 1.divisjons-statistikkfila.
 *
 * Bakgrunn: appen viste tidligere forrige sesongs klubb (f.eks. Linnea Aulas
 * laaneopphold i Kjelsaas) via et eksternt profil-API paa en trycloudflare-tunnel.
 * Slike tunneler doer av seg selv, og da forsvant dataene stille. Dette scriptet
 * baker de samme dataene inn statisk, slik at de staar uavhengig av nettverk.
 *
 * Regel: playerId = teamId + personId (verifisert 316/316 i fullfila).
 * En spiller som i 2025-26 spilte for et ANNET lag enn dagens tropp, faar
 * en kompakt-oppfoering under DAGENS roster-id, med teamName-overstyring
 * slik at profilen viser riktig klubb for den sesongen.
 *
 * Kjor: node scripts/sync-loan-segments.mjs [--check]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const FULL = path.join(root, "public/data/player-stats/firstDivision2526FullPlayerStats.json");
const COMPACT = path.join(root, "src/data/firstDivision2526PlayerStats.json");
const checkOnly = process.argv.includes("--check");

// Tropper som hoerer til 1. divisjon i inneverende sesong.
const ROSTERS = [
  ["Aker Topphåndball", "akerRoster.json"],
  ["Kjelsås", "kjelsaasRoster.json"],
  ["Volda", "voldaRoster.json"],
  ["Levanger", "levangerRoster.json"],
  ["Åsane", "asaneRoster.json"],
  ["Trondheim", "trondheimRoster.json"],
  ["Gjøvik", "gjovikRoster.json"],
  ["Bækkelaget", "baekkelagetRoster.json"],
  ["Fyllingen", "fyllingenRoster.json"],
  ["Haslum", "haslumCurrentRoster.json"],
];

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const personIdOf = (playerId, teamId) => String(playerId).slice(String(teamId).length);

// Klubbnavn skrives ulikt i kildene ("Aker Topphandball" vs "Aker Topphåndball").
// Suffikser som HK/Elite/Handball skiller ikke lag fra hverandre, men "Rekrutt"
// gjor det - Byaasen og Byaasen Rekrutt er to forskjellige lag.
const GENERIC_TOKENS = new Set([
  "hk", "il", "elite", "handball", "topphandball", "topphandballforening",
  "klubb", "bkl", "idrettslag", "handballforening", "damer",
]);
const normalizeName = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const clubTokens = (value) =>
  normalizeName(value).split(" ").filter((t) => t && !GENERIC_TOKENS.has(t));
function sameClub(a, b) {
  const left = clubTokens(a);
  const right = clubTokens(b);
  if (left.length === 0 || right.length === 0) return false;
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  for (let i = 0; i < shorter.length; i += 1) {
    if (shorter[i] !== longer[i]) return false;
  }
  return !longer.slice(shorter.length).some((t) => t === "rekrutt");
}

const full = readJson(FULL);
const compact = readJson(COMPACT);

// Sanity: bekreft at id-regelen faktisk holder for hele fullfila.
const broken = full.filter((r) => !String(r.playerId).startsWith(String(r.teamId)));
if (broken.length > 0) {
  console.error(`AVBRYTER: ${broken.length} rader bryter regelen playerId = teamId + personId.`);
  console.error("Uten den regelen kan spillere kobles feil. Undersok fullfila.");
  process.exit(1);
}

const fullByPerson = new Map();
for (const row of full) fullByPerson.set(personIdOf(row.playerId, row.teamId), row);

const compactById = new Map(compact.map((r) => [String(r.playerId), r]));
const added = [];

for (const [teamName, file] of ROSTERS) {
  const rosterPath = path.join(root, "src/data", file);
  if (!fs.existsSync(rosterPath)) continue;
  const raw = readJson(rosterPath);
  const players = Array.isArray(raw) ? raw : raw.players ?? [];

  for (const player of players) {
    const rosterId = String(player.id);

    // Lagets prefiks er de 6 forste sifrene i roster-id-ene.
    const stats = fullByPerson.get(rosterId.slice(6));
    if (!stats) continue;

    // Bare interessant naar sesongen ble spilt for en ANNEN klubb.
    if (sameClub(stats.teamName, teamName)) continue;

    // Allerede i fila: da mangler den bare klubbnavnet for sesongen,
    // ellers vises fjorarets tall under DAGENS klubb.
    const existing = compactById.get(rosterId);
    if (existing) {
      if (existing.teamName === stats.teamName) continue;
      existing.teamName = stats.teamName;
      added.push(`${player.name}: ${teamName} i dag, ${stats.teamName} i 2025-26 (klubbnavn rettet)`);
      continue;
    }

    const entry = {
      playerId: rosterId,
      seasonStats: stats.seasonStats,
      recentMatches: stats.recentMatches ?? [],
      // Overstyrer klubbnavnet for arkivsesongen, slik at profilen ikke
      // viser dagens klubb paa fjorarets tall.
      teamName: stats.teamName,
    };
    if (stats.goalkeeperStats) entry.goalkeeperStats = stats.goalkeeperStats;

    compact.push(entry);
    compactById.set(rosterId, entry);
    added.push(`${player.name}: ${teamName} i dag, ${stats.teamName} i 2025-26 (${stats.seasonStats.matches} kamper, ${stats.seasonStats.goals} mal)`);
  }
}

if (added.length === 0) {
  console.log("Ingen nye laanesegmenter. Fila er allerede i synk.");
  process.exit(0);
}

console.log("Laanesegmenter funnet:");
for (const line of added) console.log("  - " + line);

if (checkOnly) {
  console.error("\n--check: fila er IKKE i synk. Kjor uten --check for a skrive.");
  process.exit(1);
}

fs.writeFileSync(COMPACT, JSON.stringify(compact, null, 2) + "\n");
console.log(`\nSkrev ${added.length} oppforing(er) til ${path.relative(root, COMPACT)} (totalt ${compact.length}).`);
