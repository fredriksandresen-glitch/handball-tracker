import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getStaticProfile,
  mapClawdbotPlayer,
} from "../services/clawdbotPlayerProfile";
import type { Player } from "../types/handball";
import {
  addFollowedPlayer,
  readFollowedPlayerIds,
  removeFollowedPlayer,
} from "../utils/followedPlayerStorage";
import { enrichPlayersWithImages } from "../utils/playerImages";

const LOCAL_STALE_TIME = Number.POSITIVE_INFINITY;
const LOCAL_GC_TIME = 30 * 60_000;

function getLocalFollowedPlayers(): Player[] {
  return readFollowedPlayerIds().flatMap((id) => {
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
    queryFn: async () => readFollowedPlayerIds().includes(playerIdString),
    initialData: () => readFollowedPlayerIds().includes(playerIdString),
    staleTime: LOCAL_STALE_TIME,
    gcTime: LOCAL_GC_TIME,
  });
}

export function useFollowPlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_playerId: bigint) => undefined,
    onMutate: (playerId) => {
      addFollowedPlayer(playerId);
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
      removeFollowedPlayer(playerId);
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
