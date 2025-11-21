"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useGameState } from "@/hooks/use-game-state";

interface DemoModeContextType {
  isDemoMode: boolean;
  isAutoPlaying: boolean;
  demoSpeed: number;
  progress: number;
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
  const [progress, setProgress] = useState(0);
  const { gameState, navigateToLevel, completeLevel } = useGameState();
  
  // Ref to track current step for interval callback without staleness
  const currentDemoStepRef = useRef(0);

  // Sync ref with state
  useEffect(() => {
    currentDemoStepRef.current = currentDemoStep;
  }, [currentDemoStep]);

  // Reset progress when step changes
  useEffect(() => {
    setProgress(0);
  }, [currentDemoStep]);

  // Auto-advance demo steps
  useEffect(() => {
    if (!isDemoMode || !isAutoPlaying) return;

    // Ensure we are visually on the current step's level
    // If we are not at the correct level, go there immediately and don't start timer yet
    const targetLevel = gameState.levels[currentDemoStep];
    if (targetLevel && gameState.currentLevel !== targetLevel.id) {
         skipToLevel(targetLevel.id);
         return;
    }

    const intervalTime = 50; // 50ms updates for smoothness
    const baseDuration = 5000; // 5 seconds per step at 1x speed
    const duration = baseDuration / demoSpeed;
    const progressIncrement = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextDemoStep();
          return 0;
        }
        return Math.min(prev + progressIncrement, 100);
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isDemoMode, isAutoPlaying, demoSpeed, gameState, currentDemoStep]); 

  const setDemoMode = (enabled: boolean) => {
    setIsDemoMode(enabled);
    if (!enabled) {
      setIsAutoPlaying(false);
      setCurrentDemoStep(0);
      setProgress(0);
    }
  };

  const setAutoPlay = (enabled: boolean) => {
    setIsAutoPlaying(enabled);
    if (!enabled) setProgress(0);
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
      
      // Update local demo step tracker
      const index = gameState.levels.findIndex(l => l.id === levelId);
      if (index !== -1) {
          setCurrentDemoStep(index);
      }
    }
  };

  const nextDemoStep = () => {
    if (!gameState) return;

    // Use ref to get fresh current step without dependency cycle
    const current = currentDemoStepRef.current;
    const totalLevels = gameState.levels.length;
    const nextStep = (current + 1) % totalLevels;
    
    // Navigate using skipToLevel which handles the state update safely
    const nextLevel = gameState.levels[nextStep];
    if (nextLevel) {
        skipToLevel(nextLevel.id);
    }
  };

  const value: DemoModeContextType = {
    isDemoMode,
    isAutoPlaying,
    demoSpeed,
    progress,
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
