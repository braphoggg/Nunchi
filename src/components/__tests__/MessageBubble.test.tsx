import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MessageBubble from "../MessageBubble";
import type { UIMessage } from "ai";

function createMessage(
  overrides: Partial<UIMessage> & { role: UIMessage["role"] }
): UIMessage {
  return {
    id: "test-id",
    parts: [{ type: "text" as const, text: "Test message" }],
    ...overrides,
  };
}

// Mock clipboard
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

describe("MessageBubble", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders user message text", () => {
    const message = createMessage({
      role: "user",
      parts: [{ type: "text" as const, text: "Hello Moon-jo" }],
    });
    render(<MessageBubble message={message} />);
    expect(screen.getByText("Hello Moon-jo")).toBeInTheDocument();
  });

  it("renders assistant message text", () => {
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "Welcome, new resident." }],
    });
    render(<MessageBubble message={message} />);
    expect(screen.getByText(/Welcome, new resident/)).toBeInTheDocument();
  });

  it("shows the sender name for assistant messages", () => {
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "Hello" }],
    });
    render(<MessageBubble message={message} />);
    expect(screen.getByText("서문조")).toBeInTheDocument();
  });

  it("does not show sender name for user messages", () => {
    const message = createMessage({
      role: "user",
      parts: [{ type: "text" as const, text: "Hi" }],
    });
    render(<MessageBubble message={message} />);
    expect(screen.queryByText("서문조")).not.toBeInTheDocument();
  });

  it("applies left alignment for assistant messages", () => {
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "assistant text" }],
    });
    const { container } = render(<MessageBubble message={message} />);
    expect(container.querySelector(".justify-start")).toBeInTheDocument();
  });

  it("applies right alignment for user messages", () => {
    const message = createMessage({
      role: "user",
      parts: [{ type: "text" as const, text: "user text" }],
    });
    const { container } = render(<MessageBubble message={message} />);
    expect(container.querySelector(".justify-end")).toBeInTheDocument();
  });

  it("formats bold text in assistant messages", () => {
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "Learn **한국어**" }],
    });
    render(<MessageBubble message={message} />);
    const strong = screen.getByText("한국어");
    expect(strong.tagName).toBe("STRONG");
  });

  it("handles messages with multiple text parts", () => {
    const message = createMessage({
      role: "user",
      parts: [
        { type: "text" as const, text: "Part 1 " },
        { type: "text" as const, text: "Part 2" },
      ],
    });
    render(<MessageBubble message={message} />);
    expect(screen.getByText("Part 1 Part 2")).toBeInTheDocument();
  });

  it("renders translate button for assistant messages", () => {
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "안녕하세요" }],
    });
    render(<MessageBubble message={message} />);
    expect(screen.getByRole("button", { name: "Translate message" })).toBeInTheDocument();
  });

  it("shows 'Translating...' while fetching translation", async () => {
    vi.spyOn(global, "fetch").mockImplementation(
      () => new Promise(() => {})
    );

    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "안녕하세요" }],
    });
    render(<MessageBubble message={message} />);

    fireEvent.click(screen.getByRole("button", { name: "Translate message" }));

    expect(screen.getByText("Translating...")).toBeInTheDocument();
  });

  it("shows translation after successful fetch", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ translation: "Hello" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "안녕하세요" }],
    });
    render(<MessageBubble message={message} />);

    fireEvent.click(screen.getByRole("button", { name: "Translate message" }));

    await waitFor(() => {
      expect(screen.getByText(/Hello/)).toBeInTheDocument();
    });
  });

  it("toggles back to original on second click", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ translation: "Hello" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "안녕하세요" }],
    });
    render(<MessageBubble message={message} />);

    fireEvent.click(screen.getByRole("button", { name: "Translate message" }));
    await waitFor(() => {
      expect(screen.getByText(/Hello/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Translate message" }));
    await waitFor(() => {
      expect(screen.getByText(/안녕하세요/)).toBeInTheDocument();
    });
  });

  it("shows error message when translation fails", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"));

    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "안녕하세요" }],
    });
    render(<MessageBubble message={message} />);

    fireEvent.click(screen.getByRole("button", { name: "Translate message" }));

    await waitFor(() => {
      expect(screen.getByText(/Translation failed/)).toBeInTheDocument();
    });
  });

  it("uses cached translation on re-toggle (no second fetch)", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ translation: "Hello" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "안녕하세요" }],
    });
    render(<MessageBubble message={message} />);

    fireEvent.click(screen.getByRole("button", { name: "Translate message" }));
    await waitFor(() => {
      expect(screen.getByText(/Hello/)).toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Translate message" }));
    await waitFor(() => {
      expect(screen.getByText(/안녕하세요/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Translate message" }));
    await waitFor(() => {
      expect(screen.getByText(/Hello/)).toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  // New tests for Phase 4 features

  it("renders a timestamp on messages", () => {
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "Hello" }],
    });
    render(<MessageBubble message={message} />);
    // Timestamp matches X:XX AM pattern
    expect(screen.getByText(/\d:\d{2} AM/)).toBeInTheDocument();
  });

  it("renders copy button on messages", () => {
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "Hello" }],
    });
    render(<MessageBubble message={message} />);
    expect(screen.getByLabelText("Copy message")).toBeInTheDocument();
  });

  it("copies content to clipboard when copy button is clicked", async () => {
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "Learn Korean" }],
    });
    render(<MessageBubble message={message} />);

    fireEvent.click(screen.getByLabelText("Copy message"));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Learn Korean");
    });
  });

  it("renders copy button for user messages", () => {
    const message = createMessage({
      role: "user",
      parts: [{ type: "text" as const, text: "Hello" }],
    });
    render(<MessageBubble message={message} />);
    expect(screen.getByLabelText("Copy message")).toBeInTheDocument();
  });

  it("does not render translate or TTS buttons for user messages", () => {
    const message = createMessage({
      role: "user",
      parts: [{ type: "text" as const, text: "Hello" }],
    });
    render(<MessageBubble message={message} />);
    expect(screen.queryByLabelText("Translate message")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Read message aloud")).not.toBeInTheDocument();
  });

  it("shows read receipt on user messages", () => {
    const message = createMessage({
      role: "user",
      parts: [{ type: "text" as const, text: "hi" }],
    });
    render(<MessageBubble message={message} />);
    expect(screen.getByText("읽음")).toBeInTheDocument();
  });

  it("does not show read receipt on assistant messages", () => {
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "hi" }],
    });
    render(<MessageBubble message={message} />);
    expect(screen.queryByText("읽음")).not.toBeInTheDocument();
  });

  it("has aria-pressed attribute on assistant translate button", () => {
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "hi" }],
    });
    render(<MessageBubble message={message} />);
    const btn = screen.getByRole("button", { name: "Translate message" });
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  // Vocabulary save tests

  it("renders save vocabulary button on assistant messages that contain vocabulary", () => {
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "Learn **안녕** (annyeong) hello" }],
    });
    render(<MessageBubble message={message} onSaveWords={vi.fn()} isWordSaved={vi.fn().mockReturnValue(false)} />);
    expect(screen.getByLabelText("Save vocabulary")).toBeInTheDocument();
  });

  it("does not render save vocabulary button on user messages", () => {
    const message = createMessage({
      role: "user",
      parts: [{ type: "text" as const, text: "**안녕** (annyeong) hello" }],
    });
    render(<MessageBubble message={message} onSaveWords={vi.fn()} isWordSaved={vi.fn()} />);
    expect(screen.queryByLabelText("Save vocabulary")).not.toBeInTheDocument();
  });

  it("does not render save vocabulary button when message has no vocabulary", () => {
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "Welcome to Room 203." }],
    });
    render(<MessageBubble message={message} onSaveWords={vi.fn()} isWordSaved={vi.fn()} />);
    expect(screen.queryByLabelText("Save vocabulary")).not.toBeInTheDocument();
  });

  it("calls onSaveWords with parsed vocabulary when save button is clicked (legacy format with English)", async () => {
    const onSaveWords = vi.fn();
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "Learn **문** (mun) door" }],
    });
    render(<MessageBubble message={message} onSaveWords={onSaveWords} isWordSaved={vi.fn().mockReturnValue(false)} />);

    fireEvent.click(screen.getByLabelText("Save vocabulary"));

    await waitFor(() => {
      expect(onSaveWords).toHaveBeenCalledWith([
        { korean: "문", romanization: "mun", english: "door" },
      ]);
    });
  });

  it("fetches English translations for Korean-only vocabulary before saving", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ translations: { "문": "door" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const onSaveWords = vi.fn();
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "**문** (mun)" }],
    });
    render(<MessageBubble message={message} onSaveWords={onSaveWords} isWordSaved={vi.fn().mockReturnValue(false)} />);

    fireEvent.click(screen.getByLabelText("Save vocabulary"));

    // Should show "Saving..." while fetching
    expect(screen.getByText("Saving...")).toBeInTheDocument();

    await waitFor(() => {
      expect(onSaveWords).toHaveBeenCalledWith([
        { korean: "문", romanization: "mun", english: "door" },
      ]);
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/vocabulary-translate", expect.any(Object));
  });

  it("saves vocabulary with empty English if translation API fails", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"));
    const onSaveWords = vi.fn();
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "**문** (mun)" }],
    });
    render(<MessageBubble message={message} onSaveWords={onSaveWords} isWordSaved={vi.fn().mockReturnValue(false)} />);

    fireEvent.click(screen.getByLabelText("Save vocabulary"));

    await waitFor(() => {
      expect(onSaveWords).toHaveBeenCalledWith([
        { korean: "문", romanization: "mun", english: "" },
      ]);
    });
  });

  it("does not render save button when onSaveWords is not provided", () => {
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "Learn **안녕** (annyeong) hello" }],
    });
    render(<MessageBubble message={message} />);
    expect(screen.queryByLabelText("Save vocabulary")).not.toBeInTheDocument();
  });

});
