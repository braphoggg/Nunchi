import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LessonHistory from "../LessonHistory";
import type { SavedConversation } from "@/types";

const mockConversations: SavedConversation[] = [
  {
    id: "conv-1",
    savedAt: "2026-02-18T10:30:00.000Z",
    preview: "안녕하세요! Welcome to Room 203...",
    messageCount: 6,
    messages: [
      { role: "assistant", text: "안녕하세요! Welcome to Room 203..." },
      { role: "user", text: "Hello!" },
      { role: "assistant", text: "Good, you're here." },
      { role: "user", text: "Yes" },
      { role: "assistant", text: "Let's begin." },
      { role: "user", text: "Okay" },
    ],
  },
  {
    id: "conv-2",
    savedAt: "2026-02-17T14:00:00.000Z",
    preview: "오늘은 음식에 대해 이야기해볼까요?",
    messageCount: 4,
    messages: [
      { role: "assistant", text: "오늘은 음식에 대해 이야기해볼까요?" },
      { role: "user", text: "네" },
      { role: "assistant", text: "좋아요." },
      { role: "user", text: "감사합니다" },
    ],
  },
];

describe("LessonHistory", () => {
  it("renders the title in Korean", () => {
    render(
      <LessonHistory
        conversations={mockConversations}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("수업 기록")).toBeInTheDocument();
  });

  it("shows conversation count in subtitle", () => {
    render(
      <LessonHistory
        conversations={mockConversations}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/2 saved/)).toBeInTheDocument();
  });

  it("renders each conversation preview", () => {
    render(
      <LessonHistory
        conversations={mockConversations}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(mockConversations[0].preview)).toBeInTheDocument();
    expect(screen.getByText(mockConversations[1].preview)).toBeInTheDocument();
  });

  it("shows message count badges", () => {
    render(
      <LessonHistory
        conversations={mockConversations}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("6 msgs")).toBeInTheDocument();
    expect(screen.getByText("4 msgs")).toBeInTheDocument();
  });

  it("calls onSelect with correct id when a conversation is clicked", () => {
    const onSelect = vi.fn();
    render(
      <LessonHistory
        conversations={mockConversations}
        onSelect={onSelect}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText(mockConversations[0].preview));
    expect(onSelect).toHaveBeenCalledWith("conv-1");
  });

  it("calls onSelect on Enter key press", () => {
    const onSelect = vi.fn();
    render(
      <LessonHistory
        conversations={mockConversations}
        onSelect={onSelect}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const card = screen.getByText(mockConversations[0].preview).closest("[role='button']")!;
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("conv-1");
  });

  it("calls onDelete with correct id when delete button is clicked", () => {
    const onDelete = vi.fn();
    const onSelect = vi.fn();
    render(
      <LessonHistory
        conversations={mockConversations}
        onSelect={onSelect}
        onDelete={onDelete}
        onClose={vi.fn()}
      />
    );
    const deleteButtons = screen.getAllByLabelText("Delete conversation");
    fireEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith("conv-1");
    // onSelect should NOT have been called (stopPropagation)
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <LessonHistory
        conversations={mockConversations}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByLabelText("Close history"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows empty state when conversations array is empty", () => {
    render(
      <LessonHistory
        conversations={[]}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("No saved lessons yet")).toBeInTheDocument();
    expect(screen.getByText(/saved when you leave/)).toBeInTheDocument();
  });

  it("does not show count in subtitle when empty", () => {
    render(
      <LessonHistory
        conversations={[]}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("Lesson History")).toBeInTheDocument();
    expect(screen.queryByText(/\d+ saved/)).not.toBeInTheDocument();
  });

  it("shows fallback preview when preview is empty", () => {
    const convWithEmptyPreview: SavedConversation[] = [
      {
        id: "conv-x",
        savedAt: "2026-01-01T00:00:00.000Z",
        preview: "",
        messageCount: 2,
        messages: [
          { role: "user", text: "Hi" },
          { role: "assistant", text: "Hello" },
        ],
      },
    ];
    render(
      <LessonHistory
        conversations={convWithEmptyPreview}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("...")).toBeInTheDocument();
  });
});
