import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "..");
const distRoot = path.join(frontendRoot, "dist");
const dataRoot = path.join(frontendRoot, "src", "data");

const SITE_URL = (process.env.VITE_PUBLIC_SITE_URL ?? "https://handball-tracker-frontend.vercel.app").replace(/\/$/, "");

const teams = [
  { name: "Fjellhammer", roster: "fjellhammerRoster.json", stats: "fjellhammerPlayerStats.json" },
  { name: "Larvik", roster: "larvikRoster.json", stats: "larvikPlayerStats.json" },
  { name: "Byåsen", roster: "byaasenRoster.json", stats: "byaasenPlayerStats.json" },
  { name: "Molde", roster: "moldeRoster.json", stats: "moldePlayerStats.json" },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatNumber(value, digits = 1) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "0";
  return Number(value).toFixed(digits).replace(/\.0$/, "");
}

function isKeeper(player) {
  return String(player.position ?? "").toLowerCase().includes("målvakt");
}

function makeDescription(player, stats) {
  const season = stats?.seasonStats ?? {};
  const matches = season.matches ?? 0;

  if (isKeeper(player)) {
    const savePct = stats?.goalkeeperStats?.savePercentage ?? season.shotPercentage ?? 0;
    const saves = stats?.goalkeeperStats?.saves ?? 0;
    return `${formatNumber(savePct)}% redninger · ${saves} redninger · ${matches} kamper`;
  }

  const goals = season.goals ?? 0;
  const assists = season.assists ?? 0;
  const goalsPerGame = matches > 0 ? goals / matches : 0;
  return `${goals} mål · ${assists} assist · ${formatNumber(goalsPerGame, 2)} mål/kamp`;
}

function injectMeta(indexHtml, player, teamName, description) {
  const title = `${player.name} | ${teamName} | REMA 1000-ligaen`;
  const url = `${SITE_URL}/player/${player.id}`;
  const imageUrl = player.imageUrl || `${SITE_URL}/apple-touch-icon.png`;

  const meta = `
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="profile" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:alt" content="${escapeHtml(player.name)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`;

  return indexHtml
    .replace(/<title>.*?<\/title>/s, "")
    .replace(/\s*<meta name="description"[^>]*>\s*/g, "")
    .replace(/\s*<meta property="og:[^"]+"[^>]*>\s*/g, "")
    .replace(/\s*<meta name="twitter:[^"]+"[^>]*>\s*/g, "")
    .replace("</head>", `${meta}\n  </head>`);
}

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataRoot, fileName), "utf8"));
}

async function main() {
  const indexHtml = await readFile(path.join(distRoot, "index.html"), "utf8");
  let generated = 0;

  for (const team of teams) {
    const roster = await readJson(team.roster);
    const statsRows = await readJson(team.stats);
    const statsById = new Map(statsRows.map((row) => [String(row.playerId), row]));

    for (const player of roster) {
      const stats = statsById.get(String(player.id));
      const description = makeDescription(player, stats);
      const html = injectMeta(indexHtml, player, team.name, description);
      const outDir = path.join(distRoot, "player", String(player.id));
      await mkdir(outDir, { recursive: true });
      await writeFile(path.join(outDir, "index.html"), html);
      generated += 1;
    }
  }

  console.log(`Generated ${generated} player social preview pages.`);
}

await main();
