"use client";

interface OnboardingOverlayProps {
  onDismiss: () => void;
}

export default function OnboardingOverlay({ onDismiss }: OnboardingOverlayProps) {
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
          <p className="mt-1 text-xs text-goshiwon-text-secondary leading-relaxed">
            Seo Moon-jo will teach you Korean — his way.
            He speaks only Korean. You learn by doing.
          </p>
        </div>

        {/* Three key mechanics */}
        <ul className="flex flex-col gap-3">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-goshiwon-yellow text-base leading-none">🌐</span>
            <div>
              <p className="text-xs font-medium text-goshiwon-text">
                Tap the globe to translate
              </p>
              <p className="text-[11px] text-goshiwon-text-muted leading-relaxed">
                Moon-jo never explains in English. Use the translate button on his messages when you&rsquo;re stuck.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-goshiwon-yellow text-base leading-none">✦</span>
            <div>
              <p className="text-xs font-medium text-goshiwon-text">
                Write in Korean to earn XP
              </p>
              <p className="text-[11px] text-goshiwon-text-muted leading-relaxed">
                The more Korean you use, the warmer Moon-jo gets — and the more XP you earn.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-goshiwon-yellow text-base leading-none">📖</span>
            <div>
              <p className="text-xs font-medium text-goshiwon-text">
                Tap highlighted words to save them
              </p>
              <p className="text-[11px] text-goshiwon-text-muted leading-relaxed">
                Gold words in Moon-jo&rsquo;s messages are vocabulary. Tap any of them to add to your dictionary.
              </p>
            </div>
          </li>
        </ul>

        <p className="text-center text-[10px] text-goshiwon-text-muted italic">
          &ldquo;The hallway light flickers. He already knows you&rsquo;re here.&rdquo;
        </p>

        {/* CTA */}
        <button
          onClick={onDismiss}
          autoFocus
          className="w-full py-2.5 rounded-lg bg-goshiwon-accent hover:bg-goshiwon-accent-light transition-colors text-sm text-goshiwon-text font-medium"
        >
          Enter Room 203
        </button>
      </div>
    </div>
  );
}
