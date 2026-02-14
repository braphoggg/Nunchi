import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WelcomeScreen from "../WelcomeScreen";
import { LESSON_TOPICS } from "@/lib/lesson-topics";

describe("WelcomeScreen", () => {
  const onSelectTopic = vi.fn();

  it("renders the welcome heading in Korean", () => {
    render(<WelcomeScreen onSelectTopic={onSelectTopic} />);
    expect(screen.getByText(/환영합니다/)).toBeInTheDocument();
  });

  it("renders the English subtitle", () => {
    render(<WelcomeScreen onSelectTopic={onSelectTopic} />);
    expect(screen.getByText(/Welcome, new resident/)).toBeInTheDocument();
  });

  it("renders all lesson topic buttons", () => {
    render(<WelcomeScreen onSelectTopic={onSelectTopic} />);
    for (const topic of LESSON_TOPICS) {
      expect(screen.getByText(topic.titleKr)).toBeInTheDocument();
      expect(screen.getByText(topic.title)).toBeInTheDocument();
    }
  });

  it("calls onSelectTopic with starterMessage when a topic is clicked", async () => {
    const handler = vi.fn();
    render(<WelcomeScreen onSelectTopic={handler} />);
    const greetingsTopic = LESSON_TOPICS.find((t) => t.id === "greetings")!;
    const button = screen
      .getByText(greetingsTopic.titleKr)
      .closest("button")!;
    await userEvent.click(button);
    expect(handler).toHaveBeenCalledWith(greetingsTopic.starterMessage);
  });

  it("renders each topic icon", () => {
    render(<WelcomeScreen onSelectTopic={onSelectTopic} />);
    for (const topic of LESSON_TOPICS) {
      expect(screen.getByText(topic.icon)).toBeInTheDocument();
    }
  });

  it("shows the footer hint text", () => {
    render(<WelcomeScreen onSelectTopic={onSelectTopic} />);
    expect(screen.getByText(/Moon-jo is always/)).toBeInTheDocument();
  });
});
