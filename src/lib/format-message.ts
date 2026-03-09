import React from "react";

/**
 * Tokenize message content into typed segments for rendering.
 * Supported patterns:
 *   **bold**           → golden vocabulary word (clickable if onVocabClick)
 *   ~~strikethrough~~  → error correction (red strikethrough)
 *   →                  → correction arrow separator
 *   plain text         → normal text
 */
type Token =
  | { type: "bold"; text: string }
  | { type: "strike"; text: string }
  | { type: "arrow" }
  | { type: "text"; text: string };

function tokenize(content: string): Token[] {
  // Match **bold**, ~~strike~~, or → arrow in one pass
  const pattern = /(\*\*[^*]+\*\*|~~[^~]+~~|→)/g;
  const tokens: Token[] = [];
  let lastIndex = 0;

  let match;
  while ((match = pattern.exec(content)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      tokens.push({ type: "text", text: content.slice(lastIndex, match.index) });
    }

    const segment = match[0];
    if (segment.startsWith("**") && segment.endsWith("**")) {
      tokens.push({ type: "bold", text: segment.slice(2, -2) });
    } else if (segment.startsWith("~~") && segment.endsWith("~~")) {
      tokens.push({ type: "strike", text: segment.slice(2, -2) });
    } else if (segment === "→") {
      tokens.push({ type: "arrow" });
    }

    lastIndex = match.index + segment.length;
  }

  // Trailing text
  if (lastIndex < content.length) {
    tokens.push({ type: "text", text: content.slice(lastIndex) });
  }

  return tokens;
}

export function formatMessage(
  content: string,
  options?: {
    onVocabClick?: (koreanWord: string) => void;
    isWordSaved?: (koreanWord: string) => boolean;
  }
): React.ReactNode[] {
  const tokens = tokenize(content);

  return tokens.map((token, i) => {
    switch (token.type) {
      case "bold": {
        const alreadySaved = options?.isWordSaved?.(token.text) ?? false;
        if (options?.onVocabClick && !alreadySaved) {
          return React.createElement(
            "strong",
            {
              key: i,
              className:
                "text-[#d4a843] font-semibold cursor-pointer hover:underline underline-offset-2 decoration-[#d4a843]/50",
              onClick: () => options.onVocabClick!(token.text),
              title: `Click to save "${token.text}"`,
              role: "button",
              tabIndex: 0,
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") options.onVocabClick!(token.text);
              },
            },
            token.text
          );
        }
        return React.createElement(
          "strong",
          {
            key: i,
            className: alreadySaved
              ? "text-[#d4a843]/60 font-semibold"
              : "text-[#d4a843] font-semibold",
          },
          token.text
        );
      }

      case "strike":
        return React.createElement(
          "span",
          {
            key: i,
            className: "line-through text-goshiwon-accent-light/70 opacity-70",
          },
          token.text
        );

      case "arrow":
        return React.createElement(
          "span",
          {
            key: i,
            className: "mx-1 text-goshiwon-text-muted",
          },
          "→"
        );

      case "text":
        return React.createElement("span", { key: i }, token.text);
    }
  });
}
