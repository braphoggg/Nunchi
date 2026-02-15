import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StatsBar from "../StatsBar";
import type { RankInfo } from "@/types";

const mockRank: RankInfo = {
  id: "quiet_tenant",
  korean: "조용한 세입자",
  english: "Quiet Tenant",
  description: "Moon-jo has noticed.",
  minXP: 100,
  minVocab: 10,
};

const defaultProps = {
  streak: 3,
  totalXP: 245,
  rank: mockRank,
  rankProgress: 0.4,
  onToggleStats: vi.fn(),
};

describe("StatsBar", () => {
  it("renders streak count", () => {
    render(<StatsBar {...defaultProps} />);
    expect(screen.getByText("3 days")).toBeTruthy();
  });

  it("renders XP total", () => {
    render(<StatsBar {...defaultProps} />);
    expect(screen.getByText("245 XP")).toBeTruthy();
  });

  it("renders rank name in Korean", () => {
    render(<StatsBar {...defaultProps} />);
    expect(screen.getByText("조용한 세입자")).toBeTruthy();
  });

  it("shows appropriate label when streak is 0", () => {
    render(<StatsBar {...defaultProps} streak={0} />);
    expect(screen.getByText("You haven't started")).toBeTruthy();
  });

  it("shows progress bar with correct width", () => {
    const { container } = render(<StatsBar {...defaultProps} rankProgress={0.6} />);
    const progressBar = container.querySelector("[style]");
    expect(progressBar).toBeTruthy();
    // The inner progress bar should have width: 60%
    const innerBars = container.querySelectorAll(".bg-goshiwon-yellow");
    const progressInner = Array.from(innerBars).find(
      (el) => (el as HTMLElement).style.width
    ) as HTMLElement | undefined;
    expect(progressInner?.style.width).toBe("60%");
  });

  it("calls onToggleStats when clicked", () => {
    const onClick = vi.fn();
    render(<StatsBar {...defaultProps} onToggleStats={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("applies accent color for 0 streak vs yellow for active", () => {
    const { container: c0 } = render(<StatsBar {...defaultProps} streak={0} />);
    const flame0 = c0.querySelector(".text-goshiwon-accent");
    expect(flame0).toBeTruthy();

    const { container: c3 } = render(<StatsBar {...defaultProps} streak={3} />);
    const flame3 = c3.querySelector("span.text-goshiwon-yellow");
    expect(flame3).toBeTruthy();
  });

  it("renders atmospheric streak label for 7+ days", () => {
    render(<StatsBar {...defaultProps} streak={10} />);
    expect(screen.getByText(/You can't leave/)).toBeTruthy();
  });
});
