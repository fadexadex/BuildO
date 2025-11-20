"use client";

import { useState } from "react";
import { useDemoMode } from "@/hooks/use-demo-mode";
import { useGameState } from "@/hooks/use-game-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Play,
  Pause,
  SkipForward,
  FastForward,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Settings,
} from "lucide-react";

export function DemoControlPanel() {
  const {
    isDemoMode,
    isAutoPlaying,
    demoSpeed,
    setDemoMode,
    setAutoPlay,
    setDemoSpeed,
    skipToLevel,
    nextDemoStep,
  } = useDemoMode();
  const { gameState } = useGameState();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!gameState) return null;

  return (
    <div className="fixed bottom-20 left-4 z-50">
      {/* Compact button when collapsed */}
      {!isExpanded && (
        <Button
          variant="default"
          size="lg"
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          onClick={() => setIsExpanded(true)}
        >
          <Settings className="w-5 h-5" />
          Demo Controls
        </Button>
      )}

      {/* Expanded panel */}
      {isExpanded && (
        <Card className="w-96 bg-slate-900/95 backdrop-blur-md border-slate-700 shadow-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                Demo Controls
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(false)}
              >
                <ChevronDown className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Demo Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="demo-mode" className="text-sm text-slate-300">
                  Demo Mode
                </Label>
                {isDemoMode && (
                  <Badge variant="secondary" className="text-xs">
                    Active
                  </Badge>
                )}
              </div>
              <Switch
                id="demo-mode"
                checked={isDemoMode}
                onCheckedChange={setDemoMode}
              />
            </div>

            {isDemoMode && (
              <>
                {/* Auto-play Controls */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-slate-300">Auto-Play</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAutoPlay(!isAutoPlaying)}
                        className="gap-2"
                      >
                        {isAutoPlaying ? (
                          <>
                            <Pause className="w-4 h-4" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Play
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={nextDemoStep}
                      >
                        <SkipForward className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Speed Control */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-400">
                        <FastForward className="w-3 h-3 inline mr-1" />
                        Speed: {demoSpeed}x
                      </Label>
                    </div>
                    <Slider
                      value={[demoSpeed]}
                      onValueChange={(value) => setDemoSpeed(value[0])}
                      min={0.5}
                      max={3}
                      step={0.5}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Quick Level Navigation */}
                <div className="space-y-2">
                  <Label className="text-sm text-slate-300">
                    Skip to Level
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {gameState.levels.map((level) => {
                      const isCompleted = gameState.completedLevels.includes(
                        level.id
                      );
                      return (
                        <Button
                          key={level.id}
                          variant={isCompleted ? "default" : "outline"}
                          size="sm"
                          className="gap-2 justify-start"
                          onClick={() => skipToLevel(level.id)}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-3 h-3 text-green-400" />
                          ) : (
                            <Circle className="w-3 h-3" />
                          )}
                          {level.id}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Level Info */}
                <div className="bg-slate-800/50 rounded-lg p-3 space-y-1">
                  <div className="text-xs text-slate-400">Current Level</div>
                  <div className="text-sm text-white font-semibold">
                    {gameState.levels[gameState.currentLevel - 1]?.name ||
                      "Unknown"}
                  </div>
                  <div className="text-xs text-slate-500">
                    World {gameState.currentWorld} - Level{" "}
                    {gameState.currentLevel}
                  </div>
                </div>

                {/* Progress Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-xs text-slate-400">Completed</div>
                    <div className="text-lg font-bold text-green-400">
                      {gameState.completedLevels.length}/
                      {gameState.levels.length}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-xs text-slate-400">Total XP</div>
                    <div className="text-lg font-bold text-cyan-400">
                      {gameState.xp}
                    </div>
                  </div>
                </div>

                {/* Demo Tips */}
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                  <div className="text-xs text-purple-300">
                    <strong>Judge Mode:</strong> Use quick navigation to jump
                    between levels. Enable auto-play for a guided tour at your
                    preferred speed.
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface QuickNavProps {
  compact?: boolean;
}

export function QuickNav({ compact = false }: QuickNavProps) {
  const { gameState } = useGameState();
  const { skipToLevel } = useDemoMode();

  if (!gameState) return null;

  if (compact) {
    return (
      <div className="flex gap-2 flex-wrap">
        {gameState.levels.map((level) => {
          const isCompleted = gameState.completedLevels.includes(level.id);
          return (
            <Button
              key={level.id}
              variant={isCompleted ? "default" : "ghost"}
              size="icon"
              className="w-8 h-8"
              onClick={() => skipToLevel(level.id)}
              title={level.name}
            >
              {level.id}
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {gameState.levels.map((level) => {
        const isCompleted = gameState.completedLevels.includes(level.id);
        const isCurrent = gameState.currentLevel === level.id;

        return (
          <Card
            key={level.id}
            className={`cursor-pointer transition-all hover:scale-105 ${
              isCurrent
                ? "border-cyan-500 bg-cyan-500/10"
                : isCompleted
                ? "border-green-500/50 bg-green-500/5"
                : "border-slate-700 bg-slate-800/50"
            }`}
            onClick={() => skipToLevel(level.id)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <Badge variant={isCompleted ? "default" : "secondary"}>
                  Level {level.id}
                </Badge>
                {isCompleted && (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                )}
              </div>
              <div className="text-sm font-semibold text-white mb-1">
                {level.name}
              </div>
              <div className="text-xs text-slate-400 line-clamp-2">
                {level.description}
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-cyan-400">
                <span>+{level.xpReward} XP</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
