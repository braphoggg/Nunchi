"use client";

interface HelpModalProps {
  onClose: () => void;
}

export default function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="absolute inset-0 z-50 bg-goshiwon-bg/95 backdrop-blur-sm flex flex-col animate-vocab-panel-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-goshiwon-border">
        <div>
          <h2 className="text-sm font-medium text-goshiwon-text">
            도움말 (Help)
          </h2>
          <p className="text-[10px] text-goshiwon-text-muted">
            How to use Nunchi
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close help"
          className="p-1.5 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors"
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome */}
        <section>
          <h3 className="text-xs font-medium text-goshiwon-yellow mb-2">
            Welcome to Room 203
          </h3>
          <p className="text-xs text-goshiwon-text-secondary leading-relaxed">
            You've moved into Eden Goshiwon. Your neighbor, Seo Moon-jo (서문조), is teaching you Korean.
            He's... invested in your progress.
          </p>
        </section>

        {/* XP System */}
        <section>
          <h3 className="text-xs font-medium text-goshiwon-yellow mb-2">
            Earning XP
          </h3>
          <ul className="text-xs text-goshiwon-text-secondary space-y-1">
            <li>• Send message in Korean: <span className="text-goshiwon-accent-light">5-15 XP</span></li>
            <li>• Save vocabulary words: <span className="text-goshiwon-accent-light">3 XP each</span></li>
            <li>• Complete flashcard session: <span className="text-goshiwon-accent-light">20 XP</span></li>
            <li>• Perfect flashcard session: <span className="text-goshiwon-accent-light">+10 XP bonus</span></li>
            <li>• Avoid translations (5 messages): <span className="text-goshiwon-accent-light">8 XP bonus</span></li>
          </ul>
        </section>

        {/* Ranks */}
        <section>
          <h3 className="text-xs font-medium text-goshiwon-yellow mb-2">
            Resident Ranks
          </h3>
          <p className="text-xs text-goshiwon-text-secondary leading-relaxed mb-2">
            Progress through 5 ranks based on XP <strong>and</strong> vocabulary count:
          </p>
          <ul className="text-xs text-goshiwon-text-secondary space-y-1">
            <li>• 새 입주자 (New Resident): 0 XP, 0 words</li>
            <li>• 조용한 세입자 (Quiet Tenant): 100 XP, 10 words</li>
            <li>• 단골 (Regular): 500 XP, 30 words</li>
            <li>• 믿을 만한 이웃 (Trusted Neighbor): 1500 XP, 75 words</li>
            <li>• 층 선배 (Floor Senior): 5000 XP, 150 words</li>
          </ul>
        </section>

        {/* Vocabulary */}
        <section>
          <h3 className="text-xs font-medium text-goshiwon-yellow mb-2">
            Saving Vocabulary
          </h3>
          <p className="text-xs text-goshiwon-text-secondary leading-relaxed">
            Moon-jo highlights Korean words in <span className="text-goshiwon-yellow">yellow</span> with romanization.
            Click the bookmark icon to save them to your collection (나의 단어장).
            Access your vocabulary panel anytime via the book icon in the top bar.
          </p>
        </section>

        {/* Flashcards */}
        <section>
          <h3 className="text-xs font-medium text-goshiwon-yellow mb-2">
            Studying Flashcards
          </h3>
          <p className="text-xs text-goshiwon-text-secondary leading-relaxed">
            Save 2+ words, then click "Study" in the vocabulary panel.
            Self-assess each card: "Know it" or "Still learning".
            Perfect sessions (all "Know it") earn bonus XP.
          </p>
        </section>

        {/* Daily Streak */}
        <section>
          <h3 className="text-xs font-medium text-goshiwon-yellow mb-2">
            Daily Streak
          </h3>
          <p className="text-xs text-goshiwon-text-secondary leading-relaxed">
            Send at least one message per day to maintain your streak.
            Streaks reset at midnight. Moon-jo notices when you don't visit...
          </p>
        </section>

        {/* Translation */}
        <section>
          <h3 className="text-xs font-medium text-goshiwon-yellow mb-2">
            Translation
          </h3>
          <p className="text-xs text-goshiwon-text-secondary leading-relaxed">
            Click the globe icon (🌐) below any message to translate Korean to English.
            When active, the icon turns yellow. Click again to see the original.
            Translations are cached for instant toggling.
          </p>
        </section>

        {/* Keyboard Shortcuts */}
        <section>
          <h3 className="text-xs font-medium text-goshiwon-yellow mb-2">
            Keyboard Shortcuts
          </h3>
          <ul className="text-xs text-goshiwon-text-secondary space-y-1">
            <li>• <kbd className="px-1 py-0.5 bg-goshiwon-surface rounded text-[10px]">Enter</kbd> — Send message</li>
            <li>• <kbd className="px-1 py-0.5 bg-goshiwon-surface rounded text-[10px]">Escape</kbd> — Close overlays (stats, vocab, flashcards)</li>
          </ul>
        </section>

        {/* Tips */}
        <section>
          <h3 className="text-xs font-medium text-goshiwon-yellow mb-2">
            Learning Tips
          </h3>
          <ul className="text-xs text-goshiwon-text-secondary space-y-1">
            <li>• Try writing in Korean — even basic phrases earn XP</li>
            <li>• Use flashcards regularly — repetition builds memory</li>
            <li>• Avoid over-translating — challenge yourself</li>
            <li>• Ask Moon-jo to explain things again if confused</li>
            <li>• Hover over Korean rank names to see English meanings</li>
          </ul>
        </section>

        {/* Warning */}
        <section className="border-t border-goshiwon-border pt-4">
          <p className="text-[10px] text-goshiwon-text-muted italic text-center">
            "You don't have to stay... but you want to, don't you?"
          </p>
          <p className="text-[10px] text-goshiwon-text-muted text-center mt-1">
            — Seo Moon-jo, Room 203
          </p>
        </section>
      </div>
    </div>
  );
}
