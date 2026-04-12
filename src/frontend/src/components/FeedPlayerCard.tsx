import { cn } from "@/lib/utils";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { createActor } from "../backend";
import {
  computeFormSparkline,
  formatMatchDate,
  getCountdown,
} from "../services/handballService";
import type { FeedEvent, Player, PlayerMatchStats } from "../types/handball";
import { FeedEventType } from "../types/handball";
import { PositionBadge } from "./PositionBadge";

// ── Sparkline (white for overlay) ─────────────────────────────────────────
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const W = 48;
  const H = 20;
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
      className="flex-shrink-0 opacity-80"
    >
      <title>Formkurve siste kamper</title>
      <polyline
        points={pts.join(" ")}
        fill="none"
        strokeWidth="1.8"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Next match pill inside card overlay ────────────────────────────────────
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
        {isHome ? "vs" : "@"} {opponentName ?? "–"}
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

// ── Team-color placeholder backgrounds (by team name keyword) ─────────────
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

// ── Main FeedPlayerCard ────────────────────────────────────────────────────
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

  // Derive last match stats from events
  const lastGoalEvent = feedEvents
    .filter((e) => e.eventType === FeedEventType.GoalsScored)
    .at(-1);
  const lastMinEvent = feedEvents
    .filter((e) => e.eventType === FeedEventType.MinutesPlayed)
    .at(-1);

  const sparkValues = computeFormSparkline(
    matchStats.map((s) => ({ goals: s.goals })),
  );

  function handleCardClick() {
    navigate({ to: "/player/$id", params: { id: player.id.toString() } });
  }

  function handleUnfollow(e: React.MouseEvent) {
    e.stopPropagation();
    onUnfollow();
  }

  const bgClass = placeholderBg(teamName);

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
      {/* ── Poster area: aspect-[3/4] fill ── */}
      <div className={cn("relative w-full aspect-[3/4]", bgClass)}>
        {/* Player photo */}
        {player.imageUrl ? (
          <img
            src={player.imageUrl}
            alt={player.name}
            className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <span className="font-display font-black text-7xl text-white">
              {player.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Gradient overlay: fully transparent at top → dark at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

        {/* Jersey number badge — top left */}
        {player.jerseyNumber !== undefined && (
          <div className="absolute top-2.5 left-2.5 size-7 rounded-full bg-black/50 backdrop-blur-sm border border-white/25 flex items-center justify-center">
            <span className="font-display font-black text-[11px] text-white leading-none">
              {player.jerseyNumber.toString()}
            </span>
          </div>
        )}

        {/* Unfollow button — top right */}
        <button
          type="button"
          onClick={handleUnfollow}
          disabled={isUnfollowLoading}
          aria-label="Slutt å følge"
          className="absolute top-2.5 right-2.5 size-7 rounded-full bg-black/50 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white/70 hover:bg-destructive/70 hover:text-white hover:border-destructive/60 transition-smooth"
          data-ocid="feed-player-unfollow"
        >
          <span className="text-sm leading-none font-bold">×</span>
        </button>

        {/* ── Bottom overlay: name, team, stats ── */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-10">
          {/* Position badge */}
          <div className="mb-1">
            <PositionBadge position={player.position} variant="overlay" />
          </div>

          {/* Name */}
          <p className="font-display font-black text-white text-sm leading-tight truncate drop-shadow-sm">
            {player.name}
          </p>

          {/* Team */}
          <p className="text-[10px] text-white/65 truncate mt-0.5 font-body">
            {teamName}
          </p>

          {/* Stats row: goals + minutes + sparkline */}
          <div className="flex items-end justify-between mt-2 pt-2 border-t border-white/15">
            <div className="flex gap-3">
              {lastGoalEvent?.statValue !== undefined && (
                <div>
                  <span className="block font-display font-black text-xl text-white leading-none">
                    {lastGoalEvent.statValue.toString()}
                  </span>
                  <span className="block text-[8px] uppercase tracking-wide text-white/55 mt-0.5">
                    Mål sist
                  </span>
                </div>
              )}
              {lastMinEvent?.statValue !== undefined && (
                <div>
                  <span className="block font-display font-bold text-base text-white/85 leading-none">
                    {lastMinEvent.statValue.toString()}
                  </span>
                  <span className="block text-[8px] uppercase tracking-wide text-white/55 mt-0.5">
                    Min
                  </span>
                </div>
              )}
            </div>

            {sparkValues.length >= 2 && (
              <div className="flex flex-col items-end gap-0.5">
                <Sparkline values={sparkValues} />
                <span className="text-[8px] uppercase tracking-wide text-white/45">
                  Form
                </span>
              </div>
            )}
          </div>

          {/* Next match pill */}
          <NextMatchPill teamId={player.teamId} />
        </div>
      </div>
    </motion.button>
  );
}
