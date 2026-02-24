import type { RankInfo } from "@/types";
import type { MoodLevel } from "@/lib/mood-engine";

const MOOD_CONFIG: Record<MoodLevel, { dot: string; label: string }> = {
  cold:     { dot: "bg-goshiwon-text-muted",              label: "Watching" },
  neutral:  { dot: "bg-goshiwon-yellow animate-pulse-dot", label: "Watching" },
  warm:     { dot: "bg-orange-400 animate-pulse-dot",      label: "Attentive" },
  impressed:{ dot: "bg-yellow-300 animate-pulse-dot",      label: "Entranced" },
};

interface TopBarProps {
  onReset?: () => void;
  onToggleMute?: () => void;
  isMuted?: boolean;
  onToggleHistory?: () => void;
  onToggleVocabulary?: () => void;
  onToggleHelp?: () => void;
  onShare?: () => void;
  shareDisabled?: boolean;
  vocabularyCount?: number;
  rank?: RankInfo;
  mood?: MoodLevel;
}

/** Tiny labelled icon button — shows label below icon on all screen sizes */
function NavButton({
  onClick,
  title,
  ariaLabel,
  label,
  children,
  disabled,
  className = "",
  badge,
}: {
  onClick: () => void;
  title: string;
  ariaLabel: string;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  badge?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={`relative flex flex-col items-center gap-0.5 px-1.5 py-1 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors disabled:opacity-30 disabled:cursor-default ${className}`}
    >
      {badge}
      {children}
      <span className="text-[8px] leading-none text-goshiwon-text-muted/70">
        {label}
      </span>
    </button>
  );
}

export default function TopBar({
  onReset,
  onToggleMute,
  isMuted,
  onToggleHistory,
  onToggleVocabulary,
  onToggleHelp,
  onShare,
  shareDisabled,
  vocabularyCount,
  rank,
  mood = "neutral",
}: TopBarProps) {
  const moodCfg = MOOD_CONFIG[mood];

  return (
    <div className="relative z-50 flex items-center gap-2 px-4 py-3 border-b border-goshiwon-border bg-goshiwon-surface/95 backdrop-blur-sm">
      {/* Avatar — silhouette */}
      <div
        className="w-10 h-10 rounded-full bg-goshiwon-bg flex items-center justify-center border border-goshiwon-accent/40 overflow-hidden shrink-0"
        role="img"
        aria-label="Moon-jo avatar"
      >
        <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
          <circle cx="20" cy="16" r="7" fill="#4d4559" />
          <ellipse cx="20" cy="38" rx="13" ry="12" fill="#4d4559" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <h1 className="font-medium text-goshiwon-text text-sm leading-tight truncate">
          서문조 (Seo Moon-jo)
        </h1>
        <p className="text-xs text-goshiwon-text-muted leading-tight truncate">
          Room 203{rank ? <span title={`${rank.english} — ${rank.description}`}> · {rank.korean}</span> : " · Eden Goshiwon"}
        </p>
      </div>

      <div className="flex items-center gap-0.5">
        {/* Lesson history */}
        {onToggleHistory && (
          <NavButton
            onClick={onToggleHistory}
            title="Lesson History"
            ariaLabel="Open lesson history"
            label="History"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </NavButton>
        )}

        {/* Share conversation */}
        {onShare && (
          <NavButton
            onClick={onShare}
            disabled={shareDisabled}
            title="Share conversation"
            ariaLabel="Share conversation as image"
            label="Share"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </NavButton>
        )}

        {/* Vocabulary panel toggle */}
        {onToggleVocabulary && (
          <NavButton
            onClick={onToggleVocabulary}
            title="My Vocabulary"
            ariaLabel="Open vocabulary list"
            label="Words"
            badge={
              (vocabularyCount ?? 0) > 0 ? (
                <span className="absolute -top-0.5 right-0 w-3.5 h-3.5 bg-goshiwon-accent rounded-full flex items-center justify-center text-[8px] text-goshiwon-text font-medium z-10">
                  {vocabularyCount! > 99 ? "99" : vocabularyCount}
                </span>
              ) : undefined
            }
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
          </NavButton>
        )}

        {/* Help button */}
        {onToggleHelp && (
          <NavButton
            onClick={onToggleHelp}
            title="Help"
            ariaLabel="Open help"
            label="Help"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </NavButton>
        )}

        {/* Mute toggle */}
        {onToggleMute && (
          <NavButton
            onClick={onToggleMute}
            title={isMuted ? "Unmute" : "Mute"}
            ariaLabel={isMuted ? "Unmute sounds" : "Mute sounds"}
            label={isMuted ? "Muted" : "Sound"}
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
          </NavButton>
        )}

        {/* Reset conversation */}
        {onReset && (
          <button
            onClick={onReset}
            aria-label="Leave Room 203"
            className="hidden sm:block text-[10px] text-goshiwon-text-muted hover:text-goshiwon-accent-light transition-colors uppercase tracking-wider ml-1"
          >
            Leave
          </button>
        )}

        {/* Mood / status indicator */}
        <div className="flex flex-col items-center gap-0.5 ml-1.5" aria-label={`Moon-jo is ${moodCfg.label.toLowerCase()}`}>
          <span className={`w-2 h-2 rounded-full ${moodCfg.dot}`} />
          <span className="text-[8px] leading-none text-goshiwon-text-muted/70">{moodCfg.label}</span>
        </div>
      </div>
    </div>
  );
}
