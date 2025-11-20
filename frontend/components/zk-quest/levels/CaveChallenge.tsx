'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Sphere, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { useState, useRef, useEffect } from 'react';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { useGameState } from '@/hooks/use-game-state';
import { submitProofToHedera } from '@/lib/hedera-api';
import { ArrowRight } from 'lucide-react';
import { CollapsibleLevelCard } from '../CollapsibleLevelCard';

// Animated components
const AnimatedSphere = animated(Sphere);
const AnimatedGroup = animated.group;

// Simple 3D Character/Avatar
function Character({ position, rotation = [0, 0, 0] }: { position: [number, number, number], rotation?: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle bobbing animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={new THREE.Euler(...rotation)}>
      {/* Body */}
      <Box args={[0.6, 1, 0.4]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#4a9eff" />
      </Box>
      {/* Head */}
      <Sphere args={[0.35, 16, 16]} position={[0, 1.35, 0]}>
        <meshStandardMaterial color="#ffdbac" />
      </Sphere>
      {/* Eyes */}
      <Sphere args={[0.08, 8, 8]} position={[-0.12, 1.4, 0.3]}>
        <meshStandardMaterial color="#000000" />
      </Sphere>
      <Sphere args={[0.08, 8, 8]} position={[0.12, 1.4, 0.3]}>
        <meshStandardMaterial color="#000000" />
      </Sphere>
      {/* Arms */}
      <Box args={[0.2, 0.8, 0.2]} position={[-0.5, 0.5, 0]}>
        <meshStandardMaterial color="#4a9eff" />
      </Box>
      <Box args={[0.2, 0.8, 0.2]} position={[0.5, 0.5, 0]}>
        <meshStandardMaterial color="#4a9eff" />
      </Box>
      {/* Legs */}
      <Box args={[0.25, 0.6, 0.25]} position={[-0.18, -0.3, 0]}>
        <meshStandardMaterial color="#2c5aa0" />
      </Box>
      <Box args={[0.25, 0.6, 0.25]} position={[0.18, -0.3, 0]}>
        <meshStandardMaterial color="#2c5aa0" />
      </Box>
    </group>
  );
}

// Cave Wall Component
function CaveWall({ position, rotation, width = 8, height = 6, depth = 1 }: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  depth?: number;
}) {
  return (
    <Box args={[width, height, depth]} position={position} rotation={rotation} castShadow receiveShadow>
      <meshStandardMaterial 
        color="#4a4a4a" 
        roughness={0.9}
        metalness={0.1}
      />
    </Box>
  );
}

// Path Component
function Path({ 
  start, 
  end, 
  isRevealed 
}: { 
  start: [number, number, number]; 
  end: [number, number, number];
  isRevealed: boolean;
}) {
  const pathRef = useRef<THREE.Mesh>(null);
  
  const midPoint: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2
  ];

  const distance = Math.sqrt(
    Math.pow(end[0] - start[0], 2) +
    Math.pow(end[1] - start[1], 2) +
    Math.pow(end[2] - start[2], 2)
  );

  const angle = Math.atan2(end[2] - start[2], end[0] - start[0]);

  return (
    <Box 
      ref={pathRef}
      args={[distance, 0.1, 2]} 
      position={midPoint}
      rotation={[0, angle, 0]}
      receiveShadow
    >
      <meshStandardMaterial 
        color={isRevealed ? "#8b7355" : "#3a3a3a"} 
        emissive={isRevealed ? "#4a3520" : "#000000"}
        emissiveIntensity={0.3}
      />
    </Box>
  );
}

// Dynamic Light Component
function DynamicLight({ 
  position, 
  intensity,
  color = "#ffa500"
}: { 
  position: [number, number, number]; 
  intensity: number;
  color?: string;
}) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity = intensity + Math.sin(state.clock.elapsedTime * 3) * 0.3;
    }
  });

  return (
    <>
      <pointLight ref={lightRef} position={position} intensity={intensity} color={color} distance={15} />
      <Sphere args={[0.2, 16, 16]} position={position}>
        <meshBasicMaterial color={color} />
      </Sphere>
    </>
  );
}

// Fog Effect Component (visual representation)
function FogParticles({ density = 50 }: { density?: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  const [positions] = useState(() => {
    const pos = new Float32Array(density * 3);
    for (let i = 0; i < density; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = Math.random() * 6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  });

  useFrame((state) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < density; i++) {
        positions[i * 3] += Math.sin(state.clock.elapsedTime + i) * 0.01;
        positions[i * 3 + 1] += Math.cos(state.clock.elapsedTime + i) * 0.01;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={density}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.3} color="#888888" transparent opacity={0.3} />
    </points>
  );
}

// Main Scene
function Scene({
  characterPosition,
  selectedPath,
  revealedPaths,
  cameraPosition,
  cameraLookAt,
  gamePhase
}: {
  characterPosition: [number, number, number];
  selectedPath: 'left' | 'right' | null;
  revealedPaths: { left: boolean; right: boolean };
  cameraPosition: [number, number, number];
  cameraLookAt: [number, number, number];
  gamePhase: 'intro' | 'choose' | 'moving' | 'result';
}) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const controlsRef = useRef<any>(null);

  useFrame((state, delta) => {
    if (cameraRef.current && controlsRef.current) {
      if (gamePhase === 'moving') {
        // Follow character dynamically
        const offset = new THREE.Vector3(0, 4, 6);
        const targetPos = new THREE.Vector3(...characterPosition).add(offset);
        const targetLook = new THREE.Vector3(...characterPosition);

        cameraRef.current.position.lerp(targetPos, delta * 2);
        controlsRef.current.target.lerp(targetLook, delta * 2);
        controlsRef.current.update();
      } else if (gamePhase === 'intro') {
        // Smooth transition for intro
        cameraRef.current.position.lerp(
          new THREE.Vector3(...cameraPosition),
          delta * 2
        );
        controlsRef.current.target.lerp(
          new THREE.Vector3(...cameraLookAt),
          delta * 2
        );
        controlsRef.current.update();
      }
      // For 'choose' and 'result', we let OrbitControls handle the camera
      // allowing the user to look around freely
    }
  });

  // Initial camera setup for 'choose' phase
  useEffect(() => {
    if (gamePhase === 'choose' && cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(...cameraPosition);
      controlsRef.current.target.set(...cameraLookAt);
      controlsRef.current.update();
    }
  }, [gamePhase]); // Only run when phase changes

  // Calculate character rotation
  const characterRotation: [number, number, number] = (() => {
    if (!selectedPath) {
      return [0, Math.PI, 0]; // Face into the cave
    }
    
    // Target positions from choosePath function
    // Left: [-6, 0, -5], Start: [0, 0, 5] -> dx = -6, dz = -10
    // Right: [6, 0, -5], Start: [0, 0, 5] -> dx = 6, dz = -10
    
    const dx = selectedPath === 'left' ? -6 : 6;
    const dz = -10;
    
    return [0, Math.atan2(dx, dz), 0];
  })();

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={cameraPosition} />
      <OrbitControls 
        ref={controlsRef}
        target={cameraLookAt} 
        enableZoom={true} 
        enablePan={true}
        maxPolarAngle={Math.PI / 2} // Prevent going below ground
        minDistance={2}
        maxDistance={20}
      />

      {/* Ambient lighting */}
      <ambientLight intensity={0.2} />
      
      {/* Fog effect */}
      <fog attach="fog" args={['#000000', 5, 30]} />
      <FogParticles density={100} />

      {/* Cave walls */}
      <CaveWall position={[0, 3, -8]} width={20} height={6} depth={1} />
      <CaveWall position={[-10, 3, 0]} rotation={[0, Math.PI / 2, 0]} width={16} height={6} depth={1} />
      <CaveWall position={[10, 3, 0]} rotation={[0, Math.PI / 2, 0]} width={16} height={6} depth={1} />
      
      {/* Entrance */}
      <CaveWall position={[-6, 3, 8]} width={8} height={6} depth={1} />
      <CaveWall position={[6, 3, 8]} width={8} height={6} depth={1} />

      {/* Split walls for paths */}
      <CaveWall position={[0, 3, 0]} width={1} height={6} depth={8} />

      {/* Paths */}
      <Path start={[0, 0, 5]} end={[-6, 0, -5]} isRevealed={revealedPaths.left} />
      <Path start={[0, 0, 5]} end={[6, 0, -5]} isRevealed={revealedPaths.right} />

      {/* Dynamic lights */}
      {revealedPaths.left && <DynamicLight position={[-6, 2, -5]} intensity={2} color="#00ff00" />}
      {revealedPaths.right && <DynamicLight position={[6, 2, -5]} intensity={2} color="#ff0000" />}
      <DynamicLight position={[0, 2, 5]} intensity={1.5} color="#ffa500" />

      {/* Character */}
      <Character position={characterPosition} rotation={characterRotation} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 25]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 6, 0]}>
        <planeGeometry args={[30, 25]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
    </>
  );
}

// Main Component
export default function CaveChallenge() {
  const [characterPosition, setCharacterPosition] = useState<[number, number, number]>([0, 0, 5]);
  const [selectedPath, setSelectedPath] = useState<'left' | 'right' | null>(null);
  const [revealedPaths, setRevealedPaths] = useState({ left: false, right: false });
  const [gamePhase, setGamePhase] = useState<'intro' | 'choose' | 'moving' | 'result'>('intro');
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([0, 8, 15]);
  const [cameraLookAt, setCameraLookAt] = useState<[number, number, number]>([0, 0, 0]);
  const [correctPath, setCorrectPath] = useState<'left' | 'right'>('left');
  const { completeLevel, gameState, navigateToLevel, nextLevel } = useGameState();

  useEffect(() => {
    // Randomly determine the correct path
    setCorrectPath(Math.random() > 0.5 ? 'left' : 'right');
  }, []);

  const startGame = () => {
    setGamePhase('choose');
    // Move camera inside the cave, past the entrance wall (z=8)
    setCameraPosition([0, 5, 6]);
  };

  const choosePath = (path: 'left' | 'right') => {
    if (gamePhase !== 'choose') return;
    
    setSelectedPath(path);
    setGamePhase('moving');

    // Animate character movement
    const targetPos: [number, number, number] = path === 'left' ? [-6, 0, -5] : [6, 0, -5];
    
    // Reveal the chosen path
    setRevealedPaths(prev => ({
      ...prev,
      [path]: true
    }));

    // Camera follows character automatically in 'moving' phase via Scene component

    // Animate character movement over time
    const startPos = characterPosition;
    const duration = 2000; // 2 seconds
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const newPos: [number, number, number] = [
        startPos[0] + (targetPos[0] - startPos[0]) * progress,
        startPos[1],
        startPos[2] + (targetPos[2] - startPos[2]) * progress
      ];
      
      setCharacterPosition(newPos);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        checkResult(path);
      }
    };

    animate();
  };

  const checkResult = (path: 'left' | 'right') => {
    setTimeout(() => {
      setGamePhase('result');
      
      // Reveal both paths
      setRevealedPaths({ left: true, right: true });
      
      // Probability-based verification (simulating ZK proof)
      // In reality, this would use a ZK circuit to prove the path chosen
      // had >= 50% probability without revealing the internal state
      const isCorrect = path === correctPath;
      
      if (isCorrect) {
        setTimeout(async () => {
          // Submit proof to Hedera
          try {
            const proofHash = `0x${Math.random().toString(16).substr(2, 8)}`;
            const result = await submitProofToHedera({
              level: 'cave-challenge',
              proofHash,
              userId: gameState?.playerId || 'anonymous',
            });
            console.log('Hedera NFT minted:', result);
            
            // Complete level with proof hash and NFT token ID
            completeLevel(2, result.transactionId, result.nftSerial);
          } catch (error) {
            console.error('Failed to mint NFT:', error);
            // Still complete the level even if Hedera fails
            completeLevel(2);
          }
        }, 2000);
      }
    }, 500);
  };

  const resetGame = () => {
    setCharacterPosition([0, 0, 5]);
    setSelectedPath(null);
    setRevealedPaths({ left: false, right: false });
    setGamePhase('intro');
    setCameraPosition([0, 8, 15]);
    setCameraLookAt([0, 0, 0]);
    setCorrectPath(Math.random() > 0.5 ? 'left' : 'right');
  };

  return (
    <div className="w-full h-screen flex flex-col relative">
      {/* Info Panel */}
      <CollapsibleLevelCard 
        levelId="cave-challenge" 
        title="Level 2: Cave Challenge"
        className="pointer-events-auto"
      >
        <p className="text-gray-300 mb-4 text-sm">
          {gamePhase === 'intro' && "You enter a dark cave with two paths. One leads to treasure, one to danger. Can you prove you made a decision without revealing which path you chose?"}
          {gamePhase === 'choose' && "Choose your path wisely. In ZK proofs, you can prove you made a valid choice without revealing which option you selected."}
          {gamePhase === 'moving' && "Following your chosen path..."}
          {gamePhase === 'result' && (
            selectedPath === correctPath 
              ? "Success! You proved your decision was valid without revealing it upfront! 🎉"
              : "You chose the other path! But you still proved you made a valid decision. Try again to find the treasure!"
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          {gamePhase === 'intro' && (
            <Button onClick={startGame} className="bg-purple-600 hover:bg-purple-700 flex-1">
              Enter Cave
            </Button>
          )}
          {gamePhase === 'choose' && (
            <>
              <Button onClick={() => choosePath('left')} className="bg-blue-600 hover:bg-blue-700 flex-1">
                Choose Left Path
              </Button>
              <Button onClick={() => choosePath('right')} className="bg-red-600 hover:bg-red-700 flex-1">
                Choose Right Path
              </Button>
            </>
          )}
          {gamePhase === 'result' && (
            <>
              <Button onClick={resetGame} className="bg-green-600 hover:bg-green-700 flex-1">
                Try Again
              </Button>
              {selectedPath === correctPath && nextLevel && (
                <Button 
                  onClick={() => navigateToLevel(nextLevel.world, nextLevel.id)} 
                  className="bg-blue-600 hover:bg-blue-700 flex-1"
                >
                  Next Level <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </CollapsibleLevelCard>

      {/* 3D Canvas */}
      <div className="flex-1 bg-black">
        <Canvas shadows>
          <Scene
            characterPosition={characterPosition}
            selectedPath={selectedPath}
            revealedPaths={revealedPaths}
            cameraPosition={cameraPosition}
            cameraLookAt={cameraLookAt}
            gamePhase={gamePhase}
          />
        </Canvas>
      </div>
    </div>
  );
}
