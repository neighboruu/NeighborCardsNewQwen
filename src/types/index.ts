export interface Word {
  id: string;
  kanji: string;
  kana: string;
  romaji?: string;
  meaning: string;
  jlptLevel?: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
  cefrLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  frequency?: number;
  source: 'hiragana' | 'katakana' | 'kanji' | 'subtitle' | 'custom';
  exampleSentences?: ExampleSentence[];
}

export interface ExampleSentence {
  japanese: string;
  furigana: string;
  english: string;
  source?: string;
}

export interface FSRSState {
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  lastReview: Date;
  reviews: number;
}

export interface UserWordProgress {
  wordId: string;
  userId: string;
  status: 'new' | 'learning' | 'review' | 'graduated';
  fsrsState: FSRSState;
  known: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  dailyGoal: number;
  wordsLearnedToday: number;
  createdAt: Date;
}

export interface SubtitleLine {
  startTime: number;
  endTime: number;
  japaneseText: string;
  englishText?: string;
  words: ParsedWord[];
}

export interface ParsedWord {
  text: string;
  reading?: string;
  isKnown: boolean;
  position: number;
}
