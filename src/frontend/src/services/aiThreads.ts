import { loadConfig } from "@caffeineai/core-infrastructure";
import { Actor, HttpAgent, type Identity } from "@icp-sdk/core/agent";
import { IDL } from "@icp-sdk/core/candid";

// Candid-typene er hentet direkte fra den deployede backend-canisteren
// (dfx canister --network ic metadata <id> candid:service).
// Den genererte src/backend.ts mangler AI-metodene, og skal IKKE regenereres
// fra src/backend/main.mo - den kilden er eldre enn det som kjorer live.

const Role = IDL.Variant({ assistant: IDL.Null, user: IDL.Null });
const MessageStatus = IDL.Variant({ complete: IDL.Null, failed: IDL.Null });
const AnswerStatus = IDL.Variant({
  answered: IDL.Null,
  insufficientData: IDL.Null,
});
const JobStatus = IDL.Variant({
  complete: IDL.Null,
  failed: IDL.Null,
  pending: IDL.Null,
  processing: IDL.Null,
});

const Evidence = IDL.Record({
  matchId: IDL.Opt(IDL.Text),
  playerId: IDL.Opt(IDL.Text),
  teamId: IDL.Opt(IDL.Text),
  title: IDL.Text,
  unit: IDL.Opt(IDL.Text),
  value: IDL.Text,
});

const Source = IDL.Record({
  entityIds: IDL.Vec(IDL.Text),
  method: IDL.Text,
  observedAt: IDL.Opt(IDL.Text),
  title: IDL.Text,
});

const PublicMessage = IDL.Record({
  answerStatus: IDL.Opt(AnswerStatus),
  content: IDL.Text,
  createdAt: IDL.Int,
  evidence: IDL.Vec(Evidence),
  followUpQuestions: IDL.Vec(IDL.Text),
  generatedByAi: IDL.Bool,
  id: IDL.Nat,
  missingData: IDL.Vec(IDL.Text),
  role: Role,
  sources: IDL.Vec(Source),
  status: MessageStatus,
  threadId: IDL.Nat,
});

const PublicThread = IDL.Record({
  createdAt: IDL.Int,
  id: IDL.Nat,
  title: IDL.Text,
  updatedAt: IDL.Int,
});

const PublicJob = IDL.Record({
  createdAt: IDL.Int,
  error: IDL.Opt(IDL.Text),
  id: IDL.Nat,
  status: JobStatus,
  threadId: IDL.Nat,
  updatedAt: IDL.Int,
});

const Context = IDL.Record({
  league: IDL.Text,
  playerIds: IDL.Vec(IDL.Text),
  route: IDL.Text,
  season: IDL.Text,
  teamIds: IDL.Vec(IDL.Text),
});

const SubmitResult = IDL.Record({
  jobId: IDL.Nat,
  threadId: IDL.Nat,
  userMessageId: IDL.Nat,
});

const WorkerStatus = IDL.Record({
  configured: IDL.Bool,
  pendingJobs: IDL.Nat,
  processingJobs: IDL.Nat,
});

const idlFactory = () =>
  IDL.Service({
    createAiThread: IDL.Func([IDL.Text], [PublicThread], []),
    deleteMyAiThread: IDL.Func([IDL.Nat], [], []),
    getAiWorkerStatus: IDL.Func([], [WorkerStatus], ["query"]),
    getMyActiveAiJob: IDL.Func([IDL.Nat], [IDL.Opt(PublicJob)], ["query"]),
    getMyAiJob: IDL.Func([IDL.Nat], [IDL.Opt(PublicJob)], ["query"]),
    getMyAiMessages: IDL.Func([IDL.Nat], [IDL.Vec(PublicMessage)], ["query"]),
    getMyAiThreads: IDL.Func([], [IDL.Vec(PublicThread)], ["query"]),
    submitAiQuestion: IDL.Func(
      [IDL.Opt(IDL.Nat), IDL.Text, Context],
      [SubmitResult],
      [],
    ),
  });

export type AiRole = "user" | "assistant";
export type AiJobState = "pending" | "processing" | "complete" | "failed";

export type AiEvidence = {
  title: string;
  value: string;
  unit?: string;
  playerId?: string;
  teamId?: string;
  matchId?: string;
};

export type AiSource = {
  title: string;
  method: string;
  entityIds: string[];
  observedAt?: string;
};

export type AiMessage = {
  id: bigint;
  threadId: bigint;
  role: AiRole;
  content: string;
  createdAt: number;
  generatedByAi: boolean;
  failed: boolean;
  insufficientData: boolean;
  evidence: AiEvidence[];
  sources: AiSource[];
  missingData: string[];
  followUpQuestions: string[];
};

export type AiThread = {
  id: bigint;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export type AiJob = {
  id: bigint;
  threadId: bigint;
  status: AiJobState;
  error?: string;
};

export type AiQuestionContext = {
  season: string;
  league: string;
  route: string;
  playerIds?: string[];
  teamIds?: string[];
};

type CandidOpt<T> = [] | [T];

function optional<T>(value: CandidOpt<T>): T | undefined {
  return value.length > 0 ? value[0] : undefined;
}

function variantKey(value: Record<string, unknown>) {
  return Object.keys(value)[0] ?? "";
}

// Motoko Int er nanosekunder siden epoch.
function toMillis(value: bigint) {
  return Number(value / 1_000_000n);
}

export type AiActor = {
  createAiThread: (title: string) => Promise<unknown>;
  deleteMyAiThread: (threadId: bigint) => Promise<void>;
  getMyActiveAiJob: (threadId: bigint) => Promise<CandidOpt<unknown>>;
  getMyAiJob: (jobId: bigint) => Promise<CandidOpt<unknown>>;
  getMyAiMessages: (threadId: bigint) => Promise<unknown[]>;
  getMyAiThreads: () => Promise<unknown[]>;
  submitAiQuestion: (
    threadId: CandidOpt<bigint>,
    question: string,
    context: {
      season: string;
      league: string;
      route: string;
      playerIds: string[];
      teamIds: string[];
    },
  ) => Promise<{ jobId: bigint; threadId: bigint; userMessageId: bigint }>;
};

export async function createAiActor(identity: Identity): Promise<AiActor> {
  const config = await loadConfig();
  const agent = await HttpAgent.create({
    identity,
    host: config.backend_host,
  });
  return Actor.createActor(idlFactory, {
    agent,
    canisterId: config.backend_canister_id,
  }) as unknown as AiActor;
}

export function mapThread(raw: unknown): AiThread {
  const thread = raw as {
    id: bigint;
    title: string;
    createdAt: bigint;
    updatedAt: bigint;
  };
  return {
    id: thread.id,
    title: thread.title,
    createdAt: toMillis(thread.createdAt),
    updatedAt: toMillis(thread.updatedAt),
  };
}

export function mapMessage(raw: unknown): AiMessage {
  const message = raw as {
    id: bigint;
    threadId: bigint;
    role: Record<string, unknown>;
    content: string;
    createdAt: bigint;
    generatedByAi: boolean;
    status: Record<string, unknown>;
    answerStatus: CandidOpt<Record<string, unknown>>;
    evidence: Array<{
      title: string;
      value: string;
      unit: CandidOpt<string>;
      playerId: CandidOpt<string>;
      teamId: CandidOpt<string>;
      matchId: CandidOpt<string>;
    }>;
    sources: Array<{
      title: string;
      method: string;
      entityIds: string[];
      observedAt: CandidOpt<string>;
    }>;
    missingData: string[];
    followUpQuestions: string[];
  };

  const answerStatus = optional(message.answerStatus);

  return {
    id: message.id,
    threadId: message.threadId,
    role: variantKey(message.role) === "user" ? "user" : "assistant",
    content: message.content,
    createdAt: toMillis(message.createdAt),
    generatedByAi: message.generatedByAi,
    failed: variantKey(message.status) === "failed",
    insufficientData:
      !!answerStatus && variantKey(answerStatus) === "insufficientData",
    evidence: message.evidence.map((item) => ({
      title: item.title,
      value: item.value,
      unit: optional(item.unit),
      playerId: optional(item.playerId),
      teamId: optional(item.teamId),
      matchId: optional(item.matchId),
    })),
    sources: message.sources.map((item) => ({
      title: item.title,
      method: item.method,
      entityIds: item.entityIds,
      observedAt: optional(item.observedAt),
    })),
    missingData: message.missingData,
    followUpQuestions: message.followUpQuestions,
  };
}

export function mapJob(raw: unknown): AiJob {
  const job = raw as {
    id: bigint;
    threadId: bigint;
    status: Record<string, unknown>;
    error: CandidOpt<string>;
  };
  return {
    id: job.id,
    threadId: job.threadId,
    status: variantKey(job.status) as AiJobState,
    error: optional(job.error),
  };
}
