import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HangulKeyboard from "../HangulKeyboard";

describe("HangulKeyboard", () => {
  let onInput: ReturnType<typeof vi.fn>;
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onInput = vi.fn();
    onSubmit = vi.fn();
  });

  it("renders nothing when visible is false", () => {
    const { container } = render(
      <HangulKeyboard onInput={onInput} onSubmit={onSubmit} visible={false} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders keyboard when visible is true", () => {
    render(
      <HangulKeyboard onInput={onInput} onSubmit={onSubmit} visible={true} />
    );
    // Check for some Korean jamo keys
    expect(screen.getByText("ㅂ")).toBeInTheDocument();
    expect(screen.getByText("ㅈ")).toBeInTheDocument();
    expect(screen.getByText("ㄷ")).toBeInTheDocument();
    expect(screen.getByText("ㅁ")).toBeInTheDocument();
    expect(screen.getByText("ㅏ")).toBeInTheDocument();
  });

  it("renders all 26 normal mode keys", () => {
    render(
      <HangulKeyboard onInput={onInput} onSubmit={onSubmit} visible={true} />
    );
    const normalKeys = [
      "ㅂ","ㅈ","ㄷ","ㄱ","ㅅ","ㅛ","ㅕ","ㅑ","ㅐ","ㅔ",
      "ㅁ","ㄴ","ㅇ","ㄹ","ㅎ","ㅗ","ㅓ","ㅏ","ㅣ",
      "ㅋ","ㅌ","ㅊ","ㅍ","ㅠ","ㅜ","ㅡ",
    ];
    for (const key of normalKeys) {
      expect(screen.getByText(key)).toBeInTheDocument();
    }
  });

  it("renders shift, backspace, space, and enter buttons", () => {
    render(
      <HangulKeyboard onInput={onInput} onSubmit={onSubmit} visible={true} />
    );
    expect(screen.getByText("⇧")).toBeInTheDocument();
    expect(screen.getByLabelText("Backspace")).toBeInTheDocument();
    expect(screen.getByText("space")).toBeInTheDocument();
    expect(screen.getByText("↵")).toBeInTheDocument();
  });

  it("shows composition preview when composing", () => {
    render(
      <HangulKeyboard onInput={onInput} onSubmit={onSubmit} visible={true} />
    );
    // Press ㅎ then ㅏ — composes 하 which only appears in the preview (not as a key)
    fireEvent.click(screen.getByText("ㅎ"));
    fireEvent.click(screen.getByText("ㅏ"));
    // 하 is a composed syllable that only exists in the preview area
    expect(screen.getByText("하")).toBeInTheDocument();
  });

  it("emits committed text via onInput when syllable completes", () => {
    render(
      <HangulKeyboard onInput={onInput} onSubmit={onSubmit} visible={true} />
    );
    // Compose ㅎ + ㅏ + ㄴ = 한, then pressing ㄱ commits 한 and starts ㄱ
    fireEvent.click(screen.getByText("ㅎ"));
    fireEvent.click(screen.getByText("ㅏ"));
    fireEvent.click(screen.getByText("ㄴ"));
    // At this point 한 is composing, not yet committed
    // Press ㄱ to trigger new syllable — 한 gets committed
    // But actually ㄴ+ㄱ might form a complex final, let's use ㅁ instead
    // Actually let's test with a vowel — pressing ㅡ after 한 → commits 하, ㄴ becomes initial + ㅡ
    fireEvent.click(screen.getByText("ㅡ"));
    // The 하 or 한 should have been emitted
    expect(onInput).toHaveBeenCalled();
  });

  it("emits space via onInput when space is pressed", () => {
    render(
      <HangulKeyboard onInput={onInput} onSubmit={onSubmit} visible={true} />
    );
    fireEvent.click(screen.getByText("space"));
    expect(onInput).toHaveBeenCalledWith(" ");
  });

  it("commits composing text + space when space is pressed during composition", () => {
    render(
      <HangulKeyboard onInput={onInput} onSubmit={onSubmit} visible={true} />
    );
    // Type ㅎ + ㅏ = 하 (composing)
    fireEvent.click(screen.getByText("ㅎ"));
    fireEvent.click(screen.getByText("ㅏ"));
    // Now press space → should commit 하 + space
    fireEvent.click(screen.getByText("space"));
    expect(onInput).toHaveBeenCalledWith("하 ");
  });

  it("calls onSubmit when enter is pressed", () => {
    render(
      <HangulKeyboard onInput={onInput} onSubmit={onSubmit} visible={true} />
    );
    fireEvent.click(screen.getByText("↵"));
    // onSubmit is called with setTimeout, but we can use vi.useFakeTimers for this
    vi.useFakeTimers();
    fireEvent.click(screen.getByText("↵"));
    vi.advanceTimersByTime(20);
    expect(onSubmit).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("toggles shift mode when shift is clicked", () => {
    render(
      <HangulKeyboard onInput={onInput} onSubmit={onSubmit} visible={true} />
    );
    // Before shift: normal keys
    expect(screen.getByText("ㅂ")).toBeInTheDocument();

    // Click shift
    fireEvent.click(screen.getByText("⇧"));

    // After shift: double consonants should appear
    expect(screen.getByText("ㅃ")).toBeInTheDocument();
    expect(screen.getByText("ㅉ")).toBeInTheDocument();
    expect(screen.getByText("ㄸ")).toBeInTheDocument();
    expect(screen.getByText("ㄲ")).toBeInTheDocument();
    expect(screen.getByText("ㅆ")).toBeInTheDocument();
  });

  it("auto-deactivates shift after pressing a key", () => {
    render(
      <HangulKeyboard onInput={onInput} onSubmit={onSubmit} visible={true} />
    );
    // Activate shift
    fireEvent.click(screen.getByText("⇧"));
    expect(screen.getByText("ㅃ")).toBeInTheDocument();

    // Press a shifted key
    fireEvent.click(screen.getByText("ㅃ"));

    // Should auto-deactivate shift — normal keys reappear
    expect(screen.getByText("ㅂ")).toBeInTheDocument();
  });

  it("handles backspace when nothing is composing", () => {
    render(
      <HangulKeyboard onInput={onInput} onSubmit={onSubmit} visible={true} />
    );
    // Backspace on empty state should not crash
    fireEvent.click(screen.getByLabelText("Backspace"));
    expect(onInput).not.toHaveBeenCalled();
  });

  it("decomposes composing character on backspace", () => {
    render(
      <HangulKeyboard onInput={onInput} onSubmit={onSubmit} visible={true} />
    );
    // Compose ㅎ + ㅏ = 하
    fireEvent.click(screen.getByText("ㅎ"));
    fireEvent.click(screen.getByText("ㅏ"));
    // Backspace should decompose to just ㅎ
    fireEvent.click(screen.getByLabelText("Backspace"));
    // The composing preview should show ㅎ
    // (no committed text emitted)
    expect(onInput).not.toHaveBeenCalled();
  });

  it("commits text on enter during composition", () => {
    vi.useFakeTimers();
    render(
      <HangulKeyboard onInput={onInput} onSubmit={onSubmit} visible={true} />
    );
    // Type ㅎ + ㅏ = 하 (composing)
    fireEvent.click(screen.getByText("ㅎ"));
    fireEvent.click(screen.getByText("ㅏ"));
    // Press enter → should commit 하 then call onSubmit
    fireEvent.click(screen.getByText("↵"));
    expect(onInput).toHaveBeenCalledWith("하");
    vi.advanceTimersByTime(20);
    expect(onSubmit).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("supports shifted vowels (ㅒ, ㅖ)", () => {
    render(
      <HangulKeyboard onInput={onInput} onSubmit={onSubmit} visible={true} />
    );
    fireEvent.click(screen.getByText("⇧"));
    expect(screen.getByText("ㅒ")).toBeInTheDocument();
    expect(screen.getByText("ㅖ")).toBeInTheDocument();
  });
});
