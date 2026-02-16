"use client";

import { LESSON_TOPICS } from "@/lib/lesson-topics";
import type { RankInfo } from "@/types";

/** Atmospheric welcome greetings per rank */
const WELCOME_GREETINGS: Record<string, { korean: string; english: string }> = {
  new_resident: {
    korean: "환영합니다, 새 입주자님.",
    english: "Welcome, new resident. What shall we study tonight?",
  },
  quiet_tenant: {
    korean: "돌아왔군요, 세입자님.",
    english: "You're back. Shall we continue where we left off?",
  },
  regular: {
    korean: "어서 오세요. 기다리고 있었어요.",
    english: "Welcome. I've been waiting for you.",
  },
  trusted_neighbor: {
    korean: "다시 만나서 반가워요, 이웃님.",
    english: "Good to see you again, neighbor. The usual?",
  },
  floor_senior: {
    korean: "선배님, 오셨군요. 이 층은 당신 것이에요.",
    english: "You're here. This floor belongs to you now.",
  },
};

interface WelcomeScreenProps {
  onSelectTopic: (message: string) => void;
  rank?: RankInfo;
}

export default function WelcomeScreen({ onSelectTopic, rank }: WelcomeScreenProps) {
  const greeting = WELCOME_GREETINGS[rank?.id ?? "new_resident"] ?? WELCOME_GREETINGS.new_resident;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-light text-goshiwon-text mb-2">
          {greeting.korean}
        </h2>
        <p className="text-sm text-goshiwon-text-secondary">
          {greeting.english}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {LESSON_TOPICS.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onSelectTopic(topic.starterMessage)}
            aria-label={`Start lesson: ${topic.title}`}
            className="group text-left p-4 bg-goshiwon-surface border border-goshiwon-border rounded-lg hover:border-goshiwon-yellow/50 hover:bg-goshiwon-surface-hover transition-all duration-300 border-t-2 border-t-goshiwon-accent"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 flex items-center justify-center rounded-full bg-goshiwon-accent/10 border border-goshiwon-accent/20 text-lg text-goshiwon-yellow/70 group-hover:text-goshiwon-yellow group-hover:bg-goshiwon-accent/20 transition-all duration-300 shrink-0">
                {topic.icon}
              </span>
              <div>
                <div className="text-sm font-medium text-goshiwon-text">
                  {topic.titleKr}
                </div>
                <div className="text-xs text-goshiwon-text-muted">
                  {topic.title}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <p className="mt-8 text-xs text-goshiwon-text-secondary text-center max-w-sm">
        Or simply type a message below. Moon-jo is always... watching.
      </p>
    </div>
  );
}
