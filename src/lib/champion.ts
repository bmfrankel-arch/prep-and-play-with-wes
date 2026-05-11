// ── Champion name display helper ──
// When an animal reaches Level 5 (max) Wes can name it. If a champion_name
// exists, prefer that name everywhere with a 👑 prefix and gold styling.

import { AnimalUnlock } from '@/lib/types';

export interface DisplayName {
  /** The name to render (champion_name if present, else fallbackName) */
  text: string;
  /** True when this is a champion-styled name — caller should render in gold + crown */
  isChampion: boolean;
}

export function displayName(fallbackName: string, unlock?: AnimalUnlock | null): DisplayName {
  if (unlock?.champion_name && unlock.is_max_level) {
    return { text: unlock.champion_name, isChampion: true };
  }
  return { text: fallbackName, isChampion: false };
}

/** Returns the visible string with crown when applicable — convenient for TTS/labels. */
export function championLabel(fallbackName: string, unlock?: AnimalUnlock | null): string {
  const d = displayName(fallbackName, unlock);
  return d.isChampion ? `👑 ${d.text}` : d.text;
}
