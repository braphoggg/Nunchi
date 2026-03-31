"use client";

import { useState, useCallback, type FormEvent } from "react";
import { useAuth, isAuthAvailable } from "@/contexts/AuthContext";

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const { user, signIn, signUp, signOut, isLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

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
        onClose();
      }
    },
    [mode, email, password, signIn, signUp, onClose],
  );

  if (!isAuthAvailable()) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60">
        <div className="bg-goshiwon-surface border border-goshiwon-border rounded-xl p-6 max-w-sm w-full mx-4">
          <h2 className="text-sm font-medium text-goshiwon-text mb-2">
            Cloud Sync Not Available
          </h2>
          <p className="text-xs text-goshiwon-text-secondary mb-4">
            Cloud sync is not configured for this instance. Your data is saved
            locally in your browser.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-medium text-goshiwon-text bg-goshiwon-bg rounded-lg border border-goshiwon-border hover:bg-goshiwon-surface-hover transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Signed-in view
  if (user) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60">
        <div className="bg-goshiwon-surface border border-goshiwon-border rounded-xl p-6 max-w-sm w-full mx-4">
          <h2 className="text-sm font-medium text-goshiwon-text mb-1">
            Cloud Sync Active
          </h2>
          <p className="text-xs text-goshiwon-text-secondary mb-4">
            Signed in as {user.email}. Your data syncs across devices.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                signOut();
                onClose();
              }}
              className="flex-1 py-2 text-xs font-medium text-goshiwon-text-muted bg-goshiwon-bg rounded-lg border border-goshiwon-border hover:bg-goshiwon-surface-hover transition-colors"
            >
              Sign Out
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2 text-xs font-medium text-goshiwon-text bg-goshiwon-yellow/20 rounded-lg border border-goshiwon-yellow/30 hover:bg-goshiwon-yellow/30 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sign in / Sign up form
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60">
      <div className="bg-goshiwon-surface border border-goshiwon-border rounded-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-goshiwon-text">
            {mode === "signin" ? "Sign In" : "Create Account"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors"
            aria-label="Close"
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
        </div>

        <p className="text-xs text-goshiwon-text-secondary mb-4">
          {mode === "signin"
            ? "Sign in to sync your progress across devices."
            : "Create an account to save your progress to the cloud."}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            autoComplete="email"
            className="w-full px-3 py-2 text-xs bg-goshiwon-bg border border-goshiwon-border rounded-lg text-goshiwon-text placeholder:text-goshiwon-text-muted focus:outline-none focus:border-goshiwon-yellow/50"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            className="w-full px-3 py-2 text-xs bg-goshiwon-bg border border-goshiwon-border rounded-lg text-goshiwon-text placeholder:text-goshiwon-text-muted focus:outline-none focus:border-goshiwon-yellow/50"
          />

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
          {success && (
            <p className="text-xs text-green-400">{success}</p>
          )}

          <button
            type="submit"
            disabled={submitting || isLoading}
            className="w-full py-2.5 text-xs font-medium text-goshiwon-bg bg-goshiwon-yellow rounded-lg hover:bg-goshiwon-yellow/90 transition-colors disabled:opacity-50"
          >
            {submitting
              ? "..."
              : mode === "signin"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
            setSuccess("");
          }}
          className="w-full mt-3 text-xs text-goshiwon-text-muted hover:text-goshiwon-text transition-colors"
        >
          {mode === "signin"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
