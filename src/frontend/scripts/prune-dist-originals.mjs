#!/usr/bin/env node
/**
 * Fjerner PNG-originalene fra dist etter bygget.
 *
 * Alle visninger gaar via webp (se playerFullImageManifest + kortbildene),
 * saa originalene trengs ikke paa canisteren. De blir liggende i public/
 * som master i git. Sparte ~220 MB canister-minne 2026-08-27.
 *
 * Kjor med --check for aa bare rapportere uten aa slette.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const originalsDir = path.join(distDir, "assets/player-images");
const webpDir = path.join(distDir, "assets/player-full-images");
const checkOnly = process.argv.includes("--check");

function dirSize(dir) {
  if (!fs.existsSync(dir)) return { files: 0, bytes: 0 };
  let files = 0;
  let bytes = 0;
  for (const entry of fs.readdirSync(dir)) {
    const stat = fs.statSync(path.join(dir, entry));
    if (stat.isFile()) {
      files += 1;
      bytes += stat.size;
    }
  }
  return { files, bytes };
}

const originals = dirSize(originalsDir);
const webp = dirSize(webpDir);
const mb = (bytes) => (bytes / 1048576).toFixed(1);

if (originals.files === 0) {
  console.log("Prune: ingen PNG-originaler i dist (allerede ryddet).");
  process.exit(0);
}

// Sikkerhetsnett: ikke slett originalene hvis webp-settet mangler.
if (webp.files < originals.files) {
  console.error(
    `Prune AVBRUTT: bare ${webp.files} webp mot ${originals.files} PNG. Kjor generate-player-full-images forst.`,
  );
  process.exit(1);
}

if (checkOnly) {
  console.log(
    `Prune (check): ville fjernet ${originals.files} PNG (${mb(originals.bytes)} MB). webp: ${webp.files} (${mb(webp.bytes)} MB).`,
  );
  process.exit(0);
}

fs.rmSync(originalsDir, { recursive: true, force: true });
console.log(
  `Prune: fjernet ${originals.files} PNG-originaler fra dist (${mb(originals.bytes)} MB spart). webp beholdt: ${webp.files} (${mb(webp.bytes)} MB).`,
);
