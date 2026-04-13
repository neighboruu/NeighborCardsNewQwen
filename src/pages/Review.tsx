import { useState } from 'react';
import { useUserStore } from '../store/user-store.js';
import { useSwipeLogic } from '../hooks/useSwipeLogic';
import type { CardRating } from '../lib/fsrs';

export default function Review() {
  const { getDueWords, startSession } = useUserStore();
  const { handleReview } = useSwipeLogic();
  const [currentRating, setCurrentRating] = useState<CardRating | null>(null);

  const dueWords = getDueWords();

  if (dueWords.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            All caught up!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            No words due for review right now
          </p>
          <button
            onClick={() => startSession('mixed')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            Learn New Words
          </button>
        </div>
      </div>
    );
  }

  const word = dueWords[0];

  const handleRate = (rating: CardRating) => {
    setCurrentRating(rating);
    handleReview(word.id, rating);
    setCurrentRating(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Review Time
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {dueWords.length} words due
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <div className="text-center">
              <span className="text-5xl font-bold text-gray-900 dark:text-white">
                {word.kanji}
              </span>
            </div>
            {word.kana && (
              <div className="text-center mt-2">
                <span className="text-lg text-purple-600 dark:text-purple-400">
                  {word.kana}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Meaning
              </h3>
              <p className="text-gray-600 dark:text-gray-400">{word.meaning}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleRate(4)}
              disabled={currentRating !== null}
              className="p-3 bg-red-100 dark:bg-red-900 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800 transition disabled:opacity-50"
            >
              <div className="text-xs font-bold">Again</div>
              <div className="text-xs">&lt;1m</div>
            </button>
            <button
              onClick={() => handleRate(3)}
              disabled={currentRating !== null}
              className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-800 transition disabled:opacity-50"
            >
              <div className="text-xs font-bold">Hard</div>
              <div className="text-xs">2d</div>
            </button>
            <button
              onClick={() => handleRate(2)}
              disabled={currentRating !== null}
              className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition disabled:opacity-50"
            >
              <div className="text-xs font-bold">Good</div>
              <div className="text-xs">4d</div>
            </button>
            <button
              onClick={() => handleRate(1)}
              disabled={currentRating !== null}
              className="p-3 bg-green-100 dark:bg-green-900 rounded-lg text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800 transition disabled:opacity-50"
            >
              <div className="text-xs font-bold">Easy</div>
              <div className="text-xs">7d</div>
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Rate how well you remembered this word
        </p>
      </div>
    </div>
  );
}
