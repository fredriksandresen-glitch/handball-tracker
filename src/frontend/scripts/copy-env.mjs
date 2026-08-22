import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sourcePath = path.resolve(__dirname, "../env.json");
const outputPath = path.resolve(__dirname, "../dist/env.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const runtimeConfig = {
  ...source,
  ai_chat_mode:
    process.env.VITE_AI_CHAT_MODE ?? source.ai_chat_mode ?? "auto",
  clawdbot_ai_url:
    process.env.VITE_CLAWDBOT_AI_URL ?? source.clawdbot_ai_url ?? "",
  ai_chat_request_timeout_ms:
    process.env.VITE_AI_CHAT_REQUEST_TIMEOUT_MS ??
    source.ai_chat_request_timeout_ms ??
    "45000",
  icp_network:
    process.env.VITE_ICP_NETWORK ?? source.icp_network ?? "ic",
  backend_canister_id:
    process.env.VITE_ICP_BACKEND_CANISTER_ID ??
    source.backend_canister_id ??
    "",
};

fs.writeFileSync(outputPath, `${JSON.stringify(runtimeConfig, null, 2)}\n`);
