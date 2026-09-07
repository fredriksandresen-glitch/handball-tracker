#!/usr/bin/env node
/**
 * Synkroniserer lagtropper fra topphandball.no (F12).
 *
 * BAKGRUNN (KS 2026-09-06): rosterfilene laa igjen paa 2025-26-sesongen.
 * 40 spillere hadde byttet klubb, 100 var ute av alle tropper og 119 nye
 * manglet. Ingenting fanget det, fordi vi sammenlignet paa spiller-ID.
 *
 * VIKTIG OM ID-ER: topphandball sine spiller-ID-er er LAG-PREFIKSET.
 * Samme person faar ny ID naar hun bytter klubb (Aula: 2239821003.. ->
 * 8163971003..). ID er derfor IKKE stabil paa tvers av klubber, og all
 * sammenligning mellom lag maa skje paa navn.
 *
 * Bruk:
 *   node scripts/sync-rosters.mjs           # skriver rosterfilene
 *   node scripts/sync-rosters.mjs --check   # exit 1 hvis noe har endret seg
 *   node scripts/sync-rosters.mjs --report  # bare vis diff, skriv ingenting
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, "..", "src", "data");

const MODE = process.argv.includes("--check")
  ? "check"
  : process.argv.includes("--report")
    ? "report"
    : "write";

/**
 * primeTeamId fra leagueStandings.ts. Kilden sin egen lag-ID.
 *
 * MERK ligatilhoerighet: rettet 2026-09-07 etter kontroll mot tabellene.
 * Fjellhammer spiller i Elkjoep-ligaen 26/27 (ikke 1. divisjon), mens Aker og
 * Baekkelaget er i 1. divisjon. Jeg hadde gjettet ut fra fjoraaret.
 * Fasit er alltid leagueStandingsCurrent*.json, ikke hukommelsen.
 */
export const TEAMS = {
  "Storhamar": { id: 746223, file: "storhamarRoster.json", league: "elite" },
  "Larvik": { id: 223994, file: "larvikRoster.json", league: "elite" },
  "Sola": { id: 223983, file: "solaRoster.json", league: "elite" },
  "Byåsen": { id: 454116, file: "byaasenRoster.json", league: "elite" },
  "Tertnes": { id: 470538, file: "tertnesRoster.json", league: "elite" },
  "Molde": { id: 775789, file: "moldeRoster.json", league: "elite" },
  "Gjerpen": { id: 453373, file: "gjerpenRoster.json", league: "elite" },
  "Flint": { id: 710438, file: "flintRoster.json", league: "elite" },
  "Fana": { id: 225474, file: "fanaRoster.json", league: "elite" },
  "Oppsal": { id: 441915, file: "oppsalRoster.json", league: "elite" },
  "Fredrikstad": { id: 441651, file: "fredrikstadRoster.json", league: "elite" },
  "Utleira": { id: 532136, file: "utleiraRoster.json", league: "elite" },
  "Follo Damer": { id: 583889, file: "folloRoster.json", league: "elite" },
  "Bækkelaget": { id: 223985, file: "baekkelagetRoster.json", league: "first-division" },
  "Aker": { id: 816397, file: "akerRoster.json", league: "first-division" },
  "Fjellhammer": { id: 223982, file: "fjellhammerRoster.json", league: "elite" },
  "Fyllingen": { id: 224174, file: "fyllingenRoster.json", league: "first-division" },
  "Haslum": { id: 928836, file: "haslumRoster.json", league: "first-division" },
  "HK Rygge": { id: 450329, file: "hkRyggeRoster.json", league: "first-division" },
  "Levanger": { id: 224372, file: "levangerRoster.json", league: "first-division" },
  "Stavanger": { id: 224507, file: "stavangerRoster.json", league: "first-division" },
  "Trondheim TH": { id: 985298, file: "trondheimRoster.json", league: "first-division" },
  "Volda": { id: 532788, file: "voldaRoster.json", league: "first-division" },
  "Åsane": { id: 453275, file: "asaneRoster.json", league: "first-division" },
  "Kjelsås": { id: 224860, file: "kjelsaasRoster.json", league: "first-division" },
  "Gjøvik": { id: 223999, file: "gjovikRoster.json", league: "first-division" },
};

async function fetchRoster(primeTeamId) {
  const body = new URLSearchParams({
    template: "listing/players/roster.php",
    id: String(primeTeamId),
    queryString: "teams/" + primeTeamId + "/players?usenif&size=500",
    queryType: "roster-players",
  });
  const res = await fetch("https://admin.topphandball.no/apps/prime/prime.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const json = JSON.parse(await res.text());
  return json.markup ?? "";
}

/**
 * Kortene splittes paa class="prime-roster-card". Navnet ligger som ren
 * tekst i <h2 class="title prime-player">, etter en inline-SVG som maa
 * strippes foerst. Bilder ligger som CSS background:url(), ikke <img src>.
 */
function parseRoster(html) {
  const players = [];
  for (const chunk of html.split('class="prime-roster-card"').slice(1)) {
    const id = chunk.match(/player_id=(\d+)/)?.[1];
    const shirt = chunk.match(/data-player-number="(\d+)"/)?.[1];
    const h2 = chunk.match(/<h2[^>]*class="title prime-player[^"]*"[^>]*>([\s\S]*?)<\/h2>/);
    const image = chunk.match(/background:url\(([^)]+)\)/)?.[1];
    // Posisjonen ligger i en skjult <small>: "publish, 1, Kantspiller venstre".
    // Vi tar siste komma-separerte felt. Tidligere forsoek paa aa lese den fra
    // synlige noder traff bare 38 av 493 spillere.
    const posRaw = chunk
      .match(/<small[^>]*class="[^"]*d-none[^"]*"[^>]*>([^<]*)<\/small>/i)?.[1]
      ?.split(",")
      .pop()
      ?.trim();
    if (!id || !h2) continue;
    // MERK rekkefoelgen: trim FOER draktnummeret strippes. Ledende mellomrom
    // gjorde at /^\d+:/ ikke matchet, og navnene ble lagret som "14: My Lervold".
    const name = h2[1]
      .replace(/<svg[\s\S]*?<\/svg>/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^\d+\s*:\s*/, "")
      .trim();
    if (!name) continue;
    players.push({
      id,
      name,
      imageUrl: image && !/default_male|default_female/.test(image) ? image : "",
      position: posRaw ? posRaw.replace(/\s+/g, " ").trim() : "",
      shirtNumber: shirt ? Number(shirt) : undefined,
    });
  }
  return players;
}

function readLocal(file) {
  const path = resolve(dataDir, file);
  if (!existsSync(path)) return null;
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  return Array.isArray(parsed) ? parsed : (parsed.players ?? []);
}

const normalize = (value) =>
  (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

async function main() {
  const live = {};
  const failures = [];

  for (const [team, meta] of Object.entries(TEAMS)) {
    try {
      const players = parseRoster(await fetchRoster(meta.id));
      // En tom tropp er nesten alltid en parsefeil, ikke virkeligheten.
      // Vi skriver ALDRI en tom tropp over eksisterende data.
      if (players.length === 0) throw new Error("tom tropp fra kilden");
      live[team] = players;
      process.stderr.write("  " + team + ": " + players.length + "\n");
    } catch (error) {
      failures.push(team + ": " + error.message);
      process.stderr.write("  " + team + ": FEILET (" + error.message + ")\n");
    }
    await new Promise((r) => setTimeout(r, 350));
  }

  if (failures.length > 0) {
    console.error("\nKilden svarte ikke for " + failures.length + " lag:");
    failures.forEach((f) => console.error("  " + f));
    if (MODE === "write") {
      console.error("Avbryter: vil ikke skrive en delvis synk.");
      process.exit(1);
    }
  }

  // Indeks over hvor hver spiller er NAA, for aa skille klubbytte fra sluttet
  const liveTeamByName = new Map();
  for (const [team, players] of Object.entries(live))
    for (const pl of players) liveTeamByName.set(normalize(pl.name), team);

  const moved = [];
  const left = [];
  const joined = [];
  let changedFiles = 0;

  for (const [team, meta] of Object.entries(TEAMS)) {
    const players = live[team];
    if (!players) continue;
    const local = readLocal(meta.file);

    if (local) {
      const liveNames = new Set(players.map((x) => normalize(x.name)));
      const localNames = new Set(local.map((x) => normalize(x.name)));
      for (const x of local) {
        const key = normalize(x.name);
        if (liveNames.has(key)) continue;
        const now = liveTeamByName.get(key);
        if (now) moved.push(x.name + ": " + team + " -> " + now);
        else left.push(x.name + " (" + team + ")");
      }
      for (const x of players)
        if (!localNames.has(normalize(x.name))) joined.push(x.name + " -> " + team);
    } else {
      joined.push("(ny fil) " + meta.file + ": " + players.length + " spillere");
    }

    const next = JSON.stringify(players, null, 2) + "\n";
    const path = resolve(dataDir, meta.file);
    const current = existsSync(path) ? readFileSync(path, "utf8") : "";
    if (next !== current) {
      changedFiles += 1;
      if (MODE === "write") writeFileSync(path, next);
    }
  }

  console.log("\n== Troppsendringer mot lokale data ==");
  console.log("Byttet klubb: " + moved.length);
  moved.forEach((m) => console.log("  " + m));
  console.log("Ute av alle tropper: " + left.length);
  console.log("Nye spillere: " + joined.length);
  console.log("Filer som endres: " + changedFiles);

  if (MODE === "check" && changedFiles > 0) {
    console.error("\nTroppene er utdaterte. Kjoer: node scripts/sync-rosters.mjs");
    process.exit(1);
  }
  if (MODE === "write") console.log("\nSkrev " + changedFiles + " rosterfiler.");
}

// Kjoer BARE naar fila startes direkte. Uten denne vakten startet hele
// rostersynken som sideeffekt av at et annet script importerte TEAMS
// (oppdaget 2026-09-07: to synker kjoerte samtidig og skrev over hverandre).
const isDirectRun =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error("Synk feilet:", error.message);
    process.exit(1);
  });
}
