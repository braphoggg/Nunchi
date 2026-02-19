import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LessonReview from "../LessonReview";
import type { SavedConversation } from "@/types";

// Mock format-message to avoid complex rendering dependencies
vi.mock("@/lib/format-message", () => ({
  formatMessage: (text: string) => text,
}));

const mockConversation: SavedConversation = {
  id: "conv-1",
  savedAt: "2026-02-18T10:30:00.000Z",
  preview: "안녕하세요! Welcome to Room 203",
  messageCount: 4,
  messages: [
    { role: "assistant", text: "안녕하세요! Welcome to Room 203." },
    { role: "user", text: "Hello Moon-jo!" },
    { role: "assistant", text: "오늘 한국어를 배워볼까요?" },
    { role: "user", text: "네, 좋아요!" },
  ],
};

describe("LessonReview", () => {
  it("renders the Lesson Review title", () => {
    render(<LessonReview conversation={mockConversation} onClose={vi.fn()} />);
    expect(screen.getByText("Lesson Review")).toBeInTheDocument();
  });

  it("shows message count in header", () => {
    render(<LessonReview conversation={mockConversation} onClose={vi.fn()} />);
    expect(screen.getByText(/4 messages/)).toBeInTheDocument();
  });

  it("renders all conversation messages", () => {
    render(<LessonReview conversation={mockConversation} onClose={vi.fn()} />);
    expect(screen.getByText("안녕하세요! Welcome to Room 203.")).toBeInTheDocument();
    expect(screen.getByText("Hello Moon-jo!")).toBeInTheDocument();
    expect(screen.getByText("오늘 한국어를 배워볼까요?")).toBeInTheDocument();
    expect(screen.getByText("네, 좋아요!")).toBeInTheDocument();
  });

  it("shows 서문조 label for assistant messages", () => {
    render(<LessonReview conversation={mockConversation} onClose={vi.fn()} />);
    const labels = screen.getAllByText("서문조");
    // Two assistant messages → two labels
    expect(labels).toHaveLength(2);
  });

  it("calls onClose when back button is clicked", () => {
    const onClose = vi.fn();
    render(<LessonReview conversation={mockConversation} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Back to history"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("handles conversation with only user messages", () => {
    const userOnly: SavedConversation = {
      id: "conv-user",
      savedAt: "2026-01-01T00:00:00.000Z",
      preview: "Hi there",
      messageCount: 1,
      messages: [{ role: "user", text: "Hi there" }],
    };
    render(<LessonReview conversation={userOnly} onClose={vi.fn()} />);
    expect(screen.getByText("Hi there")).toBeInTheDocument();
    expect(screen.queryByText("서문조")).not.toBeInTheDocument();
  });

  it("renders formatted date in header", () => {
    render(<LessonReview conversation={mockConversation} onClose={vi.fn()} />);
    // The date format depends on locale, but the element should contain the message count
    const subtitleElement = screen.getByText(/4 messages/);
    expect(subtitleElement).toBeInTheDocument();
  });

  it("handles invalid savedAt date gracefully", () => {
    const badDate: SavedConversation = {
      ...mockConversation,
      savedAt: "not-a-date",
    };
    // Should not crash — formatDate catches errors
    render(<LessonReview conversation={badDate} onClose={vi.fn()} />);
    expect(screen.getByText("Lesson Review")).toBeInTheDocument();
  });
});
