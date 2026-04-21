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
  let lockedPlayerIds : [Nat] = [23, 241, 195];

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
    // REMA 1000-ligaen kvinner 2025/2026 - scraped from handball.no
    let teamsData : [(Nat, Text, Text)] = [
      (1, "Sola",                        "sola"),
      (2, "Storhamar Elite",             "storhamar-elite"),
      (3, "Molde Elite",                 "molde-elite"),
      (4, "Larvik",                      "larvik"),
      (5, "Tertnes Elite",               "tertnes-elite"),
      (6, "Fana",                        "fana"),
      (7, "Byåsen Elite",                "byasen-elite"),
      (8, "Fredrikstad",                 "fredrikstad"),
      (9, "Gjerpen Håndball",            "gjerpen-handball"),
      (10, "Follo HK Damer",              "follo-hk-damer"),
      (11, "Oppsal",                      "oppsal"),
      (12, "Fjellhammer",                 "fjellhammer"),
      (13, "Haslum Damer",                "haslum-damer"),
      (14, "Romerike Ravens",             "romerike-ravens"),
    ];
    for ((id, name, slug) in teamsData.values()) {
      state.teams.add({
        id; name; slug;
        logoUrl = null;
        standingsRank = null;
        matchesPlayed = null;
        points = null;
        goalDifference = null;
      });
    };

    // Players 1-50
    let playersBatch1 : [(Nat, Text, Text, Nat, Types.Position, ?Nat)] = [
      (1, "Ine Skartveit Bergsvik", "ine-skartveit-bergsvik", 1, #Keeper, ?1),
      (2, "Frida Brandbu Andersen", "frida-brandbu-andersen", 1, #Bakspiller, ?3),
      (3, "Malin Holta", "malin-holta", 1, #VenstreKant, ?5),
      (4, "Selma Helén Henriksen", "selma-helen-henriksen", 1, #Linje, ?6),
      (5, "Synne With", "synne-with", 1, #HoyreKant, ?7),
      (6, "Kaja Horst Haugseng", "kaja-horst-haugseng", 1, #Linje, ?9),
      (7, "Hanna Stormyr Ræstad", "hanna-stormyr-raestad", 1, #HoyreKant, ?11),
      (8, "Rikke Marie Granlund", "rikke-marie-granlund", 1, #Keeper, ?12),
      (9, "Ine Erlandsen Grimsrud", "ine-erlandsen-grimsrud", 1, #HoyreKant, ?14),
      (10, "Maria Khan", "maria-khan", 1, #HoyreKant, ?15),
      (11, "Hedda Eggen Granli", "hedda-eggen-granli", 1, #Keeper, ?16),
      (12, "Kristiane Knutsen", "kristiane-knutsen", 1, #Bakspiller, ?17),
      (13, "Dina Klungtveit Olufsen", "dina-klungtveit-olufsen", 1, #HoyreKant, ?21),
      (14, "Pia Grønstad", "pia-gronstad", 1, #HoyreKant, ?22),
      (15, "Vilde Refsland", "vilde-refsland", 1, #VenstreKant, ?23),
      (16, "Elise Utsola", "elise-utsola", 1, #Bakspiller, ?23),
      (17, "Martha Barka", "martha-barka", 1, #HoyreKant, ?24),
      (18, "Merlinda Qorraj", "merlinda-qorraj", 1, #VenstreKant, ?25),
      (19, "Thea Kristensen", "thea-kristensen", 1, #VenstreKant, ?29),
      (20, "Sara Todireanu Thorsen", "sara-todireanu-thorsen", 1, #Bakspiller, ?31),
      (21, "Melanie Mie Bak", "melanie-mie-bak", 1, #VenstreKant, ?39),
      (22, "Hege Holgersen Danielsen", "hege-holgersen-danielsen", 1, #Linje, ?49),
      (23, "Camilla Herrem", "camilla-herrem", 1, #VenstreKant, ?77),
      (24, "Malin Larsen Aune", "malin-larsen-aune", 2, #HoyreKant, ?6),
      (25, "Ingeborg Storbæk Monné", "ingeborg-storbaek-monne", 2, #VenstreKant, ?7),
      (26, "Mathilde Rivas-Toft", "mathilde-rivas-toft", 2, #HoyreKant, ?9),
      (27, "Kristin Venn", "kristin-venn", 2, #VenstreKant, ?10),
      (28, "Tonje Enkerud", "tonje-enkerud", 2, #VenstreKant, ?11),
      (29, "Monika Høistad Bruce", "monika-hoistad-bruce", 2, #Linje, ?14),
      (30, "Elise Skinnehaugen", "elise-skinnehaugen", 2, #HoyreKant, ?15),
      (31, "Julie Victoria Nordevall", "julie-victoria-nordevall", 2, #Keeper, ?16),
      (32, "Pernille Brandenborg", "pernille-brandenborg", 2, #Linje, ?18),
      (33, "Celina Vatne", "celina-vatne", 2, #VenstreKant, ?19),
      (34, "Nora Isabell Husom Nordstrand", "nora-isabell-husom-nordstrand", 2, #HoyreKant, ?20),
      (35, "Anniken Obaidli", "anniken-obaidli", 2, #Bakspiller, ?25),
      (36, "Ada Aalstad", "ada-aalstad", 2, #Bakspiller, ?29),
      (37, "Eli Marie Raasok", "eli-marie-raasok", 2, #Keeper, ?30),
      (38, "Kjerstin Boge Solås", "kjerstin-boge-solas", 2, #VenstreKant, ?31),
      (39, "Sanne Løkka Hagen", "sanne-lokka-hagen", 2, #HoyreKant, ?33),
      (40, "Oda Cathrine Lunne Mastad", "oda-cathrine-lunne-mastad", 2, #Linje, ?37),
      (41, "June Cecilie Krogh", "june-cecilie-krogh", 2, #Keeper, ?55),
      (42, "Veronika Kafka Malá", "veronika-kafka-mal", 2, #VenstreKant, ?67),
      (43, "Eli Smørgrav Skogstrand", "eli-smorgrav-skogstrand", 3, #Keeper, ?1),
      (44, "Mia Kristine Strand", "mia-kristine-strand", 3, #HoyreKant, ?2),
      (45, "Johanne Halseth Nypan", "johanne-halseth-nypan", 3, #HoyreKant, ?7),
      (46, "Runa Heimsjø Sand", "runa-heimsjo-sand", 3, #VenstreKant, ?9),
      (47, "Lene Kristiansen Tveiten", "lene-kristiansen-tveiten", 3, #Bakspiller, ?10),
      (48, "Fanny Alma Elovson", "fanny-alma-elovson", 3, #VenstreKant, ?11),
      (49, "Henrikke Hauge Kjølholdt", "henrikke-hauge-kjolholdt", 3, #HoyreKant, ?15),
      (50, "Torine Hjelme Dalen", "torine-hjelme-dalen", 3, #VenstreKant, ?18),
    ];
    for ((id, name, slug, teamId, position, jerseyNumber) in playersBatch1.values()) {
      state.players.add({
        id; name; slug; teamId; position; jerseyNumber;
        imageUrl = null;
        nationality = ?"NO";
        isActive = true;
      });
    };

    // Players 51-100
    let playersBatch2 : [(Nat, Text, Text, Nat, Types.Position, ?Nat)] = [
      (51, "Maja Sofie Muri", "maja-sofie-muri", 3, #Linje, ?20),
      (52, "Lise Slemmen Gussiås", "lise-slemmen-gussias", 3, #Keeper, ?24),
      (53, "Tonje Løseth", "tonje-loseth", 3, #VenstreKant, ?25),
      (54, "Kaja Røhne", "kaja-rohne", 3, #Linje, ?26),
      (55, "Julia Hessen", "julia-hessen", 3, #Bakspiller, ?30),
      (56, "Julie Bøe Jacobsen", "julie-boe-jacobsen", 3, #Bakspiller, ?33),
      (57, "Yazmin Yamundow Marie Ceesay", "yazmin-yamundow-marie-ceesay", 3, #HoyreKant, ?34),
      (58, "Ingeborg Johanne Nyborg Tømmervåg", "ingeborg-johanne-nyborg-tommervag", 3, #Linje, ?39),
      (59, "Jenny Carlsson", "jenny-carlsson", 3, #VenstreKant, ?42),
      (60, "Susanne Liberg Amundsen", "susanne-liberg-amundsen", 3, #VenstreKant, ?44),
      (61, "Liv Annik Drechsler", "liv-annik-drechsler", 3, #Linje, ?49),
      (62, "Sakura Hauge", "sakura-hauge", 3, #Keeper, ?87),
      (63, "Olivia Lykke Nygaard", "olivia-lykke-nygaard", 4, #Keeper, ?1),
      (64, "Mari Kirkeby Stensrud", "mari-kirkeby-stensrud", 4, #VenstreKant, ?3),
      (65, "Charlotte Koffeld Iversen", "charlotte-koffeld-iversen", 4, #HoyreKant, ?4),
      (66, "Kine Hauge Kvalsund", "kine-hauge-kvalsund", 4, #VenstreKant, ?5),
      (67, "Constance Hedenstad", "constance-hedenstad", 4, #HoyreKant, ?6),
      (68, "Sara Berg", "sara-berg", 4, #VenstreKant, ?7),
      (69, "Martine Wolff", "martine-wolff", 4, #Linje, ?8),
      (70, "Julie Hulleberg", "julie-hulleberg", 4, #VenstreKant, ?10),
      (71, "Frøydis Wiik Seierstad", "froydis-wiik-seierstad", 4, #Bakspiller, ?11),
      (72, "Dina Frisendal", "dina-frisendal", 4, #Keeper, ?12),
      (73, "Guro Ramberg", "guro-ramberg", 4, #HoyreKant, ?15),
      (74, "Lea Løkke-Øwre", "lea-lokke-owre", 4, #Keeper, ?16),
      (75, "Tuva Engh Auby", "tuva-engh-auby", 4, #Keeper, ?17),
      (76, "Tirill Alexandrine Solumsmoen Mørch", "tirill-alexandrine-solumsmoen-morch", 4, #Linje, ?18),
      (77, "Ingrid Vinjevoll", "ingrid-vinjevoll", 4, #VenstreKant, ?20),
      (78, "Andrea Rønning", "andrea-ronning", 4, #Bakspiller, ?22),
      (79, "Christine Neumann Strøm", "christine-neumann-strom", 4, #Keeper, ?23),
      (80, "Amanda Maria Kurtovic", "amanda-maria-kurtovic", 4, #HoyreKant, ?24),
      (81, "Tiril Birgitte Rosenberg", "tiril-birgitte-rosenberg", 4, #Linje, ?25),
      (82, "Maja Furu Sæteren", "maja-furu-saeteren", 4, #VenstreKant, ?26),
      (83, "Signe Andreassen", "signe-andreassen", 4, #Bakspiller, ?29),
      (84, "Sigrid Ellingsen", "sigrid-ellingsen", 4, #Keeper, ?30),
      (85, "Sanna Langmo Wold", "sanna-langmo-wold", 4, #Keeper, ?30),
      (86, "Nea Angelina Holand Frydenlund", "nea-angelina-holand-frydenlund", 4, #VenstreKant, ?32),
      (87, "Amalie Gram", "amalie-gram", 4, #Bakspiller, ?33),
      (88, "Sarah Römhild", "sarah-romhild", 4, #Bakspiller, ?33),
      (89, "Christina Pedersen", "christina-pedersen", 4, #Bakspiller, ?66),
      (90, "Birgitte Karlsen Hagen", "birgitte-karlsen-hagen", 5, #VenstreKant, ?2),
      (91, "Marthe Hatløy Walde", "marthe-hatloy-walde", 5, #Linje, ?4),
      (92, "Avril Mikkelsen Frei", "avril-mikkelsen-frei", 5, #Bakspiller, ?7),
      (93, "Stella Waagan Kruse", "stella-waagan-kruse", 5, #VenstreKant, ?8),
      (94, "Henriette Espetvedt Eggen", "henriette-espetvedt-eggen", 5, #VenstreKant, ?10),
      (95, "Sara Eline Lauritzen", "sara-eline-lauritzen", 5, #VenstreKant, ?11),
      (96, "Emma Holtet", "emma-holtet", 5, #Linje, ?13),
      (97, "Martine Hellesø Knutsen", "martine-helleso-knutsen", 5, #VenstreKant, ?15),
      (98, "Helle Kjellberg-Line", "helle-kjellberg-line", 5, #Keeper, ?16),
      (99, "Rikke Midtfjeld", "rikke-midtfjeld", 5, #HoyreKant, ?18),
      (100, "Vilde Janbu Fresvik", "vilde-janbu-fresvik", 5, #HoyreKant, ?19),
    ];
    for ((id, name, slug, teamId, position, jerseyNumber) in playersBatch2.values()) {
      state.players.add({
        id; name; slug; teamId; position; jerseyNumber;
        imageUrl = null;
        nationality = ?"NO";
        isActive = true;
      });
    };

    // Players 101-150
    let playersBatch3 : [(Nat, Text, Text, Nat, Types.Position, ?Nat)] = [
      (101, "Fanny Skindlo", "fanny-skindlo", 5, #Bakspiller, ?20),
      (102, "Maria Bergslien Gald", "maria-bergslien-gald", 5, #VenstreKant, ?22),
      (103, "Viktoria Giske", "viktoria-giske", 5, #Linje, ?23),
      (104, "Kadija Mårdalen", "kadija-mardalen", 5, #Keeper, ?24),
      (105, "Marie Kristine Rokkones Hansen", "marie-kristine-rokkones-hansen", 5, #HoyreKant, ?26),
      (106, "Nora Evelina Cecilia Rosenberg", "nora-evelina-cecilia-rosenberg", 5, #VenstreKant, ?28),
      (107, "Benedikte Kalstad Hernes", "benedikte-kalstad-hernes", 6, #Keeper, ?1),
      (108, "Emily Lønnestad-Wiers", "emily-lonnestad-wiers", 6, #VenstreKant, ?2),
      (109, "Sara Hallingstad", "sara-hallingstad", 6, #VenstreKant, ?3),
      (110, "Linnea Skadal Kyrkjeeide", "linnea-skadal-kyrkjeeide", 6, #HoyreKant, ?4),
      (111, "Maren Eriksen Langø", "maren-eriksen-lango", 6, #VenstreKant, ?5),
      (112, "Lina Waage Mossestad", "lina-waage-mossestad", 6, #Bakspiller, ?6),
      (113, "Frida Aasekjær Wilkensen", "frida-aasekjaer-wilkensen", 6, #HoyreKant, ?9),
      (114, "Christine Karlsen Alver", "christine-karlsen-alver", 6, #Bakspiller, ?10),
      (115, "Anna Mortvedt", "anna-mortvedt", 6, #Linje, ?11),
      (116, "Marie Skurtveit Davidsen", "marie-skurtveit-davidsen", 6, #Keeper, ?12),
      (117, "Fride Heggdal Stølen", "fride-heggdal-stolen", 6, #Linje, ?13),
      (118, "Eline Mangen Solbakken", "eline-mangen-solbakken", 6, #Linje, ?14),
      (119, "Marie Mjøs", "marie-mjos", 6, #Bakspiller, ?15),
      (120, "Leah Bjotveit Verpeide", "leah-bjotveit-verpeide", 6, #Keeper, ?16),
      (121, "Eline Osland", "eline-osland", 6, #HoyreKant, ?19),
      (122, "Martine Kårigstad Andersen", "martine-karigstad-andersen", 6, #VenstreKant, ?20),
      (123, "Evita Naper Lindberget", "evita-naper-lindberget", 6, #Bakspiller, ?21),
      (124, "Emma Gloppestad", "emma-gloppestad", 6, #VenstreKant, ?22),
      (125, "Sara Osen Tefre", "sara-osen-tefre", 6, #HoyreKant, ?23),
      (126, "Andrea Varvin Fredriksen", "andrea-varvin-fredriksen", 6, #VenstreKant, ?24),
      (127, "Aurora Kjellevold Hatle", "aurora-kjellevold-hatle", 6, #VenstreKant, ?27),
      (128, "Haya Elhanafi", "haya-elhanafi", 6, #Keeper, ?40),
      (129, "Maren Austmo Pedersen", "maren-austmo-pedersen", 7, #Keeper, ?1),
      (130, "Ine Fremo", "ine-fremo", 7, #Bakspiller, ?3),
      (131, "Mathilde Arnstad", "mathilde-arnstad", 7, #Linje, ?4),
      (132, "Dina Salih", "dina-salih", 7, #VenstreKant, ?5),
      (133, "Janne Charlotte Thoresen Nordnes", "janne-charlotte-thoresen-nordnes", 7, #Linje, ?7),
      (134, "Hedda Lauvås Aasen", "hedda-lauvas-aasen", 7, #HoyreKant, ?9),
      (135, "Silje Katrine Waade", "silje-katrine-waade", 7, #HoyreKant, ?10),
      (136, "Frida Molaup Selnes", "frida-molaup-selnes", 7, #Keeper, ?12),
      (137, "Helene Lovise Wesche-Rø", "helene-lovise-wesche-ro", 7, #Linje, ?13),
      (138, "Andrea Austmo Pedersen", "andrea-austmo-pedersen", 7, #Keeper, ?16),
      (139, "Janne Håvelsrud Eklo", "janne-havelsrud-eklo", 7, #VenstreKant, ?17),
      (140, "Marte Lausund Nornes", "marte-lausund-nornes", 7, #Bakspiller, ?18),
      (141, "Mathea Enger", "mathea-enger", 7, #HoyreKant, ?19),
      (142, "Fride Lunne Mastad", "fride-lunne-mastad", 7, #Bakspiller, ?20),
      (143, "Malin Smevik Dahl", "malin-smevik-dahl", 7, #HoyreKant, ?21),
      (144, "Freja Emilie Vinther Christensen", "freja-emilie-vinther-christensen", 7, #VenstreKant, ?22),
      (145, "Sofie Sandø Kleiven", "sofie-sando-kleiven", 7, #HoyreKant, ?23),
      (146, "Pernille Rø", "pernille-ro", 7, #Keeper, ?24),
      (147, "Johanna Dahl Haugan", "johanna-dahl-haugan", 7, #VenstreKant, ?25),
      (148, "Kristin Nordløkken Kounchou", "kristin-nordlokken-kounchou", 7, #VenstreKant, ?26),
      (149, "Emma Henden Foosnæs", "emma-henden-foosnaes", 7, #HoyreKant, ?27),
      (150, "Live Sønstebø", "live-sonstebo", 7, #Linje, ?28),
    ];
    for ((id, name, slug, teamId, position, jerseyNumber) in playersBatch3.values()) {
      state.players.add({
        id; name; slug; teamId; position; jerseyNumber;
        imageUrl = null;
        nationality = ?"NO";
        isActive = true;
      });
    };

    // Players 151-200
    let playersBatch4 : [(Nat, Text, Text, Nat, Types.Position, ?Nat)] = [
      (151, "Hanne Ramsøskar Sagvold", "hanne-ramsoskar-sagvold", 8, #Keeper, ?1),
      (152, "Zara Johnsson Solberg", "zara-johnsson-solberg", 8, #Bakspiller, ?2),
      (153, "Maja Eiberg", "maja-eiberg", 8, #VenstreKant, ?5),
      (154, "Sofia Shauri Dalsveen", "sofia-shauri-dalsveen", 8, #VenstreKant, ?7),
      (155, "Thea Andresen", "thea-andresen", 8, #Bakspiller, ?10),
      (156, "Hanna Blystad", "hanna-blystad", 8, #VenstreKant, ?11),
      (157, "Mathilde Berner Rømer", "mathilde-berner-romer", 8, #Keeper, ?12),
      (158, "Emily Solberg", "emily-solberg", 8, #HoyreKant, ?13),
      (159, "Kristin Dorthea Eskerud", "kristin-dorthea-eskerud", 8, #Linje, ?18),
      (160, "Oda Ragnhild Bekker Olsen", "oda-ragnhild-bekker-olsen", 8, #Linje, ?19),
      (161, "Maren Hansen Tangen", "maren-hansen-tangen", 8, #HoyreKant, ?21),
      (162, "Anniken Maria Monsen", "anniken-maria-monsen", 8, #Bakspiller, ?25),
      (163, "Magdele Kvarving Sandtrø", "magdele-kvarving-sandtro", 8, #HoyreKant, ?27),
      (164, "Malene Hansen Tangen", "malene-hansen-tangen", 8, #VenstreKant, ?30),
      (165, "Regine Nekstad", "regine-nekstad", 8, #VenstreKant, ?45),
      (166, "Martine Guterud Helland", "martine-guterud-helland", 8, #Linje, ?72),
      (167, "Alberte Ebler", "alberte-ebler", 8, #HoyreKant, ?77),
      (168, "Vilde Amalie Klaussen", "vilde-amalie-klaussen", 9, #Keeper, ?1),
      (169, "Oda Olsen", "oda-olsen", 9, #Bakspiller, ?2),
      (170, "Lea Tidemann Stenvik", "lea-tidemann-stenvik", 9, #Bakspiller, ?4),
      (171, "Hannah Kjelstad Høsøien", "hannah-kjelstad-hosoien", 9, #Bakspiller, ?5),
      (172, "Oda Jeanette Burhol", "oda-jeanette-burhol", 9, #VenstreKant, ?6),
      (173, "Ingeborg Rolseth Holt", "ingeborg-rolseth-holt", 9, #Bakspiller, ?7),
      (174, "Henriette Jarnang", "henriette-jarnang", 9, #HoyreKant, ?8),
      (175, "Hedda Skjelbreid Rønningen", "hedda-skjelbreid-ronningen", 9, #Bakspiller, ?9),
      (176, "Caroline Wikheim Aas", "caroline-wikheim-aas", 9, #HoyreKant, ?10),
      (177, "Mia Kristin Vinje Horgøien", "mia-kristin-vinje-horgoien", 9, #Linje, ?11),
      (178, "Mia Stensland", "mia-stensland", 9, #Keeper, ?12),
      (179, "Viktoria Odinokova Eilertsen", "viktoria-odinokova-eilertsen", 9, #Bakspiller, ?13),
      (180, "Linn Andresen", "linn-andresen", 9, #Bakspiller, ?15),
      (181, "Mia Tvedte Johannessen", "mia-tvedte-johannessen", 9, #Keeper, ?16),
      (182, "Ingvild Bersås Westersjø", "ingvild-bersas-westersjo", 9, #Linje, ?17),
      (183, "Anne Malin Antonsen", "anne-malin-antonsen", 9, #Bakspiller, ?18),
      (184, "Maja Rame", "maja-rame", 9, #VenstreKant, ?19),
      (185, "Oda Kongssund", "oda-kongssund", 9, #Bakspiller, ?20),
      (186, "Kaja Stavdal Bækkevar", "kaja-stavdal-baekkevar", 9, #Linje, ?24),
      (187, "Emma Christine Gudmundsen", "emma-christine-gudmundsen", 9, #Linje, ?29),
      (188, "Madeleine Bakke", "madeleine-bakke", 9, #HoyreKant, ?31),
      (189, "Heidi Bildøy Østvold", "heidi-bildoy-ostvold", 9, #Linje, ?33),
      (190, "Sofie Magdalena Plich", "sofie-magdalena-plich", 9, #VenstreKant, ?34),
      (191, "Tora Charlotte Tande-Elton", "tora-charlotte-tande-elton", 10, #Keeper, ?1),
      (192, "Celine Lyngholt-Osland", "celine-lyngholt-osland", 10, #VenstreKant, ?2),
      (193, "Elisabeth Hammerstad", "elisabeth-hammerstad", 10, #HoyreKant, ?3),
      (194, "Anette Sundfær Johnsen", "anette-sundfaer-johnsen", 10, #HoyreKant, ?4),
      (195, "Oda Caroline Mørk", "oda-caroline-mork", 10, #HoyreKant, ?5),
      (196, "Karen Linnestad Spone", "karen-linnestad-spone", 10, #VenstreKant, ?6),
      (197, "Mari Myrland", "mari-myrland", 10, #Bakspiller, ?7),
      (198, "Hanna Waaler Lindquist", "hanna-waaler-lindquist", 10, #Linje, ?8),
      (199, "Aurora Solveig Kristiansen", "aurora-solveig-kristiansen", 10, #Bakspiller, ?9),
      (200, "Iben Helland Flø", "iben-helland-flo", 10, #VenstreKant, ?10),
    ];
    for ((id, name, slug, teamId, position, jerseyNumber) in playersBatch4.values()) {
      state.players.add({
        id; name; slug; teamId; position; jerseyNumber;
        imageUrl = null;
        nationality = ?"NO";
        isActive = true;
      });
    };

    // Players 201-250
    let playersBatch5 : [(Nat, Text, Text, Nat, Types.Position, ?Nat)] = [
      (201, "Sara Benedicte Fredheim Barbosa", "sara-benedicte-fredheim-barbosa", 10, #Bakspiller, ?11),
      (202, "Margrethe Moen Kile", "margrethe-moen-kile", 10, #Keeper, ?12),
      (203, "Anette Rusten", "anette-rusten", 10, #Linje, ?14),
      (204, "Tilde Alræk", "tilde-alraek", 10, #Bakspiller, ?15),
      (205, "Marte Sirén Figenschau", "marte-siren-figenschau", 10, #Linje, ?19),
      (206, "Andrea Landås Gabrielsen", "andrea-landas-gabrielsen", 10, #VenstreKant, ?20),
      (207, "Harrieth Toft Nordrum", "harrieth-toft-nordrum", 10, #VenstreKant, ?21),
      (208, "Hante Satu Hamel", "hante-satu-hamel", 10, #Keeper, ?22),
      (209, "Emilie Hattestad", "emilie-hattestad", 10, #HoyreKant, ?23),
      (210, "Mia Holene Kvithyll", "mia-holene-kvithyll", 10, #HoyreKant, ?24),
      (211, "Line Strand-Larsen", "line-strand-larsen", 10, #VenstreKant, ?25),
      (212, "Mirela Gjikokaj", "mirela-gjikokaj", 10, #VenstreKant, ?77),
      (213, "Martine Skudvig Mork", "martine-skudvig-mork", 11, #Bakspiller, ?2),
      (214, "Hanna Karoline Hernes Gåsvær", "hanna-karoline-hernes-gasvaer", 11, #Bakspiller, ?3),
      (215, "Mille Tveit Porsmyr", "mille-tveit-porsmyr", 11, #Bakspiller, ?5),
      (216, "Mali Halldorsson", "mali-halldorsson", 11, #VenstreKant, ?6),
      (217, "Emily Andersen", "emily-andersen", 11, #Bakspiller, ?7),
      (218, "Nora Løken", "nora-loken", 11, #VenstreKant, ?11),
      (219, "Kristin Loraas Eiriksson", "kristin-loraas-eiriksson", 11, #VenstreKant, ?13),
      (220, "Aleksandra Mandic", "aleksandra-mandic", 11, #Linje, ?14),
      (221, "Vilde Tornes Finneide", "vilde-tornes-finneide", 11, #Keeper, ?16),
      (222, "Ida Marie Syversen Kallhovd", "ida-marie-syversen-kallhovd", 11, #HoyreKant, ?19),
      (223, "Mille Constanse Brekken Daae", "mille-constanse-brekken-daae", 11, #HoyreKant, ?21),
      (224, "Kristin Halvorsen", "kristin-halvorsen", 11, #Linje, ?23),
      (225, "Marthine Svendsberget", "marthine-svendsberget", 11, #VenstreKant, ?24),
      (226, "Elika Nodland Meiland", "elika-nodland-meiland", 11, #Bakspiller, ?25),
      (227, "Vanessa Bråten Gulbrandsen", "vanessa-braten-gulbrandsen", 11, #HoyreKant, ?27),
      (228, "Silje Leikfoss Solbakken", "silje-leikfoss-solbakken", 11, #VenstreKant, ?28),
      (229, "Maja Linnea Gulliksen", "maja-linnea-gulliksen", 11, #Keeper, ?30),
      (230, "Maja Leinan", "maja-leinan", 11, #Linje, ?35),
      (231, "Thea Ellen Löfstedt", "thea-ellen-lofstedt", 11, #HoyreKant, ?64),
      (232, "My Lervold", "my-lervold", 12, #VenstreKant, ?2),
      (233, "Martine Tveter", "martine-tveter", 12, #Bakspiller, ?4),
      (234, "Julie Rensmoen Benterud", "julie-rensmoen-benterud", 12, #HoyreKant, ?5),
      (235, "Tuva Knai", "tuva-knai", 12, #Linje, ?6),
      (236, "Inga Sandvold", "inga-sandvold", 12, #Linje, ?7),
      (237, "Hannah Deari Solheim", "hannah-deari-solheim", 12, #Bakspiller, ?9),
      (238, "Mia Lundberg Lersbryggen", "mia-lundberg-lersbryggen", 12, #VenstreKant, ?10),
      (239, "Sara Ashuri", "sara-ashuri", 12, #VenstreKant, ?11),
      (240, "Zaynab Elmrani", "zaynab-elmrani", 12, #Keeper, ?12),
      (241, "Sarah Deari Solheim", "sarah-deari-solheim", 12, #HoyreKant, ?14),
      (242, "Christina Midtdal Nummestad", "christina-midtdal-nummestad", 12, #VenstreKant, ?15),
      (243, "Marie Elstrand Munthe", "marie-elstrand-munthe", 12, #HoyreKant, ?17),
      (244, "Linnea Isabel Ingeborg Aula", "linnea-isabel-ingeborg-aula", 12, #VenstreKant, ?18),
      (245, "Hedda Klippen Nilsen", "hedda-klippen-nilsen", 12, #HoyreKant, ?20),
      (246, "Sunniva Sogn-Johansen", "sunniva-sogn-johansen", 12, #Linje, ?22),
      (247, "Emma Egge Edner", "emma-egge-edner", 12, #HoyreKant, ?25),
      (248, "Marthe Bjørnson Ulvåknippa", "marthe-bjornson-ulvaknippa", 12, #VenstreKant, ?27),
      (249, "Mathilde Aas Fjelddalen", "mathilde-aas-fjelddalen", 12, #VenstreKant, ?33),
      (250, "Ida Wall Bakken", "ida-wall-bakken", 12, #Keeper, ?37),
    ];
    for ((id, name, slug, teamId, position, jerseyNumber) in playersBatch5.values()) {
      state.players.add({
        id; name; slug; teamId; position; jerseyNumber;
        imageUrl = null;
        nationality = ?"NO";
        isActive = true;
      });
    };

    // Players 251-296
    let playersBatch6 : [(Nat, Text, Text, Nat, Types.Position, ?Nat)] = [
      (251, "Stine Mellemstrand Bore", "stine-mellemstrand-bore", 12, #Bakspiller, ?72),
      (252, "Thea Granlund", "thea-granlund", 13, #Keeper, ?1),
      (253, "Siri Elicabeth Hansson", "siri-elicabeth-hansson", 13, #Bakspiller, ?4),
      (254, "Veslemøy Marie Mehus", "veslemoy-marie-mehus", 13, #Bakspiller, ?6),
      (255, "Tuva Pharo", "tuva-pharo", 13, #Linje, ?7),
      (256, "Tilde Wilhelmsen Grønvold", "tilde-wilhelmsen-gronvold", 13, #Bakspiller, ?9),
      (257, "Bertine Emilie Sundby Lunde", "bertine-emilie-sundby-lunde", 13, #Bakspiller, ?10),
      (258, "Sofie Fosnæss Hanssen", "sofie-fosnaess-hanssen", 13, #VenstreKant, ?11),
      (259, "Erika Madeleine Arntsen Bjørløw", "erika-madeleine-arntsen-bjorlow", 13, #Keeper, ?12),
      (260, "Anette Sundal", "anette-sundal", 13, #HoyreKant, ?14),
      (261, "Andrea Holmsveen Moen", "andrea-holmsveen-moen", 13, #Bakspiller, ?15),
      (262, "Alva Bjanes Iversen", "alva-bjanes-iversen", 13, #Keeper, ?16),
      (263, "Inez Hjemås Fagermo", "inez-hjemas-fagermo", 13, #VenstreKant, ?17),
      (264, "Guro Skålevåg", "guro-skalevag", 13, #Bakspiller, ?19),
      (265, "Kristina Othilie Hetland Schennum", "kristina-othilie-hetland-schennum", 13, #VenstreKant, ?20),
      (266, "Tilde Amalia Grönvall", "tilde-amalia-gronvall", 13, #Linje, ?23),
      (267, "Veriana Veliqi", "veriana-veliqi", 13, #HoyreKant, ?24),
      (268, "Janine Borchgrevink Børkeeiet", "janine-borchgrevink-borkeeiet", 13, #Bakspiller, ?25),
      (269, "Ingrid Louise Bjørnskau Berens", "ingrid-louise-bjornskau-berens", 13, #Linje, ?26),
      (270, "Andrea Nalbant Moe", "andrea-nalbant-moe", 13, #Bakspiller, ?33),
      (271, "Vilde Marsteinstredet", "vilde-marsteinstredet", 13, #Keeper, ?50),
      (272, "Nicoline Jullumstrø", "nicoline-jullumstro", 13, #HoyreKant, ?75),
      (273, "Marthe Davidsen Hellevik", "marthe-davidsen-hellevik", 14, #Keeper, ?1),
      (274, "Kristina Granli Nordvik", "kristina-granli-nordvik", 14, #VenstreKant, ?2),
      (275, "Julie Kristine Hattestad", "julie-kristine-hattestad", 14, #Bakspiller, ?3),
      (276, "Bettina Ranvik", "bettina-ranvik", 14, #Linje, ?4),
      (277, "Ina Jåtten", "ina-jatten", 14, #HoyreKant, ?6),
      (278, "Lorin Sendi", "lorin-sendi", 14, #Bakspiller, ?7),
      (279, "Mia Kvarme", "mia-kvarme", 14, #HoyreKant, ?9),
      (280, "Anna Lunke Norum", "anna-lunke-norum", 14, #VenstreKant, ?11),
      (281, "Daniella Holm", "daniella-holm", 14, #Keeper, ?12),
      (282, "Ane Engan Haugen", "ane-engan-haugen", 14, #VenstreKant, ?14),
      (283, "Bibi Aandewiel", "bibi-aandewiel", 14, #VenstreKant, ?15),
      (284, "Julie Søfting Tovslid", "julie-softing-tovslid", 14, #Keeper, ?16),
      (285, "Fredrikke Sundsby Kjølstad", "fredrikke-sundsby-kjolstad", 14, #VenstreKant, ?17),
      (286, "Marte Juuhl Svensson", "marte-juuhl-svensson", 14, #Bakspiller, ?18),
      (287, "Synnøve Lind Edvardsen", "synnove-lind-edvardsen", 14, #Linje, ?19),
      (288, "Nora Young Za Lundell", "nora-young-za-lundell", 14, #Linje, ?20),
      (289, "Elvira Rensmoen", "elvira-rensmoen", 14, #HoyreKant, ?22),
      (290, "Vilde Bjørnsen", "vilde-bjornsen", 14, #HoyreKant, ?24),
      (291, "Marie Elde Selvaag", "marie-elde-selvaag", 14, #HoyreKant, ?26),
      (292, "Karin Mollatt", "karin-mollatt", 14, #Linje, ?27),
      (293, "Isabel Gunnerød", "isabel-gunnerod", 14, #VenstreKant, ?30),
      (294, "Ane Emilie Westerhus Bolstad", "ane-emilie-westerhus-bolstad", 14, #Keeper, ?96),
      (295, "Hansine Brune Skorgevik", "hansine-brune-skorgevik", 14, #Bakspiller, ?97),
      (296, "Marte Sofie Syverud", "marte-sofie-syverud", 14, #Bakspiller, ?98),
    ];
    for ((id, name, slug, teamId, position, jerseyNumber) in playersBatch6.values()) {
      state.players.add({
        id; name; slug; teamId; position; jerseyNumber;
        imageUrl = null;
        nationality = ?"NO";
        isActive = true;
      });
    };

    // ── Matches ──────────────────────────────────────────────────────────────
    // No seed matches - populated from live data

    // ── Player Match Stats ───────────────────────────────────────────────────
    // Empty - populated from live data

    // ── Player Season Stats ──────────────────────────────────────────────────
    // Empty - populated from live data
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
