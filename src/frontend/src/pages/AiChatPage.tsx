import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  createActorWithConfig,
  useInternetIdentity,
} from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouterState, useSearch } from "@tanstack/react-router";
import {
  AlertCircle,
  Bot,
  Database,
  Download,
  FileText,
  LoaderCircle,
  LogIn,
  MessageSquarePlus,
  RefreshCw,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { normalizeLeagueId, normalizeSeasonId } from "../data/seasons";
import {
  type AiMessage,
  type AiReportMetadata,
  type AiThread,
  createAiActor,
} from "../services/aiBackend";
import { resolveAiChatEntities } from "../services/aiChat";

const STARTER_QUESTIONS = [
  "Hvem er i best form de siste fem kampene?",
  "Hvilke spillere har best målsnitt denne sesongen?",
  "Hvilken spiller presterte best relativt til lagets plassering?",
  "Oppsummer forrige sesong til Linnea Aula.",
];

function Evidence({ message }: { message: AiMessage }) {
  const hasEvidence = message.evidence.length > 0;
  const hasSources = message.sources.length > 0;
  const hasMissingData = message.missingData.length > 0;

  if (!hasEvidence && !hasSources && !hasMissingData) return null;

  return (
    <div className="mt-4 space-y-3 border-t border-border/70 pt-3">
      {hasEvidence && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground">
            <Database className="size-3.5" />
            Datagrunnlag
          </div>
          <dl className="divide-y divide-border/60 border-y border-border/60">
            {message.evidence.map((item, index) => (
              <div
                key={`${item.label}-${item.value}-${index}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2 text-sm"
              >
                <dt className="min-w-0 text-muted-foreground">{item.label}</dt>
                <dd className="max-w-48 text-right font-display font-bold tabular-nums text-foreground sm:max-w-72">
                  {item.value}
                  {item.unit ? ` ${item.unit}` : ""}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {hasSources && (
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {message.sources.map((source, index) => (
            <div
              key={`${source.method}-${index}`}
              className="flex items-start justify-between gap-3"
            >
              <span>{source.label}</span>
              <code className="max-w-48 truncate text-[10px] text-foreground/75 sm:max-w-72">
                {source.method}
              </code>
            </div>
          ))}
        </div>
      )}

      {hasMissingData && (
        <div className="border-l-2 border-chart-4 pl-3 text-xs leading-5 text-muted-foreground">
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
            <AlertCircle className="size-3.5 text-chart-4" />
            Manglende data
          </div>
          {message.missingData.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function formatFileSize(size: bigint) {
  const bytes = Number(size);
  return bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1_000))} kB`;
}

function Message({
  message,
  report,
  downloading,
  downloadError,
  onDownload,
}: {
  message: AiMessage;
  report?: AiReportMetadata;
  downloading: boolean;
  downloadError: boolean;
  onDownload: (report: AiReportMetadata) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end pl-10">
        <div className="max-w-[88%] rounded-md bg-primary px-3.5 py-3 text-sm leading-6 text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  const isError = message.status === "failed";
  return (
    <div
      className={cn(
        "border-l-2 pl-3.5",
        isError ? "border-destructive" : "border-primary/50",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        {isError ? (
          <AlertCircle className="size-4 text-destructive" />
        ) : (
          <Sparkles className="size-4 text-primary" />
        )}
        <span className="text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground">
          {isError
            ? "Feil"
            : message.generatedByAi
              ? "AI-generert analyse"
              : "Datadrevet analyse"}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
        {message.content}
      </p>
      <Evidence message={message} />
      {report && (
        <div className="mt-4 flex items-center gap-3 border-y border-border/70 py-3">
          <FileText className="size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {report.filename}
            </p>
            <p className="text-xs text-muted-foreground">
              PDF-rapport · {formatFileSize(report.size)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => onDownload(report)}
            disabled={downloading}
            aria-label="Last ned PDF-rapport"
            title="Last ned PDF-rapport"
          >
            {downloading ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Download />
            )}
          </Button>
        </div>
      )}
      {downloadError && (
        <p className="mt-2 text-xs text-destructive">
          Rapporten kunne ikke lastes ned. Prøv igjen.
        </p>
      )}
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="flex items-center gap-2 border-l-2 border-primary/50 py-1 pl-3.5 text-sm text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin text-primary" />
      Jobben ligger trygt på ICP. Clawdbot analyserer...
    </div>
  );
}

function LoginRequired({
  onLogin,
  loading,
}: {
  onLogin: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center px-4 text-center">
      <ShieldCheck className="mb-4 size-9 text-primary" />
      <h1 className="font-display text-xl font-bold text-foreground">
        Logg inn for AI-analyse
      </h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Samtalene lagres privat på din Internet Identity Principal og følger deg
        mellom enheter.
      </p>
      <Button className="mt-5" onClick={onLogin} disabled={loading}>
        {loading ? <LoaderCircle className="animate-spin" /> : <LogIn />}
        Logg inn med Internet Identity
      </Button>
    </div>
  );
}

function ThreadList({
  threads,
  selectedId,
  onSelect,
  onNew,
  onDelete,
}: {
  threads: AiThread[];
  selectedId?: bigint;
  onSelect: (id: bigint) => void;
  onNew: () => void;
  onDelete: (id: bigint) => void;
}) {
  return (
    <aside className="border-b border-border pb-3 md:w-56 md:shrink-0 md:border-b-0 md:border-r md:pb-0 md:pr-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-start"
        onClick={onNew}
      >
        <MessageSquarePlus />
        Ny samtale
      </Button>
      <div className="no-scrollbar mt-2 flex gap-1 overflow-x-auto md:max-h-[calc(100vh-14rem)] md:flex-col md:overflow-y-auto">
        {threads.map((thread) => {
          const selected = selectedId === thread.id;
          return (
            <div
              key={thread.id.toString()}
              className={cn(
                "group flex h-10 min-w-44 items-center border-l-2 px-2 text-sm md:min-w-0",
                selected
                  ? "border-primary bg-muted text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left"
                onClick={() => onSelect(thread.id)}
                title={thread.title}
              >
                {thread.title}
              </button>
              <button
                type="button"
                className="ml-1 flex size-7 shrink-0 items-center justify-center text-muted-foreground opacity-70 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
                onClick={() => onDelete(thread.id)}
                aria-label="Slett samtale"
                title="Slett samtale"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default function AiChatPage() {
  const search = useSearch({ from: "__root__" });
  const router = useRouterState();
  const season = normalizeSeasonId(search.season);
  const league = normalizeLeagueId(search.league);
  const { identity, login, isInitializing, isLoggingIn } =
    useInternetIdentity();
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<bigint>();
  const [isDraftThread, setIsDraftThread] = useState(false);
  const [input, setInput] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<string>();
  const [pendingMessageId, setPendingMessageId] = useState<bigint>();
  const [downloadingReportId, setDownloadingReportId] = useState<bigint>();
  const [downloadErrorReportId, setDownloadErrorReportId] = useState<bigint>();
  const endRef = useRef<HTMLDivElement>(null);

  const principal = identity?.getPrincipal();
  const isAuthenticated = Boolean(principal && !principal.isAnonymous());

  const aiActorQuery = useQuery({
    queryKey: ["aiActor", principal?.toText()],
    queryFn: () => {
      if (!identity) throw new Error("Internet Identity er ikke klar ennå.");
      return createActorWithConfig(createAiActor, {
        agentOptions: { identity },
      });
    },
    enabled: isAuthenticated,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const actor = aiActorQuery.data;

  const threadsQuery = useQuery({
    queryKey: ["aiThreads", principal?.toText()],
    queryFn: () => actor?.getMyAiThreads() ?? Promise.resolve([]),
    enabled: isAuthenticated && Boolean(actor),
    staleTime: 5_000,
  });

  useEffect(() => {
    if (
      isDraftThread ||
      selectedThreadId !== undefined ||
      !threadsQuery.data?.length
    ) {
      return;
    }
    setSelectedThreadId(threadsQuery.data[0].id);
  }, [isDraftThread, selectedThreadId, threadsQuery.data]);

  const messagesQuery = useQuery({
    queryKey: ["aiMessages", selectedThreadId?.toString()],
    queryFn: () =>
      selectedThreadId !== undefined && actor
        ? actor.getMyAiMessages(selectedThreadId)
        : Promise.resolve([]),
    enabled:
      isAuthenticated && Boolean(actor) && selectedThreadId !== undefined,
    refetchInterval: (query) => {
      const messages = query.state.data;
      return messages?.at(-1)?.role === "user" ? 1_500 : false;
    },
  });

  const messages = isDraftThread ? [] : (messagesQuery.data ?? []);
  const latestMessage = messages.at(-1);
  const waitingForAnswer = latestMessage?.role === "user";

  const reportsQuery = useQuery({
    queryKey: ["aiReports", selectedThreadId?.toString()],
    queryFn: () =>
      selectedThreadId !== undefined && actor
        ? actor.getMyAiReports(selectedThreadId)
        : Promise.resolve([]),
    enabled:
      isAuthenticated && Boolean(actor) && selectedThreadId !== undefined,
  });
  const reportsByMessageId = new Map(
    (reportsQuery.data ?? []).map((report) => [
      report.messageId.toString(),
      report,
    ]),
  );

  useEffect(() => {
    if (latestMessage?.role === "assistant" && selectedThreadId !== undefined) {
      void queryClient.invalidateQueries({
        queryKey: ["aiReports", selectedThreadId.toString()],
      });
    }
  }, [latestMessage?.role, queryClient, selectedThreadId]);

  const submitMutation = useMutation({
    mutationFn: async (question: string) => {
      if (!actor) throw new Error("ICP-backenden er ikke klar ennå.");
      const entities = await resolveAiChatEntities(question);
      return actor.submitAiQuestion(
        isDraftThread ? undefined : selectedThreadId,
        question,
        {
          season,
          league,
          route: router.location.pathname,
          playerIds: entities
            .filter((entity) => entity.type === "player")
            .map((entity) => entity.id),
          teamIds: entities
            .filter((entity) => entity.type === "team")
            .map((entity) => entity.id),
        },
      );
    },
    onSuccess: async (result) => {
      setPendingMessageId(result.userMessageId);
      setIsDraftThread(false);
      setSelectedThreadId(result.threadId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["aiThreads"] }),
        queryClient.invalidateQueries({
          queryKey: ["aiMessages", result.threadId.toString()],
        }),
        queryClient.invalidateQueries({
          queryKey: ["aiReports", result.threadId.toString()],
        }),
      ]);
    },
  });

  useEffect(() => {
    if (messages.length > 0 || pendingQuestion || submitMutation.isPending) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, pendingQuestion, submitMutation.isPending]);

  useEffect(() => {
    if (
      pendingMessageId !== undefined &&
      messages.some((message) => message.id === pendingMessageId)
    ) {
      setPendingQuestion(undefined);
      setPendingMessageId(undefined);
    }
  }, [messages, pendingMessageId]);

  const isSending = submitMutation.isPending || waitingForAnswer;
  const showPendingQuestion = Boolean(
    pendingQuestion &&
      (pendingMessageId === undefined ||
        !messages.some((message) => message.id === pendingMessageId)),
  );

  const sendQuestion = async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || isSending) return;
    submitMutation.reset();
    setPendingQuestion(question);
    setPendingMessageId(undefined);
    setInput("");
    await submitMutation.mutateAsync(question).catch(() => undefined);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendQuestion(input);
  };

  const deleteThread = async (threadId: bigint) => {
    if (!actor) return;
    try {
      await actor.deleteMyAiThread(threadId);
    } catch (error) {
      console.error("Kunne ikke slette AI-samtalen", error);
      return;
    }
    if (selectedThreadId === threadId) {
      setSelectedThreadId(undefined);
      setIsDraftThread(false);
    }
    await queryClient.invalidateQueries({ queryKey: ["aiThreads"] });
  };

  const downloadReport = async (report: AiReportMetadata) => {
    if (!actor || downloadingReportId !== undefined) return;
    setDownloadingReportId(report.id);
    setDownloadErrorReportId(undefined);
    try {
      const file = await actor.getMyAiReport(report.id);
      if (!file) throw new Error("PDF-rapporten finnes ikke.");
      const bytes = new Uint8Array(file.content);
      const url = URL.createObjectURL(
        new Blob([bytes.buffer], { type: file.metadata.mimeType }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = file.metadata.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Kunne ikke laste ned PDF-rapporten", error);
      setDownloadErrorReportId(report.id);
    } finally {
      setDownloadingReportId(undefined);
    }
  };

  if (isInitializing || (isAuthenticated && aiActorQuery.isFetching)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginRequired onLogin={login} loading={isLoggingIn} />;
  }

  return (
    <div className="flex min-h-[calc(100vh-9rem)] flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-primary">
            <Bot className="size-5" />
            <span className="text-[10px] font-display font-bold uppercase tracking-widest">
              Clawdbot via ICP
            </span>
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">
            AI-analyse
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" />
          Privat historikk
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 pt-4 md:flex-row">
        <ThreadList
          threads={threadsQuery.data ?? []}
          selectedId={isDraftThread ? undefined : selectedThreadId}
          onSelect={(id) => {
            submitMutation.reset();
            setPendingQuestion(undefined);
            setPendingMessageId(undefined);
            setIsDraftThread(false);
            setSelectedThreadId(id);
          }}
          onNew={() => {
            submitMutation.reset();
            setPendingQuestion(undefined);
            setPendingMessageId(undefined);
            setIsDraftThread(true);
            setSelectedThreadId(undefined);
            setInput("");
          }}
          onDelete={(id) => void deleteThread(id)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 space-y-6 pb-5" aria-live="polite">
            {messagesQuery.isError && !isDraftThread && (
              <div className="border-l-2 border-destructive pl-3 text-sm text-destructive">
                Kunne ikke hente samtalen fra ICP. Prøv å laste siden på nytt.
              </div>
            )}

            {messages.length === 0 && !isSending && !pendingQuestion && (
              <div className="space-y-3">
                {STARTER_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => void sendQuestion(question)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 border-b border-border px-1 py-3 text-left text-sm text-foreground transition-colors hover:text-primary"
                  >
                    <span>{question}</span>
                    <SendHorizontal className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {messages.map((message) => {
              const report = reportsByMessageId.get(message.id.toString());
              return (
                <Message
                  key={message.id.toString()}
                  message={message}
                  report={report}
                  downloading={downloadingReportId === report?.id}
                  downloadError={Boolean(
                    report && downloadErrorReportId === report.id,
                  )}
                  onDownload={(item) => void downloadReport(item)}
                />
              );
            })}
            {showPendingQuestion && (
              <div className="flex justify-end pl-10">
                <div className="max-w-[88%] rounded-md bg-primary px-3.5 py-3 text-sm leading-6 text-primary-foreground">
                  {pendingQuestion}
                </div>
              </div>
            )}
            {isSending && <LoadingMessage />}

            {submitMutation.isError && (
              <div className="flex items-center justify-between gap-3 border-l-2 border-destructive pl-3 text-sm text-destructive">
                <span>
                  {submitMutation.error instanceof Error
                    ? submitMutation.error.message
                    : "Kunne ikke legge analysen i ICP-køen."}
                </span>
                {pendingQuestion && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => void sendQuestion(pendingQuestion)}
                  >
                    <RefreshCw />
                    Prøv igjen
                  </Button>
                )}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 -mx-2 border-t border-border bg-background/95 px-2 pb-2 pt-3 backdrop-blur"
          >
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(event) =>
                  setInput(event.target.value.slice(0, 1_000))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if (input.trim() && !isSending) void sendQuestion(input);
                  }
                }}
                placeholder="Spør om spillere, lag, kamper eller statistikk"
                rows={1}
                className="no-scrollbar max-h-32 min-h-11 resize-none overflow-y-auto bg-card text-base md:text-sm"
                disabled={isSending}
                aria-label="Spørsmål til AI-analysen"
              />
              <Button
                type="submit"
                size="icon"
                className="size-11 shrink-0"
                disabled={!input.trim() || isSending}
                aria-label="Send spørsmål"
                title="Send spørsmål"
              >
                {isSending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <SendHorizontal />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
