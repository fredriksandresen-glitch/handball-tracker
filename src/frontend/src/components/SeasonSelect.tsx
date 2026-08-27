import { useNavigate, useSearch } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { useEffect } from "react";
import {
  CURRENT_SEASON_ID,
  SEASONS,
  normalizeSeasonId,
  type SeasonId,
} from "../data/seasons";

export function useSelectedSeason() {
  const search = useSearch({ from: "__root__" });
  return normalizeSeasonId(search.season);
}

export function SeasonSelect({ compact = false }: { compact?: boolean }) {
  const search = useSearch({ from: "__root__" });
  const navigate = useNavigate();
  const season = normalizeSeasonId(search.season);

  useEffect(() => {
    if (search.season !== season) {
      void navigate({
        to: ".",
        search: (previous) => ({ ...previous, season: CURRENT_SEASON_ID }),
        replace: true,
      });
    }
  }, [navigate, search.season, season]);

  function handleChange(nextSeason: SeasonId) {
    void navigate({
      to: ".",
      search: (previous) => ({ ...previous, season: nextSeason }),
    });
  }

  return (
    <label className="inline-flex items-center gap-2">
      <CalendarDays className="size-4 text-muted-foreground shrink-0" />
      <span className="sr-only">Velg sesong</span>
      <select
        value={season}
        onChange={(event) => handleChange(event.target.value as SeasonId)}
        className={
          compact
            ? "h-9 rounded-lg border border-border bg-card px-2 text-xs font-display font-bold text-foreground outline-none focus:border-primary"
            : "h-10 rounded-lg border border-border bg-card px-3 text-sm font-display font-bold text-foreground outline-none focus:border-primary"
        }
        aria-label="Velg sesong"
        data-ocid="season-select"
      >
        {SEASONS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}{item.isCurrent ? " (nyeste)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
