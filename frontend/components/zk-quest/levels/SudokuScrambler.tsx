'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Text, PerspectiveCamera, Html } from '@react-three/drei';
import { useState, useRef, useEffect } from 'react';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useGameState } from '@/hooks/use-game-state';
import { submitProofToHedera } from '@/lib/hedera-api';
import { ArrowRight } from 'lucide-react';

// Animated components
const AnimatedBox = animated(Box);

// Sudoku Tile Component
interface TileProps {
  position: [number, number, number];
  value: number;
  isRevealed: boolean;
  onClick: () => void;
  isCommitted: boolean;
}

function SudokuTile({ position, value, isRevealed, onClick, isCommitted }: TileProps) {
  const [hovered, setHovered] = useState(false);
  const tileRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (tileRef.current) {
      if (isCommitted) {
        // Locked animation
        tileRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      } else {
        // Idle floating
        tileRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.05;
      }
    }
  });

  const { scale } = useSpring({
    scale: hovered ? 1.1 : 1,
    config: { tension: 300, friction: 10 }
  });

  return (
    <group 
      ref={tileRef}
      position={position}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Tile face */}
      <AnimatedBox args={[0.8, 0.1, 0.8]} scale={scale}>
        <meshStandardMaterial 
          color={isCommitted ? "#ffd700" : (hovered ? "#6a5acd" : "#4169e1")}
          metalness={0.6}
          roughness={0.2}
        />
      </AnimatedBox>
      
      {/* Number display */}
      {isRevealed && (
        <Text
          position={[0, 0.06, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.4}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {value}
        </Text>
      )}
      
      {/* Hidden indicator */}
      {!isRevealed && (
        <Text
          position={[0, 0.06, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.3}
          color="#cccccc"
          anchorX="center"
          anchorY="middle"
        >
          ?
        </Text>
      )}
    </group>
  );
}

// Commitment Box Component
function CommitmentBox({ 
  position, 
  isActive, 
  hash 
}: { 
  position: [number, number, number]; 
  isActive: boolean;
  hash: string;
}) {
  const boxRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (boxRef.current && isActive) {
      boxRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group ref={boxRef} position={position}>
      {/* Main box */}
      <Box args={[2, 2, 2]}>
        <meshStandardMaterial 
          color={isActive ? "#00ff00" : "#333333"}
          metalness={0.8}
          roughness={0.2}
          emissive={isActive ? "#00ff00" : "#000000"}
          emissiveIntensity={0.3}
        />
      </Box>
      
      {/* Lock indicator */}
      {isActive && (
        <>
          <Box args={[0.4, 0.6, 0.2]} position={[0, 0.3, 1.01]}>
            <meshStandardMaterial color="#ffd700" metalness={0.9} />
          </Box>
          <Box args={[0.6, 0.4, 0.2]} position={[0, 0.6, 1.01]}>
            <meshStandardMaterial color="#ffd700" metalness={0.9} />
          </Box>
        </>
      )}

      {/* Hash display */}
      {isActive && hash && (
        <Html position={[0, -1.2, 0]} center>
          <div className="bg-black/80 px-3 py-2 rounded border border-green-500 text-green-400 text-xs font-mono max-w-[200px] break-all">
            Hash: {hash}
          </div>
        </Html>
      )}
    </group>
  );
}

// Hash Particle Flow Component
function HashParticles({ show, sourcePos, targetPos }: { 
  show: boolean; 
  sourcePos: [number, number, number];
  targetPos: [number, number, number];
}) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 50;
  const [positions] = useState(() => {
    const pos = new Float32Array(particleCount * 3);
    return pos;
  });

  useFrame((state) => {
    if (particlesRef.current && show) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const time = state.clock.elapsedTime;
      
      for (let i = 0; i < particleCount; i++) {
        const progress = (time * 0.5 + i / particleCount) % 1;
        positions[i * 3] = sourcePos[0] + (targetPos[0] - sourcePos[0]) * progress;
        positions[i * 3 + 1] = sourcePos[1] + (targetPos[1] - sourcePos[1]) * progress + Math.sin(progress * Math.PI * 4) * 0.5;
        positions[i * 3 + 2] = sourcePos[2] + (targetPos[2] - sourcePos[2]) * progress;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  if (!show) return null;

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
      <pointsMaterial size={0.1} color="#00ff00" transparent opacity={0.8} />
    </points>
  );
}

// Main Scene
function Scene({
  sudokuValues,
  revealedTiles,
  onTileClick,
  isCommitted,
  commitmentHash,
  showHashFlow,
  cameraPosition
}: {
  sudokuValues: number[][];
  revealedTiles: boolean[][];
  onTileClick: (row: number, col: number) => void;
  isCommitted: boolean;
  commitmentHash: string;
  showHashFlow: boolean;
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
      <OrbitControls enableZoom={true} enablePan={false} />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, 10, -10]} intensity={0.8} />
      <spotLight position={[0, 10, 0]} angle={0.5} intensity={1.5} castShadow />

      {/* Sudoku Board */}
      {sudokuValues.map((row, rowIndex) =>
        row.map((value, colIndex) => (
          <SudokuTile
            key={`${rowIndex}-${colIndex}`}
            position={[
              (colIndex - 1.5) * 1,
              0,
              (rowIndex - 1.5) * 1
            ]}
            value={value}
            isRevealed={revealedTiles[rowIndex][colIndex]}
            onClick={() => onTileClick(rowIndex, colIndex)}
            isCommitted={isCommitted}
          />
        ))
      )}

      {/* Board Base */}
      <Box args={[4.5, 0.2, 4.5]} position={[0, -0.15, 0]} receiveShadow>
        <meshStandardMaterial color="#1a1a2e" />
      </Box>

      {/* Commitment Box */}
      <CommitmentBox 
        position={[6, 0, 0]} 
        isActive={isCommitted}
        hash={commitmentHash}
      />

      {/* Hash Flow Particles */}
      <HashParticles 
        show={showHashFlow}
        sourcePos={[0, 0, 0]}
        targetPos={[6, 0, 0]}
      />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0f0f1e" />
      </mesh>
    </>
  );
}

// Simple hash function for demo
function simpleHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// Main Component
export default function SudokuScrambler() {
  // Mini 4x4 Sudoku for demo
  const [sudokuValues] = useState<number[][]>([
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 3, 4, 1],
    [4, 1, 2, 3]
  ]);

  const [revealedTiles, setRevealedTiles] = useState<boolean[][]>(
    Array(4).fill(null).map(() => Array(4).fill(false))
  );

  const [gamePhase, setGamePhase] = useState<'intro' | 'solving' | 'committing' | 'committed' | 'success'>('intro');
  const [isCommitted, setIsCommitted] = useState(false);
  const [commitmentHash, setCommitmentHash] = useState('');
  const [showHashFlow, setShowHashFlow] = useState(false);
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([0, 8, 10]);
  const { completeLevel, gameState, navigateToLevel, nextLevel } = useGameState();

  const handleTileClick = (row: number, col: number) => {
    if (gamePhase !== 'solving' || isCommitted) return;

    setRevealedTiles(prev => {
      const newRevealed = [...prev];
      newRevealed[row] = [...newRevealed[row]];
      newRevealed[row][col] = !newRevealed[row][col];
      return newRevealed;
    });
  };

  const startGame = () => {
    setGamePhase('solving');
    setCameraPosition([0, 6, 8]);
  };

  const commitSolution = () => {
    setGamePhase('committing');
    
    // Create hash of the solution
    const solutionString = sudokuValues.flat().join('');
    const hash = simpleHash(solutionString);
    setCommitmentHash(hash);

    // Show particle flow animation
    setShowHashFlow(true);
    setCameraPosition([3, 5, 6]);

    setTimeout(() => {
      setIsCommitted(true);
      setShowHashFlow(false);
      setGamePhase('committed');
    }, 2000);
  };

  const submitToHedera = async () => {
    setGamePhase('success');
    
    // Submit commitment hash to Hedera HCS topic
    try {
      const result = await submitProofToHedera({
        level: 'sudoku-scrambler',
        proofHash: commitmentHash,
        userId: gameState?.playerId || 'anonymous',
      });
      console.log('Submitted to Hedera HCS:', result);
      
      setTimeout(() => {
        completeLevel(3, result.transactionId, result.nftSerial);
      }, 1500);
    } catch (error) {
      console.error('Failed to submit to Hedera:', error);
      // Still complete the level even if Hedera submission fails
      setTimeout(() => {
        completeLevel(3);
      }, 1500);
    }
  };

  const revealAll = () => {
    setRevealedTiles(Array(4).fill(null).map(() => Array(4).fill(true)));
  };

  const resetGame = () => {
    setRevealedTiles(Array(4).fill(null).map(() => Array(4).fill(false)));
    setGamePhase('intro');
    setIsCommitted(false);
    setCommitmentHash('');
    setShowHashFlow(false);
    setCameraPosition([0, 8, 10]);
  };

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Info Panel */}
      <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none">
        <Card className="p-4 max-w-2xl mx-auto pointer-events-auto bg-black/80 backdrop-blur-sm border-purple-500/50">
          <h2 className="text-2xl font-bold text-white mb-2">Level 3: Sudoku Scrambler</h2>
          <p className="text-gray-300 mb-4">
            {gamePhase === 'intro' && "Click tiles to reveal a completed Sudoku puzzle. Once you've verified the solution, commit it as a hash without revealing all the numbers!"}
            {gamePhase === 'solving' && "Click tiles to reveal numbers. When ready, commit your solution as a cryptographic hash."}
            {gamePhase === 'committing' && "Creating cryptographic commitment..."}
            {gamePhase === 'committed' && "Solution committed! The hash proves you know a valid solution without revealing it. Submit to Hedera blockchain."}
            {gamePhase === 'success' && "Success! Your commitment is now on Hedera's blockchain! 🎉"}
          </p>

          <div className="flex gap-2 flex-wrap">
            {gamePhase === 'intro' && (
              <Button onClick={startGame} className="bg-purple-600 hover:bg-purple-700">
                Start Puzzle
              </Button>
            )}
            {gamePhase === 'solving' && (
              <>
                <Button onClick={revealAll} className="bg-blue-600 hover:bg-blue-700">
                  Reveal All
                </Button>
                <Button onClick={commitSolution} className="bg-green-600 hover:bg-green-700">
                  Commit Solution
                </Button>
              </>
            )}
            {gamePhase === 'committed' && (
              <Button onClick={submitToHedera} className="bg-orange-600 hover:bg-orange-700">
                Submit to Hedera HCS
              </Button>
            )}
            {gamePhase === 'success' && (
              <div className="flex gap-2">
                <Button onClick={resetGame} className="bg-purple-600 hover:bg-purple-700">
                  Play Again
                </Button>
                {nextLevel && (
                  <Button 
                    onClick={() => navigateToLevel(nextLevel.world, nextLevel.id)} 
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Next Level <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {isCommitted && (
            <div className="mt-4 p-3 bg-green-900/30 border border-green-500 rounded">
              <p className="text-green-300 text-sm font-mono">
                <strong>Commitment Hash:</strong><br />
                {commitmentHash}
              </p>
              <p className="text-gray-300 text-xs mt-2">
                This hash represents your solution. Anyone can verify you committed to a specific answer, but can't determine what it is!
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1">
        <Canvas shadows>
          <Scene
            sudokuValues={sudokuValues}
            revealedTiles={revealedTiles}
            onTileClick={handleTileClick}
            isCommitted={isCommitted}
            commitmentHash={commitmentHash}
            showHashFlow={showHashFlow}
            cameraPosition={cameraPosition}
          />
        </Canvas>
      </div>
    </div>
  );
}
