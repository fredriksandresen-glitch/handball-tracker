# Canonical player identities

`src/frontend/src/data/playerIdentityRegistry.json` is the permanent identity
registry for players. Canonical IDs are internal IDs and must never be derived
from a player name, club, season, URL slug, or external provider ID.

The registry is not connected to the live UI yet. It is the reviewed source for
the later migration of profile URLs, favorites, roster history, and statistics.

## Commands

Run from `src/frontend`:

```bash
pnpm sync:player-identities
pnpm check:player-identities
```

The sync command adds unseen roster IDs as new canonical players. It never
automatically merges players with matching names. The check command is
read-only and fails when roster files and generated identity files differ.

Potential duplicate people are listed in
`src/frontend/src/data/playerIdentityCandidates.json`. A shared numeric suffix
is only a review signal and must not be treated as proof that two records are
the same person.

## Review rules

- One external alias can belong to exactly one active canonical player.
- A canonical ID is permanent and must never be reused.
- Name equality alone is insufficient for a merge.
- Confirm a merge with an authoritative player page, federation identifier, or
  another combination of club history and player attributes.
- Keep ambiguous names as separate players until they can be verified.

When two canonical records are confirmed as one person, keep one active record,
move every external alias to it, remove the superseded active record, and add a
redirect from the superseded canonical ID to the retained ID. The sync command
validates that redirects point to active players and that aliases are unique.
