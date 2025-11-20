'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Box, Text, PerspectiveCamera } from '@react-three/drei';
import { useState, useRef, useEffect } from 'react';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { CollapsibleLevelCard } from '../CollapsibleLevelCard';
import { useGameState } from '@/hooks/use-game-state';
import { submitProofToHedera } from '@/lib/hedera-api';
import { ArrowRight } from 'lucide-react';

// Animated 3D Ball Component
const AnimatedSphere = animated(Sphere);

interface BallProps {
  position: [number, number, number];
  color: string;
  onClick?: () => void;
}

function Ball({ position, color, onClick }: BallProps) {
  const [hovered, setHovered] = useState(false);
  
  const { scale } = useSpring({
    scale: hovered ? 1.2 : 1,
    config: { tension: 300, friction: 10 }
  });

  return (
    <AnimatedSphere
      args={[1, 32, 32]}
      position={position}
      scale={scale}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
    </AnimatedSphere>
  );
}

// Hand/Container Component
function Hand({ position, isLeft }: { position: [number, number, number]; isLeft: boolean }) {
  return (
    <group position={position}>
      {/* Palm */}
      <Box args={[1.5, 0.3, 1.5]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#d4a574" />
      </Box>
      {/* Fingers */}
      {[0, 1, 2, 3].map((i) => (
        <Box 
          key={i} 
          args={[0.25, 0.1, 0.8]} 
          position={[
            (isLeft ? -0.6 : -0.6) + i * 0.4,
            0.2,
            0.8
          ]}
        >
          <meshStandardMaterial color="#d4a574" />
        </Box>
      ))}
      {/* Thumb */}
      <Box 
        args={[0.25, 0.1, 0.6]} 
        position={[isLeft ? 0.9 : -0.9, 0.1, 0.3]}
        rotation={[0, 0, isLeft ? -0.5 : 0.5]}
      >
        <meshStandardMaterial color="#d4a574" />
      </Box>
    </group>
  );
}

// Particle Effect Component
function ParticleExplosion({ trigger }: { trigger: boolean }) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 100;
  const [positions] = useState(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    return pos;
  });

  const velocities = useRef<Float32Array>(new Float32Array(particleCount * 3));

  useEffect(() => {
    if (trigger) {
      for (let i = 0; i < particleCount; i++) {
        velocities.current[i * 3] = (Math.random() - 0.5) * 0.2;
        velocities.current[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
        velocities.current[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
      }
    }
  }, [trigger]);

  useFrame(() => {
    if (particlesRef.current && trigger) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += velocities.current[i * 3];
        positions[i * 3 + 1] += velocities.current[i * 3 + 1];
        positions[i * 3 + 2] += velocities.current[i * 3 + 2];
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  if (!trigger) return null;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#ffd700" transparent opacity={0.8} />
    </points>
  );
}

// Main 3D Scene
function Scene({ 
  ballPositions, 
  onBallClick,
  showSuccess,
  cameraPosition 
}: { 
  ballPositions: { red: [number, number, number]; blue: [number, number, number] };
  onBallClick: (ball: 'red' | 'blue') => void;
  showSuccess: boolean;
  cameraPosition: [number, number, number];
}) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useFrame(() => {
    if (cameraRef.current) {
      cameraRef.current.position.lerp(
        new THREE.Vector3(...cameraPosition),
        0.05
      );
      cameraRef.current.lookAt(0, 0, 0);
    }
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={cameraPosition} />
      <OrbitControls enableZoom={false} enablePan={false} />
      
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      <spotLight position={[0, 10, 0]} angle={0.3} intensity={1} castShadow />

      {/* Hands */}
      <Hand position={[-4, -2, 0]} isLeft={true} />
      <Hand position={[4, -2, 0]} isLeft={false} />

      {/* Balls */}
      <Ball 
        position={ballPositions.red} 
        color="#ff0000" 
        onClick={() => onBallClick('red')}
      />
      <Ball 
        position={ballPositions.blue} 
        color="#0000ff" 
        onClick={() => onBallClick('blue')}
      />

      {/* Success Particles */}
      <ParticleExplosion trigger={showSuccess} />

      {/* Stage/Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
    </>
  );
}

// Main Component
export default function ColorGame() {
  const [ballPositions, setBallPositions] = useState<{
    red: [number, number, number];
    blue: [number, number, number];
  }>({
    red: [-4, 0, 0],
    blue: [4, 0, 0]
  });
  
  const [selectedBall, setSelectedBall] = useState<'red' | 'blue' | null>(null);
  const [swapCount, setSwapCount] = useState(0);
  const [gamePhase, setGamePhase] = useState<'intro' | 'playing' | 'reveal' | 'success'>('intro');
  const [showSuccess, setShowSuccess] = useState(false);
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([0, 2, 10]);
  const { completeLevel, gameState, navigateToLevel, nextLevel } = useGameState();

  const handleBallClick = (ball: 'red' | 'blue') => {
    if (gamePhase !== 'playing') return;

    if (selectedBall === null) {
      setSelectedBall(ball);
    } else if (selectedBall !== ball) {
      // Swap balls
      setBallPositions(prev => ({
        red: prev.blue,
        blue: prev.red
      }));
      setSelectedBall(null);
      setSwapCount(prev => prev + 1);
    } else {
      setSelectedBall(null);
    }
  };

  const startGame = () => {
    setGamePhase('playing');
    setCameraPosition([0, 1, 8]);
  };

  const checkAnswer = () => {
    setGamePhase('reveal');
    setCameraPosition([0, 0, 6]);
    
    // Simulate checking - in real implementation, this would verify ZK proof
    setTimeout(() => {
      const isCorrect = ballPositions.red[0] === 4 && ballPositions.blue[0] === -4;
      if (isCorrect) {
        setGamePhase('success');
        setShowSuccess(true);
        
        // Complete level and mint NFT
        setTimeout(async () => {
          // Submit proof to Hedera and mint NFT
          try {
            const proofHash = `0x${Math.random().toString(16).substr(2, 8)}`;
            const result = await submitProofToHedera({
              level: 'color-game',
              proofHash,
              userId: gameState?.playerId || 'anonymous',
            });
            console.log('Hedera NFT minted:', result);
            
            // Complete level with proof hash and NFT token ID
            completeLevel(1, result.transactionId, result.nftSerial);
          } catch (error) {
            console.error('Failed to mint NFT:', error);
            // Still complete the level even if Hedera fails
            completeLevel(1);
          }
        }, 2000);
      } else {
        alert('Not quite! The balls need to be swapped. Try again!');
        setGamePhase('playing');
      }
    }, 1500);
  };

  const resetGame = () => {
    setBallPositions({
      red: [-4, 0, 0],
      blue: [4, 0, 0]
    });
    setSelectedBall(null);
    setSwapCount(0);
    setGamePhase('intro');
    setShowSuccess(false);
    setCameraPosition([0, 2, 10]);
  };

  return (
    <div className="w-full h-screen flex flex-col relative">
      {/* Info Panel */}
      <CollapsibleLevelCard 
        levelId="color-game" 
        title="Level 1: Color Game"
        className="pointer-events-auto"
      >
          <p className="text-gray-300 mb-4 text-sm">
            {gamePhase === 'intro' && "A magician puts a red ball in their left hand and a blue ball in their right hand. They shuffle behind their back. Can they prove the balls were swapped without showing you?"}
            {gamePhase === 'playing' && "Click the balls to swap them. This simulates what happens behind the magician's back."}
            {gamePhase === 'reveal' && "Verifying the proof..."}
            {gamePhase === 'success' && "Success! You've proven the swap without revealing the secret moves! 🎉"}
          </p>
          
          {gamePhase === 'playing' && (
            <div className="text-gray-300 mb-2 text-sm">
              Swaps: {swapCount} | Selected: {selectedBall ? selectedBall.toUpperCase() : 'None'}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {gamePhase === 'intro' && (
              <Button onClick={startGame} className="bg-purple-600 hover:bg-purple-700 w-full">
                Start Game
              </Button>
            )}
            {gamePhase === 'playing' && (
              <Button onClick={checkAnswer} className="bg-green-600 hover:bg-green-700 w-full">
                Verify Proof
              </Button>
            )}
            {gamePhase === 'success' && (
              <>
                <Button onClick={resetGame} className="bg-blue-600 hover:bg-blue-700 flex-1">
                  Play Again
                </Button>
                {nextLevel && (
                  <Button 
                    onClick={() => navigateToLevel(nextLevel.world, nextLevel.id)} 
                    className="bg-green-600 hover:bg-green-700 flex-1"
                  >
                    Next Level <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                )}
              </>
            )}
          </div>
      </CollapsibleLevelCard>

      {/* 3D Canvas */}
      <div className="flex-1">
        <Canvas shadows>
          <Scene 
            ballPositions={ballPositions}
            onBallClick={handleBallClick}
            showSuccess={showSuccess}
            cameraPosition={cameraPosition}
          />
        </Canvas>
      </div>
    </div>
  );
}
