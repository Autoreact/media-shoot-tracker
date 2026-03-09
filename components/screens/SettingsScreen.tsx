'use client';

import { PhotographerId, PropertyTier, PHOTOGRAPHERS } from '@/types';
import { TIER_INFO, TIER_ORDER } from '@/lib/data/tier-info';
import { AppSettings } from '@/lib/hooks/useSettings';
import {
  ChevronLeftIcon,
  MoonIcon,
  SunIcon,
  SpeakerWaveIcon,
  DevicePhoneMobileIcon,
  UserIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';

interface Props {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => void;
  onBack: () => void;
}

function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}): React.ReactElement {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        enabled ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function SettingsScreen({
  settings,
  onUpdate,
  onBack,
}: Props): React.ReactElement {
  return (
    <div className="flex flex-col min-h-screen animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 px-4 pt-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center text-neutral-600 dark:text-neutral-400"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-neutral-950 dark:text-white">Settings</h2>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-5">
        {/* Appearance */}
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">
            Appearance
          </h3>
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-100 dark:divide-neutral-700">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                {settings.darkMode ? (
                  <MoonIcon className="w-5 h-5 text-primary-500" />
                ) : (
                  <SunIcon className="w-5 h-5 text-warning-500" />
                )}
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Dark Mode
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {settings.darkMode ? 'On' : 'Off'}
                  </p>
                </div>
              </div>
              <Toggle
                enabled={settings.darkMode}
                onToggle={() => onUpdate({ darkMode: !settings.darkMode })}
              />
            </div>
          </div>
        </section>

        {/* Default Photographer */}
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">
            Default Photographer
          </h3>
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-3">
            <div className="flex items-center gap-2 mb-2">
              <UserIcon className="w-4 h-4 text-neutral-500" />
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Pre-selected when starting shoots
              </span>
            </div>
            <div className="flex gap-2">
              {PHOTOGRAPHERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() =>
                    onUpdate({ defaultPhotographer: p.id as PhotographerId })
                  }
                  className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                    settings.defaultPhotographer === p.id
                      ? 'text-white'
                      : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                  }`}
                  style={
                    settings.defaultPhotographer === p.id
                      ? { backgroundColor: p.color }
                      : undefined
                  }
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      settings.defaultPhotographer === p.id
                        ? 'bg-white/30 text-white'
                        : 'text-white'
                    }`}
                    style={
                      settings.defaultPhotographer !== p.id
                        ? { backgroundColor: p.color }
                        : undefined
                    }
                  >
                    {p.initials[0]}
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Default Tier */}
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">
            Default Tier
          </h3>
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-3">
            <div className="flex items-center gap-2 mb-2">
              <AdjustmentsHorizontalIcon className="w-4 h-4 text-neutral-500" />
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Fallback when AI suggestion is unavailable
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TIER_ORDER.map((t) => {
                const info = TIER_INFO[t];
                const isSelected = settings.defaultTier === t;
                return (
                  <button
                    key={t}
                    onClick={() => onUpdate({ defaultTier: t as PropertyTier })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-primary-500 text-white'
                        : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    {info.displayName}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Default Mode */}
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">
            Default Tracking Mode
          </h3>
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdate({ defaultMode: 'detail' })}
                className={`p-3 rounded-lg text-left border-2 transition-colors ${
                  settings.defaultMode === 'detail'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700'
                }`}
              >
                <p className="text-sm font-bold text-neutral-950 dark:text-white">
                  Room Tracker
                </p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  Per-room counting
                </p>
              </button>
              <button
                onClick={() => onUpdate({ defaultMode: 'quick' })}
                className={`p-3 rounded-lg text-left border-2 transition-colors ${
                  settings.defaultMode === 'quick'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700'
                }`}
              >
                <p className="text-sm font-bold text-neutral-950 dark:text-white">
                  Quick Count
                </p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  Simple tap counter
                </p>
              </button>
            </div>
          </div>
        </section>

        {/* Feedback */}
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">
            Feedback
          </h3>
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-100 dark:divide-neutral-700">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <DevicePhoneMobileIcon className="w-5 h-5 text-neutral-500" />
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Haptic Feedback
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Vibrate on interactions
                  </p>
                </div>
              </div>
              <Toggle
                enabled={settings.hapticEnabled}
                onToggle={() =>
                  onUpdate({ hapticEnabled: !settings.hapticEnabled })
                }
              />
            </div>
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <SpeakerWaveIcon className="w-5 h-5 text-neutral-500" />
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Sound Effects
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Click sounds on tap
                  </p>
                </div>
              </div>
              <Toggle
                enabled={settings.soundEnabled}
                onToggle={() =>
                  onUpdate({ soundEnabled: !settings.soundEnabled })
                }
              />
            </div>
          </div>
        </section>

        {/* App Info */}
        <section>
          <div className="text-center py-4">
            <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500">
              323 Media Shoot Tracker
            </p>
            <p className="text-[10px] text-neutral-300 dark:text-neutral-600">
              V2.0.0 · Built for 323 Media
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
