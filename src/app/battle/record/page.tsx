'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBattles, getBattleStats } from '@/lib/db';
import { BattleRecord, BattleStats } from '@/lib/types';
import { ANIMALS } from '@/data/animals';

export default function BattleRecordPage() {
  const router = useRouter();
  const [battles, setBattles] = useState<BattleRecord[]>([]);
  const [stats, setStats] = useState<BattleStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getBattles(20), Promise.resolve(getBattleStats())]).then(([b, s]) => {
      setBattles(b);
      setStats(s);
      setLoading(false);
    });
  }, []);

  const getAnimalName = (id: string) => ANIMALS.find(a => a.id === id)?.name || id;
  const getAnimalEmoji = (id: string) => ANIMALS.find(a => a.id === id)?.emoji || '❓';

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-4xl animate-bounce">📊</div></div>;

  const accuracy = stats && stats.total_battles > 0 ? Math.round((stats.total_wins_predicted / stats.total_battles) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.push('/battle')} className="text-gray-400 font-bold text-sm">← Arena</button>
          <h1 className="font-retro text-sm text-yellow-400">BATTLE RECORD</h1>
          <button onClick={() => router.push('/')} className="text-gray-400 font-bold text-sm">Home</button>
        </div>

        {/* Scoreboard */}
        {stats && (
          <div className="bg-gray-900 rounded-2xl p-5 mb-6 text-center">
            <h2 className="font-retro text-xs text-gray-400 mb-3">WES&apos;S RECORD</h2>
            <div className="flex justify-center gap-6 mb-4">
              <div>
                <p className="text-3xl font-bold text-green-400">{stats.total_wins_predicted}</p>
                <p className="text-xs text-gray-500">Correct</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-red-400">{stats.total_battles - stats.total_wins_predicted}</p>
                <p className="text-xs text-gray-500">Wrong</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">Accuracy: <strong className="text-yellow-400">{accuracy}%</strong></p>
            <div className="flex gap-4 justify-center mt-3 text-sm">
              <p>🔥 Streak: <strong className="text-yellow-400">{stats.current_streak}</strong></p>
              <p>🏆 Best: <strong className="text-yellow-400">{stats.best_streak}</strong></p>
            </div>
          </div>
        )}

        {/* Battle history */}
        <h3 className="font-retro text-xs text-gray-400 mb-3">RECENT BATTLES</h3>
        {battles.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No battles yet!</p>
        ) : (
          <div className="space-y-2">
            {battles.map((b, i) => (
              <div key={i} className="bg-gray-900 rounded-xl p-3 flex items-center gap-3">
                <span className="text-2xl">{getAnimalEmoji(b.wes_animal_id)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">
                    {getAnimalName(b.wes_animal_id)} vs {getAnimalName(b.opponent_animal_id)}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {b.terrain} | {b.is_tie ? 'Tie' : `${getAnimalName(b.winner_animal_id || '')} won`}
                  </p>
                </div>
                <span className="text-lg">{b.wes_predicted_correctly ? '✅' : '❌'}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 justify-center mt-6">
          <button onClick={() => router.push('/battle')} className="bg-red-600 text-white font-bold px-6 py-3 rounded-xl active:scale-95">Battle Again!</button>
          <button onClick={() => router.push('/')} className="bg-gray-800 text-white font-bold px-6 py-3 rounded-xl active:scale-95">Home</button>
        </div>
      </div>
    </div>
  );
}
