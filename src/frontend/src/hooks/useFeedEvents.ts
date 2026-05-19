import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { createActor } from "../backend";
import type { FeedEvent } from "../types/handball";

export function useFeedEvents() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<FeedEvent[]>({
    queryKey: ["feedEvents"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFeedEvents();
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
