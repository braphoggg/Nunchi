import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TopBar from "../TopBar";
import type { RankInfo } from "@/types";

const mockRank: RankInfo = {
  id: "quiet_tenant",
  korean: "조용한 세입자",
  english: "Quiet Tenant",
  description: "Moon-jo has noticed.",
  minXP: 100,
  minVocab: 10,
};

describe("TopBar", () => {
  it("renders the character name in Korean and English", () => {
    render(<TopBar />);
    expect(screen.getByText(/서문조/)).toBeInTheDocument();
    expect(screen.getByText(/Seo Moon-jo/)).toBeInTheDocument();
  });

  it("displays the avatar with aria-label", () => {
    render(<TopBar />);
    // Avatar wrapper carries the aria-label (mood dot overlaid on it)
    expect(screen.getByLabelText(/Moon-jo avatar/)).toBeInTheDocument();
  });

  it("shows mood status indicator on avatar", () => {
    render(<TopBar />);
    // Mood dot is overlaid on avatar — label exposed via title attribute
    expect(screen.getByTitle("Moon-jo is watching")).toBeInTheDocument();
  });

  it("calls onReset when leave button is clicked", () => {
    const onReset = vi.fn();
    render(<TopBar onReset={onReset} />);
    fireEvent.click(screen.getByLabelText("Leave Room 203"));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("does not render reset button when onReset is not provided", () => {
    render(<TopBar />);
    expect(screen.queryByLabelText("Leave Room 203")).not.toBeInTheDocument();
  });

  // Vocabulary button tests

  it("renders vocabulary button when onToggleVocabulary is provided", () => {
    render(<TopBar onToggleVocabulary={vi.fn()} />);
    expect(screen.getByLabelText("Open vocabulary list")).toBeInTheDocument();
  });

  it("does not render vocabulary button when onToggleVocabulary is not provided", () => {
    render(<TopBar />);
    expect(screen.queryByLabelText("Open vocabulary list")).not.toBeInTheDocument();
  });

  it("calls onToggleVocabulary when vocabulary button is clicked", () => {
    const onToggleVocabulary = vi.fn();
    render(<TopBar onToggleVocabulary={onToggleVocabulary} />);
    fireEvent.click(screen.getByLabelText("Open vocabulary list"));
    expect(onToggleVocabulary).toHaveBeenCalledTimes(1);
  });

  it("shows word count badge when vocabularyCount > 0", () => {
    render(<TopBar onToggleVocabulary={vi.fn()} vocabularyCount={5} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("does not show badge when vocabularyCount is 0", () => {
    render(<TopBar onToggleVocabulary={vi.fn()} vocabularyCount={0} />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("caps badge display at 99", () => {
    render(<TopBar onToggleVocabulary={vi.fn()} vocabularyCount={150} />);
    expect(screen.getByText("99")).toBeInTheDocument();
  });

  it("renders settings button when onToggleSettings is provided", () => {
    const onToggleSettings = vi.fn();
    render(<TopBar onToggleSettings={onToggleSettings} />);
    fireEvent.click(screen.getByLabelText("Open settings"));
    expect(onToggleSettings).toHaveBeenCalledTimes(1);
  });
});
