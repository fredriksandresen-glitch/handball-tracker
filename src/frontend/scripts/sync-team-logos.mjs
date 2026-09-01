#!/usr/bin/env node
/**
 * Laster ned klubblogoene lokalt.
 *
 * Bakgrunn (2026-08-27): logoene ble hentet direkte fra klubbenes egne
 * nettsider (akerth.no, fanahandball.no, ...). Legger en klubb om nettsiden
 * sin, forsvinner logoen fra appen uten forvarsel. Na lagres de i
 * public/assets/team-logos/ og serveres fra vaar egen canister.
 *
 * Kjor med --check for aa bare rapportere status uten aa laste ned.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, "..");
const sourceFile = path.join(
  frontendDir,
  "src/services/clawdbotPlayerProfile.ts",
);
const outputDir = path.join(frontendDir, "public/assets/team-logos");
const manifestPath = path.join(frontendDir, "src/data/teamLogoManifest.json");
const checkOnly = process.argv.includes("--check");

// Hent alle *_LOGO_URL-konstanter fra kildefila.
const source = fs.readFileSync(sourceFile, "utf8");
const urls = new Set();
for (const match of source.matchAll(
  /const\s+([A-Z0-9_]+)_LOGO_URL\s*=\s*\n?\s*"([^"]+)"/g,
)) {
  urls.add(match[2]);
}

if (urls.size === 0) {
  console.error("Fant ingen logo-URLer i kilden.");
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

const existing = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  : {};
const manifest = {};

let downloaded = 0;
let reused = 0;
let failed = 0;
const failures = [];

for (const url of [...urls].sort()) {
  // Allerede lokale stier (f.eks. /assets/team-logos/fredrikstad.svg) skal
  // ikke lastes ned — de ligger i public/ fra for.
  if (url.startsWith("/")) {
    manifest[url] = url;
    reused += 1;
    continue;
  }

  const clean = url.split("?")[0];
  const ext = (clean.match(/\.(svg|png|jpe?g|webp)$/i)?.[1] ?? "png").toLowerCase();
  const stem = createHash("sha256").update(url).digest("hex").slice(0, 16);
  const filename = `${stem}.${ext}`;
  const outputPath = path.join(outputDir, filename);
  const localPath = `/assets/team-logos/${filename}`;

  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    manifest[url] = localPath;
    reused += 1;
    continue;
  }

  if (checkOnly) {
    manifest[url] = existing[url] ?? localPath;
    failures.push(`mangler lokalt: ${url}`);
    failed += 1;
    continue;
  }

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "handball-tracker/1.0" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) throw new Error("tom respons");
    fs.writeFileSync(outputPath, buffer);
    manifest[url] = localPath;
    downloaded += 1;
  } catch (error) {
    // Behold forrige lokale kopi hvis vi har en; ellers fall tilbake til URL.
    manifest[url] = existing[url] ?? url;
    failures.push(`${url} -> ${error.message}`);
    failed += 1;
  }
}

if (!checkOnly) {
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

const bytes = fs
  .readdirSync(outputDir)
  .reduce((sum, f) => sum + fs.statSync(path.join(outputDir, f)).size, 0);

console.log(
  `Klubblogoer: ${downloaded} lastet ned, ${reused} gjenbrukt, ${failed} feilet av ${urls.size} totalt (${(bytes / 1024).toFixed(0)} kB lokalt).`,
);
for (const failure of failures) console.warn(`  ADVARSEL: ${failure}`);

// Feil bygget hvis vi mangler for mange — da er noe systematisk galt.
if (!checkOnly && failed > urls.size / 2) {
  console.error("For mange logoer feilet. Sjekk nettverk eller kilder.");
  process.exit(1);
}
