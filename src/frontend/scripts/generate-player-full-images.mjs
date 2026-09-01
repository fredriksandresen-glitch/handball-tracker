#!/usr/bin/env node
/**
 * Lager webp-varianter i full oppløsning av spillerbildene.
 *
 * Bakgrunn (2026-08-27): originalene er 1000x1500 PNG med alfa, snitt ~1,3 MB
 * og 250 MB til sammen. Det er 71 % av asset-canisterens minne, og det koster
 * cycles hver eneste dag. webp q90/alphaQuality 95 gir ~88 % mindre filer uten
 * synlig kvalitetstap — samme innstilling som kortbildene allerede bruker.
 *
 * PNG-ene blir liggende i public/ som master, men prune-steget i bygget
 * fjerner dem fra dist slik at de ikke deployes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const outputDir = path.join(publicDir, "assets/player-full-images");
const manifestPath = path.resolve(
  __dirname,
  "../src/data/playerFullImageManifest.json",
);
const playerImageManifest = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../src/data/playerImageManifest.json"),
    "utf8",
  ),
);

fs.mkdirSync(outputDir, { recursive: true });

const fullManifest = {};
let generated = 0;
let reused = 0;
let sourceBytes = 0;
let outputBytes = 0;

for (const localPath of new Set(Object.values(playerImageManifest))) {
  if (!localPath.startsWith("/assets/player-images/")) continue;

  const sourcePath = path.join(publicDir, localPath.slice(1));
  if (!fs.existsSync(sourcePath)) continue;

  const stem = path.parse(sourcePath).name;
  const filename = `${stem}.webp`;
  const outputPath = path.join(outputDir, filename);
  const sourceStat = fs.statSync(sourcePath);
  sourceBytes += sourceStat.size;

  // Hopp over hvis webp-en allerede er nyere enn kilden.
  if (
    fs.existsSync(outputPath) &&
    fs.statSync(outputPath).mtimeMs >= sourceStat.mtimeMs
  ) {
    reused += 1;
  } else {
    await sharp(sourcePath)
      .rotate()
      // Effort påvirker komprimeringstid og filstørrelse, ikke bildekvalitet.
      // Nivå 4 gjør store spillerimporter langt raskere på vanlige maskiner.
      .webp({ quality: 90, alphaQuality: 95, effort: 4 })
      .toFile(outputPath);
    generated += 1;
  }

  outputBytes += fs.statSync(outputPath).size;
  fullManifest[localPath] = `/assets/player-full-images/${filename}`;
}

fs.writeFileSync(manifestPath, `${JSON.stringify(fullManifest, null, 2)}\n`);

const mb = (bytes) => (bytes / 1048576).toFixed(1);
console.log(
  `Full-size webp: ${generated} nye, ${reused} gjenbrukt, ${Object.keys(fullManifest).length} i manifest.`,
);
console.log(
  `  PNG ${mb(sourceBytes)} MB -> webp ${mb(outputBytes)} MB (${(100 - (100 * outputBytes) / sourceBytes).toFixed(0)} % mindre)`,
);
