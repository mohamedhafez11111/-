"use client";
import { createContext, useContext } from "react";

export interface Settings {
  digits: "western" | "eastern";
  theme: "light" | "dark" | "system";
  fontScale: number;
}

export const DEFAULT_SETTINGS: Settings = { digits: "western", theme: "light", fontScale: 1 };

export const SettingsContext = createContext<{ settings: Settings; setSettings: (s: Partial<Settings>) => void }>({
  settings: DEFAULT_SETTINGS,
  setSettings: () => {},
});

export const useSettings = () => useContext(SettingsContext);
