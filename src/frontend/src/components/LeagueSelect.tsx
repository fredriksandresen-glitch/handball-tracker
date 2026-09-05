import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ELITE_LEAGUE_ID,
  LEAGUES,
  normalizeLeagueId,
  type LeagueId,
} from "../data/seasons";
import { cn } from "../lib/utils";

export function useSelectedLeague() {
  const search = useSearch({ from: "__root__" });
  return normalizeLeagueId(search.league);
}

export function LeagueSelect() {
  const search = useSearch({ from: "__root__" });
  const navigate = useNavigate();
  const league = normalizeLeagueId(search.league);

  useEffect(() => {
    if (search.league !== league) {
      void navigate({
        to: ".",
        search: (previous) => ({ ...previous, league: ELITE_LEAGUE_ID }),
        replace: true,
      });
    }
  }, [league, navigate, search.league]);

  function handleChange(nextLeague: LeagueId) {
    void navigate({
      to: ".",
      search: (previous) => ({ ...previous, league: nextLeague }),
    });
  }

  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/35 p-1"
      role="group"
      aria-label="Velg liga"
      data-ocid="league-select"
    >
      {LEAGUES.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => handleChange(item.id)}
          aria-pressed={league === item.id}
          className={cn(
            "h-9 rounded-md px-3 text-xs font-display font-bold transition-colors",
            league === item.id
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
