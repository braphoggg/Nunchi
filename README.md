<div align="center">

# 눈치 Nunchi

**Learn Korean from the neighbor you never asked for.**

A cinematic Korean language learning app set in a fictional goshiwon,<br>
inspired by the K-drama *Strangers from Hell* (타인은 지옥이다).

![Nunchi — Welcome Screen](screenshot.png)

[Quick Start](#quick-start) · [Features](#features) · [How It Works](#how-it-works) · [Tech Stack](#tech-stack) · [Project Structure](#project-structure)

</div>

---

## What is Nunchi?

You've just moved into **Room 203** at Eden Goshiwon (에덴 고시원). Your neighbor, **Seo Moon-jo** — the suspiciously charming dentist next door — has taken an interest in teaching you Korean.

Moon-jo teaches entirely in Korean with romanization. No English in his messages — you use the translate button when you need help. Write in Korean and he warms up. Barely try and he turns cold. Everything happens between 1 and 3 AM.

---

## Quick Start

**1. Clone & install**

```bash
git clone https://github.com/braphoggg/Nunchi.git
cd Nunchi
npm install
```

**2. Add your API key** (choose one)

**Option A — In-app (recommended for deployed use)**

Launch the app and enter your Gemini API key when prompted on the welcome screen. The key is stored in your browser's localStorage and sent directly to Google — never stored on any server.

**Option B — Environment variable (local development)**

Create `.env.local`:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
# Optional: GEMINI_MODEL=gemini-2.5-flash (default)
```

> Get a free key at [Google AI Studio](https://aistudio.google.com/apikey) (15 requests/min, 1,000/day)

**3. Start**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Pick a topic. Moon-jo is waiting.

> **PWA-enabled** — install to your home screen for an app-like experience with offline vocabulary review.

---

## Features

### Learn by Conversation

- **7 structured lessons** — Greetings, Survival Phrases, Numbers, Ordering Food, Feelings, Polite vs Casual, Free Conversation
- **Korean-first teaching** — Bold Korean with romanization. Discover meaning through context and the translate button
- **Inline error correction** — ~~your mistake~~ → **corrected version** with brief explanations
- **Mood system** — Moon-jo's personality adapts to how much Korean you write

### Build Your Vocabulary

- **Click to save** — Tap bold Korean words in messages to save them to your personal dictionary
- **Spaced repetition** — SM-2 algorithm schedules reviews at optimal intervals
- **Flashcards** — 3D flip cards with self-assessment. Listen mode hides text for ear training
- **Quizzes** — Multiple-choice in both directions (Korean → English, English → Korean)
- **Writing Practice** — Type Korean from English prompts. Graded as Exact, Close, or Wrong; skipped words tracked separately

### Earn Your Rank

Earn XP by writing Korean, saving words, and completing study sessions. Rise through 5 goshiwon resident ranks — from **새 입주자** (New Resident) to **층 선배** (Floor Senior). Higher ranks unlock harder lessons.

### Type in Korean

Built-in **두벌식** (Dubeolsik) keyboard with real-time Hangul composition. Jamo combine into syllables as you type (ㅎ + ㅏ + ㄴ = 한).

### Atmospheric Experience

Night progression darkens the UI as conversations deepen. Film grain, vignette, ambient hum, and random goshiwon events (*"The hallway light flickers"*) create an immersive atmosphere.

<details>
<summary><strong>All features</strong></summary>

#### Conversation & Learning
- 7 tiered lessons (beginner / intermediate / advanced) with rank-gated progression
- Click-to-translate on any message (cached for instant switching)
- Text-to-speech on all assistant messages and vocabulary words
- "Today's Focus" daily suggestion based on progress and review schedule
- Daily Moon-jo quote in Korean with English translation

#### Vocabulary & Study
- Personal dictionary with Korean, romanization, and English
- SM-2 spaced repetition with ease factor, interval, and repetition tracking
- Flashcard listen mode — audio only, then flip to check
- Writing practice — English → Korean recall with Exact/Close/Wrong grading, skip tracking
- Batch save all vocabulary from a message
- Auto-translation of saved words via vocabulary API
- Unseen vocabulary badge notification

#### Gamification
| Action | XP |
|--------|-----|
| Send a message with Korean | 5–15 |
| Save a vocabulary word | 3 |
| Complete a flashcard session | 20 |
| Perfect flashcard session | +10 bonus |
| Perfect quiz (100%) | 25 |
| Avoid translate for 5 messages | 8 bonus |

5 ranks with dual XP + vocabulary thresholds. Daily streak tracking. XP toasts and rank-up events.

#### Hangul Keyboard
- Standard 두벌식 layout with shift for double consonants (ㅃ, ㅉ, ㄸ, ㄲ, ㅆ)
- Backspace correctly decomposes syllables back into components
- Live composing preview above the keyboard

#### Lesson History
- Auto-save conversations when leaving Room 203
- Search, browse, and review past lessons
- Storage management (max 20 saved conversations)

#### Sharing
- Export as branded PNG image
- Copy as plain text
- Native Web Share on supported devices

#### Bring Your Own Key (BYOK)
- Enter your own Google Gemini API key in the app — no server-side key needed
- Key stored in browser localStorage, sent directly to Google over HTTPS
- API key gate on first visit — prompts for key before unlocking the app
- Manage key in Settings: view masked key, show/hide, remove
- Never included in data backups or exports

#### Settings & Data
- API key management (enter, view masked, show/hide, remove)
- Theme (dark / light), font scale, romanization toggle, reduce animations
- Sound volume and mute controls
- Full data backup/restore as JSON
- Interactive onboarding tutorial

#### Keyboard Shortcuts
| Key | Context | Action |
|-----|---------|--------|
| `Enter` | Chat | Send message |
| `Space` | Flashcards | Flip card |
| `1` / `2` / `3` | Flashcards (flipped) | Again / Good / Easy |
| `←` / `→` | Flashcards | Previous / next card |
| `1`–`4` | Quiz | Select answer |
| `Enter` | Writing Practice | Check answer / Next word |
| `Tab` | Writing Practice | Skip word |
| `Escape` | Any overlay | Close current overlay |

</details>

---

## How It Works

**Architecture** — Single-page Next.js app with three API routes powered by Google Gemini:

| Route | Purpose |
|-------|---------|
| `/api/chat` | Streaming conversation with Moon-jo |
| `/api/translate` | Korean → English translation |
| `/api/vocabulary-translate` | Batch vocabulary translation |

**Moon-jo's Character** — A ~2KB system prompt defines his personality: Korean-only output, inline corrections, formal 존댓말 with forced intimacy, dentist metaphors, and mood that shifts based on your Korean usage ratio.

**Spaced Repetition** — SM-2 algorithm with ease factor (starting at 2.5), growing intervals, and due-date scheduling. SRS state persists on each vocabulary item.

**BYOK (Bring Your Own Key)** — Each user provides their own free Google Gemini API key. The key is stored in the browser's localStorage, sent to Google via `x-api-key` header per request, and never logged or stored server-side. For local development, an environment variable fallback is supported.

**Data** — All progress lives in localStorage (XP, vocabulary, lesson history, settings). No account required. Data backup/restore exports everything as validated JSON (API keys are intentionally excluded from backups).

<details>
<summary><strong>Technical details</strong></summary>

#### Mood Engine
| Korean Usage | Mood | Behavior |
|-------------|------|----------|
| < 20% | Cold | Distant, clinical |
| 20–49% | Neutral | Polite, attentive |
| 50–79% | Warm | Affectionate, possessive |
| ≥ 80% | Impressed | Reverent, intense |

#### Hangul Composition
State machine implementing: `Syllable = 0xAC00 + (initial × 21 + medial) × 28 + final`

Supports 19 initial consonants, 21 medial vowels, 28 final positions, complex combinations, and correct backspace decomposition.

#### Security
- Rate limiting (10 req/min per IP)
- Input validation (≤50 messages, ≤2,000 chars)
- Content sanitization (HTML stripping, null byte filtering)
- XP anti-tampering (burst rate, max amounts, total ceiling)
- Security headers (nosniff, DENY framing, XSS protection, HSTS, CSP)
- BYOK: API key travels over HTTPS only, used transiently per request, never logged or persisted server-side, excluded from data backups
- Prototype pollution defense on localStorage data restoration

#### Data Storage
| Key | Contents |
|-----|----------|
| `nunchi-gamification` | XP, streaks, session stats |
| `nunchi-vocabulary` | Saved words + SRS state (max 5,000) |
| `nunchi-lesson-history` | Saved conversations (max 20) |
| `nunchi-settings` | Theme, font, romanization, animations |
| `nunchi-api-key` | User's Gemini API key (excluded from backups) |
| `nunchi-sound-muted` | Mute state |
| `nunchi-sound-volume` | Volume level (0–100) |
| `nunchi-tutorial-completed` | Tutorial completion flag |
| `nunchi-onboarded` | Onboarding completion flag |
| `nunchi-visited-topics` | Visited lesson topic IDs |

</details>

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript 5.9 (strict mode) |
| UI | [React 19](https://react.dev) |
| AI | [Vercel AI SDK v6](https://sdk.vercel.ai) + [Google Gemini 2.5 Flash](https://deepmind.google/technologies/gemini/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Audio | Web Audio API + Web Speech API |
| Testing | [Vitest](https://vitest.dev) + [React Testing Library](https://testing-library.com) |
| PWA | Service Worker + Web App Manifest |

---

## Testing

```bash
npm test              # run all tests
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

1100+ tests across 71 test files covering API routes, all UI components, hooks, libraries, security edge cases, and BYOK flows.

Test categories include:
- **Unit tests** — Pure functions (SRS, gamification, Hangul composition, security)
- **Component tests** — React component rendering and interaction
- **API route tests** — Request validation, response format, error handling
- **Break tests** — Adversarial inputs, error leakage, prompt injection surface
- **Fuzz tests** — Random/malformed input handling

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/                  # Streaming chat (Gemini 2.5 Flash)
│   │   ├── translate/             # Korean → English translation
│   │   └── vocabulary-translate/  # Batch vocabulary translation
│   ├── globals.css                # Goshiwon theme + atmospheric overlays
│   ├── layout.tsx                 # Root layout, fonts, metadata
│   ├── manifest.ts                # PWA web app manifest
│   └── page.tsx                   # Home → ChatContainer
├── components/
│   ├── ChatContainer.tsx          # Main orchestrator
│   ├── Modal.tsx                  # Shared modal (focus trap, ARIA, Escape)
│   ├── ChatInput.tsx              # Auto-growing textarea
│   ├── MessageBubble.tsx          # Messages + translate/copy/listen/save
│   ├── TopBar.tsx                 # Header bar + navigation
│   ├── WelcomeScreen.tsx          # Lesson topics + daily focus
│   ├── StatsBar.tsx               # Compact XP / streak / rank display
│   ├── StatsPanel.tsx             # Detailed stats + SRS breakdown
│   ├── VocabularyPanel.tsx        # Saved words (나의 단어장)
│   ├── FlashcardMode.tsx          # Flashcard study + SRS grading
│   ├── QuizMode.tsx               # Multiple-choice quiz
│   ├── WritingMode.tsx            # English → Korean writing practice
│   ├── HangulKeyboard.tsx         # On-screen Korean keyboard
│   ├── LessonHistory.tsx          # Browse + search saved conversations
│   ├── LessonReview.tsx           # Read-only conversation replay
│   ├── SettingsPanel.tsx          # API key, theme, font, sound, data backup
│   ├── ShareButton.tsx            # Export as PNG / text / share
│   ├── HelpModal.tsx              # Feature guide
│   ├── OnboardingOverlay.tsx      # First-visit welcome
│   ├── TutorialOverlay.tsx        # Interactive tutorial
│   ├── GoshiwonEventBubble.tsx    # Atmospheric event notifications
│   ├── XPToast.tsx                # XP gain popup
│   └── TypingIndicator.tsx        # Animated typing dots
├── contexts/
│   ├── SoundContext.tsx           # Sound engine context provider
│   ├── SettingsContext.tsx         # Settings context provider
│   └── GamificationContext.tsx    # XP/rank/streak context provider
├── hooks/
│   ├── useGamification.ts         # XP, streaks, ranks, stats
│   ├── useVocabulary.ts           # Word management + SRS
│   ├── useFlashcards.ts           # Study session state machine
│   ├── useSettings.ts             # Theme, font, romanization
│   ├── useTutorial.ts             # Tutorial state machine
│   ├── useSoundEngine.ts          # Ambient hum + key click synthesis
│   ├── useAtmosphere.ts           # Night progression + mood + events
│   ├── useOverlayState.ts         # Panel open/close coordination
│   ├── useViewportHeight.ts       # Mobile viewport height fix
│   ├── useGoshiwonEvents.ts       # Random atmospheric interruptions
│   ├── useNightProgression.ts     # UI darkening over time
│   ├── useLessonHistory.ts        # Conversation save/load/delete
│   └── useApiKey.ts               # BYOK API key management
├── lib/
│   ├── system-prompt.ts           # Moon-jo's character definition
│   ├── gamification.ts            # XP values, rank definitions
│   ├── srs.ts                     # SM-2 spaced repetition
│   ├── quiz-generator.ts          # MCQ generator
│   ├── daily-planner.ts           # Today's Focus + daily quotes
│   ├── data-backup.ts             # JSON export/import
│   ├── hangul-compose.ts          # Jamo → syllable engine
│   ├── mood-engine.ts             # Hangul ratio → mood level
│   ├── parse-vocabulary.ts        # Extract vocab from bold patterns
│   ├── lesson-topics.ts           # 7 lessons with rank gates
│   ├── format-message.ts          # Bold/strikethrough tokenizer
│   ├── goshiwon-events.ts         # 15 atmospheric events
│   ├── security.ts                # Rate limiting, validation
│   ├── ai-model.ts                # BYOK Gemini model factory
│   ├── tutorial-steps.ts          # Tutorial step definitions
│   ├── timestamps.ts              # 1–3 AM timestamp generator
│   └── message-utils.ts           # UIMessage text extraction
├── types/
│   └── index.ts                   # TypeScript interfaces
└── middleware.ts                   # Security headers

public/
├── sw.js                          # Service worker (offline caching)
└── icon.svg                       # PWA app icon
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm test` | Run all tests |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run lint` | ESLint check |

---

## License

MIT

---

<div align="center">

*"You don't have to stay... but you want to, don't you?"*<br>
— Seo Moon-jo, Room 203

</div>
