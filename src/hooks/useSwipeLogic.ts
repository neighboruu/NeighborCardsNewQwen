import { useCallback } from 'react';
import { useUserStore } from '../store/user-store.js';
import { reviewCard, createFSRSCard, type CardRating, type FSRSCard } from '../lib/fsrs.js';
import type { UserWordProgress } from '../utils/types/index.js';

export function useSwipeLogic() {
  const { 
    updateSRSProgress, 
    markWordKnown, 
    markWordUnknown, 
    addToLearningQueue,
    getCurrentCard,
    nextCard,
    progress: userProgress,
    allWords
  } = useUserStore();

  const handleSwipeRight = useCallback((wordId: string) => {
    // User knows the word - mark as known
    markWordKnown(wordId);
    nextCard();
  }, [markWordKnown, nextCard]);

  const handleSwipeLeft = useCallback((wordId: string) => {
    // User doesn't know the word - add to learning queue
    markWordUnknown(wordId);
    addToLearningQueue(wordId);
    nextCard();
  }, [markWordUnknown, addToLearningQueue, nextCard]);

  const handleReview = useCallback((wordId: string, rating: CardRating) => {
    // Process FSRS review
    updateSRSProgress(wordId, rating);
    nextCard();
  }, [updateSRSProgress, nextCard]);

  const getCurrentWordWithProgress = useCallback(() => {
    const word = getCurrentCard();
    if (!word) return null;

    const prog = userProgress.get(word.id);
    let fsrsCard: FSRSCard | undefined;

    if (prog?.srsState) {
      fsrsCard = {
        id: word.id,
        due: prog.srsState.dueDate,
        stability: prog.srsState.stability,
        difficulty: prog.srsState.difficulty,
        elapsedDays: Math.floor(prog.srsState.interval),
        scheduledDays: prog.srsState.interval,
        reps: prog.srsState.reps,
        lapses: 0,
        state: prog.status === 'new' ? 0 : prog.status === 'learning' ? 1 : prog.status === 'review' ? 2 : 3,
      };
    }

    return {
      word,
      progress: prog,
      fsrsCard: fsrsCard || createFSRSCard(word.id),
    };
  }, [getCurrentCard, userProgress]);

  return {
    handleSwipeRight,
    handleSwipeLeft,
    handleReview,
    getCurrentWordWithProgress,
  };
}
