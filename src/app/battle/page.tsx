'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ANIMALS, Animal, RARITY_COLORS, AnimalRarity } from '@/data/animals';
import { getAnimalCollection, saveBattle, getBattleStats, saveBattleStats } from '@/lib/db';
import { BattleStats } from '@/lib/types';
import { speak, speakCelebration } from '@/lib/speech';
import { calculateBattle, randomTerrain, getTerrainInfo, Terrain } from '@/lib/battleEngine';
import Confetti from '@/components/Confetti';

type Phase = 'select' | 'opponent' | 'matchup' | 'predict' | 'battle' | 'result' | 'evaluate';

const RB: Record<AnimalRarity, string> = { common: 'border-green-500', rare: 'border-blue-500', epic: 'border-purple-500', legendary: 'border-yellow-400' };

function Stars({ n }: { n: number }) {
  return <span className="text-yellow-400 text-[10px]">{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

function MiniCard({ animal, selected, onClick }: { animal: Animal; selected?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} onTouchEnd={e => e.currentTarget.blur()}
      className={`rounded-xl border-2 p-2 text-center transition-all focus:outline-none ${RB[animal.rarity]} ${
        selected ? 'ring-4 ring-yellow-400 scale-110 bg-yellow-50' : 'bg-white active:scale-95'
      }`}>
      <span className="text-3xl block">{animal.emoji}</span>
      <p className="text-[10px] font-bold text-navy truncate">{animal.name}</p>
      <p className="text-[8px]" style={{ color: RARITY_COLORS[animal.rarity] }}>PWR {animal.powerLevel}</p>
    </button>
  );
}

export default function BattlePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('select');
  const [unlockedAnimals, setUnlockedAnimals] = useState<Animal[]>([]);
  const [wesAnimal, setWesAnimal] = useState<Animal | null>(null);
  const [opponent, setOpponent] = useState<Animal | null>(null);
  const [terrain, setTerrain] = useState<Terrain>('grassland');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<{ wesScore: number; opponentScore: number; winnerId: string | null; isTie: boolean } | null>(null);
  const [explanation, setExplanation] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [stats, setStats] = useState<BattleStats>(getBattleStats());
  const [loading, setLoading] = useState(true);
  const [buttonsLocked, setButtonsLocked] = useState(true);

  useEffect(() => {
    getAnimalCollection().then(col => {
      const ids = new Set(col.map(c => c.animal_id));
      setUnlockedAnimals(ANIMALS.filter(a => ids.has(a.id)));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (phase === 'select' && !loading) {
      speak("Choose your champion, Wes! Pick the animal you think will win!", { rate: 0.9, pitch: 1.05 });
    }
  }, [phase, loading]);

  const selectFighter = (animal: Animal) => {
    setWesAnimal(animal);
  };

  const startBattle = () => {
    if (!wesAnimal) return;
    // Auto-pick opponent
    const others = unlockedAnimals.filter(a => a.id !== wesAnimal.id);
    if (others.length === 0) return;
    const opp = others[Math.floor(Math.random() * others.length)];
    setOpponent(opp);
    const t = randomTerrain();
    setTerrain(t);
    setPhase('matchup');

    setTimeout(() => {
      const ti = getTerrainInfo(t);
      speak(`In the left corner... ${wesAnimal.name}! Power level: ${wesAnimal.powerLevel}! In the right corner... ${opp.name}! Power level: ${opp.powerLevel}! Today's battle takes place in... ${ti.name}! Who... would... WIN?`, { rate: 0.85, pitch: 1.0 });
    }, 500);

    // Unlock prediction buttons after 4 seconds
    setButtonsLocked(true);
    setTimeout(() => {
      setPhase('predict');
      setButtonsLocked(false);
      speak("Who do you think wins? Make your prediction!");
    }, 6000);
  };

  const makePrediction = async (pred: string) => {
    if (buttonsLocked || !wesAnimal || !opponent) return;
    setPrediction(pred);
    setPhase('battle');

    // Calculate result
    const result = calculateBattle(wesAnimal, opponent, terrain);
    setBattleResult(result);

    // Battle animation timing
    // Flash at 0ms, collision at 800ms, suspense at 1600ms, reveal at 3600ms
    setTimeout(() => {
      setPhase('result');
      const winner = result.isTie ? null : ANIMALS.find(a => a.id === result.winnerId);
      const loser = result.isTie ? null : (result.winnerId === wesAnimal.id ? opponent : wesAnimal);

      // Check prediction
      const predictedCorrectly = result.isTie ? pred === 'tie' : pred === result.winnerId;

      // Update stats
      const newStats = { ...stats };
      newStats.total_battles++;
      if (predictedCorrectly) {
        newStats.total_wins_predicted++;
        newStats.current_streak++;
        if (newStats.current_streak > newStats.best_streak) newStats.best_streak = newStats.current_streak;
      } else {
        newStats.current_streak = 0;
      }
      setStats(newStats);
      saveBattleStats(newStats);

      if (predictedCorrectly) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
        speakCelebration(result.isTie
          ? "Incredible — it's a tie! Both animals are perfectly matched!"
          : `Brilliant prediction, Wes! You knew ${winner?.name} would win! Well done!`);

        // Streak milestones
        if (newStats.current_streak === 3) setTimeout(() => speak("Three in a row! You've got a sharp eye, Wes!"), 3000);
        if (newStats.current_streak === 5) setTimeout(() => speakCelebration("Five in a row! You are a Battle Master!"), 3000);
        if (newStats.current_streak === 10) setTimeout(() => speakCelebration("Ten in a row! You are a LEGENDARY predictor!"), 3000);
      } else {
        speak(result.isTie
          ? "Incredible — it's a tie! Both animals are perfectly matched!"
          : `So close! ${winner?.name} wins this one!`);
      }

      // Fetch explanation
      fetchExplanation(
        winner?.name || wesAnimal.name,
        loser?.name || opponent.name,
        getTerrainInfo(terrain).name,
        winner || wesAnimal,
        loser || opponent,
        result.isTie
      );

      // Save battle record
      saveBattle({
        wes_animal_id: wesAnimal.id,
        opponent_animal_id: opponent.id,
        terrain,
        wes_animal_score: result.wesScore,
        opponent_score: result.opponentScore,
        winner_animal_id: result.winnerId,
        is_tie: result.isTie,
        wes_prediction: pred,
        wes_predicted_correctly: predictedCorrectly,
        battle_explanation: '',
        wes_agreed_with_result: null,
      });
    }, 3000);
  };

  const fetchExplanation = async (winnerName: string, loserName: string, terrainName: string, winner: Animal, loser: Animal, isTie: boolean) => {
    try {
      const res = await fetch('/api/battle-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner: winnerName, loser: loserName, terrain: terrainName, winnerStats: winner, loserStats: loser, isTie }),
      });
      const data = await res.json();
      setExplanation(data.explanation || 'What an incredible battle!');
      setTimeout(() => speak(data.explanation || 'What an incredible battle!', { rate: 0.85 }), 2000);
    } catch {
      const fallback = isTie ? 'Both animals fought to a standstill!' : `${winnerName} used superior abilities to claim victory!`;
      setExplanation(fallback);
    }
  };

  const handleEvaluate = (agreed: boolean) => {
    if (!agreed) {
      speak("You might be right! Real battles always have surprises. That's what makes nature so amazing!", { rate: 0.85 });
    }
    setPhase('evaluate');
  };

  const resetBattle = () => {
    setWesAnimal(null);
    setOpponent(null);
    setPrediction(null);
    setBattleResult(null);
    setExplanation('');
    setButtonsLocked(true);
    setPhase('select');
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-6xl animate-bounce">⚔️</div></div>;
  }

  if (unlockedAnimals.length < 2) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-6xl mb-4">⚔️</p>
          <h2 className="font-retro text-lg text-yellow-400 mb-4">BATTLE ARENA</h2>
          <p className="text-gray-400 mb-6">Unlock at least 2 animals to battle!</p>
          <button onClick={() => router.push('/')} className="bg-yellow-500 text-navy font-bold px-6 py-3 rounded-xl">Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-8">
      {showConfetti && <Confetti duration={4000} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push('/')} className="text-gray-400 font-bold text-sm">← Home</button>
        <h1 className="font-retro text-sm text-yellow-400">BATTLE ARENA ⚔️</h1>
        <button onClick={() => router.push('/battle/record')} className="text-gray-400 font-bold text-sm">📊</button>
      </div>

      {/* STEP 1: Select fighter */}
      {phase === 'select' && (
        <div>
          <p className="text-center text-gray-400 mb-4">Choose your champion!</p>
          <div className="grid grid-cols-4 gap-2 mb-6 max-w-lg mx-auto">
            {unlockedAnimals.map(a => (
              <MiniCard key={a.id} animal={a} selected={wesAnimal?.id === a.id} onClick={() => selectFighter(a)} />
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { const r = unlockedAnimals[Math.floor(Math.random() * unlockedAnimals.length)]; setWesAnimal(r); }}
              className="bg-gray-800 text-white font-bold px-6 py-3 rounded-xl active:scale-95">
              Random 🎲
            </button>
            {wesAnimal && (
              <button onClick={startBattle}
                className="bg-red-600 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 animate-pulse">
                FIGHT! ⚔️
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 3-4: Matchup + Prediction */}
      {(phase === 'matchup' || phase === 'predict') && wesAnimal && opponent && (
        <div className="max-w-lg mx-auto">
          {/* VS Display */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="text-center flex-1">
              <div className={`border-2 ${RB[wesAnimal.rarity]} rounded-xl p-3 bg-gray-900`}>
                <span className="text-5xl block mb-1">{wesAnimal.emoji}</span>
                <p className="font-bold text-sm" style={{ color: RARITY_COLORS[wesAnimal.rarity] }}>{wesAnimal.name}</p>
                <div className="text-[9px] mt-1 space-y-0.5">
                  <p>💪 <Stars n={wesAnimal.strength} /> ⚡ <Stars n={wesAnimal.speed} /> 🛡️ <Stars n={wesAnimal.defense} /></p>
                </div>
                <p className="text-yellow-400 text-xs font-bold mt-1">PWR {wesAnimal.powerLevel}</p>
              </div>
            </div>
            <div className="font-retro text-2xl text-red-500 animate-pulse px-2">VS</div>
            <div className="text-center flex-1">
              <div className={`border-2 ${RB[opponent.rarity]} rounded-xl p-3 bg-gray-900`}>
                <span className="text-5xl block mb-1">{opponent.emoji}</span>
                <p className="font-bold text-sm" style={{ color: RARITY_COLORS[opponent.rarity] }}>{opponent.name}</p>
                <div className="text-[9px] mt-1 space-y-0.5">
                  <p>💪 <Stars n={opponent.strength} /> ⚡ <Stars n={opponent.speed} /> 🛡️ <Stars n={opponent.defense} /></p>
                </div>
                <p className="text-yellow-400 text-xs font-bold mt-1">PWR {opponent.powerLevel}</p>
              </div>
            </div>
          </div>

          {/* Terrain */}
          <div className="text-center mb-6 bg-gray-900 rounded-xl p-3">
            <p className="text-2xl mb-1">{getTerrainInfo(terrain).emoji}</p>
            <p className="font-retro text-xs text-yellow-400">{getTerrainInfo(terrain).name}</p>
            <p className="text-gray-400 text-xs">{getTerrainInfo(terrain).desc}</p>
          </div>

          {/* Prediction buttons */}
          {phase === 'predict' && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-center text-gray-400 text-sm mb-2">Who do you think wins?</p>
              <button onClick={() => makePrediction(wesAnimal.id)} disabled={buttonsLocked}
                className={`w-full py-4 rounded-xl font-bold text-lg active:scale-95 transition-all border-2 ${RB[wesAnimal.rarity]} bg-gray-900 disabled:opacity-50`}
                style={{ color: RARITY_COLORS[wesAnimal.rarity] }}>
                {wesAnimal.name} WINS! 🐾
              </button>
              <button onClick={() => makePrediction('tie')} disabled={buttonsLocked}
                className="w-full py-4 rounded-xl font-bold text-lg active:scale-95 bg-gray-800 text-gray-300 disabled:opacity-50">
                IT&apos;S A TIE! 🤝
              </button>
              <button onClick={() => makePrediction(opponent.id)} disabled={buttonsLocked}
                className={`w-full py-4 rounded-xl font-bold text-lg active:scale-95 transition-all border-2 ${RB[opponent.rarity]} bg-gray-900 disabled:opacity-50`}
                style={{ color: RARITY_COLORS[opponent.rarity] }}>
                {opponent.name} WINS! 🐾
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 5: Battle animation */}
      {phase === 'battle' && wesAnimal && opponent && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <span className="text-6xl animate-bounce">{wesAnimal.emoji}</span>
              <span className="text-5xl animate-pulse">💥</span>
              <span className="text-6xl animate-bounce">{opponent.emoji}</span>
            </div>
            <p className="font-retro text-sm text-yellow-400 animate-pulse">BATTLING...</p>
          </div>
        </div>
      )}

      {/* STEP 6-7: Result */}
      {(phase === 'result' || phase === 'evaluate') && wesAnimal && opponent && battleResult && (
        <div className="max-w-lg mx-auto text-center">
          {/* Winner display */}
          <div className="mb-4">
            {battleResult.isTie ? (
              <>
                <p className="text-4xl mb-2">{wesAnimal.emoji} 🤝 {opponent.emoji}</p>
                <h2 className="font-retro text-lg text-yellow-400 mb-2">IT&apos;S A TIE!</h2>
              </>
            ) : (
              <>
                <p className="text-6xl mb-2">👑</p>
                <p className="text-5xl mb-2">{ANIMALS.find(a => a.id === battleResult.winnerId)?.emoji}</p>
                <h2 className="font-retro text-lg text-yellow-400 mb-1">
                  {ANIMALS.find(a => a.id === battleResult.winnerId)?.name} WINS!
                </h2>
              </>
            )}
          </div>

          {/* Prediction result */}
          <div className={`rounded-xl p-4 mb-4 ${
            (battleResult.isTie ? prediction === 'tie' : prediction === battleResult.winnerId)
              ? 'bg-green-900/50 border border-green-500'
              : 'bg-gray-800'
          }`}>
            <p className="font-bold text-lg">
              {(battleResult.isTie ? prediction === 'tie' : prediction === battleResult.winnerId)
                ? '✅ CORRECT PREDICTION!'
                : '❌ Not this time!'
              }
            </p>
            {stats.current_streak >= 3 && <p className="text-yellow-400 text-sm mt-1">🔥 {stats.current_streak} correct in a row!</p>}
          </div>

          {/* Score breakdown */}
          <div className="bg-gray-900 rounded-xl p-3 mb-4 text-sm">
            <div className="flex justify-between mb-1">
              <span>{wesAnimal.name}</span>
              <span className="font-bold text-yellow-400">{battleResult.wesScore} pts</span>
            </div>
            <div className="flex justify-between">
              <span>{opponent.name}</span>
              <span className="font-bold text-yellow-400">{battleResult.opponentScore} pts</span>
            </div>
          </div>

          {/* Explanation */}
          {explanation && (
            <div className="bg-gray-900 rounded-xl p-4 mb-4 border border-yellow-500/30">
              <p className="text-sm text-gray-300 italic">{explanation}</p>
            </div>
          )}

          {/* Evaluate */}
          {phase === 'result' && (
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">Do you agree?</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => handleEvaluate(true)} className="bg-green-700 text-white font-bold px-6 py-3 rounded-xl active:scale-95">Fair Fight! 👍</button>
                <button onClick={() => handleEvaluate(false)} className="bg-gray-700 text-white font-bold px-6 py-3 rounded-xl active:scale-95">I Disagree! 🤔</button>
              </div>
            </div>
          )}

          {/* Post-battle buttons */}
          {phase === 'evaluate' && (
            <div className="flex flex-col gap-3 mt-4">
              <button onClick={resetBattle} className="bg-red-600 text-white font-bold py-4 rounded-xl text-lg active:scale-95">Battle Again! ⚔️</button>
              <button onClick={() => router.push('/battle/record')} className="bg-gray-800 text-white font-bold py-3 rounded-xl active:scale-95">My Battle Record 📊</button>
              <button onClick={() => router.push('/')} className="text-gray-500 font-bold py-2">🏠 Home</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
