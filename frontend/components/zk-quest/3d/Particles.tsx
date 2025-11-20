"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParticleSystemProps {
  count?: number;
  color?: string;
  size?: number;
  spread?: number;
  speed?: number;
  type?: "confetti" | "sparkles" | "explosion" | "rain";
}

export function ParticleSystem({
  count = 1000,
  color = "#06b6d4",
  size = 0.05,
  spread = 10,
  speed = 1,
  type = "sparkles",
}: ParticleSystemProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);

  const { positions, velocities, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colorObj = new THREE.Color(color);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      if (type === "confetti") {
        // Start from center, spread out
        positions[i3] = (Math.random() - 0.5) * 2;
        positions[i3 + 1] = Math.random() * 5;
        positions[i3 + 2] = (Math.random() - 0.5) * 2;

        velocities[i3] = (Math.random() - 0.5) * 0.1;
        velocities[i3 + 1] = Math.random() * 0.2;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;

        // Random colors for confetti
        const randomColor = new THREE.Color().setHSL(
          Math.random(),
          0.7,
          0.6
        );
        colors[i3] = randomColor.r;
        colors[i3 + 1] = randomColor.g;
        colors[i3 + 2] = randomColor.b;
      } else if (type === "explosion") {
        // Start from center, explode outward
        positions[i3] = 0;
        positions[i3 + 1] = 0;
        positions[i3 + 2] = 0;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const explosionSpeed = 0.1 + Math.random() * 0.2;

        velocities[i3] = Math.sin(phi) * Math.cos(theta) * explosionSpeed;
        velocities[i3 + 1] = Math.cos(phi) * explosionSpeed;
        velocities[i3 + 2] = Math.sin(phi) * Math.sin(theta) * explosionSpeed;

        colors[i3] = colorObj.r;
        colors[i3 + 1] = colorObj.g;
        colors[i3 + 2] = colorObj.b;
      } else if (type === "rain") {
        // Rain falling from top
        positions[i3] = (Math.random() - 0.5) * spread;
        positions[i3 + 1] = Math.random() * 10;
        positions[i3 + 2] = (Math.random() - 0.5) * spread;

        velocities[i3] = 0;
        velocities[i3 + 1] = -0.1;
        velocities[i3 + 2] = 0;

        colors[i3] = colorObj.r;
        colors[i3 + 1] = colorObj.g;
        colors[i3 + 2] = colorObj.b;
      } else {
        // Sparkles - random positions
        positions[i3] = (Math.random() - 0.5) * spread;
        positions[i3 + 1] = (Math.random() - 0.5) * spread;
        positions[i3 + 2] = (Math.random() - 0.5) * spread;

        velocities[i3] = 0;
        velocities[i3 + 1] = 0;
        velocities[i3 + 2] = 0;

        colors[i3] = colorObj.r;
        colors[i3 + 1] = colorObj.g;
        colors[i3 + 2] = colorObj.b;
      }
    }

    return { positions, velocities, colors };
  }, [count, color, spread, type]);

  velocitiesRef.current = velocities;

  useFrame((state, delta) => {
    if (!particlesRef.current || !velocitiesRef.current) return;

    const positions = particlesRef.current.geometry.attributes.position
      .array as Float32Array;
    const velocities = velocitiesRef.current;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      if (type === "confetti" || type === "explosion") {
        // Update positions based on velocity
        positions[i3] += velocities[i3] * speed;
        positions[i3 + 1] += velocities[i3 + 1] * speed;
        positions[i3 + 2] += velocities[i3 + 2] * speed;

        // Add gravity to confetti
        velocities[i3 + 1] -= 0.002;

        // Reset if too far
        if (Math.abs(positions[i3]) > spread ||
            positions[i3 + 1] < -5 ||
            Math.abs(positions[i3 + 2]) > spread) {
          positions[i3] = (Math.random() - 0.5) * 2;
          positions[i3 + 1] = Math.random() * 5;
          positions[i3 + 2] = (Math.random() - 0.5) * 2;
          
          velocities[i3] = (Math.random() - 0.5) * 0.1;
          velocities[i3 + 1] = Math.random() * 0.2;
          velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;
        }
      } else if (type === "rain") {
        positions[i3 + 1] += velocities[i3 + 1] * speed;

        // Reset if below ground
        if (positions[i3 + 1] < 0) {
          positions[i3 + 1] = 10;
        }
      } else if (type === "sparkles") {
        // Sparkles slowly float
        const time = state.clock.getElapsedTime();
        positions[i3 + 1] = Math.sin(time + i) * 0.5 + positions[i3 + 1];
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

interface CelebrationEffectProps {
  duration?: number;
  onComplete?: () => void;
}

export function CelebrationEffect({
  duration = 5000,
  onComplete,
}: CelebrationEffectProps) {
  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime() * 1000;
    if (elapsed > duration && onComplete) {
      onComplete();
    }
  });

  return (
    <group>
      {/* Confetti */}
      <ParticleSystem type="confetti" count={500} spread={8} speed={1.5} />
      
      {/* Sparkles */}
      <ParticleSystem type="sparkles" count={200} color="#fbbf24" size={0.1} />
      
      {/* Explosion */}
      <ParticleSystem
        type="explosion"
        count={100}
        color="#22c55e"
        size={0.15}
        speed={2}
      />
    </group>
  );
}
