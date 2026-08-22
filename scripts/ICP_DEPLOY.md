# ICP deployment workflow

The existing canisters are always reused:

- Frontend: `hrzvs-liaaa-aaaap-qusna-cai`
- Backend: `lj6bx-dyaaa-aaaap-qumhq-cai`

Never create a canister from these scripts. Both scripts verify that their
existing canister is reachable before an install starts, and require an exact
approved commit hash.

## Routine frontend logic

Use the default quick build. It skips the slow network enrichment step, keeps
all original and responsive player images in the asset set, and relies on the
asset canister's content hashes so unchanged images are not uploaded.

```bash
EXPECTED_COMMIT=<full-commit-sha> \
EXPECTED_BRANCH=<branch> \
bash scripts/deploy-icp-frontend.sh
```

## Media or source-data refresh

Use the full build only after player images or remotely enriched match data
have intentionally changed.

```bash
BUILD_MODE=full \
EXPECTED_COMMIT=<full-commit-sha> \
EXPECTED_BRANCH=<branch> \
bash scripts/deploy-icp-frontend.sh
```

## Backend only

This compiles and upgrades only the existing backend canister. It never builds,
reads, or synchronizes frontend assets.

```bash
EXPECTED_COMMIT=<full-commit-sha> \
EXPECTED_BRANCH=<branch> \
bash scripts/deploy-icp-backend.sh
```

## Persistent deploy checkout

Keep one dedicated checkout on the deploy server. Fetch the approved commit
instead of deleting and cloning the full image history for every deployment:

```bash
DEPLOY_DIR=/tmp/handball-icp-deploy-cache
REPO=https://github.com/fredriksandresen-glitch/handball-tracker.git

if [[ ! -d "$DEPLOY_DIR/.git" ]]; then
  git clone "$REPO" "$DEPLOY_DIR"
fi

git -C "$DEPLOY_DIR" fetch origin <branch>
git -C "$DEPLOY_DIR" checkout --detach <full-commit-sha>
cd "$DEPLOY_DIR"
```

The detached checkout is deliberate: the deploy scripts verify the exact
commit, while the persistent Git objects, pnpm store, and installed dependencies
avoid repeated downloads.
