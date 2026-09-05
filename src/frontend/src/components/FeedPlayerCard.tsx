import { cn } from "@/lib/utils";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createActor } from "../backend";
import { getNationalTeamInfo } from "../data/nationalTeamPlayers";
import { formatMatchDate, getCountdown } from "../services/handballService";
import type { EnrichedPlayerMatchStats } from "../services/clawdbotPlayerProfile";
import type { FeedEvent, Player, PlayerMatchStats } from "../types/handball";
import { FeedEventType, Position } from "../types/handball";
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

function getMatchDate(match: EnrichedPlayerMatchStats) {
  return match.date ?? match.matchId.toString();
}

function formatDecimal(value: number | undefined, digits = 1) {
  return value === undefined ? "-" : value.toFixed(digits);
}

function NextMatchPill({ teamId }: { teamId: bigint }) {
  const { actor, isFetching } = useActor(createActor);
  const { data: nextMatch } = useQuery({
    queryKey: ["nextMatch", teamId.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getNextMatchForTeam(teamId);
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
  const { data: homeTeam } = useQuery({
    queryKey: ["team", nextMatch?.homeTeamId?.toString() ?? "none"],
    queryFn: async () => {
      if (!actor || !nextMatch) return null;
      return actor.getTeam(nextMatch.homeTeamId);
    },
    enabled: !!actor && !isFetching && !!nextMatch,
    staleTime: 120_000,
  });
  const { data: awayTeam } = useQuery({
    queryKey: ["team", nextMatch?.awayTeamId?.toString() ?? "none"],
    queryFn: async () => {
      if (!actor || !nextMatch) return null;
      return actor.getTeam(nextMatch.awayTeamId);
    },
    enabled: !!actor && !isFetching && !!nextMatch,
    staleTime: 120_000,
  });

  if (!nextMatch) return null;
  const isHome = nextMatch.homeTeamId === teamId;
  const opponentName = isHome ? awayTeam?.name : homeTeam?.name;
  const countdown = getCountdown(nextMatch.startTime);
  const dateStr = formatMatchDate(nextMatch.startTime);

  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <span className="text-[9px] uppercase tracking-wider text-white/50 font-display font-bold flex-shrink-0">
        Neste
      </span>
      <span className="text-[10px] text-white/80 truncate min-w-0">
        {isHome ? "vs" : "@"} {opponentName ?? "-"}
      </span>
      <span className="flex-shrink-0 text-[9px] font-display font-bold text-white bg-white/15 px-1.5 py-0.5 rounded-full border border-white/20">
        {countdown}
      </span>
      <span className="text-[9px] text-white/50 hidden sm:block flex-shrink-0">
        {dateStr}
      </span>
    </div>
  );
}

const TEAM_BG_CLASSES: Record<string, string> = {
  vipers: "bg-gradient-to-br from-purple-900 to-purple-700",
  storhamar: "bg-gradient-to-br from-red-900 to-red-700",
  larvik: "bg-gradient-to-br from-blue-900 to-blue-700",
  fjellhammer: "bg-gradient-to-br from-green-900 to-green-700",
  byåsen: "bg-gradient-to-br from-orange-900 to-orange-700",
  fana: "bg-gradient-to-br from-sky-900 to-sky-700",
  rælingen: "bg-gradient-to-br from-yellow-900 to-yellow-700",
  kolstad: "bg-gradient-to-br from-indigo-900 to-indigo-700",
  gjerpen: "bg-gradient-to-br from-teal-900 to-teal-700",
  oppsal: "bg-gradient-to-br from-rose-900 to-rose-700",
  fredrikstad: "bg-gradient-to-br from-cyan-900 to-cyan-700",
  stabæk: "bg-gradient-to-br from-lime-900 to-lime-700",
};

function placeholderBg(teamName: string): string {
  const lower = teamName.toLowerCase();
  for (const [key, cls] of Object.entries(TEAM_BG_CLASSES)) {
    if (lower.includes(key)) return cls;
  }
  return "bg-gradient-to-br from-muted to-muted/70";
}

function PlayerImageFallback({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
  teamName: string;
  feedEvents: FeedEvent[];
  onUnfollow: () => void;
  isUnfollowLoading?: boolean;
  matchStats?: PlayerMatchStats[];
  index?: number;
}

export function FeedPlayerCard({
  player,
  teamName,
  feedEvents,
  onUnfollow,
  isUnfollowLoading,
  matchStats = [],
  index = 0,
}: Props) {
  const navigate = useNavigate();
  const [imageFailed, setImageFailed] = useState(false);
  // Kortbilde (webp 400/720) i stedet for originalen paa ~1,4 MB PNG.
  const playerCardImage = resolvePlayerCardImageSources(player.imageUrl);

  const lastGoalEvent = feedEvents
    .filter((e) => e.eventType === FeedEventType.GoalsScored)
    .at(-1);
  const lastMinEvent = feedEvents
    .filter((e) => e.eventType === FeedEventType.MinutesPlayed)
    .at(-1);

  const keeper = player.position === Position.Keeper;
  // Keepere maales paa redningsprosent, ikke MEP (2026-08-27). MEP er bygget
  // for utespillere og sier lite om en keepers prestasjon.
  // Keeperkamper med under 5 skudd mot gir ikke meningsfull prosent —
  // en redning paa ett skudd blir 100 % og ser ut som en storkamp.
  const qualifying = (matchStats as EnrichedPlayerMatchStats[])
    .filter((match) =>
      keeper
        ? typeof match.savePct === "number" &&
          Number(match.shotsAgainst ?? 0) >= 5
        : typeof match.mep === "number",
    )
    .sort((a, b) => getMatchDate(a).localeCompare(getMatchDate(b)));
  const formMatches = qualifying.slice(-5);
  const mepMatches = formMatches;
  const latestMatch = formMatches.at(-1);
  const sparkValues = formMatches.map((match) =>
    keeper ? (match.savePct ?? 0) : (match.mep ?? 0),
  );
  // Referanselinjen er sesongsnittet paa samme skala, ikke snittet av de fem.
  const sparkReference = qualifying.length
    ? qualifying.reduce(
        (sum, m) => sum + (keeper ? (m.savePct ?? 0) : (m.mep ?? 0)),
        0,
      ) / qualifying.length
    : undefined;
  const latestGoals = keeper ? undefined : latestMatch?.goals ?? lastGoalEvent?.statValue;
  const latestSaves = keeper ? latestMatch?.saves : undefined;
  const latestSavePct = keeper ? latestMatch?.savePct : undefined;
  const nationalTeam = getNationalTeamInfo(player.id);

  function handleCardClick() {
    navigate({ to: "/player/$id", params: { id: player.id.toString() } });
  }

  function handleUnfollow(e: React.MouseEvent) {
    e.stopPropagation();
    onUnfollow();
  }

  const bgClass = nationalTeam?.countryCode === "FI" ? "bg-white" : placeholderBg(teamName);

  return (
    <motion.button
      type="button"
      onClick={handleCardClick}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      aria-label={`Vis profil for ${player.name}`}
      className="w-full text-left rounded-2xl overflow-hidden cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-subtle hover:shadow-elevated transition-smooth"
      data-ocid="feed-player-card"
    >
      <div className={cn("relative w-full aspect-[3/4.45] sm:aspect-[3/4]", bgClass)}>
        {nationalTeam?.countryCode === "FI" && (
          <div
            className="absolute inset-0 z-0 bg-white"
            aria-hidden="true"
          >
            <div className="absolute inset-y-0 left-[31%] w-[16%] bg-[#002f6c]" />
            <div className="absolute inset-x-0 top-[38%] h-[16%] bg-[#002f6c]" />
          </div>
        )}

        {playerCardImage && !imageFailed ? (
          <img
            src={playerCardImage.src}
            srcSet={playerCardImage.srcSet}
            sizes="(max-width: 640px) 50vw, 320px"
            alt={player.name}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="player-portrait absolute inset-0 z-10 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <PlayerImageFallback name={player.name} />
        )}

        {/* Lettere gradient (designgjennomgang 2026-08-27): fire stopp slik at
            ansiktet slipper fram uten at teksten blir mindre lesbar. */}
        <div
          className="absolute inset-0 z-20"
          style={{
            background:
              "linear-gradient(to top, rgba(6,12,26,0.94) 0%, rgba(6,12,26,0.72) 18%, rgba(6,12,26,0.28) 42%, rgba(6,12,26,0.02) 62%, transparent 100%)",
          }}
        />

        {/* Landkode-chippen er fjernet 2026-08-27: flagget i bakgrunnen viser
            allerede nasjonaliteten, og plassen brukes bedre til posisjonen. */}
        <div className="absolute left-3 top-3 z-30">
          <PositionBadge position={player.position} variant="overlay" />
        </div>

        <button
          type="button"
          onClick={handleUnfollow}
          disabled={isUnfollowLoading}
          aria-label="Slutt å følge"
          className="absolute top-2.5 right-2.5 z-30 size-8 sm:size-7 rounded-full bg-black/50 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white/80 hover:bg-destructive/70 hover:text-white hover:border-destructive/60 transition-smooth"
          data-ocid="feed-player-unfollow"
        >
          <span className="text-sm leading-none font-bold">×</span>
        </button>

        <div className="absolute bottom-0 left-0 right-0 z-30 px-3.5 sm:px-3 pb-3.5 sm:pb-3 pt-12 sm:pt-10">
          <p className="font-display font-black text-white text-[17px] sm:text-[15px] tracking-tight leading-tight truncate drop-shadow-sm">
            {player.name}
          </p>

          <p className="text-[11px] sm:text-[10px] text-white/65 truncate mt-0.5 font-body">
            {teamName}
          </p>

          {/* Ett hovedtall, resten som stottetall (designgjennomgang
              2026-08-27). Formkurven ligger i full bredde under. */}
          <div className="mt-2.5 sm:mt-2 pt-2.5 sm:pt-2 border-t border-white/15">
            <div className="flex items-end gap-3.5">
              {/* Keepere: redningsprosent som hovedtall. Utespillere: MEP. */}
              {keeper && latestSavePct !== undefined && (
                <div>
                  <span className="block font-display font-black text-[30px] sm:text-[26px] tracking-tight text-white leading-none tabular-nums">
                    {latestSavePct.toFixed(0)}%
                  </span>
                  <span className="block text-[9px] font-bold uppercase tracking-wide text-white/75 mt-1">
                    Redning
                  </span>
                </div>
              )}
              {!keeper && latestMatch?.mep !== undefined && (
                <div>
                  <span className="block font-display font-black text-[30px] sm:text-[26px] tracking-tight text-white leading-none tabular-nums">
                    {formatDecimal(latestMatch.mep)}
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
                      latestMatch?.mep === undefined
                        ? "font-black text-[30px] sm:text-[26px] tracking-tight text-white"
                        : "font-bold text-[15px] text-white/90",
                    )}
                  >
                    {latestSaves.toString()}
                  </span>
                  <span
                    className={cn(
                      "block text-[9px] uppercase tracking-wide mt-1",
                      latestMatch?.mep === undefined
                        ? "font-bold text-white/75"
                        : "text-white/55",
                    )}
                  >
                    Redn.
                  </span>
                </div>
              )}
              {/* Skudd mot gir volumkontekst: 50 % paa 4 skudd og 50 % paa
                  40 skudd er to helt ulike kamper. */}
              {keeper && latestMatch?.shotsAgainst !== undefined && (
                <div>
                  <span className="block font-display font-bold text-[15px] text-white/90 leading-none tabular-nums">
                    {latestMatch.shotsAgainst.toString()}
                  </span>
                  <span className="block text-[9px] uppercase tracking-wide text-white/55 mt-1">
                    Skudd mot
                  </span>
                </div>
              )}
              {latestGoals !== undefined && (
                <div>
                  <span
                    className={cn(
                      "block font-display leading-none tabular-nums",
                      latestMatch?.mep === undefined
                        ? "font-black text-[30px] sm:text-[26px] tracking-tight text-white"
                        : "font-bold text-[15px] text-white/90",
                    )}
                  >
                    {latestGoals.toString()}
                  </span>
                  <span
                    className={cn(
                      "block text-[9px] uppercase tracking-wide mt-1",
                      latestMatch?.mep === undefined
                        ? "font-bold text-white/75"
                        : "text-white/55",
                    )}
                  >
                    Mål
                  </span>
                </div>
              )}
              {lastMinEvent?.statValue !== undefined && (
                <div>
                  <span className="block font-display font-bold text-[15px] text-white/90 leading-none tabular-nums">
                    {lastMinEvent.statValue.toString()}
                  </span>
                  <span className="block text-[9px] uppercase tracking-wide text-white/55 mt-1">
                    Min
                  </span>
                </div>
              )}
            </div>

            {sparkValues.length >= 2 && (
              <>
                <Sparkline values={sparkValues} reference={sparkReference} />
                <span className="sr-only">MEP-form</span>
              </>
            )}
          </div>

          <NextMatchPill teamId={player.teamId} />
        </div>
      </div>
    </motion.button>
  );
}
