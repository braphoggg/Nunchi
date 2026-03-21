import { describe, it, expect } from "vitest";
import { generateQuiz, MIN_QUIZ_WORDS, type QuizQuestion } from "../quiz-generator";
import type { VocabularyItem } from "@/types";

function makeWord(id: string, korean: string, english: string, romanization = "rom"): VocabularyItem {
  return {
    id,
    korean,
    romanization,
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

  it("returns empty array when words have no english or romanization", () => {
    const noMeaning = [
      makeWord("a", "가", "", ""),
      makeWord("b", "나", "", ""),
      makeWord("c", "다", "", ""),
      makeWord("d", "라", "", ""),
    ];
    expect(generateQuiz(noMeaning)).toEqual([]);
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

  it("filters out words without english or romanization before generating", () => {
    const mixed = [
      ...SAMPLE_WORDS.slice(0, 4),
      makeWord("noeng1", "하나", "", ""),
      makeWord("noeng2", "둘", "   ", ""),
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

describe("generateQuiz edge cases", () => {
  it("generates questions with exactly 4 words (boundary)", () => {
    const fourWords = [
      makeWord("b1", "고양이", "cat"),
      makeWord("b2", "강아지", "dog"),
      makeWord("b3", "새", "bird"),
      makeWord("b4", "물고기", "fish"),
    ];
    const questions = generateQuiz(fourWords, 4);
    expect(questions.length).toBe(4);
    for (const q of questions) {
      expect(q.options).toHaveLength(4);
    }
  });

  it("caps count at available words when count exceeds pool size", () => {
    const fiveWords = [
      makeWord("c1", "하나", "one"),
      makeWord("c2", "둘", "two"),
      makeWord("c3", "셋", "three"),
      makeWord("c4", "넷", "four"),
      makeWord("c5", "다섯", "five"),
    ];
    const questions = generateQuiz(fiveWords, 50);
    expect(questions.length).toBe(5);
  });

  it("forces all questions to korean_to_english when specified", () => {
    const questions = generateQuiz(SAMPLE_WORDS, 6, "korean_to_english");
    expect(questions.length).toBe(6);
    for (const q of questions) {
      expect(q.type).toBe("korean_to_english");
      const word = SAMPLE_WORDS.find((w) => w.id === q.wordId);
      expect(q.prompt).toBe(word!.korean);
      expect(q.correctAnswer).toBe(word!.english);
    }
  });

  it("forces all questions to english_to_korean when specified", () => {
    const questions = generateQuiz(SAMPLE_WORDS, 6, "english_to_korean");
    expect(questions.length).toBe(6);
    for (const q of questions) {
      expect(q.type).toBe("english_to_korean");
      const word = SAMPLE_WORDS.find((w) => w.id === q.wordId);
      expect(q.prompt).toBe(word!.english);
      expect(q.correctAnswer).toBe(word!.korean);
    }
  });

  it("produces unique distractors when words have duplicate english translations", () => {
    const dupes = [
      makeWord("d1", "감사합니다", "thank you"),
      makeWord("d2", "고맙습니다", "thank you"),
      makeWord("d3", "사랑", "love"),
      makeWord("d4", "학교", "school"),
      makeWord("d5", "물", "water"),
      makeWord("d6", "밥", "rice"),
    ];
    const questions = generateQuiz(dupes, 6, "korean_to_english");
    for (const q of questions) {
      const lowered = q.options.map((o) => o.toLowerCase());
      expect(new Set(lowered).size).toBe(lowered.length);
    }
  });

  it("generates exactly 1 question when count is 1", () => {
    const questions = generateQuiz(SAMPLE_WORDS, 1);
    expect(questions.length).toBe(1);
    expect(questions[0].options).toHaveLength(4);
  });

  it("still generates when all words share the same english translation", () => {
    const sameEnglish = [
      makeWord("s1", "안녕", "hi"),
      makeWord("s2", "여보세요", "hi"),
      makeWord("s3", "하이", "hi"),
      makeWord("s4", "인사", "hi"),
    ];
    // korean_to_english: distractors are english text, all "hi" so deduped
    // The generator should still produce questions even if distractors < 3
    const questions = generateQuiz(sameEnglish, 4, "english_to_korean");
    expect(questions.length).toBe(4);
    for (const q of questions) {
      expect(q.correctAnswer).toBeTruthy();
    }
  });

  it("filters out words with whitespace-only english and romanization", () => {
    const mixed = [
      makeWord("f1", "고양이", "cat"),
      makeWord("f2", "강아지", "dog"),
      makeWord("f3", "새", "bird"),
      makeWord("f4", "물고기", "fish"),
      makeWord("f5", "나비", "   ", ""),
      makeWord("f6", "벌", "  \t  ", ""),
    ];
    const questions = generateQuiz(mixed, 6, "korean_to_english");
    expect(questions.length).toBe(4);
    for (const q of questions) {
      expect(q.wordId).not.toBe("f5");
      expect(q.wordId).not.toBe("f6");
    }
  });
});
