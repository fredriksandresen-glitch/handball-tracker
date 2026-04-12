import { cn } from "@/lib/utils";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  highlight?: boolean;
  className?: string;
}

export function StatBadge({
  label,
  value,
  trend,
  highlight,
  className,
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-body border",
        highlight
          ? "bg-primary/15 text-primary border-primary/30"
          : "bg-muted/60 text-foreground border-border",
        className,
      )}
    >
      {trend === "up" && <TrendingUp className="size-3 text-chart-2" />}
      {trend === "down" && <TrendingDown className="size-3 text-chart-3" />}
      {trend === "neutral" && (
        <Minus className="size-3 text-muted-foreground" />
      )}
      <span className="font-semibold">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
