import { useRef, useState } from "react";
import { Upload, Check, FileJson, ArrowRight } from "lucide-react";
import { Modal, download } from "./UI";
import { useLibrary } from "../lib/store";
import { type Preview, previewCounts, commitImport } from "../lib/import";
import { MAX_FILE_BYTES } from "../lib/model";
export function ImportDialog({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported?: () => void;
}) {
  const { library, change, busy } = useLibrary(),
    [preview, setPreview] = useState<Preview | null>(null),
    [name, setName] = useState(""),
    [reading, setReading] = useState(false),
    [error, setError] = useState(""),
    [consent, setConsent] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const read = async (file: File) => {
    setError("");
    if (file.size > MAX_FILE_BYTES) {
      setError("Choose a file smaller than 25 MiB.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Choose the saved_posts.json file from your export.");
      return;
    }
    setReading(true);
    setName(file.name);
    let worker: Worker | undefined;
    try {
      const text = await file.text();
      worker = new Worker(
        new URL("../workers/import.worker.ts", import.meta.url),
        { type: "module" },
      );
      const p = await new Promise<Preview>((resolve, reject) => {
        worker!.onmessage = (e) =>
          e.data.error ? reject(Error(e.data.error)) : resolve(e.data.preview);
        worker!.onerror = () =>
          reject(Error("This file could not be read. Please try again."));
        worker!.postMessage(text);
      });
      setPreview(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this file.");
    } finally {
      worker?.terminate();
      setReading(false);
    }
  };
  const counts = preview ? previewCounts(library, preview) : null;
  return (
    <Modal title="Make room for your saves" onClose={onClose}>
      <p className="muted">A few minutes now. A little less searching later.</p>
      {!preview ? (
        <>
          <div
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files[0]) void read(e.dataTransfer.files[0]);
            }}
          >
            <div className="file-icon">
              <FileJson size={32} />
            </div>
            <h3>
              {reading ? "Reading your saves…" : "Bring your saved_posts.json"}
            </h3>
            <p>
              Drop your file here, or choose it below.
              <br />
              JSON only · up to 25 MiB
            </p>
            <button
              className="button purple"
              disabled={reading}
              onClick={() => input.current?.click()}
            >
              <Upload size={17} /> Choose your file
            </button>
            <input
              ref={input}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                if (e.target.files?.[0]) void read(e.target.files[0]);
              }}
            />
          </div>
          <details className="instructions">
            <summary>Where do I find my export?</summary>
            <ol>
              <li>
                Open your Instagram profile → menu → Accounts Center.
              </li>
              <li>
                Choose Your information and permissions → Export your
                information → Create export.
              </li>
              <li>
                Select your Instagram profile → Export to device. Under
                customized information, select Saved or Saved items and
                collections.
              </li>
              <li>Choose All time and JSON, then start the export.</li>
              <li>
                Download and unzip the archive. Choose saved_posts.json inside
                the saved folder.
              </li>
            </ol>
            <p>
              Instagram may change these labels. Crate currently supports the
              array-based saved-post export.
            </p>
          </details>
        </>
      ) : (
        <>
          <div className="preview-file">
            <FileJson />
            <div>
              <strong>{name}</strong>
              <p>{preview.total.toLocaleString()} entries read</p>
            </div>
            <Check />
          </div>
          <div className="preview-counts">
            <div>
              <b>{counts?.added.toLocaleString()}</b>
              <span>new saves</span>
            </div>
            <div>
              <b>{counts?.updated.toLocaleString()}</b>
              <span>updated saves</span>
            </div>
            <div>
              <b>{counts?.unchanged.toLocaleString()}</b>
              <span>already here</span>
            </div>
          </div>
          {preview.issues.length > 0 && (
            <p className="warning">
              {preview.issues.length} entries could not be read.{" "}
              <button
                className="text-button"
                onClick={() =>
                  download("crate-import-issues.json", preview.issues)
                }
              >
                Download the issue report
              </button>
              . Valid saves can still be imported.
            </p>
          )}
          {counts!.removed > 0 && (
            <p>{counts!.removed} previously removed saves will stay removed.</p>
          )}
          <label className="check-label">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />{" "}
            I’m ready to add these saves
            {preview.issues.length
              ? " and skip the entries in the issue report"
              : ""}
            .
          </label>
          <div className="actions">
            <button className="button quiet" onClick={() => setPreview(null)}>
              Choose another file
            </button>
            <button
              className="button purple"
              disabled={!consent || busy}
              onClick={async () => {
                try {
                  await change((l) => commitImport(l, preview, name));
                  onClose();
                  onImported?.();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Import could not finish.",
                  );
                }
              }}
            >
              Add to my library <ArrowRight size={17} />
            </button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <p className="privacy-note">
        Your original file stays on this device. With an online account, the
        text in your saves is stored privately. Smarter search runs on your
        device.
      </p>
    </Modal>
  );
}
