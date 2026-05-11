// ── Battle Matchup Modifiers ──
// Adds biological/realistic advantages on top of raw stats.
// Used by /lib/battleEngine.ts during battle calculation.

export type ModifierType = 'venom' | 'venom_resistance' | 'size' | 'ambush' | 'pack_note';

export interface AppliedModifier {
  type: ModifierType;
  bonus: number;
  description: string;
}

// ── Venom ────────────────────────────────────────────────────────────────
// Venomous animals get +12 against opponents with no venom resistance.
// Resistant animals negate the bonus and instead gain +6 ("partial advantage").

export const VENOMOUS_ANIMALS: string[] = [
  'box_jellyfish',
  'irukandji_jellyfish',
  'cone_snail',
  'deathstalker_scorpion',
  'blue_ringed_octopus',
  'portuguese_man_o_war',
  'king_cobra',
  'stonefish',
  'fire_salamander',
  'platypus',
  'komodo_dragon',
  'electric_eel',
];

export const VENOM_RESISTANT: string[] = [
  'honey_badger',
  'wolverine',
  'secretary_bird',
  'mongoose',
];

export const VENOM_BONUS = 12;
export const VENOM_PARTIAL_RESIST_BONUS = 6;

// ── Size Tiers ───────────────────────────────────────────────────────────
// 0=Tiny, 1=Small, 2=Medium, 3=Large, 4=Enormous

export const SIZE_TIERS: Record<string, number> = {
  // Tiny (under 30cm)
  mantis_shrimp: 0,
  pistol_shrimp: 0,
  blue_ringed_octopus: 0,
  tardigrade: 0,
  irukandji_jellyfish: 0,
  cone_snail: 0,
  star_nosed_mole: 0,
  bombardier_beetle: 0,
  mantis_shrimp_peacock: 0,
  mantis_shrimp_spearing: 0,
  pistol_shrimp_snapping: 0,
  pink_fairy_armadillo: 0,

  // Tiny (additional)
  tarantula: 0,
  scorpion: 0,
  deathstalker_scorpion: 0,
  horned_lizard: 0,

  // Small (30cm to 1m)
  vampire_bat: 1,
  quokka: 1,
  axolotl: 1,
  fire_salamander: 1,
  mudskipper: 1,
  flying_fish: 1,
  aye_aye: 1,
  binturong: 1,
  porcupine: 1,
  chameleon: 1,
  thorny_dragon: 1,
  hagfish: 1,
  flying_snake: 1,
  lyrebird: 1,
  greater_roadrunner: 1,
  sloth: 1,
  koala: 1,
  platypus: 1,
  piranha: 1,
  okapi: 2, // adjusted — okapi is medium

  // Medium (1m to 3m)
  cheetah: 2,
  jaguar: 2,
  hammerhead_shark: 2,
  bald_eagle: 2,
  golden_eagle: 2,
  harpy_eagle: 2,
  bull_shark: 3,
  barracuda: 2,
  wolf: 2,
  hyena: 2,
  wolverine: 2,
  honey_badger: 2,
  tasmanian_devil: 2,
  sun_bear: 2,
  wombat: 2,
  narwhal: 2,
  secretary_bird: 2,
  fossa: 2,
  cassowary: 2,
  shoebill_stork: 2,
  king_cobra: 2,
  boa_constrictor: 2,
  komodo_dragon: 2,
  pangolin: 2,
  giant_squid: 4, // largest tentacle reach — enormous
  electric_eel: 2,
  manta_ray: 3,
  orca: 4,
  stonefish: 1,
  geoduck: 2,
  mimic_octopus: 2,
  immortal_jellyfish: 0,
  box_jellyfish: 1,
  portuguese_man_o_war: 2,
  giant_isopod: 1,
  electric_torpedo_ray: 2,
  moonfish: 3,

  // Large (3m to 6m)
  grizzly_bear: 3,
  polar_bear: 3,
  gorilla: 3,
  hippo: 3,
  hippopotamus: 3,
  giant_pacific_octopus: 3,
  nile_crocodile: 3,
  cape_buffalo: 3,
  snapping_turtle: 3,
  giant_clam: 3,
  moose: 3,
  siberian_tiger: 3,
  lion: 3,
  bear: 3,

  // Enormous (6m and over)
  african_elephant: 4,
  elephant: 4,
  blue_whale: 4,
  great_white_shark: 4,
  green_anaconda: 4,
  saltwater_crocodile: 4,
  ocean_sunfish: 4,
  giant_anaconda: 4,
};

export const SIZE_BONUS_LARGE = 8;     // attacker 2+ tiers larger
export const SIZE_BONUS_SMALL = 4;     // attacker 1 tier larger
export const SIZE_PENALTY_SMALLER = -3;

// ── Ambush Predators ─────────────────────────────────────────────────────
// Get +6 vs slow opponents (SPD 1 or 2)

export const AMBUSH_PREDATORS: string[] = [
  'saltwater_crocodile',
  'nile_crocodile',
  'stonefish',
  'cone_snail',
  'giant_isopod',
  'geoduck',
  'giant_clam',
  'shoebill_stork',
  'chameleon',
  'mimic_octopus',
  'alligator',
  'snapping_turtle',
];

export const AMBUSH_BONUS = 6;
export const AMBUSH_SLOW_THRESHOLD = 2; // opponent SPD <= this triggers it

// ── Pack Hunters (narrative only) ────────────────────────────────────────

export const PACK_HUNTERS: string[] = [
  'wolf',
  'hyena',
  'piranha',
  'pistol_shrimp_snapping',
  'orca',
];

// ── Computed modifier helpers ────────────────────────────────────────────

export function getSizeTier(animalId: string): number {
  return SIZE_TIERS[animalId] ?? 2; // default to medium when unknown
}

export interface ModifiersForAttacker {
  bonus: number;
  applied: AppliedModifier[];
}

export function computeModifiersFor(
  attackerId: string,
  attackerName: string,
  defenderId: string,
  defenderName: string,
  defenderSpeed: number,
): ModifiersForAttacker {
  const applied: AppliedModifier[] = [];
  let bonus = 0;

  // Venom bonus
  if (VENOMOUS_ANIMALS.includes(attackerId)) {
    if (VENOM_RESISTANT.includes(defenderId)) {
      // Resistant defender — no bonus to attacker.
    } else {
      bonus += VENOM_BONUS;
      applied.push({
        type: 'venom',
        bonus: VENOM_BONUS,
        description: `${attackerName}'s venom gave it a decisive advantage — ${defenderName} has no resistance and could not protect itself.`,
      });
    }
  }

  // Venom resistance — attacker resists defender's venom and gains partial advantage.
  if (VENOM_RESISTANT.includes(attackerId) && VENOMOUS_ANIMALS.includes(defenderId)) {
    bonus += VENOM_PARTIAL_RESIST_BONUS;
    applied.push({
      type: 'venom_resistance',
      bonus: VENOM_PARTIAL_RESIST_BONUS,
      description: `${attackerName} has evolved resistance to venom — ${defenderName}'s chemical weapons had little effect.`,
    });
  }

  // Size bonus
  const at = getSizeTier(attackerId);
  const dt = getSizeTier(defenderId);
  const diff = at - dt;
  if (diff >= 2) {
    bonus += SIZE_BONUS_LARGE;
    applied.push({
      type: 'size',
      bonus: SIZE_BONUS_LARGE,
      description: `${attackerName} is dramatically larger than ${defenderName} — sheer physical mass gave it an overwhelming advantage.`,
    });
  } else if (diff === 1) {
    bonus += SIZE_BONUS_SMALL;
    applied.push({
      type: 'size',
      bonus: SIZE_BONUS_SMALL,
      description: `${attackerName} is noticeably larger than ${defenderName} — that extra size matters in a direct fight.`,
    });
  } else if (diff < 0) {
    bonus += SIZE_PENALTY_SMALLER;
    // No descriptive entry pushed — penalty is silent narrative-wise.
  }

  // Ambush bonus
  if (AMBUSH_PREDATORS.includes(attackerId) && defenderSpeed <= AMBUSH_SLOW_THRESHOLD) {
    bonus += AMBUSH_BONUS;
    applied.push({
      type: 'ambush',
      bonus: AMBUSH_BONUS,
      description: `${attackerName} is a specialist ambush predator — ${defenderName}'s low speed meant it could not escape before the strike landed.`,
    });
  }

  return { bonus, applied };
}

export function isPackHunter(animalId: string): boolean {
  return PACK_HUNTERS.includes(animalId);
}
