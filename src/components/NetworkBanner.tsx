"use client";

interface NetworkBannerProps {
  isOnline: boolean;
  wasOffline: boolean;
  onDismiss: () => void;
}

/**
 * Banner shown at the top of the app when the user goes offline.
 * Briefly shows "Back online" when reconnected, then auto-dismisses.
 */
export default function NetworkBanner({ isOnline, wasOffline, onDismiss }: NetworkBannerProps) {
  if (isOnline && !wasOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium transition-colors shrink-0 ${
        isOnline
          ? "bg-emerald-600/20 text-emerald-400 border-b border-emerald-600/30"
          : "bg-amber-600/20 text-amber-400 border-b border-amber-600/30"
      }`}
    >
      {isOnline ? (
        <>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Back online
          <button
            onClick={onDismiss}
            className="ml-2 text-emerald-400/60 hover:text-emerald-400 transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0119 12.55" />
            <path d="M5 12.55a10.94 10.94 0 015.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0122.56 9" />
            <path d="M1.42 9a15.91 15.91 0 014.7-2.88" />
            <path d="M8.53 16.11a6 6 0 016.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          You&apos;re offline — vocabulary &amp; flashcards still work
        </>
      )}
    </div>
  );
}
