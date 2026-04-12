'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStories } from '@/lib/db';
import { Story } from '@/lib/types';
import { speak } from '@/lib/speech';

export default function StoriesPage() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStories().then(s => { setStories(s); setLoading(false); });
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-xl font-bold text-navy">Loading...</p></div>;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/')} className="text-navy font-bold">← Home</button>
          <h1 className="text-2xl font-extrabold text-navy">My Stories 📚</h1>
          <div />
        </div>

        <p className="text-gray-500 mb-6 text-center">{stories.length} stor{stories.length !== 1 ? 'ies' : 'y'} written!</p>

        {stories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-6xl mb-4">📝</p>
            <p className="text-gray-500">No stories yet.</p>
            <p className="text-sm text-gray-400 mt-2">Play Story Builder to start writing!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stories.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-navy text-lg">{s.theme}</h3>
                    <p className="text-xs text-gray-400">{s.completed_at ? new Date(s.completed_at).toLocaleDateString() : ''}</p>
                  </div>
                  <button
                    onClick={() => speak(s.sentences.join('. ') + '.')}
                    className="text-3xl active:scale-90"
                  >
                    🔊
                  </button>
                </div>
                <div className="bg-sunshine/10 rounded-xl p-3 mb-3">
                  {s.sentences.map((sent, j) => (
                    <p key={j} className="text-base text-navy mb-1">{sent}.</p>
                  ))}
                </div>
                <button
                  onClick={() => window.print()}
                  className="text-sm text-navy font-bold hover:text-coral"
                >
                  🖨️ Print This Story
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
