import { cn } from "@/lib/utils";
import { Clock, ExternalLink, Home, MapPin } from "lucide-react";
import { formatMatchDate, getCountdown } from "../services/handballService";
import type { Match } from "../types/handball";
import { MatchStatus } from "../types/handball";

interface Props {
  match: Match;
  teamId?: bigint;
  homeTeamName?: string;
  awayTeamName?: string;
  className?: string;
  showCountdown?: boolean;
}

export function MatchCard({
  match,
  teamId,
  homeTeamName,
  awayTeamName,
  className,
  showCountdown = true,
}: Props) {
  const isHome = teamId !== undefined && match.homeTeamId === teamId;
  const isAway = teamId !== undefined && match.awayTeamId === teamId;
  const isUpcoming = match.status === MatchStatus.Upcoming;

  const opponent = isHome ? awayTeamName : isAway ? homeTeamName : null;
  const locationLabel = isHome ? "HJEMME" : isAway ? "BORTE" : null;

  return (
    <div
      className={cn(
        "rounded-xl bg-card border border-border p-4 space-y-2",
        match.status === MatchStatus.Live && "border-chart-3/50 bg-chart-3/5",
        className,
      )}
      data-ocid="match-card"
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
          Neste kamp
        </p>
        {match.status === MatchStatus.Live && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-chart-3 uppercase tracking-wide">
            <span className="size-1.5 rounded-full bg-chart-3 animate-pulse" />
            Live
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="font-display font-bold text-foreground text-base truncate flex-1 min-w-0">
          {opponent
            ? `vs ${opponent}`
            : `${homeTeamName ?? "?"} — ${awayTeamName ?? "?"}`}
        </p>
        {isUpcoming && showCountdown && (
          <span className="text-primary font-display font-bold text-sm flex-shrink-0">
            {getCountdown(match.startTime)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          {formatMatchDate(match.startTime)}
        </span>
        {locationLabel && (
          <span className="flex items-center gap-1 text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wide">
            <Home className="size-3" />
            {locationLabel}
          </span>
        )}
        {match.venue && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            {match.venue}
          </span>
        )}
      </div>

      <div className="pt-1">
        <button
          type="button"
          disabled
          title="Kampvisning kommer snart"
          className="flex items-center gap-1 text-xs text-muted-foreground cursor-not-allowed opacity-50"
          data-ocid="match-view-btn"
        >
          <ExternalLink className="size-3" />
          Se kampvisning
        </button>
      </div>
    </div>
  );
}
