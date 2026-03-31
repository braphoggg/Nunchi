import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NetworkBanner from "../NetworkBanner";

describe("NetworkBanner", () => {
  it("renders nothing when online and was never offline", () => {
    const { container } = render(
      <NetworkBanner isOnline={true} wasOffline={false} onDismiss={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows offline message when not online", () => {
    render(
      <NetworkBanner isOnline={false} wasOffline={false} onDismiss={vi.fn()} />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
    expect(screen.getByText(/vocabulary.*flashcards still work/i)).toBeInTheDocument();
  });

  it("shows reconnected message when back online after being offline", () => {
    render(
      <NetworkBanner isOnline={true} wasOffline={true} onDismiss={vi.fn()} />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Back online")).toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button is clicked (reconnected state)", () => {
    const onDismiss = vi.fn();
    render(
      <NetworkBanner isOnline={true} wasOffline={true} onDismiss={onDismiss} />,
    );

    fireEvent.click(screen.getByLabelText("Dismiss"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not show dismiss button when offline", () => {
    render(
      <NetworkBanner isOnline={false} wasOffline={false} onDismiss={vi.fn()} />,
    );

    expect(screen.queryByLabelText("Dismiss")).not.toBeInTheDocument();
  });

  it("has aria-live polite for accessibility", () => {
    render(
      <NetworkBanner isOnline={false} wasOffline={false} onDismiss={vi.fn()} />,
    );

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});
