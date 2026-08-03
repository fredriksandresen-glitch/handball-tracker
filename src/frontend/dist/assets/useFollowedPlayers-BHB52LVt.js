import { d as useQuery, b as useActor, m as useQueryClient, B as useMutation, e as createActor } from "./index-CPElKy7J.js";
import { e as enrichPlayersWithImages, g as getStaticProfile, i as mapClawdbotPlayer } from "./clawdbotPlayerProfile-CiM1Xaxo.js";
const FOLLOWED_PLAYERS_STORAGE_KEY = "handball-tracker-followed-player-ids";
const LOCAL_STALE_TIME = Number.POSITIVE_INFINITY;
const LOCAL_GC_TIME = 30 * 6e4;
function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}
function readLocalFollowedIds() {
  if (!canUseLocalStorage()) return [];
  try {
    const raw = window.localStorage.getItem(FOLLOWED_PLAYERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
function writeLocalFollowedIds(ids) {
  if (!canUseLocalStorage()) return;
  const uniqueIds = Array.from(new Set(ids));
  window.localStorage.setItem(
    FOLLOWED_PLAYERS_STORAGE_KEY,
    JSON.stringify(uniqueIds)
  );
}
function addLocalFollowedPlayer(playerId) {
  const ids = readLocalFollowedIds();
  writeLocalFollowedIds([...ids, playerId.toString()]);
}
function removeLocalFollowedPlayer(playerId) {
  const playerIdString = playerId.toString();
  writeLocalFollowedIds(
    readLocalFollowedIds().filter((id) => id !== playerIdString)
  );
}
function getLocalFollowedPlayers() {
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
function useFollowedPlayers() {
  return useQuery({
    queryKey: ["followedPlayers"],
    queryFn: async () => getLocalFollowedPlayersWithImages(),
    initialData: getLocalFollowedPlayersWithImages,
    staleTime: LOCAL_STALE_TIME,
    gcTime: LOCAL_GC_TIME
  });
}
function useIsFollowing(playerId) {
  const playerIdString = playerId.toString();
  return useQuery({
    queryKey: ["isFollowing", playerIdString],
    queryFn: async () => readLocalFollowedIds().includes(playerIdString),
    initialData: () => readLocalFollowedIds().includes(playerIdString),
    staleTime: LOCAL_STALE_TIME,
    gcTime: LOCAL_GC_TIME
  });
}
function useFollowPlayer() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (playerId) => {
      if (actor) {
        try {
          await actor.followPlayer(playerId);
        } catch {
        }
      }
    },
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
    }
  });
}
function useUnfollowPlayer() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (playerId) => {
      if (actor) {
        try {
          await actor.unfollowPlayer(playerId);
        } catch {
        }
      }
    },
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
    }
  });
}
export {
  useUnfollowPlayer as a,
  useIsFollowing as b,
  useFollowPlayer as c,
  useFollowedPlayers as u
};
