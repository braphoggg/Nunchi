import { memo, useState, useRef, useEffect, useCallback } from "react";
import type { RankInfo } from "@/types";
import type { MoodLevel } from "@/lib/mood-engine";

const MOOD_CONFIG: Record<MoodLevel, { dot: string; label: string }> = {
  cold:     { dot: "bg-goshiwon-text-muted",              label: "Watching" },
  neutral:  { dot: "bg-goshiwon-yellow animate-pulse-dot", label: "Watching" },
  engaged:  { dot: "bg-amber-400 animate-pulse-dot",       label: "Interested" },
  warm:     { dot: "bg-orange-400 animate-pulse-dot",      label: "Attentive" },
  impressed:{ dot: "bg-yellow-300 animate-pulse-dot",      label: "Entranced" },
};

interface TopBarProps {
  onReset?: () => void;
  onToggleHistory?: () => void;
  onToggleSettings?: () => void;
  onToggleVocabulary?: () => void;
  onToggleHelp?: () => void;
  onToggleAuth?: () => void;
  onShare?: () => void;
  onShareText?: () => void;
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
      className={`relative flex flex-col items-center gap-0.5 px-1.5 py-1 min-h-[44px] min-w-[40px] text-goshiwon-text-muted hover:text-goshiwon-text transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default ${className}`}
    >
      {badge}
      {children}
      <span className="text-xs leading-none text-goshiwon-text-muted">
        {label}
      </span>
    </button>
  );
}

/** Dropdown menu item — full-width button with icon + label */
function MenuItem({
  onClick,
  label,
  disabled,
  className = "",
  children,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 w-full px-3 py-2.5 min-h-[44px] text-sm text-goshiwon-text-muted hover:text-goshiwon-text hover:bg-goshiwon-surface-hover transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default ${className}`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function TopBar({
  onReset,
  onToggleSettings,
  onToggleHistory,
  onToggleVocabulary,
  onToggleHelp,
  onToggleAuth,
  onShare,
  onShareText,
  shareDisabled,
  vocabularyCount,
  rank,
  mood = "neutral",
}: TopBarProps) {
  const moodCfg = MOOD_CONFIG[mood];
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
      setMoreOpen(false);
    }
  }, []);

  useEffect(() => {
    if (moreOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [moreOpen, handleClickOutside]);

  // Overflow items: History, Settings, Account, Leave on mobile
  const hasOverflowItems = !!(onToggleHistory || onToggleSettings || onToggleAuth || onReset);

  return (
    <div data-tutorial="topbar" className="relative z-50 flex items-center gap-2 px-4 py-3 border-b border-goshiwon-border bg-goshiwon-surface/95 backdrop-blur-sm">
      {/* Avatar — silhouette with mood dot overlay */}
      <div className="relative shrink-0" aria-label={`Moon-jo avatar — ${moodCfg.label}`}>
        <div
          className="w-10 h-10 rounded-full bg-goshiwon-bg flex items-center justify-center border border-goshiwon-accent/40 overflow-hidden"
          role="img"
          aria-hidden="true"
        >
          <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
            <circle cx="20" cy="16" r="7" fill="#4d4559" />
            <ellipse cx="20" cy="38" rx="13" ry="12" fill="#4d4559" />
          </svg>
        </div>
        {/* Mood status dot — bottom-right of avatar */}
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-goshiwon-surface ${moodCfg.dot}`}
          title={`Moon-jo is ${moodCfg.label.toLowerCase()}`}
          aria-hidden="true"
        />
      </div>

      <div className="flex-1 min-w-0">
        <h1 className="font-medium text-goshiwon-text text-sm leading-tight truncate font-serif-display">
          <span className="sm:hidden">서문조</span>
          <span className="hidden sm:inline">서문조 (Seo Moon-jo)</span>
        </h1>
      </div>

      <div data-tutorial="topbar-tools" className="flex items-center gap-0.5">
        {/* ── History — desktop only, overflow on mobile ── */}
        {onToggleHistory && (
          <div className="hidden sm:contents">
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
          </div>
        )}

        {/* Share conversation — image (always visible) */}
        {onShare && (
          <NavButton
            onClick={onShare}
            disabled={shareDisabled}
            title="Share conversation as image"
            ariaLabel="Share conversation as image"
            label="Image"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </NavButton>
        )}

        {/* Copy conversation — text (always visible) */}
        {onShareText && (
          <NavButton
            onClick={onShareText}
            title="Copy conversation as text"
            ariaLabel="Copy conversation as text"
            label="Copy"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </NavButton>
        )}

        {/* Vocabulary panel toggle (always visible) */}
        {onToggleVocabulary && (
          <span data-tutorial="vocab-button">
          <NavButton
            onClick={onToggleVocabulary}
            title="My Vocabulary"
            ariaLabel="Open vocabulary list"
            label="Words"
            badge={
              (vocabularyCount ?? 0) > 0 ? (
                <span className="absolute -top-0.5 right-0 w-3.5 h-3.5 bg-goshiwon-accent rounded-full flex items-center justify-center text-xs text-goshiwon-text font-medium z-10">
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
          </span>
        )}

        {/* Help button (always visible) */}
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

        {/* ── Settings — desktop only, overflow on mobile ── */}
        {onToggleSettings && (
          <div className="hidden sm:contents">
            <NavButton
              onClick={onToggleSettings}
              title="Settings"
              ariaLabel="Open settings"
              label="Settings"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </NavButton>
          </div>
        )}

        {/* ── Account — desktop only, overflow on mobile ── */}
        {onToggleAuth && (
          <div className="hidden sm:contents">
            <NavButton
              onClick={onToggleAuth}
              title="Account & Cloud Sync"
              ariaLabel="Open account settings"
              label="Account"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
              </svg>
            </NavButton>
          </div>
        )}

        {/* ── Leave — desktop only, overflow on mobile ── */}
        {onReset && (
          <div className="hidden sm:contents">
            <NavButton
              onClick={onReset}
              title="Leave Room 203"
              ariaLabel="Leave Room 203"
              label="Leave"
              className="hover:text-goshiwon-accent-light"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </NavButton>
          </div>
        )}

        {/* ── Mobile-only: "More" overflow menu ── */}
        {hasOverflowItems && (
          <div className="relative sm:hidden" ref={moreRef}>
            <NavButton
              onClick={() => setMoreOpen((v) => !v)}
              title="More options"
              ariaLabel="More options"
              label="More"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                <circle cx="12" cy="19" r="1.5" fill="currentColor" />
              </svg>
            </NavButton>

            {/* Dropdown — stretches right to cover stats bar text */}
            {moreOpen && (
              <div className="absolute top-full right-[-16px] mt-1 w-56 bg-goshiwon-surface border border-goshiwon-border rounded-lg shadow-2xl z-[60] py-1 animate-vocab-panel-in">
                {onToggleHistory && (
                  <MenuItem
                    onClick={() => { onToggleHistory(); setMoreOpen(false); }}
                    label="Lesson History"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </MenuItem>
                )}
                {onToggleSettings && (
                  <MenuItem
                    onClick={() => { onToggleSettings(); setMoreOpen(false); }}
                    label="Settings"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                    </svg>
                  </MenuItem>
                )}
                {onToggleAuth && (
                  <MenuItem
                    onClick={() => { onToggleAuth(); setMoreOpen(false); }}
                    label="Account"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
                    </svg>
                  </MenuItem>
                )}
                {onReset && (
                  <MenuItem
                    onClick={() => { onReset(); setMoreOpen(false); }}
                    label="Leave Room 203"
                    className="text-goshiwon-accent-light"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </MenuItem>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default memo(TopBar);
