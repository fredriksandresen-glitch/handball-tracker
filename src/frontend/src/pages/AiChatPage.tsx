import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouterState, useSearch } from "@tanstack/react-router";
import {
  AlertCircle,
  Bot,
  Database,
  LoaderCircle,
  LogIn,
  MessageSquarePlus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { normalizeLeagueId, normalizeSeasonId } from "../data/seasons";
import {
  type AiMessage,
  type AiThread,
  createAiActor,
  mapJob,
  mapMessage,
  mapThread,
} from "../services/aiThreads";

const STARTER_QUESTIONS = [
  "Hvem er i best form de siste fem kampene?",
  "Hvilke spillere har best målsnitt denne sesongen?",
  "Hvilket lag har best målforskjell?",
  "Oppsummer de siste kampene til Sarah Deari Solheim.",
];

const POLL_INTERVAL_MS = 2_500;

function threadTitleFrom(question: string) {
  const trimmed = question.trim().replace(/\s+/g, " ");
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
}

function formatDay(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "short",
  });
}

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
                key={`${item.title}-${item.value}-${index}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2 text-sm"
              >
                <dt className="min-w-0 text-muted-foreground">{item.title}</dt>
                <dd className="font-display font-bold tabular-nums text-foreground">
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
              <span>{source.title}</span>
              <code className="shrink-0 text-[10px] text-foreground/75">
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

function MessageBubble({ message }: { message: AiMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end pl-10">
        <div className="max-w-[88%] rounded-md bg-primary px-3.5 py-3 text-sm leading-6 text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-l-2 pl-3.5",
        message.failed ? "border-destructive" : "border-primary/50",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        {message.failed ? (
          <AlertCircle className="size-4 text-destructive" />
        ) : (
          <Sparkles className="size-4 text-primary" />
        )}
        <span className="text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground">
          {message.failed ? "Feil" : "AI-generert analyse"}
        </span>
        {!message.failed && !message.generatedByAi && (
          <span className="border border-border px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
            Kontrollerte data
          </span>
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
        {message.content}
      </p>
      <Evidence message={message} />
    </div>
  );
}

function LoginGate({
  onLogin,
  isLoggingIn,
}: {
  onLogin: () => void;
  isLoggingIn: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <Bot className="size-10 text-primary" />
      <h2 className="font-display text-xl font-bold">Logg inn for å bruke AI</h2>
      <p className="text-sm leading-6 text-muted-foreground">
        Analysene og hele chatteloggen din lagres på din egen Internet
        Identity-principal. Bare du har tilgang til dine spørsmål og svar.
      </p>
      <Button onClick={onLogin} disabled={isLoggingIn} className="gap-2">
        {isLoggingIn ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <LogIn className="size-4" />
        )}
        Logg inn med Internet Identity
      </Button>
    </div>
  );
}

export default function AiChatPage() {
  const search = useSearch({ from: "__root__" });
  const router = useRouterState();
  const season = normalizeSeasonId(search.season);
  const league = normalizeLeagueId(search.league);
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const queryClient = useQueryClient();

  const principal = useMemo(() => {
    const value = identity?.getPrincipal();
    return value && !value.isAnonymous() ? value.toText() : undefined;
  }, [identity]);

  const [activeThreadId, setActiveThreadId] = useState<bigint>();
  const [input, setInput] = useState("");
  const [optimisticQuestion, setOptimisticQuestion] = useState<string>();
  const [submitAt, setSubmitAt] = useState(0);
  const [errorText, setErrorText] = useState<string>();
  const endRef = useRef<HTMLDivElement>(null);

  const actorQuery = useQuery({
    queryKey: ["ai-actor", principal],
    queryFn: () => createAiActor(identity!),
    enabled: !!identity && !!principal,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const actor = actorQuery.data ?? null;

  const threadsQuery = useQuery({
    queryKey: ["ai-threads", principal],
    queryFn: async () => {
      const threads = (await actor!.getMyAiThreads()).map(mapThread);
      return threads.sort((left, right) => right.updatedAt - left.updatedAt);
    },
    enabled: !!actor,
  });
  const threads: AiThread[] = threadsQuery.data ?? [];

  useEffect(() => {
    if (activeThreadId === undefined && threads.length > 0) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId]);

  const threadKey = activeThreadId?.toString();

  const messagesQuery = useQuery({
    queryKey: ["ai-messages", principal, threadKey],
    queryFn: async () =>
      (await actor!.getMyAiMessages(activeThreadId!)).map(mapMessage),
    enabled: !!actor && activeThreadId !== undefined,
  });
  const messages: AiMessage[] = messagesQuery.data ?? [];

  const jobQuery = useQuery({
    queryKey: ["ai-job", principal, threadKey],
    queryFn: async () => {
      const raw = await actor!.getMyActiveAiJob(activeThreadId!);
      return raw.length > 0 ? mapJob(raw[0]) : null;
    },
    enabled: !!actor && activeThreadId !== undefined,
    refetchInterval: (query) => {
      const job = query.state.data;
      const running =
        !!job && (job.status === "pending" || job.status === "processing");
      return running || submitAt > 0 ? POLL_INTERVAL_MS : false;
    },
  });

  const runningJob =
    !!jobQuery.data &&
    (jobQuery.data.status === "pending" ||
      jobQuery.data.status === "processing");
  const isWaiting = submitAt > 0 || runningJob;

  // Naar joben er ferdig: hent meldingene paa nytt og slipp ventetilstanden.
  // dataUpdatedAt-sjekken hindrer at et gammelt (tomt) resultat fra foer
  // innsendingen tolkes som "ferdig".
  useEffect(() => {
    if (submitAt === 0) return;
    if (jobQuery.dataUpdatedAt < submitAt) return;
    const job = jobQuery.data;
    const done =
      !job || job.status === "complete" || job.status === "failed";
    if (!done) return;

    setSubmitAt(0);
    setOptimisticQuestion(undefined);
    if (job?.status === "failed") {
      setErrorText(job.error ?? "Analysen feilet. Prøv igjen.");
    }
    void queryClient.invalidateQueries({
      queryKey: ["ai-messages", principal, threadKey],
    });
    void queryClient.invalidateQueries({ queryKey: ["ai-threads", principal] });
  }, [
    jobQuery.data,
    jobQuery.dataUpdatedAt,
    submitAt,
    principal,
    threadKey,
    queryClient,
  ]);

  useEffect(() => {
    if (messages.length > 0 || isWaiting) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, isWaiting]);

  const sendQuestion = async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || !actor || isWaiting) return;

    setErrorText(undefined);
    setInput("");
    setOptimisticQuestion(question);

    try {
      let threadId = activeThreadId;
      if (threadId === undefined) {
        const thread = mapThread(
          await actor.createAiThread(threadTitleFrom(question)),
        );
        threadId = thread.id;
        setActiveThreadId(thread.id);
        await queryClient.invalidateQueries({
          queryKey: ["ai-threads", principal],
        });
      }

      await actor.submitAiQuestion([threadId], question, {
        season,
        league,
        route: router.location.pathname,
        playerIds: [],
        teamIds: [],
      });

      setSubmitAt(Date.now());
      await queryClient.invalidateQueries({
        queryKey: ["ai-messages", principal, threadId.toString()],
      });
    } catch (error) {
      setOptimisticQuestion(undefined);
      setSubmitAt(0);
      setErrorText(
        error instanceof Error
          ? error.message
          : "Spørsmålet kunne ikke sendes. Prøv igjen.",
      );
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendQuestion(input);
  };

  const startNewThread = () => {
    setActiveThreadId(undefined);
    setErrorText(undefined);
    setOptimisticQuestion(undefined);
    setSubmitAt(0);
  };

  const removeThread = async (threadId: bigint) => {
    if (!actor) return;
    await actor.deleteMyAiThread(threadId);
    if (activeThreadId === threadId) setActiveThreadId(undefined);
    await queryClient.invalidateQueries({ queryKey: ["ai-threads", principal] });
  };

  if (!principal) {
    return <LoginGate onLogin={login} isLoggingIn={isLoggingIn} />;
  }

  const showStarters = messages.length === 0 && !optimisticQuestion;

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="space-y-2">
        <Button
          variant="outline"
          onClick={startNewThread}
          className="w-full justify-start gap-2"
        >
          <MessageSquarePlus className="size-4" />
          Ny samtale
        </Button>

        <div className="text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground">
          Chattelogg
        </div>

        {threadsQuery.isLoading && (
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <LoaderCircle className="size-3.5 animate-spin" />
            Henter loggen...
          </div>
        )}

        {!threadsQuery.isLoading && threads.length === 0 && (
          <p className="py-2 text-xs leading-5 text-muted-foreground">
            Ingen samtaler ennå. Still et spørsmål, så lagres det her.
          </p>
        )}

        <ul className="space-y-1">
          {threads.map((thread) => (
            <li key={thread.id.toString()}>
              <div
                className={cn(
                  "group flex items-center gap-1 border-l-2 pl-2 pr-1",
                  activeThreadId === thread.id
                    ? "border-primary bg-muted/50"
                    : "border-transparent",
                )}
              >
                <button
                  type="button"
                  onClick={() => setActiveThreadId(thread.id)}
                  className="min-w-0 flex-1 py-2 text-left"
                >
                  <span className="block truncate text-xs text-foreground">
                    {thread.title || "Uten tittel"}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {formatDay(thread.updatedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Slett samtale"
                  onClick={() => void removeThread(thread.id)}
                  className="shrink-0 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <section className="min-w-0 space-y-4">
        {messagesQuery.isLoading && activeThreadId !== undefined && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin text-primary" />
            Henter samtalen...
          </div>
        )}

        {showStarters && (
          <div className="space-y-3">
            <p className="text-sm leading-6 text-muted-foreground">
              Spør om form, statistikk eller sammenligninger. Alle svar bygger
              på kontrollerte data fra appen.
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTER_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => void sendQuestion(question)}
                  className="border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-5">
          {messages.map((message) => (
            <MessageBubble key={message.id.toString()} message={message} />
          ))}

          {optimisticQuestion && (
            <div className="flex justify-end pl-10">
              <div className="max-w-[88%] rounded-md bg-primary px-3.5 py-3 text-sm leading-6 text-primary-foreground opacity-70">
                {optimisticQuestion}
              </div>
            </div>
          )}

          {isWaiting && (
            <div className="flex items-center gap-2 border-l-2 border-primary/50 py-1 pl-3.5 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin text-primary" />
              Kontrollerer data og analyserer...
            </div>
          )}

          {errorText && (
            <div className="flex items-start gap-2 border-l-2 border-destructive pl-3.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}
        </div>

        <div ref={endRef} />

        <form onSubmit={handleSubmit} className="sticky bottom-0 bg-background pt-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendQuestion(input);
              }
            }}
            placeholder="Still et spørsmål om spillere, lag eller form..."
            rows={2}
            disabled={!actor || isWaiting}
            className="resize-none"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[10px] text-muted-foreground">
              Lagres på din principal
            </span>
            <Button type="submit" disabled={!actor || isWaiting || !input.trim()}>
              Send
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
