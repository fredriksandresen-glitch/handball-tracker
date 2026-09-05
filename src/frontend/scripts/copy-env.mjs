import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sourcePath = path.resolve(__dirname, "../env.json");
const outputPath = path.resolve(__dirname, "../dist/env.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const IC_GATEWAY = "https://icp-api.io";

// Historisk skrev denne fila strengen "undefined" tilbake i dist/env.json ved
// hver build, fordi kildefila inneholdt "undefined" og feltet ikke ble flettet.
// Manuelle patcher av dist/ ble derfor overskrevet av neste build. Nå utledes
// hvert felt her, og --check feiler bygget hvis noe fortsatt er ugyldig.
function clean(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text && text !== "undefined" && text !== "null" ? text : "";
}

const backendCanisterId =
  clean(process.env.VITE_ICP_BACKEND_CANISTER_ID) ||
  clean(source.backend_canister_id);

const icpNetwork =
  clean(process.env.VITE_ICP_NETWORK) || clean(source.icp_network) || "ic";

const backendHost =
  clean(process.env.VITE_ICP_BACKEND_HOST) ||
  clean(source.backend_host) ||
  (icpNetwork === "ic" ? IC_GATEWAY : "http://127.0.0.1:4943");

const runtimeConfig = {
  backend_host: backendHost,
  backend_canister_id: backendCanisterId,
  ai_chat_mode:
    clean(process.env.VITE_AI_CHAT_MODE) || clean(source.ai_chat_mode) || "auto",
  clawdbot_ai_url:
    clean(process.env.VITE_CLAWDBOT_AI_URL) || clean(source.clawdbot_ai_url),
  ai_chat_request_timeout_ms:
    clean(process.env.VITE_AI_CHAT_REQUEST_TIMEOUT_MS) ||
    clean(source.ai_chat_request_timeout_ms) ||
    "45000",
  icp_network: icpNetwork,
};

// Felt som må ha en ekte verdi for at appen skal virke i produksjon.
const REQUIRED_FIELDS = ["backend_host", "backend_canister_id", "icp_network"];

const problems = REQUIRED_FIELDS.filter((field) => !clean(runtimeConfig[field]));

if (runtimeConfig.ai_chat_mode === "live" &&
    !runtimeConfig.clawdbot_ai_url.startsWith("https://")) {
  problems.push("clawdbot_ai_url (live-modus krever offentlig https-URL)");
}

if (problems.length > 0) {
  console.error("env.json er ugyldig. Mangler eller 'undefined':");
  for (const field of problems) console.error("  - " + field);
  console.error("Sett verdiene i src/frontend/env.json eller som VITE_-variabler.");
  process.exit(1);
}

if (process.argv.includes("--check")) {
  console.log("env.json OK:", JSON.stringify(runtimeConfig, null, 2));
  process.exit(0);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(runtimeConfig, null, 2)}\n`);
console.log("Skrev dist/env.json (backend_canister_id=" + backendCanisterId + ", network=" + icpNetwork + ")");
