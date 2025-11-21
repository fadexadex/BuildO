"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Float } from "@react-three/drei";
import { useGameState } from "@/hooks/use-game-state";
import { DemoModeProvider } from "@/hooks/use-demo-mode";
import { useWallet } from "@/contexts/WalletContext";
import { useMode } from "@/contexts/ModeContext";
import { BuildPlayground } from "@/components/build-mode/BuildPlayground";
import { WorldMap } from "./WorldMap";
import { DemoControlPanel } from "./DemoControls";
import { AchievementGallery } from "./AchievementGallery";
import { Leaderboard } from "./Leaderboard";
import { LoadingAnimation } from "./3d/LoadingAnimation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Star, Zap, Settings, Volume2, VolumeX, Vibrate, VibrateOff, Trash2, Hammer, Map as MapIcon } from "lucide-react";
import { Suspense, useState, useEffect } from "react";
import { PerformanceStats } from "@/lib/performance";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import { getRankForXp, getNextRank } from "@/lib/game-constants";
import { ContextualNav } from "./ContextualNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { audioSystem } from "@/lib/audio-system";
import { toggleHaptics } from "@/lib/haptics";
import { LevelWrapper } from "./LevelWrapper";

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

function RankBadge({ rank, progress }: { rank: number, progress: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      {/* Background Ring */}
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle
          cx="24"
          cy="24"
          r={radius}
          className="stroke-slate-700"
          strokeWidth="3"
          fill="none"
        />
        {/* Progress Ring */}
        <circle
          cx="24"
          cy="24"
          r={radius}
          className="stroke-cyan-400 transition-all duration-500 ease-out"
          strokeWidth="3"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-lg font-bold text-white">{rank}</span>
    </div>
  );
}

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
  const { mode, setMode } = useMode();
  const [showAchievements, setShowAchievements] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showPerformanceStats, setShowPerformanceStats] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isHapticsEnabled, setIsHapticsEnabled] = useState(true);

  const handleMuteToggle = (muted: boolean) => {
    setIsMuted(muted);
    audioSystem.toggleMute(muted);
  };

  const handleHapticsToggle = (enabled: boolean) => {
    setIsHapticsEnabled(enabled);
    toggleHaptics(enabled);
  };

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

  const currentRank = getRankForXp(gameState.xp);
  const nextRank = getNextRank(currentRank.id);
  
  const xpInCurrentRank = gameState.xp - currentRank.minXp;
  const xpRange = nextRank ? (currentRank.maxXp - currentRank.minXp) : 1;
  const progressPercent = nextRank ? (xpInCurrentRank / xpRange) * 100 : 100;

  const completionPercentage = (gameState.completedLevels.length / 9) * 100;

  const renderLevel = () => {
    let levelComponent;
    let levelId = "";

    switch (gameState.currentLevel) {
      case 1: 
        levelComponent = <ColorGame />;
        levelId = "color-game";
        break;
      case 2: 
        levelComponent = <CaveChallenge />;
        levelId = "cave-challenge";
        break;
      case 3: 
        levelComponent = <SudokuScrambler />;
        levelId = "sudoku-scrambler";
        break;
      case 4: 
        levelComponent = <RangeProver />;
        levelId = "range-prover";
        break;
      case 5: 
        levelComponent = <AgeVerifier />;
        levelId = "age-verifier";
        break;
      case 6: 
        levelComponent = <HashMatcher />;
        levelId = "hash-matcher";
        break;
      case 7: 
        levelComponent = <PrivateTransfer />;
        levelId = "private-transfer";
        break;
      case 8: 
        levelComponent = <AnonymousVoting />;
        levelId = "anonymous-voting";
        break;
      case 9: 
        levelComponent = <ZkRollupSimulator />;
        levelId = "zk-rollup-simulator";
        break;
      default: return <div className="text-white text-center p-10">Level not found</div>;
    }

    return (
      <LevelWrapper key={levelId} levelId={levelId}>
        {levelComponent}
      </LevelWrapper>
    );
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

              {/* Contextual Navigation */}
              {mode === 'quest' && <ContextualNav />}

              {/* Player Stats */}
              <div className="flex items-center gap-6">
                {/* Mode Toggle - Agents / Editor Switcher */}
                <div className="bg-slate-800/50 p-1 rounded-lg flex items-center border border-slate-700 hidden md:flex">
                  <button
                    onClick={() => setMode('quest')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                      mode === 'quest' 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    Game
                  </button>
                  <button
                    onClick={() => setMode('build')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                      mode === 'build' 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    Build
                  </button>
                </div>

                {/* XP and Level */}
                {mode !== 'build' && (
                  <>
                    <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-2 border border-slate-700">
                      <RankBadge rank={currentRank.id} progress={progressPercent} />
                      <div className="flex flex-col justify-center">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                          {currentRank.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-300 font-mono">
                            {gameState.xp} XP
                          </span>
                          {nextRank && (
                            <span className="text-[10px] text-slate-500">
                              / {nextRank.minXp}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Completion */}
                    <Badge variant="secondary" className="gap-2 hidden md:flex">
                      <Star className="w-4 h-4" />
                      {gameState.completedLevels.length}/9 Levels
                    </Badge>
                  </>
                )}

                {/* Wallet Connect - Hidden in Build Mode */}
                {mode !== 'build' && (
                <Button
                  variant={isConnected ? "outline" : "default"}
                  className={isConnected 
                    ? "border-cyan-500/50 text-cyan-400 bg-cyan-950/10 hover:bg-cyan-950/50 min-w-[140px]" 
                    : "bg-indigo-600 hover:bg-indigo-500 text-white min-w-[140px]"
                  }
                  onClick={isConnected ? disconnect : connect}
                >
                  {isConnected && accountId ? (
                    <span className="font-mono">{accountId.slice(0, 6)}...{accountId.slice(-4)}</span>
                  ) : (
                    "Connect Wallet"
                  )}
                </Button>
                )}

                {/* Settings */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800">
                      <Settings className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-700 text-slate-200">
                    <DropdownMenuLabel>Settings</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-700" />
                    
                    <DropdownMenuCheckboxItem 
                      checked={!isMuted}
                      onCheckedChange={(checked) => handleMuteToggle(!checked)}
                      className="focus:bg-slate-800 focus:text-white"
                    >
                      <div className="flex items-center gap-2">
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        <span>Sound Effects</span>
                      </div>
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem 
                      checked={isHapticsEnabled}
                      onCheckedChange={handleHapticsToggle}
                      className="focus:bg-slate-800 focus:text-white"
                    >
                      <div className="flex items-center gap-2">
                        {isHapticsEnabled ? <Vibrate className="w-4 h-4" /> : <VibrateOff className="w-4 h-4" />}
                        <span>Haptic Feedback</span>
                      </div>
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuSeparator className="bg-slate-700" />
                    
                    <DropdownMenuItem 
                      className="text-red-400 focus:text-red-300 focus:bg-red-950/30"
                      onClick={() => {
                        if (confirm("Reset game progress? This cannot be undone.")) {
                          resetGameState();
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        <span>Reset Progress</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Progress Bar */}
            {mode !== 'build' && (
              <div className="mt-4">
                <Progress value={completionPercentage} className="h-1" />
              </div>
            )}
          </div>
        </header>

        {/* Main Content - World Map or Level */}
        <main className="flex-1 overflow-auto relative">
          {mode === 'build' ? (
            <BuildPlayground />
          ) : gameState.isPlaying ? (
            <Suspense fallback={<LoadingFallback />}>
              {renderLevel()}
            </Suspense>
          ) : (
            <WorldMap />
          )}
        </main>

        {/* Footer */}
        {mode !== 'build' && (
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
        )}
      </div>

      {/* Performance Stats (toggle with Ctrl+P) */}
      {showPerformanceStats && <PerformanceStats />}

      {/* Demo Control Panel - Only show in Quest/Agents mode */}
      {mode === 'quest' && <DemoControlPanel />}

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