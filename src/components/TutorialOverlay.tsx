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

/** Clamp a spotlight rect so it never spills outside the visible viewport. */
function clampRect(r: Rect): Rect {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const x = Math.max(0, r.x);
  const y = Math.max(0, r.y);
  const right = Math.min(vw, r.x + r.width);
  const bottom = Math.min(vh, r.y + r.height);
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}

/**
 * Counter-clockwise rounded-rect path — goes DOWN→RIGHT→UP→LEFT so that when combined
 * with the clockwise outer rect under fillRule="nonzero", interior winding = +1−1 = 0
 * (transparent hole). The original CW direction gave winding +2 → filled, not a hole.
 */
function buildHolePath(r: Rect, radius: number): string {
  const { x, y, width: w, height: h } = r;
  const cr = Math.min(radius, w / 2, h / 2);
  return [
    `M${x},${y + cr}`,                              // left edge, just below top-left
    `V${y + h - cr}`,                               // DOWN along left edge
    `Q${x},${y + h} ${x + cr},${y + h}`,            // curve bottom-left → going RIGHT
    `H${x + w - cr}`,                               // RIGHT along bottom edge
    `Q${x + w},${y + h} ${x + w},${y + h - cr}`,   // curve bottom-right → going UP
    `V${y + cr}`,                                   // UP along right edge
    `Q${x + w},${y} ${x + w - cr},${y}`,            // curve top-right → going LEFT
    `H${x + cr}`,                                   // LEFT along top edge
    `Q${x},${y} ${x},${y + cr}`,                    // curve top-left → going DOWN (back to start)
    "Z",
  ].join(" ");
}

/**
 * Build an SVG path for one or two rounded-rect cutouts in a full-viewport mask.
 * Outer rect clockwise + each hole counter-clockwise → punches holes via nonzero winding rule.
 */
function buildClipPath(vw: number, vh: number, rects: Rect[], radius: number): string {
  const outer = `M0,0 H${vw} V${vh} H0 Z`;
  const holes = rects.map((r) => buildHolePath(r, radius)).join(" ");
  return `${outer} ${holes}`;
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
  const [cutout2, setCutout2] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<"top" | "bottom" | "center">(step.tooltipPosition);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [animKey, setAnimKey] = useState(0);

  // Compute cutout rect(s) from target elements
  const computeCutout = useCallback(() => {
    const pad = step.spotlightPadding ?? 8;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    /**
     * Build a spotlight rect that keeps the element vertically centered inside
     * the ring even when the element is flush with a viewport edge.
     *
     * If the element sits at the bottom of the viewport (bottomSpace < pad),
     * we can't extend the hole past vh, so we shrink the TOP padding to match
     * the available bottom space — keeping equal breathing room on both sides.
     */
    function spotlightRect(r: DOMRect): Rect {
      const bottomSpace = Math.max(0, vh - r.bottom);
      const topSpace    = Math.max(0, r.top);
      const vertPad = Math.min(pad, bottomSpace, topSpace);

      const rightSpace = Math.max(0, vw - r.right);
      const leftSpace  = Math.max(0, r.left);
      const horizPad = Math.min(pad, rightSpace, leftSpace);

      return clampRect({
        x: r.left  - horizPad,
        y: r.top   - vertPad,
        width:  r.width  + horizPad * 2,
        height: r.height + vertPad  * 2,
      });
    }

    if (!step.targetSelector) {
      setCutout(null);
      setCutout2(null);
      setTooltipPos("center");
      return;
    }

    const el = document.querySelector(step.targetSelector);
    if (!el) {
      // Primary not found — try secondary as fallback spotlight (e.g. replaying
      // tutorial mid-conversation when the welcome-topics grid isn't in the DOM)
      if (step.secondaryTargetSelector) {
        const el2 = document.querySelector(step.secondaryTargetSelector);
        if (el2) {
          el2.scrollIntoView({ behavior: "smooth", block: "nearest" });
          const rect2 = el2.getBoundingClientRect();
          const fallback = spotlightRect(rect2);
          setCutout(fallback);
          setCutout2(null);
          const spaceAbove = rect2.top;
          const spaceBelow = vh - rect2.bottom;
          setTooltipPos(spaceBelow >= 220 ? "bottom" : spaceAbove >= 220 ? "top" : "bottom");
          return;
        }
      }
      setCutout(null);
      setCutout2(null);
      setTooltipPos("center");
      return;
    }

    // Scroll primary target into view
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });

    const rect = el.getBoundingClientRect();
    setCutout(spotlightRect(rect));

    // Secondary target
    let secondary: Rect | null = null;
    if (step.secondaryTargetSelector) {
      const el2 = document.querySelector(step.secondaryTargetSelector);
      if (el2) {
        const rect2 = el2.getBoundingClientRect();
        secondary = spotlightRect(rect2);
      }
    }
    setCutout2(secondary);

    // Tooltip position: between the two cutouts when both exist, otherwise by space
    if (secondary) {
      setTooltipPos("bottom"); // will be overridden to "between" in render
    } else {
      const spaceAbove = rect.top;
      const spaceBelow = vh - rect.bottom;
      setTooltipPos(spaceBelow >= 220 ? "bottom" : spaceAbove >= 220 ? "top" : "bottom");
    }
  }, [step.targetSelector, step.secondaryTargetSelector, step.spotlightPadding]);

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

  // Observe both targets for layout changes
  useEffect(() => {
    const selectors = [step.targetSelector, step.secondaryTargetSelector].filter(Boolean) as string[];
    const observers = selectors.map((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const obs = new ResizeObserver(() => computeCutout());
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((obs) => obs?.disconnect());
  }, [step.targetSelector, step.secondaryTargetSelector, computeCutout]);

  // Watch for target element appearing in DOM (e.g. keyboard auto-opening on step entry).
  // Delay measurement so entrance animations (e.g. translateY slide-up, 250ms) settle first.
  useEffect(() => {
    if (!step.targetSelector) return;
    if (document.querySelector(step.targetSelector)) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver(() => {
      if (document.querySelector(step.targetSelector!)) {
        observer.disconnect();
        timer = setTimeout(computeCutout, 300);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [step.targetSelector, computeCutout]);

  const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  // Collect all active cutouts
  const activeCutouts = [cutout, cutout2].filter(Boolean) as Rect[];

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
  } else if (cutout && cutout2) {
    // Two cutouts: position tooltip in the gap between them
    const gapTop = cutout.y + cutout.height + 12;
    tooltipStyle = {
      position: "absolute",
      top: gapTop,
      left: Math.max(16, Math.min(cutout.x, vw - 376)),
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

  // Refs keep the window listener current without re-registration on every render.
  // (CSS clip-path: path() does not reliably exclude pointer-events in Chromium, so
  //  we intercept at the window capture phase instead.)
  const activeCutoutsRef = useRef<Rect[]>(activeCutouts);
  activeCutoutsRef.current = activeCutouts;
  const isInteractRef = useRef(isInteract);
  isInteractRef.current = isInteract;
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;

  useEffect(() => {
    const inside = (r: Rect, cx: number, cy: number) =>
      cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height;

    const handle = (e: Event) => {
      const me = e as MouseEvent;
      // Tooltip card: always let events through
      if (tooltipRef.current?.contains(me.target as Node)) return;
      const { clientX: cx, clientY: cy } = me;
      // Spotlight holes: let events reach the underlying UI
      if (activeCutoutsRef.current.some((r) => inside(r, cx, cy))) return;
      // Dark area: block event from reaching underlying elements
      e.stopPropagation();
      e.preventDefault();
      // Advance on observe steps (interact steps wait for the real UI interaction)
      if (e.type === "click" && !isInteractRef.current) {
        onNextRef.current();
      }
    };

    window.addEventListener("pointerdown", handle, { capture: true });
    window.addEventListener("click", handle, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", handle, { capture: true });
      window.removeEventListener("click", handle, { capture: true });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — all reactive values are accessed via refs above

  return (
    <div
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-label={`Tutorial step ${stepIndex + 1}: ${step.title}`}
      style={{ pointerEvents: "none" }}
    >
      {/* SVG overlay with one or two cutouts */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
        viewBox={`0 0 ${vw} ${vh}`}
        preserveAspectRatio="none"
      >
        <path
          d={
            activeCutouts.length > 0
              ? buildClipPath(vw, vh, activeCutouts, 12)
              : `M0,0 H${vw} V${vh} H0 Z`
          }
          fill="rgba(12, 10, 13, 0.75)"
          fillRule="nonzero"
          style={{ transition: "d 0.3s ease-out" }}
        />
      </svg>

      {/* No click-capture div — pointer events are handled by the window capture listener above.
           CSS clip-path: path() does not reliably exclude pointer-events in Chromium. */}

      {/* Highlight ring(s) on target(s) */}
      {activeCutouts.map((r, i) => {
        // The box-shadow ring extends 2 px *outside* the div.
        // If the div reaches the viewport edge the ring overflows and gets
        // clipped.  Shrink the ring div by RING px on any side that is flush
        // with the viewport so the shadow lands exactly at the edge.
        const RING = 2;
        const ringW = Math.max(0, Math.min(r.width,  vw - r.x - RING));
        const ringH = Math.max(0, Math.min(r.height, vh - r.y - RING));
        return (
          <div
            key={i}
            className="absolute tutorial-highlight rounded-xl"
            style={{
              left: r.x,
              top: r.y,
              width: ringW,
              height: ringH,
              transition: "left 0.3s, top 0.3s, width 0.3s, height 0.3s",
            }}
          />
        );
      })}

      {/* Tooltip card — explicit pointer-events: auto because root has pointer-events: none */}
      <div
        key={animKey}
        ref={tooltipRef}
        className="animate-tutorial-tooltip z-[72]"
        style={{ pointerEvents: "auto", ...tooltipStyle }}
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

          {/* Interaction hint(s) */}
          {isInteract && (step.interactionHint || step.secondaryInteractionHint) && (
            <div className="flex flex-col gap-1">
              {step.interactionHint && (
                <div className="flex items-center gap-2 px-3 py-2 bg-goshiwon-bg rounded-lg border border-goshiwon-yellow/20">
                  <span className="text-goshiwon-yellow text-xs">&#9758;</span>
                  <span className="text-xs text-goshiwon-yellow">{step.interactionHint}</span>
                </div>
              )}
              {step.secondaryInteractionHint && (
                <>
                  <p className="text-center text-[10px] text-goshiwon-text-muted">— or —</p>
                  <div className="flex items-center gap-2 px-3 py-2 bg-goshiwon-bg rounded-lg border border-goshiwon-yellow/20">
                    <span className="text-goshiwon-yellow text-xs">&#9758;</span>
                    <span className="text-xs text-goshiwon-yellow">{step.secondaryInteractionHint}</span>
                  </div>
                </>
              )}
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
