"use client";

import { useState } from "react";
import Modal from "./Modal";

const TABS = [
  { id: "intro", label: "소개", labelEn: "Intro" },
  { id: "progress", label: "성장", labelEn: "Progress" },
  { id: "chat", label: "대화", labelEn: "Chat" },
  { id: "words", label: "단어", labelEn: "Words" },
  { id: "tools", label: "도구", labelEn: "Tools" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface HelpModalProps {
  onClose: () => void;
  onReplayTutorial?: () => void;
}

export default function HelpModal({ onClose, onReplayTutorial }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("intro");

  return (
    <Modal onClose={onClose} title="도움말 (Help)" subtitle="How to use Nunchi" closeAriaLabel="Close help">
      {/* Tab bar */}
      <div className="sticky top-0 z-10 bg-goshiwon-bg flex gap-1 px-3 py-2 border-b border-goshiwon-border overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs transition-colors ${
              activeTab === tab.id
                ? "bg-goshiwon-accent/20 text-goshiwon-accent-light border border-goshiwon-accent/40"
                : "text-goshiwon-text-muted hover:text-goshiwon-text border border-transparent"
            }`}
          >
            {tab.label}
            <span className="ml-1 text-xs opacity-60">{tab.labelEn}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {activeTab === "intro" && <IntroTab />}
        {activeTab === "progress" && <ProgressTab />}
        {activeTab === "chat" && <ChatTab />}
        {activeTab === "words" && <WordsTab />}
        {activeTab === "tools" && <ToolsTab />}

        {/* Replay tutorial */}
        {onReplayTutorial && (
          <section className="border-t border-goshiwon-border pt-4">
            <button
              onClick={onReplayTutorial}
              className="w-full py-2.5 rounded-lg bg-goshiwon-surface border border-goshiwon-border hover:border-goshiwon-yellow/40 transition-colors text-xs text-goshiwon-text-secondary hover:text-goshiwon-text"
            >
              ↻ Replay Interactive Tutorial
            </button>
          </section>
        )}

        {/* Footer */}
        <section className="border-t border-goshiwon-border pt-4">
          <p className="text-xs text-goshiwon-text-muted italic text-center">
            &ldquo;You don&rsquo;t have to stay... but you want to, don&rsquo;t you?&rdquo;
          </p>
          <p className="text-xs text-goshiwon-text-muted text-center mt-1">
            — Seo Moon-jo, Room 203
          </p>
        </section>
      </div>
    </Modal>
  );
}

/* ==================== Tab content components ==================== */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium text-goshiwon-yellow mb-2">
      {children}
    </h3>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-goshiwon-text-secondary leading-relaxed">
      {children}
    </p>
  );
}

/* ---------- INTRO ---------- */
function IntroTab() {
  return (
    <>
      <section>
        <SectionTitle>Welcome to Room 203</SectionTitle>
        <Body>
          You&rsquo;ve moved into Eden Goshiwon. Your neighbor, Seo Moon-jo (서문조), is teaching you Korean.
          He speaks only Korean — you learn by doing. He&rsquo;s... invested in your progress.
        </Body>
      </section>

      <section>
        <SectionTitle>Moon-jo&rsquo;s Mood</SectionTitle>
        <Body>
          The colored dot next to Moon-jo&rsquo;s name reflects how he feels about your Korean effort:
        </Body>
        <ul className="mt-2 text-xs text-goshiwon-text-secondary space-y-1.5">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-goshiwon-text-muted shrink-0" />
            <span><strong className="text-goshiwon-text">Cold</strong> — No Korean used yet</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-goshiwon-yellow shrink-0" />
            <span><strong className="text-goshiwon-text">Watching</strong> — Neutral, waiting for effort</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
            <span><strong className="text-goshiwon-text">Attentive</strong> — Good Korean usage</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-300 shrink-0" />
            <span><strong className="text-goshiwon-text">Entranced</strong> — Mostly Korean conversation</span>
          </li>
        </ul>
      </section>

      <section>
        <SectionTitle>Night Progression</SectionTitle>
        <Body>
          As your conversation grows longer, the room gradually darkens.
          The UI subtly shifts to deeper tones — Moon-jo&rsquo;s goshiwon grows quieter, dimmer, more intimate.
        </Body>
      </section>

      <section>
        <SectionTitle>Goshiwon Events</SectionTitle>
        <Body>
          Occasionally, atmospheric narrative bubbles appear in the chat — creaking hallways, flickering lights, distant murmurs.
          These are Moon-jo&rsquo;s world bleeding into your lesson. They&rsquo;re harmless. Probably.
        </Body>
      </section>
    </>
  );
}

/* ---------- PROGRESS ---------- */
function ProgressTab() {
  return (
    <>
      <section>
        <SectionTitle>Earning XP</SectionTitle>
        <ul className="text-xs text-goshiwon-text-secondary space-y-1">
          <li>• Send message in Korean: <span className="text-goshiwon-accent-light">5-15 XP</span></li>
          <li>• Save vocabulary words: <span className="text-goshiwon-accent-light">3 XP each</span></li>
          <li>• Complete study session: <span className="text-goshiwon-accent-light">20 XP</span></li>
          <li>• Perfect study session (all correct): <span className="text-goshiwon-accent-light">+10 XP bonus</span></li>
          <li>• Avoid translations (5 messages): <span className="text-goshiwon-accent-light">8 XP bonus</span></li>
        </ul>
      </section>

      <section>
        <SectionTitle>Resident Ranks</SectionTitle>
        <Body>
          Progress through 5 ranks based on XP <strong>and</strong> vocabulary count:
        </Body>
        <ul className="mt-2 text-xs text-goshiwon-text-secondary space-y-1">
          <li>• 새 입주자 (New Resident): 0 XP, 0 words</li>
          <li>• 조용한 세입자 (Quiet Tenant): 100 XP, 10 words</li>
          <li>• 단골 (Regular): 500 XP, 30 words</li>
          <li>• 믿을 만한 이웃 (Trusted Neighbor): 1500 XP, 75 words</li>
          <li>• 층 선배 (Floor Senior): 5000 XP, 150 words</li>
        </ul>
      </section>

      <section>
        <SectionTitle>Daily Streak</SectionTitle>
        <Body>
          Send at least one message per day to maintain your streak.
          Streaks reset at midnight. Moon-jo notices when you don&rsquo;t visit...
        </Body>
      </section>
    </>
  );
}

/* ---------- CHAT ---------- */
function ChatTab() {
  return (
    <>
      <section>
        <SectionTitle>Sending Messages</SectionTitle>
        <Body>
          Type in the text box and press Enter (or the arrow button) to send. Moon-jo responds in Korean.
          Writing in Korean earns more XP — even basic phrases count.
        </Body>
      </section>

      <section>
        <SectionTitle>Korean Keyboard</SectionTitle>
        <Body>
          Tap the keyboard icon next to the input to open the built-in Hangul keyboard.
          Type consonants (자음) and vowels (모음) — they combine into syllables automatically using the two-set (두벌식) layout.
        </Body>
        <ul className="mt-2 text-xs text-goshiwon-text-secondary space-y-1">
          <li>• <strong className="text-goshiwon-text">⇧ Shift</strong> — Double consonants (ㅃ, ㅉ, ㄸ, ㄲ, ㅆ)</li>
          <li>• <strong className="text-goshiwon-text">Composing preview</strong> — Shows the character being built; tap to commit</li>
          <li>• <strong className="text-goshiwon-text">Space</strong> — Commits current character and adds a space</li>
          <li>• <strong className="text-goshiwon-text">↵ Enter</strong> — Commits and sends the message</li>
        </ul>
      </section>

      <section>
        <SectionTitle>Translation</SectionTitle>
        <Body>
          Click the globe icon (🌐) below any of Moon-jo&rsquo;s messages to translate Korean to English.
          When active, the icon turns yellow. Click again to see the original.
          Translations are cached for instant toggling.
        </Body>
      </section>

      <section>
        <SectionTitle>Message Actions</SectionTitle>
        <Body>
          Below each message you&rsquo;ll find action buttons:
        </Body>
        <ul className="mt-2 text-xs text-goshiwon-text-secondary space-y-1">
          <li>• <strong className="text-goshiwon-text">🌐 Translate</strong> — Toggle Korean/English</li>
          <li>• <strong className="text-goshiwon-text">📋 Copy</strong> — Copy message text to clipboard</li>
          <li>• <strong className="text-goshiwon-text">💾 Save</strong> — Save vocabulary words from the message</li>
        </ul>
      </section>

      <section>
        <SectionTitle>Keyboard Shortcuts</SectionTitle>
        <ul className="text-xs text-goshiwon-text-secondary space-y-1">
          <li>• <kbd className="px-1 py-0.5 bg-goshiwon-surface rounded text-xs">Enter</kbd> — Send message</li>
          <li>• <kbd className="px-1 py-0.5 bg-goshiwon-surface rounded text-xs">Escape</kbd> — Close overlays (stats, vocab, study, help)</li>
        </ul>
      </section>
    </>
  );
}

/* ---------- WORDS ---------- */
function WordsTab() {
  return (
    <>
      <section>
        <SectionTitle>Saving Vocabulary</SectionTitle>
        <Body>
          Moon-jo highlights Korean words in <span className="text-goshiwon-yellow">yellow</span> with romanization.
          Tap the highlighted word or the bookmark icon to save words to your collection (나의 단어장).
          Each word saved earns 3 XP.
        </Body>
      </section>

      <section>
        <SectionTitle>Vocabulary Panel</SectionTitle>
        <Body>
          Open your saved words via the &ldquo;Words&rdquo; button in the top bar.
          Each word shows Korean, romanization, English meaning, and when it was saved.
          Tap any word to remove it from your collection.
        </Body>
      </section>

      <section>
        <SectionTitle>Study All</SectionTitle>
        <Body>
          Save 4+ words, then click &ldquo;Study All&rdquo; in the vocabulary panel.
          Each question shows a Korean word — pick the correct English translation from 4 choices.
          Your answers update spaced repetition scheduling so difficult words appear more often.
          Perfect sessions (all correct) earn a 10 XP bonus on top of the base 20 XP.
        </Body>
      </section>

      <section>
        <SectionTitle>Quick Quiz</SectionTitle>
        <Body>
          A fast 10-question quiz that tests you in both directions — Korean → English and English → Korean.
          Great for a rapid review. Earn XP and see how well you know your saved words.
        </Body>
      </section>

      <section>
        <SectionTitle>Writing Practice</SectionTitle>
        <Body>
          Test your recall by writing Korean from English prompts.
          You see an English word and type the Korean equivalent using the built-in Hangul keyboard or your own.
          Answers are graded as Exact, Close (1 character off), or Wrong.
          Skipped words are tracked separately and excluded from your score.
        </Body>
        <ul className="mt-2 text-xs text-goshiwon-text-secondary space-y-1">
          <li>• <strong className="text-goshiwon-text">Check (Enter)</strong> — Submit your answer</li>
          <li>• <strong className="text-goshiwon-text">Skip (Tab)</strong> — Skip to the next word without penalty</li>
          <li>• <strong className="text-goshiwon-text">Next (Enter)</strong> — Advance after checking</li>
        </ul>
      </section>
    </>
  );
}

/* ---------- TOOLS ---------- */
function ToolsTab() {
  return (
    <>
      <section>
        <SectionTitle>Lesson Topics</SectionTitle>
        <Body>
          On the welcome screen, choose from 7 guided topics: Greetings, Survival Phrases, Numbers, Ordering Food, Feelings, Polite vs Casual, and Free Conversation.
          Each starts a focused lesson with Moon-jo. Topics you&rsquo;ve already visited are marked &ldquo;studied.&rdquo;
          Difficulty badges (Beginner, Intermediate, Advanced) show the level of each topic.
        </Body>
      </section>

      <section>
        <SectionTitle>Today&rsquo;s Focus</SectionTitle>
        <Body>
          Each day, Moon-jo suggests a study focus on the welcome screen — a topic to start or review, and words due for revision.
          Follow his suggestions to stay on track with spaced repetition.
        </Body>
      </section>

      <section>
        <SectionTitle>Lesson History</SectionTitle>
        <Body>
          Past conversations are automatically saved when you leave Room 203.
          Open &ldquo;History&rdquo; in the top bar to review previous lessons.
          You can delete old conversations you no longer need.
        </Body>
      </section>

      <section>
        <SectionTitle>Share Conversation</SectionTitle>
        <Body>
          The &ldquo;Share&rdquo; button exports your current conversation as a PNG image.
          Great for sharing your progress or saving memorable exchanges with Moon-jo.
        </Body>
      </section>

      <section>
        <SectionTitle>Sound</SectionTitle>
        <Body>
          Toggle ambient goshiwon sounds (key clicks, hum) with the speaker icon.
          Moon-jo&rsquo;s keystrokes play while he types his responses.
        </Body>
      </section>

      <section>
        <SectionTitle>Leaving Room 203</SectionTitle>
        <Body>
          Click &ldquo;Leave&rdquo; in the top bar to end your session.
          Your conversation is saved to history before resetting.
          Moon-jo will be waiting when you return.
        </Body>
      </section>

      <section>
        <SectionTitle>Learning Tips</SectionTitle>
        <ul className="text-xs text-goshiwon-text-secondary space-y-1">
          <li>• Try writing in Korean — even basic phrases earn XP</li>
          <li>• Use Study All regularly — spaced repetition builds memory</li>
          <li>• Avoid over-translating — challenge yourself</li>
          <li>• Ask Moon-jo to explain things again if confused</li>
          <li>• Hover over Korean rank names to see English meanings</li>
        </ul>
      </section>
    </>
  );
}
