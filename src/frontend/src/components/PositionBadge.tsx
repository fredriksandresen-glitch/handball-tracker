import { cn } from "@/lib/utils";
import { POSITION_COLORS, POSITION_LABELS } from "../types/handball";

interface Props {
  position: string;
  className?: string;
  size?: "sm" | "md";
  variant?: "default" | "overlay";
}

export function PositionBadge({
  position,
  className,
  size = "sm",
  variant = "default",
}: Props) {
  const label = POSITION_LABELS[position] ?? position;
  const color =
    variant === "overlay"
      ? "bg-white/20 text-white border-white/30 backdrop-blur-sm"
      : (POSITION_COLORS[position] ??
        "bg-muted text-muted-foreground border-border");
  return (
    <span
      className={cn(
        "inline-flex items-center border rounded-full font-display font-semibold tracking-wide uppercase",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        color,
        className,
      )}
    >
      {label}
    </span>
  );
}
