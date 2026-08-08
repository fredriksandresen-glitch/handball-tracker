import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { createActor } from "../backend";
import {
  getStaticPlayers,
  getStaticTeam,
} from "../services/clawdbotPlayerProfile";
import {
  getStaticNextMatchForTeam,
  type NextMatchResult,
} from "../data/nextMatches";
import type { Player, Team } from "../types/handball";
import type { LeagueId, SeasonId } from "../data/seasons";

export function useTeam(
  id: bigint,
  seasonId?: SeasonId,
  leagueId?: LeagueId,
) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Team | null>({
    queryKey: ["team", id.toString(), seasonId ?? "all", leagueId ?? "all"],
    queryFn: async () => {
      const staticTeam = getStaticTeam(id, seasonId, leagueId);
      if (staticTeam) return staticTeam;

      if (!actor) return null;
      return actor.getTeam(id);
    },
    enabled: !isFetching || !!getStaticTeam(id, seasonId, leagueId),
    staleTime: 60_000,
  });
}

export function useNextMatchForTeam(
  teamId: bigint,
  seasonId?: SeasonId,
  leagueId?: LeagueId,
) {
  const { actor, isFetching } = useActor(createActor);
  const staticTeam = getStaticTeam(teamId, seasonId, leagueId);

  return useQuery<NextMatchResult | null>({
    queryKey: [
      "nextMatch",
      teamId.toString(),
      seasonId ?? "all",
      leagueId ?? "all",
    ],
    queryFn: async () => {
      if (staticTeam) {
        const staticMatch = getStaticNextMatchForTeam(staticTeam.name);
        if (staticMatch) return staticMatch;
      }

      if (!actor) return null;
      const match = await actor.getNextMatchForTeam(teamId);
      return match
        ? { match, homeTeamName: undefined, awayTeamName: undefined }
        : null;
    },
    enabled: !isFetching || !!staticTeam,
    staleTime: 60_000,
  });
}

export function usePlayersByTeam(
  teamId: bigint,
  seasonId?: SeasonId,
  leagueId?: LeagueId,
) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Player[]>({
    queryKey: [
      "playersByTeam",
      teamId.toString(),
      seasonId ?? "all",
      leagueId ?? "all",
    ],
    queryFn: async () => {
      const staticPlayers = getStaticPlayers(seasonId, leagueId).filter(
        (player) => player.teamId === teamId,
      );
      if (staticPlayers.length > 0) return staticPlayers;

      if (!actor) return [];
      return actor.getPlayersByTeam(teamId);
    },
    enabled: !isFetching || getStaticPlayers(seasonId, leagueId).length > 0,
    staleTime: 60_000,
  });
}
