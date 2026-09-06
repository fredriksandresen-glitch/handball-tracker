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
| admin | Alt treneren ser, pluss tildeling av roller til andre. |
| trener | Alt supporteren ser, pluss Trener-fanen. |

Rollen bestemmes av hvilket Internet Identity-principal som er logget inn.
Ingen brukerdatabase, ingen passord. Registeret ligger i
`src/frontend/src/data/roles.ts`.

**Registrerte brukere:**
- `uzelm-...-wae` — admin (2026-09-06). Kan tildele roller til andre.
- `qawja-...-iqe` — Fredriks trenerkonto (2026-08-31)
- `hmulj-...-qae` — demo-/visningskonto for trenerrollen (2026-09-06)

Admin ser alt treneren ser, pluss rolleadministrasjon.

Begge ser nøyaktig samme Trener-fane. Det finnes én trenerrolle, ikke én
fane per konto.

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

### F10 · Trener-fanen som fullverdig arbeidsverktøy
**ID:** `coach-dashboard` · **Bundle:** CoachPage
**Status:** GODKJENT 2026-09-06. Under arbeid.

Dagens Trener-fane viser tre lister: Formtabell, «I stigende form» og
«Følg med på». Den skal utvides til å være det treneren faktisk trenger før
en kamp.

**F10.1 · All relevant statistikk i listeform**
Beholder listeformatet (det fungerer), men viser hele sesongbildet per
spiller: kamper, mål, skudd, skuddprosent, assist, tekniske feil,
utvisninger, MEP snitt og MEP totalt. Sorterbart på hver kolonne.

**F10.2 · Fargekoder for godt og dårlig**
Tall fargelegges relativt til lagets egne spillere i samme posisjonsgruppe,
ikke mot en absolutt grense — en kantspiller og en linjespiller skal ikke
måles med samme linjal.
- grønn = topp tredjedel
- nøytral = midtre tredjedel
- rød = nederste tredjedel
Tekniske feil og utvisninger inverteres (lavt = grønt).
Fargen skal aldri være eneste bærer av informasjon: tallet står alltid der,
og hver farge har en tekstlig tooltip. Krav for lesbarhet ved fargeblindhet.
Spillere med færre enn 3 kamper fargelegges ikke — for lite grunnlag.

**F10.3 · Keepere har egen tabell**
Keepere skal ikke måles på skuddprosent og mål. De får egen seksjon med
keeperrelevante tall.
**Kjent databegrensning (2026-09-06):** `seasonStats` inneholder i dag kun
`matches, goals, shots, shotPercentage, assists, technicalErrors,
suspensions, mepAvg, mepTotal`. Det finnes INGEN `saves` eller `savePct` i
datagrunnlaget, og `elkjop2627PlayerStats.json` har ingen spillere med
keeperposisjon — selv om rosterfilene har 63 keepere av 479 spillere.
CoachPage har allerede kode som leser `savePct`; den kan i praksis ikke
vise noe.
**Konsekvens:** keepertabellen kan ikke bygges ferdig før redningsdata er
hentet inn. Til da vises keepere i egen seksjon med de feltene som finnes,
og en tydelig merknad om at redningsstatistikk mangler. Ingen tomme
kolonner som lyver.

**F10.4 · Neste motstander**
Øverst på siden: lagets neste kamp (dato, motstander, hjemme/borte, arena)
med motstanderens nøkkeltall — tabellplassering, form siste fem, mål scoret
og sluppet inn, og deres farligste spillere.
**Datakilde:** `nextMatches.ts` (terminliste for begge divisjoner),
`leagueStandings.ts` og motstanderens statistikkfil.
Hvis neste kamp ikke finnes i terminlisten, sies det rett ut i stedet for å
vise en tom boks.

### F11 · Rolleadministrasjon i backend (admin styrer tilgang selv)
**ID:** `role-admin` · **Bundle:** backend `main.mo` + AdminPage
**Status:** GODKJENT 2026-09-06. Under arbeid.
Ingen eksterne brukere ennå, så vi kan bygge om fritt. Frist: onsdag.

I dag ligger trenere hardkodet i `src/frontend/src/data/roles.ts`. Å gi én
person tilgang krever kodeendring, bygg og full redeploy. Det skalerer ikke,
og i en demo er det det motsatte av poenget.

**F11.1 · Roller flyttes til backend-canisteren**
Rollene lagres i backend, ikke i frontend-koden. Én kilde til sannhet, delt
av alle brukere, endres uten redeploy.

**F11.2 · Admin-side i appen**
Egen side synlig kun for admin: lim inn et principal, velg rolle, lagre.
Endringen gjelder umiddelbart for den brukeren.
Roller: `admin`, `trener`, `supporter`. Supporter er standard for alle som
ikke står i registeret — ingen trenger å registreres for å bruke appen.

**F11.3 · Backend håndhever tilgangen — frontend skjuler bare**
Dette er det viktigste punktet. Å skjule en fane er ikke tilgangskontroll.
Hvert kall som endrer roller eller leser trenerdata må sjekke `caller` i
backend og avvise den som ikke har rollen. Frontend-sjekken er kosmetikk for
å slippe å vise knapper som likevel ikke virker.
**Dagens tilstand:** `main.mo` har ingen `caller`-håndtering i det hele tatt.
Dette må bygges fra bunnen.

**F11.4 · Bootstrap: den første adminen**
Noen må være admin før noen kan utnevnes. Første admin settes ved
initialisering, og canisterens controller kan alltid gjenopprette admin hvis
alle admins mistes. Uten dette kan man låse seg selv ute permanent.

**F11.5 · Trener knyttes til lag**
En trener er trener *for et lag*, ikke for hele ligaen. Rollen lagres som
principal + lagId, slik at Trener-fanen åpner på riktig lag og ikke gir
innsyn i andres.

**F11.6 · Revisjonslogg**
Hver rolleendring logges: hvem endret, hvem ble endret, hvilken rolle, når.
Dette er salgsargumentet mot Topphåndball — et vanlig CMS kan ikke bevise
hvem som ga hvem tilgang. Loggen skal være lesbar for admin i appen.

**BLOKKERENDE FORUTSETNING — må avklares før koding**
`src/backend/main.mo` deklarerer `actor Main {` uten `persistent`, og det
finnes ingen `stable`-variabler i backend i det hele tatt. Etter vanlige
Motoko-regler betyr det at state IKKE overlever en canister-upgrade.
Legger vi roller inn nå, kan alle tildelte roller forsvinne stille ved neste
backend-deploy — potensielt midt i en demo.
Dette må verifiseres og løses (persistent actor / stable state / migrasjon)
FØR rollelagring bygges. Backend er heller aldri deployet i denne
arbeidsøkten — deploy-skriptet håndterer kun frontend.

**Migrering:** `roles.ts` beholdes som fallback til backend-rollene er
verifisert live, og fjernes først da. Ingen periode uten fungerende tilgang.

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
| 2026-09-06 | Demo-trenerkonto `hmulj-...-qae` registrert som trener. | Fredrik ✅ |
| 2026-09-06 | F10 godkjent: Trener-fanen som arbeidsverktøy (statistikk, fargekoder, keepere, neste motstander). | Fredrik ✅ |
| 2026-09-06 | F11 godkjent: rolleadministrasjon i backend, admin styrer tilgang. | Fredrik ✅ |
| 2026-09-06 | Admin `uzelm-...-wae` registrert (rollen `admin` innført). | Fredrik ✅ |
