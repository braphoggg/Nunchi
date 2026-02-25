import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HelpModal from "../HelpModal";

describe("HelpModal", () => {
  it("renders the help title in Korean and English", () => {
    render(<HelpModal onClose={vi.fn()} />);
    expect(screen.getByText(/도움말/)).toBeInTheDocument();
    expect(screen.getByText(/How to use Nunchi/)).toBeInTheDocument();
  });

  it("shows tab navigation with 5 tabs", () => {
    render(<HelpModal onClose={vi.fn()} />);
    expect(screen.getByText(/소개/)).toBeInTheDocument();
    expect(screen.getByText(/성장/)).toBeInTheDocument();
    expect(screen.getByText(/대화/)).toBeInTheDocument();
    expect(screen.getByText(/단어/)).toBeInTheDocument();
    expect(screen.getByText(/도구/)).toBeInTheDocument();
  });

  it("shows Intro tab content by default", () => {
    render(<HelpModal onClose={vi.fn()} />);
    expect(screen.getByText("Welcome to Room 203")).toBeInTheDocument();
    expect(screen.getByText(/Moon-jo.s Mood/)).toBeInTheDocument();
    expect(screen.getByText(/Night Progression/)).toBeInTheDocument();
  });

  it("shows Progress tab when clicked", () => {
    render(<HelpModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/성장/));
    expect(screen.getByText(/Earning XP/)).toBeInTheDocument();
    expect(screen.getByText(/5-15 XP/)).toBeInTheDocument();
    expect(screen.getByText(/Resident Ranks/)).toBeInTheDocument();
    expect(screen.getByText(/새 입주자/)).toBeInTheDocument();
    expect(screen.getByText(/층 선배/)).toBeInTheDocument();
  });

  it("shows Chat tab with keyboard and translation info", () => {
    render(<HelpModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/대화/));
    expect(screen.getByText(/Korean Keyboard/)).toBeInTheDocument();
    expect(screen.getByText(/Sending Messages/)).toBeInTheDocument();
    expect(screen.getByText(/Keyboard Shortcuts/)).toBeInTheDocument();
  });

  it("shows Words tab with vocabulary and flashcard info", () => {
    render(<HelpModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/단어/));
    expect(screen.getByText(/Saving Vocabulary/)).toBeInTheDocument();
    expect(screen.getByText(/Studying Flashcards/)).toBeInTheDocument();
  });

  it("shows Tools tab with history, share, sound, leave info", () => {
    render(<HelpModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/도구/));
    expect(screen.getByText(/Lesson Topics/)).toBeInTheDocument();
    expect(screen.getByText(/Lesson History/)).toBeInTheDocument();
    expect(screen.getByText(/Share Conversation/)).toBeInTheDocument();
    expect(screen.getByText(/Sound/)).toBeInTheDocument();
    expect(screen.getByText(/Learning Tips/)).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<HelpModal onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close help"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("displays the Moon-jo closing quote", () => {
    render(<HelpModal onClose={vi.fn()} />);
    expect(screen.getByText(/Seo Moon-jo, Room 203/)).toBeInTheDocument();
  });

  it("shows replay tutorial button when onReplayTutorial is provided", () => {
    render(<HelpModal onClose={vi.fn()} onReplayTutorial={vi.fn()} />);
    expect(screen.getByText(/Replay Interactive Tutorial/)).toBeInTheDocument();
  });

  it("calls onReplayTutorial when replay button is clicked", () => {
    const onReplay = vi.fn();
    render(<HelpModal onClose={vi.fn()} onReplayTutorial={onReplay} />);
    fireEvent.click(screen.getByText(/Replay Interactive Tutorial/));
    expect(onReplay).toHaveBeenCalledTimes(1);
  });

  it("does not show replay button when onReplayTutorial is not provided", () => {
    render(<HelpModal onClose={vi.fn()} />);
    expect(screen.queryByText(/Replay Interactive Tutorial/)).not.toBeInTheDocument();
  });
});
