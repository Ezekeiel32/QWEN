"use client";

import { useState, useEffect, useCallback } from 'react';

const DEFAULT_SETTINGS = {
  ollamaUrl: 'https://004a-2a06-c701-9364-c400-cac4-f2d1-96f6-f49f.ngrok-free.app',
  ollamaModel: 'qwen2:7b-custom',
  githubPat: '',
};

type Settings = typeof DEFAULT_SETTINGS;

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem('qwen-weaver-settings');
      if (storedSettings) {
        setSettingsState(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage", error);
    } finally {
        setIsLoaded(true);
    }
  }, []);

  const setSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettingsState(prevSettings => {
      const updatedSettings = { ...prevSettings, ...newSettings };
      try {
        localStorage.setItem('qwen-weaver-settings', JSON.stringify(updatedSettings));
      } catch (error) {
        console.error("Failed to save settings to localStorage", error);
      }
      return updatedSettings;
    });
  }, []);

  return { settings, setSettings, isLoaded };
}
