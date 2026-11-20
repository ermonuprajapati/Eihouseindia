'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getResistorColorBands } from '@/modules/engineering-lab/virtual3d-engine/breadboard-model';
import { BurnSmokeFX } from './BurnSmokeFX';

export interface Resistor3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  value?: string; // e.g. '220Ω', '10kΩ'
  isBurned?: boolean;
  isSelected?: boolean;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

export function Resistor3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  value = '1kΩ',
  isBurned = false,
  isSelected = false,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: Resistor3DProps) {
  const bands = useMemo(() => getResistorColorBands(value), [value]);

  const materials = useMemo(() => {
    return {
      body: new THREE.MeshStandardMaterial({
        color: isBurned ? '#18181B' : '#D4A373', // Charred black or light beige ceramic body
        roughness: isBurned ? 0.95 : 0.5,
        metalness: isBurned ? 0.05 : 0.1,
      }),
      silverLead: new THREE.MeshStandardMaterial({
        color: isBurned ? '#71717A' : '#E2E8F0',
        metalness: isBurned ? 0.4 : 0.95,
        roughness: isBurned ? 0.6 : 0.15,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, [isBurned]);

  const P_PIN1: [number, number, number] = [-5.08, 0, 0];
  const P_PIN2: [number, number, number] = [5.08, 0, 0];

  return (
    <group position={position} rotation={rotation}>
      {/* 3D Burnout Overheat FX & Smoke Particles */}
      {isBurned && <BurnSmokeFX position={[0, 4, 0]} heightOffset={1} />}

      {/* Selection Box */}
      {isSelected && (
        <mesh position={[0, 4.5, 0]}>
          <boxGeometry args={[13, 6, 6]} />
          <meshBasicMaterial color="#38BDF8" wireframe />
        </mesh>
      )}

      {/* Main Ceramic Cylindrical Body (Horizontal along X, raised cleanly at y = 4.5mm) */}
      <mesh position={[0, 4.5, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.body} castShadow>
        <cylinderGeometry args={[1.5, 1.5, 7, 24]} />
      </mesh>

      {/* 4 Color Rings */}
      {bands.map((bandHex, idx) => {
        // Spaced along body: [-2.0, -0.8, 0.4, 1.8]
        const ringX = -2.0 + idx * 1.3;
        return (
          <mesh key={idx} position={[ringX, 4.5, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[1.53, 1.53, 0.6, 24]} />
            <meshBasicMaterial color={isBurned ? '#27272A' : bandHex} />
          </mesh>
        );
      })}

      {/* Realistic Thin Silver/Tinned-Copper Cylindrical Wire Leads (radius 0.38mm) */}
      {/* Left horizontal stem */}
      <mesh position={[-4.04, 4.5, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.silverLead}>
        <cylinderGeometry args={[0.38, 0.38, 2.08, 12]} />
      </mesh>
      {/* Left bent leg entering straight into exact center of breadboard hole */}
      <mesh position={[-5.08, -0.5, 0]} material={materials.silverLead}>
        <cylinderGeometry args={[0.38, 0.38, 10, 12]} />
      </mesh>

      {/* Right horizontal stem */}
      <mesh position={[4.04, 4.5, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.silverLead}>
        <cylinderGeometry args={[0.38, 0.38, 2.08, 12]} />
      </mesh>
      {/* Right bent leg entering straight into exact center of breadboard hole */}
      <mesh position={[5.08, -0.5, 0]} material={materials.silverLead}>
        <cylinderGeometry args={[0.38, 0.38, 10, 12]} />
      </mesh>

      {/* Pin 1 Clean Clickable Terminal Anchor (No chunky discs) */}
      <mesh
        position={P_PIN1}
        material={hoveredPin === '1' ? materials.pinHover : materials.silverLead}
        onClick={(e) => {
          e.stopPropagation();
          const w = new THREE.Vector3();
          e.object.getWorldPosition(w);
          onPinClick?.('1', w);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverPin?.('1');
        }}
        onPointerOut={() => onHoverPin?.(null)}
      >
        <cylinderGeometry args={[0.35, 0.35, 1.2, 12]} />
      </mesh>

      {/* Pin 2 Clean Clickable Terminal Anchor (No chunky discs) */}
      <mesh
        position={P_PIN2}
        material={hoveredPin === '2' ? materials.pinHover : materials.silverLead}
        onClick={(e) => {
          e.stopPropagation();
          const w = new THREE.Vector3();
          e.object.getWorldPosition(w);
          onPinClick?.('2', w);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverPin?.('2');
        }}
        onPointerOut={() => onHoverPin?.(null)}
      >
        <cylinderGeometry args={[0.35, 0.35, 1.2, 12]} />
      </mesh>
    </group>
  );
}
