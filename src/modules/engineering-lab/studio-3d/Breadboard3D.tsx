'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import {
  ALL_830_HOLES,
  BB830_WIDTH,
  BB830_DEPTH,
  BB830_HEIGHT,
  BreadboardHole3D,
  findNearestHole830,
  HOLES_BY_TIE_GROUP,
} from './breadboard-topology';

export interface Breadboard3DProps {
  position?: [number, number, number];
  onHoleClick?: (hole: BreadboardHole3D, worldPos: THREE.Vector3) => void;
  hoveredHole?: BreadboardHole3D | null;
  onHoverHole?: (hole: BreadboardHole3D | null) => void;
}

export function Breadboard3D({
  position = [0, 0, 0],
  onHoleClick,
  hoveredHole,
  onHoverHole,
}: Breadboard3DProps) {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);

  // Instanced mesh matrix setup for 830 holes
  useEffect(() => {
    if (!instancedMeshRef.current) return;
    const mesh = instancedMeshRef.current;
    const dummy = new THREE.Object3D();

    ALL_830_HOLES.forEach((h, i) => {
      dummy.position.set(h.x, 0.45, h.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  const materials = useMemo(() => {
    return {
      absBody: new THREE.MeshStandardMaterial({
        color: '#F8FAFC', // Off-white clean ABS plastic
        roughness: 0.35,
        metalness: 0.05,
      }),
      trench: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        roughness: 0.5,
      }),
      holeSocket: new THREE.MeshStandardMaterial({
        color: '#1E293B', // Dark metallic socket interior
        roughness: 0.8,
      }),
      redRail: new THREE.MeshBasicMaterial({
        color: '#EF4444',
      }),
      blueRail: new THREE.MeshBasicMaterial({
        color: '#3B82F6',
      }),
      snapRing: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
        side: THREE.DoubleSide,
      }),
      tieGroupAura: new THREE.MeshBasicMaterial({
        color: '#06B6D4',
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      }),
    };
  }, []);

  return (
    <group position={position}>
      {/* Main ABS Plastic Breadboard Substrate */}
      <mesh
        position={[0, -BB830_HEIGHT / 2 + 0.5, 0]}
        material={materials.absBody}
        receiveShadow
        castShadow
        onPointerMove={(e) => {
          e.stopPropagation();
          const localPoint = e.point.clone();
          localPoint.x -= position[0];
          localPoint.z -= position[2];
          const nearest = findNearestHole830(localPoint.x, localPoint.z, 9.0);
          onHoverHole?.(nearest);
        }}
        onPointerLeave={() => {
          onHoverHole?.(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          const localPoint = e.point.clone();
          localPoint.x -= position[0];
          localPoint.z -= position[2];
          const nearest = findNearestHole830(localPoint.x, localPoint.z, 9.0);
          if (nearest) {
            const worldPos = new THREE.Vector3(
              position[0] + nearest.x,
              position[1] + nearest.y,
              position[2] + nearest.z
            );
            onHoleClick?.(nearest, worldPos);
          }
        }}
      >
        <boxGeometry args={[BB830_WIDTH, BB830_HEIGHT, BB830_DEPTH]} />
      </mesh>

      {/* Center IC Isolation Trench */}
      <mesh position={[0, 0.4, 0]} material={materials.trench}>
        <boxGeometry args={[BB830_WIDTH - 8, 0.4, 3.8]} />
      </mesh>

      {/* Red & Blue Power Rail Silk Lines */}
      {/* Top Positive (+) Red Line */}
      <mesh position={[0, 0.52, -23.5]} material={materials.redRail}>
        <boxGeometry args={[BB830_WIDTH - 12, 0.05, 0.4]} />
      </mesh>
      {/* Top Negative (-) Blue Line */}
      <mesh position={[0, 0.52, -17.0]} material={materials.blueRail}>
        <boxGeometry args={[BB830_WIDTH - 12, 0.05, 0.4]} />
      </mesh>
      {/* Bottom Positive (+) Red Line */}
      <mesh position={[0, 0.52, 17.0]} material={materials.redRail}>
        <boxGeometry args={[BB830_WIDTH - 12, 0.05, 0.4]} />
      </mesh>
      {/* Bottom Negative (-) Blue Line */}
      <mesh position={[0, 0.52, 23.5]} material={materials.blueRail}>
        <boxGeometry args={[BB830_WIDTH - 12, 0.05, 0.4]} />
      </mesh>

      {/* 830 Recessed Spring Clip Holes via InstancedMesh for 60+ FPS */}
      <instancedMesh
        ref={instancedMeshRef}
        args={[undefined, undefined, ALL_830_HOLES.length]}
        material={materials.holeSocket}
      >
        <boxGeometry args={[1.1, 0.6, 1.1]} />
      </instancedMesh>

      {/* Strict Internal Spring-Clip Tie Group Aura & Active Snap Ring */}
      {hoveredHole && (
        <group>
          {/* Subtle connected strip highlight for all tieGroup holes */}
          {(HOLES_BY_TIE_GROUP.get(hoveredHole.tieGroup) || []).map((th) => (
            <mesh key={th.id} position={[th.x, 0.56, th.z]} rotation={[-Math.PI / 2, 0, 0]} material={materials.tieGroupAura}>
              <circleGeometry args={[0.9, 12]} />
            </mesh>
          ))}
          {/* Active Hover Snap Indicator Ring */}
          <group position={[hoveredHole.x, 0.6, hoveredHole.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} material={materials.snapRing}>
              <ringGeometry args={[0.9, 1.4, 16]} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}
