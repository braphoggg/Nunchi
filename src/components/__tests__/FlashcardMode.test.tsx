import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FlashcardMode from "../FlashcardMode";
import type { VocabularyItem } from "@/types";

vi.mock("@/contexts/SoundContext", () => ({
  useSound: () => ({
    playWordSaved: vi.fn(),
    playFlashcardGrade: vi.fn(),
    playSessionComplete: vi.fn(),
    playJamoPress: vi.fn(),
    playSpecialKey: vi.fn(),
    playTranslationToggle: vi.fn(),
    playCopyConfirm: vi.fn(),
    muted: false,
    toggleMute: vi.fn(),
    volume: 80,
    setVolume: vi.fn(),
  }),
}));

function makeWord(overrides: Partial<VocabularyItem> = {}): VocabularyItem {
  return {
    id: `id-${Math.random()}`,
    korean: "문",
    romanization: "mun",
    english: "door",
    savedAt: new Date().toISOString(),
    ...overrides,
  };
}

const sampleWords: VocabularyItem[] = [
  makeWord({ id: "1", korean: "문", romanization: "mun", english: "door" }),
  makeWord({ id: "2", korean: "방", romanization: "bang", english: "room" }),
  makeWord({ id: "3", korean: "복도", romanization: "bokdo", english: "hallway" }),
  makeWord({ id: "4", korean: "벽", romanization: "byeok", english: "wall" }),
];

// Mock speechSynthesis
const mockSpeak = vi.fn();
const mockCancel = vi.fn();
Object.defineProperty(global, "speechSynthesis", {
  value: { speak: mockSpeak, cancel: mockCancel, speaking: false },
  writable: true,
});

class MockSpeechSynthesisUtterance {
  text: string;
  lang = "";
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}
Object.defineProperty(global, "SpeechSynthesisUtterance", {
  value: MockSpeechSynthesisUtterance,
  writable: true,
});

// Mock quiz-generator to return deterministic questions
vi.mock("@/lib/quiz-generator", async () => {
  const actual = await vi.importActual("@/lib/quiz-generator");
  return {
    ...actual,
    generateQuiz: (words: VocabularyItem[], count?: number, questionType?: string) => {
      // Filter studyable words
      const studyable = words.filter((w: VocabularyItem) => w.english?.trim());
      if (studyable.length < 4) return [];
      const selected = studyable.slice(0, count ?? 10);
      return selected.map((word: VocabularyItem) => {
        const others = studyable.filter((w: VocabularyItem) => w.id !== word.id);
        const distractors = others.slice(0, 3).map((w: VocabularyItem) => w.english);
        return {
          id: `q-${word.id}-korean_to_english`,
          type: "korean_to_english" as const,
          prompt: word.korean,
          correctAnswer: word.english,
          options: [word.english, ...distractors],
          wordId: word.id,
        };
      });
    },
  };
});

describe("FlashcardMode", () => {
  beforeEach(() => {
    mockSpeak.mockClear();
    mockCancel.mockClear();
  });

  it("renders Korean word as prompt on mount", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    // First question should show one of the Korean words
    const koreanWords = sampleWords.map((w) => w.korean);
    const found = koreanWords.some((k) => screen.queryByText(k));
    expect(found).toBe(true);
  });

  it("shows 4 option buttons", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    // Should have 4 options labeled Option 1-4
    expect(screen.getByLabelText(/^Option 1:/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Option 2:/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Option 3:/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Option 4:/)).toBeInTheDocument();
  });

  it("shows 'Korean → English' type badge", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    expect(screen.getByText("Korean → English")).toBeInTheDocument();
  });

  it("shows 'press 1-4 to select' hint", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    expect(screen.getByText(/press 1-4 to select/)).toBeInTheDocument();
  });

  it("selecting correct option fires onWordGraded with 'good'", () => {
    const onWordGraded = vi.fn();
    render(
      <FlashcardMode
        words={sampleWords}
        onClose={vi.fn()}
        onWordGraded={onWordGraded}
      />,
    );
    // First option is the correct answer (deterministic mock)
    fireEvent.click(screen.getByLabelText(/^Option 1:/));
    expect(onWordGraded).toHaveBeenCalledWith("1", "good");
  });

  it("selecting wrong option fires onWordGraded with 'again'", () => {
    const onWordGraded = vi.fn();
    render(
      <FlashcardMode
        words={sampleWords}
        onClose={vi.fn()}
        onWordGraded={onWordGraded}
      />,
    );
    // Second option is a distractor (wrong answer)
    fireEvent.click(screen.getByLabelText(/^Option 2:/));
    expect(onWordGraded).toHaveBeenCalledWith("1", "again");
  });

  it("Next button appears after selecting an option", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    // Before answering, no Next button
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
    // Select an option
    fireEvent.click(screen.getByLabelText(/^Option 1:/));
    // Now Next button should appear
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("shows progress counter in 'N / M' format", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
  });

  it("advances to next question after clicking Next", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/^Option 1:/));
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
  });

  it("progress bar has progressbar role with correct aria values", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute("aria-valuenow", "1");
    expect(progressBar).toHaveAttribute("aria-valuemax", "4");
  });

  it("shows summary screen when all questions are answered", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    // Answer all 4 questions
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByLabelText(/^Option 1:/));
      if (i < 3) {
        fireEvent.click(screen.getByText("Next"));
      } else {
        fireEvent.click(screen.getByText("See Results"));
      }
    }
    expect(screen.getByText("Study Complete")).toBeInTheDocument();
  });

  it("summary shows correct and wrong counts", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    // Answer Q1 correct, Q2 wrong, Q3 correct, Q4 correct
    fireEvent.click(screen.getByLabelText(/^Option 1:/)); // correct
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByLabelText(/^Option 2:/)); // wrong
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByLabelText(/^Option 1:/)); // correct
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByLabelText(/^Option 1:/)); // correct
    fireEvent.click(screen.getByText("See Results"));

    expect(screen.getByTestId("correct-count")).toHaveTextContent("3");
    expect(screen.getByTestId("wrong-count")).toHaveTextContent("1");
  });

  it("summary shows Moon-jo feedback quote for perfect score", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    // Answer all correctly
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByLabelText(/^Option 1:/));
      if (i < 3) {
        fireEvent.click(screen.getByText("Next"));
      } else {
        fireEvent.click(screen.getByText("See Results"));
      }
    }
    // 100% perfect score quote
    expect(screen.getByText(/이 방은 당신에게 꼭 맞아요/)).toBeInTheDocument();
  });

  it("'Study Again' button restarts the session", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    // Complete all questions
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByLabelText(/^Option 1:/));
      if (i < 3) {
        fireEvent.click(screen.getByText("Next"));
      } else {
        fireEvent.click(screen.getByText("See Results"));
      }
    }
    expect(screen.getByText("Study Complete")).toBeInTheDocument();
    // Click Study Again
    fireEvent.click(screen.getByLabelText("Study again"));
    // Should be back to study mode with progress counter
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
  });

  it("'Done' button calls onClose", () => {
    const onClose = vi.fn();
    render(<FlashcardMode words={sampleWords} onClose={onClose} />);
    // Complete all questions
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByLabelText(/^Option 1:/));
      if (i < 3) {
        fireEvent.click(screen.getByText("Next"));
      } else {
        fireEvent.click(screen.getByText("See Results"));
      }
    }
    fireEvent.click(screen.getByLabelText("Done studying"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("back button calls onClose during study", () => {
    const onClose = vi.fn();
    render(<FlashcardMode words={sampleWords} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Back to vocabulary"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows minimum word requirement message when fewer than 4 studyable words", () => {
    const words = [
      makeWord({ id: "1", korean: "문", english: "door" }),
      makeWord({ id: "2", korean: "방", english: "room" }),
      makeWord({ id: "3", korean: "복도", english: "hallway" }),
    ];
    render(<FlashcardMode words={words} onClose={vi.fn()} />);
    expect(screen.getByText("Not enough words to study.")).toBeInTheDocument();
    expect(screen.getByText(/Save at least 4 vocabulary words/)).toBeInTheDocument();
  });

  it("shows minimum word message when all words have empty english", () => {
    const words = [
      makeWord({ id: "1", english: "" }),
      makeWord({ id: "2", english: "" }),
      makeWord({ id: "3", english: "" }),
      makeWord({ id: "4", english: "" }),
    ];
    render(<FlashcardMode words={words} onClose={vi.fn()} />);
    expect(screen.getByText("Not enough words to study.")).toBeInTheDocument();
  });

  it("fires onSessionComplete with correct summary when study finishes", () => {
    const onSessionComplete = vi.fn();
    render(
      <FlashcardMode
        words={sampleWords}
        onClose={vi.fn()}
        onSessionComplete={onSessionComplete}
      />,
    );
    // Answer all correctly
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByLabelText(/^Option 1:/));
      if (i < 3) {
        fireEvent.click(screen.getByText("Next"));
      } else {
        fireEvent.click(screen.getByText("See Results"));
      }
    }
    expect(onSessionComplete).toHaveBeenCalledTimes(1);
    const summary = onSessionComplete.mock.calls[0][0];
    expect(summary.good).toBe(4); // correct → good
    expect(summary.again).toBe(0); // wrong → again
    expect(summary.easy).toBe(0); // always 0 in quiz format
    expect(summary.total).toBe(4);
  });

  // TTS tests

  it("renders speak button", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    expect(screen.getByLabelText("Listen to pronunciation")).toBeInTheDocument();
  });

  it("calls speechSynthesis.speak with current question Korean word", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Listen to pronunciation"));
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const utterance = mockSpeak.mock.calls[0][0];
    const koreanWords = sampleWords.map((w) => w.korean);
    expect(koreanWords).toContain(utterance.text);
    expect(utterance.lang).toBe("ko-KR");
    expect(utterance.rate).toBe(0.9);
  });

  it("disables options after one is selected", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/^Option 1:/));
    // All options should be disabled after answering
    expect(screen.getByLabelText(/^Option 1:/)).toBeDisabled();
    expect(screen.getByLabelText(/^Option 2:/)).toBeDisabled();
    expect(screen.getByLabelText(/^Option 3:/)).toBeDisabled();
    expect(screen.getByLabelText(/^Option 4:/)).toBeDisabled();
  });
});
