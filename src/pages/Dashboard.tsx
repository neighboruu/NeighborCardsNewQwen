import { Link } from 'react-router-dom';
import { useUserStore } from '../store/user-store.js';
import { BookOpen, RefreshCw, Upload, Trophy } from 'lucide-react';

export default function Dashboard() {
  const { userName, dailyGoal, wordsLearnedToday, knownWords, learningWords, getDueWords } = useUserStore();
  const dueWords = getDueWords();
  
  const progress = (wordsLearnedToday / dailyGoal) * 100;
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                こんにちは、{userName || ' learner'}さん!
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Let's learn some Japanese today!
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Daily Goal
              </div>
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {wordsLearnedToday}/{dailyGoal}
              </div>
            </div>
          </div>
          
          <div className="mt-4 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {learningWords.size}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Learning
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <Trophy className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {knownWords.size}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Mastered
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <RefreshCw className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dueWords.length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Due for Review
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Upload className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  0
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Subtitles Uploaded
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/learn"
            className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl shadow-lg p-8 text-white hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-bold mb-2">Learn New Words</h2>
            <p className="opacity-90 mb-4">
              Swipe through cards and discover new vocabulary from anime subtitles
            </p>
            <div className="inline-block bg-white/20 px-4 py-2 rounded-lg">
              Start Learning →
            </div>
          </Link>

          <Link
            to="/review"
            className={`rounded-xl shadow-lg p-8 text-white hover:shadow-xl transition-shadow ${
              dueWords.length > 0 
                ? 'bg-gradient-to-br from-green-500 to-teal-600' 
                : 'bg-gradient-to-br from-gray-400 to-gray-600'
            }`}
          >
            <h2 className="text-2xl font-bold mb-2">Review Words</h2>
            <p className="opacity-90 mb-4">
              {dueWords.length > 0 
                ? `You have ${dueWords.length} words due for review` 
                : 'No words due for review right now'}
            </p>
            <div className="inline-block bg-white/20 px-4 py-2 rounded-lg">
              {dueWords.length > 0 ? 'Start Review →' : 'All Caught Up! ✓'}
            </div>
          </Link>

          <Link
            to="/subtitles"
            className="md:col-span-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg p-8 text-white hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-bold mb-2">Upload Anime Subtitles</h2>
            <p className="opacity-90 mb-4">
              Import .srt or .vtt subtitle files from your favorite anime and extract vocabulary
            </p>
            <div className="inline-block bg-white/20 px-4 py-2 rounded-lg">
              Upload Subtitles →
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
