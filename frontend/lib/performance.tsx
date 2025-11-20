"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries as mergeBufferGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Performance monitoring hook
 * Tracks FPS and provides performance metrics
 */
export function usePerformanceMonitor() {
  const [fps, setFps] = useState(60);
  const [memory, setMemory] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frameCount.current++;
    const currentTime = performance.now();
    const delta = currentTime - lastTime.current;

    // Update FPS every second
    if (delta >= 1000) {
      setFps(Math.round((frameCount.current * 1000) / delta));
      frameCount.current = 0;
      lastTime.current = currentTime;

      // Memory usage (if available)
      if ((performance as any).memory) {
        const memoryMB =
          (performance as any).memory.usedJSHeapSize / 1048576;
        setMemory(Math.round(memoryMB));
      }
    }
  });

  return { fps, memory };
}

/**
 * Adaptive quality based on performance
 * Automatically adjusts scene quality based on FPS
 */
export function useAdaptiveQuality(targetFps = 45) {
  const [quality, setQuality] = useState<"low" | "medium" | "high">("high");
  const { fps } = usePerformanceMonitor();
  const checkCount = useRef(0);

  useEffect(() => {
    checkCount.current++;

    // Only adjust after a few frames to get stable reading
    if (checkCount.current < 60) return;

    if (fps < targetFps && quality !== "low") {
      if (quality === "high") {
        setQuality("medium");
      } else {
        setQuality("low");
      }
      checkCount.current = 0;
    } else if (fps > targetFps + 15 && quality !== "high") {
      if (quality === "low") {
        setQuality("medium");
      } else {
        setQuality("high");
      }
      checkCount.current = 0;
    }
  }, [fps, quality, targetFps]);

  return quality;
}

/**
 * Get quality settings based on quality level
 */
export function getQualitySettings(quality: "low" | "medium" | "high") {
  const settings = {
    low: {
      particles: 500,
      shadows: false,
      antialias: false,
      pixelRatio: 1,
      shadowMapSize: 512,
      particleSize: 0.1,
      effectsEnabled: false,
    },
    medium: {
      particles: 1000,
      shadows: true,
      antialias: false,
      pixelRatio: 1.5,
      shadowMapSize: 1024,
      particleSize: 0.05,
      effectsEnabled: false,
    },
    high: {
      particles: 2000,
      shadows: true,
      antialias: true,
      pixelRatio: window.devicePixelRatio,
      shadowMapSize: 2048,
      particleSize: 0.05,
      effectsEnabled: true,
    },
  };

  return settings[quality];
}

/**
 * Level of Detail (LOD) component
 * Shows different quality meshes based on distance from camera
 */
interface LODProps {
  position?: [number, number, number];
  children: {
    high: React.ReactNode;
    medium: React.ReactNode;
    low: React.ReactNode;
  };
  distances?: [number, number]; // [medium, low] switch distances
}

export function LOD({
  position = [0, 0, 0],
  children,
  distances = [10, 20],
}: LODProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [lodLevel, setLodLevel] = useState<"high" | "medium" | "low">("high");
  const { camera } = useThree();

  useFrame(() => {
    if (!groupRef.current) return;

    const distance = camera.position.distanceTo(
      new THREE.Vector3(...position)
    );

    if (distance > distances[1]) {
      setLodLevel("low");
    } else if (distance > distances[0]) {
      setLodLevel("medium");
    } else {
      setLodLevel("high");
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {lodLevel === "high" && children.high}
      {lodLevel === "medium" && children.medium}
      {lodLevel === "low" && children.low}
    </group>
  );
}

/**
 * Frustum culling - only render objects in view
 */
export function useFrustumCulling() {
  const { camera } = useThree();
  const frustum = useRef(new THREE.Frustum());
  const projScreenMatrix = useRef(new THREE.Matrix4());

  useFrame(() => {
    projScreenMatrix.current.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.current.setFromProjectionMatrix(projScreenMatrix.current);
  });

  const isInView = (position: THREE.Vector3, radius = 1) => {
    const sphere = new THREE.Sphere(position, radius);
    return frustum.current.intersectsSphere(sphere);
  };

  return { isInView };
}

/**
 * Object pooling for particles and repeated objects
 */
export class ObjectPool<T> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private factory: () => T;
  private reset: (obj: T) => void;

  constructor(factory: () => T, reset: (obj: T) => void, initialSize = 10) {
    this.factory = factory;
    this.reset = reset;

    // Pre-create objects
    for (let i = 0; i < initialSize; i++) {
      this.available.push(factory());
    }
  }

  get(): T {
    let obj = this.available.pop();
    if (!obj) {
      obj = this.factory();
    }
    this.inUse.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (this.inUse.has(obj)) {
      this.inUse.delete(obj);
      this.reset(obj);
      this.available.push(obj);
    }
  }

  clear(): void {
    this.available = [];
    this.inUse.clear();
  }
}

/**
 * Debounce expensive operations
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Performance stats overlay
 */
export function PerformanceStats() {
  const { fps, memory } = usePerformanceMonitor();
  const quality = useAdaptiveQuality();
  const { gl } = useThree();

  return (
    <div className="fixed top-4 left-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono space-y-1 z-50">
      <div className="flex items-center justify-between gap-4">
        <span>FPS:</span>
        <span
          className={
            fps >= 50
              ? "text-green-400"
              : fps >= 30
              ? "text-yellow-400"
              : "text-red-400"
          }
        >
          {fps}
        </span>
      </div>
      {memory > 0 && (
        <div className="flex items-center justify-between gap-4">
          <span>Memory:</span>
          <span>{memory} MB</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <span>Quality:</span>
        <span
          className={
            quality === "high"
              ? "text-green-400"
              : quality === "medium"
              ? "text-yellow-400"
              : "text-red-400"
          }
        >
          {quality.toUpperCase()}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span>Renderer:</span>
        <span className="text-cyan-400">{gl.capabilities.isWebGL2 ? "WebGL2" : "WebGL"}</span>
      </div>
    </div>
  );
}

/**
 * Texture optimization utilities
 */
export function optimizeTexture(texture: THREE.Texture): THREE.Texture {
  // Use mipmaps for better performance
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // Anisotropic filtering
  texture.anisotropy = 4;

  return texture;
}

/**
 * Geometry optimization - merge geometries when possible
 */
export function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  try {
    return mergeBufferGeometries(geometries) || geometries[0];
  } catch (error) {
    console.warn('Failed to merge geometries:', error);
    return geometries[0];
  }
}

/**
 * Dispose helper - clean up resources
 */
export function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => {
            disposeMaterial(material);
          });
        } else {
          disposeMaterial(child.material);
        }
      }
    }
  });
}

function disposeMaterial(material: THREE.Material) {
  material.dispose();

  // Dispose textures
  Object.keys(material).forEach((key) => {
    const value = (material as any)[key];
    if (value instanceof THREE.Texture) {
      value.dispose();
    }
  });
}

/**
 * Batch rendering helper
 */
export function useBatchRendering<T>(
  items: T[],
  renderItem: (item: T, index: number) => React.ReactNode,
  batchSize = 10
) {
  const [renderedCount, setRenderedCount] = useState(batchSize);

  useEffect(() => {
    if (renderedCount < items.length) {
      const timer = setTimeout(() => {
        setRenderedCount((prev) => Math.min(prev + batchSize, items.length));
      }, 16); // ~60fps

      return () => clearTimeout(timer);
    }
  }, [renderedCount, items.length, batchSize]);

  return items.slice(0, renderedCount).map(renderItem);
}
