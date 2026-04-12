import { ANIMALS, Animal, AnimalRarity, RARITY_ORDER } from '@/data/animals';
import { AnimalUnlock } from './types';

// Determine rarity tier based on quiz score
function pickRarity(score: number, total: number): AnimalRarity {
  const ratio = score / total;
  const roll = Math.random();

  if (ratio >= 1.0) return 'legendary';
  if (ratio >= 0.8) return roll < 0.3 ? 'legendary' : 'epic';
  if (ratio >= 0.6) return roll < 0.3 ? 'epic' : 'rare';
  return roll < 0.2 ? 'rare' : 'common';
}

// Select an animal that hasn't been unlocked yet
export function selectAnimal(score: number, total: number, unlocked: AnimalUnlock[]): Animal | null {
  const unlockedIds = new Set(unlocked.map(u => u.animal_id));

  // If all 50 are unlocked, return null (complete collection)
  if (unlockedIds.size >= ANIMALS.length) return null;

  const targetRarity = pickRarity(score, total);
  const targetIdx = RARITY_ORDER.indexOf(targetRarity);

  // Try the target tier first, then move up through tiers
  for (let i = targetIdx; i < RARITY_ORDER.length; i++) {
    const tier = RARITY_ORDER[i];
    const available = ANIMALS.filter(a => a.rarity === tier && !unlockedIds.has(a.id));
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }
  }

  // If no animals available in target+ tiers, try lower tiers
  for (let i = targetIdx - 1; i >= 0; i--) {
    const tier = RARITY_ORDER[i];
    const available = ANIMALS.filter(a => a.rarity === tier && !unlockedIds.has(a.id));
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }
  }

  return null;
}
