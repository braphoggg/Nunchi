interface TopBarProps {
  onReset?: () => void;
  onToggleMute?: () => void;
  isMuted?: boolean;
}

export default function TopBar({ onReset, onToggleMute, isMuted }: TopBarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-goshiwon-border bg-goshiwon-surface/95 backdrop-blur-sm">
      {/* Avatar — silhouette */}
      <div
        className="w-10 h-10 rounded-full bg-goshiwon-bg flex items-center justify-center border border-goshiwon-accent/40 overflow-hidden"
        role="img"
        aria-label="Moon-jo avatar"
      >
        <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
          <circle cx="20" cy="16" r="7" fill="#4d4559" />
          <ellipse cx="20" cy="38" rx="13" ry="12" fill="#4d4559" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <h1 className="font-medium text-goshiwon-text text-sm leading-tight">
          서문조 (Seo Moon-jo)
        </h1>
        <p className="text-xs text-goshiwon-text-muted leading-tight">
          Room 203 · Eden Goshiwon
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Mute toggle */}
        {onToggleMute && (
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
            className="p-1.5 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors"
          >
            {isMuted ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
              </svg>
            )}
          </button>
        )}

        {/* Reset conversation */}
        {onReset && (
          <button
            onClick={onReset}
            aria-label="Leave Room 203"
            className="hidden sm:block text-[10px] text-goshiwon-text-muted hover:text-goshiwon-accent-light transition-colors uppercase tracking-wider"
          >
            Leave
          </button>
        )}

        {/* Online status */}
        <div className="flex items-center gap-1.5 ml-1">
          <span className="w-2 h-2 rounded-full bg-goshiwon-yellow animate-pulse-dot" />
          <span className="text-xs text-goshiwon-text-muted">Online</span>
        </div>
      </div>
    </div>
  );
}
