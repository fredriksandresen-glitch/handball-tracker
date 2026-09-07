#!/usr/bin/env node
/**
 * sync-league-standings.mjs
 *
 * Henter kampresultater fra topphandball (prime.webcore.no) og regner ut
 * ligatabellene for innevaerende sesong. Skriver resultatet inn i repoet som
 * JSON, slik at tabellen overlever redeploy og ikke er avhengig av at et
 * eksternt endepunkt svarer naar brukeren aapner appen.
 *
 * Bruk:
 *   node scripts/sync-league-standings.mjs           # skriv oppdatert tabell
 *   node scripts/sync-league-standings.mjs --check   # bare rapporter, ikke skriv
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "..", "src", "data");

const API = "https://prime.webcore.no";
// topphandball filtrerer paa User-Agent: en tom/ukjent UA gir 0 bytes tilbake.
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const TOURNAMENTS = [
  { key: "elite", tournamentId: 446211, outFile: "leagueStandingsCurrentElite.json" },
  { key: "first-division", tournamentId: 446503, outFile: "leagueStandingsCurrentFirstDivision.json" },
];

const WIN_POINTS = 2;
const DRAW_POINTS = 1;

const checkOnly = process.argv.includes("--check");

async function getJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  const text = await response.text();
  if (!text.trim()) throw new Error(`${url} -> tomt svar (UA blokkert?)`);
  return JSON.parse(text);
}

function teamName(team) {
  // Kortnavnet fra topphandball ("Storhamar", "Gjerpen") matcher navnekonvensjonen
  // i appen. Langnavnet ("Storhamar Handball Elite") bryter oppslag mot laglogoer.
  return team?.name?.short?.trim() || team?.name?.long?.trim() || "";
}

function isPlayed(match) {
  const home = match?.home?.score;
  const away = match?.away?.score;
  if (!Number.isFinite(home) || !Number.isFinite(away)) return false;
  // Uspilte kamper ligger inne med 0-0. Haandball ender aldri 0-0.
  if (home === 0 && away === 0) return false;
  const when = match?.when?.time;
  if (Number.isFinite(when) && when * 1000 > Date.now()) return false;
  return true;
}

function buildStandings(matches, teams) {
  const rows = new Map();
  const ensure = (team) => {
    const id = String(team.id);
    if (!rows.has(id)) {
      rows.set(id, {
        name: teamName(team),
        primeTeamId: id,
        rank: 0,
        previousRank: 0,
        rankDelta: 0,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      });
    }
    return rows.get(id);
  };

  for (const team of teams) ensure(team);

  let counted = 0;
  for (const match of matches) {
    if (!isPlayed(match)) continue;
    counted += 1;
    const home = ensure(match.home);
    const away = ensure(match.away);
    const hs = match.home.score;
    const as = match.away.score;

    home.played += 1;
    away.played += 1;
    home.goalsFor += hs;
    home.goalsAgainst += as;
    away.goalsFor += as;
    away.goalsAgainst += hs;

    if (hs > as) {
      home.wins += 1;
      away.losses += 1;
      home.points += WIN_POINTS;
    } else if (hs < as) {
      away.wins += 1;
      home.losses += 1;
      away.points += WIN_POINTS;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += DRAW_POINTS;
      away.points += DRAW_POINTS;
    }
  }

  const table = [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = a.goalsFor - a.goalsAgainst;
    const diffB = b.goalsFor - b.goalsAgainst;
    if (diffB !== diffA) return diffB - diffA;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.name.localeCompare(b.name, "nb");
  });

  table.forEach((row, index) => {
    row.rank = index + 1;
  });
  return { table, counted };
}

function applyPreviousRanks(table, outPath) {
  let previous = [];
  try {
    previous = JSON.parse(readFileSync(outPath, "utf8"));
  } catch {
    previous = [];
  }
  const previousRankById = new Map(
    previous.map((row) => [String(row.primeTeamId), Number(row.rank) || 0]),
  );
  for (const row of table) {
    const before = previousRankById.get(row.primeTeamId) || row.rank;
    row.previousRank = before;
    row.rankDelta = before - row.rank;
  }
  return table;
}

async function syncTournament({ key, tournamentId, outFile }) {
  const [matches, teams] = await Promise.all([
    getJson(`${API}/tournaments/${tournamentId}/matches/?usenif&size=500`),
    getJson(`${API}/tournaments/${tournamentId}/teams/?usenif&size=100`),
  ]);

  const { table, counted } = buildStandings(matches, teams);
  const outPath = path.join(dataDir, outFile);
  applyPreviousRanks(table, outPath);

  const totalPlayed = table.reduce((sum, row) => sum + row.played, 0);
  if (totalPlayed !== counted * 2) {
    throw new Error(
      `${key}: inkonsistens - ${counted} kamper gir ${totalPlayed} lagkamper (forventet ${counted * 2})`,
    );
  }

  let changed = true;
  const serialized = JSON.stringify(table, null, 2) + "\n";
  try {
    changed = readFileSync(outPath, "utf8") !== serialized;
  } catch {
    changed = true;
  }

  if (!checkOnly) writeFileSync(outPath, serialized);

  return { key, tournamentId, teams: table.length, matches: matches.length, counted, changed, table, outFile };
}

async function main() {
  const results = [];
  for (const tournament of TOURNAMENTS) {
    results.push(await syncTournament(tournament));
  }

  for (const result of results) {
    console.log(
      `\n== ${result.key} (turnering ${result.tournamentId}) ==\n` +
        `lag=${result.teams} kamper i terminlisten=${result.matches} spilt=${result.counted} endret=${result.changed ? "ja" : "nei"} -> ${result.outFile}`,
    );
    console.log("  # lag                            K  S  U  T   M+   M-  P");
    for (const row of result.table) {
      console.log(
        `  ${String(row.rank).padStart(2)} ${row.name.padEnd(28).slice(0, 28)} ` +
          `${String(row.played).padStart(2)} ${String(row.wins).padStart(2)} ${String(row.draws).padStart(2)} ${String(row.losses).padStart(2)} ` +
          `${String(row.goalsFor).padStart(4)} ${String(row.goalsAgainst).padStart(4)} ${String(row.points).padStart(2)}`,
      );
    }
  }

  console.log(checkOnly ? "\n[--check] Ingen filer skrevet." : "\nTabeller skrevet til src/data.");
}

main().catch((error) => {
  console.error("sync-league-standings feilet:", error.message);
  process.exitCode = 1;
});
