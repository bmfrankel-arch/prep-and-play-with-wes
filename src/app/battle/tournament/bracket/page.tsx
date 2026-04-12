'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ANIMALS, AnimalRarity, RARITY_COLORS } from '@/data/animals';
import { getCurrentTournament, saveTournament, saveBattle, getBattleStats, saveBattleStats } from '@/lib/db';
import { Tournament } from '@/lib/types';
import { speak, speakCelebration } from '@/lib/speech';
import { calculateBattle, getTerrainInfo, Terrain } from '@/lib/battleEngine';
import Confetti from '@/components/Confetti';

const RB: Record<AnimalRarity, string> = { common: 'border-green-500', rare: 'border-blue-500', epic: 'border-purple-500', legendary: 'border-yellow-400' };
const ROUND_NAMES = ['', 'QUARTER FINALS', 'SEMI FINALS', 'THE FINAL'];

type Phase = 'bracket' | 'matchup' | 'predict' | 'battle' | 'result' | 'champion';

export default function TournamentBracketPage() {
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [phase, setPhase] = useState<Phase>('bracket');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setPrediction] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = getCurrentTournament();
    if (!t || t.completed_at) { router.push('/battle/tournament/setup'); return; }
    setTournament(t);
    setLoading(false);
  }, [router]);

  const getAnimal = (id: string) => ANIMALS.find(a => a.id === id);
  // const getMatch = (round: number, idx: number) => tournament?.bracket_state.find(m => m.round === round && m.match_index === idx);

  const currentMatchData = tournament?.bracket_state[tournament.current_match] ?? null;
  const animal1 = currentMatchData ? getAnimal(currentMatchData.animal1_id) : null;
  const animal2 = currentMatchData ? getAnimal(currentMatchData.animal2_id) : null;

  const fightCurrentMatch = () => {
    if (!currentMatchData || !animal1 || !animal2) return;
    setPhase('matchup');
    const ti = getTerrainInfo(currentMatchData.terrain as Terrain);
    speak(`${animal1.name} versus ${animal2.name}! In the ${ti.name}! Who would WIN?`, { rate: 0.85, pitch: 1.0 });
    setTimeout(() => setPhase('predict'), 4000);
  };

  const makePrediction = (pred: string) => {
    if (!tournament || !currentMatchData || !animal1 || !animal2) return;
    setPrediction(pred);
    setPhase('battle');

    const result = calculateBattle(animal1, animal2, currentMatchData.terrain as Terrain);
    const winnerId = result.isTie ? (result.wesScore >= result.opponentScore ? animal1.id : animal2.id) : result.winnerId!;
    const predictedCorrectly = pred === winnerId;

    // Update match in bracket
    const newBracket = [...tournament.bracket_state];
    const matchIdx = tournament.current_match;
    newBracket[matchIdx] = {
      ...newBracket[matchIdx],
      winner_id: winnerId,
      score1: result.wesScore,
      score2: result.opponentScore,
      wes_prediction: pred,
      wes_correct: predictedCorrectly,
    };

    // Advance winner to next round
    const match = newBracket[matchIdx];
    if (match.round === 1) {
      const sfIdx = 4 + Math.floor(match.match_index / 2);
      if (match.match_index % 2 === 0) newBracket[sfIdx].animal1_id = winnerId;
      else newBracket[sfIdx].animal2_id = winnerId;
    } else if (match.round === 2) {
      if (match.match_index === 0) newBracket[6].animal1_id = winnerId;
      else newBracket[6].animal2_id = winnerId;
    }

    const nextMatch = matchIdx + 1;
    const totalCorrect = tournament.total_correct_predictions + (predictedCorrectly ? 1 : 0);

    // Update stats
    const stats = getBattleStats();
    stats.total_battles++;
    if (predictedCorrectly) { stats.total_wins_predicted++; stats.current_streak++; if (stats.current_streak > stats.best_streak) stats.best_streak = stats.current_streak; }
    else stats.current_streak = 0;
    saveBattleStats(stats);

    // Save battle record
    saveBattle({
      wes_animal_id: animal1.id, opponent_animal_id: animal2.id,
      terrain: currentMatchData.terrain, wes_animal_score: result.wesScore,
      opponent_score: result.opponentScore, winner_animal_id: winnerId,
      is_tie: false, wes_prediction: pred, wes_predicted_correctly: predictedCorrectly,
      battle_explanation: '', wes_agreed_with_result: null,
    });

    setTimeout(() => {
      const winner = getAnimal(winnerId);
      if (predictedCorrectly) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        speakCelebration(`${winner?.name} wins! Great prediction, Wes!`);
      } else {
        speak(`${winner?.name} wins this match!`);
      }

      // Check if tournament complete
      const isChampion = nextMatch >= 7;
      const updated: Tournament = {
        ...tournament,
        bracket_state: newBracket,
        current_match: isChampion ? 6 : nextMatch,
        current_round: isChampion ? 3 : (nextMatch < 4 ? 1 : nextMatch < 6 ? 2 : 3),
        total_correct_predictions: totalCorrect,
        champion_animal_id: isChampion ? winnerId : null,
        completed_at: isChampion ? new Date().toISOString() : null,
      };
      setTournament(updated);
      saveTournament(updated);

      if (isChampion) {
        setTimeout(() => setPhase('champion'), 2000);
      } else {
        setTimeout(() => { setPhase('bracket'); setPrediction(null); }, 2000);
      }
    }, 3000);
  };

  if (loading || !tournament) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-6xl animate-bounce">🏆</div></div>;

  // Champion screen
  if (phase === 'champion') {
    const champ = getAnimal(tournament.champion_animal_id || '');
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <Confetti duration={10000} />
        <div className="text-center">
          <p className="text-6xl mb-2 animate-spin-slow">👑</p>
          <p className="text-8xl mb-4">{champ?.emoji}</p>
          <h1 className="font-retro text-xl text-yellow-400 mb-2">ULTIMATE CHAMPION!</h1>
          <p className="text-2xl font-bold text-white mb-2">{champ?.name}</p>
          <p className="text-sm text-gray-400 mb-6">Won the tournament! Predictions correct: {tournament.total_correct_predictions}/7</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => { saveTournament({ ...tournament }); router.push('/battle/tournament/setup'); }} className="bg-yellow-500 text-navy font-bold px-8 py-3 rounded-xl active:scale-95">New Tournament! 🔄</button>
            <button onClick={() => router.push('/')} className="text-gray-500 font-bold">🏠 Home</button>
          </div>
        </div>
      </div>
    );
  }

  // Matchup / Predict / Battle phases
  if ((phase === 'matchup' || phase === 'predict' || phase === 'battle' || phase === 'result') && animal1 && animal2) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-4">
        {showConfetti && <Confetti duration={3000} />}
        <p className="text-center font-retro text-xs text-yellow-400 mb-4">{ROUND_NAMES[currentMatchData?.round || 1]}</p>

        <div className="flex items-center justify-center gap-2 mb-4 max-w-lg mx-auto">
          <div className={`text-center flex-1 border-2 ${RB[animal1.rarity]} rounded-xl p-3 bg-gray-900`}>
            <span className="text-5xl block mb-1">{animal1.emoji}</span>
            <p className="font-bold text-sm" style={{ color: RARITY_COLORS[animal1.rarity] }}>{animal1.name}</p>
            <p className="text-yellow-400 text-xs font-bold">PWR {animal1.powerLevel}</p>
          </div>
          <div className="font-retro text-2xl text-red-500 animate-pulse">VS</div>
          <div className={`text-center flex-1 border-2 ${RB[animal2.rarity]} rounded-xl p-3 bg-gray-900`}>
            <span className="text-5xl block mb-1">{animal2.emoji}</span>
            <p className="font-bold text-sm" style={{ color: RARITY_COLORS[animal2.rarity] }}>{animal2.name}</p>
            <p className="text-yellow-400 text-xs font-bold">PWR {animal2.powerLevel}</p>
          </div>
        </div>

        {phase === 'predict' && (
          <div className="max-w-lg mx-auto space-y-3 animate-fade-in">
            <p className="text-center text-gray-400 text-sm mb-2">Who wins?</p>
            <button onClick={() => makePrediction(animal1.id)} className={`w-full py-4 rounded-xl font-bold text-lg active:scale-95 border-2 ${RB[animal1.rarity]} bg-gray-900`} style={{ color: RARITY_COLORS[animal1.rarity] }}>{animal1.name} WINS!</button>
            <button onClick={() => makePrediction(animal2.id)} className={`w-full py-4 rounded-xl font-bold text-lg active:scale-95 border-2 ${RB[animal2.rarity]} bg-gray-900`} style={{ color: RARITY_COLORS[animal2.rarity] }}>{animal2.name} WINS!</button>
          </div>
        )}

        {phase === 'battle' && <div className="flex items-center justify-center mt-12"><p className="font-retro text-sm text-yellow-400 animate-pulse">BATTLING...</p></div>}
      </div>
    );
  }

  // Bracket view
  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-8">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push('/battle')} className="text-gray-400 font-bold text-sm">← Arena</button>
        <h1 className="font-retro text-xs text-yellow-400">TOURNAMENT 🏆</h1>
        <button onClick={() => router.push('/')} className="text-gray-400 font-bold text-sm">Home</button>
      </div>

      <p className="text-center font-retro text-xs text-gray-500 mb-4">{ROUND_NAMES[tournament.current_round]}</p>

      {/* Bracket grid */}
      <div className="max-w-lg mx-auto space-y-4">
        {[1, 2, 3].map(round => {
          const matches = tournament.bracket_state.filter(m => m.round === round);
          return (
            <div key={round}>
              <p className="text-[10px] font-retro text-gray-600 mb-2">{ROUND_NAMES[round]}</p>
              <div className="space-y-2">
                {matches.map((m, i) => {
                  const a1 = getAnimal(m.animal1_id);
                  const a2 = getAnimal(m.animal2_id);
                  const isCurrent = tournament.bracket_state.indexOf(m) === tournament.current_match && !m.winner_id;
                  return (
                    <div key={i} className={`flex items-center gap-2 p-2 rounded-xl ${isCurrent ? 'bg-yellow-900/30 border border-yellow-500' : 'bg-gray-900'}`}>
                      <div className={`flex-1 flex items-center gap-1 ${m.winner_id === m.animal1_id ? '' : m.winner_id ? 'opacity-40' : ''}`}>
                        <span className="text-xl">{a1?.emoji || '❓'}</span>
                        <span className="text-[10px] font-bold truncate">{a1?.name || 'TBD'}</span>
                        {m.winner_id === m.animal1_id && <span className="text-green-400 text-xs">✓</span>}
                      </div>
                      <span className="text-[10px] text-gray-600 font-retro">VS</span>
                      <div className={`flex-1 flex items-center gap-1 justify-end ${m.winner_id === m.animal2_id ? '' : m.winner_id ? 'opacity-40' : ''}`}>
                        {m.winner_id === m.animal2_id && <span className="text-green-400 text-xs">✓</span>}
                        <span className="text-[10px] font-bold truncate text-right">{a2?.name || 'TBD'}</span>
                        <span className="text-xl">{a2?.emoji || '❓'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fight button */}
      {currentMatchData && !currentMatchData.winner_id && animal1 && animal2 && (
        <div className="mt-6 text-center">
          <button onClick={fightCurrentMatch} className="bg-red-600 text-white font-bold px-8 py-4 rounded-xl text-lg active:scale-95 animate-pulse">
            FIGHT NEXT BATTLE! ⚔️
          </button>
        </div>
      )}
    </div>
  );
}
