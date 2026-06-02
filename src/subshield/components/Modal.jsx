import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

/**
 * Accessible modal with:
 *  - Close on ESC
 *  - Close on backdrop click (not content click)
 *  - Body scroll lock while open
 *  - Auto-focus on the close button
 */
export default function Modal({ title, subtitle, children, onClose, className = "" }) {
  const closeRef = useRef(null);
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;

      const focusables = modalRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables?.length) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    previousFocusRef.current = document.activeElement;

    // Move focus to the close button so keyboard users land here.
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus?.();
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
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
      onClick={onBackdropClick}
    >
      <section className={`ss-modal${className ? ` ${className}` : ""}`} ref={modalRef}>
        <button
          ref={closeRef}
          className="ss-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <h2 id={titleId}>{title}</h2>
        {subtitle && <p className="ss-muted" id={subtitleId}>{subtitle}</p>}
        {children}
      </section>
    </div>
  );
}
