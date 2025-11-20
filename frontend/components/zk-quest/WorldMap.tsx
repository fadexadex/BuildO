"use client";

import { Canvas } from "@react-three/fiber";
import { Html, Center, OrbitControls, Line, Text, Billboard } from "@react-three/drei";
import { useGameState } from "@/hooks/use-game-state";
import type { GameState, Level } from "@/lib/game-state";
import { LoadingAnimation } from "./3d/LoadingAnimation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, CheckCircle2, Play, Clock, Target } from "lucide-react";
import { Suspense, useRef, useState, useEffect, useMemo, useCallback } from "react";
import * as THREE from "three";
import { useRouter } from "next/navigation";
import { levelNarratives } from "@/data/level-narratives";

interface LevelMarkerProps {
  position: [number, number, number];
  level: {
    id: number;
    name: string;
    completed: boolean;
    unlocked: boolean;
    completionTime?: number;
    attempts?: number;
  };
  onClick: () => void;
}

function CompletionBadge() {
  return (
    <Html position={[0, 0.9, 0]} center zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
      <div className="relative animate-bounce">
        <div className="absolute inset-0 bg-green-400 rounded-full blur-md opacity-50 animate-pulse" />
        <CheckCircle2 className="w-6 h-6 text-green-400 relative z-10" strokeWidth={2.5} />
      </div>
    </Html>
  );
}

function CompletionTooltip({ level }: { level: LevelMarkerProps['level'] }) {
  if (!level.completed) return null;

  // Use actual data from the level
  const completionTime = level.completionTime || 0;
  const attempts = level.attempts || 0;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <Html position={[0, -1.2, 0]} center zIndexRange={[50, 0]}>
      <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-2 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="flex flex-col gap-1.5 min-w-[160px]">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium">Time:</span>
            <span className="text-white ml-auto">{formatTime(completionTime)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Target className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-medium">Attempts:</span>
            <span className="text-white ml-auto">{attempts}</span>
          </div>
        </div>
        {/* Tooltip arrow */}
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-l border-t border-slate-700 rotate-45" />
      </div>
    </Html>
  );
}

function LevelMarker({ position, level, onClick }: LevelMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color = level.completed
    ? "#22c55e" // green
    : level.unlocked
    ? "#3b82f6" // blue
    : "#64748b"; // gray

  return (
    <group position={position}>
      {/* Level Sphere */}
      <mesh
        ref={meshRef}
        onClick={level.unlocked ? onClick : undefined}
        onPointerOver={() => level.unlocked && setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.2 : 1}
      >
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered ? 0.8 : 0.3}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* Level Number */}
        <Billboard position={[0, 0, 0.65]}>
          <Text
            fontSize={0.4}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {level.id}
          </Text>
        </Billboard>

        {/* Completion Badge */}
        {level.completed && <CompletionBadge />}

        {/* Completion Tooltip on Hover */}
        {hovered && level.completed && <CompletionTooltip level={level} />}

        {/* Glow effect */}
        <pointLight
          position={[0, 0, 0]}
          intensity={hovered ? 2 : 0.5}
          color={color}
          distance={3}
        />

      </group>
  );
}

// Static positions - defined outside component to prevent recreation
const WORLD_POSITIONS: [number, number, number][] = [
  // World 1
  [-3, 2, 0],
  [0, 2, 0],
  [3, 2, 0],
  // World 2
  [-3, -1, 0],
  [0, -1, 0],
  [3, -1, 0],
  // World 3
  [-3, -4, 0],
  [0, -4, 0],
  [3, -4, 0],
];

interface WorldSceneProps {
  levels: (Level & { unlocked: boolean })[];
  onLevelClick: (levelId: number) => void;
}

function WorldScene({ levels, onLevelClick }: WorldSceneProps) {
  // Memoize level markers to prevent unnecessary re-renders
  const levelMarkers = useMemo(() => {
    return levels.map((level, index) => ({
      level,
      position: WORLD_POSITIONS[index],
      levelId: level.id,
    }));
  }, [levels]);

  // Memoize click handler
  const handleLevelClick = useCallback((levelId: number) => {
    onLevelClick(levelId);
  }, [onLevelClick]);

  const connectingLines = useMemo(() => {
    return levels.slice(0, -1).map((level, index) => {
      const start = WORLD_POSITIONS[index];
      const end = WORLD_POSITIONS[index + 1];
      const points = [
        new THREE.Vector3(...start),
        new THREE.Vector3(...end),
      ];

      return (
        <Line
          key={`line-${index}`}
          points={points}
          color={level.completed ? "#22c55e" : "#475569"}
          lineWidth={2}
        />
      );
    });
  }, [levels]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* World Labels with Completion */}
      <group position={[-5, 2, 0]}>
        <Html center zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
          <div className="text-blue-500 font-bold text-lg whitespace-nowrap select-none">
            World 1
          </div>
        </Html>
      </group>

      <group position={[-5, -1, 0]}>
        <Html center zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
          <div className="text-violet-500 font-bold text-lg whitespace-nowrap select-none">
            World 2
          </div>
        </Html>
      </group>

      <group position={[-5, -4, 0]}>
        <Html center zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
          <div className="text-pink-500 font-bold text-lg whitespace-nowrap select-none">
            World 3
          </div>
        </Html>
      </group>

      {/* Level Markers */}
      {levelMarkers.map(({ level, position, levelId }) => (
        <LevelMarker
          key={levelId}
          position={position}
          level={level}
          onClick={() => handleLevelClick(levelId)}
        />
      ))}

      {/* Connecting Lines */}
      {connectingLines}

      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableDamping={true}
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={15}
      />
    </>
  );
}

export function WorldMap() {
  const { gameState, nextLevel, isLevelUnlocked, navigateToLevel } = useGameState();
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const router = useRouter();

  // Memoize nextLevelId to prevent unnecessary re-renders
  const nextLevelId = useMemo(() => nextLevel?.id ?? null, [nextLevel?.id]);

  // Auto-select next level on mount
  useEffect(() => {
    if (nextLevelId && !selectedLevel) {
      setSelectedLevel(nextLevelId);
    }
  }, [nextLevelId, selectedLevel]);

  // Compute levels with unlocked status once
  const levelsWithStatus = useMemo(() => {
    if (!gameState) return [];
    return gameState.levels.map((level) => ({
      ...level,
      unlocked: isLevelUnlocked(level.id),
    }));
  }, [gameState, isLevelUnlocked]);

  if (!gameState) return null;

  const selectedLevelData = selectedLevel
    ? gameState.levels.find((l) => l.id === selectedLevel)
    : null;

  // Get narrative data for selected level
  const narrative = selectedLevelData 
    ? Object.values(levelNarratives).find(n => n.id === selectedLevelData.id.toString() || (selectedLevelData.id === 1 && n.id === "color-game") || (selectedLevelData.id === 8 && n.id === "anonymous-voting"))
    : null;

  return (
    <div className="relative h-full">
      {/* 3D World Map */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
          <Suspense fallback={<LoadingAnimation message="Loading World..." />}>
            <WorldScene
              levels={levelsWithStatus}
              onLevelClick={setSelectedLevel}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Level Info Panel */}
      {selectedLevelData && (
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2 z-50">
          <Card className="w-96 bg-slate-900/95 backdrop-blur-md border-slate-700 animate-in slide-in-from-right-10 fade-in duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    Level {selectedLevelData.id}
                  </Badge>
                  {selectedLevelData.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : !selectedLevelData.unlocked ? (
                    <Lock className="w-5 h-5 text-slate-500" />
                  ) : null}
                </div>
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                  {selectedLevelData.xpReward} XP
                </Badge>
              </div>
              <CardTitle className="text-white">
                {selectedLevelData.name}
              </CardTitle>
              {narrative && (
                <div className="text-xs font-mono text-cyan-400 mb-1">
                  {narrative.subtitle}
                </div>
              )}
              <CardDescription className="text-slate-300">
                {selectedLevelData.description}
              </CardDescription>
            </CardHeader>
            <div className="px-6 pb-6">
              {isLevelUnlocked(selectedLevelData.id) ? (
                <Button 
                  className="w-full gap-2"
                  onClick={() => {
                    navigateToLevel(selectedLevelData.world, selectedLevelData.id);
                  }}
                >
                  <Play className="w-4 h-4" />
                  {selectedLevelData.completed ? "Play Again" : "Start Level"}
                </Button>
              ) : (
                <Button className="w-full" disabled>
                  <Lock className="w-4 h-4 mr-2" />
                  Complete Previous Level to Unlock
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10">
        <Card className="bg-slate-900/80 backdrop-blur-md border-slate-700">
          <div className="px-6 py-3 text-center">
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-cyan-400">Click</span> on a level sphere to select it •{" "}
              <span className="font-semibold text-cyan-400">Drag</span> to rotate •{" "}
              <span className="font-semibold text-cyan-400">Scroll</span> to zoom •{" "}
              <span className="font-semibold text-green-400">Hover</span> on completed levels for stats
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}