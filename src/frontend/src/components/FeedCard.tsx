import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react";
import type { FeedEvent, Player } from "../types/handball";
import { FeedEventType } from "../types/handball";

function eventIcon(type: FeedEventType) {
  switch (type) {
    case FeedEventType.GoalsScored:
      return <Target className="size-4 text-primary" />;
    case FeedEventType.YellowCard:
      return <AlertTriangle className="size-4 text-chart-4" />;
    case FeedEventType.TwoMinSuspension:
      return <Clock className="size-4 text-chart-3" />;
    case FeedEventType.NextMatch:
      return <Calendar className="size-4 text-chart-2" />;
    case FeedEventType.SeasonAvgUpdated:
      return <TrendingUp className="size-4 text-chart-5" />;
    default:
      return <TrendingUp className="size-4 text-muted-foreground" />;
  }
}

function eventAccentClass(type: FeedEventType): string {
  switch (type) {
    case FeedEventType.GoalsScored:
      return "border-l-primary/60";
    case FeedEventType.YellowCard:
      return "border-l-chart-4/60";
    case FeedEventType.TwoMinSuspension:
      return "border-l-chart-3/60";
    case FeedEventType.NextMatch:
      return "border-l-chart-2/60";
    case FeedEventType.SeasonAvgUpdated:
      return "border-l-chart-5/60";
    default:
      return "border-l-border";
  }
}

interface Props {
  event: FeedEvent;
  player: Player;
  teamName?: string;
}

export function FeedCard({ event, player, teamName }: Props) {
  const accent = eventAccentClass(event.eventType);

  return (
    <div
      className={cn(
        "rounded-xl bg-card border border-border border-l-[3px] p-3 flex gap-3 items-start",
        accent,
      )}
      data-ocid="feed-event-card"
    >
      <div className="flex-shrink-0 mt-0.5 size-7 rounded-md bg-muted/60 flex items-center justify-center">
        {eventIcon(event.eventType)}
      </div>
      <div className="flex-1 min-w-0">
        <Link
          to="/player/$id"
          params={{ id: player.id.toString() }}
          className="text-[11px] text-muted-foreground hover:text-primary transition-colors font-body"
        >
          {player.name}
          {teamName ? ` · ${teamName}` : ""}
        </Link>
        <p className="font-display font-semibold text-foreground text-sm leading-snug mt-0.5">
          {event.title}
        </p>
        {event.description && (
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
            {event.description}
          </p>
        )}
      </div>
      {event.statValue !== undefined && (
        <span className="flex-shrink-0 font-display font-black text-primary text-lg leading-none mt-0.5">
          {event.statValue.toString()}
        </span>
      )}
    </div>
  );
}
