'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, Sphere, Box, Cylinder, Cone } from '@react-three/drei';
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
const AnimatedSphere = animated(Sphere);

// Anonymous 3D Avatar
function Avatar({ 
  startPosition,
  boothPosition,
  color, 
  isVoting,
  voteComplete,
  isMovingToBooth,
  isLeavingBooth
}: { 
  startPosition: [number, number, number];
  boothPosition: [number, number, number];
  color: string;
  isVoting: boolean;
  voteComplete: boolean;
  isMovingToBooth: boolean;
  isLeavingBooth: boolean;
}) {
  const avatarRef = useRef<THREE.Group>(null);
  const movementProgressRef = useRef(0);

  // Reset progress when movement state changes
  useEffect(() => {
    if (isMovingToBooth || isLeavingBooth) {
      movementProgressRef.current = 0;
    }
  }, [isMovingToBooth, isLeavingBooth]);

  // Animate movement to/from booth
  useFrame((state, delta) => {
    if (!avatarRef.current) return;

    if (isMovingToBooth) {
      // Move towards booth
      movementProgressRef.current = Math.min(movementProgressRef.current + delta * 1.5, 1);
      const progress = movementProgressRef.current;
      
      const x = THREE.MathUtils.lerp(startPosition[0], boothPosition[0], progress);
      const y = THREE.MathUtils.lerp(startPosition[1], boothPosition[1], progress);
      const z = THREE.MathUtils.lerp(startPosition[2], boothPosition[2], progress);
      
      avatarRef.current.position.set(x, y, z);
      
      // Slight bounce when voting
      if (isVoting && progress >= 1) {
        avatarRef.current.position.y = boothPosition[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      }
    } else if (isLeavingBooth) {
      // Move back to original position
      movementProgressRef.current = Math.min(movementProgressRef.current + delta * 1.5, 1);
      const progress = movementProgressRef.current;
      
      const x = THREE.MathUtils.lerp(boothPosition[0], startPosition[0], progress);
      const y = THREE.MathUtils.lerp(boothPosition[1], startPosition[1], progress);
      const z = THREE.MathUtils.lerp(boothPosition[2], startPosition[2], progress);
      
      avatarRef.current.position.set(x, y, z);
    } else {
      // At original position
      avatarRef.current.position.set(...startPosition);
      movementProgressRef.current = 0;
    }
  });

  const { scale } = useSpring({
    scale: voteComplete ? 0.8 : 1,
    config: { tension: 300, friction: 10 }
  });

  // Determine current position for rendering
  const currentPos = isMovingToBooth || isLeavingBooth 
    ? [0, 0, 0] // Will be animated via ref
    : (isVoting ? boothPosition : startPosition);

  return (
    <group ref={avatarRef} position={currentPos}>
      {/* Head */}
      <AnimatedSphere args={[0.3, 16, 16]} position={[0, 0.6, 0]} scale={scale}>
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.5} />
      </AnimatedSphere>
      
      {/* Body */}
      <AnimatedBox args={[0.4, 0.6, 0.3]} position={[0, 0, 0]} scale={scale}>
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.5} />
      </AnimatedBox>

      {/* Question mark (anonymous) */}
      <Text
        position={[0, 0.6, 0.35]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        ?
      </Text>

      {/* Status indicator */}
      {voteComplete && !isVoting && (
        <Sphere args={[0.1, 16, 16]} position={[0, 1.2, 0]}>
          <meshBasicMaterial color="#22c55e" />
        </Sphere>
      )}
    </group>
  );
}

// Voting Booth with privacy shield
function VotingBooth({ position, active }: { position: [number, number, number]; active: boolean }) {
  const boothRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (boothRef.current && active) {
      const shield = boothRef.current.children.find(c => c.name === 'shield');
      if (shield) {
        shield.rotation.y = clock.elapsedTime * 0.5;
      }
    }
  });

  return (
    <group ref={boothRef} position={position}>
      {/* Booth structure */}
      <Box args={[2, 3, 2]} position={[0, 1.5, 0]}>
        <meshStandardMaterial color="#374151" metalness={0.3} roughness={0.7} transparent opacity={0.8} />
      </Box>

      {/* Privacy shield */}
      {active && (
        <mesh name="shield" position={[0, 1.5, 1.1]}>
          <torusGeometry args={[1, 0.05, 16, 32]} />
          <meshStandardMaterial 
            color="#22c55e" 
            metalness={1} 
            roughness={0.1} 
            emissive="#22c55e"
            emissiveIntensity={0.3}
          />
        </mesh>
      )}

      {/* Door */}
      <Box args={[1, 2.5, 0.1]} position={[0, 1.25, 1]}>
        <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.5} />
      </Box>

      <Text
        position={[0, 3.5, 0]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        PRIVATE BOOTH
      </Text>
    </group>
  );
}

// Encrypted Vote Orb
function VoteOrb({ 
  startPos, 
  endPos, 
  isAnimating,
  onComplete,
  color
}: { 
  startPos: [number, number, number]; 
  endPos: [number, number, number];
  isAnimating: boolean;
  onComplete: () => void;
  color: string;
}) {
  const orbRef = useRef<THREE.Group>(null);
  const [progress, setProgress] = useState(0);

  useFrame((state, delta) => {
    if (isAnimating && orbRef.current) {
      const newProgress = Math.min(progress + delta * 0.3, 1);
      setProgress(newProgress);

      const x = THREE.MathUtils.lerp(startPos[0], endPos[0], newProgress);
      const y = THREE.MathUtils.lerp(startPos[1], endPos[1], newProgress) + Math.sin(newProgress * Math.PI) * 1.5;
      const z = THREE.MathUtils.lerp(startPos[2], endPos[2], newProgress);

      orbRef.current.position.set(x, y, z);
      orbRef.current.rotation.x += delta * 2;
      orbRef.current.rotation.y += delta * 3;

      if (newProgress >= 1) {
        onComplete();
        setProgress(0);
      }
    }
  });

  if (!isAnimating && progress === 0) return null;

  return (
    <group ref={orbRef} position={startPos}>
      {/* Inner orb */}
      <Sphere args={[0.2, 16, 16]}>
        <meshStandardMaterial 
          color={color} 
          metalness={0.8} 
          roughness={0.2}
          emissive={color}
          emissiveIntensity={0.5}
        />
      </Sphere>
      
      {/* Encryption shell */}
      <Sphere args={[0.3, 16, 16]}>
        <meshStandardMaterial 
          color="#9333ea" 
          transparent 
          opacity={0.3}
          wireframe
        />
      </Sphere>

      {/* Outer glow */}
      <Sphere args={[0.35, 16, 16]}>
        <meshBasicMaterial color={color} transparent opacity={0.1} />
      </Sphere>
    </group>
  );
}

// Ballot Box
function BallotBox({ position, voteCount }: { position: [number, number, number]; voteCount: number }) {
  return (
    <group position={position}>
      {/* Box body */}
      <Box args={[1.5, 1.2, 1.5]}>
        <meshStandardMaterial color="#1e40af" metalness={0.7} roughness={0.3} />
      </Box>

      {/* Slot on top */}
      <Box args={[0.8, 0.1, 0.2]} position={[0, 0.65, 0]}>
        <meshStandardMaterial color="#000000" />
      </Box>

      {/* Lock */}
      <Cylinder args={[0.15, 0.15, 0.3]} position={[0, 0, 0.8]}>
        <meshStandardMaterial color="#fbbf24" metalness={1} roughness={0.2} />
      </Cylinder>

      <Text
        position={[0, -0.9, 0]}
        fontSize={0.15}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        Votes: {voteCount}
      </Text>
    </group>
  );
}

// 3D Bar Chart for Results
function ResultsChart({ 
  position, 
  optionAVotes, 
  optionBVotes,
  visible 
}: { 
  position: [number, number, number]; 
  optionAVotes: number;
  optionBVotes: number;
  visible: boolean;
}) {
  const maxHeight = 3;
  const total = optionAVotes + optionBVotes || 1;
  const heightA = (optionAVotes / total) * maxHeight;
  const heightB = (optionBVotes / total) * maxHeight;

  const { scaleA } = useSpring({
    scaleA: visible ? heightA : 0.1,
    config: { tension: 200, friction: 20 }
  });

  const { scaleB } = useSpring({
    scaleB: visible ? heightB : 0.1,
    config: { tension: 200, friction: 20 }
  });

  if (!visible) return null;

  return (
    <group position={position}>
      {/* Option A Bar */}
      <AnimatedBox 
        args={[0.6, 1, 0.6]} 
        position={[-0.8, 0, 0]}
        scale-y={scaleA}
      >
        <meshStandardMaterial color="#3b82f6" metalness={0.5} roughness={0.3} />
      </AnimatedBox>
      <Text
        position={[-0.8, -0.7, 0]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        A: {optionAVotes}
      </Text>

      {/* Option B Bar */}
      <AnimatedBox 
        args={[0.6, 1, 0.6]} 
        position={[0.8, 0, 0]}
        scale-y={scaleB}
      >
        <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.3} />
      </AnimatedBox>
      <Text
        position={[0.8, -0.7, 0]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        B: {optionBVotes}
      </Text>

      {/* Chart title */}
      <Text
        position={[0, maxHeight + 0.5, 0]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        PUBLIC RESULTS
      </Text>
    </group>
  );
}

// Main 3D Scene
function Scene({ 
  voters,
  currentVoter,
  votingInProgress,
  onVoteComplete,
  ballotBoxVotes,
  optionAVotes,
  optionBVotes,
  showResults,
  voterPositions,
  boothPosition,
  avatarStates
}: { 
  voters: Array<{ id: number; color: string; voted: boolean }>;
  currentVoter: number | null;
  votingInProgress: boolean;
  onVoteComplete: () => void;
  ballotBoxVotes: number;
  optionAVotes: number;
  optionBVotes: number;
  showResults: boolean;
  voterPositions: Array<[number, number, number]>;
  boothPosition: [number, number, number];
  avatarStates: Array<{ isMovingToBooth: boolean; isLeavingBooth: boolean }>;
}) {
  return (
    <>
      <OrbitControls enableZoom={true} maxDistance={20} minDistance={5} />
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, 10, -10]} intensity={0.5} />
      <spotLight position={[0, 15, 0]} angle={0.3} intensity={1.5} castShadow />

      {/* Voters */}
      {voters.map((voter, index) => (
        <Avatar
          key={voter.id}
          startPosition={voterPositions[index]}
          boothPosition={boothPosition}
          color={voter.color}
          isVoting={currentVoter === voter.id && votingInProgress}
          voteComplete={voter.voted}
          isMovingToBooth={avatarStates[index]?.isMovingToBooth || false}
          isLeavingBooth={avatarStates[index]?.isLeavingBooth || false}
        />
      ))}

      {/* Voting Booth */}
      <VotingBooth position={[0, 0, 0]} active={votingInProgress} />

      {/* Ballot Box */}
      <BallotBox position={[5, 0, 0]} voteCount={ballotBoxVotes} />

      {/* Vote Orb Animation */}
      <VoteOrb
        startPos={[0, 2, 1]}
        endPos={[5, 1, 0]}
        isAnimating={votingInProgress}
        onComplete={onVoteComplete}
        color={currentVoter !== null ? voters[currentVoter]?.color || "#ffffff" : "#ffffff"}
      />

      {/* Results Chart */}
      <ResultsChart
        position={[5, 0, 4]}
        optionAVotes={optionAVotes}
        optionBVotes={optionBVotes}
        visible={showResults}
      />

      {/* Stage/Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* Grid lines */}
      <gridHelper args={[40, 40, "#1e293b", "#1e293b"]} position={[0, -1.99, 0]} />
    </>
  );
}

// Main Component
export default function AnonymousVoting() {
  const [voters] = useState([
    { id: 0, color: "#3b82f6", voted: false },
    { id: 1, color: "#ef4444", voted: false },
    { id: 2, color: "#10b981", voted: false },
    { id: 3, color: "#f59e0b", voted: false },
    { id: 4, color: "#8b5cf6", voted: false },
    { id: 5, color: "#ec4899", voted: false },
  ]);
  const [voterStates, setVoterStates] = useState(voters);
  const [currentVoter, setCurrentVoter] = useState<number | null>(null);
  const [votingInProgress, setVotingInProgress] = useState(false);
  const [ballotBoxVotes, setBallotBoxVotes] = useState(0);
  const [optionAVotes, setOptionAVotes] = useState(0);
  const [optionBVotes, setOptionBVotes] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [gamePhase, setGamePhase] = useState<'intro' | 'voting' | 'tallying' | 'results' | 'success'>('intro');
  const { completeLevel, navigateToLevel, nextLevel, returnToMap } = useGameState();

  // Voter positions and booth position
  const voterPositions = voters.map((_, index) => [
    -6 + (index % 3) * 3,
    0,
    -4 + Math.floor(index / 3) * 3
  ] as [number, number, number]);
  const boothPosition: [number, number, number] = [0, 0, 0];

  // Track avatar movement states
  const [avatarStates, setAvatarStates] = useState<Array<{ isMovingToBooth: boolean; isLeavingBooth: boolean }>>(
    voters.map(() => ({ isMovingToBooth: false, isLeavingBooth: false }))
  );

  const startVoting = () => {
    setGamePhase('voting');
    castNextVote(0);
  };

  const castNextVote = (voterIndex: number) => {
    if (voterIndex >= voters.length) {
      // All votes cast, move to tallying
      setGamePhase('tallying');
      setTimeout(tallyVotes, 2000);
      return;
    }

    setCurrentVoter(voterIndex);
    
    // Start moving avatar to booth
    setAvatarStates(prev => prev.map((state, i) => 
      i === voterIndex ? { ...state, isMovingToBooth: true } : state
    ));

    // After avatar reaches booth, start voting
    setTimeout(() => {
      setVotingInProgress(true);

      // Randomly vote for A or B
      const votesForA = Math.random() > 0.5;
      if (votesForA) {
        setOptionAVotes(prev => prev + 1);
      } else {
        setOptionBVotes(prev => prev + 1);
      }
    }, 2000); // Time for avatar to reach booth
  };

  const handleVoteComplete = () => {
    setVotingInProgress(false);
    setBallotBoxVotes(prev => prev + 1);
    
    // Mark voter as voted
    setVoterStates(prev => prev.map((v, i) => 
      i === currentVoter ? { ...v, voted: true } : v
    ));

    // Start moving avatar away from booth
    if (currentVoter !== null) {
      setAvatarStates(prev => prev.map((state, i) => 
        i === currentVoter 
          ? { isMovingToBooth: false, isLeavingBooth: true } 
          : state
      ));

      // Reset leaving state after animation
      setTimeout(() => {
        setAvatarStates(prev => prev.map((state, i) => 
          i === currentVoter 
            ? { isMovingToBooth: false, isLeavingBooth: false } 
            : state
        ));
      }, 2000);
    }

    // Move to next voter after delay
    setTimeout(() => {
      if (currentVoter !== null) {
        castNextVote(currentVoter + 1);
      }
    }, 2000); // Wait for avatar to leave booth
  };

  const tallyVotes = () => {
    setShowResults(true);
    setGamePhase('results');
    
    setTimeout(() => {
      setGamePhase('success');
      
      // Complete level and submit to Hedera
      setTimeout(async () => {
        try {
          const proofHash = `0x${Math.random().toString(16).substr(2, 8)}`;
          await submitProofToHedera({
            level: 'anonymous-voting',
            proofHash,
            metadata: { 
              totalVotes: ballotBoxVotes,
              optionA: optionAVotes,
              optionB: optionBVotes
            }
          });
          completeLevel(8);
        } catch (error) {
          console.error('Failed to submit proof:', error);
          completeLevel(8);
        }
      }, 1000);
    }, 2000);
  };

  const resetLevel = () => {
    setVoterStates(voters.map(v => ({ ...v, voted: false })));
    setCurrentVoter(null);
    setVotingInProgress(false);
    setBallotBoxVotes(0);
    setOptionAVotes(0);
    setOptionBVotes(0);
    setShowResults(false);
    setGamePhase('intro');
    setAvatarStates(voters.map(() => ({ isMovingToBooth: false, isLeavingBooth: false })));
  };

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Info Panel */}
      <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none">
        <Card className="p-4 max-w-3xl mx-auto pointer-events-auto bg-black/80 backdrop-blur-sm border-purple-500/50">
          <h2 className="text-2xl font-bold text-white mb-2">Level 8: Anonymous Voting</h2>
          <p className="text-gray-300 mb-4">
            {gamePhase === 'intro' && "Watch anonymous voters cast encrypted votes! Zero-knowledge proofs verify eligibility without revealing identity. The tally is public, but voter privacy is protected."}
            {gamePhase === 'voting' && "Voters are casting encrypted votes in the private booth. Their identity remains hidden throughout the process."}
            {gamePhase === 'tallying' && "Tallying votes using ZK proofs to verify eligibility..."}
            {gamePhase === 'results' && "Results are now public! Notice: we know the vote counts, but NOT who voted for what."}
            {gamePhase === 'success' && "✅ Anonymous voting complete! Zero-knowledge proofs preserved voter privacy while ensuring vote integrity!"}
          </p>

          <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
            <div className="bg-blue-900/30 p-2 rounded">
              <div className="text-gray-400">Total Voters</div>
              <div className="text-white text-xl font-bold">{voters.length}</div>
            </div>
            <div className="bg-purple-900/30 p-2 rounded">
              <div className="text-gray-400">Votes Cast</div>
              <div className="text-white text-xl font-bold">{ballotBoxVotes}</div>
            </div>
            <div className="bg-green-900/30 p-2 rounded">
              <div className="text-gray-400">Status</div>
              <div className="text-white text-xl font-bold">
                {gamePhase === 'intro' && 'Ready'}
                {gamePhase === 'voting' && 'Voting...'}
                {gamePhase === 'tallying' && 'Tallying...'}
                {(gamePhase === 'results' || gamePhase === 'success') && 'Complete'}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {gamePhase === 'intro' && (
              <Button onClick={startVoting} className="bg-purple-600 hover:bg-purple-700">
                Start Anonymous Voting
              </Button>
            )}
            {gamePhase === 'success' && (
              <>
                <Button onClick={resetLevel} className="bg-purple-600 hover:bg-purple-700">
                  Vote Again
                </Button>
                <Button onClick={returnToMap} className="bg-gray-600 hover:bg-gray-700">
                  Back to Map
                </Button>
                {nextLevel && (
                  <Button 
                    onClick={() => navigateToLevel(nextLevel.world, nextLevel.id)} 
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Next Level <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1">
        <Canvas shadows camera={{ position: [8, 8, 12], fov: 50 }}>
          <Scene 
            voters={voterStates}
            currentVoter={currentVoter}
            votingInProgress={votingInProgress}
            onVoteComplete={handleVoteComplete}
            ballotBoxVotes={ballotBoxVotes}
            optionAVotes={optionAVotes}
            optionBVotes={optionBVotes}
            showResults={showResults}
            voterPositions={voterPositions}
            boothPosition={boothPosition}
            avatarStates={avatarStates}
          />
        </Canvas>
      </div>
    </div>
  );
}
