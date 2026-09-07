#!/bin/bash
# auto-update-standings.sh (handball-icp)
#
# Henter ferske kampresultater fra topphandball og deployer bare hvis noe
# faktisk har endret seg. Kjores av cron kl 06 og 22.
#
# BAKGRUNN 2026-09-07: forrige versjon laa i apps/handball-build, en checkout
# paa branchen codex/claude-handoff-2026-09-01. Den bygget og deployet fra
# gammel kode og overskrev nyere arbeid i produksjon kl 06:04. Derfor:
#  - dette skriptet kjorer fra handball-icp (samme repo vi utvikler i)
#  - det NEKTER aa deploye hvis vi staar paa feil branch
#  - det bruker deploy-icp-frontend.sh, som kjorer feature-guard foer install
#    (den gamle kjorte 'dfx deploy' direkte og hoppet over vernet)
set -uo pipefail

REPO=/home/clawduser/apps/handball-icp
FE="$REPO/src/frontend"
LOG="$REPO/standings-sync.log"
EXPECTED_BRANCH="fix/first-division-clickable-rows-and-image-history"

export DFX_WARNING=-mainnet_plaintext_identity
export PATH="/home/clawduser/.local/share/pnpm:/home/clawduser/.local/share/dfx/bin:/home/clawduser/.npm-global/bin:/usr/local/bin:/usr/bin:/bin"

say() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" >> "$LOG"; }

cd "$REPO" || { say "FEIL: fant ikke $REPO"; exit 1; }

# Vern 1: riktig branch. Uten denne kan cron deploye hva som helst.
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "$EXPECTED_BRANCH" ]; then
  say "STOPP: staar paa '$BRANCH', forventet '$EXPECTED_BRANCH'. Deployer ikke."
  exit 1
fi

# Vern 2: rent tre foer vi begynner. Ellers committer vi noen andres arbeid.
#
# MERK: build:quick regenererer public/data/search-player-index.json og dist/.
# De maa utelates her, ellers blokkerer forrige kjoering den neste for alltid.
# Alt annet skal vaere rent - da vet vi at vi bygger paa committert kode.
GENERATED='src/frontend/dist|src/frontend/public/data/search-player-index.json'
if [ -n "$(git status --porcelain | grep -vE "$GENERATED")" ]; then
  say "STOPP: ucommitterte endringer utenfor genererte filer. Deployer ikke."
  git status --porcelain | grep -vE "$GENERATED" >> "$LOG"
  exit 1
fi

cd "$FE" || { say "FEIL: fant ikke $FE"; exit 1; }

before=$(cat src/data/leagueStandingsCurrentElite.json src/data/leagueStandingsCurrentFirstDivision.json 2>/dev/null | sha256sum | cut -d' ' -f1)

if ! node scripts/sync-league-standings.mjs >> "$LOG" 2>&1; then
  say "FEIL: tabellsynk feilet - beholder forrige tabell"
  exit 1
fi

after=$(cat src/data/leagueStandingsCurrentElite.json src/data/leagueStandingsCurrentFirstDivision.json 2>/dev/null | sha256sum | cut -d' ' -f1)

if [ "$before" = "$after" ]; then
  say "Ingen nye resultater - hopper over build/deploy"
  exit 0
fi

say "Nye resultater funnet - committer tabell"
cd "$REPO" || exit 1
git add src/frontend/src/data/leagueStandingsCurrentElite.json \
        src/frontend/src/data/leagueStandingsCurrentFirstDivision.json
git commit -q -m "data(tabell): automatisk synk fra topphandball" >> "$LOG" 2>&1

# Bygg gjennom deploy-skriptet, som kjorer verify-data + feature-guard.
# Bygget skriver dist/, saa den committes etterpaa og deployen kjores paa nytt.
say "Bygger og deployer"
cd "$FE" || exit 1
if ! pnpm run build:quick >> "$LOG" 2>&1; then
  say "FEIL: build feilet - deployer ikke"
  exit 1
fi

# Bevar runtime-config i dist (build:quick nullstiller den)
node -e '
const fs=require("fs");
const p="dist/env.json";
const c=JSON.parse(fs.readFileSync(p,"utf8"));
c.backend_canister_id="lj6bx-dyaaa-aaaap-qumhq-cai";
c.ii_derivation_origin="https://hrzvs-liaaa-aaaap-qusna-cai.icp0.io";
c.ai_chat_request_timeout_ms="150000";
fs.writeFileSync(p,JSON.stringify(c,null,2)+"\n");
' >> "$LOG" 2>&1

# Vern 3: feature-guard. Stopper deploy hvis en beskrevet funksjon mangler.
if ! node scripts/feature-guard.mjs >> "$LOG" 2>&1; then
  say "STOPP: feature-guard feilet - en funksjon mangler i bygget. Deployer ikke."
  exit 1
fi

cd "$REPO" || exit 1
git add src/frontend/dist src/frontend/public/data/search-player-index.json
git commit -q -m "build(dist): automatisk bygg etter tabellsynk" >> "$LOG" 2>&1

if dfx deploy frontend --network ic --identity default >> "$LOG" 2>&1; then
  say "OK: tabell oppdatert og deployet (commit $(git rev-parse --short HEAD))"
else
  say "FEIL: deploy feilet"
  exit 1
fi
