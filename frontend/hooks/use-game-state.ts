"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  GameState,
  Level,
  Achievement,
  loadGameState,
  saveGameState,
  completeLevel,
  unlockAchievement,
  updatePlayerName,
  linkHederaAccount,
  getNextLevel,
  getLevelsByWorld,
  isLevelUnlocked,
  resetGameState,
  navigateToLevel as navigateToLevelLib,
  returnToMap as returnToMapLib,
} from "@/lib/game-state";

interface GameStateContextType {
  gameState: GameState | null;
  isLoading: boolean;
  completeLevel: (levelId: number, proofHash?: string, nftTokenId?: string) => void;
  unlockAchievement: (achievement: Achievement) => void;
  updatePlayerName: (name: string) => void;
  linkHederaAccount: (accountId: string) => void;
  nextLevel: Level | null;
  getLevelsByWorld: (world: number) => Level[];
  isLevelUnlocked: (levelId: number) => boolean;
  resetGameState: () => void;
  navigateToLevel: (world: number, level: number) => void;
  returnToMap: () => void;
}

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

export function GameStateProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load game state on mount
  useEffect(() => {
    const state = loadGameState();
    setGameState(state);
    setIsLoading(false);
  }, []);

  // Track previous state to avoid unnecessary saves
  const prevStateRef = useRef<string | null>(null);

  // Save game state whenever it changes (debounced to prevent excessive saves)
  useEffect(() => {
    if (gameState && !isLoading) {
      // Serialize state to compare (excluding lastUpdatedAt which changes on save)
      const stateToCompare = JSON.stringify({
        ...gameState,
        lastUpdatedAt: null, // Exclude this from comparison
      });
      
      // Only save if state actually changed
      if (prevStateRef.current !== stateToCompare) {
        prevStateRef.current = stateToCompare;
        saveGameState(gameState);
      }
    }
  }, [gameState, isLoading]);

  // Complete a level
  const handleCompleteLevel = useCallback(
    (levelId: number, proofHash?: string, nftTokenId?: string) => {
      if (!gameState) {
        console.error("Cannot complete level: game state not loaded");
        return;
      }

      // Validate levelId
      if (!Number.isInteger(levelId) || levelId < 1 || levelId > 9) {
        console.error(`Invalid levelId: ${levelId}`);
        return;
      }

      try {
        const newState = completeLevel(gameState, levelId, proofHash, nftTokenId);
        
        // Only update if state actually changed
        if (newState !== gameState) {
          setGameState(newState);
        }
      } catch (error) {
        console.error("Error completing level:", error);
        // Don't update state on error
      }
    },
    [gameState]
  );

  // Unlock an achievement
  const handleUnlockAchievement = useCallback(
    (achievement: Achievement) => {
      if (!gameState) return;
      const newState = unlockAchievement(gameState, achievement);
      setGameState(newState);
    },
    [gameState]
  );

  // Update player name
  const handleUpdatePlayerName = useCallback(
    (name: string) => {
      if (!gameState) return;
      const newState = updatePlayerName(gameState, name);
      setGameState(newState);
    },
    [gameState]
  );

  // Link Hedera account
  const handleLinkHederaAccount = useCallback(
    (accountId: string) => {
      if (!gameState) return;
      const newState = linkHederaAccount(gameState, accountId);
      setGameState(newState);
    },
    [gameState]
  );

  // Get next level - memoize to prevent unnecessary re-renders
  const nextLevel = useMemo(() => {
    return gameState ? getNextLevel(gameState) : null;
  }, [gameState?.completedLevels.length, gameState?.levels.length]);

  // Get levels by world
  const getLevels = useCallback(
    (world: number): Level[] => {
      if (!gameState) return [];
      return getLevelsByWorld(gameState, world);
    },
    [gameState]
  );

  // Check if level is unlocked
  const checkLevelUnlocked = useCallback(
    (levelId: number): boolean => {
      if (!gameState) return false;
      return isLevelUnlocked(gameState, levelId);
    },
    [gameState]
  );

  // Reset game state
  const handleResetGameState = useCallback(() => {
    const newState = resetGameState();
    setGameState(newState);
  }, []);

  // Navigate to world/level
  const navigateToLevel = useCallback(
    (world: number, level: number) => {
      if (!gameState) return;
      const newState = navigateToLevelLib(gameState, world, level);
      setGameState(newState);
    },
    [gameState]
  );

  // Return to map
  const returnToMap = useCallback(() => {
    if (!gameState) return;
    const newState = returnToMapLib(gameState);
    setGameState(newState);
  }, [gameState]);

  const contextValue = {
    gameState,
    isLoading,
    completeLevel: handleCompleteLevel,
    unlockAchievement: handleUnlockAchievement,
    updatePlayerName: handleUpdatePlayerName,
    linkHederaAccount: handleLinkHederaAccount,
    nextLevel,
    getLevelsByWorld: getLevels,
    isLevelUnlocked: checkLevelUnlocked,
    resetGameState: handleResetGameState,
    navigateToLevel,
    returnToMap,
  };

  return React.createElement(
    GameStateContext.Provider,
    { value: contextValue },
    children
  );
}

export function useGameState() {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error("useGameState must be used within a GameStateProvider");
  }
  return context;
}
