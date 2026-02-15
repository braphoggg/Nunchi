import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVocabulary } from "../useVocabulary";

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

describe("useVocabulary", () => {
  beforeEach(() => {
    store = {};
    vi.clearAllMocks();
  });

  it("returns the expected interface", () => {
    const { result } = renderHook(() => useVocabulary());
    expect(Array.isArray(result.current.words)).toBe(true);
    expect(typeof result.current.wordCount).toBe("number");
    expect(typeof result.current.panelOpen).toBe("boolean");
    expect(typeof result.current.addWords).toBe("function");
    expect(typeof result.current.removeWord).toBe("function");
    expect(typeof result.current.isWordSaved).toBe("function");
    expect(typeof result.current.togglePanel).toBe("function");
    expect(typeof result.current.closePanel).toBe("function");
  });

  it("starts with empty words array when localStorage is empty", () => {
    const { result } = renderHook(() => useVocabulary());
    expect(result.current.words).toEqual([]);
    expect(result.current.wordCount).toBe(0);
  });

  it("loads existing words from localStorage on mount", () => {
    const saved = [
      {
        id: "1",
        korean: "안녕",
        romanization: "annyeong",
        english: "hello",
        savedAt: "2024-01-01T00:00:00.000Z",
      },
    ];
    store["nunchi-vocabulary"] = JSON.stringify(saved);

    const { result } = renderHook(() => useVocabulary());
    // useEffect runs after render, words load asynchronously
    expect(result.current.words).toEqual(saved);
    expect(result.current.wordCount).toBe(1);
  });

  it("addWords adds new vocabulary items with id and savedAt", () => {
    const { result } = renderHook(() => useVocabulary());
    act(() => {
      result.current.addWords([
        { korean: "문", romanization: "mun", english: "door" },
      ]);
    });
    expect(result.current.words).toHaveLength(1);
    expect(result.current.words[0].korean).toBe("문");
    expect(result.current.words[0].id).toBeTruthy();
    expect(result.current.words[0].savedAt).toBeTruthy();
  });

  it("addWords skips duplicates (same korean text)", () => {
    const { result } = renderHook(() => useVocabulary());
    act(() => {
      result.current.addWords([
        { korean: "문", romanization: "mun", english: "door" },
      ]);
    });
    act(() => {
      result.current.addWords([
        { korean: "문", romanization: "mun", english: "door" },
      ]);
    });
    expect(result.current.words).toHaveLength(1);
  });

  it("removeWord removes word by id", () => {
    const { result } = renderHook(() => useVocabulary());
    act(() => {
      result.current.addWords([
        { korean: "문", romanization: "mun", english: "door" },
      ]);
    });
    const wordId = result.current.words[0].id;
    act(() => {
      result.current.removeWord(wordId);
    });
    expect(result.current.words).toHaveLength(0);
  });

  it("isWordSaved returns true for saved Korean text, false otherwise", () => {
    const { result } = renderHook(() => useVocabulary());
    act(() => {
      result.current.addWords([
        { korean: "문", romanization: "mun", english: "door" },
      ]);
    });
    expect(result.current.isWordSaved("문")).toBe(true);
    expect(result.current.isWordSaved("창")).toBe(false);
  });

  it("togglePanel toggles panelOpen state", () => {
    const { result } = renderHook(() => useVocabulary());
    expect(result.current.panelOpen).toBe(false);
    act(() => {
      result.current.togglePanel();
    });
    expect(result.current.panelOpen).toBe(true);
    act(() => {
      result.current.togglePanel();
    });
    expect(result.current.panelOpen).toBe(false);
  });

  it("closePanel sets panelOpen to false", () => {
    const { result } = renderHook(() => useVocabulary());
    act(() => {
      result.current.togglePanel();
    });
    expect(result.current.panelOpen).toBe(true);
    act(() => {
      result.current.closePanel();
    });
    expect(result.current.panelOpen).toBe(false);
  });

  it("persists words to localStorage after addWords", () => {
    const { result } = renderHook(() => useVocabulary());
    act(() => {
      result.current.addWords([
        { korean: "문", romanization: "mun", english: "door" },
      ]);
    });
    expect(localStorageMock.setItem).toHaveBeenCalled();
    const savedData = JSON.parse(store["nunchi-vocabulary"]);
    expect(savedData).toHaveLength(1);
    expect(savedData[0].korean).toBe("문");
  });

  it("persists words to localStorage after removeWord", () => {
    const { result } = renderHook(() => useVocabulary());
    act(() => {
      result.current.addWords([
        { korean: "문", romanization: "mun", english: "door" },
      ]);
    });
    const wordId = result.current.words[0].id;
    act(() => {
      result.current.removeWord(wordId);
    });
    const savedData = JSON.parse(store["nunchi-vocabulary"]);
    expect(savedData).toHaveLength(0);
  });

  it("wordCount reflects current number of saved words", () => {
    const { result } = renderHook(() => useVocabulary());
    expect(result.current.wordCount).toBe(0);
    act(() => {
      result.current.addWords([
        { korean: "문", romanization: "mun", english: "door" },
        { korean: "창", romanization: "chang", english: "window" },
      ]);
    });
    expect(result.current.wordCount).toBe(2);
  });

  // Security tests

  it("handles corrupted localStorage data gracefully", () => {
    store["nunchi-vocabulary"] = "not valid json {{{";
    const { result } = renderHook(() => useVocabulary());
    expect(result.current.words).toEqual([]);
  });

  it("handles non-array localStorage data gracefully", () => {
    store["nunchi-vocabulary"] = JSON.stringify({ key: "value" });
    const { result } = renderHook(() => useVocabulary());
    expect(result.current.words).toEqual([]);
  });

  it("discards malformed entries from localStorage (missing fields)", () => {
    store["nunchi-vocabulary"] = JSON.stringify([
      { id: "1", korean: "문" }, // missing romanization, english, savedAt
      {
        id: "2",
        korean: "창",
        romanization: "chang",
        english: "window",
        savedAt: "2024-01-01T00:00:00.000Z",
      },
    ]);
    const { result } = renderHook(() => useVocabulary());
    expect(result.current.words).toHaveLength(1);
    expect(result.current.words[0].korean).toBe("창");
  });

  it("rejects addWords when total would exceed 5000 word cap", () => {
    const existing = Array.from({ length: 5000 }, (_, i) => ({
      id: `id-${i}`,
      korean: `단어${i}`,
      romanization: `word${i}`,
      english: `meaning${i}`,
      savedAt: "2024-01-01T00:00:00.000Z",
    }));
    store["nunchi-vocabulary"] = JSON.stringify(existing);

    const { result } = renderHook(() => useVocabulary());
    act(() => {
      result.current.addWords([
        { korean: "새로운", romanization: "saeroun", english: "new" },
      ]);
    });
    // Should still be 5000, not 5001
    expect(result.current.wordCount).toBe(5000);
  });

  it("strips HTML tags from vocabulary fields before saving", () => {
    const { result } = renderHook(() => useVocabulary());
    act(() => {
      result.current.addWords([
        {
          korean: "<b>문</b>",
          romanization: "<script>mun</script>",
          english: "<img src=x>door",
        },
      ]);
    });
    expect(result.current.words[0].korean).toBe("문");
    expect(result.current.words[0].romanization).toBe("mun");
    expect(result.current.words[0].english).toBe("door");
  });

  it("handles localStorage.setItem throwing (quota exceeded)", () => {
    const { result } = renderHook(() => useVocabulary());
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error("QuotaExceededError");
    });
    // Should not crash
    act(() => {
      result.current.addWords([
        { korean: "문", romanization: "mun", english: "door" },
      ]);
    });
    // State still updates in memory
    expect(result.current.words).toHaveLength(1);
  });

  it("handles localStorage.getItem throwing", () => {
    localStorageMock.getItem.mockImplementationOnce(() => {
      throw new Error("SecurityError");
    });
    const { result } = renderHook(() => useVocabulary());
    expect(result.current.words).toEqual([]);
  });

  it("does not save items with non-string fields", () => {
    store["nunchi-vocabulary"] = JSON.stringify([
      {
        id: 123, // number instead of string
        korean: "문",
        romanization: "mun",
        english: "door",
        savedAt: "2024-01-01T00:00:00.000Z",
      },
    ]);
    const { result } = renderHook(() => useVocabulary());
    expect(result.current.words).toEqual([]);
  });
});
