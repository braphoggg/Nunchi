import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AchievementToast from "../AchievementToast";

describe("AchievementToast", () => {
  const achievement = {
    id: "first_word",
    title: "First Word",
    titleKr: "첫 단어",
    icon: "📝",
  };

  it("renders achievement title", () => {
    render(<AchievementToast achievement={achievement} />);
    expect(screen.getByText("First Word")).toBeTruthy();
  });

  it("renders achievement Korean title", () => {
    render(<AchievementToast achievement={achievement} />);
    expect(screen.getByText("첫 단어")).toBeTruthy();
  });

  it("renders achievement icon", () => {
    render(<AchievementToast achievement={achievement} />);
    expect(screen.getByText("📝")).toBeTruthy();
  });

  it("has pointer-events-none class for non-interactive overlay", () => {
    const { container } = render(<AchievementToast achievement={achievement} />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain("pointer-events-none");
  });

  it("applies xp-toast animation class", () => {
    const { container } = render(<AchievementToast achievement={achievement} />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain("animate-xp-toast");
  });
});
