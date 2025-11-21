"use client";

import { Button } from "@/components/ui/button";
import { useGameState } from "@/hooks/use-game-state";
import { ArrowLeft } from "lucide-react";

export function ContextualNav() {
  const { gameState, returnToMap } = useGameState();

  if (!gameState) return null;

  // In Level
  if (gameState.isPlaying) {
    return (
      <Button 
        variant="ghost" 
        onClick={returnToMap}
        className="gap-2 text-slate-200 hover:text-white hover:bg-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Exit to Map
      </Button>
    );
  }

  // On Map
  return (
    <div className="flex items-center gap-2">
      <div className="text-sm text-slate-400 mr-2 hidden md:block">
        Select a level to continue
      </div>
    </div>
  );
}
