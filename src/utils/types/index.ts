export interface Word {
  id: string;
  kanji: string;
  kana: string;
  meaning: string;
  jlptLevel?: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
  cefrLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  frequency?: number;
  source?: string;
  exampleSentences?: {
    japanese: string;
    english: string;
  }[];
}

export type SRSStatus = 'new' | 'learning' | 'review' | 'graduated' | 'relearning';

export interface SRSState {
  stability: number;
  difficulty: number;
  dueDate: Date;
  interval: number;
  reps: number;
}

export interface UserWordProgress {
  wordId: string;
  status: SRSStatus;
  timesCorrect: number;
  timesIncorrect: number;
  lastReviewed?: Date;
  srsState?: SRSState;
}

export interface SubtitleEntry {
  startTime: number;
  endTime: number;
  text: string;
}
