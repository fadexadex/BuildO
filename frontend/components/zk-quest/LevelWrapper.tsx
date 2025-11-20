"use client";

import { useState, useEffect } from "react";
import { LevelIntro } from "./LevelIntro";
import { QuizModule } from "./QuizModule";
import { useGameState } from "@/hooks/use-game-state";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface LevelWrapperProps {
  levelId: string;
  children: React.ReactNode;
}

type LevelStage = "intro" | "pre-quiz" | "game" | "post-quiz";

export function LevelWrapper({ levelId, children }: LevelWrapperProps) {
  const { returnToMap } = useGameState();
  const [stage, setStage] = useState<LevelStage>("intro");
  
  // We could persist this state so users don't see intro/quiz every time
  // For now, we'll just show it every time they enter the level for demo purposes

  const handleIntroComplete = () => {
    setStage("pre-quiz");
  };

  const handlePreQuizComplete = (score: number) => {
    // We could log the score here
    console.log(`Pre-quiz score for ${levelId}: ${score}`);
    setStage("game");
  };

  const handlePreQuizSkip = () => {
    setStage("game");
  };

  // If we wanted to handle post-quiz here, we'd need a callback from the game
  // For now, let's just handle the entry flow

  return (
    <div className="relative w-full h-full">
      {/* Back button is always visible in game, but maybe we hide it during intro/quiz? */}
      {stage === "game" && (
        <div className="absolute top-4 left-4 z-40">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={returnToMap}
            className="bg-slate-900/80 backdrop-blur border-slate-700 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Exit Level
          </Button>
        </div>
      )}

      {stage === "intro" && (
        <LevelIntro levelId={levelId} onComplete={handleIntroComplete} />
      )}

      {stage === "pre-quiz" && (
        <QuizModule 
          levelId={levelId} 
          type="pre" 
          onComplete={handlePreQuizComplete}
          onSkip={handlePreQuizSkip}
        />
      )}

      {/* We always render the game in the background or when active */}
      <div className={stage === "game" ? "block h-full" : "hidden h-full"}>
        {children}
      </div>
    </div>
  );
}
