"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useGameState } from "@/hooks/use-game-state";

interface DemoModeContextType {
  isDemoMode: boolean;
  isAutoPlaying: boolean;
  demoSpeed: number;
  setDemoMode: (enabled: boolean) => void;
  setAutoPlay: (enabled: boolean) => void;
  setDemoSpeed: (speed: number) => void;
  skipToLevel: (levelId: number) => void;
  nextDemoStep: () => void;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(
  undefined
);

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error("useDemoMode must be used within DemoModeProvider");
  }
  return context;
}

interface DemoModeProviderProps {
  children: ReactNode;
}

export function DemoModeProvider({ children }: DemoModeProviderProps) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [demoSpeed, setDemoSpeed] = useState(1); // 1x, 2x, 3x speed
  const [currentDemoStep, setCurrentDemoStep] = useState(0);
  const { gameState, navigateToLevel, completeLevel } = useGameState();

  // Auto-advance demo steps
  useEffect(() => {
    if (!isDemoMode || !isAutoPlaying) return;

    const stepDuration = 10000 / demoSpeed; // 10 seconds per step at 1x speed
    const timer = setTimeout(() => {
      nextDemoStep();
    }, stepDuration);

    return () => clearTimeout(timer);
  }, [isDemoMode, isAutoPlaying, currentDemoStep, demoSpeed]);

  const setDemoMode = (enabled: boolean) => {
    setIsDemoMode(enabled);
    if (!enabled) {
      setIsAutoPlaying(false);
      setCurrentDemoStep(0);
    }
  };

  const setAutoPlay = (enabled: boolean) => {
    setIsAutoPlaying(enabled);
  };

  const skipToLevel = (levelId: number) => {
    if (!gameState) return;

    // Auto-complete all previous levels
    for (let i = 1; i < levelId; i++) {
      if (!gameState.completedLevels.includes(i)) {
        completeLevel(i, `demo-proof-${i}`, `demo-nft-${i}`);
      }
    }

    // Navigate to the requested level
    const level = gameState.levels.find((l) => l.id === levelId);
    if (level) {
      navigateToLevel(level.world, levelId);
    }
  };

  const nextDemoStep = () => {
    if (!gameState) return;

    const totalLevels = gameState.levels.length;
    const nextStep = (currentDemoStep + 1) % totalLevels;
    setCurrentDemoStep(nextStep);

    // Navigate to next level
    const nextLevel = gameState.levels[nextStep];
    if (nextLevel) {
      skipToLevel(nextLevel.id);
    }
  };

  const value: DemoModeContextType = {
    isDemoMode,
    isAutoPlaying,
    demoSpeed,
    setDemoMode,
    setAutoPlay,
    setDemoSpeed,
    skipToLevel,
    nextDemoStep,
  };

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}
