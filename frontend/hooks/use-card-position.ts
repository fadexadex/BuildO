"use client";

import { useState, useEffect } from "react";

interface CardPosition {
  x: number;
  y: number;
}

interface CardState {
  isMinimized: boolean;
  position: CardPosition;
}

export function useCardPosition(levelId: string, defaultPosition = { x: 20, y: 80 }) {
  const [state, setState] = useState<CardState>({
    isMinimized: false,
    position: defaultPosition,
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`zk-quest-card-${levelId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(parsed);
      } catch (e) {
        console.error("Failed to parse card state", e);
      }
    }
    setIsLoaded(true);
  }, [levelId]);

  // Save to local storage on change
  const updateState = (newState: Partial<CardState>) => {
    setState((prev) => {
      const updated = { ...prev, ...newState };
      localStorage.setItem(`zk-quest-card-${levelId}`, JSON.stringify(updated));
      return updated;
    });
  };

  return {
    isMinimized: state.isMinimized,
    position: state.position,
    toggleMinimize: () => updateState({ isMinimized: !state.isMinimized }),
    setPosition: (pos: CardPosition) => updateState({ position: pos }),
    isLoaded
  };
}
