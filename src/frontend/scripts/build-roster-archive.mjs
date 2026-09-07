#!/usr/bin/env node
/**
 * Bygger sesongarkiv for lagtropper + bildehistorikk (F13).
 *
 * BAKGRUNN 2026-09-07: rosterfilene har aldri hatt sesong - de inneholder
 * "troppen naa". Saa lenge de aldri ble oppdatert fungerte de tilfeldigvis
 * som et 25/26-arkiv. Da sync-rosters.mjs skrev dem til 26/27 forsvant
 * fjoraarets oppfoeringer, og med dem koblingen mellom spiller og
 * fjoraarsbilde. 151 oppfoeringer forsvant, 124 av dem med bilde-URL.
 * Bildene ligger fortsatt paa canisteren - det var lenken som ble borte.
 *
 * Denne henter 25/26-troppene fra git og skriver dem som arkiv, og bygger
 * en bildehistorikk pr spiller paa tvers av sesonger.
 *
 * MERK: spiller-ID-ene fra topphandball er lag-prefikset. Samme person faar
 * ny ID ved klubbytte, saa historikken maa knyttes til NAVN, ikke ID.
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, "..", "src", "data");
const repoRoot = resolve(here, "..", "..", "..");

// Siste commit FOER troppene ble synket til 26/27.
const ARCHIVE_REF = process.env.ARCHIVE_REF ?? "82f30c0e~1";

export const normalizeName = (value) =>
  (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const stripQuery = (url) => (url ?? "").split("?")[0];

function readFromGit(relPath) {
  try {
    return JSON.parse(
      execSync(`git show ${ARCHIVE_REF}:${relPath}`, {
        cwd: repoRoot,
        stdio: ["ignore", "pipe", "ignore"],
        maxBuffer: 32 * 1024 * 1024,
      }).toString(),
    );
  } catch {
    return null;
  }
}

const rosterFiles = readdirSync(dataDir).filter((f) => /Roster\.json$/.test(f));

const archive = {};
let archived = 0;
for (const file of rosterFiles) {
  const old = readFromGit(`src/frontend/src/data/${file}`);
  if (!old || old.length === 0) continue;
  const team = file.replace(/Roster\.json$/, "");
  archive[team] = old;
  archived += old.length;
}

// Bildehistorikk: navn -> alle kjente originale bilde-URL-er, nyeste foerst.
// Naavaerende tropp gir dagens bilde, arkivet gir fjoraarets.
const history = {};
function addImage(name, url) {
  const key = normalizeName(name);
  const clean = stripQuery(url);
  if (!key || !clean) return;
  history[key] = history[key] ?? [];
  if (!history[key].includes(clean)) history[key].push(clean);
}

for (const file of rosterFiles) {
  const current = JSON.parse(readFileSync(resolve(dataDir, file), "utf8"));
  for (const p of current) addImage(p.name, p.imageUrl);
}
for (const players of Object.values(archive)) {
  for (const p of players) addImage(p.name, p.imageUrl);
}

// --- Resolver URL -> fullbilde, og dedupliser paa FILINNHOLD ---------------
//
// Manifestet noekler samme foto baade med og uten ?v=, og de to peker paa
// ulike hasher. Uten dedup fikk Aula tre varianter der to var byte-identiske
// (begge Aker-portrettet). Vi hasher den faktiske webp-fila i stedet.
const imageManifest = JSON.parse(
  readFileSync(resolve(dataDir, "playerImageManifest.json"), "utf8"),
);
const fullManifest = JSON.parse(
  readFileSync(resolve(dataDir, "playerFullImageManifest.json"), "utf8"),
);
const fullImageDir = resolve(here, "..", "dist", "assets", "player-full-images");

const fullByBaseUrl = {};
for (const [originalUrl, localPath] of Object.entries(imageManifest)) {
  const full = fullManifest[localPath];
  if (!full) continue;
  const base = stripQuery(originalUrl);
  fullByBaseUrl[base] = fullByBaseUrl[base] ?? [];
  if (!fullByBaseUrl[base].includes(full)) fullByBaseUrl[base].push(full);
}

const contentHashCache = new Map();
function contentHash(fullPath) {
  if (contentHashCache.has(fullPath)) return contentHashCache.get(fullPath);
  const file = resolve(fullImageDir, fullPath.split("/").pop());
  let hash = fullPath; // faller tilbake paa stien hvis fila ikke er bygget
  if (existsSync(file)) {
    hash = createHash("sha256").update(readFileSync(file)).digest("hex");
  }
  contentHashCache.set(fullPath, hash);
  return hash;
}

const resolved = {};
let deduped = 0;
for (const [name, urls] of Object.entries(history)) {
  const seenContent = new Set();
  const paths = [];
  for (const url of urls) {
    for (const full of fullByBaseUrl[url] ?? []) {
      const hash = contentHash(full);
      if (seenContent.has(hash)) {
        deduped += 1;
        continue;
      }
      seenContent.add(hash);
      paths.push(full);
    }
  }
  if (paths.length > 1) resolved[name] = paths;
}

const multi = resolved;

writeFileSync(
  resolve(dataDir, "rosterArchive2526.json"),
  JSON.stringify(archive, null, 2) + "\n",
);
writeFileSync(
  resolve(dataDir, "playerImageHistory.json"),
  JSON.stringify(multi, null, 2) + "\n",
);

console.log("Arkiv 25/26: " + Object.keys(archive).length + " lag, " + archived + " spillere");
console.log("Bildehistorikk: " + Object.keys(multi).length + " spillere med flere ULIKE bilder");
console.log("Duplikater fjernet (samme foto, ulik hash): " + deduped);
for (const name of ["linnea isabel ingeborg aula", "mathea enger", "my lervold"]) {
  console.log("  " + name + ": " + JSON.stringify(multi[name] ?? history[name] ?? "ingen"));
}
