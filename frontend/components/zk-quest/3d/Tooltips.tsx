"use client";

import { useState, useRef } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { Html, Float, Text3D, Center, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

interface Tooltip3DProps {
  position: [number, number, number];
  title: string;
  description?: string;
  visible?: boolean;
}

export function Tooltip3D({
  position,
  title,
  description,
  visible = true,
}: Tooltip3DProps) {
  if (!visible) return null;

  return (
    <Float speed={1} rotationIntensity={0} floatIntensity={0.3}>
      <group position={position}>
        {/* Background panel */}
        <RoundedBox args={[2.5, 1, 0.1]} radius={0.05}>
          <meshStandardMaterial
            color="#1e293b"
            transparent
            opacity={0.95}
            emissive="#1e293b"
            emissiveIntensity={0.2}
          />
        </RoundedBox>

        {/* Title text */}
        <Center position={[0, 0.2, 0.06]}>
          <Text3D
            font="/fonts/helvetiker_regular.typeface.json"
            size={0.15}
            height={0.02}
          >
            {title}
            <meshStandardMaterial
              color="#f1f5f9"
              emissive="#f1f5f9"
              emissiveIntensity={0.3}
            />
          </Text3D>
        </Center>

        {/* Description - use HTML for better text rendering */}
        {description && (
          <Html
            position={[0, -0.2, 0.1]}
            center
            distanceFactor={3}
            style={{
              width: "200px",
              fontSize: "10px",
              color: "#cbd5e1",
              textAlign: "center",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {description}
          </Html>
        )}

        {/* Glow effect */}
        <pointLight position={[0, 0, 0.5]} intensity={0.5} color="#3b82f6" />
      </group>
    </Float>
  );
}

interface InteractiveTooltipProps {
  children: React.ReactNode;
  tooltipContent: {
    title: string;
    description?: string;
  };
  tooltipOffset?: [number, number, number];
}

export function InteractiveTooltip({
  children,
  tooltipContent,
  tooltipOffset = [0, 1, 0],
}: InteractiveTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group
      ref={groupRef}
      onPointerEnter={() => setShowTooltip(true)}
      onPointerLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && groupRef.current && (
        <Tooltip3D
          position={[
            groupRef.current.position.x + tooltipOffset[0],
            groupRef.current.position.y + tooltipOffset[1],
            groupRef.current.position.z + tooltipOffset[2],
          ]}
          title={tooltipContent.title}
          description={tooltipContent.description}
        />
      )}
    </group>
  );
}

interface InfoPanelProps {
  position: [number, number, number];
  title: string;
  items: { label: string; value: string | number }[];
  color?: string;
}

export function InfoPanel({
  position,
  title,
  items,
  color = "#3b82f6",
}: InfoPanelProps) {
  return (
    <Float speed={1.5} rotationIntensity={0} floatIntensity={0.5}>
      <group position={position}>
        {/* Panel background */}
        <RoundedBox args={[3, 2 + items.length * 0.3, 0.1]} radius={0.08}>
          <meshStandardMaterial
            color="#0f172a"
            transparent
            opacity={0.9}
            emissive="#0f172a"
            emissiveIntensity={0.3}
          />
        </RoundedBox>

        {/* Title bar */}
        <RoundedBox
          args={[3, 0.4, 0.12]}
          position={[0, 1 + items.length * 0.15, 0.01]}
          radius={0.08}
        >
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
          />
        </RoundedBox>

        {/* Title text */}
        <Center position={[0, 1 + items.length * 0.15, 0.08]}>
          <Text3D
            font="/fonts/helvetiker_regular.typeface.json"
            size={0.15}
            height={0.02}
          >
            {title}
            <meshStandardMaterial color="white" />
          </Text3D>
        </Center>

        {/* Info items */}
        {items.map((item, index) => (
          <Html
            key={index}
            position={[0, 0.5 - index * 0.3, 0.06]}
            center
            distanceFactor={5}
            style={{
              width: "250px",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "#e2e8f0",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            <span style={{ color: "#94a3b8" }}>{item.label}:</span>
            <span style={{ fontWeight: "bold" }}>{item.value}</span>
          </Html>
        ))}

        {/* Border glow */}
        <pointLight position={[0, 0, 0.5]} intensity={0.8} color={color} />
      </group>
    </Float>
  );
}

interface HintArrowProps {
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
  animated?: boolean;
}

export function HintArrow({
  from,
  to,
  color = "#06b6d4",
  animated = true,
}: HintArrowProps) {
  const arrowRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!animated || !arrowRef.current) return;
    
    const time = state.clock.getElapsedTime();
    arrowRef.current.position.y = Math.sin(time * 2) * 0.2;
  });

  const direction = new THREE.Vector3(...to).sub(new THREE.Vector3(...from));
  const length = direction.length();
  direction.normalize();

  return (
    <group ref={arrowRef} position={from}>
      {/* Arrow shaft */}
      <mesh
        position={[
          direction.x * length * 0.5,
          direction.y * length * 0.5,
          direction.z * length * 0.5,
        ]}
      >
        <cylinderGeometry args={[0.05, 0.05, length, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Arrow head */}
      <mesh position={to}>
        <coneGeometry args={[0.15, 0.3, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Glow */}
      <pointLight position={to} intensity={1} color={color} distance={2} />
    </group>
  );
}

interface PopupMessageProps {
  position: [number, number, number];
  message: string;
  type?: "info" | "success" | "warning" | "error";
  duration?: number;
  onDismiss?: () => void;
}

export function PopupMessage({
  position,
  message,
  type = "info",
  duration = 3000,
  onDismiss,
}: PopupMessageProps) {
  const colors = {
    info: "#3b82f6",
    success: "#22c55e",
    warning: "#f59e0b",
    error: "#ef4444",
  };

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime() * 1000;
    if (elapsed > duration && onDismiss) {
      onDismiss();
    }
  });

  return (
    <Float speed={2} rotationIntensity={0} floatIntensity={1}>
      <group position={position}>
        <RoundedBox args={[2, 0.6, 0.1]} radius={0.05}>
          <meshStandardMaterial
            color={colors[type]}
            emissive={colors[type]}
            emissiveIntensity={0.6}
            transparent
            opacity={0.95}
          />
        </RoundedBox>

        <Html
          position={[0, 0, 0.06]}
          center
          distanceFactor={4}
          style={{
            width: "180px",
            fontSize: "12px",
            color: "white",
            textAlign: "center",
            fontWeight: "bold",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {message}
        </Html>

        <pointLight
          position={[0, 0, 0.5]}
          intensity={1.5}
          color={colors[type]}
        />
      </group>
    </Float>
  );
}
