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
      dummy.position.set(h.x, BB830_HEIGHT - 0.05, h.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  const silkscreenTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 684; // 165mm : 55mm aspect ratio
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 2048, 684);

    // Power Rails Red & Blue Lines
    ctx.lineWidth = 4;

    // Top Pos Red Line
    ctx.strokeStyle = '#EF4444';
    ctx.beginPath();
    ctx.moveTo(60, 45);
    ctx.lineTo(1988, 45);
    ctx.stroke();

    // Top Neg Blue Line
    ctx.strokeStyle = '#3B82F6';
    ctx.beginPath();
    ctx.moveTo(60, 105);
    ctx.lineTo(1988, 105);
    ctx.stroke();

    // Bottom Pos Red Line
    ctx.strokeStyle = '#EF4444';
    ctx.beginPath();
    ctx.moveTo(60, 580);
    ctx.lineTo(1988, 580);
    ctx.stroke();

    // Bottom Neg Blue Line
    ctx.strokeStyle = '#3B82F6';
    ctx.beginPath();
    ctx.moveTo(60, 640);
    ctx.lineTo(1988, 640);
    ctx.stroke();

    // Polarities (+ and -)
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#EF4444';
    ctx.fillText('+', 30, 55);
    ctx.fillText('+', 2005, 55);
    ctx.fillText('+', 30, 590);
    ctx.fillText('+', 2005, 590);

    ctx.fillStyle = '#3B82F6';
    ctx.fillText('−', 30, 115);
    ctx.fillText('−', 2005, 115);
    ctx.fillText('−', 30, 650);
    ctx.fillText('−', 2005, 650);

    // Center divider trench
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(80, 335, 1888, 14);

    // Column Numbers 1, 5, 10, 15... 60
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'center';

    for (let c = 1; c <= 63; c++) {
      if (c === 1 || c % 5 === 0) {
        // x coord along 63 columns
        const cx = 110 + ((c - 1) * (1828 / 62));
        ctx.fillText(String(c), cx, 140);
        ctx.fillText(String(c), cx, 550);
      }
    }

    // Row Letters A B C D E (top) and F G H I J (bottom)
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center';

    const topRows = ['A', 'B', 'C', 'D', 'E'];
    topRows.forEach((r, idx) => {
      const ry = 175 + idx * 30;
      ctx.fillText(r, 65, ry);
      ctx.fillText(r, 1985, ry);
    });

    const btmRows = ['F', 'G', 'H', 'I', 'J'];
    btmRows.forEach((r, idx) => {
      const ry = 380 + idx * 30;
      ctx.fillText(r, 65, ry);
      ctx.fillText(r, 1985, ry);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useEffect(() => {
    return () => {
      silkscreenTexture?.dispose();
    };
  }, [silkscreenTexture]);

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
      {/* Main ABS Plastic Breadboard Substrate - Resting strictly on Floor (y = 0) */}
      <mesh
        position={[0, BB830_HEIGHT / 2, 0]}
        material={materials.absBody}
        receiveShadow
        castShadow
        onPointerMove={(e) => {
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

      {/* High-Resolution Breadboard Silkscreen Overlay (Rails, Polarity, Column Numbers & Row Letters) */}
      {silkscreenTexture && (
        <mesh position={[0, BB830_HEIGHT + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[BB830_WIDTH, BB830_DEPTH]} />
          <meshBasicMaterial map={silkscreenTexture} transparent opacity={0.96} />
        </mesh>
      )}

      {/* Center IC Isolation Trench */}
      <mesh position={[0, BB830_HEIGHT - 0.2, 0]} material={materials.trench}>
        <boxGeometry args={[BB830_WIDTH - 8, 0.4, 3.8]} />
      </mesh>

      {/* Red & Blue Power Rail Silk Lines */}
      {/* Top Positive (+) Red Line */}
      <mesh position={[0, BB830_HEIGHT + 0.02, -23.5]} material={materials.redRail}>
        <boxGeometry args={[BB830_WIDTH - 12, 0.05, 0.4]} />
      </mesh>
      {/* Top Negative (-) Blue Line */}
      <mesh position={[0, BB830_HEIGHT + 0.02, -17.0]} material={materials.blueRail}>
        <boxGeometry args={[BB830_WIDTH - 12, 0.05, 0.4]} />
      </mesh>
      {/* Bottom Positive (+) Red Line */}
      <mesh position={[0, BB830_HEIGHT + 0.02, 17.0]} material={materials.redRail}>
        <boxGeometry args={[BB830_WIDTH - 12, 0.05, 0.4]} />
      </mesh>
      {/* Bottom Negative (-) Blue Line */}
      <mesh position={[0, BB830_HEIGHT + 0.02, 23.5]} material={materials.blueRail}>
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
            <mesh key={th.id} position={[th.x, BB830_HEIGHT + 0.03, th.z]} rotation={[-Math.PI / 2, 0, 0]} material={materials.tieGroupAura}>
              <circleGeometry args={[0.9, 12]} />
            </mesh>
          ))}
          {/* Active Hover Snap Indicator Ring */}
          <group position={[hoveredHole.x, BB830_HEIGHT + 0.04, hoveredHole.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} material={materials.snapRing}>
              <ringGeometry args={[0.9, 1.4, 16]} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}
