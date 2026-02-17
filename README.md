# Nunchi눈치

**Nunchi눈치** — *Learn Korean from the neighbor you never asked for.*

An AI-powered Korean language learning app where your teacher is Seo Moon-jo (서문조), the dentist from Room 203 at Eden Goshiwon. Inspired by the K-drama *Strangers from Hell* (타인은 지옥이다), Nunchi (눈치) teaches vocabulary, grammar, and Korean culture through immersive, in-character conversation with a charmingly unsettling tutor. Completely free — runs on a local LLM via Ollama. No API keys needed.

![screenshot](screenshot.png)

## Features

### Core Learning Experience
- **Character-driven teaching** — Moon-jo stays in character, teaching Korean through goshiwon life, food vocabulary, and dentist metaphors
- **7 lesson topics** — Greetings, survival phrases, numbers, ordering food, feelings, polite vs casual speech, free conversation
- **Click-to-translate** — Translate any of Moon-jo's messages from Korean to English with one click
  - Visual indicator when translation is active (yellow globe icon)
  - "Translated — tap the globe to see original" hint text
  - Cached translations for instant toggling
- **Text-to-speech** — Hear messages and vocabulary words read aloud in Korean (Web Speech API, `ko-KR`)
- **Copy to clipboard** — Copy any message text instantly

### Gamification System
- **XP progression** — Earn XP for Korean messages (5-15 XP), saving vocabulary (3 XP each), flashcard sessions (20-30 XP), and avoiding translations (8 XP bonus)
- **Resident ranks** — Progress through 5 ranks (New Resident → Quiet Tenant → Regular → Trusted Neighbor → Floor Senior) with dual requirements (XP + vocabulary count)
- **Daily streak tracking** — Build consistency with automatic streak resets at midnight
- **Rank-aware welcome greetings** — Moon-jo's greeting changes based on your rank
- **Rank-up notifications** — Atmospheric notifications when you advance
- **Stats panel** — Track total XP, current streak, vocabulary count, messages sent, flashcard sessions, and translations used
- **Progress indicators** — Visual progress bars showing advancement to next rank
- **Rank tooltips** — Hover over Korean rank names to see English translations and descriptions

### Vocabulary Management
- **Smart vocabulary extraction** — Automatically detects Korean words with romanization and English translations from Moon-jo's messages
- **Personal vocabulary list** — Save words to your collection (나의 단어장)
- **Vocabulary panel** — View all saved words sorted by recency, with pronunciation audio for each word
- **Flashcard study mode** — Study saved vocabulary with spaced repetition
  - Front: Korean word + romanization
  - Back: English translation
  - Self-assessment (Know it / Still learning)
  - Perfect session bonus (+10 XP)
  - Results summary with retry option
- **Batch translation** — Words without English get translated automatically via API

### UI/UX Polish
- **Dark goshiwon theme** — Deep purples, reds, and golds evoking late-night Eden Goshiwon hallways
- **Atmospheric timestamps** — Messages timestamped between 1–3 AM
- **Ambient sound design** — Subtle keyboard clicks and a low hum while Moon-jo types (Web Audio API, toggleable)
- **Leave confirmation** — Safety prompt before resetting conversation ("Leave Room 203? Leave / Stay")
- **Keyboard shortcuts** — Escape key closes overlays, Enter submits messages
- **Onboarding hint** — New residents see "Tip: Write in Korean to earn XP and rise through the ranks"
- **Overlay mutual exclusion** — Opening one panel automatically closes others
- **Auto-growing input** — Textarea expands up to 6 lines as you type
- **Responsive design** — Mobile-friendly layout with adaptive vocabulary badge display

### Data Persistence
- **localStorage** — All gamification data (XP, streak, rank) and vocabulary persist across sessions
- **Validation & error recovery** — Corrupted data automatically resets to safe defaults
- **Last check date tracking** — Accurate streak calculation across sessions

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.9 |
| AI | Vercel AI SDK v6 + Ollama (`exaone3.5:7.8b`) |
| Styling | Tailwind CSS v4 with custom theme |
| Audio | Web Audio API (ambient sounds) + Web Speech API (TTS) |
| Testing | Vitest + React Testing Library (358 tests) |
| Fonts | Inter + Noto Sans KR |

## Prerequisites

- **Node.js** 18+
- **Ollama** installed and running — [ollama.com](https://ollama.com)

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/braphoggg/nunchi.git
cd nunchi

# 2. Install dependencies
npm install

# 3. Pull the LLM model (one-time, ~4.8 GB)
ollama pull exaone3.5:7.8b

# 4. Start Ollama (if not already running)
ollama serve

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Pick a topic. Moon-jo is waiting.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts              # Streaming chat endpoint (Ollama)
│   │   ├── translate/route.ts         # Korean → English translation
│   │   └── vocabulary-translate/      # Batch vocabulary translation
│   │       └── route.ts
│   ├── globals.css                    # Goshiwon dark theme + animations
│   ├── layout.tsx                     # Root layout (fonts, metadata)
│   └── page.tsx                       # Home page
├── components/
│   ├── ChatContainer.tsx              # Main chat orchestrator + gamification
│   ├── ChatInput.tsx                  # Auto-growing textarea input
│   ├── MessageBubble.tsx              # Message rendering + action buttons
│   ├── TopBar.tsx                     # Header (avatar, rank, mute, leave, vocab)
│   ├── StatsBar.tsx                   # XP/streak/rank compact bar
│   ├── StatsPanel.tsx                 # Detailed stats overlay
│   ├── VocabularyPanel.tsx            # Saved vocabulary list + study mode
│   ├── FlashcardMode.tsx              # Flashcard study interface
│   ├── TypingIndicator.tsx            # Animated typing dots
│   ├── WelcomeScreen.tsx              # Lesson topic selection + onboarding
│   └── GoshiwonEventBubble.tsx        # Atmospheric notifications (rank-up, XP)
├── hooks/
│   ├── useSoundEngine.ts              # Web Audio API (ambient hum, key clicks)
│   ├── useVocabulary.ts               # Vocabulary state + localStorage persistence
│   └── useGamification.ts             # XP, streak, rank progression
├── lib/
│   ├── format-message.ts              # Bold text parsing
│   ├── lesson-topics.ts               # 7 lesson topic definitions
│   ├── security.ts                    # Rate limiting + input validation + localStorage validation
│   ├── system-prompt.ts               # Moon-jo character prompt
│   ├── timestamps.ts                  # Atmospheric 1–3 AM timestamps
│   ├── vocabulary-parser.ts           # Extract vocab from messages
│   ├── goshiwon-events.ts             # XP calculation + event generation
│   └── mood-engine.ts                 # Moon-jo mood based on time/streak
├── types/
│   └── index.ts                       # TypeScript interfaces
└── middleware.ts                       # Security headers
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm test` | Run all tests (358 tests) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | ESLint check |

## How It Works

### Chat Flow
1. User sends a message → `/api/chat` streams it to Ollama (`exaone3.5:7.8b`) with Moon-jo's system prompt
2. Response streams back as `UIMessage` parts
3. XP awarded based on message content (Korean vs English, full Korean bonus)
4. Vocabulary automatically extracted and offered for saving
5. Streak updated, rank calculated, notifications displayed

### Translation
1. Click the globe icon on any assistant message
2. `/api/translate` sends the text to Ollama with a translation prompt
3. English translation replaces Korean text (cached, toggleable)
4. Translate button turns yellow, hint text appears: "Translated — tap the globe to see original"

### Vocabulary & Flashcards
1. Moon-jo's messages include vocabulary in bold: **한국어** (hangugeo) Korean language
2. Save button appears when vocabulary is detected
3. Words without English translations get batch-translated via `/api/vocabulary-translate`
4. Words saved to localStorage with ID, timestamps, and seen count
5. Study mode presents flashcards with TTS, tracks results, awards XP

### Gamification
1. All actions award XP: Korean messages (5-15 XP), vocabulary saves (3 XP), flashcard sessions (20-30 XP)
2. Daily streak tracked via `lastCheckDate` comparison
3. Rank calculated from both XP and vocabulary count (dual thresholds)
4. Progress persisted to localStorage with validation
5. Rank-up triggers atmospheric notifications

### Character
A ~2KB system prompt defines Moon-jo's speech patterns (soft 존댓말, forced intimacy with 우리, goshiwon references, dentist metaphors) and teaching methodology (Hangul first, romanization, contextual examples). Mood varies by time of day and user streak.

## Testing

```bash
npm test
```

**358 tests** across 27 files covering:
- API routes (chat, translate, vocabulary)
- Components (all UI components + overlays)
- Hooks (gamification, vocabulary, sound engine)
- Libraries (vocabulary parser, XP calculator, mood engine, security)
- Edge cases (race conditions, localStorage corruption, streak logic)

Tests use Vitest with jsdom and React Testing Library. Build validated with TypeScript strict mode.

## Recent Improvements

- **Help/tutorial modal** — ? button in TopBar, comprehensive guide (Escape to close)
- **AI character boundaries** — Refuses non-Korean topics, redirects to language learning
- **Context awareness** — References previous messages when asked
- **Message length optimization** — <200 words per response, progressive teaching
- **TypeError prevention** — Defensive checks in topic selection and form submission
- **Translation race condition** — Guard prevents duplicate XP from rapid clicks
- **Overlay management** — Mutual exclusion, proper z-index, Escape key closes
- **Rank tooltips** — Hover over Korean names to see English
- **Leave confirmation** — Safety dialog before conversation reset
- **Progress clarity** — "110/500 XP · 13/30 words" instead of "needed" format

All 358 tests passing ✅

## License

MIT
