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
  // Generate realistic Dupont jumper arched CatmullRomCurve3
  // with straight vertical entry and exit (90 degrees)
  const { geometry, haloGeometry, dupontStartPos, dupontEndPos } = useMemo(() => {
    const dist = start.distanceTo(end);

    // Dupont connector housing height is 8mm
    // Wire enters top of housing at start.y + 8.0 and end.y + 8.0
    const wireStart = start.clone().add(new THREE.Vector3(0, 8.0, 0));
    const wireEnd = end.clone().add(new THREE.Vector3(0, 8.0, 0));

    // Vertical straight exit from Dupont connector
    const pStartLift = wireStart.clone().add(new THREE.Vector3(0, 5.0, 0));
    const pEndLift = wireEnd.clone().add(new THREE.Vector3(0, 5.0, 0));

    // Graceful arch apex
    const mid = new THREE.Vector3()
      .addVectors(wireStart, wireEnd)
      .multiplyScalar(0.5);
    const archHeight = Math.max(8, Math.min(32, dist * 0.32));
    mid.y += archHeight;

    const curve = new THREE.CatmullRomCurve3([
      wireStart,
      pStartLift,
      mid,
      pEndLift,
      wireEnd,
    ]);

    // Realistic slim Dupont wire radius: 0.45mm
    const geom = new THREE.TubeGeometry(curve, 36, 0.45, 8, false);
    const haloGeom = new THREE.TubeGeometry(curve, 36, 1.1, 8, false);

    return {
      geometry: geom,
      haloGeometry: haloGeom,
      dupontStartPos: start.clone().add(new THREE.Vector3(0, 4.0, 0)),
      dupontEndPos: end.clone().add(new THREE.Vector3(0, 4.0, 0)),
    };
  }, [start, end]);

  // Clean up geometry on unmount to prevent GPU memory leaks
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
        roughness: 0.38,
        metalness: 0.12,
      }),
      halo: new THREE.MeshBasicMaterial({
        color: '#F59E0B',
        transparent: true,
        opacity: 0.45,
      }),
      dupontHousing: new THREE.MeshStandardMaterial({
        color: '#18181B', // Matte black molded Dupont plastic housing
        roughness: 0.5,
        metalness: 0.1,
      }),
      dupontCollar: new THREE.MeshStandardMaterial({
        color: '#27272A',
        roughness: 0.4,
      }),
      pinTip: new THREE.MeshStandardMaterial({
        color: '#CBD5E1', // Nickel/silver plated 0.64mm square terminal pin
        metalness: 0.95,
        roughness: 0.15,
      }),
    };
  }, [color, isSelected]);

  return (
    <group>
      {/* Selection Glow Halo */}
      {isSelected && (
        <mesh geometry={haloGeometry} material={materials.halo} />
      )}

      {/* Main Jumper Wire Flexible PVC Insulation Tube */}
      <mesh
        geometry={geometry}
        material={materials.insulation}
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(id);
        }}
      />

      {/* --- START DUPONT CONNECTOR --- */}
      {/* Black Plastic 2.54mm Dupont Housing */}
      <mesh position={[dupontStartPos.x, dupontStartPos.y, dupontStartPos.z]} material={materials.dupontHousing}>
        <boxGeometry args={[2.2, 7.5, 2.2]} />
      </mesh>
      {/* Top strain-relief collar */}
      <mesh position={[dupontStartPos.x, dupontStartPos.y + 3.85, dupontStartPos.z]} material={materials.dupontCollar}>
        <cylinderGeometry args={[1.1, 1.1, 0.4, 12]} />
      </mesh>
      {/* Metallic Pin Tip entering breadboard hole */}
      <mesh position={[start.x, start.y - 1.5, start.z]} material={materials.pinTip}>
        <cylinderGeometry args={[0.32, 0.32, 3.5, 8]} />
      </mesh>

      {/* --- END DUPONT CONNECTOR --- */}
      {/* Black Plastic 2.54mm Dupont Housing */}
      <mesh position={[dupontEndPos.x, dupontEndPos.y, dupontEndPos.z]} material={materials.dupontHousing}>
        <boxGeometry args={[2.2, 7.5, 2.2]} />
      </mesh>
      {/* Top strain-relief collar */}
      <mesh position={[dupontEndPos.x, dupontEndPos.y + 3.85, dupontEndPos.z]} material={materials.dupontCollar}>
        <cylinderGeometry args={[1.1, 1.1, 0.4, 12]} />
      </mesh>
      {/* Metallic Pin Tip entering breadboard hole */}
      <mesh position={[end.x, end.y - 1.5, end.z]} material={materials.pinTip}>
        <cylinderGeometry args={[0.32, 0.32, 3.5, 8]} />
      </mesh>
    </group>
  );
}
