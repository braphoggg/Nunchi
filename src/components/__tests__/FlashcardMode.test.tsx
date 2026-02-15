import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import FlashcardMode from "../FlashcardMode";
import type { VocabularyItem } from "@/types";

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

describe("FlashcardMode", () => {
  it("renders card front with Korean text on mount", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    // Session auto-starts; one of the Korean words should be visible
    const koreanWords = sampleWords.map((w) => w.korean);
    const found = koreanWords.some((k) => screen.queryByText(k));
    expect(found).toBe(true);
  });

  it("shows 'tap to flip' hint on card front", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    expect(screen.getByText("tap to flip")).toBeInTheDocument();
  });

  it("flips card on click and shows romanization and english", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    // Find the flip button and click it
    const flipButton = screen.getByLabelText("Flip card to back");
    fireEvent.click(flipButton);
    // After flip, one of the English meanings should be visible on the back
    const englishWords = sampleWords.map((w) => w.english);
    const found = englishWords.some((e) => screen.queryByText(e));
    expect(found).toBe(true);
  });

  it("grade buttons are hidden when card is not flipped", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    expect(screen.queryByLabelText("Grade: Again")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Grade: Good")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Grade: Easy")).not.toBeInTheDocument();
  });

  it("grade buttons appear when card is flipped", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Flip card to back"));
    expect(screen.getByLabelText("Grade: Again")).toBeInTheDocument();
    expect(screen.getByLabelText("Grade: Good")).toBeInTheDocument();
    expect(screen.getByLabelText("Grade: Easy")).toBeInTheDocument();
  });

  it("shows progress counter in 'N / M' format", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    // Should show "1 / 4"
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
  });

  it("clicking grade button advances to next card", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Flip card to back"));
    fireEvent.click(screen.getByLabelText("Grade: Good"));
    // Counter should now be 2 / 4
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
  });

  it("progress bar has progressbar role with correct aria values", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute("aria-valuenow", "1");
    expect(progressBar).toHaveAttribute("aria-valuemax", "4");
  });

  it("shows summary screen when all cards are graded", () => {
    const words = [
      makeWord({ id: "1", korean: "문", english: "door" }),
      makeWord({ id: "2", korean: "방", english: "room" }),
    ];
    render(<FlashcardMode words={words} onClose={vi.fn()} />);
    // Grade card 1
    fireEvent.click(screen.getByLabelText("Flip card to back"));
    fireEvent.click(screen.getByLabelText("Grade: Good"));
    // Grade card 2
    fireEvent.click(screen.getByLabelText("Flip card to back"));
    fireEvent.click(screen.getByLabelText("Grade: Easy"));
    // Summary screen should appear
    expect(screen.getByText("Session Complete")).toBeInTheDocument();
  });

  it("summary screen shows correct grade counts", () => {
    const words = [
      makeWord({ id: "1", korean: "문", english: "door" }),
      makeWord({ id: "2", korean: "방", english: "room" }),
    ];
    render(<FlashcardMode words={words} onClose={vi.fn()} />);
    // Grade card 1 as Again
    fireEvent.click(screen.getByLabelText("Flip card to back"));
    fireEvent.click(screen.getByLabelText("Grade: Again"));
    // Grade card 2 as Good
    fireEvent.click(screen.getByLabelText("Flip card to back"));
    fireEvent.click(screen.getByLabelText("Grade: Good"));
    // Check summary counts via data-testid
    expect(screen.getByTestId("again-count")).toHaveTextContent("1");
    expect(screen.getByTestId("good-count")).toHaveTextContent("1");
    expect(screen.getByTestId("easy-count")).toHaveTextContent("0");
  });

  it("summary screen shows Moon-jo feedback quote", () => {
    const words = [
      makeWord({ id: "1", korean: "문", english: "door" }),
      makeWord({ id: "2", korean: "방", english: "room" }),
    ];
    render(<FlashcardMode words={words} onClose={vi.fn()} />);
    // Grade both as "good" (100% good+easy → high performance quote)
    fireEvent.click(screen.getByLabelText("Flip card to back"));
    fireEvent.click(screen.getByLabelText("Grade: Good"));
    fireEvent.click(screen.getByLabelText("Flip card to back"));
    fireEvent.click(screen.getByLabelText("Grade: Good"));
    // Should show the high-performance Korean quote
    expect(
      screen.getByText(/역시 제가 가르친 사람이에요/)
    ).toBeInTheDocument();
  });

  it("'Study Again' button restarts the session", () => {
    const words = [
      makeWord({ id: "1", korean: "문", english: "door" }),
      makeWord({ id: "2", korean: "방", english: "room" }),
    ];
    render(<FlashcardMode words={words} onClose={vi.fn()} />);
    // Complete session
    fireEvent.click(screen.getByLabelText("Flip card to back"));
    fireEvent.click(screen.getByLabelText("Grade: Good"));
    fireEvent.click(screen.getByLabelText("Flip card to back"));
    fireEvent.click(screen.getByLabelText("Grade: Good"));
    expect(screen.getByText("Session Complete")).toBeInTheDocument();
    // Click Study Again
    fireEvent.click(screen.getByLabelText("Study again"));
    // Should be back to study mode with progress counter
    expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument();
  });

  it("'Done' button calls onClose", () => {
    const onClose = vi.fn();
    const words = [
      makeWord({ id: "1", korean: "문", english: "door" }),
      makeWord({ id: "2", korean: "방", english: "room" }),
    ];
    render(<FlashcardMode words={words} onClose={onClose} />);
    // Complete session
    fireEvent.click(screen.getByLabelText("Flip card to back"));
    fireEvent.click(screen.getByLabelText("Grade: Easy"));
    fireEvent.click(screen.getByLabelText("Flip card to back"));
    fireEvent.click(screen.getByLabelText("Grade: Easy"));
    // Click Done
    fireEvent.click(screen.getByLabelText("Done studying"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("back button calls onClose during study", () => {
    const onClose = vi.fn();
    render(<FlashcardMode words={sampleWords} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Back to vocabulary"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows minimum word requirement message when fewer than 2 studyable words", () => {
    const words = [makeWord({ id: "1", korean: "문", english: "door" })];
    render(<FlashcardMode words={words} onClose={vi.fn()} />);
    expect(
      screen.getByText("Not enough words to study.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Save at least 2 vocabulary words/)
    ).toBeInTheDocument();
  });

  it("shows minimum word message when all words have empty english", () => {
    const words = [
      makeWord({ id: "1", english: "" }),
      makeWord({ id: "2", english: "" }),
      makeWord({ id: "3", english: "" }),
    ];
    render(<FlashcardMode words={words} onClose={vi.fn()} />);
    expect(
      screen.getByText("Not enough words to study.")
    ).toBeInTheDocument();
  });

  it("navigation prev button is disabled on first card", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    const prevBtn = screen.getByLabelText("Previous card");
    expect(prevBtn).toBeDisabled();
  });

  it("navigation next button advances and prev goes back", () => {
    render(<FlashcardMode words={sampleWords} onClose={vi.fn()} />);
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Next card"));
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Previous card"));
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
  });
});
