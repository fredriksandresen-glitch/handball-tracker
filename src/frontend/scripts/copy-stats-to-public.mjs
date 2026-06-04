import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "..");
const dataRoot = path.join(frontendRoot, "src", "data");
const publicDataRoot = path.join(frontendRoot, "public", "data");
const publicPlayerStatsRoot = path.join(publicDataRoot, "player-stats");

const statFiles = [
  "fjellhammerPlayerStats.json",
  "larvikPlayerStats.json",
  "fanaPlayerStats.json",
  "fredrikstadPlayerStats.json",
  "gjerpenPlayerStats.json",
  "haslumPlayerStats.json",
  "byaasenPlayerStats.json",
  "moldePlayerStats.json",
  "oppsalPlayerStats.json",
  "solaPlayerStats.json",
  "folloPlayerStats.json",
  "storhamarPlayerStats.json",
  "tertnesPlayerStats.json",
];

await mkdir(publicDataRoot, { recursive: true });
await mkdir(publicPlayerStatsRoot, { recursive: true });

for (const file of statFiles) {
  const source = path.join(dataRoot, file);
  await copyFile(source, path.join(publicDataRoot, file));
  await copyFile(source, path.join(publicPlayerStatsRoot, file));
}

console.log(`Copied ${statFiles.length} player stat files to public/data and public/data/player-stats.`);
