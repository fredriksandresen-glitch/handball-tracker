import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createActor } from "../backend";
import {
  FOLLOWED_PLAYERS_CHANGED_EVENT,
  acknowledgeFollowMutations,
  getPendingFollowMutations,
  hasMigratedFollows,
  markFollowsMigrated,
  readFollowedPlayerIds,
  setAuthenticatedSessionHint,
  writeFollowedPlayerIds,
} from "../utils/followedPlayerStorage";

const MUTATION_BATCH_SIZE = 8;

async function runInBatches(tasks: Array<() => Promise<void>>) {
  for (let index = 0; index < tasks.length; index += MUTATION_BATCH_SIZE) {
    await Promise.all(
      tasks.slice(index, index + MUTATION_BATCH_SIZE).map((task) => task()),
    );
  }
}

export function FavoriteSync() {
  const { identity, isInitializing } = useInternetIdentity();
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const requestSync = () => setRevision((value) => value + 1);
    window.addEventListener(FOLLOWED_PLAYERS_CHANGED_EVENT, requestSync);
    return () =>
      window.removeEventListener(FOLLOWED_PLAYERS_CHANGED_EVENT, requestSync);
  }, []);

  useEffect(() => {
    void revision;
    if (isInitializing) return;

    const principal = identity?.getPrincipal();
    if (!principal || principal.isAnonymous()) {
      setAuthenticatedSessionHint(false);
      return;
    }

    setAuthenticatedSessionHint(true);
    if (!actor) return;

    let cancelled = false;
    const syncFavorites = async () => {
      const principalText = principal.toText();

      try {
        if (!hasMigratedFollows(principalText)) {
          await runInBatches(
            readFollowedPlayerIds().map(
              (id) => () => actor.followPlayer(BigInt(id)),
            ),
          );
          markFollowsMigrated(principalText);
        }

        const pending = getPendingFollowMutations();
        await runInBatches(
          Object.entries(pending).map(
            ([id, action]) =>
              () =>
                action === "follow"
                  ? actor.followPlayer(BigInt(id))
                  : actor.unfollowPlayer(BigInt(id)),
          ),
        );

        const backendIds = await actor.getFollowedPlayerIds();
        if (cancelled) return;

        acknowledgeFollowMutations(pending);
        writeFollowedPlayerIds(
          backendIds.map((id) => id.toString()),
          false,
        );
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["followedPlayers"] }),
          queryClient.invalidateQueries({ queryKey: ["isFollowing"] }),
          queryClient.invalidateQueries({ queryKey: ["feedEvents"] }),
        ]);
      } catch (error) {
        console.error("Kunne ikke synkronisere favoritter", error);
      }
    };

    void syncFavorites();
    return () => {
      cancelled = true;
    };
  }, [actor, identity, isInitializing, queryClient, revision]);

  return null;
}
