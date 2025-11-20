'use client';

import React, { useRef, useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Sphere, Text, Html } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, CheckCircle, XCircle, Info } from 'lucide-react';
import * as THREE from 'three';

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface CircuitNode {
  id: string;
  type: 'input' | 'output' | 'gate' | 'constraint';
  label: string;
  position: [number, number, number];
  value?: number;
}

interface CircuitEdge {
  from: string;
  to: string;
  active?: boolean;
}

interface CircuitVisualizationProps {
  nodes: CircuitNode[];
  edges: CircuitEdge[];
  isAnimating: boolean;
  selectedNode: string | null;
  onNodeClick: (nodeId: string) => void;
}

// 3D Circuit Node Component
function CircuitNodeMesh({ node, selected, onClick, isAnimating }: { 
  node: CircuitNode; 
  selected: boolean; 
  onClick: () => void;
  isAnimating: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current && isAnimating) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  const getColor = () => {
    if (selected) return '#10b981'; // green
    if (hovered) return '#3b82f6'; // blue
    switch (node.type) {
      case 'input': return '#8b5cf6'; // purple
      case 'output': return '#ef4444'; // red
      case 'gate': return '#f59e0b'; // orange
      case 'constraint': return '#06b6d4'; // cyan
      default: return '#6b7280'; // gray
    }
  };

  return (
    <group position={node.position}>
      <Sphere
        ref={meshRef}
        args={[0.3, 32, 32]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial color={getColor()} emissive={getColor()} emissiveIntensity={0.2} />
      </Sphere>
      <Text
        position={[0, -0.5, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {node.label}
      </Text>
      {node.value !== undefined && (
        <Html position={[0, 0.5, 0]} center>
          <div className="bg-black/80 text-white px-2 py-1 rounded text-xs">
            {node.value}
          </div>
        </Html>
      )}
    </group>
  );
}

// 3D Circuit Edge Component with animated data flow
function CircuitEdgeLine({ from, to, active, nodes }: { 
  from: string; 
  to: string; 
  active?: boolean;
  nodes: CircuitNode[];
}) {
  const fromNode = nodes.find(n => n.id === from);
  const toNode = nodes.find(n => n.id === to);
  const particleRef = useRef<THREE.Mesh>(null);
  const [t, setT] = useState(0);

  useFrame((state, delta) => {
    if (active && particleRef.current && fromNode && toNode) {
      setT((prev) => (prev + delta * 0.5) % 1);
      
      const x = fromNode.position[0] + (toNode.position[0] - fromNode.position[0]) * t;
      const y = fromNode.position[1] + (toNode.position[1] - fromNode.position[1]) * t;
      const z = fromNode.position[2] + (toNode.position[2] - fromNode.position[2]) * t;
      
      particleRef.current.position.set(x, y, z);
    }
  });

  if (!fromNode || !toNode) return null;

  return (
    <>
      <Line
        points={[fromNode.position, toNode.position]}
        color={active ? '#10b981' : '#4b5563'}
        lineWidth={active ? 3 : 1}
      />
      {active && (
        <Sphere ref={particleRef} args={[0.1, 16, 16]}>
          <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.5} />
        </Sphere>
      )}
    </>
  );
}

// Main 3D Circuit Visualization
function CircuitVisualization3D({ nodes, edges, isAnimating, selectedNode, onNodeClick }: CircuitVisualizationProps) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {edges.map((edge, idx) => (
        <CircuitEdgeLine
          key={`edge-${idx}`}
          from={edge.from}
          to={edge.to}
          active={edge.active}
          nodes={nodes}
        />
      ))}
      
      {nodes.map((node) => (
        <CircuitNodeMesh
          key={node.id}
          node={node}
          selected={selectedNode === node.id}
          onClick={() => onNodeClick(node.id)}
          isAnimating={isAnimating}
        />
      ))}
      
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </>
  );
}

interface CircuitEditorProps {
  initialCode?: string;
  onCompile?: (code: string) => Promise<any>;
  onGenerateProof?: (inputs: Record<string, any>) => Promise<any>;
  onVerifyProof?: (proof: any) => Promise<boolean>;
  templateInputs?: { name: string; type: string; description?: string }[];
  readOnly?: boolean;
  showVisualization?: boolean;
}

export default function CircuitEditor({
  initialCode = '',
  onCompile,
  onGenerateProof,
  onVerifyProof,
  templateInputs = [],
  readOnly = false,
  showVisualization = true,
}: CircuitEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [compiling, setCompiling] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [compiled, setCompiled] = useState(false);
  const [proof, setProof] = useState<any>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [monacoLoaded, setMonacoLoaded] = useState(false);
  
  // 3D Visualization state
  const [nodes, setNodes] = useState<CircuitNode[]>([]);
  const [edges, setEdges] = useState<CircuitEdge[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Register Circom language when Monaco loads
  const handleEditorDidMount = (editor: any, monaco: any) => {
    try {
      setMonacoLoaded(true);
      
      // Register Circom language
      if (!monaco.languages.getLanguages().some((lang: any) => lang.id === 'circom')) {
        import('@/lib/monaco-circom').then(({ registerCircomLanguage }) => {
          registerCircomLanguage(monaco);
        }).catch((error) => {
          console.warn('Failed to load Circom language support:', error);
        });
      }
    } catch (error) {
      console.warn('Monaco Editor initialization warning:', error);
    }
  };

  // Parse circuit code and generate visualization data
  const parseCircuitForVisualization = (circuitCode: string) => {
    const newNodes: CircuitNode[] = [];
    const newEdges: CircuitEdge[] = [];
    
    // Simple parser for demonstration - in production, use proper AST parsing
    const lines = circuitCode.split('\n');
    let nodeIndex = 0;
    
    // Extract signals
    const inputSignals: string[] = [];
    const outputSignals: string[] = [];
    
    lines.forEach(line => {
      const inputMatch = line.match(/signal\s+input\s+(\w+)/);
      const outputMatch = line.match(/signal\s+output\s+(\w+)/);
      
      if (inputMatch) inputSignals.push(inputMatch[1]);
      if (outputMatch) outputSignals.push(outputMatch[1]);
    });
    
    // Create input nodes
    inputSignals.forEach((signal, idx) => {
      newNodes.push({
        id: `input-${signal}`,
        type: 'input',
        label: signal,
        position: [-3, idx * 1.5 - (inputSignals.length * 0.75), 0],
      });
    });
    
    // Create constraint/gate nodes
    lines.forEach((line, idx) => {
      const constraintMatch = line.match(/(\w+)\s*(<==|===)\s*(.+);/);
      if (constraintMatch) {
        const nodeId = `gate-${idx}`;
        newNodes.push({
          id: nodeId,
          type: 'gate',
          label: 'Gate',
          position: [0, idx * 0.5 - 2, 0],
        });
        
        // Create edges from inputs to this gate
        inputSignals.forEach(signal => {
          if (constraintMatch[3].includes(signal)) {
            newEdges.push({
              from: `input-${signal}`,
              to: nodeId,
            });
          }
        });
      }
    });
    
    // Create output nodes
    outputSignals.forEach((signal, idx) => {
      const nodeId = `output-${signal}`;
      newNodes.push({
        id: nodeId,
        type: 'output',
        label: signal,
        position: [3, idx * 1.5 - (outputSignals.length * 0.75), 0],
      });
      
      // Connect gates to outputs
      newNodes.forEach(node => {
        if (node.type === 'gate') {
          newEdges.push({
            from: node.id,
            to: nodeId,
          });
        }
      });
    });
    
    setNodes(newNodes);
    setEdges(newEdges);
  };

  useEffect(() => {
    if (code && showVisualization) {
      parseCircuitForVisualization(code);
    }
  }, [code, showVisualization]);

  const handleCompile = async () => {
    if (!onCompile) return;
    
    setCompiling(true);
    setError(null);
    setCompiled(false);
    
    try {
      await onCompile(code);
      setCompiled(true);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Compilation failed');
    } finally {
      setCompiling(false);
    }
  };

  const handleGenerateProof = async () => {
    if (!onGenerateProof || !compiled) return;
    
    setGenerating(true);
    setError(null);
    setVerified(null);
    
    // Animate data flow through circuit
    setEdges(prev => prev.map(edge => ({ ...edge, active: true })));
    
    try {
      const parsedInputs: Record<string, any> = {};
      Object.entries(inputs).forEach(([key, value]) => {
        parsedInputs[key] = parseInt(value) || value;
      });
      
      const result = await onGenerateProof(parsedInputs);
      setProof(result);
      
      // Update node values
      setNodes(prev => prev.map(node => {
        if (node.type === 'input' && parsedInputs[node.label]) {
          return { ...node, value: parsedInputs[node.label] };
        }
        return node;
      }));
      
      setTimeout(() => {
        setEdges(prev => prev.map(edge => ({ ...edge, active: false })));
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Proof generation failed');
      setEdges(prev => prev.map(edge => ({ ...edge, active: false })));
    } finally {
      setGenerating(false);
    }
  };

  const handleVerifyProof = async () => {
    if (!onVerifyProof || !proof) return;
    
    setVerifying(true);
    setError(null);
    
    try {
      const result = await onVerifyProof(proof);
      setVerified(result);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[800px]">
      {/* Code Editor Panel */}
      <Card className="flex-1 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Circuit Code</h3>
          <div className="flex gap-2">
            {compiled && <CheckCircle className="w-5 h-5 text-green-500" />}
            <Button
              onClick={handleCompile}
              disabled={compiling || readOnly}
              size="sm"
            >
              {compiling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Compiling...
                </>
              ) : (
                'Compile'
              )}
            </Button>
          </div>
        </div>
        
        <div className="flex-1 border rounded-lg overflow-hidden">
          <MonacoEditor
            height="100%"
            language="circom"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || '')}
            onMount={handleEditorDidMount}
            loading={<div className="flex items-center justify-center h-full">Loading editor...</div>}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              readOnly,
              scrollBeyondLastLine: false,
            }}
          />
        </div>

        {/* Inputs Section */}
        {templateInputs.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="font-semibold">Witness Inputs</h4>
            {templateInputs.map((input) => (
              <div key={input.name} className="flex items-center gap-2">
                <Label htmlFor={input.name} className="w-32">
                  {input.name}
                </Label>
                <Input
                  id={input.name}
                  type={input.type}
                  placeholder={input.description || input.name}
                  value={inputs[input.name] || ''}
                  onChange={(e) => setInputs({ ...inputs, [input.name]: e.target.value })}
                  disabled={!compiled}
                />
              </div>
            ))}
            
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleGenerateProof}
                disabled={!compiled || generating}
                className="flex-1"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Proof...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Generate Proof
                  </>
                )}
              </Button>
              
              {proof && (
                <Button
                  onClick={handleVerifyProof}
                  disabled={verifying}
                  variant="outline"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : verified !== null ? (
                    verified ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                        Verified
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2 text-red-500" />
                        Failed
                      </>
                    )
                  ) : (
                    'Verify Proof'
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </Card>

      {/* 3D Visualization Panel */}
      {showVisualization && (
        <Card className="flex-1 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Circuit Visualization</h3>
            <Info className="w-5 h-5 text-muted-foreground" />
          </div>
          
          <div className="flex-1 border rounded-lg overflow-hidden bg-slate-900">
            <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
              <Suspense fallback={null}>
                <CircuitVisualization3D
                  nodes={nodes}
                  edges={edges}
                  isAnimating={isAnimating}
                  selectedNode={selectedNode}
                  onNodeClick={setSelectedNode}
                />
              </Suspense>
            </Canvas>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p><span className="text-purple-400">●</span> Inputs</p>
            <p><span className="text-orange-400">●</span> Gates/Constraints</p>
            <p><span className="text-red-400">●</span> Outputs</p>
            <p className="mt-2 text-xs">Click and drag to rotate • Scroll to zoom</p>
          </div>
        </Card>
      )}
    </div>
  );
}
