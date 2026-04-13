import { useState, useRef } from 'react';
import { useUserStore } from '../store/user-store.js';
import { Upload as UploadIcon } from 'lucide-react';

export default function SubtitleUpload() {
  const { addWords } = useUserStore();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseSRT = (content: string) => {
    // Simple SRT parser - extract text lines
    const lines = content.split('\n');
    const words: Array<{ id: string; kanji: string; kana: string; meaning: string }> = [];
    
    // This is a simplified parser - in production you'd use a proper Japanese morphological analyzer
    for (const line of lines) {
      // Skip timestamp lines and empty lines
      if (/^\d+$/.test(line.trim()) || line.includes('-->') || line.trim() === '') {
        continue;
      }
      
      // Extract potential Japanese words (simplified)
      const japaneseText = line.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g);
      if (japaneseText) {
        // In production, you would use a library like kuromoji.js to tokenize and get meanings
        // For now, we create placeholder entries
        japaneseText.forEach((text, idx) => {
          words.push({
            id: `sub_${Date.now()}_${idx}`,
            kanji: text,
            kana: '',
            meaning: 'Meaning to be fetched from dictionary',
          });
        });
      }
    }
    
    return words;
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const words = parseSRT(content);
      
      if (words.length > 0) {
        addWords(words);
        alert(`Successfully extracted ${words.length} words from subtitles!`);
      } else {
        alert('No Japanese text found in the subtitle file.');
      }
    };
    reader.readAsText(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.srt') || file.name.endsWith('.vtt'))) {
      handleFile(file);
    } else {
      alert('Please upload an .srt or .vtt file');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Upload Anime Subtitles
        </h1>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : 'border-gray-300 dark:border-gray-700 hover:border-purple-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".srt,.vtt"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="hidden"
          />
          
          <UploadIcon className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Drop your subtitle file here
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            or click to browse (.srt or .vtt)
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            We'll extract Japanese vocabulary from your anime subtitles
          </p>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            How it works
          </h2>
          <ol className="space-y-3 text-gray-600 dark:text-gray-400">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
              <span>Upload an .srt or .vtt subtitle file from your favorite anime</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
              <span>We extract all Japanese text and identify vocabulary words</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
              <span>Words are added to your learning queue with furigana and meanings</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-sm font-bold mr-3">4</span>
              <span>Start swiping to learn words from your favorite shows!</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
