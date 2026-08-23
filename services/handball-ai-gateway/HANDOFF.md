# Handball AI Gateway — Handoff

## Node-versjon
```
v22.22.0
```

## Startkommando
```bash
AI_WORKER_ENABLED=true node index.js
```

Tjenesten lytter bare på `127.0.0.1`. AI-chatten bruker en outbound worker mot
ICP-backenden og trenger ikke Cloudflare Tunnel, CORS eller et offentlig
Clawdbot-endepunkt.

## Port
```
3000
```

## Nødvendige miljøvariabelnavn
- `MOONSHOT_API_KEY` (obligatorisk)
- `MOONSHOT_MODEL` (valgfritt, default `kimi-k3`)
- `PORT` (valgfritt, default 3000)
- `ICP_ASSET_BASE_URL` (valgfritt)
- `ICP_BACKEND_CANISTER_ID` (valgfritt)
- `ICP_HOST` (valgfritt)
- `ALLOWED_ORIGINS` (valgfri, kommaseparert liste)
- `ARCHIVE_STANDINGS_FILE` (valgfri sti til `leagueStandingsArchive.json`)
- `AI_WORKER_ENABLED` (sett til `true` for ICP-køen)
- `AI_WORKER_IDENTITY_PATH` (obligatorisk når worker er aktiv)
- `AI_WORKER_POLL_INTERVAL_MS` (valgfritt, default 5000)
- `AI_LOCAL_CHAT_URL` (valgfritt, default lokal port 3000)

## Oppsett av worker-identitet

```bash
npm run worker:identity
export AI_WORKER_IDENTITY_PATH="$PWD/secrets/ai-worker-identity.json"
export AI_WORKER_ENABLED=true
npm start
```

Kommandoen skriver ut workerens Principal. En controller for backend-canisteren
må registrere denne én gang:

```bash
dfx canister call backend configureAiWorker '(principal "<WORKER_PRINCIPAL>")' --network ic
```

Nøkkelfilen under `secrets/` skal aldri committes. Ta en privat backup; en ny
identitet må registreres på nytt i canisteren.

## Lokale endpoint-paths
```
POST /v1/handball/chat
POST /v1/handball/comparisons
POST /v1/handball/reports/player-comparison.pdf
GET  /health
```

Chat-endepunktet kalles av worker-en på samme Linux-server. Nettleseren sender
spørsmålet til Motoko-backenden med den innloggede brukerens Principal.

## ICP canister-IDer
| Type | Canister ID |
|------|-------------|
| Frontend | `hrzvs-liaaa-aaaap-qusna-cai` |
| Backend | `lj6bx-dyaaa-aaaap-qumhq-cai` |

## SHA-256 for versjonskontrollert index.js
```
0c8ca726fb5b73755f73487785923f4ddc275131adb351ad115007794bb42c58
```

## Regresjonstester

Kjør før utrulling:

```bash
npm test
npm run check
```

Testene dekker:

- begge stavemåtene av Fjellhammer-spørsmålet
- Camilla Herrems sesongstatistikk fra appens publiserte datasett
- Linnea Aula med kortnavn, genitiv, tidligere klubb og overgang til Aker
- rollejustert spillersammenligning og gyldig PDF-generering

PDF-rapporten bruker `pdfkit`, som installeres av vanlig `npm ci`. Rapporten
beregnes deterministisk fra kampdata og kaller ikke Moonshot. PDF-nedlasting er
fortsatt en separat, valgfri HTTP-funksjon; AI-chatten er ikke avhengig av den.

Den publiserte asset-statistikken er autoritativ for svar som skal samsvare med
appen. Den eldre Motoko-seeden kan inneholde andre summer.

Historisk 1. divisjon 2025/26 ligger i
`player-stats/firstDivision2526FullPlayerStats.json`. Filen inneholder 14 lag,
316 spilleroppføringer og kamp-for-kamp-data. Den kompakte
`firstDivision2526PlayerStats.json` brukes fortsatt av frontend, slik at
fullhistorikken ikke pakkes inn i appens hoved-JavaScript-fil.

Kjør `pnpm sync:first-division-2526` i `src/frontend` bare når den historiske
kilden skal oppdateres. En vanlig quick-build kopierer den versjonskontrollerte
fullfilen til `dist` uten å hente data på nytt.

Kopier `src/frontend/src/data/leagueStandingsArchive.json` til
`services/handball-ai-gateway/data/leagueStandingsArchive.json` i den kjørende
gateway-mappen. Gatewayen bruker denne samme tabellfilen som frontend ved
sammenligninger mellom spillerform og historisk lagplassering.

## Ingen secret-verdier
Denne handoff-pakken inneholder ingen API-nøkler, tokens eller passord. Alle secrets hentes fra miljøvariabler ved runtime.
