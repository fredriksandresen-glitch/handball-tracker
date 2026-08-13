import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import { useState } from "react";
import { getNationalTeamInfo } from "../data/nationalTeamPlayers";
import type { Player } from "../types/handball";
import {
  resolveImageUrl,
  resolvePlayerCardImageSources,
} from "../utils/playerImages";
import { PositionBadge } from "./PositionBadge";

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

type CardStat = {
  value: string;
  label: string;
  emphasis?: boolean;
};

function PlayerImageFallback({ initials }: { initials: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-200 via-slate-300 to-slate-500 dark:from-slate-800 dark:via-slate-700 dark:to-slate-950">
      <div className="relative flex flex-col items-center justify-center opacity-55">
        <div className="size-16 rounded-full bg-white/45 dark:bg-white/15 border border-white/40" />
        <div className="mt-2 h-24 w-28 rounded-t-full bg-white/35 dark:bg-white/12 border border-white/25" />
        <span className="absolute bottom-8 font-display font-black text-5xl text-white/45 dark:text-white/20">
          {initials}
        </span>
      </div>
    </div>
  );
}

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
  latestMep?: number;
  latestGoals?: number;
  latestSaves?: number;
  latestSavePct?: number;
  statItems?: CardStat[];
  sparkValues?: number[];
  sparkLabel?: string;
  followOverlay?: boolean;
  imagePriority?: boolean;
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
  latestMep,
  latestGoals,
  latestSaves,
  latestSavePct,
  statItems,
  sparkValues = [],
  sparkLabel = "Form",
  followOverlay = false,
  imagePriority = false,
}: Props) {
  const navigate = useNavigate();
  const [imageFailed, setImageFailed] = useState(false);
  const [useOriginalImage, setUseOriginalImage] = useState(false);
  const originalImageUrl = resolveImageUrl(player.imageUrl);
  const cardImage = resolvePlayerCardImageSources(player.imageUrl);
  const displayedImageUrl = useOriginalImage
    ? originalImageUrl
    : (cardImage?.src ?? originalImageUrl);

  const displayGoals = latestGoals ?? goals;
  const genericStats = statItems?.filter((item) => item.value !== "") ?? [];
  const hasGenericStats = genericStats.length > 0;
  const hasStats =
    hasGenericStats ||
    latestMep !== undefined ||
    latestSaves !== undefined ||
    latestSavePct !== undefined ||
    displayGoals !== undefined ||
    minutes !== undefined;
  const hasSpark = sparkValues.length >= 2;
  const nationalTeam = getNationalTeamInfo(player.id);
  const initials = player.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function handleCardClick() {
    navigate({ to: "/player/$id", params: { id: player.id.toString() } });
  }

  function handleFollowClick(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (isFollowing) {
      onUnfollow?.();
    } else {
      onFollow?.();
    }
  }

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl overflow-hidden transition-smooth hover:shadow-elevated group",
        className,
      )}
      data-ocid="player-card"
    >
      <button
        type="button"
        onClick={handleCardClick}
        aria-label={`Vis profil for ${player.name}`}
        className="relative block w-full aspect-[3/4.45] sm:aspect-[3/4] bg-muted text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {nationalTeam?.countryCode === "FI" && (
          <div
            className="absolute inset-0 z-0 bg-white"
            aria-hidden="true"
          >
            <div className="absolute inset-y-0 left-[31%] w-[16%] bg-[#002f6c]" />
            <div className="absolute inset-x-0 top-[38%] h-[16%] bg-[#002f6c]" />
          </div>
        )}

        <PlayerImageFallback initials={initials} />

        {displayedImageUrl && !imageFailed && (
          <img
            src={displayedImageUrl}
            srcSet={!useOriginalImage ? cardImage?.srcSet : undefined}
            sizes="(max-width: 640px) calc(50vw - 24px), 310px"
            alt={player.name}
            loading={imagePriority ? "eager" : "lazy"}
            fetchPriority={imagePriority ? "high" : "auto"}
            decoding="async"
            onError={() => {
              if (
                !useOriginalImage &&
                originalImageUrl &&
                displayedImageUrl !== originalImageUrl
              ) {
                setUseOriginalImage(true);
                return;
              }
              setImageFailed(true);
            }}
            className="absolute inset-0 z-10 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        )}

        <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {nationalTeam && (
          <div className="absolute left-3 top-3 z-30 rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[10px] font-display font-black uppercase tracking-wide text-white shadow-subtle backdrop-blur-md">
            {nationalTeam.countryCode}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 z-30 px-3.5 pb-3.5 pt-12">
          <div className="mb-1.5">
            <PositionBadge position={player.position} variant="overlay" />
          </div>

          <p className="font-display font-black text-white leading-tight text-base truncate drop-shadow-sm">
            {player.name}
          </p>

          {teamName && (
            <p className="text-[11px] text-white/70 truncate mt-0.5 font-body">
              {teamName}
            </p>
          )}

          {hasStats && (
            <div className="flex items-end justify-between mt-2 pt-2 border-t border-white/15 gap-2">
              <div className="flex gap-3 min-w-0">
                {hasGenericStats ? (
                  genericStats.slice(0, 3).map((item) => (
                    <div key={`${item.label}-${item.value}`} className="min-w-0">
                      <span
                        className={cn(
                          "block leading-none tabular-nums truncate",
                          item.emphasis
                            ? "font-display font-black text-xl text-white"
                            : "font-display font-bold text-lg text-white/90",
                        )}
                      >
                        {item.value}
                      </span>
                      <span className="block text-[8px] uppercase tracking-wide text-white/60 mt-0.5 truncate">
                        {item.label}
                      </span>
                    </div>
                  ))
                ) : (
                  <>
                    {latestMep !== undefined && (
                      <div>
                        <span className="block font-display font-black text-xl text-white leading-none tabular-nums">
                          {latestMep.toFixed(1)}
                        </span>
                        <span className="block text-[8px] uppercase tracking-wide text-white/60 mt-0.5">
                          MEP sist
                        </span>
                      </div>
                    )}
                    {latestSaves !== undefined && (
                      <div>
                        <span className="block font-display font-bold text-lg text-white/90 leading-none tabular-nums">
                          {latestSaves}
                        </span>
                        <span className="block text-[8px] uppercase tracking-wide text-white/60 mt-0.5">
                          Redn.
                        </span>
                      </div>
                    )}
                    {latestSavePct !== undefined && (
                      <div>
                        <span className="block font-display font-bold text-lg text-white/90 leading-none tabular-nums">
                          {latestSavePct.toFixed(1)}%
                        </span>
                        <span className="block text-[8px] uppercase tracking-wide text-white/60 mt-0.5">
                          Red%
                        </span>
                      </div>
                    )}
                    {displayGoals !== undefined && latestSaves === undefined && (
                      <div>
                        <span className="block font-display font-black text-xl text-white leading-none">
                          {displayGoals}
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
                  </>
                )}
              </div>
              {hasSpark && (
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <Sparkline values={sparkValues} />
                  <span className="text-[9px] uppercase tracking-wide text-white/50">
                    {sparkLabel}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </button>

      {followOverlay && (onFollow || onUnfollow) && (
        <Button
          variant={isFollowing ? "outline" : "default"}
          size="sm"
          onClick={handleFollowClick}
          disabled={isLoading}
          className={cn(
            "absolute top-2.5 right-2.5 z-20 h-8 rounded-full px-3 text-[11px] font-display font-black shadow-elevated backdrop-blur-md",
            isFollowing
              ? "border-primary/50 bg-black/45 text-primary hover:bg-destructive/80 hover:text-white hover:border-destructive/60"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
          data-ocid={isFollowing ? "player-unfollow-btn" : "player-follow-btn"}
        >
          {isFollowing ? "✓ FØLGER" : "+ FØLG"}
        </Button>
      )}

      {!followOverlay && (onFollow || onUnfollow) && (
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
    </div>
  );
}
