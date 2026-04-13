import { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useUserStore } from '../store/user-store.js';
import { useSwipeLogic } from '../hooks/useSwipeLogic.js';
import { X, Check } from 'lucide-react';
import { addFurigana } from '../utils/furigana.js';

export default function SwipeCards() {
  const { startSession, currentDeck, isSessionActive } = useUserStore();
  const { handleSwipeRight, handleSwipeLeft } = useSwipeLogic();
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isSessionActive || currentDeck.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            No cards to review
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Start a learning session or upload subtitles to get started
          </p>
          <button
            onClick={() => startSession('mixed')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            Start Learning Session
          </button>
        </div>
      </div>
    );
  }

  const card = currentDeck[currentIndex];
  if (!card) return null;

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) {
      handleSwipeRight(card.id);
      setCurrentIndex((prev) => prev + 1);
    } else if (info.offset.x < -100) {
      handleSwipeLeft(card.id);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Swipe to Learn
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Card {currentIndex + 1} of {currentDeck.length}
          </p>
        </div>

        <motion.div
          style={{ x, rotate, opacity }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 cursor-grab active:cursor-grabbing"
        >
          <div className="mb-6">
            <div className="text-center">
              {card.kanji ? (
                <ruby className="text-5xl font-bold text-gray-900 dark:text-white">
                  {card.kanji}
                  <rt className="text-lg text-purple-600 dark:text-purple-400">{card.kana}</rt>
                </ruby>
              ) : (
                <span className="text-5xl font-bold text-gray-900 dark:text-white">{card.kana}</span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Meaning
              </h3>
              <p className="text-gray-600 dark:text-gray-400">{card.meaning}</p>
            </div>

            {card.jlptLevel && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">JLPT:</span>
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded text-sm font-medium">
                  {card.jlptLevel}
                </span>
              </div>
            )}

            {card.cefrLevel && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">CEFR:</span>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded text-sm font-medium">
                  {card.cefrLevel}
                </span>
              </div>
            )}
          </div>

          <div className="absolute top-4 left-4 opacity-0 transition-opacity duration-200" 
               style={{ opacity: x.get() < -100 ? 1 : 0 }}>
            <div className="flex items-center space-x-2 text-red-500">
              <X className="w-8 h-8" />
              <span className="text-xl font-bold">LEARN</span>
            </div>
          </div>
          <div className="absolute top-4 right-4 opacity-0 transition-opacity duration-200"
               style={{ opacity: x.get() > 100 ? 1 : 0 }}>
            <div className="flex items-center space-x-2 text-green-500">
              <span className="text-xl font-bold">KNOW</span>
              <Check className="w-8 h-8" />
            </div>
          </div>
        </motion.div>

        <div className="mt-6 flex justify-center space-x-4">
          <button
            onClick={() => {
              handleSwipeLeft(card.id);
              setCurrentIndex((prev) => prev + 1);
            }}
            className="p-4 bg-red-100 dark:bg-red-900 rounded-full text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800 transition"
          >
            <X className="w-8 h-8" />
          </button>
          <button
            onClick={() => {
              handleSwipeRight(card.id);
              setCurrentIndex((prev) => prev + 1);
            }}
            className="p-4 bg-green-100 dark:bg-green-900 rounded-full text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800 transition"
          >
            <Check className="w-8 h-8" />
          </button>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Swipe right if you know it - Swipe left to learn it
        </p>
      </div>
    </div>
  );
}
