import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WelcomeScreen from "../WelcomeScreen";
import { LESSON_TOPICS } from "@/lib/lesson-topics";
import type { RankInfo } from "@/types";

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

  it("shows rank-specific greeting for quiet_tenant", () => {
    const rank: RankInfo = {
      id: "quiet_tenant",
      korean: "조용한 세입자",
      english: "Quiet Tenant",
      description: "Moon-jo has noticed.",
      minXP: 100,
      minVocab: 10,
    };
    render(<WelcomeScreen onSelectTopic={onSelectTopic} rank={rank} />);
    expect(screen.getByText(/돌아왔군요/)).toBeInTheDocument();
    expect(screen.getByText(/You're back/)).toBeInTheDocument();
  });

  it("shows rank-specific greeting for floor_senior", () => {
    const rank: RankInfo = {
      id: "floor_senior",
      korean: "층 선배",
      english: "Floor Senior",
      description: "You belong here. Moon-jo smiles.",
      minXP: 5000,
      minVocab: 150,
    };
    render(<WelcomeScreen onSelectTopic={onSelectTopic} rank={rank} />);
    expect(screen.getByText(/선배님/)).toBeInTheDocument();
    expect(screen.getByText(/This floor belongs to you/)).toBeInTheDocument();
  });

  it("shows XP onboarding hint for new residents", () => {
    render(<WelcomeScreen onSelectTopic={onSelectTopic} />);
    expect(screen.getByText(/Write in Korean to earn XP/)).toBeInTheDocument();
  });

  it("hides XP onboarding hint for higher ranks", () => {
    const rank: RankInfo = {
      id: "quiet_tenant",
      korean: "조용한 세입자",
      english: "Quiet Tenant",
      description: "Moon-jo has noticed.",
      minXP: 100,
      minVocab: 10,
    };
    render(<WelcomeScreen onSelectTopic={onSelectTopic} rank={rank} />);
    expect(screen.queryByText(/Write in Korean to earn XP/)).not.toBeInTheDocument();
  });
});
