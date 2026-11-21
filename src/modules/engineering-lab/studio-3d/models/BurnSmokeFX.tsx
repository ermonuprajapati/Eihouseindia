'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export interface BurnSmokeFXProps {
  position?: [number, number, number];
  heightOffset?: number;
}

export function BurnSmokeFX({ position = [0, 0, 0], heightOffset = 4 }: BurnSmokeFXProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const particleCount = 14;
  const particles = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);
    const driftX = new Float32Array(particleCount);
    const driftZ = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 1.5;
      pos[i * 3 + 1] = Math.random() * 8 + heightOffset;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
      speeds[i] = 2.5 + Math.random() * 3.5;
      driftX[i] = (Math.random() - 0.5) * 0.8;
      driftZ[i] = (Math.random() - 0.5) * 0.8;
    }

    return { pos, speeds, driftX, driftZ };
  }, [heightOffset]);

  const geo = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(particles.pos, 3));
    return geometry;
  }, [particles]);

  const mat = useMemo(() => {
    return new THREE.PointsMaterial({
      color: '#94A3B8',
      size: 1.8,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
  }, []);

  useEffect(() => {
    return () => {
      geo.dispose();
      mat.dispose();
    };
  }, [geo, mat]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const idxY = i * 3 + 1;
      array[idxY] += particles.speeds[i] * delta * 2.0;
      array[i * 3 + 0] += particles.driftX[i] * delta;
      array[i * 3 + 2] += particles.driftZ[i] * delta;

      if (array[idxY] > heightOffset + 12) {
        array[idxY] = heightOffset + (Math.random() * 1.2);
        array[i * 3 + 0] = (Math.random() - 0.5) * 1.5;
        array[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
      }
    }
    posAttr.needsUpdate = true;

    if (lightRef.current) {
      // Thermal orange-red overheat glow flickering
      lightRef.current.intensity = 1.2 + Math.sin(state.clock.elapsedTime * 12) * 0.6;
    }
  });

  return (
    <group position={position}>
      {/* Thermal Overheat Ember Glow */}
      <pointLight
        ref={lightRef}
        color="#FF3700"
        intensity={1.5}
        distance={18}
        decay={2}
        position={[0, heightOffset, 0]}
      />

      {/* Overheat Char Core Glow */}
      <mesh position={[0, heightOffset, 0]}>
        <sphereGeometry args={[0.9, 12, 12]} />
        <meshBasicMaterial color="#FF4500" transparent opacity={0.7} />
      </mesh>

      {/* Rising Translucent Smoke Particle Cloud */}
      <points ref={pointsRef} geometry={geo} material={mat} />
    </group>
  );
}
