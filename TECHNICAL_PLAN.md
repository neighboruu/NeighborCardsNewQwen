# NeighborCards: Japanese Learning Web Application Technical Plan

## Overview
A modular web application for learning Japanese through anime subtitles with FSRS v6 spaced repetition, swipe-based card interface, and automatic furigana injection.

---

## Architecture Overview

### Modular Design Pattern
```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Swipe     │  │   Dashboard │  │  Subtitle Player    │  │
│  │   Cards     │  │   & Stats   │  │  with Furigana      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Card      │  │   User      │  │  Progress           │  │
│  │   Manager   │  │   Session   │  │  Tracker            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    FSRS     │  │  Vocabulary │  │   Subtitle          │  │
│  │    Engine   │  │   Service   │  │   Processor         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  PostgreSQL │  │   Redis     │  │   File Storage      │  │
│  │  + pgvector │  │   Cache     │  │   (SRT/VTT)         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Modules

### 1. **Subtitle Processing Module** (`subtitle-processor`)
**Purpose**: Extract, parse, and process Japanese subtitles from anime files

#### Features:
- Support for SRT, VTT, ASS/SSA formats
- Automatic sentence segmentation using Japanese NLP
- Word tokenization with MeCab or SudachiPy
- Timestamp extraction for contextual learning
- Duplicate sentence detection and filtering

#### Implementation:
```typescript
// src/modules/subtitle-processor/SubtitleProcessor.ts
interface SubtitleEntry {
  id: string;
  startTime: number;
  endTime: number;
  japaneseText: string;
  romanization?: string;
  englishTranslation?: string;
  sourceFile: string;
  animeTitle?: string;
  episodeNumber?: number;
}

interface ProcessedSentence extends SubtitleEntry {
  tokens: Token[];
  unknownWords: WordInfo[];
  knownWords: WordInfo[];
  jlptLevels: number[];
  cefrLevels: string[];
}

interface Token {
  surface: string;
  reading: string; // furigana
  pos: string;
  lemma: string;
  jlptLevel: number | null;
  cefrLevel: string | null;
  isKnown: boolean;
  frequency: number;
}
```

#### Dependencies:
- `sudachipy` or `mecab-python3` for tokenization
- `fugashi` for modern Japanese NLP
- Custom dictionary integration from JSON sources

---

### 2. **Vocabulary Knowledge Base Module** (`vocab-kb`)
**Purpose**: Manage vocabulary data from hiragana.json, kanji.json, katakana.json

#### Database Schema (PostgreSQL):
```sql
-- Convert JSON files to normalized SQL tables
CREATE TABLE vocabulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word TEXT NOT NULL,
    reading TEXT, -- furigana/romaji
    english_translation TEXT,
    pos TEXT, -- part of speech
    jlpt_level INTEGER CHECK (jlpt_level BETWEEN 1 AND 5),
    cefr_level TEXT CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Unknown')),
    word_frequency INTEGER,
    useful_for_flashcard BOOLEAN DEFAULT true,
    example_sentence_native TEXT,
    example_sentence_english TEXT,
    source_type TEXT CHECK (source_type IN ('hiragana', 'kanji', 'katakana')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(word, source_type)
);

CREATE INDEX idx_vocabulary_jlpt ON vocabulary(jlpt_level);
CREATE INDEX idx_vocabulary_cefr ON vocabulary(cefr_level);
CREATE INDEX idx_vocabulary_frequency ON vocabulary(word_frequency);
CREATE INDEX idx_vocabulary_useful ON vocabulary(useful_for_flashcard);
CREATE INDEX idx_vocabulary_word_trgm ON vocabulary USING gin(word gin_trgm_ops);

-- User-specific word knowledge tracking
CREATE TABLE user_word_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vocabulary_id UUID NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
    
    -- FSRS v6 state
    fsrs_state JSONB NOT NULL DEFAULT '{}',
    
    -- Learning status
    status TEXT CHECK (status IN ('new', 'learning', 'review', 'relearning', 'graduated')) DEFAULT 'new',
    ease_factor DECIMAL(5,2) DEFAULT 2.5,
    interval_days INTEGER DEFAULT 0,
    repetitions INTEGER DEFAULT 0,
    
    -- Statistics
    times_correct INTEGER DEFAULT 0,
    times_incorrect INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ,
    
    -- Metadata
    first_learned_at TIMESTAMPTZ,
    total_study_time_seconds INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, vocabulary_id)
);

CREATE INDEX idx_user_word_next_review ON user_word_knowledge(next_review_at) WHERE status != 'new';
CREATE INDEX idx_user_word_status ON user_word_knowledge(user_id, status);
CREATE INDEX idx_user_word_due ON user_word_knowledge(user_id, next_review_at) 
    WHERE next_review_at <= NOW() AND status IN ('review', 'relearning');

-- User profiles
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    daily_goal INTEGER DEFAULT 10, -- words per day
    target_jlpt_level INTEGER,
    target_cefr_level TEXT,
    preferred_source_types TEXT[] DEFAULT ARRAY['hiragana', 'kanji', 'katakana'],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study sessions
CREATE TABLE study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type TEXT CHECK (session_type IN ('new_words', 'review', 'subtitle_practice', 'swipe_sort')),
    cards_presented INTEGER DEFAULT 0,
    cards_correct INTEGER DEFAULT 0,
    cards_incorrect INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    metadata JSONB -- stores additional session data
);

CREATE INDEX idx_study_sessions_user ON study_sessions(user_id, started_at DESC);
```

#### Data Import Script:
```python
# scripts/import_vocab_data.py
import json
import asyncpg
from typing import List, Dict, Any

async def import_json_to_db(json_file: str, source_type: str, db_pool: asyncpg.Pool):
    with open(json_file, 'r', encoding='utf-8') as f:
        data: List[Dict[str, Any]] = json.load(f)
    
    async with db_pool.acquire() as conn:
        for entry in data:
            await conn.execute("""
                INSERT INTO vocabulary (
                    word, reading, english_translation, pos, jlpt_level,
                    cefr_level, word_frequency, useful_for_flashcard,
                    example_sentence_native, example_sentence_english, source_type
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (word, source_type) DO UPDATE SET
                    reading = EXCLUDED.reading,
                    english_translation = EXCLUDED.english_translation,
                    pos = EXCLUDED.pos,
                    jlpt_level = EXCLUDED.jlpt_level,
                    cefr_level = EXCLUDED.cefr_level,
                    word_frequency = EXCLUDED.word_frequency,
                    useful_for_flashcard = EXCLUDED.useful_for_flashcard,
                    example_sentence_native = EXCLUDED.example_sentence_native,
                    example_sentence_english = EXCLUDED.example_sentence_english,
                    updated_at = NOW()
            """,
                entry['word'],
                entry.get('romanization'),
                entry.get('english_translation'),
                entry.get('pos'),
                entry.get('jlpt_level'),
                entry.get('cefr_level', 'Unknown'),
                entry.get('word_frequency', 999999),
                entry.get('useful_for_flashcard', False),
                entry.get('example_sentence_native'),
                entry.get('example_sentence_english'),
                source_type
            )
```

---

### 3. **FSRS v6 Engine Module** (`fsrs-engine`)
**Purpose**: Implement Free Spaced Repetition Scheduler v6 algorithm

#### FSRS v6 Specification (April 2026 Best Practices):
```typescript
// src/modules/fsrs-engine/FSRSv6.ts

interface FSRSState {
  // Stability: how long a memory can be retained before forgetting
  stability: number;
  
  // Difficulty: how difficult the item is (1.0 - 10.0)
  difficulty: number;
  
  // Last review timestamp
  lastReview: Date;
  
  // Number of times reviewed
  reviews: number;
  
  // Current interval in days
  interval: number;
  
  // Predicted retrievability (0.0 - 1.0)
  retrievability: number;
  
  // Optional: FSRS v6 advanced parameters
  lapseCount: number;
  totalStudyTime: number;
}

interface FSRSParameters {
  // Request retention rate (default 0.9 for 90%)
  requestRetention: number;
  
  // Maximum interval in days (default 365 * 10)
  maximumInterval: number;
  
  // Number of learning steps (default [1, 10] minutes)
  learningSteps: number[];
  
  // Number of relearning steps (default [10] minutes)
  relearningSteps: number[];
  
  // Graduating interval (default 1 day)
  graduatingInterval: number;
  
  // Easy bonus multiplier (default 1.3)
  easyBonus: number;
  
  // Interval modifier (default 1.0)
  intervalModifier: number;
  
  // New card spread (cards per day)
  newCardsPerDay: number;
  
  // Review card limit per day
  reviewsPerDay: number;
  
  // FSRS v6 specific: weight parameters (optimized per user)
  weights?: number[]; // 17-19 parameters for v6
}

interface Rating {
  type: 'again' | 'hard' | 'good' | 'easy';
  value: 1 | 2 | 3 | 4;
}

interface SchedulingResult {
  newState: FSRSState;
  nextReview: Date;
  interval: number;
  predictedRetrievability: number;
}

class FSRSv6Engine {
  private defaultParams: FSRSParameters = {
    requestRetention: 0.9,
    maximumInterval: 3650,
    learningSteps: [1, 10], // minutes
    relearningSteps: [10], // minutes
    graduatingInterval: 1, // day
    easyBonus: 1.3,
    intervalModifier: 1.0,
    newCardsPerDay: 20,
    reviewsPerDay: 200,
  };

  /**
   * Initialize or update a card's FSRS state
   */
  scheduleCard(
    currentState: FSRSState | null,
    rating: Rating,
    params: FSRSParameters = this.defaultParams,
    now: Date = new Date()
  ): SchedulingResult {
    // FSRS v6 implementation based on official specification
    // Reference: https://github.com/open-spaced-repetition/fsrs4anki
    
    if (!currentState) {
      // New card - apply learning steps
      return this.scheduleNewCard(rating, params, now);
    }

    // Calculate retrievability using exponential forgetting curve
    const elapsedDays = this.daysBetween(currentState.lastReview, now);
    const retrievability = this.forgettingCurve(elapsedDays, currentState.stability);

    // Update difficulty based on rating
    let newDifficulty = this.updateDifficulty(currentState.difficulty, rating);
    
    // Update stability based on rating and retrievability
    let newStability = this.updateStability(
      currentState.stability,
      newDifficulty,
      retrievability,
      rating,
      params
    );

    // Calculate new interval
    let newInterval = this.calculateInterval(
      newStability,
      params.requestRetention,
      params.maximumInterval
    );

    // Handle special cases (lapses, graduation, etc.)
    if (rating.type === 'again') {
      // Card forgotten - reset to learning
      newInterval = params.relearningSteps[0] / 1440; // convert minutes to days
      currentState.lapseCount = (currentState.lapseCount || 0) + 1;
    } else if (currentState.interval >= params.graduatingInterval && rating.type === 'easy') {
      // Graduate card with bonus
      newInterval *= params.easyBonus;
    }

    return {
      newState: {
        stability: newStability,
        difficulty: newDifficulty,
        lastReview: now,
        reviews: currentState.reviews + 1,
        interval: newInterval,
        retrievability: this.forgettingCurve(newInterval, newStability),
        lapseCount: currentState.lapseCount || 0,
        totalStudyTime: (currentState.totalStudyTime || 0) + this.estimateStudyTime(),
      },
      nextReview: this.addDays(now, newInterval),
      interval: newInterval,
      predictedRetrievability: this.forgettingCurve(newInterval, newStability),
    };
  }

  private forgettingCurve(days: number, stability: number): number {
    // FSRS uses: R(t) = (1 + stability/t)^(-decay)
    // Simplified exponential: R(t) = e^(-ln(9)*t/stability)
    return Math.exp(-Math.log(9) * (days / stability));
  }

  private updateDifficulty(difficulty: number, rating: Rating): number {
    const delta = {
      'again': 0.5,
      'hard': 0.15,
      'good': -0.15,
      'easy': -0.5,
    }[rating.type];
    
    return Math.max(1.0, Math.min(10.0, difficulty + delta));
  }

  private updateStability(
    stability: number,
    difficulty: number,
    retrievability: number,
    rating: Rating,
    params: FSRSParameters
  ): number {
    // FSRS v6 stability update formula
    // Incorporates difficulty, retrievability, and rating weight
    
    const ratingMultiplier = {
      'again': 0.5,
      'hard': 0.8,
      'good': 1.0,
      'easy': 1.5,
    }[rating.type];

    const difficultyFactor = 1 + (difficulty - 5) * 0.1;
    const retrievabilityFactor = Math.pow(retrievability, -0.5);

    return stability * ratingMultiplier * difficultyFactor * retrievabilityFactor;
  }

  private calculateInterval(stability: number, retention: number, maxInterval: number): number {
    // Inverse forgetting curve: t = stability * ((1/retention)^(1/decay) - 1)
    const decay = Math.log(9);
    const interval = stability * (Math.pow(1 / retention, 1 / decay) - 1);
    return Math.min(interval, maxInterval);
  }

  private scheduleNewCard(rating: Rating, params: FSRSParameters, now: Date): SchedulingResult {
    const stepIndex = {
      'again': 0,
      'hard': 0,
      'good': 0,
      'easy': params.learningSteps.length,
    }[rating.type];

    const stepMinutes = rating.type === 'easy' 
      ? params.graduatingInterval * 1440 
      : params.learningSteps[Math.min(stepIndex, params.learningSteps.length - 1)];

    const intervalDays = stepMinutes / 1440;

    return {
      newState: {
        stability: intervalDays * 2, // Initial stability estimate
        difficulty: rating.type === 'easy' ? 3.0 : 5.0,
        lastReview: now,
        reviews: 1,
        interval: intervalDays,
        retrievability: 0.9,
        lapseCount: 0,
        totalStudyTime: this.estimateStudyTime(),
      },
      nextReview: this.addMinutes(now, stepMinutes),
      interval: intervalDays,
      predictedRetrievability: 0.9,
    };
  }

  private daysBetween(d1: Date, d2: Date): number {
    return (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  private estimateStudyTime(): number {
    // Average time to review one card (seconds)
    return 15;
  }

  /**
   * Optimize FSRS parameters based on user performance history
   * Uses gradient descent or Bayesian optimization
   */
  async optimizeParameters(
    userId: string,
    reviewHistory: ReviewRecord[]
  ): Promise<FSRSParameters> {
    // Implementation of parameter optimization
    // This would use historical review data to find optimal weights
    // for this specific user's memory characteristics
    
    // For April 2026: Use pre-trained models + online learning
    const baseWeights = await this.loadBaseModel();
    const userAdjustments = this.calculateUserAdjustments(reviewHistory);
    
    return {
      ...this.defaultParams,
      weights: this.combineWeights(baseWeights, userAdjustments),
    };
  }
}
```

#### Database Integration:
```typescript
// src/modules/fsrs-engine/FSRSRepository.ts
class FSRSRepository {
  async getDueCards(userId: string, limit: number = 20): Promise<CardWithState[]> {
    const query = `
      SELECT 
        v.*,
        uwk.fsrs_state,
        uwk.status,
        uwk.next_review_at,
        uwk.ease_factor,
        uwk.interval_days,
        uwk.repetitions
      FROM user_word_knowledge uwk
      JOIN vocabulary v ON uwk.vocabulary_id = v.id
      WHERE uwk.user_id = $1
        AND uwk.next_review_at <= NOW()
        AND uwk.status IN ('review', 'relearning')
      ORDER BY uwk.next_review_at ASC, uwk.interval_days ASC
      LIMIT $2
    `;
    
    return await db.query(query, [userId, limit]);
  }

  async getNewCards(
    userId: string, 
    dailyLimit: number,
    filters: {
      jlptLevels?: number[];
      cefrLevels?: string[];
      sourceTypes?: string[];
    } = {}
  ): Promise<CardWithState[]> {
    const conditions = ['uwk.user_id = $1', 'uwk.status = \'new\''];
    const params: any[] = [userId];
    let paramIndex = 2;

    if (filters.jlptLevels?.length) {
      conditions.push(`v.jlpt_level = ANY($${paramIndex})`);
      params.push(filters.jlptLevels);
      paramIndex++;
    }

    if (filters.cefrLevels?.length) {
      conditions.push(`v.cefr_level = ANY($${paramIndex})`);
      params.push(filters.cefrLevels);
      paramIndex++;
    }

    if (filters.sourceTypes?.length) {
      conditions.push(`v.source_type = ANY($${paramIndex})`);
      params.push(filters.sourceTypes);
      paramIndex++;
    }

    const query = `
      SELECT 
        v.*,
        'new' as status,
        '{}'::jsonb as fsrs_state
      FROM vocabulary v
      LEFT JOIN user_word_knowledge uwk ON v.id = uwk.vocabulary_id AND uwk.user_id = $1
      WHERE uwk.vocabulary_id IS NULL
        AND v.useful_for_flashcard = true
        ${conditions.map(c => `AND ${c}`).join(' ')}
      ORDER BY v.word_frequency ASC
      LIMIT $${paramIndex}
    `;

    params.push(dailyLimit);
    return await db.query(query, params);
  }

  async updateCardState(
    userId: string,
    vocabularyId: string,
    newState: FSRSState,
    nextReview: Date,
    status: string
  ): Promise<void> {
    await db.execute(`
      INSERT INTO user_word_knowledge (
        user_id, vocabulary_id, fsrs_state, next_review_at, status,
        ease_factor, interval_days, repetitions, last_reviewed_at, first_learned_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), 
        COALESCE((SELECT first_learned_at FROM user_word_knowledge 
                  WHERE user_id = $1 AND vocabulary_id = $2), NOW()))
      ON CONFLICT (user_id, vocabulary_id) DO UPDATE SET
        fsrs_state = EXCLUDED.fsrs_state,
        next_review_at = EXCLUDED.next_review_at,
        status = EXCLUDED.status,
        ease_factor = EXCLUDED.ease_factor,
        interval_days = EXCLUDED.interval_days,
        repetitions = EXCLUDED.repetitions,
        last_reviewed_at = NOW(),
        updated_at = NOW()
    `, [
      userId,
      vocabularyId,
      JSON.stringify(newState),
      nextReview,
      status,
      newState.difficulty / 2.5, // Convert difficulty to ease factor
      newState.interval,
      newState.reviews,
    ]);
  }
}
```

---

### 4. **Card Swipe Interface Module** (`swipe-cards`)
**Purpose**: Tinder-like swipe interface for learning and sorting words

#### User Flow:
```
┌─────────────────────────────────────────────────────────────┐
│                   Onboarding                                │
│  1. Ask for username                                        │
│  2. Set daily word goal (default: 10)                       │
│  3. Choose focus:                                           │
│     - Subtitle-derived words                                │
│     - JLPT levels (N5-N1)                                   │
│     - CEFR levels (A1-C2)                                   │
│     - High-frequency words                                  │
│     - Mixed mode                                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 Card Selection Mode                         │
│  Option A: Learn New Words                                  │
│    - Show cards from selected source                        │
│    - Swipe Right (Know) → Add to "Known" OR start SRS       │
│    - Swipe Left (Don't Know) → Add to "Learning" queue      │
│                                                             │
│  Option B: Review Known Words                               │
│    - Show cards marked as "Known"                           │
│    - Swipe Right → Confirm knowledge, add to SRS review     │
│    - Swipe Left → Move back to "Learning"                   │
│                                                             │
│  Option C: Sort Existing Words                              │
│    - Batch process words from subtitles                     │
│    - Quick sort into Known/Learning buckets                 │
│    - No SRS activation until explicitly chosen              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Card Display                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │              漢 字 (with furigana above)              │  │
│  │               ka n ji                                 │  │
│  │                                                       │  │
│  │          Example Sentence:                            │  │
│  │          彼 は 漢 字 を 勉 強 しています。             │  │
│  │          か れ は か ん じ を べん きょう...            │  │
│  │          "He is studying kanji."                      │  │
│  │                                                       │  │
│  │          JLPT: N3 | CEFR: B1 | Freq: #1,234          │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│              ← Don't Know    │    Know →                   │
└─────────────────────────────────────────────────────────────┘
```

#### Frontend Implementation (React + Framer Motion):
```typescript
// src/modules/swipe-cards/SwipeCard.tsx
import { motion, useMotionValue, useTransform } from 'framer-motion';

interface CardData {
  id: string;
  word: string;
  reading: string;
  translation: string;
  exampleSentence: string;
  exampleTranslation: string;
  jlptLevel: number | null;
  cefrLevel: string;
  frequency: number;
  pos: string;
}

interface SwipeCardProps {
  card: CardData;
  onSwipe: (direction: 'left' | 'right') => void;
  mode: 'learn' | 'review' | 'sort';
}

const SwipeCard: React.FC<SwipeCardProps> = ({ card, onSwipe, mode }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacityRight = useTransform(x, [0, 150], [0, 1]);
  const opacityLeft = useTransform(x, [0, -150], [0, 1]);

  const handleDragEnd = (_event: any, info: any) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      onSwipe('right');
    } else if (info.offset.x < -threshold) {
      onSwipe('left');
    }
  };

  return (
    <motion.div
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute w-full max-w-md bg-white rounded-2xl shadow-xl p-6 cursor-grab active:cursor-grabbing"
    >
      {/* Swipe indicators */}
      <motion.div 
        style={{ opacity: opacityRight }}
        className="absolute top-4 right-4 text-green-500 font-bold text-2xl border-4 border-green-500 px-4 py-2 rounded-lg transform rotate-12"
      >
        KNOW
      </motion.div>
      
      <motion.div 
        style={{ opacity: opacityLeft }}
        className="absolute top-4 left-4 text-red-500 font-bold text-2xl border-4 border-red-500 px-4 py-2 rounded-lg transform -rotate-12"
      >
        LEARN
      </motion.div>

      {/* Word display with furigana */}
      <div className="text-center mb-6">
        <FuriganaText 
          text={card.word} 
          reading={card.reading}
          className="text-5xl font-bold text-gray-800 mb-2"
        />
        <p className="text-xl text-gray-600">{card.translation}</p>
        <p className="text-sm text-gray-400 italic">({card.pos})</p>
      </div>

      {/* Example sentence */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <FuriganaText 
          text={card.exampleSentence}
          className="text-lg text-gray-700 mb-2"
        />
        <p className="text-gray-500">{card.exampleTranslation}</p>
      </div>

      {/* Metadata badges */}
      <div className="flex justify-center gap-2 flex-wrap">
        {card.jlptLevel && (
          <Badge color="blue">JLPT N{card.jlptLevel}</Badge>
        )}
        <Badge color="purple">CEFR {card.cefrLevel}</Badge>
        <Badge color="gray">Freq #{card.frequency.toLocaleString()}</Badge>
      </div>

      {/* Mode-specific instructions */}
      <div className="mt-4 text-center text-sm text-gray-500">
        {mode === 'learn' && 'Swipe right if you know this word, left to learn it'}
        {mode === 'review' && 'Confirm your knowledge or mark for review'}
        {mode === 'sort' && 'Sort words into Known or Learning lists'}
      </div>
    </motion.div>
  );
};
```

#### Furigana Component:
```typescript
// src/components/FuriganaText.tsx
interface FuriganaTextProps {
  text: string;
  reading?: string;
  className?: string;
}

const FuriganaText: React.FC<FuriganaTextProps> = ({ text, reading, className }) => {
  // Parse text and inject furigana ruby tags
  // This would integrate with a furigana injection service
  
  const parsedSegments = parseKanjiWithReading(text, reading);
  
  return (
    <ruby className={className}>
      {parsedSegments.map((segment, index) => (
        segment.isKanji ? (
          <ruby key={index}>
            {segment.kanji}
            <rt className="text-xs text-gray-500">{segment.reading}</rt>
          </ruby>
        ) : (
          segment.text
        )
      ))}
    </ruby>
  );
};

// Server-side furigana injection service
// src/services/furigana/FuriganaService.ts
class FuriganaService {
  async injectFurigana(sentence: string): Promise<string> {
    // Use external API or local model
    // Options:
    // 1. Call external API (e.g., Moji, Jisho)
    // 2. Use local Python service with fugashi/mecab
    // 3. Pre-compute and cache in database
    
    const response = await fetch('/api/furigana/inject', {
      method: 'POST',
      body: JSON.stringify({ text: sentence }),
    });
    
    const result = await response.json();
    return result.furiganaHtml;
  }
}
```

---

### 5. **User Session & Progress Module** (`user-session`)
**Purpose**: Manage user onboarding, daily goals, and progress tracking

#### Onboarding Flow:
```typescript
// src/modules/user-session/OnboardingService.ts
interface OnboardingData {
  username: string;
  dailyGoal: number;
  focusMode: 'subtitles' | 'jlpt' | 'cefr' | 'frequency' | 'mixed';
  jlptLevels?: number[];
  cefrLevels?: string[];
  minFrequency?: number;
}

class OnboardingService {
  async completeOnboarding(userId: string, data: OnboardingData): Promise<User> {
    // Create/update user profile
    const user = await db.users.update(userId, {
      username: data.username,
      daily_goal: data.dailyGoal,
      // Store preferences for card selection
    });

    // Initialize word queues based on preferences
    await this.initializeWordQueues(userId, data);

    return user;
  }

  private async initializeWordQueues(userId: string, data: OnboardingData): Promise<void> {
    // Pre-select initial batch of words based on user preferences
    const newCards = await vocabKB.getNewCards(userId, data.dailyGoal * 3, {
      jlptLevels: data.focusMode === 'jlpt' ? data.jlptLevels : undefined,
      cefrLevels: data.focusMode === 'cefr' ? data.cefrLevels : undefined,
      // Add more filters based on mode
    });

    // Mark these cards as available for the user
    for (const card of newCards) {
      await db.user_word_knowledge.upsert({
        user_id: userId,
        vocabulary_id: card.id,
        status: 'new',
      });
    }
  }
}
```

#### Daily Progress Tracking:
```typescript
// src/modules/user-session/ProgressTracker.ts
interface DailyProgress {
  date: string;
  newWordsLearned: number;
  wordsReviewed: number;
  correctReviews: number;
  incorrectReviews: number;
  totalTimeSeconds: number;
  streak: number;
}

class ProgressTracker {
  async getTodayProgress(userId: string): Promise<DailyProgress> {
    const today = new Date().toISOString().split('T')[0];
    
    const stats = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE session_type = 'new_words') as new_words,
        COUNT(*) FILTER (WHERE session_type = 'review') as reviews,
        SUM(cards_correct) as correct,
        SUM(cards_incorrect) as incorrect,
        SUM(duration_seconds) as total_time
      FROM study_sessions
      WHERE user_id = $1 
        AND DATE(started_at) = $2
    `, [userId, today]);

    const streak = await this.calculateStreak(userId);

    return {
      date: today,
      newWordsLearned: stats[0].new_words || 0,
      wordsReviewed: stats[0].reviews || 0,
      correctReviews: stats[0].correct || 0,
      incorrectReviews: stats[0].incorrect || 0,
      totalTimeSeconds: stats[0].total_time || 0,
      streak,
    };
  }

  private async calculateStreak(userId: string): Promise<number> {
    // Count consecutive days with at least one study session
    const query = `
      WITH daily_sessions AS (
        SELECT DATE(started_at) as study_date
        FROM study_sessions
        WHERE user_id = $1
        GROUP BY DATE(started_at)
        ORDER BY study_date DESC
      )
      SELECT COUNT(*) as streak
      FROM (
        SELECT study_date,
               LAG(study_date) OVER (ORDER BY study_date DESC) as prev_date
        FROM daily_sessions
      ) dates
      WHERE prev_date IS NULL 
         OR study_date = prev_date + INTERVAL '1 day'
    `;
    
    const result = await db.query(query, [userId]);
    return result[0].streak || 0;
  }
}
```

---

## Technology Stack (April 2026 Best Practices)

### Backend
- **Runtime**: Node.js 22+ LTS or Bun 2.0+
- **Framework**: Hono (lightweight, edge-compatible) or Fastify
- **Language**: TypeScript 5.5+ with strict mode
- **Database**: PostgreSQL 16+ with pgvector extension
- **Cache**: Redis 7+ for session management and rate limiting
- **Queue**: BullMQ or Redis Streams for background jobs
- **ORM**: Drizzle ORM or Kysely (type-safe SQL builder)

### Frontend
- **Framework**: React 19+ or SolidJS
- **Build Tool**: Vite 6+ or Turbopack
- **State Management**: Zustand or Jotai
- **Animations**: Framer Motion 11+
- **Styling**: Tailwind CSS 4+ with CSS Variables
- **PWA**: Workbox for offline support

### Infrastructure
- **Container**: Docker + Docker Compose
- **Orchestration**: Kubernetes (optional for scale)
- **CI/CD**: GitHub Actions with preview deployments
- **Monitoring**: Prometheus + Grafana or Datadog
- **Logging**: Pino + structured logging to ELK stack

### AI/ML Services
- **Furigana Injection**: Self-hosted Python service with fugashi
- **Sentence Segmentation**: SudachiPy with custom dictionaries
- **Parameter Optimization**: PyTorch-based FSRS optimizer

---

## API Design

### RESTful Endpoints

```yaml
# User Management
POST   /api/v1/users              # Create user (onboarding)
GET    /api/v1/users/:id          # Get user profile
PUT    /api/v1/users/:id          # Update user settings
GET    /api/v1/users/:id/progress # Get progress statistics

# Card Operations
GET    /api/v1/cards/new          # Get new cards for learning
GET    /api/v1/cards/due          # Get cards due for review
POST   /api/v1/cards/:id/review   # Submit card review (FSRS update)
DELETE /api/v1/cards/:id          # Remove card from user queue

# Swipe Sessions
POST   /api/v1/sessions/swipe     # Start swipe session
POST   /api/v1/sessions/:id/swipe # Record swipe action
GET    /api/v1/sessions/:id       # Get session summary

# Subtitle Processing
POST   /api/v1/subtitles/upload   # Upload subtitle file
GET    /api/v1/subtitles/:id      # Get processed subtitle
GET    /api/v1/subtitles/:id/words # Extract words from subtitle
POST   /api/v1/subtitles/:id/import # Import words to user queue

# Furigana Service
POST   /api/v1/furigana/inject    # Inject furigana into text

# Analytics
GET    /api/v1/analytics/daily    # Daily progress
GET    /api/v1/analytics/weekly   # Weekly trends
GET    /api/v1/analytics/jlpt     # JLPT level distribution
```

### WebSocket Events (Real-time Updates)
```typescript
// Client → Server
{
  event: 'card:review',
  payload: {
    cardId: string,
    rating: 1 | 2 | 3 | 4,
    responseTimeMs: number,
  }
}

// Server → Client
{
  event: 'queue:updated',
  payload: {
    dueCount: number,
    newCount: number,
    nextReviewIn: number, // seconds
  }
}
```

---

## Data Flow Examples

### Learning New Words Flow
```
User completes onboarding
    ↓
System selects 30 new words based on preferences
    ↓
User enters swipe mode
    ↓
For each card:
  ├─ User swipes RIGHT (Know)
  │   ├─ If "Add to SRS": Create FSRS state, schedule first review
  │   └─ If "Mark Known": Add to known list, no SRS
  │
  └─ User swipes LEFT (Don't Know)
      └─ Add to "Learning" queue for future SRS activation
    ↓
After session: Update daily progress, check goal completion
    ↓
If goal met: Show celebration, suggest review session
```

### Review Session Flow
```
User clicks "Review" button
    ↓
FSRS engine queries due cards (next_review_at <= NOW)
    ↓
System presents cards one by one
    ↓
For each card:
  ├─ User rates: Again/Hard/Good/Easy
  ├─ FSRS calculates new state
  ├─ Update database with new interval
  └─ Show next card
    ↓
Session ends when:
  ├─ All due cards reviewed, OR
  ├─ User reaches daily review limit, OR
  ├─ User manually stops
    ↓
Show session summary: accuracy, time spent, next review times
```

### Subtitle Import Flow
```
User uploads SRT/VTT file
    ↓
Backend parses subtitle entries
    ↓
NLP service tokenizes Japanese text
    ↓
For each token:
  ├─ Lookup in vocabulary database
  ├─ Check if user knows this word
  └─ Mark as known/unknown
    ↓
Present unknown words in swipe sort mode
    ↓
User sorts words into Known/Learning
    ↓
Optionally activate SRS for Learning words
    ↓
Link subtitle timestamps to vocabulary for context practice
```

---

## Security Considerations

1. **Authentication**: JWT with refresh tokens or session cookies
2. **Authorization**: Role-based access control (user, admin)
3. **Rate Limiting**: Per-user and per-IP limits on API endpoints
4. **Input Validation**: Zod schemas for all API inputs
5. **SQL Injection Prevention**: Parameterized queries only
6. **XSS Prevention**: Sanitize all user-generated content
7. **CORS**: Strict origin policies for production
8. **Data Encryption**: TLS 1.3 for transit, encryption at rest for sensitive data

---

## Performance Optimizations

1. **Database Indexing**: Strategic indexes on frequently queried columns
2. **Query Optimization**: Use EXPLAIN ANALYZE for slow queries
3. **Caching Strategy**: 
   - Redis cache for user sessions and frequently accessed cards
   - CDN for static assets
   - Edge caching for API responses where possible
4. **Lazy Loading**: Load cards in batches, not all at once
5. **Image Optimization**: WebP format, responsive images
6. **Code Splitting**: Dynamic imports for route-based splitting
7. **Database Connection Pooling**: PgBouncer or built-in pooling

---

## Testing Strategy

### Unit Tests
```typescript
// __tests__/fsrs-engine.test.ts
describe('FSRSv6Engine', () => {
  it('should schedule a new card correctly', () => {
    const engine = new FSRSv6Engine();
    const result = engine.scheduleCard(null, { type: 'good', value: 3 });
    
    expect(result.interval).toBeGreaterThan(0);
    expect(result.predictedRetrievability).toBeCloseTo(0.9, 1);
  });

  it('should decrease stability on "again" rating', () => {
    const initialState: FSRSState = { /* ... */ };
    const engine = new FSRSv6Engine();
    const result = engine.scheduleCard(initialState, { type: 'again', value: 1 });
    
    expect(result.newState.stability).toBeLessThan(initialState.stability);
  });
});
```

### Integration Tests
```typescript
// __tests__/integration/card-review.test.ts
describe('Card Review Flow', () => {
  it('should update FSRS state after review', async () => {
    const user = await createUser();
    const card = await getNewCard(user.id);
    
    const response = await api.post('/api/v1/cards/${card.id}/review', {
      rating: 3, // good
    });
    
    expect(response.status).toBe(200);
    
    const updatedCard = await getCard(user.id, card.id);
    expect(updatedCard.fsrs_state.reviews).toBe(1);
    expect(updatedCard.next_review_at).toBeInstanceOf(Date);
  });
});
```

### E2E Tests
```typescript
// __tests__/e2e/swipe-flow.spec.ts
test('complete swipe learning flow', async ({ page }) => {
  await page.goto('/onboarding');
  
  // Complete onboarding
  await page.fill('[name="username"]', 'testuser');
  await page.selectOption('[name="dailyGoal"]', '20');
  await page.click('button[type="submit"]');
  
  // Swipe through cards
  const card = page.locator('.swipe-card');
  await card.swipe('right'); // Know
  await card.swipe('left');  // Don't know
  
  // Verify progress updated
  const progress = await page.locator('.progress-counter').textContent();
  expect(progress).toContain('2 cards processed');
});
```

---

## Deployment Checklist

- [ ] Set up PostgreSQL with extensions (pg_trgm, pgvector)
- [ ] Configure Redis for caching and queues
- [ ] Deploy backend with health checks
- [ ] Build and deploy frontend with CDN
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy (daily DB dumps)
- [ ] Implement log aggregation
- [ ] Set up staging environment for testing
- [ ] Configure SSL certificates
- [ ] Test disaster recovery procedures

---

## Future Enhancements (Post-MVP)

1. **Mobile Apps**: React Native or Flutter for iOS/Android
2. **Audio Pronunciation**: TTS integration for word playback
3. **Community Features**: Shared subtitle libraries, word lists
4. **Advanced Analytics**: Memory heatmaps, weak area identification
5. **Gamification**: Achievements, leaderboards, challenges
6. **Browser Extension**: Capture words from any Japanese webpage
7. **Offline Mode**: Full PWA with local database sync
8. **AI Tutor**: Chatbot for contextual practice with learned words
9. **Spaced Repetition Visualization**: Graph of memory strength over time
10. **Collaborative Learning**: Study groups, shared review sessions

---

## Appendix: Sample Configuration Files

### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: neighborcards
      POSTGRES_USER: neighborcards
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://neighborcards:${DB_PASSWORD}@postgres:5432/neighborcards
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  worker:
    build: ./backend
    command: npm run worker
    environment:
      DATABASE_URL: postgresql://neighborcards:${DB_PASSWORD}@postgres:5432/neighborcards
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
  redis_data:
```

### package.json (Backend)
```json
{
  "name": "neighborcards-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc && esbuild src/index.ts --bundle --platform=node --outfile=dist/index.js",
    "start": "node dist/index.js",
    "worker": "tsx src/worker.ts",
    "migrate": "drizzle-kit push",
    "seed": "tsx scripts/import_vocab_data.ts",
    "test": "vitest",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "@hono/node-server": "^1.11.0",
    "drizzle-orm": "^0.31.0",
    "hono": "^4.4.0",
    "ioredis": "^5.4.0",
    "pg": "^8.12.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "drizzle-kit": "^0.22.0",
    "esbuild": "^0.21.0",
    "tsx": "^4.15.0",
    "typescript": "^5.5.0",
    "vitest": "^1.6.0"
  }
}
```

---

## Conclusion

This technical plan provides a comprehensive foundation for building NeighborCards, a modern Japanese learning application leveraging:

- **Modular architecture** for maintainability and scalability
- **FSRS v6** for optimal spaced repetition scheduling
- **Rich vocabulary data** from your JSON sources converted to PostgreSQL
- **Intuitive swipe interface** inspired by successful language apps
- **Anime subtitle integration** for contextual, engaging learning
- **Best practices** for April 2026 web development

The plan balances innovation with proven methodologies, ensuring both effective learning outcomes and a delightful user experience.
