import type { UIMessage } from "ai";

/** Extract plain text from a UIMessage's parts array. */
export function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("");
}
