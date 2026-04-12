import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Shield, Trophy } from "lucide-react";
import { formatMatchDate } from "../services/handballService";
import type { Match, Team } from "../types/handball";

interface Props {
  team: Team;
  nextMatch?: Match | null;
  opponentName?: string;
  className?: string;
}

export function TeamCard({ team, nextMatch, opponentName, className }: Props) {
  return (
    <Link
      to="/team/$id"
      params={{ id: team.id.toString() }}
      className={cn(
        "block rounded-xl bg-card border border-border p-4 transition-smooth hover:border-primary/40 hover:shadow-elevated",
        className,
      )}
      data-ocid="team-card-link"
    >
      <div className="flex items-center gap-3">
        {/* Logo */}
        {team.logoUrl ? (
          <img
            src={team.logoUrl}
            alt={team.name}
            className="size-10 rounded-lg object-contain flex-shrink-0"
          />
        ) : (
          <div className="size-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 border border-border">
            <Shield className="size-5 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-foreground truncate text-[15px]">
            {team.name}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            {team.standingsRank !== undefined && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Trophy className="size-3" />
                {team.standingsRank.toString()}. plass
              </span>
            )}
            {team.points !== undefined && (
              <span className="text-xs text-muted-foreground">
                {team.points.toString()} p
              </span>
            )}
          </div>
        </div>

        {team.matchesPlayed !== undefined && (
          <div className="text-right flex-shrink-0">
            <span className="text-lg font-display font-bold text-primary">
              {team.matchesPlayed.toString()}
            </span>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Kamper
            </p>
          </div>
        )}
      </div>

      {nextMatch && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
            Neste kamp
          </p>
          <p className="text-xs text-foreground font-medium">
            {opponentName ? `vs ${opponentName}` : "Kamp kommende"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {formatMatchDate(nextMatch.startTime)}
          </p>
        </div>
      )}
    </Link>
  );
}
