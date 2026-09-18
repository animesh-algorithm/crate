import { useLayoutEffect, useRef, useState } from "react";
import { Play, ArrowUpRight } from "lucide-react";
import { canonicalUrl, type Item } from "../lib/model";
import { Modal } from "./UI";

function FittedReelPlayer({ url, creator }: { url: string; creator: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const element = container.current!;
    const resize = () =>
      setScale(
        Math.min(element.clientWidth / 400, element.clientHeight / 800, 1),
      );
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="reel-preview-player" ref={container}>
      <iframe
        className="reel-preview-frame"
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
        src={`${url}embed/`}
        title={`Instagram reel by ${creator}`}
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        allow="fullscreen; encrypted-media"
        allowFullScreen
      />
    </div>
  );
}

export function ReelPreview({
  item,
  inline = false,
}: {
  item: Item;
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  let url: string;
  try {
    url = canonicalUrl(item.url).url;
  } catch {
    return null;
  }
  if (!url.includes("/reel/")) return null;
  return (
    <>
      {inline ? (
        <div className="reel-card-preview">
          <div className="reel-card-player" inert aria-hidden="true">
            <iframe
              src={`${url}embed/`}
              title={`Card preview of reel by ${item.creator}`}
              loading="lazy"
              tabIndex={-1}
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
          <button
            className="reel-card-open"
            aria-label="Preview reel"
            onClick={() => setOpen(true)}
          >
            <span>
              <Play size={18} /> Open preview
            </span>
          </button>
          <small className="reel-card-source">
            Preview from Instagram · availability may vary
          </small>
        </div>
      ) : (
        <button
          className="text-button reel-preview-button"
          onClick={() => setOpen(true)}
        >
          <Play size={16} /> Preview reel
        </button>
      )}
      {open && (
        <Modal
          title="Reel preview"
          className="reel-preview-modal"
          onClose={() => setOpen(false)}
        >
          <p className="muted">
            This preview loads from Instagram and needs an internet connection.
          </p>
          <FittedReelPlayer url={url} creator={item.creator} />
          <p className="muted">
            Preview unavailable? Open the reel on Instagram.
          </p>
          <a
            className="button purple"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open on Instagram <ArrowUpRight size={18} />
          </a>
        </Modal>
      )}
    </>
  );
}
