import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";

type SearchIndexEntry = {
  id: string;
  name: string;
  teamName: string;
  position: string;
  imageUrl?: string;
};

let indexPromise: Promise<SearchIndexEntry[]> | undefined;

function loadIndex() {
  indexPromise ??= fetch("/data/search-player-index.json")
    .then(async (response) => {
      if (!response.ok) return [];
      return (await response.json()) as SearchIndexEntry[];
    })
    .catch(() => []);
  return indexPromise;
}

/**
 * Viser spillerne AI-en faktisk slo opp, som klikkbare kort med lite bilde.
 * entityIds kommer fra svarets `sources`, sa vi lenker kun til spillere som
 * virkelig ble brukt i analysen.
 */
function normalizeName(value: string) {
  return value
    .toLocaleLowerCase("nb")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "");
}

/**
 * entityIds inneholder ALLE spillere verktoyene tok borti — f.eks. hele
 * troppen fra team_latest_match. Vi viser derfor bare spillere som faktisk
 * er nevnt i svaret, ellers blir det en vegg av irrelevante kort.
 */
function isMentioned(name: string, answer: string) {
  const haystack = normalizeName(answer);
  const parts = normalizeName(name).split(/\s+/).filter((part) => part.length > 2);
  if (parts.length === 0) return false;
  const first = parts[0];
  const last = parts[parts.length - 1];
  return haystack.includes(last) || (parts.length === 1 && haystack.includes(first));
}

export function AiPlayerChips({
  entityIds,
  answer,
}: {
  entityIds: string[];
  answer: string;
}) {
  const unique = Array.from(new Set(entityIds.filter(Boolean)));
  const { data: entries = [] } = useQuery({
    queryKey: ["aiPlayerChipIndex"],
    queryFn: loadIndex,
    staleTime: Number.POSITIVE_INFINITY,
  });

  if (unique.length === 0 || entries.length === 0) return null;

  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const players = unique
    .map((id) => byId.get(id))
    .filter((entry): entry is SearchIndexEntry => Boolean(entry))
    .filter((entry) => isMentioned(entry.name, answer))
    .slice(0, 8);

  if (players.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground">
        <Users className="size-3.5" />
        Spillere i analysen
      </div>
      <div className="flex flex-wrap gap-2">
        {players.map((player) => (
          <Link
            key={player.id}
            to="/player/$id"
            params={{ id: player.id }}
            className="flex items-center gap-2 rounded-full border border-border/70 bg-card py-1 pl-1 pr-3 transition-colors hover:border-primary/60 hover:bg-primary/5"
          >
            {player.imageUrl ? (
              <img
                src={player.imageUrl}
                alt=""
                loading="lazy"
                className="size-7 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                {player.name.slice(0, 1)}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold leading-tight text-foreground">
                {player.name}
              </span>
              <span className="block truncate text-[10px] leading-tight text-muted-foreground">
                {player.teamName}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
