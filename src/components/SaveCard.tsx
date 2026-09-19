import { ReelPreview } from "./ReelPreview";
import { Link, useLocation } from "react-router-dom";
import { Heart, ArrowUpRight, Check } from "lucide-react";
import { type Item } from "../lib/model";
export function SaveCard({
  item,
  index = 0,
  selected,
  onSelect,
}: {
  item: Item;
  index?: number;
  selected?: boolean;
  onSelect?: (id: string) => void;
}) {
  const caption = item.captions[0];
  const location = useLocation();
  const from = { from: location.pathname + location.search };
  return (
    <article
      className={`save-card tone-${index % 4} ${selected ? "selected" : ""}`}
    >
      <div className="save-top">
        <span className="creator">
          <span className="creator-dot">{item.creator[0]?.toUpperCase()}</span>
          {item.creator === "Unknown creator"
            ? "Creator not included"
            : `@${item.creator.replace(/^@/, "")}`}
          {item.creatorName && item.creatorName !== item.creator && (
            <small className="creator-name">{item.creatorName}</small>
          )}
        </span>
        {onSelect ? (
          <button
            className="select-save"
            aria-label={`Select save by ${item.creator}`}
            aria-pressed={selected || false}
            onClick={() => onSelect(item.id)}
          >
            {selected ? <Check size={15} /> : <span />}
          </button>
        ) : item.favorite ? (
          <Heart size={15} fill="currentColor" />
        ) : null}
      </div>
      <ReelPreview item={item} inline />
      <Link
        to={`/app/save/${encodeURIComponent(item.id)}`}
        state={from}
        className="save-content"
      >
        <p>
          {caption ||
            "A little mystery. Open this save on Instagram, or add a note to help you find it."}
        </p>
      </Link>
      <div className="save-bottom">
        <span>
          {item.hashtags
            .slice(0, 2)
            .map((t) => (t.startsWith("#") ? t : "#" + t))
            .join("  ") || "Saved for later"}
        </span>
        <Link
          to={`/app/save/${encodeURIComponent(item.id)}`}
          state={from}
          className="circle small"
          aria-label={`Read save by ${item.creator}`}
        >
          <ArrowUpRight size={18} />
        </Link>
      </div>
    </article>
  );
}
