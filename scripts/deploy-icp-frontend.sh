#!/usr/bin/env bash
set -Eeuo pipefail

FRONTEND_CANISTER_ID="hrzvs-liaaa-aaaap-qusna-cai"
EXPECTED_BRANCH="${EXPECTED_BRANCH:-codex/search-responsiveness}"
EXPECTED_COMMIT="${EXPECTED_COMMIT:-}"
NETWORK="${NETWORK:-ic}"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
LOG_FILE="${TMPDIR:-/tmp}/handball-icp-frontend-deploy.log"
HEARTBEAT_PID=""

exec 3>&1
exec > >(tee -a "$LOG_FILE") 2>&1

stop_heartbeat() {
  if [[ -n "$HEARTBEAT_PID" ]]; then
    kill "$HEARTBEAT_PID" 2>/dev/null || true
    wait "$HEARTBEAT_PID" 2>/dev/null || true
    HEARTBEAT_PID=""
  fi
}

start_heartbeat() {
  local label="$1"
  stop_heartbeat
  (
    while sleep 120; do
      printf 'STATUS: %s pågår fortsatt (%s)\n' "$label" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    done
  ) &
  HEARTBEAT_PID=$!
}

on_error() {
  local exit_code="$1"
  local line_number="$2"
  stop_heartbeat
  printf '\nDEPLOY FEILET på linje %s med exit-kode %s.\n' "$line_number" "$exit_code" >&3
  printf '%s\n' 'Siste 100 logglinjer:' >&3
  tail -n 100 "$LOG_FILE" >&3 || true
  exit "$exit_code"
}

trap 'on_error "$?" "$LINENO"' ERR
trap stop_heartbeat EXIT

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Mangler kommando: $1"
    return 1
  }
}

require_command git
require_command pnpm
require_command dfx
require_command curl

[[ -n "$REPO_ROOT" ]] || {
  echo "Kjør skriptet inne i GitHub-repoet."
  exit 1
}
cd "$REPO_ROOT"

ACTUAL_COMMIT="$(git rev-parse HEAD)"
ACTUAL_BRANCH="$(git branch --show-current)"

if [[ -z "$EXPECTED_COMMIT" ]]; then
  echo "EXPECTED_COMMIT må settes til den godkjente, komplette commit-hashen."
  exit 1
fi

[[ "$ACTUAL_COMMIT" == "$EXPECTED_COMMIT" ]] || {
  echo "Feil commit."
  echo "Forventet: $EXPECTED_COMMIT"
  echo "Faktisk:   $ACTUAL_COMMIT"
  exit 1
}

if [[ -n "$ACTUAL_BRANCH" && "$ACTUAL_BRANCH" != "$EXPECTED_BRANCH" ]]; then
  echo "Feil branch. Forventet $EXPECTED_BRANCH, faktisk $ACTUAL_BRANCH."
  exit 1
fi

git diff --quiet
git diff --cached --quiet

echo "Deploy-kilde:"
git log -1 --oneline
echo "dfx: $(dfx --version)"
echo "pnpm: $(pnpm --version)"

cat > dfx.json <<'EOF'
{
  "canisters": {
    "frontend": {
      "type": "assets",
      "source": ["src/frontend/dist"]
    }
  },
  "defaults": {
    "build": {
      "packtool": ""
    }
  },
  "version": 1
}
EOF

cat > canister_ids.json <<EOF
{
  "frontend": {
    "ic": "$FRONTEND_CANISTER_ID"
  }
}
EOF

echo "Kontrollerer at eksisterende frontend-canister er tilgjengelig:"
dfx canister status frontend --network "$NETWORK"

pushd src/frontend >/dev/null
start_heartbeat "pnpm install"
pnpm install
stop_heartbeat

start_heartbeat "frontend-build"
pnpm run build
stop_heartbeat
popd >/dev/null

test -f src/frontend/dist/index.html
test -f src/frontend/dist/.ic-assets.json5
test -f src/frontend/dist/robots.txt

grep -q 'initial-app-shell' src/frontend/dist/index.html

INDEX_ASSET_PATH="$(find src/frontend/dist/assets -maxdepth 1 -type f -name 'index-*.js' | head -n 1)"
[[ -n "$INDEX_ASSET_PATH" ]]
INDEX_ASSET="$(basename "$INDEX_ASSET_PATH")"

echo "Build klar:"
du -sh src/frontend/dist
echo "Hovedfil: $INDEX_ASSET"

start_heartbeat "dfx asset-installering"
dfx build frontend --network "$NETWORK"
dfx canister install frontend \
  --network "$NETWORK" \
  --mode upgrade \
  --no-asset-upgrade
stop_heartbeat

LIVE_URL="https://$FRONTEND_CANISTER_ID.icp0.io"

echo "Verifiserer publisert frontend:"
curl -fsS "$LIVE_URL/" | grep -q 'initial-app-shell'
curl -fsS "$LIVE_URL/robots.txt" | grep -q 'User-agent: \*'

ASSET_HEADERS="$(curl -fsSI "$LIVE_URL/assets/$INDEX_ASSET")"
printf '%s\n' "$ASSET_HEADERS"
printf '%s\n' "$ASSET_HEADERS" | grep -qi 'cache-control: public, max-age=31536000, immutable'

echo "DEPLOY FULLFØRT"
echo "Commit: $ACTUAL_COMMIT"
echo "Frontend: $LIVE_URL/"
echo "Publisert hovedfil: $INDEX_ASSET"
echo "Kun frontend-canisteren ble behandlet."
