'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { speak, speakQuestion, speakCelebration } from '@/lib/speech';
import Confetti from './Confetti';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface SpokenResponseProps {
  scenario: string;
  modelAnswer?: string;
  showModelBefore?: boolean; // Level 1: show before speaking
  showCoaching?: boolean; // Level 1-2: show "say your name + something about you"
  level: number;
  onComplete: (result: { transcript: string; confidenceScore: string; quality: string; personalDetails: number }) => void;
}

const PERSONAL_INDICATORS = [
  'love', 'like', 'enjoy', 'favorite', 'favourite', 'animals', 'dinosaur', 'lego', 'building',
  'sport', 'football', 'swimming', 'reading', 'books', 'good at', 'can', 'know how',
  'have a', 'my dog', 'my cat', 'my family', 'my brother', 'my sister', 'i am', "i'm",
  'years old', 'funny', 'kind', 'smart', 'brave', 'curious', 'adventurous', 'shark',
];

function countPersonalDetails(text: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  const categories = new Set<string>();
  for (const ind of PERSONAL_INDICATORS) {
    if (lower.includes(ind) && !categories.has(ind.substring(0, 3))) {
      count++;
      categories.add(ind.substring(0, 3));
    }
  }
  return count;
}

function getSpeechRecognition(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export default function SpokenResponse({ scenario, modelAnswer, showModelBefore, showCoaching, level, onComplete }: SpokenResponseProps) {
  const [phase, setPhase] = useState<'scenario' | 'thinking' | 'speaking' | 'processing' | 'feedback'>('scenario');
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; quality: string; volumeFeedback: string; model: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [useParentMode, setUseParentMode] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeSamplesRef = useRef<number[]>([]);
  const animFrameRef = useRef<number>(0);

  // Phase 1: Read scenario aloud
  useEffect(() => {
    if (phase === 'scenario') {
      speakQuestion(scenario, () => {
        setTimeout(() => setPhase('thinking'), 1000);
      });
    }
  }, [phase, scenario]);

  // Phase 2: Thinking timer
  useEffect(() => {
    if (phase !== 'thinking') return;
    const thinkTime = level === 1 ? 7000 : level === 2 ? 5000 : 3000;
    speak("Take your time. What would you say?", { rate: 0.80 });
    const t = setTimeout(() => {
      if (!getSpeechRecognition()) { setUseParentMode(true); }
      setPhase('speaking');
      speak("Hold the microphone and tell me!", { rate: 0.85 });
    }, thinkTime);
    return () => clearTimeout(t);
  }, [phase, level]);

  // Volume measurement
  const startVolumeMeasure = useCallback(async () => {
    try {
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      volumeSamplesRef.current = [];

      const measure = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        volumeSamplesRef.current.push(avg);
        setVolumeLevel(Math.min(5, Math.floor(avg / 25)));
        animFrameRef.current = requestAnimationFrame(measure);
      };
      measure();
    } catch { /* no mic access */ }
  }, []);

  const stopVolumeMeasure = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    audioContextRef.current?.close();
  }, []);

  const getConfidenceScore = useCallback((): string => {
    const samples = volumeSamplesRef.current;
    if (samples.length === 0) return 'quiet';
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    if (avg < 20) return 'whisper';
    if (avg < 45) return 'quiet';
    if (avg < 80) return 'good';
    if (avg < 120) return 'strong';
    return 'excellent';
  }, []);

  const startRecording = useCallback(() => {
    if (useParentMode) return;
    const SR = getSpeechRecognition();
    if (!SR) { setUseParentMode(true); return; }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (e: any) => {
      const result = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
      setTranscript(result);
    };
    recognition.onend = () => { setIsRecording(false); stopVolumeMeasure(); };
    recognition.onerror = () => { setIsRecording(false); stopVolumeMeasure(); };

    setIsRecording(true);
    recognition.start();
    startVolumeMeasure();

    // Auto-stop after 15s
    setTimeout(() => { try { recognition.stop(); } catch { /* ok */ } }, 15000);
  }, [useParentMode, startVolumeMeasure, stopVolumeMeasure]);

  const stopRecording = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* ok */ }
    setIsRecording(false);
    stopVolumeMeasure();

    const conf = getConfidenceScore();
    const text = transcript.trim();

    if (!text && attempts < 1) {
      setAttempts(a => a + 1);
      speak("Hmm, I didn't quite catch that. Let's try once more — and speak up nice and loud!", { rate: 0.85 });
      setTimeout(() => setPhase('speaking'), 3000);
      return;
    }

    if (!text && attempts >= 1) {
      setUseParentMode(true);
      setPhase('speaking');
      return;
    }

    // Evaluate
    setPhase('processing');
    evaluateResponse(text, conf);
  }, [transcript, attempts, getConfidenceScore, stopVolumeMeasure]);

  const evaluateResponse = async (text: string, confScore: string) => {
    const personalCount = countPersonalDetails(text);
    try {
      const res = await fetch('/api/confidence/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sub_game: 'meet_greet', scenario, spoken_response: text,
          confidence_score: confScore, personal_detail_count: personalCount,
          level, context: 'regular', attempt_number: attempts + 1,
        }),
      });
      const data = await res.json();

      // Volume-based extra praise
      let volumeFb = '';
      if (confScore === 'excellent') volumeFb = 'SUPER CONFIDENT VOICE!';
      else if (confScore === 'strong') volumeFb = 'Loud and clear — well done!';
      else if (confScore === 'whisper') volumeFb = 'Try speaking a little louder!';

      setFeedback({ text: data.tts_feedback || 'Good try!', quality: data.quality || 'good', volumeFeedback: volumeFb, model: data.model_answer || modelAnswer || '' });
      setPhase('feedback');

      if (data.quality === 'outstanding' || data.quality === 'excellent') {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
        speakCelebration(data.tts_feedback || 'Brilliant, Wes!');
      } else {
        speak(data.tts_feedback || 'Good try!', { rate: 0.80 });
      }

      if (volumeFb && confScore !== 'whisper') {
        setTimeout(() => speak(volumeFb, { rate: 0.95, pitch: 1.15 }), 3000);
      }

      // Callback
      setTimeout(() => {
        onComplete({ transcript: text, confidenceScore: confScore, quality: data.quality || 'good', personalDetails: personalCount });
      }, 5000);
    } catch {
      setFeedback({ text: 'Good try, Wes!', quality: 'good', volumeFeedback: '', model: modelAnswer || '' });
      setPhase('feedback');
      speak('Good try, Wes!', { rate: 0.80 });
      setTimeout(() => onComplete({ transcript: text, confidenceScore: confScore, quality: 'good', personalDetails: 0 }), 4000);
    }
  };

  const parentConfirm = (great: boolean) => {
    if (great) {
      setFeedback({ text: 'Brilliant, Wes!', quality: 'excellent', volumeFeedback: '', model: modelAnswer || '' });
      setShowConfetti(true);
      speakCelebration('Brilliant, Wes!');
      setTimeout(() => onComplete({ transcript: '(parent confirmed)', confidenceScore: 'good', quality: 'excellent', personalDetails: 0 }), 3000);
    } else {
      speak("Have another go, Wes — you've got this!", { rate: 0.85 });
      setPhase('speaking');
    }
    setPhase('feedback');
  };

  // Volume bar component
  const VolumeBar = () => (
    <div className="flex gap-1 justify-center mt-3">
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className={`w-3 rounded-full transition-all ${
          volumeLevel > i ? (volumeLevel >= 4 ? 'bg-green-400 h-8' : volumeLevel >= 3 ? 'bg-gold h-6' : 'bg-gray-400 h-4') : 'bg-gray-200 h-3'
        }`} />
      ))}
    </div>
  );

  return (
    <div className="relative">
      {showConfetti && <Confetti duration={4000} />}

      {/* Parent override — discreet at top */}
      {(phase === 'speaking' || phase === 'thinking') && (
        <div className="flex gap-2 justify-end mb-2">
          <button onClick={() => parentConfirm(true)} className="text-xs text-gray-300 hover:text-grass">✓ Great answer!</button>
          <button onClick={() => parentConfirm(false)} className="text-xs text-gray-300 hover:text-coral">↩ Try again</button>
        </div>
      )}

      {/* Phase 1: Scenario */}
      {phase === 'scenario' && (
        <div className="text-center">
          <div className="bg-blue-50 rounded-2xl p-5 mb-4">
            <p className="text-xl text-gray-700">{scenario}</p>
          </div>
          <button onClick={() => speakQuestion(scenario)} className="text-3xl active:scale-125">🔊</button>
        </div>
      )}

      {/* Phase 2: Thinking */}
      {phase === 'thinking' && (
        <div className="text-center py-8">
          <p className="text-2xl font-bold text-navy mb-4">Think about what you&apos;d say... 💭</p>
          <div className="w-20 h-20 mx-auto rounded-full border-4 border-gold relative overflow-hidden">
            <div className="absolute bottom-0 w-full bg-gold/30 animate-pulse" style={{ height: '100%', animation: 'fillUp 5s linear forwards' }} />
          </div>
          {showCoaching && <p className="text-sm text-gray-400 mt-4">💡 Say your name AND something about you!</p>}
          {showModelBefore && modelAnswer && (
            <div className="bg-grass/10 rounded-2xl p-3 mt-4 border border-grass/30">
              <p className="text-xs font-bold text-grass mb-1">Example:</p>
              <p className="text-sm text-navy">&ldquo;{modelAnswer}&rdquo;</p>
            </div>
          )}
          <style jsx>{`@keyframes fillUp { from { height: 0%; } to { height: 100%; } }`}</style>
        </div>
      )}

      {/* Phase 3: Speaking */}
      {phase === 'speaking' && (
        <div className="text-center py-4">
          <p className="text-xl font-bold text-navy mb-4">{useParentMode ? 'Did Wes give a great answer?' : 'Hold and speak! 🎤'}</p>

          {useParentMode ? (
            <div className="flex gap-4 justify-center">
              <button onClick={() => parentConfirm(true)} className="game-btn bg-grass text-white px-8 py-5 text-xl">👍 Great job!</button>
              <button onClick={() => parentConfirm(false)} className="game-btn bg-sunshine text-navy px-8 py-5 text-xl">🔄 Try again</button>
            </div>
          ) : (
            <>
              <button
                onMouseDown={startRecording} onMouseUp={stopRecording}
                onTouchStart={startRecording} onTouchEnd={stopRecording}
                className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center text-5xl transition-all ${
                  isRecording ? 'bg-red-500 animate-pulse scale-110' : 'bg-coral hover:bg-coral-dark'
                }`}>
                🎤
              </button>
              {isRecording && <VolumeBar />}
              {transcript && <p className="mt-4 text-sm text-gray-500 italic">&ldquo;{transcript}&rdquo;</p>}
            </>
          )}
        </div>
      )}

      {/* Phase 4: Processing */}
      {phase === 'processing' && (
        <div className="text-center py-8">
          <p className="text-xl font-bold text-navy animate-pulse">Listening... 🎧</p>
        </div>
      )}

      {/* Phase 5: Feedback */}
      {phase === 'feedback' && feedback && (
        <div className="text-center py-4">
          <div className={`rounded-2xl p-5 mb-4 ${feedback.quality === 'outstanding' ? 'bg-gold/20 border-2 border-gold' : feedback.quality === 'excellent' ? 'bg-green-50 border-2 border-green-300' : 'bg-sunshine/10'}`}>
            <p className="text-xl font-bold text-navy mb-2">{feedback.text}</p>
            {feedback.volumeFeedback && <p className="text-sm font-bold text-coral">{feedback.volumeFeedback}</p>}
          </div>
          {feedback.model && (
            <div className="bg-grass/10 rounded-2xl p-3 border border-grass/30 mb-4">
              <p className="text-xs font-bold text-grass mb-1">One way to answer:</p>
              <p className="text-sm text-navy">&ldquo;{feedback.model}&rdquo;</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
