import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(process.env.HOME + "/apps/handball-icp/src/frontend/package.json");
const sharp = require("sharp");

const FRONTEND = process.env.HOME + "/apps/handball-icp/src/frontend/";
const PUBLIC = FRONTEND + "public";
const DATA = FRONTEND + "src/data/";
const MAIN = DATA + "playerImageManifest.json";
const CARD = DATA + "playerCardImageManifest.json";
const LEGACY = DATA + "playerImageLegacyManifest.json";

const QUALITY = 95;
const CHECK = process.argv.includes("--check");

// Originalbildene laa som raa PNG (snitt 1,3 MB). De brukes paa profilsiden og
// i lightboxen, saa opplosningen maa beholdes - men formatet trenger ikke vaere
// PNG. WebP q95 gir ~80% mindre uten synlig tap paa foto, og holder canisterens
// minnebruk (og dermed cycles) nede. Steget er idempotent: allerede konverterte
// .webp-filer hoppes over.
function loadJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function saveJson(p, v) { fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n"); }

const main = loadJson(MAIN);
const card = fs.existsSync(CARD) ? loadJson(CARD) : {};
const legacy = fs.existsSync(LEGACY) ? loadJson(LEGACY) : {};

const remap = new Map();
let converted = 0, skipped = 0, saved = 0, failed = [];

const allLocalPaths = new Set([
  ...Object.values(main),
  ...Object.values(legacy),
]);

for (const localPath of allLocalPaths) {
  if (typeof localPath !== "string" || !localPath.startsWith("/assets/")) continue;
  if (localPath.endsWith(".webp")) { skipped++; continue; }
  if (!/\.(png|jpe?g)$/i.test(localPath)) { skipped++; continue; }

  const abs = path.join(PUBLIC, localPath.slice(1));
  if (!fs.existsSync(abs)) { failed.push(localPath + " (mangler)"); continue; }

  const target = localPath.replace(/\.(png|jpe?g)$/i, ".webp");
  const absTarget = path.join(PUBLIC, target.slice(1));
  const before = fs.statSync(abs).size;

  if (CHECK) { remap.set(localPath, target); converted++; continue; }

  try {
    const meta = await sharp(abs).metadata();
    await sharp(abs)
      .rotate()
      .webp({ quality: QUALITY, alphaQuality: 100, effort: 5 })
      .toFile(absTarget);
    const after = fs.statSync(absTarget).size;
    if (after >= before) { fs.unlinkSync(absTarget); skipped++; continue; }
    fs.unlinkSync(abs);
    remap.set(localPath, target);
    converted++;
    saved += before - after;
    if (converted % 50 === 0) console.log("  ...", converted, "konvertert");
  } catch (e) {
    failed.push(localPath + " (" + e.message.slice(0, 50) + ")");
  }
}

if (CHECK) {
  console.log("--check: " + converted + " fil(er) ville blitt konvertert, " + skipped + " allerede optimale.");
  process.exit(converted > 0 ? 1 : 0);
}

for (const [url, local] of Object.entries(main)) if (remap.has(local)) main[url] = remap.get(local);
for (const [url, local] of Object.entries(legacy)) if (remap.has(local)) legacy[url] = remap.get(local);
const newCard = {};
for (const [local, sizes] of Object.entries(card)) newCard[remap.get(local) ?? local] = sizes;

saveJson(MAIN, main);
saveJson(LEGACY, legacy);
saveJson(CARD, newCard);

console.log("konvertert:", converted, "| hoppet over:", skipped, "| spart:", Math.round(saved / 1024 / 1024), "MB");
if (failed.length) { console.warn("feilet (" + failed.length + "):"); for (const f of failed.slice(0, 10)) console.warn("  -", f); }
