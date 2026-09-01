import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { getNationalTeamInfo } from "../data/nationalTeamPlayers";
import type { Player } from "../types/handball";
import {
  resolveImageUrl,
  resolvePlayerCardImageSources,
} from "../utils/playerImages";
import { PositionBadge } from "./PositionBadge";

/**
 * Formkurve, variant C (2026-08-27): linje med fargede punkter.
 *
 * EN farge, EN betydning: gronn = bedre enn referansen, rod = svakere.
 * Referansen er sesongsnittet for den maalestokken spilleren faktisk vises
 * paa (MEP for utespillere, redningsprosent for keepere). Siste kamp markeres
 * med storre punkt og hvit ring — aldri med farge, slik at de to signalene
 * ikke krasjer slik de gjorde i soyleversjonen.
 *
 * Bredden maales i piksler (2026-08-27): tidligere brukte vi
 * preserveAspectRatio="none", som strakk viewBoxen til kortbredden. Paa smale
 * mobilkort saa det riktig ut, men paa brede skjermer ble punktene til ovaler.
 * Na tegner vi i faktiske piksler, saa sirkler forblir sirkler i alle bredder.
 */
function Sparkline({
  values,
  reference,
}: {
  values: number[];
  reference?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    const update = () => setWidth(node.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (values.length < 2) return null;
  const recent = values.slice(-5);
  const ref =
    reference ?? recent.reduce((sum, v) => sum + v, 0) / recent.length;

  const H = 28;
  const pad = 5;
  const W = width || 120;
  const lo = Math.min(...recent, ref);
  const hi = Math.max(...recent, ref);
  const span = Math.max(hi - lo, 0.001);
  const x = (i: number) => pad + (i / (recent.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - lo) / span) * (H - pad * 2);
  const line = recent
    .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");

  return (
    <div ref={hostRef} className="mt-2.5 w-full">
      {width > 0 && (
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="block overflow-visible"
          role="img"
          aria-label="Formkurve siste kamper"
        >
          <title>Formkurve siste kamper</title>
          <line
            x1={pad}
            y1={y(ref)}
            x2={W - pad}
            y2={y(ref)}
            stroke="rgba(255,255,255,.3)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <path
            d={line}
            fill="none"
            stroke="rgba(255,255,255,.5)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {recent.map((v, i) => {
            const isLast = i === recent.length - 1;
            return (
              <circle
                key={`pt-${i}-${v}`}
                cx={x(i)}
                cy={y(v)}
                r={isLast ? 3.4 : 2.4}
                fill={v >= ref ? "#34d399" : "#f87171"}
                stroke={isLast ? "#fff" : "none"}
                strokeWidth={isLast ? 1.4 : 0}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}

type CardStat = {
  value: string;
  label: string;
  emphasis?: boolean;
};

function PlayerImageFallback({
  initials,
  preserveBackground = false,
}: {
  initials: string;
  preserveBackground?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center",
        !preserveBackground &&
          "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-500 dark:from-slate-800 dark:via-slate-700 dark:to-slate-950",
      )}
    >
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
  /** Sesongsnitt for samme maalestokk som sparkValues (MEP eller redning-%). */
  sparkReference?: number;
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
  sparkReference,
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

        <PlayerImageFallback
          initials={initials}
          preserveBackground={nationalTeam?.countryCode === "FI"}
        />

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

        {/* Lettere gradient (designgjennomgang 2026-08-27): fire stopp i stedet
            for ett hardt sprang, slik at ansiktet slipper fram uten at teksten
            blir mindre lesbar. */}
        <div
          className="absolute inset-0 z-20"
          style={{
            background:
              "linear-gradient(to top, rgba(6,12,26,0.94) 0%, rgba(6,12,26,0.72) 18%, rgba(6,12,26,0.28) 42%, rgba(6,12,26,0.02) 62%, transparent 100%)",
          }}
        />

        {/* Posisjon oppe til VENSTRE (2026-08-27): hoyre side er reservert til
            folge-knappen, og landkoden er fjernet — flagget i bakgrunnen sier
            allerede hvilket land spilleren tilhorer. */}
        <div className="absolute left-3 top-3 z-30">
          <PositionBadge position={player.position} variant="overlay" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-30 px-3.5 pb-3.5 pt-12">
          <p className="font-display font-black text-white leading-tight text-[17px] tracking-tight truncate drop-shadow-sm">
            {player.name}
          </p>

          {teamName && (
            <p className="text-[11px] text-white/70 truncate mt-0.5 font-body">
              {teamName}
            </p>
          )}

          {hasStats && (
            <div className="mt-2 pt-2 border-t border-white/15">
              {/* Ett hovedtall, resten som stottetall (designgjennomgang
                  2026-08-27). For var alle like store, sa oyet visste ikke
                  hvor det skulle. */}
              <div className="flex items-end gap-3.5 min-w-0">
                {hasGenericStats ? (
                  genericStats.slice(0, 3).map((item, index) => {
                    const isHero = item.emphasis ?? index === 0;
                    return (
                      <div key={`${item.label}-${item.value}`} className="min-w-0">
                        <span
                          className={cn(
                            "block leading-none tabular-nums truncate",
                            isHero
                              ? "font-display font-black text-[30px] tracking-tight text-white"
                              : "font-display font-bold text-[15px] text-white/90",
                          )}
                        >
                          {item.value}
                        </span>
                        <span
                          className={cn(
                            "block text-[9px] uppercase tracking-wide mt-1 truncate",
                            isHero
                              ? "font-bold text-white/75"
                              : "text-white/55",
                          )}
                        >
                          {item.label}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <>
                    {latestMep !== undefined && (
                      <div>
                        <span className="block font-display font-black text-[30px] tracking-tight text-white leading-none tabular-nums">
                          {latestMep.toFixed(1)}
                        </span>
                        <span className="block text-[9px] font-bold uppercase tracking-wide text-white/75 mt-1">
                          MEP sist
                        </span>
                      </div>
                    )}
                    {latestSaves !== undefined && (
                      <div>
                        <span
                          className={cn(
                            "block font-display leading-none tabular-nums",
                            latestMep === undefined
                              ? "font-black text-[30px] tracking-tight text-white"
                              : "font-bold text-[15px] text-white/90",
                          )}
                        >
                          {latestSaves}
                        </span>
                        <span
                          className={cn(
                            "block text-[9px] uppercase tracking-wide mt-1",
                            latestMep === undefined
                              ? "font-bold text-white/75"
                              : "text-white/55",
                          )}
                        >
                          Redn.
                        </span>
                      </div>
                    )}
                    {latestSavePct !== undefined && (
                      <div>
                        <span className="block font-display font-bold text-[15px] text-white/90 leading-none tabular-nums">
                          {latestSavePct.toFixed(1)}%
                        </span>
                        <span className="block text-[9px] uppercase tracking-wide text-white/55 mt-1">
                          Red%
                        </span>
                      </div>
                    )}
                    {displayGoals !== undefined && latestSaves === undefined && (
                      <div>
                        <span
                          className={cn(
                            "block font-display leading-none tabular-nums",
                            latestMep === undefined
                              ? "font-black text-[30px] tracking-tight text-white"
                              : "font-bold text-[15px] text-white/90",
                          )}
                        >
                          {displayGoals}
                        </span>
                        <span
                          className={cn(
                            "block text-[9px] uppercase tracking-wide mt-1",
                            latestMep === undefined
                              ? "font-bold text-white/75"
                              : "text-white/55",
                          )}
                        >
                          Mål
                        </span>
                      </div>
                    )}
                    {minutes !== undefined && (
                      <div>
                        <span className="block font-display font-bold text-[15px] text-white/90 leading-none tabular-nums">
                          {minutes}
                        </span>
                        <span className="block text-[9px] uppercase tracking-wide text-white/55 mt-1">
                          Min
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
              {/* Formkurven ligger na i full bredde under tallene, ikke klemt
                  inn til hoyre. Gir plass til stolpene og et roligere kort. */}
              {hasSpark && (
                <>
                  <Sparkline values={sparkValues} reference={sparkReference} />
                  <span className="sr-only">{sparkLabel}</span>
                </>
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
