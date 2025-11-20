'use client';

import React, { useState } from 'react';
import CircuitEditor from '../CircuitEditor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Lightbulb, Trophy, ArrowLeft, Hash, Send, ArrowRight } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Sphere } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameState } from '@/hooks/use-game-state';

// 3D Hash Visualization Component
function HashVisualization({ isHashing, verified }: { isHashing: boolean; verified: boolean | null }) {
  const particlesRef = useRef<THREE.Group>(null);
  const [particles] = useState(() => {
    return Array.from({ length: 50 }, () => ({
      position: [
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
      ] as [number, number, number],
      velocity: [(Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02],
    }));
  });

  useFrame(() => {
    if (particlesRef.current && isHashing) {
      particlesRef.current.rotation.y += 0.005;
      particlesRef.current.rotation.x += 0.002;
    }
  });

  const getColor = () => {
    if (verified === true) return '#10b981'; // green
    if (verified === false) return '#ef4444'; // red
    if (isHashing) return '#3b82f6'; // blue
    return '#8b5cf6'; // purple
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      
      <group ref={particlesRef}>
        {particles.map((particle, idx) => (
          <Sphere key={idx} args={[0.1, 16, 16]} position={particle.position}>
            <meshStandardMaterial
              color={getColor()}
              emissive={getColor()}
              emissiveIntensity={isHashing ? 0.8 : 0.3}
            />
          </Sphere>
        ))}
      </group>
      
      {/* Central hash sphere */}
      <Sphere args={[1, 32, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial
          color={getColor()}
          emissive={getColor()}
          emissiveIntensity={0.5}
          wireframe={!isHashing}
        />
      </Sphere>
      
      <Text
        position={[0, -2, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {verified === true ? '✓ Hash Matched!' : verified === false ? '✗ Hash Mismatch' : isHashing ? 'Hashing...' : 'Ready'}
      </Text>
      
      <OrbitControls enableZoom={true} enablePan={false} />
    </>
  );
}

const TEMPLATE_CODE = `pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";

// Hash Matcher Circuit
// Proves knowledge of a preimage (secret) that hashes to a specific hash value
// Uses Poseidon hash function (ZK-friendly)

template HashMatcher() {
    // PRIVATE INPUT: The secret value (preimage)
    signal input secret;
    
    // PUBLIC INPUT: The expected hash value
    signal input expectedHash;
    
    // OUTPUT: Does the hash match?
    signal output isMatch;
    
    // TODO: Implement hash matching logic
    // 1. Compute the hash of the secret using Poseidon
    // 2. Compare it with expectedHash
    // 3. Set isMatch to 1 if they match, 0 otherwise
    
    // Hint: Use Poseidon(1) for single input hashing
    // component hasher = Poseidon(1);
    
}

component main {public [expectedHash]} = HashMatcher();`;

const SOLUTION_CODE = `pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";

// Hash Matcher Circuit - Solution
template HashMatcher() {
    // PRIVATE: The secret value
    signal input secret;
    
    // PUBLIC: Expected hash
    signal input expectedHash;
    
    // OUTPUT: Match result
    signal output isMatch;
    
    // Instantiate Poseidon hasher for 1 input
    component hasher = Poseidon(1);
    
    // Feed the secret to the hasher
    hasher.inputs[0] <== secret;
    
    // Get the computed hash
    signal computedHash;
    computedHash <== hasher.out;
    
    // Compare hashes
    signal hashDiff;
    hashDiff <== computedHash - expectedHash;
    
    // If difference is 0, hashes match
    // We use inverse to check for zero
    signal isZero;
    isZero <== hashDiff * hashDiff;
    
    // Set output: 1 if match, 0 otherwise
    isMatch <== 1 - isZero;
    
    // Constraint: if isMatch is 1, hashDiff must be 0
    hashDiff * isMatch === 0;
}

component main {public [expectedHash]} = HashMatcher();`;

interface HashMatcherProps {
  onComplete?: (xp: number) => void;
  onBack?: () => void;
}

export default function HashMatcher({ onComplete, onBack }: HashMatcherProps) {
  const [completed, setCompleted] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [currentCode, setCurrentCode] = useState(TEMPLATE_CODE);
  const [attempts, setAttempts] = useState(0);
  const [isHashing, setIsHashing] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [readyToSubmit, setReadyToSubmit] = useState(false);
  const { completeLevel, navigateToLevel, nextLevel, returnToMap } = useGameState();

  const hints = [
    {
      title: '🔐 Hash Functions in ZK',
      content: 'Hash functions are one-way: easy to compute, hard to reverse. In ZK circuits, we use "ZK-friendly" hash functions like Poseidon that are efficient in constraint systems.',
    },
    {
      title: '🎯 Preimage Proof',
      content: 'A preimage proof shows you know a value (secret) that hashes to a specific hash, WITHOUT revealing the secret itself. This is fundamental to many ZK applications.',
    },
    {
      title: '📚 Using circomlib',
      content: 'circomlib provides pre-built circuits including Poseidon:\n\ncomponent hasher = Poseidon(1);\nhasher.inputs[0] <== secret;\nsignal hash <== hasher.out;',
    },
    {
      title: '⚖️ Comparing Values',
      content: 'To check if two values are equal in a circuit:\n1. Compute difference: diff = a - b\n2. If diff = 0, they match\n3. Use constraints to enforce this relationship',
    },
  ];

  const handleCompile = async (code: string) => {
    setCurrentCode(code);
    setAttempts(prev => prev + 1);
    setIsHashing(true);
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        setIsHashing(false);
        if (code.includes('signal input secret') && 
            code.includes('signal input expectedHash') &&
            code.includes('signal output isMatch') &&
            code.includes('Poseidon')) {
          setReadyToSubmit(true);
          resolve({ success: true });
        } else {
          reject(new Error('Circuit incomplete. Make sure to use Poseidon hash and define all signals.'));
        }
      }, 2000);
    });
  };

  const handleGenerateProof = async (inputs: Record<string, any>) => {
    setIsHashing(true);
    setVerified(null);
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        setIsHashing(false);
        
        // Simulate Poseidon hash computation
        // In reality, this would be done by the circuit
        const secret = parseInt(inputs.secret);
        const expectedHash = parseInt(inputs.expectedHash);
        
        // Mock Poseidon hash (just for demo - real implementation would use actual hash)
        const mockHash = (secret * 31337) % 1000000; // Simple mock
        
        const isMatch = mockHash === expectedHash;
        
        if (isMatch) {
          setVerified(true);
          resolve({
            proof: 'mock_proof_data',
            publicSignals: [expectedHash, 1], // hash and isMatch
            privateInputs: { secret },
          });
        } else {
          setVerified(false);
          reject(new Error(`Hash mismatch! Expected: ${expectedHash}, Got: ${mockHash}`));
        }
      }, 3000);
    });
  };

  const handleVerifyProof = async (proof: any) => {
    return new Promise<boolean>((resolve) => {
      setTimeout(() => {
        const isValid = proof.publicSignals[1] === 1;
        
        if (isValid && !completed) {
          setCompleted(true);
          completeLevel(6);
          if (onComplete) {
            const xp = attempts <= 1 ? 600 : attempts <= 3 ? 450 : 300;
            onComplete(xp);
          }
        }
        
        resolve(isValid);
      }, 1000);
    });
  };

  const handleSubmitToHedera = async () => {
    // Simulate Hedera HCS submission
    setIsHashing(true);
    
    setTimeout(() => {
      setIsHashing(false);
      alert('🎉 Proof submitted to Hedera HCS! Transaction ID: 0.0.12345@1234567890.123456789');
    }, 2000);
  };

  const handleShowSolution = () => {
    setShowSolution(true);
    setCurrentCode(SOLUTION_CODE);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">Level 6: Hash Matcher</h1>
              <Badge variant="secondary">World 2</Badge>
              <Badge variant="outline" className="gap-1">
                <Hash className="w-3 h-3" />
                Cryptography
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Work with cryptographic hash functions in zero-knowledge circuits
            </p>
          </div>
        </div>
        
        {completed && (
          <div className="flex items-center gap-2 text-green-500">
            <Trophy className="w-6 h-6" />
            <span className="font-semibold">Completed!</span>
          </div>
        )}
      </div>

      {/* 3D Hash Visualization */}
      <Card className="p-4 mb-6 h-[300px]">
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <Suspense fallback={null}>
            <HashVisualization isHashing={isHashing} verified={verified} />
          </Suspense>
        </Canvas>
      </Card>

      {/* Challenge Description */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🎯 Challenge</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Build a circuit that proves you know a secret value that hashes to a specific hash, WITHOUT revealing the secret. This is called a "preimage proof" and is fundamental to many ZK applications.
          </p>
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Circuit Requirements:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Use Poseidon hash function from circomlib</li>
              <li>Private input: <code>secret</code> (the preimage)</li>
              <li>Public input: <code>expectedHash</code> (target hash value)</li>
              <li>Output: <code>isMatch</code> (1 if hash matches, 0 otherwise)</li>
              <li>Prove knowledge of preimage without revealing it</li>
            </ul>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">🔒 Private</h3>
              <p className="text-sm text-muted-foreground">
                <strong>secret:</strong> 42<br/>
                This value stays hidden!
              </p>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">🌐 Public</h3>
              <p className="text-sm text-muted-foreground">
                <strong>expectedHash:</strong> 1316154<br/>
                <strong>isMatch:</strong> 1 ✓
              </p>
            </div>
          </div>
          
          <Alert>
            <Hash className="h-4 w-4" />
            <AlertDescription>
              <strong>Poseidon Hash:</strong> A ZK-friendly hash function designed for efficient computation in constraint systems. Much more efficient than SHA-256 in circuits!
            </AlertDescription>
          </Alert>
        </div>
      </Card>

      {/* Hints Card */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Hints & Concepts
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHints(!showHints)}
          >
            {showHints ? 'Hide' : 'Show'} Hints
          </Button>
        </div>
        
        {showHints && (
          <div className="space-y-4">
            {hints.map((hint, idx) => (
              <Alert key={idx}>
                <AlertDescription>
                  <h3 className="font-semibold mb-1">{hint.title}</h3>
                  <p className="text-sm whitespace-pre-line">{hint.content}</p>
                </AlertDescription>
              </Alert>
            ))}
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleShowSolution}
                disabled={showSolution}
              >
                {showSolution ? 'Solution Shown' : 'Show Solution'}
              </Button>
              {showSolution && (
                <Alert className="flex-1">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Solution loaded! Study how Poseidon hash is used in circuits.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Circuit Editor */}
      <CircuitEditor
        key={currentCode}
        initialCode={currentCode}
        onCompile={handleCompile}
        onGenerateProof={handleGenerateProof}
        onVerifyProof={handleVerifyProof}
        templateInputs={[
          { name: 'secret', type: 'number', description: 'Secret value (private - try 42)' },
          { name: 'expectedHash', type: 'number', description: 'Expected hash (public - try 1316154)' },
        ]}
        showVisualization={true}
      />

      {/* Hedera Submission */}
      {completed && readyToSubmit && (
        <Card className="mt-6 p-6 bg-blue-500/10 border-blue-500/20">
          <h3 className="text-lg font-semibold mb-4">📡 Submit to Hedera HCS</h3>
          <p className="text-muted-foreground mb-4">
            Submit your proof to the Hedera Consensus Service for permanent, tamper-proof storage on the blockchain!
          </p>
          <Button onClick={handleSubmitToHedera} className="gap-2">
            <Send className="w-4 h-4" />
            Submit Proof to Hedera
          </Button>
        </Card>
      )}

      {/* Success Message */}
      {completed && (
        <Card className="mt-6 p-6 bg-green-500/10 border-green-500/20">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-500 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-500 mb-2">
                🎉 Level Complete!
              </h3>
              <p className="text-muted-foreground mb-4">
                Excellent! You've mastered hash-based proofs using cryptographic hash functions in ZK circuits. This is a cornerstone of modern cryptography.
              </p>
              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <h4 className="font-semibold mb-2">What you learned:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>How to use circomlib for standard cryptographic operations</li>
                  <li>Poseidon hash function and its ZK-friendly properties</li>
                  <li>Preimage proofs (proving knowledge without revealing)</li>
                  <li>Comparing hash values in constraint systems</li>
                  <li>Submitting proofs to Hedera for permanent storage</li>
                </ul>
              </div>
              
              <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">🌍 Real-World Applications:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Password Verification:</strong> Prove password knowledge without sending it</li>
                  <li>• <strong>Merkle Trees:</strong> Efficient membership proofs in large datasets</li>
                  <li>• <strong>Commitment Schemes:</strong> Commit to values before revealing</li>
                  <li>• <strong>Zero-Knowledge Auth:</strong> Authenticate without sharing credentials</li>
                  <li>• <strong>Blockchain Privacy:</strong> Private transactions and smart contracts</li>
                </ul>
              </div>
              
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>🎓 World 2 Complete!</strong> You've mastered circuit building fundamentals.
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Next World:</strong> Advanced Applications - Build real-world ZK systems (Private Transfers, Voting, zkRollups)
                </p>
                <div className="flex gap-2 mt-2">
                  <Button onClick={onBack || returnToMap} variant="outline">
                    Back to World Map
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
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="mt-6 flex gap-4 text-sm text-muted-foreground">
        <div>Attempts: {attempts}</div>
        <div>•</div>
        <div>XP Reward: {attempts <= 1 ? '600' : attempts <= 3 ? '450' : '300'}</div>
      </div>
    </div>
  );
}
