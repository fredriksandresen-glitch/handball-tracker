import {
  Actor,
  type ActorConfig,
  type ActorMethod,
  type ActorSubclass,
  type Agent,
  HttpAgent,
  type HttpAgentOptions,
} from "@icp-sdk/core/agent";
import { IDL } from "@icp-sdk/core/candid";
import type { ExternalBlob } from "../backend";

export type AiRole = "user" | "assistant";
export type AiMessageStatus = "complete" | "failed";
export type AiAnswerStatus = "answered" | "insufficient-data";
export type AiJobStatus = "pending" | "processing" | "complete" | "failed";

export type AiEvidence = {
  label: string;
  value: string;
  unit?: string;
  playerId?: string;
  teamId?: string;
  matchId?: string;
};

export type AiSource = {
  label: string;
  method: string;
  entityIds: string[];
  observedAt?: string;
};

export type AiThread = {
  id: bigint;
  title: string;
  createdAt: bigint;
  updatedAt: bigint;
};

export type AiMessage = {
  id: bigint;
  threadId: bigint;
  role: AiRole;
  content: string;
  createdAt: bigint;
  status: AiMessageStatus;
  answerStatus?: AiAnswerStatus;
  generatedByAi: boolean;
  evidence: AiEvidence[];
  sources: AiSource[];
  missingData: string[];
  followUpQuestions: string[];
};

export type AiJob = {
  id: bigint;
  threadId: bigint;
  status: AiJobStatus;
  createdAt: bigint;
  updatedAt: bigint;
  error?: string;
};

export type AiContext = {
  season: string;
  league: string;
  route: string;
  playerIds: string[];
  teamIds: string[];
};

export type SubmitAiQuestionResult = {
  threadId: bigint;
  jobId: bigint;
  userMessageId: bigint;
};

export type AiReportMetadata = {
  id: bigint;
  messageId: bigint;
  filename: string;
  mimeType: string;
  size: bigint;
  createdAt: bigint;
};

export type AiReportFile = {
  metadata: AiReportMetadata;
  content: Uint8Array;
};

type RawRole = { user: null } | { assistant: null };
type RawMessageStatus = { complete: null } | { failed: null };
type RawAnswerStatus = { answered: null } | { insufficientData: null };
type RawJobStatus =
  | { pending: null }
  | { processing: null }
  | { complete: null }
  | { failed: null };

type RawEvidence = Omit<
  AiEvidence,
  "label" | "unit" | "playerId" | "teamId" | "matchId"
> & {
  title: string;
  unit: [] | [string];
  playerId: [] | [string];
  teamId: [] | [string];
  matchId: [] | [string];
};

type RawSource = Omit<AiSource, "label" | "observedAt"> & {
  title: string;
  observedAt: [] | [string];
};

type RawMessage = Omit<
  AiMessage,
  "role" | "status" | "answerStatus" | "evidence" | "sources"
> & {
  role: RawRole;
  status: RawMessageStatus;
  answerStatus: [] | [RawAnswerStatus];
  evidence: RawEvidence[];
  sources: RawSource[];
};

type RawJob = Omit<AiJob, "status" | "error"> & {
  status: RawJobStatus;
  error: [] | [string];
};

interface RawAiService {
  createAiThread: ActorMethod<[string], AiThread>;
  deleteMyAiThread: ActorMethod<[bigint], undefined>;
  getMyAiThreads: ActorMethod<[], AiThread[]>;
  getMyAiMessages: ActorMethod<[bigint], RawMessage[]>;
  getMyAiReports: ActorMethod<[bigint], AiReportMetadata[]>;
  getMyAiReport: ActorMethod<[bigint], [] | [AiReportFile]>;
  getMyAiJob: ActorMethod<[bigint], [] | [RawJob]>;
  getMyActiveAiJob: ActorMethod<[bigint], [] | [RawJob]>;
  submitAiQuestion: ActorMethod<
    [[] | [bigint], string, AiContext],
    SubmitAiQuestionResult
  >;
}

function option<T>(value: [] | [T]): T | undefined {
  return value[0];
}

function role(value: RawRole): AiRole {
  return "user" in value ? "user" : "assistant";
}

function messageStatus(value: RawMessageStatus): AiMessageStatus {
  return "failed" in value ? "failed" : "complete";
}

function answerStatus(value: RawAnswerStatus): AiAnswerStatus {
  return "insufficientData" in value ? "insufficient-data" : "answered";
}

function jobStatus(value: RawJobStatus): AiJobStatus {
  if ("pending" in value) return "pending";
  if ("processing" in value) return "processing";
  if ("failed" in value) return "failed";
  return "complete";
}

function mapMessage(message: RawMessage): AiMessage {
  const rawAnswerStatus = option(message.answerStatus);
  return {
    ...message,
    role: role(message.role),
    status: messageStatus(message.status),
    answerStatus: rawAnswerStatus ? answerStatus(rawAnswerStatus) : undefined,
    evidence: message.evidence.map((item) => ({
      label: item.title,
      value: item.value,
      unit: option(item.unit),
      playerId: option(item.playerId),
      teamId: option(item.teamId),
      matchId: option(item.matchId),
    })),
    sources: message.sources.map((source) => ({
      label: source.title,
      method: source.method,
      entityIds: source.entityIds,
      observedAt: option(source.observedAt),
    })),
  };
}

function mapJob(job: RawJob): AiJob {
  return { ...job, status: jobStatus(job.status), error: option(job.error) };
}

export interface AiBackend {
  createAiThread(title: string): Promise<AiThread>;
  deleteMyAiThread(threadId: bigint): Promise<void>;
  getMyAiThreads(): Promise<AiThread[]>;
  getMyAiMessages(threadId: bigint): Promise<AiMessage[]>;
  getMyAiReports(threadId: bigint): Promise<AiReportMetadata[]>;
  getMyAiReport(reportId: bigint): Promise<AiReportFile | undefined>;
  getMyAiJob(jobId: bigint): Promise<AiJob | undefined>;
  getMyActiveAiJob(threadId: bigint): Promise<AiJob | undefined>;
  submitAiQuestion(
    threadId: bigint | undefined,
    question: string,
    context: AiContext,
  ): Promise<SubmitAiQuestionResult>;
}

class AiBackendActor implements AiBackend {
  constructor(private actor: ActorSubclass<RawAiService>) {}

  createAiThread(title: string) {
    return this.actor.createAiThread(title);
  }

  async deleteMyAiThread(threadId: bigint) {
    await this.actor.deleteMyAiThread(threadId);
  }

  getMyAiThreads() {
    return this.actor.getMyAiThreads();
  }

  async getMyAiMessages(threadId: bigint) {
    return (await this.actor.getMyAiMessages(threadId)).map(mapMessage);
  }

  getMyAiReports(threadId: bigint) {
    return this.actor.getMyAiReports(threadId);
  }

  async getMyAiReport(reportId: bigint) {
    return option(await this.actor.getMyAiReport(reportId));
  }

  async getMyAiJob(jobId: bigint) {
    const job = option(await this.actor.getMyAiJob(jobId));
    return job ? mapJob(job) : undefined;
  }

  async getMyActiveAiJob(threadId: bigint) {
    const job = option(await this.actor.getMyActiveAiJob(threadId));
    return job ? mapJob(job) : undefined;
  }

  submitAiQuestion(
    threadId: bigint | undefined,
    question: string,
    context: AiContext,
  ) {
    return this.actor.submitAiQuestion(
      threadId === undefined ? [] : [threadId],
      question,
      context,
    );
  }
}

const Role = IDL.Variant({ user: IDL.Null, assistant: IDL.Null });
const MessageStatus = IDL.Variant({ complete: IDL.Null, failed: IDL.Null });
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
const Thread = IDL.Record({
  id: IDL.Nat,
  title: IDL.Text,
  createdAt: IDL.Int,
  updatedAt: IDL.Int,
});
const Message = IDL.Record({
  id: IDL.Nat,
  threadId: IDL.Nat,
  role: Role,
  content: IDL.Text,
  createdAt: IDL.Int,
  status: MessageStatus,
  answerStatus: IDL.Opt(AnswerStatus),
  generatedByAi: IDL.Bool,
  evidence: IDL.Vec(Evidence),
  sources: IDL.Vec(Source),
  missingData: IDL.Vec(IDL.Text),
  followUpQuestions: IDL.Vec(IDL.Text),
});
const Job = IDL.Record({
  id: IDL.Nat,
  threadId: IDL.Nat,
  status: JobStatus,
  createdAt: IDL.Int,
  updatedAt: IDL.Int,
  error: IDL.Opt(IDL.Text),
});
const Context = IDL.Record({
  season: IDL.Text,
  league: IDL.Text,
  route: IDL.Text,
  playerIds: IDL.Vec(IDL.Text),
  teamIds: IDL.Vec(IDL.Text),
});
const ReportMetadata = IDL.Record({
  id: IDL.Nat,
  messageId: IDL.Nat,
  filename: IDL.Text,
  mimeType: IDL.Text,
  size: IDL.Nat,
  createdAt: IDL.Int,
});
const Report = IDL.Record({
  metadata: ReportMetadata,
  content: IDL.Vec(IDL.Nat8),
});
const SubmitResult = IDL.Record({
  threadId: IDL.Nat,
  jobId: IDL.Nat,
  userMessageId: IDL.Nat,
});

const idlFactory: Parameters<typeof Actor.createActor>[0] = ({ IDL: Candid }) =>
  Candid.Service({
    createAiThread: Candid.Func([Candid.Text], [Thread], []),
    deleteMyAiThread: Candid.Func([Candid.Nat], [], []),
    getMyAiThreads: Candid.Func([], [Candid.Vec(Thread)], ["query"]),
    getMyAiMessages: Candid.Func(
      [Candid.Nat],
      [Candid.Vec(Message)],
      ["query"],
    ),
    getMyAiReports: Candid.Func(
      [Candid.Nat],
      [Candid.Vec(ReportMetadata)],
      ["query"],
    ),
    getMyAiReport: Candid.Func([Candid.Nat], [Candid.Opt(Report)], ["query"]),
    getMyAiJob: Candid.Func([Candid.Nat], [Candid.Opt(Job)], ["query"]),
    getMyActiveAiJob: Candid.Func([Candid.Nat], [Candid.Opt(Job)], ["query"]),
    submitAiQuestion: Candid.Func(
      [Candid.Opt(Candid.Nat), Candid.Text, Context],
      [SubmitResult],
      [],
    ),
  });

export interface CreateAiActorOptions {
  agent?: Agent;
  agentOptions?: HttpAgentOptions;
  actorOptions?: ActorConfig;
}

export function createAiActor(
  canisterId: string,
  _uploadFile: (file: ExternalBlob) => Promise<Uint8Array>,
  _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>,
  options: CreateAiActorOptions = {},
): AiBackend {
  const agent =
    options.agent ?? HttpAgent.createSync({ ...options.agentOptions });
  const actor = Actor.createActor<RawAiService>(idlFactory, {
    agent,
    canisterId,
    ...options.actorOptions,
  });
  return new AiBackendActor(actor);
}
