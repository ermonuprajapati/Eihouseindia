'use client';

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';

export interface Wire3DTubeProps {
  id: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  color?: string;
  isSelected?: boolean;
  isSimulating?: boolean;
  current?: number;
  onClick?: (id: string) => void;
  onContextMenu?: (e: THREE.Event, id: string) => void;
}

export function Wire3DTube({
  id,
  start,
  end,
  color = '#EF4444',
  isSelected = false,
  onClick,
}: Wire3DTubeProps) {
  // Generate arched CatmullRomCurve3
  const { geometry, haloGeometry } = useMemo(() => {
    const dist = start.distanceTo(end);
    const mid = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);

    // Natural arch height based on distance
    const archHeight = Math.max(10, Math.min(35, dist * 0.35));
    mid.y += archHeight;

    // Intermediate points for vertical pin exit/entry
    const pStartLift = start.clone().add(new THREE.Vector3(0, 4, 0));
    const pEndLift = end.clone().add(new THREE.Vector3(0, 4, 0));

    const curve = new THREE.CatmullRomCurve3([
      start,
      pStartLift,
      mid,
      pEndLift,
      end,
    ]);

    const geom = new THREE.TubeGeometry(curve, 36, 0.75, 8, false);
    const haloGeom = new THREE.TubeGeometry(curve, 36, 1.4, 8, false);

    return { geometry: geom, haloGeometry: haloGeom };
  }, [start, end]);

  // Clean up geometry on unmount to prevent GPU leaks
  useEffect(() => {
    return () => {
      geometry.dispose();
      haloGeometry.dispose();
    };
  }, [geometry, haloGeometry]);

  const materials = useMemo(() => {
    return {
      insulation: new THREE.MeshStandardMaterial({
        color: isSelected ? '#F59E0B' : color,
        roughness: 0.35,
        metalness: 0.1,
      }),
      halo: new THREE.MeshBasicMaterial({
        color: '#F59E0B',
        transparent: true,
        opacity: 0.4,
      }),
      pinTip: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.9,
        roughness: 0.15,
      }),
    };
  }, [color, isSelected]);

  return (
    <group>
      {/* Selection Halo */}
      {isSelected && (
        <mesh geometry={haloGeometry} material={materials.halo} />
      )}

      {/* Main Jumper Wire Tube */}
      <mesh
        geometry={geometry}
        material={materials.insulation}
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(id);
        }}
      />

      {/* Metal Pin Tips plugging into hole */}
      <mesh position={[start.x, start.y - 1.5, start.z]} material={materials.pinTip}>
        <cylinderGeometry args={[0.35, 0.35, 3, 8]} />
      </mesh>
      <mesh position={[end.x, end.y - 1.5, end.z]} material={materials.pinTip}>
        <cylinderGeometry args={[0.35, 0.35, 3, 8]} />
      </mesh>
    </group>
  );
}
