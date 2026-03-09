import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WelcomeScreen from "../WelcomeScreen";
import { LESSON_TOPICS, meetsRankRequirement } from "@/lib/lesson-topics";
import type { RankInfo } from "@/types";

// ─── helpers ───────────────────────────────────────────────────────

const quietTenantRank: RankInfo = {
  id: "quiet_tenant",
  korean: "조용한 세입자",
  english: "Quiet Tenant",
  description: "Moon-jo has noticed.",
  minXP: 100,
  minVocab: 10,
};

const floorSeniorRank: RankInfo = {
  id: "floor_senior",
  korean: "층 선배",
  english: "Floor Senior",
  description: "You belong here. Moon-jo smiles.",
  minXP: 5000,
  minVocab: 150,
};

// ─── rendering ─────────────────────────────────────────────────────

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

  it("calls onSelectTopic with starterMessage when an unlocked topic is clicked", async () => {
    const handler = vi.fn();
    render(<WelcomeScreen onSelectTopic={handler} />);
    const greetingsTopic = LESSON_TOPICS.find((t) => t.id === "greetings")!;
    const button = screen
      .getByText(greetingsTopic.titleKr)
      .closest("button")!;
    await userEvent.click(button);
    expect(handler).toHaveBeenCalledWith(
      greetingsTopic.starterMessage,
      greetingsTopic.id,
    );
  });

  it("renders icons for unlocked topics and lock for locked ones", () => {
    render(<WelcomeScreen onSelectTopic={onSelectTopic} />);
    for (const topic of LESSON_TOPICS) {
      const unlocked = meetsRankRequirement("new_resident", topic.requiredRank);
      if (unlocked) {
        expect(screen.getByText(topic.icon)).toBeInTheDocument();
      } else {
        expect(
          screen.getByLabelText(
            new RegExp(`Start lesson: ${topic.title}`),
          ),
        ).toBeInTheDocument();
      }
    }
  });

  it("shows difficulty badges on all topics", () => {
    render(<WelcomeScreen onSelectTopic={onSelectTopic} />);
    const beginnerBadges = screen.getAllByText("Beginner");
    expect(beginnerBadges.length).toBeGreaterThanOrEqual(1);
  });

  // ─── locked cards are disabled ─────────────────────────────────

  it("locked topic buttons are disabled for new_resident", () => {
    render(<WelcomeScreen onSelectTopic={onSelectTopic} />);
    const locked = LESSON_TOPICS.filter(
      (t) => !meetsRankRequirement("new_resident", t.requiredRank),
    );
    expect(locked.length).toBeGreaterThan(0);

    for (const topic of locked) {
      const button = screen.getByText(topic.titleKr).closest("button")!;
      expect(button).toBeDisabled();
    }
  });

  it("does NOT call onSelectTopic when clicking a locked topic", async () => {
    const handler = vi.fn();
    render(<WelcomeScreen onSelectTopic={handler} />);
    const lockedTopic = LESSON_TOPICS.find((t) => t.id === "food")!;
    const button = screen.getByText(lockedTopic.titleKr).closest("button")!;
    await userEvent.click(button);
    expect(handler).not.toHaveBeenCalled();
  });

  it("unlocked topic buttons are NOT disabled", () => {
    render(<WelcomeScreen onSelectTopic={onSelectTopic} />);
    const unlocked = LESSON_TOPICS.filter((t) =>
      meetsRankRequirement("new_resident", t.requiredRank),
    );
    for (const topic of unlocked) {
      const button = screen.getByText(topic.titleKr).closest("button")!;
      expect(button).not.toBeDisabled();
    }
  });

  // ─── rank unlocking ────────────────────────────────────────────

  it("unlocks intermediate topics for quiet_tenant rank", () => {
    render(
      <WelcomeScreen onSelectTopic={onSelectTopic} rank={quietTenantRank} />,
    );
    expect(screen.getByText("식")).toBeInTheDocument();
    expect(screen.getByText("감")).toBeInTheDocument();
  });

  it("quiet_tenant can click intermediate topics", async () => {
    const handler = vi.fn();
    render(
      <WelcomeScreen onSelectTopic={handler} rank={quietTenantRank} />,
    );
    const foodTopic = LESSON_TOPICS.find((t) => t.id === "food")!;
    const button = screen.getByText(foodTopic.titleKr).closest("button")!;
    expect(button).not.toBeDisabled();
    await userEvent.click(button);
    expect(handler).toHaveBeenCalledWith(
      foodTopic.starterMessage,
      foodTopic.id,
    );
  });

  it("floor_senior has all topics enabled", () => {
    render(
      <WelcomeScreen onSelectTopic={onSelectTopic} rank={floorSeniorRank} />,
    );
    for (const topic of LESSON_TOPICS) {
      const button = screen.getByText(topic.titleKr).closest("button")!;
      expect(button).not.toBeDisabled();
    }
  });

  // ─── rank-specific greetings ───────────────────────────────────

  it("shows rank-specific greeting for quiet_tenant", () => {
    render(
      <WelcomeScreen onSelectTopic={onSelectTopic} rank={quietTenantRank} />,
    );
    expect(screen.getByText(/돌아왔군요/)).toBeInTheDocument();
    expect(screen.getByText(/You're back/)).toBeInTheDocument();
  });

  it("shows rank-specific greeting for floor_senior", () => {
    render(
      <WelcomeScreen onSelectTopic={onSelectTopic} rank={floorSeniorRank} />,
    );
    expect(screen.getByText(/선배님/)).toBeInTheDocument();
    expect(screen.getByText(/This floor belongs to you/)).toBeInTheDocument();
  });

  // ─── daily focus ───────────────────────────────────────────────

  it("Today's Focus shows Korean quote with English translation", () => {
    const onStartStudy = vi.fn();
    render(
      <WelcomeScreen
        onSelectTopic={onSelectTopic}
        onStartStudy={onStartStudy}
        dueCount={1}
      />,
    );
    // CSS uppercase renders it visually but DOM text is title-case
    expect(screen.getByText(/Today's Focus/i)).toBeInTheDocument();
    // Korean quote should be present in the focus section
    const koreanRegex = /[\uAC00-\uD7AF]/;
    const focusSection = screen.getByText(/Today's Focus/i).closest("div")!.parentElement!;
    expect(koreanRegex.test(focusSection.textContent ?? "")).toBe(true);
  });

  // ─── footer & hints ───────────────────────────────────────────

  it("shows the footer hint text", () => {
    render(<WelcomeScreen onSelectTopic={onSelectTopic} />);
    expect(screen.getByText(/Moon-jo is always/)).toBeInTheDocument();
  });

  it("shows XP onboarding hint for new residents", () => {
    render(<WelcomeScreen onSelectTopic={onSelectTopic} />);
    expect(
      screen.getByText(/Write in Korean to earn XP/),
    ).toBeInTheDocument();
  });

  it("hides XP onboarding hint for higher ranks", () => {
    render(
      <WelcomeScreen onSelectTopic={onSelectTopic} rank={quietTenantRank} />,
    );
    expect(
      screen.queryByText(/Write in Korean to earn XP/),
    ).not.toBeInTheDocument();
  });
});
