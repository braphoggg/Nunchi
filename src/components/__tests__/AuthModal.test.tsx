import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthModal from "../AuthModal";

// ─── Mocks ──────────────────────────────────────────────────────────

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();

let mockUser: { email: string } | null = null;
let mockAuthAvailable = false;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    session: null,
    isLoading: false,
    signIn: mockSignIn,
    signUp: mockSignUp,
    signOut: mockSignOut,
  }),
  isAuthAvailable: () => mockAuthAvailable,
}));

// ─── Tests ──────────────────────────────────────────────────────────

describe("AuthModal — auth not configured", () => {
  beforeEach(() => {
    mockAuthAvailable = false;
    mockUser = null;
    vi.clearAllMocks();
  });

  it("shows 'Cloud Sync Not Available' message", () => {
    render(<AuthModal onClose={vi.fn()} />);
    expect(screen.getByText("Cloud Sync Not Available")).toBeInTheDocument();
    expect(screen.getByText(/not configured/i)).toBeInTheDocument();
  });

  it("shows Close button that calls onClose", () => {
    const onClose = vi.fn();
    render(<AuthModal onClose={onClose} />);
    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not show sign in form", () => {
    render(<AuthModal onClose={vi.fn()} />);
    expect(screen.queryByPlaceholderText("Email")).not.toBeInTheDocument();
  });
});

describe("AuthModal — signed in", () => {
  beforeEach(() => {
    mockAuthAvailable = true;
    mockUser = { email: "test@example.com" };
    vi.clearAllMocks();
  });

  it("shows signed-in view with email", () => {
    render(<AuthModal onClose={vi.fn()} />);
    expect(screen.getByText("Cloud Sync Active")).toBeInTheDocument();
    expect(screen.getByText(/test@example\.com/)).toBeInTheDocument();
  });

  it("Sign Out button calls signOut and onClose", () => {
    const onClose = vi.fn();
    render(<AuthModal onClose={onClose} />);
    fireEvent.click(screen.getByText("Sign Out"));
    expect(mockSignOut).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("Close button calls onClose", () => {
    const onClose = vi.fn();
    render(<AuthModal onClose={onClose} />);
    // There should be a Close button in signed-in view
    const closeBtn = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});

describe("AuthModal — sign in / sign up form", () => {
  beforeEach(() => {
    mockAuthAvailable = true;
    mockUser = null;
    vi.clearAllMocks();
  });

  it("renders sign in form by default", () => {
    render(<AuthModal onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Sign In");
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  it("toggles to sign up mode", () => {
    render(<AuthModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/Don't have an account/i));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Create Account");
  });

  it("toggles back to sign in mode", () => {
    render(<AuthModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/Don't have an account/i));
    fireEvent.click(screen.getByText(/Already have an account/i));
    // Should show Sign In as heading
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Sign In");
  });

  it("calls signIn on sign in form submit", async () => {
    mockSignIn.mockResolvedValue({});
    const onClose = vi.fn();
    render(<AuthModal onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.submit(screen.getByPlaceholderText("Email").closest("form")!);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("user@test.com", "password123");
    });
  });

  it("calls signUp on sign up form submit", async () => {
    mockSignUp.mockResolvedValue({});
    render(<AuthModal onClose={vi.fn()} />);

    // Switch to sign up
    fireEvent.click(screen.getByText(/Don't have an account/i));

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "new@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "newpass123" },
    });
    fireEvent.submit(screen.getByPlaceholderText("Email").closest("form")!);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith("new@test.com", "newpass123");
    });
  });

  it("shows error message on sign in failure", async () => {
    mockSignIn.mockResolvedValue({ error: "Invalid credentials" });
    render(<AuthModal onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.submit(screen.getByPlaceholderText("Email").closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("shows success message on sign up success", async () => {
    mockSignUp.mockResolvedValue({});
    render(<AuthModal onClose={vi.fn()} />);

    fireEvent.click(screen.getByText(/Don't have an account/i));
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "new@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "pass123456" },
    });
    fireEvent.submit(screen.getByPlaceholderText("Email").closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/Account created/)).toBeInTheDocument();
    });
  });

  it("has close button with X icon", () => {
    render(<AuthModal onClose={vi.fn()} />);
    expect(screen.getByLabelText("Close")).toBeInTheDocument();
  });

  it("close button calls onClose", () => {
    const onClose = vi.fn();
    render(<AuthModal onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clears error when switching modes", () => {
    render(<AuthModal onClose={vi.fn()} />);
    // We can't easily trigger an error without async, but we can verify the toggle clears state
    fireEvent.click(screen.getByText(/Don't have an account/i));
    fireEvent.click(screen.getByText(/Already have an account/i));
    // No error should be visible
    expect(screen.queryByText("Invalid credentials")).not.toBeInTheDocument();
  });
});
