export interface TutorialStep {
  id: string;
  targetSelector: string | null;
  /** Optional second element to spotlight simultaneously */
  secondaryTargetSelector?: string | null;
  title: string;
  titleKr: string;
  moonjoSays: string;
  description: string;
  type: "observe" | "interact";
  interactionHint?: string;
  /** Second interaction hint shown alongside the first with an "— or —" separator */
  secondaryInteractionHint?: string;
  tooltipPosition: "top" | "bottom" | "center";
  spotlightPadding?: number;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    targetSelector: '[data-tutorial="topbar"]',
    title: "Meet Moon-jo",
    titleKr: "서문조를 만나다",
    moonjoSays: "새 입주자... 드디어 왔군요. 이 방에서 한국어를 배울 거예요.",
    description:
      "This is Seo Moon-jo, your Korean tutor and neighbor in Room 203. The colored dot shows his mood — it changes based on how much Korean you use.",
    type: "observe",
    tooltipPosition: "bottom",
    spotlightPadding: 4,
  },
  {
    id: "stats",
    targetSelector: '[data-tutorial="statsbar"]',
    title: "Your Progress",
    titleKr: "성장 기록",
    moonjoSays: "여기서 당신의 발전을 볼 수 있어요.",
    description:
      "Track your daily streak, XP earned, and resident rank. Tap this bar anytime to see detailed stats.",
    type: "observe",
    tooltipPosition: "bottom",
    spotlightPadding: 4,
  },
  {
    id: "topics",
    targetSelector: '[data-tutorial="welcome-topics"]',
    secondaryTargetSelector: '[data-tutorial="chat-input"]',
    title: "Start a Lesson",
    titleKr: "수업 시작하기",
    moonjoSays: "준비됐나요? 주제를 고르거나... 아니면 그냥 말을 걸어도 돼요.",
    description:
      "Pick a guided topic above — each one teaches a different skill. Or skip straight to conversation and type anything in the chat box below.",
    type: "observe",
    tooltipPosition: "bottom",
    spotlightPadding: 8,
  },
  {
    id: "keyboard",
    targetSelector: '[data-tutorial="keyboard-toggle"]',
    title: "Korean Keyboard",
    titleKr: "한국어 키보드",
    moonjoSays: "한국어를 모르면... 이 키보드를 쓰세요.",
    description:
      "Don't have a Korean keyboard? Tap this button to open the built-in Hangul keyboard.",
    type: "observe",
    tooltipPosition: "top",
    spotlightPadding: 8,
  },
  {
    id: "hangul-keys",
    targetSelector: '[data-tutorial="hangul-keyboard"]',
    title: "Hangul Input",
    titleKr: "한글 입력",
    moonjoSays: "자음과 모음을 조합하면 글자가 완성돼요.",
    description:
      "Type Korean by tapping consonants and vowels — they combine into syllables automatically. Use ⇧ for double consonants (ㅃ, ㅉ, ㄸ). Tap the composing preview to finish a character.",
    type: "observe",
    tooltipPosition: "top",
    spotlightPadding: 4,
  },
  {
    id: "messages",
    targetSelector: null,
    title: "Message Actions",
    titleKr: "메시지 기능",
    moonjoSays: "내 메시지 아래에 유용한 버튼들이 있어요.",
    description:
      "Below each of Moon-jo's messages you'll find: 🌐 Translate to English, 📋 Copy text, and 💾 Save vocabulary words. Gold-highlighted words are vocabulary — tap them or the save button to add to your dictionary.",
    type: "observe",
    tooltipPosition: "center",
  },
  {
    id: "vocab-tools",
    targetSelector: '[data-tutorial="vocab-button"]',
    title: "Vocabulary & Study",
    titleKr: "단어장과 학습",
    moonjoSays: "단어를 모으세요. 나중에 복습할 수 있어요.",
    description:
      "Open your saved words here. Once you have 4+ words, two study modes appear: Study All — a quiz on every word with spaced repetition, and Quick Quiz — a fast 10-question test in both directions.",
    type: "observe",
    tooltipPosition: "bottom",
    spotlightPadding: 12,
  },
  {
    id: "topbar-tools",
    targetSelector: '[data-tutorial="topbar-tools"]',
    title: "Tools",
    titleKr: "도구",
    moonjoSays: "여기 다른 도구들도 있어요.",
    description:
      "History: review past lessons. Share: export your conversation as an image. Sound: toggle ambient audio. Help: open this guide anytime.",
    type: "observe",
    tooltipPosition: "bottom",
    spotlightPadding: 8,
  },
  {
    id: "finale",
    targetSelector: null,
    title: "Welcome Home",
    titleKr: "여기가 집이에요",
    moonjoSays: "준비됐나요? 복도 불이 깜빡이고 있어요... 시작하죠.",
    description:
      "Earn XP by writing Korean (5-15 XP), saving words (3 XP), completing study sessions (20 XP), and avoiding translations (8 XP bonus). Rise through 5 ranks from New Resident to Floor Senior. As you chat, the room grows darker and Moon-jo grows... fonder. Good luck.",
    type: "observe",
    tooltipPosition: "center",
  },
];
