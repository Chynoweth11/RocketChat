import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Accessible modal with:
 *  - Close on ESC
 *  - Close on backdrop click (not content click)
 *  - Body scroll lock while open
 *  - Auto-focus on the close button
 */
export default function Modal({ title, subtitle, children, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus to the close button so keyboard users land here.
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const onBackdropClick = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      className="ss-modal-bg"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onBackdropClick}
    >
      <section className="ss-modal">
        <button
          ref={closeRef}
          className="ss-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <h2>{title}</h2>
        {subtitle && <p className="ss-muted">{subtitle}</p>}
        {children}
      </section>
    </div>
  );
}
