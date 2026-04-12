import { Animal } from '@/data/animals';

export type Terrain = 'ocean' | 'jungle' | 'arctic' | 'desert' | 'grassland';

export const TERRAINS: { id: Terrain; emoji: string; name: string; desc: string }[] = [
  { id: 'ocean', emoji: '🌊', name: 'OCEAN', desc: 'The battle takes place in the open ocean!' },
  { id: 'jungle', emoji: '🌴', name: 'JUNGLE', desc: 'Deep in the jungle, two animals meet!' },
  { id: 'arctic', emoji: '❄️', name: 'ARCTIC', desc: 'A frozen battle in the Arctic tundra!' },
  { id: 'desert', emoji: '🏜️', name: 'DESERT', desc: 'Scorching heat in the desert arena!' },
  { id: 'grassland', emoji: '🌿', name: 'GRASSLAND', desc: 'An open field showdown!' },
];

const TERRAIN_BONUSES: Record<Terrain, string[]> = {
  ocean: ['great_white_shark', 'blue_whale', 'orca', 'manta_ray', 'giant_squid', 'electric_eel', 'pistol_shrimp', 'hammerhead_shark', 'bull_shark', 'barracuda', 'piranha'],
  arctic: ['polar_bear', 'wolverine', 'lynx', 'snapping_turtle', 'moose'],
  jungle: ['siberian_tiger', 'jaguar', 'green_anaconda', 'king_cobra', 'gorilla', 'tarantula', 'chameleon', 'boa_constrictor', 'cassowary'],
  desert: ['komodo_dragon', 'horned_lizard', 'chameleon'],
  grassland: [],
};

export function randomTerrain(): Terrain {
  const idx = Math.floor(Math.random() * TERRAINS.length);
  return TERRAINS[idx].id;
}

export function getTerrainInfo(t: Terrain) {
  return TERRAINS.find(x => x.id === t)!;
}

function baseScore(animal: Animal): number {
  return (animal.strength * 3) + (animal.speed * 2) + (animal.defense * 2) + animal.powerLevel;
}

function terrainBonus(animalId: string, terrain: Terrain): number {
  return TERRAIN_BONUSES[terrain]?.includes(animalId) ? 15 : 0;
}

function randomFactor(): number {
  return Math.floor(Math.random() * 11) - 5; // -5 to +5
}

export interface BattleResult {
  wesScore: number;
  opponentScore: number;
  winnerId: string | null;
  isTie: boolean;
  wesRandom: number;
  opponentRandom: number;
  wesTerrainBonus: number;
  opponentTerrainBonus: number;
}

export function calculateBattle(wesAnimal: Animal, opponent: Animal, terrain: Terrain): BattleResult {
  const wesRandom = randomFactor();
  const opponentRandom = randomFactor();
  const wesTerrainBonus = terrainBonus(wesAnimal.id, terrain);
  const opponentTerrainBonus = terrainBonus(opponent.id, terrain);

  const wesScore = baseScore(wesAnimal) + wesTerrainBonus + wesRandom;
  const opponentScore = baseScore(opponent) + opponentTerrainBonus + opponentRandom;

  const diff = Math.abs(wesScore - opponentScore);
  const isTie = diff <= 3;
  const winnerId = isTie ? null : (wesScore > opponentScore ? wesAnimal.id : opponent.id);

  return { wesScore, opponentScore, winnerId, isTie, wesRandom, opponentRandom, wesTerrainBonus, opponentTerrainBonus };
}
