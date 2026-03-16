import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LessonComplete from "../LessonComplete";

const defaultProps = {
  topicTitle: "Ordering Food",
  topicTitleKr: "음식 주문",
  wordsLearned: 5,
  xpEarned: 30,
  currentStreak: 3,
  onReviewVocabulary: vi.fn(),
  onReturnHome: vi.fn(),
};

describe("LessonComplete", () => {
  it("renders topic title in Korean", () => {
    render(<LessonComplete {...defaultProps} />);
    expect(screen.getByText("음식 주문")).toBeTruthy();
  });

  it("renders topic title in English", () => {
    render(<LessonComplete {...defaultProps} />);
    expect(screen.getByText("Ordering Food")).toBeTruthy();
  });

  it("shows words learned count", () => {
    render(<LessonComplete {...defaultProps} />);
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("shows XP earned with plus sign", () => {
    render(<LessonComplete {...defaultProps} />);
    expect(screen.getByText("+30")).toBeTruthy();
  });

  it("shows current streak", () => {
    render(<LessonComplete {...defaultProps} />);
    expect(screen.getByText("3 days")).toBeTruthy();
  });

  it("uses singular 'day' for streak of 1", () => {
    render(<LessonComplete {...defaultProps} currentStreak={1} />);
    expect(screen.getByText("1 day")).toBeTruthy();
  });

  it("hides streak section when streak is 0", () => {
    render(<LessonComplete {...defaultProps} currentStreak={0} />);
    expect(screen.queryByText(/streak/i)).toBeNull();
  });

  it("shows Moon-jo quote", () => {
    render(<LessonComplete {...defaultProps} />);
    expect(screen.getByText(/잘 했어요/)).toBeTruthy();
    expect(screen.getByText(/Well done/)).toBeTruthy();
  });

  it("shows Review Vocabulary button when words were learned", () => {
    render(<LessonComplete {...defaultProps} />);
    expect(screen.getByText("Review Vocabulary")).toBeTruthy();
  });

  it("hides Review Vocabulary button when no words learned", () => {
    render(<LessonComplete {...defaultProps} wordsLearned={0} />);
    expect(screen.queryByText("Review Vocabulary")).toBeNull();
  });

  it("shows Return Home button", () => {
    render(<LessonComplete {...defaultProps} />);
    expect(screen.getByText("Return Home")).toBeTruthy();
  });

  it("calls onReviewVocabulary when Review Vocabulary clicked", () => {
    const onReviewVocabulary = vi.fn();
    render(<LessonComplete {...defaultProps} onReviewVocabulary={onReviewVocabulary} />);
    fireEvent.click(screen.getByText("Review Vocabulary"));
    expect(onReviewVocabulary).toHaveBeenCalledOnce();
  });

  it("calls onReturnHome when Return Home clicked", () => {
    const onReturnHome = vi.fn();
    render(<LessonComplete {...defaultProps} onReturnHome={onReturnHome} />);
    fireEvent.click(screen.getByText("Return Home"));
    expect(onReturnHome).toHaveBeenCalledOnce();
  });

  it("calls onReturnHome when modal close is triggered", () => {
    const onReturnHome = vi.fn();
    render(<LessonComplete {...defaultProps} onReturnHome={onReturnHome} />);
    fireEvent.click(screen.getByLabelText("Return to home"));
    expect(onReturnHome).toHaveBeenCalledOnce();
  });
});
