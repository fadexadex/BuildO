"use client";

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Float,
  Text3D,
  Center,
  OrbitControls,
  RoundedBox,
  Sphere,
  Html,
} from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Trophy, Medal, Crown, Star, TrendingUp } from "lucide-react";
import { Suspense } from "react";
import { getLeaderboard } from "@/lib/hedera-api";
import { useGameState } from "@/hooks/use-game-state";

interface LeaderboardEntry {
  playerId: string;
  xp: number;
  levelsCompleted: number;
  lastActivity: number;
  rank?: number;
}

interface PlayerAvatar3DProps {
  position: [number, number, number];
  player: LeaderboardEntry;
  rank: number;
  onClick?: () => void;
}

function PlayerAvatar3D({ position, player, rank, onClick }: PlayerAvatar3DProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    meshRef.current.rotation.y = Math.sin(time * 0.5) * 0.1;
    
    if (hovered) {
      meshRef.current.position.y = position[1] + Math.sin(time * 3) * 0.1;
    } else {
      meshRef.current.position.y = position[1];
    }
  });

  const medalColors = {
    1: "#ffd700", // Gold
    2: "#c0c0c0", // Silver
    3: "#cd7f32", // Bronze
  };

  const medalColor = medalColors[rank as keyof typeof medalColors] || "#4b5563";

  return (
    <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3}>
      <group
        ref={meshRef}
        position={position}
        onClick={onClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        scale={hovered ? 1.15 : 1}
      >
        {/* Player Avatar (Sphere) */}
        <Sphere args={[0.5, 32, 32]}>
          <meshStandardMaterial
            color={medalColor}
            metalness={0.8}
            roughness={0.2}
            emissive={medalColor}
            emissiveIntensity={hovered ? 0.5 : 0.2}
          />
        </Sphere>

        {/* Crown for #1 */}
        {rank === 1 && (
          <mesh position={[0, 0.6, 0]}>
            <coneGeometry args={[0.3, 0.4, 8]} />
            <meshStandardMaterial
              color="#ffd700"
              metalness={0.9}
              roughness={0.1}
              emissive="#ffd700"
              emissiveIntensity={0.6}
            />
          </mesh>
        )}

        {/* Medal for top 3 */}
        {rank <= 3 && (
          <mesh position={[0, -0.7, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.1, 32]} />
            <meshStandardMaterial
              color={medalColor}
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
        )}

        {/* XP Bar */}
        <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 0.1]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh
          position={[-0.5 + (player.xp / 10000) * 0.5, -1.2, 0.01]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[(player.xp / 10000) * 1, 0.08]} />
          <meshStandardMaterial color={medalColor} emissive={medalColor} emissiveIntensity={0.5} />
        </mesh>

        {/* Player Info */}
        {hovered && (
          <Html
            position={[0, -1.8, 0]}
            center
            distanceFactor={5}
            style={{
              width: "150px",
              fontSize: "10px",
              color: "#cbd5e1",
              textAlign: "center",
              pointerEvents: "none",
              userSelect: "none",
              background: "rgba(15, 23, 42, 0.9)",
              padding: "8px",
              borderRadius: "8px",
              border: `2px solid ${medalColor}`,
            }}
          >
            <div>
              <div className="font-bold text-white mb-1">
                #{rank} {player.playerId.substring(0, 8)}
              </div>
              <div className="text-xs">
                <div>XP: {player.xp.toLocaleString()}</div>
                <div>Levels: {player.levelsCompleted}/9</div>
              </div>
            </div>
          </Html>
        )}
      </group>
    </Float>
  );
}

interface Podium3DProps {
  players: LeaderboardEntry[];
}

function Podium3D({ players }: Podium3DProps) {
  const top3 = players.slice(0, 3);
  
  // Podium positions: 2nd, 1st, 3rd (left to right)
  const podiumPositions: [number, number, number][] = [
    [-2, 0, 0], // 2nd place (left)
    [0, 0.5, 0], // 1st place (center, higher)
    [2, -0.3, 0], // 3rd place (right, lower)
  ];

  const podiumHeights = [1.5, 2.5, 1]; // Heights for 2nd, 1st, 3rd

  return (
    <>
      {/* Podiums */}
      {podiumPositions.map((pos, index) => {
        const rank = index === 0 ? 2 : index === 1 ? 1 : 3;
        const height = podiumHeights[index];
        const player = top3[rank - 1];
        
        return (
          <group key={rank}>
            {/* Podium base */}
            <RoundedBox
              args={[1.5, height, 1.5]}
              position={[pos[0], pos[1] - height / 2, pos[2]]}
              radius={0.1}
            >
              <meshStandardMaterial
                color={rank === 1 ? "#ffd700" : rank === 2 ? "#c0c0c0" : "#cd7f32"}
                metalness={0.7}
                roughness={0.3}
                emissive={rank === 1 ? "#ffd700" : rank === 2 ? "#c0c0c0" : "#cd7f32"}
                emissiveIntensity={0.2}
              />
            </RoundedBox>

            {/* Rank number on podium */}
            <Center position={[pos[0], pos[1] - height + 0.2, pos[2] + 0.76]}>
              <Text3D
                font="/fonts/helvetiker_regular.typeface.json"
                size={0.3}
                height={0.05}
              >
                {rank}
                <meshStandardMaterial
                  color={rank === 1 ? "#ffd700" : rank === 2 ? "#c0c0c0" : "#cd7f32"}
                  emissive={rank === 1 ? "#ffd700" : rank === 2 ? "#c0c0c0" : "#cd7f32"}
                  emissiveIntensity={0.5}
                />
              </Text3D>
            </Center>

            {/* Player avatar on podium */}
            {player && (
              <PlayerAvatar3D
                position={[pos[0], pos[1] + height / 2 + 0.5, pos[2]]}
                player={player}
                rank={rank}
              />
            )}
          </group>
        );
      })}
    </>
  );
}

function LeaderboardScene({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <>
      <OrbitControls
        enableZoom={true}
        maxDistance={20}
        minDistance={8}
        autoRotate
        autoRotateSpeed={0.5}
      />
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, 10, -10]} intensity={0.5} />
      <spotLight position={[0, 15, 0]} angle={0.3} intensity={1.5} castShadow />

      {/* Title */}
      <Center position={[0, 6, 0]}>
        <Text3D
          font="/fonts/helvetiker_regular.typeface.json"
          size={0.6}
          height={0.1}
        >
          Leaderboard
          <meshStandardMaterial
            color="#3b82f6"
            emissive="#3b82f6"
            emissiveIntensity={0.5}
          />
        </Text3D>
      </Center>

      {/* Top 3 Podium */}
      {top3.length > 0 && <Podium3D players={top3} />}

      {/* Rest of players (floating around) */}
      {rest.map((player, index) => {
        const angle = (index / rest.length) * Math.PI * 2;
        const radius = 5 + (index % 3) * 0.5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 0.5 + (index % 2) * 0.3;

        return (
          <PlayerAvatar3D
            key={player.playerId}
            position={[x, y, z]}
            player={player}
            rank={(index + 4)}
          />
        );
      })}

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* Grid */}
      <gridHelper args={[30, 30, "#1e293b", "#1e293b"]} position={[0, -1.99, 0]} />
    </>
  );
}

interface LeaderboardProps {
  onClose?: () => void;
}

export function Leaderboard({ onClose }: LeaderboardProps) {
  const { gameState } = useGameState();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        const response = await fetch("/api/zk/leaderboard?limit=50");
        if (!response.ok) {
          throw new Error("Failed to fetch leaderboard");
        }
        const data = await response.json();
        
        if (data.success && data.leaderboard) {
          // Add rank numbers
          const ranked = data.leaderboard.map((entry: LeaderboardEntry, index: number) => ({
            ...entry,
            rank: index + 1,
          }));
          setLeaderboard(ranked);
        } else {
          // Fallback: create mock data for demo
          setLeaderboard([
            { playerId: gameState?.playerId || "player1", xp: gameState?.xp || 0, levelsCompleted: gameState?.completedLevels.length || 0, lastActivity: Date.now(), rank: 1 },
            { playerId: "player2", xp: 2500, levelsCompleted: 7, lastActivity: Date.now() - 3600000, rank: 2 },
            { playerId: "player3", xp: 2000, levelsCompleted: 6, lastActivity: Date.now() - 7200000, rank: 3 },
            { playerId: "player4", xp: 1500, levelsCompleted: 5, lastActivity: Date.now() - 10800000, rank: 4 },
            { playerId: "player5", xp: 1000, levelsCompleted: 4, lastActivity: Date.now() - 14400000, rank: 5 },
          ]);
        }
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        // Use mock data on error
        setLeaderboard([
          { playerId: gameState?.playerId || "player1", xp: gameState?.xp || 0, levelsCompleted: gameState?.completedLevels.length || 0, lastActivity: Date.now(), rank: 1 },
          { playerId: "player2", xp: 2500, levelsCompleted: 7, lastActivity: Date.now() - 3600000, rank: 2 },
          { playerId: "player3", xp: 2000, levelsCompleted: 6, lastActivity: Date.now() - 7200000, rank: 3 },
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [gameState]);

  const currentPlayerRank = leaderboard.findIndex(
    (entry) => entry.playerId === gameState?.playerId
  ) + 1 || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <Card className="w-full max-w-6xl h-[90vh] bg-slate-900/95 backdrop-blur-md border-slate-700 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold text-white flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-500" />
                Leaderboard
              </CardTitle>
              <CardDescription className="text-slate-400 mt-2">
                Top players ranked by XP and level completion
              </CardDescription>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Current Player Rank */}
          {currentPlayerRank > 0 && (
            <div className="flex-shrink-0 bg-cyan-500/20 border border-cyan-500/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="text-sm text-slate-400">Your Rank</div>
                    <div className="text-xl font-bold text-white">
                      #{currentPlayerRank} of {leaderboard.length}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {leaderboard[currentPlayerRank - 1]?.xp || 0} XP
                </Badge>
              </div>
            </div>
          )}

          {/* 3D Leaderboard Visualization */}
          <div className="flex-1 relative bg-slate-950 rounded-lg overflow-hidden border border-slate-700">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-xl">Loading leaderboard...</div>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-red-400 text-xl">Error: {error}</div>
              </div>
            ) : (
              <Canvas camera={{ position: [0, 5, 12], fov: 60 }}>
                <Suspense fallback={null}>
                  <LeaderboardScene leaderboard={leaderboard} />
                </Suspense>
              </Canvas>
            )}
          </div>

          {/* List View (Scrollable) */}
          <div className="flex-shrink-0 bg-slate-800/50 rounded-lg p-4 max-h-48 overflow-y-auto border border-slate-700">
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.playerId}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    entry.playerId === gameState?.playerId
                      ? "bg-cyan-500/20 border border-cyan-500/50"
                      : "bg-slate-700/30 hover:bg-slate-700/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 text-center font-bold text-slate-300">
                      {index === 0 ? (
                        <Crown className="w-6 h-6 text-yellow-500 mx-auto" />
                      ) : index === 1 ? (
                        <Medal className="w-6 h-6 text-slate-300 mx-auto" />
                      ) : index === 2 ? (
                        <Medal className="w-6 h-6 text-amber-600 mx-auto" />
                      ) : (
                        <span>#{index + 1}</span>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        {entry.playerId.substring(0, 12)}...
                      </div>
                      <div className="text-xs text-slate-400">
                        {entry.levelsCompleted} levels completed
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">{entry.xp} XP</Badge>
                    <Star className="w-4 h-4 text-yellow-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

