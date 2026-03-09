'use client';

import { useCallback, useEffect } from 'react';
import { PhotographerId, PropertyTier } from '@/types';
import { useLocalStorage } from './useLocalStorage';

export interface AppSettings {
  darkMode: boolean;
  defaultPhotographer: PhotographerId;
  defaultTier: PropertyTier;
  defaultMode: 'detail' | 'quick';
  hapticEnabled: boolean;
  soundEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  defaultPhotographer: 'nick',
  defaultTier: 'three_two',
  defaultMode: 'detail',
  hapticEnabled: true,
  soundEnabled: true,
};

export function useSettings() {
  const [settings, setSettings] = useLocalStorage<AppSettings>(
    'v2-settings',
    DEFAULT_SETTINGS
  );

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
