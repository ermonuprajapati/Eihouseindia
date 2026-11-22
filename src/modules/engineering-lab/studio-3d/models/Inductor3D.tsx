'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface Inductor3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  value?: string; // e.g. '10mH', '100µH'
  isSelected?: boolean;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

/**
 * Hardware-grade Axial Inductor 3D Model
 * Conformal-coated body with color rings and copper coil indication,
 * and metallic leads seated into breadboard holes at 10.16mm span (x = ±5.08mm).
 */
export function Inductor3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  value = '10mH',
  isSelected = false,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: Inductor3DProps) {
  void value;
  const materials = useMemo(() => {
    return {
      bodyCoating: new THREE.MeshStandardMaterial({
        color: isSelected ? '#38BDF8' : '#047857', // Classic inductor olive/teal epoxy coating
        roughness: 0.35,
        metalness: 0.1,
      }),
      silverLead: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.95,
        roughness: 0.15,
      }),
      copperRing: new THREE.MeshStandardMaterial({
        color: '#B45309',
        metalness: 0.8,
        roughness: 0.25,
      }),
      silverRing: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.9,
        roughness: 0.2,
      }),
      goldRing: new THREE.MeshStandardMaterial({
        color: '#EAB308',
        metalness: 0.85,
        roughness: 0.2,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, [isSelected]);

  const pins = [
    { name: '1', x: -5.08 },
    { name: '2', x: 5.08 },
  ];

  return (
    <group position={position} rotation={rotation}>
      {/* 1. Main Axial Cylindrical Body (Horizontal along X, raised cleanly at y = 4.5mm) */}
      <mesh position={[0, 4.5, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.bodyCoating} castShadow>
        <cylinderGeometry args={[1.7, 1.7, 7.2, 24]} />
      </mesh>

      {/* End Caps for Molded Choke Look */}
      <mesh position={[-3.6, 4.5, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.bodyCoating}>
        <sphereGeometry args={[1.7, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[3.6, 4.5, 0]} rotation={[0, 0, -Math.PI / 2]} material={materials.bodyCoating}>
        <sphereGeometry args={[1.7, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>

      {/* Inductor Color Rings: Brown, Black, Orange, Gold for 10mH */}
      {[-2.0, -0.7, 0.6, 1.9].map((rx, idx) => (
        <mesh key={idx} position={[rx, 4.5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[1.73, 1.73, 0.55, 24]} />
          <meshStandardMaterial
            color={idx === 0 ? '#78350F' : idx === 1 ? '#18181B' : idx === 2 ? '#EA580C' : '#EAB308'}
            metalness={idx === 3 ? 0.85 : 0.1}
            roughness={0.3}
          />
        </mesh>
      ))}

      {/* 2. Wire Leads (radius 0.38mm) with Zero Air Gap into Body */}
      {/* Left horizontal stem */}
      <mesh position={[-4.34, 4.5, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.silverLead}>
        <cylinderGeometry args={[0.38, 0.38, 1.5, 12]} />
      </mesh>
      {/* Left bent leg extending into breadboard hole */}
      <mesh position={[-5.08, -2.0, 0]} material={materials.silverLead}>
        <cylinderGeometry args={[0.38, 0.38, 13.0, 12]} />
      </mesh>

      {/* Right horizontal stem */}
      <mesh position={[4.34, 4.5, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.silverLead}>
        <cylinderGeometry args={[0.38, 0.38, 1.5, 12]} />
      </mesh>
      {/* Right bent leg extending into breadboard hole */}
      <mesh position={[5.08, -2.0, 0]} material={materials.silverLead}>
        <cylinderGeometry args={[0.38, 0.38, 13.0, 12]} />
      </mesh>

      {/* 3. Interactive Click/Hover Terminals with Generous Hit-Sphere & Hover Ring */}
      {pins.map((p) => {
        const isHovered = hoveredPin === p.name;
        return (
          <group key={p.name} position={[p.x, 0, 0]}>
            <mesh material={isHovered ? materials.pinHover : materials.silverLead}>
              <cylinderGeometry args={[isHovered ? 0.5 : 0.38, 0.38, 1.2, 12]} />
            </mesh>
            {isHovered && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
                <ringGeometry args={[0.6, 1.4, 24]} />
                <meshBasicMaterial color="#38BDF8" side={THREE.DoubleSide} />
              </mesh>
            )}
            <mesh
              renderOrder={100}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                const worldPos = new THREE.Vector3();
                e.object.getWorldPosition(worldPos);
                onPinClick?.(p.name, worldPos);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                onHoverPin?.(p.name);
              }}
              onPointerOut={() => onHoverPin?.(null)}
            >
              <sphereGeometry args={[1.8, 12, 12]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
