import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const STORAGE_KEY = "handball-tracker-followed-player-ids";

function readIds() {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(ids)]));
}

export function useSearchIsFollowing(playerId: bigint) {
  const id = playerId.toString();
  return useQuery({
    queryKey: ["isFollowing", id],
    queryFn: async () => readIds().includes(id),
    initialData: () => readIds().includes(id),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useSearchFollowPlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (playerId: bigint) => {
      writeIds([...readIds(), playerId.toString()]);
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
      const id = playerId.toString();
      writeIds(readIds().filter((candidate) => candidate !== id));
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
