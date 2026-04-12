import { Link } from "@tanstack/react-router";
import { Search, Shield, Star, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import { PlayerCard } from "../components/PlayerCard";
import { SkeletonCard } from "../components/SkeletonCard";
import {
  useFollowPlayer,
  useFollowedPlayers,
  useUnfollowPlayer,
} from "../hooks/useFollowedPlayers";
import { usePlayers } from "../hooks/usePlayers";
import { useTeams } from "../hooks/useTeams";

// ── Recommended player mini card ──────────────────────────────────────────
function RecommendedPlayerCard({
  playerId,
  teamName,
}: { playerId: bigint; teamName?: string }) {
  const { data: allPlayers } = usePlayers();
  const { data: followedPlayers = [] } = useFollowedPlayers();
  const followMutation = useFollowPlayer();
  const player = allPlayers?.find((p) => p.id === playerId);
  if (!player) return null;
  const isAlreadyFollowing = followedPlayers.some((p) => p.id === playerId);
  if (isAlreadyFollowing) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-card border border-border px-3 py-2.5 min-w-[160px] flex-shrink-0">
      <div className="size-8 rounded-full bg-muted flex items-center justify-center border border-border flex-shrink-0">
        <span className="text-[11px] font-display font-bold text-muted-foreground">
          {player.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-[12px] text-foreground truncate">
          {player.name.split(" ").at(-1)}
        </p>
        {teamName && (
          <p className="text-[10px] text-muted-foreground truncate">
            {teamName}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => followMutation.mutate(player.id)}
        disabled={followMutation.isPending}
        aria-label={`Følg ${player.name}`}
        className="flex-shrink-0 size-7 rounded-full bg-primary/15 border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-smooth flex items-center justify-center"
        data-ocid="recommended-follow-btn"
      >
        <UserPlus className="size-3.5" />
      </button>
    </div>
  );
}

// ── Recommended players section ────────────────────────────────────────────
function RecommendedSection() {
  const { data: followedPlayers = [] } = useFollowedPlayers();
  const { data: allPlayers = [] } = usePlayers();
  const { data: teams = [] } = useTeams();

  const teamMap = useMemo(
    () => new Map(teams.map((t) => [t.id.toString(), t.name])),
    [teams],
  );

  const followedIds = new Set(followedPlayers.map((p) => p.id.toString()));
  const followedTeamIds = new Set(
    followedPlayers.map((p) => p.teamId.toString()),
  );

  // Suggest: same teams, not followed yet, first 3
  const suggestions = useMemo(
    () =>
      allPlayers
        .filter(
          (p) =>
            !followedIds.has(p.id.toString()) &&
            followedTeamIds.has(p.teamId.toString()),
        )
        .slice(0, 4),
    [allPlayers, followedIds, followedTeamIds],
  );

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2.5" data-ocid="recommended-players">
      <p className="text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground">
        Anbefalte spillere
      </p>
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {suggestions.map((p) => (
          <RecommendedPlayerCard
            key={p.id.toString()}
            playerId={p.id}
            teamName={teamMap.get(p.teamId.toString())}
          />
        ))}
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyFavorites() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[62vh] text-center px-6"
      data-ocid="favorites-empty"
    >
      <div className="size-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
        <Star className="size-10 text-primary" strokeWidth={1.5} />
      </div>
      <h2 className="font-display font-bold text-xl text-foreground mb-2">
        Ingen favoritter ennå
      </h2>
      <p className="text-muted-foreground text-sm leading-relaxed max-w-[280px] mb-8">
        Du følger ingen spillere ennå. Utforsk lag eller søk etter spillere for
        å begynne å bygge feeden din.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Link
          to="/search"
          className="flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground font-display font-bold text-sm px-6 py-3 flex-1 transition-smooth hover:bg-primary/90"
          data-ocid="favorites-search-cta"
        >
          <Search className="size-4" />
          Søk spillere
        </Link>
        <Link
          to="/teams"
          className="flex items-center justify-center gap-2 rounded-full bg-card border border-border text-foreground font-display font-bold text-sm px-6 py-3 flex-1 transition-smooth hover:border-primary/40"
          data-ocid="favorites-teams-cta"
        >
          <Shield className="size-4" />
          Se lag
        </Link>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function FavoritesPage() {
  const { data: followedPlayers, isLoading } = useFollowedPlayers();
  const unfollowMutation = useUnfollowPlayer();
  const { data: teams } = useTeams();

  const teamMap = new Map<string, string>(
    (teams ?? []).map((t) => [t.id.toString(), t.name]),
  );

  if (isLoading) {
    return (
      <div className="space-y-3" data-ocid="favorites-loading">
        <SkeletonCard variant="player" />
        <SkeletonCard variant="player" />
        <SkeletonCard variant="player" />
      </div>
    );
  }

  const players = followedPlayers ?? [];
  if (players.length === 0) return <EmptyFavorites />;

  return (
    <div className="space-y-4" data-ocid="favorites-list">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
          {players.length} {players.length === 1 ? "spiller" : "spillere"} fulgt
        </p>
        <Link
          to="/search"
          className="text-[11px] font-display font-semibold text-primary hover:underline"
          data-ocid="favorites-add-more"
        >
          + Legg til
        </Link>
      </div>

      {/* Player cards */}
      <div className="grid grid-cols-2 gap-3">
        {players.map((player, i) => (
          <motion.div
            key={player.id.toString()}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <PlayerCard
              player={player}
              teamName={teamMap.get(player.teamId.toString())}
              isFollowing
              onUnfollow={() => unfollowMutation.mutate(player.id)}
              isLoading={unfollowMutation.isPending}
            />
          </motion.div>
        ))}
      </div>

      {/* Recommended players based on followed teams */}
      <RecommendedSection />

      {/* Discover more CTA */}
      <div className="pt-2 border-t border-border mt-4">
        <Link
          to="/teams"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-card border border-border py-3 text-sm font-display font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground transition-smooth"
          data-ocid="favorites-discover-teams"
        >
          <Shield className="size-4" />
          Utforsk lag for å finne flere spillere
        </Link>
      </div>
    </div>
  );
}
