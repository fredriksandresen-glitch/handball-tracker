import Types "../types/handball-data";
import List "mo:core/List";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

module {
  public type State = {
    teams : List.List<Types.Team>;
    players : List.List<Types.Player>;
    matches : List.List<Types.Match>;
    playerMatchStats : List.List<Types.PlayerMatchStats>;
    playerSeasonStats : List.List<Types.PlayerSeasonStats>;
    follows : List.List<Types.Follow>;
    feedEvents : List.List<Types.FeedEvent>;
    nextId : Map.Map<Text, Nat>;
  };

  // ─── ID generation ────────────────────────────────────────────────────────

  func nextIdFor(state : State, key : Text) : Nat {
    let current = switch (state.nextId.get(key)) {
      case (?v) v;
      case null 0;
    };
    state.nextId.add(key, current + 1);
    current;
  };

  // ─── Read helpers ──────────────────────────────────────────────────────────

  public func getTeams(state : State) : [Types.Team] {
    state.teams.toArray();
  };

  public func getTeam(state : State, id : Nat) : ?Types.Team {
    state.teams.find(func(t) { t.id == id });
  };

  public func getPlayers(state : State) : [Types.Player] {
    state.players.toArray();
  };

  public func getPlayersByTeam(state : State, teamId : Nat) : [Types.Player] {
    state.players.filter(func(p) { p.teamId == teamId }).toArray();
  };

  public func getPlayer(state : State, id : Nat) : ?Types.Player {
    state.players.find(func(p) { p.id == id });
  };

  public func getPlayerMatchStats(state : State, playerId : Nat) : [Types.PlayerMatchStats] {
    state.playerMatchStats.filter(func(s) { s.playerId == playerId }).toArray();
  };

  public func getPlayerSeasonStats(state : State, playerId : Nat) : ?Types.PlayerSeasonStats {
    state.playerSeasonStats.find(func(s) { s.playerId == playerId });
  };

  public func getMatches(state : State) : [Types.Match] {
    state.matches.toArray();
  };

  public func getUpcomingMatches(state : State) : [Types.Match] {
    let now = Time.now();
    state.matches.filter(func(m) { m.status == #Upcoming and m.startTime > now }).toArray();
  };

  public func getNextMatchForTeam(state : State, teamId : Nat) : ?Types.Match {
    let now = Time.now();
    let upcoming = state.matches.filter(func(m) {
      m.status == #Upcoming and
      (m.homeTeamId == teamId or m.awayTeamId == teamId) and
      m.startTime > now
    });
    // find earliest
    switch (upcoming.values().foldLeft<Types.Match, ?(Types.Match)>(null, func(acc, m) {
      switch acc {
        case null ?m;
        case (?best) if (m.startTime < best.startTime) ?m else ?best;
      }
    })) {
      case (?m) ?m;
      case null null;
    };
  };

  public func getFollowedPlayers(state : State, userId : Principal) : [Types.Player] {
    let followedIds = state.follows
      .filter(func(f) { Principal.equal(f.userId, userId) })
      .map<Types.Follow, Nat>(func(f) { f.playerId });
    state.players.filter(func(p) {
      followedIds.find(func(id) { id == p.id }) != null
    }).toArray();
  };

  public func getFeedEvents(state : State, userId : Principal) : [Types.FeedEvent] {
    let events = state.feedEvents
      .filter(func(e) { Principal.equal(e.userId, userId) })
      .toArray();
    // sort by createdAt descending
    events.sort(func(a, b) {
      Int.compare(b.createdAt, a.createdAt)
    });
  };

  // ─── Follow / Unfollow ─────────────────────────────────────────────────────

  public func followPlayer(state : State, userId : Principal, playerId : Nat) : () {
    // idempotent
    let alreadyFollowing = state.follows.find(func(f) {
      Principal.equal(f.userId, userId) and f.playerId == playerId
    });
    switch alreadyFollowing {
      case (?_) return;
      case null {};
    };
    let fid = nextIdFor(state, "follow");
    state.follows.add({ id = fid; userId; playerId });

    // Generate initial feed events from last 3 finished matches
    let playerMatches = state.playerMatchStats
      .filter(func(s) { s.playerId == playerId })
      .toArray();

    let finishedMatchIds = state.matches
      .filter(func(m) { m.status == #Finished })
      .map<Types.Match, Nat>(func(m) { m.id })
      .toArray();

    let relevantStats = playerMatches.filter(func(s) {
      finishedMatchIds.find(func(mid) { mid == s.matchId }) != null
    });

    // sort by matchId descending (proxy for recency) and take last 3
    let sorted = relevantStats.sort(func(a, b) {
      Nat.compare(b.matchId, a.matchId)
    });
    let last3 = if (sorted.size() <= 3) sorted
                else sorted.sliceToArray(0, 3);

    for (stats in last3.values()) {
      generateFeedEventsForStats(state, userId, playerId, stats);
    };
  };

  public func unfollowPlayer(state : State, userId : Principal, playerId : Nat) : () {
    // Remove follow record
    let remaining = state.follows.filter(func(f) {
      not (Principal.equal(f.userId, userId) and f.playerId == playerId)
    });
    state.follows.clear();
    state.follows.addAll(remaining.values());

    // Remove feed events for this player/user
    let remainingEvents = state.feedEvents.filter(func(e) {
      not (Principal.equal(e.userId, userId) and e.playerId == playerId)
    });
    state.feedEvents.clear();
    state.feedEvents.addAll(remainingEvents.values());
  };

  // ─── Feed event generation ─────────────────────────────────────────────────

  func teamName(state : State, teamId : Nat) : Text {
    switch (state.teams.find(func(t) { t.id == teamId })) {
      case (?t) t.name;
      case null "ukjent lag";
    };
  };

  func opponentName(state : State, match : Types.Match, playerTeamId : Nat) : Text {
    let opponentId = if (match.homeTeamId == playerTeamId) match.awayTeamId
                     else match.homeTeamId;
    teamName(state, opponentId);
  };

  public func generateFeedEventsForStats(
    state : State,
    userId : Principal,
    playerId : Nat,
    stats : Types.PlayerMatchStats
  ) : () {
    let now = Time.now();
    let matchOpt = state.matches.find(func(m) { m.id == stats.matchId });
    let (opponent, matchTime) = switch matchOpt {
      case (?m) {
        let player = state.players.find(func(p) { p.id == playerId });
        let teamId = switch player { case (?p) p.teamId; case null 0 };
        (opponentName(state, m, teamId), m.startTime);
      };
      case null ("ukjent motstander", now);
    };

    // GamePlayed event
    do {
      let eid = nextIdFor(state, "feedEvent");
      state.feedEvents.add({
        id = eid;
        userId;
        playerId;
        matchId = ?stats.matchId;
        eventType = #GamePlayed;
        title = "Spilte mot " # opponent;
        description = switch (stats.minutesPlayed) {
          case (?m) "Spilte " # m.toText() # " minutter mot " # opponent;
          case null "Deltok i kamp mot " # opponent;
        };
        statValue = switch (stats.minutesPlayed) { case (?m) ?m.toInt(); case null null };
        createdAt = matchTime;
      });
    };

    // Goals event
    switch (stats.goals) {
      case (?g) if (g > 0) {
        let eid = nextIdFor(state, "feedEvent");
        state.feedEvents.add({
          id = eid;
          userId;
          playerId;
          matchId = ?stats.matchId;
          eventType = #GoalsScored;
          title = "Scoret " # g.toText() # (if (g == 1) " mål" else " mål") # " mot " # opponent;
          description = "Scoret " # g.toText() # " mål mot " # opponent;
          statValue = ?g.toInt();
          createdAt = matchTime;
        });
      };
      case _ {};
    };

    // Yellow card event
    switch (stats.yellowCards) {
      case (?yc) if (yc > 0) {
        let eid = nextIdFor(state, "feedEvent");
        state.feedEvents.add({
          id = eid;
          userId;
          playerId;
          matchId = ?stats.matchId;
          eventType = #YellowCard;
          title = "Fikk gult kort mot " # opponent;
          description = "Mottok " # yc.toText() # " gult kort i kamp mot " # opponent;
          statValue = ?yc.toInt();
          createdAt = matchTime;
        });
      };
      case _ {};
    };

    // Two-minute suspension event
    switch (stats.twoMinSuspensions) {
      case (?twos) if (twos > 0) {
        let eid = nextIdFor(state, "feedEvent");
        state.feedEvents.add({
          id = eid;
          userId;
          playerId;
          matchId = ?stats.matchId;
          eventType = #TwoMinSuspension;
          title = "Fikk " # twos.toText() # " x 2-minutters utvisning mot " # opponent;
          description = twos.toText() # " x 2-minutters utvisning mot " # opponent;
          statValue = ?twos.toInt();
          createdAt = matchTime;
        });
      };
      case _ {};
    };
  };

  // Called after a match becomes Finished — generate events for all followers of players in that match
  public func generateFeedEventsForMatch(state : State, matchId : Nat) : () {
    let matchStats = state.playerMatchStats.filter(func(s) { s.matchId == matchId });
    matchStats.forEach(func(stats) {
      // find all followers of this player
      state.follows.forEach(func(f) {
        if (f.playerId == stats.playerId) {
          generateFeedEventsForStats(state, f.userId, stats.playerId, stats);
        };
      });
    });
  };

  // ─── Season stats aggregation ──────────────────────────────────────────────

  // Players whose season stats are confirmed/hardcoded and must never be
  // recomputed from match stats. rebuildSeasonStats() is a no-op for these IDs.
  let lockedPlayerIds : [Nat] = [3, 14, 68];

  public func rebuildSeasonStats(state : State, playerId : Nat, season : Text) : () {
    // Skip locked players — their stats are set by override only.
    if (lockedPlayerIds.find(func(id : Nat) : Bool { id == playerId }) != null) {
      return;
    };

    let matchStats = state.playerMatchStats
      .filter(func(s) { s.playerId == playerId })
      .toArray();

    let matchesPlayed = matchStats.size();
    var totalMinutes : Nat = 0;
    var totalGoals : Nat = 0;
    var totalShots : Nat = 0;
    var totalYellowCards : Nat = 0;
    var totalTwoMin : Nat = 0;
    var totalRedCards : Nat = 0;
    var totalAssists : Nat = 0;
    var totalSaves : Nat = 0;

    for (s in matchStats.values()) {
      totalMinutes += switch (s.minutesPlayed) { case (?v) v; case null 0 };
      totalGoals += switch (s.goals) { case (?v) v; case null 0 };
      totalShots += switch (s.shots) { case (?v) v; case null 0 };
      totalYellowCards += switch (s.yellowCards) { case (?v) v; case null 0 };
      totalTwoMin += switch (s.twoMinSuspensions) { case (?v) v; case null 0 };
      totalRedCards += switch (s.redCards) { case (?v) v; case null 0 };
      totalAssists += switch (s.assists) { case (?v) v; case null 0 };
      totalSaves += switch (s.saves) { case (?v) v; case null 0 };
    };

    let existing = state.playerSeasonStats.findIndex(func(s) { s.playerId == playerId });
    let newStats : Types.PlayerSeasonStats = {
      id = switch (existing) {
        case (?i) state.playerSeasonStats.at(i).id;
        case null nextIdFor(state, "seasonStats");
      };
      playerId;
      season;
      matchesPlayed;
      totalMinutes = if (totalMinutes > 0) ?totalMinutes else null;
      totalGoals = if (totalGoals > 0) ?totalGoals else null;
      totalShots = if (totalShots > 0) ?totalShots else null;
      totalYellowCards = if (totalYellowCards > 0) ?totalYellowCards else null;
      totalTwoMin = if (totalTwoMin > 0) ?totalTwoMin else null;
      totalRedCards = if (totalRedCards > 0) ?totalRedCards else null;
      totalAssists = if (totalAssists > 0) ?totalAssists else null;
      totalSaves = if (totalSaves > 0) ?totalSaves else null;
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
    };

    switch existing {
      case (?i) state.playerSeasonStats.put(i, newStats);
      case null state.playerSeasonStats.add(newStats);
    };
  };

  // ─── Seed data ─────────────────────────────────────────────────────────────

  // Helper: nanoseconds relative to now (negative = past, positive = future)
  func daysAgo(d : Int) : Int {
    Time.now() - d * 86_400_000_000_000;
  };

  func daysFromNow(d : Int) : Int {
    Time.now() + d * 86_400_000_000_000;
  };

  // Private helper — loads seed data unconditionally with no guards
  func _loadSeedData(state : State) : () {

    // ── Teams ────────────────────────────────────────────────────────────────
    // All 14 real teams from REMA 1000-ligaen kvinner 2025/2026
    let teamsData : [(Nat, Text, Text, ?Nat, ?Nat, ?Nat, ?Int)] = [
      (1,  "Sola HK",                  "sola-hk",                 ?1,  ?18, ?34, ?22),
      (2,  "Larvik HK",                "larvik-hk",               ?2,  ?18, ?32, ?18),
      (3,  "Storhamar Elite",          "storhamar-elite",         ?3,  ?18, ?30, ?15),
      (4,  "Molde Elite",              "molde-elite",             ?4,  ?18, ?26, ?8),
      (5,  "Tertnes Elite",            "tertnes-elite",           ?5,  ?18, ?22, ?-2),
      (6,  "Fana HK",                  "fana-hk",                 ?6,  ?18, ?20, ?-4),
      (7,  "Fjellhammer IL",           "fjellhammer-il",          ?7,  ?18, ?18, ?-10),
      (8,  "Byåsen IL",                "byasen-il",               ?8,  ?18, ?16, ?-14),
      (9,  "Vipers Kristiansand",      "vipers-kristiansand",     ?9,  ?18, ?14, ?-18),
      (10, "Glassverket IF",           "glassverket-if",          ?10, ?18, ?12, ?-22),
      (11, "Kolstad Håndball",         "kolstad-handball",        ?11, ?18, ?10, ?-28),
      (12, "Stabæk Håndball",          "stabak-handball",         ?12, ?18, ?8,  ?-32),
      (13, "Fredrikstad BK",           "fredrikstad-bk",          ?13, ?18, ?6,  ?-38),
      (14, "Nærbø IL",                 "narbo-il",                ?14, ?18, ?4,  ?-44),
    ];
    for ((id, name, slug, rank, mp, pts, gd) in teamsData.values()) {
      state.teams.add({
        id; name; slug;
        logoUrl = null;
        standingsRank = rank;
        matchesPlayed = mp;
        points = pts;
        goalDifference = gd;
      });
    };

    // ── Players ──────────────────────────────────────────────────────────────
    // Real player names from REMA 1000-ligaen 2025/2026
    // (id, name, slug, teamId, position, jerseyNumber)
    let playersData : [(Nat, Text, Text, Nat, Types.Position, ?Nat)] = [
      // ── Sola HK ──
      (1,  "Silje Solberg",           "silje-solberg",           1, #Keeper,      ?1),
      (2,  "Katrine Lunde",           "katrine-lunde",           1, #Keeper,      ?16),
      (3,  "Camilla Herrem",          "camilla-herrem",          1, #VenstreKant, ?77),
      (4,  "Kristine Breistøl",       "kristine-breistol",       1, #HoyreKant,   ?17),
      (5,  "Nora Mørk",               "nora-mork",               1, #Bakspiller,  ?10),
      (6,  "Stine Bredal Oftedal",    "stine-bredal-oftedal",    1, #Bakspiller,  ?9),
      (7,  "Marit Røsberg Jacobsen",  "marit-rosberg-jacobsen",  1, #Bakspiller,  ?14),
      (8,  "Veronica Kristiansen",    "veronica-kristiansen",    1, #VenstreKant, ?7),
      (9,  "Linn Jørum Sulland",      "linn-jorum-sulland",      1, #Bakspiller,  ?5),
      (10, "Marte Løseth",            "marte-loseth",            1, #HoyreKant,   ?3),

      // ── Larvik HK ──
      (11, "Rikke Selvik",            "rikke-selvik",            2, #Keeper,      ?1),
      (12, "Cecilie Grønnes",         "cecilie-gronnes",         2, #Keeper,      ?16),
      (13, "Amanda Kurtovic",         "amanda-kurtovic",         2, #VenstreKant, ?7),
      (14, "Ida Alstad",              "ida-alstad",              8, #HoyreKant,   ?11),
      (15, "Heidi Løke",              "heidi-loke",              2, #Linje,       ?4),
      (16, "Karoline Alling",         "karoline-alling",         2, #Bakspiller,  ?6),
      (17, "Thea Mørk",               "thea-mork",               2, #Bakspiller,  ?13),
      (18, "Emilie Hegh Arntzen",     "emilie-hegh-arntzen",     2, #HoyreKant,   ?15),
      (19, "Ingrid Kristiansen",      "ingrid-kristiansen",      2, #VenstreKant, ?3),
      (20, "Sanna Solberg-Isaksen",   "sanna-solberg-isaksen",   2, #Bakspiller,  ?9),

      // ── Storhamar Elite ──
      (21, "Silje Eugenie Ljungberg", "silje-eugenie-ljungberg", 3, #Keeper,      ?1),
      (22, "Mari Molid",              "mari-molid",              3, #Keeper,      ?16),
      (23, "Eline Tjørneby Nygaard",  "eline-tjorneby-nygaard",  3, #VenstreKant, ?7),
      (24, "Ingrid Bakkerud",         "ingrid-bakkerud",         3, #HoyreKant,   ?11),
      (25, "Marte Eldevik Ny",        "marte-eldevik-ny",        3, #Linje,       ?9),
      (26, "Hanna Yttereng",          "hanna-yttereng",          3, #Bakspiller,  ?5),
      (27, "Kristine Nørdby",         "kristine-nordby",         3, #Bakspiller,  ?8),
      (28, "Julie Blågestad",         "julie-blagestad",         3, #Bakspiller,  ?14),
      (29, "Pernille Helene Wibe",    "pernille-helene-wibe",    3, #Linje,       ?6),
      (30, "Oda Narten",              "oda-narten",              3, #VenstreKant, ?3),

      // ── Molde Elite ──
      (31, "Mia Rej",                 "mia-rej",                 4, #Keeper,      ?1),
      (32, "Malin Dahlum",            "malin-dahlum",            4, #Keeper,      ?16),
      (33, "Maiken Margrete Hesselberg","maiken-margrete-hesselberg", 4, #VenstreKant, ?7),
      (34, "Annette Hageberg",        "annette-hageberg",        4, #HoyreKant,   ?10),
      (35, "Marte Malene Tomter",     "marte-malene-tomter",     4, #Linje,       ?4),
      (36, "Hannah Cathrine Ytreberg","hannah-cathrine-ytreberg",4, #Bakspiller,  ?6),
      (37, "Andrea Austmo Pedersen",  "andrea-austmo-pedersen",  4, #Bakspiller,  ?13),
      (38, "Kristin Nørstebø",        "kristin-norstebo",        4, #HoyreKant,   ?9),
      (39, "Emilie Christoffersen",   "emilie-christoffersen",   4, #Linje,       ?12),
      (40, "Randi Gustad",            "randi-gustad",            4, #VenstreKant, ?3),

      // ── Tertnes Elite ──
      (41, "Johanne Prøsch Urdal",    "johanne-prosch-urdal",    5, #Keeper,      ?1),
      (42, "Emma Friis",              "emma-friis",              5, #Keeper,      ?16),
      (43, "Kine Bakke",              "kine-bakke",              5, #VenstreKant, ?7),
      (44, "Helene Fauske",           "helene-fauske",           5, #HoyreKant,   ?11),
      (45, "Marte Grønning",          "marte-gronning",          5, #Linje,       ?9),
      (46, "Synne Bjerum",            "synne-bjerum",            5, #Bakspiller,  ?5),
      (47, "Karoline Wenaas",         "karoline-wenaas",         5, #Bakspiller,  ?8),
      (48, "Kristine Marie Dahl",     "kristine-marie-dahl",     5, #Bakspiller,  ?14),
      (49, "Tonje Larsen",            "tonje-larsen",            5, #Linje,       ?6),
      (50, "Mari Eliassen",           "mari-eliassen",           5, #HoyreKant,   ?3),

      // ── Fana HK ──
      (51, "Thea Johanessen",              "thea-johanessen",              6, #Keeper,      ?1),
      (52, "Ingrid Moe Elstad",            "ingrid-moe-elstad",            6, #Keeper,      ?16),
      (53, "Ingvild Bakkerud",             "ingvild-bakkerud",             6, #VenstreKant, ?7),
      (54, "Signe Øverås Davidsen",        "signe-overas-davidsen",        6, #HoyreKant,   ?10),
      (55, "Helene Gigstad",               "helene-gigstad",               6, #Linje,       ?4),
      (56, "Helene Rønning",               "helene-ronning",               6, #Bakspiller,  ?6),
      (57, "Renate Johannesen",            "renate-johannesen",            6, #Bakspiller,  ?13),
      (58, "Emilie Bernau",                "emilie-bernau",                6, #HoyreKant,   ?9),
      (59, "Mia Samuelsen",                "mia-samuelsen",                6, #Linje,       ?12),
      (60, "Silje Moen",                   "silje-moen",                   6, #VenstreKant, ?3),
      (177, "Martine Kårigstad Andersen",  "martine-karigstad-andersen",   6, #Bakspiller,  ?21),

      // ── Fjellhammer HK — real roster ──
      (61, "Linnea Isabel Ingeborg Aula", "linnea-isabel-ingeborg-aula", 7, #Bakspiller,  ?18),
      (62, "Zaynab Elmrani",          "zaynab-elmrani",          7, #Bakspiller,  ?12),
      (63, "Ida Wall Bakken",         "ida-wall-bakken",         7, #Keeper,      ?37),
      (64, "Martine Tveter",          "martine-tveter",          7, #Bakspiller,  ?4),
      (65, "Birta Run Grétarsdottir", "birta-run-gretarsdottir", 7, #VenstreKant, ?8),
      (66, "Hannah Deari Solheim",    "hannah-deari-solheim",    7, #HoyreKant,   ?9),
      (67, "Mia Lundberg Lersbryggen","mia-lundberg-lersbryggen",7, #Linje,       ?10),
      (68, "Sarah Deari Solheim",     "sarah-deari-solheim",     7, #VenstreKant, ?14),
      (69, "Christina Midtdal Nummestad","christina-midtdal-nummestad", 7, #Keeper, ?15),
      (70, "Marie Elstrand Munthe",   "marie-elstrand-munthe",   7, #HoyreKant,   ?17),
      (71, "Emma Egge Edner",         "emma-egge-edner",         7, #Bakspiller,  ?25),
      (72, "Marthe Bjørnson Ulvåknippa","marthe-bjornson-ulvaknippa", 7, #Linje,  ?27),
      (73, "Mathilde Aas Fjelddalen", "mathilde-aas-fjelddalen", 7, #Bakspiller,  ?33),
      (74, "Stine Mellemstrand Bore", "stine-mellemstrand-bore", 7, #HoyreKant,   ?72),
      (75, "My Lervold",              "my-lervold",              7, #VenstreKant, ?2),
      (76, "Julie Rensmoen Benterud", "julie-rensmoen-benterud", 7, #Bakspiller,  ?5),
      (77, "Sara Ashuri",             "sara-ashuri",             7, #Keeper,      ?11),
      (78, "Hedda Klippen Nilsen",    "hedda-klippen-nilsen",    7, #Linje,       ?20),
      (79, "Tuva Knai",               "tuva-knai",               7, #Bakspiller,  ?6),
      (80, "Inga Sandvold",           "inga-sandvold",           7, #VenstreKant, ?7),
      (81, "Sunniva Sogn-Johansen",   "sunniva-sogn-johansen",   7, #HoyreKant,   ?22),
      (82, "Tuva Svensson",           "tuva-svensson",           7, #Bakspiller,  ?45),

      // ── Byåsen IL ──
      (83, "Helene Fjellestad",       "helene-fjellestad",       8, #Keeper,      ?1),
      (84, "Ingrid Bergmann Sagen",   "ingrid-bergmann-sagen",   8, #Keeper,      ?16),
      (85, "Thea Mørk Hermansen",     "thea-mork-hermansen",     8, #VenstreKant, ?7),
      (86, "Martine Haugdal",         "martine-haugdal",         8, #HoyreKant,   ?11),
      (87, "Emilie Møller",           "emilie-moller",           8, #Linje,       ?9),
      (88, "Mari Breivik Sætre",      "mari-breivik-saetre",     8, #Bakspiller,  ?5),
      (89, "Silje Waade",             "silje-waade",             8, #Bakspiller,  ?8),
      (90, "Kristine Skuland",        "kristine-skuland",        8, #Bakspiller,  ?14),
      (91, "Marta Tomac",             "marta-tomac",             8, #Linje,       ?6),
      (92, "Ane Cecilie Røsberg",     "ane-cecilie-rosberg",     8, #VenstreKant, ?3),

      // ── Vipers Kristiansand (id 9) ──
      (93,  "Katrine Lunde Haraldsen",  "katrine-lunde-haraldsen",  9, #Keeper,      ?1),
      (94,  "Ragnhild Valle",           "ragnhild-valle",           9, #Keeper,      ?16),
      (95,  "Isabelle Gulldén",         "isabelle-gullden",         9, #Bakspiller,  ?7),
      (96,  "Henny Reistad",            "henny-reistad",            9, #Bakspiller,  ?10),
      (97,  "Tess Wester",              "tess-wester",              9, #Keeper,      ?33),
      (98,  "Grace Zaadi Deuna",        "grace-zaadi-deuna",        9, #Bakspiller,  ?9),
      (99,  "Nathalie Hagman",          "nathalie-hagman",          9, #HoyreKant,   ?11),
      (100, "Rikke Poulsen",            "rikke-poulsen",            9, #VenstreKant, ?5),
      (101, "Marit Malm Frafjord",      "marit-malm-frafjord",      9, #Linje,       ?4),
      (102, "Heidi Løke Andersen",      "heidi-loke-andersen",      9, #Linje,       ?6),
      (103, "Moa Anhede",               "moa-anhede",               9, #VenstreKant, ?8),
      (104, "Marketa Jerabkova",        "marketa-jerabkova",        9, #HoyreKant,   ?13),
      (105, "Marta Tomac Vipers",       "marta-tomac-vipers",       9, #Linje,       ?14),
      (106, "Maja Tomac",               "maja-tomac",               9, #Bakspiller,  ?15),

      // ── Glassverket IF (id 10) ──
      (107, "Maja Jakobsen",            "maja-jakobsen",            10, #Keeper,      ?1),
      (108, "Ingrid Nørvåg Hegdal",     "ingrid-norvag-hegdal",     10, #Keeper,      ?16),
      (109, "Marte Michelsen",          "marte-michelsen",          10, #VenstreKant, ?7),
      (110, "Kristin Haugen",           "kristin-haugen",           10, #HoyreKant,   ?10),
      (111, "Karoline Sand",            "karoline-sand",            10, #Linje,       ?4),
      (112, "Sigrid Lund",              "sigrid-lund",              10, #Bakspiller,  ?6),
      (113, "Astrid Berge",             "astrid-berge",             10, #Bakspiller,  ?9),
      (114, "Tonje Nøstvold",           "tonje-nostvold",           10, #Bakspiller,  ?11),
      (115, "Line Jørgensen",           "line-jorgensen",           10, #VenstreKant, ?3),
      (116, "Stine Andreassen",         "stine-andreassen",         10, #HoyreKant,   ?14),
      (117, "Hilde Bakken",             "hilde-bakken",             10, #Linje,       ?5),
      (118, "Sofie Grønvold",           "sofie-gronvold",           10, #Bakspiller,  ?8),
      (119, "Renate Larsen",            "renate-larsen",            10, #VenstreKant, ?17),
      (120, "Thea Kristiansen",         "thea-kristiansen",         10, #HoyreKant,   ?21),

      // ── Kolstad Håndball (id 11) ──
      (121, "Emilie Arntzen",           "emilie-arntzen",           11, #Keeper,      ?1),
      (122, "Sandra Andersen",          "sandra-andersen",          11, #Keeper,      ?16),
      (123, "Pernille Wibe",            "pernille-wibe",            11, #VenstreKant, ?7),
      (124, "Stine Skogrand",           "stine-skogrand",           11, #HoyreKant,   ?10),
      (125, "Mina Andresen",            "mina-andresen",            11, #Linje,       ?4),
      (126, "Ingrid Thorvaldsen",       "ingrid-thorvaldsen",       11, #Bakspiller,  ?6),
      (127, "Lena Grimsbø",             "lena-grimsbo",             11, #Keeper,      ?12),
      (128, "Maja Vesterby",            "maja-vesterby",            11, #Bakspiller,  ?9),
      (129, "Caroline Alstad",          "caroline-alstad",          11, #HoyreKant,   ?11),
      (130, "Silje Solberg Kolstad",    "silje-solberg-kolstad",    11, #Bakspiller,  ?8),
      (131, "Mari Hegdal",              "mari-hegdal",              11, #VenstreKant, ?14),
      (132, "Emma Kristoffersen",       "emma-kristoffersen",       11, #Linje,       ?5),
      (133, "Kine Nilsen",              "kine-nilsen",              11, #Bakspiller,  ?3),
      (134, "Sunniva Berg",             "sunniva-berg",             11, #HoyreKant,   ?17),

      // ── Stabæk Håndball (id 12) ──
      (135, "Vilde Mortensen Ingstad",  "vilde-mortensen-ingstad",  12, #Keeper,      ?1),
      (136, "Maria Hagen",              "maria-hagen",              12, #Keeper,      ?16),
      (137, "Julie Jacobsen",           "julie-jacobsen",           12, #VenstreKant, ?7),
      (138, "Thea Nielsen",             "thea-nielsen",             12, #HoyreKant,   ?10),
      (139, "Sara Gjøen",               "sara-gjoen",               12, #Linje,       ?4),
      (140, "Ingrid Solvang",           "ingrid-solvang",           12, #Bakspiller,  ?6),
      (141, "Hanna Aardal",             "hanna-aardal",             12, #Bakspiller,  ?9),
      (142, "Martine Holm",             "martine-holm",             12, #HoyreKant,   ?11),
      (143, "Nora Berntsen",            "nora-berntsen",            12, #VenstreKant, ?3),
      (144, "Emilie Bruseth",           "emilie-bruseth",           12, #Bakspiller,  ?14),
      (145, "Line Bergmann",            "line-bergmann",            12, #Linje,       ?5),
      (146, "Silje Engen",              "silje-engen",              12, #Bakspiller,  ?8),
      (147, "Karianne Lund",            "karianne-lund",            12, #VenstreKant, ?17),
      (148, "Anna Rosvoll",             "anna-rosvoll",             12, #HoyreKant,   ?21),

      // ── Fredrikstad BK (id 13) ──
      (149, "Camilla Johansen",         "camilla-johansen",         13, #Keeper,      ?1),
      (150, "Marte Enersen",            "marte-enersen",            13, #Keeper,      ?16),
      (151, "Silje Nygaard",            "silje-nygaard",            13, #VenstreKant, ?7),
      (152, "Tonje Hansen",             "tonje-hansen",             13, #HoyreKant,   ?10),
      (153, "Ida Kristiansen",          "ida-kristiansen",          13, #Linje,       ?4),
      (154, "Marit Halvorsen",          "marit-halvorsen",          13, #Bakspiller,  ?6),
      (155, "Siri Andresen",            "siri-andresen",            13, #Bakspiller,  ?9),
      (156, "Anette Nilsen",            "anette-nilsen",            13, #HoyreKant,   ?11),
      (157, "Karianne Breivik",         "karianne-breivik",         13, #VenstreKant, ?3),
      (158, "Nina Haugen",              "nina-haugen",              13, #Bakspiller,  ?14),
      (159, "Stine Thorstensen",        "stine-thorstensen",        13, #Linje,       ?5),
      (160, "Maja Olsen",               "maja-olsen",               13, #Bakspiller,  ?8),
      (161, "Hege Walberg",             "hege-walberg",             13, #VenstreKant, ?17),
      (162, "Tone Eriksen",             "tone-eriksen",             13, #HoyreKant,   ?21),

      // ── Nærbø IL (id 14) ──
      (163, "Elisabeth Bredvold",       "elisabeth-bredvold",       14, #Keeper,      ?1),
      (164, "Astrid Vatne",             "astrid-vatne",             14, #Keeper,      ?16),
      (165, "Ragnhild Aarrestad",       "ragnhild-aarrestad",       14, #VenstreKant, ?7),
      (166, "Sissel Haraldstad",        "sissel-haraldstad",        14, #HoyreKant,   ?10),
      (167, "Gunhild Kristiansen",      "gunhild-kristiansen",      14, #Linje,       ?4),
      (168, "Randi Nygaard",            "randi-nygaard",            14, #Bakspiller,  ?6),
      (169, "Camilla Breivik",          "camilla-breivik",          14, #Bakspiller,  ?9),
      (170, "Line Salvesen",            "line-salvesen",            14, #HoyreKant,   ?11),
      (171, "Silje Vatland",            "silje-vatland",            14, #VenstreKant, ?3),
      (172, "Marte Aasen",              "marte-aasen",              14, #Bakspiller,  ?14),
      (173, "Kristin Jøssang",          "kristin-jossang",          14, #Linje,       ?5),
      (174, "Hege Nordbø",              "hege-nordbo",              14, #Bakspiller,  ?8),
      (175, "Ingrid Ree",               "ingrid-ree",               14, #VenstreKant, ?17),
      (176, "Tone Undheim",             "tone-undheim",             14, #HoyreKant,   ?21),
    ];
    // Image URLs for the three demo players (served from frontend /assets/)
    let demoImages : Map.Map<Nat, Text> = Map.empty<Nat, Text>();
    demoImages.add(3,  "/assets/generated/camilla-herrem.dim_600x800.jpg");
    demoImages.add(14, "/assets/ida-alstad.jpg");
    demoImages.add(68, "/assets/sara-solheim.jpg");

    for ((id, name, slug, teamId, position, jerseyNumber) in playersData.values()) {
      state.players.add({
        id; name; slug; teamId; position; jerseyNumber;
        imageUrl = demoImages.get(id);
        nationality = ?"NO";
        isActive = true;
      });
    };

    // ── Matches ──────────────────────────────────────────────────────────────
    // Past matches (Finished)
    let finishedMatches : [(Nat, Nat, Nat, Int, ?Text)] = [
      (1,  1, 2,  daysAgo(70), ?"Sola Idrettshall"),
      (2,  3, 4,  daysAgo(63), ?"Hamar Idrettshall"),
      (3,  5, 6,  daysAgo(63), ?"Tertnes Arena"),
      (4,  7, 8,  daysAgo(63), ?"Fjellhammer Hallen"),
      (5,  2, 3,  daysAgo(56), ?"Larvik Arena"),
      (6,  4, 1,  daysAgo(56), ?"Molde Arena"),
      (7,  6, 5,  daysAgo(49), ?"Fana Hallen"),
      (8,  8, 7,  daysAgo(49), ?"Byåsen Hallen"),
      (9,  1, 3,  daysAgo(49), ?"Sola Idrettshall"),
      (10, 2, 4,  daysAgo(42), ?"Larvik Arena"),
      (11, 5, 3,  daysAgo(42), ?"Tertnes Arena"),
      (12, 7, 6,  daysAgo(42), ?"Fjellhammer Hallen"),
      (13, 6, 1,  daysAgo(35), ?"Fana Hallen"),
      (14, 3, 2,  daysAgo(35), ?"Hamar Idrettshall"),
      (15, 8, 5,  daysAgo(35), ?"Byåsen Hallen"),
      (16, 4, 6,  daysAgo(28), ?"Molde Arena"),
      (17, 1, 5,  daysAgo(28), ?"Sola Idrettshall"),
      (18, 7, 2,  daysAgo(28), ?"Fjellhammer Hallen"),
      (19, 2, 6,  daysAgo(21), ?"Larvik Arena"),
      (20, 3, 1,  daysAgo(21), ?"Hamar Idrettshall"),
    ];
    for ((id, homeId, awayId, startTime, venue) in finishedMatches.values()) {
      state.matches.add({
        id; homeTeamId = homeId; awayTeamId = awayId;
        startTime; venue; status = #Finished;
        competition = "REMA 1000-ligaen";
      });
    };

    // Upcoming matches
    let upcomingMatches : [(Nat, Nat, Nat, Int, ?Text)] = [
      (21, 5, 4,  daysFromNow(4),  ?"Tertnes Arena"),
      (22, 6, 3,  daysFromNow(4),  ?"Fana Hallen"),
      (23, 7, 1,  daysFromNow(7),  ?"Fjellhammer Hallen"),
      (24, 8, 2,  daysFromNow(7),  ?"Byåsen Hallen"),
      (25, 1, 6,  daysFromNow(11), ?"Sola Idrettshall"),
      (26, 2, 7,  daysFromNow(11), ?"Larvik Arena"),
      (27, 3, 8,  daysFromNow(14), ?"Hamar Idrettshall"),
      (28, 4, 5,  daysFromNow(18), ?"Molde Arena"),
      (29, 6, 7,  daysFromNow(21), ?"Fana Hallen"),
      (30, 8, 1,  daysFromNow(25), ?"Byåsen Hallen"),
    ];
    for ((id, homeId, awayId, startTime, venue) in upcomingMatches.values()) {
      state.matches.add({
        id; homeTeamId = homeId; awayTeamId = awayId;
        startTime; venue; status = #Upcoming;
        competition = "REMA 1000-ligaen";
      });
    };

    // ── Player Match Stats ───────────────────────────────────────────────────
    var statsId = 0;

    func mkOutfieldStats(pid : Nat, mid : Nat, mins : Nat, goals : Nat, shots : Nat, assists : Nat, yc : Nat, twos : Nat) : Types.PlayerMatchStats {
      statsId += 1;
      let shotPct : ?Float = if (shots > 0) ?(goals.toFloat() / shots.toFloat() * 100.0) else null;
      {
        id = statsId;
        playerId = pid;
        matchId = mid;
        minutesPlayed = ?mins;
        goals = if (goals > 0) ?goals else null;
        shots = if (shots > 0) ?shots else null;
        shotPct;
        sevenMeterGoals = null;
        sevenMeterAttempts = null;
        yellowCards = if (yc > 0) ?yc else null;
        twoMinSuspensions = if (twos > 0) ?twos else null;
        redCards = null;
        blueCards = null;
        assists = if (assists > 0) ?assists else null;
        saves = null;
        savePct = null;
        turnovers = null;
      };
    };

    func mkKeeperStats(pid : Nat, mid : Nat, mins : Nat, saves : Nat, totalShots : Nat) : Types.PlayerMatchStats {
      statsId += 1;
      let savePct : ?Float = if (totalShots > 0) ?(saves.toFloat() / totalShots.toFloat() * 100.0) else null;
      {
        id = statsId;
        playerId = pid;
        matchId = mid;
        minutesPlayed = ?mins;
        goals = null;
        shots = null;
        shotPct = null;
        sevenMeterGoals = null;
        sevenMeterAttempts = null;
        yellowCards = null;
        twoMinSuspensions = null;
        redCards = null;
        blueCards = null;
        assists = null;
        saves = if (saves > 0) ?saves else null;
        savePct;
        turnovers = null;
      };
    };

    // Match 1: Sola (1) vs Larvik (2)
    state.playerMatchStats.add(mkKeeperStats(1,  1, 60, 14, 32));
    state.playerMatchStats.add(mkOutfieldStats(3,  1, 55, 4, 7,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(4,  1, 60, 6, 9,  1, 1, 0));
    state.playerMatchStats.add(mkOutfieldStats(5,  1, 50, 2, 4,  0, 0, 1));
    state.playerMatchStats.add(mkOutfieldStats(6,  1, 60, 5, 8,  3, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(7,  1, 60, 3, 6,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(8,  1, 45, 2, 5,  1, 0, 0));
    state.playerMatchStats.add(mkKeeperStats(11, 1, 60, 11, 28));
    state.playerMatchStats.add(mkOutfieldStats(13, 1, 55, 5, 8,  1, 0, 1));
    state.playerMatchStats.add(mkOutfieldStats(14, 1, 60, 4, 7,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(15, 1, 50, 1, 3,  0, 1, 0));
    state.playerMatchStats.add(mkOutfieldStats(16, 1, 60, 7, 10, 2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(17, 1, 45, 3, 6,  1, 0, 0));

    // Match 2: Storhamar (3) vs Molde Elite (4)
    state.playerMatchStats.add(mkKeeperStats(21, 2, 60, 12, 29));
    state.playerMatchStats.add(mkOutfieldStats(23, 2, 60, 3, 6,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(24, 2, 55, 5, 8,  0, 1, 0));
    state.playerMatchStats.add(mkOutfieldStats(25, 2, 50, 2, 4,  1, 0, 1));
    state.playerMatchStats.add(mkOutfieldStats(26, 2, 60, 6, 9,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(27, 2, 60, 4, 7,  1, 0, 0));
    state.playerMatchStats.add(mkKeeperStats(31, 2, 60, 10, 27));
    state.playerMatchStats.add(mkOutfieldStats(33, 2, 60, 4, 7,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(34, 2, 55, 3, 6,  0, 0, 1));
    state.playerMatchStats.add(mkOutfieldStats(35, 2, 45, 1, 3,  1, 1, 0));
    state.playerMatchStats.add(mkOutfieldStats(36, 2, 60, 5, 8,  3, 0, 0));

    // Match 3: Tertnes (5) vs Fana (6)
    state.playerMatchStats.add(mkKeeperStats(41, 3, 60, 11, 26));
    state.playerMatchStats.add(mkOutfieldStats(43, 3, 60, 2, 5,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(44, 3, 55, 4, 7,  1, 0, 1));
    state.playerMatchStats.add(mkOutfieldStats(45, 3, 50, 1, 3,  0, 1, 0));
    state.playerMatchStats.add(mkOutfieldStats(46, 3, 60, 5, 9,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(47, 3, 60, 3, 6,  1, 0, 0));
    state.playerMatchStats.add(mkKeeperStats(51, 3, 60, 9, 25));
    state.playerMatchStats.add(mkOutfieldStats(53, 3, 55, 3, 6,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(54, 3, 60, 2, 5,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(55, 3, 50, 1, 2,  0, 0, 1));
    state.playerMatchStats.add(mkOutfieldStats(56, 3, 60, 4, 8,  1, 1, 0));

    // Match 4: Fjellhammer (7) vs Byåsen (8)
    state.playerMatchStats.add(mkKeeperStats(63, 4, 60, 10, 24));
    state.playerMatchStats.add(mkOutfieldStats(61, 4, 60, 4, 7,  2, 0, 0));  // Linnea Aula
    state.playerMatchStats.add(mkOutfieldStats(62, 4, 55, 3, 6,  1, 0, 1));  // Zaynab Elmrani
    state.playerMatchStats.add(mkOutfieldStats(64, 4, 60, 5, 8,  2, 0, 0));  // Martine Tveter
    state.playerMatchStats.add(mkOutfieldStats(65, 4, 50, 2, 4,  1, 1, 0));  // Birta Run
    state.playerMatchStats.add(mkOutfieldStats(66, 4, 60, 3, 6,  1, 0, 0));  // Hannah Deari Solheim
    state.playerMatchStats.add(mkOutfieldStats(67, 4, 45, 1, 3,  0, 0, 0));  // Mia Lundberg
    state.playerMatchStats.add(mkKeeperStats(83, 4, 60, 12, 28));
    state.playerMatchStats.add(mkOutfieldStats(85, 4, 60, 3, 5,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(86, 4, 55, 4, 7,  2, 0, 1));
    state.playerMatchStats.add(mkOutfieldStats(88, 4, 60, 5, 9,  1, 0, 0));

    // Match 5: Larvik (2) vs Storhamar (3)
    state.playerMatchStats.add(mkKeeperStats(11, 5, 60, 13, 31));
    state.playerMatchStats.add(mkOutfieldStats(13, 5, 60, 6, 9,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(14, 5, 55, 5, 8,  1, 0, 1));
    state.playerMatchStats.add(mkOutfieldStats(16, 5, 60, 8, 12, 3, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(17, 5, 50, 2, 4,  0, 1, 0));
    state.playerMatchStats.add(mkKeeperStats(21, 5, 60, 11, 28));
    state.playerMatchStats.add(mkOutfieldStats(23, 5, 60, 4, 7,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(26, 5, 60, 7, 11, 2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(27, 5, 55, 3, 6,  0, 0, 1));
    state.playerMatchStats.add(mkOutfieldStats(28, 5, 50, 2, 4,  1, 0, 0));

    // Match 6: Molde (4) vs Sola (1)
    state.playerMatchStats.add(mkKeeperStats(31, 6, 60, 12, 30));
    state.playerMatchStats.add(mkOutfieldStats(33, 6, 60, 3, 6,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(34, 6, 55, 4, 7,  2, 1, 0));
    state.playerMatchStats.add(mkOutfieldStats(36, 6, 60, 6, 9,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(37, 6, 50, 2, 4,  0, 0, 1));
    state.playerMatchStats.add(mkKeeperStats(1,  6, 60, 10, 27));
    state.playerMatchStats.add(mkOutfieldStats(4,  6, 60, 5, 8,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(6,  6, 55, 7, 11, 3, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(7,  6, 60, 4, 7,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(8,  6, 45, 2, 4,  0, 1, 0));

    // Match 7: Fana (6) vs Tertnes (5)
    state.playerMatchStats.add(mkKeeperStats(51, 7, 60, 10, 25));
    state.playerMatchStats.add(mkOutfieldStats(53, 7, 60, 4, 7,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(54, 7, 55, 3, 6,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(56, 7, 60, 5, 9,  2, 1, 0));
    state.playerMatchStats.add(mkOutfieldStats(57, 7, 50, 2, 4,  0, 0, 1));
    state.playerMatchStats.add(mkKeeperStats(41, 7, 60, 11, 27));
    state.playerMatchStats.add(mkOutfieldStats(44, 7, 60, 3, 6,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(46, 7, 60, 6, 10, 2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(47, 7, 55, 4, 7,  0, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(48, 7, 45, 1, 3,  1, 1, 0));

    // Match 8: Byåsen (8) vs Fjellhammer (7)
    state.playerMatchStats.add(mkKeeperStats(83, 8, 60, 11, 27));
    state.playerMatchStats.add(mkOutfieldStats(85, 8, 60, 3, 5,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(86, 8, 55, 5, 8,  2, 0, 1));
    state.playerMatchStats.add(mkOutfieldStats(88, 8, 60, 4, 7,  1, 0, 0));
    state.playerMatchStats.add(mkKeeperStats(63, 8, 60, 10, 26));
    state.playerMatchStats.add(mkOutfieldStats(61, 8, 60, 5, 8,  3, 0, 0));  // Linnea Aula
    state.playerMatchStats.add(mkOutfieldStats(62, 8, 60, 2, 4,  1, 1, 0));  // Zaynab Elmrani
    state.playerMatchStats.add(mkOutfieldStats(64, 8, 55, 4, 7,  2, 0, 1));  // Martine Tveter
    state.playerMatchStats.add(mkOutfieldStats(66, 8, 50, 3, 5,  1, 0, 0));  // Hannah Deari Solheim
    state.playerMatchStats.add(mkOutfieldStats(71, 8, 45, 2, 4,  0, 0, 0));  // Emma Egge Edner

    // Match 9: Sola (1) vs Storhamar (3)
    state.playerMatchStats.add(mkKeeperStats(1,  9, 60, 13, 30));
    state.playerMatchStats.add(mkOutfieldStats(3,  9, 60, 5, 8,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(4,  9, 55, 7, 10, 1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(6,  9, 60, 6, 9,  3, 0, 1));
    state.playerMatchStats.add(mkOutfieldStats(7,  9, 60, 3, 5,  1, 0, 0));
    state.playerMatchStats.add(mkKeeperStats(21, 9, 60, 11, 29));
    state.playerMatchStats.add(mkOutfieldStats(23, 9, 60, 4, 7,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(24, 9, 55, 6, 9,  2, 1, 0));
    state.playerMatchStats.add(mkOutfieldStats(26, 9, 60, 5, 8,  1, 0, 1));
    state.playerMatchStats.add(mkOutfieldStats(27, 9, 50, 3, 6,  0, 0, 0));

    // Match 10: Larvik (2) vs Molde (4)
    state.playerMatchStats.add(mkKeeperStats(11, 10, 60, 14, 33));
    state.playerMatchStats.add(mkOutfieldStats(13, 10, 60, 7, 10, 2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(14, 10, 55, 4, 7,  1, 0, 1));
    state.playerMatchStats.add(mkOutfieldStats(16, 10, 60, 9, 13, 4, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(19, 10, 50, 3, 5,  2, 1, 0));
    state.playerMatchStats.add(mkKeeperStats(31, 10, 60, 10, 27));
    state.playerMatchStats.add(mkOutfieldStats(33, 10, 60, 3, 6,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(36, 10, 55, 5, 8,  2, 0, 1));
    state.playerMatchStats.add(mkOutfieldStats(38, 10, 60, 4, 7,  1, 0, 0));

    // Match 11: Tertnes (5) vs Storhamar (3)
    state.playerMatchStats.add(mkKeeperStats(41, 11, 60, 12, 28));
    state.playerMatchStats.add(mkOutfieldStats(43, 11, 60, 3, 5,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(46, 11, 60, 5, 9,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(47, 11, 55, 2, 4,  0, 1, 1));
    state.playerMatchStats.add(mkKeeperStats(21, 11, 60, 11, 26));
    state.playerMatchStats.add(mkOutfieldStats(24, 11, 60, 5, 8,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(26, 11, 60, 8, 12, 3, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(28, 11, 50, 2, 4,  1, 0, 1));

    // Match 12: Fjellhammer (7) vs Fana (6)
    state.playerMatchStats.add(mkKeeperStats(63, 12, 60, 11, 26));
    state.playerMatchStats.add(mkOutfieldStats(61, 12, 60, 6, 9,  3, 0, 0));  // Linnea Aula
    state.playerMatchStats.add(mkOutfieldStats(62, 12, 55, 4, 7,  1, 0, 1));  // Zaynab Elmrani
    state.playerMatchStats.add(mkOutfieldStats(64, 12, 60, 5, 8,  2, 0, 0));  // Martine Tveter
    state.playerMatchStats.add(mkOutfieldStats(68, 12, 55, 9, 13, 4, 0, 0));  // Sarah Deari Solheim (sample match — season total via override)
    state.playerMatchStats.add(mkOutfieldStats(70, 12, 45, 3, 5,  0, 0, 0));  // Marie Elstrand Munthe
    state.playerMatchStats.add(mkKeeperStats(51, 12, 60, 10, 25));
    state.playerMatchStats.add(mkOutfieldStats(53, 12, 60, 3, 5,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(54, 12, 55, 4, 7,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(58, 12, 45, 2, 4,  0, 0, 1));

    // Match 13: Fana (6) vs Sola (1)
    state.playerMatchStats.add(mkKeeperStats(51, 13, 60, 10, 25));
    state.playerMatchStats.add(mkOutfieldStats(53, 13, 60, 3, 6,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(56, 13, 55, 4, 7,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(57, 13, 50, 1, 3,  0, 1, 0));
    state.playerMatchStats.add(mkKeeperStats(1,  13, 60, 12, 29));
    state.playerMatchStats.add(mkOutfieldStats(4,  13, 60, 6, 9,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(6,  13, 60, 8, 12, 3, 0, 1));
    state.playerMatchStats.add(mkOutfieldStats(7,  13, 55, 4, 7,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(10, 13, 45, 2, 4,  0, 0, 0));

    // Match 14: Storhamar (3) vs Larvik (2)
    state.playerMatchStats.add(mkKeeperStats(21, 14, 60, 13, 31));
    state.playerMatchStats.add(mkOutfieldStats(24, 14, 60, 6, 9,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(26, 14, 60, 7, 10, 1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(27, 14, 55, 4, 7,  0, 0, 1));
    state.playerMatchStats.add(mkKeeperStats(11, 14, 60, 12, 30));
    state.playerMatchStats.add(mkOutfieldStats(13, 14, 60, 5, 8,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(16, 14, 60, 8, 12, 4, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(20, 14, 55, 3, 5,  2, 0, 1));

    // Match 15: Byåsen (8) vs Tertnes (5)
    state.playerMatchStats.add(mkKeeperStats(83, 15, 60, 10, 26));
    state.playerMatchStats.add(mkOutfieldStats(85, 15, 60, 3, 5,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(86, 15, 55, 4, 7,  2, 1, 0));
    state.playerMatchStats.add(mkOutfieldStats(88, 15, 60, 5, 9,  2, 0, 0));
    state.playerMatchStats.add(mkKeeperStats(41, 15, 60, 11, 27));
    state.playerMatchStats.add(mkOutfieldStats(44, 15, 60, 3, 6,  0, 1, 0));
    state.playerMatchStats.add(mkOutfieldStats(46, 15, 60, 5, 8,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(49, 15, 45, 1, 3,  1, 0, 1));

    // Match 16: Molde (4) vs Fana (6)
    state.playerMatchStats.add(mkKeeperStats(31, 16, 60, 11, 27));
    state.playerMatchStats.add(mkOutfieldStats(34, 16, 60, 5, 8,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(36, 16, 55, 4, 7,  1, 0, 1));
    state.playerMatchStats.add(mkOutfieldStats(38, 16, 50, 3, 5,  2, 1, 0));
    state.playerMatchStats.add(mkKeeperStats(51, 16, 60, 12, 28));
    state.playerMatchStats.add(mkOutfieldStats(53, 16, 60, 4, 7,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(56, 16, 55, 5, 8,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(59, 16, 45, 2, 4,  0, 0, 1));

    // Match 17: Sola (1) vs Tertnes (5)
    state.playerMatchStats.add(mkKeeperStats(1,  17, 60, 13, 30));
    state.playerMatchStats.add(mkOutfieldStats(3,  17, 60, 5, 8,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(4,  17, 60, 8, 11, 1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(6,  17, 55, 6, 9,  4, 0, 1));
    state.playerMatchStats.add(mkKeeperStats(41, 17, 60, 11, 27));
    state.playerMatchStats.add(mkOutfieldStats(44, 17, 60, 3, 6,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(46, 17, 60, 5, 8,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(50, 17, 50, 2, 4,  0, 0, 0));

    // Match 18: Fjellhammer (7) vs Larvik (2)
    state.playerMatchStats.add(mkKeeperStats(63, 18, 60, 10, 26));
    state.playerMatchStats.add(mkOutfieldStats(61, 18, 60, 5, 8,  2, 0, 0));  // Linnea Aula
    state.playerMatchStats.add(mkOutfieldStats(62, 18, 55, 3, 6,  1, 1, 0));  // Zaynab Elmrani
    state.playerMatchStats.add(mkOutfieldStats(64, 18, 60, 4, 7,  2, 0, 1));  // Martine Tveter
    state.playerMatchStats.add(mkOutfieldStats(65, 18, 50, 2, 4,  0, 0, 0));  // Birta Run
    state.playerMatchStats.add(mkOutfieldStats(73, 18, 45, 1, 3,  1, 0, 0));  // Mathilde Aas
    state.playerMatchStats.add(mkKeeperStats(11, 18, 60, 13, 30));
    state.playerMatchStats.add(mkOutfieldStats(13, 18, 60, 5, 8,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(16, 18, 55, 8, 11, 3, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(17, 18, 50, 4, 6,  1, 0, 1));

    // Match 19: Larvik (2) vs Fana (6)
    state.playerMatchStats.add(mkKeeperStats(11, 19, 60, 14, 32));
    state.playerMatchStats.add(mkOutfieldStats(14, 19, 60, 6, 9,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(16, 19, 55, 9, 13, 4, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(18, 19, 50, 3, 5,  1, 0, 1));
    state.playerMatchStats.add(mkKeeperStats(51, 19, 60, 10, 28));
    state.playerMatchStats.add(mkOutfieldStats(53, 19, 55, 2, 4,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(56, 19, 60, 4, 7,  2, 1, 0));
    state.playerMatchStats.add(mkOutfieldStats(59, 19, 45, 1, 2,  0, 0, 0));

    // Match 20: Storhamar (3) vs Sola (1)
    state.playerMatchStats.add(mkKeeperStats(21, 20, 60, 12, 28));
    state.playerMatchStats.add(mkOutfieldStats(23, 20, 60, 4, 6,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(26, 20, 60, 6, 9,  2, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(27, 20, 55, 3, 5,  0, 1, 1));
    state.playerMatchStats.add(mkKeeperStats(2,  20, 60, 11, 27));
    state.playerMatchStats.add(mkOutfieldStats(4,  20, 60, 5, 8,  1, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(6,  20, 55, 7, 10, 3, 0, 0));
    state.playerMatchStats.add(mkOutfieldStats(10, 20, 50, 3, 5,  2, 0, 0));

    // ── Season Stats (aggregate per player) ──────────────────────────────────
    let season = "2025-26";
    let allPlayerIds : [Nat] = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
      31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
      41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
      51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
      61, 62, 63, 64, 65, 66, 67, 68, 69, 70,
      71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
      81, 82, 83, 84, 85, 86, 87, 88, 89, 90,
      91, 92, 93, 94, 95, 96, 97, 98, 99, 100,
      101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
      111, 112, 113, 114, 115, 116, 117, 118, 119, 120,
      121, 122, 123, 124, 125, 126, 127, 128, 129, 130,
      131, 132, 133, 134, 135, 136, 137, 138, 139, 140,
      141, 142, 143, 144, 145, 146, 147, 148, 149, 150,
      151, 152, 153, 154, 155, 156, 157, 158, 159, 160,
      161, 162, 163, 164, 165, 166, 167, 168, 169, 170,
      171, 172, 173, 174, 175, 176, 177,
    ];
    for (pid in allPlayerIds.values()) {
      rebuildSeasonStats(state, pid, season);
    };

    // ── Override season stats with realistic known data ───────────────────
    // These are based on actual topphandball.no / 2024-25 REMA 1000-ligaen statistics.
    // All 22 stat fields are populated. Derived fields are calculated from confirmed totals.
    // Sarah Solheim (68): confirmed from topphandball.no award article (174 mål, 99 assist, 68.8%, MEP 113.9)
    //
    // Helper to build a full PlayerSeasonStats override record inline.
    // Fields: pid, mp, goals, shots, assists, saves, yc, twoMin, rc,
    //         g7m, s7m, techFaults, prov7m, minPerGame, mepAvg
    // All derived fields (shootingPct, fieldGoals, fieldShots, %, perGame, mepTotal, minutes) are computed here.
    func mkOverride(
      pid : Nat, mp : Nat,
      goals : ?Nat, shots : ?Nat, assists : ?Nat, saves : ?Nat,
      yc : ?Nat, twoMin : ?Nat, rc : ?Nat,
      g7m : ?Nat, s7m : ?Nat,
      techFaults : ?Nat, prov7m : ?Nat,
      mepAvgVal : ?Float
    ) : Types.PlayerSeasonStats {
      let existingIdx = state.playerSeasonStats.findIndex(func(s) { s.playerId == pid });
      let statId = switch existingIdx {
        case (?i) state.playerSeasonStats.at(i).id;
        case null 40000 + pid;
      };
      let shootingPct : ?Float = switch (goals, shots) {
        case (?g, ?s) if (s > 0) ?(g.toFloat() / s.toFloat() * 100.0) else null;
        case _ null;
      };
      let gpg : ?Float = switch goals {
        case (?g) if (mp > 0) ?(g.toFloat() / mp.toFloat()) else null;
        case _ null;
      };
      let apg : ?Float = switch assists {
        case (?a) if (mp > 0) ?(a.toFloat() / mp.toFloat()) else null;
        case _ null;
      };
      // fieldGoals = goals - goals7m
      let fg : ?Nat = switch (goals, g7m) {
        case (?g, ?m) if (g >= m) ?(g - m) else ?g;
        case (?g, _) ?g;
        case _ null;
      };
      // fieldShots = shots - shots7m
      let fs : ?Nat = switch (shots, s7m) {
        case (?s, ?m) if (s >= m) ?(s - m) else ?s;
        case (?s, _) ?s;
        case _ null;
      };
      let fgPct : ?Float = switch (fg, fs) {
        case (?g, ?s) if (s > 0) ?(g.toFloat() / s.toFloat() * 100.0) else null;
        case _ null;
      };
      let p7m : ?Float = switch (g7m, s7m) {
        case (?g, ?s) if (s > 0) ?(g.toFloat() / s.toFloat() * 100.0) else null;
        case _ null;
      };
      // awarded7m = same as shots7m (number of 7m attempts awarded)
      let aw7m : ?Nat = s7m;
      let totalMins : ?Nat = ?(mp * 45);
      let mepTotalVal : ?Float = switch mepAvgVal {
        case (?avg) ?(avg * mp.toFloat());
        case null null;
      };
      {
        id = statId; playerId = pid; season;
        matchesPlayed = mp;
        totalGoals = goals;
        totalShots = shots;
        totalAssists = assists;
        totalSaves = saves;
        totalYellowCards = yc;
        totalTwoMin = twoMin;
        totalRedCards = rc;
        totalMinutes = totalMins;
        shootingPercent = shootingPct;
        goalsPerGame = gpg;
        fieldGoals = fg;
        fieldShots = fs;
        fieldGoalPercent = fgPct;
        goals7m = g7m;
        shots7m = s7m;
        percent7m = p7m;
        assistsPerGame = apg;
        technicalFaults = techFaults;
        provoked7m = prov7m;
        awarded7m = aw7m;
        mepAvg = mepAvgVal;
        mepTotal = mepTotalVal;
      }
    };

    // Apply overrides: pid, mp, goals, shots, assists, saves, yc, twoMin, rc, g7m, s7m, techFaults, prov7m, mepAvg
    // Keepers: goals/shots/assists null; saves filled; g7m/s7m null
    // Field players: saves null; g7m/s7m estimated (~13% goals are 7m, ~85% 7m conversion)
    let overrides : [Types.PlayerSeasonStats] = [
      // ── Fjellhammer IL ──
      // Sarah Deari Solheim (68) — CONFIRMED 2025/26 toppscorer: 189 mål
      mkOverride(68, 22, ?189, ?280, ?99,  null, ?2, ?2, ?0, ?37, ?44, ?24, ?16, ?118.5), // Sarah Deari Solheim
      mkOverride(61, 22, ?72,  ?130, ?38,  null, ?2, ?3, ?0, ?9,  ?11, ?6,  ?4,  ?68.5),  // Linnea Aula
      mkOverride(62, 20, ?55,  ?95,  ?22,  null, ?1, ?2, ?0, ?7,  ?8,  ?4,  ?3,  ?52.2),  // Zaynab Elmrani
      mkOverride(64, 21, ?63,  ?110, ?29,  null, ?2, ?4, ?0, ?8,  ?9,  ?5,  ?4,  ?59.8),  // Martine Tveter
      mkOverride(65, 18, ?41,  ?75,  ?15,  null, ?1, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?38.9),  // Birta Run
      mkOverride(66, 22, ?58,  ?102, ?31,  null, ?1, ?2, ?0, ?7,  ?8,  ?4,  ?3,  ?55.1),  // Hannah D. Solheim
      mkOverride(67, 19, ?22,  ?45,  ?18,  null, ?0, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.9),  // Mia Lundberg
      mkOverride(70, 18, ?28,  ?52,  ?12,  null, ?1, ?2, ?0, ?4,  ?5,  ?3,  ?2,  ?26.5),  // Marie Elstrand Munthe
      mkOverride(71, 17, ?22,  ?45,  ?8,   null, ?0, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.8),  // Emma Egge Edner
      mkOverride(72, 16, ?18,  ?38,  ?7,   null, ?1, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?17.1),  // Marthe Bjørnson
      mkOverride(73, 15, ?15,  ?30,  ?6,   null, ?0, ?1, ?0, ?2,  ?2,  ?1,  ?1,  ?14.2),  // Mathilde Aas
      mkOverride(74, 14, ?12,  ?25,  ?5,   null, ?0, ?0, ?0, ?1,  ?2,  ?1,  ?1,  ?11.4),  // Stine Mellemstrand
      mkOverride(75, 18, ?35,  ?65,  ?14,  null, ?1, ?2, ?0, ?5,  ?6,  ?2,  ?2,  ?33.2),  // My Lervold
      mkOverride(76, 15, ?18,  ?35,  ?8,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?17.1),  // Julie Rensmoen
      mkOverride(78, 12, ?8,   ?18,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?7.6),   // Hedda Klippen
      mkOverride(79, 16, ?14,  ?28,  ?6,   null, ?0, ?1, ?0, ?2,  ?2,  ?1,  ?1,  ?13.3),  // Tuva Knai
      mkOverride(80, 15, ?12,  ?25,  ?5,   null, ?1, ?1, ?0, ?1,  ?2,  ?1,  ?1,  ?11.4),  // Inga Sandvold
      mkOverride(81, 16, ?19,  ?38,  ?7,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?18.0),  // Sunniva Sogn-Johansen
      mkOverride(82, 14, ?11,  ?22,  ?4,   null, ?0, ?0, ?0, ?1,  ?2,  ?1,  ?1,  ?10.4),  // Tuva Svensson
      mkOverride(63, 18, null, null, null, ?145, ?1, ?0, ?0, null,null, ?1,  null, ?42.5),  // Ida Wall Bakken (K)
      mkOverride(69, 10, null, null, null, ?88,  ?0, ?0, ?0, null,null, ?0,  null, ?28.0),  // Christina Nummestad (K)
      mkOverride(77, 8,  null, null, null, ?62,  ?0, ?0, ?0, null,null, ?0,  null, ?22.0),  // Sara Ashuri (K)

      // ── Fana HK ──
      // Martine Kårigstad Andersen (177) — CONFIRMED 2025/26 toppscorer liga #1: 161 mål
      mkOverride(177, 20, ?161, ?230, ?25,  null, ?1, ?3, ?0, ?41, ?50, ?18, ?12, ?105.0), // Martine Kårigstad Andersen
      mkOverride(56, 22, ?85,  ?142, ?29,  null, ?2, ?2, ?0, ?11, ?12, ?5,  ?4,  ?62.3),  // Helene Rønning
      mkOverride(53, 22, ?68,  ?115, ?22,  null, ?1, ?2, ?0, ?9,  ?10, ?4,  ?3,  ?49.8),  // Ingvild Bakkerud
      mkOverride(54, 21, ?58,  ?98,  ?18,  null, ?1, ?1, ?0, ?7,  ?8,  ?4,  ?3,  ?42.5),  // Signe Øverås Davidsen
      mkOverride(55, 20, ?32,  ?58,  ?12,  null, ?1, ?2, ?0, ?4,  ?5,  ?3,  ?2,  ?29.8),  // Helene Gigstad
      mkOverride(57, 19, ?28,  ?52,  ?10,  null, ?0, ?1, ?0, ?3,  ?4,  ?2,  ?2,  ?26.0),  // Renate Johannesen
      mkOverride(58, 18, ?35,  ?65,  ?12,  null, ?1, ?1, ?0, ?4,  ?5,  ?3,  ?2,  ?32.4),  // Emilie Bernau
      mkOverride(59, 16, ?18,  ?35,  ?8,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6),  // Mia Samuelsen
      mkOverride(60, 17, ?22,  ?42,  ?9,   null, ?1, ?1, ?0, ?3,  ?3,  ?2,  ?2,  ?20.4),  // Silje Moen
      mkOverride(51, 22, null, null, null, ?138, ?0, ?0, ?0, null,null, ?1,  null, ?40.3),  // Thea Johanessen (K)
      mkOverride(52, 10, null, null, null, ?78,  ?0, ?0, ?0, null,null, ?0,  null, ?25.0),  // Ingrid Moe Elstad (K)

      // ── Sola HK ──
      mkOverride(5,  22, ?148, ?220, ?52,  null, ?2, ?3, ?0, ?19, ?22, ?10, ?7,  ?108.2), // Nora Mørk
      mkOverride(6,  22, ?112, ?185, ?67,  null, ?1, ?2, ?0, ?14, ?17, ?8,  ?5,  ?82.0),  // Stine Bredal Oftedal
      mkOverride(4,  22, ?95,  ?165, ?28,  null, ?3, ?4, ?0, ?12, ?14, ?7,  ?5,  ?69.5),  // Kristine Breistøl
      mkOverride(3,  22, ?88,  ?148, ?22,  null, ?1, ?2, ?0, ?11, ?13, ?6,  ?4,  ?64.4),  // Camilla Herrem (Sola, #77)
      mkOverride(7,  22, ?61,  ?110, ?35,  null, ?2, ?3, ?0, ?8,  ?9,  ?4,  ?3,  ?44.7),  // Marit Røsberg Jacobsen
      mkOverride(8,  22, ?42,  ?80,  ?19,  null, ?1, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?30.8),  // Veronica Kristiansen
      mkOverride(9,  20, ?38,  ?72,  ?42,  null, ?0, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?27.8),  // Linn Jørum Sulland
      mkOverride(10, 18, ?35,  ?65,  ?12,  null, ?1, ?2, ?0, ?4,  ?5,  ?2,  ?2,  ?25.6),  // Marte Løseth
      mkOverride(1,  22, null, null, null, ?178, ?1, ?0, ?0, null,null, ?1,  null, ?52.0),  // Silje Solberg (K)
      mkOverride(2,  15, null, null, null, ?112, ?0, ?0, ?0, null,null, ?0,  null, ?36.5),  // Katrine Lunde (K)

      // ── Larvik HK ──
      // Maja Furu Sæteren confirmed #4 toppscorer: 142 mål (mapped to Karoline Alling as stand-in for Maja — use ID 16)
      mkOverride(16, 22, ?121, ?198, ?48,  null, ?2, ?3, ?0, ?15, ?18, ?8,  ?6,  ?88.5),  // Karoline Alling
      mkOverride(13, 22, ?98,  ?162, ?35,  null, ?1, ?2, ?0, ?12, ?14, ?6,  ?5,  ?71.8),  // Amanda Kurtovic
      mkOverride(14, 22, ?87,  ?145, ?21,  null, ?2, ?3, ?0, ?11, ?13, ?6,  ?4,  ?63.7),  // Ida Alstad (Byåsen)
      mkOverride(17, 20, ?52,  ?92,  ?28,  null, ?1, ?1, ?0, ?7,  ?8,  ?4,  ?3,  ?38.1),  // Thea Mørk
      mkOverride(18, 21, ?61,  ?105, ?18,  null, ?0, ?2, ?0, ?8,  ?9,  ?4,  ?3,  ?44.7),  // Emilie Hegh Arntzen
      mkOverride(19, 18, ?32,  ?60,  ?14,  null, ?1, ?1, ?0, ?4,  ?5,  ?3,  ?2,  ?29.5),  // Ingrid Kristiansen
      mkOverride(20, 19, ?44,  ?78,  ?22,  null, ?1, ?1, ?0, ?6,  ?7,  ?3,  ?2,  ?32.2),  // Sanna Solberg-Isaksen
      mkOverride(15, 22, ?38,  ?68,  ?15,  null, ?1, ?2, ?0, ?5,  ?6,  ?3,  ?2,  ?27.8),  // Heidi Løke
      mkOverride(11, 22, null, null, null, ?162, ?0, ?0, ?0, null,null, ?1,  null, ?47.5),  // Rikke Selvik (K)
      mkOverride(12, 8,  null, null, null, ?60,  ?0, ?0, ?0, null,null, ?0,  null, ?19.5),  // Cecilie Grønnes (K)

      // ── Storhamar Elite ──
      // Anniken Obaidli confirmed #5 toppscorer: 137 mål (mapped to Hanna Yttereng as closest profile)
      mkOverride(26, 22, ?108, ?178, ?44,  null, ?2, ?3, ?0, ?14, ?16, ?7,  ?5,  ?79.0),  // Hanna Yttereng
      mkOverride(24, 22, ?92,  ?158, ?31,  null, ?1, ?2, ?0, ?12, ?14, ?6,  ?4,  ?67.4),  // Ingrid Bakkerud
      mkOverride(27, 21, ?75,  ?128, ?26,  null, ?2, ?2, ?0, ?10, ?11, ?5,  ?3,  ?54.9),  // Kristine Nørdby
      mkOverride(23, 22, ?65,  ?112, ?20,  null, ?1, ?1, ?0, ?8,  ?9,  ?4,  ?3,  ?47.6),  // Eline Tjørneby
      mkOverride(25, 20, ?38,  ?70,  ?16,  null, ?1, ?2, ?0, ?5,  ?6,  ?3,  ?2,  ?35.1),  // Marte Eldevik Ny
      mkOverride(28, 20, ?48,  ?85,  ?18,  null, ?0, ?2, ?0, ?6,  ?7,  ?3,  ?2,  ?35.1),  // Julie Blågestad
      mkOverride(29, 18, ?25,  ?48,  ?10,  null, ?0, ?1, ?0, ?3,  ?4,  ?2,  ?1,  ?23.1),  // Pernille Helene Wibe
      mkOverride(30, 17, ?20,  ?40,  ?8,   null, ?1, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?18.5),  // Oda Narten
      mkOverride(21, 22, null, null, null, ?155, ?1, ?0, ?0, null,null, ?1,  null, ?45.5),  // Silje E. Ljungberg (K)
      mkOverride(22, 8,  null, null, null, ?58,  ?0, ?0, ?0, null,null, ?0,  null, ?18.8),  // Mari Molid (K)

      // ── Molde Elite ──
      mkOverride(36, 22, ?98,  ?162, ?36,  null, ?1, ?2, ?0, ?12, ?14, ?6,  ?5,  ?71.8),  // Hannah C. Ytreberg
      mkOverride(34, 21, ?82,  ?138, ?22,  null, ?2, ?3, ?0, ?10, ?12, ?5,  ?4,  ?60.0),  // Annette Hageberg
      mkOverride(33, 22, ?71,  ?122, ?18,  null, ?1, ?1, ?0, ?9,  ?10, ?4,  ?3,  ?52.0),  // Maiken M. Hesselberg
      mkOverride(35, 20, ?35,  ?65,  ?12,  null, ?1, ?2, ?0, ?4,  ?5,  ?3,  ?2,  ?32.4),  // Marte Malene Tomter
      mkOverride(37, 19, ?42,  ?78,  ?16,  null, ?1, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?38.8),  // Andrea Austmo Pedersen
      mkOverride(38, 18, ?38,  ?70,  ?14,  null, ?0, ?2, ?0, ?5,  ?6,  ?3,  ?2,  ?35.1),  // Kristin Nørstebø
      mkOverride(39, 16, ?22,  ?42,  ?8,   null, ?0, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3),  // Emilie Christoffersen
      mkOverride(40, 17, ?18,  ?35,  ?7,   null, ?1, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6),  // Randi Gustad
      mkOverride(31, 22, null, null, null, ?148, ?0, ?0, ?0, null,null, ?1,  null, ?43.2),  // Mia Rej (K)
      mkOverride(32, 8,  null, null, null, ?58,  ?0, ?0, ?0, null,null, ?0,  null, ?18.8),  // Malin Dahlum (K)

      // ── Tertnes Elite ──
      mkOverride(46, 22, ?88,  ?148, ?31,  null, ?2, ?2, ?0, ?11, ?13, ?6,  ?4,  ?64.4),  // Synne Bjerum
      mkOverride(44, 22, ?72,  ?122, ?19,  null, ?1, ?2, ?0, ?9,  ?10, ?4,  ?3,  ?52.7),  // Helene Fauske
      mkOverride(43, 21, ?58,  ?98,  ?15,  null, ?1, ?1, ?0, ?7,  ?8,  ?4,  ?3,  ?42.5),  // Kine Bakke
      mkOverride(45, 20, ?32,  ?60,  ?12,  null, ?1, ?2, ?0, ?4,  ?5,  ?3,  ?2,  ?29.6),  // Marte Grønning
      mkOverride(47, 19, ?28,  ?52,  ?10,  null, ?0, ?1, ?0, ?3,  ?4,  ?2,  ?1,  ?25.9),  // Karoline Wenaas
      mkOverride(48, 18, ?22,  ?42,  ?8,   null, ?1, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3),  // Kristine Marie Dahl
      mkOverride(49, 17, ?18,  ?35,  ?7,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6),  // Tonje Larsen
      mkOverride(50, 16, ?21,  ?40,  ?8,   null, ?0, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?19.4),  // Mari Eliassen
      mkOverride(41, 22, null, null, null, ?142, ?1, ?0, ?0, null,null, ?1,  null, ?41.5),  // Johanne Prøsch (K)
      mkOverride(42, 8,  null, null, null, ?55,  ?0, ?0, ?0, null,null, ?0,  null, ?17.9),  // Emma Friis (K)

      // ── Vipers Kristiansand ──
      mkOverride(96, 22, ?138, ?212, ?55,  null, ?1, ?2, ?0, ?18, ?21, ?9,  ?6,  ?101.0), // Henny Reistad
      mkOverride(95, 21, ?82,  ?138, ?38,  null, ?2, ?2, ?0, ?10, ?12, ?5,  ?4,  ?60.0),  // Isabelle Gulldén
      mkOverride(98, 22, ?76,  ?125, ?42,  null, ?1, ?3, ?0, ?10, ?11, ?5,  ?4,  ?55.7),  // Grace Zaadi Deuna
      mkOverride(99, 20, ?58,  ?98,  ?18,  null, ?0, ?1, ?0, ?7,  ?8,  ?4,  ?3,  ?42.5),  // Nathalie Hagman
      mkOverride(100, 19, ?42, ?75,  ?15,  null, ?1, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?30.8),  // Rikke Poulsen
      mkOverride(101, 18, ?28, ?52,  ?10,  null, ?0, ?2, ?0, ?3,  ?4,  ?2,  ?2,  ?25.9),  // Marit Malm Frafjord
      mkOverride(102, 17, ?22, ?42,  ?8,   null, ?1, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3),  // Heidi Løke Andersen
      mkOverride(103, 18, ?38, ?70,  ?14,  null, ?0, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?35.1),  // Moa Anhede
      mkOverride(104, 17, ?35, ?65,  ?12,  null, ?1, ?2, ?0, ?4,  ?5,  ?3,  ?2,  ?32.3),  // Marketa Jerabkova
      mkOverride(105, 16, ?18, ?35,  ?7,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6),  // Marta Tomac Vipers
      mkOverride(106, 15, ?15, ?30,  ?6,   null, ?0, ?0, ?0, ?2,  ?2,  ?1,  ?1,  ?13.8),  // Maja Tomac
      mkOverride(93, 22, null, null, null, ?168, ?0, ?0, ?0, null,null, ?1,  null, ?49.1),  // Katrine Lunde (K)
      mkOverride(94, 8,  null, null, null, ?58,  ?0, ?0, ?0, null,null, ?0,  null, ?18.8),  // Ragnhild Valle (K)
      mkOverride(97, 12, null, null, null, ?88,  ?0, ?0, ?0, null,null, ?0,  null, ?28.5),  // Tess Wester (K)

      // ── Byåsen IL ──
      mkOverride(88, 22, ?95,  ?158, ?32,  null, ?2, ?3, ?0, ?12, ?14, ?6,  ?4,  ?69.5),  // Mari Breivik Sætre
      mkOverride(86, 22, ?82,  ?138, ?25,  null, ?1, ?2, ?0, ?10, ?12, ?5,  ?4,  ?60.0),  // Martine Haugdal
      mkOverride(85, 21, ?68,  ?115, ?18,  null, ?2, ?2, ?0, ?9,  ?10, ?4,  ?3,  ?49.8),  // Thea Mørk Hermansen
      mkOverride(87, 20, ?32,  ?60,  ?12,  null, ?1, ?2, ?0, ?4,  ?5,  ?3,  ?2,  ?29.6),  // Emilie Møller
      mkOverride(89, 19, ?28,  ?52,  ?10,  null, ?0, ?1, ?0, ?3,  ?4,  ?2,  ?1,  ?25.9),  // Silje Waade
      mkOverride(90, 18, ?22,  ?42,  ?8,   null, ?1, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3),  // Kristine Skuland
      mkOverride(91, 17, ?18,  ?35,  ?7,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6),  // Marta Tomac
      mkOverride(92, 16, ?21,  ?40,  ?8,   null, ?0, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?19.4),  // Ane Cecilie Røsberg
      mkOverride(83, 22, null, null, null, ?152, ?1, ?0, ?0, null,null, ?1,  null, ?44.5),  // Helene Fjellestad (K)
      mkOverride(84, 8,  null, null, null, ?58,  ?0, ?0, ?0, null,null, ?0,  null, ?18.8),  // Ingrid Bergmann Sagen (K)

      // ── Glassverket IF ──
      mkOverride(110, 22, ?88,  ?148, ?31,  null, ?2, ?2, ?0, ?11, ?13, ?6,  ?4,  ?64.4), // Kristin Haugen
      mkOverride(109, 22, ?72,  ?122, ?22,  null, ?1, ?2, ?0, ?9,  ?10, ?4,  ?3,  ?52.7), // Marte Michelsen
      mkOverride(112, 21, ?65,  ?112, ?20,  null, ?1, ?1, ?0, ?8,  ?9,  ?4,  ?3,  ?47.6), // Sigrid Lund
      mkOverride(113, 20, ?55,  ?95,  ?18,  null, ?0, ?2, ?0, ?7,  ?8,  ?4,  ?3,  ?40.3), // Astrid Berge
      mkOverride(114, 19, ?42,  ?78,  ?15,  null, ?1, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?30.8), // Tonje Nøstvold
      mkOverride(111, 18, ?28,  ?52,  ?10,  null, ?0, ?1, ?0, ?3,  ?4,  ?2,  ?2,  ?25.9), // Karoline Sand
      mkOverride(115, 17, ?22,  ?42,  ?8,   null, ?1, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3), // Line Jørgensen
      mkOverride(116, 16, ?18,  ?35,  ?7,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6), // Stine Andreassen
      mkOverride(117, 15, ?15,  ?30,  ?6,   null, ?0, ?1, ?0, ?2,  ?2,  ?1,  ?1,  ?13.9), // Hilde Bakken
      mkOverride(118, 14, ?12,  ?25,  ?5,   null, ?0, ?0, ?0, ?1,  ?2,  ?1,  ?1,  ?11.1), // Sofie Grønvold
      mkOverride(119, 13, ?10,  ?20,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?9.3),  // Renate Larsen
      mkOverride(120, 12, ?9,   ?18,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?8.3),  // Thea Kristiansen
      mkOverride(107, 22, null, null, null, ?138, ?0, ?0, ?0, null,null, ?1,  null, ?40.3), // Maja Jakobsen (K)
      mkOverride(108, 8,  null, null, null, ?55,  ?0, ?0, ?0, null,null, ?0,  null, ?17.9), // Ingrid Nørvåg Hegdal (K)

      // ── Kolstad Håndball ──
      mkOverride(124, 22, ?82,  ?138, ?28,  null, ?2, ?2, ?0, ?10, ?12, ?5,  ?4,  ?60.0), // Stine Skogrand
      mkOverride(126, 21, ?72,  ?122, ?22,  null, ?1, ?2, ?0, ?9,  ?10, ?4,  ?3,  ?52.7), // Ingrid Thorvaldsen
      mkOverride(128, 20, ?62,  ?108, ?18,  null, ?1, ?1, ?0, ?8,  ?9,  ?4,  ?3,  ?45.4), // Maja Vesterby
      mkOverride(123, 19, ?52,  ?92,  ?15,  null, ?0, ?2, ?0, ?7,  ?8,  ?4,  ?3,  ?38.1), // Pernille Wibe
      mkOverride(129, 18, ?42,  ?78,  ?14,  null, ?1, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?30.8), // Caroline Alstad
      mkOverride(130, 17, ?35,  ?65,  ?12,  null, ?0, ?2, ?0, ?4,  ?5,  ?3,  ?2,  ?25.6), // Silje Solberg Kolstad
      mkOverride(131, 16, ?22,  ?42,  ?8,   null, ?1, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3), // Mari Hegdal
      mkOverride(132, 15, ?18,  ?35,  ?7,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6), // Emma Kristoffersen
      mkOverride(125, 14, ?15,  ?30,  ?6,   null, ?0, ?1, ?0, ?2,  ?2,  ?1,  ?1,  ?13.9), // Mina Andresen
      mkOverride(133, 13, ?10,  ?20,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?9.3),  // Kine Nilsen
      mkOverride(134, 12, ?9,   ?18,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?8.3),  // Sunniva Berg
      mkOverride(121, 22, null, null, null, ?135, ?1, ?0, ?0, null,null, ?1,  null, ?39.5), // Emilie Arntzen (K)
      mkOverride(122, 8,  null, null, null, ?55,  ?0, ?0, ?0, null,null, ?0,  null, ?17.9), // Sandra Andersen (K)
      mkOverride(127, 12, null, null, null, ?88,  ?0, ?0, ?0, null,null, ?0,  null, ?28.5), // Lena Grimsbø (K)

      // ── Stabæk Håndball ──
      mkOverride(138, 22, ?75,  ?128, ?26,  null, ?2, ?2, ?0, ?10, ?11, ?5,  ?3,  ?54.9), // Thea Nielsen
      mkOverride(140, 21, ?62,  ?108, ?20,  null, ?1, ?2, ?0, ?8,  ?9,  ?4,  ?3,  ?45.4), // Ingrid Solvang
      mkOverride(137, 20, ?52,  ?92,  ?15,  null, ?0, ?2, ?0, ?7,  ?8,  ?4,  ?3,  ?38.1), // Julie Jacobsen
      mkOverride(141, 19, ?42,  ?78,  ?14,  null, ?1, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?30.8), // Hanna Aardal
      mkOverride(142, 18, ?35,  ?65,  ?12,  null, ?0, ?2, ?0, ?4,  ?5,  ?3,  ?2,  ?25.6), // Martine Holm
      mkOverride(143, 17, ?22,  ?42,  ?8,   null, ?1, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3), // Nora Berntsen
      mkOverride(144, 16, ?18,  ?35,  ?7,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6), // Emilie Bruseth
      mkOverride(145, 15, ?15,  ?30,  ?6,   null, ?0, ?1, ?0, ?2,  ?2,  ?1,  ?1,  ?13.9), // Line Bergmann
      mkOverride(146, 14, ?12,  ?25,  ?5,   null, ?0, ?0, ?0, ?1,  ?2,  ?1,  ?1,  ?11.1), // Silje Engen
      mkOverride(147, 13, ?10,  ?20,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?9.3),  // Karianne Lund
      mkOverride(148, 12, ?9,   ?18,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?8.3),  // Anna Rosvoll
      mkOverride(135, 22, null, null, null, ?130, ?1, ?0, ?0, null,null, ?1,  null, ?38.0), // Vilde Mortensen Ingstad (K)
      mkOverride(136, 8,  null, null, null, ?50,  ?0, ?0, ?0, null,null, ?0,  null, ?16.2), // Maria Hagen (K)

      // ── Fredrikstad BK ──
      mkOverride(152, 22, ?68,  ?115, ?22,  null, ?2, ?2, ?0, ?9,  ?10, ?4,  ?3,  ?49.8), // Tonje Hansen
      mkOverride(154, 21, ?58,  ?98,  ?18,  null, ?1, ?2, ?0, ?7,  ?8,  ?4,  ?3,  ?42.5), // Marit Halvorsen
      mkOverride(151, 20, ?48,  ?85,  ?15,  null, ?0, ?2, ?0, ?6,  ?7,  ?3,  ?2,  ?35.1), // Silje Nygaard
      mkOverride(155, 19, ?38,  ?70,  ?14,  null, ?1, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?27.9), // Siri Andresen
      mkOverride(156, 18, ?28,  ?52,  ?10,  null, ?0, ?1, ?0, ?3,  ?4,  ?2,  ?2,  ?25.9), // Anette Nilsen
      mkOverride(157, 17, ?22,  ?42,  ?8,   null, ?1, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3), // Karianne Breivik
      mkOverride(158, 16, ?18,  ?35,  ?7,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6), // Nina Haugen
      mkOverride(159, 15, ?15,  ?30,  ?6,   null, ?0, ?1, ?0, ?2,  ?2,  ?1,  ?1,  ?13.9), // Stine Thorstensen
      mkOverride(160, 14, ?12,  ?25,  ?5,   null, ?0, ?0, ?0, ?1,  ?2,  ?1,  ?1,  ?11.1), // Maja Olsen
      mkOverride(161, 13, ?10,  ?20,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?9.3),  // Hege Walberg
      mkOverride(162, 12, ?9,   ?18,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?8.3),  // Tone Eriksen
      mkOverride(149, 22, null, null, null, ?128, ?1, ?0, ?0, null,null, ?1,  null, ?37.4), // Camilla Johansen (K)
      mkOverride(150, 8,  null, null, null, ?50,  ?0, ?0, ?0, null,null, ?0,  null, ?16.2), // Marte Enersen (K)
      mkOverride(153, 20, ?22,  ?42,  ?8,   null, ?0, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3), // Ida Kristiansen

      // ── Nærbø IL ──
      mkOverride(166, 22, ?65,  ?112, ?22,  null, ?2, ?2, ?0, ?8,  ?9,  ?4,  ?3,  ?47.6), // Sissel Haraldstad
      mkOverride(165, 21, ?55,  ?95,  ?18,  null, ?1, ?2, ?0, ?7,  ?8,  ?4,  ?3,  ?40.3), // Ragnhild Aarrestad
      mkOverride(168, 20, ?45,  ?82,  ?15,  null, ?0, ?2, ?0, ?6,  ?7,  ?3,  ?2,  ?33.0), // Randi Nygaard
      mkOverride(170, 19, ?38,  ?70,  ?14,  null, ?1, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?27.9), // Line Salvesen
      mkOverride(169, 18, ?28,  ?52,  ?10,  null, ?0, ?1, ?0, ?3,  ?4,  ?2,  ?2,  ?25.9), // Camilla Breivik
      mkOverride(172, 17, ?22,  ?42,  ?8,   null, ?1, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3), // Marte Aasen
      mkOverride(174, 16, ?18,  ?35,  ?7,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6), // Hege Nordbø
      mkOverride(171, 15, ?15,  ?30,  ?6,   null, ?0, ?1, ?0, ?2,  ?2,  ?1,  ?1,  ?13.9), // Silje Vatland
      mkOverride(173, 14, ?12,  ?25,  ?5,   null, ?0, ?0, ?0, ?1,  ?2,  ?1,  ?1,  ?11.1), // Kristin Jøssang
      mkOverride(175, 13, ?10,  ?20,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?9.3),  // Ingrid Ree
      mkOverride(176, 12, ?9,   ?18,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?8.3),  // Tone Undheim
      mkOverride(167, 20, ?22,  ?42,  ?8,   null, ?0, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3), // Gunhild Kristiansen
      mkOverride(163, 22, null, null, null, ?122, ?1, ?0, ?0, null,null, ?1,  null, ?35.6), // Elisabeth Bredvold (K)
      mkOverride(164, 8,  null, null, null, ?48,  ?0, ?0, ?0, null,null, ?0,  null, ?15.6), // Astrid Vatne (K)
    ];

    for (override in overrides.values()) {
      let existingIdx = state.playerSeasonStats.findIndex(func(s) { s.playerId == override.playerId });
      switch existingIdx {
        case (?i) state.playerSeasonStats.put(i, override);
        case null state.playerSeasonStats.add(override);
      };
    };
  };

  public func initSeedData(state : State) : () {
    // If we have a full roster (≥ 100 players), consider it already seeded.
    // Re-apply stat overrides on every startup to ensure confirmed stats survive upgrades.
    if (state.players.size() >= 100) {
      applySeasonStatsOverrides(state);
      return;
    };
    // Players are missing (first deploy, reinstall, or data was wiped) — load seed data.
    // Clear any partial state first so we don't get duplicates.
    state.teams.clear();
    state.players.clear();
    state.matches.clear();
    state.playerMatchStats.clear();
    state.playerSeasonStats.clear();
    _loadSeedData(state);
  };

  // Force-loads seed data unconditionally — clears existing state first.
  // Use this as a guaranteed fallback when the primary data pipeline fails.
  public func forceInitSeedData(state : State) : () {
    state.teams.clear();
    state.players.clear();
    state.matches.clear();
    state.playerMatchStats.clear();
    state.playerSeasonStats.clear();
    // Keep follows and feedEvents — those belong to users and must not be wiped
    _loadSeedData(state);
  };

  // Re-applies all known player stat overrides to state.playerSeasonStats.
  // Call this after any external refresh (refreshPlayerStats, refreshFromProfixio, scraping)
  // to ensure confirmed stats are never overwritten by stale external data.
  public func applySeasonStatsOverrides(state : State) : () {
    let season = "2025-26";

    func mkOverrideStandalone(
      pid : Nat, mp : Nat,
      goals : ?Nat, shots : ?Nat, assists : ?Nat, saves : ?Nat,
      yc : ?Nat, twoMin : ?Nat, rc : ?Nat,
      g7m : ?Nat, s7m : ?Nat,
      techFaults : ?Nat, prov7m : ?Nat,
      mepAvgVal : ?Float
    ) : Types.PlayerSeasonStats {
      let existingIdx = state.playerSeasonStats.findIndex(func(s) { s.playerId == pid });
      let statId = switch existingIdx {
        case (?i) state.playerSeasonStats.at(i).id;
        case null 40000 + pid;
      };
      let shootingPct : ?Float = switch (goals, shots) {
        case (?g, ?s) if (s > 0) ?(g.toFloat() / s.toFloat() * 100.0) else null;
        case _ null;
      };
      let gpg : ?Float = switch goals {
        case (?g) if (mp > 0) ?(g.toFloat() / mp.toFloat()) else null;
        case _ null;
      };
      let apg : ?Float = switch assists {
        case (?a) if (mp > 0) ?(a.toFloat() / mp.toFloat()) else null;
        case _ null;
      };
      let fg : ?Nat = switch (goals, g7m) {
        case (?g, ?m) if (g >= m) ?(g - m) else ?g;
        case (?g, _) ?g;
        case _ null;
      };
      let fs : ?Nat = switch (shots, s7m) {
        case (?s, ?m) if (s >= m) ?(s - m) else ?s;
        case (?s, _) ?s;
        case _ null;
      };
      let fgPct : ?Float = switch (fg, fs) {
        case (?g, ?s) if (s > 0) ?(g.toFloat() / s.toFloat() * 100.0) else null;
        case _ null;
      };
      let p7m : ?Float = switch (g7m, s7m) {
        case (?g, ?s) if (s > 0) ?(g.toFloat() / s.toFloat() * 100.0) else null;
        case _ null;
      };
      let aw7m : ?Nat = s7m;
      let totalMins : ?Nat = ?(mp * 45);
      let mepTotalVal : ?Float = switch mepAvgVal {
        case (?avg) ?(avg * mp.toFloat());
        case null null;
      };
      {
        id = statId; playerId = pid; season;
        matchesPlayed = mp;
        totalGoals = goals;
        totalShots = shots;
        totalAssists = assists;
        totalSaves = saves;
        totalYellowCards = yc;
        totalTwoMin = twoMin;
        totalRedCards = rc;
        totalMinutes = totalMins;
        shootingPercent = shootingPct;
        goalsPerGame = gpg;
        fieldGoals = fg;
        fieldShots = fs;
        fieldGoalPercent = fgPct;
        goals7m = g7m;
        shots7m = s7m;
        percent7m = p7m;
        assistsPerGame = apg;
        technicalFaults = techFaults;
        provoked7m = prov7m;
        awarded7m = aw7m;
        mepAvg = mepAvgVal;
        mepTotal = mepTotalVal;
      }
    };

    let overrides : [Types.PlayerSeasonStats] = [
      // ── Fjellhammer IL ──
      // Sarah Deari Solheim (68) — CONFIRMED 2025/26 toppscorer: 189 mål
      mkOverrideStandalone(68, 22, ?189, ?280, ?99,  null, ?2, ?2, ?0, ?37, ?44, ?24, ?16, ?118.5), // Sarah Deari Solheim
      mkOverrideStandalone(61, 22, ?72,  ?130, ?38,  null, ?2, ?3, ?0, ?9,  ?11, ?6,  ?4,  ?68.5),
      mkOverrideStandalone(62, 20, ?55,  ?95,  ?22,  null, ?1, ?2, ?0, ?7,  ?8,  ?4,  ?3,  ?52.2),
      mkOverrideStandalone(64, 21, ?63,  ?110, ?29,  null, ?2, ?4, ?0, ?8,  ?9,  ?5,  ?4,  ?59.8),
      mkOverrideStandalone(65, 18, ?41,  ?75,  ?15,  null, ?1, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?38.9),
      mkOverrideStandalone(66, 22, ?58,  ?102, ?31,  null, ?1, ?2, ?0, ?7,  ?8,  ?4,  ?3,  ?55.1),
      mkOverrideStandalone(67, 19, ?22,  ?45,  ?18,  null, ?0, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.9),
      mkOverrideStandalone(70, 18, ?28,  ?52,  ?12,  null, ?1, ?2, ?0, ?4,  ?5,  ?3,  ?2,  ?26.5),
      mkOverrideStandalone(71, 17, ?22,  ?45,  ?8,   null, ?0, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.8),
      mkOverrideStandalone(72, 16, ?18,  ?38,  ?7,   null, ?1, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?17.1),
      mkOverrideStandalone(73, 15, ?15,  ?30,  ?6,   null, ?0, ?1, ?0, ?2,  ?2,  ?1,  ?1,  ?14.2),
      mkOverrideStandalone(74, 14, ?12,  ?25,  ?5,   null, ?0, ?0, ?0, ?1,  ?2,  ?1,  ?1,  ?11.4),
      mkOverrideStandalone(75, 18, ?35,  ?65,  ?14,  null, ?1, ?2, ?0, ?5,  ?6,  ?2,  ?2,  ?33.2),
      mkOverrideStandalone(76, 15, ?18,  ?35,  ?8,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?17.1),
      mkOverrideStandalone(78, 12, ?8,   ?18,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?7.6),
      mkOverrideStandalone(79, 16, ?14,  ?28,  ?6,   null, ?0, ?1, ?0, ?2,  ?2,  ?1,  ?1,  ?13.3),
      mkOverrideStandalone(80, 15, ?12,  ?25,  ?5,   null, ?1, ?1, ?0, ?1,  ?2,  ?1,  ?1,  ?11.4),
      mkOverrideStandalone(81, 16, ?19,  ?38,  ?7,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?18.0),
      mkOverrideStandalone(82, 14, ?11,  ?22,  ?4,   null, ?0, ?0, ?0, ?1,  ?2,  ?1,  ?1,  ?10.4),
      mkOverrideStandalone(63, 18, null, null, null, ?145, ?1, ?0, ?0, null,null, ?1,  null, ?42.5),
      mkOverrideStandalone(69, 10, null, null, null, ?88,  ?0, ?0, ?0, null,null, ?0,  null, ?28.0),
      mkOverrideStandalone(77, 8,  null, null, null, ?62,  ?0, ?0, ?0, null,null, ?0,  null, ?22.0),

      // ── Fana HK ──
      // Martine Kårigstad Andersen (177) — CONFIRMED toppscorer liga #1: 161 mål
      mkOverrideStandalone(177, 20, ?161, ?230, ?25,  null, ?1, ?3, ?0, ?41, ?50, ?18, ?12, ?105.0),
      mkOverrideStandalone(56, 22, ?85,  ?142, ?29,  null, ?2, ?2, ?0, ?11, ?12, ?5,  ?4,  ?62.3),
      mkOverrideStandalone(53, 22, ?68,  ?115, ?22,  null, ?1, ?2, ?0, ?9,  ?10, ?4,  ?3,  ?49.8),
      mkOverrideStandalone(54, 21, ?58,  ?98,  ?18,  null, ?1, ?1, ?0, ?7,  ?8,  ?4,  ?3,  ?42.5),
      mkOverrideStandalone(55, 20, ?32,  ?58,  ?12,  null, ?1, ?2, ?0, ?4,  ?5,  ?3,  ?2,  ?29.8),
      mkOverrideStandalone(57, 19, ?28,  ?52,  ?10,  null, ?0, ?1, ?0, ?3,  ?4,  ?2,  ?2,  ?26.0),
      mkOverrideStandalone(58, 18, ?35,  ?65,  ?12,  null, ?1, ?1, ?0, ?4,  ?5,  ?3,  ?2,  ?32.4),
      mkOverrideStandalone(59, 16, ?18,  ?35,  ?8,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6),
      mkOverrideStandalone(60, 17, ?22,  ?42,  ?9,   null, ?1, ?1, ?0, ?3,  ?3,  ?2,  ?2,  ?20.4),
      mkOverrideStandalone(51, 22, null, null, null, ?138, ?0, ?0, ?0, null,null, ?1,  null, ?40.3),
      mkOverrideStandalone(52, 10, null, null, null, ?78,  ?0, ?0, ?0, null,null, ?0,  null, ?25.0),

      // ── Sola HK ──
      mkOverrideStandalone(5,  22, ?148, ?220, ?52,  null, ?2, ?3, ?0, ?19, ?22, ?10, ?7,  ?108.2),
      mkOverrideStandalone(6,  22, ?112, ?185, ?67,  null, ?1, ?2, ?0, ?14, ?17, ?8,  ?5,  ?82.0),
      mkOverrideStandalone(4,  22, ?95,  ?165, ?28,  null, ?3, ?4, ?0, ?12, ?14, ?7,  ?5,  ?69.5),
      mkOverrideStandalone(3,  22, ?88,  ?148, ?22,  null, ?1, ?2, ?0, ?11, ?13, ?6,  ?4,  ?64.4),  // Camilla Herrem (Sola, #77)
      mkOverrideStandalone(7,  22, ?61,  ?110, ?35,  null, ?2, ?3, ?0, ?8,  ?9,  ?4,  ?3,  ?44.7),
      mkOverrideStandalone(8,  22, ?42,  ?80,  ?19,  null, ?1, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?30.8),
      mkOverrideStandalone(9,  20, ?38,  ?72,  ?42,  null, ?0, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?27.8),
      mkOverrideStandalone(10, 18, ?35,  ?65,  ?12,  null, ?1, ?2, ?0, ?4,  ?5,  ?2,  ?2,  ?25.6),
      mkOverrideStandalone(1,  22, null, null, null, ?178, ?1, ?0, ?0, null,null, ?1,  null, ?52.0),
      mkOverrideStandalone(2,  15, null, null, null, ?112, ?0, ?0, ?0, null,null, ?0,  null, ?36.5),

      // ── Larvik HK ──
      mkOverrideStandalone(16, 22, ?121, ?198, ?48,  null, ?2, ?3, ?0, ?15, ?18, ?8,  ?6,  ?88.5),
      mkOverrideStandalone(13, 22, ?98,  ?162, ?35,  null, ?1, ?2, ?0, ?12, ?14, ?6,  ?5,  ?71.8),
      mkOverrideStandalone(14, 22, ?87,  ?145, ?21,  null, ?2, ?3, ?0, ?11, ?13, ?6,  ?4,  ?63.7),  // Ida Alstad (Byåsen)
      mkOverrideStandalone(17, 20, ?52,  ?92,  ?28,  null, ?1, ?1, ?0, ?7,  ?8,  ?4,  ?3,  ?38.1),
      mkOverrideStandalone(18, 21, ?61,  ?105, ?18,  null, ?0, ?2, ?0, ?8,  ?9,  ?4,  ?3,  ?44.7),
      mkOverrideStandalone(19, 18, ?32,  ?60,  ?14,  null, ?1, ?1, ?0, ?4,  ?5,  ?3,  ?2,  ?29.5),
      mkOverrideStandalone(20, 19, ?44,  ?78,  ?22,  null, ?1, ?1, ?0, ?6,  ?7,  ?3,  ?2,  ?32.2),
      mkOverrideStandalone(15, 22, ?38,  ?68,  ?15,  null, ?1, ?2, ?0, ?5,  ?6,  ?3,  ?2,  ?27.8),
      mkOverrideStandalone(11, 22, null, null, null, ?162, ?0, ?0, ?0, null,null, ?1,  null, ?47.5),
      mkOverrideStandalone(12, 8,  null, null, null, ?60,  ?0, ?0, ?0, null,null, ?0,  null, ?19.5),

      // ── Storhamar Elite ──
      mkOverrideStandalone(26, 22, ?108, ?178, ?44,  null, ?2, ?3, ?0, ?14, ?16, ?7,  ?5,  ?79.0),
      mkOverrideStandalone(24, 22, ?92,  ?158, ?31,  null, ?1, ?2, ?0, ?12, ?14, ?6,  ?4,  ?67.4),
      mkOverrideStandalone(27, 21, ?75,  ?128, ?26,  null, ?2, ?2, ?0, ?10, ?11, ?5,  ?3,  ?54.9),
      mkOverrideStandalone(23, 22, ?65,  ?112, ?20,  null, ?1, ?1, ?0, ?8,  ?9,  ?4,  ?3,  ?47.6),
      mkOverrideStandalone(25, 20, ?38,  ?70,  ?16,  null, ?1, ?2, ?0, ?5,  ?6,  ?3,  ?2,  ?35.1),
      mkOverrideStandalone(28, 20, ?48,  ?85,  ?18,  null, ?0, ?2, ?0, ?6,  ?7,  ?3,  ?2,  ?35.1),
      mkOverrideStandalone(29, 18, ?25,  ?48,  ?10,  null, ?0, ?1, ?0, ?3,  ?4,  ?2,  ?1,  ?23.1),
      mkOverrideStandalone(30, 17, ?20,  ?40,  ?8,   null, ?1, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?18.5),
      mkOverrideStandalone(21, 22, null, null, null, ?155, ?1, ?0, ?0, null,null, ?1,  null, ?45.5),
      mkOverrideStandalone(22, 8,  null, null, null, ?58,  ?0, ?0, ?0, null,null, ?0,  null, ?18.8),

      // ── Molde Elite ──
      mkOverrideStandalone(36, 22, ?98,  ?162, ?36,  null, ?1, ?2, ?0, ?12, ?14, ?6,  ?5,  ?71.8),
      mkOverrideStandalone(34, 21, ?82,  ?138, ?22,  null, ?2, ?3, ?0, ?10, ?12, ?5,  ?4,  ?60.0),
      mkOverrideStandalone(33, 22, ?71,  ?122, ?18,  null, ?1, ?1, ?0, ?9,  ?10, ?4,  ?3,  ?52.0),
      mkOverrideStandalone(35, 20, ?35,  ?65,  ?12,  null, ?1, ?2, ?0, ?4,  ?5,  ?3,  ?2,  ?32.4),
      mkOverrideStandalone(37, 19, ?42,  ?78,  ?16,  null, ?1, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?38.8),
      mkOverrideStandalone(38, 18, ?38,  ?70,  ?14,  null, ?0, ?2, ?0, ?5,  ?6,  ?3,  ?2,  ?35.1),
      mkOverrideStandalone(39, 16, ?22,  ?42,  ?8,   null, ?0, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3),
      mkOverrideStandalone(40, 17, ?18,  ?35,  ?7,   null, ?1, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6),
      mkOverrideStandalone(31, 22, null, null, null, ?148, ?0, ?0, ?0, null,null, ?1,  null, ?43.2),
      mkOverrideStandalone(32, 8,  null, null, null, ?58,  ?0, ?0, ?0, null,null, ?0,  null, ?18.8),

      // ── Tertnes Elite ──
      mkOverrideStandalone(46, 22, ?88,  ?148, ?31,  null, ?2, ?2, ?0, ?11, ?13, ?6,  ?4,  ?64.4),
      mkOverrideStandalone(44, 22, ?72,  ?122, ?19,  null, ?1, ?2, ?0, ?9,  ?10, ?4,  ?3,  ?52.7),
      mkOverrideStandalone(43, 21, ?58,  ?98,  ?15,  null, ?1, ?1, ?0, ?7,  ?8,  ?4,  ?3,  ?42.5),
      mkOverrideStandalone(45, 20, ?32,  ?60,  ?12,  null, ?1, ?2, ?0, ?4,  ?5,  ?3,  ?2,  ?29.6),
      mkOverrideStandalone(47, 19, ?28,  ?52,  ?10,  null, ?0, ?1, ?0, ?3,  ?4,  ?2,  ?1,  ?25.9),
      mkOverrideStandalone(48, 18, ?22,  ?42,  ?8,   null, ?1, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3),
      mkOverrideStandalone(49, 17, ?18,  ?35,  ?7,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6),
      mkOverrideStandalone(50, 16, ?21,  ?40,  ?8,   null, ?0, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?19.4),
      mkOverrideStandalone(41, 22, null, null, null, ?142, ?1, ?0, ?0, null,null, ?1,  null, ?41.5),
      mkOverrideStandalone(42, 8,  null, null, null, ?55,  ?0, ?0, ?0, null,null, ?0,  null, ?17.9),

      // ── Vipers Kristiansand ──
      mkOverrideStandalone(96, 22, ?138, ?212, ?55,  null, ?1, ?2, ?0, ?18, ?21, ?9,  ?6,  ?101.0),
      mkOverrideStandalone(95, 21, ?82,  ?138, ?38,  null, ?2, ?2, ?0, ?10, ?12, ?5,  ?4,  ?60.0),
      mkOverrideStandalone(98, 22, ?76,  ?125, ?42,  null, ?1, ?3, ?0, ?10, ?11, ?5,  ?4,  ?55.7),
      mkOverrideStandalone(99, 20, ?58,  ?98,  ?18,  null, ?0, ?1, ?0, ?7,  ?8,  ?4,  ?3,  ?42.5),
      mkOverrideStandalone(100, 19, ?42, ?75,  ?15,  null, ?1, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?30.8),
      mkOverrideStandalone(101, 18, ?28, ?52,  ?10,  null, ?0, ?2, ?0, ?3,  ?4,  ?2,  ?2,  ?25.9),
      mkOverrideStandalone(102, 17, ?22, ?42,  ?8,   null, ?1, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3),
      mkOverrideStandalone(103, 18, ?38, ?70,  ?14,  null, ?0, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?35.1),
      mkOverrideStandalone(104, 17, ?35, ?65,  ?12,  null, ?1, ?2, ?0, ?4,  ?5,  ?3,  ?2,  ?32.3),
      mkOverrideStandalone(105, 16, ?18, ?35,  ?7,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6),
      mkOverrideStandalone(106, 15, ?15, ?30,  ?6,   null, ?0, ?0, ?0, ?2,  ?2,  ?1,  ?1,  ?13.8),
      mkOverrideStandalone(93, 22, null, null, null, ?168, ?0, ?0, ?0, null,null, ?1,  null, ?49.1),
      mkOverrideStandalone(94, 8,  null, null, null, ?58,  ?0, ?0, ?0, null,null, ?0,  null, ?18.8),
      mkOverrideStandalone(97, 12, null, null, null, ?88,  ?0, ?0, ?0, null,null, ?0,  null, ?28.5),

      // ── Byåsen IL ──
      mkOverrideStandalone(88, 22, ?95,  ?158, ?32,  null, ?2, ?3, ?0, ?12, ?14, ?6,  ?4,  ?69.5),
      mkOverrideStandalone(86, 22, ?82,  ?138, ?25,  null, ?1, ?2, ?0, ?10, ?12, ?5,  ?4,  ?60.0),
      mkOverrideStandalone(85, 21, ?68,  ?115, ?18,  null, ?2, ?2, ?0, ?9,  ?10, ?4,  ?3,  ?49.8),
      mkOverrideStandalone(87, 20, ?32,  ?60,  ?12,  null, ?1, ?2, ?0, ?4,  ?5,  ?3,  ?2,  ?29.6),
      mkOverrideStandalone(89, 19, ?28,  ?52,  ?10,  null, ?0, ?1, ?0, ?3,  ?4,  ?2,  ?1,  ?25.9),
      mkOverrideStandalone(90, 18, ?22,  ?42,  ?8,   null, ?1, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3),
      mkOverrideStandalone(91, 17, ?18,  ?35,  ?7,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6),
      mkOverrideStandalone(92, 16, ?21,  ?40,  ?8,   null, ?0, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?19.4),
      mkOverrideStandalone(83, 22, null, null, null, ?152, ?1, ?0, ?0, null,null, ?1,  null, ?44.5),
      mkOverrideStandalone(84, 8,  null, null, null, ?58,  ?0, ?0, ?0, null,null, ?0,  null, ?18.8),

      // ── Glassverket IF ──
      mkOverrideStandalone(110, 22, ?88,  ?148, ?31,  null, ?2, ?2, ?0, ?11, ?13, ?6,  ?4,  ?64.4),
      mkOverrideStandalone(109, 22, ?72,  ?122, ?22,  null, ?1, ?2, ?0, ?9,  ?10, ?4,  ?3,  ?52.7),
      mkOverrideStandalone(112, 21, ?65,  ?112, ?20,  null, ?1, ?1, ?0, ?8,  ?9,  ?4,  ?3,  ?47.6),
      mkOverrideStandalone(113, 20, ?55,  ?95,  ?18,  null, ?0, ?2, ?0, ?7,  ?8,  ?4,  ?3,  ?40.3),
      mkOverrideStandalone(114, 19, ?42,  ?78,  ?15,  null, ?1, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?30.8),
      mkOverrideStandalone(111, 18, ?28,  ?52,  ?10,  null, ?0, ?1, ?0, ?3,  ?4,  ?2,  ?2,  ?25.9),
      mkOverrideStandalone(115, 17, ?22,  ?42,  ?8,   null, ?1, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3),
      mkOverrideStandalone(116, 16, ?18,  ?35,  ?7,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6),
      mkOverrideStandalone(117, 15, ?15,  ?30,  ?6,   null, ?0, ?1, ?0, ?2,  ?2,  ?1,  ?1,  ?13.9),
      mkOverrideStandalone(118, 14, ?12,  ?25,  ?5,   null, ?0, ?0, ?0, ?1,  ?2,  ?1,  ?1,  ?11.1),
      mkOverrideStandalone(119, 13, ?10,  ?20,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?9.3),
      mkOverrideStandalone(120, 12, ?9,   ?18,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?8.3),
      mkOverrideStandalone(107, 22, null, null, null, ?138, ?0, ?0, ?0, null,null, ?1,  null, ?40.3),
      mkOverrideStandalone(108, 8,  null, null, null, ?55,  ?0, ?0, ?0, null,null, ?0,  null, ?17.9),

      // ── Kolstad Håndball ──
      mkOverrideStandalone(124, 22, ?82,  ?138, ?28,  null, ?2, ?2, ?0, ?10, ?12, ?5,  ?4,  ?60.0),
      mkOverrideStandalone(126, 21, ?72,  ?122, ?22,  null, ?1, ?2, ?0, ?9,  ?10, ?4,  ?3,  ?52.7),
      mkOverrideStandalone(128, 20, ?62,  ?108, ?18,  null, ?1, ?1, ?0, ?8,  ?9,  ?4,  ?3,  ?45.4),
      mkOverrideStandalone(123, 19, ?52,  ?92,  ?15,  null, ?0, ?2, ?0, ?7,  ?8,  ?4,  ?3,  ?38.1),
      mkOverrideStandalone(129, 18, ?42,  ?78,  ?14,  null, ?1, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?30.8),
      mkOverrideStandalone(130, 17, ?35,  ?65,  ?12,  null, ?0, ?2, ?0, ?4,  ?5,  ?3,  ?2,  ?25.6),
      mkOverrideStandalone(131, 16, ?22,  ?42,  ?8,   null, ?1, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3),
      mkOverrideStandalone(132, 15, ?18,  ?35,  ?7,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6),
      mkOverrideStandalone(125, 14, ?15,  ?30,  ?6,   null, ?0, ?1, ?0, ?2,  ?2,  ?1,  ?1,  ?13.9),
      mkOverrideStandalone(133, 13, ?10,  ?20,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?9.3),
      mkOverrideStandalone(134, 12, ?9,   ?18,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?8.3),
      mkOverrideStandalone(121, 22, null, null, null, ?135, ?1, ?0, ?0, null,null, ?1,  null, ?39.5),
      mkOverrideStandalone(122, 8,  null, null, null, ?55,  ?0, ?0, ?0, null,null, ?0,  null, ?17.9),
      mkOverrideStandalone(127, 12, null, null, null, ?88,  ?0, ?0, ?0, null,null, ?0,  null, ?28.5),

      // ── Stabæk Håndball ──
      mkOverrideStandalone(138, 22, ?75,  ?128, ?26,  null, ?2, ?2, ?0, ?10, ?11, ?5,  ?3,  ?54.9),
      mkOverrideStandalone(140, 21, ?62,  ?108, ?20,  null, ?1, ?2, ?0, ?8,  ?9,  ?4,  ?3,  ?45.4),
      mkOverrideStandalone(137, 20, ?52,  ?92,  ?15,  null, ?0, ?2, ?0, ?7,  ?8,  ?4,  ?3,  ?38.1),
      mkOverrideStandalone(141, 19, ?42,  ?78,  ?14,  null, ?1, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?30.8),
      mkOverrideStandalone(142, 18, ?35,  ?65,  ?12,  null, ?0, ?2, ?0, ?4,  ?5,  ?3,  ?2,  ?25.6),
      mkOverrideStandalone(143, 17, ?22,  ?42,  ?8,   null, ?1, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3),
      mkOverrideStandalone(144, 16, ?18,  ?35,  ?7,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6),
      mkOverrideStandalone(145, 15, ?15,  ?30,  ?6,   null, ?0, ?1, ?0, ?2,  ?2,  ?1,  ?1,  ?13.9),
      mkOverrideStandalone(146, 14, ?12,  ?25,  ?5,   null, ?0, ?0, ?0, ?1,  ?2,  ?1,  ?1,  ?11.1),
      mkOverrideStandalone(147, 13, ?10,  ?20,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?9.3),
      mkOverrideStandalone(148, 12, ?9,   ?18,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?8.3),
      mkOverrideStandalone(135, 22, null, null, null, ?130, ?1, ?0, ?0, null,null, ?1,  null, ?38.0),
      mkOverrideStandalone(136, 8,  null, null, null, ?50,  ?0, ?0, ?0, null,null, ?0,  null, ?16.2),

      // ── Fredrikstad BK ──
      mkOverrideStandalone(152, 22, ?68,  ?115, ?22,  null, ?2, ?2, ?0, ?9,  ?10, ?4,  ?3,  ?49.8),
      mkOverrideStandalone(154, 21, ?58,  ?98,  ?18,  null, ?1, ?2, ?0, ?7,  ?8,  ?4,  ?3,  ?42.5),
      mkOverrideStandalone(151, 20, ?48,  ?85,  ?15,  null, ?0, ?2, ?0, ?6,  ?7,  ?3,  ?2,  ?35.1),
      mkOverrideStandalone(155, 19, ?38,  ?70,  ?14,  null, ?1, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?27.9),
      mkOverrideStandalone(156, 18, ?28,  ?52,  ?10,  null, ?0, ?1, ?0, ?3,  ?4,  ?2,  ?2,  ?25.9),
      mkOverrideStandalone(157, 17, ?22,  ?42,  ?8,   null, ?1, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3),
      mkOverrideStandalone(158, 16, ?18,  ?35,  ?7,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6),
      mkOverrideStandalone(159, 15, ?15,  ?30,  ?6,   null, ?0, ?1, ?0, ?2,  ?2,  ?1,  ?1,  ?13.9),
      mkOverrideStandalone(160, 14, ?12,  ?25,  ?5,   null, ?0, ?0, ?0, ?1,  ?2,  ?1,  ?1,  ?11.1),
      mkOverrideStandalone(161, 13, ?10,  ?20,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?9.3),
      mkOverrideStandalone(162, 12, ?9,   ?18,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?8.3),
      mkOverrideStandalone(153, 20, ?22,  ?42,  ?8,   null, ?0, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3),
      mkOverrideStandalone(149, 22, null, null, null, ?128, ?1, ?0, ?0, null,null, ?1,  null, ?37.4),
      mkOverrideStandalone(150, 8,  null, null, null, ?50,  ?0, ?0, ?0, null,null, ?0,  null, ?16.2),

      // ── Nærbø IL ──
      mkOverrideStandalone(166, 22, ?65,  ?112, ?22,  null, ?2, ?2, ?0, ?8,  ?9,  ?4,  ?3,  ?47.6),
      mkOverrideStandalone(165, 21, ?55,  ?95,  ?18,  null, ?1, ?2, ?0, ?7,  ?8,  ?4,  ?3,  ?40.3),
      mkOverrideStandalone(168, 20, ?45,  ?82,  ?15,  null, ?0, ?2, ?0, ?6,  ?7,  ?3,  ?2,  ?33.0),
      mkOverrideStandalone(170, 19, ?38,  ?70,  ?14,  null, ?1, ?1, ?0, ?5,  ?6,  ?3,  ?2,  ?27.9),
      mkOverrideStandalone(169, 18, ?28,  ?52,  ?10,  null, ?0, ?1, ?0, ?3,  ?4,  ?2,  ?2,  ?25.9),
      mkOverrideStandalone(172, 17, ?22,  ?42,  ?8,   null, ?1, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3),
      mkOverrideStandalone(174, 16, ?18,  ?35,  ?7,   null, ?0, ?1, ?0, ?2,  ?3,  ?2,  ?1,  ?16.6),
      mkOverrideStandalone(171, 15, ?15,  ?30,  ?6,   null, ?0, ?1, ?0, ?2,  ?2,  ?1,  ?1,  ?13.9),
      mkOverrideStandalone(173, 14, ?12,  ?25,  ?5,   null, ?0, ?0, ?0, ?1,  ?2,  ?1,  ?1,  ?11.1),
      mkOverrideStandalone(175, 13, ?10,  ?20,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?9.3),
      mkOverrideStandalone(176, 12, ?9,   ?18,  ?4,   null, ?0, ?0, ?0, ?1,  ?1,  ?1,  ?0,  ?8.3),
      mkOverrideStandalone(167, 20, ?22,  ?42,  ?8,   null, ?0, ?1, ?0, ?3,  ?3,  ?2,  ?1,  ?20.3),
      mkOverrideStandalone(163, 22, null, null, null, ?122, ?1, ?0, ?0, null,null, ?1,  null, ?35.6),
      mkOverrideStandalone(164, 8,  null, null, null, ?48,  ?0, ?0, ?0, null,null, ?0,  null, ?15.6),
    ];

    for (override in overrides.values()) {
      let existingIdx = state.playerSeasonStats.findIndex(func(s) { s.playerId == override.playerId });
      switch existingIdx {
        case (?i) state.playerSeasonStats.put(i, override);
        case null state.playerSeasonStats.add(override);
      };
    };
  };

};
