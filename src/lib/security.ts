/**
 * Security utilities for input validation and rate limiting.
 */

import type { GamificationData, XPAction, XPEvent } from "@/types";

const VALID_XP_ACTIONS: XPAction[] = [
  "message_korean",
  "message_full_korean",
  "flashcard_session",
  "flashcard_perfect",
  "word_saved",
  "no_translate",
];

export const LIMITS = {
  MAX_MESSAGES: 50,
  MAX_CONTENT_LENGTH: 2000,
  RATE_LIMIT_WINDOW_MS: 60_000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 10,
  MAX_XP: 999_999,
  MAX_STREAK: 3650,
  MAX_XP_HISTORY: 1000,
  MAX_XP_PER_EVENT: 100,
  MAX_XP_EVENTS_PER_MINUTE: 20,
} as const;

// Simple in-memory rate limiter (per-IP, suitable for single-instance deployments)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(ip: string): {
  allowed: boolean;
  retryAfterMs?: number;
} {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, {
      count: 1,
      resetTime: now + LIMITS.RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (record.count >= LIMITS.RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterMs: record.resetTime - now,
    };
  }

  record.count++;
  return { allowed: true };
}

// Clean up stale entries periodically (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of requestCounts) {
      if (now > record.resetTime) {
        requestCounts.delete(ip);
      }
    }
  }, 5 * 60_000).unref?.();
}

export function validateMessages(messages: unknown): {
  valid: boolean;
  error?: string;
} {
  if (!Array.isArray(messages)) {
    return { valid: false, error: "messages must be an array" };
  }

  if (messages.length === 0) {
    return { valid: false, error: "messages must not be empty" };
  }

  if (messages.length > LIMITS.MAX_MESSAGES) {
    return {
      valid: false,
      error: `Too many messages (max ${LIMITS.MAX_MESSAGES}). Please start a new conversation.`,
    };
  }

  // Validate each message has the expected UIMessage shape
  for (const msg of messages) {
    if (typeof msg !== "object" || msg === null) {
      return { valid: false, error: "Each message must be an object" };
    }
    if (!("role" in msg) || !("parts" in msg)) {
      return { valid: false, error: "Each message must have role and parts" };
    }
    if (
      !["user", "assistant", "system"].includes(
        (msg as { role: string }).role
      )
    ) {
      return {
        valid: false,
        error: `Invalid role: ${(msg as { role: string }).role}`,
      };
    }
  }

  // Validate content length of last user message
  const lastMessage = messages[messages.length - 1] as {
    role: string;
    parts?: Array<{ type: string; text?: string }>;
  };
  if (lastMessage?.role === "user" && Array.isArray(lastMessage.parts)) {
    const textContent = lastMessage.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text ?? "")
      .join("");

    if (textContent.length > LIMITS.MAX_CONTENT_LENGTH) {
      return {
        valid: false,
        error: `Message too long (max ${LIMITS.MAX_CONTENT_LENGTH} characters).`,
      };
    }
  }

  return { valid: true };
}

/**
 * Defense-in-depth text sanitizer for user-facing content.
 * Strips HTML tags, null bytes, and control characters.
 */
export function sanitizeTextInput(text: unknown): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/<[^>]*>/g, "")                          // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")   // strip control chars (keep \n \t \r)
    .trim()
    .slice(0, LIMITS.MAX_CONTENT_LENGTH);
}

/**
 * Validates and sanitizes gamification data loaded from localStorage.
 * Returns a sanitized copy on valid input, or null on invalid.
 */
export function validateGamificationData(
  data: unknown
): GamificationData | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return null;
  }

  const d = data as Record<string, unknown>;

  // Validate top-level shape
  if (
    typeof d.xp !== "object" || d.xp === null ||
    typeof d.streak !== "object" || d.streak === null ||
    typeof d.stats !== "object" || d.stats === null
  ) {
    return null;
  }

  const xp = d.xp as Record<string, unknown>;
  const streak = d.streak as Record<string, unknown>;
  const stats = d.stats as Record<string, unknown>;

  // Validate xp
  if (typeof xp.totalXP !== "number" || !Number.isInteger(xp.totalXP) || xp.totalXP < 0) {
    return null;
  }
  if (!Array.isArray(xp.history)) {
    return null;
  }

  // Cap totalXP
  const totalXP = Math.min(xp.totalXP, LIMITS.MAX_XP);

  // Validate and trim history
  const validHistory: XPEvent[] = [];
  const historySlice = xp.history.slice(-LIMITS.MAX_XP_HISTORY);
  for (const entry of historySlice) {
    if (
      typeof entry !== "object" || entry === null ||
      !VALID_XP_ACTIONS.includes(entry.action) ||
      typeof entry.amount !== "number" || entry.amount <= 0 || entry.amount > LIMITS.MAX_XP_PER_EVENT ||
      typeof entry.timestamp !== "string" || isNaN(Date.parse(entry.timestamp))
    ) {
      continue; // skip invalid entries silently
    }
    validHistory.push({
      action: entry.action,
      amount: entry.amount,
      timestamp: entry.timestamp,
    });
  }

  // Validate streak
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  if (
    typeof streak.currentStreak !== "number" || !Number.isInteger(streak.currentStreak) || streak.currentStreak < 0 ||
    typeof streak.longestStreak !== "number" || !Number.isInteger(streak.longestStreak) || streak.longestStreak < 0 ||
    typeof streak.lastPracticeDate !== "string"
  ) {
    return null;
  }
  // lastPracticeDate must be empty or match YYYY-MM-DD
  if (streak.lastPracticeDate !== "" && !DATE_RE.test(streak.lastPracticeDate)) {
    return null;
  }

  // Validate stats
  const statFields = [
    "totalMessages",
    "totalFlashcardSessions",
    "totalTranslations",
    "messagesWithoutTranslate",
  ] as const;
  for (const field of statFields) {
    if (typeof stats[field] !== "number" || !Number.isInteger(stats[field] as number) || (stats[field] as number) < 0) {
      return null;
    }
  }

  return {
    xp: { totalXP, history: validHistory },
    streak: {
      currentStreak: Math.min(streak.currentStreak as number, LIMITS.MAX_STREAK),
      longestStreak: Math.min(streak.longestStreak as number, LIMITS.MAX_STREAK),
      lastPracticeDate: streak.lastPracticeDate as string,
    },
    stats: {
      totalMessages: stats.totalMessages as number,
      totalFlashcardSessions: stats.totalFlashcardSessions as number,
      totalTranslations: stats.totalTranslations as number,
      messagesWithoutTranslate: stats.messagesWithoutTranslate as number,
    },
  };
}

/**
 * Anti-abuse check: detect abnormally rapid XP events (possible localStorage tampering).
 * Returns false if > MAX_XP_EVENTS_PER_MINUTE events occurred in the last 60 seconds.
 */
export function isReasonableXPRate(history: XPEvent[]): boolean {
  const oneMinuteAgo = Date.now() - 60_000;
  let recentCount = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const ts = Date.parse(history[i].timestamp);
    if (isNaN(ts) || ts < oneMinuteAgo) break;
    recentCount++;
    if (recentCount > LIMITS.MAX_XP_EVENTS_PER_MINUTE) return false;
  }
  return true;
}
