import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Suspense, lazy } from "react";
import { Layout } from "./components/Layout";
import { SkeletonCard } from "./components/SkeletonCard";

// Lazy page imports
const HomePage = lazy(() => import("./pages/HomePage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const TeamsPage = lazy(() => import("./pages/TeamsPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const PlayerPage = lazy(() => import("./pages/PlayerPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));

function PageLoader() {
  return (
    <div className="space-y-3 pt-2">
      <SkeletonCard variant="player" />
      <SkeletonCard variant="player" />
      <SkeletonCard variant="player" />
    </div>
  );
}

// Root route
const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </Layout>
  ),
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});
const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  component: SearchPage,
});
const teamsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/teams",
  component: TeamsPage,
});
const favoritesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/favorites",
  component: FavoritesPage,
});
const playerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/player/$id",
  component: PlayerPage,
});
const teamRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/team/$id",
  component: TeamPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  searchRoute,
  teamsRoute,
  favoritesRoute,
  playerRoute,
  teamRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
