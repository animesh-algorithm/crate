import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MoreHorizontal, Pencil, Search } from "lucide-react";
import { ReelPreview } from "./ReelPreview";
import { db, type ProposalDraft } from "../lib/db";
import { useLibrary } from "../lib/store";
import {
  customGroups,
  groupId,
  saveSuggestion,
  type Group,
} from "../lib/organize";
import { Semantic } from "../lib/semantic";
import { textFor, type Category } from "../lib/model";

export function OrganizePage() {
  const { library, owner, change, busy } = useLibrary();
  const { id: routeSuggestionId } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ProposalDraft | null>(null);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [count, setCount] = useState(0);
  const [download, setDownload] = useState("");
  const [grouping, setGrouping] = useState(false);
  const [error, setError] = useState("");
  const [opened, setOpened] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const customNameInput = useRef<HTMLInputElement | null>(null);
  const semantic = useRef<Semantic | null>(null);
  const stopGrouping = useRef<(() => void) | null>(null);
  const canceled = useRef(false);
  const alive = useRef(true);
  const loadGeneration = useRef(0);
  useEffect(() => {
    alive.current = true;
    const generation = ++loadGeneration.current;
    setDraft(null);
    void db.proposals.get(owner).then((value) => {
      if (alive.current && generation === loadGeneration.current) {
        setDraft(value || null);
        if (routeSuggestionId) setOpened(routeSuggestionId);
      }
    });
    return () => {
      ++loadGeneration.current;
      alive.current = false;
      canceled.current = true;
      semantic.current?.cancel();
      stopGrouping.current?.();
    };
  }, [owner, routeSuggestionId]);
  useEffect(
    () => setCategories(library.customCategories),
    [library.customCategories],
  );
  useEffect(() => {
    if (customOpen) customNameInput.current?.focus();
  }, [customOpen]);
  const groups = draft?.groups || [];
  const selected = groups.find((g) => groupId(g) === opened);
  const updateGroups = async (next: Group[]) => {
    if (!draft) return;
    const value = { ...draft, groups: next, at: Date.now() };
    await db.proposals.put(value);
    setDraft(value);
  };
  const propose = async (
    mode: ProposalDraft["mode"],
    result: Group[],
    sourceRevision = library.revision,
  ) => {
    const value = {
      owner,
      mode,
      sourceRevision,
      groups: result,
      at: Date.now(),
    };
    await db.proposals.put(value);
    if (alive.current) setDraft(value);
  };
  const run = async (smart: boolean) => {
    canceled.current = false;
    setPaused(false);
    setRunning(true);
    setError("");
    setCount(0);
    setDownload("");
    setGrouping(false);
    setOpened(null);
    try {
      let vectors: Map<string, number[]> | undefined;
      if (smart) {
        vectors = new Map();
        semantic.current = new Semantic((loaded, total) => {
          if (alive.current)
            setDownload(
              total
                ? `${Math.round((loaded / total) * 100)}% of the download ready`
                : "Preparing on this device…",
            );
        });
        for (const item of library.items) {
          if (canceled.current) throw Error("Paused. Your progress is saved.");
          if (textFor(item).trim())
            vectors.set(item.id, await semantic.current.passage(owner, item));
          setCount((n) => n + 1);
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
      if (canceled.current) throw Error("Paused. Your progress is saved.");
      setGrouping(true);
      semantic.current?.cancel();
      const worker = new Worker(
        new URL("../workers/organize.worker.ts", import.meta.url),
        { type: "module" },
      );
      try {
        const result = await new Promise<Group[]>((resolve, reject) => {
          stopGrouping.current = () => {
            worker.terminate();
            reject(Error("Paused. Your progress is saved."));
          };
          worker.onmessage = (e) =>
            e.data.error ? reject(Error(e.data.error)) : resolve(e.data.groups);
          worker.onerror = () =>
            reject(Error("Could not prepare suggestions right now."));
          worker.postMessage({
            items: library.items,
            vectors,
            suppressed: library.suppressed,
          });
        });
        if (!canceled.current) await propose(smart ? "smart" : "text", result);
      } finally {
        worker.terminate();
        stopGrouping.current = null;
      }
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error ? e.message : "Could not prepare suggestions.",
        );
    } finally {
      if (alive.current) setRunning(false);
    }
  };
  const pause = () => {
    canceled.current = true;
    setPaused(true);
    semantic.current?.cancel();
    stopGrouping.current?.();
  };
  const addCategory = () => {
    const trimmed = name.trim();
    if (
      !trimmed ||
      trimmed.length > 80 ||
      description.length > 500 ||
      categories.some(
        (c) => c.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
      )
    ) {
      setError(
        "Choose a unique category name (up to 80 characters) and a short description.",
      );
      return;
    }
    setCategories([
      ...categories,
      { name: trimmed, description: description.trim() },
    ]);
    setName("");
    setDescription("");
    setError("");
  };
  const startCustom = async () => {
    const pending = name.trim();
    if (
      pending &&
      (pending.length > 80 ||
        description.length > 500 ||
        categories.some(
          (c) => c.name.toLocaleLowerCase() === pending.toLocaleLowerCase(),
        ))
    ) {
      setError("Choose a unique category name and a short description.");
      return;
    }
    const chosen = pending
      ? [...categories, { name: pending, description: description.trim() }]
      : categories;
    if (!chosen.length) {
      setError("Enter a category name to get started.");
      return;
    }
    try {
      await change((l) => ({ ...l, customCategories: chosen }));
      await propose(
        "custom",
        customGroups(library.items, chosen),
        library.revision + 1,
      );
      setCategories(chosen);
      setName("");
      setDescription("");
      setCustomOpen(false);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not keep those categories.",
      );
    }
  };
  const save = async (group: Group) => {
    try {
      const current = await db.proposals.get(owner);
      if (!current?.groups.some((g) => groupId(g) === groupId(group)))
        throw Error("This proposal has changed. Start a new run.");
      const all = new Set(library.items.map((i) => i.id));
      if (group.ids.some((id) => !all.has(id)))
        throw Error("Some saves changed. Start a new run to review them.");
      await change((l) => saveSuggestion(l, group));
      await updateGroups(groups.filter((g) => groupId(g) !== groupId(group)));
      setOpened(null);
      if (routeSuggestionId) navigate("/app");
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save this collection.",
      );
    }
  };
  const editGroup = (patch: Partial<Group>) => {
    if (!selected) return;
    void updateGroups(
      groups.map((g) =>
        groupId(g) === opened ? { ...g, ...patch, id: groupId(g) } : g,
      ),
    );
  };
  const stale = !!draft && draft.sourceRevision !== library.revision;
  return (
    <div className="organize-page">
      <header className="organize-header">
        <Link to="/app" className="text-button">
          ← Your library
        </Link>
        <span className="eyebrow">A PLACE FOR WHAT YOU KEEP</span>
        <h1>
          Make room for
          <br />
          <em>your interests.</em>
        </h1>
        <p>
          Suggestions are yours to review, change, or leave for later. Anything
          without a clear home stays in Unsorted.
        </p>
      </header>
      {!library.items.length && (
        <p className="review-warning" role="status">
          There are no saves in this library to sort yet.{" "}
          <Link to="/app">Bring in your saves or try the sample library</Link>{" "}
          first, then come back to find matches for your categories.
        </p>
      )}
      {running ? (
        <section className="organizing" aria-label="Finding collections">
          <div className="paper-stack" aria-hidden="true">
            <span>
              Saved
              <br />
              <b>for you.</b>
            </span>
          </div>
          <h2>
            {grouping
              ? "Putting your suggestions together"
              : download
                ? "Getting ready to read your saves"
                : "Finding things that belong together"}
          </h2>
          <p aria-live="polite">
            {grouping
              ? "Looking for shared interests."
              : download ||
                `${count.toLocaleString()} of ${library.items.length.toLocaleString()} saves reviewed`}
          </p>
          {grouping ? (
            <progress aria-label="Putting suggestions together" />
          ) : (
            <progress
              aria-label="Saves reviewed"
              max={Math.max(1, library.items.length)}
              value={count}
            />
          )}
          <p className="muted">
            Keep this browser open while we work. Pause safely; completed work
            on this device is kept for a later run.
          </p>
          <button className="button quiet" onClick={pause}>
            Pause for now
          </button>
        </section>
      ) : customOpen ? null : selected ? (
        <section
          className="proposal-review"
          aria-label={`Review ${selected.name}`}
        >
          <Link className="text-button" to="/app/organize">
            ← All suggestions
          </Link>
          <div className="suggestion-review-title">
            <div><span className="eyebrow">SUGGESTED COLLECTION</span><h2>{selected.name}</h2><p>{selected.description || `${selected.ids.length} saves that may belong together.`}</p></div>
            <button className="circle" aria-label="Edit suggested collection" aria-expanded={editing} onClick={() => setEditing(!editing)}><Pencil size={19} /></button>
          </div>
          {editing && <div className="proposal-edit compact-edit">
            <label>
              Collection name
              <input
                value={selected.name}
                maxLength={80}
                onChange={(e) => editGroup({ name: e.target.value })}
              />
            </label>
            <label>
              Description (optional)
              <textarea
                value={selected.description || ""}
                maxLength={500}
                onChange={(e) => editGroup({ description: e.target.value })}
              />
            </label>
          </div>}
          <p>
            {selected.ids.length
              ? `${selected.ids.length} saves. Open the original text below to decide what belongs here.`
              : "No saves matched yet. Add a save below, or go back and start again with more descriptive words."}
          </p>
          {library.collections.some(
            (c) => c.id === groupId(selected) && !c.manual,
          ) && (
            <p className="review-warning">
              Saving will replace the older automatic membership in this
              collection. Your personal edits and exclusions stay.
            </p>
          )}
          {library.collections.some(
            (c) => c.id === groupId(selected) && c.manual,
          ) && (
            <p className="review-warning">
              A personally edited collection already has this identity. Give
              this suggestion a different name to save it separately; the edited
              collection stays untouched.
            </p>
          )}
          <form className="suggestion-search" role="search" onSubmit={(event) => event.preventDefault()}><Search size={19} /><label className="sr-only" htmlFor="suggestion-search">Search this suggested collection</label><input id="suggestion-search" value={suggestionQuery} onChange={(event) => setSuggestionQuery(event.target.value)} placeholder="Search this suggested collection" /></form>
          <div className="proposal-saves">
            {selected.ids
              .map((id) => library.items.find((i) => i.id === id))
              .filter((x) => !!x)
              .filter((item) => !suggestionQuery.trim() || textFor(item).toLocaleLowerCase().includes(suggestionQuery.trim().toLocaleLowerCase()))
              .map((item, index) => (
                <article
                  key={item.id}
                  className={`save-card tone-${index % 4}`}
                >
                  <span className="creator">
                    {item.creatorName ||
                      (item.creator === "Unknown creator"
                        ? "Creator not included"
                        : `@${item.creator.replace(/^@/, "")}`)}
                  </span>
                  <p>
                    {item.captions[0] || "No caption included in this export."}
                  </p>
                  <ReelPreview item={item} inline />
                  <details>
                    <summary>Read all saved text</summary>
                    {item.captions.map((caption, i) => (
                      <p key={i}>{caption}</p>
                    ))}
                    {item.note && <p>{item.note}</p>}
                    <p>{[...item.hashtags, ...item.tags].join(" · ")}</p>
                  </details>
                  <details className="suggestion-item-menu"><summary aria-label={`Edit ${item.creatorName || item.creator}`}><MoreHorizontal size={19} /></summary><button className="text-button" onClick={() => editGroup({ ids: selected.ids.filter((x) => x !== item.id) })}>Remove from suggestion</button></details>
                </article>
              ))}
          </div>
          <details className="proposal-add">
            <summary>Add a save to this suggestion</summary>
            <label>
              Choose a save
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value)
                    editGroup({ ids: [...selected.ids, e.target.value] });
                  e.target.value = "";
                }}
              >
                <option value="">Choose…</option>
                {library.items
                  .filter((i) => !selected.ids.includes(i.id))
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {(i.captions[0] || i.creator).slice(0, 100)}
                    </option>
                  ))}
              </select>
            </label>
          </details>
          {groups.length > 1 && (
            <details className="proposal-add">
              <summary>Merge into another suggestion</summary>
              <p>
                The other suggestion keeps its name and gains these saves. This
                suggestion will be dismissed.
              </p>
              <label>
                Destination
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const destination = e.target.value;
                    if (!destination) return;
                    void updateGroups(
                      groups
                        .filter((g) => groupId(g) !== opened)
                        .map((g) =>
                          groupId(g) === destination
                            ? {
                                ...g,
                                ids: [...new Set([...g.ids, ...selected.ids])],
                              }
                            : g,
                        ),
                    );
                    setOpened(destination);
                  }}
                >
                  <option value="">Choose…</option>
                  {groups
                    .filter((g) => groupId(g) !== opened)
                    .map((g) => (
                      <option key={groupId(g)} value={groupId(g)}>
                        {g.name}
                      </option>
                    ))}
                </select>
              </label>
            </details>
          )}
          <div className="actions">
            <button
              className="button purple"
              disabled={busy || !selected.name.trim() || !selected.ids.length}
              onClick={() => void save(selected)}
            >
              Save collection
            </button>
            <button
              className="button quiet"
              onClick={() => {
                void updateGroups(
                  groups.filter((g) => groupId(g) !== groupId(selected)),
                );
                setOpened(null);
              }}
            >
              Dismiss suggestion
            </button>
          </div>
        </section>
      ) : draft ? (
        <section aria-label="Suggested collections">
          <div className="section-heading">
            <div>
              <span className="eyebrow">READY WHEN YOU ARE</span>
              <h2>
                Your suggestions{" "}
                <span className="small-count">
                  {groups.length.toString().padStart(2, "0")}
                </span>
              </h2>
            </div>
          </div>
          {stale && (
            <p className="review-warning">
              Your library has changed since this proposal. Check each
              suggestion’s saves before saving, or start a fresh run.
            </p>
          )}
          <p className="muted">
            {groups.length
              ? "Open a collection to review its saves. Save one at a time; the rest can wait on this device."
              : "No supported collections yet. Unsorted saves remain in your library."}
          </p>
          <button className="button quiet" onClick={() => setCustomOpen(true)}>
            Use my own categories
          </button>
          <div className="suggestion-gallery">
            {groups.map((g) => (
              <article key={groupId(g)} className="suggestion-tile">
                <span className="eyebrow">{g.ids.length} SAVES</span>
                <h3>{g.name}</h3>
                <div className="suggestion-snippets">
                  {!g.ids.length && (
                    <p>
                      No clear matches yet. Open this suggestion to add saves
                      yourself.
                    </p>
                  )}
                  {g.ids
                    .slice(0, 3)
                    .map((id) => library.items.find((i) => i.id === id))
                    .filter((i) => !!i)
                    .map((i) => (
                      <p key={i.id}>
                        <span>{i.creatorName || i.creator}</span> ·{" "}
                        {(
                          i.captions[0] ||
                          i.note ||
                          i.hashtags.join(" ") ||
                          "No caption"
                        ).slice(0, 110)}
                      </p>
                    ))}
                </div>
                <Link className="button quiet" to={`/app/suggested/${encodeURIComponent(groupId(g))}`}>Review {g.name}</Link>
              </article>
            ))}
          </div>
          <div className="actions">
            <button
              className="button quiet"
              onClick={() => {
                setDraft(null);
                void db.proposals.delete(owner);
              }}
            >
              Start a new proposal
            </button>
          </div>
        </section>
      ) : (
        <section className="organize-start">
          <div>
            <span className="eyebrow">RECOMMENDED · ON YOUR DEVICE</span>
            <h2>Find my interests</h2>
            <p>
              Read captions, hashtags, and notes for meaningful themes. First
              use downloads around 120 MB. Nothing is sent to an AI service.
            </p>
            <button className="button purple" onClick={() => void run(true)}>
              {paused ? "Resume finding interests" : "Find my interests"}
            </button>
          </div>
          <div>
            <span className="eyebrow">SMALLER PROPOSAL</span>
            <h2>Use just the words</h2>
            <p>
              No model download. A conservative proposal from clear text
              matches; saves without enough evidence stay Unsorted.
            </p>
            <button className="button quiet" onClick={() => void run(false)}>
              Use just the words
            </button>
          </div>
          <button className="text-button" onClick={() => setCustomOpen(true)}>
            Choose my own categories →
          </button>
        </section>
      )}
      {customOpen && !running && (
        <section className="custom-categories" aria-label="Your categories">
          <button className="text-button" onClick={() => setCustomOpen(false)}>
            ← {draft ? "Back to suggestions" : "Back to choices"}
          </button>
          <h2>Your categories, your way</h2>
          <p>
            Only the categories you enter will be proposed. Add one or more
            names, with optional descriptions of what belongs. Words in those
            descriptions help find matches in your captions, tags, and notes.
            You can review every match before saving a collection.
          </p>
          {draft && (
            <p className="muted">
              Starting this run replaces your current draft, not collections you
              have already saved.
            </p>
          )}
          {categories.map((c, i) => (
            <div key={i} className="category-row">
              <span>
                <strong>{c.name}</strong> {c.description}
              </span>
              <button
                className="text-button"
                onClick={() =>
                  setCategories(categories.filter((_, n) => n !== i))
                }
              >
                Remove {c.name}
              </button>
            </div>
          ))}
          <div className="proposal-edit">
            <label>
              Category name
              <input
                ref={customNameInput}
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Description (optional)
              <textarea
                value={description}
                maxLength={500}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>
          <div className="actions">
            <button className="button quiet" onClick={addCategory}>
              Add category
            </button>
            <button
              className="button purple"
              disabled={busy || (!categories.length && !name.trim())}
              onClick={() => void startCustom()}
            >
              Find saves for these categories
            </button>
          </div>
        </section>
      )}
      <p className="privacy-note">
        Your proposal stays privately on this device across reloads. Processing
        pauses if the browser closes; it does not continue elsewhere.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
