import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HelpModal from "../HelpModal";

describe("HelpModal", () => {
  it("renders the help title in Korean and English", () => {
    render(<HelpModal onClose={vi.fn()} />);
    expect(screen.getByText(/도움말/)).toBeInTheDocument();
    expect(screen.getByText(/Help/)).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<HelpModal onClose={vi.fn()} />);
    expect(screen.getByText("How to use Nunchi")).toBeInTheDocument();
  });

  it("displays XP earning rules", () => {
    render(<HelpModal onClose={vi.fn()} />);
    expect(screen.getByText(/Earning XP/)).toBeInTheDocument();
    expect(screen.getByText(/5-15 XP/)).toBeInTheDocument();
  });

  it("displays rank progression info", () => {
    render(<HelpModal onClose={vi.fn()} />);
    expect(screen.getByText(/Resident Ranks/)).toBeInTheDocument();
    expect(screen.getByText(/새 입주자/)).toBeInTheDocument();
    expect(screen.getByText(/층 선배/)).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<HelpModal onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close help"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("displays keyboard shortcuts section", () => {
    render(<HelpModal onClose={vi.fn()} />);
    expect(screen.getByText(/Keyboard Shortcuts/)).toBeInTheDocument();
    expect(screen.getByText(/Enter/)).toBeInTheDocument();
    expect(screen.getByText(/Escape/)).toBeInTheDocument();
  });

  it("displays learning tips", () => {
    render(<HelpModal onClose={vi.fn()} />);
    expect(screen.getByText(/Learning Tips/)).toBeInTheDocument();
  });

  it("displays the Moon-jo closing quote", () => {
    render(<HelpModal onClose={vi.fn()} />);
    expect(screen.getByText(/Seo Moon-jo, Room 203/)).toBeInTheDocument();
  });
});
