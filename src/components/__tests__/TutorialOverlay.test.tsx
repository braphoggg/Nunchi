import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TutorialOverlay from "../TutorialOverlay";
import type { TutorialStep } from "@/lib/tutorial-steps";

// ─── DOM API mocks ────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // MutationObserver
  global.MutationObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
  }));

  // scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
});

// ─── helpers ──────────────────────────────────────────────────────

function makeStep(overrides: Partial<TutorialStep> = {}): TutorialStep {
  return {
    id: "test-step",
    title: "Welcome to Nunchi",
    titleKr: "눈치에 오신 걸 환영합니다",
    description: "This is the main chat area where you talk to Moon-jo.",
    moonjoSays: "오... 새로운 이웃이군요.",
    tooltipPosition: "center",
    type: "observe",
    ...overrides,
  };
}

const defaultProps = {
  step: makeStep(),
  stepIndex: 0,
  totalSteps: 5,
  onNext: vi.fn(),
  onPrev: vi.fn(),
  onSkip: vi.fn(),
};

// ─── tests ────────────────────────────────────────────────────────

describe("TutorialOverlay", () => {
  it("renders dialog with correct role and aria-label", () => {
    render(<TutorialOverlay {...defaultProps} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute(
      "aria-label",
      "Tutorial step 1: Welcome to Nunchi",
    );
  });

  it("shows step counter", () => {
    render(<TutorialOverlay {...defaultProps} />);
    expect(screen.getByText("1 / 5")).toBeInTheDocument();
  });

  it("shows Korean title (titleKr)", () => {
    render(<TutorialOverlay {...defaultProps} />);
    expect(
      screen.getByText("눈치에 오신 걸 환영합니다"),
    ).toBeInTheDocument();
  });

  it("shows English title", () => {
    render(<TutorialOverlay {...defaultProps} />);
    expect(screen.getByText("Welcome to Nunchi")).toBeInTheDocument();
  });

  it("shows description text", () => {
    render(<TutorialOverlay {...defaultProps} />);
    expect(
      screen.getByText(
        "This is the main chat area where you talk to Moon-jo.",
      ),
    ).toBeInTheDocument();
  });

  it('shows "Next →" button for non-last observe steps', () => {
    render(<TutorialOverlay {...defaultProps} stepIndex={0} totalSteps={5} />);
    expect(screen.getByText("Next →")).toBeInTheDocument();
  });

  it('shows "Finish" button for last step', () => {
    render(<TutorialOverlay {...defaultProps} stepIndex={4} totalSteps={5} />);
    expect(screen.getByText("Finish")).toBeInTheDocument();
  });

  it('shows "Waiting..." for interact steps instead of Next button', () => {
    const interactStep = makeStep({ type: "interact" });
    render(
      <TutorialOverlay {...defaultProps} step={interactStep} />,
    );
    expect(screen.getByText("Waiting...")).toBeInTheDocument();
    expect(screen.queryByText("Next →")).not.toBeInTheDocument();
  });

  it("Back button is disabled on first step (stepIndex 0)", () => {
    render(<TutorialOverlay {...defaultProps} stepIndex={0} />);
    const backBtn = screen.getByText("← Back");
    expect(backBtn).toBeDisabled();
  });

  it("Back button is enabled on non-first step", () => {
    render(<TutorialOverlay {...defaultProps} stepIndex={2} />);
    const backBtn = screen.getByText("← Back");
    expect(backBtn).not.toBeDisabled();
  });

  it("Next button calls onNext", () => {
    const onNext = vi.fn();
    render(<TutorialOverlay {...defaultProps} onNext={onNext} />);
    fireEvent.click(screen.getByText("Next →"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("Back button calls onPrev", () => {
    const onPrev = vi.fn();
    render(
      <TutorialOverlay {...defaultProps} stepIndex={2} onPrev={onPrev} />,
    );
    fireEvent.click(screen.getByText("← Back"));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("Skip button calls onSkip", () => {
    const onSkip = vi.fn();
    render(<TutorialOverlay {...defaultProps} onSkip={onSkip} />);
    fireEvent.click(screen.getByLabelText("Skip tutorial"));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("shows interaction hint for interact steps", () => {
    const step = makeStep({
      type: "interact",
      interactionHint: "Type something in the chat box",
    });
    render(<TutorialOverlay {...defaultProps} step={step} />);
    expect(
      screen.getByText("Type something in the chat box"),
    ).toBeInTheDocument();
  });

  it('shows secondary interaction hint with "— or —" separator', () => {
    const step = makeStep({
      type: "interact",
      interactionHint: "Click the button",
      secondaryInteractionHint: "Press Enter instead",
    });
    render(<TutorialOverlay {...defaultProps} step={step} />);
    expect(screen.getByText("Click the button")).toBeInTheDocument();
    expect(screen.getByText("— or —")).toBeInTheDocument();
    expect(screen.getByText("Press Enter instead")).toBeInTheDocument();
  });

  it("does NOT show interaction hints for observe steps", () => {
    const step = makeStep({
      type: "observe",
      interactionHint: "This should not appear",
    });
    render(<TutorialOverlay {...defaultProps} step={step} />);
    expect(
      screen.queryByText("This should not appear"),
    ).not.toBeInTheDocument();
  });

  it("renders correct number of progress dots", () => {
    const { container } = render(
      <TutorialOverlay {...defaultProps} totalSteps={7} stepIndex={3} />,
    );
    // Progress dots are rendered as span elements with rounded-full class
    const dots = container.querySelectorAll("span.rounded-full");
    expect(dots.length).toBe(7);
  });

  it("highlights active progress dot", () => {
    const { container } = render(
      <TutorialOverlay {...defaultProps} totalSteps={5} stepIndex={2} />,
    );
    const dots = container.querySelectorAll("span.rounded-full");
    // Active dot (index 2) should have bg-goshiwon-yellow and scale-125
    expect(dots[2].className).toContain("bg-goshiwon-yellow");
    expect(dots[2].className).toContain("scale-125");
    // Completed dot (index 0) should have bg-goshiwon-yellow/40
    expect(dots[0].className).toContain("bg-goshiwon-yellow/40");
    // Future dot (index 4) should have bg-goshiwon-border
    expect(dots[4].className).toContain("bg-goshiwon-border");
  });

  it("updates aria-label when step changes", () => {
    const step2 = makeStep({ title: "Vocabulary Panel" });
    render(
      <TutorialOverlay
        {...defaultProps}
        step={step2}
        stepIndex={1}
        totalSteps={5}
      />,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "aria-label",
      "Tutorial step 2: Vocabulary Panel",
    );
  });

  it("renders SVG overlay", () => {
    const { container } = render(<TutorialOverlay {...defaultProps} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("center tooltip when no targetSelector", () => {
    const step = makeStep({ targetSelector: undefined });
    const { container } = render(
      <TutorialOverlay {...defaultProps} step={step} />,
    );
    // Tooltip should be centered (transform: translate(-50%, -50%))
    const tooltip = container.querySelector(".animate-tutorial-tooltip");
    expect(tooltip).toBeInTheDocument();
    // The style should have translate(-50%, -50%) for center positioning
    const style = (tooltip as HTMLElement).style;
    expect(style.transform).toContain("translate(-50%, -50%)");
  });
});
