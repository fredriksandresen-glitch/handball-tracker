import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ProfixioStatus {
    dataSource: string;
    liveStatsCount: bigint;
    isLive: boolean;
    message: string;
    lastSync?: bigint;
}
export interface PlayerMatchStats {
    id: bigint;
    blueCards?: bigint;
    minutesPlayed?: bigint;
    assists?: bigint;
    twoMinSuspensions?: bigint;
    playerId: bigint;
    sevenMeterGoals?: bigint;
    yellowCards?: bigint;
    turnovers?: bigint;
    sevenMeterAttempts?: bigint;
    saves?: bigint;
    shotPct?: number;
    shots?: bigint;
    matchId: bigint;
    goals?: bigint;
    savePct?: number;
    redCards?: bigint;
}
export interface Player {
    id: bigint;
    name: string;
    slug: string;
    nationality?: string;
    isActive: boolean;
    jerseyNumber?: bigint;
    imageUrl?: string;
    teamId: bigint;
    position: Position;
}
export interface Team {
    id: bigint;
    goalDifference?: bigint;
    name: string;
    slug: string;
    logoUrl?: string;
    matchesPlayed?: bigint;
    standingsRank?: bigint;
    points?: bigint;
}
export interface FeedEvent {
    id: bigint;
    title: string;
    userId: Principal;
    playerId: bigint;
    createdAt: bigint;
    description: string;
    matchId?: bigint;
    statValue?: bigint;
    eventType: FeedEventType;
}
export interface Match {
    id: bigint;
    startTime: bigint;
    status: MatchStatus;
    venue?: string;
    awayTeamId: bigint;
    homeTeamId: bigint;
    competition: string;
}
export interface PlayerSeasonStats {
    id: bigint;
    mepAvg?: number;
    goalsPerGame?: number;
    technicalFaults?: bigint;
    mepTotal?: number;
    goals7m?: bigint;
    playerId: bigint;
    provoked7m?: bigint;
    fieldShots?: bigint;
    assistsPerGame?: number;
    season: string;
    percent7m?: number;
    fieldGoals?: bigint;
    totalYellowCards?: bigint;
    shots7m?: bigint;
    totalSaves?: bigint;
    totalShots?: bigint;
    totalGoals?: bigint;
    awarded7m?: bigint;
    matchesPlayed: bigint;
    fieldGoalPercent?: number;
    totalAssists?: bigint;
    totalRedCards?: bigint;
    shootingPercent?: number;
    totalTwoMin?: bigint;
    totalMinutes?: bigint;
}
export enum FeedEventType {
    NextMatch = "NextMatch",
    GoalsScored = "GoalsScored",
    GamePlayed = "GamePlayed",
    MinutesPlayed = "MinutesPlayed",
    YellowCard = "YellowCard",
    SeasonAvgUpdated = "SeasonAvgUpdated",
    TwoMinSuspension = "TwoMinSuspension"
}
export enum MatchStatus {
    Live = "Live",
    Finished = "Finished",
    Upcoming = "Upcoming"
}
export enum Position {
    Linje = "Linje",
    VenstreKant = "VenstreKant",
    Keeper = "Keeper",
    Bakspiller = "Bakspiller",
    HoyreKant = "HoyreKant"
}
export interface backendInterface {
    followPlayer(playerId: bigint): Promise<void>;
    getAllPlayerSeasonStats(): Promise<Array<PlayerSeasonStats>>;
    getDataStatus(): Promise<{
        playersWithStats: bigint;
        dataSource: string;
        liveStatsCount: bigint;
        playerCount: bigint;
        teamCount: bigint;
        statsSource: string;
    }>;
    getFeedEvents(): Promise<Array<FeedEvent>>;
    getFollowedPlayers(): Promise<Array<Player>>;
    getMatches(): Promise<Array<Match>>;
    getNextMatchForTeam(teamId: bigint): Promise<Match | null>;
    getPlayer(id: bigint): Promise<Player | null>;
    getPlayerCount(): Promise<bigint>;
    getPlayerMatchStats(playerId: bigint): Promise<Array<PlayerMatchStats>>;
    getPlayerSeasonStats(playerId: bigint): Promise<PlayerSeasonStats | null>;
    getPlayers(): Promise<Array<Player>>;
    getPlayersByTeam(teamId: bigint): Promise<Array<Player>>;
    getProfixioStatus(): Promise<ProfixioStatus>;
    getTeam(id: bigint): Promise<Team | null>;
    getTeams(): Promise<Array<Team>>;
    getUpcomingMatches(): Promise<Array<Match>>;
    initUserFollows(): Promise<void>;
    isFollowing(playerId: bigint): Promise<boolean>;
    refreshFromProfixio(): Promise<string>;
    refreshPlayerStats(): Promise<string>;
    searchPlayers(term: string): Promise<Array<Player>>;
    searchTeams(term: string): Promise<Array<Team>>;
    unfollowPlayer(playerId: bigint): Promise<void>;
}
