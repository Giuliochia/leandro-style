import { useEffect, useRef } from "react";
export default function Dialog({ children, onClose, title, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      className={`ls-dialog ${wide ? "ls-dialog-wide" : ""}`}
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ls-dialog-heading">
        <span className="ls-eyebrow">LEANDRO STYLE / {title}</span>
        <button aria-label="Chiudi pannello" onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
