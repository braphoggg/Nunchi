import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GoshiwonEventBubble from "../GoshiwonEventBubble";
import type { GoshiwonEvent } from "@/lib/goshiwon-events";

const mockEvent: GoshiwonEvent = {
  korean: "복도 끝 형광등이 깜빡인다…",
  english: "The fluorescent light at the end of the hallway flickers…",
};

describe("GoshiwonEventBubble", () => {
  it("renders the Korean event text", () => {
    render(<GoshiwonEventBubble event={mockEvent} onDismiss={vi.fn()} />);
    expect(screen.getByText(mockEvent.korean)).toBeInTheDocument();
  });

  it("renders the English event text", () => {
    render(<GoshiwonEventBubble event={mockEvent} onDismiss={vi.fn()} />);
    expect(screen.getByText(mockEvent.english)).toBeInTheDocument();
  });

  it("calls onDismiss when clicked", () => {
    const onDismiss = vi.fn();
    render(<GoshiwonEventBubble event={mockEvent} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss on Enter key", () => {
    const onDismiss = vi.fn();
    render(<GoshiwonEventBubble event={mockEvent} onDismiss={onDismiss} />);
    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss on Space key", () => {
    const onDismiss = vi.fn();
    render(<GoshiwonEventBubble event={mockEvent} onDismiss={onDismiss} />);
    fireEvent.keyDown(screen.getByRole("button"), { key: " " });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not call onDismiss on other keys", () => {
    const onDismiss = vi.fn();
    render(<GoshiwonEventBubble event={mockEvent} onDismiss={onDismiss} />);
    fireEvent.keyDown(screen.getByRole("button"), { key: "Tab" });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("has dismiss aria-label for accessibility", () => {
    render(<GoshiwonEventBubble event={mockEvent} onDismiss={vi.fn()} />);
    expect(screen.getByLabelText("Dismiss event")).toBeInTheDocument();
  });
});
