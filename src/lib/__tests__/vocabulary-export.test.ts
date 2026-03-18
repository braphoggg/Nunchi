import { describe, it, expect, vi } from "vitest";
import {
  exportToCSV,
  exportToAnkiTSV,
  downloadFile,
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

  it("escapes HTML entities in output", () => {
    const tsv = exportToAnkiTSV([
      makeWord({ korean: "<script>", romanization: "test", english: "a & b" }),
    ]);
    const [front, back] = tsv.split("\t");
    expect(front).toContain("&lt;script&gt;");
    expect(back).toBe("a &amp; b");
  });

  it("replaces tab characters in values with spaces", () => {
    const tsv = exportToAnkiTSV([
      makeWord({ english: "hello\tworld" }),
    ]);
    const back = tsv.split("\t")[1];
    expect(back).toBe("hello world");
    expect(back).not.toContain("\t");
  });

  it("replaces newlines in values with <br>", () => {
    const tsv = exportToAnkiTSV([
      makeWord({ english: "line1\nline2" }),
    ]);
    const back = tsv.split("\t")[1];
    expect(back).toBe("line1<br>line2");
  });
});

describe("CSV formula injection defense", () => {
  it("prefixes = with single quote and wraps in quotes", () => {
    const csv = exportToCSV([makeWord({ english: "=SUM(A1)" })]);
    expect(csv).toContain("\"'=SUM(A1)\"");
  });

  it("prefixes + with single quote and wraps in quotes", () => {
    const csv = exportToCSV([makeWord({ english: "+cmd" })]);
    expect(csv).toContain("\"'+cmd\"");
  });

  it("prefixes - with single quote and wraps in quotes", () => {
    const csv = exportToCSV([makeWord({ english: "-1+1" })]);
    expect(csv).toContain("\"'-1+1\"");
  });

  it("prefixes @ with single quote and wraps in quotes", () => {
    const csv = exportToCSV([makeWord({ english: "@import" })]);
    expect(csv).toContain("\"'@import\"");
  });
});

describe("CSV newline handling", () => {
  it("wraps fields containing newlines in quotes", () => {
    const csv = exportToCSV([makeWord({ english: "line1\nline2" })]);
    expect(csv).toContain('"line1\nline2"');
  });

  it("wraps fields containing newlines and escapes inner quotes", () => {
    const csv = exportToCSV([makeWord({ english: 'say "hi"\nthere' })]);
    expect(csv).toContain('"say ""hi""\nthere"');
  });
});

describe("exportToCSV edge cases", () => {
  it("returns only BOM + header for empty array", () => {
    const csv = exportToCSV([]);
    const lines = csv.split("\n");
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain("Korean,Romanization,English,SRS Stage,Saved Date");
  });

  it("SRS stage boundary: interval=20 is Learning", () => {
    const csv = exportToCSV([makeWord({ repetitions: 3, interval: 20 })]);
    expect(csv).toContain("Learning");
    expect(csv).not.toContain("Mastered");
  });

  it("SRS stage boundary: interval=21 is Mastered", () => {
    const csv = exportToCSV([makeWord({ repetitions: 3, interval: 21 })]);
    expect(csv).toContain("Mastered");
  });

  it("repetitions=0 always produces New regardless of interval", () => {
    const csv = exportToCSV([makeWord({ repetitions: 0, interval: 100 })]);
    expect(csv).toContain("New");
  });

  it("handles carriage returns in fields", () => {
    const csv = exportToCSV([makeWord({ english: "hello\r\nworld" })]);
    expect(csv).toContain('"hello\r\nworld"');
  });

  it("produces correct number of data rows for multiple words", () => {
    const words = [
      makeWord({ id: "1", korean: "가" }),
      makeWord({ id: "2", korean: "나" }),
      makeWord({ id: "3", korean: "다" }),
    ];
    const csv = exportToCSV(words);
    // BOM + header + 3 data rows
    const lines = csv.split("\n");
    expect(lines.length).toBe(4);
  });
});

describe("exportToAnkiTSV edge cases", () => {
  it("handles romanization with spaces", () => {
    const tsv = exportToAnkiTSV([
      makeWord({ korean: "감사합니다", romanization: "gam sa ham ni da", english: "thank you" }),
    ]);
    expect(tsv).toContain("감사합니다 (gam sa ham ni da)");
  });

  it("handles multiple words producing correct line count", () => {
    const words = [
      makeWord({ id: "1", korean: "가", english: "a" }),
      makeWord({ id: "2", korean: "나", english: "b" }),
      makeWord({ id: "3", korean: "다", english: "c" }),
    ];
    const tsv = exportToAnkiTSV(words);
    const lines = tsv.split("\n");
    expect(lines.length).toBe(3);
  });

  it("escapes ampersand in Korean field", () => {
    const tsv = exportToAnkiTSV([
      makeWord({ korean: "A&B", romanization: "ab", english: "test" }),
    ]);
    expect(tsv).toContain("A&amp;B");
  });
});

describe("downloadFile", () => {
  it("creates blob with correct content and MIME type, sets filename, clicks, and revokes URL", () => {
    const mockClick = vi.fn();
    const mockAnchor = {
      href: "",
      download: "",
      click: mockClick,
    } as unknown as HTMLAnchorElement;

    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockReturnValue(mockAnchor as unknown as HTMLElement);
    const appendChildSpy = vi
      .spyOn(document.body, "appendChild")
      .mockImplementation((node) => node);
    const removeChildSpy = vi
      .spyOn(document.body, "removeChild")
      .mockImplementation((node) => node);

    const fakeUrl = "blob:http://localhost/fake-uuid";
    const createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue(fakeUrl);
    const revokeObjectURLSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});

    downloadFile("test content", "vocab.csv", "text/csv;charset=utf-8");

    expect(createElementSpy).toHaveBeenCalledWith("a");

    const blobArg = createObjectURLSpy.mock.calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe("text/csv;charset=utf-8");

    expect(mockAnchor.href).toBe(fakeUrl);
    expect(mockAnchor.download).toBe("vocab.csv");

    expect(appendChildSpy).toHaveBeenCalledWith(mockAnchor);
    expect(mockClick).toHaveBeenCalledOnce();
    expect(removeChildSpy).toHaveBeenCalledWith(mockAnchor);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith(fakeUrl);

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });
});
