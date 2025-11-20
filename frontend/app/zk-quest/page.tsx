"use client";

import { GameShell } from "@/components/zk-quest/GameShell";
import { GameStateProvider } from "@/hooks/use-game-state";

export default function ZkQuestPage() {
  return (
    <GameStateProvider>
      <GameShell />
    </GameStateProvider>
  );
}
