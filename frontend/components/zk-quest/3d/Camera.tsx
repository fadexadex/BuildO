"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useSpring, animated, config } from "@react-spring/three";

interface CameraTransitionProps {
  targetPosition: [number, number, number];
  targetLookAt?: [number, number, number];
  duration?: number;
  onComplete?: () => void;
  enabled?: boolean;
}

export function CameraTransition({
  targetPosition,
  targetLookAt = [0, 0, 0],
  duration = 2000,
  onComplete,
  enabled = true,
}: CameraTransitionProps) {
  const { camera } = useThree();
  const startPosition = useRef(new THREE.Vector3());
  const startLookAt = useRef(new THREE.Vector3());
  const hasTransitioned = useRef(false);

  useEffect(() => {
    if (enabled && !hasTransitioned.current) {
      startPosition.current.copy(camera.position);
      
      // Get current look-at direction
      const lookAtDirection = new THREE.Vector3();
      camera.getWorldDirection(lookAtDirection);
      startLookAt.current.copy(lookAtDirection);
    }
  }, [enabled, camera]);

  useFrame((state) => {
    if (!enabled || hasTransitioned.current) return;

    const elapsed = state.clock.getElapsedTime() * 1000;
    const progress = Math.min(elapsed / duration, 1);

    // Ease function (easeInOutCubic)
    const ease =
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    // Interpolate position
    camera.position.lerpVectors(
      startPosition.current,
      new THREE.Vector3(...targetPosition),
      ease
    );

    // Interpolate look-at
    const currentLookAt = new THREE.Vector3().lerpVectors(
      startLookAt.current,
      new THREE.Vector3(...targetLookAt),
      ease
    );
    camera.lookAt(currentLookAt);

    // Complete
    if (progress >= 1) {
      hasTransitioned.current = true;
      if (onComplete) {
        onComplete();
      }
    }
  });

  return null;
}

interface LevelTransitionProps {
  from: "world-map" | "level";
  to: "world-map" | "level";
  levelPosition?: [number, number, number];
  duration?: number;
  onComplete?: () => void;
}

export function LevelTransition({
  from,
  to,
  levelPosition = [0, 0, 5],
  duration = 1500,
  onComplete,
}: LevelTransitionProps) {
  const positions = {
    "world-map": [0, 0, 10] as [number, number, number],
    level: levelPosition,
  };

  return (
    <CameraTransition
      targetPosition={positions[to]}
      duration={duration}
      onComplete={onComplete}
      enabled
    />
  );
}

interface AnimatedCameraProps {
  position?: [number, number, number];
  lookAt?: [number, number, number];
  fov?: number;
  animationConfig?: typeof config.default;
}

export function AnimatedCamera({
  position = [0, 0, 10],
  lookAt = [0, 0, 0],
  fov = 75,
  animationConfig = config.default,
}: AnimatedCameraProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  const { pos } = useSpring({
    pos: position,
    config: animationConfig,
  });

  useFrame(() => {
    if (cameraRef.current) {
      cameraRef.current.lookAt(...lookAt);
    }
  });

  return (
    <PerspectiveCamera
      ref={cameraRef as any}
      position={position}
      fov={fov}
      makeDefault
    />
  );
}

interface CameraShakeProps {
  intensity?: number;
  duration?: number;
  enabled?: boolean;
}

export function CameraShake({
  intensity = 0.1,
  duration = 500,
  enabled = false,
}: CameraShakeProps) {
  const { camera } = useThree();
  const originalPosition = useRef(new THREE.Vector3());
  const startTime = useRef<number | null>(null);

  useFrame((state) => {
    if (!enabled) return;

    if (startTime.current === null) {
      startTime.current = state.clock.getElapsedTime() * 1000;
      originalPosition.current.copy(camera.position);
    }

    const elapsed = state.clock.getElapsedTime() * 1000 - startTime.current;
    const progress = Math.min(elapsed / duration, 1);

    if (progress < 1) {
      const shake = intensity * (1 - progress);
      camera.position.x =
        originalPosition.current.x + (Math.random() - 0.5) * shake;
      camera.position.y =
        originalPosition.current.y + (Math.random() - 0.5) * shake;
      camera.position.z =
        originalPosition.current.z + (Math.random() - 0.5) * shake;
    } else {
      camera.position.copy(originalPosition.current);
      startTime.current = null;
    }
  });

  return null;
}

interface CameraOrbitProps {
  target?: [number, number, number];
  radius?: number;
  speed?: number;
  height?: number;
  enabled?: boolean;
}

export function CameraOrbit({
  target = [0, 0, 0],
  radius = 10,
  speed = 0.5,
  height = 5,
  enabled = true,
}: CameraOrbitProps) {
  const { camera } = useThree();

  useFrame((state) => {
    if (!enabled) return;

    const time = state.clock.getElapsedTime() * speed;
    camera.position.x = target[0] + Math.cos(time) * radius;
    camera.position.z = target[2] + Math.sin(time) * radius;
    camera.position.y = height;
    camera.lookAt(...target);
  });

  return null;
}
