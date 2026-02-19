import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLessonHistory } from "../useLessonHistory";

// Mock localStorage
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
Object.defineProperty(global, "localStorage", { value: localStorageMock });

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: vi.fn(() => "test-uuid-" + Math.random().toString(36).slice(2)),
  },
});

// Mock security validation — pass through valid data
vi.mock("@/lib/security", () => ({
  validateLessonHistory: vi.fn((data: unknown) => {
    if (!Array.isArray(data)) return null;
    return data;
  }),
}));

describe("useLessonHistory", () => {
  beforeEach(() => {
    store = {};
    vi.clearAllMocks();
  });

  // --- Interface ---

  it("returns the expected interface", () => {
    const { result } = renderHook(() => useLessonHistory());
    expect(Array.isArray(result.current.conversations)).toBe(true);
    expect(typeof result.current.historyOpen).toBe("boolean");
    expect(result.current.reviewingConversation).toBeNull();
    expect(typeof result.current.saveConversation).toBe("function");
    expect(typeof result.current.deleteConversation).toBe("function");
    expect(typeof result.current.toggleHistory).toBe("function");
    expect(typeof result.current.closeHistory).toBe("function");
    expect(typeof result.current.reviewConversation).toBe("function");
    expect(typeof result.current.closeReview).toBe("function");
  });

  // --- Initial state ---

  it("starts with empty conversations when localStorage is empty", () => {
    const { result } = renderHook(() => useLessonHistory());
    expect(result.current.conversations).toEqual([]);
  });

  it("starts with historyOpen false", () => {
    const { result } = renderHook(() => useLessonHistory());
    expect(result.current.historyOpen).toBe(false);
  });

  // --- Load from localStorage ---

  it("loads existing conversations from localStorage", () => {
    const saved = [
      {
        id: "conv-1",
        savedAt: "2026-01-01T00:00:00.000Z",
        preview: "Hello",
        messageCount: 2,
        messages: [
          { role: "assistant", text: "Hello" },
          { role: "user", text: "Hi" },
        ],
      },
    ];
    store["nunchi-lesson-history"] = JSON.stringify(saved);

    const { result } = renderHook(() => useLessonHistory());
    expect(result.current.conversations).toEqual(saved);
  });

  it("handles corrupted localStorage gracefully", () => {
    store["nunchi-lesson-history"] = "not valid json {{{";
    const { result } = renderHook(() => useLessonHistory());
    expect(result.current.conversations).toEqual([]);
  });

  // --- saveConversation ---

  it("saves a conversation with generated id, timestamp, and preview", () => {
    const { result } = renderHook(() => useLessonHistory());
    act(() => {
      result.current.saveConversation([
        { role: "user", text: "Hello" },
        { role: "assistant", text: "Welcome to Room 203, my new neighbor." },
      ]);
    });
    expect(result.current.conversations).toHaveLength(1);
    const conv = result.current.conversations[0];
    expect(conv.id).toBeTruthy();
    expect(conv.savedAt).toBeTruthy();
    expect(conv.messageCount).toBe(2);
    expect(conv.messages).toHaveLength(2);
  });

  it("generates preview from first assistant message", () => {
    const { result } = renderHook(() => useLessonHistory());
    act(() => {
      result.current.saveConversation([
        { role: "user", text: "Hi" },
        { role: "assistant", text: "Welcome to Room 203, my new neighbor." },
      ]);
    });
    expect(result.current.conversations[0].preview).toContain("Welcome to Room 203");
  });

  it("generates preview from first user message when no assistant messages", () => {
    const { result } = renderHook(() => useLessonHistory());
    act(() => {
      result.current.saveConversation([
        { role: "user", text: "This is a user-only conversation test." },
      ]);
    });
    expect(result.current.conversations[0].preview).toContain("This is a user-only");
  });

  it("does not save empty conversations", () => {
    const { result } = renderHook(() => useLessonHistory());
    act(() => {
      result.current.saveConversation([]);
    });
    expect(result.current.conversations).toHaveLength(0);
  });

  it("filters out non-user/assistant roles", () => {
    const { result } = renderHook(() => useLessonHistory());
    act(() => {
      result.current.saveConversation([
        { role: "system", text: "System message" },
        { role: "user", text: "Hello" },
        { role: "assistant", text: "Hi there" },
      ]);
    });
    expect(result.current.conversations[0].messageCount).toBe(2);
  });

  it("strips HTML from message text", () => {
    const { result } = renderHook(() => useLessonHistory());
    act(() => {
      result.current.saveConversation([
        { role: "user", text: "<b>Hello</b>" },
        { role: "assistant", text: "<script>alert('xss')</script>Hi" },
      ]);
    });
    expect(result.current.conversations[0].messages[0].text).toBe("Hello");
    expect(result.current.conversations[0].messages[1].text).toBe("alert('xss')Hi");
  });

  it("strips markdown bold/italic from preview text", () => {
    const { result } = renderHook(() => useLessonHistory());
    act(() => {
      result.current.saveConversation([
        { role: "user", text: "Hi" },
        { role: "assistant", text: "**안녕하세요** (annyeonghaseyo) — Hello! **잘 지내세요**" },
      ]);
    });
    const preview = result.current.conversations[0].preview;
    expect(preview).not.toContain("**");
    expect(preview).toContain("안녕하세요");
    expect(preview).toContain("annyeonghaseyo");
  });

  it("places newest conversations first", () => {
    const { result } = renderHook(() => useLessonHistory());
    act(() => {
      result.current.saveConversation([
        { role: "user", text: "First" },
        { role: "assistant", text: "First reply" },
      ]);
    });
    act(() => {
      result.current.saveConversation([
        { role: "user", text: "Second" },
        { role: "assistant", text: "Second reply" },
      ]);
    });
    expect(result.current.conversations[0].preview).toContain("Second");
    expect(result.current.conversations[1].preview).toContain("First");
  });

  it("enforces MAX_CONVERSATIONS=20 with FIFO", () => {
    const { result } = renderHook(() => useLessonHistory());
    // Save 21 conversations
    for (let i = 0; i < 21; i++) {
      act(() => {
        result.current.saveConversation([
          { role: "user", text: `Message ${i}` },
          { role: "assistant", text: `Reply ${i}` },
        ]);
      });
    }
    expect(result.current.conversations).toHaveLength(20);
    // Most recent should be first
    expect(result.current.conversations[0].preview).toContain("Reply 20");
  });

  // --- deleteConversation ---

  it("deletes a conversation by id", () => {
    const { result } = renderHook(() => useLessonHistory());
    act(() => {
      result.current.saveConversation([
        { role: "user", text: "Hi" },
        { role: "assistant", text: "Hello" },
      ]);
    });
    const id = result.current.conversations[0].id;
    act(() => {
      result.current.deleteConversation(id);
    });
    expect(result.current.conversations).toHaveLength(0);
  });

  it("does nothing when deleting non-existent id", () => {
    const { result } = renderHook(() => useLessonHistory());
    act(() => {
      result.current.saveConversation([
        { role: "user", text: "Hi" },
        { role: "assistant", text: "Hello" },
      ]);
    });
    act(() => {
      result.current.deleteConversation("non-existent");
    });
    expect(result.current.conversations).toHaveLength(1);
  });

  // --- UI state ---

  it("toggleHistory toggles historyOpen", () => {
    const { result } = renderHook(() => useLessonHistory());
    expect(result.current.historyOpen).toBe(false);
    act(() => result.current.toggleHistory());
    expect(result.current.historyOpen).toBe(true);
    act(() => result.current.toggleHistory());
    expect(result.current.historyOpen).toBe(false);
  });

  it("closeHistory sets historyOpen to false", () => {
    const { result } = renderHook(() => useLessonHistory());
    act(() => result.current.toggleHistory());
    expect(result.current.historyOpen).toBe(true);
    act(() => result.current.closeHistory());
    expect(result.current.historyOpen).toBe(false);
  });

  it("reviewConversation sets reviewingConversation", () => {
    const { result } = renderHook(() => useLessonHistory());
    act(() => {
      result.current.saveConversation([
        { role: "user", text: "Hi" },
        { role: "assistant", text: "Hello" },
      ]);
    });
    const id = result.current.conversations[0].id;
    act(() => result.current.reviewConversation(id));
    expect(result.current.reviewingConversation).not.toBeNull();
    expect(result.current.reviewingConversation!.id).toBe(id);
  });

  it("closeReview sets reviewingConversation to null", () => {
    const { result } = renderHook(() => useLessonHistory());
    act(() => {
      result.current.saveConversation([
        { role: "user", text: "Hi" },
        { role: "assistant", text: "Hello" },
      ]);
    });
    const id = result.current.conversations[0].id;
    act(() => result.current.reviewConversation(id));
    act(() => result.current.closeReview());
    expect(result.current.reviewingConversation).toBeNull();
  });

  it("toggleHistory resets reviewingId", () => {
    const { result } = renderHook(() => useLessonHistory());
    act(() => {
      result.current.saveConversation([
        { role: "user", text: "Hi" },
        { role: "assistant", text: "Hello" },
      ]);
    });
    act(() => result.current.reviewConversation(result.current.conversations[0].id));
    act(() => result.current.toggleHistory());
    expect(result.current.reviewingConversation).toBeNull();
  });

  // --- Persistence ---

  it("persists to localStorage after save", () => {
    const { result } = renderHook(() => useLessonHistory());
    act(() => {
      result.current.saveConversation([
        { role: "user", text: "Hi" },
        { role: "assistant", text: "Hello" },
      ]);
    });
    expect(localStorageMock.setItem).toHaveBeenCalled();
    const saved = JSON.parse(store["nunchi-lesson-history"]);
    expect(saved).toHaveLength(1);
  });

  it("persists to localStorage after delete", () => {
    const { result } = renderHook(() => useLessonHistory());
    act(() => {
      result.current.saveConversation([
        { role: "user", text: "Hi" },
        { role: "assistant", text: "Hello" },
      ]);
    });
    const id = result.current.conversations[0].id;
    act(() => result.current.deleteConversation(id));
    const saved = JSON.parse(store["nunchi-lesson-history"]);
    expect(saved).toHaveLength(0);
  });

  it("handles localStorage.setItem throwing", () => {
    const { result } = renderHook(() => useLessonHistory());
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error("QuotaExceededError");
    });
    // Should not crash
    act(() => {
      result.current.saveConversation([
        { role: "user", text: "Hi" },
        { role: "assistant", text: "Hello" },
      ]);
    });
    expect(result.current.conversations).toHaveLength(1);
  });

  it("handles localStorage.getItem throwing", () => {
    localStorageMock.getItem.mockImplementationOnce(() => {
      throw new Error("SecurityError");
    });
    const { result } = renderHook(() => useLessonHistory());
    expect(result.current.conversations).toEqual([]);
  });
});
