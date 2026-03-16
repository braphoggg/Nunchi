"use client";

import type { NewAchievement } from "@/hooks/useAchievements";

interface AchievementToastProps {
  achievement: NewAchievement;
}

export default function AchievementToast({ achievement }: AchievementToastProps) {
  return (
    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-xp-toast">
      <div className="bg-goshiwon-surface border border-goshiwon-yellow/40 rounded-lg px-4 py-2.5 shadow-lg flex items-center gap-3">
        <span className="text-2xl" role="img" aria-hidden="true">
          {achievement.icon}
        </span>
        <div>
          <p className="text-goshiwon-yellow font-bold text-sm">
            {achievement.title}
          </p>
          <p className="text-goshiwon-text-muted text-xs">
            {achievement.titleKr}
          </p>
        </div>
      </div>
    </div>
  );
}
