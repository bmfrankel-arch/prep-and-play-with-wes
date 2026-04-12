'use client';

import { useState, useEffect } from 'react';
import { isDashboardUnlocked, unlockDashboard } from '@/lib/db';

interface PinGateProps {
  children: React.ReactNode;
}

export default function PinGate({ children }: PinGateProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [digits, setDigits] = useState('');
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isDashboardUnlocked()) {
      setUnlocked(true);
    }
    setChecking(false);
  }, []);

  const handleDigit = (d: string) => {
    if (digits.length >= 4) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === 4) {
      verifyPin(next);
    }
  };

  const verifyPin = async (pin: string) => {
    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.valid) {
        unlockDashboard();
        setUnlocked(true);
      } else {
        setShake(true);
        setTimeout(() => { setShake(false); setDigits(''); }, 600);
      }
    } catch {
      // If API fails (offline), try default
      if (pin === '1234') {
        unlockDashboard();
        setUnlocked(true);
      } else {
        setShake(true);
        setTimeout(() => { setShake(false); setDigits(''); }, 600);
      }
    }
  };

  if (checking) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className={`max-w-sm w-full text-center ${shake ? 'animate-wiggle' : ''}`}>
        <p className="text-5xl mb-4">🔒</p>
        <h2 className="text-2xl font-bold text-navy mb-2">Parent Dashboard</h2>
        <p className="text-gray-500 mb-6">Enter your 4-digit PIN</p>

        {/* PIN dots */}
        <div className="flex gap-3 justify-center mb-8">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full transition-all ${
                i < digits.length ? 'bg-navy scale-110' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {shake && <p className="text-coral font-bold mb-4">Try again!</p>}

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(key => (
            <button
              key={key || 'blank'}
              onClick={() => {
                if (key === '⌫') setDigits(d => d.slice(0, -1));
                else if (key) handleDigit(key);
              }}
              disabled={!key}
              className={`w-[72px] h-[72px] rounded-2xl text-2xl font-bold transition-all active:scale-95 ${
                key === '⌫'
                  ? 'bg-gray-100 text-gray-500'
                  : key
                    ? 'bg-navy/5 text-navy hover:bg-navy/10'
                    : 'invisible'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
