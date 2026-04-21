import { j as jsxRuntimeExports, a as cn, b as useQuery, l as useQueryClient, m as useMutation, d as useMockActor } from "./index-B2X5ECyo.js";
const POSITION_LABELS = {
  Keeper: "Keeper",
  Bakspiller: "Bakspiller",
  VenstreKant: "V. kant",
  HoyreKant: "H. kant",
  Linje: "Linjespiller"
};
const POSITION_COLORS = {
  Keeper: "bg-chart-3/25 text-chart-3 border-chart-3/40",
  Bakspiller: "bg-primary/25 text-primary border-primary/40",
  VenstreKant: "bg-chart-2/25 text-chart-2 border-chart-2/40",
  HoyreKant: "bg-chart-5/25 text-chart-5 border-chart-5/40",
  Linje: "bg-chart-4/25 text-chart-4 border-chart-4/40"
};
function PositionBadge({
  position,
  className,
  size = "sm",
  variant = "default"
}) {
  const label = POSITION_LABELS[position] ?? position;
  const color = variant === "overlay" ? "bg-white/20 text-white border-white/30 backdrop-blur-sm" : POSITION_COLORS[position] ?? "bg-muted text-muted-foreground border-border";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: cn(
        "inline-flex items-center border rounded-full font-display font-semibold tracking-wide uppercase",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        color,
        className
      ),
      children: label
    }
  );
}
const ID_OVERRIDES = {
  "23": "/assets/generated/camilla-herrem.dim_600x800.jpg",
  "241": "/assets/sara-solheim.jpg"
};
const NAME_OVERRIDES = [
  {
    matchNames: ["ida alstad"],
    imageUrl: "/assets/ida-alstad.jpg"
  },
  {
    matchNames: ["sarah deari solheim", "sara solheim", "sarah solheim"],
    imageUrl: "/assets/sara-solheim.jpg"
  },
  {
    matchNames: ["camilla herrem"],
    imageUrl: "/assets/generated/camilla-herrem.dim_600x800.jpg"
  }
];
function enrichPlayerWithImage(player) {
  if (player.imageUrl) return player;
  const idOverride = ID_OVERRIDES[player.id.toString()];
  if (idOverride) return { ...player, imageUrl: idOverride };
  const nameLower = player.name.toLowerCase().trim();
  for (const entry of NAME_OVERRIDES) {
    if (entry.matchNames.some((n) => nameLower === n)) {
      return { ...player, imageUrl: entry.imageUrl };
    }
  }
  return player;
}
function enrichPlayersWithImages(players) {
  return players.map(enrichPlayerWithImage);
}
const DEMO_PLAYER_IDS = [BigInt(3), BigInt(14), BigInt(68)];
function useFollowedPlayers() {
  const { actor } = useMockActor();
  return useQuery({
    queryKey: ["followedPlayers"],
    queryFn: async () => {
      if (!actor) return [];
      const followed = await actor.getFollowedPlayers();
      if (followed.length === 0) {
        try {
          await Promise.all(
            DEMO_PLAYER_IDS.map((id) => actor.followPlayer(id))
          );
        } catch {
        }
        const withDemos = await actor.getFollowedPlayers();
        if (withDemos.length > 0) {
          return enrichPlayersWithImages(withDemos);
        }
        const demos = await Promise.all(
          DEMO_PLAYER_IDS.map((id) => actor.getPlayer(id))
        );
        return enrichPlayersWithImages(
          demos.filter((p) => p !== null)
        );
      }
      return enrichPlayersWithImages(followed);
    },
    enabled: !!actor && true,
    staleTime: 3e4
  });
}
function useIsFollowing(playerId) {
  const { actor } = useMockActor();
  return useQuery({
    queryKey: ["isFollowing", playerId.toString()],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isFollowing(playerId);
    },
    enabled: !!actor && true,
    staleTime: 3e4
  });
}
function useFollowPlayer() {
  const { actor } = useMockActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (playerId) => {
      if (!actor) throw new Error("Ingen tilkobling");
      return actor.followPlayer(playerId);
    },
    onSuccess: (_data, playerId) => {
      qc.invalidateQueries({ queryKey: ["followedPlayers"] });
      qc.invalidateQueries({ queryKey: ["isFollowing", playerId.toString()] });
      qc.invalidateQueries({ queryKey: ["feedEvents"] });
    }
  });
}
function useUnfollowPlayer() {
  const { actor } = useMockActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (playerId) => {
      if (!actor) throw new Error("Ingen tilkobling");
      return actor.unfollowPlayer(playerId);
    },
    onSuccess: (_data, playerId) => {
      qc.invalidateQueries({ queryKey: ["followedPlayers"] });
      qc.invalidateQueries({ queryKey: ["isFollowing", playerId.toString()] });
      qc.invalidateQueries({ queryKey: ["feedEvents"] });
    }
  });
}
export {
  PositionBadge as P,
  useUnfollowPlayer as a,
  POSITION_LABELS as b,
  useIsFollowing as c,
  useFollowPlayer as d,
  enrichPlayersWithImages as e,
  useFollowedPlayers as u
};
