import { ReelPreview } from "./components/ReelPreview";
import { operatorName, privacyEmail } from "./lib/operator";
import { cloud } from "./lib/cloud";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Heart,
  Search,
  Plus,
  SlidersHorizontal,
  ArrowLeft,
  Archive,
  Trash2,
  MoreHorizontal,
  BookOpen,
  Sparkles,
  Check,
  LayoutGrid,
  List,
  Download,
} from "lucide-react";
import { useLibrary } from "./lib/store";
import {
  collectionItems,
  textFor,
  type Item,
  type Collection,
  validateLibrary,
  emptyLibrary,
} from "./lib/model";
import { exactSearch, hybridSearch } from "./lib/search";
import { db } from "./lib/db";
import { Semantic, sourceHash } from "./lib/semantic";
import { SaveCard } from "./components/SaveCard";
import { Empty, Modal, download } from "./components/UI";
import { CollectionDialog } from "./components/CollectionDialog";
import { groupId } from "./lib/organize";
import type { ProposalDraft } from "./lib/db";
export function Home({ onImport }: { onImport: () => void }) {
  const { library, demo, user, loading, owner, admission } = useLibrary(),
    [create, setCreate] = useState(false),
    [draft, setDraft] = useState<ProposalDraft | null>(null);
  const collections = library.collections.filter((c) => !c.parentId),
    items = library.items.filter((x) => !x.archived),
    recent = [...items]
      .sort(
        (a, b) =>
          (b.timestamp || b.importedAt / 1000) -
          (a.timestamp || a.importedAt / 1000),
      )
      .slice(0, 4);
  useEffect(() => {
    let active = true;
    void db.proposals.get(owner).then((value) => { if (active) setDraft(value || null); });
    return () => { active = false; };
  }, [owner, library.revision]);
  if (loading)
    return (
      <div className="page-loading" role="status">
        Opening your library…
      </div>
    );
  return (
    <>
      <section className="home-hero">
        <div>
          <p className="eyebrow">YOUR LITTLE CORNER OF THE INTERNET</p>
          <h1>
            Good things.
            <br />
            <span>All in one place.</span>
            <i aria-hidden="true">✳</i>
          </h1>
          <p className="hero-description">
            The recipe. The faraway place. That thing you meant to try.
            <br className="desktop-break" /> A home for everything you didn’t
            want to forget.
          </p>
        </div>
        <div className="hero-note">
          <span className="note-pin" />
          <span className="hand-line">
            Less scrolling,
            <br />
            more finding.
          </span>
          <ArrowUpRight size={30} />
          <p>
            Keep what catches
            <br />
            your eye.
          </p>
        </div>
      </section>
      {!library.items.length ? (
        <ImportOnboarding onImport={onImport} available={demo || !user || admission === "open" || library.revision > 0} waiting={Boolean(user && admission === "unknown")} />
      ) : (
        <>
          {draft?.groups.length ? (
            <section className="section suggested-home" aria-labelledby="suggested-home-title">
              <div className="section-heading"><div><span className="eyebrow">READY WHEN YOU ARE</span><h2 id="suggested-home-title">Suggested Collections <span className="small-count">{draft.groups.length.toString().padStart(2, "0")}</span></h2></div><Link className="text-button" to="/app/organize">All suggestions <ArrowUpRight size={17} /></Link></div>
              <p className="section-intro">Browse and search every suggestion. Save only the collections that feel useful; the rest stay here on this device.</p>
              <div className="suggested-home-grid">
                {draft.groups.slice(0, 4).map((group, index) => <Link key={groupId(group)} className={`suggested-home-card tone-${index % 4}`} to={`/app/suggested/${encodeURIComponent(groupId(group))}`}><span>{group.ids.length} SAVES · SUGGESTED</span><h3>{group.name}</h3><p>{group.description || "A possible home for things that belong together."}</p><ArrowUpRight size={20} /></Link>)}
              </div>
            </section>
          ) : !collections.length ? (
            <section className="organization-prompt">
              <span className="eyebrow">YOUR SAVES ARE IN</span><h2>Now find the connections.</h2>
              <p>The first smart run downloads about 120 MB and works on this device. Keep this browser open while Crate reviews your saves; you can pause safely.</p>
              <Link className="button purple" to="/app/organize">Find my collections <ArrowRight size={17} /></Link>
            </section>
          ) : null}
          <section className="section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">A PLACE FOR EVERY CURIOSITY</span>
                <h2>
                  Your collections{" "}
                  <span className="small-count">
                    {collections.length.toString().padStart(2, "0")}
                  </span>
                </h2>
              </div>
              <div className="heading-actions">
                <Link className="text-button" to="/app/organize">
                  <Sparkles size={16} /> Find connections
                </Link>
                <button
                  className="circle"
                  aria-label="Create collection"
                  onClick={() => setCreate(true)}
                >
                  <Plus size={22} />
                </button>
              </div>
            </div>
            {collections.length ? (
              <div className="collection-grid">
                {collections.map((c, i) => (
                  <CollectionTile key={c.id} c={c} index={i} />
                ))}
              </div>
            ) : (
              <div className="collection-prompt">
                <p>
                  Your saves are here. Let’s find the things that belong
                  together.
                </p>
                <Link className="button purple" to="/app/organize">
                  Organize my library <ArrowRight size={17} />
                </Link>
              </div>
            )}
          </section>
          <section className="section recent-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">FRESH IN YOUR MIND</span>
                <h2>Recently saved</h2>
              </div>
              <Link className="text-button" to="/app/saves">
                All your saves <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="save-grid">
              {recent.map((x, i) => (
                <SaveCard key={x.id} item={x} index={i} />
              ))}
            </div>
          </section>
          <Rediscovery />
        </>
      )}
      <section className="library-footer">
        <BookOpen size={19} />
        <p>
          {demo
            ? "A sample library, just for exploring."
            : user
              ? "A private library. A little more headspace."
              : "Your private library lives on this device."}
        </p>
        <Link to="/app/help">
          A little help <ArrowUpRight size={14} />
        </Link>
      </section>
      {create && <CollectionDialog onClose={() => setCreate(false)} />}
    </>
  );
}

function ImportOnboarding({ onImport, available, waiting }: { onImport: () => void; available: boolean; waiting: boolean }) {
  return <section className="import-onboarding" aria-labelledby="import-onboarding-title">
    <div className="import-intro"><span className="eyebrow">START WITH YOUR INSTAGRAM EXPORT</span><h2 id="import-onboarding-title">Bring in your Instagram saves.</h2><p>Crate never asks for your Instagram password. Request the export yourself, then review the file here before anything is added.</p>{available ? <button className="button purple" onClick={onImport}>Choose saved_posts.json <ArrowRight size={18} /></button> : <div className="admission-closed" role="status"><strong>{waiting ? "Checking account availability…" : "New online libraries are not available right now."}</strong><span>Your account is signed in, but import stays closed until private storage has been verified and capacity is available.</span></div>}</div>
    <div className="export-guide"><div className="export-guide-head"><span>INSTAGRAM · CURRENT EXPORT PATH</span><a href="https://about.fb.com/news/2023/10/manage-your-information-across-apps/" target="_blank" rel="noreferrer">Meta export help <ArrowUpRight size={15} /></a></div><ol><li><b>Open your Instagram profile</b><span>Tap the menu, then Accounts Center.</span></li><li><b>Open Your information and permissions</b><span>Choose Export your information.</span></li><li><b>Create an export</b><span>Select your Instagram profile, then Export to device.</span></li><li><b>Choose only your saved items</b><span>Select Saved or Saved items and collections.</span></li><li><b>Set All time and JSON</b><span>JSON is required for Crate to read the export.</span></li><li><b>Download and unzip</b><span>Choose saved_posts.json inside the saved folder.</span></li></ol><p>Instagram may change these labels between app versions. The file must be named <code>saved_posts.json</code>.</p></div>
  </section>;
}
function CollectionTile({ c, index }: { c: Collection; index: number }) {
  const { library } = useLibrary(),
    items = collectionItems(library, c.id).filter((x) => !x.archived);
  return (
    <Link
      to={`/app/collection/${c.id}`}
      className={`collection-tile composition-${c.style}`}
    >
      <div className="tile-top">
        <span>{String(index + 1).padStart(2, "0")} / COLLECTION</span>
        <span className="circle">
          <ArrowUpRight size={22} />
        </span>
      </div>
      <div className="tile-title">
        <h3>{c.name}</h3>
        {c.style === 0 && (
          <span className="tile-flower" aria-hidden="true">
            ✳
          </span>
        )}
        {c.style === 1 && (
          <span className="tile-orbit" aria-hidden="true">
            ◎
          </span>
        )}
      </div>
      <div className="tile-bottom">
        <span>{items.length} saves</span>
        <span>
          {c.style === 2
            ? "A little room to wander"
            : c.style === 3
              ? "Ideas worth keeping"
              : "Collected, not forgotten"}
        </span>
      </div>
      {c.style === 3 && (
        <div className="tile-paper" aria-hidden="true">
          <span>{items[0]?.hashtags[0] || "FOR LATER"}</span>
        </div>
      )}
    </Link>
  );
}
function Rediscovery() {
  const { library } = useLibrary();
  const candidates = library.items.filter((i) => !i.archived);
  const seed = Math.floor(Date.now() / 86400000);
  const chosen = candidates.sort((a, b) => a.id.localeCompare(b.id))[
    seed % Math.max(1, candidates.length)
  ];
  if (!chosen) return null;
  return (
    <section className="rediscovery">
      <div>
        <span className="eyebrow">A LITTLE SECOND LOOK</span>
        <h2>Remember this one?</h2>
        <p>Good things deserve more than one glance.</p>
      </div>
      <Link to={`/app/save/${chosen.id}`}>
        <span>@{chosen.creator}</span>
        <p>
          {chosen.captions[0]?.slice(0, 160) ||
            "A save waiting to be rediscovered."}
        </p>
        <span className="circle">
          <ArrowUpRight size={23} />
        </span>
      </Link>
    </section>
  );
}
export function Browse({ search = false }: { search?: boolean }) {
  const { library, busy, change, owner } = useLibrary(),
    { id } = useParams(),
    [params, setParams] = useSearchParams(),
    [selected, setSelected] = useState<string[]>([]),
    [edit, setEdit] = useState(false),
    [bulk, setBulk] = useState(false),
    [filters, setFilters] = useState(false),
    [semanticResults, setSemanticResults] = useState<Item[] | null>(null),
    [smartBusy, setSmartBusy] = useState(false),
    [smartError, setSmartError] = useState(""),
    [smartNote, setSmartNote] = useState(""),
    [proposal, setProposal] = useState<ProposalDraft | null>(null);
  const query = params.get("q") || "",
    view = params.get("view") || "all",
    scope = params.get("scope") || "all",
    layout = params.get("layout") || "grid",
    sort = params.get("sort") || "newest";
  const [inputQuery, setInputQuery] = useState(query);
  useEffect(() => setInputQuery(query), [query]);
  const c = library.collections.find((c) => c.id === id);
  const smart = useRef<Semantic | null>(null);
  useEffect(() => {
    let active = true;
    void db.proposals.get(owner).then((value) => { if (active) setProposal(value || null); });
    return () => { active = false; };
  }, [owner, library.revision]);
  const suggestedIds = useMemo(() => new Set((proposal?.groups || []).flatMap((group) => group.ids)), [proposal]);
  useEffect(() => () => smart.current?.cancel(), []);
  useEffect(() => {
    setSemanticResults(null);
    setSelected([]);
  }, [query, id, view, library.revision]);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const filtered = useMemo(() => {
    let result = id ? collectionItems(library, id) : library.items;
    result = result.filter((x) =>
      view === "archive" ? x.archived : !x.archived,
    );
    if (view === "favorites") result = result.filter((x) => x.favorite);
    if (view === "unsorted")
      result = result.filter((x) => !x.collections.length);
    if (params.get("from"))
      result = result.filter(
        (x) =>
          x.timestamp !== null &&
          x.timestamp >= Date.parse(params.get("from")!) / 1000,
      );
    if (params.get("until"))
      result = result.filter(
        (x) =>
          x.timestamp !== null &&
          x.timestamp < Date.parse(params.get("until")!) / 1000 + 86400,
      );
    if (params.get("language"))
      result = result.filter(
        (x) => (x.language || "und") === params.get("language"),
      );
    if (params.get("creator"))
      result = result.filter((x) => x.creator === params.get("creator"));
    if (params.get("intent"))
      result = result.filter((x) => x.intent === params.get("intent"));
    if (params.get("format"))
      result = result.filter((x) =>
        x.url.includes("/" + params.get("format") + "/"),
      );
    if (params.get("collection"))
      result = result.filter((x) =>
        x.collections.includes(params.get("collection")!),
      );
    if (search && scope === "saved") result = result.filter((x) => x.collections.length > 0);
    if (search && scope === "suggested") result = result.filter((x) => suggestedIds.has(x.id));
    return result;
  }, [library, id, view, params, search, scope, suggestedIds]);
  const results = useMemo(() => {
    const found = semanticResults
      ? semanticResults.filter((i) => filtered.some((x) => x.id === i.id))
      : exactSearch(filtered, library.collections, query);
    if (query) return found;
    return [...found].sort((a, b) =>
      sort === "creator"
        ? a.creator.localeCompare(b.creator)
        : sort === "oldest"
          ? (a.timestamp || a.importedAt / 1000) -
            (b.timestamp || b.importedAt / 1000)
          : sort === "imported"
            ? b.importedAt - a.importedAt
            : (b.timestamp || b.importedAt / 1000) -
              (a.timestamp || a.importedAt / 1000),
    );
  }, [filtered, query, library.collections, semanticResults, sort]);
  const smarter = async () => {
    setSmartBusy(true);
    setSmartError("");
    try {
      const records = await db.vectors.where("owner").equals(owner).toArray();
      const vectors = new Map<string, number[]>();
      for (const r of records) {
        const item = library.items.find((x) => x.id === r.itemId);
        if (item && r.hash === (await sourceHash(item)))
          vectors.set(item.id, r.values);
      }
      setSmartNote(
        vectors.size < library.items.filter((i) => textFor(i).trim()).length
          ? `${vectors.size} saves are ready for related search. Exact search still covers your whole library.`
          : "",
      );
      if (!vectors.size)
        throw Error(
          "Enable smarter search from “Find connections” in your library first.",
        );
      smart.current ||= new Semantic(() => {});
      const q = await smart.current.query(query);
      setSemanticResults(
        hybridSearch(
          exactSearch(filtered, library.collections, query),
          filtered,
          vectors,
          q,
        ),
      );
    } catch (e) {
      setSmartError(
        e instanceof Error ? e.message : "Smarter search is unavailable.",
      );
    } finally {
      setSmartBusy(false);
    }
  };
  const title =
    c?.name ||
    (search
      ? "Find that thing."
      : view === "favorites"
        ? "The favorites."
        : view === "unsorted"
          ? "A little unsorted."
          : view === "archive"
            ? "Tucked away."
            : "Everything you kept.");
  return (
    <>
      <div className="page-title">
        <Link
          className="back"
          to={
            c?.parentId ? `/app/collection/${encodeURIComponent(c.parentId)}` : "/app"
          }
        >
          <ArrowLeft size={17} />{" "}
          {c?.parentId
            ? library.collections.find((parent) => parent.id === c.parentId)
                ?.name || "Parent collection"
            : "Your library"}
        </Link>
        <div className="title-row">
          <h1>{title}</h1>
          {c && (
            <button
              className="circle"
              aria-label="Edit collection"
              onClick={() => setEdit(true)}
            >
              <MoreHorizontal />
            </button>
          )}
        </div>
        <p>
          {c
            ? c.description ||
              `${results.length} saves. A whole world of ${c.name.toLocaleLowerCase()}.`
            : search
              ? "A few words are all it takes to find your way back."
              : "Collected moments, ideas, and things for another day."}
        </p>
      </div>
      {c && library.collections.some((x) => x.parentId === c.id) && (
        <div className="subcollections">
          {library.collections
            .filter((x) => x.parentId === c.id)
            .map((x) => (
              <Link to={`/app/collection/${x.id}`} key={x.id}>
                {x.name} <ArrowUpRight size={16} />
              </Link>
            ))}
        </div>
      )}
      <form
        className="search-bar"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          update("q", inputQuery.trim());
        }}
      >
        <Search size={22} />
        <input
          aria-label="Search your saves"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="A recipe, a place, an idea…"
        />
        <button className="button purple" type="submit">
          Search
        </button>
        {query && (
          <button
            className="text-button"
            type="button"
            disabled={smartBusy}
            onClick={() => void smarter()}
          >
            {smartBusy ? "Finding…" : "Look for related ideas"}
          </button>
        )}
        <button
          className="circle"
          type="button"
          aria-label="Show filters"
          aria-expanded={filters}
          onClick={() => setFilters(!filters)}
        >
          <SlidersHorizontal size={19} />
        </button>
      </form>
      {smartNote && (
        <p className="muted" role="status">
          {smartNote}
        </p>
      )}
      {smartError && (
        <p role="status" className="muted">
          {smartError} Exact search is still available.
        </p>
      )}
      {filters && (
        <div className="filter-panel">
          <label>
            From export date
            <input
              type="date"
              value={params.get("from") || ""}
              onChange={(e) => update("from", e.target.value)}
            />
          </label>
          <label>
            Until export date
            <input
              type="date"
              value={params.get("until") || ""}
              onChange={(e) => update("until", e.target.value)}
            />
          </label>
          <label>
            Language (estimated)
            <select
              value={params.get("language") || ""}
              onChange={(e) => update("language", e.target.value)}
            >
              <option value="">Any language</option>
              {[...new Set(library.items.map((x) => x.language || "und"))]
                .sort()
                .map((code) => (
                  <option key={code} value={code}>
                    {code === "und"
                      ? "Not enough text"
                      : new Intl.DisplayNames(["en"], { type: "language" }).of(
                          code,
                        ) || code}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Creator
            <select
              value={params.get("creator") || ""}
              onChange={(e) => update("creator", e.target.value)}
            >
              <option value="">Anyone</option>
              {[...new Set(library.items.map((x) => x.creator))]
                .sort()
                .map((x) => (
                  <option key={x}>{x}</option>
                ))}
            </select>
          </label>
          <label>
            Purpose
            <select
              value={params.get("intent") || ""}
              onChange={(e) => update("intent", e.target.value)}
            >
              <option value="">Anything</option>
              {["Learn", "Try", "Buy", "Visit", "Enjoy"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Format
            <select
              value={params.get("format") || ""}
              onChange={(e) => update("format", e.target.value)}
            >
              <option value="">All formats</option>
              <option value="reel">Reels</option>
              <option value="p">Posts</option>
              <option value="tv">Videos</option>
            </select>
          </label>
          <label>
            Collection
            <select
              value={params.get("collection") || ""}
              onChange={(e) => update("collection", e.target.value)}
            >
              <option value="">Any collection</option>
              {library.collections.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="text-button"
            onClick={() => setParams(query ? { q: query } : {})}
          >
            Clear filters
          </button>
        </div>
      )}
      {search && <div className="scope-tabs" aria-label="Search scope">{["all", "saved", "suggested"].map((value) => <button key={value} className={scope === value ? "active" : ""} onClick={() => update("scope", value === "all" ? "" : value)}>{value === "all" ? "All saves" : value === "saved" ? "Saved collections" : "Suggested collections"}</button>)}</div>}
      <div className="browse-toolbar">
        <div className="tabs">
          {!id &&
            ["all", "favorites", "unsorted", "archive"].map((v) => (
              <button
                key={v}
                className={view === v ? "active" : ""}
                onClick={() => update("view", v)}
              >
                {v === "all" ? "All saves" : v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
        </div>
        <div className="browse-tools">
          <span>{results.length} saves</span>
          <select
            aria-label="Sort saves"
            value={sort}
            onChange={(e) => update("sort", e.target.value)}
            disabled={Boolean(query)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="imported">Recently imported</option>
            <option value="creator">Creator</option>
          </select>
          <button
            className="circle small"
            aria-label={
              layout === "grid" ? "Use list layout" : "Use grid layout"
            }
            onClick={() =>
              update("layout", layout === "grid" ? "list" : "grid")
            }
          >
            {layout === "grid" ? <List size={18} /> : <LayoutGrid size={18} />}
          </button>
        </div>
      </div>
      {selected.length > 0 && (
        <div className="bulk-toolbar">
          <span>{selected.length} selected</span>
          <button className="text-button" onClick={() => setBulk(true)}>
            Put in a collection
          </button>
          <button
            className="text-button"
            disabled={busy}
            onClick={async () => {
              await change((l) => ({
                ...l,
                items: l.items.map((x) =>
                  selected.includes(x.id)
                    ? { ...x, archived: view !== "archive" }
                    : x,
                ),
              }));
              setSelected([]);
            }}
          >
            {view === "archive" ? "Restore" : "Archive"}
          </button>
          <button className="text-button" onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      )}
      {results.length ? (
        <div className={`save-grid ${layout === "list" ? "list-layout" : ""}`}>
          {results.map((item, i) => (
            <SaveCard
              key={item.id}
              item={item}
              index={i}
              selected={selected.includes(item.id)}
              onSelect={(id) =>
                setSelected((s) =>
                  s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
                )
              }
              badges={search ? [item.collections.length ? "Saved" : "", suggestedIds.has(item.id) ? "Suggested" : ""].filter(Boolean) : []}
            />
          ))}
        </div>
      ) : (
        <Empty
          title={query ? "Nothing here just yet." : "A little room to grow."}
          description={
            query
              ? "Try a creator, a phrase, or a hashtag from the original save."
              : "Your saves will appear here when you add them."
          }
          action={
            <Link className="button quiet" to="/app">
              Back to my library
            </Link>
          }
        />
      )}
      {edit && c && (
        <CollectionDialog collection={c} onClose={() => setEdit(false)} />
      )}{" "}
      {bulk && (
        <BulkDialog
          selected={selected}
          source={id}
          onClose={() => {
            setBulk(false);
            setSelected([]);
          }}
        />
      )}
    </>
  );
}
function BulkDialog({
  selected,
  source,
  onClose,
}: {
  selected: string[];
  source?: string;
  onClose: () => void;
}) {
  const { library, change, busy } = useLibrary(),
    [to, setTo] = useState(""),
    [mode, setMode] = useState("copy"),
    [name, setName] = useState(""),
    [error, setError] = useState("");
  return (
    <Modal title="A place for these saves" onClose={onClose}>
      <label className="field">
        Collection
        <select value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">Choose a collection</option>
          {library.collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="new">Create a new collection</option>
        </select>
      </label>
      {to === "new" && (
        <label className="field">
          Name
          <input
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      )}
      {source && (
        <label className="field">
          Keep in this collection?
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="copy">Yes, also add to the new one</option>
            <option value="move">No, move these saves</option>
          </select>
        </label>
      )}
      <p>
        {selected.length} saves will be {mode === "move" ? "moved" : "added"}.{" "}
        {to === "new" ? "The other saves stay where they are." : ""}
      </p>
      <button
        className="button purple"
        disabled={busy || !to || (to === "new" && !name.trim())}
        onClick={async () => {
          try {
            const dest = to === "new" ? crypto.randomUUID() : to;
            const sourceIds = new Set([
              source,
              ...library.collections
                .filter((c) => c.parentId === source)
                .map((c) => c.id),
            ]);
            await change((l) => ({
              ...l,
              collections:
                to === "new"
                  ? [
                      ...l.collections.map((c) =>
                        mode === "move" && sourceIds.has(c.id)
                          ? { ...c, manual: true }
                          : c,
                      ),
                      {
                        id: dest,
                        name: name.trim(),
                        parentId: null,
                        manual: true,
                        style: l.collections.length % 4,
                      },
                    ]
                  : l.collections.map((c) =>
                      c.id === dest || (mode === "move" && sourceIds.has(c.id))
                        ? { ...c, manual: true }
                        : c,
                    ),
              items: l.items.map((x) =>
                selected.includes(x.id)
                  ? {
                      ...x,
                      collections: [
                        ...new Set([
                          ...x.collections.filter((c) =>
                            mode === "move" ? !sourceIds.has(c) : true,
                          ),
                          dest,
                        ]),
                      ],
                      primaryCollection:
                        mode === "move" &&
                        sourceIds.has(x.primaryCollection || "")
                          ? dest
                          : x.primaryCollection || dest,
                      excluded:
                        mode === "move" && source
                          ? [
                              ...new Set([
                                ...x.excluded,
                                ...Array.from(sourceIds).filter(
                                  (id): id is string => Boolean(id),
                                ),
                              ]),
                            ]
                          : x.excluded,
                    }
                  : x,
              ),
            }));
            onClose();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save.");
          }
        }}
      >
        Save changes
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
export function Detail() {
  const location = useLocation();
  const from =
    typeof location.state?.from === "string" ? location.state.from : "/app/saves";
  const { id } = useParams(),
    { library, change, busy } = useLibrary(),
    navigate = useNavigate(),
    item = library.items.find((x) => x.id === id),
    [note, setNote] = useState(item?.note || ""),
    [tags, setTags] = useState(item?.tags.join(", ") || ""),
    [remove, setRemove] = useState(false),
    [error, setError] = useState(""),
    [noteSaved, setNoteSaved] = useState(false);
  useEffect(() => {
    setNote(item?.note || "");
    setTags(item?.tags.join(", ") || "");
  }, [item?.id, item?.note]);
  if (!item)
    return (
      <Empty
        title="This save isn’t here."
        description="It may have been removed, or belong to another library."
        action={
          <Link to="/app" className="button quiet">
            Your library
          </Link>
        }
      />
    );
  const update = async (patch: Partial<Item>) => {
    try {
      await change((l) => ({
        ...l,
        items: l.items.map((x) => (x.id === item.id ? { ...x, ...patch } : x)),
      }));
      if (patch.note !== undefined) setNoteSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
  };
  return (
    <div className="detail-page">
      <Link className="back" to={from}>
        <ArrowLeft size={18} />{" "}
        {from.startsWith("/app/collection")
          ? "Back to collection"
          : from.startsWith("/app/search")
            ? "Back to search"
            : from === "/app"
              ? "Your library"
              : "All your saves"}
      </Link>
      <div className="detail-layout">
        <article className="detail-content">
          <div className="detail-meta">
            <span className="creator-dot">
              {item.creator[0]?.toUpperCase()}
            </span>
            <span>
              {item.creator === "Unknown creator"
                ? "Creator not included"
                : `@${item.creator.replace(/^@/, "")}`}
            </span>
            {item.creatorName && item.creatorName !== item.creator && (
              <span>{item.creatorName}</span>
            )}
            {item.creatorUrl && (
              <a
                href={item.creatorUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Creator website <ArrowUpRight size={14} />
              </a>
            )}
            <span>{item.url.includes("/reel/") ? "REEL" : "POST"}</span>
          </div>
          <h1>
            Something worth
            <br />
            <span>keeping.</span>
          </h1>
          {item.captions.length ? (
            item.captions.map((caption, i) => (
              <p className="full-caption" key={i}>
                {caption}
              </p>
            ))
          ) : (
            <p className="full-caption muted">
              There’s no caption in this export. Open the original, or leave
              yourself a note.
            </p>
          )}
          <div className="hashtags">
            {item.hashtags.map((tag, i) => (
              <Link key={i} to={`/app/search?q=${encodeURIComponent(tag)}`}>
                {tag.startsWith("#") ? tag : "#" + tag}
              </Link>
            ))}
          </div>
          <ReelPreview item={item} />
          <a
            className="button purple"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open on Instagram <ArrowUpRight size={18} />
          </a>
          <p className="privacy-note">
            The original may have changed or become unavailable since you saved
            it.
          </p>
        </article>
        <aside className="detail-aside">
          <div className="detail-actions">
            <button
              className={`circle ${item.favorite ? "favorited" : ""}`}
              aria-label={
                item.favorite ? "Remove from favorites" : "Add to favorites"
              }
              disabled={busy}
              onClick={() => void update({ favorite: !item.favorite })}
            >
              <Heart size={20} fill={item.favorite ? "currentColor" : "none"} />
            </button>
            <button
              className="circle"
              aria-label={
                item.archived ? "Restore from archive" : "Archive save"
              }
              disabled={busy}
              onClick={() => void update({ archived: !item.archived })}
            >
              <Archive size={20} />
            </button>
            <button
              className="circle"
              aria-label="Remove save"
              onClick={() => setRemove(true)}
            >
              <Trash2 size={19} />
            </button>
          </div>
          <h2>Make it yours.</h2>
          <label className="field">
            A note for later
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setNoteSaved(false);
              }}
              maxLength={10000}
              rows={5}
              placeholder="What caught your eye?"
            />
          </label>
          <label className="field">
            Your tags
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Ideas, weekend, someday…"
            />
          </label>
          <button
            className="button quiet"
            disabled={busy}
            onClick={() =>
              void update({
                note,
                tags: [
                  ...new Set(
                    tags
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  ),
                ],
              })
            }
          >
            {noteSaved ? "Note kept" : "Keep my note"}
          </button>
          <label className="field intent-field">
            What’s this for?
            <select
              value={item.intent || ""}
              disabled={busy}
              onChange={(e) =>
                void update({
                  intent: e.target.value
                    ? (e.target.value as Item["intent"])
                    : null,
                })
              }
            >
              <option value="">Just keeping it</option>
              {["Learn", "Try", "Buy", "Visit", "Enjoy"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <fieldset className="membership">
            <legend>In your collections</legend>
            {library.collections.length ? (
              library.collections.map((c) => (
                <label key={c.id}>
                  <input
                    type="checkbox"
                    checked={item.collections.includes(c.id)}
                    disabled={busy}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      void change((l) => ({
                        ...l,
                        collections: l.collections.map((x) =>
                          x.id === c.id ? { ...x, manual: true } : x,
                        ),
                        items: l.items.map((x) =>
                          x.id === item.id
                            ? {
                                ...x,
                                collections: checked
                                  ? [...new Set([...x.collections, c.id])]
                                  : x.collections.filter((id) => id !== c.id),
                                primaryCollection: checked
                                  ? x.primaryCollection || c.id
                                  : x.primaryCollection === c.id
                                    ? x.collections.find((id) => id !== c.id) ||
                                      null
                                    : x.primaryCollection,
                                excluded: checked
                                  ? x.excluded.filter((id) => id !== c.id)
                                  : [...new Set([...x.excluded, c.id])],
                              }
                            : x,
                        ),
                      })).catch((e) => setError(e.message));
                    }}
                  />
                  {c.name}
                </label>
              ))
            ) : (
              <p className="muted">Create a collection from your library.</p>
            )}
          </fieldset>
          {item.collections.length > 1 && (
            <label className="field">
              Main collection for this save
              <select
                value={item.primaryCollection || item.collections[0]}
                disabled={busy}
                onChange={(e) =>
                  void update({ primaryCollection: e.target.value })
                }
              >
                {item.collections.map((id) => (
                  <option key={id} value={id}>
                    {library.collections.find((c) => c.id === id)?.name ||
                      "Collection"}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="privacy-note">
            Export date:{" "}
            {item.timestamp
              ? new Date(item.timestamp * 1000).toLocaleDateString()
              : "Not provided"}
            <br />
            This may not be the original publication date.
          </p>
        </aside>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {remove && (
        <Modal title="Let this one go?" onClose={() => setRemove(false)}>
          <p>
            This save will be removed from your library and won’t return on your
            next import. You can undo the removal.
          </p>
          <button
            className="button danger"
            disabled={busy}
            onClick={async () => {
              await change((l) => ({
                ...l,
                items: l.items.filter((x) => x.id !== item.id),
                tombstones: [...new Set([...l.tombstones, item.id])],
              }));
              navigate("/app/saves");
            }}
          >
            Remove this save
          </button>
        </Modal>
      )}
    </div>
  );
}
export function Settings() {
  const {
      library,
      user,
      demo,
      change,
      undo,
      busy,
      signIn,
      signOut,
      dirty,
      conflict,
      retrySync,
      resolve,
      deleteAccount,
      deleteLibrary,
      exitDemo,
      setError,
      admission,
    } = useLibrary(),
    [remove, setRemove] = useState(""),
    [confirm, setConfirm] = useState("");
  const restore = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const canCreateOnlineLibrary = !user || admission === "open" || library.revision > 0;
  return (
    <>
      <div className="page-title">
        <p className="eyebrow">A LITTLE HOUSEKEEPING</p>
        <h1>
          Your space.
          <br />
          <span>Your say.</span>
        </h1>
      </div>
      <div className="settings-grid">
        <section>
          <h2>Your account</h2>
          <p>
            {demo
              ? "You’re exploring a sample library."
              : user
                ? `Signed in as ${user.email}`
                : "Your library is stored on this device. Export a backup before clearing your browser data."}
          </p>
          {demo ? (
            <button
              className="button quiet"
              onClick={() => {
                exitDemo();
                navigate("/");
              }}
            >
              Leave the sample library
            </button>
          ) : !user && cloud ? (
            <button className="button purple" onClick={() => void signIn()}>
              Continue with Google <ArrowUpRight size={17} />
            </button>
          ) : user ? (
            <button
              className="button quiet"
              disabled={busy || dirty}
              onClick={() =>
                void signOut()
                  .then(() => navigate("/"))
                  .catch((e) => setError(e.message))
              }
            >
              Sign out
            </button>
          ) : null}
          {dirty && !conflict && (
            <>
              <p>Your changes are waiting to sync.</p>
              <button
                className="button quiet"
                disabled={busy}
                onClick={() => void retrySync()}
              >
                Retry sync
              </button>
            </>
          )}
          {conflict && (
            <>
              <p>
                Your library changed on another device. Export your local
                version before choosing.
              </p>
              <div className="actions">
                <button
                  className="button quiet"
                  disabled={busy}
                  onClick={() => void resolve(true)}
                >
                  Keep this device’s version
                </button>
                <button
                  className="button quiet"
                  disabled={busy}
                  onClick={() => void resolve(false)}
                >
                  Use the online version
                </button>
              </div>
            </>
          )}
        </section>
        <section>
          <h2>Keep a copy</h2>
          <p>
            Export your saves, notes, tags, collections, and choices. Your
            original text comes with you.
          </p>
          <button
            className="button quiet"
            onClick={() =>
              download("crate-library.private.json", {
                ...library,
                exportedAt: new Date().toISOString(),
              })
            }
          >
            <Download size={17} /> Export my library
          </button>
          <button
            className="text-button restore-link"
            disabled={!canCreateOnlineLibrary}
            title={canCreateOnlineLibrary ? undefined : "New online libraries are not available right now"}
            onClick={() => restore.current?.click()}
          >
            Restore a Crate backup
          </button>
          <input
            hidden
            ref={restore}
            type="file"
            accept=".json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                if (file.size > 25 * 1024 * 1024)
                  throw Error("Choose a backup smaller than 25 MiB.");
                const backup = validateLibrary(JSON.parse(await file.text()));
                setConfirm("restore");
                (
                  restore.current as HTMLInputElement & { backup?: unknown }
                ).backup = backup;
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Could not restore this backup.",
                );
              }
            }}
          />
          {confirm === "restore" && (
            <Modal title="Restore this library?" onClose={() => setConfirm("")}>
              <p>
                This replaces the library on this device. Export your current
                library first if you want to keep it. Online accounts will sync
                the restored library.
              </p>
              <button
                className="button purple"
                disabled={busy}
                onClick={async () => {
                  try {
                    await change(() =>
                      validateLibrary(
                        (
                          restore.current as HTMLInputElement & {
                            backup?: unknown;
                          }
                        ).backup,
                      ),
                    );
                    setConfirm("");
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Restore failed.",
                    );
                  }
                }}
              >
                Restore library
              </button>
            </Modal>
          )}
        </section>
        <section>
          <h2>A step back</h2>
          <p>
            Undo the last edit. Up to ten earlier versions are kept on this
            device.
          </p>
          <button
            className="button quiet"
            disabled={busy}
            onClick={() => void undo().catch((e) => setError(e.message))}
          >
            Undo last change
          </button>
        </section>
        <section>
          <h2>Import history</h2>
          {library.imports.length ? (
            <ul className="import-list">
              {library.imports.map((x) => (
                <li key={x.id}>
                  <strong>{x.name}</strong>
                  <span>
                    {new Date(x.at).toLocaleDateString()} · {x.added} added ·{" "}
                    {x.updated} updated · {x.skipped} skipped
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No imports yet. A fresh start.</p>
          )}
        </section>
        <section className="danger-section">
          <h2>Let it go</h2>
          <p>
            Delete your library, or close your account. These are separate
            choices.
          </p>
          <div className="actions">
            <button
              className="button quiet"
              onClick={() => {
                setRemove("library");
                setConfirm("");
              }}
            >
              Delete library
            </button>
            <button
              className="button danger"
              onClick={() => {
                setRemove("account");
                setConfirm("");
              }}
            >
              {demo
                ? "Clear sample library"
                : user
                  ? "Delete account"
                  : "Clear this device"}
            </button>
          </div>
        </section>
        <section>
          <h2>About this little space</h2>
          <p>
            Free to use, with room for up to 5,000 saves. Smarter search runs on
            your device. No advertising or tracking cookies.
          </p>
          <Link className="text-button" to="/app/privacy">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link className="text-button" to="/app/terms">
            Terms
          </Link>
        </section>
      </div>
      {remove && (
        <Modal
          title={
            remove === "library" ? "Delete your library?" : "Close this space?"
          }
          onClose={() => setRemove("")}
        >
          <p>
            {remove === "library"
              ? "Your saves, notes, collections, and import history will be deleted. Your account will remain. Previously saved local undo history will also be cleared."
              : "Your account and private library will be deleted. This cannot be undone. Export your library first if you want a copy."}
          </p>
          <label className="field">
            Type DELETE to confirm
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <button
            className="button danger"
            disabled={confirm !== "DELETE" || busy}
            onClick={async () => {
              try {
                if (remove === "library") {
                  await deleteLibrary();
                } else await deleteAccount();
                setRemove("");
                navigate("/");
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Deletion could not finish. Please try again.",
                );
              }
            }}
          >
            Permanently delete
          </button>
        </Modal>
      )}
    </>
  );
}
export function Info({ type }: { type: "help" | "privacy" | "terms" }) {
  return (
    <article className="prose">
      <Link className="back" to="/app">
        <ArrowLeft size={17} /> Your library
      </Link>
      <h1>
        {type === "help"
          ? "A little help."
          : type === "privacy"
            ? "Yours, privately."
            : "A few ground rules."}
      </h1>
      {type === "help" ? (
        <>
          <h2>Bring your saves</h2>
          <p>
            Export your saved posts from Instagram Accounts Center as JSON.
            Unzip the download and choose saved/saved_posts.json. Crate
            currently reads the array-based format with label_values.
          </p>
          <h2>Find your way back</h2>
          <p>
            Search captions, hashtags, creators, notes, tags, and collection
            names. For related ideas, enable smarter search through Find
            connections in your library. Its first use downloads around 120 MB
            and runs locally.
          </p>
          <h2>A library that feels like yours</h2>
          <p>
            Create collections, move or copy selected saves, and use a new
            collection to split part of an existing one. Rename or merge
            collections from the collection menu. Your edits take priority over
            automatic suggestions.
          </p>
          <h2>If you leave</h2>
          <p>
            Imports become available immediately. Organization needs this
            browser to stay open. You can pause, close it, and resume later;
            finished work is cached on this device.
          </p>
          <h2>Keep a copy</h2>
          <p>
            Device-only libraries can be lost when browser data is cleared.
            Export from Settings. An online account synchronizes text and your
            edits, but smarter search is prepared separately on each device.
          </p>
        </>
      ) : type === "privacy" ? (
        <>
          <p>
            Crate does not require your Instagram password, retrieve private
            posts, or send your saves to an AI provider.
          </p>
          <p>
            Reel card previews load from Instagram as you browse. Opening a
            preview also loads the player from Instagram. Instagram may receive
            your IP address and use its own cookies. Crate does not download or
            store the video.
          </p>
          <h2>What is stored</h2>
          <p>
            Your original upload stays on your device. Crate reads the captions,
            creator names, hashtags, links, and dates in it. A device-only
            library stays in browser storage. An online account stores this
            normalized text, your notes, and organization privately in Firebase.
          </p>
          <h2>Smarter search</h2>
          <p>
            The search model downloads from Hugging Face, whose servers receive
            your IP address and requested model files. Your save text is
            processed locally and is not included in those requests.
          </p>
          <h2>Accounts</h2>
          <p>
            Google and Firebase process sign-in information. Private library
            access is enforced by account ownership policies. This is not
            end-to-end encrypted storage. Crate uses no advertising, session
            replay, or analytics trackers.
          </p>
          <h2>Deletion and backups</h2>
          <p>
            Settings lets you export, delete your library, or delete your
            account. Live account deletion removes cloud data and stops access;
            browser caches on this device are cleared. Another device may retain
            an offline copy until it next signs in or clears its data.
            Operator-held disaster recovery exports may retain deleted data for
            up to 30 days; deletion records must be applied before any restored
            database is made accessible.
          </p>
          <h2>Contact</h2>
          <p>
            Operated by {operatorName}. For privacy questions or deletion
            assistance, contact{" "}
            <a className="text-button" href={`mailto:${privacyEmail}`}>
              {privacyEmail}
            </a>
            .
          </p>
        </>
      ) : (
        <>
          <p>
            Crate is a private organizational tool for your own exported saves.
            It is not affiliated with Instagram or Meta.
          </p>
          <h2>Your content</h2>
          <p>
            Only import information you are entitled to use. Original posts
            belong to their creators. Crate stores references and export text;
            it does not grant rights to reproduce the original media.
          </p>
          <h2>A free service with limits</h2>
          <p>
            Online capacity is limited. Accounts support up to 5,000 saves and
            15 MiB of normalized source data. The free service may pause or
            become unavailable. Keep an exported backup of anything important.
          </p>
          <h2>Suggestions are suggestions</h2>
          <p>
            Organization and related search may be incomplete or inaccurate.
            Missing captions remain unclassified. You can edit any collection
            and add your own context.
          </p>
          <h2>Contact</h2>
          <p>
            Operated by {operatorName}. Questions?{" "}
            <a className="text-button" href={`mailto:${privacyEmail}`}>
              {privacyEmail}
            </a>
            .
          </p>
          <h2>No paid features</h2>
          <p>
            There is no billing, paid subscription, or automatic upgrade.
            Changes to that arrangement require a separate product decision.
          </p>
        </>
      )}
    </article>
  );
}
