'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getParentSettings, saveParentSettings } from '@/lib/db';
import { ParentSettings } from '@/lib/types';
import { preloadForOffline } from '@/lib/offlineCache';

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<ParentSettings | null>(null);
  const [offlineStatus, setOfflineStatus] = useState('');
  const [offlineLoading, setOfflineLoading] = useState(false);

  useEffect(() => {
    setSettings(getParentSettings());
  }, []);

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
          {/* Pronunciation */}
          <div className="bg-gray-50 rounded-2xl p-5">
            <h3 className="font-bold text-navy text-lg mb-4">Pronunciation Mode</h3>

            <label className="flex items-center justify-between mb-4">
              <span className="font-semibold text-navy">Pronunciation Mode</span>
              <button
                onClick={() => update({ pronunciation_mode: !settings.pronunciation_mode })}
                className={`w-14 h-7 rounded-full transition-colors ${settings.pronunciation_mode ? 'bg-grass' : 'bg-gray-300'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${settings.pronunciation_mode ? 'translate-x-7' : 'translate-x-0.5'}`} />
              </button>
            </label>

            {settings.pronunciation_mode && (
              <>
                <label className="flex items-center justify-between mb-4">
                  <div>
                    <span className="font-semibold text-navy block">Microphone Mode</span>
                    <span className="text-xs text-gray-500">Uses Web Speech API</span>
                  </div>
                  <button
                    onClick={() => update({ microphone_mode: true })}
                    className={`px-4 py-2 rounded-lg font-bold text-sm ${settings.microphone_mode ? 'bg-navy text-white' : 'bg-gray-200 text-gray-600'}`}
                  >
                    🎤 Mic
                  </button>
                </label>

                <label className="flex items-center justify-between mb-4">
                  <div>
                    <span className="font-semibold text-navy block">Parent Confirms Mode</span>
                    <span className="text-xs text-gray-500">Parent taps ✓ or ✗</span>
                  </div>
                  <button
                    onClick={() => update({ microphone_mode: false })}
                    className={`px-4 py-2 rounded-lg font-bold text-sm ${!settings.microphone_mode ? 'bg-navy text-white' : 'bg-gray-200 text-gray-600'}`}
                  >
                    👆 Parent
                  </button>
                </label>

                <label className="flex items-center justify-between">
                  <span className="font-semibold text-navy">Show syllable hint immediately</span>
                  <button
                    onClick={() => update({ show_syllable_hint: !settings.show_syllable_hint })}
                    className={`w-14 h-7 rounded-full transition-colors ${settings.show_syllable_hint ? 'bg-grass' : 'bg-gray-300'}`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${settings.show_syllable_hint ? 'translate-x-7' : 'translate-x-0.5'}`} />
                  </button>
                </label>
              </>
            )}
          </div>

          {/* Text-to-Speech */}
          <div className="bg-gray-50 rounded-2xl p-5">
            <h3 className="font-bold text-navy text-lg mb-4">Text-to-Speech</h3>
            <label className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-navy block">Auto-read questions</span>
                <span className="text-xs text-gray-500">Reads each question aloud automatically</span>
              </div>
              <button
                onClick={() => update({ auto_read_questions: !settings.auto_read_questions })}
                className={`w-14 h-7 rounded-full transition-colors ${settings.auto_read_questions ? 'bg-grass' : 'bg-gray-300'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${settings.auto_read_questions ? 'translate-x-7' : 'translate-x-0.5'}`} />
              </button>
            </label>
          </div>

          {/* Assessment */}
          <div className="bg-gray-50 rounded-2xl p-5">
            <h3 className="font-bold text-navy text-lg mb-4">Assessment Mode</h3>

            <label className="flex items-center justify-between mb-4">
              <span className="font-semibold text-navy">Show assessment prompt after games</span>
              <button
                onClick={() => update({ show_assessment_prompt: !settings.show_assessment_prompt })}
                className={`w-14 h-7 rounded-full transition-colors ${settings.show_assessment_prompt ? 'bg-grass' : 'bg-gray-300'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${settings.show_assessment_prompt ? 'translate-x-7' : 'translate-x-0.5'}`} />
              </button>
            </label>

            <label className="flex items-center justify-between mb-4">
              <span className="font-semibold text-navy">Require parent PIN to start assessment</span>
              <button
                onClick={() => update({ require_pin: !settings.require_pin })}
                className={`w-14 h-7 rounded-full transition-colors ${settings.require_pin ? 'bg-grass' : 'bg-gray-300'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${settings.require_pin ? 'translate-x-7' : 'translate-x-0.5'}`} />
              </button>
            </label>

            {settings.require_pin && (
              <div className="mb-4">
                <label className="text-sm font-bold text-navy block mb-1">4-digit PIN</label>
                <input
                  type="text"
                  maxLength={4}
                  value={settings.parent_pin}
                  onChange={e => update({ parent_pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  className="border-2 border-gray-300 rounded-lg p-2 w-24 text-center text-lg tracking-widest"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-bold text-navy block mb-1">Scheduled Weekly Assessment Day</label>
              <select
                value={settings.scheduled_assessment_day || ''}
                onChange={e => update({ scheduled_assessment_day: e.target.value || null })}
                className="border-2 border-gray-300 rounded-lg p-2"
              >
                <option value="">Off</option>
                <option value="sunday">Sunday</option>
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
                <option value="saturday">Saturday</option>
              </select>
            </div>
          </div>

          {/* Offline Mode */}
          <div className="bg-gray-50 rounded-2xl p-5">
            <h3 className="font-bold text-navy text-lg mb-4">Offline Mode ✈️</h3>
            <p className="text-sm text-gray-600 mb-4">Pre-load questions so the app works without internet — great for airplane travel.</p>
            <button
              onClick={async () => {
                setOfflineLoading(true);
                await preloadForOffline(msg => setOfflineStatus(msg));
                setOfflineLoading(false);
              }}
              disabled={offlineLoading}
              className="bg-navy text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50"
            >
              {offlineLoading ? 'Downloading...' : 'Pre-load for Offline'}
            </button>
            {offlineStatus && <p className="text-sm text-gray-500 mt-2">{offlineStatus}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
