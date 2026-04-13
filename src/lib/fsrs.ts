import { generator, Rating, type RecordLogItem } from 'fsrs';

export type CardRating = 1 | 2 | 3 | 4; // Easy, Good, Hard, Again (matching FSRS)

export interface FSRSCard {
  id: string;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: 0 | 1 | 2 | 3; // New, Learning, Review, Relearning
}

export interface FSRSReviewResult {
  card: FSRSCard;
  log: RecordLogItem;
  nextReview: Date;
}

// Default FSRS parameters (can be customized per user)
const DEFAULT_PARAMETERS = [
  0.4, 0.9, 2.3, 10.9, 4.93, 0.94, 0.86, 0.01,
  1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29,
  2.61, 0.53, 0.75, 2.69, 0.95, 0.83, 0.51, 0.76,
  0.79, 1.25, 1.13, 0.65, 1.24, 1.22, 1.25, 0.84,
  0.8, 1.35, 1.3, 1.14, 1.4, 1.24, 1.26, 0.8,
  0.8, 1.35, 1.3, 1.14, 1.4, 1.24, 1.26, 0.8,
];

/**
 * Initialize a new FSRS card for a word
 */
export function createFSRSCard(wordId: string): FSRSCard {
  return {
    id: wordId,
    due: new Date(),
    stability: 0,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 0, // New
  };
}

/**
 * Process a review and get the next scheduling information
 */
export function reviewCard(
  card: FSRSCard,
  rating: CardRating,
  now: Date = new Date()
): FSRSReviewResult {
  const fsrs = generator(DEFAULT_PARAMETERS);
  
  // Convert our card to FSRS format
  const fsrsCard = {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
  };

  // Map our rating to FSRS rating (1-4 -> Again(0), Hard(1), Good(2), Easy(3))
  const fsrsRating: Rating = (4 - rating) as Rating; // Invert: 4->0, 3->1, 2->2, 1->3
  
  const result = fsrs.repeat(fsrsCard, now);
  const log = result[fsrsRating];
  
  // Get the next review card from the log
  const nextCard = log.card;
  
  return {
    card: {
      id: card.id,
      due: nextCard.due,
      stability: nextCard.stability,
      difficulty: nextCard.difficulty,
      elapsedDays: nextCard.elapsed_days,
      scheduledDays: nextCard.scheduled_days,
      reps: nextCard.reps,
      lapses: nextCard.lapses,
      state: nextCard.state,
    },
    log,
    nextReview: nextCard.due,
  };
}

/**
 * Get words that are due for review
 */
export function getDueCards(cards: FSRSCard[], now: Date = new Date()): FSRSCard[] {
  return cards.filter(card => card.due <= now);
}

/**
 * Calculate retention rate based on stability
 */
export function calculateRetention(stability: number, days: number = 1): number {
  return Math.exp(-days / stability);
}

/**
 * Optimal review interval for a target retention rate
 */
export function optimalInterval(stability: number, targetRetention: number = 0.9): number {
  return -stability * Math.log(targetRetention);
}
