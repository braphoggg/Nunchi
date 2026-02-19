# QA Test Plan — Nunchi (Room 203 · Korean with Moon-jo)

**Version:** 1.0
**Date:** 2026-02-19
**Author:** Senior QA Automation Engineer
**Repository:** github.com/braphoggg/Nunchi
**Stack:** Next.js 16 · React 19 · TypeScript 5.9 · Tailwind CSS v4 · Vitest 4.0.18

---

## 1. Full Test Strategy

### 1.1 Scope

**In-Scope:**
- All client-side components (17 components in `src/components/`)
- All custom hooks (7 hooks in `src/hooks/`)
- All utility libraries (11 modules in `src/lib/`)
- All API routes (3 routes: `/api/chat`, `/api/translate`, `/api/vocabulary-translate`)
- localStorage persistence layer (3 keys: `nunchi-vocabulary`, `nunchi-gamification`, `nunchi-lesson-history`)
- Input validation and sanitization (`security.ts`)
- Hangul composition engine (`hangul-compose.ts`)
- Gamification logic (XP, streaks, ranks, mood engine)
- UI overlay mutual exclusion and Escape key priority chain
- Accessibility (ARIA labels, keyboard navigation)

**Out-of-Scope:**
- Ollama LLM model quality/accuracy (third-party dependency)
- Browser-specific rendering (CSS visual regression)
- Network infrastructure / hosting configuration
- Mobile native features (PWA, push notifications — not implemented)

### 1.2 Assumptions

- Ollama is running locally at `localhost:11434` with `exaone3.5:7.8b` model loaded
- Node.js 18+ is available
- Tests run in jsdom environment (Vitest default)
- AI SDK responses are mocked in all unit/integration tests
- localStorage is mocked in hook tests
- No real browser is required for unit/integration tests

### 1.3 Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Ollama unavailable | Chat/translate broken | Medium | Graceful error handling; tested with mocked SDK |
| localStorage quota exceeded | Data loss | Low | Silent fallback with in-memory state; tested |
| localStorage corruption | App crash on load | Medium | Validation + recovery for all 3 storage keys; tested |
| html-to-image fails in some browsers | PNG export blank | Medium | try/catch with user-facing error; fixed off-screen rendering |
| React strict mode double-invocation | Duplicate side effects | Medium | useRef pattern in HangulKeyboard; tested |
| Rate limiter is in-memory only | Resets on server restart | Low | Acceptable for single-instance deployment |

### 1.4 Test Levels

| Level | Tool | Purpose | Count |
|-------|------|---------|-------|
| **Unit** | Vitest + jsdom | Pure functions, hooks, isolated components | ~400 |
| **Integration** | Vitest + RTL | Component interactions, API routes with mocked SDK | ~97 |
| **E2E (Manual)** | Chrome browser via MCP | Full user flows, visual verification | ~20 scenarios |
| **Smoke** | `npx vitest run` | Pre-deploy sanity check | All 497 tests |
| **Regression** | `npx vitest run` on every PR | Prevent regressions | All 497 tests |

### 1.5 Environments

| Environment | Purpose | Configuration |
|-------------|---------|---------------|
| **Local dev** | Development + unit/integration tests | `npm run dev` + `ollama serve` |
| **CI (GitHub Actions)** | Automated test execution on PR | jsdom, no Ollama needed (mocked) |
| **Staging** | Manual E2E verification | Full stack with Ollama |
| **Production** | Live deployment | Vercel + Ollama endpoint |

### 1.6 Test Data Strategy

- **Mocked AI responses:** Static strings for deterministic tests
- **localStorage fixtures:** JSON objects matching `SavedConversation[]`, `VocabularyItem[]`, `GamificationData`
- **Corrupted data fixtures:** Invalid JSON, malformed objects, HTML-injected strings, oversized payloads
- **Korean text fixtures:** Real Korean sentences for Hangul composition, mood engine, and translation tests
- **Boundary values:** Empty arrays, max-length strings (2000 chars), 50-message conversations, 5000-word vocabulary, 20 saved lessons

### 1.7 CI/CD Integration Strategy

- Run full test suite on every PR and push to main
- Fail merge if any test fails
- Generate coverage report as PR comment
- Cache `node_modules` for faster runs

---

## 2. Feature Breakdown & Test Coverage Matrix

| # | Feature | Test Types | Priority | Risk | Automation | Test File(s) |
|---|---------|-----------|----------|------|------------|-------------|
| 1 | Conversational AI flow | Unit, Integration | P1 | High | Yes | `chat/route.test.ts` |
| 2 | Translation system | Unit, Integration | P1 | High | Yes | `translate/route.test.ts` |
| 3 | Vocabulary saving | Unit, Integration | P1 | Medium | Yes | `useVocabulary.test.ts`, `VocabularyPanel.test.tsx` |
| 4 | Vocabulary translation API | Unit, Integration | P2 | Medium | Yes | `vocabulary-translate/route.test.ts` |
| 5 | Flashcard study mode | Unit, Integration | P1 | Medium | Yes | `useFlashcards.test.ts`, `FlashcardMode.test.tsx` |
| 6 | XP system | Unit | P1 | Medium | Yes | `gamification.test.ts`, `useGamification.test.ts` |
| 7 | Streak tracking | Unit | P2 | Low | Yes | `gamification.test.ts`, `useGamification.test.ts` |
| 8 | Rank progression | Unit | P2 | Low | Yes | `gamification.test.ts` |
| 9 | Mood engine | Unit | P3 | Low | Yes | `mood-engine.test.ts` |
| 10 | localStorage persistence | Unit, Integration | P1 | High | Yes | `useVocabulary.test.ts`, `useGamification.test.ts`, `useLessonHistory.test.ts` |
| 11 | Hangul keyboard (composition) | Unit | P1 | High | Yes | `hangul-compose.test.ts` |
| 12 | Hangul keyboard (UI) | Integration | P1 | Medium | Yes | `HangulKeyboard.test.tsx` |
| 13 | Lesson history | Unit, Integration | P2 | Medium | Yes | `useLessonHistory.test.ts`, `LessonHistory.test.tsx` |
| 14 | Lesson review | Integration | P3 | Low | Yes | `LessonReview.test.tsx` |
| 15 | Export as image (Share) | Integration | P2 | High | Yes | `ShareButton.test.tsx` |
| 16 | Goshiwon atmospheric events | Unit, Integration | P4 | Low | Yes | `goshiwon-events.test.ts`, `GoshiwonEventBubble.test.tsx` |
| 17 | Night progression | Unit | P4 | Low | Yes | `useNightProgression.test.ts` |
| 18 | Sound engine | Unit | P4 | Low | Yes | `useSoundEngine.test.ts` |
| 19 | System prompt generation | Unit | P2 | Medium | Yes | `system-prompt.test.ts` |
| 20 | Message formatting | Unit | P2 | Low | Yes | `format-message.test.ts` |
| 21 | Message text extraction | Unit | P3 | Low | Yes | `message-utils.test.ts` |
| 22 | Input validation & sanitization | Unit | P1 | High | Yes | `security.test.ts` |
| 23 | Rate limiting | Unit | P1 | High | Yes | `security.test.ts` |
| 24 | Parse vocabulary from AI | Unit | P2 | Medium | Yes | `parse-vocabulary.test.ts` |
| 25 | Timestamps | Unit | P4 | Low | Yes | `timestamps.test.ts` |
| 26 | Lesson topic selection | Unit | P3 | Low | Yes | `lesson-topics.test.ts` |
| 27 | UI overlays / Escape chain | E2E | P1 | Medium | Manual | Browser testing |
| 28 | TopBar (controls) | Integration | P2 | Low | Yes | `TopBar.test.tsx` |
| 29 | ChatInput | Integration | P2 | Low | Yes | `ChatInput.test.tsx` |
| 30 | MessageBubble | Integration | P1 | Medium | Yes | `MessageBubble.test.tsx` |
| 31 | StatsBar / StatsPanel | Integration | P3 | Low | Yes | `StatsBar.test.tsx`, `StatsPanel.test.tsx` |
| 32 | WelcomeScreen | Integration | P3 | Low | Yes | `WelcomeScreen.test.tsx` |
| 33 | XPToast | Integration | P3 | Low | Yes | `XPToast.test.tsx` |
| 34 | TypingIndicator | Integration | P4 | Low | Yes | `TypingIndicator.test.tsx` |
| 35 | HelpModal | Integration | P3 | Low | Yes | `HelpModal.test.tsx` |
| 36 | Error handling (API) | Unit | P1 | High | Yes | All route tests |
| 37 | Error handling (UI) | E2E | P2 | Medium | Manual | Browser testing |

---

## 3. Detailed Manual Test Cases

### Conversational AI Flow

| ID | Title | Preconditions | Steps | Expected Result | Priority | Type |
|----|-------|--------------|-------|-----------------|----------|------|
| TC-001 | First message via topic selection | App loaded, welcome screen visible | 1. Click "Survival Phrases" topic card | Welcome screen fades, Moon-jo responds in character, typing indicator shown during streaming | P1 | Functional |
| TC-002 | Send Korean message for XP | Active conversation | 1. Type "안녕하세요" 2. Press Enter | Message appears right-aligned, XP toast shows 5-15 XP gain, Moon-jo responds | P1 | Functional |
| TC-003 | Send English message with Korean hint | Active conversation | 1. Type "Hello" 2. Press Enter | Message sent, "Write in Korean to earn XP" hint appears briefly | P2 | Functional |
| TC-004 | Message exceeds 2000 char limit | Active conversation | 1. Paste 2001+ characters 2. Press Enter | API returns 400, error banner shown | P2 | Boundary |
| TC-005 | Empty message submission | Active conversation | 1. Press Enter with empty input | Nothing happens, no API call made | P3 | Negative |
| TC-006 | Send message while streaming | Moon-jo is responding | 1. Type message 2. Press Enter | Submit is blocked until streaming completes | P2 | Edge |
| TC-007 | API error during chat | Ollama is stopped | 1. Send any message | Error banner: "Something went wrong" with dismiss button | P1 | Failure |

### Translation System

| ID | Title | Preconditions | Steps | Expected Result | Priority | Type |
|----|-------|--------------|-------|-----------------|----------|------|
| TC-008 | Translate assistant message | Conversation with Korean text | 1. Click 🌐 globe icon below message | Korean text replaced with English translation, icon turns yellow | P1 | Functional |
| TC-009 | Toggle translation back | Message is translated | 1. Click 🌐 again | Original Korean text restored | P1 | Functional |
| TC-010 | Translation caching | Previously translated message | 1. Toggle translation off 2. Toggle on again | Instant display (no loading), no duplicate API call | P2 | Functional |
| TC-011 | Translation API failure | Ollama stopped | 1. Click translate icon | Error state shown, original text preserved | P2 | Failure |

### Vocabulary & Flashcards

| ID | Title | Preconditions | Steps | Expected Result | Priority | Type |
|----|-------|--------------|-------|-----------------|----------|------|
| TC-012 | Save vocabulary word | Message with yellow Korean word | 1. Click bookmark icon next to word | Word saved, XP toast (+3 XP), vocab count badge increments | P1 | Functional |
| TC-013 | Duplicate word prevention | Word already saved | 1. Click bookmark on same word again | No duplicate added, count unchanged | P2 | Edge |
| TC-014 | Open vocabulary panel | Words saved | 1. Click book icon in TopBar | Panel slides in with all saved words, romanization, English | P1 | Functional |
| TC-015 | Remove word from vocabulary | Panel open with words | 1. Click trash icon on word | Word removed from list and localStorage | P2 | Functional |
| TC-016 | Start flashcard study | 2+ words saved, panel open | 1. Click "Study" button | Flashcard mode opens, first card shown face-down | P1 | Functional |
| TC-017 | Flip flashcard | Flashcard shown | 1. Click card | Card flips to reveal English translation | P1 | Functional |
| TC-018 | Self-assess flashcard | Card flipped | 1. Click "Know it" or "Still learning" | Next card shown, progress indicator updates | P1 | Functional |
| TC-019 | Perfect flashcard session | All cards assessed "Know it" | Complete all cards with "Know it" | Session complete, +20 XP base + 10 XP bonus, toast shown | P1 | Functional |
| TC-020 | Flashcard with < 2 words | 0-1 words saved | 1. Open vocab panel | Study button disabled or hidden | P3 | Boundary |

### Gamification (XP, Streaks, Ranks)

| ID | Title | Preconditions | Steps | Expected Result | Priority | Type |
|----|-------|--------------|-------|-----------------|----------|------|
| TC-021 | XP accumulation | Fresh start (0 XP) | 1. Send Korean message 2. Save word 3. Complete flashcards | XP increases after each action, totals shown in StatsBar | P1 | Functional |
| TC-022 | Rank promotion | Close to rank threshold | 1. Earn enough XP + vocab to cross threshold | Rank-up notification: "Moon-jo nods slowly" with Korean/English message | P1 | Functional |
| TC-023 | Streak increment | No activity today | 1. Send first message of the day | Streak counter increments by 1, shown in StatsBar | P2 | Functional |
| TC-024 | Streak persistence across sessions | Active streak | 1. Close app 2. Reopen next day 3. Send message | Streak maintained if within 24h window | P2 | Functional |
| TC-025 | Stats panel display | Some activity completed | 1. Click StatsBar to open StatsPanel | All stats accurate: XP, streak, rank, vocab count, sessions | P2 | Functional |
| TC-026 | Anti-tamper: localStorage XP manipulation | Active session | 1. Open DevTools 2. Edit nunchi-gamification XP to 999999 3. Reload | Validation catches anomalies, data sanitized or rejected | P1 | Security |

### Hangul Keyboard

| ID | Title | Preconditions | Steps | Expected Result | Priority | Type |
|----|-------|--------------|-------|-----------------|----------|------|
| TC-027 | Toggle keyboard visibility | Chat active | 1. Click ㄱ button next to input | Keyboard slides up with animation, all jamo keys visible | P1 | Functional |
| TC-028 | Compose basic syllable (한) | Keyboard visible | 1. Tap ㅎ 2. Tap ㅏ 3. Tap ㄴ | Preview shows composition in real-time: ㅎ→하→한 | P1 | Functional |
| TC-029 | Multi-syllable word (한글) | Keyboard visible | 1. Tap ㅎ ㅏ ㄴ ㄱ ㅡ ㄹ | "한글" composed correctly, final detachment works | P1 | Functional |
| TC-030 | Complex vowel (과) | Keyboard visible | 1. Tap ㄱ ㅗ ㅏ | ㅗ+ㅏ=ㅘ, result: 과 | P2 | Functional |
| TC-031 | Shift for double consonants | Keyboard visible | 1. Tap ⇧ 2. Tap ㅃ | Double consonant entered, shift auto-deactivates | P2 | Functional |
| TC-032 | Backspace decomposition | "한" composing | 1. Tap ⌫ | 한→하 (removes final), tap again: 하→ㅎ, tap again: empty | P1 | Functional |
| TC-033 | Space commits + inserts space | "하" composing | 1. Tap space | "하 " inserted into input field | P2 | Functional |
| TC-034 | Enter commits + submits | "한" composing | 1. Tap ↵ | "한" committed, message sent to chat | P1 | Functional |
| TC-035 | Physical keyboard alongside virtual | Keyboard visible | 1. Type with physical keyboard | Physical input works normally, doesn't interfere with composition | P2 | Edge |
| TC-036 | Escape dismisses keyboard | Keyboard visible, no other overlays | 1. Press Escape | Keyboard closes | P2 | Functional |

### Lesson History

| ID | Title | Preconditions | Steps | Expected Result | Priority | Type |
|----|-------|--------------|-------|-----------------|----------|------|
| TC-037 | Auto-save on Leave | Active conversation with messages | 1. Click "Leave" 2. Confirm "Leave" | Conversation saved to history with timestamp, preview, message count | P1 | Functional |
| TC-038 | View history list | Saved conversations exist | 1. Click clock icon in TopBar | History panel opens with list of saved lessons, newest first | P1 | Functional |
| TC-039 | Review saved conversation | History panel open | 1. Click a saved conversation | Full read-only message view with 서문조 labels and styling | P1 | Functional |
| TC-040 | Delete saved conversation | History panel open | 1. Click trash icon on conversation | Conversation removed from list and localStorage | P2 | Functional |
| TC-041 | FIFO enforcement (max 20) | 20 conversations saved | 1. Complete and leave 21st conversation | Oldest conversation dropped, newest added | P2 | Boundary |
| TC-042 | Empty history state | No saved conversations | 1. Open history panel | "No saved lessons yet" empty state shown | P3 | UI |

### Share as Image

| ID | Title | Preconditions | Steps | Expected Result | Priority | Type |
|----|-------|--------------|-------|-----------------|----------|------|
| TC-043 | Export conversation as PNG | Active conversation with messages | 1. Click share icon in TopBar | PNG downloads with filename `room-203-YYYY-MM-DD.png`, contains header + messages + footer | P1 | Functional |
| TC-044 | PNG visual fidelity | Exported PNG | 1. Open downloaded PNG | Dark theme, branded header, assistant/user bubbles styled correctly, Korean text renders, gold vocabulary highlights | P1 | Functional |
| TC-045 | Share disabled when no messages | Welcome screen (no messages) | Observe share button | Share button hidden or disabled | P3 | Edge |
| TC-046 | Double-click prevention during export | Export in progress | 1. Click share again | Second click ignored, no duplicate downloads | P3 | Edge |

### Overlay Mutual Exclusion & Escape Chain

| ID | Title | Preconditions | Steps | Expected Result | Priority | Type |
|----|-------|--------------|-------|-----------------|----------|------|
| TC-047 | Escape priority: help → history → stats → flashcard → vocab → keyboard | All overlays openable | Open each overlay, press Escape for each | Closes in priority order: help first, keyboard last | P1 | Functional |
| TC-048 | Opening one overlay closes others | Stats panel open | 1. Click vocabulary icon | Stats closes, vocabulary opens | P2 | Functional |
| TC-049 | History review → Escape → history list | Reviewing a conversation | 1. Press Escape | Returns to history list (not close everything) | P2 | Functional |
| TC-050 | Leave confirmation → Escape | Leave confirmation banner showing | 1. Press Escape | Confirmation dismissed, stay in conversation | P2 | Functional |

### Security & Input Validation

| ID | Title | Preconditions | Steps | Expected Result | Priority | Type |
|----|-------|--------------|-------|-----------------|----------|------|
| TC-051 | XSS in chat input | Active conversation | 1. Type `<script>alert('xss')</script>` 2. Send | Tags stripped by sanitizeTextInput, no script execution | P1 | Security |
| TC-052 | HTML injection in vocabulary | Message with bold Korean word | 1. Save word containing HTML | HTML tags stripped before storage | P1 | Security |
| TC-053 | Rate limiting (10 req/min) | Chat active | 1. Send 11 messages rapidly within 60s | 11th request returns 429 Too Many Requests | P1 | Security |
| TC-054 | Corrupted localStorage recovery | App loaded | 1. Set `nunchi-vocabulary` to `"invalid json"` in DevTools 2. Reload | App loads with empty vocabulary, no crash | P1 | Security |
| TC-055 | Prototype pollution in lesson history | App loaded | 1. Inject `__proto__` key into lesson history localStorage 2. Reload | Entry silently rejected by validation | P1 | Security |
| TC-056 | Oversized message payload | Chat active | 1. Send POST to /api/chat with 51 messages | Returns 400: "Too many messages" | P2 | Security |
| TC-057 | Invalid role in message | Direct API call | 1. POST to /api/chat with role "admin" | Returns 400: "Invalid role" | P2 | Security |

### Accessibility

| ID | Title | Preconditions | Steps | Expected Result | Priority | Type |
|----|-------|--------------|-------|-----------------|----------|------|
| TC-058 | Keyboard navigation through TopBar | App loaded | 1. Tab through TopBar buttons | All buttons focusable in logical order | P2 | Accessibility |
| TC-059 | Screen reader labels | App loaded | 1. Inspect ARIA labels | All interactive elements have aria-labels: "Leave Room 203", "Mute sounds", "Close help", "Backspace", etc. | P2 | Accessibility |
| TC-060 | Lesson history keyboard interaction | History panel open | 1. Tab to conversation card 2. Press Enter | Conversation selected (role="button" + onKeyDown handler) | P2 | Accessibility |
| TC-061 | Event bubble keyboard dismiss | Event bubble visible | 1. Focus bubble 2. Press Space or Enter | Event dismissed | P3 | Accessibility |

---

## 4. Automation Plan

### 4.1 Unit Testing

**What should be unit tested:**
- All pure functions in `src/lib/` (11 modules)
- All custom hooks in `src/hooks/` (7 hooks)
- All API route handlers (3 routes)
- Component rendering and interaction (17 components)

**Mocking strategy:**
```typescript
// AI SDK — mock at module level
vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return { ...actual, streamText: vi.fn(), generateText: vi.fn() };
});
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn(() => "mocked-model")),
}));

// localStorage — mock via Object.defineProperty
let store: Record<string, string> = {};
Object.defineProperty(global, "localStorage", {
  value: { getItem: vi.fn(k => store[k] ?? null), setItem: vi.fn((k, v) => { store[k] = v; }), ... }
});

// html-to-image — mock for ShareButton tests
vi.mock("html-to-image", () => ({
  toPng: vi.fn(async () => "data:image/png;base64,fakedata"),
}));
```

**Coverage targets:**
- Statements: ≥90%
- Branches: ≥85%
- Functions: ≥90%
- Lines: ≥90%

**Test file structure:**
```
src/
├── lib/__tests__/
│   ├── format-message.test.ts       (8 tests)
│   ├── gamification.test.ts         (40 tests)
│   ├── goshiwon-events.test.ts      (3 tests)
│   ├── hangul-compose.test.ts       (34 tests)
│   ├── lesson-topics.test.ts        (6 tests)
│   ├── message-utils.test.ts        (5 tests)   ← NEW
│   ├── mood-engine.test.ts          (14 tests)
│   ├── parse-vocabulary.test.ts     (47 tests)
│   ├── security.test.ts             (30 tests)
│   ├── system-prompt.test.ts        (7 tests)
│   └── timestamps.test.ts           (5 tests)
├── hooks/__tests__/
│   ├── useFlashcards.test.ts        (20 tests)
│   ├── useGamification.test.ts      (6 tests)
│   ├── useGoshiwonEvents.test.ts    (1 test)
│   ├── useLessonHistory.test.ts     (24 tests)  ← NEW
│   ├── useNightProgression.test.ts  (13 tests)
│   ├── useSoundEngine.test.ts       (5 tests)
│   └── useVocabulary.test.ts        (20 tests)
├── components/__tests__/
│   ├── ChatInput.test.tsx           (10 tests)
│   ├── FlashcardMode.test.tsx       (20 tests)
│   ├── GoshiwonEventBubble.test.tsx (7 tests)   ← NEW
│   ├── HangulKeyboard.test.tsx      (15 tests)  ← NEW
│   ├── HelpModal.test.tsx           (8 tests)   ← NEW
│   ├── LessonHistory.test.tsx       (11 tests)  ← NEW
│   ├── LessonReview.test.tsx        (8 tests)   ← NEW
│   ├── MessageBubble.test.tsx       (29 tests)
│   ├── ShareButton.test.tsx         (6 tests)   ← NEW
│   ├── StatsBar.test.tsx            (9 tests)
│   ├── StatsPanel.test.tsx          (6 tests)
│   ├── TopBar.test.tsx              (16 tests)
│   ├── TypingIndicator.test.tsx     (3 tests)
│   ├── VocabularyPanel.test.tsx     (18 tests)
│   ├── WelcomeScreen.test.tsx       (10 tests)
│   └── XPToast.test.tsx             (4 tests)
└── app/api/
    ├── chat/__tests__/route.test.ts              (7 tests)
    ├── translate/__tests__/route.test.ts         (7 tests)
    └── vocabulary-translate/__tests__/route.test.ts (15 tests) ← NEW
```

### 4.2 Integration Testing

**API mocking approach:**
- Mock `@ai-sdk/openai` `createOpenAI` to return a mock model factory
- Mock `ai` module's `streamText`/`generateText` to return controlled responses
- Test full request→validation→mock-LLM→response pipeline
- Verify error codes (400, 429, 500) for each failure mode

**Streaming response validation (chat route):**
```typescript
vi.mocked(streamText).mockReturnValue({
  toUIMessageStreamResponse: vi.fn(() => new Response("streamed", { status: 200 })),
});
```

**Translation verification:**
```typescript
vi.mocked(generateText).mockResolvedValue({ text: "1. hello\n2. thank you" });
// Assert parsed translations map: { "안녕하세요": "hello", "감사합니다": "thank you" }
```

### 4.3 E2E Testing

**Critical flows (manual, documented above as TC-001 through TC-061):**

1. First lesson completion: Topic select → 3 messages → vocabulary save → Leave
2. XP increment verification: Korean message → toast → StatsBar update
3. Streak rollover: Send message → close → reopen next day → verify streak
4. Vocabulary save + flashcard cycle: Save 3 words → Study → complete → XP
5. Export validation: Conversation → share → verify PNG content
6. Hangul composition: ㅎ+ㅏ+ㄴ+ㄱ+ㅡ+ㄹ → "한글" in input → submit
7. Overlay exclusion: Open stats → click vocab → stats closes, vocab opens
8. Escape chain: Open each overlay → Escape through priority order

**Suggested E2E framework (future):**
```
e2e/
├── playwright.config.ts
├── fixtures/
│   └── setup.ts                    # Launch dev server, seed localStorage
├── smoke/
│   ├── app-loads.spec.ts          # @smoke
│   └── topic-select.spec.ts      # @smoke
├── features/
│   ├── conversation.spec.ts      # @regression
│   ├── vocabulary.spec.ts        # @regression
│   ├── flashcards.spec.ts        # @regression
│   ├── hangul-keyboard.spec.ts   # @regression
│   ├── lesson-history.spec.ts    # @regression
│   ├── share-image.spec.ts       # @regression
│   └── gamification.spec.ts      # @regression
└── security/
    ├── xss-prevention.spec.ts    # @security
    └── rate-limiting.spec.ts     # @security
```

**Test naming convention:** `[feature].[scenario].spec.ts`
**Tagging strategy:** `@smoke` (5 min), `@regression` (15 min), `@security` (5 min)

---

## 5. Non-Functional Testing

### 5.1 Performance

| Test | Target | Method |
|------|--------|--------|
| Initial page load | < 3s on 3G | Lighthouse performance audit |
| Time to interactive | < 2s on cable | Lighthouse TTI |
| Bundle size (JS) | < 200KB gzipped | `next build` output analysis |
| Message render (100 messages) | No visible jank | Manual scroll test |
| Hangul composition latency | < 16ms per keystroke | Performance.now() in test |
| PNG export time | < 3s for 20 messages | Timed in ShareButton |
| localStorage read/write | < 50ms for 2MB payload | Performance benchmark |

### 5.2 Load

| Test | Scenario | Expected |
|------|----------|----------|
| Rapid message sending | 10 messages in 10 seconds | Rate limiter triggers at 11th, no UI crash |
| Large vocabulary | 5000 words in localStorage | Panel opens without delay, search responsive |
| Large lesson history | 20 conversations × 100 messages | History list renders without delay |
| Concurrent translations | Click translate on 5 messages quickly | All resolve correctly, no race conditions |

### 5.3 UI Responsiveness

| Viewport | Test | Expected |
|----------|------|----------|
| Desktop (1280px) | Full app | Centered max-width container, all features accessible |
| Tablet (768px) | Keyboard, panels | Panels fill width, keyboard keys touch-friendly (≥36px) |
| Mobile (375px) | Full flow | All overlays stack correctly, input accessible |

### 5.4 Accessibility (WCAG 2.1 AA)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Keyboard navigation | ✅ Implemented | All interactive elements focusable via Tab |
| ARIA labels | ✅ Implemented | All buttons have aria-label attributes |
| Color contrast | ⚠️ Needs audit | Dark theme may have contrast issues on muted text |
| Focus indicators | ⚠️ Needs audit | Tailwind default focus rings may be insufficient |
| Screen reader support | ✅ Partial | role="button" on lesson cards, aria-labels on icons |
| Reduced motion | ❌ Not implemented | Animations don't respect `prefers-reduced-motion` |

### 5.5 Security

| Vector | Test | Status |
|--------|------|--------|
| XSS via chat input | HTML tags stripped by `sanitizeTextInput()` | ✅ Tested (security.test.ts) |
| XSS via vocabulary | HTML stripped before localStorage save | ✅ Tested (useVocabulary.test.ts) |
| XSS via lesson history | HTML stripped in `validateLessonHistory()` | ✅ Tested (security.test.ts) |
| Prototype pollution | `__proto__`, `constructor` checked in validation | ✅ Tested (security.test.ts) |
| Rate limiting bypass | In-memory per-IP, 10 req/min | ✅ Tested (security.test.ts, route tests) |
| localStorage tampering | Full validation + sanitization on load | ✅ Tested (all hook tests) |
| Oversized payloads | MAX_MESSAGES=50, MAX_CONTENT_LENGTH=2000 | ✅ Tested (route tests) |
| Invalid message roles | Only "user", "assistant", "system" accepted | ✅ Tested (chat/route.test.ts) |

### 5.6 Data Persistence Reliability

| Scenario | Expected | Tested |
|----------|----------|--------|
| Normal save/load cycle | Data persists across page reloads | ✅ |
| Corrupted JSON in localStorage | Graceful fallback to empty state | ✅ |
| Non-array data where array expected | Rejected, empty state | ✅ |
| Malformed entries in valid array | Invalid entries silently skipped | ✅ |
| localStorage quota exceeded | Operation fails silently, in-memory state preserved | ✅ |
| localStorage unavailable (private browsing) | getItem throws, caught gracefully | ✅ |
| 2MB size limit on lesson history | Oversized writes silently skipped | ✅ |

---

## 6. CI/CD Integration Plan

### 6.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Run tests with coverage
        run: npx vitest run --coverage --reporter=json --outputFile=test-results.json

      - name: Check coverage thresholds
        run: |
          npx vitest run --coverage --coverage.thresholds.statements=90 \
            --coverage.thresholds.branches=85 \
            --coverage.thresholds.functions=90 \
            --coverage.thresholds.lines=90

      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report-node${{ matrix.node-version }}
          path: coverage/

      - name: Build
        run: npm run build

  comment-coverage:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: coverage-report-node20
      - name: Comment coverage on PR
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: coverage/coverage-summary.json
```

### 6.2 Parallelization Strategy

- Vitest runs tests in parallel by default (worker pool)
- Matrix strategy tests across Node 18/20/22 in parallel
- Type check, lint, and test can run as parallel jobs if desired
- Future: Playwright E2E tests as separate job with `--shard` flag

### 6.3 Test Gating Strategy

| Gate | Condition | Action |
|------|-----------|--------|
| PR merge | All tests pass | Block merge if any test fails |
| PR merge | Coverage ≥ thresholds | Block merge if coverage drops |
| PR merge | TypeScript compiles | Block if type errors |
| PR merge | Lint passes | Block if lint errors |
| Deploy to staging | All above + build succeeds | Auto-deploy on merge to main |
| Deploy to production | Manual approval | After staging verification |

### 6.4 Code Coverage Thresholds

| Metric | Minimum | Target |
|--------|---------|--------|
| Statements | 90% | 95% |
| Branches | 85% | 90% |
| Functions | 90% | 95% |
| Lines | 90% | 95% |

### 6.5 Failure Handling

- Test failures block PR merge
- Flaky tests: Mark with `it.skip` + create tracking issue
- Timeout failures: Increase timeout to 30s for async tests, investigate root cause
- Environment failures: Retry job once via `retry: 1` in workflow

### 6.6 Artifact Storage

| Artifact | When | Retention |
|----------|------|-----------|
| Coverage HTML report | Every test run | 30 days |
| Test results JSON | Every test run | 30 days |
| Playwright screenshots | E2E failures (future) | 14 days |
| Playwright traces | E2E failures (future) | 14 days |
| Build output | On deploy | Until next deploy |

---

## 7. Risk Assessment

### 7.1 Technical Risks

| # | Risk | Severity | Likelihood | Impact | Mitigation |
|---|------|----------|------------|--------|------------|
| R1 | Ollama model unavailable or slow | High | Medium | Chat/translate completely broken | Graceful error UI; timeout after 30s; error banner with retry hint |
| R2 | localStorage corruption from browser extensions | Medium | Low | User loses progress (vocab, XP, history) | Triple-layer validation (parse → validate → sanitize); silent recovery to empty state |
| R3 | html-to-image rendering differences across browsers | Medium | Medium | PNG export blank or garbled | Off-screen wrapper technique; explicit inline styles; fallback error message |
| R4 | React strict mode causes duplicate side effects | High | Low (mitigated) | Hangul keyboard double-commits characters | useRef pattern instead of useState for composition state |
| R5 | In-memory rate limiter resets on deploy | Low | High | Brief window of no rate limiting | Acceptable for educational app; document in ops runbook |
| R6 | Large localStorage payloads slow page load | Medium | Low | Sluggish app start | Size caps: vocab 5000 words, history 20 convos, gamification 1000 XP events |
| R7 | Concurrent localStorage writes from multiple tabs | Medium | Low | Data corruption | Not mitigated — document as known limitation; single-tab usage expected |

### 7.2 Product Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| P1 | LLM generates inappropriate content | High | System prompt constrains Moon-jo character; content is educational |
| P2 | LLM generates incorrect Korean | Medium | Educational tool, not authoritative; vocab parsing validates structure |
| P3 | Users game XP system via localStorage manipulation | Low | Anti-tamper validation; `isReasonableXPRate()` check; educational context makes gaming low-stakes |
| P4 | Accessibility gaps exclude users | Medium | ARIA labels implemented; color contrast audit needed; reduced-motion support needed |

### 7.3 Scalability Concerns

- **Single-instance architecture:** Rate limiter and Ollama are localhost-only. Scaling requires external rate limiter (Redis) and remote LLM endpoint.
- **localStorage limits:** Browser imposes ~5-10MB limit. Current caps (vocab 5000 × ~200 bytes + history 20 × ~10KB + gamification ~50KB) stay well under ~1.5MB total.
- **No server-side persistence:** All user data is client-side. Account sync, cross-device access, or data backup are not supported.

### 7.4 Data Integrity Concerns

- **No backup mechanism:** If user clears browser data, all progress is lost.
- **No migration strategy:** If data schema changes, existing localStorage data may become invalid. Validation rejects and resets, losing user data.
- **Atomic writes not guaranteed:** A crash during `localStorage.setItem` could leave partial data. Validation handles this via parse-or-fallback.

---

## 8. Automation Readiness Improvements

### 8.1 Add `data-testid` Attributes for E2E Selectors

Current state: Tests rely on ARIA labels, text content, and CSS classes. For robust E2E automation, add stable `data-testid` selectors:

```tsx
// ChatContainer.tsx — key interaction points
<TopBar data-testid="top-bar" />
<StatsBar data-testid="stats-bar" />
<ChatInput data-testid="chat-input" />
<HangulKeyboard data-testid="hangul-keyboard" />

// TopBar.tsx — buttons
<button data-testid="btn-leave" aria-label="Leave Room 203">
<button data-testid="btn-mute" aria-label="Mute sounds">
<button data-testid="btn-history" aria-label="View lesson history">
<button data-testid="btn-share" aria-label="Share conversation">
<button data-testid="btn-vocab" aria-label="Open vocabulary list">
<button data-testid="btn-help" aria-label="Help">

// MessageBubble.tsx
<div data-testid={`message-${message.id}`}>
<button data-testid={`btn-translate-${message.id}`}>
<button data-testid={`btn-save-word-${word}`}>

// HangulKeyboard.tsx — keys
<button data-testid={`key-${jamo}`}>
<button data-testid="key-shift">
<button data-testid="key-backspace">
<button data-testid="key-space">
<button data-testid="key-enter">
```

### 8.2 Extract ChatContainer Logic for Testability

`ChatContainer.tsx` (527 lines) is the orchestrator and is currently untested because it wires 7 hooks, 12 components, and 8 overlays. Refactor for testability:

```
src/
├── components/
│   ├── ChatContainer.tsx          # UI rendering only
│   └── ...
├── hooks/
│   ├── useChatOrchestrator.ts     # NEW: All state coordination extracted
│   │   - Escape key priority chain
│   │   - Overlay mutual exclusion
│   │   - Leave confirmation flow
│   │   - Message submission handler
│   │   - Reset conversation handler
│   └── ...
```

This allows testing the orchestration logic via `renderHook()` without rendering the full component tree.

### 8.3 Shared Test Utilities

Create `src/test/factories.ts` for consistent test data:

```typescript
// src/test/factories.ts
import type { UIMessage } from "ai";
import type { SavedConversation, VocabularyItem, GamificationData } from "@/types";

export function createUIMessage(overrides?: Partial<UIMessage>): UIMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2)}`,
    role: "assistant",
    parts: [{ type: "text", text: "안녕하세요" }],
    ...overrides,
  } as UIMessage;
}

export function createSavedConversation(overrides?: Partial<SavedConversation>): SavedConversation {
  return {
    id: `conv-${Math.random().toString(36).slice(2)}`,
    savedAt: new Date().toISOString(),
    preview: "Test conversation preview",
    messageCount: 2,
    messages: [
      { role: "assistant", text: "Hello" },
      { role: "user", text: "Hi" },
    ],
    ...overrides,
  };
}

export function createVocabularyItem(overrides?: Partial<VocabularyItem>): VocabularyItem {
  return {
    id: `word-${Math.random().toString(36).slice(2)}`,
    korean: "문",
    romanization: "mun",
    english: "door",
    savedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    store,
    mock: {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { store = {}; }),
    },
    reset: () => { store = {}; },
  };
}
```

### 8.4 Logging Improvements

Add structured logging for test debugging:

```typescript
// src/lib/logger.ts
const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export function createLogger(module: string) {
  return {
    debug: (msg: string, data?: unknown) =>
      process.env.NODE_ENV !== "production" && console.debug(`[${module}]`, msg, data),
    error: (msg: string, error?: unknown) =>
      console.error(`[${module}]`, msg, error),
  };
}
```

Replace scattered `console.error("[ShareButton]...")` and `console.error("[vocabulary-translate route error]")` with structured logger for consistent filtering in test output.

### 8.5 Test Hooks for Time-Dependent Logic

The gamification system uses `Date.now()` and `new Date().toISOString()` directly. Add injectable time source:

```typescript
// In useGamification or gamification.ts
export const _internal = {
  now: () => Date.now(),
  today: () => new Date().toISOString().slice(0, 10),
};

// In tests
import { _internal } from "@/lib/gamification";
vi.spyOn(_internal, "now").mockReturnValue(1708300800000);
vi.spyOn(_internal, "today").mockReturnValue("2026-02-19");
```

This eliminates flaky date-dependent tests without vi.useFakeTimers() complexity.

---

## Appendix: Current Test Inventory

**37 test files · 497 tests · 100% pass rate**

| Category | Files | Tests |
|----------|-------|-------|
| Libraries (`lib/__tests__/`) | 11 | 199 |
| Hooks (`hooks/__tests__/`) | 7 | 89 |
| Components (`components/__tests__/`) | 16 | 180 |
| API Routes (`app/api/*/__tests__/`) | 3 | 29 |
| **Total** | **37** | **497** |

New test files added in this QA cycle: **9 files, 99 tests**
Previously untested modules covered: **10 of 10 (100%)**
Remaining untested: **ChatContainer.tsx** (orchestrator — tested via child components + manual E2E)
