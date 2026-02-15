import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StatsPanel from "../StatsPanel";
import type { RankInfo, SessionStats } from "@/types";

const rank: RankInfo = {
  id: "quiet_tenant",
  korean: "조용한 세입자",
  english: "Quiet Tenant",
  description: "Moon-jo has noticed.",
  minXP: 100,
  minVocab: 10,
};

const nextRank: RankInfo = {
  id: "regular",
  korean: "단골",
  english: "Regular",
  description: "You know which stairs creak.",
  minXP: 500,
  minVocab: 30,
};

const stats: SessionStats = {
  totalMessages: 42,
  totalFlashcardSessions: 7,
  totalTranslations: 15,
  messagesWithoutTranslate: 3,
};

const defaultProps = {
  rank,
  rankProgress: 0.35,
  nextRank,
  totalXP: 240,
  currentStreak: 5,
  longestStreak: 12,
  stats,
  onClose: vi.fn(),
};

describe("StatsPanel", () => {
  it("renders rank card with Korean and English name", () => {
    render(<StatsPanel {...defaultProps} />);
    // Korean name appears twice: rank card + progress label
    expect(screen.getAllByText("조용한 세입자").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Quiet Tenant")).toBeTruthy();
  });

  it("renders rank description", () => {
    render(<StatsPanel {...defaultProps} />);
    // Description is wrapped in quotes, search for partial text
    expect(screen.getByText(/Moon-jo has noticed/)).toBeTruthy();
  });

  it("shows current and longest streak", () => {
    render(<StatsPanel {...defaultProps} />);
    expect(screen.getByText("5 days")).toBeTruthy();
    expect(screen.getByText("12 days")).toBeTruthy();
  });

  it("shows total XP", () => {
    render(<StatsPanel {...defaultProps} />);
    expect(screen.getByText("240")).toBeTruthy();
  });

  it("shows session stats", () => {
    render(<StatsPanel {...defaultProps} />);
    expect(screen.getByText("42")).toBeTruthy(); // messages
    expect(screen.getByText("7")).toBeTruthy();  // flashcard sessions
    expect(screen.getByText("15")).toBeTruthy(); // translations
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<StatsPanel {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close stats panel"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
