"use client";

import { useState, useRef, useCallback } from "react";
import Modal from "./Modal";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useSound } from "@/contexts/SoundContext";
import {
  createBackup,
  downloadBackup,
  readBackupFile,
  restoreBackup,
} from "@/lib/data-backup";

interface SettingsPanelProps {
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
      className="relative min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
    >
      <span className={`relative w-10 h-5 rounded-full transition-colors ${
        checked ? "bg-goshiwon-accent" : "bg-goshiwon-border"
      }`}>
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-goshiwon-text transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </span>
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
        {"데이터 (Data)"}
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
        <p className="text-xs text-goshiwon-text-muted">
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

function ApiKeySection() {
  const { apiKey, setApiKey, clearApiKey } = useSettingsContext();
  const [inputValue, setInputValue] = useState("");
  const [showKey, setShowKey] = useState(false);

  const masked = apiKey
    ? apiKey.slice(0, 4) + "..." + apiKey.slice(-4)
    : null;

  const handleSave = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      setApiKey(trimmed);
      setInputValue("");
      setShowKey(false);
    }
  };

  return (
    <section>
      <h3 className="text-xs font-medium text-goshiwon-text-secondary uppercase tracking-wider mb-3">
        {"API 키 (API Key)"}
      </h3>
      <div className="space-y-3">
        {apiKey ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2.5 rounded-lg border border-goshiwon-border bg-goshiwon-surface text-sm text-goshiwon-text-secondary font-mono truncate">
              {showKey ? apiKey : masked}
            </div>
            <button
              onClick={() => setShowKey((s) => !s)}
              className="px-3 py-2.5 rounded-lg border border-goshiwon-border bg-goshiwon-surface text-sm text-goshiwon-text-secondary hover:border-goshiwon-text-muted transition-colors"
              aria-label={showKey ? "Hide API key" : "Show API key"}
            >
              {showKey ? "Hide" : "Show"}
            </button>
            <button
              onClick={clearApiKey}
              className="px-3 py-2.5 rounded-lg border border-goshiwon-accent/40 bg-goshiwon-accent/10 text-sm text-goshiwon-accent-light hover:bg-goshiwon-accent/20 transition-colors"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="AIza..."
              aria-label="Gemini API key"
              className="flex-1 px-3 py-2.5 rounded-lg border border-goshiwon-border bg-goshiwon-input text-sm text-goshiwon-text placeholder:text-goshiwon-text-muted focus:outline-none focus:ring-1 focus:ring-goshiwon-accent/50 focus:border-goshiwon-accent/50 transition-colors"
            />
            <button
              onClick={handleSave}
              disabled={!inputValue.trim()}
              className="px-4 py-2.5 rounded-lg bg-goshiwon-yellow/15 text-sm font-medium text-[#d4a843] border border-goshiwon-yellow/30 hover:bg-goshiwon-yellow/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        )}
        <p className="text-xs text-goshiwon-text-muted">
          Get a free key from{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-goshiwon-yellow/80 hover:text-goshiwon-yellow underline underline-offset-2"
          >
            Google AI Studio
          </a>
          . Your key is stored locally and sent directly to Google. Never stored on our servers.
        </p>
      </div>
    </section>
  );
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, setTheme: onSetTheme, setFontScale: onSetFontScale, setReduceAnimations: onSetReduceAnimations, setShowRomanization: onSetShowRomanization, setTTSRate: onSetTTSRate } = useSettingsContext();
  const { muted: isMuted, toggleMute: onToggleMute, volume, setVolume: onSetVolume } = useSound();

  return (
    <Modal onClose={onClose} title={"\uC124\uC815 (Settings)"} stickyHeader closeAriaLabel="Close settings">
      {/* Body */}
      <div className="p-4 space-y-6">
        {/* API Key */}
        <ApiKeySection />

        {/* Theme */}
        <section>
          <h3 className="text-xs font-medium text-goshiwon-text-secondary uppercase tracking-wider mb-3">
            {"\uD14C\uB9C8 (Theme)"}
          </h3>
          <div className="flex gap-2">
            {([
              { value: "dark" as const, label: "Dark", icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg> },
              { value: "light" as const, label: "Light", icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg> },
              { value: "system" as const, label: "System", icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg> },
            ]).map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => onSetTheme(value)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  settings.theme === value
                    ? "border-goshiwon-accent bg-goshiwon-accent/15 text-goshiwon-accent-light"
                    : "border-goshiwon-border bg-goshiwon-surface text-goshiwon-text-secondary hover:border-goshiwon-text-muted"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Font Size */}
        <section>
          <h3 className="text-xs font-medium text-goshiwon-text-secondary uppercase tracking-wider mb-3">
            {"\uAE00\uC790 \uD06C\uAE30 (Font Size)"}
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
            {"\uAC00\uB098\uB2E4\uB77C \u2014 Preview"}
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

        {/* TTS Speech Speed */}
        <section>
          <h3 className="text-xs font-medium text-goshiwon-text-secondary uppercase tracking-wider mb-3">
            {"\uBC1C\uC74C \uC18D\uB3C4 (Speech Speed)"}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-goshiwon-text">TTS playback rate</span>
              <span className="text-xs text-goshiwon-text-muted tabular-nums font-mono">
                {(settings.ttsRate ?? 0.85).toFixed(2)}x
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-goshiwon-text-muted shrink-0">Slow</span>
              <input
                type="range"
                min={50}
                max={150}
                step={5}
                value={Math.round((settings.ttsRate ?? 0.85) * 100)}
                onChange={(e) => onSetTTSRate(Number(e.target.value) / 100)}
                aria-label="Speech speed"
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer
                  bg-goshiwon-border
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-6
                  [&::-webkit-slider-thumb]:h-6
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-goshiwon-accent-light
                  [&::-webkit-slider-thumb]:border-2
                  [&::-webkit-slider-thumb]:border-goshiwon-surface
                  [&::-webkit-slider-thumb]:shadow-sm
                  [&::-moz-range-thumb]:w-6
                  [&::-moz-range-thumb]:h-6
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-goshiwon-accent-light
                  [&::-moz-range-thumb]:border-2
                  [&::-moz-range-thumb]:border-goshiwon-surface"
              />
              <span className="text-xs text-goshiwon-text-muted shrink-0">Fast</span>
            </div>
            <p className="text-xs text-goshiwon-text-muted">
              Controls Korean text-to-speech speed for messages and vocabulary.
            </p>
          </div>
        </section>

        {/* Sound */}
        <section>
          <h3 className="text-xs font-medium text-goshiwon-text-secondary uppercase tracking-wider mb-3">
            {"\uC18C\uB9AC (Sound)"}
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
                className="w-full h-2 rounded-full appearance-none cursor-pointer
                  bg-goshiwon-border
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-6
                  [&::-webkit-slider-thumb]:h-6
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-goshiwon-accent-light
                  [&::-webkit-slider-thumb]:border-2
                  [&::-webkit-slider-thumb]:border-goshiwon-surface
                  [&::-webkit-slider-thumb]:shadow-sm
                  [&::-moz-range-thumb]:w-6
                  [&::-moz-range-thumb]:h-6
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
    </Modal>
  );
}
