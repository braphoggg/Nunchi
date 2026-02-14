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

  // TTS tests

  it("renders TTS button on assistant messages", () => {
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "안녕하세요" }],
    });
    render(<MessageBubble message={message} />);
    expect(screen.getByLabelText("Read message aloud")).toBeInTheDocument();
  });

  it("does not render TTS button on user messages", () => {
    const message = createMessage({
      role: "user",
      parts: [{ type: "text" as const, text: "Hello" }],
    });
    render(<MessageBubble message={message} />);
    expect(screen.queryByLabelText("Read message aloud")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Stop reading")).not.toBeInTheDocument();
  });

  it("calls speechSynthesis.speak with Korean lang when TTS button is clicked", () => {
    mockSpeak.mockClear();
    mockCancel.mockClear();
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "안녕하세요" }],
    });
    render(<MessageBubble message={message} />);

    fireEvent.click(screen.getByLabelText("Read message aloud"));

    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const utterance = mockSpeak.mock.calls[0][0];
    expect(utterance.text).toBe("안녕하세요");
    expect(utterance.lang).toBe("ko-KR");
    expect(utterance.rate).toBe(0.9);
  });

  it("TTS button click does not trigger translation", () => {
    vi.spyOn(global, "fetch").mockImplementation(() => new Promise(() => {}));
    mockSpeak.mockClear();
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "안녕하세요" }],
    });
    render(<MessageBubble message={message} />);

    fireEvent.click(screen.getByLabelText("Read message aloud"));

    // fetch should not be called — translation was not triggered
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows stop icon and cancels speech when clicked while speaking", () => {
    mockSpeak.mockClear();
    mockCancel.mockClear();
    const message = createMessage({
      role: "assistant",
      parts: [{ type: "text" as const, text: "안녕하세요" }],
    });
    render(<MessageBubble message={message} />);

    // Start speaking
    fireEvent.click(screen.getByLabelText("Read message aloud"));
    expect(mockSpeak).toHaveBeenCalledTimes(1);

    // Now button should show "Stop reading"
    expect(screen.getByLabelText("Stop reading")).toBeInTheDocument();

    // Click again to stop
    fireEvent.click(screen.getByLabelText("Stop reading"));
    expect(mockCancel).toHaveBeenCalled();
  });
});
