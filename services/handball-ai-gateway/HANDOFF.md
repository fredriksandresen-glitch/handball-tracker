# Handball AI Gateway — Handoff

## Node-versjon
```
v22.22.0
```

## Startkommando
```bash
node index.js
```

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

## Offentlig endpoint-path
```
POST /v1/handball/chat
GET  /health
```

## ICP canister-IDer
| Type | Canister ID |
|------|-------------|
| Frontend | `hrzvs-liaaa-aaaap-qusna-cai` |
| Backend | `lj6bx-dyaaa-aaaap-qumhq-cai` |

## SHA-256 for kjørende index.js
```
355acf22cf0b26c8bb3120498f44a361b8430ac3fbd74ef7c2448807caa84671
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

Den publiserte asset-statistikken er autoritativ for svar som skal samsvare med
appen. Den eldre Motoko-seeden kan inneholde andre summer.

## Ingen secret-verdier
Denne handoff-pakken inneholder ingen API-nøkler, tokens eller passord. Alle secrets hentes fra miljøvariabler ved runtime.
