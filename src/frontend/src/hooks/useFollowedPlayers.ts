import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActor } from "../backend";
import type { Player } from "../types/handball";
import { enrichPlayersWithImages } from "../utils/playerImages";

// Demo players shown on first load when no players have been followed yet.
// This ensures the live app looks identical to the demo on first visit.
const DEMO_PLAYER_IDS = [BigInt(3), BigInt(14), BigInt(68)]; // Camilla Herrem, Ida Alstad, Sarah Solheim

export function useFollowedPlayers() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Player[]>({
    queryKey: ["followedPlayers"],
    queryFn: async () => {
      if (!actor) return [];
      const followed = await actor.getFollowedPlayers();
      // If the user hasn't followed anyone yet, show the 3 demo players
      // so the feed looks great on first load (matches demo behaviour).
      if (followed.length === 0) {
        // Auto-follow the 3 demo players so they persist for this user
        try {
          await Promise.all(
            DEMO_PLAYER_IDS.map((id) => actor.followPlayer(id)),
          );
        } catch {
          // Non-fatal — we'll still fetch them below
        }
        const withDemos = await actor.getFollowedPlayers();
        // If the follow calls worked, return those; otherwise build list from search
        if (withDemos.length > 0) {
          return enrichPlayersWithImages(withDemos);
        }
        // Last resort: fetch each demo player individually
        const demos = await Promise.all(
          DEMO_PLAYER_IDS.map((id) => actor.getPlayer(id)),
        );
        return enrichPlayersWithImages(
          demos.filter((p): p is Player => p !== null),
        );
      }
      return enrichPlayersWithImages(followed);
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useIsFollowing(playerId: bigint) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<boolean>({
    queryKey: ["isFollowing", playerId.toString()],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isFollowing(playerId);
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useFollowPlayer() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (playerId: bigint) => {
      if (!actor) throw new Error("Ingen tilkobling");
      return actor.followPlayer(playerId);
    },
    onSuccess: (_data, playerId) => {
      qc.invalidateQueries({ queryKey: ["followedPlayers"] });
      qc.invalidateQueries({ queryKey: ["isFollowing", playerId.toString()] });
      qc.invalidateQueries({ queryKey: ["feedEvents"] });
    },
  });
}

export function useUnfollowPlayer() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (playerId: bigint) => {
      if (!actor) throw new Error("Ingen tilkobling");
      return actor.unfollowPlayer(playerId);
    },
    onSuccess: (_data, playerId) => {
      qc.invalidateQueries({ queryKey: ["followedPlayers"] });
      qc.invalidateQueries({ queryKey: ["isFollowing", playerId.toString()] });
      qc.invalidateQueries({ queryKey: ["feedEvents"] });
    },
  });
}
