import type { Player } from "../types/handball";

// Known player image mappings — keyed by player ID (primary) and name variants (fallback).
const ID_OVERRIDES: Record<string, string> = {
  "23": "/assets/generated/camilla-herrem.dim_600x800.jpg",
  "241": "/assets/sara-solheim.jpg",
};

const NAME_OVERRIDES: Array<{ matchNames: string[]; imageUrl: string }> = [
  {
    matchNames: ["ida alstad"],
    imageUrl: "/assets/ida-alstad.jpg",
  },
  {
    matchNames: ["sarah deari solheim", "sara solheim", "sarah solheim"],
    imageUrl: "/assets/sara-solheim.jpg",
  },
  {
    matchNames: ["camilla herrem"],
    imageUrl: "/assets/generated/camilla-herrem.dim_600x800.jpg",
  },
];

/** Returns the player with imageUrl set if a known override exists.
 *  Priority: player.imageUrl already set → ID override → name override.
 */
export function enrichPlayerWithImage(player: Player): Player {
  if (player.imageUrl) return player;

  // Check by ID first (most reliable)
  const idOverride = ID_OVERRIDES[player.id.toString()];
  if (idOverride) return { ...player, imageUrl: idOverride };

  // Fallback: check by normalized name
  const nameLower = player.name.toLowerCase().trim();
  for (const entry of NAME_OVERRIDES) {
    if (entry.matchNames.some((n) => nameLower === n)) {
      return { ...player, imageUrl: entry.imageUrl };
    }
  }

  return player;
}

/** Enrich an array of players with image overrides. */
export function enrichPlayersWithImages(players: Player[]): Player[] {
  return players.map(enrichPlayerWithImage);
}
