'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VOCABULARY_BANK, VocabWord } from '@/data/vocabulary';
import { getWordCollection } from '@/lib/db';

const CATEGORIES = Array.from(new Set(VOCABULARY_BANK.map(w => w.category)));

export default function WordBankPage() {
  const router = useRouter();
  const [category, setCategory] = useState('All');
  const [diffLevel, setDiffLevel] = useState(0); // 0 = all
  const [mastered, setMastered] = useState<Set<string>>(new Set());

  useEffect(() => {
    getWordCollection().then(words => {
      setMastered(new Set(words.map(w => w.word.toLowerCase())));
    });
  }, []);

  let filtered: VocabWord[] = VOCABULARY_BANK;
  if (category !== 'All') filtered = filtered.filter(w => w.category === category);
  if (diffLevel > 0) filtered = filtered.filter(w => w.difficulty_level === diffLevel);

  const masteredCount = filtered.filter(w => mastered.has(w.word.toLowerCase())).length;

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/dashboard')} className="text-navy font-bold">← Dashboard</button>
          <h1 className="text-2xl font-extrabold text-navy">CATS Word Bank</h1>
          <div />
        </div>

        <p className="text-sm text-gray-500 mb-4">
          {masteredCount} of {filtered.length} words mastered | {VOCABULARY_BANK.length} total words
        </p>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={diffLevel}
            onChange={e => setDiffLevel(Number(e.target.value))}
            className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
          >
            <option value={0}>All Levels</option>
            <option value={1}>Level 1 — Explorer</option>
            <option value={2}>Level 2 — Adventurer</option>
            <option value={3}>Level 3 — Champion</option>
          </select>
        </div>

        {/* Word list */}
        <div className="space-y-2">
          {filtered.map((w, i) => {
            const isMastered = mastered.has(w.word.toLowerCase());
            return (
              <div key={i} className={`p-3 rounded-xl border ${isMastered ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
                <div className="flex items-center gap-2">
                  {isMastered && <span className="text-green-500">✓</span>}
                  <span className="font-bold text-navy">{w.word}</span>
                  <span className="text-xs text-coral">{w.syllable_breakdown}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${
                    w.difficulty_level === 1 ? 'bg-gray-100 text-gray-600' :
                    w.difficulty_level === 2 ? 'bg-blue-100 text-blue-600' :
                    'bg-gold/20 text-gold-dark'
                  }`}>
                    L{w.difficulty_level}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{w.child_friendly_definition}</p>
                <p className="text-xs text-gray-400 italic">{w.example_sentence}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
