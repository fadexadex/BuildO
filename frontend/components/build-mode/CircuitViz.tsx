'use client';

import React, { useRef, useState, Suspense, Component, ErrorInfo, ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Sphere, Text, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { CircuitNode, CircuitEdge } from '@/lib/circuit-parser';
import { Loader2, AlertTriangle } from 'lucide-react';

interface CircuitVisualizationProps {
  nodes: CircuitNode[];
  edges: CircuitEdge[];
  isAnimating?: boolean;
  selectedNode?: string | null;
  onNodeClick?: (nodeId: string) => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// Error Boundary for Canvas
class CanvasErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Canvas Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-300">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
          <p className="text-sm">Failed to render visualization</p>
          <p className="text-xs text-slate-500 mt-2">Check console for details</p>
        </div>
      );
    }

    return this.props.children;
  }
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
    if (node.status === 'error') return '#ef4444'; // Red for error
    if (node.status === 'success') return '#22c55e'; // Green for success
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

  const getEmissiveIntensity = () => {
      if (node.status === 'error') return 0.8;
      if (node.status === 'success') return 0.5;
      return 0.2;
  };

  return (
    <group position={node.position}>
      <Sphere
        ref={meshRef}
        args={[0.3, 32, 32]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial color={getColor()} emissive={getColor()} emissiveIntensity={getEmissiveIntensity()} />
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
          <div className="bg-black/80 text-white px-2 py-1 rounded text-xs pointer-events-none whitespace-nowrap border border-slate-700">
            {node.value}
          </div>
        </Html>
      )}
    </group>
  );
}

// 3D Circuit Edge Component with animated data flow
function CircuitEdgeLine({ edge, nodes }: { 
  edge: CircuitEdge;
  nodes: CircuitNode[];
}) {
  const { from, to, active, status } = edge;
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

  const getColor = () => {
      if (status === 'error') return '#ef4444';
      if (active) return '#10b981';
      return '#4b5563';
  };

  return (
    <>
      <Line
        points={[fromNode.position, toNode.position]}
        color={getColor()}
        lineWidth={active || status === 'error' ? 3 : 1}
        transparent
        opacity={0.6}
      />
      {active && (
        <Sphere ref={particleRef} args={[0.1, 16, 16]}>
          <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.8} />
        </Sphere>
      )}
    </>
  );
}

// Main 3D Circuit Visualization
function CircuitVisualization3D({ nodes, edges, isAnimating = false, selectedNode, onNodeClick = () => {} }: CircuitVisualizationProps) {
  // Ensure nodes and edges are always arrays
  const safeNodes = nodes || [];
  const safeEdges = edges || [];

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      
      {safeEdges.map((edge, idx) => (
        <CircuitEdgeLine
          key={`edge-${idx}`}
          edge={edge}
          nodes={safeNodes}
        />
      ))}
      
      {safeNodes.map((node) => (
        <CircuitNodeMesh
          key={node.id}
          node={node}
          selected={selectedNode === node.id}
          onClick={() => onNodeClick(node.id)}
          isAnimating={isAnimating}
        />
      ))}
      
      <OrbitControls makeDefault enablePan={true} enableZoom={true} enableRotate={true} />
      <gridHelper args={[100, 100, 0x444444, 0x222222]} position={[0, -5, 0]} />
    </>
  );
}

function CanvasLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-950">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
    </div>
  );
}

export function CircuitViz(props: CircuitVisualizationProps) {
  return (
    <CanvasErrorBoundary>
      <div className="w-full h-full bg-slate-950 relative overflow-hidden">
        <Canvas 
          camera={{ position: [0, 0, 10], fov: 50 }}
          gl={{ preserveDrawingBuffer: true }}
          onCreated={(state) => {
            state.gl.setClearColor('#020617');
          }}
        >
          <Suspense fallback={null}>
            <CircuitVisualization3D {...props} />
          </Suspense>
        </Canvas>
        <div className="absolute bottom-4 left-4 text-xs text-slate-400 bg-slate-900/80 p-2 rounded border border-slate-800 pointer-events-none">
           <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Input</div>
           <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Gate</div>
           <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Output</div>
           <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span> Error</div>
        </div>
      </div>
    </CanvasErrorBoundary>
  );
}
