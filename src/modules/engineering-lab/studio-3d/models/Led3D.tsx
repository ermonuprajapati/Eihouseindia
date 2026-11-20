'use client';

import React, { useMemo, useEffect } from 'react';
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

  // Stable Three.js materials - Avoid recreating shader programs on every animation frame
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
        anodeHover: new THREE.MeshBasicMaterial({
          color: '#10B981',
        }),
        cathodeHover: new THREE.MeshBasicMaterial({
          color: '#38BDF8',
        }),
      };
    }

    return {
      lens: new THREE.MeshPhysicalMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0,
        transparent: true,
        opacity: 0.7,
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
      anodeHover: new THREE.MeshBasicMaterial({
        color: '#10B981',
      }),
      cathodeHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, [hex, isBurned]);

  // Smooth real-time update of optical parameters without WebGL shader compilation lag
  useEffect(() => {
    if (materials.lens instanceof THREE.MeshPhysicalMaterial) {
      materials.lens.emissive.set(isIlluminated ? hex : '#000000');
      materials.lens.emissiveIntensity = isIlluminated ? Math.max(0.4, effectiveBrightness * 3.2) : 0;
      materials.lens.opacity = Math.min(0.95, 0.65 + effectiveBrightness * 0.3);
    }
  }, [materials, isIlluminated, effectiveBrightness, hex]);

  // Lead spacing: Exactly 5.08mm (2 x 2.54mm breadboard pitch) centered at x = 0
  // Anode at x = -2.54 (Column N-1), Cathode at x = +2.54 (Column N+1)
  const P_ANODE: [number, number, number] = [-2.54, 0, 0];
  const P_CATHODE: [number, number, number] = [2.54, 0, 0];

  return (
    <group position={position} rotation={rotation}>
      {/* 3D Burnout Overheat FX & Smoke Particles */}
      {isBurned && <BurnSmokeFX position={[0, 5, 0]} heightOffset={2} />}

      {/* Selection Ring */}
      {isSelected && (
        <mesh position={[0, 0, 0]}>
          <ringGeometry args={[4.5, 5.0, 32]} />
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

      {/* Authentic Physical Cathode Flat Notch on Collar (+X rim) */}
      <mesh position={[2.7, 2.2, 0]} material={materials.lens}>
        <boxGeometry args={[0.3, 0.82, 2.2]} />
      </mesh>

      {/* Visible Polarity Embossed Badges on Collar */}
      {/* Anode (+) Symbol on -X side */}
      <group position={[-3.1, 2.2, 0]}>
        <mesh>
          <boxGeometry args={[0.6, 0.15, 0.1]} />
          <meshBasicMaterial color="#10B981" />
        </mesh>
        <mesh>
          <boxGeometry args={[0.15, 0.6, 0.1]} />
          <meshBasicMaterial color="#10B981" />
        </mesh>
      </group>
      {/* Cathode (-) Symbol on +X side */}
      <group position={[3.1, 2.2, 0]}>
        <mesh>
          <boxGeometry args={[0.6, 0.15, 0.1]} />
          <meshBasicMaterial color="#38BDF8" />
        </mesh>
      </group>

      {/* Domed Top Hemisphere */}
      <mesh position={[0, 7.5, 0]} material={materials.lens} castShadow>
        <sphereGeometry args={[2.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>

      {/* Internal Reflective Cup & Post (Anode Post & Cathode Anvil) */}
      <mesh position={[-0.4, 4.5, 0]} material={materials.silverLead}>
        <coneGeometry args={[0.4, 1.2, 12]} />
      </mesh>
      <mesh position={[0.4, 4.5, 0]} material={materials.silverLead}>
        <boxGeometry args={[0.7, 1.2, 0.2]} />
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

      {/* Authentic Bent Metallic Leads Firmly Seated Into Breadboard Holes */}
      {/* 1. Anode Lead (Left, +): Bends from base to x = -2.54 and extends down to y = -5.0mm */}
      <mesh position={[-1.77, 2.0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.silverLead}>
        <cylinderGeometry args={[0.3, 0.3, 1.54, 8]} />
      </mesh>
      <mesh position={[-2.54, -1.5, 0]} material={materials.silverLead}>
        <cylinderGeometry args={[0.3, 0.3, 7.0, 12]} />
      </mesh>

      {/* 2. Cathode Lead (Right, -): Bends from base to x = 2.54 and extends down to y = -4.2mm */}
      <mesh position={[1.77, 2.0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.silverLead}>
        <cylinderGeometry args={[0.3, 0.3, 1.54, 8]} />
      </mesh>
      <mesh position={[2.54, -1.1, 0]} material={materials.silverLead}>
        <cylinderGeometry args={[0.3, 0.3, 6.2, 12]} />
      </mesh>

      {/* Anode Terminal Pin Anchor (x = -2.54, y = 0 Breadboard Surface) */}
      <mesh
        position={P_ANODE}
        material={hoveredPin === 'anode' ? materials.anodeHover : materials.silverLead}
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
        <cylinderGeometry args={[hoveredPin === 'anode' ? 0.6 : 0.35, 0.35, 1.2, 12]} />
      </mesh>

      {/* Cathode Terminal Pin Anchor (x = 2.54, y = 0 Breadboard Surface) */}
      <mesh
        position={P_CATHODE}
        material={hoveredPin === 'cathode' ? materials.cathodeHover : materials.silverLead}
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
        <cylinderGeometry args={[hoveredPin === 'cathode' ? 0.6 : 0.35, 0.35, 1.2, 12]} />
      </mesh>
    </group>
  );
}
