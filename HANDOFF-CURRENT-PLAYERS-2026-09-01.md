# Current season player sync handoff

## Scope

- Branch: `codex/current-player-assignments`
- Base commit: `bbb66f5`
- Goal: add current 2026-27 players missing from the app and assign each player to the official club.
- Source: structured Topphandball tournament and roster responses from `admin.topphandball.no`.

## Result

- 66 of 66 missing player IDs are assigned to an official current team.
- 52 of 66 have an official high-resolution player image stored locally.
- 14 players have no official player image and intentionally use the app avatar fallback.
- The generated search index contains 515 player profiles.
- 344 image URLs resolve to local original and full WebP files.

## Identity transitions

The identity registry merges these verified old/new season IDs:

- Janne Charlotte Thoresen Nordnes: Byasen to Gjerpen.
- Freja Emilie Vinther Christensen: Byasen to Gjerpen.
- Froydis Seierstad Eriksen: Larvik to Sola.

The two pre-existing inconclusive candidate groups for Kine Hauge Kvalsund and Line Strand-Larsen remain unchanged.

## Main files

- `src/frontend/scripts/sync-current-season-rosters.mjs`
- `src/frontend/src/data/currentSeasonRosterAdditions2627.json`
- `src/frontend/scripts/generate-search-player-index.mjs`
- `src/frontend/scripts/sync-player-identities.mjs`
- `src/frontend/scripts/sync-player-images.mjs`
- `src/frontend/src/services/clawdbotPlayerProfile.ts`
- `src/frontend/src/utils/playerImages.ts`

## Verification

- `pnpm run build:quick` completed successfully.
- Search index generation reported 515 profiles.
- Player identity validation passed.
- Full player WebP generation completed without reducing configured quality.
- Extra 400/720 card generation was intentionally skipped for this update. Existing card variants remain in use; new players fall back to their local full WebP image.

## Reproduce

From `src/frontend`:

```sh
pnpm sync:current-rosters
pnpm sync:player-images
pnpm run build:quick
```

No ICP deployment was performed as part of this work.
