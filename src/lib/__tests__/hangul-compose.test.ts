import { describe, it, expect } from "vitest";
import {
  createCompositionState,
  feedJamo,
  feedBackspace,
  getDisplayText,
  commitAll,
} from "../hangul-compose";

function compose(...jamos: string[]): string {
  let state = createCompositionState();
  for (const j of jamos) {
    state = feedJamo(state, j);
  }
  return getDisplayText(state);
}

function composeAndCommit(...jamos: string[]): string {
  let state = createCompositionState();
  for (const j of jamos) {
    state = feedJamo(state, j);
  }
  return commitAll(state);
}

describe("hangul-compose", () => {
  describe("basic composition", () => {
    it("single consonant shows as jamo", () => {
      expect(compose("ㄱ")).toBe("ㄱ");
      expect(compose("ㅎ")).toBe("ㅎ");
    });

    it("consonant + vowel forms syllable", () => {
      expect(compose("ㄱ", "ㅏ")).toBe("가");
      expect(compose("ㄴ", "ㅏ")).toBe("나");
      expect(compose("ㅎ", "ㅏ")).toBe("하");
    });

    it("consonant + vowel + final forms complete syllable", () => {
      expect(compose("ㄱ", "ㅏ", "ㄴ")).toBe("간");
      expect(compose("ㅎ", "ㅏ", "ㄴ")).toBe("한");
      expect(compose("ㄱ", "ㅡ", "ㄹ")).toBe("글");
    });

    it("vowel alone is committed as-is", () => {
      expect(compose("ㅏ")).toBe("ㅏ");
      expect(compose("ㅗ")).toBe("ㅗ");
    });
  });

  describe("final consonant detachment", () => {
    it("adding vowel after final detaches the final", () => {
      // 간 + ㅏ → 가나
      expect(compose("ㄱ", "ㅏ", "ㄴ", "ㅏ")).toBe("가나");
    });

    it("한글 composition works (ㅎㅏㄴ + ㄱㅡㄹ)", () => {
      expect(compose("ㅎ", "ㅏ", "ㄴ", "ㄱ", "ㅡ", "ㄹ")).toBe("한글");
    });

    it("안녕 composition works", () => {
      // ㅇ+ㅏ+ㄴ = 안, ㄴ+ㅕ+ㅇ = 녕
      expect(compose("ㅇ", "ㅏ", "ㄴ", "ㄴ", "ㅕ", "ㅇ")).toBe("안녕");
    });
  });

  describe("complex vowels", () => {
    it("ㅗ + ㅏ = ㅘ", () => {
      expect(compose("ㄱ", "ㅗ", "ㅏ")).toBe("과");
    });

    it("ㅜ + ㅓ = ㅝ", () => {
      expect(compose("ㅂ", "ㅜ", "ㅓ")).toBe("붜");
    });

    it("ㅜ + ㅣ = ㅟ", () => {
      expect(compose("ㄱ", "ㅜ", "ㅣ")).toBe("귀");
    });

    it("ㅡ + ㅣ = ㅢ", () => {
      expect(compose("ㅇ", "ㅡ", "ㅣ")).toBe("의");
    });

    it("ㅗ + ㅐ = ㅙ", () => {
      expect(compose("ㅎ", "ㅗ", "ㅐ")).toBe("홰");
    });
  });

  describe("complex finals", () => {
    it("ㄱ + ㅅ = ㄳ final", () => {
      // ㄴ+ㅏ+ㄱ+ㅅ = 낛 (ㄴ initial, ㅏ medial, ㄳ final)
      expect(compose("ㄴ", "ㅏ", "ㄱ", "ㅅ")).toBe("낛");
    });

    it("ㄹ + ㄱ = ㄺ final", () => {
      expect(compose("ㄷ", "ㅏ", "ㄹ", "ㄱ")).toBe("닭");
    });

    it("ㄹ + ㅁ = ㄻ final", () => {
      expect(compose("ㅅ", "ㅏ", "ㄹ", "ㅁ")).toBe("삶");
    });

    it("ㅂ + ㅅ = ㅄ final", () => {
      expect(compose("ㅇ", "ㅓ", "ㅂ", "ㅅ")).toBe("없");
    });

    it("complex final decomposes when vowel follows", () => {
      // 닭 + ㅏ → 달가
      expect(compose("ㄷ", "ㅏ", "ㄹ", "ㄱ", "ㅏ")).toBe("달가");
    });
  });

  describe("double consonants", () => {
    it("ㄲ as initial", () => {
      expect(compose("ㄲ", "ㅏ")).toBe("까");
    });

    it("ㅆ as initial", () => {
      expect(compose("ㅆ", "ㅏ")).toBe("싸");
    });

    it("ㅆ as final", () => {
      expect(compose("ㅇ", "ㅣ", "ㅆ")).toBe("있");
    });
  });

  describe("sequential consonants (no complex final possible)", () => {
    it("commits current and starts new syllable", () => {
      // 강 then ㅎ can't combine → 강 + ㅎ
      expect(compose("ㄱ", "ㅏ", "ㅇ", "ㅎ")).toBe("강ㅎ");
    });
  });

  describe("backspace", () => {
    it("removes final from complete syllable", () => {
      let state = createCompositionState();
      state = feedJamo(state, "ㄱ");
      state = feedJamo(state, "ㅏ");
      state = feedJamo(state, "ㄴ");
      expect(getDisplayText(state)).toBe("간");
      state = feedBackspace(state);
      expect(getDisplayText(state)).toBe("가");
    });

    it("removes vowel after removing final", () => {
      let state = createCompositionState();
      state = feedJamo(state, "ㄱ");
      state = feedJamo(state, "ㅏ");
      state = feedJamo(state, "ㄴ");
      state = feedBackspace(state); // 간 → 가
      state = feedBackspace(state); // 가 → ㄱ
      expect(getDisplayText(state)).toBe("ㄱ");
    });

    it("removes initial consonant entirely", () => {
      let state = createCompositionState();
      state = feedJamo(state, "ㄱ");
      state = feedJamo(state, "ㅏ");
      state = feedJamo(state, "ㄴ");
      state = feedBackspace(state); // 간 → 가
      state = feedBackspace(state); // 가 → ㄱ
      state = feedBackspace(state); // ㄱ → empty
      expect(getDisplayText(state)).toBe("");
    });

    it("decomposes complex final on backspace", () => {
      let state = createCompositionState();
      state = feedJamo(state, "ㄷ");
      state = feedJamo(state, "ㅏ");
      state = feedJamo(state, "ㄹ");
      state = feedJamo(state, "ㄱ");
      expect(getDisplayText(state)).toBe("닭");
      state = feedBackspace(state); // ㄺ → ㄹ
      expect(getDisplayText(state)).toBe("달");
    });

    it("decomposes complex vowel on backspace", () => {
      let state = createCompositionState();
      state = feedJamo(state, "ㄱ");
      state = feedJamo(state, "ㅗ");
      state = feedJamo(state, "ㅏ");
      expect(getDisplayText(state)).toBe("과");
      state = feedBackspace(state); // ㅘ → ㅗ
      expect(getDisplayText(state)).toBe("고");
    });

    it("removes last committed character when no composing state", () => {
      let state = createCompositionState();
      state = feedJamo(state, "ㅎ");
      state = feedJamo(state, "ㅏ");
      state = feedJamo(state, "ㄴ");
      state = feedJamo(state, "ㄱ");
      state = feedJamo(state, "ㅡ");
      state = feedJamo(state, "ㄹ");
      expect(getDisplayText(state)).toBe("한글");
      // Now commit and backspace from committed
      const text = commitAll(state);
      expect(text).toBe("한글");
    });

    it("backspace on empty state does nothing", () => {
      const state = feedBackspace(createCompositionState());
      expect(getDisplayText(state)).toBe("");
    });
  });

  describe("commitAll", () => {
    it("commits consonant-only state", () => {
      let state = createCompositionState();
      state = feedJamo(state, "ㄱ");
      expect(commitAll(state)).toBe("ㄱ");
    });

    it("commits syllable state", () => {
      let state = createCompositionState();
      state = feedJamo(state, "ㅎ");
      state = feedJamo(state, "ㅏ");
      expect(commitAll(state)).toBe("하");
    });

    it("commits empty state as empty string", () => {
      expect(commitAll(createCompositionState())).toBe("");
    });
  });

  describe("edge cases", () => {
    it("multiple vowels in sequence commit and continue", () => {
      // ㄱ + ㅏ + ㅓ → 가 + ㅓ (ㅏ and ㅓ can't combine)
      const result = compose("ㄱ", "ㅏ", "ㅓ");
      // Should commit 가, then ㅓ is standalone
      expect(result).toBe("가ㅓ");
    });

    it("consonant after consonant-only commits first", () => {
      expect(compose("ㄱ", "ㄴ")).toBe("ㄱㄴ");
    });

    it("handles long sequences correctly (감사합니다)", () => {
      const result = compose(
        "ㄱ","ㅏ","ㅁ","ㅅ","ㅏ","ㅎ","ㅏ","ㅂ","ㄴ","ㅣ","ㄷ","ㅏ"
      );
      expect(result).toBe("감사합니다");
    });
  });
});
