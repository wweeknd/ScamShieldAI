import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { Loading } from "./components/ui";

// Route-level code splitting keeps the initial bundle small; each page (and the
// force-directed network graph) only loads when it's actually visited.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Analyze = lazy(() => import("./pages/Analyze"));
const ThreatReport = lazy(() => import("./pages/ThreatReport"));
const ScamNetwork = lazy(() => import("./pages/ScamNetwork"));
const History = lazy(() => import("./pages/History"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            <Suspense fallback={<Loading />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path="/analyze"
          element={
            <Suspense fallback={<Loading />}>
              <Analyze />
            </Suspense>
          }
        />
        <Route
          path="/report/:id"
          element={
            <Suspense fallback={<Loading />}>
              <ThreatReport />
            </Suspense>
          }
        />
        <Route
          path="/network"
          element={
            <Suspense fallback={<Loading />}>
              <ScamNetwork />
            </Suspense>
          }
        />
        <Route
          path="/history"
          element={
            <Suspense fallback={<Loading />}>
              <History />
            </Suspense>
          }
        />
        <Route
          path="/privacy"
          element={
            <Suspense fallback={<Loading />}>
              <Privacy />
            </Suspense>
          }
        />
        <Route
          path="/terms"
          element={
            <Suspense fallback={<Loading />}>
              <Terms />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={<Loading />}>
              <NotFound />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
