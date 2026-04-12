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
  const gbVoice = voices.find(v => v.lang === 'en-GB');
  if (gbVoice) return gbVoice;
  return voices.find(v => v.lang.startsWith('en')) || null;
}

function getAmericanVoice(): SpeechSynthesisVoice | null {
  const synth = getSynth();
  if (!synth) return null;
  const voices = synth.getVoices();
  const usVoice = voices.find(v => v.lang === 'en-US');
  if (usVoice) return usVoice;
  return voices.find(v => v.lang.startsWith('en')) || null;
}

function getVoice(accent: VoiceAccent = 'british'): SpeechSynthesisVoice | null {
  if (cachedVoice && cachedAccent === accent) return cachedVoice;
  cachedVoice = accent === 'british' ? getBritishVoice() : getAmericanVoice();
  cachedAccent = accent;
  return cachedVoice;
}

// Read TTS settings from localStorage (avoids circular import with db.ts)
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

// ── Main speak function ──

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
}

export function speak(text: string, options?: SpeakOptions): void {
  const synth = getSynth();
  if (!synth || !text) return;

  try {
    synth.cancel();
    const ttsSettings = getTTSSettings();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = ttsSettings.accent === 'british' ? 'en-GB' : 'en-US';
    utterance.rate = options?.rate ?? ttsSettings.rate;
    utterance.pitch = options?.pitch ?? 1.05;
    utterance.volume = 1.0;

    const voice = getVoice(ttsSettings.accent);
    if (voice) utterance.voice = voice;

    if (options?.onEnd) utterance.onend = options.onEnd;

    // iOS Safari fix — voices may not be loaded yet
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

// ── Preset speak functions for different content types ──

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
      const u = new SpeechSynthesisUtterance(words[i]);
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
  } catch {
    // Speech not available
  }
}

// ── Speak choices (A, B, C, D) ���─

export function speakChoices(choices: string[], _pauseMs: number = 800): void {
  if (!getTTSSettings().readChoices) return;
  const labels = ['A', 'B', 'C', 'D', 'E'];
  const text = choices.map((c, i) => `${labels[i] || ''}: ${c}`).join('. ');
  speak(text, { rate: 0.85, pitch: 1.05 });
}

// ── Stop ──

export function stopSpeaking(): void {
  try { getSynth()?.cancel(); } catch { /* ignore */ }
}

// ── Check support ──

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// ── Settings helpers (read directly from localStorage) ──

export function shouldAutoRead(): boolean {
  return getTTSSettings().autoRead;
}

export function shouldReadChoices(): boolean {
  return getTTSSettings().readChoices;
}

export function shouldGreet(): boolean {
  return getTTSSettings().greeting;
}
