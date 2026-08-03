import { j as jsxRuntimeExports, a as cn } from "./index-CPElKy7J.js";
const POSITION_LABELS = {
  Keeper: "Keeper",
  Bakspiller: "Bakspiller",
  VenstreKant: "V. kant",
  HoyreKant: "H. kant",
  Linje: "Linjespiller"
};
const POSITION_COLORS = {
  Keeper: "bg-chart-3/25 text-chart-3 border-chart-3/40",
  Bakspiller: "bg-primary/25 text-primary border-primary/40",
  VenstreKant: "bg-chart-2/25 text-chart-2 border-chart-2/40",
  HoyreKant: "bg-chart-5/25 text-chart-5 border-chart-5/40",
  Linje: "bg-chart-4/25 text-chart-4 border-chart-4/40"
};
function PositionBadge({
  position,
  className,
  size = "sm",
  variant = "default"
}) {
  const label = POSITION_LABELS[position] ?? position;
  const color = variant === "overlay" ? "bg-white/20 text-white border-white/30 backdrop-blur-sm" : POSITION_COLORS[position] ?? "bg-muted text-muted-foreground border-border";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: cn(
        "inline-flex items-center border rounded-full font-display font-semibold tracking-wide uppercase",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        color,
        className
      ),
      children: label
    }
  );
}
export {
  PositionBadge as P,
  POSITION_LABELS as a
};
