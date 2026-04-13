'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VOCABULARY_BANK, VocabWord } from '@/data/vocabulary';
import { getWordCollection } from '@/lib/db';

const CATS_EXPLANATION = `The CATS assessment is a one-on-one cognitive ability test administered by a licensed psychologist. It is required for admission to many top Dallas private schools including St. Mark's and Greenhill. It measures verbal reasoning, visual-spatial skills, working memory, and processing speed — not academic knowledge. The words in this bank are tuned to the vocabulary level tested in the CATS verbal subtests.`;

const CATEGORIES = Array.from(new Set(VOCABULARY_BANK.map(w => w.category)));

export default function WordBankPage() {
  const router = useRouter();
  const [category, setCategory] = useState('All');
  const [diffLevel, setDiffLevel] = useState(0);
  const [mastered, setMastered] = useState<Set<string>>(new Set());
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    getWordCollection().then(words => {
      setMastered(new Set(words.map(w => w.word.toLowerCase())));
    });
    // Show CATS tooltip on first visit
    if (!localStorage.getItem('ppw_cats_tooltip_seen')) {
      setShowTooltip(true);
      localStorage.setItem('ppw_cats_tooltip_seen', '1');
    }
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
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <h1 className="text-2xl font-extrabold text-navy">CATS Word Bank</h1>
              <button onClick={() => setShowTooltip(true)} className="text-lg text-gray-400 hover:text-navy">ℹ️</button>
            </div>
            <p className="text-[10px] text-gray-400 max-w-xs mx-auto">CATS = Collaborative Academic Testing Service — the cognitive ability assessment required by Dallas private schools.</p>
          </div>
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

      {/* CATS Tooltip Modal */}
      {showTooltip && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => setShowTooltip(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-navy text-lg mb-3">What is the CATS Test?</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">{CATS_EXPLANATION}</p>
            <button onClick={() => setShowTooltip(false)} className="bg-navy text-white font-bold px-6 py-2 rounded-xl w-full">Got it ✓</button>
          </div>
        </div>
      )}
    </div>
  );
}
