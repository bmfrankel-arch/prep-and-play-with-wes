'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Confetti from './Confetti';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface PronunciationChallengeProps {
  word: string;
  syllableBreakdown: string;
  definition: string;
  exampleSentence: string;
  microphoneMode: boolean;
  showSyllableHint: boolean;
  onComplete: (success: boolean) => void;
}

function getSpeechRecognitionClass(): any | null {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export default function PronunciationChallenge({
  word,
  syllableBreakdown,
  definition,
  exampleSentence,
  microphoneMode,
  showSyllableHint,
  onComplete,
}: PronunciationChallengeProps) {
  const [phase, setPhase] = useState<'prompt' | 'listening' | 'success' | 'retry' | 'word_card' | 'done'>('prompt');
  const [attempts, setAttempts] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [useParentMode, setUseParentMode] = useState(!microphoneMode);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!getSpeechRecognitionClass()) {
      setSpeechSupported(false);
      setUseParentMode(true);
    }
  }, []);

  const handleSuccess = useCallback(() => {
    setShowConfetti(true);
    setPhase('success');
    setTimeout(() => {
      setPhase('word_card');
    }, 2000);
  }, []);

  const handleFailure = useCallback(() => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    if (newAttempts >= 2) {
      setPhase('word_card');
    } else {
      setPhase('retry');
    }
  }, [attempts]);

  const startListening = useCallback(() => {
    if (useParentMode) return;

    const SpeechRecognitionClass = getSpeechRecognitionClass();
    if (!SpeechRecognitionClass) {
      setUseParentMode(true);
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      const target = word.toLowerCase().trim();
      if (transcript.includes(target) || target.includes(transcript) ||
          levenshteinDistance(transcript, target) <= 2) {
        handleSuccess();
      } else {
        handleFailure();
      }
    };

    recognition.onerror = () => {
      handleFailure();
    };

    recognition.onend = () => {
      setPhase(prev => prev === 'listening' ? 'retry' : prev);
    };

    setPhase('listening');
    recognition.start();

    setTimeout(() => {
      try { recognition.stop(); } catch { /* ignore */ }
    }, 5000);
  }, [word, useParentMode, handleSuccess, handleFailure]);

  const finishWordCard = () => {
    onComplete(attempts < 2);
  };

  return (
    <div className="fixed inset-0 z-40 bg-navy/95 flex items-center justify-center p-6">
      {showConfetti && <Confetti duration={3000} />}

      <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center">
        {phase === 'prompt' && (
          <>
            <p className="text-6xl mb-4">{word.length <= 8 ? '🎤' : '📖'}</p>
            <h2 className="text-4xl font-extrabold text-navy mb-4">{word}</h2>
            <p className="text-xl text-gray-600 mb-6">
              Great pick, Wes! Now say it out loud! 🎤
            </p>
            {(showSyllableHint || !speechSupported) && (
              <p className="text-2xl text-coral font-bold mb-4">{syllableBreakdown}</p>
            )}
            {!speechSupported && (
              <p className="text-sm text-gray-400 mb-4">
                Speech recognition not available — using Parent Confirms mode
              </p>
            )}
            {useParentMode ? (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleSuccess}
                  className="game-btn bg-grass text-white px-8"
                >
                  ✓ Said it!
                </button>
                <button
                  onClick={handleFailure}
                  className="game-btn bg-coral text-white px-8"
                >
                  ✗ Try again
                </button>
              </div>
            ) : (
              <button
                onClick={startListening}
                className="game-btn bg-coral text-white px-10 py-6 text-3xl mic-recording"
              >
                🎤 Hold to Speak
              </button>
            )}
          </>
        )}

        {phase === 'listening' && (
          <>
            <div className="text-8xl mb-4 animate-pulse">🎤</div>
            <h2 className="text-3xl font-bold text-navy mb-4">Listening...</h2>
            <p className="text-xl text-gray-500">Say &ldquo;{word}&rdquo; now!</p>
          </>
        )}

        {phase === 'success' && (
          <>
            <div className="text-8xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-grass mb-4">Perfect, Wes!</h2>
            <p className="text-2xl font-bold text-navy">{word}</p>
          </>
        )}

        {phase === 'retry' && (
          <>
            <p className="text-5xl mb-4">💪</p>
            <h2 className="text-2xl font-bold text-navy mb-4">Try one more time!</h2>
            <p className="text-3xl text-coral font-bold mb-6">{syllableBreakdown}</p>
            {useParentMode ? (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleSuccess}
                  className="game-btn bg-grass text-white px-8"
                >
                  ✓ Got it!
                </button>
                <button
                  onClick={() => {
                    setAttempts(2);
                    setPhase('word_card');
                  }}
                  className="game-btn bg-gray-400 text-white px-8"
                >
                  Move on
                </button>
              </div>
            ) : (
              <button
                onClick={startListening}
                className="game-btn bg-coral text-white px-10 py-6 text-3xl"
              >
                🎤 Try Again
              </button>
            )}
          </>
        )}

        {phase === 'word_card' && (
          <>
            {attempts >= 2 && (
              <p className="text-lg text-gray-500 mb-2">Good try! Keep practicing that one.</p>
            )}
            <div className="bg-gradient-to-br from-sunshine/20 to-coral/10 rounded-2xl p-6 mb-6">
              <h2 className="text-4xl font-extrabold text-navy mb-3">{word}</h2>
              <p className="text-lg text-gray-700 mb-2">{definition}</p>
              <p className="text-base text-gray-500 italic">&ldquo;{exampleSentence}&rdquo;</p>
              <p className="text-sm text-coral font-bold mt-2">{syllableBreakdown}</p>
            </div>
            <button
              onClick={finishWordCard}
              className="game-btn bg-navy text-white px-8"
            >
              Continue ▶
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
