"use client";

import { useState, useCallback, useEffect, type FormEvent } from "react";
import { useAuth, isAuthAvailable } from "@/contexts/AuthContext";
import { isValidGeminiKey } from "@/hooks/useApiKey";

interface WelcomeWizardProps {
  /** Called when the wizard completes — starts the interactive tutorial */
  onComplete: () => void;
  /** Called when user skips or finishes — dismisses the wizard */
  onDismiss: () => void;
  /** Set the API key in app state */
  onSetApiKey: (key: string) => void;
  /** Whether an API key is already saved */
  hasApiKey: boolean;
}

type Step = "account" | "apikey" | "tour";

export default function WelcomeWizard({
  onComplete,
  onDismiss,
  onSetApiKey,
  hasApiKey,
}: WelcomeWizardProps) {
  const authAvailable = isAuthAvailable();
  // Skip account step if auth is not configured
  const [step, setStep] = useState<Step>(authAvailable ? "account" : "apikey");

  const goToApiKey = useCallback(() => setStep("apikey"), []);
  const goToTour = useCallback(() => setStep("tour"), []);

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center bg-goshiwon-bg/90 backdrop-blur-sm animate-message-in"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome setup"
    >
      {step === "account" && (
        <AccountStep onNext={goToApiKey} />
      )}
      {step === "apikey" && (
        <ApiKeyStep
          onNext={goToTour}
          onSetApiKey={onSetApiKey}
          hasApiKey={hasApiKey}
        />
      )}
      {step === "tour" && (
        <TourStep onStartTour={onComplete} onSkip={onDismiss} />
      )}
    </div>
  );
}

// ─── Step 1: Account ────────────────────────────────────────────────

function AccountStep({ onNext }: { onNext: () => void }) {
  const { signIn, signUp, isLoading } = useAuth();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError("");
      setSuccess("");
      setSubmitting(true);

      const result =
        mode === "signin"
          ? await signIn(email, password)
          : await signUp(email, password);

      setSubmitting(false);

      if (result.error) {
        setError(result.error);
      } else if (mode === "signup") {
        setSuccess("Account created! Check your email to confirm, then sign in.");
        setMode("signin");
      } else {
        // Sign in successful — advance
        onNext();
      }
    },
    [mode, email, password, signIn, signUp, onNext],
  );

  return (
    <div className="mx-4 max-w-sm w-full bg-goshiwon-surface border border-goshiwon-border rounded-xl shadow-2xl p-6 flex flex-col gap-4">
      {/* Step indicator */}
      <StepIndicator current={1} />

      <div className="text-center">
        <p className="text-xs text-goshiwon-text-muted uppercase tracking-widest mb-2">
          Room 203 · Eden Goshiwon
        </p>
        <h2 className="text-lg font-light text-goshiwon-text">
          {mode === "signup" ? "Create Your Account" : "Sign In"}
        </h2>
        <p className="mt-1.5 text-xs text-goshiwon-text-secondary leading-relaxed">
          {mode === "signup"
            ? "Save your progress and sync across devices."
            : "Welcome back. Sign in to continue."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          autoFocus
          autoComplete="email"
          className="w-full px-3 py-2.5 text-sm bg-goshiwon-bg border border-goshiwon-border rounded-lg text-goshiwon-text placeholder:text-goshiwon-text-muted focus:outline-none focus:border-goshiwon-yellow/50"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 6 characters)"
          required
          minLength={6}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className="w-full px-3 py-2.5 text-sm bg-goshiwon-bg border border-goshiwon-border rounded-lg text-goshiwon-text placeholder:text-goshiwon-text-muted focus:outline-none focus:border-goshiwon-yellow/50"
        />

        {error && <p className="text-xs text-red-400">{error}</p>}
        {success && <p className="text-xs text-green-400">{success}</p>}

        <button
          type="submit"
          disabled={submitting || isLoading}
          className="w-full py-2.5 text-sm font-medium text-goshiwon-bg bg-goshiwon-yellow rounded-lg hover:bg-goshiwon-yellow/90 transition-colors disabled:opacity-50"
        >
          {submitting ? "..." : mode === "signup" ? "Create Account" : "Sign In"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "signup" ? "signin" : "signup");
          setError("");
          setSuccess("");
        }}
        className="text-xs text-goshiwon-text-muted hover:text-goshiwon-text transition-colors"
      >
        {mode === "signup"
          ? "Already have an account? Sign in"
          : "Don't have an account? Sign up"}
      </button>

      <div className="border-t border-goshiwon-border pt-3">
        <button
          onClick={onNext}
          className="w-full py-2 text-xs text-goshiwon-text-muted hover:text-goshiwon-text transition-colors"
        >
          Skip for now — use offline only
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: API Key ────────────────────────────────────────────────

function ApiKeyStep({
  onNext,
  onSetApiKey,
  hasApiKey,
}: {
  onNext: () => void;
  onSetApiKey: (key: string) => void;
  hasApiKey: boolean;
}) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");

  // If key already saved (e.g. returning user), auto-advance via effect
  useEffect(() => {
    if (hasApiKey) onNext();
  }, [hasApiKey, onNext]);

  const handleSave = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (!isValidGeminiKey(trimmed)) {
      setError("Key should start with \"AIza\" followed by 20+ characters.");
      return;
    }
    setError("");
    onSetApiKey(trimmed);
    onNext();
  };

  return (
    <div className="mx-4 max-w-sm w-full bg-goshiwon-surface border border-goshiwon-border rounded-xl shadow-2xl p-6 flex flex-col gap-4">
      <StepIndicator current={2} />

      <div className="text-center">
        <h2 className="text-lg font-light text-goshiwon-text">
          Connect Your AI
        </h2>
        <p className="mt-1.5 text-xs text-goshiwon-text-secondary leading-relaxed">
          Moon-jo needs a Google Gemini API key to speak.
          You can get one free from{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-goshiwon-yellow hover:underline"
          >
            Google AI Studio
          </a>.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <input
          type="password"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="AIza..."
          autoFocus
          aria-label="Gemini API key"
          className="w-full px-3 py-2.5 text-sm bg-goshiwon-bg border border-goshiwon-border rounded-lg text-goshiwon-text placeholder:text-goshiwon-text-muted focus:outline-none focus:border-goshiwon-yellow/50 font-mono"
        />

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={handleSave}
          disabled={!inputValue.trim()}
          className="w-full py-2.5 text-sm font-medium text-goshiwon-bg bg-goshiwon-yellow rounded-lg hover:bg-goshiwon-yellow/90 transition-colors disabled:opacity-30"
        >
          Save Key
        </button>
      </div>

      <div className="border-t border-goshiwon-border pt-3">
        <button
          onClick={onNext}
          className="w-full py-2 text-xs text-goshiwon-text-muted hover:text-goshiwon-text transition-colors"
        >
          Skip — I&rsquo;ll add it later in Settings
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Tour ───────────────────────────────────────────────────

function TourStep({
  onStartTour,
  onSkip,
}: {
  onStartTour: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="mx-4 max-w-sm w-full bg-goshiwon-surface border border-goshiwon-border rounded-xl shadow-2xl p-6 flex flex-col gap-5">
      <StepIndicator current={3} />

      <div className="text-center">
        <p className="text-xs text-goshiwon-text-muted uppercase tracking-widest mb-2">
          Room 203 · Eden Goshiwon
        </p>
        <h2 className="text-lg font-light text-goshiwon-text">
          Your neighbor is waiting.
        </h2>
        <p className="mt-1.5 text-xs text-goshiwon-text-secondary leading-relaxed">
          Seo Moon-jo will teach you Korean — his way.
          He speaks only Korean. You learn by doing.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 py-2">
        <div className="flex gap-6 text-goshiwon-yellow/60">
          <span className="text-xl">🌐</span>
          <span className="text-xl">✦</span>
          <span className="text-xl">📖</span>
        </div>
        <p className="text-xs text-goshiwon-text-muted text-center leading-relaxed max-w-[260px]">
          Translate messages, earn XP by writing Korean, and save vocabulary words as you learn.
        </p>
      </div>

      <p className="text-center text-xs text-goshiwon-text-muted italic">
        &ldquo;The hallway light flickers. He already knows you&rsquo;re here.&rdquo;
      </p>

      <div className="flex flex-col gap-2">
        <button
          onClick={onStartTour}
          autoFocus
          className="w-full py-2.5 rounded-lg bg-goshiwon-accent hover:bg-goshiwon-accent-light transition-colors text-sm text-goshiwon-text font-medium"
        >
          Start Tour
        </button>
        <button
          onClick={onSkip}
          className="w-full py-2 rounded-lg text-xs text-goshiwon-text-muted hover:text-goshiwon-text transition-colors"
        >
          Skip, I&rsquo;ll explore
        </button>
      </div>
    </div>
  );
}

// ─── Step Indicator ─────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const steps = ["Account", "API Key", "Tour"];
  return (
    <div className="flex items-center justify-center gap-2 mb-1">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isDone = stepNum < current;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`w-6 h-px ${
                  isDone ? "bg-goshiwon-yellow/50" : "bg-goshiwon-border"
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                  isActive
                    ? "bg-goshiwon-yellow text-goshiwon-bg"
                    : isDone
                      ? "bg-goshiwon-yellow/30 text-goshiwon-yellow"
                      : "bg-goshiwon-border text-goshiwon-text-muted"
                }`}
              >
                {isDone ? "✓" : stepNum}
              </div>
              <span
                className={`text-[10px] leading-none ${
                  isActive
                    ? "text-goshiwon-text"
                    : "text-goshiwon-text-muted"
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
