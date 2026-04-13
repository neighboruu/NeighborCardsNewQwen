import { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Word } from '../types';
import { addFurigana } from '../utils/furigana';

interface SwipeCardProps {
  word: Word;
  onSwipe: (direction: 'left' | 'right') => void;
  isKnown?: boolean;
}

export default function SwipeCard({ word, onSwipe, isKnown = false }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const likeOpacity = useTransform(x, [50, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [-50, -150], [0, 1]);

  const [showAnswer, setShowAnswer] = useState(false);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) {
      onSwipe('right');
    } else if (info.offset.x < -100) {
      onSwipe('left');
    }
  };

  const handleClick = () => {
    setShowAnswer(!showAnswer);
  };

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute w-full max-w-md cursor-grab active:cursor-grabbing"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div 
        className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 min-h-[400px] flex flex-col ${isKnown ? 'border-4 border-green-500' : ''}`}
        onClick={handleClick}
      >
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {word.source.toUpperCase()}
            {word.jlptLevel && ` • JLPT ${word.jlptLevel}`}
          </div>
          
          <div className="text-6xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            {word.kanji ? (
              <ruby className="furigana">
                {word.kanji}
                <rt className="text-red-500">{word.kana}</rt>
              </ruby>
            ) : (
              word.kana
            )}
          </div>

          <AnimatePresence>
            {showAnswer && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <div className="text-2xl text-gray-700 dark:text-gray-300 mb-4">
                  {word.meaning || 'Meaning not available'}
                </div>
                
                {word.exampleSentences && word.exampleSentences.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div 
                      className="text-lg mb-2"
                      dangerouslySetInnerHTML={{ __html: addFurigana(word.exampleSentences[0].japanese) }}
                    />
                    <div className="text-gray-600 dark:text-gray-400">
                      {word.exampleSentences[0].english}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!showAnswer && (
            <div className="text-gray-400 dark:text-gray-500 mt-8">
              Tap to reveal meaning
            </div>
          )}
        </div>

        <div className="relative h-12">
          <motion.div 
            style={{ opacity: likeOpacity }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-4xl font-bold text-green-500 border-4 border-green-500 px-4 py-2 rounded-lg transform -rotate-12">
              KNOW
            </div>
          </motion.div>
          
          <motion.div 
            style={{ opacity: nopeOpacity }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-4xl font-bold text-red-500 border-4 border-red-500 px-4 py-2 rounded-lg transform rotate-12">
              LEARN
            </div>
          </motion.div>
        </div>
      </div>
      
      {isKnown && (
        <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
          ✓ Learned
        </div>
      )}
    </motion.div>
  );
}
