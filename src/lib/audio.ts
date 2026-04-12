'use client';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export function playLevelUpFanfare(): void {
  try {
    const ctx = getAudioContext();
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.50]; // C5, E5, G5, B5, C6
    const duration = 0.25;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, ctx.currentTime + i * duration);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * duration + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + (i + 1) * duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * duration);
      osc.stop(ctx.currentTime + (i + 1) * duration + 0.1);
    });

    // Final sustained chord
    const chordDelay = notes.length * duration;
    [523.25, 659.25, 783.99, 1046.50].forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + chordDelay);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + chordDelay + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + chordDelay);
      osc.stop(ctx.currentTime + chordDelay + 1.3);
    });
  } catch {
    // Audio not supported
  }
}

export function playCorrectSound(): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not supported
  }
}

export function playWrongSound(): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not supported
  }
}
