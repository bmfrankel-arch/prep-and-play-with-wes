'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getWordCollection } from '@/lib/db';
import { WordEntry } from '@/lib/types';

export default function WordCollectionPage() {
  const router = useRouter();
  const [words, setWords] = useState<WordEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWordCollection().then(w => {
      setWords(w);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-xl font-bold text-navy">Loading...</p></div>;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/')} className="text-navy font-bold">← Home</button>
          <h1 className="text-2xl font-extrabold text-navy">Wes&apos;s Word Collection</h1>
          <div />
        </div>

        <p className="text-gray-500 mb-6 text-center">
          {words.length} word{words.length !== 1 ? 's' : ''} mastered!
        </p>

        {words.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-6xl mb-4">📖</p>
            <p className="text-gray-500">No words collected yet.</p>
            <p className="text-sm text-gray-400 mt-2">Play Word Wizard to start building your collection!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {words.map((w, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow border">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-extrabold text-navy">{w.word}</h3>
                    <p className="text-sm text-coral font-bold">{w.syllable_breakdown}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {w.mastered_at ? new Date(w.mastered_at).toLocaleDateString() : ''}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">{w.definition}</p>
                {w.example_sentence && (
                  <p className="text-xs text-gray-400 italic mt-1">&ldquo;{w.example_sentence}&rdquo;</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
