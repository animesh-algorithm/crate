import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Modal } from "./UI";
import { useLibrary } from "../lib/store";
import {
  mergeCollections,
  withoutCollection,
  collectionItems,
  type Collection,
} from "../lib/model";
export function CollectionDialog({
  collection,
  onClose,
}: {
  collection?: Collection;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { library, change, busy } = useLibrary(),
    [name, setName] = useState(collection?.name || ""),
    [description, setDescription] = useState(collection?.description || ""),
    [parent, setParent] = useState(collection?.parentId || ""),
    [merge, setMerge] = useState(""),
    [error, setError] = useState("");
  const submit = async () => {
    try {
      if (!name.trim()) throw Error("Give your collection a name.");
      await change((l) => ({
        ...l,
        collections: collection
          ? l.collections.map((c) =>
              c.id === collection.id
                ? {
                    ...c,
                    name: name.trim(),
                    description: description.trim(),
                    parentId: parent || null,
                    manual: true,
                  }
                : c,
            )
          : [
              ...l.collections,
              {
                id: crypto.randomUUID(),
                name: name.trim(),
                description: description.trim(),
                parentId: parent || null,
                manual: true,
                style: l.collections.length % 4,
              },
            ],
      }));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
  };
  return (
    <Modal
      title={collection ? "Make it yours" : "A new collection"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="field">
          Collection name
          <input
            autoFocus
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="Give this corner a name"
            required
          />
        </label>
        <label className="field">
          Description (optional)
          <textarea
            value={description}
            maxLength={500}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="field">
          Inside a collection
          <select
            value={parent}
            onChange={(e) => setParent(e.target.value)}
            disabled={Boolean(
              collection &&
              library.collections.some((c) => c.parentId === collection.id),
            )}
          >
            <option value="">On its own</option>
            {library.collections
              .filter((c) => !c.parentId && c.id !== collection?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        <p className="muted">
          Your name and choices will stay yours when the library is organized
          again.
        </p>
        <button className="button purple" disabled={busy} type="submit">
          Save collection
        </button>
      </form>
      {collection && (
        <div className="danger-section">
          <h3>Bring collections together</h3>
          <label className="field">
            Add these saves to
            <select value={merge} onChange={(e) => setMerge(e.target.value)}>
              <option value="">Choose a collection</option>
              {library.collections
                .filter(
                  (c) => c.id !== collection.id && c.parentId !== collection.id,
                )
                .map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          {merge && (
            <p>
              {collectionItems(library, collection.id).length} saves will join{" "}
              {library.collections.find((c) => c.id === merge)?.name}. “
              {collection.name}” and its subcollections will be removed. The
              destination keeps its name.
            </p>
          )}
          <button
            className="button quiet"
            disabled={!merge || busy}
            onClick={async () => {
              try {
                await change((l) => mergeCollections(l, collection.id, merge));
                navigate(`/collection/${merge}`);
                onClose();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not merge.");
              }
            }}
          >
            Merge collections
          </button>
          <details>
            <summary>Delete this collection</summary>
            <p>
              The collection and its subcollections will disappear. All saves
              stay in your library.
            </p>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                await change((l) => withoutCollection(l, collection.id));
                navigate("/");
                onClose();
              }}
            >
              Delete collection
            </button>
          </details>
        </div>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </Modal>
  );
}
