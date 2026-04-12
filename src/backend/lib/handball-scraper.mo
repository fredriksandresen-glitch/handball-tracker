import Nat "mo:core/Nat";
import Text "mo:core/Text";
import List "mo:core/List";

module {

  // ─── Scraped data types ────────────────────────────────────────────────────

  public type ScrapedTeam = {
    name : Text;
    matchesPlayed : ?Nat;
    wins : ?Nat;
    draws : ?Nat;
    losses : ?Nat;
    goalsFor : ?Nat;
    goalsAgainst : ?Nat;
    points : ?Nat;
    rank : Nat;
  };

  public type ScrapedMatch = {
    homeTeam : Text;
    awayTeam : Text;
    homeScore : ?Nat;
    awayScore : ?Nat;
    dateText : Text;
    isFinished : Bool;
  };

  public type ScrapedTopScorer = {
    playerName : Text;
    teamName : Text;
    goals : Nat;
    rank : Nat;
  };

  public type ScrapedData = {
    teams : [ScrapedTeam];
    matches : [ScrapedMatch];
    topScorers : [ScrapedTopScorer];
  };

  let emptyScrapedData : ScrapedData = { teams = []; matches = []; topScorers = [] };

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

  let HANDBALL_URL : Text = "https://www.handball.no/system/kamper/turnering/?turnid=436336";

  // ─── Fetch HTML from handball.no ──────────────────────────────────────────

  public func fetchHandballPage() : async ?Text {
    let request : HttpRequestArgs = {
      url = HANDBALL_URL;
      max_response_bytes = ?(500_000 : Nat64);
      method = #get;
      headers = [
        { name = "Accept"; value = "text/html,application/xhtml+xml" },
        { name = "Accept-Language"; value = "no,nb;q=0.9,en;q=0.8" },
      ];
      body = null;
      transform = null;
      is_replicated = ?false;
    };
    try {
      let response = await (with cycles = 500_000_000) ic.http_request(request);
      if (response.status >= 200 and response.status < 300) {
        response.body.decodeUtf8()
      } else {
        null
      }
    } catch (_e) {
      null
    }
  };

  // ─── Text helpers ─────────────────────────────────────────────────────────

  // Strip all HTML tags from a string (remove <...>)
  func stripTags(s : Text) : Text {
    var result = "";
    var inTag = false;
    for (c in s.toIter()) {
      if (c == '<') {
        inTag := true;
      } else if (c == '>') {
        inTag := false;
      } else if (not inTag) {
        result := result # Text.fromChar(c);
      };
    };
    result
  };

  // Trim whitespace and decode common HTML entities
  func cleanCell(s : Text) : Text {
    let stripped = stripTags(s);
    let noAmp = stripped.replace(#text "&amp;", "&");
    let noNbsp = noAmp.replace(#text "&nbsp;", " ");
    let noShy = noNbsp.replace(#text "&shy;", "");
    noShy.trim(#predicate (func(c) { c == ' ' or c == '\n' or c == '\r' or c == '\t' }))
  };

  // Find first occurrence of needle in haystack, return index or null
  func indexOf(haystack : Text, needle : Text) : ?Nat {
    let hs = haystack.size();
    let ns = needle.size();
    if (ns == 0 or hs < ns) return null;
    let hsArr = haystack.toArray();
    let nsArr = needle.toArray();
    var i = 0;
    label search while (i + ns <= hs) {
      var match = true;
      var j = 0;
      while (j < ns) {
        if (hsArr[i + j] != nsArr[j]) {
          match := false;
        };
        j := j + 1;
      };
      if (match) return ?i;
      i := i + 1;
    };
    null
  };

  // Extract substring [from, to)
  func substring(s : Text, from : Nat, to : Nat) : Text {
    let arr = s.toArray();
    let len = arr.size();
    if (from >= len or to <= from) return "";
    let endIdx = if (to > len) len else to;
    var result = "";
    var i = from;
    while (i < endIdx) {
      result := result # Text.fromChar(arr[i]);
      i := i + 1;
    };
    result
  };

  // Extract text between two markers
  func between(s : Text, startMarker : Text, endMarker : Text) : ?Text {
    switch (indexOf(s, startMarker)) {
      case null null;
      case (?startIdx) {
        let afterStart = startIdx + startMarker.size();
        let rest = substring(s, afterStart, s.size());
        switch (indexOf(rest, endMarker)) {
          case null null;
          case (?endIdx) ?substring(rest, 0, endIdx);
        };
      };
    }
  };

  // Parse Nat from trimmed text
  func parseNat(s : Text) : ?Nat {
    let trimmed = s.trim(#predicate (func(c) { c == ' ' or c == '\n' or c == '\r' or c == '\t' }));
    Nat.fromText(trimmed)
  };

  // ─── Standings table parser ────────────────────────────────────────────────

  func parseStandings(html : Text) : [ScrapedTeam] {
    let teams = List.empty<ScrapedTeam>();

    // Find the standings table — look for table near "stilling" or "tabell"
    let tableSectionOpt : ?Text = switch (indexOf(html, "stilling")) {
      case (?idx) {
        let fromHere = substring(html, idx, html.size());
        between(fromHere, "<table", "</table>")
      };
      case null switch (indexOf(html, "tabell")) {
        case (?idx) {
          let fromHere = substring(html, idx, html.size());
          between(fromHere, "<table", "</table>")
        };
        case null between(html, "<table", "</table>");
      };
    };

    let tableHtml = switch tableSectionOpt {
      case null return [];
      case (?t) t;
    };

    let rows = tableHtml.split(#text "<tr").toArray();
    var rank = 0;

    for (row in rows.values()) {
      let cells = row.split(#text "<td").toArray();
      if (cells.size() >= 3) {
        let cellValues = List.empty<Text>();
        var ci = 1; // skip part before first <td
        while (ci < cells.size()) {
          let raw = cells[ci];
          let content = switch (between(raw, ">", "</td")) {
            case null switch (between(raw, ">", "<")) {
              case null "";
              case (?v) cleanCell(v);
            };
            case (?v) cleanCell(v);
          };
          cellValues.add(content);
          ci := ci + 1;
        };

        let cv = cellValues.toArray();
        if (cv.size() >= 2) {
          let firstCell = cv[0];
          switch (parseNat(firstCell)) {
            case (?r) {
              rank := r;
              let teamName = cv[1];
              if (teamName.size() > 0 and teamName != "Lag" and teamName != "Team") {
                let mp = if (cv.size() > 2) parseNat(cv[2]) else null;
                let wins = if (cv.size() > 3) parseNat(cv[3]) else null;
                let draws = if (cv.size() > 4) parseNat(cv[4]) else null;
                let losses = if (cv.size() > 5) parseNat(cv[5]) else null;
                let pts = if (cv.size() > 2) parseNat(cv[cv.size() - 1]) else null;
                let (gf, ga) : (?Nat, ?Nat) = if (cv.size() > 6) {
                  let goalsCell = cv[6];
                  switch (indexOf(goalsCell, "-")) {
                    case (?dashIdx) {
                      let gfStr = substring(goalsCell, 0, dashIdx);
                      let gaStr = substring(goalsCell, dashIdx + 1, goalsCell.size());
                      (parseNat(gfStr), parseNat(gaStr))
                    };
                    case null {
                      let gfVal = parseNat(goalsCell);
                      let gaVal = if (cv.size() > 7) parseNat(cv[7]) else null;
                      (gfVal, gaVal)
                    };
                  }
                } else (null, null);

                teams.add({
                  name = teamName;
                  matchesPlayed = mp;
                  wins;
                  draws;
                  losses;
                  goalsFor = gf;
                  goalsAgainst = ga;
                  points = pts;
                  rank;
                });
              };
            };
            case null {}; // header or non-data row
          };
        };
      };
    };

    teams.toArray()
  };

  // ─── Match results parser ─────────────────────────────────────────────────

  func parseMatches(html : Text) : [ScrapedMatch] {
    let matches = List.empty<ScrapedMatch>();
    let rows = html.split(#text "<tr").toArray();

    for (row in rows.values()) {
      let cells = row.split(#text "<td").toArray();
      if (cells.size() >= 3) {
        let cellValues = List.empty<Text>();
        var ci = 1;
        while (ci < cells.size()) {
          let raw = cells[ci];
          let content = switch (between(raw, ">", "</td")) {
            case null "";
            case (?v) cleanCell(v);
          };
          if (content.size() > 0) cellValues.add(content);
          ci := ci + 1;
        };

        let cv = cellValues.toArray();
        // Find cell index with a score pattern using ?Nat
        var scoreCellIdxOpt : ?Nat = null;
        var scoreCell = "";
        var k = 0;
        while (k < cv.size()) {
          if (looksLikeScore(cv[k])) {
            scoreCellIdxOpt := ?k;
            scoreCell := cv[k];
          };
          k := k + 1;
        };

        switch scoreCellIdxOpt {
          case null {};
          case (?sci) {
            if (sci >= 1 and sci < cv.size()) {
              let homeTeam = cv[sci - 1];
              let awayTeam = if (sci + 1 < cv.size()) cv[sci + 1] else "";
              let dateText = if (cv.size() > 0) cv[0] else "";

              if (homeTeam.size() > 0 and awayTeam.size() > 0) {
                let (homeScore, awayScore) = parseScore(scoreCell);
                let isFinished = switch homeScore { case (?_) true; case null false };
                matches.add({
                  homeTeam;
                  awayTeam;
                  homeScore;
                  awayScore;
                  dateText;
                  isFinished;
                });
              };
            };
          };
        };
      };
    };

    matches.toArray()
  };

  // Check if a cell looks like a score "X - Y" or "X-Y"
  func looksLikeScore(s : Text) : Bool {
    let trimmed = s.trim(#predicate (func(c) { c == ' ' }));
    if (trimmed.size() < 3 or trimmed.size() > 10) return false;
    if (not trimmed.contains(#char '-')) return false;
    var digitCount = 0;
    var nonDigitNonSep = 0;
    for (c in trimmed.toIter()) {
      if (c >= '0' and c <= '9') {
        digitCount := digitCount + 1;
      } else if (c != '-' and c != ' ') {
        nonDigitNonSep := nonDigitNonSep + 1;
      };
    };
    digitCount >= 2 and nonDigitNonSep == 0
  };

  // Parse a score like "25 - 22" or "25-22" into (?Nat, ?Nat)
  func parseScore(s : Text) : (?Nat, ?Nat) {
    let clean = s.replace(#text " ", "");
    switch (indexOf(clean, "-")) {
      case null (null, null);
      case (?dashIdx) {
        let homeStr = substring(clean, 0, dashIdx);
        let awayStr = substring(clean, dashIdx + 1, clean.size());
        (parseNat(homeStr), parseNat(awayStr))
      };
    }
  };

  // ─── Top scorers parser ───────────────────────────────────────────────────

  func parseTopScorers(html : Text) : [ScrapedTopScorer] {
    let scorers = List.empty<ScrapedTopScorer>();

    // Find topscore section
    let topscoreIdx : ?Nat = switch (indexOf(html, "topscore")) {
      case (?i) ?i;
      case null switch (indexOf(html, "toppscorer")) {
        case (?i) ?i;
        case null indexOf(html, "Toppscorer");
      };
    };

    let topscoreSection = switch topscoreIdx {
      case null return [];
      case (?idx) substring(html, idx, idx + 10000);
    };

    let tableHtml = switch (between(topscoreSection, "<table", "</table>")) {
      case null return [];
      case (?t) t;
    };

    let rows = tableHtml.split(#text "<tr").toArray();
    var rank = 0;

    for (row in rows.values()) {
      let cells = row.split(#text "<td").toArray();
      if (cells.size() >= 3) {
        let cellValues = List.empty<Text>();
        var ci = 1;
        while (ci < cells.size()) {
          let raw = cells[ci];
          let content = switch (between(raw, ">", "</td")) {
            case null "";
            case (?v) cleanCell(v);
          };
          cellValues.add(content);
          ci := ci + 1;
        };

        let cv = cellValues.toArray();
        if (cv.size() >= 3) {
          switch (parseNat(cv[0])) {
            case (?r) {
              rank := r;
              let playerName = cv[1];
              let teamName = if (cv.size() > 2) cv[2] else "";
              let goalsStr = if (cv.size() > 3) cv[3] else cv[cv.size() - 1];
              switch (parseNat(goalsStr)) {
                case (?goals) {
                  if (playerName.size() > 0 and goals > 0) {
                    scorers.add({ playerName; teamName; goals; rank });
                  };
                };
                case null {};
              };
            };
            case null {};
          };
        };
      };
    };

    scorers.toArray()
  };

  // ─── Main scrape entry point ───────────────────────────────────────────────

  public func scrape() : async ScrapedData {
    let htmlOpt = await fetchHandballPage();
    switch htmlOpt {
      case null emptyScrapedData;
      case (?html) {
        let teams = parseStandings(html);
        let matches = parseMatches(html);
        let topScorers = parseTopScorers(html);
        { teams; matches; topScorers }
      };
    }
  };

};
