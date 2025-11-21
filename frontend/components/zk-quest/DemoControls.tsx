"use client";

import { useState, useEffect } from "react";
import { motion, useDragControls } from "framer-motion";
import { useDemoMode } from "@/hooks/use-demo-mode";
import { useGameState } from "@/hooks/use-game-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  SkipForward,
  FastForward,
  CheckCircle2,
  Circle,
  ChevronDown,
  Settings,
  Info
} from "lucide-react";

export function DemoControlPanel() {
  const {
    isDemoMode,
    isAutoPlaying,
    demoSpeed,
    progress,
    setDemoMode,
    setAutoPlay,
    setDemoSpeed,
    skipToLevel,
    nextDemoStep,
  } = useDemoMode();
  const { gameState } = useGameState();
  const [isExpanded, setIsExpanded] = useState(false);
  const [localSpeed, setLocalSpeed] = useState(demoSpeed);
  const dragControls = useDragControls();

  useEffect(() => {
    setLocalSpeed(demoSpeed);
  }, [demoSpeed]);

  if (!gameState) return null;

  return (
    <div className="fixed bottom-20 left-4 z-50 pointer-events-none">
      {/* Compact button when collapsed */}
      {!isExpanded && (
        <div className="pointer-events-auto">
          <Button
            variant="default"
            size="lg"
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-900/20"
            onClick={() => setIsExpanded(true)}
          >
            <Settings className="w-5 h-5" />
            Demo Controls
          </Button>
        </div>
      )}

      {/* Expanded panel */}
      {isExpanded && (
        <motion.div
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0.12}
          dragTransition={{ bounceStiffness: 220, bounceDamping: 28 }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="pointer-events-auto"
        >
          <Card className="w-80 bg-slate-900/95 backdrop-blur-md border-slate-700 shadow-2xl">
            <CardHeader
              className="pb-3 p-4 cursor-grab active:cursor-grabbing select-none transition-colors duration-200 hover:bg-slate-800/40 rounded-t-lg"
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                dragControls.start(event);
              }}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-white flex items-center gap-2 select-none">
                  <Settings className="w-4 h-4 text-purple-400" />
                  Demo Controls
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(false)}
                  className="cursor-pointer h-6 w-6"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 cursor-default p-4 pt-0">
              {/* Demo Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="demo-mode" className="text-xs text-slate-300">
                  Demo Mode
                </Label>
                {isDemoMode && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                    Active
                  </Badge>
                )}
              </div>
              <Switch
                id="demo-mode"
                checked={isDemoMode}
                onCheckedChange={setDemoMode}
                className="scale-75 origin-right"
              />
            </div>

            {isDemoMode && (
              <>
                {/* Auto-play Controls */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-300">Auto-Play</Label>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAutoPlay(!isAutoPlaying)}
                        className="gap-1 h-7 text-xs"
                      >
                        {isAutoPlaying ? (
                          <>
                            <Pause className="w-3 h-3" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            Play
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={nextDemoStep}
                      >
                        <SkipForward className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {isAutoPlaying && (
                    <Progress value={progress} className="h-1 bg-slate-800" indicatorClassName="bg-purple-500 duration-75 ease-linear" />
                  )}

                  {/* Speed Control */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-slate-400">
                        <FastForward className="w-3 h-3 inline mr-1" />
                        Speed: {localSpeed}x
                      </Label>
                    </div>
                    <Slider
                      value={[localSpeed]}
                      onValueChange={(value) => setLocalSpeed(value[0])}
                      onValueCommit={(value) => setDemoSpeed(value[0])}
                      min={0.5}
                      max={3}
                      step={0.5}
                      className="w-full py-1"
                    />
                  </div>
                </div>

                {/* Quick Level Navigation */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">
                    Skip to Level
                  </Label>
                  <div className="grid grid-cols-4 gap-1">
                    {gameState.levels.map((level) => {
                      const isCompleted = gameState.completedLevels.includes(
                        level.id
                      );
                      return (
                        <Button
                          key={level.id}
                          variant={isCompleted ? "default" : "outline"}
                          size="sm"
                          className="h-6 text-[10px] px-0 justify-center"
                          onClick={() => skipToLevel(level.id)}
                          title={level.name}
                        >
                          {level.id}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Level Info */}
                <div className="bg-slate-800/50 rounded-lg p-2 space-y-0.5">
                  <div className="text-[10px] text-slate-400">Current Level</div>
                  <div className="text-xs text-white font-semibold truncate">
                    {gameState.levels[gameState.currentLevel - 1]?.name ||
                      "Unknown"}
                  </div>
                </div>

                {/* Demo Tips */}
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2">
                  <div className="flex items-center gap-1.5 mb-1 text-purple-300">
                    <Info className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Tour Guide</span>
                  </div>
                  <div className="text-xs text-slate-200 leading-relaxed line-clamp-3">
                    {gameState.levels.find(l => l.id === gameState.currentLevel)?.description || 
                     "Welcome to ZK Quest! Enable Auto-Play to start the guided tour."}
                  </div>
                </div>
              </>
            )}
            </CardContent>
          </Card>
        </motion.div>
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
