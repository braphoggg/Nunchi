import React from "react";

export function formatMessage(
  content: string,
  options?: { onVocabClick?: () => void }
): React.ReactNode[] {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const text = part.slice(2, -2);

      if (options?.onVocabClick) {
        return React.createElement(
          "strong",
          {
            key: i,
            className:
              "text-[#d4a843] font-semibold cursor-pointer hover:underline underline-offset-2 decoration-[#d4a843]/50",
            onClick: options.onVocabClick,
            title: "Click to save all vocabulary from this message",
            role: "button",
            tabIndex: 0,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") options.onVocabClick?.();
            },
          },
          text
        );
      }

      return React.createElement(
        "strong",
        { key: i, className: "text-[#d4a843] font-semibold" },
        text
      );
    }
    return React.createElement("span", { key: i }, part);
  });
}
