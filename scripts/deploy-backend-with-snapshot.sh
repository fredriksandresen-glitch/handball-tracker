#!/usr/bin/env bash
# Trygg backend-upgrade med ekte rollback-punkt (F11).
#
# Bakgrunn: wasm-en i git (HEAD~1) matcher IKKE modulen som ligger live
# (01c8ba0f... vs 0a995cf8...). Backend ble altsaa deployet fra et bygg som
# aldri ble committet. Derfor er git INGEN gyldig rollback-kilde.
# Vi bruker canister-snapshot i stedet: det fanger baade wasm OG data.
set -Eeuo pipefail

BACKEND="lj6bx-dyaaa-aaaap-qumhq-cai"
export DFX_WARNING=-mainnet_plaintext_identity
export PATH="$PATH:$HOME/.local/bin:$HOME/.local/share/dfx/bin"
cd "$(git rev-parse --show-toplevel)"

echo "== 0/6 Utgangspunkt"
dfx canister --network ic status "$BACKEND" 2>&1 | grep -E "Status|Module hash"

echo "== 1/6 Stopper canister (kreves for snapshot)"
dfx canister --network ic stop "$BACKEND"

echo "== 2/6 Lager snapshot = rollback-punktet"
dfx canister --network ic snapshot create "$BACKEND"

echo "== 3/6 Bekrefter at snapshot finnes"
dfx canister --network ic snapshot list "$BACKEND"

echo "== 4/6 Setter opp midlertidig dfx.json for backend"
cp dfx.json /tmp/dfx.fe.bak
cp canister_ids.json /tmp/cid.fe.bak
restore() {
  cp /tmp/dfx.fe.bak dfx.json
  cp /tmp/cid.fe.bak canister_ids.json
  echo "   Frontend-oppsett gjenopprettet."
}
trap restore EXIT

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
{ "backend": { "ic": "$BACKEND" } }
EOF

echo "== 5/6 Upgrade (data beholdes; --yes fordi diffen er verifisert additiv)"
dfx canister install backend \
  --network ic \
  --mode upgrade \
  --wasm src/backend/dist/backend.wasm \
  --yes

echo "== 6/6 Starter canister og verifiserer"
dfx canister --network ic start "$BACKEND"
dfx canister --network ic status "$BACKEND" 2>&1 | grep -E "Status|Module hash"
echo "--- getMyRole mot live:"
dfx canister --network ic call backend getMyRole '()' --query
echo "--- AI-workerens metode svarer fortsatt?"
dfx canister --network ic metadata "$BACKEND" candid:service 2>/dev/null | grep -c "claimNextAiJob"

echo ""
echo "BACKEND UPGRADE FULLFOERT"
echo "Rollback: dfx canister --network ic stop $BACKEND && \\"
echo "          dfx canister --network ic snapshot load $BACKEND <snapshot-id> && \\"
echo "          dfx canister --network ic start $BACKEND"
