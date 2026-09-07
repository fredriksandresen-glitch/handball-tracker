#!/usr/bin/env node
/**
 * Synkroniserer KOMMENDE kamper fra topphandball (F14).
 *
 * BAKGRUNN 2026-09-07: nextMatches.ts var en haandskrevet terminliste som
 * stoppet 30. august. Alle kamper var spilt, saa "neste kamp" var tom for
 * alle lag - Fjellhammer har kamp 13.09.
 *
 * Endepunktet stats/statsmatches.php gir kun SPILTE kamper (from=START,
 * to=NOW). listing/matches/upcoming.php gir de kommende.
 *
 * Bruk:
 *   node scripts/sync-upcoming-matches.mjs
 *   node scripts/sync-upcoming-matches.mjs --check   # exit 1 hvis utdatert
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TEAMS } from "./sync-rosters.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, "..", "src", "data");
const PRIME_URL = "https://admin.topphandball.no/apps/prime/prime.php";
const CHECK_ONLY = process.argv.includes("--check");

/** Turneringer vi viser. NM og treningskamper holdes utenfor terminlisten. */
const LEAGUE_BY_TOURNAMENT = {
  "Elkjøp-ligaen kvinner, 2627": "elite",
  "1. divisjon kvinner, 2627": "first-division",
};

async function postPrime(body) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(PRIME_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: new URLSearchParams(body),
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      return JSON.parse(await response.text()).markup ?? "";
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  return "";
}

const strip = (value) =>
  String(value ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&aring;/g, "\u00e5")
    .replace(/&oslash;/g, "\u00f8")
    .replace(/&aelig;/g, "\u00e6")
    .replace(/&Aring;/g, "\u00c5")
    .replace(/&Oslash;/g, "\u00d8")
    .replace(/&AElig;/g, "\u00c6")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Norsk sommertid slutter siste soendag i oktober. Kamper etter det er
 * +01:00. Uten dette ville hoestkamper faatt feil klokkeslett.
 */
function osloOffset(year, month, day) {
  const lastSunday = new Date(Date.UTC(year, 9, 31));
  while (lastSunday.getUTCDay() !== 0) lastSunday.setUTCDate(lastSunday.getUTCDate() - 1);
  const date = new Date(Date.UTC(year, month - 1, day));
  const marchLast = new Date(Date.UTC(year, 2, 31));
  while (marchLast.getUTCDay() !== 0) marchLast.setUTCDate(marchLast.getUTCDate() - 1);
  return date >= marchLast && date < lastSunday ? "+02:00" : "+01:00";
}

function toIso(dateText, timeText) {
  const [d, m, y] = dateText.split("/").map((x) => Number.parseInt(x, 10));
  if (!d || !m || !y) return null;
  const time = (timeText.match(/(\d{1,2}):(\d{2})/) ?? []).slice(1);
  const hh = time[0] ? time[0].padStart(2, "0") : "00";
  const mm = time[1] ?? "00";
  const pad = (n) => String(n).padStart(2, "0");
  return y + "-" + pad(m) + "-" + pad(d) + "T" + hh + ":" + mm + ":00" + osloOffset(y, m, d);
}

function parseUpcoming(html) {
  const rows = [];
  const blocks = html.split(/<div class="row prime-match /).slice(1);
  for (const block of blocks) {
    const id = block.match(/data-id="(\d+)"/)?.[1];
    const date = strip(block.match(/class="prime-date[^"]*"[^>]*>([^<]*)</)?.[1]);
    const time = strip(block.match(/class="prime-time[^"]*"[^>]*>([^<]*)</)?.[1]);
    const title = strip(block.match(/class="prime-match-title[^"]*"[^>]*>([^<]*)</)?.[1]);
    const tournament = strip(block.match(/class="prime-tournament[^"]*"[^>]*>([^<]*)</)?.[1]);
    const arena = strip(block.match(/class="prime-arena[^"]*"[^>]*>([^<]*)</)?.[1]);
    if (!id || !date || !title) continue;
    const league = LEAGUE_BY_TOURNAMENT[tournament];
    if (!league) continue;
    const [home, away] = title.split(" - ").map((x) => x.trim());
    if (!home || !away) continue;
    const startTime = toIso(date, time);
    if (!startTime) continue;
    rows.push({ matchId: Number.parseInt(id, 10), startTime, homeTeamName: home, awayTeamName: away, venue: arena || "", league });
  }
  return rows;
}

async function main() {
  const byId = new Map();
  const failures = [];

  for (const [team, meta] of Object.entries(TEAMS)) {
    try {
      const markup = await postPrime({
        template: "listing/matches/upcoming.php",
        id: String(meta.id),
        queryString: "teams/" + meta.id + "/matches/?size=50&from=#$#NOW#$#&sort=asc&usenif",
        queryType: "matches",
      });
      const rows = parseUpcoming(markup);
      // Samme kamp finnes hos begge lag - matchId dedupliserer.
      for (const row of rows) byId.set(row.matchId, row);
      process.stderr.write("  " + team + ": " + rows.length + "\n");
    } catch (error) {
      failures.push(team + ": " + error.message);
      process.stderr.write("  " + team + ": FEILET (" + error.message + ")\n");
    }
    await new Promise((r) => setTimeout(r, 350));
  }

  if (failures.length > 0) {
    console.error("Kilden svarte ikke for " + failures.length + " lag:");
    failures.forEach((f) => console.error("  " + f));
    if (!CHECK_ONLY) { console.error("Avbryter: vil ikke skrive en delvis terminliste."); process.exit(1); }
  }

  const all = [...byId.values()].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  // En tom liste er nesten alltid en parsefeil - vi overskriver ikke da.
  if (all.length === 0) { console.error("Ingen kamper parset. Skriver ikke."); process.exit(1); }

  const outPath = resolve(dataDir, "upcomingMatches.json");
  const next = JSON.stringify(all, null, 2) + "\n";
  const current = existsSync(outPath) ? readFileSync(outPath, "utf8") : "";

  const elite = all.filter((m) => m.league === "elite").length;
  console.log("Kommende kamper: " + all.length + " (elite " + elite + ", 1.div " + (all.length - elite) + ")");
  if (all[0]) console.log("Foerste: " + all[0].startTime.slice(0, 16) + " " + all[0].homeTeamName + " - " + all[0].awayTeamName);

  if (next === current) { console.log("Uendret."); return; }
  if (CHECK_ONLY) { console.error("Terminlisten er utdatert. Kjoer: node scripts/sync-upcoming-matches.mjs"); process.exit(1); }
  writeFileSync(outPath, next);
  console.log("Skrev src/data/upcomingMatches.json");
}

main().catch((error) => { console.error("Synk feilet:", error.message); process.exit(1); });
