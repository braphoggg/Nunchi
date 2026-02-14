/**
 * Security utilities for input validation and rate limiting.
 */

export const LIMITS = {
  MAX_MESSAGES: 50,
  MAX_CONTENT_LENGTH: 2000,
  RATE_LIMIT_WINDOW_MS: 60_000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 10,
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
