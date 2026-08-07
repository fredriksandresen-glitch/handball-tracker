import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { createActor } from "../backend";
import {
  getStaticPlayers,
  getStaticTeam,
} from "../services/clawdbotPlayerProfile";
import type { Match, Player, Team } from "../types/handball";
import type { SeasonId } from "../data/seasons";

export function useTeam(id: bigint, seasonId?: SeasonId) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Team | null>({
    queryKey: ["team", id.toString(), seasonId ?? "all"],
    queryFn: async () => {
      const staticTeam = getStaticTeam(id, seasonId);
      if (staticTeam) return staticTeam;

      if (!actor) return null;
      return actor.getTeam(id);
    },
    enabled: !isFetching || !!getStaticTeam(id, seasonId),
    staleTime: 60_000,
  });
}

export function useNextMatchForTeam(teamId: bigint) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Match | null>({
    queryKey: ["nextMatch", teamId.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getNextMatchForTeam(teamId);
    },
    enabled: !isFetching,
    staleTime: 60_000,
  });
}

export function usePlayersByTeam(teamId: bigint, seasonId?: SeasonId) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Player[]>({
    queryKey: ["playersByTeam", teamId.toString(), seasonId ?? "all"],
    queryFn: async () => {
      const staticPlayers = getStaticPlayers(seasonId).filter(
        (player) => player.teamId === teamId,
      );
      if (staticPlayers.length > 0) return staticPlayers;

      if (!actor) return [];
      return actor.getPlayersByTeam(teamId);
    },
    enabled: !isFetching || getStaticPlayers(seasonId).length > 0,
    staleTime: 60_000,
  });
}
