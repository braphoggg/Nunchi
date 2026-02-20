/**
 * Adversarial break tests for format-message.ts
 * Target: Rendered Content Manipulation (#8)
 *
 * formatMessage splits on /(\*\*[^*]+\*\*)/g, wraps bold matches in <strong>,
 * and everything else in <span>. React.createElement children are auto-escaped,
 * so XSS payloads become text nodes — but we verify that invariant explicitly.
 */
import { describe, it, expect } from "vitest";
import { formatMessage } from "../format-message";
import React from "react";

// ---------------------------------------------------------------------------
// Helper: extract props/children from React elements for assertion
// ---------------------------------------------------------------------------
function elemType(el: React.ReactNode): string | null {
  if (React.isValidElement(el)) {
    return typeof el.type === "string" ? el.type : null;
  }
  return null;
}

function elemProps(el: React.ReactNode): Record<string, unknown> | null {
  if (React.isValidElement(el)) {
    return el.props as Record<string, unknown>;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Rendered Content Manipulation (#8)
// ---------------------------------------------------------------------------
describe("BREAK: formatMessage — rendered content manipulation (#8)", () => {
  // -------------------------------------------------------------------------
  // E1: XSS via bold markers
  // -------------------------------------------------------------------------
  it("E1: XSS payload inside bold markers is rendered as text, not HTML", () => {
    const xssPayload = "**<img src=x onerror=alert(1)>**";
    const result = formatMessage(xssPayload);

    // Should produce elements (not crash)
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // Find the <strong> element containing the payload
    const strongEl = result.find((el) => elemType(el) === "strong");
    expect(strongEl).toBeDefined();

    const props = elemProps(strongEl!);
    expect(props).not.toBeNull();

    // FINDING: React.createElement("strong", {...}, text) places the XSS string
    // as a TEXT child, not as dangerouslySetInnerHTML. React auto-escapes this
    // during rendering, so it is safe. Verify the child is a plain string.
    const children = props!.children;
    expect(typeof children).toBe("string");
    expect(children).toBe("<img src=x onerror=alert(1)>");

    // Verify dangerouslySetInnerHTML is NOT set on the element
    expect(props!.dangerouslySetInnerHTML).toBeUndefined();

    // FINDING: The XSS payload survives as literal text — React's createElement
    // model treats children as text nodes, not raw HTML. This is the correct
    // behavior. The function does NOT sanitize inputs itself; it relies entirely
    // on React's auto-escaping. If this output were ever used with
    // dangerouslySetInnerHTML or inserted via .innerHTML, it would be exploitable.
  });

  // -------------------------------------------------------------------------
  // E2: ReDoS via massive bold content
  // -------------------------------------------------------------------------
  it("E2: regex completes in < 100ms on 100K-char bold content (no ReDoS)", () => {
    const massiveContent = "**" + "가".repeat(100_000) + "**";

    const start = performance.now();
    const result = formatMessage(massiveContent);
    const elapsed = performance.now() - start;

    // FINDING: The regex /(\*\*[^*]+\*\*)/g uses [^*]+ which is a simple
    // character-class negation — no backtracking explosion possible.
    // This is inherently safe from ReDoS.
    expect(elapsed).toBeLessThan(100);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // Verify the match was captured as a <strong> element
    const strongEl = result.find((el) => elemType(el) === "strong");
    expect(strongEl).toBeDefined();

    const children = elemProps(strongEl!)!.children as string;
    expect(children.length).toBe(100_000);
  });

  // -------------------------------------------------------------------------
  // E3: Nested bold markers
  // -------------------------------------------------------------------------
  it("E3: nested bold markers produce predictable split without crash", () => {
    const input = "**hello **world** there**";
    const result = formatMessage(input);

    // FINDING: The regex [^*]+ prevents matching across ** boundaries.
    // "**hello **world** there**" — the regex cannot match "**hello **"
    // because the space-then-asterisks means [^*]+ stops at the first *.
    // Instead it matches "**world**" as the only bold segment.
    // The rest becomes plain <span> text.
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // Verify no crash and all elements are valid React elements
    for (const el of result) {
      expect(React.isValidElement(el)).toBe(true);
    }

    // The regex /(\*\*[^*]+\*\*)/g splits "**hello **world** there**" as:
    //   ["", "**hello **", "world", "** there**", ""]
    // So "**hello **" and "** there**" both match the bold pattern, producing
    // 2 <strong> elements (with children "hello " and " there").
    // "world" becomes a plain <span>.
    const strongEls = result.filter((el) => elemType(el) === "strong");
    expect(strongEls.length).toBe(2);

    const strongTexts = strongEls.map((el) => elemProps(el!)!.children as string);
    expect(strongTexts).toContain("hello ");
    expect(strongTexts).toContain(" there");

    // DOCUMENTED WEAKNESS: Nested bold markers produce surprising split results.
    // The regex greedily matches "**hello **" as a bold segment (treating the
    // space before ** as content), leaving "world" as a plain span. This is
    // unintuitive — the user sees "hello " and " there" bolded but "world" plain.
    const spanEls = result.filter((el) => elemType(el) === "span");
    const spanTexts = spanEls.map((el) => elemProps(el)!.children as string);
    expect(spanTexts).toContain("world");
  });

  // -------------------------------------------------------------------------
  // E4: dangerouslySetInnerHTML injection attempt
  // -------------------------------------------------------------------------
  it("E4: dangerouslySetInnerHTML object inside bold is rendered as literal text", () => {
    const injection = JSON.stringify({
      dangerouslySetInnerHTML: { __html: "<script>alert(1)</script>" },
    });
    const input = `**${injection}**`;
    const result = formatMessage(input);

    expect(Array.isArray(result)).toBe(true);

    const strongEl = result.find((el) => elemType(el) === "strong");
    expect(strongEl).toBeDefined();

    const props = elemProps(strongEl!);

    // FINDING: The injection string is passed as the third argument (children)
    // to React.createElement, not as the second argument (props). Therefore
    // React treats it as a text node, not as a props object. The
    // dangerouslySetInnerHTML key only has effect when it is a property of the
    // props object (second argument). As a child string, it is auto-escaped.
    expect(typeof props!.children).toBe("string");
    expect(props!.children).toBe(injection);
    expect(props!.dangerouslySetInnerHTML).toBeUndefined();

    // DOCUMENTED WEAKNESS: formatMessage does zero input sanitization. It trusts
    // React's auto-escaping entirely. If a future refactor changed the bold
    // rendering to use dangerouslySetInnerHTML (e.g., for rich formatting),
    // every historical message with injected content would become exploitable.
  });

  // -------------------------------------------------------------------------
  // E5: Empty bold markers
  // -------------------------------------------------------------------------
  it("E5: empty bold markers '****' do not crash", () => {
    const input = "****";
    const result = formatMessage(input);

    // FINDING: The regex /(\*\*[^*]+\*\*)/g does NOT capture "****" because
    // [^*]+ requires at least one non-asterisk character. So split() returns
    // ["****"] as a single unsplit element. However, the subsequent check
    // `part.startsWith("**") && part.endsWith("**")` is TRUE for "****"
    // because the 4-char string both starts and ends with "**".
    // This means "****" is incorrectly rendered as a <strong> element with
    // an empty string child (slice(2, -2) = "").
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // DOCUMENTED WEAKNESS: "****" produces a <strong> element with empty
    // content, which is incorrect behavior. The regex/startsWith check
    // mismatch means 4 asterisks create an empty bold element.
    const strongEls = result.filter((el) => elemType(el) === "strong");
    expect(strongEls.length).toBe(1);

    // The content of the strong element is empty string
    const strongContent = elemProps(strongEls[0]!)!.children;
    expect(strongContent).toBe("");

    // No <span> elements with "****" text since it was captured as bold
    const spanEls = result.filter((el) => elemType(el) === "span");
    expect(spanEls.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // E6: Very long content without bold
  // -------------------------------------------------------------------------
  it("E6: 1M-char non-bold content completes in < 200ms", () => {
    const input = "a".repeat(1_000_000);

    const start = performance.now();
    const result = formatMessage(input);
    const elapsed = performance.now() - start;

    // FINDING: With no ** markers, the regex produces no captures.
    // String.split with a non-matching capturing group returns ["<entire string>"].
    // The map produces a single <span> element. This is O(n) for the regex scan
    // and O(1) for the map — should be fast.
    expect(elapsed).toBeLessThan(200);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);

    const el = result[0]!;
    expect(elemType(el)).toBe("span");
    expect((elemProps(el)!.children as string).length).toBe(1_000_000);
  });

  // -------------------------------------------------------------------------
  // E7: Special regex characters in content
  // -------------------------------------------------------------------------
  it("E7: regex metacharacters inside bold markers do not cause errors", () => {
    const input = "**($+^)**";
    const result = formatMessage(input);

    // FINDING: The content ($+^) is inside the ** delimiters. The regex
    // /(\*\*[^*]+\*\*)/g only cares about * characters — all other chars
    // (including regex metacharacters like $, +, ^, (, )) are matched by [^*]+.
    // They are never interpreted as regex operators because they are inside a
    // character class negation pattern, not in a dynamic regex.
    expect(Array.isArray(result)).toBe(true);

    const strongEl = result.find((el) => elemType(el) === "strong");
    expect(strongEl).toBeDefined();
    expect(elemProps(strongEl!)!.children).toBe("($+^)");

    // Additional regex metacharacters
    const edgeCases = [
      "**[brackets]**",
      "**{braces}**",
      "**pipe|pipe**",
      "**back\\slash**",
      "**dot.dot**",
      "**question?mark**",
      "**caret^dollar$**",
    ];

    for (const edge of edgeCases) {
      const res = formatMessage(edge);
      const strong = res.find((el) => elemType(el) === "strong");
      expect(strong).toBeDefined();
      // Extract expected text: strip leading ** and trailing **
      const expectedText = edge.slice(2, -2);
      expect(elemProps(strong!)!.children).toBe(expectedText);
    }
  });
});
