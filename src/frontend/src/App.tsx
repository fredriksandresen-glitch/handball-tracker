import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Suspense, lazy } from "react";
import { Layout } from "./components/Layout";
import { SkeletonCard } from "./components/SkeletonCard";
import {
  type LeagueId,
  type SeasonId,
  isLeagueId,
  isSeasonId,
} from "./data/seasons";

const BackendProvider = lazy(() => import("./components/BackendProvider"));
const HomePage = lazy(() => import("./pages/HomePage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const TeamsPage = lazy(() => import("./pages/TeamsPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const PlayerPage = lazy(() => import("./pages/PlayerPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const AiChatPage = lazy(() => import("./pages/AiChatPage"));
const CoachPage = lazy(() => import("./pages/CoachPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));

function PageLoader() {
  return (
    <div className="space-y-3 pt-2">
      <SkeletonCard variant="player" />
      <SkeletonCard variant="player" />
      <SkeletonCard variant="player" />
    </div>
  );
}

function BackendBoundary({ children }: { children: ReactNode }) {
  return <BackendProvider>{children}</BackendProvider>;
}

const rootRoute = createRootRoute({
  validateSearch: (
    search: Record<string, unknown>,
  ): { season?: SeasonId; league?: LeagueId } => ({
    season: isSeasonId(search.season) ? search.season : undefined,
    league: isLeagueId(search.league) ? search.league : undefined,
  }),
  component: () => (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </Layout>
  ),
  notFoundComponent: () => (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-5xl">🤷‍♀️</p>
      <h1 className="text-xl font-semibold">Fant ikke siden</h1>
      <p className="max-w-xs text-sm text-white/60">
        Lenken peker et sted som ikke finnes lenger.
      </p>
      <Link
        to="/"
        className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium transition hover:bg-white/20"
      >
        Til forsiden
      </Link>
    </div>
  ),
});

// Gamle GitHub Pages-lenker laa under /handball-tracker/. Send dem hjem
// i stedet for aa vise «Not Found».
const legacyBaseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/handball-tracker",
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
const legacyPathRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/handball-tracker/$",
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <BackendBoundary>
      <HomePage />
    </BackendBoundary>
  ),
});
const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  component: SearchPage,
});
const coachRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/trener",
  component: () => (
    <BackendBoundary>
      <CoachPage />
    </BackendBoundary>
  ),
});
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: () => (
    <BackendBoundary>
      <AdminPage />
    </BackendBoundary>
  ),
});
const teamsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/teams",
  component: TeamsPage,
});
const favoritesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/favorites",
  component: () => (
    <BackendBoundary>
      <FavoritesPage />
    </BackendBoundary>
  ),
});
const playerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/player/$id",
  component: () => (
    <BackendBoundary>
      <PlayerPage />
    </BackendBoundary>
  ),
});
const teamRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/team/$id",
  component: () => (
    <BackendBoundary>
      <TeamPage />
    </BackendBoundary>
  ),
});
const aiChatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ai-chat",
  component: () => (
    <BackendBoundary>
      <AiChatPage />
    </BackendBoundary>
  ),
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  searchRoute,
  teamsRoute,
  favoritesRoute,
  playerRoute,
  teamRoute,
  aiChatRoute,
  coachRoute,
  adminRoute,
  legacyBaseRoute,
  legacyPathRoute,
]);

const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
