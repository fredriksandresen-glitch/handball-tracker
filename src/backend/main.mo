import List "mo:core/List";
import Map "mo:core/Map";
import Types "types/handball-data";
import ProfixioTypes "types/profixio";
import HandballLib "lib/handball-data";
import HandballApi "mixins/handball-data-api";
import ProfixioApi "mixins/profixio-api";






persistent actor Main {

  transient let teams            = List.empty<Types.Team>();
  transient let players          = List.empty<Types.Player>();
  transient let matches          = List.empty<Types.Match>();
  transient let playerMatchStats = List.empty<Types.PlayerMatchStats>();
  transient let playerSeasonStats = List.empty<Types.PlayerSeasonStats>();
  transient let follows          = List.empty<Types.Follow>();
  transient let feedEvents       = List.empty<Types.FeedEvent>();
  transient let nextId           = Map.empty<Text, Nat>();

  transient let state : HandballLib.State = {
    teams;
    players;
    matches;
    playerMatchStats;
    playerSeasonStats;
    follows;
    feedEvents;
    nextId;
  };

  transient let profixioCache : ProfixioTypes.ProfixioCache = {
    var lastSync = null;
    var isLive = false;
    var lastMessage = "Ingen synkronisering utført ennå";
    var dataSource = "mock";
    var liveStatsCount = 0;
  };

  // Seed on first deploy — idempotent (checks if teams is empty)
  HandballLib.initSeedData(state);

  include HandballApi(state);
  include ProfixioApi(state, profixioCache);
};
