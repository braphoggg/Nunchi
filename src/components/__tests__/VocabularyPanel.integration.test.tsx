/**
 * Integration tests: VocabularyPanel — export dropdown, quiz/write button visibility
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import VocabularyPanel from "../VocabularyPanel";
import type { VocabularyItem } from "@/types";

// Mock SettingsContext
vi.mock("@/contexts/SettingsContext", () => ({
  useSettingsContext: () => ({
    settings: { showRomanization: true, ttsRate: 0.85 },
    apiKey: "test-key",
    setApiKey: vi.fn(),
    updateSettings: vi.fn(),
  }),
}));

// Mock speechSynthesis
Object.defineProperty(global, "speechSynthesis", {
  value: { speak: vi.fn(), cancel: vi.fn(), speaking: false },
  writable: true,
});
Object.defineProperty(global, "SpeechSynthesisUtterance", {
  value: class { text = ""; lang = ""; rate = 1; onend = null; onerror = null; constructor(t: string) { this.text = t; } },
  writable: true,
});

function makeWord(id: string, korean: string, english: string): VocabularyItem {
  return {
    id,
    korean,
    romanization: "rom",
    english,
    savedAt: new Date().toISOString(),
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: new Date().toISOString().slice(0, 10),
    lastGrade: null,
  };
}

const fiveWords = [
  makeWord("1", "문", "door"),
  makeWord("2", "방", "room"),
  makeWord("3", "복도", "hallway"),
  makeWord("4", "벽", "wall"),
  makeWord("5", "물", "water"),
];

const threeWords = fiveWords.slice(0, 3);

describe("VocabularyPanel — button visibility", () => {
  it("shows Study All button when studyableCount >= 4", () => {
    render(
      <VocabularyPanel
        words={fiveWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
        onStartStudy={vi.fn()}
        studyableCount={5}
      />,
    );
    expect(screen.getByLabelText("Study flashcards")).toBeInTheDocument();
  });

  it("hides Study All button when studyableCount < 4", () => {
    render(
      <VocabularyPanel
        words={threeWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
        onStartStudy={vi.fn()}
        studyableCount={3}
      />,
    );
    expect(screen.queryByLabelText("Study flashcards")).not.toBeInTheDocument();
  });

  it("shows Quick Quiz button when quizReady is true", () => {
    render(
      <VocabularyPanel
        words={fiveWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
        onStartQuiz={vi.fn()}
        quizReady={true}
      />,
    );
    expect(screen.getByLabelText("Take a quiz")).toBeInTheDocument();
  });

  it("hides Quick Quiz button when quizReady is false", () => {
    render(
      <VocabularyPanel
        words={fiveWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
        onStartQuiz={vi.fn()}
        quizReady={false}
      />,
    );
    expect(screen.queryByLabelText("Take a quiz")).not.toBeInTheDocument();
  });

  it("shows Write button when studyableCount >= 4 and onStartWriting provided", () => {
    render(
      <VocabularyPanel
        words={fiveWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
        onStartWriting={vi.fn()}
        studyableCount={5}
      />,
    );
    expect(screen.getByLabelText("Writing practice")).toBeInTheDocument();
  });
});

describe("VocabularyPanel — export dropdown", () => {
  it("shows export button when words exist", () => {
    render(
      <VocabularyPanel
        words={fiveWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Export vocabulary")).toBeInTheDocument();
  });

  it("hides export button when no words", () => {
    render(
      <VocabularyPanel
        words={[]}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText("Export vocabulary")).not.toBeInTheDocument();
  });

  it("opens export dropdown with CSV and Anki options on click", () => {
    render(
      <VocabularyPanel
        words={fiveWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText("Export vocabulary"));
    expect(screen.getByText("Spreadsheet")).toBeInTheDocument();
    expect(screen.getByText("Anki Import")).toBeInTheDocument();
  });

  it("shows due count badge on Study All button when dueCount > 0", () => {
    render(
      <VocabularyPanel
        words={fiveWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
        onStartStudy={vi.fn()}
        studyableCount={5}
        dueCount={3}
      />,
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("calls onStartStudy when Study All button is clicked", () => {
    const onStartStudy = vi.fn();
    render(
      <VocabularyPanel
        words={fiveWords}
        onRemoveWord={vi.fn()}
        onClose={vi.fn()}
        onStartStudy={onStartStudy}
        studyableCount={5}
      />,
    );
    fireEvent.click(screen.getByLabelText("Study flashcards"));
    expect(onStartStudy).toHaveBeenCalledTimes(1);
  });
});
