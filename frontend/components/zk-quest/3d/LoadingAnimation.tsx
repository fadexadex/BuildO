"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Sphere, Ring, Html, Center } from "@react-three/drei";
import * as THREE from "three";

interface LoadingAnimationProps {
  message?: string;
  type?: "proof" | "circuit" | "hedera" | "default";
}

function ProofGenerationLoader() {
  const ringRefs = useRef<THREE.Mesh[]>([]);
  const particlesRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Rotate rings at different speeds
    ringRefs.current.forEach((ring, i) => {
      if (ring) {
        ring.rotation.x = time * (0.5 + i * 0.2);
        ring.rotation.y = time * (0.3 + i * 0.1);
        ring.rotation.z = time * (0.2 + i * 0.15);
      }
    });

    // Animate particles
    if (particlesRef.current) {
      particlesRef.current.rotation.y = time * 0.5;
    }
  });

  // Create particle geometry
  const particleCount = 1000;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }

  return (
    <group>
      {/* Central sphere */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <Sphere args={[0.5, 32, 32]}>
          <meshStandardMaterial
            color="#3b82f6"
            emissive="#3b82f6"
            emissiveIntensity={0.8}
            metalness={0.8}
            roughness={0.2}
          />
        </Sphere>
      </Float>

      {/* Orbiting rings */}
      {[1, 1.5, 2].map((radius, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) ringRefs.current[i] = el;
          }}
        >
          <torusGeometry args={[radius, 0.05, 16, 100]} />
          <meshStandardMaterial
            color="#06b6d4"
            emissive="#06b6d4"
            emissiveIntensity={0.5}
            transparent
            opacity={0.6 - i * 0.1}
          />
        </mesh>
      ))}

      {/* Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color="#06b6d4"
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>

      {/* Central light */}
      <pointLight position={[0, 0, 0]} intensity={2} color="#3b82f6" />
    </group>
  );
}

function CircuitCompileLoader() {
  const nodesRef = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    nodesRef.current.forEach((node, i) => {
      if (node) {
        node.position.y = Math.sin(time * 2 + i) * 0.3;
        node.scale.setScalar(1 + Math.sin(time * 3 + i) * 0.1);
      }
    });
  });

  return (
    <group>
      {/* Circuit nodes */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) nodesRef.current[i] = el;
          }}
          position={[(i - 2) * 1.5, 0, 0]}
        >
          <boxGeometry args={[0.4, 0.4, 0.4]} />
          <meshStandardMaterial
            color="#8b5cf6"
            emissive="#8b5cf6"
            emissiveIntensity={0.8}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      ))}

      {/* Connecting lines */}
      {Array.from({ length: 4 }).map((_, i) => {
        const start = new THREE.Vector3((i - 2) * 1.5, 0, 0);
        const end = new THREE.Vector3((i - 1) * 1.5, 0, 0);
        const points = [start, end];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        return (
          <primitive key={i} object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: "#a78bfa" }))} />
        );
      })}
    </group>
  );
}

function HederaLoader() {
  const cubeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (cubeRef.current) {
      cubeRef.current.rotation.x = time;
      cubeRef.current.rotation.y = time * 0.7;
    }
  });

  return (
    <group>
      <mesh ref={cubeRef}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial
          color="#7f00ff"
          emissive="#7f00ff"
          emissiveIntensity={0.6}
          metalness={0.9}
          roughness={0.1}
          wireframe
        />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={1.5} color="#7f00ff" />
    </group>
  );
}

function DefaultLoader() {
  return (
    <Float speed={3} rotationIntensity={1} floatIntensity={1}>
      <Sphere args={[1, 32, 32]}>
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#06b6d4"
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </Sphere>
    </Float>
  );
}

export function LoadingAnimation({
  message = "Loading...",
  type = "default",
}: LoadingAnimationProps) {
  return (
    <group>
      {/* Animated loader based on type */}
      {type === "proof" && <ProofGenerationLoader />}
      {type === "circuit" && <CircuitCompileLoader />}
      {type === "hedera" && <HederaLoader />}
      {type === "default" && <DefaultLoader />}

      {/* Loading text */}
      <Float speed={1} rotationIntensity={0} floatIntensity={0.5}>
        <group position={[0, -3, 0]}>
          <Html center>
            <div className="text-white text-sm font-medium whitespace-nowrap">
              {message}
            </div>
          </Html>
        </group>
      </Float>

      {/* Ambient lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={0.5} />
    </group>
  );
}
