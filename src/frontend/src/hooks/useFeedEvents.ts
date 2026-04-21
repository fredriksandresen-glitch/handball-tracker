import { useMockActor } from "./useMockActor";
import { useQuery } from "@tanstack/react-query";
import { createActor } from "../backend-mock";
import type { FeedEvent } from "../types/handball";

export function useFeedEvents() {
  const { actor, isFetching } = useMockActor();
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
