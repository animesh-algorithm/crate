import { Component, useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ArrowUpRight, Library, Plus, Search, Settings as SettingsIcon, X } from "lucide-react";
import { ImportDialog } from "./components/ImportDialog";
import { OrganizePage } from "./components/OrganizePage";
import { Empty } from "./components/UI";
import { useLibrary } from "./lib/store";
import { Browse, Detail, Home, Info, Settings } from "./pages";

const scrollPositions = new Map<string, number>();

export default function LibraryApp() {
  const [importing, setImporting] = useState(false);
  const { demo, exitDemo, user, error, setError, notice, busy, loading, owner } = useLibrary();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => setImporting(false), [owner]);
  useEffect(() => {
    const path = location.pathname;
    const frame = requestAnimationFrame(() => window.scrollTo({ top: scrollPositions.get(path) || 0 }));
    const record = () => scrollPositions.set(path, window.scrollY);
    window.addEventListener("scroll", record, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", record); };
  }, [location.pathname, loading]);
  return (
    <>
      <a href="#main" className="skip-link">Skip to your library</a>
      <header className="masthead">
        <Link to="/app" className="brand" aria-label="Crate library home">
          <span className="crate-symbol" aria-hidden="true"><i /><i /><i /></span>crate<span className="brand-period">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to="/app" end><Library size={17} /><span>My library</span></NavLink>
          <NavLink to="/app/search"><Search size={17} /><span>Search</span></NavLink>
          <button className="add-nav" onClick={() => setImporting(true)}><Plus size={17} /><span>Add saves</span></button>
        </nav>
        <Link to="/app/settings" className="account-button" aria-label="Account and settings"><span>{user?.email?.[0]?.toUpperCase() || <SettingsIcon size={18} />}</span></Link>
      </header>
      {demo && <div className="demo-banner"><span>You’re exploring a sample library. These are illustrative saves.</span><button className="text-button" onClick={() => { exitDemo(); navigate("/"); }}>Start my own <ArrowUpRight size={15} /></button></div>}
      {error && <div className="global-message error" role="alert"><span>{error}</span><button aria-label="Dismiss error" className="circle small" onClick={() => setError("")}><X size={16} /></button></div>}
      <main id="main" className="main-shell">
        <ErrorBoundary>
          {loading ? <div className="page-loading" role="status">Opening your library…</div> : (
            <Routes key={owner}>
              <Route index element={<Home onImport={() => setImporting(true)} />} />
              <Route path="saves" element={<Browse />} />
              <Route path="organize" element={<OrganizePage />} />
              <Route path="search" element={<Browse search />} />
              <Route path="collection/:id" element={<Browse />} />
              <Route path="save/:id" element={<Detail />} />
              <Route path="settings" element={<Settings />} />
              <Route path="help" element={<Info type="help" />} />
              <Route path="privacy" element={<Info type="privacy" />} />
              <Route path="terms" element={<Info type="terms" />} />
              <Route path="*" element={<Empty title="A little lost?" description="Let’s take you back to your library." action={<Link to="/app" className="button purple">Go home</Link>} />} />
            </Routes>
          )}
        </ErrorBoundary>
      </main>
      <div className="save-status" role="status" aria-live="polite">{busy ? "Keeping your changes…" : notice}</div>
      {importing && <ImportDialog onClose={() => setImporting(false)} />}
    </>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <Empty title="Something got in the way." description="Your saved library remains on this device. Reload to try again." action={<button className="button quiet" onClick={() => window.location.reload()}>Reload</button>} /> : this.props.children;
  }
}
