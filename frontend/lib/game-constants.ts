export interface Rank {
  id: number;
  name: string;
  minXp: number;
  maxXp: number;
}

export const RANKS: Rank[] = [
  { id: 1, name: "Novice", minXp: 0, maxXp: 100 },
  { id: 2, name: "Apprentice", minXp: 100, maxXp: 300 },
  { id: 3, name: "Practitioner", minXp: 300, maxXp: 600 },
  { id: 4, name: "Expert", minXp: 600, maxXp: 1000 },
];

export const MAX_RANK = 4;

export function getRankForXp(xp: number): Rank {
  const rank = RANKS.find((r) => xp >= r.minXp && xp < r.maxXp);
  if (rank) return rank;
  
  // If XP is higher than max defined, return the highest rank
  if (xp >= RANKS[RANKS.length - 1].maxXp) {
    return RANKS[RANKS.length - 1];
  }
  
  return RANKS[0];
}

export function getNextRank(currentRankId: number): Rank | null {
  const nextRank = RANKS.find((r) => r.id === currentRankId + 1);
  return nextRank || null;
}
