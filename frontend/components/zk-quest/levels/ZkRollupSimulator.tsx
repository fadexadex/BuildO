'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, Sphere, Box, Cylinder, Line } from '@react-three/drei';
import { useState, useRef, useEffect } from 'react';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { useGameState } from '@/hooks/use-game-state';
import { submitProofToHedera } from '@/lib/hedera-api';
import { CollapsibleLevelCard } from '../CollapsibleLevelCard';

// Animated components
const AnimatedBox = animated(Box);
const AnimatedSphere = animated(Sphere);

// Transaction Block
function TransactionBlock({ 
  position, 
  transaction,
  isProcessing,
  inQueue
}: { 
  position: [number, number, number]; 
  transaction: { id: number; from: string; to: string; amount: number };
  isProcessing: boolean;
  inQueue: boolean;
}) {
  const blockRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (blockRef.current && isProcessing) {
      blockRef.current.rotation.y = clock.elapsedTime * 2;
      blockRef.current.position.y = position[1] + Math.sin(clock.elapsedTime * 3) * 0.1;
    }
  });

  const { scale } = useSpring({
    scale: isProcessing ? 1.2 : 1,
    config: { tension: 300, friction: 10 }
  });

  if (!inQueue) return null;

  return (
    <AnimatedBox 
      ref={blockRef}
      args={[0.6, 0.6, 0.6]} 
      position={position}
      scale={scale}
    >
      <meshStandardMaterial 
        color={isProcessing ? "#fbbf24" : "#3b82f6"} 
        metalness={0.7} 
        roughness={0.3}
        emissive={isProcessing ? "#fbbf24" : "#3b82f6"}
        emissiveIntensity={isProcessing ? 0.5 : 0.1}
      />
    </AnimatedBox>
  );
}

// Transaction Queue Container
function TransactionQueue({ 
  transactions,
  processingIndex
}: { 
  transactions: Array<{ id: number; from: string; to: string; amount: number }>;
  processingIndex: number;
}) {
  return (
    <group position={[-6, 0, 0]}>
      {/* Queue container */}
      <Box args={[2, 5, 2]} position={[0, 2.5, 0]}>
        <meshStandardMaterial 
          color="#1e293b" 
          metalness={0.5} 
          roughness={0.5}
          transparent
          opacity={0.3}
        />
      </Box>

      <Text
        position={[0, 5.5, 0]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        TX QUEUE
      </Text>

      {/* Transaction blocks in queue */}
      {transactions.slice(0, 6).map((tx, index) => (
        <TransactionBlock
          key={tx.id}
          position={[0, 4.5 - index * 0.8, 0]}
          transaction={tx}
          isProcessing={index === processingIndex}
          inQueue={true}
        />
      ))}
    </group>
  );
}

// Batching Chamber
function BatchingChamber({ 
  position,
  isActive,
  batchSize
}: { 
  position: [number, number, number];
  isActive: boolean;
  batchSize: number;
}) {
  const chamberRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (chamberRef.current && isActive) {
      const particles = chamberRef.current.children.filter(c => c.name === 'particle');
      particles.forEach((particle, i) => {
        particle.position.y = Math.sin(clock.elapsedTime * 2 + i) * 0.3;
        particle.rotation.y = clock.elapsedTime * (i + 1);
      });
    }
  });

  return (
    <group ref={chamberRef} position={position}>
      {/* Chamber walls */}
      <Cylinder args={[1.5, 1.5, 4, 32, 1, true]}>
        <meshStandardMaterial 
          color="#7c3aed" 
          metalness={0.8} 
          roughness={0.2}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </Cylinder>

      {/* Energy rings */}
      {isActive && [0, 1, 2].map((i) => (
        <mesh 
          key={i}
          position={[0, -1 + i * 1, 0]}
          rotation={[0, 0, 0]}
        >
          <torusGeometry args={[1.5, 0.05, 16, 32]} />
          <meshStandardMaterial 
            color="#a855f7" 
            metalness={1} 
            roughness={0.1}
            emissive="#a855f7"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}

      {/* Processing particles */}
      {isActive && Array.from({ length: batchSize }).map((_, i) => (
        <Sphere 
          key={i}
          name="particle"
          args={[0.1, 8, 8]} 
          position={[
            Math.cos(i * Math.PI * 2 / batchSize) * 0.8,
            0,
            Math.sin(i * Math.PI * 2 / batchSize) * 0.8
          ]}
        >
          <meshBasicMaterial color="#fbbf24" />
        </Sphere>
      ))}

      <Text
        position={[0, 2.5, 0]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        BATCHING
      </Text>

      {isActive && (
        <Text
          position={[0, -2.5, 0]}
          fontSize={0.2}
          color="#22c55e"
          anchorX="center"
          anchorY="middle"
        >
          {batchSize} TXs
        </Text>
      )}
    </group>
  );
}

// ZK Proof Compressor
function ProofCompressor({ 
  position,
  isActive
}: { 
  position: [number, number, number];
  isActive: boolean;
}) {
  const compressorRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (compressorRef.current && isActive) {
      compressorRef.current.rotation.y = clock.elapsedTime;
      compressorRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.1);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5} enabled={isActive}>
      <group ref={compressorRef} position={position}>
        {/* Circuit representation */}
        <mesh>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial 
            color="#22c55e" 
            metalness={0.9} 
            roughness={0.1}
            wireframe={!isActive}
            emissive={isActive ? "#22c55e" : "#000000"}
            emissiveIntensity={0.5}
          />
        </mesh>

        {/* Energy core */}
        {isActive && (
          <Sphere args={[0.3, 16, 16]}>
            <meshBasicMaterial color="#fbbf24" />
          </Sphere>
        )}

        <Text
          position={[0, 1.5, 0]}
          fontSize={0.2}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          ZK CIRCUIT
        </Text>
      </group>
    </Float>
  );
}

// State Root Tree
function StateRootTree({ 
  position,
  levels,
  isActive
}: { 
  position: [number, number, number];
  levels: number;
  isActive: boolean;
}) {
  const treeRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (treeRef.current && isActive) {
      const nodes = treeRef.current.children.filter(c => c.name === 'node');
      nodes.forEach((node, i) => {
        node.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3 + i) * 0.1);
      });
    }
  });

  const renderTreeLevel = (level: number, xPos: number, yPos: number, width: number) => {
    const nodes: JSX.Element[] = [];
    const nodeCount = Math.pow(2, level);
    const spacing = width / (nodeCount + 1);

    for (let i = 0; i < nodeCount; i++) {
      const x = xPos - width / 2 + spacing * (i + 1);
      nodes.push(
        <Sphere
          key={`${level}-${i}`}
          name="node"
          args={[0.15, 16, 16]}
          position={[x, yPos, 0]}
        >
          <meshStandardMaterial 
            color={level === 0 ? "#fbbf24" : "#3b82f6"} 
            metalness={0.8}
            roughness={0.2}
            emissive={isActive ? (level === 0 ? "#fbbf24" : "#3b82f6") : "#000000"}
            emissiveIntensity={0.3}
          />
        </Sphere>
      );

      // Draw connections to parent
      if (level > 0) {
        const parentX = xPos - width / 4 + spacing * Math.floor(i / 2) * 2;
        const parentY = yPos + 0.8;
        const points = [
          new THREE.Vector3(x, yPos, 0),
          new THREE.Vector3(parentX, parentY, 0)
        ];
        nodes.push(
          <Line
            key={`line-${level}-${i}`}
            points={points}
            color="#6366f1"
            lineWidth={2}
          />
        );
      }
    }
    return nodes;
  };

  if (!isActive) return null;

  return (
    <group ref={treeRef} position={position}>
      {/* Render tree levels */}
      {Array.from({ length: levels }).map((_, level) => (
        <group key={level}>
          {renderTreeLevel(levels - 1 - level, 0, level * 0.8, 4 / Math.pow(1.5, level))}
        </group>
      ))}

      <Text
        position={[0, -1, 0]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        STATE ROOT
      </Text>

      {/* Root hash label */}
      <Text
        position={[0, (levels - 1) * 0.8 + 0.5, 0]}
        fontSize={0.15}
        color="#fbbf24"
        anchorX="center"
        anchorY="middle"
      >
        ROOT: 0x{Math.random().toString(16).substr(2, 8)}
      </Text>
    </group>
  );
}

// Hedera Network Connection
function HederaConnection({ 
  position,
  isSubmitting
}: { 
  position: [number, number, number];
  isSubmitting: boolean;
}) {
  const connectionRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (connectionRef.current && isSubmitting) {
      const particles = connectionRef.current.children.filter(c => c.name === 'netParticle');
      particles.forEach((particle, i) => {
        const progress = (clock.elapsedTime * 2 + i * 0.2) % 1;
        particle.position.x = -2 + progress * 4;
      });
    }
  });

  return (
    <group ref={connectionRef} position={position}>
      {/* Hedera node representation */}
      <Cylinder args={[0.5, 0.5, 1]} rotation={[0, 0, 0]}>
        <meshStandardMaterial 
          color="#000000" 
          metalness={0.8}
          roughness={0.2}
        />
      </Cylinder>

      {/* Hedera logo representation (simplified) */}
      <Text
        position={[0, 0, 0.55]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        H
      </Text>

      {/* Network particles */}
      {isSubmitting && Array.from({ length: 5 }).map((_, i) => (
        <Sphere
          key={i}
          name="netParticle"
          args={[0.05, 8, 8]}
          position={[-2, 0, 0]}
        >
          <meshBasicMaterial color="#22c55e" />
        </Sphere>
      ))}

      <Text
        position={[0, -1, 0]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        HEDERA
      </Text>
    </group>
  );
}

// Main 3D Scene
function Scene({ 
  transactions,
  processingIndex,
  isBatching,
  batchSize,
  isGeneratingProof,
  showStateRoot,
  isSubmittingToHedera
}: { 
  transactions: Array<{ id: number; from: string; to: string; amount: number }>;
  processingIndex: number;
  isBatching: boolean;
  batchSize: number;
  isGeneratingProof: boolean;
  showStateRoot: boolean;
  isSubmittingToHedera: boolean;
}) {
  return (
    <>
      <OrbitControls enableZoom={true} maxDistance={25} minDistance={8} />
      
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, 10, -10]} intensity={0.5} />
      <spotLight position={[0, 15, 0]} angle={0.5} intensity={1.5} castShadow />

      {/* Transaction Queue */}
      <TransactionQueue 
        transactions={transactions}
        processingIndex={processingIndex}
      />

      {/* Batching Chamber */}
      <BatchingChamber 
        position={[0, 2, 0]}
        isActive={isBatching}
        batchSize={batchSize}
      />

      {/* ZK Proof Compressor */}
      <ProofCompressor 
        position={[0, 6, 0]}
        isActive={isGeneratingProof}
      />

      {/* State Root Tree */}
      <StateRootTree 
        position={[6, 3, 0]}
        levels={3}
        isActive={showStateRoot}
      />

      {/* Hedera Connection */}
      <HederaConnection 
        position={[6, -1, 0]}
        isSubmitting={isSubmittingToHedera}
      />

      {/* Stage/Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#020617" />
      </mesh>

      {/* Grid */}
      <gridHelper args={[40, 40, "#1e293b", "#0f172a"]} position={[0, -2.99, 0]} />
    </>
  );
}

// Main Component
export default function ZkRollupSimulator() {
  const [transactions, setTransactions] = useState(
    Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      from: `0x${Math.random().toString(16).substr(2, 4)}`,
      to: `0x${Math.random().toString(16).substr(2, 4)}`,
      amount: Math.floor(Math.random() * 100) + 1
    }))
  );
  const [processingIndex, setProcessingIndex] = useState(-1);
  const [isBatching, setIsBatching] = useState(false);
  const [batchSize, setBatchSize] = useState(0);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [showStateRoot, setShowStateRoot] = useState(false);
  const [isSubmittingToHedera, setIsSubmittingToHedera] = useState(false);
  const [gamePhase, setGamePhase] = useState<'intro' | 'batching' | 'proving' | 'submitting' | 'success'>('intro');
  const { completeLevel } = useGameState();

  const startRollup = () => {
    setGamePhase('batching');
    setIsBatching(true);
    
    // Process transactions in batch
    let processed = 0;
    const batchInterval = setInterval(() => {
      if (processed < 5) {
        setProcessingIndex(processed);
        setBatchSize(prev => prev + 1);
        processed++;
      } else {
        clearInterval(batchInterval);
        setIsBatching(false);
        setProcessingIndex(-1);
        
        // Move to proof generation
        setTimeout(() => {
          setGamePhase('proving');
          setIsGeneratingProof(true);
          
          setTimeout(() => {
            setIsGeneratingProof(false);
            setShowStateRoot(true);
            
            // Submit to Hedera
            setTimeout(() => {
              setGamePhase('submitting');
              setIsSubmittingToHedera(true);
              
              setTimeout(() => {
                setIsSubmittingToHedera(false);
                setGamePhase('success');
                
                // Complete level
                setTimeout(async () => {
                  try {
                    const proofHash = `0x${Math.random().toString(16).substr(2, 8)}`;
                    await submitProofToHedera({
                      level: 'zk-rollup',
                      proofHash,
                      metadata: { 
                        batchSize: 5,
                        stateRoot: `0x${Math.random().toString(16).substr(2, 8)}`
                      }
                    });
                    completeLevel(9);
                  } catch (error) {
                    console.error('Failed to submit proof:', error);
                    completeLevel(9);
                  }
                }, 1000);
              }, 3000);
            }, 2000);
          }, 3000);
        }, 1000);
      }
    }, 800);
  };

  const resetLevel = () => {
    setTransactions(
      Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        from: `0x${Math.random().toString(16).substr(2, 4)}`,
        to: `0x${Math.random().toString(16).substr(2, 4)}`,
        amount: Math.floor(Math.random() * 100) + 1
      }))
    );
    setProcessingIndex(-1);
    setIsBatching(false);
    setBatchSize(0);
    setIsGeneratingProof(false);
    setShowStateRoot(false);
    setIsSubmittingToHedera(false);
    setGamePhase('intro');
  };

  return (
    <div className="w-full h-screen flex flex-col relative">
      {/* Info Panel */}
      <CollapsibleLevelCard 
        levelId="zk-rollup" 
        title="Level 9: zkRollup Simulator"
        className="pointer-events-auto"
      >
        <p className="text-gray-300 mb-4 text-sm">
          {gamePhase === 'intro' && "Experience how zkRollups scale blockchain! Watch transactions batch together, compress into a ZK proof, and submit to Hedera with a state root."}
          {gamePhase === 'batching' && "Batching transactions together... This reduces the on-chain footprint!"}
          {gamePhase === 'proving' && "Generating zero-knowledge proof for the batch... The circuit compresses all transactions into a single proof!"}
          {gamePhase === 'submitting' && "Submitting proof and state root to Hedera network... Only this proof needs to go on-chain!"}
          {gamePhase === 'success' && "✅ zkRollup complete! We processed 5 transactions but only submitted 1 proof to Hedera. That's 5x scaling!"}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-white sm:grid-cols-4">
          <div className="bg-blue-900/30 p-2 rounded">
            <div className="text-gray-400 text-[11px] uppercase tracking-wide">Queue</div>
            <div className="text-xl font-bold">{transactions.length}</div>
          </div>
          <div className="bg-purple-900/30 p-2 rounded">
            <div className="text-gray-400 text-[11px] uppercase tracking-wide">Batched</div>
            <div className="text-xl font-bold">{batchSize}</div>
          </div>
          <div className="bg-green-900/30 p-2 rounded">
            <div className="text-gray-400 text-[11px] uppercase tracking-wide">Proof</div>
            <div className="text-xl font-bold">
              {isGeneratingProof ? '...' : showStateRoot ? '✓' : '-'}
            </div>
          </div>
          <div className="bg-yellow-900/30 p-2 rounded">
            <div className="text-gray-400 text-[11px] uppercase tracking-wide">Hedera</div>
            <div className="text-xl font-bold">
              {gamePhase === 'success' ? '✓' : isSubmittingToHedera ? '...' : '-'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {gamePhase === 'intro' && (
            <Button onClick={startRollup} className="bg-purple-600 hover:bg-purple-700 flex-1">
              Start zkRollup
            </Button>
          )}
          {gamePhase === 'success' && (
            <>
              <Button onClick={resetLevel} className="bg-purple-600 hover:bg-purple-700 flex-1">
                Run Again
              </Button>
              <Button onClick={() => window.history.back()} className="bg-gray-600 hover:bg-gray-700 flex-1">
                Back to Map
              </Button>
            </>
          )}
        </div>
      </CollapsibleLevelCard>

      {/* 3D Canvas */}
      <div className="flex-1">
        <Canvas shadows camera={{ position: [0, 8, 15], fov: 50 }}>
          <Scene 
            transactions={transactions}
            processingIndex={processingIndex}
            isBatching={isBatching}
            batchSize={batchSize}
            isGeneratingProof={isGeneratingProof}
            showStateRoot={showStateRoot}
            isSubmittingToHedera={isSubmittingToHedera}
          />
        </Canvas>
      </div>
    </div>
  );
}
