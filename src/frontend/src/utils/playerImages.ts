import playerCardImageManifest from "../data/playerCardImageManifest.json";
import playerImageManifest from "../data/playerImageManifest.json";
import type { Player } from "../types/handball";

const IMAGE_MANIFEST = playerImageManifest as Record<string, string>;
const CARD_IMAGE_MANIFEST = playerCardImageManifest as Record<
  string,
  { "400": string; "720": string }
>;
const BROKEN_REMOTE_IMAGE_URLS = new Set([
  "https://nthapi.webcore.no/wp-content/uploads/2026/05/Ingeborg-Rolseth-Holt-Gjerpen-Skien.png",
  "https://nthapi.webcore.no/wp-content/uploads/2026/05/Janne-Havelsrud-Eklo-Byasen-Elite.png",
  "https://nthapi.webcore.no/wp-content/uploads/2026/05/Ingvild-Bersas-Westersjo-Gjerpen-Skien.png",
  "https://nthapi.webcore.no/wp-content/uploads/2026/05/Martine-Karigstad-Andersen-Fana.png",
  "https://nthapi.webcore.no/wp-content/uploads/2026/05/Anniken-Obaidli-Storhamar-Handball-Elite.png",
]);

const ORIGINAL_URL_BY_LOCAL_PATH = Object.fromEntries(
  Object.entries(IMAGE_MANIFEST).map(([originalUrl, localPath]) => [
    localPath,
    originalUrl,
  ]),
) as Record<string, string>;

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

  if (BROKEN_REMOTE_IMAGE_URLS.has(url.split("?")[0])) {
    return undefined;
  }

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

function getOriginalImageUrl(url: string) {
  const resolved = resolveImageUrl(url);
  if (!resolved) return undefined;
  return ORIGINAL_URL_BY_LOCAL_PATH[resolved] ?? url;
}

/**
 * Returns a lightweight image for cards and search results.
 * Full-resolution local images remain available on the player profile.
 */
export function resolvePlayerCardImageUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url) return undefined;

  const originalUrl = getOriginalImageUrl(url);
  if (!originalUrl) return resolveImageUrl(url);

  if (
    originalUrl.startsWith(
      "https://nthapi.webcore.no/wp-content/uploads/",
    )
  ) {
    const cleanUrl = originalUrl.split("?")[0];
    if (/-(?:150x150|200x300)\.(?:png|jpe?g|webp)$/i.test(cleanUrl)) {
      return cleanUrl;
    }

    return cleanUrl.replace(
      /\.(png|jpe?g|webp)$/i,
      "-200x300.$1",
    );
  }

  if (originalUrl.startsWith("https://lhk.baksystem.no/assets/")) {
    const separator = originalUrl.includes("?") ? "&" : "?";
    return `${originalUrl}${separator}width=240&height=360&quality=82&fit=cover`;
  }

  return resolveImageUrl(url);
}

/**
 * Returns responsive, high-quality card images while keeping the original
 * resolution available for player profiles and the image lightbox.
 */
export function resolvePlayerCardImageSources(
  url: string | null | undefined,
): { src: string; srcSet?: string } | undefined {
  const resolved = resolveImageUrl(url);
  if (!resolved) return undefined;

  const localSources = CARD_IMAGE_MANIFEST[resolved];
  if (localSources) {
    return {
      src: localSources["400"],
      srcSet: `${localSources["400"]} 400w, ${localSources["720"]} 720w`,
    };
  }

  const cardUrl = resolvePlayerCardImageUrl(url);
  return cardUrl ? { src: cardUrl } : undefined;
}
