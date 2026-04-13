import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/user-store.js';

export default function Onboarding() {
  const [name, setName] = useState('');
  const [dailyGoal, setDailyGoal] = useState(10);
  const navigate = useNavigate();
  const { setUserInfo } = useUserStore();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setUserInfo(name.trim(), dailyGoal);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            隣カード
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            NeighborCards - Learn Japanese with Anime
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What's your name?
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Your name"
              required
            />
          </div>

          <div>
            <label htmlFor="goal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              How many words do you want to learn daily?
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                id="goal"
                min="1"
                max="50"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 w-16 text-center">
                {dailyGoal}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Recommended: 10-20 words per day
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-lg transition duration-200 transform hover:scale-105"
          >
            Start Learning! 🚀
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Swipe right if you know the word • Swipe left to learn it
          </p>
        </div>
      </div>
    </div>
  );
}
