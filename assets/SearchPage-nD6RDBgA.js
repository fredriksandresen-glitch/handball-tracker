import { c as createLucideIcon, j as jsxRuntimeExports, a as cn, r as reactExports, S as Search, e as SkeletonCard } from "./index-B2X5ECyo.js";
import { P as PlayerCard } from "./PlayerCard-BMjR5fN-.js";
import { b as POSITION_LABELS, c as useIsFollowing, d as useFollowPlayer, a as useUnfollowPlayer } from "./useFollowedPlayers-DblfZw1i.js";
import { u as useSearchPlayers, a as usePlayers } from "./usePlayers-CCrORHpA.js";
import { u as useTeams } from "./useTeams-YLryVOkW.js";
import "./button-CXsuziPg.js";
import "./user-BifTdhaf.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
];
const X = createLucideIcon("x", __iconNode);
function Input({ className, type, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "input",
    {
      type,
      "data-slot": "input",
      className: cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      ),
      ...props
    }
  );
}
const POSITION_FILTERS = [
  { value: "all", label: "Alle" },
  { value: "Keeper", label: POSITION_LABELS.Keeper },
  { value: "VenstreKant", label: POSITION_LABELS.VenstreKant },
  { value: "HoyreKant", label: POSITION_LABELS.HoyreKant },
  { value: "Linje", label: POSITION_LABELS.Linje },
  { value: "Bakspiller", label: POSITION_LABELS.Bakspiller }
];
function SearchResult({
  player,
  teamName
}) {
  const { data: following, isLoading: checkingFollow } = useIsFollowing(
    player.id
  );
  const followMutation = useFollowPlayer();
  const unfollowMutation = useUnfollowPlayer();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    PlayerCard,
    {
      player,
      teamName,
      isFollowing: following ?? false,
      onFollow: () => followMutation.mutate(player.id),
      onUnfollow: () => unfollowMutation.mutate(player.id),
      isLoading: checkingFollow || followMutation.isPending || unfollowMutation.isPending
    }
  );
}
function SearchPage() {
  const [inputValue, setInputValue] = reactExports.useState("");
  const [debouncedQuery, setDebouncedQuery] = reactExports.useState("");
  const [positionFilter, setPositionFilter] = reactExports.useState("all");
  const debounceRef = reactExports.useRef(null);
  const { data: rawResults, isLoading } = useSearchPlayers(debouncedQuery);
  const { data: teams } = useTeams();
  const { data: allPlayers } = usePlayers();
  const teamMap = new Map(
    (teams ?? []).map((t) => [t.id.toString(), t.name])
  );
  const totalPlayers = (allPlayers == null ? void 0 : allPlayers.length) ?? 0;
  const totalTeams = (teams == null ? void 0 : teams.length) ?? 0;
  const results = positionFilter === "all" ? rawResults : rawResults == null ? void 0 : rawResults.filter((p) => p.position.toString() === positionFilter);
  const handleChange = reactExports.useCallback((e) => {
    const val = e.target.value;
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(val);
    }, 300);
  }, []);
  const handleClear = reactExports.useCallback(() => {
    setInputValue("");
    setDebouncedQuery("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);
  reactExports.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);
  const hasQuery = debouncedQuery.trim() !== "";
  const showSkeletons = isLoading && hasQuery;
  const showNoResults = !isLoading && results !== void 0 && results.length === 0 && hasQuery;
  const showResults = results && results.length > 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center", "data-ocid": "search-input-wrap", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Input,
        {
          value: inputValue,
          onChange: handleChange,
          placeholder: "Søk etter spillernavn, lag eller posisjon",
          className: "pl-10 pr-10 h-11 bg-card border-border placeholder:text-muted-foreground text-foreground rounded-xl focus-visible:ring-primary/50",
          "data-ocid": "search-input",
          autoFocus: true,
          autoComplete: "off",
          inputMode: "search"
        }
      ),
      inputValue && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: handleClear,
          className: "absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors",
          "aria-label": "Tøm søk",
          "data-ocid": "search-clear-btn",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-4" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "flex gap-2 overflow-x-auto pb-0.5 no-scrollbar",
        "data-ocid": "position-filter-pills",
        children: POSITION_FILTERS.map(({ value, label }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => setPositionFilter(value),
            className: cn(
              "flex-shrink-0 h-7 px-3.5 rounded-full text-[11px] font-display font-semibold tracking-wide uppercase transition-smooth border",
              positionFilter === value ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            ),
            "data-ocid": `filter-pill-${value}`,
            children: label
          },
          value
        ))
      }
    ),
    !hasQuery && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex flex-col items-center justify-center py-16 gap-4 text-center",
        "data-ocid": "search-empty-prompt",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-16 rounded-full bg-card border border-border flex items-center justify-center shadow-elevated", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "size-7 text-muted-foreground" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-semibold text-foreground text-base", children: "Finn din neste favorittspiller" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1 max-w-[260px]", children: "Søk etter spillernavn, lag eller posisjon" })
          ] }),
          totalPlayers > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "p",
            {
              className: "text-xs text-muted-foreground/70 bg-card border border-border rounded-full px-3 py-1",
              "data-ocid": "data-status",
              children: [
                "Viser ",
                totalPlayers,
                " spillere fra ",
                totalTeams,
                " lag"
              ]
            }
          )
        ]
      }
    ),
    showSkeletons && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", "data-ocid": "search-loading", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "player" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "player" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "player" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, { variant: "player" })
    ] }),
    showNoResults && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex flex-col items-center justify-center py-14 gap-3 text-center",
        "data-ocid": "search-no-results",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-14 rounded-full bg-card border border-border flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "size-6 text-muted-foreground opacity-50" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display font-semibold text-foreground", children: "Ingen treff" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground mt-1", children: [
              "Ingen spillere funnet for «",
              debouncedQuery,
              "»"
            ] })
          ] })
        ]
      }
    ),
    showResults && !showSkeletons && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "search-results", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground px-0.5 mb-3", children: [
        results.length,
        " ",
        results.length === 1 ? "spiller" : "spillere",
        " ",
        "funnet"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-3", children: results.map((player) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        SearchResult,
        {
          player,
          teamName: teamMap.get(player.teamId.toString())
        },
        player.id.toString()
      )) })
    ] })
  ] });
}
export {
  SearchPage as default
};
