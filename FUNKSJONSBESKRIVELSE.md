# FUNKSJONSBESKRIVELSE — Handball Tracker

**Status:** Førende dokument. Vedtatt 2026-09-06.
**Canister (frontend):** `hrzvs-liaaa-aaaap-qusna-cai`
**Backend:** `lj6bx-dyaaa-aaaap-qumhq-cai`

---

## 0. Hvordan dette dokumentet brukes

Dette er kontrakten for hva appen SKAL kunne. Arbeidsflyten er:

1. Fredrik foreslår en endring.
2. Claude oppdaterer dette dokumentet FØRST — ikke koden.
3. Fredrik leser og sier go / ikke go.
4. Først da bygges og deployes det.

**Grunnregel: en funksjon som står her kan ikke forsvinne.**
Hvis et bygg mangler noe som står beskrevet her, er bygget feil — ikke
dokumentet. Deploy skal stoppes, ikke dokumentet justeres.

Endring av dette dokumentet krever eksplisitt go fra Fredrik. Claude skal
aldri fjerne en funksjon herfra på eget initiativ, heller ikke når den er
i veien for noe annet.

### Kobling til automatisk vern
Hver funksjon under har en ID som skal finnes i
`src/frontend/feature-registry.json`. `scripts/feature-guard.mjs` kjører før
deploy og sammenligner registeret mot den faktiske `dist/`-mappa. Mangler en
markør, stopper deployen med exit 1.

Registeret er maskinens versjon av dette dokumentet. De to skal alltid være
i synk. Legges en funksjon til her, skal den også inn i registeret.

---

## 1. Formål

Appen viser statistikk for norsk kvinnehåndball — Elkjøp-ligaen (tidligere
REMA 1000-ligaen) og 1. divisjon. Målgruppen er supportere som følger
spillere og lag, og trenere som trenger et arbeidsverktøy.

All UI-tekst er på norsk.

---

## 2. Roller

| Rolle | Tilgang |
|---|---|
| supporter | Alt offentlig innhold. Standard for alle. |
| trener | Alt supporteren ser, pluss Trener-fanen. |

Rollen bestemmes av hvilket Internet Identity-principal som er logget inn.
Ingen brukerdatabase, ingen passord. Registeret ligger i
`src/frontend/src/data/roles.ts`.

**Viktig om principals:** Internet Identity gir ULIKT principal per origin.
Et principal registrert via `icp0.io` virker ikke via `raw.icp0.io` eller et
eventuelt eget domene. `.well-known/ii-alternative-origins` lister hvilke
origins som deler identitet. Nye trenere må hente principalet sitt fra
kontomenyen i appen, på den URL-en de faktisk bruker.

---

## 3. Funksjoner

### F1 · Formkurve på spillerside
**ID:** `form-curve` · **Bundle:** PlayerPage
Viser utvikling over tid for en spiller, med retningsindikator (stigende,
synkende, stabil).
**Markører:** `formArea`, `Formkurve`, `Stigende`
**Historikk:** Gikk tapt 2026-08-25 ved bygg fra gammel branch `4a7081f`.

### F2 · Klubbopphold og utlån
**ID:** `club-spells` · **Bundle:** PlayerPage
Viser spillerens klubbhistorikk, inkludert låneopphold. Statistikk fra
tidligere sesonger skal følge låneoppholdet, ikke default-klubben.
**Markører:** `Klubbopphold`, `utlån`
**Datakilde:** `playerSeasonSpells2526.json` med `spellType: "loan"`,
`canonicalPlayerId` + `externalPlayerId`.

### F3 · NM-cup på lagside
**ID:** `nm-cup` · **Bundle:** TeamPage
Cupkamper for laget.
**Markører:** `team-nm-section`, `team-nm-toggle`
**Status:** Skjult bak `SHOW_CUP_SECTION = false` i
`src/utils/cupFixtures.ts` til dataene er synket. Bevisst valg — ikke "fiks"
uten å spørre.

### F4 · Build-stempel
**ID:** `build-stamp` · **Bundle:** index.html
Hvert bygg stempler commit inn i `index.html` og `build-info.json`, slik at
man alltid kan se hvilken kode som faktisk er live.
**Markører:** `build-commit`

### F5 · Trener-fane (rollestyrt)
**ID:** `coach-page` · **Bundle:** index (route) + CoachPage-chunk
Egen fane for innloggede trenere. Skal være usynlig for supportere og
synlig umiddelbart etter innlogging med et registrert trener-principal.
**Markører:** `CoachPage`, `useAppRole`, og minst ett principal i
rolle-registeret.
**Historikk:** Forsvant 2026-09-05 fordi det ble bygget fra en branch som lå
29 commits bak. Dette er hovedgrunnen til at dokumentet finnes.

### F6 · Spillerbilder i tre størrelser
**ID:** `player-images` · **Bundle:** playerImages
Hver spiller har kortbilde (400px og 720px) og fullbilde, alle i WebP.
Originalene prunes bevisst fra `dist` etter bygg — alle visninger går via
`player-card-images` og `player-full-images`.
**Krav:** Antall fullbilder i dist ≥ antall kildebilder. Antall kortbilder
skal stemme eksakt. Deploy-skriptet håndhever begge.

### F7 · Klikkbare tabellrader
**ID:** `clickable-rows` · **Bundle:** index
Alle lagtabeller skal ha klikkbare rader som går til lagsiden. Kobling skjer
via `primeTeamId`, ikke navnematching.
**Verifiseres av:** `scripts/verify-data.mjs`

### F8 · AI-analyse (håndballagent)
**ID:** `ai-chat` · **Bundle:** AiChatPage
Svarer på spørsmål om kamper, spillere og lag med grunnlag i strukturerte
data fra asset-canisteren.

**Krav som gjelder uansett:**
- Et svar som IKKE kommer fra modellen skal aldri presenteres som om det
  gjorde det. Fallback skal merkes synlig for brukeren.
- Ved 401/5xx mot gateway skal det gjøres minst ett nytt forsøk før
  fallback.
- Fallback-teksten skal bruke alt den har (resultat, motstander, dato, alle
  målscorere) — ikke bare toppscorer.

**Kjent tilstand 2026-09-06:** Gateway svarer HTTP 500 på
`openclaw/handball-tracker`. Ikke løst.

### F9 · Fullt principal synlig og kopierbart
**ID:** `principal-copy` · **Bundle:** AccountMenu
Kontomenyen skal vise HELE principalet til den innloggede brukeren, ikke en
forkortet variant, og det skal kunne kopieres med ett klikk.

**Bakgrunn:** Menyen viste tidligere `hmulj-qav...7ch-qae` (forkortet til
9 tegn + 7 tegn). Et principal må gjengis komplett for å kunne registreres
som trener i `roles.ts` — forkortelsen gjorde rolleoppsett umulig uten å
grave i nettleserkonsollen.

**Krav:**
- Hele principalet vises, brutt over flere linjer om nødvendig.
- Kopier-knapp med synlig bekreftelse ("Kopiert").
- Tekst skal også kunne merkes manuelt (`select-all`) som reserveløsning
  hvis utklippstavle-API-et er blokkert.

**Markører:** `Kopier principal`, `principal-copy-button`

---

## 4. Data som ikke skal endres uten avtale

- **Linnea Aula** har ID `22398210032285`. Live-troppen oppgir
  `81639710032285`. ID-en er BEVART med vilje — bytte ville brutt
  følge-status og lånehistorikk. Hun står i to tropper (Aker + Fjellhammer).
- **Spiller-ID-er fra topphandball.no** er 13-sifrede tall og brukes som
  nøkkel gjennom hele appen.

---

## 5. Deploy-regler

1. `git branch -a` og sjekk mot origin FØR arbeid starter. Finnes nyere
   arbeid et annet sted enn der du står?
2. `verify-data.mjs` kjører først i `build` og `build:quick`. Stopper bygget
   ved feil.
3. `feature-guard.mjs` kjører i deploy-skriptet, etter bygg og før
   `dfx install`. Exit 1 = ikke deploy.
   Funksjoner med `"status": "hidden-by-design"` i registeret gir advarsel,
   ikke stopp — men de må ha en note som forklarer hvorfor de er av.
4. Deploy krever `EXPECTED_COMMIT` og ren arbeidskopi.
5. `export DFX_WARNING=-mainnet_plaintext_identity` — identiteten `default`
   er controller og fungerer. `fredrik2` finnes ikke lokalt.
6. Etter deploy: verifiser mot live-URL, ikke mot lokal dist.

---

## 6. Endringslogg

| Dato | Endring | Godkjent |
|---|---|---|
| 2026-09-06 | Dokumentet opprettet. F1–F8 beskrevet. | Fredrik ✅ |
| 2026-09-06 | F9 lagt til: fullt principal synlig og kopierbart. | Fredrik ✅ |
| 2026-09-06 | feature-guard koblet inn i deploy-skriptet (kjørte ikke før). | Fredrik ✅ |
