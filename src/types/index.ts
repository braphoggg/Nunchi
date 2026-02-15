export interface LessonTopic {
  id: string;
  title: string;
  titleKr: string;
  starterMessage: string;
  icon: string;
}

export interface VocabularyItem {
  id: string;
  korean: string;
  romanization: string;
  english: string;
  savedAt: string;
}
