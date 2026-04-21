import { createActor } from "../backend-mock";
import type { backendInterface } from "../backend";

// Service layer wrapping all backend calls
// Swap this with a real API adapter when ready

export type { backendInterface };
export { createActor };

export function getPositionLabel(position: string): string {
  const labels: Record<string, string> = {
    Keeper: "Keeper",
    Bakspiller: "Bakspiller",
    VenstreKant: "V. kant",
    HoyreKant: "H. kant",
    Linje: "Linjespiller",
  };
  return labels[position] ?? position;
}

export function formatMatchDate(startTimeNs: bigint): string {
  const ms = Number(startTimeNs / 1_000_000n);
  const d = new Date(ms);
  return d.toLocaleDateString("nb-NO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getCountdown(startTimeNs: bigint): string {
  const ms = Number(startTimeNs / 1_000_000n);
  const diffMs = ms - Date.now();
  if (diffMs <= 0) return "Startet";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}t`;
  if (hours > 0) return `${hours}t ${mins}m`;
  return `${mins}m`;
}

export function getRelativeTime(createdAtNs: bigint): string {
  const ms = Number(createdAtNs / 1_000_000n);
  const diffMs = Date.now() - ms;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "I dag";
  if (days === 1) return "I går";
  if (days < 7) return `${days} dager siden`;
  return `${Math.floor(days / 7)} uker siden`;
}

export function computeFormSparkline(
  stats: { goals?: bigint; minutesPlayed?: bigint }[],
): number[] {
  return stats.slice(-5).map((s) => Number(s.goals ?? 0n));
}
