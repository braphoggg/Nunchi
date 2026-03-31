import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WelcomeWizard from "../WelcomeWizard";

// Mock AuthContext
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();

const mockIsAuthAvailable = vi.fn(() => false);

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    session: null,
    isLoading: false,
    signIn: mockSignIn,
    signUp: mockSignUp,
    signOut: mockSignOut,
  }),
  isAuthAvailable: (...args: unknown[]) => mockIsAuthAvailable(...args),
}));

// Mock useApiKey validation
vi.mock("@/hooks/useApiKey", () => ({
  isValidGeminiKey: (key: string) => /^AIza[A-Za-z0-9_-]{20,}$/.test(key.trim()),
}));

describe("WelcomeWizard — auth NOT available", () => {
  const defaultProps = {
    onComplete: vi.fn(),
    onDismiss: vi.fn(),
    onSetApiKey: vi.fn(),
    hasApiKey: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the wizard dialog", () => {
    render(<WelcomeWizard {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Welcome setup")).toBeInTheDocument();
  });

  it("skips account step and starts at API key when auth is not available", () => {
    render(<WelcomeWizard {...defaultProps} />);
    // Should show API key step, not account
    expect(screen.getByText("Connect Your AI")).toBeInTheDocument();
    expect(screen.queryByText("Create Your Account")).not.toBeInTheDocument();
  });

  it("shows step indicator with Account checked and API Key active", () => {
    render(<WelcomeWizard {...defaultProps} />);
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("API Key")).toBeInTheDocument();
    expect(screen.getByText("Tour")).toBeInTheDocument();
  });

  // ─── API Key Step ───────────────────────────────────────────

  it("shows API key input field", () => {
    render(<WelcomeWizard {...defaultProps} />);
    expect(screen.getByLabelText("Gemini API key")).toBeInTheDocument();
  });

  it("Save Key button is disabled when input is empty", () => {
    render(<WelcomeWizard {...defaultProps} />);
    expect(screen.getByText("Save Key")).toBeDisabled();
  });

  it("shows error for invalid API key", () => {
    render(<WelcomeWizard {...defaultProps} />);
    const input = screen.getByLabelText("Gemini API key");
    fireEvent.change(input, { target: { value: "invalid-key" } });
    fireEvent.click(screen.getByText("Save Key"));

    expect(screen.getByText(/Key should start with "AIza"/)).toBeInTheDocument();
    expect(defaultProps.onSetApiKey).not.toHaveBeenCalled();
  });

  it("saves valid API key and advances to tour step", () => {
    render(<WelcomeWizard {...defaultProps} />);
    const input = screen.getByLabelText("Gemini API key");
    const validKey = "AIzaSyTestKey1234567890abcdef";
    fireEvent.change(input, { target: { value: validKey } });
    fireEvent.click(screen.getByText("Save Key"));

    expect(defaultProps.onSetApiKey).toHaveBeenCalledWith(validKey);
    // Should now show tour step
    expect(screen.getByText("Your neighbor is waiting.")).toBeInTheDocument();
  });

  it("Enter key submits API key", () => {
    render(<WelcomeWizard {...defaultProps} />);
    const input = screen.getByLabelText("Gemini API key");
    const validKey = "AIzaSyTestKey1234567890abcdef";
    fireEvent.change(input, { target: { value: validKey } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(defaultProps.onSetApiKey).toHaveBeenCalledWith(validKey);
  });

  it("skip API key advances to tour step", () => {
    render(<WelcomeWizard {...defaultProps} />);
    fireEvent.click(screen.getByText(/Skip.*add it later/i));

    // Should now show tour step
    expect(screen.getByText("Your neighbor is waiting.")).toBeInTheDocument();
  });

  it("auto-advances past API key step when hasApiKey is true", () => {
    render(<WelcomeWizard {...defaultProps} hasApiKey={true} />);
    // Should skip directly to tour
    expect(screen.getByText("Your neighbor is waiting.")).toBeInTheDocument();
  });

  // ─── Tour Step ──────────────────────────────────────────────

  it("Start Tour calls onComplete", () => {
    render(<WelcomeWizard {...defaultProps} />);
    // Skip to tour step
    fireEvent.click(screen.getByText(/Skip.*add it later/i));
    expect(screen.getByText("Your neighbor is waiting.")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Start Tour"));
    expect(defaultProps.onComplete).toHaveBeenCalledTimes(1);
  });

  it("Skip explore calls onDismiss", () => {
    render(<WelcomeWizard {...defaultProps} />);
    // Skip to tour step
    fireEvent.click(screen.getByText(/Skip.*add it later/i));

    fireEvent.click(screen.getByText(/Skip.*explore/i));
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it("shows atmospheric text in tour step", () => {
    render(<WelcomeWizard {...defaultProps} />);
    fireEvent.click(screen.getByText(/Skip.*add it later/i));

    expect(screen.getByText(/hallway light flickers/i)).toBeInTheDocument();
    expect(screen.getByText(/Seo Moon-jo will teach you Korean/i)).toBeInTheDocument();
  });

  // ─── Google AI Studio link ────────────────────────────────

  it("shows link to Google AI Studio in API key step", () => {
    render(<WelcomeWizard {...defaultProps} />);
    const link = screen.getByRole("link", { name: "Google AI Studio" });
    expect(link).toHaveAttribute("href", "https://aistudio.google.com/apikey");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("WelcomeWizard — auth available", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthAvailable.mockReturnValue(true);
  });

  const defaultProps = {
    onComplete: vi.fn(),
    onDismiss: vi.fn(),
    onSetApiKey: vi.fn(),
    hasApiKey: false,
  };

  it("starts at account step when auth is available", () => {
    render(<WelcomeWizard {...defaultProps} />);
    expect(screen.getByText("Create Your Account")).toBeInTheDocument();
  });

  it("shows email and password fields on account step", () => {
    render(<WelcomeWizard {...defaultProps} />);
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/)).toBeInTheDocument();
  });

  it("skip account advances to API key step", () => {
    render(<WelcomeWizard {...defaultProps} />);
    fireEvent.click(screen.getByText(/Skip.*offline only/i));

    expect(screen.getByText("Connect Your AI")).toBeInTheDocument();
  });

  it("toggle to sign in mode", () => {
    render(<WelcomeWizard {...defaultProps} />);
    fireEvent.click(screen.getByText(/Already have an account/i));

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Sign In");
  });

  it("toggle back to sign up mode", () => {
    render(<WelcomeWizard {...defaultProps} />);
    fireEvent.click(screen.getByText(/Already have an account/i));
    fireEvent.click(screen.getByText(/Don't have an account/i));

    expect(screen.getByText("Create Your Account")).toBeInTheDocument();
  });
});
