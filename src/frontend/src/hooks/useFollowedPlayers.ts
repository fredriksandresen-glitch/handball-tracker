import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActor } from "../backend";
import {
  getStaticProfile,
  mapClawdbotPlayer,
} from "../services/clawdbotPlayerProfile";
import type { Player } from "../types/handball";
import { enrichPlayersWithImages } from "../utils/playerImages";

const FOLLOWED_PLAYERS_STORAGE_KEY = "handball-tracker-followed-player-ids";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readLocalFollowedIds(): string[] {
  if (!canUseLocalStorage()) return [];

  try {
    const raw = window.localStorage.getItem(FOLLOWED_PLAYERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeLocalFollowedIds(ids: string[]) {
  if (!canUseLocalStorage()) return;

  const uniqueIds = Array.from(new Set(ids));
  window.localStorage.setItem(
    FOLLOWED_PLAYERS_STORAGE_KEY,
    JSON.stringify(uniqueIds),
  );
}

function addLocalFollowedPlayer(playerId: bigint) {
  const ids = readLocalFollowedIds();
  writeLocalFollowedIds([...ids, playerId.toString()]);
}

function removeLocalFollowedPlayer(playerId: bigint) {
  const playerIdString = playerId.toString();
  writeLocalFollowedIds(
    readLocalFollowedIds().filter((id) => id !== playerIdString),
  );
}

function getLocalFollowedPlayers(): Player[] {
  return readLocalFollowedIds()
    .map((id) => getStaticProfile(BigInt(id)))
    .filter((profile): profile is NonNullable<typeof profile> => profile !== null)
    .map(mapClawdbotPlayer);
}

export function useFollowedPlayers() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Player[]>({
    queryKey: ["followedPlayers"],
    queryFn: async () => {
      const localFollowed = getLocalFollowedPlayers();
      if (localFollowed.length > 0 || !actor) {
        return enrichPlayersWithImages(localFollowed);
      }

      try {
        const followed = await actor.getFollowedPlayers();
        return enrichPlayersWithImages(followed);
      } catch {
        return enrichPlayersWithImages(localFollowed);
      }
    },
    enabled: !isFetching,
    staleTime: 30_000,
  });
}

export function useIsFollowing(playerId: bigint) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<boolean>({
    queryKey: ["isFollowing", playerId.toString()],
    queryFn: async () => {
      if (readLocalFollowedIds().includes(playerId.toString())) return true;
      if (!actor) return false;

      try {
        return actor.isFollowing(playerId);
      } catch {
        return false;
      }
    },
    enabled: !isFetching,
    staleTime: 30_000,
  });
}

export function useFollowPlayer() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (playerId: bigint) => {
      addLocalFollowedPlayer(playerId);
      if (actor) {
        try {
          await actor.followPlayer(playerId);
        } catch {
          // Local MVP follow state is the source of truth for now.
        }
      }
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
      removeLocalFollowedPlayer(playerId);
      if (actor) {
        try {
          await actor.unfollowPlayer(playerId);
        } catch {
          // Local MVP follow state is the source of truth for now.
        }
      }
    },
    onSuccess: (_data, playerId) => {
      qc.invalidateQueries({ queryKey: ["followedPlayers"] });
      qc.invalidateQueries({ queryKey: ["isFollowing", playerId.toString()] });
      qc.invalidateQueries({ queryKey: ["feedEvents"] });
    },
  });
}
