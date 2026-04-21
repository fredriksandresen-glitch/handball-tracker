import Types "../types/handball-data";
import HandballLib "../lib/handball-data";
import List "mo:core/List";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Text "mo:core/Text";

mixin (state : HandballLib.State) {

  public query func getTeams() : async [Types.Team] {
    HandballLib.getTeams(state);
  };

  public query func getTeam(id : Nat) : async ?Types.Team {
    HandballLib.getTeam(state, id);
  };

  public query func getPlayers() : async [Types.Player] {
    HandballLib.getPlayers(state);
  };

  public query func getPlayersByTeam(teamId : Nat) : async [Types.Player] {
    HandballLib.getPlayersByTeam(state, teamId);
  };

  public query func getPlayer(id : Nat) : async ?Types.Player {
    HandballLib.getPlayer(state, id);
  };

  public query func getPlayerMatchStats(playerId : Nat) : async [Types.PlayerMatchStats] {
    HandballLib.getPlayerMatchStats(state, playerId);
  };

  public query func getPlayerSeasonStats(playerId : Nat) : async ?Types.PlayerSeasonStats {
    HandballLib.getPlayerSeasonStats(state, playerId);
  };

  public query func getMatches() : async [Types.Match] {
    HandballLib.getMatches(state);
  };

  public query func getUpcomingMatches() : async [Types.Match] {
    HandballLib.getUpcomingMatches(state);
  };

  public query func getNextMatchForTeam(teamId : Nat) : async ?Types.Match {
    HandballLib.getNextMatchForTeam(state, teamId);
  };

  public query ({ caller }) func getFollowedPlayers() : async [Types.Player] {
    HandballLib.getFollowedPlayers(state, caller);
  };

  // Auto-follows demo players for first-time users.
  // Safe to call repeatedly — followPlayer is idempotent.
  public shared ({ caller }) func initUserFollows() : async () {
    let followed = HandballLib.getFollowedPlayers(state, caller);
    if (followed.size() == 0) {
      for (pid in [23, 241, 195].values()) {
        HandballLib.followPlayer(state, caller, pid);
      };
    };
  };

  public query ({ caller }) func getFeedEvents() : async [Types.FeedEvent] {
    HandballLib.getFeedEvents(state, caller);
  };

  public shared ({ caller }) func followPlayer(playerId : Nat) : async () {
    HandballLib.followPlayer(state, caller, playerId);
  };

  public shared ({ caller }) func unfollowPlayer(playerId : Nat) : async () {
    HandballLib.unfollowPlayer(state, caller, playerId);
  };

  public query ({ caller }) func isFollowing(playerId : Nat) : async Bool {
    let followed = HandballLib.getFollowedPlayers(state, caller);
    switch (Array.find<Types.Player>(followed, func(p) { p.id == playerId })) {
      case (?_) true;
      case null false;
    };
  };

  public query func searchPlayers(term : Text) : async [Types.Player] {
    let lower = Text.toLower(term);
    if (lower.size() == 0) return [];
    HandballLib.getPlayers(state)
      .filter(func(p) {
        let nameLower = Text.toLower(p.name);
        let slugLower = Text.toLower(p.slug);
        if (Text.contains(nameLower, #text lower) or Text.contains(slugLower, #text lower)) {
          return true;
        };
        // Also match by team name so "fjellhammer" returns all Fjellhammer players
        switch (HandballLib.getTeam(state, p.teamId)) {
          case null false;
          case (?t) {
            let teamNameLower = Text.toLower(t.name);
            let teamSlugLower = Text.toLower(t.slug);
            Text.contains(teamNameLower, #text lower) or Text.contains(teamSlugLower, #text lower)
          };
        };
      });
  };

  public query func searchTeams(term : Text) : async [Types.Team] {
    let lower = term.toLower();
    if (lower.size() == 0) return [];
    HandballLib.getTeams(state)
      .filter(func(t) {
        t.name.toLower().contains(#text lower) or
        t.slug.toLower().contains(#text lower)
      });
  };

  public query func getPlayerCount() : async Nat {
    state.players.size()
  };

  // Returns all season stats as an array — useful for bulk queries from frontend
  public query func getAllPlayerSeasonStats() : async [Types.PlayerSeasonStats] {
    state.playerSeasonStats.toArray();
  };

};
