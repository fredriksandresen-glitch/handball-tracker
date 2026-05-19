import Types "../types/handball-data";
import ProfixioTypes "../types/profixio";
import HandballLib "../lib/handball-data";
import HandballScraper "../lib/handball-scraper";
import List "mo:core/List";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Time "mo:core/Time";

module {

  // ─── Constants ─────────────────────────────────────────────────────────────

  let PROFIXIO_API_KEY : Text = "yoJjMRgBSy5ElnwiwunK335jrZTxjjwnZJGO";
  let PROFIXIO_BASE_URL : Text = "https://www.profixio.com/app/api";
  let TOURNAMENT_ID : Text = "436336"; // REMA 1000-ligaen kvinner 2025/2026
  // NHF tournament IDs from fjellhammer.no URL — tournament_id=436338 is the stats version
  let TOPPHANDBALL_TOURNAMENT_ID : Text = "436338";

  // Known topphandball.no team prime_item_ids for REMA 1000-ligaen
  // Format: (teamName, primeItemId)
  let TOPPHANDBALL_TEAM_IDS : [(Text, Text)] = [
    ("Fjellhammer IL",          "225272"),
    ("Sola HK",                 "215770"),
    ("Larvik HK",               "215773"),
    ("Storhamar Elite",         "215775"),
    ("Vipers Kristiansand",     "215776"),
    ("Byåsen IL",               "225271"),
    ("Molde Elite",             "225273"),
    ("Tertnes Elite",           "215777"),
    ("Fana HK",                 "225270"),
    ("Glassverket IF",          "225274"),
    ("Kolstad Håndball",        "225275"),
    ("Stabæk Håndball",         "225276"),
    ("Fredrikstad BK",          "225277"),
    ("Nærbø IL",                "225278"),
  ];

  // ─── Management canister HTTP outcalls ────────────────────────────────────

  type HttpHeader = { name : Text; value : Text };
  type HttpResponse = { status : Nat; headers : [HttpHeader]; body : Blob };
  type HttpRequestArgs = {
    url : Text;
    max_response_bytes : ?Nat64;
    method : { #get; #head; #post };
    headers : [HttpHeader];
    body : ?Blob;
    transform : ?{
      function : shared query ({ response : HttpResponse; context : Blob }) -> async HttpResponse;
      context : Blob;
    };
    is_replicated : ?Bool;
  };

  type ManagementCanister = actor {
    http_request : HttpRequestArgs -> async HttpResponse;
  };

  let ic : ManagementCanister = actor "aaaaa-aa";

  // ─── HTTP helper — returns (statusCode, bodyText) ─────────────────────────

  func fetchJsonWithStatus(path : Text) : async (Nat, ?Text) {
    let url = PROFIXIO_BASE_URL # path;
    let request : HttpRequestArgs = {
      url;
      max_response_bytes = ?(200_000 : Nat64);
      method = #get;
      headers = [
        { name = "X-Api-Secret"; value = PROFIXIO_API_KEY },
        { name = "Accept"; value = "application/json" },
      ];
      body = null;
      transform = null;
      is_replicated = ?false;
    };
    try {
      let response = await ic.http_request(request);
      let bodyText = response.body.decodeUtf8();
      (response.status, bodyText)
    } catch (_e) {
      (0, null)
    }
  };

  // Generic URL fetch (no Profixio auth header)
  func fetchUrlWithStatus(url : Text) : async (Nat, ?Text) {
    let request : HttpRequestArgs = {
      url;
      max_response_bytes = ?(200_000 : Nat64);
      method = #get;
      headers = [
        { name = "Accept"; value = "application/json, text/plain, */*" },
        { name = "User-Agent"; value = "Mozilla/5.0" },
      ];
      body = null;
      transform = null;
      is_replicated = ?false;
    };
    try {
      let response = await ic.http_request(request);
      let bodyText = response.body.decodeUtf8();
      (response.status, bodyText)
    } catch (_e) {
      (0, null)
    }
  };

  // Convenience wrapper: returns body on 2xx, null otherwise (kept for future use)
  func _fetchJson(path : Text) : async ?Text {
    let (status, body) = await fetchJsonWithStatus(path);
    if (status >= 200 and status < 300) body else null
  };

  // Truncate a string to max 200 chars for safe error messages
  func truncate(s : Text, maxLen : Nat) : Text {
    if (s.size() <= maxLen) s
    else {
      var acc = "";
      var count = 0;
      label collect for (c in s.toIter()) {
        if (count >= maxLen) break collect;
        acc := acc # Text.fromChar(c);
        count := count + 1;
      };
      acc # "..."
    }
  };

  // Parse a Float from a JSON text value (handles "12.5", "0", "null", etc.)
  func parseFloat(v : Text) : ?Float {
    let trimmed = v.trim(#char ' ');
    if (trimmed == "null" or trimmed == "") return null;
    // Try integer first
    switch (Nat.fromText(trimmed)) {
      case (?n) return ?(n.toFloat());
      case null {};
    };
    // Check for negative integer
    if (trimmed.startsWith(#char '-')) {
      let rest = Text.fromIter(trimmed.toIter().drop(1));
      switch (Nat.fromText(rest)) {
        case (?n) return ?(-(n.toFloat()));
        case null {};
      };
    };
    // Try float: split on "."
    let parts = trimmed.split(#char '.').toArray();
    if (parts.size() == 2) {
      let intPart = parts[0];
      let fracPart = parts[1];
      let (negative, absIntStr) = if (intPart.startsWith(#char '-')) {
        (true, Text.fromIter(intPart.toIter().drop(1)))
      } else {
        (false, intPart)
      };
      switch (Nat.fromText(absIntStr), Nat.fromText(fracPart)) {
        case (?intN, ?fracN) {
          // Compute 10^fracPart.size() without Float.pow
          var denom : Float = 1.0;
          var i = 0;
          while (i < fracPart.size()) {
            denom := denom * 10.0;
            i += 1;
          };
          let result = intN.toFloat() + fracN.toFloat() / denom;
          ?(if (negative) -result else result)
        };
        case _ null;
      };
    } else null
  };

  // Try multiple Float key variants, return first valid
  func jsonGetFloatMultiKey(json : Text, keys : [Text]) : ?Float {
    for (key in keys.values()) {
      switch (jsonGetField(json, key)) {
        case null {};
        case (?v) {
          switch (parseFloat(v)) {
            case (?f) return ?f;
            case null {};
          };
        };
      };
    };
    null
  };

  // ─── Minimal JSON helpers ─────────────────────────────────────────────────

  // Extract raw string value for first occurrence of `"key":"..."` or `"key":number`
  func jsonGetField(json : Text, key : Text) : ?Text {
    let needle = "\"" # key # "\":";
    let parts = json.split(#text needle);
    ignore parts.next(); // skip before needle
    let afterColon = switch (parts.next()) {
      case null return null;
      case (?s) s;
    };

    var leadingDone = false;
    var isStr = false;
    var acc = "";
    var inValue = false;
    var done = false;

    for (c in afterColon.toIter()) {
      if (not done) {
        if (not leadingDone) {
          if (c == ' ' or c == '\n' or c == '\r' or c == '\t') {
            // skip leading whitespace
          } else {
            leadingDone := true;
            if (c == '\"') {
              isStr := true;
              inValue := true;
            } else {
              isStr := false;
              inValue := true;
              if (c != ',' and c != '}' and c != ']') {
                acc := acc # Text.fromChar(c);
              } else {
                done := true;
              };
            };
          };
        } else if (inValue) {
          if (isStr) {
            if (c == '\"') {
              done := true;
            } else {
              acc := acc # Text.fromChar(c);
            };
          } else {
            if (c == ',' or c == '}' or c == ']' or c == ' ' or c == '\n' or c == '\r') {
              done := true;
            } else {
              acc := acc # Text.fromChar(c);
            };
          };
        };
      };
    };

    if (acc.size() > 0) ?acc else null
  };

  // Try multiple key variants, return first non-null non-zero Nat
  func jsonGetNatMultiKey(json : Text, keys : [Text]) : ?Nat {
    for (key in keys.values()) {
      switch (jsonGetField(json, key)) {
        case null {};
        case (?v) {
          let trimmed = v.trim(#char ' ');
          if (trimmed != "null" and trimmed != "0" and trimmed != "") {
            switch (Nat.fromText(trimmed)) {
              case (?n) if (n > 0) return ?n;
              case null {};
            };
          };
        };
      };
    };
    // Also check for 0 — return 0 if at least one key exists with value 0
    for (key in keys.values()) {
      switch (jsonGetField(json, key)) {
        case null {};
        case (?v) {
          let trimmed = v.trim(#char ' ');
          if (trimmed == "0") return ?0;
          switch (Nat.fromText(trimmed)) {
            case (?n) return ?n;
            case null {};
          };
        };
      };
    };
    null
  };

  // Extract the raw JSON value for a key that is an object `"key":{...}`
  // Returns the `{...}` substring with proper brace matching
  func jsonGetObject(json : Text, key : Text) : ?Text {
    let needle = "\"" # key # "\":{";
    let parts = json.split(#text needle);
    ignore parts.next();
    let afterBrace = switch (parts.next()) {
      case null return null;
      case (?s) s;
    };
    // find matching closing brace
    var depth = 1;
    var acc = "{";
    var done = false;
    for (c in afterBrace.toIter()) {
      if (not done) {
        if (c == '{') {
          depth := depth + 1;
          acc := acc # Text.fromChar(c);
        } else if (c == '}') {
          if (depth > 0) {
            depth := depth - 1;
          };
          if (depth == 0) {
            acc := acc # "}";
            done := true;
          } else {
            acc := acc # Text.fromChar(c);
          };
        } else {
          acc := acc # Text.fromChar(c);
        };
      };
    };
    if (done) ?acc else null
  };

  // Split `"data":[...]` array into individual object strings
  func jsonSplitDataArray(json : Text) : [Text] {
    // Find "data":[
    let parts = json.split(#text "\"data\":[").toArray();
    if (parts.size() < 2) return [];
    let afterOpen = parts[1];
    // collect until matching ]
    var depth = 1;
    var acc = "";
    var done = false;
    for (c in afterOpen.toIter()) {
      if (not done) {
        if (c == '[') {
          depth := depth + 1;
          acc := acc # Text.fromChar(c);
        } else if (c == ']') {
          if (depth > 0) {
            depth := depth - 1;
          };
          if (depth == 0) {
            done := true;
          } else {
            acc := acc # Text.fromChar(c);
          };
        } else {
          acc := acc # Text.fromChar(c);
        };
      };
    };
    let inner = acc.trim(#char ' ');
    if (inner.size() == 0) return [];
    // Split on "},{" boundaries
    let chunks = inner.split(#text "},{").toArray();
    chunks.map<Text, Text>(func(chunk) {
      var s = chunk.trim(#char ' ');
      if (not s.startsWith(#char '{')) s := "{" # s;
      if (not s.endsWith(#char '}')) s := s # "}";
      s
    })
  };

  // ─── Fuzzy name matching ───────────────────────────────────────────────────

  // Returns true if ALL words in the shorter name appear in the longer name (case-insensitive).
  // Example: "Sarah Solheim" matches "Sarah Deari Solheim" because both "sarah" and "solheim" appear.
  func namesMatch(nameA : Text, nameB : Text) : Bool {
    let a = nameA.toLower();
    let b = nameB.toLower();
    if (a == b) return true;

    // Try: all parts of A appear in B
    let partsA = a.split(#char ' ').toArray();
    let allAInB = partsA.all(func(part) {
      part.size() > 1 and b.contains(#text part)
    });
    if (allAInB and partsA.size() >= 2) return true;

    // Try: all parts of B appear in A
    let partsB = b.split(#char ' ').toArray();
    let allBInA = partsB.all(func(part) {
      part.size() > 1 and a.contains(#text part)
    });
    if (allBInA and partsB.size() >= 2) return true;

    false
  };

  // Find a player by fuzzy name matching
  func findPlayerByName(players : List.List<Types.Player>, name : Text) : ?Types.Player {
    // First try exact (case-insensitive)
    switch (players.find(func(p) { p.name.toLower() == name.toLower() })) {
      case (?p) return ?p;
      case null {};
    };
    // Then try fuzzy
    players.find(func(p) { namesMatch(p.name, name) })
  };

  // ─── Parse stats object into PlayerSeasonStats fields ─────────────────────

  func parseStatsFromObject(sObj : Text, playerId : Nat, statId : Nat) : Types.PlayerSeasonStats {
    let goalsOpt = jsonGetNatMultiKey(sObj, [
      "goals", "goal", "maal", "mål", "score", "totalGoals", "total_goals",
      "goals_scored", "total_field_goals"
    ]);
    let assistsOpt = jsonGetNatMultiKey(sObj, [
      "assists", "assist", "totalAssists", "total_assists", "assistanser"
    ]);
    let matchesOpt = jsonGetNatMultiKey(sObj, [
      "matches_played", "matchesPlayed", "matches", "games", "games_played",
      "number_of_matches", "played", "antall_kamper", "kamper"
    ]);
    let shotsOpt = jsonGetNatMultiKey(sObj, [
      "shots", "shot_attempts", "totalShots", "total_shots", "throws",
      "total_shots_on_goal", "skudd", "total_skudd"
    ]);
    let yellowCardsOpt = jsonGetNatMultiKey(sObj, [
      "yellow_cards", "yellowCards", "gult_kort", "yellow", "advarsel", "warnings"
    ]);
    let twoMinOpt = jsonGetNatMultiKey(sObj, [
      "two_min_suspensions", "twoMinSuspensions", "2min", "two_minutes",
      "suspension", "suspensions", "to_min", "2_min", "twomin"
    ]);
    let redCardsOpt = jsonGetNatMultiKey(sObj, [
      "red_cards", "redCards", "rodt_kort", "red", "rod_kort"
    ]);
    let savesOpt = jsonGetNatMultiKey(sObj, [
      "saves", "goalkeeper_saves", "totalSaves", "total_saves", "keepersaves",
      "redninger", "total_redninger"
    ]);
    let minutesOpt = jsonGetNatMultiKey(sObj, [
      "minutes_played", "minutesPlayed", "minutter", "minutes", "total_minutes",
      "spillertid", "total_spillertid"
    ]);

    // Extended fields — topphandball.no specific
    let shootingPercentOpt = jsonGetFloatMultiKey(sObj, [
      "efficiency", "uttelling", "shooting_percent", "shot_percent",
      "total_efficiency", "pct", "goal_percent", "total_pct"
    ]);
    let goalsPerGameOpt = jsonGetFloatMultiKey(sObj, [
      "goals_per_game", "goalsPerGame", "snitt_maal", "avg_goals",
      "goals_avg", "maal_snitt"
    ]);
    let fieldGoalsOpt = jsonGetNatMultiKey(sObj, [
      "field_goals", "fieldGoals", "spillermaal", "spillermål",
      "open_play_goals", "spill_maal"
    ]);
    let fieldShotsOpt = jsonGetNatMultiKey(sObj, [
      "field_shots", "fieldShots", "spillerskudd", "open_play_shots",
      "spill_skudd"
    ]);
    let fieldGoalPercentOpt = jsonGetFloatMultiKey(sObj, [
      "field_efficiency", "fieldEfficiency", "uttelling_spill",
      "open_play_efficiency", "spill_pct"
    ]);
    let goals7mOpt = jsonGetNatMultiKey(sObj, [
      "goals_7m", "goals7m", "maal_7m", "mål_7m", "penalty_goals",
      "seven_meter_goals", "7m_goals"
    ]);
    let shots7mOpt = jsonGetNatMultiKey(sObj, [
      "shots_7m", "shots7m", "skudd_7m", "penalty_shots",
      "seven_meter_shots", "7m_shots"
    ]);
    let percent7mOpt = jsonGetFloatMultiKey(sObj, [
      "efficiency_7m", "percent7m", "uttelling_7m", "penalty_efficiency",
      "seven_meter_efficiency", "7m_pct"
    ]);
    let assistsPerGameOpt = jsonGetFloatMultiKey(sObj, [
      "assists_per_game", "assistsPerGame", "snitt_assist",
      "avg_assists", "assist_snitt"
    ]);
    let technicalFaultsOpt = jsonGetNatMultiKey(sObj, [
      "technical_faults", "technicalFaults", "teknisk_feil",
      "turnovers", "tech_faults"
    ]);
    let provoked7mOpt = jsonGetNatMultiKey(sObj, [
      "provoked_7m", "provoked7m", "foraarsaket_7m", "forårsaket_7m",
      "earned_7m", "drawn_penalties"
    ]);
    let awarded7mOpt = jsonGetNatMultiKey(sObj, [
      "awarded_7m", "awarded7m", "tildelt_7m", "conceded_7m",
      "given_penalties"
    ]);
    let mepAvgOpt = jsonGetFloatMultiKey(sObj, [
      "mep_avg", "mepAvg", "snitt_mep", "avg_mep",
      "performance_avg", "mep_snitt"
    ]);
    let mepTotalOpt = jsonGetFloatMultiKey(sObj, [
      "mep_total", "mepTotal", "total_mep", "mep",
      "performance_total"
    ]);

    let matchesPlayed = switch matchesOpt { case (?m) m; case null 0 };
    {
      id = statId;
      playerId;
      season = "2025-26";
      matchesPlayed;
      totalMinutes = minutesOpt;
      totalGoals = goalsOpt;
      totalShots = shotsOpt;
      totalYellowCards = yellowCardsOpt;
      totalTwoMin = twoMinOpt;
      totalRedCards = redCardsOpt;
      totalAssists = assistsOpt;
      totalSaves = savesOpt;
      shootingPercent = shootingPercentOpt;
      goalsPerGame = goalsPerGameOpt;
      fieldGoals = fieldGoalsOpt;
      fieldShots = fieldShotsOpt;
      fieldGoalPercent = fieldGoalPercentOpt;
      goals7m = goals7mOpt;
      shots7m = shots7mOpt;
      percent7m = percent7mOpt;
      assistsPerGame = assistsPerGameOpt;
      technicalFaults = technicalFaultsOpt;
      provoked7m = provoked7mOpt;
      awarded7m = awarded7mOpt;
      mepAvg = mepAvgOpt;
      mepTotal = mepTotalOpt;
    }
  };

  // Merge new stats into the season stats list (overwrite existing by playerId)
  func mergeSeasonStat(
    seasonStats : List.List<Types.PlayerSeasonStats>,
    newStat : Types.PlayerSeasonStats
  ) : () {
    let existingIdx = seasonStats.findIndex(func(s) { s.playerId == newStat.playerId });
    switch existingIdx {
      case (?i) seasonStats.put(i, newStat);
      case null seasonStats.add(newStat);
    };
  };

  // ─── Pagination: fetch all pages for a given path prefix ──────────────────

  func fetchAllPages(basePath : Text) : async [Text] {
    let objects = List.empty<Text>();
    var page = 1;
    var hasMore = true;
    while (hasMore and page <= 10) {
      let sep = if (basePath.contains(#char '?')) "&" else "?";
      let path = basePath # sep # "limit=100&page=" # page.toText();
      let (status, bodyOpt) = await fetchJsonWithStatus(path);
      switch bodyOpt {
        case null { hasMore := false };
        case (?body) {
          if (status < 200 or status >= 300) {
            hasMore := false;
          } else {
            let items = jsonSplitDataArray(body);
            if (items.size() == 0) {
              hasMore := false;
            } else {
              for (item in items.values()) { objects.add(item) };
              // Check last_page from meta
              let lastPage = switch (jsonGetField(body, "last_page")) {
                case null 1;
                case (?lp) switch (Nat.fromText(lp)) { case null 1; case (?n) n };
              };
              if (page >= lastPage) hasMore := false;
            };
          };
        };
      };
      page := page + 1;
    };
    objects.toArray()
  };

  // ─── Position mapping ─────────────────────────────────────────────────────

  func mapPosition(raw : Text) : Types.Position {
    let lower = raw.toLower();
    if (lower.contains(#text "keep") or lower.contains(#text "mv") or lower.contains(#text "gk")) {
      #Keeper
    } else if (lower.contains(#text "venstre") or lower.contains(#text "left") or lower.contains(#text "vk") or lower.contains(#text "lw")) {
      #VenstreKant
    } else if (lower.contains(#text "hoyre") or lower.contains(#text "hoyre") or lower.contains(#text "right") or lower.contains(#text "hk") or lower.contains(#text "rw")) {
      #HoyreKant
    } else if (lower.contains(#text "linje") or lower.contains(#text "pivot") or lower.contains(#text "ls") or lower.contains(#text "cb")) {
      #Linje
    } else {
      #Bakspiller
    }
  };

  // ─── Slug helper ──────────────────────────────────────────────────────────

  func slugify(name : Text) : Text {
    name.toLower().map(func(c : Char) : Char {
      if ((c >= 'a' and c <= 'z') or (c >= '0' and c <= '9')) c
      else if (c.toNat32() == 0xE6) 'a'  // æ
      else if (c.toNat32() == 0xF8) 'o'  // ø
      else if (c.toNat32() == 0xE5) 'a'  // å
      else '-'
    })
  };

  // Parse a Profixio date string "YYYY-MM-DD HH:MM:SS" to nanoseconds Int
  func parseDateToNanos(dateStr : Text) : ?Int {
    let spaceparts = dateStr.split(#char ' ').toArray();
    if (spaceparts.size() == 0) return null;
    let datePart = spaceparts[0];
    let datePieces = datePart.split(#char '-').toArray();
    if (datePieces.size() < 3) return null;
    let yearOpt = Nat.fromText(datePieces[0]);
    let monthOpt = Nat.fromText(datePieces[1]);
    let dayOpt = Nat.fromText(datePieces[2]);
    switch (yearOpt, monthOpt, dayOpt) {
      case (?year, ?month, ?day) {
        if (year < 1970) return null;
        let yearsSince1970 : Int = year.toInt() - 1970;
        let leapYears : Int = yearsSince1970 / 4;
        let daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        var monthDays : Nat = 0;
        var mi = 1;
        while (mi < month and mi <= 12) {
          monthDays := monthDays + daysInMonth[mi];
          mi := mi + 1;
        };
        let totalDays : Int = yearsSince1970 * 365 + leapYears + monthDays.toInt() + day.toInt() - 1;
        let nanos : Int = totalDays * 86_400_000_000_000;
        ?nanos
      };
      case _ null
    }
  };

  // ─── Split a top-level JSON array (not nested under "data") ─────────────────

  // Splits a JSON array string "[{...},{...}]" into individual object strings
  func _splitJsonArray(json : Text) : [Text] {
    // find opening [
    let trimmed = json.trim(#char ' ');
    let parts = trimmed.split(#char '[').toArray();
    if (parts.size() < 2) return [];
    let afterOpen = parts[1];
    // collect until matching ]
    var depth = 1;
    var acc = "";
    var done = false;
    for (c in afterOpen.toIter()) {
      if (not done) {
        if (c == '[') {
          depth := depth + 1;
          acc := acc # Text.fromChar(c);
        } else if (c == ']') {
          if (depth > 0) depth := depth - 1;
          if (depth == 0) { done := true }
          else acc := acc # Text.fromChar(c);
        } else {
          acc := acc # Text.fromChar(c);
        };
      };
    };
    let inner = acc.trim(#char ' ');
    if (inner.size() == 0) return [];
    let chunks = inner.split(#text "},{").toArray();
    chunks.map<Text, Text>(func(chunk) {
      var s = chunk.trim(#char ' ');
      if (not s.startsWith(#char '{')) s := "{" # s;
      if (not s.endsWith(#char '}')) s := s # "}";
      s
    })
  };

  // ─── topphandball.no JSON endpoint probe ──────────────────────────────────

  // Tries multiple URL patterns to find a server-side JSON endpoint for team stats.
  // Returns (playerCount, statsApplied) if any endpoint returns usable data.
  func tryTopphandballTeam(
    players : List.List<Types.Player>,
    seasonStats : List.List<Types.PlayerSeasonStats>,
    _teamName : Text,
    primeItemId : Text,
    statIdStart : Nat
  ) : async Nat {
    var statId = statIdStart;
    var applied = 0;

    // Try several URL patterns — WordPress REST API first, then direct stat page fallbacks
    let urlPatterns : [Text] = [
      // PATTERN A — WordPress REST (nth namespace) — most likely for topphandball.no custom plugin
      "https://www.topphandball.no/wp-json/nth/v1/statistics?tournament_id=" # TOPPHANDBALL_TOURNAMENT_ID # "&type=player&team_id=" # primeItemId,
      "https://www.topphandball.no/wp-json/nth/v1/statistics?tournament_id=" # TOURNAMENT_ID # "&type=player&team_id=" # primeItemId,
      "https://www.topphandball.no/wp-json/nth/v1/player-statistics?tournament_id=" # TOPPHANDBALL_TOURNAMENT_ID # "&team_id=" # primeItemId,
      "https://www.topphandball.no/wp-json/nth/v1/statistics?tournament_id=" # TOPPHANDBALL_TOURNAMENT_ID # "&team=" # primeItemId,
      // PATTERN B — WordPress REST (webcore namespace)
      "https://www.topphandball.no/wp-json/webcore/v1/statistics?tournament_id=" # TOPPHANDBALL_TOURNAMENT_ID # "&team_id=" # primeItemId,
      "https://www.topphandball.no/wp-json/webcore/v1/player-stats?tournament_id=" # TOPPHANDBALL_TOURNAMENT_ID # "&team_id=" # primeItemId,
      // PATTERN C — WordPress REST (wp/v2 custom post type)
      "https://www.topphandball.no/wp-json/wp/v2/nth_statistics?tournament_id=" # TOPPHANDBALL_TOURNAMENT_ID # "&team_id=" # primeItemId,
      // PATTERN D — direct stats page with format=json
      "https://www.topphandball.no/statistikk/?prime_type=team&prime_item_id=" # primeItemId # "&prime_tournament_id=" # TOPPHANDBALL_TOURNAMENT_ID # "&format=json",
      "https://www.topphandball.no/statistikk/?prime_type=team&prime_item_id=" # primeItemId # "&prime_tournament_id=" # TOURNAMENT_ID # "&format=json",
      // PATTERN E — club subdomain variation
      "https://fjellhammer.topphandball.no/wp-json/nth/v1/statistics?tournament_id=" # TOPPHANDBALL_TOURNAMENT_ID # "&type=player&team_id=" # primeItemId,
      "https://fjellhammer.topphandball.no/statistikk/?prime_type=team&prime_item_id=" # primeItemId # "&prime_tournament_id=" # TOPPHANDBALL_TOURNAMENT_ID # "&format=json",
      // PATTERN F — topphandball API endpoint
      "https://www.topphandball.no/api/statistics/?prime_type=team&prime_item_id=" # primeItemId # "&prime_tournament_id=" # TOPPHANDBALL_TOURNAMENT_ID,
    ];

    for (url in urlPatterns.values()) {
      if (applied == 0) {
        let (status, bodyOpt) = await fetchUrlWithStatus(url);
        switch bodyOpt {
          case null {};
          case (?body) {
            if (status >= 200 and status < 300 and body.size() > 50) {
              // Check if body looks like JSON with player stats
              let hasGoals = body.contains(#text "goals") or body.contains(#text "maal") or
                             body.contains(#text "mål") or body.contains(#text "score");
              let hasName = body.contains(#text "name") or body.contains(#text "player");
              if (hasGoals and hasName) {
                // Try to parse as data array
                let objects = jsonSplitDataArray(body);
                let objsToTry = if (objects.size() > 0) objects else _splitJsonArray(body);
                for (obj in objsToTry.values()) {
                  let nameOpt = switch (jsonGetField(obj, "full_name")) {
                    case (?n) ?n;
                    case null switch (jsonGetField(obj, "name")) {
                      case (?n) ?n;
                      case null jsonGetField(obj, "player_name");
                    };
                  };
                  switch nameOpt {
                    case null {};
                    case (?pname) {
                      switch (findPlayerByName(players, pname)) {
                        case null {};
                        case (?player) {
                          statId += 1;
                          let newStat = parseStatsFromObject(obj, player.id, statId);
                          // Only apply if we got at least some stats
                          let hasData = newStat.totalGoals != null or
                                        newStat.totalAssists != null or
                                        newStat.totalSaves != null or
                                        newStat.matchesPlayed > 0;
                          if (hasData) {
                            mergeSeasonStat(seasonStats, newStat);
                            applied += 1;
                          };
                        };
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    };

    applied
  };

  // Try to load player stats from topphandball.no for all teams
  // Returns (statsApplied, sourceLabel)
  func tryTopphandballAllTeams(
    state : HandballLib.State
  ) : async (Nat, Text) {
    var totalApplied = 0;
    var statId = 30000; // offset to avoid collisions

    // First, try tournament-wide REST endpoints (more efficient)
    let tournamentWideUrls : [Text] = [
      "https://www.topphandball.no/wp-json/nth/v1/statistics?tournament_id=" # TOPPHANDBALL_TOURNAMENT_ID # "&type=player",
      "https://www.topphandball.no/wp-json/nth/v1/statistics?tournament_id=" # TOURNAMENT_ID # "&type=player",
      "https://www.topphandball.no/wp-json/nth/v1/player-statistics?tournament_id=" # TOPPHANDBALL_TOURNAMENT_ID,
      "https://www.topphandball.no/wp-json/nth/v1/statistics/players?tournament_id=" # TOPPHANDBALL_TOURNAMENT_ID,
      "https://www.topphandball.no/wp-json/webcore/v1/statistics?tournament_id=" # TOPPHANDBALL_TOURNAMENT_ID,
      "https://www.topphandball.no/wp-json/webcore/v1/player-stats?tournament_id=" # TOPPHANDBALL_TOURNAMENT_ID,
    ];

    for (url in tournamentWideUrls.values()) {
      if (totalApplied == 0) {
        let (status, bodyOpt) = await fetchUrlWithStatus(url);
        switch bodyOpt {
          case null {};
          case (?body) {
            if (status >= 200 and status < 300 and body.size() > 50) {
              let hasGoals = body.contains(#text "goals") or body.contains(#text "maal") or
                             body.contains(#text "mål") or body.contains(#text "score");
              let hasName = body.contains(#text "name") or body.contains(#text "player");
              if (hasGoals and hasName) {
                let objects = jsonSplitDataArray(body);
                let objsToTry = if (objects.size() > 0) objects else _splitJsonArray(body);
                for (obj in objsToTry.values()) {
                  let nameOpt = switch (jsonGetField(obj, "full_name")) {
                    case (?n) ?n;
                    case null switch (jsonGetField(obj, "name")) {
                      case (?n) ?n;
                      case null jsonGetField(obj, "player_name");
                    };
                  };
                  switch nameOpt {
                    case null {};
                    case (?pname) {
                      switch (findPlayerByName(state.players, pname)) {
                        case null {};
                        case (?player) {
                          statId += 1;
                          let newStat = parseStatsFromObject(obj, player.id, statId);
                          let hasData = newStat.totalGoals != null or
                                        newStat.totalAssists != null or
                                        newStat.totalSaves != null or
                                        newStat.matchesPlayed > 0;
                          if (hasData) {
                            mergeSeasonStat(state.playerSeasonStats, newStat);
                            totalApplied += 1;
                          };
                        };
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    };

    // If tournament-wide failed, try per-team
    if (totalApplied == 0) {
      for ((teamName, primeItemId) in TOPPHANDBALL_TEAM_IDS.values()) {
        let applied = await tryTopphandballTeam(
          state.players,
          state.playerSeasonStats,
          teamName,
          primeItemId,
          statId
        );
        totalApplied += applied;
        statId += 1000;
      };
    };

    if (totalApplied > 0) {
      (totalApplied, "topphandball")
    } else {
      (0, "")
    }
  };

  // ─── Try multiple Profixio /playerStats endpoint patterns ────────────────

  func tryProfixioPlayerStats(
    players : List.List<Types.Player>,
    seasonStats : List.List<Types.PlayerSeasonStats>
  ) : async (Nat, Text) {
    var statId = 10000;
    var applied = 0;
    var urlUsed = "";

    // Try multiple endpoint patterns
    let endpointPatterns : [Text] = [
      "/NHF.NO.HB/tournaments/" # TOURNAMENT_ID # "/playerStats",
      "/tournaments/" # TOURNAMENT_ID # "/playerStats",
      "/NHF.NO.HB/tournaments/" # TOURNAMENT_ID # "/statistics/players",
      "/tournaments/" # TOURNAMENT_ID # "/statistics/players",
      "/NHF.NO.HB/tournaments/" # TOURNAMENT_ID # "/playerstatistics",
      "/tournaments/" # TOURNAMENT_ID # "/playerstatistics",
    ];

    for (endpoint in endpointPatterns.values()) {
      if (applied == 0) {
        let (status, bodyOpt) = await fetchJsonWithStatus(endpoint);
        switch bodyOpt {
          case null {};
          case (?body) {
            if (status >= 200 and status < 300 and body.size() > 50) {
              let objects = jsonSplitDataArray(body);
              if (objects.size() > 0) {
                urlUsed := endpoint;
                for (sObj in objects.values()) {
                  let pnameOpt = switch (jsonGetField(sObj, "full_name")) {
                    case (?n) ?n;
                    case null switch (jsonGetField(sObj, "name")) {
                      case (?n) ?n;
                      case null jsonGetField(sObj, "player_name");
                    };
                  };
                  switch pnameOpt {
                    case null {};
                    case (?pname) {
                      switch (findPlayerByName(players, pname)) {
                        case null {};
                        case (?player) {
                          statId += 1;
                          let newStat = parseStatsFromObject(sObj, player.id, statId);
                          let hasData = newStat.totalGoals != null or
                                        newStat.totalAssists != null or
                                        newStat.totalSaves != null or
                                        newStat.matchesPlayed > 0;
                          if (hasData) {
                            mergeSeasonStat(seasonStats, newStat);
                            applied += 1;
                          };
                        };
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    };

    // Also try per-team stats endpoint if we got 0 from global endpoint
    if (applied == 0) {
      // Fetch team list to get Profixio team IDs
      let (teamsStatus, teamsBodyOpt) = await fetchJsonWithStatus(
        "/tournaments/" # TOURNAMENT_ID # "/teams?limit=20&page=1"
      );
      switch teamsBodyOpt {
        case null {};
        case (?teamsJson) {
          if (teamsStatus >= 200 and teamsStatus < 300) {
            let teamObjects = jsonSplitDataArray(teamsJson);
            for (teamObj in teamObjects.values()) {
              switch (jsonGetField(teamObj, "id")) {
                case null {};
                case (?teamId) {
                  let perTeamEndpoints : [Text] = [
                    "/tournaments/" # TOURNAMENT_ID # "/teams/" # teamId # "/playerStats",
                    "/NHF.NO.HB/tournaments/" # TOURNAMENT_ID # "/teams/" # teamId # "/playerStats",
                    "/tournaments/" # TOURNAMENT_ID # "/teams/" # teamId # "/statistics/players",
                  ];
                  for (endpoint in perTeamEndpoints.values()) {
                    if (applied == 0) {
                      let (s, b) = await fetchJsonWithStatus(endpoint);
                      switch b {
                        case null {};
                        case (?body) {
                          if (s >= 200 and s < 300) {
                            let objects = jsonSplitDataArray(body);
                            for (sObj in objects.values()) {
                              let pnameOpt = switch (jsonGetField(sObj, "full_name")) {
                                case (?n) ?n;
                                case null jsonGetField(sObj, "name");
                              };
                              switch pnameOpt {
                                case null {};
                                case (?pname) {
                                  switch (findPlayerByName(players, pname)) {
                                    case null {};
                                    case (?player) {
                                      statId += 1;
                                      let newStat = parseStatsFromObject(sObj, player.id, statId);
                                      mergeSeasonStat(seasonStats, newStat);
                                      applied += 1;
                                    };
                                  };
                                };
                              };
                            };
                            if (objects.size() > 0 and applied > 0) {
                              urlUsed := endpoint;
                            };
                          };
                        };
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    };

    (applied, urlUsed)
  };

  // ─── Standalone refreshPlayerStats — tries all sources in priority order ──

  public func refreshPlayerStats(
    state : HandballLib.State,
    cache : ProfixioTypes.ProfixioCache,
  ) : async Text {

    // 1. Try topphandball.no JSON endpoints first (most reliable)
    let (thApplied, _thSource) = await tryTopphandballAllTeams(state);
    if (thApplied > 0) {
      // Re-apply confirmed overrides so external data never clobbers known-good stats
      HandballLib.applySeasonStatsOverrides(state);
      cache.liveStatsCount := thApplied;
      cache.dataSource := "topphandball";
      let msg = "Statistikk oppdatert fra topphandball.no: " # thApplied.toText() # " spillere med ekte statistikk";
      cache.lastMessage := msg;
      return msg;
    };

    // 2. Try Profixio /playerStats endpoint (multiple URL patterns)
    let (profApplied, profUrl) = await tryProfixioPlayerStats(state.players, state.playerSeasonStats);
    if (profApplied > 0) {
      // Re-apply confirmed overrides so external data never clobbers known-good stats
      HandballLib.applySeasonStatsOverrides(state);
      cache.liveStatsCount := profApplied;
      cache.dataSource := "live";
      let msg = "Statistikk oppdatert fra Profixio API (" # profUrl # "): " # profApplied.toText() # " spillere";
      cache.lastMessage := msg;
      return msg;
    };

    // 3. Try handball.no top scorers scraping
    let data = await HandballScraper.scrape();
    var scorersApplied = 0;
    for (scorer in data.topScorers.values()) {
      switch (findPlayerByName(state.players, scorer.playerName)) {
        case null {};
        case (?player) {
          let existingIdx = state.playerSeasonStats.findIndex(func(s) { s.playerId == player.id });
          switch existingIdx {
            case null {
              state.playerSeasonStats.add({
                id = 20000 + player.id;
                playerId = player.id;
                season = "2025-26";
                matchesPlayed = 0;
                totalMinutes = null;
                totalGoals = ?scorer.goals;
                totalShots = null;
                totalYellowCards = null;
                totalTwoMin = null;
                totalRedCards = null;
                totalAssists = null;
                totalSaves = null;
                shootingPercent = null;
                goalsPerGame = null;
                fieldGoals = null;
                fieldShots = null;
                fieldGoalPercent = null;
                goals7m = null;
                shots7m = null;
                percent7m = null;
                assistsPerGame = null;
                technicalFaults = null;
                provoked7m = null;
                awarded7m = null;
                mepAvg = null;
                mepTotal = null;
              });
            };
            case (?i) {
              let old = state.playerSeasonStats.at(i);
              state.playerSeasonStats.put(i, { old with totalGoals = ?scorer.goals });
            };
          };
          scorersApplied += 1;
        };
      };
    };

    if (scorersApplied > 0) {
      // Re-apply confirmed overrides so scraping never clobbers known-good stats
      HandballLib.applySeasonStatsOverrides(state);
      cache.liveStatsCount := scorersApplied;
      cache.dataSource := "scraped";
      let msg = "Statistikk oppdatert fra handball.no scraping: " # scorersApplied.toText() # " toppscorere";
      cache.lastMessage := msg;
      return msg;
    };

    // 4. Fallback: seed data already loaded, just report
    let msg = "Ingen live statistikk tilgjengelig — bruker seed-data (" #
              state.playerSeasonStats.size().toText() # " spillere med statistikk)";
    cache.lastMessage := msg;
    msg
  };

  // ─── Load tournament data using /teams?playerList=1 and /playerStats ─────

  func loadTournamentData(
    state : HandballLib.State,
  ) : async (Bool, Text, Nat) {

    // 1. Fetch teams WITH embedded player rosters
    let (teamsStatus, teamsBodyOpt) = await fetchJsonWithStatus(
      "/tournaments/" # TOURNAMENT_ID # "/teams?playerList=1&limit=100&page=1"
    );

    if (teamsStatus == 401 or teamsStatus == 403) {
      let bodySnip = switch teamsBodyOpt {
        case null "ingen respons";
        case (?b) truncate(b, 200);
      };
      return (false, "API feil " # teamsStatus.toText() # ": Ingen tilgang. Detaljer: " # bodySnip, 0);
    };

    if (teamsStatus == 404) {
      return (false, "API feil 404: Turnering " # TOURNAMENT_ID # " ikke funnet", 0);
    };

    if (teamsStatus < 200 or teamsStatus >= 300) {
      return (false, "API feil " # teamsStatus.toText() # " fra /tournaments/" # TOURNAMENT_ID # "/teams", 0);
    };

    let teamsJson = switch teamsBodyOpt {
      case null return (false, "Ingen respons fra Profixio teams-endepunkt (HTTP " # teamsStatus.toText() # ")", 0);
      case (?j) j;
    };

    let teamObjects = jsonSplitDataArray(teamsJson);
    if (teamObjects.size() == 0) {
      return (false, "Ingen lag i turnering " # TOURNAMENT_ID # ". Respons: " # truncate(teamsJson, 300), 0);
    };

    // Build new data into temporary lists first — only swap into state if we get real players
    let newTeams = List.empty<Types.Team>();
    let newPlayers = List.empty<Types.Player>();

    var teamIdCounter : Nat = 1;
    var playerIdCounter : Nat = 1;
    let profixioTeamToLocal = Map.empty<Text, Nat>();

    for (teamObj in teamObjects.values()) {
      switch (jsonGetField(teamObj, "name"), jsonGetField(teamObj, "id")) {
        case (?name, ?pid) {
          let localId = teamIdCounter;
          teamIdCounter := teamIdCounter + 1;
          profixioTeamToLocal.add(pid, localId);
          newTeams.add({
            id = localId;
            name;
            slug = slugify(name);
            logoUrl = null;
            standingsRank = null;
            matchesPlayed = null;
            points = null;
            goalDifference = null;
          });

          // Parse embedded player list from "players":[{...},...] field
          // We need to locate the "players" array within this team object
          let playersNeedle = "\"players\":[";
          let teamParts = teamObj.split(#text playersNeedle).toArray();
          if (teamParts.size() >= 2) {
            let afterPlayersOpen = teamParts[1];
            var depth = 1;
            var pacc = "";
            var pdone = false;
            for (c in afterPlayersOpen.toIter()) {
              if (not pdone) {
                if (c == '[') {
                  depth := depth + 1;
                  pacc := pacc # Text.fromChar(c);
                } else if (c == ']') {
                  if (depth > 0) depth := depth - 1;
                  if (depth == 0) { pdone := true }
                  else pacc := pacc # Text.fromChar(c);
                } else {
                  pacc := pacc # Text.fromChar(c);
                };
              };
            };
            let playersInner = pacc.trim(#char ' ');
            if (playersInner.size() > 0) {
              let pChunks = playersInner.split(#text "},{").toArray();
              let pObjects = pChunks.map(func(chunk) {
                var s = chunk.trim(#char ' ');
                if (not s.startsWith(#char '{')) s := "{" # s;
                if (not s.endsWith(#char '}')) s := s # "}";
                s
              });
              for (pObj in pObjects.values()) {
                let pnameOpt = switch (jsonGetField(pObj, "full_name")) {
                  case (?n) ?n;
                  case null jsonGetField(pObj, "name");
                };
                switch pnameOpt {
                  case null {};
                  case (?pname) {
                    let pos = switch (jsonGetField(pObj, "position")) {
                      case (?p) mapPosition(p);
                      case null #Bakspiller;
                    };
                    let jerseyNum = switch (jsonGetField(pObj, "shirt_number")) {
                      case null null;
                      case (?n) Nat.fromText(n);
                    };
                    newPlayers.add({
                      id = playerIdCounter;
                      name = pname;
                      slug = slugify(pname);
                      teamId = localId;
                      position = pos;
                      jerseyNumber = jerseyNum;
                      imageUrl = null;
                      nationality = null;
                      isActive = true;
                    });
                    playerIdCounter := playerIdCounter + 1;
                  };
                };
              };
            };
          };
        };
        case _ {};
      };
    };

    let teamsLoaded = newTeams.size();
    let playersFromTeams = newPlayers.size();

    // If we loaded 0 players from the teams endpoint (API didn't embed them),
    // leave existing state intact and return failure
    if (playersFromTeams == 0) {
      return (false, "Profixio svarte men returnerte ingen spillere fra /teams?playerList=1 — beholder eksisterende data", 0);
    };

    // We have real players — now build a temporary season stats list
    let newSeasonStats = List.empty<Types.PlayerSeasonStats>();
    var seasonStatsId : Nat = 10000; // offset to avoid collisions with seed IDs

    // 2. Fetch player stats to enrich season stats — try multiple endpoints with fuzzy matching
    let (profApplied, _profUrl) = await tryProfixioPlayerStats(newPlayers, newSeasonStats);
    seasonStatsId += profApplied;

    // 3. Fetch matches (paginated) into temp list
    let newMatchesList = List.empty<Types.Match>();
    let matchObjects = await fetchAllPages("/tournaments/" # TOURNAMENT_ID # "/matches");
    var matchIdCounter : Nat = 1;
    for (mObj in matchObjects.values()) {
      let homeTeamObj = jsonGetObject(mObj, "home_team");
      let awayTeamObj = jsonGetObject(mObj, "away_team");

      let homeIdOpt = switch homeTeamObj {
        case null null;
        case (?obj) jsonGetField(obj, "id");
      };
      let awayIdOpt = switch awayTeamObj {
        case null null;
        case (?obj) jsonGetField(obj, "id");
      };

      switch (homeIdOpt, awayIdOpt) {
        case (?homeId, ?awayId) {
          let localHome = switch (profixioTeamToLocal.get(homeId)) { case (?id) id; case null 0 };
          let localAway = switch (profixioTeamToLocal.get(awayId)) { case (?id) id; case null 0 };
          if (localHome > 0 and localAway > 0) {
            let startTime : Int = switch (jsonGetField(mObj, "match_date")) {
              case null Time.now();
              case (?dateStr) switch (parseDateToNanos(dateStr)) {
                case (?t) t;
                case null Time.now();
              };
            };
            let resultHome = jsonGetField(mObj, "result_home");
            let resultAway = jsonGetField(mObj, "result_away");
            let hasResult = switch (resultHome, resultAway) {
              case (?rh, ?ra) rh != "null" and ra != "null" and rh != "" and ra != "";
              case _ false;
            };
            let status : Types.MatchStatus =
              if (hasResult) #Finished
              else if (startTime < Time.now()) #Finished
              else #Upcoming;
            newMatchesList.add({
              id = matchIdCounter;
              homeTeamId = localHome;
              awayTeamId = localAway;
              startTime;
              venue = jsonGetField(mObj, "arena");
              status;
              competition = "REMA 1000-ligaen";
            });
            matchIdCounter := matchIdCounter + 1;
          };
        };
        case _ {};
      };
    };

    // Only replace teams/players if Profixio returned a full roster (≥ 100 players).
    // If we got fewer, it means the API returned partial or empty data — keep the
    // existing seed roster so the app never ends up with zero players.
    // NOTE: We intentionally KEEP playerMatchStats and playerSeasonStats from seed data
    // and then overwrite season stats for players we found in Profixio.
    if (newPlayers.size() >= 100) {
      state.teams.clear();
      state.players.clear();
      state.matches.clear();
      state.nextId.clear();
      state.teams.addAll(newTeams.values());
      state.players.addAll(newPlayers.values());
      state.matches.addAll(newMatchesList.values());
    } else {
      // Partial Profixio data — ensure seed data is present
      if (state.players.size() < 100) {
        HandballLib.forceInitSeedData(state);
      };
    };

    // Merge Profixio season stats: overwrite existing entries, add new ones
    for (newStat in newSeasonStats.values()) {
      mergeSeasonStat(state.playerSeasonStats, newStat);
    };

    // Re-apply confirmed overrides so Profixio data never clobbers known-good stats
    HandballLib.applySeasonStatsOverrides(state);

    let playersLoaded = state.players.size();
    let matchesLoaded = state.matches.size();
    let statsLoaded = newSeasonStats.size();

    let msg = "Profixio live data lastet: " # teamsLoaded.toText() # " lag, " #
              playersLoaded.toText() # " spillere, " # matchesLoaded.toText() # " kamper, " #
              statsLoaded.toText() # " spillere med ekte statistikk fra Profixio API";
    (true, msg, statsLoaded)
  };

  // ─── Main refresh entry point ──────────────────────────────────────────────

  public func refreshFromProfixio(
    state : HandballLib.State,
    cache : ProfixioTypes.ProfixioCache,
  ) : async Text {

    // 1. Verify API key with /userinfo
    let (uiStatus, _uiBodyOpt) = await fetchJsonWithStatus("/userinfo");

    if (uiStatus == 0) {
      cache.isLive := false;
      cache.dataSource := "mock";
      cache.liveStatsCount := 0;
      // Always ensure we have full seed data when API is unreachable
      if (state.players.size() < 100) HandballLib.forceInitSeedData(state);
      cache.lastMessage := "Profixio API utilgjengelig — bruker mock-data med ekte spillernavn (" # state.players.size().toText() # " spillere)";
      return cache.lastMessage;
    };

    if (uiStatus == 401 or uiStatus == 403) {
      cache.isLive := false;
      cache.dataSource := "mock";
      cache.liveStatsCount := 0;
      if (state.players.size() < 100) HandballLib.forceInitSeedData(state);
      cache.lastMessage := "Profixio API feil " # uiStatus.toText() # " — bruker mock-data med ekte spillernavn (" # state.players.size().toText() # " spillere)";
      return cache.lastMessage;
    };

    if (uiStatus < 200 or uiStatus >= 300) {
      cache.isLive := false;
      cache.dataSource := "mock";
      cache.liveStatsCount := 0;
      if (state.players.size() < 100) HandballLib.forceInitSeedData(state);
      cache.lastMessage := "Profixio API feil " # uiStatus.toText() # " — bruker mock-data med ekte spillernavn (" # state.players.size().toText() # " spillere)";
      return cache.lastMessage;
    };

    // 2. Load tournament data (tournament 436336 = REMA 1000-ligaen kvinner 2025/2026)
    let (ok, msg, statsLoaded) = await loadTournamentData(state);

    if (ok) {
      cache.isLive := true;
      cache.dataSource := "live";
      cache.liveStatsCount := statsLoaded;
      cache.lastSync := ?Time.now();
      cache.lastMessage := msg;
    } else {
      // Profixio responded but data was incomplete — scrape handball.no table/standings only
      let scraped = await tryScrapeAndLoad(state, cache);
      if (not scraped) {
        // Scraping also failed — fall back to seed data unconditionally
        HandballLib.forceInitSeedData(state);
        cache.dataSource := "mock";
        cache.isLive := false;
        cache.liveStatsCount := 0;
        cache.lastSync := ?Time.now();
        cache.lastMessage := msg # " — scraping feilet, bruker mock-data (" # state.players.size().toText() # " spillere)";
      };
    };

    // Safety guard: no matter what happened above, ensure we always have players
    if (state.players.size() < 10) {
      HandballLib.forceInitSeedData(state);
      cache.dataSource := "mock";
      cache.isLive := false;
      cache.liveStatsCount := 0;
      cache.lastMessage := "Advarsel: ingen spillerdata etter refresh — lastet seed-data (" # state.players.size().toText() # " spillere)";
    };

    cache.lastMessage
  };

  // ─── refreshPlayerStats: stats-only refresh, never wipes players ──────────

  func tryScrapeAndLoad(
    state : HandballLib.State,
    cache : ProfixioTypes.ProfixioCache,
  ) : async Bool {
    let data = await HandballScraper.scrape();

    // Need at least 2 teams to be useful
    if (data.teams.size() < 2) {
      return false;
    };

    // Build team name → local ID map into temp lists
    let newTeams = List.empty<Types.Team>();
    let newMatches = List.empty<Types.Match>();
    let teamNameToId = Map.empty<Text, Nat>();
    var teamIdCounter : Nat = 1;

    for (scrapedTeam in data.teams.values()) {
      let localId = teamIdCounter;
      teamIdCounter := teamIdCounter + 1;
      teamNameToId.add(scrapedTeam.name, localId);
      newTeams.add({
        id = localId;
        name = scrapedTeam.name;
        slug = slugify(scrapedTeam.name);
        logoUrl = null;
        standingsRank = ?scrapedTeam.rank;
        matchesPlayed = scrapedTeam.matchesPlayed;
        points = scrapedTeam.points;
        goalDifference = switch (scrapedTeam.goalsFor, scrapedTeam.goalsAgainst) {
          case (?gf, ?ga) ?(gf.toInt() - ga.toInt());
          case _ null;
        };
      });
    };

    // Build matches into temp list
    var matchIdCounter : Nat = 1;
    for (scrapedMatch in data.matches.values()) {
      let homeIdOpt = teamNameToId.get(scrapedMatch.homeTeam);
      let awayIdOpt = teamNameToId.get(scrapedMatch.awayTeam);
      switch (homeIdOpt, awayIdOpt) {
        case (?homeId, ?awayId) {
          newMatches.add({
            id = matchIdCounter;
            homeTeamId = homeId;
            awayTeamId = awayId;
            startTime = Time.now(); // scraper doesn't reliably parse dates
            venue = null;
            status = if (scrapedMatch.isFinished) #Finished else #Upcoming;
            competition = "REMA 1000-ligaen";
          });
          matchIdCounter := matchIdCounter + 1;
        };
        case _ {};
      };
    };

    // Only clear and replace team/match state — preserve players (seed data)
    state.teams.clear();
    state.matches.clear();
    state.teams.addAll(newTeams.values());
    state.matches.addAll(newMatches.values());

    let teamsLoaded = state.teams.size();
    let matchesLoaded = state.matches.size();

    // Update season goals for top scorers using fuzzy name matching
    var scorersApplied = 0;
    for (scorer in data.topScorers.values()) {
      switch (findPlayerByName(state.players, scorer.playerName)) {
        case null {};
        case (?player) {
          let existingIdx = state.playerSeasonStats.findIndex(func(s) { s.playerId == player.id });
          switch existingIdx {
            case null {
              state.playerSeasonStats.add({
                id = 20000 + player.id;
                playerId = player.id;
                season = "2025-26";
                matchesPlayed = 0;
                totalMinutes = null;
                totalGoals = ?scorer.goals;
                totalShots = null;
                totalYellowCards = null;
                totalTwoMin = null;
                totalRedCards = null;
                totalAssists = null;
                totalSaves = null;
                shootingPercent = null;
                goalsPerGame = null;
                fieldGoals = null;
                fieldShots = null;
                fieldGoalPercent = null;
                goals7m = null;
                shots7m = null;
                percent7m = null;
                assistsPerGame = null;
                technicalFaults = null;
                provoked7m = null;
                awarded7m = null;
                mepAvg = null;
                mepTotal = null;
              });
            };
            case (?i) {
              let old = state.playerSeasonStats.at(i);
              state.playerSeasonStats.put(i, { old with totalGoals = ?scorer.goals });
            };
          };
          scorersApplied += 1;
        };
      };
    };

    cache.isLive := false;
    cache.dataSource := "scraped";
    cache.liveStatsCount := scorersApplied;
    cache.lastSync := ?Time.now();
    cache.lastMessage := "Scraped data fra handball.no (Profixio API utilgjengelig): " #
      teamsLoaded.toText() # " lag, " # matchesLoaded.toText() # " kamper, " #
      scorersApplied.toText() # " toppscorere med ekte mål-statistikk";

    // Re-apply confirmed overrides so scraping never clobbers known-good stats
    HandballLib.applySeasonStatsOverrides(state);

    true
  };
};
