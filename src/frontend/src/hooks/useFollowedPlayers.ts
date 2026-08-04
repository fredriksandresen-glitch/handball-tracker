import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getStaticProfile,
  mapClawdbotPlayer,
} from "../services/clawdbotPlayerProfile";
import type { Player } from "../types/handball";
import { enrichPlayersWithImages } from "../utils/playerImages";

const FOLLOWED_PLAYERS_STORAGE_KEY = "handball-tracker-followed-player-ids";
const LOCAL_STALE_TIME = Number.POSITIVE_INFINITY;
const LOCAL_GC_TIME = 30 * 60_000;

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
  return readLocalFollowedIds().flatMap((id) => {
    try {
      const profile = getStaticProfile(BigInt(id));
      return profile ? [mapClawdbotPlayer(profile)] : [];
    } catch {
      return [];
    }
  });
}

function getLocalFollowedPlayersWithImages() {
  return enrichPlayersWithImages(getLocalFollowedPlayers());
}

export function useFollowedPlayers() {
  return useQuery<Player[]>({
    queryKey: ["followedPlayers"],
    queryFn: async () => getLocalFollowedPlayersWithImages(),
    initialData: getLocalFollowedPlayersWithImages,
    staleTime: LOCAL_STALE_TIME,
    gcTime: LOCAL_GC_TIME,
  });
}

export function useIsFollowing(playerId: bigint) {
  const playerIdString = playerId.toString();

  return useQuery<boolean>({
    queryKey: ["isFollowing", playerIdString],
    queryFn: async () => readLocalFollowedIds().includes(playerIdString),
    initialData: () => readLocalFollowedIds().includes(playerIdString),
    staleTime: LOCAL_STALE_TIME,
    gcTime: LOCAL_GC_TIME,
  });
}

export function useFollowPlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_playerId: bigint) => undefined,
    onMutate: (playerId) => {
      addLocalFollowedPlayer(playerId);
      const playerIdString = playerId.toString();
      qc.setQueryData(["isFollowing", playerIdString], true);
      qc.setQueryData(["followedPlayers"], getLocalFollowedPlayersWithImages());
    },
    onSuccess: (_data, playerId) => {
      qc.setQueryData(["isFollowing", playerId.toString()], true);
      qc.setQueryData(["followedPlayers"], getLocalFollowedPlayersWithImages());
      qc.invalidateQueries({ queryKey: ["feedEvents"] });
    },
  });
}

export function useUnfollowPlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_playerId: bigint) => undefined,
    onMutate: (playerId) => {
      removeLocalFollowedPlayer(playerId);
      const playerIdString = playerId.toString();
      qc.setQueryData(["isFollowing", playerIdString], false);
      qc.setQueryData(["followedPlayers"], getLocalFollowedPlayersWithImages());
    },
    onSuccess: (_data, playerId) => {
      qc.setQueryData(["isFollowing", playerId.toString()], false);
      qc.setQueryData(["followedPlayers"], getLocalFollowedPlayersWithImages());
      qc.invalidateQueries({ queryKey: ["feedEvents"] });
    },
  });
}
