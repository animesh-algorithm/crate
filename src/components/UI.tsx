import { useEffect, useRef, useId, type ReactNode } from "react";
import { X, ArrowUpRight } from "lucide-react";
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previousFocus.current ??= document.activeElement as HTMLElement;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previousFocus.current?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal${wide ? " wide" : ""}${className ? ` ${className}` : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby={titleId}
    >
      <div className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <button className="circle" aria-label="Close" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-mark" aria-hidden="true">
        ✳
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Arrow() {
  return <ArrowUpRight size={20} strokeWidth={1.5} />;
}
export function download(name: string, value: unknown) {
  const blob = new Blob(
    [typeof value === "string" ? value : JSON.stringify(value, null, 2)],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
