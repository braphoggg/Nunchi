import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatInput from "../ChatInput";

describe("ChatInput", () => {
  const defaultProps = {
    input: "",
    onChange: vi.fn(),
    onSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
    isLoading: false,
  };

  it("renders the input field with placeholder", () => {
    render(<ChatInput {...defaultProps} />);
    const input = screen.getByPlaceholderText(/메시지를 입력하세요/);
    expect(input).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    render(<ChatInput {...defaultProps} />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("disables the submit button when input is empty", () => {
    render(<ChatInput {...defaultProps} input="" />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("enables the submit button when input has text", () => {
    render(<ChatInput {...defaultProps} input="hello" />);
    const button = screen.getByRole("button");
    expect(button).not.toBeDisabled();
  });

  it("disables input and button when loading", () => {
    render(<ChatInput {...defaultProps} input="test" isLoading={true} />);
    const input = screen.getByPlaceholderText(/메시지를 입력하세요/);
    const button = screen.getByRole("button");
    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it("calls onChange when typing", async () => {
    const onChange = vi.fn();
    render(<ChatInput {...defaultProps} onChange={onChange} />);
    const input = screen.getByPlaceholderText(/메시지를 입력하세요/);
    await userEvent.type(input, "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("calls onSubmit when form is submitted", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(<ChatInput {...defaultProps} input="hello" onSubmit={onSubmit} />);
    const button = screen.getByRole("button");
    await userEvent.click(button);
    expect(onSubmit).toHaveBeenCalled();
  });

  it("displays the provided input value", () => {
    render(<ChatInput {...defaultProps} input="test value" />);
    const input = screen.getByPlaceholderText(
      /메시지를 입력하세요/
    ) as HTMLTextAreaElement;
    expect(input.value).toBe("test value");
  });

  it("has aria-label on send button", () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByLabelText("Send message")).toBeInTheDocument();
  });

  it("shows spinner when loading", () => {
    render(<ChatInput {...defaultProps} input="test" isLoading={true} />);
    const button = screen.getByLabelText("Send message");
    // Spinner SVG has animate-spin class
    expect(button.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
