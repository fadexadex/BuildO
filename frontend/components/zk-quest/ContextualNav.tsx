"use client";

import { Button } from "@/components/ui/button";
import { useGameState } from "@/hooks/use-game-state";
import { useWallet } from "@/contexts/WalletContext";
import { ArrowLeft, Play } from "lucide-react";

export function ContextualNav() {
  const { gameState, returnToMap } = useGameState();
  const { isConnected, connect } = useWallet();

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

  // On Map, Disconnected
  if (!isConnected) {
    return (
      <Button 
        onClick={connect}
        className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20 animate-pulse"
      >
        <Play className="w-4 h-4" />
        Connect to Begin
      </Button>
    );
  }

  // On Map, Connected
  return (
    <div className="flex items-center gap-2">
      <div className="text-sm text-slate-400 mr-2 hidden md:block">
        Select a level to continue
      </div>
    </div>
  );
}
