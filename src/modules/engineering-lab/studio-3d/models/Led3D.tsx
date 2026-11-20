'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { BurnSmokeFX } from './BurnSmokeFX';

export interface Led3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  color?: string; // e.g. '#EF4444', 'Red', 'Blue', etc.
  isPowered?: boolean;
  brightness?: number;
  isBurned?: boolean;
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
  brightness,
  isBurned = false,
  isSelected = false,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: Led3DProps) {
  const hex = parseHexColor(color);
  const effectiveBrightness = isBurned ? 0 : brightness !== undefined ? brightness : isPowered ? 1.0 : 0;
  const isIlluminated = effectiveBrightness > 0;

  const materials = useMemo(() => {
    if (isBurned) {
      return {
        lens: new THREE.MeshStandardMaterial({
          color: '#18181B',
          roughness: 0.95,
          metalness: 0.05,
        }),
        silverLead: new THREE.MeshStandardMaterial({
          color: '#71717A',
          metalness: 0.4,
          roughness: 0.6,
        }),
        leadHover: new THREE.MeshBasicMaterial({
          color: '#EF4444',
        }),
      };
    }

    return {
      lens: new THREE.MeshPhysicalMaterial({
        color: hex,
        emissive: isIlluminated ? hex : '#000000',
        emissiveIntensity: isIlluminated ? Math.max(0.4, effectiveBrightness * 3.2) : 0,
        transparent: true,
        opacity: Math.min(0.95, 0.65 + effectiveBrightness * 0.3),
        roughness: 0.1,
        metalness: 0.05,
        transmission: 0.6,
      }),
      silverLead: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.95,
        roughness: 0.15,
      }),
      leadHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, [hex, isIlluminated, effectiveBrightness, isBurned]);

  // Lead spacing: 2.54mm between Anode (x = -1.27) and Cathode (x = 1.27)
  const P_ANODE: [number, number, number] = [-1.27, 0, 0];
  const P_CATHODE: [number, number, number] = [1.27, 0, 0];

  return (
    <group position={position} rotation={rotation}>
      {/* 3D Burnout Overheat FX & Smoke Particles */}
      {isBurned && <BurnSmokeFX position={[0, 5, 0]} heightOffset={2} />}

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

      {/* Point Light when Illuminated with proportional intensity */}
      {isIlluminated && (
        <pointLight
          color={hex}
          intensity={Math.max(0.6, effectiveBrightness * 4.0)}
          distance={25 + 25 * effectiveBrightness}
          decay={2}
          position={[0, 7, 0]}
        />
      )}

      {/* Anode Lead (+ longer, x = -1.27) - 0.6mm wire diameter (0.3mm radius) */}
      <mesh position={[-1.27, 0, 0]} material={materials.silverLead}>
        <cylinderGeometry args={[0.3, 0.3, 5, 12]} />
      </mesh>

      {/* Cathode Lead (- shorter, x = 1.27) - 0.6mm wire diameter (0.3mm radius) */}
      <mesh position={[1.27, 0, 0]} material={materials.silverLead}>
        <cylinderGeometry args={[0.3, 0.3, 5, 12]} />
      </mesh>

      {/* Anode Terminal Pin Anchor (Clean lead tip, no oversized ball) */}
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
        <cylinderGeometry args={[0.35, 0.35, 1.0, 12]} />
      </mesh>

      {/* Cathode Terminal Pin Anchor (Clean lead tip, no oversized ball) */}
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
        <cylinderGeometry args={[0.35, 0.35, 1.0, 12]} />
      </mesh>
    </group>
  );
}
