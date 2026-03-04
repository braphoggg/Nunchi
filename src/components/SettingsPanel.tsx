"use client";

import { useState, useRef, useCallback } from "react";
import type { AppSettings } from "@/hooks/useSettings";
import {
  createBackup,
  downloadBackup,
  readBackupFile,
  restoreBackup,
} from "@/lib/data-backup";

interface SettingsPanelProps {
  settings: AppSettings;
  onSetTheme: (theme: "dark" | "light") => void;
  onSetFontScale: (scale: number) => void;
  onSetReduceAnimations: (reduce: boolean) => void;
  onSetShowRomanization: (show: boolean) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  volume: number;
  onSetVolume: (volume: number) => void;
  onClose: () => void;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
        checked ? "bg-goshiwon-accent" : "bg-goshiwon-border"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-goshiwon-text transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

const FONT_SCALES = [
  { value: 1, label: "Normal" },
  { value: 1.15, label: "Large" },
  { value: 1.3, label: "X-Large" },
] as const;

function DataBackupSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleExport = useCallback(() => {
    const backup = createBackup();
    downloadBackup(backup);
  }, []);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await readBackupFile(file);
    if (!result.valid) {
      setImportStatus({ type: "error", message: result.error });
      return;
    }

    const count = restoreBackup(result.backup);
    setImportStatus({
      type: "success",
      message: `Restored ${count} data entries. Reloading...`,
    });

    // Reload after a brief delay so user sees the message
    setTimeout(() => window.location.reload(), 1200);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <section>
      <h3 className="text-xs font-medium text-goshiwon-text-secondary uppercase tracking-wider mb-3">
        데이터 (Data)
      </h3>
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-goshiwon-border bg-goshiwon-surface text-sm text-goshiwon-text-secondary hover:border-goshiwon-text-muted transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-goshiwon-border bg-goshiwon-surface text-sm text-goshiwon-text-secondary hover:border-goshiwon-text-muted transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            aria-label="Import backup file"
          />
        </div>
        <p className="text-[10px] text-goshiwon-text-muted">
          Export saves all progress, vocabulary, and settings as a JSON file.
        </p>
        {importStatus && (
          <p className={`text-xs ${
            importStatus.type === "success"
              ? "text-emerald-400"
              : "text-goshiwon-accent-light"
          }`}>
            {importStatus.message}
          </p>
        )}
      </div>
    </section>
  );
}

export default function SettingsPanel({
  settings,
  onSetTheme,
  onSetFontScale,
  onSetReduceAnimations,
  onSetShowRomanization,
  isMuted,
  onToggleMute,
  volume,
  onSetVolume,
  onClose,
}: SettingsPanelProps) {
  return (
    <div className="absolute inset-0 z-50 bg-goshiwon-bg/95 backdrop-blur-sm overflow-y-auto animate-vocab-panel-in">
      {/* Header */}
      <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-goshiwon-surface border-b border-goshiwon-border">
        <h2 className="text-sm font-medium text-goshiwon-text">
          설정 (Settings)
        </h2>
        <button
          onClick={onClose}
          aria-label="Close settings"
          className="text-goshiwon-text-muted hover:text-goshiwon-text transition-colors p-1"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-6">
        {/* Theme */}
        <section>
          <h3 className="text-xs font-medium text-goshiwon-text-secondary uppercase tracking-wider mb-3">
            테마 (Theme)
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => onSetTheme("dark")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                settings.theme === "dark"
                  ? "border-goshiwon-accent bg-goshiwon-accent/15 text-goshiwon-accent-light"
                  : "border-goshiwon-border bg-goshiwon-surface text-goshiwon-text-secondary hover:border-goshiwon-text-muted"
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
              Dark
            </button>
            <button
              onClick={() => onSetTheme("light")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                settings.theme === "light"
                  ? "border-goshiwon-accent bg-goshiwon-accent/15 text-goshiwon-accent-light"
                  : "border-goshiwon-border bg-goshiwon-surface text-goshiwon-text-secondary hover:border-goshiwon-text-muted"
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              Light
            </button>
          </div>
        </section>

        {/* Font Size */}
        <section>
          <h3 className="text-xs font-medium text-goshiwon-text-secondary uppercase tracking-wider mb-3">
            글자 크기 (Font Size)
          </h3>
          <div className="flex gap-2">
            {FONT_SCALES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => onSetFontScale(value)}
                className={`flex-1 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  settings.fontScale === value
                    ? "border-goshiwon-accent bg-goshiwon-accent/15 text-goshiwon-accent-light"
                    : "border-goshiwon-border bg-goshiwon-surface text-goshiwon-text-secondary hover:border-goshiwon-text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-goshiwon-text-muted" style={{ fontSize: `${14 * settings.fontScale}px` }}>
            가나다라 — Preview
          </p>
        </section>

        {/* Reduce Animations */}
        <section>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-goshiwon-text">Reduce animations</h3>
              <p className="text-xs text-goshiwon-text-muted mt-0.5">
                Fewer motion effects for sensitive users
              </p>
            </div>
            <Toggle
              checked={settings.reduceAnimations}
              onChange={onSetReduceAnimations}
              label="Reduce animations"
            />
          </div>
        </section>

        {/* Romanization */}
        <section>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-goshiwon-text">Show romanization</h3>
              <p className="text-xs text-goshiwon-text-muted mt-0.5">
                Hide to practice reading Hangul
              </p>
            </div>
            <Toggle
              checked={settings.showRomanization}
              onChange={onSetShowRomanization}
              label="Show romanization"
            />
          </div>
        </section>

        {/* Data Backup */}
        <DataBackupSection />

        {/* Sound */}
        <section>
          <h3 className="text-xs font-medium text-goshiwon-text-secondary uppercase tracking-wider mb-3">
            소리 (Sound)
          </h3>
          <div className="space-y-4">
            {/* Mute toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm text-goshiwon-text">Sound effects</h3>
                <p className="text-xs text-goshiwon-text-muted mt-0.5">
                  Ambient and interaction sounds
                </p>
              </div>
              <Toggle
                checked={!isMuted}
                onChange={() => onToggleMute()}
                label="Toggle sound"
              />
            </div>

            {/* Volume slider */}
            <div className={isMuted ? "opacity-40 pointer-events-none" : ""}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-goshiwon-text">Volume</span>
                <span className="text-xs text-goshiwon-text-muted tabular-nums">
                  {volume}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={volume}
                onChange={(e) => onSetVolume(Number(e.target.value))}
                aria-label="Volume"
                disabled={isMuted}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                  bg-goshiwon-border
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-goshiwon-accent-light
                  [&::-webkit-slider-thumb]:border-2
                  [&::-webkit-slider-thumb]:border-goshiwon-surface
                  [&::-webkit-slider-thumb]:shadow-sm
                  [&::-moz-range-thumb]:w-4
                  [&::-moz-range-thumb]:h-4
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-goshiwon-accent-light
                  [&::-moz-range-thumb]:border-2
                  [&::-moz-range-thumb]:border-goshiwon-surface
                  disabled:cursor-default"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
