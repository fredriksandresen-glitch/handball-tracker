const fs = require("node:fs");
const { Actor, HttpAgent } = require("@dfinity/agent");
const { IDL } = require("@dfinity/candid");
const { Ed25519KeyIdentity } = require("@dfinity/identity");

const DEFAULT_BACKEND_CANISTER_ID = "lj6bx-dyaaa-aaaap-qumhq-cai";
const DEFAULT_ICP_HOST = "https://icp-api.io";
const DEFAULT_LOCAL_CHAT_URL = "http://127.0.0.1:3000/v1/handball/chat";
const DEFAULT_POLL_INTERVAL_MS = 5_000;

const Role = IDL.Variant({ user: IDL.Null, assistant: IDL.Null });
const AnswerStatus = IDL.Variant({
  answered: IDL.Null,
  insufficientData: IDL.Null,
});
const JobStatus = IDL.Variant({
  pending: IDL.Null,
  processing: IDL.Null,
  complete: IDL.Null,
  failed: IDL.Null,
});
const Context = IDL.Record({
  season: IDL.Text,
  league: IDL.Text,
  route: IDL.Text,
  playerIds: IDL.Vec(IDL.Text),
  teamIds: IDL.Vec(IDL.Text),
});
const ConversationMessage = IDL.Record({
  role: Role,
  content: IDL.Text,
});
const WorkItem = IDL.Record({
  id: IDL.Nat,
  threadId: IDL.Nat,
  owner: IDL.Principal,
  question: IDL.Text,
  context: Context,
  conversation: IDL.Vec(ConversationMessage),
  attempts: IDL.Nat,
});
const Evidence = IDL.Record({
  title: IDL.Text,
  value: IDL.Text,
  unit: IDL.Opt(IDL.Text),
  playerId: IDL.Opt(IDL.Text),
  teamId: IDL.Opt(IDL.Text),
  matchId: IDL.Opt(IDL.Text),
});
const Source = IDL.Record({
  title: IDL.Text,
  method: IDL.Text,
  entityIds: IDL.Vec(IDL.Text),
  observedAt: IDL.Opt(IDL.Text),
});
const Completion = IDL.Record({
  answer: IDL.Text,
  answerStatus: AnswerStatus,
  generatedByAi: IDL.Bool,
  evidence: IDL.Vec(Evidence),
  sources: IDL.Vec(Source),
  missingData: IDL.Vec(IDL.Text),
  followUpQuestions: IDL.Vec(IDL.Text),
});
const WorkerStatus = IDL.Record({
  configured: IDL.Bool,
  pendingJobs: IDL.Nat,
  processingJobs: IDL.Nat,
});

const idlFactory = ({ IDL: Candid }) =>
  Candid.Service({
    claimNextAiJob: Candid.Func([], [Candid.Opt(WorkItem)], []),
    completeAiJob: Candid.Func([Candid.Nat, Completion], [], []),
    failAiJob: Candid.Func([Candid.Nat, Candid.Text], [], []),
    getAiWorkerStatus: Candid.Func([], [WorkerStatus], ["query"]),
  });

function requiredEnvironment(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} must be configured`);
  return value;
}

function readIdentity(identityPath) {
  const json = fs.readFileSync(identityPath, "utf8");
  return Ed25519KeyIdentity.fromJSON(json);
}

function unwrapOption(value) {
  return Array.isArray(value) && value.length > 0 ? value[0] : null;
}

function option(value) {
  return typeof value === "string" && value.length > 0 ? [value] : [];
}

function roleName(value) {
  return value && "assistant" in value ? "assistant" : "user";
}

function stringArray(value, maxItems = 20) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .slice(0, maxItems);
}

function evidenceArray(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).flatMap((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.label !== "string" ||
      typeof item.value !== "string"
    ) {
      return [];
    }
    return [{
      title: item.label.slice(0, 300),
      value: item.value.slice(0, 1_000),
      unit: option(item.unit),
      playerId: option(item.playerId),
      teamId: option(item.teamId),
      matchId: option(item.matchId),
    }];
  });
}

function sourceArray(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.label !== "string" ||
      typeof item.method !== "string"
    ) {
      return [];
    }
    return [{
      title: item.label.slice(0, 300),
      method: item.method.slice(0, 500),
      entityIds: stringArray(item.entityIds, 50),
      observedAt: option(item.observedAt),
    }];
  });
}

function buildGatewayRequest(job, canisterId, host) {
  const entities = [
    ...job.context.playerIds.map((id) => ({ type: "player", id })),
    ...job.context.teamIds.map((id) => ({ type: "team", id })),
  ];
  return {
    version: 1,
    question: job.question,
    conversation: job.conversation.map((message) => ({
      role: roleName(message.role),
      content: message.content,
    })),
    context: {
      locale: "nb-NO",
      season: job.context.season,
      league: job.context.league,
      route: job.context.route,
      principal: job.owner.toText(),
      entities,
    },
    dataAccess: {
      provider: "icp",
      network: host,
      backendCanisterId: canisterId,
      allowedQueries: [
        "getPlayers",
        "getTeams",
        "getMatches",
        "getPlayerMatchStats",
        "getPlayerSeasonStats",
      ],
    },
  };
}

function buildCompletion(response) {
  if (!response || typeof response.answer !== "string" || !response.answer.trim()) {
    throw new Error("Local AI gateway returned an invalid answer");
  }
  return {
    answer: response.answer.trim().slice(0, 20_000),
    answerStatus:
      response.status === "insufficient-data"
        ? { insufficientData: null }
        : { answered: null },
    generatedByAi: response.generatedByAi !== false,
    evidence: evidenceArray(response.evidence),
    sources: sourceArray(response.sources),
    missingData: stringArray(response.missingData),
    followUpQuestions: stringArray(response.followUpQuestions, 3),
  };
}

async function processJob({
  actor,
  job,
  chatUrl,
  canisterId,
  host,
  fetchImpl,
}) {
  try {
    const response = await fetchImpl(chatUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildGatewayRequest(job, canisterId, host)),
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok) {
      throw new Error(`Local AI gateway returned HTTP ${response.status}`);
    }
    const completion = buildCompletion(await response.json());
    await actor.completeAiJob(job.id, completion);
    console.log(
      `[ai-worker] completed job=${job.id} thread=${job.threadId} attempt=${job.attempts}`,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown worker error";
    console.error(`[ai-worker] failed job=${job.id}: ${message}`);
    await actor.failAiJob(job.id, message.slice(0, 1_000));
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createWorkerActor({
  canisterId = process.env.ICP_BACKEND_CANISTER_ID ||
    DEFAULT_BACKEND_CANISTER_ID,
  host = process.env.ICP_HOST || DEFAULT_ICP_HOST,
  identityPath = requiredEnvironment("AI_WORKER_IDENTITY_PATH"),
} = {}) {
  const identity = readIdentity(identityPath);
  const agent = new HttpAgent({ host, identity });
  return {
    actor: Actor.createActor(idlFactory, { agent, canisterId }),
    principal: identity.getPrincipal().toText(),
    canisterId,
    host,
  };
}

async function startAiWorker(options = {}) {
  const {
    actor,
    principal,
    canisterId,
    host,
  } = options.actor
    ? {
      actor: options.actor,
      principal: options.principal || "test-worker",
      canisterId: options.canisterId || DEFAULT_BACKEND_CANISTER_ID,
      host: options.host || DEFAULT_ICP_HOST,
    }
    : createWorkerActor(options);
  const chatUrl =
    options.chatUrl || process.env.AI_LOCAL_CHAT_URL || DEFAULT_LOCAL_CHAT_URL;
  const pollIntervalMs = Number(
    options.pollIntervalMs ||
      process.env.AI_WORKER_POLL_INTERVAL_MS ||
      DEFAULT_POLL_INTERVAL_MS,
  );
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  let stopped = false;

  console.log(
    `[ai-worker] started principal=${principal} canister=${canisterId} poll=${pollIntervalMs}ms`,
  );

  const run = async () => {
    while (!stopped) {
      try {
        const job = unwrapOption(await actor.claimNextAiJob());
        if (!job) {
          await sleep(pollIntervalMs);
          continue;
        }
        await processJob({
          actor,
          job,
          chatUrl,
          canisterId,
          host,
          fetchImpl,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown polling error";
        console.error(`[ai-worker] poll failed: ${message}`);
        await sleep(Math.max(pollIntervalMs, 5_000));
      }
    }
  };

  const done = run();
  return {
    principal,
    stop() {
      stopped = true;
    },
    done,
  };
}

if (require.main === module) {
  startAiWorker().catch((error) => {
    console.error("[ai-worker] startup failed:", error);
    process.exitCode = 1;
  });
}

module.exports = {
  buildCompletion,
  buildGatewayRequest,
  createWorkerActor,
  processJob,
  startAiWorker,
};
