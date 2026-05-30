'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getParentSettings, saveParentSettings } from '@/lib/db';
import { ParentSettings } from '@/lib/types';
import { speak } from '@/lib/speech';
import { preloadForOffline, getCacheStatus, type PreloadProgress } from '@/lib/offlineCache';

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={`w-14 h-7 rounded-full transition-colors ${on ? 'bg-grass' : 'bg-gray-300'}`}>
      <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-7' : 'translate-x-0.5'}`} />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<ParentSettings | null>(null);
  const [offlineProgress, setOfflineProgress] = useState<PreloadProgress | null>(null);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<{ modulesCached: number; totalModules: number; lastCachedAt: string | null } | null>(null);

  useEffect(() => {
    setSettings(getParentSettings());
    getCacheStatus().then(setCacheStatus);
  }, []);

  const runPreload = async () => {
    setOfflineLoading(true);
    setOfflineProgress({ message: 'Starting...', completed: 0, total: 1, percent: 0 });
    await preloadForOffline(p => setOfflineProgress(p));
    setOfflineLoading(false);
    const status = await getCacheStatus();
    setCacheStatus(status);
  };

  const isReady = cacheStatus && cacheStatus.modulesCached >= Math.ceil(cacheStatus.totalModules * 0.8);
  const formatCachedAt = (iso: string | null) => {
    if (!iso) return 'never';
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  if (!settings) return null;

  const update = (partial: Partial<ParentSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    saveParentSettings(updated);
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/dashboard')} className="text-navy font-bold">← Dashboard</button>
          <h1 className="text-2xl font-extrabold text-navy">Settings</h1>
          <div />
        </div>

        <div className="space-y-6">
          {/* Text-to-Speech */}
          <div className="bg-gray-50 rounded-2xl p-5">
            <h3 className="font-bold text-navy text-lg mb-4">Text-to-Speech 🔊</h3>

            {/* Voice selector */}
            <div className="mb-4">
              <label className="text-sm font-bold text-navy block mb-2">Voice</label>
              <div className="flex gap-2">
                <button onClick={() => update({ tts_voice: 'british' })}
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${settings.tts_voice === 'british' || !settings.tts_voice ? 'bg-navy text-white' : 'bg-gray-200 text-gray-600'}`}>
                  ���🇧 British English
                </button>
                <button onClick={() => update({ tts_voice: 'american' })}
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${settings.tts_voice === 'american' ? 'bg-navy text-white' : 'bg-gray-200 text-gray-600'}`}>
                  🇺🇸 American English
                </button>
              </div>
            </div>

            {/* Speed selector */}
            <div className="mb-4">
              <label className="text-sm font-bold text-navy block mb-2">Reading Speed</label>
              <div className="flex gap-2">
                {(['slow', 'normal', 'fast'] as const).map(speed => (
                  <button key={speed} onClick={() => update({ tts_speed: speed })}
                    className={`px-4 py-2 rounded-lg font-bold text-sm capitalize ${(settings.tts_speed || 'normal') === speed ? 'bg-navy text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {speed}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between mb-4">
              <div>
                <span className="font-semibold text-navy block">Auto-read questions</span>
                <span className="text-xs text-gray-500">Reads each question aloud automatically</span>
              </div>
              <Toggle on={settings.auto_read_questions !== false} onToggle={() => update({ auto_read_questions: !settings.auto_read_questions })} />
            </label>

            <label className="flex items-center justify-between mb-4">
              <div>
                <span className="font-semibold text-navy block">Read answer choices</span>
                <span className="text-xs text-gray-500">Also reads A, B, C, D choices aloud</span>
              </div>
              <Toggle on={settings.tts_read_choices !== false} onToggle={() => update({ tts_read_choices: !settings.tts_read_choices })} />
            </label>

            <label className="flex items-center justify-between mb-4">
              <div>
                <span className="font-semibold text-navy block">Greeting on home screen</span>
                <span className="text-xs text-gray-500">&quot;Hello Wes! What shall we practise today?&quot;</span>
              </div>
              <Toggle on={settings.tts_greeting !== false} onToggle={() => update({ tts_greeting: !settings.tts_greeting })} />
            </label>

            {/* Test button */}
            <button
              onClick={() => speak('Hello Wes! Welcome to Prep and Play. Let\'s learn something brilliant today!', { rate: 0.85, pitch: 1.05 })}
              className="bg-coral text-white font-bold px-6 py-3 rounded-xl w-full"
            >
              Test Voice 🔊
            </button>
          </div>

          {/* Math Show Your Work */}
          <div className="bg-gray-50 rounded-2xl p-5">
            <h3 className="font-bold text-navy text-lg mb-4">Math Explorer</h3>
            <label className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-navy block">Show math working after each answer</span>
                <span className="text-xs text-gray-500">Step-by-step explanation of how to solve</span>
              </div>
              <Toggle on={settings.show_math_work !== false} onToggle={() => update({ show_math_work: !settings.show_math_work })} />
            </label>
          </div>

          {/* Pronunciation */}
          <div className="bg-gray-50 rounded-2xl p-5">
            <h3 className="font-bold text-navy text-lg mb-4">Pronunciation Mode</h3>

            <label className="flex items-center justify-between mb-4">
              <span className="font-semibold text-navy">Pronunciation Mode</span>
              <Toggle on={settings.pronunciation_mode} onToggle={() => update({ pronunciation_mode: !settings.pronunciation_mode })} />
            </label>

            {settings.pronunciation_mode && (
              <>
                <label className="flex items-center justify-between mb-4">
                  <div>
                    <span className="font-semibold text-navy block">Microphone Mode</span>
                    <span className="text-xs text-gray-500">Uses Web Speech API</span>
                  </div>
                  <button onClick={() => update({ microphone_mode: true })}
                    className={`px-4 py-2 rounded-lg font-bold text-sm ${settings.microphone_mode ? 'bg-navy text-white' : 'bg-gray-200 text-gray-600'}`}>
                    🎤 Mic
                  </button>
                </label>

                <label className="flex items-center justify-between mb-4">
                  <div>
                    <span className="font-semibold text-navy block">Parent Confirms Mode</span>
                    <span className="text-xs text-gray-500">Parent taps ✓ or ✗</span>
                  </div>
                  <button onClick={() => update({ microphone_mode: false })}
                    className={`px-4 py-2 rounded-lg font-bold text-sm ${!settings.microphone_mode ? 'bg-navy text-white' : 'bg-gray-200 text-gray-600'}`}>
                    👆 Parent
                  </button>
                </label>

                <label className="flex items-center justify-between">
                  <span className="font-semibold text-navy">Show syllable hint immediately</span>
                  <Toggle on={settings.show_syllable_hint} onToggle={() => update({ show_syllable_hint: !settings.show_syllable_hint })} />
                </label>
              </>
            )}
          </div>

          {/* Assessment */}
          <div className="bg-gray-50 rounded-2xl p-5">
            <h3 className="font-bold text-navy text-lg mb-4">Assessment Mode</h3>

            <label className="flex items-center justify-between mb-4">
              <span className="font-semibold text-navy">Show assessment prompt after games</span>
              <Toggle on={settings.show_assessment_prompt} onToggle={() => update({ show_assessment_prompt: !settings.show_assessment_prompt })} />
            </label>

            <label className="flex items-center justify-between mb-4">
              <span className="font-semibold text-navy">Require parent PIN to start assessment</span>
              <Toggle on={settings.require_pin} onToggle={() => update({ require_pin: !settings.require_pin })} />
            </label>

            {settings.require_pin && (
              <div className="mb-4">
                <label className="text-sm font-bold text-navy block mb-1">4-digit PIN</label>
                <input type="text" maxLength={4} value={settings.parent_pin}
                  onChange={e => update({ parent_pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  className="border-2 border-gray-300 rounded-lg p-2 w-24 text-center text-lg tracking-widest" />
              </div>
            )}

            <div>
              <label className="text-sm font-bold text-navy block mb-1">Scheduled Weekly Assessment Day</label>
              <select value={settings.scheduled_assessment_day || ''} onChange={e => update({ scheduled_assessment_day: e.target.value || null })}
                className="border-2 border-gray-300 rounded-lg p-2">
                <option value="">Off</option>
                {['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].map(d => (
                  <option key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Offline Mode */}
          <div className="bg-gray-50 rounded-2xl p-5">
            <h3 className="font-bold text-navy text-lg mb-4">Offline Mode ✈️</h3>
            <p className="text-sm text-gray-600 mb-4">Pre-load questions so the app works on the plane.</p>

            {cacheStatus && (
              <div className={`rounded-xl p-3 mb-4 text-sm ${isReady ? 'bg-grass/10 border border-grass/30' : 'bg-amber-50 border border-amber-200'}`}>
                <p className="font-bold text-navy">
                  {isReady ? '✅ Ready for offline!' : '⚠️ Not ready yet'}
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  {cacheStatus.modulesCached} of {cacheStatus.totalModules} modules cached
                </p>
                <p className="text-gray-500 text-xs">
                  Last preloaded: {formatCachedAt(cacheStatus.lastCachedAt)}
                </p>
              </div>
            )}

            <button
              onClick={runPreload}
              disabled={offlineLoading}
              className="bg-gold text-navy font-bold px-6 py-3 rounded-xl disabled:opacity-50 w-full">
              {offlineLoading ? 'Pre-loading...' : (cacheStatus && cacheStatus.modulesCached > 0 ? 'Re-load Content ✈️' : 'Pre-load for Offline ✈️')}
            </button>

            {offlineProgress && offlineLoading && (
              <div className="mt-4">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold transition-all duration-300"
                    style={{ width: `${offlineProgress.percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-500">{offlineProgress.message}</span>
                  <span className="font-bold text-navy">
                    {offlineProgress.completed} / {offlineProgress.total} · {offlineProgress.percent}%
                  </span>
                </div>
              </div>
            )}

            {offlineProgress && !offlineLoading && offlineProgress.percent === 100 && (
              <p className="text-sm text-grass font-bold mt-3">
                ✅ {offlineProgress.message}
              </p>
            )}

            <div className="mt-4 space-y-1 text-xs text-gray-500">
              <p>💡 Addition and subtraction tables always work offline — they use math, not the internet.</p>
              <p>💡 Animal battles work offline — animal data is bundled with the app.</p>
              <p>💡 Pre-load the night before your trip at home, not at the airport.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
