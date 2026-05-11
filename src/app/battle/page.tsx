'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ANIMALS, Animal, RARITY_COLORS, AnimalRarity } from '@/data/animals';
import { getAnimalCollection, saveBattle, getBattleStats, saveBattleStats, updateBattleMeta } from '@/lib/db';
import { AnimalUnlock, BattleStats } from '@/lib/types';
import { AnimalLevel } from '@/lib/animalLeveling';
import { speak, speakCelebration } from '@/lib/speech';
import { calculateBattle, randomTerrain, getTerrainInfo, Terrain } from '@/lib/battleEngine';
import { AppliedModifier } from '@/data/battleModifiers';
import Confetti from '@/components/Confetti';
import BattleBreakdown, { BattleBreakdownData } from '@/components/BattleBreakdown';
import { displayName, championLabel } from '@/lib/champion';

type Phase = 'select' | 'opponent' | 'matchup' | 'predict' | 'battle' | 'result' | 'evaluate';

const RB: Record<AnimalRarity, string> = { common: 'border-green-500', rare: 'border-blue-500', epic: 'border-purple-500', legendary: 'border-yellow-400' };

function Stars({ n }: { n: number }) {
  return <span className="text-yellow-400 text-[10px]">{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

function levelBadgeColor(level: number): string {
  if (level >= 5) return 'bg-yellow-400 text-navy';
  if (level >= 3) return 'bg-blue-500 text-white';
  return 'bg-gray-500 text-white';
}

function MiniCard({ animal, level, unlock, selected, onClick }: { animal: Animal; level: number; unlock?: AnimalUnlock; selected?: boolean; onClick: () => void }) {
  const d = displayName(animal.name, unlock);
  return (
    <button onClick={onClick} onTouchEnd={e => e.currentTarget.blur()}
      className={`relative rounded-xl border-2 p-2 text-center transition-all focus:outline-none ${RB[animal.rarity]} ${
        selected ? 'ring-4 ring-yellow-400 scale-110 bg-yellow-50' : 'bg-white active:scale-95'
      }`}>
      <span className={`absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${levelBadgeColor(level)}`}>
        Lv.{level}{level >= 5 ? ' ⭐' : ''}
      </span>
      <span className="text-3xl block">{animal.emoji}</span>
      <p className={`text-[10px] font-bold truncate ${d.isChampion ? 'text-yellow-600' : 'text-navy'}`}>
        {d.isChampion ? `👑 ${d.text}` : d.text}
      </p>
      <p className="text-[8px]" style={{ color: RARITY_COLORS[animal.rarity] }}>PWR {animal.powerLevel}</p>
    </button>
  );
}

export default function BattlePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('select');
  const [unlockedAnimals, setUnlockedAnimals] = useState<Animal[]>([]);
  const [collection, setCollection] = useState<AnimalUnlock[]>([]);
  const [wesAnimal, setWesAnimal] = useState<Animal | null>(null);
  const [opponent, setOpponent] = useState<Animal | null>(null);
  const [terrain, setTerrain] = useState<Terrain>('grassland');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<{ wesScore: number; opponentScore: number; winnerId: string | null; isTie: boolean; wesLevel: AnimalLevel; opponentLevel: AnimalLevel; wesModifiers: AppliedModifier[]; opponentModifiers: AppliedModifier[]; scoreDifference: number; wesTerrainBonus: number; opponentTerrainBonus: number } | null>(null);
  const [explanation, setExplanation] = useState('');
  const [breakdown, setBreakdown] = useState<BattleBreakdownData | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [savedBattleId, setSavedBattleId] = useState<string | null>(null);
  const savedBattleIdRef = useRef<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [stats, setStats] = useState<BattleStats>(getBattleStats());
  const [loading, setLoading] = useState(true);
  const [buttonsLocked, setButtonsLocked] = useState(true);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  const levelOf = (id: string): number => {
    const u = collection.find(c => c.animal_id === id);
    return (u?.current_level ?? 1) as number;
  };
  const unlockOf = (id: string): AnimalUnlock | undefined => collection.find(c => c.animal_id === id);

  useEffect(() => {
    getAnimalCollection().then(col => {
      const ids = new Set(col.map(c => c.animal_id));
      setCollection(col);
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
      const wesLvl = levelOf(wesAnimal.id);
      const oppLvl = levelOf(opp.id);
      const wesLabel = championLabel(wesAnimal.name, unlockOf(wesAnimal.id));
      const oppLabel = championLabel(opp.name, unlockOf(opp.id));
      let levelLine = '';
      if (wesLvl > oppLvl) levelLine = ` Your ${wesLabel} has been training hard — it's Level ${wesLvl}! That could make a difference!`;
      else if (wesLvl < oppLvl) levelLine = ` Your ${wesLabel} is Level ${wesLvl} — keep training to level it up before your next battle!`;
      speak(`In the left corner... ${wesLabel}, Level ${wesLvl}! In the right corner... ${oppLabel}, Level ${oppLvl}! Today's battle takes place in... ${ti.name}!${levelLine} Who... would... WIN?`, { rate: 0.85, pitch: 1.0 });
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

    // Calculate result using leveled stats from collection
    const result = calculateBattle(wesAnimal, opponent, terrain, unlockOf(wesAnimal.id), unlockOf(opponent.id));
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

      // Save battle record (modifiers + deciding factor patched after API response)
      const winnerModifiers = result.winnerId === wesAnimal.id ? result.wesModifiers : result.opponentModifiers;
      const modifierTypes = winnerModifiers.map(m => m.type);
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
        modifier_types: modifierTypes.length > 0 ? modifierTypes : null,
      }).then(id => { setSavedBattleId(id); savedBattleIdRef.current = id; });

      // Fetch breakdown (full educational explanation)
      fetchBreakdown(
        winner || wesAnimal,
        loser || opponent,
        getTerrainInfo(terrain).name,
        result.isTie,
        result.scoreDifference,
        winnerModifiers,
        result.winnerId === wesAnimal.id ? result.wesTerrainBonus : result.opponentTerrainBonus,
        result.winnerId === wesAnimal.id ? result.wesLevel : result.opponentLevel,
      );
    }, 3000);
  };

  const fetchBreakdown = async (
    winner: Animal,
    loser: Animal,
    terrainName: string,
    isTie: boolean,
    scoreDiff: number,
    modifiers: AppliedModifier[],
    winnerTerrainBonus: number,
    winnerLevel: AnimalLevel,
  ) => {
    setBreakdownLoading(true);
    setBreakdownOpen(!isTie); // ties keep the legacy single-line explanation only
    try {
      const res = await fetch('/api/battle-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winner_name: winner.name,
          winner_stats: { strength: winner.strength, speed: winner.speed, defense: winner.defense, powerLevel: winner.powerLevel, level: winnerLevel, rarity: winner.rarity, superpower: winner.superpower, funFact: winner.funFact },
          loser_name: loser.name,
          loser_stats: { strength: loser.strength, speed: loser.speed, defense: loser.defense, powerLevel: loser.powerLevel, rarity: loser.rarity, superpower: loser.superpower, funFact: loser.funFact },
          terrain: terrainName,
          terrain_bonus_applied_to: winnerTerrainBonus > 0 ? 'winner' : 'neither',
          score_difference: scoreDiff,
          modifiers_applied: modifiers,
          context: 'battle',
          isTie,
        }),
      });
      const data = await res.json();
      setExplanation(data.explanation || 'What an incredible battle!');
      if (data.breakdown) {
        setBreakdown(data.breakdown as BattleBreakdownData);
        // Save deciding factor to battle record once available
        const decidingFactor = (data.breakdown as BattleBreakdownData).deciding_factor;
        // savedBattleId may not be set yet — patch it asynchronously when ready
        const tryPatch = (attempt: number) => {
          const id = savedBattleIdRef.current;
          if (id) {
            updateBattleMeta(id, { deciding_factor: decidingFactor, battle_explanation: data.explanation || '' });
          } else if (attempt < 5) {
            setTimeout(() => tryPatch(attempt + 1), 400);
          }
        };
        tryPatch(0);
      }
    } catch {
      const fallback = isTie ? 'Both animals fought to a standstill!' : `${winner.name} used superior abilities to claim victory!`;
      setExplanation(fallback);
    } finally {
      setBreakdownLoading(false);
    }
  };

  const handleBreakdownReact = (reaction: 'wow' | 'cool') => {
    setBreakdownOpen(false);
    if (savedBattleId) {
      updateBattleMeta(savedBattleId, { battle_reaction: reaction });
    }
  };

  const handleEvaluate = (agreed: boolean) => {
    if (!agreed) {
      speak("You might be right! Real battles always have surprises. That's what makes nature so amazing!", { rate: 0.85 });
    }
    if (savedBattleIdRef.current) {
      updateBattleMeta(savedBattleIdRef.current, { wes_agreed_with_result: agreed });
    }
    setPhase('evaluate');
  };

  const resetBattle = () => {
    setWesAnimal(null);
    setOpponent(null);
    setPrediction(null);
    setBattleResult(null);
    setExplanation('');
    setBreakdown(null);
    setBreakdownOpen(false);
    setBreakdownLoading(false);
    setSavedBattleId(null);
    savedBattleIdRef.current = null;
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

  const breakdownWinner = battleResult && !battleResult.isTie
    ? ANIMALS.find(a => a.id === battleResult.winnerId)
    : null;
  const breakdownLoser = battleResult && !battleResult.isTie && wesAnimal && opponent
    ? (battleResult.winnerId === wesAnimal.id ? opponent : wesAnimal)
    : null;
  const breakdownWinnerLevel = battleResult
    ? (battleResult.winnerId && wesAnimal && battleResult.winnerId === wesAnimal.id
        ? battleResult.wesLevel
        : battleResult.opponentLevel)
    : 1;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-8">
      {showConfetti && <Confetti duration={4000} />}
      {breakdownWinner && breakdownLoser && (
        <BattleBreakdown
          open={breakdownOpen}
          winner={breakdownWinner}
          loser={breakdownLoser}
          winnerLevel={breakdownWinnerLevel}
          context="battle"
          data={breakdown}
          loading={breakdownLoading}
          onReact={handleBreakdownReact}
        />
      )}

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
          {/* Favorites filter */}
          {(() => {
            const favs = unlockedAnimals.filter(a => unlockOf(a.id)?.is_favorite);
            if (favs.length === 0) return null;
            return (
              <div className="flex gap-2 justify-center mb-3">
                <button
                  onClick={() => setShowOnlyFavorites(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${!showOnlyFavorites ? 'bg-white text-navy' : 'bg-gray-800 text-gray-300'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setShowOnlyFavorites(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${showOnlyFavorites ? 'bg-pink-500 text-white' : 'bg-gray-800 text-gray-300'}`}
                >
                  Favorites ❤️ ({favs.length})
                </button>
              </div>
            );
          })()}
          <div className="grid grid-cols-4 gap-2 mb-6 max-w-lg mx-auto">
            {(showOnlyFavorites
              ? unlockedAnimals.filter(a => unlockOf(a.id)?.is_favorite)
              : unlockedAnimals
            ).map(a => (
              <MiniCard key={a.id} animal={a} level={levelOf(a.id)} unlock={unlockOf(a.id)} selected={wesAnimal?.id === a.id} onClick={() => selectFighter(a)} />
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
              {(() => { const d = displayName(wesAnimal.name, unlockOf(wesAnimal.id)); return (
              <div className={`border-2 ${RB[wesAnimal.rarity]} rounded-xl p-3 bg-gray-900`}>
                <span className="text-5xl block mb-1">{wesAnimal.emoji}</span>
                <p className="font-bold text-sm" style={{ color: d.isChampion ? '#EAB308' : RARITY_COLORS[wesAnimal.rarity] }}>
                  {d.isChampion ? `👑 ${d.text}` : d.text}
                </p>
                <p className={`text-[10px] font-bold mt-0.5 ${levelOf(wesAnimal.id) >= 5 ? 'text-yellow-400' : 'text-gray-300'}`}>
                  Level {levelOf(wesAnimal.id)}{levelOf(wesAnimal.id) >= 5 ? ' ⭐ MAX' : ''}
                </p>
                <div className="text-[9px] mt-1 space-y-0.5">
                  <p>💪 <Stars n={wesAnimal.strength} /> ⚡ <Stars n={wesAnimal.speed} /> 🛡️ <Stars n={wesAnimal.defense} /></p>
                </div>
                <p className="text-yellow-400 text-xs font-bold mt-1">PWR {wesAnimal.powerLevel}</p>
              </div>
              ); })()}
            </div>
            <div className="font-retro text-2xl text-red-500 animate-pulse px-2">VS</div>
            <div className="text-center flex-1">
              {(() => { const d = displayName(opponent.name, unlockOf(opponent.id)); return (
              <div className={`border-2 ${RB[opponent.rarity]} rounded-xl p-3 bg-gray-900`}>
                <span className="text-5xl block mb-1">{opponent.emoji}</span>
                <p className="font-bold text-sm" style={{ color: d.isChampion ? '#EAB308' : RARITY_COLORS[opponent.rarity] }}>
                  {d.isChampion ? `👑 ${d.text}` : d.text}
                </p>
                <p className={`text-[10px] font-bold mt-0.5 ${levelOf(opponent.id) >= 5 ? 'text-yellow-400' : 'text-gray-300'}`}>
                  Level {levelOf(opponent.id)}{levelOf(opponent.id) >= 5 ? ' ⭐ MAX' : ''}
                </p>
                <div className="text-[9px] mt-1 space-y-0.5">
                  <p>💪 <Stars n={opponent.strength} /> ⚡ <Stars n={opponent.speed} /> 🛡️ <Stars n={opponent.defense} /></p>
                </div>
                <p className="text-yellow-400 text-xs font-bold mt-1">PWR {opponent.powerLevel}</p>
              </div>
              ); })()}
            </div>
          </div>

          {/* Terrain */}
          <div className="text-center mb-6 bg-gray-900 rounded-xl p-3">
            <p className="text-2xl mb-1">{getTerrainInfo(terrain).emoji}</p>
            <p className="font-retro text-xs text-yellow-400">{getTerrainInfo(terrain).name}</p>
            <p className="text-gray-400 text-xs">{getTerrainInfo(terrain).desc}</p>
          </div>

          {/* Prediction buttons */}
          {phase === 'predict' && (() => {
            const wesD = displayName(wesAnimal.name, unlockOf(wesAnimal.id));
            const oppD = displayName(opponent.name, unlockOf(opponent.id));
            return (
            <div className="space-y-3 animate-fade-in">
              <p className="text-center text-gray-400 text-sm mb-2">Who do you think wins?</p>
              <button onClick={() => makePrediction(wesAnimal.id)} disabled={buttonsLocked}
                className={`w-full py-4 rounded-xl font-bold text-lg active:scale-95 transition-all border-2 ${RB[wesAnimal.rarity]} bg-gray-900 disabled:opacity-50`}
                style={{ color: wesD.isChampion ? '#EAB308' : RARITY_COLORS[wesAnimal.rarity] }}>
                {wesD.isChampion ? `👑 ${wesD.text}` : wesD.text} WINS! 🐾
              </button>
              <button onClick={() => makePrediction('tie')} disabled={buttonsLocked}
                className="w-full py-4 rounded-xl font-bold text-lg active:scale-95 bg-gray-800 text-gray-300 disabled:opacity-50">
                IT&apos;S A TIE! 🤝
              </button>
              <button onClick={() => makePrediction(opponent.id)} disabled={buttonsLocked}
                className={`w-full py-4 rounded-xl font-bold text-lg active:scale-95 transition-all border-2 ${RB[opponent.rarity]} bg-gray-900 disabled:opacity-50`}
                style={{ color: oppD.isChampion ? '#EAB308' : RARITY_COLORS[opponent.rarity] }}>
                {oppD.isChampion ? `👑 ${oppD.text}` : oppD.text} WINS! 🐾
              </button>
            </div>
            );
          })()}
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
