"use client";

import { useState, useCallback } from "react";
import type { UIMessage } from "ai";
import { getTextContent } from "@/lib/message-utils";

interface ShareButtonProps {
  messages: UIMessage[];
}

// Theme colors (inline for off-screen rendering)
const COLORS = {
  bg: "#0c0a0d",
  surface: "#1a1720",
  border: "#2a2535",
  accent: "#8b1a1a",
  yellow: "#d4a843",
  text: "#e8e4ec",
  textSecondary: "#a89bb5",
  textMuted: "#4d4559",
  userBubble: "#1e1a24",
};

/** Build off-screen DOM, render to PNG data URL, and trigger download. */
async function exportConversationPng(messages: UIMessage[]): Promise<void> {
  const { toPng } = await import("html-to-image");

  // Wrapper clips the render container so it's invisible but fully painted
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: 0;
    height: 0;
    overflow: hidden;
    z-index: -1;
    pointer-events: none;
  `;

  const container = document.createElement("div");
  container.style.cssText = `
    width: 480px;
    padding: 24px;
    background: ${COLORS.bg};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: ${COLORS.text};
    position: absolute;
    left: 0;
    top: 0;
  `;

  // Header
  const header = document.createElement("div");
  header.style.cssText = `
    text-align: center;
    padding-bottom: 16px;
    margin-bottom: 16px;
    border-bottom: 1px solid ${COLORS.border};
  `;
  header.innerHTML = `
    <div style="font-size: 14px; font-weight: 600; color: ${COLORS.text};">Room 203 | Korean with Moon-jo</div>
    <div style="font-size: 10px; color: ${COLORS.textMuted}; margin-top: 2px;">Eden Goshiwon · Nunchi</div>
  `;
  container.appendChild(header);

  // Messages
  const msgsContainer = document.createElement("div");
  msgsContainer.style.cssText = "display: flex; flex-direction: column; gap: 12px;";

  for (const msg of messages) {
    const text = getTextContent(msg);
    if (!text) continue;

    const isAssistant = msg.role === "assistant";
    const row = document.createElement("div");
    row.style.cssText = `display: flex; ${isAssistant ? "justify-content: flex-start;" : "justify-content: flex-end;"}`;

    const bubble = document.createElement("div");
    bubble.style.cssText = `
      max-width: 85%;
      padding: 12px 16px;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      border-radius: 12px;
      ${isAssistant
        ? `background: ${COLORS.surface}; border-left: 2px solid ${COLORS.accent}; border-top-left-radius: 4px; color: ${COLORS.text};`
        : `background: ${COLORS.userBubble}; border-top-right-radius: 4px; color: ${COLORS.text};`
      }
    `;

    if (isAssistant) {
      const label = document.createElement("div");
      label.style.cssText = `font-size: 9px; color: ${COLORS.textMuted}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;`;
      label.textContent = "서문조";
      bubble.appendChild(label);
    }

    // Render text with bold formatting for **word** patterns
    const textEl = document.createElement("div");
    textEl.innerHTML = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*([^*]+)\*\*/g, `<strong style="color: ${COLORS.yellow}; font-weight: 700;">$1</strong>`);
    bubble.appendChild(textEl);

    row.appendChild(bubble);
    msgsContainer.appendChild(row);
  }
  container.appendChild(msgsContainer);

  // Footer
  const footer = document.createElement("div");
  footer.style.cssText = `
    text-align: center;
    padding-top: 16px;
    margin-top: 16px;
    border-top: 1px solid ${COLORS.border};
    font-size: 9px;
    color: ${COLORS.textMuted};
  `;
  footer.textContent = "nunchi — Korean immersion learning";
  container.appendChild(footer);

  wrapper.appendChild(container);
  document.body.appendChild(wrapper);

  const dataUrl = await toPng(container, {
    backgroundColor: COLORS.bg,
    pixelRatio: 2,
  });

  document.body.removeChild(wrapper);

  // Trigger download
  const link = document.createElement("a");
  link.download = `room-203-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = dataUrl;
  link.click();
}

export default function ShareButton({ messages }: ShareButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleShare = useCallback(async () => {
    if (exporting || messages.length === 0) return;
    setExporting(true);

    try {
      await exportConversationPng(messages);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (err) {
      console.error("[ShareButton] export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [messages, exporting]);

  return { handleShare, exporting, done };
}

/** Hook wrapper for use in ChatContainer */
export function useShareConversation(messages: UIMessage[]) {
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleShare = useCallback(async () => {
    if (exporting || messages.length === 0) return;
    setExporting(true);

    try {
      await exportConversationPng(messages);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (err) {
      console.error("[ShareButton] export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [messages, exporting]);

  return { handleShare, exporting, done };
}
