"use client";

interface OnboardingOverlayProps {
  onStartTour: () => void;
  onSkip: () => void;
}

export default function OnboardingOverlay({ onStartTour, onSkip }: OnboardingOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center bg-goshiwon-bg/90 backdrop-blur-sm animate-message-in"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Room 203"
    >
      <div className="mx-4 max-w-sm w-full bg-goshiwon-surface border border-goshiwon-border rounded-xl shadow-2xl p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="text-center">
          <p className="text-[10px] text-goshiwon-text-muted uppercase tracking-widest mb-2">
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

        {/* Atmospheric hint */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex gap-6 text-goshiwon-yellow/60">
            <span className="text-xl">🌐</span>
            <span className="text-xl">✦</span>
            <span className="text-xl">📖</span>
          </div>
          <p className="text-[11px] text-goshiwon-text-muted text-center leading-relaxed max-w-[260px]">
            Translate messages, earn XP by writing Korean, and save vocabulary words as you learn.
          </p>
        </div>

        <p className="text-center text-[10px] text-goshiwon-text-muted italic">
          &ldquo;The hallway light flickers. He already knows you&rsquo;re here.&rdquo;
        </p>

        {/* CTAs */}
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
    </div>
  );
}
