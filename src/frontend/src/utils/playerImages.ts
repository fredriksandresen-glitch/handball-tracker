import type { Player } from "../types/handball";
import playerImageManifest from "../data/playerImageManifest.json";

const IMAGE_MANIFEST = playerImageManifest as Record<string, string>;

// Known player image mappings — keyed by player ID (primary) and name variants (fallback).
const ID_OVERRIDES: Record<string, string> = {
  "14": "/assets/ida-alstad.jpg",
  "68": "/assets/sara-solheim.jpg",
  "3": "/assets/generated/camilla-herrem.dim_600x800.jpg",
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

/** Resolve an image URL through the local manifest.
 *  - If the URL is in the manifest, return the local path.
 *  - If already a local path (/assets/...) or data-URI, return as-is.
 *  - Otherwise return the original external URL.
 */
export function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;

  // Already local or data-URI — keep as-is
  if (url.startsWith("/") || url.startsWith("data:")) {
    return url;
  }

  // Check manifest for a local copy
  const localPath = IMAGE_MANIFEST[url];
  if (localPath) {
    return localPath;
  }

  // Fallback to original external URL
  return url;
}

/** Returns the player with imageUrl resolved through the manifest.
 *  Priority:
 *    1. Manifest lookup for existing imageUrl (external → local)
 *    2. If no imageUrl, try ID override
 *    3. If no ID override, try name override
 *    4. Keep original (undefined) if nothing matches
 */
export function enrichPlayerWithImage(player: Player): Player {
  // If player already has an imageUrl, remap via manifest if possible
  if (player.imageUrl) {
    const resolved = resolveImageUrl(player.imageUrl);
    if (resolved !== player.imageUrl) {
      return { ...player, imageUrl: resolved };
    }
    return player;
  }

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
