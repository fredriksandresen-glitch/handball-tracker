import { Suspense, lazy, useEffect, useState } from "react";
import {
  AUTH_SESSION_CHANGED_EVENT,
  hasAuthenticatedSessionHint,
} from "../utils/followedPlayerStorage";
import type { LeagueId, SeasonId } from "../data/seasons";

const AdminNavLink = lazy(() => import("./AdminNavLink"));

/**
 * Admin-fanen i bunnmenyen (F11).
 *
 * Samme totrinnsmoenster som CoachNavSlot, og av samme grunn:
 *  1. Her sjekkes kun en lettvekts sesjonsmarkoer i localStorage. Er ingen
 *     logget inn lastes ingenting, og Layout roerer aldri identity-hooks.
 *  2. Er noen logget inn, lastes AdminNavLink med sin EGEN
 *     InternetIdentityProvider, som gjoer den ekte rollesjekken.
 *
 * Merk: dette skjuler bare knappen. /admin har sin egen tilgangssjekk, og
 * backend avviser uansett kall fra andre enn admin.
 */
export function AdminNavSlot({
  isActive,
  season,
  league,
}: {
  isActive: boolean;
  season: SeasonId;
  league: LeagueId;
}) {
  const [maybeSignedIn, setMaybeSignedIn] = useState(
    hasAuthenticatedSessionHint,
  );

  useEffect(() => {
    const update = () => setMaybeSignedIn(hasAuthenticatedSessionHint());
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  if (!maybeSignedIn) return null;

  return (
    <Suspense fallback={null}>
      <AdminNavLink isActive={isActive} season={season} league={league} />
    </Suspense>
  );
}
