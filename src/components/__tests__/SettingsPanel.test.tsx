import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPanel from "../SettingsPanel";

// ─── Mocks ──────────────────────────────────────────────────────────

const mockSetApiKey = vi.fn();
const mockClearApiKey = vi.fn();

const mockSettingsCtx = {
  settings: { theme: "dark" as const, fontScale: 1, reduceAnimations: false, showRomanization: true, ttsRate: 0.85 },
  resolvedTheme: "dark" as const,
  setTheme: vi.fn(),
  setFontScale: vi.fn(),
  setReduceAnimations: vi.fn(),
  setShowRomanization: vi.fn(),
  setTTSRate: vi.fn(),
  apiKey: null as string | null,
  setApiKey: mockSetApiKey,
  clearApiKey: mockClearApiKey,
};

vi.mock("@/contexts/SettingsContext", () => ({
  useSettingsContext: () => mockSettingsCtx,
}));

vi.mock("@/contexts/SoundContext", () => ({
  useSound: () => ({
    muted: false,
    toggleMute: vi.fn(),
    volume: 50,
    setVolume: vi.fn(),
    play: vi.fn(),
  }),
}));

vi.mock("@/lib/data-backup", () => ({
  createBackup: vi.fn(() => ({})),
  downloadBackup: vi.fn(),
  readBackupFile: vi.fn(async () => ({ valid: false, error: "test" })),
  restoreBackup: vi.fn(() => 0),
}));

// ─── Tests ──────────────────────────────────────────────────────────

describe("SettingsPanel", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsCtx.apiKey = null;
    mockSettingsCtx.settings.ttsRate = 0.85;
  });

  it("renders the settings title", () => {
    render(<SettingsPanel onClose={onClose} />);
    expect(screen.getByText(/설정/)).toBeInTheDocument();
  });

  it("renders the API Key section heading", () => {
    render(<SettingsPanel onClose={onClose} />);
    expect(screen.getByText(/API 키/)).toBeInTheDocument();
  });

  // ─── No key state ────────────────────────────────────────────────

  describe("when no API key is set", () => {
    it("shows the API key input field", () => {
      render(<SettingsPanel onClose={onClose} />);
      expect(screen.getByLabelText("Gemini API key")).toBeInTheDocument();
    });

    it("shows a Save button", () => {
      render(<SettingsPanel onClose={onClose} />);
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    });

    it("Save button is disabled when input is empty", () => {
      render(<SettingsPanel onClose={onClose} />);
      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it("calls setApiKey with trimmed value on Save click", async () => {
      render(<SettingsPanel onClose={onClose} />);
      const input = screen.getByLabelText("Gemini API key");
      await userEvent.type(input, "  AIzaSyTest123  ");
      const saveButton = screen.getByRole("button", { name: /save/i });
      await userEvent.click(saveButton);
      expect(mockSetApiKey).toHaveBeenCalledWith("AIzaSyTest123");
    });

    it("calls setApiKey on Enter key press", async () => {
      render(<SettingsPanel onClose={onClose} />);
      const input = screen.getByLabelText("Gemini API key");
      await userEvent.type(input, "AIzaSyEnterKey{enter}");
      expect(mockSetApiKey).toHaveBeenCalledWith("AIzaSyEnterKey");
    });

    it("does NOT show Remove or Show/Hide buttons", () => {
      render(<SettingsPanel onClose={onClose} />);
      expect(screen.queryByText("Remove")).not.toBeInTheDocument();
      expect(screen.queryByText("Show")).not.toBeInTheDocument();
    });

    it("shows Google AI Studio link", () => {
      render(<SettingsPanel onClose={onClose} />);
      const link = screen.getByText("Google AI Studio");
      expect(link.closest("a")).toHaveAttribute(
        "href",
        "https://aistudio.google.com/apikey",
      );
    });

    it("shows privacy note", () => {
      render(<SettingsPanel onClose={onClose} />);
      expect(
        screen.getByText(/stored locally and sent directly to Google/),
      ).toBeInTheDocument();
    });
  });

  // ─── Key present state ───────────────────────────────────────────

  describe("when API key is set", () => {
    beforeEach(() => {
      mockSettingsCtx.apiKey = "AIzaSyLongKey1234567890";
    });

    it("shows masked key (first 4 + last 4 chars)", () => {
      render(<SettingsPanel onClose={onClose} />);
      expect(screen.getByText("AIza...7890")).toBeInTheDocument();
    });

    it("does NOT show the password input", () => {
      render(<SettingsPanel onClose={onClose} />);
      expect(screen.queryByLabelText("Gemini API key")).not.toBeInTheDocument();
    });

    it("shows Show button", () => {
      render(<SettingsPanel onClose={onClose} />);
      expect(screen.getByLabelText("Show API key")).toBeInTheDocument();
    });

    it("toggles between Show and Hide", async () => {
      render(<SettingsPanel onClose={onClose} />);
      const showBtn = screen.getByText("Show");
      await userEvent.click(showBtn);
      // After clicking Show, full key visible and button says Hide
      expect(screen.getByText("AIzaSyLongKey1234567890")).toBeInTheDocument();
      expect(screen.getByText("Hide")).toBeInTheDocument();

      await userEvent.click(screen.getByText("Hide"));
      // Back to masked
      expect(screen.getByText("AIza...7890")).toBeInTheDocument();
    });

    it("shows Remove button", () => {
      render(<SettingsPanel onClose={onClose} />);
      expect(screen.getByText("Remove")).toBeInTheDocument();
    });

    it("calls clearApiKey when Remove is clicked", async () => {
      render(<SettingsPanel onClose={onClose} />);
      await userEvent.click(screen.getByText("Remove"));
      expect(mockClearApiKey).toHaveBeenCalled();
    });
  });

  // ─── Other settings sections ─────────────────────────────────────

  it("renders Theme section", () => {
    render(<SettingsPanel onClose={onClose} />);
    expect(screen.getByText(/테마/)).toBeInTheDocument();
  });

  it("renders Font Size section", () => {
    render(<SettingsPanel onClose={onClose} />);
    expect(screen.getByText(/글자 크기/)).toBeInTheDocument();
  });

  it("renders Sound section", () => {
    render(<SettingsPanel onClose={onClose} />);
    expect(screen.getByText(/소리/)).toBeInTheDocument();
  });

  it("renders Data section", () => {
    render(<SettingsPanel onClose={onClose} />);
    expect(screen.getByText(/데이터/)).toBeInTheDocument();
  });

  it("renders Reduce animations toggle", () => {
    render(<SettingsPanel onClose={onClose} />);
    expect(screen.getByText("Reduce animations")).toBeInTheDocument();
  });

  it("renders Show romanization toggle", () => {
    render(<SettingsPanel onClose={onClose} />);
    expect(screen.getByText("Show romanization")).toBeInTheDocument();
  });

  // ─── TTS Speech Speed ───────────────────────────────────────────

  describe("TTS Speech Speed", () => {
    it("renders the speech speed section heading", () => {
      render(<SettingsPanel onClose={onClose} />);
      expect(screen.getByText(/발음 속도/)).toBeInTheDocument();
    });

    it("shows the current TTS rate value", () => {
      render(<SettingsPanel onClose={onClose} />);
      expect(screen.getByText("0.85x")).toBeInTheDocument();
    });

    it("renders the range input with correct min, max, and step", () => {
      render(<SettingsPanel onClose={onClose} />);
      const slider = screen.getByRole("slider", { name: "Speech speed" });
      expect(slider).toHaveAttribute("min", "50");
      expect(slider).toHaveAttribute("max", "150");
      expect(slider).toHaveAttribute("step", "5");
    });

    it("calls setTTSRate with the new value when slider changes", () => {
      render(<SettingsPanel onClose={onClose} />);
      const slider = screen.getByRole("slider", { name: "Speech speed" });
      fireEvent.change(slider, { target: { value: "120" } });
      expect(mockSettingsCtx.setTTSRate).toHaveBeenCalledWith(1.2);
    });

    it("reflects settings.ttsRate as the slider value", () => {
      mockSettingsCtx.settings.ttsRate = 1.1;
      render(<SettingsPanel onClose={onClose} />);
      const slider = screen.getByRole("slider", { name: "Speech speed" });
      expect(slider).toHaveValue("110");
    });
  });
});
