"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Float } from "@react-three/drei";
import { useGameState } from "@/hooks/use-game-state";
import { DemoModeProvider } from "@/hooks/use-demo-mode";
import { useWallet } from "@/contexts/WalletContext";
import { WorldMap } from "./WorldMap";
import { DemoControlPanel } from "./DemoControls";
import { AchievementGallery } from "./AchievementGallery";
import { Leaderboard } from "./Leaderboard";
import { LoadingAnimation } from "./3d/LoadingAnimation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Zap, Settings } from "lucide-react";
import { Suspense, useState, useEffect } from "react";
import { PerformanceStats } from "@/lib/performance";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";

// Dynamic imports for levels
const ColorGame = dynamic(() => import("./levels/ColorGame"));
const CaveChallenge = dynamic(() => import("./levels/CaveChallenge"));
const SudokuScrambler = dynamic(() => import("./levels/SudokuScrambler"));
const RangeProver = dynamic(() => import("./levels/RangeProver"));
const AgeVerifier = dynamic(() => import("./levels/AgeVerifier"));
const HashMatcher = dynamic(() => import("./levels/HashMatcher"));
const PrivateTransfer = dynamic(() => import("./levels/PrivateTransfer"));
const AnonymousVoting = dynamic(() => import("./levels/AnonymousVoting"));
const ZkRollupSimulator = dynamic(() => import("./levels/ZkRollupSimulator"));

function AnimatedBackground() {
  return (
    <>
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
    </>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <LoadingAnimation message="Loading 3D Scene..." type="default" />
      </Canvas>
    </div>
  );
}

export function GameShell() {
  const { gameState, isLoading, resetGameState, returnToMap } = useGameState();
  const { accountId, isConnected, connect, disconnect } = useWallet();
  const [showAchievements, setShowAchievements] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showPerformanceStats, setShowPerformanceStats] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + P = Toggle performance stats
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        setShowPerformanceStats((prev) => !prev);
      }
      // Ctrl/Cmd + A = Open achievements
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        setShowAchievements((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  if (isLoading || !gameState) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="text-white text-2xl">Loading ZK Quest...</div>
      </div>
    );
  }

  const xpProgress = (gameState.xp % 500) / 5; // Calculate percentage for current level
  const completionPercentage = (gameState.completedLevels.length / 9) * 100;

  const renderLevel = () => {
    switch (gameState.currentLevel) {
      case 1: return <ColorGame />;
      case 2: return <CaveChallenge />;
      case 3: return <SudokuScrambler />;
      case 4: return <RangeProver />;
      case 5: return <AgeVerifier />;
      case 6: return <HashMatcher />;
      case 7: return <PrivateTransfer />;
      case 8: return <AnonymousVoting />;
      case 9: return <ZkRollupSimulator />;
      default: return <div className="text-white text-center p-10">Level not found</div>;
    }
  };

  return (
    <DemoModeProvider>
      <div className="relative h-screen w-full overflow-hidden bg-slate-950">
      {/* 3D Background - Disabled for performance/stability
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
          <Suspense fallback={null}>
            <AnimatedBackground />
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              autoRotate
              autoRotateSpeed={0.5}
            />
          </Suspense>
        </Canvas>
      </div>
      */}

      {/* Game UI Overlay */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Logo and Title */}
              <div className="flex items-center gap-4">
                {gameState.isPlaying && (
                  <Button variant="ghost" size="icon" onClick={returnToMap} className="mr-2">
                    <ArrowLeft className="w-6 h-6 text-white" />
                  </Button>
                )}
                <div className="relative">
                  <Zap className="w-8 h-8 text-cyan-400" />
                  <div className="absolute inset-0 blur-xl bg-cyan-400/50" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {gameState.isPlaying && gameState.levels.find(l => l.id === gameState.currentLevel) 
                      ? gameState.levels.find(l => l.id === gameState.currentLevel)?.name 
                      : "ZK Quest"}
                  </h1>
                  <p className="text-sm text-slate-400">
                    {gameState.isPlaying && gameState.levels.find(l => l.id === gameState.currentLevel)
                      ? `Level ${gameState.currentLevel}`
                      : "Zero-Knowledge Proof Playground"}
                  </p>
                </div>
              </div>

              {/* Player Stats */}
              <div className="flex items-center gap-6">
                {/* XP and Level */}
                <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-2 border border-slate-700">
                  <div className="flex flex-col items-end min-w-[3rem]">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Rank</div>
                    <div className="text-xl font-bold text-cyan-400 leading-none">
                      {gameState.level}
                    </div>
                  </div>
                  <div className="h-8 w-px bg-slate-700 mx-1"></div>
                  <div className="w-32 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-400 font-medium">XP PROGRESS</span>
                      <span className="text-[10px] text-slate-300 font-mono">
                        {gameState.xp % 500}/500
                      </span>
                    </div>
                    <Progress 
                      value={xpProgress} 
                      className="h-1.5 bg-slate-900" 
                      indicatorClassName="bg-gradient-to-r from-cyan-500 to-blue-500" 
                    />
                  </div>
                </div>

                {/* Achievements */}
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 hover:bg-yellow-500/20"
                  onClick={() => setShowAchievements(true)}
                >
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span className="text-white font-semibold">
                    {gameState.achievements.length}
                  </span>
                </Button>

                {/* Leaderboard */}
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 hover:bg-blue-500/20"
                  onClick={() => setShowLeaderboard(true)}
                >
                  <Star className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-semibold">Leaderboard</span>
                </Button>

                {/* Completion */}
                <Badge variant="secondary" className="gap-2">
                  <Star className="w-4 h-4" />
                  {gameState.completedLevels.length}/9 Levels
                </Badge>

                {/* Wallet Connect */}
                <Button
                  variant={isConnected ? "outline" : "default"}
                  className={isConnected ? "border-cyan-500/50 text-cyan-400 hover:bg-cyan-950" : "bg-indigo-600 hover:bg-indigo-500"}
                  onClick={isConnected ? disconnect : connect}
                >
                  {isConnected ? (
                    <span className="font-mono">{accountId.slice(0, 6)}...{accountId.slice(-4)}</span>
                  ) : (
                    "Connect Wallet"
                  )}
                </Button>

                {/* Settings */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (
                      confirm("Reset game progress? This cannot be undone.")
                    ) {
                      resetGameState();
                    }
                  }}
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <Progress value={completionPercentage} className="h-1" />
            </div>
          </div>
        </header>

        {/* Main Content - World Map or Level */}
        <main className="flex-1 overflow-auto relative">
          {gameState.isPlaying ? (
            <Suspense fallback={<LoadingFallback />}>
              {renderLevel()}
            </Suspense>
          ) : (
            <WorldMap />
          )}
        </main>

        {/* Footer */}
        <footer className="bg-slate-900/80 backdrop-blur-md border-t border-slate-700 py-3">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between text-sm text-slate-400">
              <div>
                Player: <span className="text-white">{gameState.playerName}</span>
              </div>
                {(accountId || gameState.hederaAccountId) && (
                <div>
                  Hedera: <span className="text-cyan-400">{accountId || gameState.hederaAccountId}</span>
                </div>
              )}
              <div>
                Made with ❤️ for Hedera Hackathon
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Performance Stats (toggle with Ctrl+P) */}
      {showPerformanceStats && <PerformanceStats />}

      {/* Demo Control Panel */}
      <DemoControlPanel />

      {/* Achievement Gallery Modal */}
      {showAchievements && (
        <AchievementGallery onClose={() => setShowAchievements(false)} />
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <Leaderboard onClose={() => setShowLeaderboard(false)} />
      )}
    </div>
    </DemoModeProvider>
  );
}