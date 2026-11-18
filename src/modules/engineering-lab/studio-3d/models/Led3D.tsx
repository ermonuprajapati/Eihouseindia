'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface Led3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  color?: string; // e.g. '#EF4444', 'Red', 'Blue', etc.
  isPowered?: boolean;
  isSelected?: boolean;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

export function parseHexColor(colStr?: string): string {
  if (!colStr) return '#EF4444';
  if (colStr.startsWith('#')) return colStr;
  const lower = colStr.toLowerCase();
  if (lower.includes('blue')) return '#3B82F6';
  if (lower.includes('green')) return '#10B981';
  if (lower.includes('yellow') || lower.includes('amber')) return '#F59E0B';
  if (lower.includes('white')) return '#F8FAFC';
  if (lower.includes('purple') || lower.includes('violet')) return '#A855F7';
  if (lower.includes('cyan')) return '#06B6D4';
  return '#EF4444'; // Red default
}

export function Led3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color = '#EF4444',
  isPowered = false,
  isSelected = false,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: Led3DProps) {
  const hex = parseHexColor(color);

  const materials = useMemo(() => {
    return {
      lens: new THREE.MeshPhysicalMaterial({
        color: hex,
        emissive: isPowered ? hex : '#000000',
        emissiveIntensity: isPowered ? 1.5 : 0,
        transparent: true,
        opacity: 0.85,
        roughness: 0.1,
        metalness: 0.05,
        transmission: 0.6,
      }),
      silverLead: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.9,
        roughness: 0.2,
      }),
      leadHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, [hex, isPowered]);

  // Lead spacing: 2.54mm between Anode (x = -1.27) and Cathode (x = 1.27)
  const P_ANODE: [number, number, number] = [-1.27, -5, 0];
  const P_CATHODE: [number, number, number] = [1.27, -5, 0];

  return (
    <group position={position} rotation={rotation}>
      {/* Selection Ring */}
      {isSelected && (
        <mesh position={[0, 0, 0]}>
          <ringGeometry args={[4, 4.5, 32]} />
          <meshBasicMaterial color="#38BDF8" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 5mm LED Cylindrical Body */}
      <mesh position={[0, 5, 0]} material={materials.lens} castShadow>
        <cylinderGeometry args={[2.5, 2.5, 5, 24]} />
      </mesh>

      {/* Flange Collar at Base (5.6mm diameter) */}
      <mesh position={[0, 2.2, 0]} material={materials.lens}>
        <cylinderGeometry args={[2.8, 2.8, 0.8, 24]} />
      </mesh>

      {/* Domed Top Hemisphere */}
      <mesh position={[0, 7.5, 0]} material={materials.lens} castShadow>
        <sphereGeometry args={[2.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>

      {/* Internal Reflective Cup & Post */}
      <mesh position={[0, 4.5, 0]} material={materials.silverLead}>
        <coneGeometry args={[0.8, 1.2, 12]} />
      </mesh>

      {/* Point Light when Powered */}
      {isPowered && <pointLight color={hex} intensity={2.5} distance={30} decay={2} position={[0, 7, 0]} />}

      {/* Anode Lead (+ longer, x = -1.27) */}
      <mesh position={[-1.27, 0, 0]} material={materials.silverLead}>
        <cylinderGeometry args={[0.3, 0.3, 5, 8]} />
      </mesh>

      {/* Cathode Lead (- shorter, x = 1.27) */}
      <mesh position={[1.27, 0, 0]} material={materials.silverLead}>
        <cylinderGeometry args={[0.3, 0.3, 5, 8]} />
      </mesh>

      {/* Anode Terminal Pin Anchor */}
      <mesh
        position={P_ANODE}
        material={hoveredPin === 'anode' ? materials.leadHover : materials.silverLead}
        onClick={(e) => {
          e.stopPropagation();
          const w = new THREE.Vector3();
          e.object.getWorldPosition(w);
          onPinClick?.('anode', w);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverPin?.('anode');
        }}
        onPointerOut={() => onHoverPin?.(null)}
      >
        <sphereGeometry args={[0.8, 12, 12]} />
      </mesh>

      {/* Cathode Terminal Pin Anchor */}
      <mesh
        position={P_CATHODE}
        material={hoveredPin === 'cathode' ? materials.leadHover : materials.silverLead}
        onClick={(e) => {
          e.stopPropagation();
          const w = new THREE.Vector3();
          e.object.getWorldPosition(w);
          onPinClick?.('cathode', w);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverPin?.('cathode');
        }}
        onPointerOut={() => onHoverPin?.(null)}
      >
        <sphereGeometry args={[0.8, 12, 12]} />
      </mesh>
    </group>
  );
}
