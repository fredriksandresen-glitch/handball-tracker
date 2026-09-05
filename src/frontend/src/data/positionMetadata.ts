export type PositionFilter =
  | "all"
  | "Keeper"
  | "Bakspiller"
  | "BakspillerVenstre"
  | "BakspillerMidt"
  | "BakspillerHoyre"
  | "VenstreKant"
  | "HoyreKant"
  | "Linje"
  | "Ukjent";

export const POSITION_LABELS: Record<string, string> = {
  Keeper: "Keeper",
  Bakspiller: "Bakspiller",
  BakspillerVenstre: "V. back",
  BakspillerMidt: "Midtback",
  BakspillerHoyre: "H. back",
  VenstreKant: "V. kant",
  HoyreKant: "H. kant",
  Linje: "Linjespiller",
  Ukjent: "Ukjent",
};

/** Full navn, brukt i rapporter og der det er plass. */
export const POSITION_LONG_LABELS: Record<string, string> = {
  Keeper: "Keeper",
  Bakspiller: "Bakspiller",
  BakspillerVenstre: "Bakspiller venstre",
  BakspillerMidt: "Bakspiller midt",
  BakspillerHoyre: "Bakspiller høyre",
  VenstreKant: "Kantspiller venstre",
  HoyreKant: "Kantspiller høyre",
  Linje: "Linjespiller",
  Ukjent: "Ukjent posisjon",
};

/** Alle bakspiller-varianter, for gruppering og sammenligning. */
export const BACK_POSITIONS = [
  "Bakspiller",
  "BakspillerVenstre",
  "BakspillerMidt",
  "BakspillerHoyre",
] as const;

/**
 * Grovgruppe for en posisjon. Brukes nar vi vil sammenligne alle bakspillere
 * under ett, uavhengig av venstre/midt/hoyre.
 */
export function positionGroup(position: string): string {
  return (BACK_POSITIONS as readonly string[]).includes(position)
    ? "Bakspiller"
    : position;
}

export const POSITION_COLORS: Record<string, string> = {
  Keeper: "bg-chart-3/25 text-chart-3 border-chart-3/40",
  Bakspiller: "bg-primary/25 text-primary border-primary/40",
  BakspillerVenstre: "bg-primary/25 text-primary border-primary/40",
  BakspillerMidt: "bg-primary/25 text-primary border-primary/40",
  BakspillerHoyre: "bg-primary/25 text-primary border-primary/40",
  VenstreKant: "bg-chart-2/25 text-chart-2 border-chart-2/40",
  HoyreKant: "bg-chart-5/25 text-chart-5 border-chart-5/40",
  Linje: "bg-chart-4/25 text-chart-4 border-chart-4/40",
  Ukjent: "bg-muted text-muted-foreground border-border",
};
