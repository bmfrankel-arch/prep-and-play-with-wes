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
  const [errorMsg, setErrorMsg] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [pinConfigured, setPinConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (isDashboardUnlocked()) setUnlocked(true);
    setChecking(false);
    // Check PIN configuration status
    fetch('/api/pin-status').then(r => r.json()).then(d => setPinConfigured(d.configured)).catch(() => setPinConfigured(null));
  }, []);

  // Lockout countdown
  useEffect(() => {
    if (lockoutUntil <= Date.now()) return;
    const t = setInterval(() => {
      if (Date.now() >= lockoutUntil) {
        setErrorMsg('');
        setFailedAttempts(0);
        clearInterval(t);
      } else {
        setErrorMsg(`Too many attempts. Wait ${Math.ceil((lockoutUntil - Date.now()) / 1000)}s`);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [lockoutUntil]);

  const handleDigit = (d: string) => {
    if (digits.length >= 4 || lockoutUntil > Date.now()) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === 4) verifyPin(next);
  };

  const verifyPin = async (pin: string) => {
    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.toString().trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        unlockDashboard();
        setUnlocked(true);
        return;
      }
    } catch {
      // Offline fallback — accept default
      if (pin.trim() === '1234') {
        unlockDashboard();
        setUnlocked(true);
        return;
      }
    }

    // Wrong PIN
    const newFails = failedAttempts + 1;
    setFailedAttempts(newFails);
    setShake(true);
    setErrorMsg('Incorrect PIN — try again');

    if (newFails >= 5) {
      setLockoutUntil(Date.now() + 30000);
      setErrorMsg('Too many attempts. Wait 30s');
    }

    setTimeout(() => {
      setShake(false);
      setDigits('');
      if (newFails < 5) setTimeout(() => setErrorMsg(''), 2000);
    }, 600);
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
        <div className="flex gap-3 justify-center mb-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-5 h-5 rounded-full transition-all ${
              shake ? 'bg-coral' : i < digits.length ? 'bg-navy scale-110' : 'bg-gray-200'
            }`} />
          ))}
        </div>

        {/* Error message */}
        <div className="h-8 mb-4">
          {errorMsg && <p className="text-coral font-bold text-sm animate-fade-in">{errorMsg}</p>}
        </div>

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-3 max-w-[336px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(key => (
            <button
              key={key || 'blank'}
              onClick={() => {
                if (key === '⌫') setDigits(d => d.slice(0, -1));
                else if (key) handleDigit(key);
              }}
              onTouchEnd={(e) => e.currentTarget.blur()}
              disabled={!key || lockoutUntil > Date.now()}
              className={`w-[100px] h-[100px] rounded-2xl text-2xl font-bold transition-all active:scale-95 active:bg-navy/20 focus:outline-none ${
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

        {/* Debug PIN status */}
        {pinConfigured !== null && (
          <p className="text-[10px] text-gray-300 mt-4">
            PIN configured: {pinConfigured ? 'YES' : 'NO (using default)'}
          </p>
        )}
      </div>
    </div>
  );
}
