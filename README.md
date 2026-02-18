<div align="center">

# 눈치 Nunchi

**Learn Korean from the neighbor you never asked for.**

An AI-powered Korean language learning app set in a fictional goshiwon,<br>
inspired by the K-drama *Strangers from Hell* (타인은 지옥이다).

Completely free. Runs locally via [Ollama](https://ollama.com). No API keys needed.

![screenshot](screenshot.png)

[Getting Started](#getting-started) · [Features](#features) · [How It Works](#how-it-works) · [Tech Stack](#tech-stack) · [Testing](#testing) · [Project Structure](#project-structure)

</div>

---

## The Concept

You've just moved into **Room 203** at Eden Goshiwon (에덴 고시원). Your neighbor, **Seo Moon-jo** (서문조) — the suspiciously charming dentist next door — has taken an interest in teaching you Korean. He's... *invested* in your progress.

Moon-jo teaches entirely in Korean with romanization. No English translations in his messages — you use the built-in translate button when you need help. The more Korean you write, the warmer he gets. The less you try, the colder he becomes.

Everything happens between 1 and 3 AM. The hallway lights flicker. The twins are whispering again. But you're learning Korean, and Moon-jo is always watching.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Ollama](https://ollama.com) installed and running

### Setup

```bash
git clone https://github.com/braphoggg/Nunchi.git
cd Nunchi
npm install
```

Pull the language model (~4.8 GB download):

```bash
ollama pull exaone3.5:7.8b
```

Start Ollama and the dev server:

```bash
ollama serve
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Pick a topic. Moon-jo is waiting.

---

## Features

### Conversation & Learning

- **7 structured lessons** — Greetings, Survival Phrases, Numbers & Counting, Ordering Food, Describing Feelings, Polite vs Casual speech, and Free Conversation
- **Korean-first teaching** — Moon-jo teaches in bold Korean with romanization (`**한글** (hangeul)`). No English in his messages — you discover meaning through context and the translate button
- **Click-to-translate** — Globe icon on any message toggles between Korean and English. Translations are cached for instant switching
- **Text-to-speech** — Hear any message or vocabulary word pronounced in Korean
- **Mood system** — Moon-jo's personality adapts to your effort. Write mostly in Korean and he becomes warm, even possessive. Barely try and he turns cold and clinical

### Gamification

Earn XP, build streaks, and rise through the goshiwon ranks.

**XP Sources:**

| Action | XP |
|--------|-----|
| Send a message in Korean | 5–15 |
| Save a vocabulary word | 3 |
| Complete a flashcard session | 20 |
| Perfect flashcard session | +10 bonus |
| Avoid using translate (5 messages) | 8 bonus |

**5 Resident Ranks** — Dual thresholds require both XP *and* vocabulary:

| Rank | Korean | XP | Words |
|------|--------|----|-------|
| New Resident | 새 입주자 | 0 | 0 |
| Quiet Tenant | 조용한 세입자 | 100 | 10 |
| Regular | 단골 | 500 | 30 |
| Trusted Neighbor | 믿을 만한 이웃 | 1,500 | 75 |
| Floor Senior | 층 선배 | 5,000 | 150 |

- **Daily streak** — Automatic midnight reset. Moon-jo notices when you don't visit
- **Stats panel** — Total XP, streak history, messages sent, flashcard sessions, translations used
- **XP toasts** — Real-time notifications when you earn points
- **Rank tooltips** — Hover over Korean rank names to see the English translation
- **Progress bars** — Visual display showing both XP and word count toward next rank

### Vocabulary & Flashcards

- **Smart extraction** — Korean vocabulary is automatically detected from Moon-jo's messages
- **Personal dictionary** (나의 단어장) — Save words with Korean, romanization, and English translation
- **Flashcard study mode** — 3D flip cards (Korean front → English back) with self-assessment: Again / Good / Easy
- **Batch translation** — Words missing English translations are auto-translated via the vocabulary API
- **Perfect session bonus** — Extra XP for getting every card right
- **Unseen badge** — Notification dot shows new unsaved vocabulary

### Hangul Keyboard

- **On-screen Korean keyboard** — Standard 두벌식 (Dubeolsik) layout with 4 rows
- **Real-time composition** — Jamo combine into syllables as you type (ㅎ + ㅏ + ㄴ = 한)
- **Shift for double consonants** — ㅃ, ㅉ, ㄸ, ㄲ, ㅆ and compound vowels ㅒ, ㅖ
- **Backspace decomposition** — Deleting correctly breaks syllables back into components
- **Composing preview** — Live preview of the character being built above the keyboard

### Lesson History

- **Auto-save** — Conversations are saved automatically when you leave Room 203
- **Browse past lessons** — View saved conversations with date, preview text, and message count
- **Lesson review** — Read-only playback of any saved conversation
- **Storage management** — Delete old conversations to free space (max 20 saved)

### Share as Image

- **Export as PNG** — Branded image with the goshiwon dark theme
- **Full formatting** — Header with app name, user and assistant messages, bold vocabulary highlighted in gold, footer with attribution

### Atmosphere

- **Night progression** — The UI gradually darkens across 4 stages as the conversation grows deeper. Colors shift toward black and deep red
- **Ambient sound** — Low 60Hz electrical hum when Moon-jo types, filtered key click sounds as you type (toggleable via mute button)
- **Goshiwon events** — 15 random atmospheric interruptions between messages:
  - *A sound from Room 313...*
  - *The hallway light flickers.*
  - *A shadow passes under the door.*
  - *The twins are whispering in the hallway.*
- **Atmospheric timestamps** — Every message stamped between 1–3 AM
- **Leave confirmation** — "Leave Room 203?" safety dialog before clearing the conversation

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Escape` | Close current overlay (layered: flashcards → vocab → main) |

---

## How It Works

### Architecture

Single-page Next.js application with three API routes, all powered by a local Ollama instance:

| Route | Purpose | Temperature |
|-------|---------|-------------|
| `/api/chat` | Streaming conversation with Moon-jo's system prompt + mood addendum | 0.7 |
| `/api/translate` | On-demand Korean → English translation | 0.3 |
| `/api/vocabulary-translate` | Batch translate vocabulary words for the dictionary | 0.2 |

All AI runs locally through Ollama using `exaone3.5:7.8b`. No data leaves your machine.

### Moon-jo's Character

A ~2KB system prompt defines Moon-jo with strict rules:

- **Korean-only output** — Vocabulary in `**한글** (romanization)` format, never with English meanings
- **Character boundaries** — Refuses non-Korean topics, never breaks character, no emojis
- **Speech style** — Formal 존댓말 with soft endings (~거든요, ~잖아요, ~죠?), forced intimacy with "우리" (we/our)
- **Personality** — Calm, charming, possessive, perceptive. Dentist metaphors. Contempt for other residents. Asks your name, then uses it with 씨 (honorific) throughout
- **Teaching method** — 3–5 new words per exchange, progressive difficulty, cultural context through goshiwon life

### Mood Engine

The mood engine analyzes the Hangul ratio across all user messages and dynamically adjusts Moon-jo's behavior:

| Korean Usage | Mood | Moon-jo's Behavior |
|-------------|------|---------------------|
| < 20% | Cold | Distant, clinical, slightly disappointed |
| 20–49% | Neutral | Baseline — polite, attentive, gently unsettling |
| 50–79% | Warm | Pleased, affectionate, more possessive |
| ≥ 80% | Impressed | Reverent, intense warmth — "You belong here" |

### Hangul Composition Engine

The keyboard uses a state machine implementing the standard Korean syllable formula:

```
Syllable = 0xAC00 + (initial × 21 + medial) × 28 + final
```

Supports 19 initial consonants, 21 medial vowels, 28 final positions (including empty), complex vowel combinations (ㅗ + ㅏ = ㅘ), complex final consonants (ㄱ + ㅅ = ㄳ), and correct decomposition on backspace.

### Data Persistence

All progress stays in your browser's localStorage:

| Key | Contents | Limit |
|-----|----------|-------|
| `nunchi-gamification` | XP, streaks, session stats | 500 KB |
| `nunchi-vocabulary` | Saved words | 1 MB / 5,000 words |
| `nunchi-lesson-history` | Saved conversations | 20 conversations |

Corrupted data auto-resets to safe defaults. XP has anti-tampering validation (max events per minute, max amount per event, total ceiling).

### Security

- **Rate limiting** — 10 requests/minute per IP on all API routes
- **Input validation** — Message count (≤50), content length (≤2,000 chars), role validation
- **Content sanitization** — HTML tags stripped, control characters removed, null byte filtering
- **Anti-tampering** — XP history validated for burst rate, max amounts, and total ceiling (999,999)
- **Security headers** — `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript 5.9 (strict mode) |
| UI | [React 19](https://react.dev) |
| AI | [Vercel AI SDK v6](https://sdk.vercel.ai) + [Ollama](https://ollama.com) |
| Model | [EXAONE 3.5 7.8B](https://huggingface.co/LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) with custom goshiwon theme |
| Image Export | [html-to-image](https://github.com/bubkoo/html-to-image) |
| Audio | Web Audio API + Web Speech API |
| Testing | [Vitest](https://vitest.dev) + [React Testing Library](https://testing-library.com) |
| Fonts | Inter + Noto Sans KR (Google Fonts) |

### Theme

Custom dark palette defined in Tailwind v4:

| Token | Hex | Usage |
|-------|-----|-------|
| `goshiwon-bg` | `#0c0a0d` | Background |
| `goshiwon-surface` | `#1a1720` | Cards, panels |
| `goshiwon-accent` | `#8b1a1a` | Dark red accents |
| `goshiwon-yellow` | `#d4a843` | Vocabulary highlights, gold text |
| `goshiwon-text` | `#e8e4ec` | Primary text |
| `goshiwon-border` | `#2a2533` | Borders, dividers |

12+ CSS animations including message fade-in, flashcard 3D flip, keyboard slide-up, night color transitions, XP toast popups, and rank-up glow effects.

---

## Testing

```bash
npm test              # run all tests
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

**398 tests** across 28 test files covering:

- **API routes** — Chat streaming, translation, vocabulary batch, error handling, rate limiting
- **Components** — All UI components including overlays, message rendering, input handling
- **Hooks** — Gamification state, vocabulary management, flashcards, sound engine, night progression, goshiwon events
- **Libraries** — Hangul composition/decomposition, vocabulary parsing (bold patterns, romanization), mood calculation, XP/rank logic, security validation, timestamps
- **Edge cases** — Race conditions, localStorage corruption, streak midnight rollover, anti-tampering detection

Tests run with Vitest in a jsdom environment with React Testing Library. TypeScript strict mode enforced.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/                  # Streaming chat (Ollama)
│   │   ├── translate/             # Korean → English translation
│   │   └── vocabulary-translate/  # Batch vocabulary translation
│   ├── globals.css                # Goshiwon theme + 12 animations
│   ├── layout.tsx                 # Root layout, fonts, metadata
│   └── page.tsx                   # Home → ChatContainer
├── components/
│   ├── ChatContainer.tsx          # Main orchestrator (hooks, overlays, state)
│   ├── ChatInput.tsx              # Auto-growing textarea
│   ├── MessageBubble.tsx          # Messages + translate/copy/save actions
│   ├── TopBar.tsx                 # Header bar + all action buttons
│   ├── WelcomeScreen.tsx          # Lesson topic cards + onboarding
│   ├── StatsBar.tsx               # Compact XP / streak / rank display
│   ├── StatsPanel.tsx             # Detailed stats overlay
│   ├── VocabularyPanel.tsx        # Saved words list (나의 단어장)
│   ├── FlashcardMode.tsx          # Flashcard study interface
│   ├── HangulKeyboard.tsx         # On-screen Korean keyboard
│   ├── LessonHistory.tsx          # Browse saved conversations
│   ├── LessonReview.tsx           # Read-only conversation replay
│   ├── ShareButton.tsx            # Export conversation as PNG
│   ├── HelpModal.tsx              # Comprehensive feature guide
│   ├── GoshiwonEventBubble.tsx    # Atmospheric event notifications
│   ├── XPToast.tsx                # XP gain popup
│   └── TypingIndicator.tsx        # Animated typing dots
├── hooks/
│   ├── useGamification.ts         # XP, streaks, ranks, stats
│   ├── useVocabulary.ts           # Word management + localStorage
│   ├── useFlashcards.ts           # Study session state machine
│   ├── useSoundEngine.ts          # Ambient hum + key click synthesis
│   ├── useGoshiwonEvents.ts       # Random atmospheric interruptions
│   ├── useNightProgression.ts     # UI darkening over conversation length
│   └── useLessonHistory.ts        # Conversation save/load/delete
├── lib/
│   ├── system-prompt.ts           # Moon-jo's 2KB character definition
│   ├── gamification.ts            # XP values, 5 rank definitions
│   ├── hangul-compose.ts          # Jamo → syllable composition engine
│   ├── mood-engine.ts             # Hangul ratio → mood level
│   ├── parse-vocabulary.ts        # Extract vocab from bold patterns
│   ├── lesson-topics.ts           # 7 lesson definitions with starters
│   ├── goshiwon-events.ts         # 15 atmospheric event descriptions
│   ├── security.ts                # Rate limiting, validation, sanitization
│   ├── format-message.ts          # Bold/italic text parsing
│   ├── timestamps.ts              # 1–3 AM timestamp generator
│   └── message-utils.ts           # UIMessage text extraction
├── types/
│   └── index.ts                   # All TypeScript interfaces
└── middleware.ts                   # Security headers for API routes
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm test` | Run all 398 tests |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:coverage` | Tests with coverage report |
| `npm run lint` | ESLint check |

---

## License

MIT

---

<div align="center">

*"You don't have to stay... but you want to, don't you?"*<br>
— Seo Moon-jo, Room 203

</div>
