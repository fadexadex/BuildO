'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, Sphere, Box, Cylinder } from '@react-three/drei';
import { useState, useRef, useEffect } from 'react';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useGameState } from '@/hooks/use-game-state';
import { submitProofToHedera } from '@/lib/hedera-api';
import { ArrowRight } from 'lucide-react';

// Animated components
const AnimatedBox = animated(Box);
const AnimatedSphere = animated(Sphere);

// Particle fog effect for privacy
function PrivacyFog({ position, active }: { position: [number, number, number]; active: boolean }) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 200;
  const [positions] = useState(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 3;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    return pos;
  });

  useFrame(({ clock }) => {
    if (particlesRef.current && active) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += Math.sin(clock.elapsedTime + i) * 0.001;
        positions[i * 3] += Math.cos(clock.elapsedTime + i * 0.5) * 0.001;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      particlesRef.current.rotation.y = clock.elapsedTime * 0.1;
    }
  });

  if (!active) return null;

  return (
    <points ref={particlesRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#9333ea" transparent opacity={0.6} />
    </points>
  );
}

// 3D Wallet component
function Wallet({ 
  position, 
  label, 
  balance, 
  showBalance,
  isHighlighted 
}: { 
  position: [number, number, number]; 
  label: string;
  balance: number;
  showBalance: boolean;
  isHighlighted: boolean;
}) {
  const { scale } = useSpring({
    scale: isHighlighted ? 1.1 : 1,
    config: { tension: 300, friction: 10 }
  });

  return (
    <group position={position}>
      {/* Wallet body */}
      <AnimatedBox args={[2, 1.2, 0.3]} scale={scale}>
        <meshStandardMaterial 
          color={isHighlighted ? "#a855f7" : "#7c3aed"} 
          metalness={0.7} 
          roughness={0.3} 
        />
      </AnimatedBox>
      
      {/* Wallet clasp */}
      <Cylinder args={[0.1, 0.1, 0.4]} position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.2} />
      </Cylinder>

      {/* Label */}
      <Text
        position={[0, 0.8, 0]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>

      {/* Balance display */}
      {showBalance ? (
        <Text
          position={[0, -0.8, 0]}
          fontSize={0.25}
          color="#22c55e"
          anchorX="center"
          anchorY="middle"
        >
          {balance} tokens
        </Text>
      ) : (
        <Text
          position={[0, -0.8, 0]}
          fontSize={0.2}
          color="#9ca3af"
          anchorX="center"
          anchorY="middle"
        >
          ???
        </Text>
      )}

      {/* Privacy fog when balance is hidden */}
      <PrivacyFog position={[0, 0, 0]} active={!showBalance} />
    </group>
  );
}

// 3D Token that flows between wallets
function Token({ 
  startPos, 
  endPos, 
  isAnimating,
  onComplete 
}: { 
  startPos: [number, number, number]; 
  endPos: [number, number, number];
  isAnimating: boolean;
  onComplete: () => void;
}) {
  const tokenRef = useRef<THREE.Group>(null);
  const [progress, setProgress] = useState(0);

  useFrame((state, delta) => {
    if (isAnimating && tokenRef.current) {
      const newProgress = Math.min(progress + delta * 0.5, 1);
      setProgress(newProgress);

      // Interpolate position
      const x = THREE.MathUtils.lerp(startPos[0], endPos[0], newProgress);
      const y = THREE.MathUtils.lerp(startPos[1], endPos[1], newProgress) + Math.sin(newProgress * Math.PI) * 2;
      const z = THREE.MathUtils.lerp(startPos[2], endPos[2], newProgress);

      tokenRef.current.position.set(x, y, z);
      tokenRef.current.rotation.y += delta * 3;

      if (newProgress >= 1) {
        onComplete();
        setProgress(0);
      }
    }
  });

  if (!isAnimating && progress === 0) return null;

  return (
    <group ref={tokenRef} position={startPos}>
      <Sphere args={[0.3, 16, 16]}>
        <meshStandardMaterial color="#fbbf24" metalness={1} roughness={0.1} emissive="#fbbf24" emissiveIntensity={0.5} />
      </Sphere>
      
      {/* Token glow */}
      <Sphere args={[0.4, 16, 16]}>
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.2} />
      </Sphere>
    </group>
  );
}

// ZK Proof Shield visualization
function ProofShield({ position, active }: { position: [number, number, number]; active: boolean }) {
  const shieldRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (shieldRef.current && active) {
      shieldRef.current.rotation.y = clock.elapsedTime * 0.5;
      shieldRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2) * 0.1);
    }
  });

  if (!active) return null;

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group ref={shieldRef} position={position}>
        {/* Shield geometry */}
        <mesh>
          <cylinderGeometry args={[2, 2, 0.1, 6]} />
          <meshStandardMaterial 
            color="#22c55e" 
            metalness={0.8} 
            roughness={0.2} 
            transparent 
            opacity={0.7}
            emissive="#22c55e"
            emissiveIntensity={0.3}
          />
        </mesh>
        
        {/* Shield rim */}
        <mesh>
          <torusGeometry args={[2, 0.05, 16, 32]} />
          <meshStandardMaterial color="#10b981" metalness={1} roughness={0.1} />
        </mesh>

        <Text
          position={[0, 0, 0.1]}
          fontSize={0.3}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          ZK PROOF
        </Text>
      </group>
    </Float>
  );
}

// Main 3D Scene
function Scene({ 
  senderBalance,
  receiverBalance,
  showBalances,
  isTransferring,
  onTransferComplete,
  showProof
}: { 
  senderBalance: number;
  receiverBalance: number;
  showBalances: boolean;
  isTransferring: boolean;
  onTransferComplete: () => void;
  showProof: boolean;
}) {
  return (
    <>
      <OrbitControls enableZoom={true} maxDistance={15} minDistance={5} />
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, 10, -10]} intensity={0.5} />
      <spotLight position={[0, 10, 0]} angle={0.3} intensity={1} castShadow />

      {/* Wallets */}
      <Wallet 
        position={[-4, 0, 0]} 
        label="Sender" 
        balance={senderBalance}
        showBalance={showBalances}
        isHighlighted={isTransferring}
      />
      <Wallet 
        position={[4, 0, 0]} 
        label="Receiver" 
        balance={receiverBalance}
        showBalance={showBalances}
        isHighlighted={isTransferring}
      />

      {/* Token transfer animation */}
      <Token 
        startPos={[-4, 0, 0]}
        endPos={[4, 0, 0]}
        isAnimating={isTransferring}
        onComplete={onTransferComplete}
      />

      {/* ZK Proof Shield */}
      <ProofShield position={[0, 3, 0]} active={showProof} />

      {/* Stage/Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#1e1b4b" />
      </mesh>

      {/* Background particles */}
      <PrivacyFog position={[0, 5, -5]} active={true} />
    </>
  );
}

// Main Component
export default function PrivateTransfer() {
  const [senderBalance, setSenderBalance] = useState(100);
  const [receiverBalance, setReceiverBalance] = useState(50);
  const [transferAmount, setTransferAmount] = useState(10);
  const [showBalances, setShowBalances] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [gamePhase, setGamePhase] = useState<'intro' | 'setup' | 'transfer' | 'verify' | 'success'>('intro');
  const { completeLevel, navigateToLevel, nextLevel, returnToMap } = useGameState();

  const startTransfer = () => {
    if (transferAmount <= 0 || transferAmount > senderBalance) {
      alert('Invalid transfer amount!');
      return;
    }
    setGamePhase('transfer');
    setShowBalances(false);
    setIsTransferring(true);
    setShowProof(true);
  };

  const handleTransferComplete = () => {
    setIsTransferring(false);
    // Update balances
    setSenderBalance(prev => prev - transferAmount);
    setReceiverBalance(prev => prev + transferAmount);
    setGamePhase('verify');
  };

  const verifyTransfer = () => {
    // In a real implementation, this would verify the ZK proof
    setTimeout(() => {
      setShowBalances(true);
      setGamePhase('success');
      setShowProof(false);

      // Complete level and submit to Hedera
      setTimeout(async () => {
        try {
          const proofHash = `0x${Math.random().toString(16).substr(2, 8)}`;
          await submitProofToHedera({
            level: 'private-transfer',
            proofHash,
            metadata: { amount: transferAmount }
          });
          completeLevel(7);
        } catch (error) {
          console.error('Failed to submit proof:', error);
          completeLevel(7);
        }
      }, 1000);
    }, 2000);
  };

  const resetLevel = () => {
    setSenderBalance(100);
    setReceiverBalance(50);
    setTransferAmount(10);
    setShowBalances(true);
    setIsTransferring(false);
    setShowProof(false);
    setGamePhase('intro');
  };

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Info Panel */}
      <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none">
        <Card className="p-4 max-w-3xl mx-auto pointer-events-auto bg-black/80 backdrop-blur-sm border-purple-500/50">
          <h2 className="text-2xl font-bold text-white mb-2">Level 7: Private Token Transfer</h2>
          <p className="text-gray-300 mb-4">
            {gamePhase === 'intro' && "Transfer tokens between wallets without revealing the balance! Use zero-knowledge proofs to verify sufficient funds while keeping balances private."}
            {gamePhase === 'setup' && "Enter the amount to transfer. The ZK proof will verify you have enough balance without revealing the actual amount."}
            {gamePhase === 'transfer' && "Generating zero-knowledge proof and transferring tokens..."}
            {gamePhase === 'verify' && "Verifying the proof... The balances remain hidden!"}
            {gamePhase === 'success' && "✅ Transfer complete! The receiver got the tokens, but both balances stayed private throughout the transaction!"}
          </p>

          {(gamePhase === 'intro' || gamePhase === 'setup') && (
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3">
                <label className="text-white min-w-[120px]">Transfer Amount:</label>
                <Input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(Number(e.target.value))}
                  min={1}
                  max={senderBalance}
                  className="bg-gray-800 border-purple-500/50 text-white"
                />
              </div>
              <div className="text-sm text-gray-400">
                • Sender Balance: {showBalances ? `${senderBalance} tokens` : '???'}
                <br />
                • Receiver Balance: {showBalances ? `${receiverBalance} tokens` : '???'}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {gamePhase === 'intro' && (
              <Button onClick={() => setGamePhase('setup')} className="bg-purple-600 hover:bg-purple-700">
                Start Level
              </Button>
            )}
            {gamePhase === 'setup' && (
              <Button onClick={startTransfer} className="bg-green-600 hover:bg-green-700">
                Transfer with ZK Proof
              </Button>
            )}
            {gamePhase === 'verify' && (
              <Button onClick={verifyTransfer} className="bg-blue-600 hover:bg-blue-700">
                Verify Proof
              </Button>
            )}
            {gamePhase === 'success' && (
              <>
                <Button onClick={resetLevel} className="bg-purple-600 hover:bg-purple-700">
                  Try Again
                </Button>
                <Button onClick={returnToMap} variant="outline" className="bg-gray-600 hover:bg-gray-700">
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
        <Canvas shadows camera={{ position: [0, 2, 10], fov: 50 }}>
          <Scene 
            senderBalance={senderBalance}
            receiverBalance={receiverBalance}
            showBalances={showBalances}
            isTransferring={isTransferring}
            onTransferComplete={handleTransferComplete}
            showProof={showProof}
          />
        </Canvas>
      </div>
    </div>
  );
}
