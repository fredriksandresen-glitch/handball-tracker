import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { User } from "lucide-react";
import type { Player } from "../types/handball";
import { PositionBadge } from "./PositionBadge";

// ── Sparkline ──────────────────────────────────────────────────────────────
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const W = 40;
  const H = 18;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - (v / max) * (H - 3) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Formkurve"
      className="flex-shrink-0 opacity-90"
    >
      <title>Formkurve siste kamper</title>
      <polyline
        points={pts.join(" ")}
        fill="none"
        strokeWidth="1.8"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}

// ── PlayerCard ─────────────────────────────────────────────────────────────
interface Props {
  player: Player;
  teamName?: string;
  isFollowing?: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
  isLoading?: boolean;
  compact?: boolean;
  className?: string;
  goals?: number;
  minutes?: number;
  sparkValues?: number[];
}

export function PlayerCard({
  player,
  teamName,
  isFollowing,
  onFollow,
  onUnfollow,
  isLoading,
  className,
  goals,
  minutes,
  sparkValues = [],
}: Props) {
  const navigate = useNavigate();

  const hasStats = goals !== undefined || minutes !== undefined;
  const hasSpark = sparkValues.length >= 2;

  function handleCardClick() {
    navigate({ to: "/player/$id", params: { id: player.id.toString() } });
  }

  function handleFollowClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (isFollowing) {
      onUnfollow?.();
    } else {
      onFollow?.();
    }
  }

  return (
    <button
      type="button"
      onClick={handleCardClick}
      aria-label={`Vis profil for ${player.name}`}
      className={cn(
        "w-full text-left rounded-2xl overflow-hidden transition-smooth hover:shadow-elevated cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className,
      )}
      data-ocid="player-card"
    >
      {/* ── Poster image area ── */}
      <div className="relative w-full aspect-[3/4] bg-muted">
        {player.imageUrl ? (
          <img
            src={player.imageUrl}
            alt={player.name}
            className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-muted to-muted/60">
            <User className="size-16 text-muted-foreground/40" />
          </div>
        )}

        {/* Gradient overlay — bottom 60% fades to dark */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Jersey number badge — top right */}
        {player.jerseyNumber !== undefined && (
          <div className="absolute top-3 right-3 size-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <span className="font-display font-black text-[13px] text-white leading-none">
              {player.jerseyNumber.toString()}
            </span>
          </div>
        )}

        {/* Content overlaid on gradient */}
        <div className="absolute bottom-0 left-0 right-0 px-3.5 pb-3.5 pt-12">
          {/* Position badge */}
          <div className="mb-1.5">
            <PositionBadge position={player.position} variant="overlay" />
          </div>

          {/* Name */}
          <p className="font-display font-black text-white leading-tight text-base truncate drop-shadow-sm">
            {player.name}
          </p>

          {/* Team */}
          {teamName && (
            <p className="text-[11px] text-white/70 truncate mt-0.5 font-body">
              {teamName}
            </p>
          )}

          {/* Stats row */}
          {hasStats && (
            <div className="flex items-end justify-between mt-2 pt-2 border-t border-white/15">
              <div className="flex gap-3">
                {goals !== undefined && (
                  <div>
                    <span className="block font-display font-black text-xl text-white leading-none">
                      {goals}
                    </span>
                    <span className="block text-[9px] uppercase tracking-wide text-white/60 mt-0.5">
                      Mål
                    </span>
                  </div>
                )}
                {minutes !== undefined && (
                  <div>
                    <span className="block font-display font-bold text-lg text-white/90 leading-none">
                      {minutes}
                    </span>
                    <span className="block text-[9px] uppercase tracking-wide text-white/60 mt-0.5">
                      Min
                    </span>
                  </div>
                )}
              </div>
              {hasSpark && (
                <div className="flex flex-col items-end gap-0.5">
                  <Sparkline values={sparkValues} />
                  <span className="text-[9px] uppercase tracking-wide text-white/50">
                    Form
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Follow button (below card) ── */}
      {(onFollow || onUnfollow) && (
        <div className="px-1 pt-2 pb-1">
          {isFollowing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleFollowClick}
              disabled={isLoading}
              className="w-full h-9 rounded-full text-xs font-display font-bold border-primary/40 text-primary hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
              data-ocid="player-unfollow-btn"
            >
              ✓ FØLGER
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleFollowClick}
              disabled={isLoading}
              className="w-full h-9 rounded-full text-xs font-display font-bold bg-primary text-primary-foreground hover:bg-primary/90"
              data-ocid="player-follow-btn"
            >
              + FØLG
            </Button>
          )}
        </div>
      )}
    </button>
  );
}
