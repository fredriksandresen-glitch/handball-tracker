import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, RefreshCw, Search, Star, Users } from "lucide-react";
import type { ProfixioStatus } from "../backend.d";
import {
  useDataStatus,
  useProfixioStatus,
  useRefreshProfixio,
} from "../hooks/useProfixio";

const NAV_ITEMS = [
  { to: "/", label: "Hjem", icon: Home, ocid: "nav-hjem" },
  { to: "/search", label: "Søk", icon: Search, ocid: "nav-sok" },
  { to: "/teams", label: "Lag", icon: Users, ocid: "nav-lag" },
  { to: "/favorites", label: "Favoritter", icon: Star, ocid: "nav-favoritter" },
] as const;

// ── DataSourceBadge ────────────────────────────────────────────────────────
const DATA_SOURCE_CONFIG = {
  live: {
    dot: "bg-green-400",
    ping: "bg-green-400",
    label: "Live",
    textColor: "text-green-400",
    showPing: true,
  },
  scraped: {
    dot: "bg-amber-400",
    ping: "bg-amber-400",
    label: "Scraped",
    textColor: "text-amber-400",
    showPing: false,
  },
  mock: {
    dot: "bg-muted-foreground",
    ping: "bg-muted-foreground",
    label: "Demo",
    textColor: "text-muted-foreground",
    showPing: false,
  },
  topphandball: {
    dot: "bg-cyan-500",
    ping: "bg-cyan-500",
    label: "topphandball.no",
    textColor: "text-cyan-400",
    showPing: true,
  },
} as const;

function DataSourceBadge() {
  const { data: status } = useProfixioStatus() as {
    data: ProfixioStatus | undefined;
  };
  const refresh = useRefreshProfixio();

  if (!status) return null;

  const source = (status.dataSource ??
    (status.isLive ? "live" : "mock")) as keyof typeof DATA_SOURCE_CONFIG;
  const cfg = DATA_SOURCE_CONFIG[source] ?? DATA_SOURCE_CONFIG.mock;

  return (
    <div className="flex items-center gap-1.5" title={status.message}>
      <span className="relative flex size-2">
        {cfg.showPing && (
          <span
            className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-60",
              cfg.ping,
            )}
          />
        )}
        <span
          className={cn("relative inline-flex size-2 rounded-full", cfg.dot)}
        />
      </span>
      <span
        className={cn(
          "text-[10px] font-display font-semibold uppercase tracking-wide hidden xs:inline",
          cfg.textColor,
        )}
      >
        {cfg.label}
      </span>
      <button
        type="button"
        onClick={() => refresh.mutate()}
        disabled={refresh.isPending}
        aria-label="Oppdater data"
        className="p-1.5 rounded-full text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
        data-ocid="header-refresh-btn"
      >
        <RefreshCw
          className={cn("size-3.5", refresh.isPending && "animate-spin")}
        />
      </button>
    </div>
  );
}

// ── DataStatusBanner ───────────────────────────────────────────────────────
function DataStatusBanner() {
  const { data, isLoading } = useDataStatus();

  if (isLoading || !data) return null;

  const { playerCount, teamCount, dataSource } = data;

  const sourceLabel =
    dataSource === "live"
      ? "Profixio API"
      : dataSource === "scraped"
        ? "handball.no"
        : dataSource === "topphandball"
          ? "topphandball.no"
          : "mock-data";

  let bannerClass: string;
  let message: string;

  if (playerCount === 0) {
    bannerClass = "bg-red-600/90 text-white border-b border-red-700";
    message = "⚠️ Data ikke lastet – ingen spillere funnet";
  } else if (playerCount < 50) {
    bannerClass = "bg-orange-500/90 text-white border-b border-orange-600";
    message = `⚠️ Delvis data: ${playerCount} spillere / ${teamCount} lag fra ${sourceLabel}`;
  } else {
    bannerClass = "bg-green-700/80 text-white border-b border-green-800";
    message = `✓ ${playerCount} spillere / ${teamCount} lag tilgjengelig fra ${sourceLabel}`;
  }

  return (
    <div
      className={cn(
        "w-full text-center text-[11px] font-display font-semibold tracking-wide py-1 px-3",
        bannerClass,
      )}
      data-ocid="data-status-banner"
    >
      {message}
    </div>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────
interface Props {
  children: React.ReactNode;
  title?: string;
  headerRight?: React.ReactNode;
}

export function Layout({ children, title, headerRight }: Props) {
  const router = useRouterState();
  const pathname = router.location.pathname;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Debug / data status banner */}
      <DataStatusBanner />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-subtle">
        <div className="flex items-center justify-between h-14 px-4 max-w-2xl mx-auto w-full">
          <Link
            to="/"
            className="flex items-center gap-2"
            data-ocid="header-logo"
          >
            <span className="font-display font-black text-lg tracking-tight text-foreground">
              REMA<span className="text-primary">1000</span>
            </span>
            <span className="hidden sm:inline text-xs text-muted-foreground font-body">
              -ligaen
            </span>
          </Link>

          {title && (
            <h1 className="absolute left-1/2 -translate-x-1/2 font-display font-bold text-sm uppercase tracking-widest text-foreground">
              {title}
            </h1>
          )}

          <div className="flex items-center gap-2">
            <DataSourceBadge />
            {headerRight}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-24 max-w-2xl mx-auto w-full px-4 pt-4">
        {children}
      </main>

      {/* Bottom navigation */}
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
