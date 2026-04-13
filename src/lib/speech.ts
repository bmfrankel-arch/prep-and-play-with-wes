'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Centralized TTS Engine — British Accent ──
// All TTS calls in the app import from this file.

type VoiceAccent = 'british' | 'american';

let cachedVoice: SpeechSynthesisVoice | null = null;
let cachedAccent: VoiceAccent | null = null;

function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  return (window as any).speechSynthesis || null;
}

function getBritishVoice(): SpeechSynthesisVoice | null {
  const synth = getSynth();
  if (!synth) return null;
  const voices = synth.getVoices();
  if (voices.length === 0) return null;
  const preferred = ['Daniel', 'Google UK English Female', 'Google UK English Male', 'Martha', 'Oliver'];
  for (const name of preferred) {
    const match = voices.find(v => v.name === name);
    if (match) return match;
  }
  return voices.find(v => v.lang === 'en-GB') || voices.find(v => v.lang.startsWith('en')) || null;
}

function getAmericanVoice(): SpeechSynthesisVoice | null {
  const synth = getSynth();
  if (!synth) return null;
  const voices = synth.getVoices();
  return voices.find(v => v.lang === 'en-US') || voices.find(v => v.lang.startsWith('en')) || null;
}

function getVoice(accent: VoiceAccent = 'british'): SpeechSynthesisVoice | null {
  if (cachedVoice && cachedAccent === accent) return cachedVoice;
  cachedVoice = accent === 'british' ? getBritishVoice() : getAmericanVoice();
  cachedAccent = accent;
  return cachedVoice;
}

function getTTSSettings(): { accent: VoiceAccent; rate: number; autoRead: boolean; readChoices: boolean; greeting: boolean } {
  if (typeof window === 'undefined') return { accent: 'british', rate: 0.85, autoRead: true, readChoices: true, greeting: true };
  try {
    const raw = localStorage.getItem('ppw_parent_settings');
    if (!raw) return { accent: 'british', rate: 0.85, autoRead: true, readChoices: true, greeting: true };
    const s = JSON.parse(raw);
    const speedMap: Record<string, number> = { slow: 0.70, normal: 0.85, fast: 1.0 };
    return {
      accent: (s.tts_voice === 'american' ? 'american' : 'british') as VoiceAccent,
      rate: speedMap[s.tts_speed] || 0.85,
      autoRead: s.auto_read_questions !== false,
      readChoices: s.tts_read_choices !== false,
      greeting: s.tts_greeting !== false,
    };
  } catch { return { accent: 'british', rate: 0.85, autoRead: true, readChoices: true, greeting: true }; }
}

// ── Strip emoji from text before TTS ──

function stripEmoji(text: string): string {
  // Remove emoji using surrogate pair ranges (compatible with ES5 target)
  return text
    // Remove astral plane characters (emoji, symbols) via surrogate pairs
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    // Remove misc symbols, dingbats, emoticons in BMP
    .replace(/[\u2600-\u27BF]/g, '')
    .replace(/[\u2300-\u23FF]/g, '')
    .replace(/[\u2B00-\u2BFF]/g, '')
    // Remove variation selectors and zero-width joiners
    .replace(/[\uFE00-\uFEFF]/g, '')
    .replace(/\u200D/g, '')
    // Clean up leftover whitespace
    .replace(/  +/g, ' ')
    .trim();
}

// ── Main speak function ──

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
}

export function speak(text: string, options?: SpeakOptions): void {
  const synth = getSynth();
  if (!synth || !text) return;

  const cleanText = stripEmoji(text);
  if (!cleanText) return;

  try {
    synth.cancel();
    const ttsSettings = getTTSSettings();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = ttsSettings.accent === 'british' ? 'en-GB' : 'en-US';
    utterance.rate = options?.rate ?? ttsSettings.rate;
    utterance.pitch = options?.pitch ?? 1.05;
    utterance.volume = 1.0;

    const voice = getVoice(ttsSettings.accent);
    if (voice) utterance.voice = voice;

    if (options?.onEnd) utterance.onend = options.onEnd;

    if (synth.getVoices().length === 0) {
      synth.addEventListener('voiceschanged', () => {
        const v = getVoice(ttsSettings.accent);
        if (v) utterance.voice = v;
        synth.speak(utterance);
      }, { once: true });
    } else {
      synth.speak(utterance);
    }
  } catch {
    // Speech synthesis not available
  }
}

// ── Preset speak functions ──

export function speakQuestion(text: string, onEnd?: () => void): void {
  speak(text, { rate: 0.85, pitch: 1.05, onEnd });
}

export function speakCelebration(text: string): void {
  speak(text, { rate: 0.95, pitch: 1.15 });
}

export function speakAnimal(text: string): void {
  speak(text, { rate: 0.90, pitch: 1.0 });
}

export function speakWord(text: string, onEnd?: () => void): void {
  speak(text, { rate: 0.75, pitch: 1.05, onEnd });
}

export function speakStory(text: string, onEnd?: () => void): void {
  speak(text, { rate: 0.80, pitch: 1.0, onEnd });
}

// ── Speak list of words one at a time ──

export function speakWords(words: string[], pauseMs: number = 1000, onDone?: () => void): void {
  const synth = getSynth();
  if (!synth || words.length === 0) return;

  try {
    synth.cancel();
    const ttsSettings = getTTSSettings();
    let i = 0;
    const next = () => {
      if (i >= words.length) {
        if (onDone) setTimeout(onDone, pauseMs);
        return;
      }
      const clean = stripEmoji(words[i]);
      if (!clean) { i++; next(); return; }
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = ttsSettings.accent === 'british' ? 'en-GB' : 'en-US';
      u.rate = 0.75;
      u.pitch = 1.05;
      const voice = getVoice(ttsSettings.accent);
      if (voice) u.voice = voice;
      u.onend = () => { i++; setTimeout(next, pauseMs); };
      synth.speak(u);
    };
    if (synth.getVoices().length === 0) {
      synth.addEventListener('voiceschanged', next, { once: true });
    } else {
      next();
    }
  } catch { /* not available */ }
}

// ── Speak choices (A, B, C, D) ──

export function speakChoices(choices: string[]): void {
  if (!getTTSSettings().readChoices) return;
  const labels = ['A', 'B', 'C', 'D', 'E'];
  const text = choices.map((c, i) => `${labels[i] || ''}: ${stripEmoji(c)}`).join('. ');
  speak(text, { rate: 0.85, pitch: 1.05 });
}

// ── Speak sequence with pauses ──

export interface SequenceItem {
  text: string;
  pauseAfter?: number;
  rate?: number;
  pitch?: number;
}

export async function speakSequence(items: SequenceItem[]): Promise<void> {
  for (const item of items) {
    const clean = stripEmoji(item.text);
    if (!clean) continue;
    await new Promise<void>((resolve) => {
      speak(clean, { rate: item.rate, pitch: item.pitch, onEnd: resolve });
      setTimeout(resolve, 15000);
    });
    if (item.pauseAfter) {
      await new Promise(r => setTimeout(r, item.pauseAfter));
    }
  }
}

// ── Stop ──

export function stopSpeaking(): void {
  try { getSynth()?.cancel(); } catch { /* ignore */ }
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// ── Settings helpers ──

export function shouldAutoRead(): boolean {
  return getTTSSettings().autoRead;
}

export function shouldReadChoices(): boolean {
  return getTTSSettings().readChoices;
}

export function shouldGreet(): boolean {
  return getTTSSettings().greeting;
}
