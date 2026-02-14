import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TopBar from "../TopBar";

describe("TopBar", () => {
  it("renders the character name in Korean and English", () => {
    render(<TopBar />);
    expect(screen.getByText(/서문조/)).toBeInTheDocument();
    expect(screen.getByText(/Seo Moon-jo/)).toBeInTheDocument();
  });

  it("displays the avatar with aria-label", () => {
    render(<TopBar />);
    expect(screen.getByRole("img", { name: "Moon-jo avatar" })).toBeInTheDocument();
  });

  it("shows the location description", () => {
    render(<TopBar />);
    expect(screen.getByText(/Room 203/)).toBeInTheDocument();
    expect(screen.getByText(/Eden Goshiwon/)).toBeInTheDocument();
  });

  it("shows online status indicator", () => {
    render(<TopBar />);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("calls onReset when leave button is clicked", () => {
    const onReset = vi.fn();
    render(<TopBar onReset={onReset} />);
    fireEvent.click(screen.getByLabelText("Leave Room 203"));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("calls onToggleMute when mute button is clicked", () => {
    const onToggleMute = vi.fn();
    render(<TopBar onToggleMute={onToggleMute} isMuted={false} />);
    fireEvent.click(screen.getByLabelText("Mute sounds"));
    expect(onToggleMute).toHaveBeenCalledTimes(1);
  });

  it("shows unmute label when muted", () => {
    render(<TopBar onToggleMute={vi.fn()} isMuted={true} />);
    expect(screen.getByLabelText("Unmute sounds")).toBeInTheDocument();
  });

  it("does not render reset button when onReset is not provided", () => {
    render(<TopBar />);
    expect(screen.queryByLabelText("Leave Room 203")).not.toBeInTheDocument();
  });
});
