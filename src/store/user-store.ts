import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CardRating } from '../lib/fsrs.js';
import type { Word, SRSState, UserWordProgress } from '../utils/types/index.js';

interface UserStore {
  // User Info
  userName: string | null;
  dailyGoal: number;
  wordsLearnedToday: number;
  
  // Word Collections
  knownWords: Set<string>; // word IDs
  learningWords: Set<string>; // word IDs
  allWords: Map<string, Word>; // word ID -> Word
  
  // Progress Tracking
  progress: Map<string, UserWordProgress>; // word ID -> progress
  
  // Session State
  currentDeck: Word[];
  currentIndex: number;
  isSessionActive: boolean;
  
  // Actions
  setUserInfo: (name: string, goal: number) => void;
  addWords: (words: Word[]) => void;
  markWordKnown: (wordId: string) => void;
  markWordUnknown: (wordId: string) => void;
  addToLearningQueue: (wordId: string) => void;
  updateSRSProgress: (wordId: string, rating: CardRating) => void;
  startSession: (deckType: 'known' | 'unknown' | 'mixed') => void;
  nextCard: () => void;
  getCurrentCard: () => Word | null;
  getDueWords: () => Word[];
  resetDailyProgress: () => void;
}

const STORAGE_KEY = 'neighbor-cards-user-store';

// Helper to serialize/deserialize Sets and Maps
const customStorage = {
  getItem: (name: string) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    const parsed = JSON.parse(str);
    
    // Reconstruct Sets
    if (parsed.state.knownWords) {
      parsed.state.knownWords = new Set(parsed.state.knownWords);
    }
    if (parsed.state.learningWords) {
      parsed.state.learningWords = new Set(parsed.state.learningWords);
    }
    
    // Reconstruct Maps
    if (parsed.state.allWords) {
      parsed.state.allWords = new Map(Object.entries(parsed.state.allWords));
    }
    if (parsed.state.progress) {
      parsed.state.progress = new Map(Object.entries(parsed.state.progress).map(([k, v]: [string, any]) => {
        // Reconstruct dates
        if (v.lastReviewed) v.lastReviewed = new Date(v.lastReviewed);
        if (v.srsState?.dueDate) v.srsState.dueDate = new Date(v.srsState.dueDate);
        return [k, v];
      }));
    }
    
    return parsed;
  },
  setItem: (name: string, value: any) => {
    const state = value.state;
    
    // Serialize Sets to arrays
    const serialized = {
      ...value,
      state: {
        ...state,
        knownWords: Array.from(state.knownWords),
        learningWords: Array.from(state.learningWords),
        allWords: Object.fromEntries(state.allWords),
        progress: Object.fromEntries(state.progress),
      }
    };
    
    localStorage.setItem(name, JSON.stringify(serialized));
  },
  removeItem: (name: string) => localStorage.removeItem(name),
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      // Initial State
      userName: null,
      dailyGoal: 10,
      wordsLearnedToday: 0,
      knownWords: new Set(),
      learningWords: new Set(),
      allWords: new Map(),
      progress: new Map(),
      currentDeck: [],
      currentIndex: 0,
      isSessionActive: false,
      
      // Actions
      setUserInfo: (name, goal) => set({ userName: name, dailyGoal: goal }),
      
      addWords: (words) => {
        const { allWords, progress } = get();
        words.forEach(word => {
          allWords.set(word.id, word);
          if (!progress.has(word.id)) {
            progress.set(word.id, {
              wordId: word.id,
              status: 'new',
              timesCorrect: 0,
              timesIncorrect: 0,
            });
          }
        });
        set({ allWords, progress });
      },
      
      markWordKnown: (wordId) => {
        const { knownWords, progress } = get();
        knownWords.add(wordId);
        
        const prog = progress.get(wordId);
        if (prog) {
          prog.timesCorrect++;
          prog.status = 'graduated';
          progress.set(wordId, prog);
        }
        
        set({ knownWords, progress });
      },
      
      markWordUnknown: (wordId) => {
        const { knownWords, learningWords, progress } = get();
        knownWords.delete(wordId);
        learningWords.add(wordId);
        
        const prog = progress.get(wordId);
        if (prog) {
          prog.timesIncorrect++;
          prog.status = 'learning';
          progress.set(wordId, prog);
        }
        
        set({ knownWords, learningWords, progress });
      },
      
      addToLearningQueue: (wordId) => {
        const { learningWords } = get();
        learningWords.add(wordId);
        set({ learningWords });
      },
      
      updateSRSProgress: (wordId, rating) => {
        const { progress, allWords, wordsLearnedToday, dailyGoal } = get();
        const prog = progress.get(wordId);
        
        if (!prog || !prog.srsState) {
          // Initialize SRS state for new word
          prog!.srsState = {
            stability: 0.5,
            difficulty: 5.0,
            dueDate: new Date(),
            interval: 0,
            reps: 0,
          };
        }
        
        // Simple FSRS-like update logic (will be replaced with actual FSRS v6)
        const state = prog!.srsState!;
        state.reps++;
        
        if (rating === 4) { // Again
          state.stability = Math.max(0.5, state.stability * 0.5);
          state.difficulty = Math.min(10, state.difficulty + 0.5);
          state.interval = 1;
        } else if (rating === 3) { // Hard
          state.stability *= 1.2;
          state.difficulty = Math.min(10, state.difficulty + 0.2);
          state.interval = Math.max(1, Math.floor(state.interval * 1.2));
        } else if (rating === 2) { // Good
          state.stability *= 1.5;
          state.interval = Math.max(1, Math.floor(state.interval * 2));
          prog!.timesCorrect++;
        } else if (rating === 1) { // Easy
          state.stability *= 2.0;
          state.difficulty = Math.max(1, state.difficulty - 0.2);
          state.interval = Math.max(1, Math.floor(state.interval * 2.5));
          prog!.timesCorrect++;
        }
        
        // Calculate next due date
        const now = new Date();
        state.dueDate = new Date(now.getTime() + state.interval * 24 * 60 * 60 * 1000);
        
        // Update status
        if (state.interval >= 21) {
          prog!.status = 'graduated';
        } else if (state.interval >= 1) {
          prog!.status = 'review';
        } else {
          prog!.status = 'learning';
        }
        
        progress.set(wordId, prog!);
        
        // Update daily progress
        const newWordsLearned = (rating >= 2 && prog!.timesCorrect === 1) 
          ? wordsLearnedToday + 1 
          : wordsLearnedToday;
        
        set({ progress, wordsLearnedToday: Math.min(newWordsLearned, dailyGoal) });
      },
      
      startSession: (deckType) => {
        const { allWords, knownWords, learningWords, progress } = get();
        let deck: Word[] = [];
        
        if (deckType === 'known') {
          deck = Array.from(allWords.values()).filter(w => knownWords.has(w.id));
        } else if (deckType === 'unknown') {
          deck = Array.from(allWords.values()).filter(w => !knownWords.has(w.id));
        } else {
          // Mixed: prioritize due words
          const now = new Date();
          deck = Array.from(allWords.values()).filter(w => {
            const prog = progress.get(w.id);
            if (!prog || !prog.srsState) return true; // New words
            return prog.srsState.dueDate <= now;
          });
        }
        
        // Shuffle deck
        deck = deck.sort(() => Math.random() - 0.5);
        
        set({ 
          currentDeck: deck, 
          currentIndex: 0, 
          isSessionActive: true 
        });
      },
      
      nextCard: () => {
        const { currentIndex, currentDeck } = get();
        if (currentIndex < currentDeck.length - 1) {
          set({ currentIndex: currentIndex + 1 });
        } else {
          set({ isSessionActive: false, currentIndex: 0, currentDeck: [] });
        }
      },
      
      getCurrentCard: () => {
        const { currentDeck, currentIndex } = get();
        return currentDeck[currentIndex] || null;
      },
      
      getDueWords: () => {
        const { allWords, progress } = get();
        const now = new Date();
        
        return Array.from(allWords.values()).filter(word => {
          const prog = progress.get(word.id);
          if (!prog || !prog.srsState) return true; // New words are due
          return prog.srsState.dueDate <= now;
        });
      },
      
      resetDailyProgress: () => {
        set({ wordsLearnedToday: 0 });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => customStorage),
      partialize: (state) => ({
        userName: state.userName,
        dailyGoal: state.dailyGoal,
        wordsLearnedToday: state.wordsLearnedToday,
        knownWords: state.knownWords,
        learningWords: state.learningWords,
        allWords: state.allWords,
        progress: state.progress,
      }),
    }
  )
);
