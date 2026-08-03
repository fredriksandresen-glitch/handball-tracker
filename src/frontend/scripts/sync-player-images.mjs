#!/usr/bin/env node
/**
 * Sync player images from external URLs to local storage.
 * Reuses existing images, only downloads new or changed URLs.
 * Never deletes existing images automatically.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, "../src/data");
const IMAGE_DIR = path.resolve(__dirname, "../public/assets/player-images");
const MANIFEST_PATH = path.resolve(__dirname, "../src/data/playerImageManifest.json");

const EXT_BY_MIME = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

function hashUrl(url) {
  return crypto.createHash("sha256").update(url).digest("hex").slice(0, 16);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadManifest() {
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
    } catch {
      return {};
    }
  }
  return {};
}

function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
}

function extractImageUrls() {
  const urls = new Set();
  const files = fs.readdirSync(DATA_DIR);

  for (const file of files) {
    const fullPath = path.join(DATA_DIR, file);
    if (!fs.statSync(fullPath).isFile()) continue;

    let content;
    if (file.endsWith(".json")) {
      content = fs.readFileSync(fullPath, "utf-8");
    } else if (file.endsWith(".ts")) {
      content = fs.readFileSync(fullPath, "utf-8");
    } else {
      continue;
    }

    const matches = content.match(/https?:\/\/[^"'\s)]+/g) || [];
    for (const url of matches) {
      // Skip non-image URLs
      if (
        url.includes("finnhandball.net") ||
        url.includes("default_male") ||
        url.includes("w3.org")
      ) {
        continue;
      }
      urls.add(url);
    }
  }

  return Array.from(urls);
}

async function fetchImage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; HandballTracker/1.0)",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  const buffer = Buffer.from(await res.arrayBuffer());

  // Sanity check: reject obviously broken responses (HTML error pages)
  if (buffer.length < 100) {
    throw new Error("File too small, likely broken");
  }

  // Check magic bytes for common image formats
  const magic = buffer.slice(0, 8).toString("hex");
  const isPng = magic.startsWith("89504e47");
  const isJpeg = magic.startsWith("ffd8ff");
  const isWebp = magic.startsWith("52494646") && buffer.slice(8, 12).toString("hex") === "57454250";
  const isGif = magic.startsWith("47494638");

  if (!isPng && !isJpeg && !isWebp && !isGif) {
    // Might be an HTML error page
    const textStart = buffer.slice(0, 200).toString("utf-8").toLowerCase();
    if (textStart.includes("<!doctype") || textStart.includes("<html")) {
      throw new Error("Response is HTML, not an image");
    }
  }

  let ext = ".bin";
  if (isPng) ext = ".png";
  else if (isJpeg) ext = ".jpg";
  else if (isWebp) ext = ".webp";
  else if (isGif) ext = ".gif";
  else {
    const mimeExt = EXT_BY_MIME[contentType.split(";")[0].trim().toLowerCase()];
    if (mimeExt) ext = mimeExt;
  }

  return { buffer, ext };
}

async function main() {
  ensureDir(IMAGE_DIR);
  const manifest = loadManifest();
  const urls = extractImageUrls();

  let downloaded = 0;
  let reused = 0;
  let failed = [];

  for (const url of urls) {
    const fileHash = hashUrl(url);

    // Check if already in manifest and file exists
    const existingLocal = manifest[url];
    if (existingLocal) {
      // existingLocal starts with "/", so strip it before resolving
      const relativePath = existingLocal.startsWith("/")
        ? existingLocal.slice(1)
        : existingLocal;
      const existingPath = path.resolve(__dirname, "../public", relativePath);
      if (fs.existsSync(existingPath)) {
        reused++;
        continue;
      }
      // File missing but manifest entry exists — re-download
    }

    try {
      const { buffer, ext } = await fetchImage(url);
      const filename = `${fileHash}${ext}`;
      const localPath = path.join(IMAGE_DIR, filename);
      fs.writeFileSync(localPath, buffer);
      manifest[url] = `/assets/player-images/${filename}`;
      downloaded++;
      console.log(`✓ Downloaded: ${url} → ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`✗ Failed: ${url} — ${err.message}`);
      failed.push({ url, error: err.message });
    }
  }

  saveManifest(manifest);

  console.log("\n=== Sync Summary ===");
  console.log(`Total URLs:     ${urls.length}`);
  console.log(`Downloaded:     ${downloaded}`);
  console.log(`Reused:         ${reused}`);
  console.log(`Failed:         ${failed.length}`);

  if (failed.length > 0) {
    console.log("\nFailed downloads:");
    for (const f of failed) {
      console.log(`  - ${f.url}: ${f.error}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
