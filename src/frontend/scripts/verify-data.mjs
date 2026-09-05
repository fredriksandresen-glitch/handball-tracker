#!/usr/bin/env node
/**
 * verify-data.mjs - sannhetssjekk foer deploy.
 *
 * Bakgrunn: flere feil har naadd produksjon fordi de var stille - env.json med
 * "undefined", uklikkbare tabellrader, laanestatistikk som forsvant. Denne
 * sjekken slaar fast kjente sannheter mot de faktiske datafilene, og feiler
 * bygget hvis noe brytes.
 *
 * Kjor: node scripts/verify-data.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const D = path.join(root, "src/data");
const PUB = path.join(root, "public");

const failures = [];
const notes = [];
const ok = (msg) => notes.push("  OK   " + msg);
const fail = (msg) => failures.push(msg);

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const norm = (v) =>
  String(v ?? "").toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "o")
    .replace(/å/g, "a").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// ── Les konfigurasjonen ut av kildekoden ────────────────────────────────────
const profSrc = fs.readFileSync(path.join(root, "src/services/clawdbotPlayerProfile.ts"), "utf8");
const seasonsSrc = fs.readFileSync(path.join(D, "seasons.ts"), "utf8");
const standingsSrc = fs.readFileSync(path.join(D, "leagueStandings.ts"), "utf8");

const imports = {};
for (const m of profSrc.matchAll(/import\s+(\w+)\s+from\s+"\.\.\/data\/([\w.-]+\.json)"/g)) imports[m[1]] = m[2];

const cfgStart = profSrc.indexOf("const STATIC_TEAM_CONFIGS");
const cfgEnd = profSrc.indexOf("\n];", cfgStart);
const cfgBlock = profSrc.slice(cfgStart, cfgEnd);
// Del paa entry-grensen. En lazy regex over flere felt hoppet stille over
// konfigurasjoner som manglet et felt (mistet Flint, Fjellhammer og
// Storhamar Rekrutt), og ga falske alarmer om uklikkbare rader.
const configs = cfgBlock.split(/\n  \{/).slice(1).map((entry) => ({
  name: (entry.match(/name: "([^"]+)"/) || [])[1],
  file: imports[(entry.match(/roster: (\w+)/) || [])[1]],
  primeTeamId: (entry.match(/primeTeamId: "(\d+)"/) || [])[1],
  league: /leagueId: FIRST_DIVISION_LEAGUE_ID/.test(entry) ? "first-division" : "elite",
  dataSeason: /dataSeason: CURRENT_SEASON_ID/.test(entry) ? "2026-27" : "2025-26",
})).filter((c) => c.name);

// Parseren maa se hele lista; ellers blir sjekkene under meningslose.
const declaredCount = (cfgBlock.match(/\n    name: "/g) || []).length;
if (configs.length !== declaredCount) {
  fail("Parser fanget " + configs.length + " av " + declaredCount + " lagkonfigurasjoner - sjekken er utrygg");
}
for (const c of configs) {
  if (!c.primeTeamId) fail("Lagkonfig uten primeTeamId: " + c.name);
}

function seasonList(seasonConst, leagueConst) {
  const re = new RegExp("\\[" + seasonConst + "\\]: \\{[\\s\\S]*?\\[" + leagueConst + "\\]: \\[([\\s\\S]*?)\\]");
  const m = seasonsSrc.match(re);
  return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
}
const members = {
  "2026-27": { elite: seasonList("CURRENT_SEASON_ID", "ELITE_LEAGUE_ID"), "first-division": seasonList("CURRENT_SEASON_ID", "FIRST_DIVISION_LEAGUE_ID") },
  "2025-26": { elite: seasonList("ARCHIVE_SEASON_ID", "ELITE_LEAGUE_ID"), "first-division": seasonList("ARCHIVE_SEASON_ID", "FIRST_DIVISION_LEAGUE_ID") },
};

const firstDivStats = readJson(path.join(D, "firstDivision2526PlayerStats.json"));
const statsById = {};
for (const s of (Array.isArray(firstDivStats) ? firstDivStats : Object.values(firstDivStats))) statsById[String(s.playerId)] = s;

const rosters = new Map();
for (const c of configs) {
  if (!c.file) continue;
  const p = path.join(D, c.file);
  if (!fs.existsSync(p)) { fail("Roster-fil mangler: " + c.file + " (" + c.name + ")"); continue; }
  try { rosters.set(c.name, readJson(p)); } catch (e) { fail("Ugyldig JSON i " + c.file + ": " + e.message); }
}

// ── 1. Laanespillere beholder klubben de faktisk spilte for ─────────────────
// To mekanismer kan gi dette, og begge godtas:
//   a) playerSeasonSpells2526.json (foretrukket) -> getPlayerSeasonScopes
//   b) teamName paa 1. divisjons-statsoppforingen -> getStaticPlayerEntry
// Sjekken maa akseptere begge; ellers slaar den falsk alarm naar
// datamodellen forbedres.
const spellsPath = path.join(D, "playerSeasonSpells2526.json");
const spells = fs.existsSync(spellsPath) ? readJson(spellsPath) : [];
const spellList = Array.isArray(spells) ? spells : Object.values(spells);

function resolveArchiveClub(playerId) {
  const spell = spellList.find(
    (s) => String(s.canonicalPlayerId) === playerId && s.seasonId === "2025-26",
  );
  if (spell?.teamName) return { shows: spell.teamName, via: "spell/" + (spell.spellType ?? "ukjent") };

  if (statsById[playerId]?.teamName) {
    return { shows: statsById[playerId].teamName, via: "statsTeamName" };
  }
  return null;
}

const LOAN_EXPECTATIONS = [
  { id: "22398210032285", name: "Linnea Isabel Ingeborg Aula", expect: "Kjelsås" },
];
for (const exp of LOAN_EXPECTATIONS) {
  const res = resolveArchiveClub(exp.id);
  if (!res) fail("Fjoraarssesong: " + exp.name + " har ingen registrert klubb (forventet " + exp.expect + ")");
  else if (norm(res.shows) !== norm(exp.expect)) fail("Fjoraarssesong: " + exp.name + " viser " + res.shows + ", forventet " + exp.expect);
  else ok("Fjoraarssesong: " + exp.name + " -> " + res.shows + " (via " + res.via + ")");
}

// ── 1b. Toppliste maa ha data naar sesongen er i gang ───────────────────────
// Fanger tilfellet der tabellen viser spilte kamper mens topplisten er tom
// fordi sesongens spillerstatistikk aldri ble hentet inn.
const playedNow = [...standingsSrc.matchAll(/played: (\d+),/g)]
  .reduce((n, m) => n + Number(m[1]), 0);
const seasonStatFiles = ["elkjop2627PlayerStats.json", "firstDivision2627PlayerStats.json"];
let seasonPlayers = 0;
for (const f of seasonStatFiles) {
  const fp = path.join(D, f);
  if (!fs.existsSync(fp)) continue;
  const raw = readJson(fp);
  const list = Array.isArray(raw) ? raw : Object.values(raw);
  seasonPlayers += list.filter((p) => (p?.seasonStats?.matches ?? 0) > 0).length;
}
if (playedNow > 0 && seasonPlayers === 0) {
  fail("Tabellen viser " + playedNow + " spilte kamper, men ingen spiller har statistikk for inneverende sesong - topplisten blir tom");
} else if (playedNow > 0) {
  ok("Toppliste har data: " + seasonPlayers + " spillere med kamper (tabell: " + playedNow + " spilte)");
}

// ── 2. Alle tabellrader kan aapnes ──────────────────────────────────────────
function standingsBlock(varName) {
  const s = standingsSrc.indexOf("const " + varName);
  if (s < 0) return [];
  const e = standingsSrc.indexOf("\n];", s);
  return [...standingsSrc.slice(s, e).matchAll(/name: "([^"]+)",\n\s+primeTeamId: "(\d+)"/g)].map((m) => ({ name: m[1], prime: m[2] }));
}
const archiveStandings = readJson(path.join(D, "leagueStandingsArchive.json"));
const tables = [
  ["2026-27", "elite", standingsBlock("currentStandings")],
  ["2026-27", "first-division", standingsBlock("currentFirstDivisionTeams")],
  ["2025-26", "elite", archiveStandings.map((a) => ({ name: a.name, prime: a.primeTeamId }))],
];
for (const [season, league, rows] of tables) {
  if (!rows.length) continue;
  const dead = rows.filter((r) => {
    const byPrime = configs.find((c) => c.primeTeamId === r.prime && c.league === league &&
      members[season][league].some((n) => norm(n) === norm(c.name)));
    const byName = configs.find((c) => norm(c.name) === norm(r.name).replace(" handball klubb", "") && c.league === league &&
      members[season][league].some((n) => norm(n) === norm(c.name)));
    return !byPrime && !byName;
  }).map((r) => r.name);
  // Ravens spilte eliteserien 2025-26 og har ingen tropp i arkivet - kjent og akseptert.
  const unexpected = dead.filter((n) => !(season === "2025-26" && league === "elite" && n === "Ravens"));
  if (unexpected.length) fail("Uklikkbare tabellrader i " + season + " " + league + ": " + unexpected.join(", "));
  else ok("Tabellrader klikkbare: " + season + " " + league + " (" + rows.length + " rader)");
}

// ── 3. Runtime-config uten "undefined" ──────────────────────────────────────
const envSrc = readJson(path.join(root, "env.json"));
for (const key of ["backend_host", "backend_canister_id", "icp_network"]) {
  const v = String(envSrc[key] ?? "").trim();
  if (!v || v === "undefined" || v === "null") fail("env.json: " + key + " er '" + v + "'");
}
if (!failures.some((f) => f.startsWith("env.json"))) ok("env.json har reelle verdier");

// ── 4. Alle bildereferanser finnes paa disk ─────────────────────────────────
const mainMan = readJson(path.join(D, "playerImageManifest.json"));
const cardMan = readJson(path.join(D, "playerCardImageManifest.json"));
const legacyMan = readJson(path.join(D, "playerImageLegacyManifest.json"));
let missing = 0;
for (const [label, obj] of [["hoved", mainMan], ["legacy", legacyMan]]) {
  for (const local of Object.values(obj)) {
    if (typeof local !== "string" || !local.startsWith("/assets/")) continue;
    if (!fs.existsSync(path.join(PUB, local.slice(1)))) { missing++; if (missing <= 5) fail("Bilde mangler (" + label + "): " + local); }
  }
}
for (const [key, sizes] of Object.entries(cardMan)) {
  if (!fs.existsSync(path.join(PUB, key.slice(1)))) { missing++; if (missing <= 5) fail("Kortmanifest peker paa manglende original: " + key); }
  for (const p of Object.values(sizes)) {
    if (!fs.existsSync(path.join(PUB, p.slice(1)))) { missing++; if (missing <= 5) fail("Kortbilde mangler: " + p); }
  }
}
if (!missing) ok("Alle bildereferanser finnes paa disk (" + (Object.keys(mainMan).length + Object.keys(legacyMan).length) + " oppforinger)");
else fail("Totalt " + missing + " manglende bildefil(er)");

// ── 5. Troppene har spillere ────────────────────────────────────────────────
const empty = [...rosters.entries()].filter(([, r]) => !Array.isArray(r) || r.length === 0).map(([n]) => n);
const KNOWN_EMPTY = ["HK Rygge"]; // nyopprykket, tropp ikke publisert av forbundet
const unexpectedEmpty = empty.filter((n) => !KNOWN_EMPTY.includes(n));
if (unexpectedEmpty.length) fail("Tomme tropper: " + unexpectedEmpty.join(", "));
else ok("Tropper fylt (" + (rosters.size - empty.length) + "/" + rosters.size + ", kjent tom: " + (KNOWN_EMPTY.join(", ") || "ingen") + ")");

// ── Resultat ────────────────────────────────────────────────────────────────
console.log("Datasjekk:");
for (const n of notes) console.log(n);
if (failures.length) {
  console.error("\nFEIL (" + failures.length + "):");
  for (const f of failures) console.error("  X    " + f);
  console.error("\nBygget stoppes. Rett feilene over.");
  process.exit(1);
}
console.log("\nAlle sjekker bestatt.");
