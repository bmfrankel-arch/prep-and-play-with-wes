'use client';

import { useEffect, useState } from 'react';
import { Animal, ANIMALS } from '@/data/animals';
import { AnimalUnlock } from '@/lib/types';
import { LevelUpEvent, XpSource } from '@/lib/animalLeveling';
import { awardXpAndPersist, getAnimalCollection, saveAnimalUnlock } from '@/lib/db';
import { selectAnimal } from '@/lib/animalSelection';
import AnimalTrainingScreen from './AnimalTrainingScreen';
import AnimalLevelUpSequence from './AnimalLevelUpSequence';
import AnimalUnlockSequence from './AnimalUnlockSequence';

type Phase = 'idle' | 'training' | 'leveling' | 'unlock' | 'done';

interface Props {
  active: boolean;
  xpEarned: number;
  xpSource: XpSource;
  score: number;
  total: number;
  // Whether to attempt unlocking a new animal as part of this completion
  attemptUnlock: boolean;
  onComplete: () => void;
}

export default function PostSessionFlow({
  active,
  xpEarned,
  xpSource,
  score,
  total,
  attemptUnlock,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [collection, setCollection] = useState<AnimalUnlock[]>([]);
  const [trainedAnimal, setTrainedAnimal] = useState<Animal | null>(null);
  const [levelEvents, setLevelEvents] = useState<LevelUpEvent[]>([]);
  const [unlockedAnimal, setUnlockedAnimal] = useState<Animal | null>(null);
  const [unlockSaveStatus, setUnlockSaveStatus] = useState<'saved' | 'failed' | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      const col = await getAnimalCollection();
      if (cancelled) return;
      setCollection(col);
      setLoaded(true);
      // If no animals at all and we should attempt unlock, skip training and go straight to unlock
      if (col.length === 0) {
        if (attemptUnlock) {
          await tryUnlock(col);
          // tryUnlock advances phase
          return;
        }
        // No animals + no unlock attempt = done. Award to bonus pool just in case.
        if (xpEarned > 0) await awardXpAndPersist('__bonus_pool__', xpSource, xpEarned, score, total);
        setPhase('done');
        return;
      }
      setPhase('training');
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(onComplete, 50);
      return () => clearTimeout(t);
    }
  }, [phase, onComplete]);

  const tryUnlock = async (currentCol: AnimalUnlock[]) => {
    if (!attemptUnlock) {
      setPhase('done');
      return;
    }
    try {
      const animal = selectAnimal(score, total, currentCol);
      if (!animal) {
        setPhase('done');
        return;
      }
      setUnlockedAnimal(animal);
      const { saved } = await saveAnimalUnlock({
        animal_id: animal.id,
        rarity: animal.rarity,
        quiz_score_when_unlocked: score,
        quiz_type_when_unlocked: xpSource,
      });
      setUnlockSaveStatus(saved ? 'saved' : 'failed');
      setPhase('unlock');
    } catch {
      setPhase('done');
    }
  };

  const handleTrainPick = async (animalId: string) => {
    if (xpEarned > 0) {
      const result = await awardXpAndPersist(animalId, xpSource, xpEarned, score, total);
      if (animalId !== '__bonus_pool__') {
        const animal = ANIMALS.find(a => a.id === animalId);
        if (animal && result.events.length > 0) {
          setTrainedAnimal(animal);
          setLevelEvents(result.events);
          setPhase('leveling');
          return;
        }
      }
    }
    // No level-up to show — proceed to unlock attempt
    await tryUnlock(collection);
  };

  const handleLevelingDone = async () => {
    setTrainedAnimal(null);
    setLevelEvents([]);
    await tryUnlock(collection);
  };

  const handleUnlockDone = () => {
    setPhase('done');
  };

  if (!active || !loaded) return null;

  if (phase === 'training') {
    return (
      <AnimalTrainingScreen
        unlockedAnimals={collection}
        xpEarned={xpEarned}
        onPick={handleTrainPick}
      />
    );
  }

  if (phase === 'leveling' && trainedAnimal) {
    return (
      <AnimalLevelUpSequence
        animal={trainedAnimal}
        events={levelEvents}
        onComplete={handleLevelingDone}
      />
    );
  }

  if (phase === 'unlock' && unlockedAnimal) {
    return (
      <AnimalUnlockSequence
        animal={unlockedAnimal}
        onComplete={handleUnlockDone}
        saveStatus={unlockSaveStatus}
      />
    );
  }

  return null;
}
