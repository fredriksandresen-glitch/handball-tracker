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

// En enkelt ugyldig fil (f.eks. en PDF som ble lastet ned som "bilde") stoppet
// tidligere HELE kortgenereringen, slik at manifestet aldri ble skrevet og alle
// spillere mistet de raske webp-kortene. Nå sjekkes magiske bytes først, og
// uventede feil hoppes over med tydelig logg i stedet for å rive ned bygget.
function isSupportedImage(filePath) {
  let fd;
  try {
    fd = fs.openSync(filePath, "r");
    const head = Buffer.alloc(12);
    fs.readSync(fd, head, 0, 12, 0);
    const hex = head.toString("hex");
    return (
      hex.startsWith("89504e47") || // PNG
      hex.startsWith("ffd8ff") || // JPEG
      hex.startsWith("474946") || // GIF
      (hex.startsWith("52494646") && head.subarray(8, 12).toString() === "WEBP")
    );
  } catch {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

const cardManifest = {};
let generated = 0;
const skipped = [];

for (const localPath of new Set(Object.values(playerImageManifest))) {
  if (!localPath.startsWith("/assets/player-images/")) continue;

  const sourcePath = path.join(publicDir, localPath.slice(1));
  if (!fs.existsSync(sourcePath)) continue;

  if (!isSupportedImage(sourcePath)) {
    skipped.push(`${localPath} (ikke et gyldig bildeformat)`);
    continue;
  }

  const stem = path.parse(sourcePath).name;
  const sources = {};

  try {
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
  } catch (error) {
    skipped.push(`${localPath} (${error.message})`);
    continue;
  }

  cardManifest[localPath] = sources;
}

if (skipped.length > 0) {
  console.warn(`Hoppet over ${skipped.length} fil(er):`);
  for (const entry of skipped) console.warn(`  - ${entry}`);
}

fs.writeFileSync(
  manifestPath,
  `${JSON.stringify(cardManifest, null, 2)}\n`,
);

console.log(
  `Generated ${generated} card images for ${Object.keys(cardManifest).length} players.`,
);
