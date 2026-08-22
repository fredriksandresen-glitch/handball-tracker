import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addFollowedPlayer,
  readFollowedPlayerIds,
  removeFollowedPlayer,
} from "../utils/followedPlayerStorage";

export function useSearchIsFollowing(playerId: bigint) {
  const id = playerId.toString();
  return useQuery({
    queryKey: ["isFollowing", id],
    queryFn: async () => readFollowedPlayerIds().includes(id),
    initialData: () => readFollowedPlayerIds().includes(id),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useSearchFollowPlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (playerId: bigint) => {
      addFollowedPlayer(playerId);
    },
    onMutate: (playerId) => {
      queryClient.setQueryData(["isFollowing", playerId.toString()], true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followedPlayers"] });
      queryClient.invalidateQueries({ queryKey: ["feedEvents"] });
    },
  });
}

export function useSearchUnfollowPlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (playerId: bigint) => {
      removeFollowedPlayer(playerId);
    },
    onMutate: (playerId) => {
      queryClient.setQueryData(["isFollowing", playerId.toString()], false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followedPlayers"] });
      queryClient.invalidateQueries({ queryKey: ["feedEvents"] });
    },
  });
}
