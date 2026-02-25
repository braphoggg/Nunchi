"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { TutorialStep } from "@/lib/tutorial-steps";

interface TutorialOverlayProps {
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Build an SVG path for a rounded-rect cutout in a full-viewport mask.
 * The outer rect is drawn clockwise, the cutout counter-clockwise so it punches a hole.
 */
function buildClipPath(vw: number, vh: number, r: Rect, radius: number): string {
  const { x, y, width: w, height: h } = r;
  const cr = Math.min(radius, w / 2, h / 2);

  // Outer rect (clockwise)
  const outer = `M0,0 H${vw} V${vh} H0 Z`;

  // Inner rounded rect (counter-clockwise to punch hole)
  const inner = [
    `M${x + cr},${y}`,
    `H${x + w - cr}`,
    `Q${x + w},${y} ${x + w},${y + cr}`,
    `V${y + h - cr}`,
    `Q${x + w},${y + h} ${x + w - cr},${y + h}`,
    `H${x + cr}`,
    `Q${x},${y + h} ${x},${y + h - cr}`,
    `V${y + cr}`,
    `Q${x},${y} ${x + cr},${y}`,
    "Z",
  ].join(" ");

  return `${outer} ${inner}`;
}

export default function TutorialOverlay({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}: TutorialOverlayProps) {
  const [cutout, setCutout] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<"top" | "bottom" | "center">(step.tooltipPosition);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [animKey, setAnimKey] = useState(0);

  // Compute cutout rect from target element
  const computeCutout = useCallback(() => {
    if (!step.targetSelector) {
      setCutout(null);
      setTooltipPos("center");
      return;
    }
    const el = document.querySelector(step.targetSelector);
    if (!el) {
      setCutout(null);
      setTooltipPos("center");
      return;
    }

    // Scroll target into view
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    const rect = el.getBoundingClientRect();
    const pad = step.spotlightPadding ?? 8;
    setCutout({
      x: rect.left - pad,
      y: rect.top - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
    });

    // Determine tooltip position based on available space
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    setTooltipPos(spaceBelow >= 220 ? "bottom" : spaceAbove >= 220 ? "top" : "bottom");
  }, [step.targetSelector, step.spotlightPadding]);

  // Recompute on step change
  useEffect(() => {
    setAnimKey((k) => k + 1);
    // Small delay for scroll-into-view to settle
    const timer = setTimeout(computeCutout, 50);
    return () => clearTimeout(timer);
  }, [computeCutout, stepIndex]);

  // Recompute on resize
  useEffect(() => {
    const handleResize = () => computeCutout();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [computeCutout]);

  // Observe target for layout changes
  useEffect(() => {
    if (!step.targetSelector) return;
    const el = document.querySelector(step.targetSelector);
    if (!el) return;
    const observer = new ResizeObserver(() => computeCutout());
    observer.observe(el);
    return () => observer.disconnect();
  }, [step.targetSelector, computeCutout]);

  const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  // Tooltip positioning
  let tooltipStyle: React.CSSProperties = {};
  if (tooltipPos === "center" || !cutout) {
    tooltipStyle = {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      maxWidth: "calc(100vw - 32px)",
      width: "360px",
    };
  } else if (tooltipPos === "bottom" && cutout) {
    tooltipStyle = {
      position: "absolute",
      top: cutout.y + cutout.height + 12,
      left: Math.max(16, Math.min(cutout.x, vw - 376)),
      maxWidth: "calc(100vw - 32px)",
      width: "360px",
    };
  } else if (tooltipPos === "top" && cutout) {
    tooltipStyle = {
      position: "absolute",
      bottom: vh - cutout.y + 12,
      left: Math.max(16, Math.min(cutout.x, vw - 376)),
      maxWidth: "calc(100vw - 32px)",
      width: "360px",
    };
  }

  const isInteract = step.type === "interact";

  // Handle overlay click — advance on observe steps
  const handleOverlayClick = (e: React.MouseEvent) => {
    // Don't advance if clicking the tooltip itself
    if (tooltipRef.current?.contains(e.target as Node)) return;
    // Don't advance for interact steps or if clicking inside cutout
    if (isInteract) return;
    if (cutout) {
      const { clientX: cx, clientY: cy } = e;
      if (
        cx >= cutout.x &&
        cx <= cutout.x + cutout.width &&
        cy >= cutout.y &&
        cy <= cutout.y + cutout.height
      ) {
        return; // Click inside cutout — let it pass through
      }
    }
    onNext();
  };

  return (
    <div
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-label={`Tutorial step ${stepIndex + 1}: ${step.title}`}
    >
      {/* SVG overlay with cutout */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
        viewBox={`0 0 ${vw} ${vh}`}
        preserveAspectRatio="none"
      >
        <path
          d={cutout ? buildClipPath(vw, vh, cutout, 12) : `M0,0 H${vw} V${vh} H0 Z`}
          fill="rgba(12, 10, 13, 0.85)"
          fillRule="evenodd"
          style={{ transition: "d 0.3s ease-out" }}
        />
      </svg>

      {/* Click-capture overlay (blocks clicks outside cutout) */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: cutout
            ? `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% ${cutout.y}px, ${cutout.x}px ${cutout.y}px, ${cutout.x}px ${cutout.y + cutout.height}px, ${cutout.x + cutout.width}px ${cutout.y + cutout.height}px, ${cutout.x + cutout.width}px ${cutout.y}px, 0% ${cutout.y}px)`
            : undefined,
        }}
        onClick={handleOverlayClick}
      />

      {/* Highlight ring on target */}
      {cutout && (
        <div
          className="absolute tutorial-highlight rounded-xl"
          style={{
            left: cutout.x,
            top: cutout.y,
            width: cutout.width,
            height: cutout.height,
            transition: "left 0.3s, top 0.3s, width 0.3s, height 0.3s",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        key={animKey}
        ref={tooltipRef}
        className="animate-tutorial-tooltip z-[72]"
        style={tooltipStyle}
      >
        <div className="bg-goshiwon-surface border border-goshiwon-border rounded-xl shadow-2xl p-4 flex flex-col gap-3">
          {/* Header line */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-goshiwon-text-muted uppercase tracking-widest">
              {stepIndex + 1} / {totalSteps}
            </span>
            <button
              onClick={onSkip}
              aria-label="Skip tutorial"
              className="p-1 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Title */}
          <div>
            <h3 className="text-sm font-medium text-goshiwon-text">
              {step.titleKr}
            </h3>
            <p className="text-[10px] text-goshiwon-text-muted">
              {step.title}
            </p>
          </div>

          {/* Moon-jo dialogue */}
          <p className="text-xs text-goshiwon-yellow italic leading-relaxed">
            &ldquo;{step.moonjoSays}&rdquo;
          </p>

          {/* Description */}
          <p className="text-xs text-goshiwon-text-secondary leading-relaxed">
            {step.description}
          </p>

          {/* Interaction hint */}
          {isInteract && step.interactionHint && (
            <div className="flex items-center gap-2 px-3 py-2 bg-goshiwon-bg rounded-lg border border-goshiwon-yellow/20">
              <span className="text-goshiwon-yellow text-xs">&#9758;</span>
              <span className="text-xs text-goshiwon-yellow">
                {step.interactionHint}
              </span>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={onPrev}
              disabled={stepIndex === 0}
              className="px-3 py-2 min-h-[44px] text-xs text-goshiwon-text-muted hover:text-goshiwon-text transition-colors disabled:opacity-30 disabled:cursor-default"
            >
              ← Back
            </button>

            {/* Progress dots */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalSteps }, (_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                    i === stepIndex
                      ? "bg-goshiwon-yellow scale-125"
                      : i < stepIndex
                        ? "bg-goshiwon-yellow/40"
                        : "bg-goshiwon-border"
                  }`}
                />
              ))}
            </div>

            {isInteract ? (
              <span className="px-3 py-2 min-h-[44px] text-xs text-goshiwon-text-muted italic flex items-center">
                Waiting...
              </span>
            ) : (
              <button
                onClick={onNext}
                className="px-3 py-2 min-h-[44px] text-xs text-goshiwon-yellow hover:text-goshiwon-text transition-colors font-medium"
              >
                {stepIndex === totalSteps - 1 ? "Finish" : "Next →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
