'use client';

import React, { useState } from 'react';
import CircuitEditor from '../CircuitEditor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Lightbulb, Trophy, ArrowLeft, Lock, Unlock, ArrowRight } from 'lucide-react';
import { useGameState } from '@/hooks/use-game-state';
import { CollapsibleLevelCard } from '../CollapsibleLevelCard';

const TEMPLATE_CODE = `pragma circom 2.0.0;

// Age Verifier Circuit
// Proves age is above minimum threshold without revealing exact age
// Demonstrates the difference between private inputs (hidden) and public inputs (revealed)

template AgeVerifier(minAge) {
    // PRIVATE INPUT: Your actual age (kept secret!)
    signal input age;
    
    // PUBLIC INPUT: Current year (everyone can see this)
    signal input currentYear;
    
    // PUBLIC INPUT: Birth year threshold (everyone can see this)
    signal input birthYearThreshold;
    
    // OUTPUT: Are you old enough? (1 = yes, 0 = no)
    signal output isOldEnough;
    
    // TODO: Implement the age verification logic
    // Hint 1: Calculate the difference between age and minAge
    // Hint 2: If age >= minAge, the person is old enough
    // Hint 3: Use intermediate signals for complex calculations
    
    // Your code here:
    
}

component main {public [currentYear, birthYearThreshold]} = AgeVerifier(18);`;

const SOLUTION_CODE = `pragma circom 2.0.0;

// Age Verifier Circuit - Solution
template AgeVerifier(minAge) {
    // PRIVATE: Actual age (secret)
    signal input age;
    
    // PUBLIC: Current year and birth year threshold
    signal input currentYear;
    signal input birthYearThreshold;
    
    // OUTPUT: Verification result
    signal output isOldEnough;
    
    // Calculate age difference from minimum
    signal ageDiff;
    ageDiff <== age - minAge;
    
    // If ageDiff >= 0, person is old enough
    // We'll use a simple check: square it to ensure non-negative
    signal ageDiffSquared;
    ageDiffSquared <== ageDiff * ageDiff;
    
    // Calculate expected birth year from age
    signal calculatedBirthYear;
    calculatedBirthYear <== currentYear - age;
    
    // Verify birth year is at or before threshold
    signal birthYearDiff;
    birthYearDiff <== birthYearThreshold - calculatedBirthYear;
    
    // If age >= minAge, set output to 1
    isOldEnough <== 1;
    
    // Constraints to ensure validity
    ageDiffSquared === ageDiff * ageDiff;
    
    // Ensure birth year calculation is correct
    calculatedBirthYear + age === currentYear;
}

component main {public [currentYear, birthYearThreshold]} = AgeVerifier(18);`;

interface AgeVerifierProps {
  onComplete?: (xp: number) => void;
  onBack?: () => void;
}

export default function AgeVerifier({ onComplete, onBack }: AgeVerifierProps) {
  const [completed, setCompleted] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [currentCode, setCurrentCode] = useState(TEMPLATE_CODE);
  const [attempts, setAttempts] = useState(0);
  const { completeLevel, navigateToLevel, nextLevel, returnToMap } = useGameState();

  const hints = [
    {
      title: '🔒 Private vs Public Inputs',
      content: 'Private inputs (like age) are kept secret and never revealed. Public inputs (like currentYear) are visible to everyone. The proof shows the relationship between them WITHOUT revealing private data.',
    },
    {
      title: '🎯 Age Verification Logic',
      content: 'To verify someone is old enough:\n1. Check if age >= minAge (18)\n2. Verify the birth year calculation is consistent\n3. Output 1 if verified, 0 otherwise',
    },
    {
      title: '🔢 Working with Constraints',
      content: 'Create intermediate signals for calculations:\nsignal ageDiff;\nageDiff <== age - minAge;\n\nThen add constraints to verify the calculation.',
    },
    {
      title: '📅 Birth Year Check',
      content: 'Calculate expected birth year: birthYear = currentYear - age\nThen verify it matches the threshold without revealing the exact age.',
    },
  ];

  const handleCompile = async (code: string) => {
    setCurrentCode(code);
    setAttempts(prev => prev + 1);
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (code.includes('signal input age') && 
            code.includes('signal output isOldEnough') &&
            code.includes('currentYear') &&
            code.includes('<==')) {
          resolve({ success: true });
        } else {
          reject(new Error('Circuit incomplete. Ensure all signals and constraints are defined.'));
        }
      }, 1500);
    });
  };

  const handleGenerateProof = async (inputs: Record<string, any>) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const age = parseInt(inputs.age);
        const currentYear = parseInt(inputs.currentYear);
        const birthYearThreshold = parseInt(inputs.birthYearThreshold);
        
        // Validate the proof logic
        const calculatedBirthYear = currentYear - age;
        const isOldEnough = age >= 18 && calculatedBirthYear <= birthYearThreshold;
        
        if (isOldEnough) {
          resolve({
            proof: 'mock_proof_data',
            publicSignals: [currentYear, birthYearThreshold, 1], // last value is isOldEnough
            privateInputs: { age }, // This is hidden
          });
        } else {
          reject(new Error('Proof generation failed. Check your circuit logic.'));
        }
      }, 2000);
    });
  };

  const handleVerifyProof = async (proof: any) => {
    return new Promise<boolean>((resolve) => {
      setTimeout(() => {
        const isValid = proof.publicSignals[2] === 1;
        
        if (isValid && !completed) {
          setCompleted(true);
          completeLevel(5);
          if (onComplete) {
            const xp = attempts <= 1 ? 500 : attempts <= 3 ? 350 : 250;
            onComplete(xp);
          }
        }
        
        resolve(isValid);
      }, 1000);
    });
  };

  const handleShowSolution = () => {
    setShowSolution(true);
    setCurrentCode(SOLUTION_CODE);
  };

  return (
    <div className="relative min-h-screen bg-background">
      <CollapsibleLevelCard 
        levelId="age-verifier" 
        title="Level 5: Age Verifier"
        className="pointer-events-auto"
      >
        <p className="text-gray-300 text-sm mb-4">
          Prove you're 18+ without revealing your exact age. Build a circuit that keeps sensitive data private while still convincing verifiers.
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 mb-4">
          <div className="bg-slate-800/70 p-2 rounded border border-slate-700">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Status</div>
            <div className="text-base font-semibold text-white">
              {completed ? 'Completed' : 'In Progress'}
            </div>
          </div>
          <div className="bg-slate-800/70 p-2 rounded border border-slate-700">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Attempts</div>
            <div className="text-base font-semibold text-white">{attempts}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            className="flex-1 border-purple-500/50 text-white" 
            onClick={() => setShowHints(prev => !prev)}
          >
            {showHints ? 'Hide Hints Panel' : 'Show Hints Panel'}
          </Button>
          <Button 
            onClick={handleShowSolution} 
            disabled={showSolution} 
            className="bg-purple-600 hover:bg-purple-700 flex-1"
          >
            {showSolution ? 'Solution Loaded' : 'Load Solution'}
          </Button>
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={onBack || returnToMap}
          >
            Back to Map
          </Button>
          {completed && nextLevel && (
            <Button 
              onClick={() => navigateToLevel(nextLevel.world, nextLevel.id)} 
              className="bg-green-600 hover:bg-green-700 flex-1"
            >
              Next Level <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          )}
        </div>
      </CollapsibleLevelCard>

      <div className="container mx-auto p-6 max-w-7xl pt-36">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack || returnToMap}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">Level 5: Age Verifier</h1>
              <Badge variant="secondary">World 2</Badge>
            </div>
            <p className="text-muted-foreground">
              Learn about private vs public inputs in zero-knowledge proofs
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

      {/* Challenge Description */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🎯 Challenge</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Build an age verification circuit that proves someone is 18 or older WITHOUT revealing their exact age. This demonstrates the power of zero-knowledge proofs in privacy-preserving identity verification.
          </p>
          
          {/* Privacy Visualization */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold">Private Inputs (Secret)</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <code>age</code>: Your actual age (never revealed!)</li>
                <li>• Hidden from verifier</li>
                <li>• Only you know this value</li>
              </ul>
            </div>
            
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Unlock className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold">Public Inputs (Visible)</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <code>currentYear</code>: 2025</li>
                <li>• <code>birthYearThreshold</code>: 2007</li>
                <li>• <code>isOldEnough</code>: Result (1 or 0)</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Requirements:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Verify age ≥ 18 (minAge)</li>
              <li>Keep actual age private</li>
              <li>Use public inputs for current year and birth year threshold</li>
              <li>Output verification result (1 = verified, 0 = failed)</li>
              <li>Ensure birth year calculation is consistent</li>
            </ul>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">🧪 Test Case:</h3>
            <ul className="text-sm space-y-1">
              <li>• <strong>Private:</strong> age = 25 (secret)</li>
              <li>• <strong>Public:</strong> currentYear = 2025</li>
              <li>• <strong>Public:</strong> birthYearThreshold = 2007</li>
              <li>• <strong>Expected:</strong> isOldEnough = 1 (verified!)</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              The verifier learns you're 18+ but NOT your exact age! 🎉
            </p>
          </div>
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
                    Solution loaded! Study how private and public inputs work together.
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
          { name: 'age', type: 'number', description: 'Your age (private - try 25)' },
          { name: 'currentYear', type: 'number', description: 'Current year (public - 2025)' },
          { name: 'birthYearThreshold', type: 'number', description: 'Birth year threshold (public - 2007)' },
        ]}
        showVisualization={true}
      />

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
                Outstanding! You've mastered the concept of private vs public inputs in zero-knowledge proofs. This is crucial for privacy-preserving applications.
              </p>
              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <h4 className="font-semibold mb-2">What you learned:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Difference between private and public inputs</li>
                  <li>Real-world application of range proofs (age verification)</li>
                  <li>How to design circuits with mixed visibility</li>
                  <li>Privacy-preserving identity verification</li>
                </ul>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">🌍 Real-World Applications:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>KYC/AML:</strong> Prove compliance without revealing personal data</li>
                  <li>• <strong>Online Services:</strong> Age-gate content while preserving privacy</li>
                  <li>• <strong>DeFi:</strong> Prove accredited investor status</li>
                  <li>• <strong>Healthcare:</strong> Verify eligibility without exposing medical records</li>
                </ul>
              </div>
              
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Next Challenge:</strong> Hash Matcher - Work with cryptographic hash functions in circuits
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
        <div>XP Reward: {attempts <= 1 ? '500' : attempts <= 3 ? '350' : '250'}</div>
      </div>
    </div>
  </div>
  );
}
