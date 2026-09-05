import { InternetIdentityProvider } from "@caffeineai/core-infrastructure";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ClipboardList } from "lucide-react";
import { useAppRole } from "../hooks/useAppRole";
import type { LeagueId, SeasonId } from "../data/seasons";

/**
 * Selve lenken. Rendres KUN naar brukeren har trenerrolle.
 *
 * Ligger i egen fil fordi den maa ha sin egen InternetIdentityProvider:
 * Layout rendres utenfor providerne, og identity-hooks der tar ned hele
 * appen (skjedde 2026-08-31). Samme moenster som AccountMenu.
 */
function CoachNavLinkContent({
  isActive,
  season,
  league,
}: {
  isActive: boolean;
  season: SeasonId;
  league: LeagueId;
}) {
  const { isCoach } = useAppRole();
  if (!isCoach) return null;

  return (
    <Link
      to="/trener"
      search={{ season, league }}
      className={cn(
        "relative flex flex-col items-center justify-center flex-1 min-h-[56px] py-2.5 gap-1 transition-colors",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
      data-ocid="nav-trener"
    >
      <ClipboardList
        className={cn(
          "size-5 transition-smooth",
          isActive && "drop-shadow-[0_0_6px_oklch(0.75_0.15_190/0.6)]",
        )}
      />
      <span
        className={cn(
          "text-[10px] font-display font-semibold uppercase tracking-wide leading-none",
          isActive ? "text-primary" : "text-muted-foreground",
        )}
      >
        Trener
      </span>
      {isActive && (
        <span className="absolute top-0 h-0.5 w-8 bg-primary rounded-full" />
      )}
    </Link>
  );
}

export default function CoachNavLink(props: {
  isActive: boolean;
  season: SeasonId;
  league: LeagueId;
}) {
  return (
    <InternetIdentityProvider>
      <CoachNavLinkContent {...props} />
    </InternetIdentityProvider>
  );
}
