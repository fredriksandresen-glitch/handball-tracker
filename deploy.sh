#!/usr/bin/env bash
# Kanonisk deploy for handball-appen. Bruk ALLTID denne, aldri "dfx deploy" direkte.
#
#   ./deploy.sh
#
# Steg: git-sjekk -> bygg (stempler commit-SHA) -> feature guard -> deploy -> hash-verifiser
set -euo pipefail

cd "$(dirname "$0")"
export DFX_WARNING=-mainnet_plaintext_identity

echo "== 1/5 Git-status =="
git log --oneline -1
DIRTY=$(git status --porcelain | grep -v -e 'src/frontend/dist/' -e 'node_modules/' -e '^?? .dfx/' || true)
if [ -n "$DIRTY" ]; then
  echo "ADVARSEL: ukommitterte endringer i kildekode:"
  echo "$DIRTY"
  echo "Deploy fra ukommittert kode er nøyaktig feilen som mistet NM og formkurven."
  read -r -p "Fortsette likevel? (skriv JA) " CONFIRM
  [ "$CONFIRM" = "JA" ] || { echo "Avbrutt."; exit 1; }
fi

echo
echo "== 2/5 Bygger =="
cd src/frontend
pnpm run build:quick

echo
echo "== 3/5 Feature guard =="
node scripts/feature-guard.mjs

echo
echo "== 4/5 Deployer til IC =="
cd ../..
dfx deploy frontend --network ic

echo
echo "== 5/5 Verifiserer live =="
cd src/frontend
node scripts/verify-live.mjs

echo
echo "Deploy fullført og verifisert."
