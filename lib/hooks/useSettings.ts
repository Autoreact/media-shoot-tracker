'use client';

import { useCallback, useEffect } from 'react';
import { PhotographerId, PropertyTier } from '@/types';
import { useLocalStorage } from './useLocalStorage';

/**
 * Phase 2 (2.7): `userName` is the identity of THIS device's operator.
 * It's separate from `defaultPhotographer` (which seeds the next new shoot).
 * Toggl/Dropbox/email auto-tagging uses `userName` as the fallback when
 * the active shoot has no photographer resolved.
 */
export type UserName = 'Nick' | 'Jared' | 'Ben';

export interface AppSettings {
  darkMode: boolean;
  defaultPhotographer: PhotographerId;
  defaultTier: PropertyTier;
  defaultMode: 'detail' | 'quick';
  hapticEnabled: boolean;
  soundEnabled: boolean;
  userName: UserName;
}

const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  defaultPhotographer: 'nick',
  defaultTier: 'three_two',
  defaultMode: 'detail',
  hapticEnabled: true,
  soundEnabled: true,
  userName: 'Nick',
};

export function useSettings() {
  const [rawSettings, setSettings] = useLocalStorage<AppSettings>(
    'v2-settings',
    DEFAULT_SETTINGS
  );

  // Merge stored values with defaults so newly-added fields (e.g. userName
  // in Phase 2) have a sane value for users whose localStorage predates them.
  const settings: AppSettings = { ...DEFAULT_SETTINGS, ...rawSettings };

  // Sync dark mode class on <html>
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', settings.darkMode);
    }
  }, [settings.darkMode]);

  const update = useCallback(
    (partial: Partial<AppSettings>): void => {
      setSettings((prev) => ({ ...prev, ...partial }));
    },
    [setSettings]
  );

  const toggleDarkMode = useCallback((): void => {
    setSettings((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  }, [setSettings]);

  return { settings, update, toggleDarkMode };
}
