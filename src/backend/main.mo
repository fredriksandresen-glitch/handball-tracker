import List "mo:core/List";
import Map "mo:core/Map";
import Types "types/handball-data";
import ProfixioTypes "types/profixio";
import AiChatTypes "types/ai-chat";
import HandballLib "lib/handball-data";
import AiChatLib "lib/ai-chat";
import HandballApi "mixins/handball-data-api";
import ProfixioApi "mixins/profixio-api";
import AiChatApi "mixins/ai-chat-api";






actor Main {

  let teams            = List.empty<Types.Team>();
  let players          = List.empty<Types.Player>();
  let matches          = List.empty<Types.Match>();
  let playerMatchStats = List.empty<Types.PlayerMatchStats>();
  let playerSeasonStats = List.empty<Types.PlayerSeasonStats>();
  let follows          = List.empty<Types.Follow>();
  let feedEvents       = List.empty<Types.FeedEvent>();
  let nextId           = Map.empty<Text, Nat>();

  let aiChatState : AiChatLib.State = {
    var threads = List.empty<AiChatTypes.Thread>();
    var messages = List.empty<AiChatTypes.Message>();
    var jobs = List.empty<AiChatTypes.Job>();
    var workerPrincipal = null;
    var nextThreadId = 1;
    var nextMessageId = 1;
    var nextJobId = 1;
  };

  let state : HandballLib.State = {
    teams;
    players;
    matches;
    playerMatchStats;
    playerSeasonStats;
    follows;
    feedEvents;
    nextId;
  };

  let profixioCache : ProfixioTypes.ProfixioCache = {
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
  include AiChatApi(aiChatState);
};
