import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { GameMode } from './Common';

type GameModeContextValue = {
  mode: GameMode;
  setMode: (mode: GameMode) => void;
};

const STORAGE_KEY = 'brutemove.gameMode';
const DEFAULT_MODE: GameMode = 'daily';

const GameModeContext = createContext<GameModeContextValue | undefined>(undefined);

export function GameModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<GameMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'daily' || stored === 'live' ? stored : DEFAULT_MODE;
  });

  const setMode = useCallback((next: GameMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return <GameModeContext.Provider value={value}>{children}</GameModeContext.Provider>;
}

export function useGameMode(): GameModeContextValue {
  const ctx = useContext(GameModeContext);
  if (!ctx) {
    throw new Error('useGameMode must be used within a GameModeProvider');
  }
  return ctx;
}
