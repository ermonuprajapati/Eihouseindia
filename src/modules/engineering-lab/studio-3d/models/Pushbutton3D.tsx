'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface Pushbutton3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isPressed?: boolean;
  isSelected?: boolean;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

export function Pushbutton3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isPressed = false,
  isSelected = false,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: Pushbutton3DProps) {
  const materials = useMemo(() => {
    return {
      metalBracket: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.9,
        roughness: 0.2,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      bodyPlastic: new THREE.MeshStandardMaterial({
        color: '#1E293B',
        roughness: 0.5,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      buttonPlunger: new THREE.MeshStandardMaterial({
        color: '#0284C7',
        roughness: 0.3,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, []);

  // 4 Pins: 6mm x 6mm button with breadboard pin span
  const P_1A: [number, number, number] = [-2.54, -4, -2.54];
  const P_1B: [number, number, number] = [2.54, -4, -2.54];
  const P_2A: [number, number, number] = [-2.54, -4, 2.54];
  const P_2B: [number, number, number] = [2.54, -4, 2.54];

  return (
    <group position={position} rotation={rotation}>
      {/* Selection Box */}
      {isSelected && (
        <mesh position={[0, 2, 0]}>
          <boxGeometry args={[8, 8, 8]} />
          <meshBasicMaterial color="#38BDF8" wireframe />
        </mesh>
      )}

      {/* Main Square Plastic Body (6mm x 6mm x 3.5mm) */}
      <mesh position={[0, 1.75, 0]} material={materials.bodyPlastic} castShadow>
        <boxGeometry args={[6, 3.5, 6]} />
      </mesh>

      {/* Top Metallic Snap Cover Plate */}
      <mesh position={[0, 3.55, 0]} material={materials.metalBracket}>
        <boxGeometry args={[6.1, 0.2, 6.1]} />
      </mesh>

      {/* Cylindrical Button Plunger (Depresses slightly when pressed) */}
      <mesh position={[0, isPressed ? 4.2 : 4.8, 0]} material={materials.buttonPlunger} castShadow>
        <cylinderGeometry args={[1.6, 1.6, 2.2, 16]} />
      </mesh>

      {/* 4 Metallic Terminal Legs */}
      {[
        { name: '1A', pos: P_1A },
        { name: '1B', pos: P_1B },
        { name: '2A', pos: P_2A },
        { name: '2B', pos: P_2B },
      ].map((pin) => {
        const isHovered = hoveredPin === pin.name;
        return (
          <group key={pin.name}>
            {/* Lead leg wire */}
            <mesh position={[pin.pos[0], -2, pin.pos[2]]} material={materials.metalBracket}>
              <cylinderGeometry args={[0.25, 0.25, 4, 8]} />
            </mesh>
            {/* Clickable Terminal Sphere */}
            <mesh
              position={pin.pos}
              material={isHovered ? materials.pinHover : materials.metalBracket}
              onClick={(e) => {
                e.stopPropagation();
                const w = new THREE.Vector3();
                e.object.getWorldPosition(w);
                onPinClick?.(pin.name, w);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                onHoverPin?.(pin.name);
              }}
              onPointerOut={() => onHoverPin?.(null)}
            >
              <sphereGeometry args={[0.7, 10, 10]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
