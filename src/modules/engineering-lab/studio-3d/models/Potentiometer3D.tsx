'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface Potentiometer3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  value?: string;
  renderContext?: 'studio' | '3d-view';
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

/**
 * Hardware-grade Blue Square Potentiometer / Rotary Trimmer 3D Model
 * Blue plastic body, knurled brass adjustment shaft, top rotor cap,
 * 3 solid metallic terminal leads, and solder fillets.
 */
export function Potentiometer3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  renderContext = 'studio',
  onPinClick,
  onHoverPin,
}: Potentiometer3DProps) {
  const materials = useMemo(() => {
    return {
      bodyBlue: new THREE.MeshStandardMaterial({
        color: isSelected ? '#38BDF8' : '#1E40AF',
        roughness: 0.35,
        metalness: 0.1,
      }),
      shaftBrass: new THREE.MeshStandardMaterial({
        color: '#EAB308',
        metalness: 0.9,
        roughness: 0.25,
      }),
      knobCap: new THREE.MeshStandardMaterial({
        color: '#2563EB',
        roughness: 0.4,
      }),
      leadMetal: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.95,
        roughness: 0.18,
      }),
      solderFillet: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.95,
        roughness: 0.18,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, [isSelected]);

  const pins = [
    { id: '1', x: -2.54, z: 0 },
    { id: '2', x: 0, z: 2.54 }, // Wiper pin offset
    { id: '3', x: 2.54, z: 0 },
  ];

  return (
    <group position={position} rotation={rotation}>
      {/* Blue rectangular housing (9.5mm x 9.5mm x 9.5mm) */}
      <mesh position={[0, 4.75, 0]} material={materials.bodyBlue} castShadow>
        <boxGeometry args={[9.5, 9.5, 9.5]} />
      </mesh>

      {/* Brass shaft */}
      <mesh position={[0, 11.0, 0]} material={materials.shaftBrass}>
        <cylinderGeometry args={[2.5, 2.5, 4.5, 16]} />
      </mesh>

      {/* Blue knob cap with screwdriver slot */}
      <mesh position={[0, 14.0, 0]} material={materials.knobCap}>
        <cylinderGeometry args={[4.8, 4.8, 3.0, 24]} />
      </mesh>
      <mesh position={[0, 15.4, 0]} material={materials.shaftBrass}>
        <boxGeometry args={[6.0, 0.4, 1.0]} />
      </mesh>

      {/* 3 Solid Metallic Leads extending through PCB pads */}
      {pins.map((p) => (
        <group key={p.id}>
          {/* Vertical lead leg */}
          <mesh position={[p.x, -1.5, p.z]} material={materials.leadMetal}>
            <cylinderGeometry args={[0.35, 0.35, 6.0, 8]} />
          </mesh>

          {/* Solder Fillet cone on PCB pad */}
          <mesh position={[p.x, 0.15, p.z]} material={materials.solderFillet}>
            <cylinderGeometry args={[0.55, 0.85, 0.3, 12]} />
          </mesh>

          {/* Interactive target (Studio only) */}
          {renderContext === 'studio' && (
            <mesh
              position={[p.x, 0, p.z]}
              renderOrder={100}
              onClick={(e) => {
                e.stopPropagation();
                const w = new THREE.Vector3();
                e.object.getWorldPosition(w);
                onPinClick?.(p.id, w);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                onHoverPin?.(p.id);
              }}
              onPointerOut={() => onHoverPin?.(null)}
            >
              <sphereGeometry args={[1.6, 10, 10]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
