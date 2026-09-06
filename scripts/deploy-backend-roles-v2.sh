#!/usr/bin/env bash
# Backend-upgrade F11, forsoek 2.
#
# Forrige forsoek feilet med IC0504: enhanced orthogonal persistence krever
# at man eksplisitt sier hva som skal skje med wasm-minnet ved upgrade.
# --wasm-memory-persistence keep = BEHOLD alle data.
#
# Canisteren skal ALDRI bli staaende stoppet. Forrige kjoering gjorde det,
# fordi 'set -e' avbroet foer start-steget. Derfor starter trap-en den naa
# uansett hvordan skriptet avsluttes.
set -Eeuo pipefail

B="lj6bx-dyaaa-aaaap-qumhq-cai"
export DFX_WARNING=-mainnet_plaintext_identity
export PATH="$PATH:$HOME/.local/bin:$HOME/.local/share/dfx/bin"
cd "$(git rev-parse --show-toplevel)"

cp dfx.json /tmp/dfx.fe.bak
cp canister_ids.json /tmp/cid.fe.bak

cleanup() {
  echo "== opprydding: starter canister og gjenoppretter frontend-oppsett"
  dfx canister --network ic start "$B" 2>&1 | tail -1 || true
  cp /tmp/dfx.fe.bak dfx.json
  cp /tmp/cid.fe.bak canister_ids.json
  dfx canister --network ic status "$B" 2>&1 | grep -E "^Status" || true
}
trap cleanup EXIT

echo "== 1/5 Rollback-punkt finnes fra foer?"
dfx canister --network ic snapshot list "$B"

cat > dfx.json <<EOF
{
  "canisters": {
    "backend": {
      "type": "custom",
      "build": [],
      "wasm": "src/backend/dist/backend.wasm",
      "candid": "src/backend/dist/backend.did"
    }
  },
  "defaults": { "build": { "packtool": "" } },
  "version": 1
}
EOF
cat > canister_ids.json <<EOF
{ "backend": { "ic": "$B" } }
EOF

echo "== 2/5 Upgrade med wasm-memory-persistence=keep"
dfx canister install backend \
  --network ic \
  --mode upgrade \
  --wasm-memory-persistence keep \
  --wasm src/backend/dist/backend.wasm \
  --yes

echo "== 3/5 Ny module hash"
dfx canister --network ic status "$B" 2>&1 | grep -E "Module hash"

echo "== 4/5 Rollekallet svarer?"
dfx canister --network ic call backend getMyRole '()' --query

echo "== 5/5 AI-workerens metode intakt?"
dfx canister --network ic metadata "$B" candid:service 2>/dev/null | grep -c "claimNextAiJob"

echo "BACKEND UPGRADE OK"
