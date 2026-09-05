import { Suspense, lazy, useEffect, useState } from "react";
import {
  AUTH_SESSION_CHANGED_EVENT,
  hasAuthenticatedSessionHint,
} from "../utils/followedPlayerStorage";
import type { LeagueId, SeasonId } from "../data/seasons";

const CoachNavLink = lazy(() => import("./CoachNavLink"));

/**
 * Trenerfanen i bunnmenyen (2026-08-31).
 *
 * To lag med vilje:
 *  1. Denne komponenten sjekker kun en lettvekts sesjonsmarkoer i
 *     localStorage. Er ingen logget inn, lastes ingenting — ingen provider,
 *     ingen kostnad, og Layout roerer aldri identity-hooks.
 *  2. Er noen logget inn, lastes CoachNavLink som har sin EGEN
 *     InternetIdentityProvider og gjoer den ekte rollesjekken.
 *
 * Merk: dette skjuler bare knappen. Selve /trener-siden har sin egen
 * tilgangssjekk, saa lenken er ikke sikkerhetsmekanismen.
 */
export function CoachNavSlot({
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
      <CoachNavLink isActive={isActive} season={season} league={league} />
    </Suspense>
  );
}
