import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import XPToast from "../XPToast";

describe("XPToast", () => {
  it("renders XP amount with plus sign", () => {
    render(<XPToast amount={15} action="message_full_korean" />);
    expect(screen.getByText("+15 XP")).toBeTruthy();
  });

  it("renders action label for message_korean", () => {
    render(<XPToast amount={5} action="message_korean" />);
    expect(screen.getByText("Korean message")).toBeTruthy();
  });

  it("renders action label for flashcard_session", () => {
    render(<XPToast amount={20} action="flashcard_session" />);
    expect(screen.getByText("Flashcards")).toBeTruthy();
  });

  it("has the animate-xp-toast CSS class", () => {
    const { container } = render(<XPToast amount={8} action="no_translate" />);
    const el = container.firstElementChild;
    expect(el?.classList.contains("animate-xp-toast")).toBe(true);
  });
});
