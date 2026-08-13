#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const outputDir = path.join(publicDir, "assets/player-card-images");
const playerImageManifest = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../src/data/playerImageManifest.json"),
    "utf8",
  ),
);
const manifestPath = path.resolve(
  __dirname,
  "../src/data/playerCardImageManifest.json",
);
const widths = [400, 720];

fs.mkdirSync(outputDir, { recursive: true });

const cardManifest = {};
let generated = 0;

for (const localPath of new Set(Object.values(playerImageManifest))) {
  if (!localPath.startsWith("/assets/player-images/")) continue;

  const sourcePath = path.join(publicDir, localPath.slice(1));
  if (!fs.existsSync(sourcePath)) continue;

  const stem = path.parse(sourcePath).name;
  const sources = {};

  for (const width of widths) {
    const filename = `${stem}-${width}.webp`;
    const outputPath = path.join(outputDir, filename);

    await sharp(sourcePath)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 90, alphaQuality: 95, effort: 6 })
      .toFile(outputPath);

    sources[width] = `/assets/player-card-images/${filename}`;
    generated += 1;
  }

  cardManifest[localPath] = sources;
}

fs.writeFileSync(
  manifestPath,
  `${JSON.stringify(cardManifest, null, 2)}\n`,
);

console.log(
  `Generated ${generated} card images for ${Object.keys(cardManifest).length} players.`,
);
