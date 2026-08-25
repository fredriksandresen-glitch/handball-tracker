#!/usr/bin/env node
// Verifiserer at LIVE canister er identisk med lokal dist/ (hash-sammenligning).
// Kjøres ETTER deploy.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.CANISTER_URL ?? "https://hrzvs-liaaa-aaaap-qusna-cai.icp0.io";
const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, "..", "dist");

const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function fetchLive(path) {
  const response = await fetch(BASE + "/" + path, {
    headers: { "Cache-Control": "no-cache" },
  });
  if (!response.ok) throw new Error(path + " -> HTTP " + response.status);
  return Buffer.from(await response.arrayBuffer());
}

const assets = readdirSync(resolve(distDir, "assets"));
const targets = ["index.html"];
for (const prefix of ["index-", "PlayerPage-", "TeamPage-"]) {
  const file = assets.find((n) => n.startsWith(prefix) && n.endsWith(".js"));
  if (file) targets.push("assets/" + file);
}

let mismatches = 0;
console.log("Verifiserer live mot lokal dist/\n");

for (const target of targets) {
  const localHash = sha(readFileSync(resolve(distDir, target)));
  try {
    const liveHash = sha(await fetchLive(target));
    const match = localHash === liveHash;
    if (!match) mismatches += 1;
    console.log(
      (match ? "ok    " : "FAIL  ") + target +
      "\n        live  " + liveHash.slice(0, 16) +
      "\n        lokal " + localHash.slice(0, 16),
    );
  } catch (error) {
    mismatches += 1;
    console.error("FAIL  " + target + " - " + error.message);
  }
}

const buildInfo = JSON.parse(readFileSync(resolve(distDir, "build-info.json"), "utf8"));
const liveInfo = JSON.parse((await fetchLive("build-info.json")).toString("utf8"));
console.log("\nlokal commit " + buildInfo.shortCommit + " | live commit " + liveInfo.shortCommit);
if (buildInfo.commit !== liveInfo.commit) {
  mismatches += 1;
  console.error("FAIL  commit-mismatch: live kjører ikke koden du nettopp bygde.");
}

if (mismatches > 0) {
  console.error("\n" + mismatches + " avvik. Live er IKKE i sync med bygget.");
  process.exit(1);
}
console.log("\nLive er identisk med lokalt bygg.");
