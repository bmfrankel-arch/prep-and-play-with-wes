import { Animal } from '@/data/animals';
import { LeveledStats, AnimalLevel, getLeveledStatsFor } from '@/lib/animalLeveling';
import { AnimalUnlock } from '@/lib/types';
import { AppliedModifier, computeModifiersFor } from '@/data/battleModifiers';

export type Terrain = 'ocean' | 'jungle' | 'arctic' | 'desert' | 'grassland';

export const TERRAINS: { id: Terrain; emoji: string; name: string; desc: string }[] = [
  { id: 'ocean', emoji: '🌊', name: 'OCEAN', desc: 'The battle takes place in the open ocean!' },
  { id: 'jungle', emoji: '🌴', name: 'JUNGLE', desc: 'Deep in the jungle, two animals meet!' },
  { id: 'arctic', emoji: '❄️', name: 'ARCTIC', desc: 'A frozen battle in the Arctic tundra!' },
  { id: 'desert', emoji: '🏜️', name: 'DESERT', desc: 'Scorching heat in the desert arena!' },
  { id: 'grassland', emoji: '🌿', name: 'GRASSLAND', desc: 'An open field showdown!' },
];

const TERRAIN_BONUSES: Record<Terrain, string[]> = {
  ocean: [
    'great_white_shark', 'blue_whale', 'orca', 'manta_ray', 'giant_squid', 'electric_eel',
    'pistol_shrimp', 'hammerhead_shark', 'bull_shark', 'barracuda', 'piranha',
    // Expansion pack — ocean dwellers
    'box_jellyfish', 'portuguese_man_o_war', 'irukandji_jellyfish', 'immortal_jellyfish',
    'blue_ringed_octopus', 'giant_pacific_octopus', 'stonefish', 'giant_clam', 'geoduck',
    'giant_isopod', 'cone_snail', 'electric_torpedo_ray', 'moonfish', 'mantis_shrimp_peacock',
    'mantis_shrimp_spearing', 'pistol_shrimp_snapping', 'hagfish', 'flying_fish', 'vampire_bat',
  ],
  arctic: [
    'polar_bear', 'wolverine', 'lynx', 'snapping_turtle', 'moose',
    // Expansion pack — cold climates
    'narwhal', 'sun_bear',
  ],
  jungle: [
    'siberian_tiger', 'jaguar', 'green_anaconda', 'king_cobra', 'gorilla', 'tarantula',
    'chameleon', 'boa_constrictor', 'cassowary',
    // Expansion pack — forest / canopy / coral reef
    'sloth', 'koala', 'harpy_eagle', 'fossa', 'binturong', 'aye_aye', 'lyrebird',
    'flying_snake', 'blue_ringed_octopus', 'mudskipper', 'mimic_octopus',
  ],
  desert: [
    'komodo_dragon', 'horned_lizard', 'chameleon',
    // Expansion pack — arid specialists
    'deathstalker_scorpion', 'thorny_dragon', 'pink_fairy_armadillo', 'greater_roadrunner',
    'bombardier_beetle', 'star_nosed_mole',
  ],
  grassland: [],
};

export const TERRAIN_BONUS_VALUE = 15;
export const TIE_ZONE = 5;

export function randomTerrain(): Terrain {
  const idx = Math.floor(Math.random() * TERRAINS.length);
  return TERRAINS[idx].id;
}

export function getTerrainInfo(t: Terrain) {
  return TERRAINS.find(x => x.id === t)!;
}

// ── New balanced scoring formula ──
// Score = (STR × 4) + (SPD × 3) + (DEF × 2) + (PWR × 0.3) + Terrain + Modifiers + Random(±8)
function leveledScore(stats: LeveledStats): number {
  return (stats.strength * 4) + (stats.speed * 3) + (stats.defense * 2) + (stats.powerLevel * 0.3);
}

function terrainBonus(animalId: string, terrain: Terrain): number {
  return TERRAIN_BONUSES[terrain]?.includes(animalId) ? TERRAIN_BONUS_VALUE : 0;
}

function randomFactor(): number {
  return Math.floor(Math.random() * 17) - 8; // -8 to +8
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
  wesLevel: AnimalLevel;
  opponentLevel: AnimalLevel;
  wesModifiers: AppliedModifier[];
  opponentModifiers: AppliedModifier[];
  scoreDifference: number;
}

export function calculateBattle(
  wesAnimal: Animal,
  opponent: Animal,
  terrain: Terrain,
  wesUnlock?: AnimalUnlock,
  opponentUnlock?: AnimalUnlock,
): BattleResult {
  const wesStats = getLeveledStatsFor(wesAnimal, wesUnlock ? {
    animal_id: wesAnimal.id,
    current_level: ((wesUnlock.current_level ?? 1) as AnimalLevel),
    current_xp: wesUnlock.current_xp ?? 0,
    xp_to_next_level: wesUnlock.xp_to_next_level ?? 100,
    level_bonuses: wesUnlock.level_bonuses ?? { strength: 0, speed: 0, defense: 0, powerLevel: 0 },
    total_xp_earned: wesUnlock.total_xp_earned ?? 0,
    is_max_level: wesUnlock.is_max_level ?? false,
  } : null);
  const opponentStats = getLeveledStatsFor(opponent, opponentUnlock ? {
    animal_id: opponent.id,
    current_level: ((opponentUnlock.current_level ?? 1) as AnimalLevel),
    current_xp: opponentUnlock.current_xp ?? 0,
    xp_to_next_level: opponentUnlock.xp_to_next_level ?? 100,
    level_bonuses: opponentUnlock.level_bonuses ?? { strength: 0, speed: 0, defense: 0, powerLevel: 0 },
    total_xp_earned: opponentUnlock.total_xp_earned ?? 0,
    is_max_level: opponentUnlock.is_max_level ?? false,
  } : null);

  const wesRandom = randomFactor();
  const opponentRandom = randomFactor();
  const wesTerrainBonus = terrainBonus(wesAnimal.id, terrain);
  const opponentTerrainBonus = terrainBonus(opponent.id, terrain);

  // Matchup modifiers (venom / size / ambush)
  const wesMods = computeModifiersFor(
    wesAnimal.id, wesAnimal.name,
    opponent.id, opponent.name,
    opponentStats.speed,
  );
  const opponentMods = computeModifiersFor(
    opponent.id, opponent.name,
    wesAnimal.id, wesAnimal.name,
    wesStats.speed,
  );

  const wesScore = Math.round(
    leveledScore(wesStats) + wesTerrainBonus + wesMods.bonus + wesRandom
  );
  const opponentScore = Math.round(
    leveledScore(opponentStats) + opponentTerrainBonus + opponentMods.bonus + opponentRandom
  );

  const diff = Math.abs(wesScore - opponentScore);
  const isTie = diff <= TIE_ZONE;
  const winnerId = isTie ? null : (wesScore > opponentScore ? wesAnimal.id : opponent.id);

  return {
    wesScore,
    opponentScore,
    winnerId,
    isTie,
    wesRandom,
    opponentRandom,
    wesTerrainBonus,
    opponentTerrainBonus,
    wesLevel: wesStats.level,
    opponentLevel: opponentStats.level,
    wesModifiers: wesMods.applied,
    opponentModifiers: opponentMods.applied,
    scoreDifference: diff,
  };
}
