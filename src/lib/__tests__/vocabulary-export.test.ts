import { describe, it, expect } from "vitest";
import {
  exportToCSV,
  exportToAnkiTSV,
} from "../vocabulary-export";
import type { VocabularyItem } from "@/types";

const makeWord = (overrides: Partial<VocabularyItem> = {}): VocabularyItem => ({
  id: "1",
  korean: "안녕하세요",
  romanization: "annyeonghaseyo",
  english: "hello",
  savedAt: "2025-01-15T10:00:00Z",
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
  nextReview: "2025-01-15",
  lastGrade: null,
  ...overrides,
});

describe("exportToCSV", () => {
  it("starts with UTF-8 BOM", () => {
    const csv = exportToCSV([]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("includes header row", () => {
    const csv = exportToCSV([]);
    expect(csv).toContain("Korean,Romanization,English,SRS Stage,Saved Date");
  });

  it("exports a word correctly", () => {
    const csv = exportToCSV([makeWord()]);
    const lines = csv.split("\n");
    expect(lines.length).toBe(2); // header + 1 word
    expect(lines[1]).toContain("안녕하세요");
    expect(lines[1]).toContain("annyeonghaseyo");
    expect(lines[1]).toContain("hello");
    expect(lines[1]).toContain("New");
  });

  it("shows correct SRS stages", () => {
    const words = [
      makeWord({ id: "1", korean: "가", repetitions: 0 }),
      makeWord({ id: "2", korean: "나", repetitions: 3, interval: 10 }),
      makeWord({ id: "3", korean: "다", repetitions: 5, interval: 30 }),
    ];
    const csv = exportToCSV(words);
    const lines = csv.split("\n");
    expect(lines[1]).toContain("New");
    expect(lines[2]).toContain("Learning");
    expect(lines[3]).toContain("Mastered");
  });

  it("escapes commas in fields", () => {
    const csv = exportToCSV([
      makeWord({ english: "hello, goodbye" }),
    ]);
    expect(csv).toContain('"hello, goodbye"');
  });

  it("escapes quotes in fields", () => {
    const csv = exportToCSV([
      makeWord({ english: 'say "hello"' }),
    ]);
    expect(csv).toContain('"say ""hello"""');
  });

  it("handles empty english", () => {
    const csv = exportToCSV([makeWord({ english: "" })]);
    const lines = csv.split("\n");
    expect(lines[1]).toContain("안녕하세요,annyeonghaseyo,,New");
  });
});

describe("exportToAnkiTSV", () => {
  it("exports tab-separated front and back", () => {
    const tsv = exportToAnkiTSV([makeWord()]);
    const parts = tsv.split("\t");
    expect(parts[0]).toBe("안녕하세요 (annyeonghaseyo)");
    expect(parts[1]).toBe("hello");
  });

  it("filters out words without english", () => {
    const words = [
      makeWord({ id: "1", english: "hello" }),
      makeWord({ id: "2", english: "" }),
      makeWord({ id: "3", english: "goodbye" }),
    ];
    const tsv = exportToAnkiTSV(words);
    const lines = tsv.split("\n");
    expect(lines.length).toBe(2);
  });

  it("returns empty string for empty input", () => {
    expect(exportToAnkiTSV([])).toBe("");
  });

  it("returns empty string when all words lack english", () => {
    expect(exportToAnkiTSV([makeWord({ english: "" })])).toBe("");
  });
});
