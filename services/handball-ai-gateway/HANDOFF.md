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
- `PORT` (valgfritt, default 3000)

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

## Kjente regresjoner
- **Camilla Herrem-spørsmålet feiler**: "Hvor mange mål hadde Camilla Herrem i 2025/26?" gir insufficient-data selv om data finnes i ICP canisteren. Spilleren finnes ikke i JSON-stats fra asset-canisteren.
- **Linnea Aula-spørsmålet resolves feilaktig**: "hva var Linnea aulas beste kamp for fjellhammar i fjor?" resolves til Ada Aalstad i stedet for Linnea Isabel Ingeborg Aula.
- **Tidligere fungerende test A og B**: "Hvem spilte best mot Fjellhammer i fjor?" og "Hvem spiller spilte best mot fjellhammar i fjor?" fungerer korrekt med deterministisk analyse og modelCalled=false.

## Ingen secret-verdier
Denne handoff-pakken inneholder ingen API-nøkler, tokens eller passord. Alle secrets hentes fra miljøvariabler ved runtime.
