export type RuntimeConfig = {
  aiChatMode: "auto" | "live" | "mock";
  aiChatUrl?: string;
  aiChatRequestTimeoutMs: number;
  icpNetwork: string;
  backendCanisterId?: string;
};

type RuntimeConfigFile = {
  ai_chat_mode?: unknown;
  clawdbot_ai_url?: unknown;
  ai_chat_request_timeout_ms?: unknown;
  icp_network?: unknown;
  backend_canister_id?: unknown;
};

const DEFAULT_TIMEOUT_MS = 45_000;
let runtimeConfigPromise: Promise<RuntimeConfig> | undefined;

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() && value !== "undefined"
    ? value.trim()
    : undefined;
}

function parseMode(value: unknown): RuntimeConfig["aiChatMode"] {
  return value === "live" || value === "mock" ? value : "auto";
}

function parseTimeout(value: unknown) {
  const timeout = Number(value);
  return Number.isFinite(timeout) && timeout >= 5_000
    ? timeout
    : DEFAULT_TIMEOUT_MS;
}

function viteFallback(): RuntimeConfig {
  return {
    aiChatMode: parseMode(import.meta.env.VITE_AI_CHAT_MODE),
    aiChatUrl: optionalString(import.meta.env.VITE_CLAWDBOT_AI_URL),
    aiChatRequestTimeoutMs: parseTimeout(
      import.meta.env.VITE_AI_CHAT_REQUEST_TIMEOUT_MS,
    ),
    icpNetwork: optionalString(import.meta.env.VITE_ICP_NETWORK) ?? "ic",
    backendCanisterId: optionalString(
      import.meta.env.VITE_ICP_BACKEND_CANISTER_ID,
    ),
  };
}

async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  const fallback = viteFallback();

  try {
    const response = await fetch("/env.json", { cache: "no-store" });
    if (!response.ok) return fallback;

    const config = (await response.json()) as RuntimeConfigFile;
    return {
      aiChatMode: parseMode(config.ai_chat_mode ?? fallback.aiChatMode),
      aiChatUrl:
        optionalString(config.clawdbot_ai_url) ?? fallback.aiChatUrl,
      aiChatRequestTimeoutMs: parseTimeout(
        config.ai_chat_request_timeout_ms ?? fallback.aiChatRequestTimeoutMs,
      ),
      icpNetwork:
        optionalString(config.icp_network) ?? fallback.icpNetwork,
      backendCanisterId:
        optionalString(config.backend_canister_id) ??
        fallback.backendCanisterId,
    };
  } catch {
    return fallback;
  }
}

export function loadRuntimeConfig() {
  runtimeConfigPromise ??= fetchRuntimeConfig();
  return runtimeConfigPromise;
}
