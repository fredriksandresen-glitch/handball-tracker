module {
  // ─── Profixio raw API types ────────────────────────────────────────────────

  public type ProfixioStatus = {
    lastSync : ?Int;
    isLive : Bool;
    message : Text;
    dataSource : Text; // "live" | "scraped" | "mock"
    liveStatsCount : Nat; // number of players with real stats from Profixio API
  };

  // Internal cache for Profixio-sourced data
  public type ProfixioCache = {
    var lastSync : ?Int;
    var isLive : Bool;
    var lastMessage : Text;
    var dataSource : Text; // "live" | "scraped" | "mock"
    var liveStatsCount : Nat; // number of players with real Profixio stats
  };
};
