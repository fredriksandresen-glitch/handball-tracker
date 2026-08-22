# Clawdbot AI chat contract

Handball Tracker calls a Clawdbot-owned HTTP endpoint. Clawdbot remains the
analysis layer, while the existing ICP backend canister remains the source of
truth for teams, players, matches, and statistics.

## Why the first version does not proxy through Motoko

The backend already exposes the public query methods Clawdbot needs. Adding an
HTTP outcall proxy to Motoko would add cycles, latency, upgrade risk, and secret
management without improving data ownership. The browser therefore calls a
public, rate-limited Clawdbot endpoint, and Clawdbot queries ICP server-side.

No long-lived API key may be placed in a `VITE_*` variable. Vite variables are
public browser configuration. If endpoint authentication is added later, use a
short-lived user-scoped token or a same-origin gateway. The `principal` in the
request is context only and must not be trusted as proof of identity.

## Frontend configuration

```dotenv
VITE_AI_CHAT_MODE=auto
VITE_CLAWDBOT_AI_URL=https://clawdbot.example.com/v1/handball/chat
VITE_AI_CHAT_REQUEST_TIMEOUT_MS=45000
VITE_ICP_NETWORK=ic
VITE_ICP_BACKEND_CANISTER_ID=lj6bx-dyaaa-aaaap-qumhq-cai
```

`auto` uses the endpoint when present and a safe mock response otherwise.
`live` requires the endpoint. `mock` always disables the network request.

The Clawdbot server must allow the deployed Vercel and ICP frontend origins in
its CORS policy. It should also enforce request-size limits and rate limiting.

## Request

`POST` the configured endpoint with `Content-Type: application/json`.

```json
{
  "version": 1,
  "question": "Hvor mange mål har Sarah Deari Solheim denne sesongen?",
  "conversation": [
    { "role": "user", "content": "Hvem er i best form?" },
    { "role": "assistant", "content": "..." }
  ],
  "context": {
    "locale": "nb-NO",
    "season": "2026-27",
    "league": "elite",
    "route": "/ai-chat",
    "principal": "optional-principal-text",
    "entities": [
      {
        "type": "player",
        "id": "2239826783348",
        "name": "Sarah Deari Solheim"
      }
    ]
  },
  "dataAccess": {
    "provider": "icp",
    "network": "ic",
    "backendCanisterId": "lj6bx-dyaaa-aaaap-qumhq-cai",
    "allowedQueries": [
      "getPlayers",
      "getPlayer",
      "getTeams",
      "getTeam",
      "getMatches",
      "getPlayerMatchStats",
      "getPlayerSeasonStats",
      "getAllPlayerSeasonStats"
    ]
  }
}
```

Conversation context is capped by the frontend. Entity hints come from the
generated search index. Clawdbot must still resolve and verify entities against
ICP before calculating an answer.

## Response

```json
{
  "id": "analysis-uuid",
  "answer": "Sarah Deari Solheim har scoret 114 mål denne sesongen.",
  "status": "answered",
  "generatedByAi": true,
  "evidence": [
    {
      "label": "Mål 2025/26",
      "value": "114",
      "playerId": "2239826783348"
    }
  ],
  "sources": [
    {
      "label": "Sesongstatistikk fra ICP",
      "method": "getPlayerSeasonStats",
      "entityIds": ["2239826783348"],
      "observedAt": "2026-08-22T12:00:00Z"
    }
  ],
  "missingData": [],
  "followUpQuestions": [
    "Vil du sammenligne henne med en annen bakspiller?"
  ]
}
```

Valid status values are `answered` and `insufficient-data`. When required data
is missing, Clawdbot must use `insufficient-data`, explain the limitation in
`answer`, and list the missing fields in `missingData`. The model must never
invent a statistic that was not returned by ICP.

## Server-side analysis rules

1. Resolve player and team names to ICP identifiers before analysis.
2. Fetch only the relevant public query data.
3. Calculate comparisons and rankings in deterministic code where possible.
4. Give the model a compact computed dataset, not the entire database.
5. Return every numeric claim in `evidence` with its source method.
6. Return `insufficient-data` for ambiguous names or incomplete statistics.
7. Treat the frontend Principal as an untrusted hint until a signed identity
   flow is implemented.
