"use client";

// Modal component — shared across all panel overlays
import { useEffect, useRef, useCallback, type ReactNode } from "react";

export interface ModalProps {
  onClose: () => void;
  title: string;
  subtitle?: string;
  zIndex?: number;
  stickyHeader?: boolean;
  headerContent?: ReactNode;
  backButton?: boolean;
  closeAriaLabel?: string;
  customHeader?: ReactNode;
  children: ReactNode;
}

/** Query all focusable elements within a container. */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

export default function Modal({
  onClose,
  title,
  subtitle,
  zIndex = 50,
  stickyHeader = false,
  headerContent,
  backButton = false,
  closeAriaLabel = "Close",
  customHeader,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);

  // Focus management: save previous focus, restore on unmount
  useEffect(() => {
    previouslyFocused.current = document.activeElement;

    // Focus the first focusable element inside the dialog
    const dialog = dialogRef.current;
    if (dialog) {
      const focusable = getFocusableElements(dialog);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        // Fallback: focus the dialog itself
        dialog.focus();
      }
    }

    return () => {
      // Restore focus to the element that had it before the modal opened
      const prev = previouslyFocused.current;
      if (prev && prev instanceof HTMLElement) {
        prev.focus();
      }
    };
  }, []);

  // Escape key handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus trapping
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = getFocusableElements(dialog);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: wrap from first to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: wrap from last to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    []
  );

  const headerClasses = stickyHeader
    ? "sticky top-0 flex items-center justify-between gap-2 px-4 py-3 bg-goshiwon-surface border-b border-goshiwon-border z-10 overflow-hidden"
    : "flex items-center justify-between gap-2 px-4 py-3 border-b border-goshiwon-border overflow-hidden";

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      style={{ zIndex }}
      onKeyDown={handleKeyDown}
      className="absolute inset-0 bg-goshiwon-bg/95 backdrop-blur-sm flex flex-col animate-vocab-panel-in"
    >
      {/* Header */}
      {customHeader !== undefined ? (
        customHeader
      ) : (
        <div className={headerClasses}>
          {backButton && (
            <button
              onClick={onClose}
              aria-label={closeAriaLabel}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-goshiwon-text-muted hover:text-goshiwon-text transition-colors"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-medium text-goshiwon-text">{title}</h2>
            {subtitle && (
              <p className="text-xs text-goshiwon-text-muted">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end min-w-0 shrink">
            {headerContent}
            {!backButton && (
              <button
                onClick={onClose}
                aria-label={closeAriaLabel}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-goshiwon-text-muted hover:text-goshiwon-text transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
