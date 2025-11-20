"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Float,
  Text3D,
  Center,
  OrbitControls,
  RoundedBox,
  Sphere,
  Html,
  Environment,
} from "@react-three/drei";
import * as THREE from "three";
import { useGameState } from "@/hooks/use-game-state";
import { Achievement } from "@/lib/game-state";
import { Button } from "@/components/ui/button";
import { X, Trophy, Medal, Star, Award, Zap } from "lucide-react";
import { Suspense } from "react";

interface Trophy3DProps {
  position: [number, number, number];
  achievement: Achievement;
  onClick?: () => void;
}

function Trophy3D({ position, achievement, onClick }: Trophy3DProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    meshRef.current.rotation.y = time * 0.5;
    
    if (hovered) {
      meshRef.current.position.y = position[1] + Math.sin(time * 3) * 0.1;
    } else {
      meshRef.current.position.y = position[1];
    }
  });

  const colors = {
    bronze: "#cd7f32",
    silver: "#c0c0c0",
    gold: "#ffd700",
    platinum: "#e5e4e2",
  };

  const color = colors.gold; // Default to gold for all achievements

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <group
        ref={meshRef}
        position={position}
        onClick={onClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        scale={hovered ? 1.2 : 1}
      >
        {/* Trophy base */}
        <mesh position={[0, -0.8, 0]}>
          <cylinderGeometry args={[0.4, 0.5, 0.2, 32]} />
          <meshStandardMaterial
            color="#1e293b"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* Trophy stem */}
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.4, 32]} />
          <meshStandardMaterial
            color={color}
            metalness={0.9}
            roughness={0.1}
            emissive={color}
            emissiveIntensity={0.3}
          />
        </mesh>

        {/* Trophy cup */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.5, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color={color}
            metalness={0.9}
            roughness={0.1}
            emissive={color}
            emissiveIntensity={0.5}
          />
        </mesh>

        {/* Trophy handles */}
        {[1, -1].map((side, i) => (
          <mesh key={i} position={[side * 0.6, 0, 0]}>
            <torusGeometry args={[0.2, 0.05, 16, 32, Math.PI]} />
            <meshStandardMaterial
              color={color}
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
        ))}

        {/* Achievement icon */}
        <Sphere args={[0.3, 32, 32]} position={[0, 0.2, 0]}>
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.8}
          />
        </Sphere>

        {/* Glow effect */}
        <pointLight position={[0, 0, 0]} intensity={hovered ? 3 : 1.5} color={color} />

        {/* Particle ring */}
        {achievement.unlockedAt && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.8, 1, 32]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={hovered ? 0.5 : 0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* Achievement name */}
        {hovered && (
          <Html
            position={[0, -1.2, 0]}
            center
            distanceFactor={3}
            style={{
              width: "150px",
              fontSize: "11px",
              color: "#f1f5f9",
              textAlign: "center",
              fontWeight: "bold",
              pointerEvents: "none",
              userSelect: "none",
              textShadow: "0 0 10px rgba(0,0,0,0.8)",
            }}
          >
            {achievement.name}
          </Html>
        )}
      </group>
    </Float>
  );
}

interface NFTDisplay3DProps {
  position: [number, number, number];
  nftData: {
    tokenId: string;
    name: string;
    image?: string;
    level: number;
  };
  onClick?: () => void;
}

function NFTDisplay3D({ position, nftData, onClick }: NFTDisplay3DProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
  });

  return (
    <group
      ref={meshRef}
      position={position}
      onClick={onClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      scale={hovered ? 1.15 : 1}
    >
      {/* NFT Frame */}
      <RoundedBox args={[1.5, 2, 0.1]} radius={0.05}>
        <meshStandardMaterial
          color="#7f00ff"
          metalness={0.8}
          roughness={0.2}
          emissive="#7f00ff"
          emissiveIntensity={hovered ? 0.6 : 0.3}
        />
      </RoundedBox>

      {/* NFT Image placeholder */}
      <RoundedBox args={[1.3, 1.3, 0.05]} position={[0, 0.2, 0.06]} radius={0.03}>
        <meshStandardMaterial color="#1e293b" />
      </RoundedBox>

      {/* Level badge */}
      <Center position={[0, -0.6, 0.06]}>
        <Text3D
          font="/fonts/helvetiker_regular.typeface.json"
          size={0.15}
          height={0.02}
        >
          Level {nftData.level}
          <meshStandardMaterial color="#fbbf24" />
        </Text3D>
      </Center>

      {/* Glow */}
      <pointLight
        position={[0, 0, 0.5]}
        intensity={hovered ? 2 : 1}
        color="#7f00ff"
      />

      {/* Token ID */}
      {hovered && (
        <Html
          position={[0, -1.3, 0]}
          center
          distanceFactor={3}
          style={{
            width: "120px",
            fontSize: "9px",
            color: "#cbd5e1",
            textAlign: "center",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {nftData.tokenId}
        </Html>
      )}
    </group>
  );
}

function TrophyRoom() {
  const { gameState } = useGameState();
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(
    null
  );

  if (!gameState) return null;

  // Arrange achievements in a circular pattern
  const radius = 5;
  const achievementCount = gameState.achievements.length || 1;

  return (
    <group>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={1} />
      <pointLight position={[5, 0, 5]} intensity={0.5} color="#3b82f6" />
      <pointLight position={[-5, 0, -5]} intensity={0.5} color="#7f00ff" />

      {/* Room floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <circleGeometry args={[10, 64]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Center podium */}
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[2, 2.5, 1, 32]} />
        <meshStandardMaterial
          color="#1e293b"
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>

      {/* Trophy room title */}
      <Float speed={1} rotationIntensity={0} floatIntensity={0.3}>
        <Center position={[0, 4, 0]}>
          <Text3D
            font="/fonts/helvetiker_regular.typeface.json"
            size={0.5}
            height={0.1}
          >
            Trophy Room
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#fbbf24"
              emissiveIntensity={0.5}
            />
          </Text3D>
        </Center>
      </Float>

      {/* Achievements */}
      {gameState.achievements.map((achievement, index) => {
        const angle = (index / achievementCount) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <Trophy3D
            key={achievement.id}
            position={[x, 0, z]}
            achievement={achievement}
            onClick={() => setSelectedAchievement(achievement)}
          />
        );
      })}

      {/* NFT Displays (for completed levels) */}
      {gameState.levels
        .filter((level) => level.completed && level.nftTokenId)
        .map((level, index) => {
          const angle = ((index + achievementCount) / (achievementCount + gameState.levels.length)) * Math.PI * 2;
          const x = Math.cos(angle) * (radius + 3);
          const z = Math.sin(angle) * (radius + 3);

          return (
            <NFTDisplay3D
              key={level.id}
              position={[x, 0, z]}
              nftData={{
                tokenId: level.nftTokenId!,
                name: `${level.name} Complete`,
                level: level.id,
              }}
            />
          );
        })}

      {/* Stats display */}
      <Float speed={1.5} rotationIntensity={0} floatIntensity={0.5}>
        <group position={[0, 2, -8]}>
          <RoundedBox args={[4, 2, 0.1]} radius={0.1}>
            <meshStandardMaterial
              color="#1e293b"
              transparent
              opacity={0.9}
            />
          </RoundedBox>

          <Html
            position={[0, 0, 0.06]}
            center
            distanceFactor={6}
            style={{
              width: "350px",
              color: "#f1f5f9",
              textAlign: "center",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            <div className="space-y-2 p-4">
              <div className="text-lg font-bold flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Achievement Stats
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-400">Total Achievements</div>
                  <div className="text-xl font-bold">{gameState.achievements.length}</div>
                </div>
                <div>
                  <div className="text-slate-400">Levels Complete</div>
                  <div className="text-xl font-bold">{gameState.completedLevels.length}/9</div>
                </div>
                <div>
                  <div className="text-slate-400">Total XP</div>
                  <div className="text-xl font-bold text-cyan-400">{gameState.xp}</div>
                </div>
                <div>
                  <div className="text-slate-400">Player Level</div>
                  <div className="text-xl font-bold text-purple-400">{gameState.level}</div>
                </div>
              </div>
            </div>
          </Html>
        </group>
      </Float>

      <Environment preset="night" />
    </group>
  );
}

interface AchievementGalleryProps {
  onClose: () => void;
}

export function AchievementGallery({ onClose }: AchievementGalleryProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Instructions */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-slate-900/80 backdrop-blur-md rounded-lg px-6 py-3">
        <p className="text-sm text-slate-300 text-center">
          <span className="font-semibold text-cyan-400">Drag</span> to rotate •{" "}
          <span className="font-semibold text-cyan-400">Scroll</span> to zoom •{" "}
          <span className="font-semibold text-cyan-400">Click</span> trophies for details
        </p>
      </div>

      {/* 3D Scene */}
      <Canvas camera={{ position: [0, 2, 12], fov: 60 }}>
        <Suspense fallback={null}>
          <TrophyRoom />
          <OrbitControls
            enablePan={false}
            minDistance={5}
            maxDistance={20}
            maxPolarAngle={Math.PI / 2}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
