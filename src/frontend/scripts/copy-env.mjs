import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

fs.copyFileSync(
  path.resolve(__dirname, "../env.json"),
  path.resolve(__dirname, "../dist/env.json"),
);
