#!/usr/bin/env node
// Feature guard: verifiserer at dist/ inneholder alle funksjoner i feature-registry.json.
// Kjøres FØR deploy. Exit 1 = ikke deploy.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, "..", "dist");
const registryPath = resolve(here, "..", "feature-registry.json");
const registry = JSON.parse(readFileSync(registryPath, "utf8"));

function readBundle(bundleName) {
  if (bundleName === "index.html") {
    return readFileSync(resolve(distDir, "index.html"), "utf8");
  }
  const assetsDir = resolve(distDir, "assets");
  const file = readdirSync(assetsDir).find(
    (name) => name.startsWith(bundleName + "-") && name.endsWith(".js"),
  );
  if (!file) return null;
  return readFileSync(resolve(assetsDir, file), "utf8");
}

let failed = 0;
console.log("Feature guard: sjekker " + registry.features.length + " funksjoner mot dist/\n");

for (const feature of registry.features) {
  const source = readBundle(feature.bundle);
  if (source === null) {
    console.error("FAIL  " + feature.id + " - fant ikke bundle " + feature.bundle);
    failed += 1;
    continue;
  }

  const missing = (feature.requiredMarkers ?? []).filter((m) => !source.includes(m));
  const present = (feature.forbiddenMarkers ?? []).filter((m) => source.includes(m));

  if (missing.length === 0 && present.length === 0) {
    console.log("ok    " + feature.id + " - " + feature.label);
    continue;
  }

  failed += 1;
  console.error("FAIL  " + feature.id + " - " + feature.label);
  if (missing.length) console.error("        mangler: " + missing.join(", "));
  if (present.length) console.error("        skal ikke finnes: " + present.join(", "));
  if (feature.note) console.error("        " + feature.note);
}

if (failed > 0) {
  console.error("\n" + failed + " funksjon(er) mangler i bygget. DEPLOY STOPPET.");
  console.error("Bygger du fra riktig branch? Sjekk: git log --oneline -1");
  process.exit(1);
}
console.log("\nAlle funksjoner til stede. Klar for deploy.");
