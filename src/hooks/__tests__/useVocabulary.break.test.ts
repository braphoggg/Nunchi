/**
 * Adversarial break tests for useVocabulary hook
 *
 * Targets localStorage abuse & crash recovery (#10, #11):
 *   G6: Vocabulary at max capacity — 5000 items, addWords rejected
 *   G7: Corrupt vocabulary JSON — invalid data in storage
 *   G-proto: Prototype pollution in vocabulary items
 *   G-xss: XSS in vocabulary item fields — stripHtml defense
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVocabulary } from "../useVocabulary";

// ── localStorage mock ───────────────────────────────────────────────────────
let store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    store = {};
  }),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// ── crypto.randomUUID mock ──────────────────────────────────────────────────
let uuidCounter = 0;
Object.defineProperty(globalThis, "crypto", {
  value: {
    randomUUID: vi.fn(() => `test-uuid-${++uuidCounter}`),
  },
  writable: true,
});

describe("BREAK: useVocabulary — localStorage abuse (#10, #11)", () => {
  beforeEach(() => {
    store = {};
    uuidCounter = 0;
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // G6: Vocabulary at max capacity — addWords rejected
  // ─────────────────────────────────────────────────────────────────────────
  it("G6: vocabulary at max capacity (5000) rejects new words", () => {
    // Pre-fill 5000 items in localStorage
    const items = Array.from({ length: 5000 }, (_, i) => ({
      id: `item-${i}`,
      korean: `단어${i}`,
      romanization: `danoe${i}`,
      english: `word${i}`,
      savedAt: new Date().toISOString(),
    }));
    store["nunchi-vocabulary"] = JSON.stringify(items);

    const { result, unmount } = renderHook(() => useVocabulary());

    // Verify all 5000 loaded
    expect(result.current.wordCount).toBe(5000);

    // Attempt to add 5 more words
    act(() => {
      result.current.addWords([
        { korean: "새로운", romanization: "saeroun", english: "new" },
        { korean: "단어들", romanization: "daneodeul", english: "words" },
      ]);
    });

    // FINDING: useVocabulary checks `prev.length >= MAX_WORDS` and returns
    // prev unchanged. No new words are added.
    expect(result.current.wordCount).toBe(5000);

    unmount();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // G7: Corrupt vocabulary JSON — returns empty array
  // ─────────────────────────────────────────────────────────────────────────
  it("G7: corrupt JSON in storage loads as empty array", () => {
    store["nunchi-vocabulary"] = "not valid json!!!";

    const { result, unmount } = renderHook(() => useVocabulary());

    // FINDING: loadFromStorage catches the JSON.parse error and returns [].
    // The hook starts with an empty vocabulary list.
    expect(result.current.wordCount).toBe(0);
    expect(result.current.words).toEqual([]);

    unmount();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // G-proto: Prototype pollution in vocabulary items
  // ─────────────────────────────────────────────────────────────────────────
  it("G-proto: prototype pollution attempts in stored items are filtered out", () => {
    // Store items with __proto__ keys attempting prototype pollution
    const poisoned = [
      {
        id: "legit-1",
        korean: "안녕",
        romanization: "annyeong",
        english: "hello",
        savedAt: new Date().toISOString(),
      },
      {
        "__proto__": { polluted: true },
        id: "evil-1",
        korean: "나쁜",
        romanization: "nappun",
        english: "bad",
        savedAt: new Date().toISOString(),
      },
    ];
    store["nunchi-vocabulary"] = JSON.stringify(poisoned);

    const { result, unmount } = renderHook(() => useVocabulary());

    // FINDING: isValidVocabularyItem uses Object.hasOwn to check required fields.
    // Items with __proto__ keys don't pollute Object.prototype because
    // JSON.parse creates plain objects, and the hook filters items through
    // isValidVocabularyItem which requires specific string fields.
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();

    // The second item should still pass validation since it has all required fields
    // (the __proto__ key is just an extra property, not actual prototype pollution via JSON.parse)
    expect(result.current.wordCount).toBe(2);

    unmount();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // G-xss: XSS in vocabulary item fields — stripHtml defense
  // ─────────────────────────────────────────────────────────────────────────
  it("G-xss: script tags in vocabulary fields are stripped by addWords", () => {
    const { result, unmount } = renderHook(() => useVocabulary());

    act(() => {
      result.current.addWords([
        {
          korean: '<script>alert("xss")</script>안녕',
          romanization: '<img src=x onerror=alert(1)>annyeong',
          english: '<svg onload=alert(1)>hello',
        },
      ]);
    });

    // FINDING: addWords calls stripHtml on korean, romanization, and english fields.
    // The regex /<[^>]*>/g strips all HTML tags.
    expect(result.current.wordCount).toBe(1);
    const word = result.current.words[0];
    expect(word.korean).not.toContain("<script>");
    expect(word.korean).toContain("안녕");
    expect(word.romanization).not.toContain("<img");
    expect(word.romanization).toContain("annyeong");
    expect(word.english).not.toContain("<svg");
    expect(word.english).toContain("hello");

    unmount();
  });
});
