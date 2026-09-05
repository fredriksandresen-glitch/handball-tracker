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

AI-chatten går via den autentiserte backend-køen og krever ingen offentlig
gateway-URL. En URL er bare valgfri for den separate PDF-rapporttjenesten:

```bash
export VITE_AI_CHAT_MODE=auto
# export VITE_CLAWDBOT_AI_URL="https://your-report-host.example/v1/handball/chat"
export VITE_AI_CHAT_REQUEST_TIMEOUT_MS=45000
export VITE_ICP_NETWORK=ic
export VITE_ICP_BACKEND_CANISTER_ID=lj6bx-dyaaa-aaaap-qumhq-cai
```

Deploy-scriptet bekrefter at chattransporten er ICP-køen. En tom
`clawdbot_ai_url` påvirker ikke AI-chatten.

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
reads, or synchronizes frontend assets. The upgrade explicitly keeps Wasm main
memory, as required by Motoko enhanced orthogonal persistence.

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
