import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TypingIndicator from "../TypingIndicator";

describe("TypingIndicator", () => {
  it("displays typing text with character name", () => {
    render(<TypingIndicator />);
    expect(screen.getByText(/서문조 is typing/)).toBeInTheDocument();
  });

  it("renders three bouncing dots", () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll(".animate-bounce");
    expect(dots).toHaveLength(3);
  });

  it("has the message-in animation class", () => {
    const { container } = render(<TypingIndicator />);
    expect(
      container.querySelector(".animate-message-in")
    ).toBeInTheDocument();
  });
});
