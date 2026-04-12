module {
  public type Position = {
    #Keeper;
    #VenstreKant;
    #HoyreKant;
    #Linje;
    #Bakspiller;
  };

  public type MatchStatus = {
    #Upcoming;
    #Live;
    #Finished;
  };

  public type FeedEventType = {
    #GoalsScored;
    #MinutesPlayed;
    #YellowCard;
    #TwoMinSuspension;
    #NextMatch;
    #SeasonAvgUpdated;
    #GamePlayed;
  };

  public type Player = {
    id : Nat;
    name : Text;
    slug : Text;
    teamId : Nat;
    position : Position;
    jerseyNumber : ?Nat;
    imageUrl : ?Text;
    nationality : ?Text;
    isActive : Bool;
  };

  public type Team = {
    id : Nat;
    name : Text;
    slug : Text;
    logoUrl : ?Text;
    standingsRank : ?Nat;
    matchesPlayed : ?Nat;
    points : ?Nat;
    goalDifference : ?Int;
  };

  public type Match = {
    id : Nat;
    homeTeamId : Nat;
    awayTeamId : Nat;
    startTime : Int;
    venue : ?Text;
    status : MatchStatus;
    competition : Text;
  };

  public type PlayerMatchStats = {
    id : Nat;
    playerId : Nat;
    matchId : Nat;
    minutesPlayed : ?Nat;
    goals : ?Nat;
    shots : ?Nat;
    shotPct : ?Float;
    sevenMeterGoals : ?Nat;
    sevenMeterAttempts : ?Nat;
    yellowCards : ?Nat;
    twoMinSuspensions : ?Nat;
    redCards : ?Nat;
    blueCards : ?Nat;
    assists : ?Nat;
    saves : ?Nat;
    savePct : ?Float;
    turnovers : ?Nat;
  };

  public type PlayerSeasonStats = {
    id : Nat;
    playerId : Nat;
    season : Text;
    matchesPlayed : Nat;
    totalMinutes : ?Nat;
    totalGoals : ?Nat;
    totalShots : ?Nat;
    totalYellowCards : ?Nat;
    totalTwoMin : ?Nat;
    totalRedCards : ?Nat;
    totalAssists : ?Nat;
    totalSaves : ?Nat;
    // Extended stats from topphandball.no
    shootingPercent : ?Float;    // total uttelling (%)
    goalsPerGame : ?Float;       // snitt mål pr kamp
    fieldGoals : ?Nat;           // spillermål
    fieldShots : ?Nat;           // spillerskudd
    fieldGoalPercent : ?Float;   // uttelling spill (%)
    goals7m : ?Nat;              // mål 7M
    shots7m : ?Nat;              // skudd 7M
    percent7m : ?Float;          // uttelling 7M (%)
    assistsPerGame : ?Float;     // assist snitt pr kamp
    technicalFaults : ?Nat;      // teknisk feil
    provoked7m : ?Nat;           // forårsaket 7M
    awarded7m : ?Nat;            // tildelt 7M
    mepAvg : ?Float;             // snitt MEP
    mepTotal : ?Float;           // total MEP
  };

  public type Follow = {
    id : Nat;
    userId : Principal;
    playerId : Nat;
  };

  public type FeedEvent = {
    id : Nat;
    userId : Principal;
    playerId : Nat;
    matchId : ?Nat;
    eventType : FeedEventType;
    title : Text;
    description : Text;
    statValue : ?Int;
    createdAt : Int;
  };
};
