'use client';

let speechSynth: SpeechSynthesis | null = null;

function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  if (!speechSynth) speechSynth = window.speechSynthesis;
  return speechSynth;
}

export function speak(text: string, options?: { rate?: number; pitch?: number; onEnd?: () => void }): void {
  const synth = getSynth();
  if (!synth) return;

  synth.cancel(); // Stop any ongoing speech
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = options?.rate ?? 0.85;
  utterance.pitch = options?.pitch ?? 1.1;
  if (options?.onEnd) utterance.onend = options.onEnd;
  synth.speak(utterance);
}

export function speakWords(words: string[], pauseMs: number = 1000, onDone?: () => void): void {
  const synth = getSynth();
  if (!synth) return;
  synth.cancel();

  let i = 0;
  const next = () => {
    if (i >= words.length) {
      if (onDone) setTimeout(onDone, pauseMs);
      return;
    }
    const u = new SpeechSynthesisUtterance(words[i]);
    u.lang = 'en-US';
    u.rate = 0.85;
    u.pitch = 1.1;
    u.onend = () => { i++; setTimeout(next, pauseMs); };
    synth.speak(u);
  };
  next();
}

export function stopSpeaking(): void {
  getSynth()?.cancel();
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
