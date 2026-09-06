#!/usr/bin/env bash
# Backend-deploy (F11).
#
# Egen vei med vilje: scripts/deploy-icp-frontend.sh SKRIVER OVER dfx.json og
# canister_ids.json med frontend-only-versjoner ved hver kjoering. Derfor kan
# backend ikke ligge i de samme filene permanent - dette skriptet setter opp
# det den trenger selv, og roerer ikke frontend-oppsettet.
set -Eeuo pipefail

BACKEND_CANISTER_ID="lj6bx-dyaaa-aaaap-qumhq-cai"
NETWORK="${NETWORK:-ic}"
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

export DFX_WARNING=-mainnet_plaintext_identity
export PATH="$PATH:$HOME/.local/bin:$HOME/.local/share/dfx/bin"

echo "== 1/5 Bygger backend (mops)"
mops build

echo "== 2/5 Stabilitetssjekk mot forrige signatur"
# .old/src/backend/dist/backend.most er forrige deploys stabile signatur.
# moc stopper selv en upgrade som ville mistet data, men vi viser diffen.
if [[ -f .old/src/backend/dist/backend.most ]]; then
  if diff -q .old/src/backend/dist/backend.most src/backend/dist/backend.most >/dev/null; then
    echo "   Stabil signatur uendret."
  else
    echo "   Stabil signatur ENDRET. Nye/endrede felt:"
    diff .old/src/backend/dist/backend.most src/backend/dist/backend.most | head -30 || true
  fi
else
  echo "   Ingen referansesignatur - hopper over sammenligning."
fi

echo "== 3/5 Skriver midlertidig dfx.json for backend"
cp dfx.json /tmp/dfx.frontend.json.bak
cp canister_ids.json /tmp/canister_ids.frontend.json.bak

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
{
  "backend": {
    "ic": "$BACKEND_CANISTER_ID"
  }
}
EOF

restore() {
  cp /tmp/dfx.frontend.json.bak dfx.json
  cp /tmp/canister_ids.frontend.json.bak canister_ids.json
  echo "   Frontend-oppsett gjenopprettet."
}
trap restore EXIT

echo "== 4/5 Installerer (mode upgrade - beholder data)"
dfx canister install backend \
  --network "$NETWORK" \
  --mode upgrade \
  --wasm src/backend/dist/backend.wasm

echo "== 5/5 Verifiserer rolle-API mot live canister"
dfx canister --network "$NETWORK" call backend getMyRole '()' --query

echo ""
echo "BACKEND DEPLOY FULLFOERT"
echo "Canister: $BACKEND_CANISTER_ID"
echo "Commit:   $(git rev-parse HEAD)"
