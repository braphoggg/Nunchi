import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "../ErrorBoundary";

// Mock data-backup module
vi.mock("@/lib/data-backup", () => ({
  createBackup: vi.fn(() => ({ version: 1, exportedAt: "2024-01-01", data: {} })),
  downloadBackup: vi.fn(),
}));

// Suppress console.error from React/ErrorBoundary during tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

import { afterAll } from "vitest";

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Test error message");
  return <div>Child renders fine</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Child renders fine")).toBeTruthy();
  });

  it("renders fallback UI when child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText(/unexpected error/)).toBeTruthy();
  });

  it("displays the error message", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Test error message")).toBeTruthy();
  });

  it("shows Reload Application button", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Reload Application")).toBeTruthy();
  });

  it("shows Export Data First button", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Export Data First")).toBeTruthy();
  });

  it("calls downloadBackup when Export Data First is clicked", async () => {
    const { downloadBackup } = await import("@/lib/data-backup");
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByText("Export Data First"));
    expect(downloadBackup).toHaveBeenCalled();
  });

  it("shows cache clearing advice", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/clearing your browser cache/)).toBeTruthy();
  });
});
