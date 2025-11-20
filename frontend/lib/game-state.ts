// Game State Management for ZK Quest
// Tracks player progression, XP, achievements, and completed levels

export interface Level {
  id: number;
  world: number;
  name: string;
  description: string;
  xpReward: number;
  completed: boolean;
  completedAt?: Date;
  completionTime?: number; // Time in seconds
  attempts: number;
  proofHash?: string;
  nftTokenId?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  nftTokenId?: string;
  unlockedAt?: Date;
}

export interface GameState {
  version: number;
  playerId: string;
  playerName: string;
  xp: number;
  level: number;
  currentWorld: number;
  currentLevel: number;
  currentLevelStartTime?: number;
  isPlaying: boolean;
  completedLevels: number[];
  achievements: Achievement[];
  levels: Level[];
  hederaAccountId?: string;
  createdAt: Date;
  lastUpdatedAt: Date;
}

// Default levels configuration
const DEFAULT_LEVELS: Level[] = [
  // World 1 - Visual Learning (3D Interactive)
  {
    id: 1,
    world: 1,
    name: "Color Game",
    description: "Learn the basics of zero-knowledge proofs with colored balls",
    xpReward: 100,
    completed: false,
    attempts: 0,
  },
  {
    id: 2,
    world: 1,
    name: "Cave Challenge",
    description: "Navigate a mysterious cave using probability-based proofs",
    xpReward: 150,
    completed: false,
    attempts: 0,
  },
  {
    id: 3,
    world: 1,
    name: "Sudoku Scrambler",
    description: "Prove you have a valid Sudoku solution without revealing it",
    xpReward: 200,
    completed: false,
    attempts: 0,
  },
  // World 2 - Circuit Building
  {
    id: 4,
    world: 2,
    name: "Number Range Prover",
    description: "Build your first Circom circuit to prove a number is in range",
    xpReward: 250,
    completed: false,
    attempts: 0,
  },
  {
    id: 5,
    world: 2,
    name: "Age Verifier",
    description: "Create a circuit that proves age without revealing birthdate",
    xpReward: 300,
    completed: false,
    attempts: 0,
  },
  {
    id: 6,
    world: 2,
    name: "Hash Matcher",
    description: "Build a circuit that verifies hash preimages",
    xpReward: 350,
    completed: false,
    attempts: 0,
  },
  // World 3 - Advanced Applications
  {
    id: 7,
    world: 3,
    name: "Private Token Transfer",
    description: "Implement a privacy-preserving token transfer system",
    xpReward: 400,
    completed: false,
    attempts: 0,
  },
  {
    id: 8,
    world: 3,
    name: "Anonymous Voting",
    description: "Create a fully anonymous voting system with public tallies",
    xpReward: 450,
    completed: false,
    attempts: 0,
  },
  {
    id: 9,
    world: 3,
    name: "zkRollup Simulator",
    description: "Build a simplified zkRollup with batch proof generation",
    xpReward: 500,
    completed: false,
    attempts: 0,
  },
];

// Calculate player level from XP (every 500 XP = 1 level)
export function calculateLevel(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

// Local storage key
const STORAGE_KEY = "zk-quest-game-state";
const CURRENT_VERSION = 1;

// Initialize new game state
export function createInitialGameState(): GameState {
  const playerId = generatePlayerId();
  return {
    version: CURRENT_VERSION,
    playerId,
    playerName: `Player_${playerId.substring(0, 6)}`,
    xp: 0,
    level: 1,
    currentWorld: 1,
    currentLevel: 1,
    isPlaying: false,
    completedLevels: [],
    achievements: [],
    levels: DEFAULT_LEVELS,
    createdAt: new Date(),
    lastUpdatedAt: new Date(),
  };
}

// Generate unique player ID
function generatePlayerId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Load game state from localStorage
export function loadGameState(): GameState {
  if (typeof window === "undefined") {
    return createInitialGameState();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createInitialGameState();
    }

    const parsed = JSON.parse(stored) as GameState;

    // Migration logic if version changes
    if (parsed.version !== CURRENT_VERSION) {
      return migrateGameState(parsed);
    }

    // Convert date strings back to Date objects
    parsed.createdAt = new Date(parsed.createdAt);
    parsed.lastUpdatedAt = new Date(parsed.lastUpdatedAt);
    parsed.achievements = parsed.achievements.map((a) => ({
      ...a,
      unlockedAt: a.unlockedAt ? new Date(a.unlockedAt) : undefined,
    }));
    parsed.levels = parsed.levels.map((l) => ({
      ...l,
      completedAt: l.completedAt ? new Date(l.completedAt) : undefined,
      attempts: l.attempts || 0,
    }));

    return parsed;
  } catch (error) {
    console.error("Error loading game state:", error);
    return createInitialGameState();
  }
}

// Save game state to localStorage
export function saveGameState(state: GameState): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    state.lastUpdatedAt = new Date();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Error saving game state:", error);
  }
}

// Migrate game state from older versions
function migrateGameState(oldState: GameState): GameState {
  // For now, just create a fresh state
  // In future, add migration logic here
  console.log("Migrating game state from version", oldState.version);
  return createInitialGameState();
}

// Complete a level
export function completeLevel(
  state: GameState,
  levelId: number,
  proofHash?: string,
  nftTokenId?: string
): GameState {
  // Validate inputs
  if (!state || !state.levels) {
    console.error("Invalid game state provided to completeLevel");
    return state;
  }

  if (!Number.isInteger(levelId) || levelId < 1 || levelId > 9) {
    console.error(`Invalid levelId: ${levelId}`);
    return state;
  }

  const levelIndex = state.levels.findIndex((l) => l.id === levelId);
  if (levelIndex === -1) {
    console.warn(`Level ${levelId} not found in game state`);
    return state;
  }

  const level = state.levels[levelIndex];
  
  // Check if level is unlocked
  if (!isLevelUnlocked(state, levelId)) {
    console.warn(`Attempted to complete locked level ${levelId}`);
    return state;
  }

  // Calculate completion time
  let completionTime = level.completionTime;
  if (state.currentLevelStartTime) {
    const duration = Math.floor((Date.now() - state.currentLevelStartTime) / 1000);
    // If already completed, keep the best time (lowest), otherwise set it
    if (completionTime) {
      completionTime = Math.min(completionTime, duration);
    } else {
      completionTime = duration;
    }
  }

  // Check if already completed (idempotent - safe to call multiple times)
  if (level.completed) {
    // Update stats if time improved or proof/nft provided
    if (completionTime !== level.completionTime || proofHash || nftTokenId) {
      const newLevels = [...state.levels];
      newLevels[levelIndex] = {
        ...level,
        completionTime,
        proofHash: proofHash || level.proofHash,
        nftTokenId: nftTokenId || level.nftTokenId,
      };
      return {
        ...state,
        levels: newLevels,
      };
    }
    return state; // No changes needed
  }

  // Validate XP reward
  const xpReward = level.xpReward || 0;
  if (xpReward < 0) {
    console.warn(`Invalid XP reward for level ${levelId}: ${xpReward}`);
  }

  const newLevels = [...state.levels];
  newLevels[levelIndex] = {
    ...level,
    completed: true,
    completedAt: new Date(),
    completionTime,
    proofHash: proofHash || level.proofHash,
    nftTokenId: nftTokenId || level.nftTokenId,
  };

  const newXp = Math.max(0, state.xp + xpReward); // Ensure XP doesn't go negative
  const newLevel = calculateLevel(newXp);
  
  // Ensure completedLevels doesn't have duplicates
  const newCompletedLevels = state.completedLevels.includes(levelId)
    ? state.completedLevels
    : [...state.completedLevels, levelId];

  return {
    ...state,
    xp: newXp,
    level: newLevel,
    completedLevels: newCompletedLevels,
    levels: newLevels,
  };
}

// Unlock an achievement
export function unlockAchievement(
  state: GameState,
  achievement: Achievement
): GameState {
  const existing = state.achievements.find((a) => a.id === achievement.id);
  if (existing) {
    return state; // Already unlocked
  }

  const newAchievement = {
    ...achievement,
    unlockedAt: new Date(),
  };

  return {
    ...state,
    achievements: [...state.achievements, newAchievement],
  };
}

// Update player name
export function updatePlayerName(state: GameState, name: string): GameState {
  return {
    ...state,
    playerName: name,
  };
}

// Link Hedera account
export function linkHederaAccount(
  state: GameState,
  accountId: string
): GameState {
  return {
    ...state,
    hederaAccountId: accountId,
  };
}

// Get next unlocked level
export function getNextLevel(state: GameState): Level | null {
  const nextLevel = state.levels.find((l) => !l.completed);
  return nextLevel || null;
}

// Get levels by world
export function getLevelsByWorld(state: GameState, world: number): Level[] {
  return state.levels.filter((l) => l.world === world);
}

// Check if level is unlocked (previous level completed or first level)
export function isLevelUnlocked(state: GameState, levelId: number): boolean {
  if (levelId === 1) return true;

  const level = state.levels.find((l) => l.id === levelId);
  if (!level) return false;

  // Check if previous level in same world is completed
  const previousLevel = state.levels.find(
    (l) => l.world === level.world && l.id === levelId - 1
  );

  if (previousLevel) {
    return previousLevel.completed;
  }

  // If no previous level in world, check if it's the first level of a new world
  const previousWorld = level.world - 1;
  if (previousWorld > 0) {
    const previousWorldLevels = getLevelsByWorld(state, previousWorld);
    return previousWorldLevels.every((l) => l.completed);
  }

  return false;
}

// Navigate to world/level
export function navigateToLevel(
  state: GameState,
  world: number,
  levelId: number
): GameState {
  const levelIndex = state.levels.findIndex((l) => l.id === levelId);
  if (levelIndex === -1) return state;

  const newLevels = [...state.levels];
  newLevels[levelIndex] = {
    ...newLevels[levelIndex],
    attempts: (newLevels[levelIndex].attempts || 0) + 1,
  };

  return {
    ...state,
    levels: newLevels,
    currentWorld: world,
    currentLevel: levelId,
    currentLevelStartTime: Date.now(),
    isPlaying: true,
  };
}

// Return to map
export function returnToMap(state: GameState): GameState {
  return {
    ...state,
    isPlaying: false,
  };
}

// Reset game state (for testing/demo)
export function resetGameState(): GameState {
  const newState = createInitialGameState();
  saveGameState(newState);
  return newState;
}
