'use client';

const DB_NAME = 'ppw_offline';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// Pre-load questions for all sub-games
export async function preloadForOffline(
  onProgress?: (msg: string) => void
): Promise<void> {
  const subGames = [
    { skillArea: 'word_wizard', subGame: 'riddles' },
    { skillArea: 'word_wizard', subGame: 'story_finish' },
    { skillArea: 'word_wizard', subGame: 'word_categories' },
    { skillArea: 'pattern_detective', subGame: 'shape_sequences' },
    { skillArea: 'pattern_detective', subGame: 'size_color_sorting' },
    { skillArea: 'pattern_detective', subGame: 'odd_one_out' },
    { skillArea: 'memory_master', subGame: 'remember_list' },
    { skillArea: 'memory_master', subGame: 'order_recall' },
    { skillArea: 'memory_master', subGame: 'story_details' },
    { skillArea: 'math_explorer', subGame: 'counting_adventures' },
    { skillArea: 'math_explorer', subGame: 'more_or_less' },
    { skillArea: 'math_explorer', subGame: 'algebra_puzzles' },
    { skillArea: 'confidence_coach', subGame: 'meet_greet' },
    { skillArea: 'confidence_coach', subGame: 'what_would_you_do' },
    { skillArea: 'confidence_coach', subGame: 'i_dont_know' },
  ];

  for (const sg of subGames) {
    onProgress?.(`Caching ${sg.skillArea}/${sg.subGame}...`);
    try {
      for (let level = 1; level <= 3; level++) {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...sg, level, count: 10 }),
        });
        const data = await res.json();
        await cacheSet(`${sg.skillArea}_${sg.subGame}_${level}`, data);
      }
    } catch {
      // Skip failed cache attempts
    }
  }

  // Cache assessment questions
  onProgress?.('Caching assessments...');
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillArea: 'word_wizard', level: 1, type: 'standard' }),
      });
      const data = await res.json();
      await cacheSet(`assessment_${i}`, data);
    } catch {
      break;
    }
  }

  onProgress?.('Done! Ready for offline play ✈️');
}

export async function getCachedQuestions(skillArea: string, subGame: string, level: number): Promise<unknown | null> {
  return cacheGet(`${skillArea}_${subGame}_${level}`);
}
