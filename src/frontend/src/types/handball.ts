export { Position, MatchStatus, FeedEventType } from "../backend";
export type {
  Player,
  Team,
  Match,
  PlayerMatchStats,
  PlayerSeasonStats,
  FeedEvent,
} from "../backend";

export type SortField = "activity" | "goals" | "minutes" | "form";
export type PositionFilter =
  | "all"
  | "Keeper"
  | "Bakspiller"
  | "VenstreKant"
  | "HoyreKant"
  | "Linje";

export const POSITION_LABELS: Record<string, string> = {
  Keeper: "Keeper",
  Bakspiller: "Bakspiller",
  VenstreKant: "V. kant",
  HoyreKant: "H. kant",
  Linje: "Linjespiller",
};

export const POSITION_COLORS: Record<string, string> = {
  Keeper: "bg-chart-3/25 text-chart-3 border-chart-3/40",
  Bakspiller: "bg-primary/25 text-primary border-primary/40",
  VenstreKant: "bg-chart-2/25 text-chart-2 border-chart-2/40",
  HoyreKant: "bg-chart-5/25 text-chart-5 border-chart-5/40",
  Linje: "bg-chart-4/25 text-chart-4 border-chart-4/40",
};
