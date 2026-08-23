import type { LeagueId, SeasonId } from "../data/seasons";
import {
  loadRuntimeConfig,
  type RuntimeConfig,
} from "./runtimeConfig";

const MAX_CONVERSATION_MESSAGES = 8;
const MAX_CONTEXT_MESSAGE_LENGTH = 600;
const MAX_QUESTION_LENGTH = 1_000;

export type AiChatRole = "user" | "assistant";
export type AiChatAnswerStatus = "answered" | "insufficient-data";

export type AiChatConversationMessage = {
  role: AiChatRole;
  content: string;
};

export type AiChatEntity = {
  type: "player" | "team" | "match";
  id: string;
  name?: string;
};

export type AiChatRequest = {
  version: 1;
  question: string;
  conversation: AiChatConversationMessage[];
  context: {
    locale: "nb-NO";
    season: SeasonId;
    league: LeagueId;
    route: string;
    principal?: string;
    entities: AiChatEntity[];
  };
  dataAccess: {
    provider: "icp";
    network: string;
    backendCanisterId?: string;
    allowedQueries: string[];
  };
};

export type AiChatEvidence = {
  label: string;
  value: string;
  unit?: string;
  playerId?: string;
  teamId?: string;
  matchId?: string;
};

export type AiChatSource = {
  label: string;
  method: string;
  entityIds?: string[];
  observedAt?: string;
};

export type AiChatResponse = {
  id: string;
  answer: string;
  status: AiChatAnswerStatus;
  generatedByAi: true;
  evidence: AiChatEvidence[];
  sources: AiChatSource[];
  missingData: string[];
  followUpQuestions: string[];
  mode: "live" | "mock";
};

export type AskAiChatInput = {
  question: string;
  conversation: AiChatConversationMessage[];
  season: SeasonId;
  league: LeagueId;
  route: string;
  principal?: string;
};

type SearchIndexEntry = {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
};

let searchIndexPromise: Promise<SearchIndexEntry[]> | undefined;

function normalize(value: string) {
  return value
    .toLocaleLowerCase("nb")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function loadSearchIndex() {
  searchIndexPromise ??= fetch("/data/search-player-index.json")
    .then(async (response) => {
      if (!response.ok) return [];
      return (await response.json()) as SearchIndexEntry[];
    })
    .catch(() => []);
  return searchIndexPromise;
}

export async function resolveAiChatEntities(
  question: string,
): Promise<AiChatEntity[]> {
  const normalizedQuestion = normalize(question);
  if (!normalizedQuestion) return [];

  const entries = await loadSearchIndex();
  const entities: AiChatEntity[] = [];
  const seenPlayers = new Set<string>();
  const seenTeams = new Set<string>();

  for (const entry of entries) {
    const playerName = normalize(entry.name);
    if (
      playerName.length >= 4 &&
      normalizedQuestion.includes(playerName) &&
      !seenPlayers.has(entry.id)
    ) {
      entities.push({ type: "player", id: entry.id, name: entry.name });
      seenPlayers.add(entry.id);
    }
    if (entities.filter((entity) => entity.type === "player").length >= 5) {
      break;
    }
  }

  for (const entry of entries) {
    const teamName = normalize(entry.teamName);
    if (
      teamName.length >= 3 &&
      normalizedQuestion.includes(teamName) &&
      !seenTeams.has(entry.teamId)
    ) {
      entities.push({ type: "team", id: entry.teamId, name: entry.teamName });
      seenTeams.add(entry.teamId);
    }
    if (seenTeams.size >= 3) break;
  }

  return entities;
}

function trimConversation(
  conversation: AiChatConversationMessage[],
): AiChatConversationMessage[] {
  return conversation.slice(-MAX_CONVERSATION_MESSAGES).map((message) => ({
    role: message.role,
    content: message.content.slice(0, MAX_CONTEXT_MESSAGE_LENGTH),
  }));
}

function createRequest(
  input: AskAiChatInput,
  entities: AiChatEntity[],
  runtimeConfig: RuntimeConfig,
): AiChatRequest {
  return {
    version: 1,
    question: input.question.trim().slice(0, MAX_QUESTION_LENGTH),
    conversation: trimConversation(input.conversation),
    context: {
      locale: "nb-NO",
      season: input.season,
      league: input.league,
      route: input.route,
      principal: input.principal,
      entities,
    },
    dataAccess: {
      provider: "icp",
      network: runtimeConfig.icpNetwork,
      backendCanisterId: runtimeConfig.backendCanisterId,
      allowedQueries: [
        "getPlayers",
        "getPlayer",
        "getPlayersByTeam",
        "getTeams",
        "getTeam",
        "getMatches",
        "getUpcomingMatches",
        "getNextMatchForTeam",
        "getPlayerMatchStats",
        "getPlayerSeasonStats",
        "getAllPlayerSeasonStats",
        "searchPlayers",
        "searchTeams",
      ],
    },
  };
}

function mockResponse(): AiChatResponse {
  return {
    id: crypto.randomUUID(),
    answer:
      "Clawdbot-endepunktet er ikke konfigurert ennå. Jeg kan derfor ikke hente og kontrollere statistikken mot ICP, og vil ikke gjette på svaret.",
    status: "insufficient-data",
    generatedByAi: true,
    evidence: [],
    sources: [],
    missingData: [
      "AI-tjenesten må kobles til før den kan hente verifiserte data fra ICP.",
    ],
    followUpQuestions: [],
    mode: "mock",
  };
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function parseResponse(value: unknown): AiChatResponse {
  if (!value || typeof value !== "object") {
    throw new Error("Clawdbot returnerte et ugyldig svar.");
  }

  const record = value as Record<string, unknown>;
  if (typeof record.answer !== "string" || !record.answer.trim()) {
    throw new Error("Clawdbot-svaret mangler en forklaring.");
  }

  const evidence = Array.isArray(record.evidence)
    ? record.evidence.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const evidenceRecord = item as Record<string, unknown>;
        if (
          typeof evidenceRecord.label !== "string" ||
          typeof evidenceRecord.value !== "string"
        ) {
          return [];
        }
        return [
          {
            label: evidenceRecord.label,
            value: evidenceRecord.value,
            unit:
              typeof evidenceRecord.unit === "string"
                ? evidenceRecord.unit
                : undefined,
            playerId:
              typeof evidenceRecord.playerId === "string"
                ? evidenceRecord.playerId
                : undefined,
            teamId:
              typeof evidenceRecord.teamId === "string"
                ? evidenceRecord.teamId
                : undefined,
            matchId:
              typeof evidenceRecord.matchId === "string"
                ? evidenceRecord.matchId
                : undefined,
          },
        ];
      })
    : [];

  const sources = Array.isArray(record.sources)
    ? record.sources.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const sourceRecord = item as Record<string, unknown>;
        if (
          typeof sourceRecord.label !== "string" ||
          typeof sourceRecord.method !== "string"
        ) {
          return [];
        }
        return [
          {
            label: sourceRecord.label,
            method: sourceRecord.method,
            entityIds: asStringArray(sourceRecord.entityIds),
            observedAt:
              typeof sourceRecord.observedAt === "string"
                ? sourceRecord.observedAt
                : undefined,
          },
        ];
      })
    : [];

  return {
    id:
      typeof record.id === "string" && record.id
        ? record.id
        : crypto.randomUUID(),
    answer: record.answer.trim(),
    status:
      record.status === "insufficient-data" ? "insufficient-data" : "answered",
    generatedByAi: true,
    evidence,
    sources,
    missingData: asStringArray(record.missingData),
    followUpQuestions: asStringArray(record.followUpQuestions).slice(0, 3),
    mode: "live",
  };
}

async function sendLiveRequest(
  endpoint: string,
  request: AiChatRequest,
  timeoutMs: number,
): Promise<AiChatResponse> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(
        response.status === 429
          ? "AI-tjenesten har for mange forespørsler. Prøv igjen om litt."
          : `AI-tjenesten svarte med status ${response.status}.`,
      );
    }
    return parseResponse(await response.json());
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Analysen tok for lang tid. Prøv igjen.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function askAiChat(
  input: AskAiChatInput,
): Promise<AiChatResponse> {
  const question = input.question.trim();
  if (!question) throw new Error("Skriv et spørsmål først.");

  const runtimeConfig = await loadRuntimeConfig();
  const endpoint = runtimeConfig.aiChatUrl;
  const mode = runtimeConfig.aiChatMode;
  if (mode === "mock" || (!endpoint && mode === "auto")) {
    return mockResponse();
  }
  if (!endpoint) {
    throw new Error("AI-tjenesten er ikke konfigurert for live analyse.");
  }

  const entities = await resolveAiChatEntities(question);
  return sendLiveRequest(
    endpoint,
    createRequest(input, entities, runtimeConfig),
    runtimeConfig.aiChatRequestTimeoutMs,
  );
}
