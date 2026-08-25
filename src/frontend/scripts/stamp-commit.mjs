#!/usr/bin/env node
// Stamps the current git commit SHA into dist/index.html and dist/build-info.json
// so the deployed canister can always be traced back to exact source.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, "..", "dist");
const indexPath = resolve(distDir, "index.html");

function git(args) {
  try {
    return execSync(`git ${args}`, { cwd: here, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const commit = git("rev-parse HEAD") || "unknown";
const shortCommit = commit.slice(0, 7);
const branch = git("rev-parse --abbrev-ref HEAD") || "unknown";
const dirtyOutput = git("status --porcelain");
const dirty = dirtyOutput.length > 0;
const buildTime = new Date().toISOString();

const buildInfo = { commit, shortCommit, branch, dirty, buildTime };
writeFileSync(
  resolve(distDir, "build-info.json"),
  `${JSON.stringify(buildInfo, null, 2)}\n`,
);

let html = readFileSync(indexPath, "utf8");
html = html.replace(/\s*<meta name="build-commit"[^>]*>/g, "");
html = html.replace(/\s*<meta name="build-time"[^>]*>/g, "");
html = html.replace(/\s*<meta name="build-dirty"[^>]*>/g, "");
const meta = [
  `<meta name="build-commit" content="${commit}">`,
  `<meta name="build-time" content="${buildTime}">`,
  `<meta name="build-dirty" content="${dirty}">`,
].join("\n    ");
html = html.replace("</head>", `  ${meta}\n  </head>`);
writeFileSync(indexPath, html);

console.log(
  `Stamped build: ${shortCommit} (${branch})${dirty ? " DIRTY" : ""} @ ${buildTime}`,
);
if (dirty) {
  console.warn(
    "WARNING: working tree is dirty. Deployed build will not be reproducible from git.",
  );
}
