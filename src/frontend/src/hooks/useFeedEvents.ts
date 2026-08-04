import { useQuery } from "@tanstack/react-query";
import type { FeedEvent } from "../types/handball";

export function useFeedEvents() {
  return useQuery<FeedEvent[]>({
    queryKey: ["feedEvents"],
    queryFn: async () => [],
    initialData: [],
    staleTime: Number.POSITIVE_INFINITY,
  });
}
