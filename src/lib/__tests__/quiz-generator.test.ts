import { describe, it, expect } from "vitest";
import { generateQuiz, MIN_QUIZ_WORDS, type QuizQuestion } from "../quiz-generator";
import type { VocabularyItem } from "@/types";

function makeWord(id: string, korean: string, english: string): VocabularyItem {
  return {
    id,
    korean,
    romanization: "rom",
    english,
    savedAt: new Date().toISOString(),
  };
}

const SAMPLE_WORDS: VocabularyItem[] = [
  makeWord("w1", "안녕하세요", "hello"),
  makeWord("w2", "감사합니다", "thank you"),
  makeWord("w3", "사랑", "love"),
  makeWord("w4", "학교", "school"),
  makeWord("w5", "물", "water"),
  makeWord("w6", "밥", "rice"),
];

describe("generateQuiz", () => {
  it("returns empty array when fewer than MIN_QUIZ_WORDS studyable words", () => {
    const few = SAMPLE_WORDS.slice(0, 2);
    expect(generateQuiz(few)).toEqual([]);
  });

  it("returns empty array when words have no english translation", () => {
    const noEnglish = [
      makeWord("a", "가", ""),
      makeWord("b", "나", ""),
      makeWord("c", "다", ""),
      makeWord("d", "라", ""),
    ];
    expect(generateQuiz(noEnglish)).toEqual([]);
  });

  it("generates questions when enough words are provided", () => {
    const questions = generateQuiz(SAMPLE_WORDS, 4);
    expect(questions.length).toBe(4);
  });

  it("caps questions at available word count", () => {
    const questions = generateQuiz(SAMPLE_WORDS, 100);
    expect(questions.length).toBe(SAMPLE_WORDS.length);
  });

  it("each question has 4 options", () => {
    const questions = generateQuiz(SAMPLE_WORDS, 4);
    for (const q of questions) {
      expect(q.options).toHaveLength(4);
    }
  });

  it("each question includes the correct answer in options", () => {
    const questions = generateQuiz(SAMPLE_WORDS, 6);
    for (const q of questions) {
      expect(q.options).toContain(q.correctAnswer);
    }
  });

  it("generates valid question types", () => {
    const questions = generateQuiz(SAMPLE_WORDS, 6);
    for (const q of questions) {
      expect(["korean_to_english", "english_to_korean"]).toContain(q.type);
    }
  });

  it("korean_to_english questions have Korean prompt and English answer", () => {
    // Generate many questions to increase chance of getting both types
    const questions = generateQuiz(SAMPLE_WORDS, 6);
    const k2e = questions.filter((q) => q.type === "korean_to_english");
    for (const q of k2e) {
      const word = SAMPLE_WORDS.find((w) => w.id === q.wordId);
      expect(word).toBeDefined();
      expect(q.prompt).toBe(word!.korean);
      expect(q.correctAnswer).toBe(word!.english);
    }
  });

  it("english_to_korean questions have English prompt and Korean answer", () => {
    const questions = generateQuiz(SAMPLE_WORDS, 6);
    const e2k = questions.filter((q) => q.type === "english_to_korean");
    for (const q of e2k) {
      const word = SAMPLE_WORDS.find((w) => w.id === q.wordId);
      expect(word).toBeDefined();
      expect(q.prompt).toBe(word!.english);
      expect(q.correctAnswer).toBe(word!.korean);
    }
  });

  it("distractors come from other words (not the same word)", () => {
    const questions = generateQuiz(SAMPLE_WORDS, 6);
    for (const q of questions) {
      const distractors = q.options.filter((o) => o !== q.correctAnswer);
      expect(distractors.length).toBe(3);
      // Each distractor should be from a different word
      for (const d of distractors) {
        if (q.type === "korean_to_english") {
          const matchingWord = SAMPLE_WORDS.find((w) => w.english === d);
          expect(matchingWord).toBeDefined();
          expect(matchingWord!.id).not.toBe(q.wordId);
        } else {
          const matchingWord = SAMPLE_WORDS.find((w) => w.korean === d);
          expect(matchingWord).toBeDefined();
          expect(matchingWord!.id).not.toBe(q.wordId);
        }
      }
    }
  });

  it("generates unique question IDs", () => {
    const questions = generateQuiz(SAMPLE_WORDS, 6);
    const ids = questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("questions reference valid word IDs", () => {
    const questions = generateQuiz(SAMPLE_WORDS, 6);
    const wordIds = new Set(SAMPLE_WORDS.map((w) => w.id));
    for (const q of questions) {
      expect(wordIds.has(q.wordId)).toBe(true);
    }
  });

  it("filters out words without english before generating", () => {
    const mixed = [
      ...SAMPLE_WORDS.slice(0, 4),
      makeWord("noeng1", "하나", ""),
      makeWord("noeng2", "둘", "   "),
    ];
    const questions = generateQuiz(mixed, 4);
    expect(questions.length).toBe(4);
    for (const q of questions) {
      expect(q.wordId).not.toBe("noeng1");
      expect(q.wordId).not.toBe("noeng2");
    }
  });
});

describe("MIN_QUIZ_WORDS", () => {
  it("equals 4", () => {
    expect(MIN_QUIZ_WORDS).toBe(4);
  });
});
