import { cn } from "@/lib/utils";
import { Link, useRouterState, useSearch } from "@tanstack/react-router";
import { Bot, Home, Moon, Search, Sun, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  CURRENT_SEASON_ID,
  normalizeLeagueId,
  normalizeSeasonId,
} from "../data/seasons";
import { AccountControl } from "./AccountControl";

const NAV_ITEMS = [
  { to: "/", label: "Hjem", icon: Home, ocid: "nav-hjem" },
  { to: "/search", label: "Søk", icon: Search, ocid: "nav-sok" },
  { to: "/teams", label: "Lag", icon: Users, ocid: "nav-lag" },
  { to: "/favorites", label: "Toppliste", icon: Trophy, ocid: "nav-toppliste" },
  { to: "/ai-chat", label: "AI", icon: Bot, ocid: "nav-ai" },
] as const;

type ThemeMode = "light" | "dark";
const THEME_STORAGE_KEY = "handball-tracker-theme";

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";

  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [isDark, theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex size-9 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent/65 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
      aria-label={isDark ? "Bytt til lys modus" : "Bytt til mørk modus"}
      title={isDark ? "Lys modus" : "Mørk modus"}
      data-ocid="theme-toggle"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

interface Props {
  children: React.ReactNode;
  title?: string;
  headerRight?: React.ReactNode;
}

export function Layout({ children, title, headerRight }: Props) {
  const router = useRouterState();
  const pathname = router.location.pathname;
  const search = useSearch({ from: "__root__" });
  const season = normalizeSeasonId(search.season);
  const league = normalizeLeagueId(search.league);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-sidebar text-sidebar-foreground border-b border-sidebar-border shadow-subtle">
        <div className="flex items-center justify-between h-14 px-4 max-w-2xl mx-auto w-full">
          <Link
            to="/"
            search={{ season, league }}
            className="flex items-center gap-2"
            data-ocid="header-logo"
          >
            {season === CURRENT_SEASON_ID ? (
              <>
                <span className="font-display font-black text-lg text-sidebar-foreground">
                  Elkjøp
                </span>
                <span className="hidden sm:inline text-xs text-sidebar-foreground/65 font-body">
                  -ligaen
                </span>
              </>
            ) : (
              <>
                <span className="font-display font-black text-lg text-sidebar-foreground">
                  REMA<span className="text-sidebar-primary">1000</span>
                </span>
                <span className="hidden sm:inline text-xs text-sidebar-foreground/65 font-body">
                  -ligaen
                </span>
              </>
            )}
          </Link>

          {title && (
            <h1 className="absolute left-1/2 -translate-x-1/2 font-display font-bold text-sm uppercase tracking-widest text-sidebar-foreground">
              {title}
            </h1>
          )}

          <div className="flex items-center gap-2">
            {headerRight}
            <AccountControl />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 max-w-2xl mx-auto w-full px-4 pt-4">
        {children}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border"
        data-ocid="bottom-nav"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch max-w-2xl mx-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon, ocid }) => {
            const isActive =
              to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                search={{ season, league }}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 min-h-[56px] py-2.5 gap-1 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                data-ocid={ocid}
              >
                <Icon
                  className={cn(
                    "size-5 transition-smooth",
                    isActive &&
                      "drop-shadow-[0_0_6px_oklch(0.75_0.15_190/0.6)]",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-display font-semibold uppercase tracking-wide leading-none",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
                {isActive && (
                  <span className="absolute top-0 h-0.5 w-8 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
