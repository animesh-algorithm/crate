import { useEffect, useState, type ReactNode, Component } from "react";
import { Routes, Route, NavLink, Link, useLocation } from "react-router-dom";
import {
  Plus,
  Search,
  Settings as SettingsIcon,
  ArrowUpRight,
  Library,
  X,
} from "lucide-react";
import { useLibrary } from "./lib/store";
import { Home, Browse, Detail, Settings, Info } from "./pages";
import { ImportDialog } from "./components/ImportDialog";
import { OrganizePage } from "./components/OrganizePage";
import { Empty } from "./components/UI";
const scrollPositions = new Map<string, number>();
export default function App() {
  const [importing, setImporting] = useState(false),
    { demo, exitDemo, user, error, setError, notice, busy, loading, owner } =
      useLibrary(),
    location = useLocation();
  useEffect(() => setImporting(false), [owner]);
  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Your library",
      "/search": "Search",
      "/settings": "Settings",
      "/saves": "All saves",
      "/organize": "Your suggestions",
      "/privacy": "Privacy",
      "/help": "Help",
      "/terms": "Terms",
    };
    document.title = `${titles[location.pathname] || "Your saves"} — Crate`;
  }, [location.pathname]);
  useEffect(() => {
    if (loading) return;
    const path = location.pathname;
    const target = scrollPositions.get(path) || 0;
    const frame = requestAnimationFrame(() => window.scrollTo({ top: target }));
    const record = () => scrollPositions.set(path, window.scrollY);
    window.addEventListener("scroll", record, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", record);
    };
  }, [location.pathname, loading]);
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to your library
      </a>
      <header className="masthead">
        <Link to="/" className="brand" aria-label="Crate home">
          <span className="crate-symbol" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          crate<span className="brand-period">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            <Library size={17} />
            <span>My library</span>
          </NavLink>
          <NavLink to="/search">
            <Search size={17} />
            <span>Search</span>
          </NavLink>
          <button className="add-nav" onClick={() => setImporting(true)}>
            <Plus size={17} />
            <span>Add saves</span>
          </button>
        </nav>
        <Link
          to="/settings"
          className="account-button"
          aria-label="Account and settings"
        >
          <span>
            {user?.email?.[0]?.toUpperCase() || <SettingsIcon size={18} />}
          </span>
        </Link>
      </header>
      {demo && (
        <div className="demo-banner">
          <span>
            You’re exploring a sample library. These are illustrative saves.
          </span>
          <button className="text-button" onClick={exitDemo}>
            Start my own <ArrowUpRight size={15} />
          </button>
        </div>
      )}
      {error && (
        <div className="global-message error" role="alert">
          <span>{error}</span>
          <button
            aria-label="Dismiss error"
            className="circle small"
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <main id="main" className="main-shell">
        <ErrorBoundary>
          {loading ? (
            <div className="page-loading" role="status">
              Opening your library…
            </div>
          ) : (
            <Routes key={owner}>
              <Route
                path="/"
                element={<Home onImport={() => setImporting(true)} />}
              />
              <Route path="/saves" element={<Browse />} />
              <Route path="/organize" element={<OrganizePage />} />
              <Route path="/search" element={<Browse search />} />
              <Route path="/collection/:id" element={<Browse />} />
              <Route path="/save/:id" element={<Detail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Info type="help" />} />
              <Route path="/privacy" element={<Info type="privacy" />} />
              <Route path="/terms" element={<Info type="terms" />} />
              <Route
                path="/auth/callback"
                element={<Home onImport={() => setImporting(true)} />}
              />
              <Route
                path="*"
                element={
                  <Empty
                    title="A little lost?"
                    description="Let’s take you back to your library."
                    action={
                      <Link to="/" className="button purple">
                        Go home
                      </Link>
                    }
                  />
                }
              />
            </Routes>
          )}
        </ErrorBoundary>
      </main>
      <div className="save-status" role="status" aria-live="polite">
        {busy ? "Keeping your changes…" : notice}
      </div>
      {importing && <ImportDialog onClose={() => setImporting(false)} />}
    </>
  );
}
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Empty
        title="Something got in the way."
        description="Your saved library remains on this device. Reload to try again."
        action={
          <button
            className="button quiet"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        }
      />
    ) : (
      this.props.children
    );
  }
}
