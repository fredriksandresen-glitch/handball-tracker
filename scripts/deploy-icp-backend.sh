#!/usr/bin/env bash
set -Eeuo pipefail

BACKEND_CANISTER_ID="lj6bx-dyaaa-aaaap-qumhq-cai"
EXPECTED_BRANCH="${EXPECTED_BRANCH:-}"
EXPECTED_COMMIT="${EXPECTED_COMMIT:-}"
NETWORK="${NETWORK:-ic}"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
LOG_FILE="${TMPDIR:-/tmp}/handball-icp-backend-deploy.log"
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
require_command mops
require_command dfx

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

if [[ -n "$EXPECTED_BRANCH" && -n "$ACTUAL_BRANCH" && "$ACTUAL_BRANCH" != "$EXPECTED_BRANCH" ]]; then
  echo "Feil branch. Forventet $EXPECTED_BRANCH, faktisk $ACTUAL_BRANCH."
  exit 1
fi

git diff --quiet
git diff --cached --quiet

echo "Deploy-kilde:"
git log -1 --oneline
echo "dfx: $(dfx --version)"
echo "mops: $(mops --version | head -n 1)"

cat > dfx.json <<'EOF'
{
  "canisters": {
    "backend": {
      "type": "custom",
      "build": [],
      "candid": "src/backend/dist/backend.did",
      "wasm": "src/backend/dist/backend.wasm"
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
  "backend": {
    "ic": "$BACKEND_CANISTER_ID"
  }
}
EOF

echo "Kontrollerer at eksisterende backend-canister er tilgjengelig:"
dfx canister status backend --network "$NETWORK"

start_heartbeat "backend-build"
mops build
stop_heartbeat

test -s src/backend/dist/backend.did
test -s src/backend/dist/backend.wasm

echo "Backend-build klar:"
ls -lh src/backend/dist/backend.did src/backend/dist/backend.wasm

start_heartbeat "backend-oppgradering"
dfx build backend --network "$NETWORK"
dfx canister install backend \
  --network "$NETWORK" \
  --mode upgrade \
  --wasm-memory-persistence keep
stop_heartbeat

echo "Verifiserer backend-canisteren:"
dfx canister status backend --network "$NETWORK"

# Keep the dedicated deploy checkout clean for a following frontend deploy.
git restore --worktree -- src/backend/dist

echo "DEPLOY FULLFØRT"
echo "Commit: $ACTUAL_COMMIT"
echo "Backend: $BACKEND_CANISTER_ID"
echo "Kun backend-canisteren ble behandlet. Ingen frontend-assets eller bilder ble lest eller lastet opp."
