'use client';

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';

export interface Wire3DTubeProps {
  id: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  color?: string;
  isSelected?: boolean;
  isHighlighted?: boolean;
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
  isHighlighted = false,
  onClick,
}: Wire3DTubeProps) {
  // Generate realistic Dupont jumper arched CatmullRomCurve3
  // with straight vertical entry and exit (90 degrees) and low-profile arcs
  const { geometry, haloGeometry, dupontStartPos, dupontEndPos } = useMemo(() => {
    const dist = start.distanceTo(end);

    // Dupont connector housing height is 6mm
    // Wire enters top of housing at start.y + 6.0 and end.y + 6.0
    const wireStart = start.clone().add(new THREE.Vector3(0, 6.0, 0));
    const wireEnd = end.clone().add(new THREE.Vector3(0, 6.0, 0));

    // Vertical straight exit from Dupont connector (clean low profile)
    const pStartLift = wireStart.clone().add(new THREE.Vector3(0, 1.8, 0));
    const pEndLift = wireEnd.clone().add(new THREE.Vector3(0, 1.8, 0));

    // Graceful arch apex hugging board neatly
    const mid = new THREE.Vector3()
      .addVectors(wireStart, wireEnd)
      .multiplyScalar(0.5);
    const archHeight = Math.max(3.0, Math.min(12.0, dist * 0.18));
    mid.y += archHeight;

    // Route around component bounding boxes by adding subtle lateral curvature
    const dir = new THREE.Vector3().subVectors(end, start);
    dir.y = 0;
    const len = dir.length();
    if (len > 5.0) {
      dir.normalize();
      const perp = new THREE.Vector3(-dir.z, 0, dir.x);
      const lateralBow = Math.min(3.2, dist * 0.05);
      mid.addScaledVector(perp, lateralBow);
    }

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
      dupontStartPos: start.clone().add(new THREE.Vector3(0, 3.0, 0)),
      dupontEndPos: end.clone().add(new THREE.Vector3(0, 3.0, 0)),
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
      highlightHalo: new THREE.MeshBasicMaterial({
        color: '#22D3EE',
        transparent: true,
        opacity: 0.65,
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

      {/* Connected Net / Pin Hover Highlight Glow */}
      {!isSelected && isHighlighted && (
        <mesh geometry={haloGeometry} material={materials.highlightHalo} />
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
        <boxGeometry args={[2.2, 5.8, 2.2]} />
      </mesh>
      {/* Top strain-relief collar */}
      <mesh position={[dupontStartPos.x, dupontStartPos.y + 2.95, dupontStartPos.z]} material={materials.dupontCollar}>
        <cylinderGeometry args={[1.1, 1.1, 0.4, 12]} />
      </mesh>
      {/* Metallic Pin Tip entering breadboard hole */}
      <mesh position={[start.x, start.y - 1.2, start.z]} material={materials.pinTip}>
        <cylinderGeometry args={[0.32, 0.32, 2.8, 8]} />
      </mesh>

      {/* --- END DUPONT CONNECTOR --- */}
      {/* Black Plastic 2.54mm Dupont Housing */}
      <mesh position={[dupontEndPos.x, dupontEndPos.y, dupontEndPos.z]} material={materials.dupontHousing}>
        <boxGeometry args={[2.2, 5.8, 2.2]} />
      </mesh>
      {/* Top strain-relief collar */}
      <mesh position={[dupontEndPos.x, dupontEndPos.y + 2.95, dupontEndPos.z]} material={materials.dupontCollar}>
        <cylinderGeometry args={[1.1, 1.1, 0.4, 12]} />
      </mesh>
      {/* Metallic Pin Tip entering breadboard hole */}
      <mesh position={[end.x, end.y - 1.2, end.z]} material={materials.pinTip}>
        <cylinderGeometry args={[0.32, 0.32, 2.8, 8]} />
      </mesh>
    </group>
  );
}
