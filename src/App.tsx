import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useLibrary } from "./lib/store";

const MarketingPage = lazy(() => import("./marketing/MarketingPage"));
const LibraryApp = lazy(() => import("./LibraryApp"));
const legacyRoutes = ["search", "saves", "organize", "settings", "help", "privacy", "terms"];

function LegacyRedirect() {
  const location = useLocation();
  return <Navigate replace to={`/app${location.pathname}${location.search}`} />;
}

function AuthCallback() {
  const { loading } = useLibrary();
  if (loading) return <main className="route-loading" role="status">Finishing sign-in…</main>;
  return <Navigate replace to="/app" />;
}

function RouteMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const landing = pathname === "/";
    document.documentElement.dataset.surface = landing ? "marketing" : "app";
    document.title = landing ? "Crate — Find the saves you meant to remember" : "Your library — Crate";
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      landing
        ? "Bring your Instagram saves into a private, searchable library that runs in your browser."
        : "Your private Crate library.",
    );
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <RouteMetadata />
      <Suspense fallback={<main className="route-loading">Opening Crate…</main>}>
        <Routes>
          <Route path="/" element={<MarketingPage />} />
          <Route path="/app/*" element={<LibraryApp />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          {legacyRoutes.map((path) => <Route key={path} path={`/${path}`} element={<LegacyRedirect />} />)}
          <Route path="/collection/:id" element={<LegacyRedirect />} />
          <Route path="/save/:id" element={<LegacyRedirect />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </Suspense>
    </>
  );
}
