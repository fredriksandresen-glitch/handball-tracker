export const FOLLOWED_PLAYERS_STORAGE_KEY =
  "handball-tracker-followed-player-ids";
export const AUTH_SESSION_HINT_KEY = "handball-tracker-authenticated";

const PENDING_MUTATIONS_KEY = "handball-tracker-pending-follow-mutations";
const MIGRATION_KEY_PREFIX = "handball-tracker-follow-migrated:";
export const FOLLOWED_PLAYERS_CHANGED_EVENT =
  "handball-tracker-followed-players-changed";
export const AUTH_SESSION_CHANGED_EVENT =
  "handball-tracker-auth-session-changed";

export type FollowMutation = "follow" | "unfollow";

function canUseLocalStorage() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(value.map(String).filter((id) => /^\d+$/.test(id))),
  );
}

export function readFollowedPlayerIds(): string[] {
  if (!canUseLocalStorage()) return [];

  try {
    return normalizeIds(
      JSON.parse(
        window.localStorage.getItem(FOLLOWED_PLAYERS_STORAGE_KEY) ?? "[]",
      ),
    );
  } catch {
    return [];
  }
}

export function writeFollowedPlayerIds(ids: string[], notify = true) {
  if (!canUseLocalStorage()) return;

  window.localStorage.setItem(
    FOLLOWED_PLAYERS_STORAGE_KEY,
    JSON.stringify(normalizeIds(ids)),
  );
  if (notify) {
    window.dispatchEvent(new Event(FOLLOWED_PLAYERS_CHANGED_EVENT));
  }
}

export function hasAuthenticatedSessionHint() {
  return (
    canUseLocalStorage() &&
    window.localStorage.getItem(AUTH_SESSION_HINT_KEY) === "true"
  );
}

export function setAuthenticatedSessionHint(isAuthenticated: boolean) {
  if (!canUseLocalStorage()) return;

  if (isAuthenticated) {
    window.localStorage.setItem(AUTH_SESSION_HINT_KEY, "true");
  } else {
    window.localStorage.removeItem(AUTH_SESSION_HINT_KEY);
  }
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}

function readPendingMutations(): Record<string, FollowMutation> {
  if (!canUseLocalStorage()) return {};

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(PENDING_MUTATIONS_KEY) ?? "{}",
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([id, action]) =>
          /^\d+$/.test(id) && (action === "follow" || action === "unfollow"),
      ),
    ) as Record<string, FollowMutation>;
  } catch {
    return {};
  }
}

function writePendingMutations(mutations: Record<string, FollowMutation>) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(PENDING_MUTATIONS_KEY, JSON.stringify(mutations));
}

function queueMutation(playerId: string, action: FollowMutation) {
  if (!hasAuthenticatedSessionHint()) return;
  writePendingMutations({ ...readPendingMutations(), [playerId]: action });
}

export function addFollowedPlayer(playerId: bigint) {
  const id = playerId.toString();
  writeFollowedPlayerIds([...readFollowedPlayerIds(), id]);
  queueMutation(id, "follow");
}

export function removeFollowedPlayer(playerId: bigint) {
  const id = playerId.toString();
  writeFollowedPlayerIds(
    readFollowedPlayerIds().filter((candidate) => candidate !== id),
  );
  queueMutation(id, "unfollow");
}

export function getPendingFollowMutations() {
  return readPendingMutations();
}

export function acknowledgeFollowMutations(
  completed: Record<string, FollowMutation>,
) {
  const current = readPendingMutations();
  for (const [id, action] of Object.entries(completed)) {
    if (current[id] === action) delete current[id];
  }
  writePendingMutations(current);
}

export function hasMigratedFollows(principal: string) {
  return (
    canUseLocalStorage() &&
    window.localStorage.getItem(`${MIGRATION_KEY_PREFIX}${principal}`) ===
      "true"
  );
}

export function markFollowsMigrated(principal: string) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(`${MIGRATION_KEY_PREFIX}${principal}`, "true");
}
