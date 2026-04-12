import { u as useNavigate, j as jsxRuntimeExports, a as cn } from "./index-urhzO2zV.js";
import { B as Button } from "./button-Ca3rB_wU.js";
import { P as PositionBadge } from "./useFollowedPlayers-BzkFyYPh.js";
import { U as User } from "./user-BzLonnf2.js";
function Sparkline({ values }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const W = 40;
  const H = 18;
  const pts = values.map((v, i) => {
    const x = i / (values.length - 1) * W;
    const y = H - v / max * (H - 3) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      width: W,
      height: H,
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "Formkurve",
      className: "flex-shrink-0 opacity-90",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("title", { children: "Formkurve siste kamper" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "polyline",
          {
            points: pts.join(" "),
            fill: "none",
            strokeWidth: "1.8",
            stroke: "white",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            opacity: "0.85"
          }
        )
      ]
    }
  );
}
function PlayerCard({
  player,
  teamName,
  isFollowing,
  onFollow,
  onUnfollow,
  isLoading,
  className,
  goals,
  minutes,
  sparkValues = []
}) {
  const navigate = useNavigate();
  const hasStats = goals !== void 0 || minutes !== void 0;
  const hasSpark = sparkValues.length >= 2;
  function handleCardClick() {
    navigate({ to: "/player/$id", params: { id: player.id.toString() } });
  }
  function handleFollowClick(e) {
    e.stopPropagation();
    if (isFollowing) {
      onUnfollow == null ? void 0 : onUnfollow();
    } else {
      onFollow == null ? void 0 : onFollow();
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick: handleCardClick,
      "aria-label": `Vis profil for ${player.name}`,
      className: cn(
        "w-full text-left rounded-2xl overflow-hidden transition-smooth hover:shadow-elevated cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className
      ),
      "data-ocid": "player-card",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full aspect-[3/4] bg-muted", children: [
          player.imageUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "img",
            {
              src: player.imageUrl,
              alt: player.name,
              className: "absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-muted to-muted/60", children: /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "size-16 text-muted-foreground/40" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" }),
          player.jerseyNumber !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-3 right-3 size-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display font-black text-[13px] text-white leading-none", children: player.jerseyNumber.toString() }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute bottom-0 left-0 right-0 px-3.5 pb-3.5 pt-12", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PositionBadge, { position: player.position, variant: "overlay" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-black text-white leading-tight text-base truncate drop-shadow-sm", children: player.name }),
            teamName && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-white/70 truncate mt-0.5 font-body", children: teamName }),
            hasStats && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between mt-2 pt-2 border-t border-white/15", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3", children: [
                goals !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-display font-black text-xl text-white leading-none", children: goals }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[9px] uppercase tracking-wide text-white/60 mt-0.5", children: "Mål" })
                ] }),
                minutes !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-display font-bold text-lg text-white/90 leading-none", children: minutes }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[9px] uppercase tracking-wide text-white/60 mt-0.5", children: "Min" })
                ] })
              ] }),
              hasSpark && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-end gap-0.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkline, { values: sparkValues }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] uppercase tracking-wide text-white/50", children: "Form" })
              ] })
            ] })
          ] })
        ] }),
        (onFollow || onUnfollow) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-1 pt-2 pb-1", children: isFollowing ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outline",
            size: "sm",
            onClick: handleFollowClick,
            disabled: isLoading,
            className: "w-full h-9 rounded-full text-xs font-display font-bold border-primary/40 text-primary hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40",
            "data-ocid": "player-unfollow-btn",
            children: "✓ FØLGER"
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            size: "sm",
            onClick: handleFollowClick,
            disabled: isLoading,
            className: "w-full h-9 rounded-full text-xs font-display font-bold bg-primary text-primary-foreground hover:bg-primary/90",
            "data-ocid": "player-follow-btn",
            children: "+ FØLG"
          }
        ) })
      ]
    }
  );
}
export {
  PlayerCard as P
};
