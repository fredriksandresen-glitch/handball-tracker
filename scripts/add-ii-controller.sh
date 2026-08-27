#!/usr/bin/env bash
# add-ii-controller.sh — legg til et Internet Identity-principal som controller
# på ICP-canisterne, uten å fjerne noen eksisterende controller.
#
# Bruk:
#   ./scripts/add-ii-controller.sh <ii-principal>            # legger til + verifiserer
#   ./scripts/add-ii-controller.sh --check                   # viser kun dagens controllere
#
# Sikkerhetsregler bakt inn:
#   - Fjerner ALDRI en eksisterende controller (bruker --add-controller).
#   - Avbryter hvis principalet ser ugyldig ut.
#   - Skriver ut controller-lista før og etter, så endringen er beviselig.
set -euo pipefail

export DFX_WARNING=-mainnet_plaintext_identity

CANISTERS=(
  "handball:hrzvs-liaaa-aaaap-qusna-cai"
  "finance:tymvd-6aaaa-aaaam-qjbza-cai"
  "bordtennis-backend:lbuvj-bqaaa-aaaah-qu2oq-cai"
  "bordtennis-frontend:lix6v-xyaaa-aaaah-qu2pa-cai"
)

show() {
  echo "=== Controllere nå (mainnet) ==="
  for entry in "${CANISTERS[@]}"; do
    name="${entry%%:*}"; id="${entry##*:}"
    printf '%-22s %s\n' "$name" "$id"
    dfx canister --network ic info "$id" 2>&1 | sed 's/^/    /'
  done
}

if [[ ${1:-} == "--check" || $# -eq 0 ]]; then
  show
  echo
  echo "Ingen endring utført. Kjør med et II-principal for å legge det til."
  exit 0
fi

PRINCIPAL="$1"

# Grov formatsjekk: ICP-principal er grupper à 5 tegn separert med bindestrek, slutter på -cai/-rae/-aqe osv.
if ! [[ "$PRINCIPAL" =~ ^([a-z0-9]{5}-)+[a-z0-9]{3}$ ]]; then
  echo "AVBRYTER: '$PRINCIPAL' ser ikke ut som et gyldig ICP-principal." >&2
  echo "Forventet format: xxxxx-xxxxx-xxxxx-...-xxx" >&2
  exit 1
fi

echo "### FØR ###"
show
echo
echo "Legger til controller: $PRINCIPAL"
echo

for entry in "${CANISTERS[@]}"; do
  name="${entry%%:*}"; id="${entry##*:}"
  if dfx canister --network ic info "$id" 2>/dev/null | grep -q "$PRINCIPAL"; then
    echo "  [hopper over] $name — allerede controller"
    continue
  fi
  echo "  [legger til]  $name ($id)"
  dfx canister --network ic update-settings "$id" --add-controller "$PRINCIPAL"
done

echo
echo "### ETTER ###"
show
echo
echo "FERDIG. Verifiser at $PRINCIPAL står oppført på alle canistere over,"
echo "og at de gamle controllerne fortsatt står der. Ikke fjern noe før du"
echo "har logget inn på NNS og bekreftet at du faktisk kan styre canisterne derfra."
