import ProfixioTypes "../types/profixio";
import ProfixioLib "../lib/profixio";
import HandballLib "../lib/handball-data";
import Time "mo:core/Time";

mixin (state : HandballLib.State, cache : ProfixioTypes.ProfixioCache) {

  public func refreshFromProfixio() : async Text {
    await ProfixioLib.refreshFromProfixio(state, cache);
  };

  // Refresh player statistics only — tries topphandball.no, Profixio, handball.no, seed
  public func refreshPlayerStats() : async Text {
    await ProfixioLib.refreshPlayerStats(state, cache);
  };

  public query func getProfixioStatus() : async ProfixioTypes.ProfixioStatus {
    {
      lastSync = cache.lastSync;
      isLive = cache.isLive;
      message = cache.lastMessage;
      dataSource = cache.dataSource;
      liveStatsCount = cache.liveStatsCount;
    }
  };

  public query func getDataStatus() : async {
    playerCount : Nat;
    teamCount : Nat;
    dataSource : Text;
    liveStatsCount : Nat;
    statsSource : Text;
    playersWithStats : Nat;
  } {
    let playersWithStats = state.playerSeasonStats.filter(func(s) {
      s.totalGoals != null or s.totalAssists != null or
      s.totalSaves != null or s.matchesPlayed > 0
    }).size();
    {
      playerCount = state.players.size();
      teamCount = state.teams.size();
      dataSource = cache.dataSource;
      liveStatsCount = cache.liveStatsCount;
      statsSource = if (cache.liveStatsCount > 0) cache.dataSource else "seed";
      playersWithStats;
    }
  };

};
