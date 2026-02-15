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
});
