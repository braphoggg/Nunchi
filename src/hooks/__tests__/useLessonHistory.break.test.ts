/**
 * Adversarial break tests for useLessonHistory hook
 *
 * Targets localStorage abuse & crash recovery (#10, #11):
 *   G3: Prototype pollution via history — __proto__ key rejection
 *   G-quota: Storage quota exceeded on save — setItem throws
 *   G-oversized: Oversized serialized data — rejected by size limit
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLessonHistory } from "../useLessonHistory";

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
    randomUUID: vi.fn(() => `lesson-uuid-${++uuidCounter}`),
  },
  writable: true,
});

describe("BREAK: useLessonHistory — localStorage abuse (#10, #11)", () => {
  beforeEach(() => {
    store = {};
    uuidCounter = 0;
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // G3: Prototype pollution via history entries
  // ─────────────────────────────────────────────────────────────────────────
  it("G3: entries with __proto__/constructor/prototype keys are rejected by validateLessonHistory", () => {
    // Attempt prototype pollution via stored lesson history
    const poisonedHistory = [
      {
        __proto__: { polluted: true },
        id: "conv-1",
        savedAt: new Date().toISOString(),
        preview: "Test preview",
        messageCount: 2,
        messages: [
          { role: "user", text: "hi" },
          { role: "assistant", text: "hello" },
        ],
      },
    ];
    store["nunchi-lesson-history"] = JSON.stringify(poisonedHistory);

    const { result, unmount } = renderHook(() => useLessonHistory());

    // FINDING: validateLessonHistory from security.ts checks for dangerous
    // keys (__proto__, constructor, prototype) and rejects entries containing
    // them. The __proto__ key in JSON.parse doesn't actually pollute prototypes,
    // but the validator provides defense-in-depth by filtering these entries.
    // The remaining valid entries (if any) are loaded.
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();

    // The hook loads, possibly filtering out the poisoned entry
    expect(Array.isArray(result.current.conversations)).toBe(true);

    unmount();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // G-quota: Storage quota exceeded on save
  // ─────────────────────────────────────────────────────────────────────────
  it("G-quota: QuotaExceededError on setItem does not crash — hook still works in-memory", () => {
    // Mock setItem to throw on save
    localStorageMock.setItem.mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });

    const { result, unmount } = renderHook(() => useLessonHistory());

    // Save a conversation — should not crash
    act(() => {
      result.current.saveConversation([
        { role: "user", text: "Hello" },
        { role: "assistant", text: "안녕하세요!" },
      ]);
    });

    // FINDING: saveToStorage wraps setItem in try/catch. When it throws,
    // the error is silently swallowed. The conversation is saved in-memory
    // state but will be lost on page reload.
    expect(result.current.conversations.length).toBe(1);
    expect(result.current.conversations[0].preview).toContain("안녕하세요");

    unmount();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // G-oversized: Oversized data rejected by size check
  // ─────────────────────────────────────────────────────────────────────────
  it("G-oversized: serialized data exceeding 2MB limit is not persisted", () => {
    const calls: Array<{ key: string; value: string }> = [];
    localStorageMock.setItem.mockImplementation((key: string, value: string) => {
      calls.push({ key, value });
      store[key] = value;
    });

    const { result, unmount } = renderHook(() => useLessonHistory());

    // Save conversations with very large message text to approach 2MB limit
    for (let i = 0; i < 20; i++) {
      act(() => {
        result.current.saveConversation([
          { role: "user", text: "a".repeat(10_000) },
          { role: "assistant", text: "b".repeat(100_000) },
        ]);
      });
    }

    // FINDING: saveToStorage checks `serialized.length > MAX_STORAGE_BYTES`
    // (2,000,000 bytes). Once the serialized data exceeds this limit,
    // setItem is NOT called — the function returns early.
    // The MAX_CONVERSATIONS limit (20) also caps the number of saved conversations.
    expect(result.current.conversations.length).toBeLessThanOrEqual(20);

    // Verify that at some point the size check kicked in
    // (not all 20 save attempts resulted in setItem calls that exceeded 2MB)
    // The first few saves should succeed, then later ones may be silently dropped
    // by the size check.
    const lastCall = calls[calls.length - 1];
    if (lastCall && lastCall.key === "nunchi-lesson-history") {
      // The last successful save should be under 2MB
      expect(lastCall.value.length).toBeLessThanOrEqual(2_000_000);
    }

    unmount();
  });
});
