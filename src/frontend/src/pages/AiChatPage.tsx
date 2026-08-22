import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useRouterState, useSearch } from "@tanstack/react-router";
import {
  AlertCircle,
  Bot,
  Database,
  LoaderCircle,
  RefreshCw,
  SendHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { normalizeLeagueId, normalizeSeasonId } from "../data/seasons";
import {
  type AiChatConversationMessage,
  type AiChatResponse,
  askAiChat,
} from "../services/aiChat";

const STARTER_QUESTIONS = [
  "Hvem er i best form de siste fem kampene?",
  "Hvilke spillere har best målsnitt denne sesongen?",
  "Hvilket lag har best målforskjell?",
  "Oppsummer de siste kampene til Sarah Deari Solheim.",
];

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: AiChatResponse;
  isError?: boolean;
};

function Evidence({ response }: { response: AiChatResponse }) {
  const hasEvidence = response.evidence.length > 0;
  const hasSources = response.sources.length > 0;
  const hasMissingData = response.missingData.length > 0;

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
            {response.evidence.map((item, index) => (
              <div
                key={`${item.label}-${item.value}-${index}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2 text-sm"
              >
                <dt className="min-w-0 text-muted-foreground">{item.label}</dt>
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
          {response.sources.map((source, index) => (
            <div
              key={`${source.method}-${index}`}
              className="flex items-start justify-between gap-3"
            >
              <span>{source.label}</span>
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
          {response.missingData.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
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
        message.isError ? "border-destructive" : "border-primary/50",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        {message.isError ? (
          <AlertCircle className="size-4 text-destructive" />
        ) : (
          <Sparkles className="size-4 text-primary" />
        )}
        <span className="text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground">
          {message.isError ? "Feil" : "AI-generert analyse"}
        </span>
        {message.response?.mode === "mock" && (
          <span className="border border-border px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
            Demo
          </span>
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
        {message.content}
      </p>
      {message.response && <Evidence response={message.response} />}
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="flex items-center gap-2 border-l-2 border-primary/50 py-1 pl-3.5 text-sm text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin text-primary" />
      Kontrollerer data og analyserer...
    </div>
  );
}

export default function AiChatPage() {
  const search = useSearch({ from: "__root__" });
  const router = useRouterState();
  const season = normalizeSeasonId(search.season);
  const league = normalizeLeagueId(search.league);
  const { identity } = useInternetIdentity();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [failedQuestion, setFailedQuestion] = useState<string>();
  const endRef = useRef<HTMLDivElement>(null);

  const principal = useMemo(() => {
    const value = identity?.getPrincipal();
    return value && !value.isAnonymous() ? value.toText() : undefined;
  }, [identity]);

  useEffect(() => {
    if (messages.length > 0 || isSending) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isSending, messages.length]);

  const sendQuestion = async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || isSending) return;

    const conversation: AiChatConversationMessage[] = messages
      .filter((message) => !message.isError)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setFailedQuestion(undefined);
    setIsSending(true);

    try {
      const response = await askAiChat({
        question,
        conversation,
        season,
        league,
        route: router.location.pathname,
        principal,
      });
      setMessages((current) => [
        ...current,
        {
          id: response.id,
          role: "assistant",
          content: response.answer,
          response,
        },
      ]);
    } catch (error) {
      setFailedQuestion(question);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Analysen kunne ikke fullføres. Prøv igjen.",
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendQuestion(input);
  };

  return (
    <div className="flex min-h-[calc(100vh-9rem)] flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-primary">
            <Bot className="size-5" />
            <span className="text-[10px] font-display font-bold uppercase tracking-widest">
              Clawdbot
            </span>
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">
            AI-analyse
          </h1>
        </div>
        {messages.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setMessages([]);
              setFailedQuestion(undefined);
            }}
            disabled={isSending}
            aria-label="Tøm samtalen"
            title="Tøm samtalen"
          >
            <Trash2 />
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-6 py-5" aria-live="polite">
        {messages.length === 0 && !isSending && (
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

        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        {isSending && <LoadingMessage />}

        {failedQuestion && !isSending && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void sendQuestion(failedQuestion)}
          >
            <RefreshCw />
            Prøv igjen
          </Button>
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
            onChange={(event) => setInput(event.target.value.slice(0, 1_000))}
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
  );
}
