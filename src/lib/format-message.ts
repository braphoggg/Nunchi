import React from "react";

export function formatMessage(content: string): React.ReactNode[] {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const text = part.slice(2, -2);
      return React.createElement(
        "strong",
        { key: i, className: "text-[#d4a843] font-semibold" },
        text
      );
    }
    return React.createElement("span", { key: i }, part);
  });
}
