'use client';

const DB_NAME = 'ppw_offline';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

interface CachedEntry {
  questions?: unknown[];
  story?: unknown;
  cachedAt?: string;
}

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
    const wrapped = (value && typeof value === 'object')
      ? { ...(value as Record<string, unknown>), cachedAt: new Date().toISOString() }
      : value;
    tx.objectStore(STORE_NAME).put(wrapped, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function cacheKeys(): Promise<string[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAllKeys();
      req.onsuccess = () => resolve((req.result as IDBValidKey[]).map(String));
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// The full set of game modules we pre-cache for offline play.
const SUB_GAMES = [
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
const LEVELS = [1, 2, 3];
const TOTAL_PRELOAD_STEPS = SUB_GAMES.length * LEVELS.length;

export type PreloadProgress = {
  message: string;
  completed: number;
  total: number;
  percent: number;
};

export async function preloadForOffline(
  onProgress?: (p: PreloadProgress) => void
): Promise<void> {
  let completed = 0;
  const emit = (message: string) => {
    onProgress?.({
      message,
      completed,
      total: TOTAL_PRELOAD_STEPS,
      percent: Math.round((completed / TOTAL_PRELOAD_STEPS) * 100),
    });
  };

  emit('Starting...');

  for (const sg of SUB_GAMES) {
    const niceName = `${sg.skillArea.replace(/_/g, ' ')} / ${sg.subGame.replace(/_/g, ' ')}`;
    for (const level of LEVELS) {
      emit(`Caching ${niceName} (Level ${level})...`);
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...sg, level, count: 10 }),
        });
        const data = await res.json();
        if (data?.questions?.length) {
          await cacheSet(`${sg.skillArea}_${sg.subGame}_${level}`, data);
        }
      } catch {
        // Skip failed cache attempts — keep going.
      }
      completed++;
      emit(`Caching ${niceName} (Level ${level})...`);
      // Small breath between requests so we don't hammer the API.
      await new Promise(r => setTimeout(r, 250));
    }
  }

  onProgress?.({
    message: 'Done! Ready for offline play ✈️',
    completed: TOTAL_PRELOAD_STEPS,
    total: TOTAL_PRELOAD_STEPS,
    percent: 100,
  });
}

// Returns just the questions array for a (skill, subgame, level) tuple, or null.
export async function getCachedQuestions(
  skillArea: string,
  subGame: string,
  level: number
): Promise<unknown[] | null> {
  const entry = await cacheGet<CachedEntry>(`${skillArea}_${subGame}_${level}`);
  if (entry && Array.isArray(entry.questions) && entry.questions.length) {
    return entry.questions;
  }
  return null;
}

export async function getCacheStatus(): Promise<{
  modulesCached: number;
  totalModules: number;
  lastCachedAt: string | null;
}> {
  const keys = await cacheKeys();
  const modulesCached = new Set(
    keys
      .filter(k => /_(1|2|3)$/.test(k))
      .map(k => k.replace(/_(1|2|3)$/, ''))
  ).size;

  let lastCachedAt: string | null = null;
  for (const k of keys) {
    const entry = await cacheGet<CachedEntry>(k);
    if (entry?.cachedAt && (!lastCachedAt || entry.cachedAt > lastCachedAt)) {
      lastCachedAt = entry.cachedAt;
    }
  }

  return {
    modulesCached,
    totalModules: SUB_GAMES.length,
    lastCachedAt,
  };
}
