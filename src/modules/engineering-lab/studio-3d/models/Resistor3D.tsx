'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getResistorColorBands } from '@/modules/engineering-lab/virtual3d-engine/breadboard-model';

export interface Resistor3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  value?: string; // e.g. '220Ω', '10kΩ'
  isSelected?: boolean;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

export function Resistor3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  value = '1kΩ',
  isSelected = false,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: Resistor3DProps) {
  const bands = useMemo(() => getResistorColorBands(value), [value]);

  const materials = useMemo(() => {
    return {
      body: new THREE.MeshStandardMaterial({
        color: '#D4A373', // Light beige ceramic body
        roughness: 0.5,
      }),
      silverLead: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.9,
        roughness: 0.2,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, []);

  const P_PIN1: [number, number, number] = [-5.08, -5, 0];
  const P_PIN2: [number, number, number] = [5.08, -5, 0];

  return (
    <group position={position} rotation={rotation}>
      {/* Selection Box */}
      {isSelected && (
        <mesh position={[0, 4, 0]}>
          <boxGeometry args={[13, 6, 6]} />
          <meshBasicMaterial color="#38BDF8" wireframe />
        </mesh>
      )}

      {/* Main Ceramic Cylindrical Body (Horizontal along X) */}
      <mesh position={[0, 4, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.body} castShadow>
        <cylinderGeometry args={[1.5, 1.5, 7, 24]} />
      </mesh>

      {/* 4 Color Rings */}
      {bands.map((bandHex, idx) => {
        // Spaced along body: [-2.0, -0.8, 0.4, 1.8]
        const ringX = -2.0 + idx * 1.3;
        return (
          <mesh key={idx} position={[ringX, 4, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[1.53, 1.53, 0.6, 24]} />
            <meshBasicMaterial color={bandHex} />
          </mesh>
        );
      })}

      {/* Axial Silver Leads */}
      {/* Left horizontal stem */}
      <mesh position={[-4.5, 4, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.silverLead}>
        <cylinderGeometry args={[0.3, 0.3, 3, 8]} />
      </mesh>
      {/* Left bent leg down to breadboard */}
      <mesh position={[-5.08, 0, 0]} material={materials.silverLead}>
        <cylinderGeometry args={[0.3, 0.3, 8, 8]} />
      </mesh>

      {/* Right horizontal stem */}
      <mesh position={[4.5, 4, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.silverLead}>
        <cylinderGeometry args={[0.3, 0.3, 3, 8]} />
      </mesh>
      {/* Right bent leg down to breadboard */}
      <mesh position={[5.08, 0, 0]} material={materials.silverLead}>
        <cylinderGeometry args={[0.3, 0.3, 8, 8]} />
      </mesh>

      {/* Pin 1 Clickable Terminal Anchor */}
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
        <sphereGeometry args={[0.8, 12, 12]} />
      </mesh>

      {/* Pin 2 Clickable Terminal Anchor */}
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
        <sphereGeometry args={[0.8, 12, 12]} />
      </mesh>
    </group>
  );
}
