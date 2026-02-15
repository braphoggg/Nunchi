import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import VocabularyPanel from "../VocabularyPanel";
import type { VocabularyItem } from "@/types";

const sampleWords: VocabularyItem[] = [
  {
    id: "1",
    korean: "안녕하세요",
    romanization: "annyeonghaseyo",
    english: "hello",
    savedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "2",
    korean: "감사합니다",
    romanization: "gamsahamnida",
    english: "thank you",
    savedAt: "2024-01-02T00:00:00.000Z",
  },
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

describe("VocabularyPanel", () => {
  it("renders heading text in Korean and English", () => {
    render(
      <VocabularyPanel words={[]} onRemoveWord={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.getByText("나의 단어장")).toBeInTheDocument();
    expect(screen.getByText(/My Vocabulary/)).toBeInTheDocument();
  });

  it("shows word count in subtitle", () => {
    render(
      <VocabularyPanel
        words={sampleWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/2 words/)).toBeInTheDocument();
  });

  it("shows singular 'word' for single word", () => {
    render(
      <VocabularyPanel
        words={[sampleWords[0]]}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/1 word$/)).toBeInTheDocument();
  });

  it("renders saved words with Korean, romanization, and English", () => {
    render(
      <VocabularyPanel
        words={sampleWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("안녕하세요")).toBeInTheDocument();
    expect(screen.getByText("(annyeonghaseyo)")).toBeInTheDocument();
    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.getByText("감사합니다")).toBeInTheDocument();
  });

  it("shows empty state message when no words are saved", () => {
    render(
      <VocabularyPanel words={[]} onRemoveWord={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.getByText("No words saved yet.")).toBeInTheDocument();
  });

  it("calls onRemoveWord with correct id when delete button is clicked", () => {
    const onRemoveWord = vi.fn();
    render(
      <VocabularyPanel
        words={sampleWords}
        onRemoveWord={onRemoveWord}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText("Remove 안녕하세요"));
    expect(onRemoveWord).toHaveBeenCalledWith("1");
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <VocabularyPanel
        words={sampleWords}
        onRemoveWord={vi.fn()}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByLabelText("Close vocabulary panel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("words are sorted newest first", () => {
    const { container } = render(
      <VocabularyPanel
        words={sampleWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const koreanTexts = container.querySelectorAll(".text-\\[\\#d4a843\\]");
    // word2 (감사합니다, Jan 2) should come before word1 (안녕하세요, Jan 1)
    expect(koreanTexts[0].textContent).toBe("감사합니다");
    expect(koreanTexts[1].textContent).toBe("안녕하세요");
  });

  it("close button has accessible aria-label", () => {
    render(
      <VocabularyPanel words={[]} onRemoveWord={vi.fn()} onClose={vi.fn()} />
    );
    expect(
      screen.getByRole("button", { name: "Close vocabulary panel" })
    ).toBeInTheDocument();
  });

  it("shows 'translation unavailable' for words with empty English", () => {
    const wordWithoutEnglish: VocabularyItem[] = [
      {
        id: "3",
        korean: "문",
        romanization: "mun",
        english: "",
        savedAt: "2024-01-03T00:00:00.000Z",
      },
    ];
    render(
      <VocabularyPanel
        words={wordWithoutEnglish}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("문")).toBeInTheDocument();
    expect(screen.getByText("(mun)")).toBeInTheDocument();
    expect(screen.getByText("translation unavailable")).toBeInTheDocument();
  });

  it("delete buttons have accessible aria-labels containing Korean word", () => {
    render(
      <VocabularyPanel
        words={sampleWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(
      screen.getByRole("button", { name: "Remove 안녕하세요" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove 감사합니다" })
    ).toBeInTheDocument();
  });

  it("shows Study button when onStartStudy is provided and studyableCount >= 2", () => {
    render(
      <VocabularyPanel
        words={sampleWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
        onStartStudy={vi.fn()}
        studyableCount={2}
      />
    );
    expect(
      screen.getByRole("button", { name: "Study flashcards" })
    ).toBeInTheDocument();
  });

  it("hides Study button when studyableCount < 2", () => {
    render(
      <VocabularyPanel
        words={sampleWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
        onStartStudy={vi.fn()}
        studyableCount={1}
      />
    );
    expect(
      screen.queryByRole("button", { name: "Study flashcards" })
    ).not.toBeInTheDocument();
  });

  it("calls onStartStudy when Study button is clicked", () => {
    const onStartStudy = vi.fn();
    render(
      <VocabularyPanel
        words={sampleWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
        onStartStudy={onStartStudy}
        studyableCount={4}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Study flashcards" }));
    expect(onStartStudy).toHaveBeenCalledTimes(1);
  });

  // TTS tests

  it("renders TTS button for each word", () => {
    render(
      <VocabularyPanel
        words={sampleWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(
      screen.getByLabelText("Listen to 안녕하세요")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Listen to 감사합니다")
    ).toBeInTheDocument();
  });

  it("calls speechSynthesis.speak with correct Korean word and lang", () => {
    mockSpeak.mockClear();
    mockCancel.mockClear();
    render(
      <VocabularyPanel
        words={sampleWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText("Listen to 안녕하세요"));
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const utterance = mockSpeak.mock.calls[0][0];
    expect(utterance.text).toBe("안녕하세요");
    expect(utterance.lang).toBe("ko-KR");
    expect(utterance.rate).toBe(0.9);
  });

  it("shows stop label when word is being spoken", () => {
    mockSpeak.mockClear();
    mockCancel.mockClear();
    render(
      <VocabularyPanel
        words={sampleWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText("Listen to 안녕하세요"));
    expect(
      screen.getByLabelText("Stop listening to 안녕하세요")
    ).toBeInTheDocument();
  });

  it("cancels speech when stop button is clicked", () => {
    mockSpeak.mockClear();
    mockCancel.mockClear();
    render(
      <VocabularyPanel
        words={sampleWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
      />
    );
    // Start speaking
    fireEvent.click(screen.getByLabelText("Listen to 안녕하세요"));
    // Stop speaking
    fireEvent.click(screen.getByLabelText("Stop listening to 안녕하세요"));
    expect(mockCancel).toHaveBeenCalled();
  });
});
