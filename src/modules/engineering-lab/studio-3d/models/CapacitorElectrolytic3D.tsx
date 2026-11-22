'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { BurnSmokeFX } from './BurnSmokeFX';

export interface CapacitorElectrolytic3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  value?: string;
  isBurned?: boolean;
  isSelected?: boolean;
  renderContext?: 'studio' | '3d-view';
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

/**
 * Hardware-grade Radial Electrolytic Aluminum Can Capacitor 3D Model
 * Cylindrical blue PVC jacket, safety relief vent score, negative stripe indicator,
 * and solid tinned copper leads with solder fillets.
 */
export function CapacitorElectrolytic3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isBurned = false,
  isSelected = false,
  renderContext = 'studio',
  onPinClick,
  hoveredPin,
  onHoverPin,
}: CapacitorElectrolytic3DProps) {
  const materials = useMemo(() => {
    return {
      canBody: new THREE.MeshStandardMaterial({
        color: isBurned ? '#18181B' : isSelected ? '#38BDF8' : '#1E3A8A',
        roughness: isBurned ? 0.95 : 0.35,
        metalness: 0.1,
      }),
      ventTop: new THREE.MeshStandardMaterial({
        color: isBurned ? '#52525B' : '#CBD5E1',
        metalness: isBurned ? 0.4 : 0.95,
        roughness: 0.2,
      }),
      stripe: new THREE.MeshStandardMaterial({
        color: isBurned ? '#3F3F46' : '#F1F5F9',
        roughness: 0.4,
      }),
      minusMark: new THREE.MeshBasicMaterial({
        color: isBurned ? '#18181B' : '#0F172A',
      }),
      plusMark: new THREE.MeshBasicMaterial({
        color: isBurned ? '#52525B' : '#10B981',
      }),
      leadMetal: new THREE.MeshStandardMaterial({
        color: isBurned ? '#71717A' : '#CBD5E1',
        metalness: isBurned ? 0.4 : 0.95,
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
  }, [isBurned, isSelected]);

  return (
    <group position={position} rotation={rotation}>
      {/* 3D Burnout Overheat FX & Smoke Particles */}
      {isBurned && <BurnSmokeFX position={[0, 9.3, 0]} heightOffset={1} />}

      {/* Blue Aluminum Electrolytic Can Body */}
      <mesh position={[0, 5.0, 0]} material={materials.canBody} castShadow>
        <cylinderGeometry args={[3.2, 3.2, 8.5, 24]} />
      </mesh>

      {/* Silver Metal Safety Vent Top with cross relief score */}
      <mesh position={[0, 9.3, 0]} material={materials.ventTop}>
        <cylinderGeometry args={[3.1, 3.1, 0.2, 24]} />
      </mesh>

      {/* Negative Polarity Stripe on the - lead side (+X: x = 3.15) */}
      <group position={[3.15, 5.0, 0]}>
        <mesh material={materials.stripe}>
          <boxGeometry args={[0.2, 8.5, 1.6]} />
        </mesh>
        {[-2.5, 0, 2.5].map((yOff, mi) => (
          <mesh key={mi} position={[0.12, yOff, 0]} material={materials.minusMark}>
            <boxGeometry args={[0.05, 0.35, 1.0]} />
          </mesh>
        ))}
      </group>

      {/* Positive "+" Polarity Symbol on Anode side (-X: x = -3.15) */}
      <group position={[-3.15, 5.0, 0]}>
        <mesh position={[-0.12, 0, 0]} material={materials.plusMark}>
          <boxGeometry args={[0.05, 0.3, 0.9]} />
        </mesh>
        <mesh position={[-0.12, 0, 0]} material={materials.plusMark}>
          <boxGeometry args={[0.05, 0.9, 0.3]} />
        </mesh>
      </group>

      {/* Solid Radial Metallic Leads (radius 0.38mm) */}
      {/* 1. Positive Anode Lead (+) at x = -2.54 */}
      <mesh position={[-1.77, 1.0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.leadMetal}>
        <cylinderGeometry args={[0.38, 0.38, 1.54, 12]} />
      </mesh>
      <mesh position={[-2.54, 1.0, 0]} material={materials.leadMetal}>
        <sphereGeometry args={[0.38, 8, 8]} />
      </mesh>
      <mesh position={[-2.54, -3.5, 0]} material={materials.leadMetal}>
        <cylinderGeometry args={[0.38, 0.38, 9.4, 12]} />
      </mesh>

      {/* 2. Negative Cathode Lead (-) at x = 2.54 */}
      <mesh position={[1.77, 1.0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.leadMetal}>
        <cylinderGeometry args={[0.38, 0.38, 1.54, 12]} />
      </mesh>
      <mesh position={[2.54, 1.0, 0]} material={materials.leadMetal}>
        <sphereGeometry args={[0.38, 8, 8]} />
      </mesh>
      <mesh position={[2.54, -3.1, 0]} material={materials.leadMetal}>
        <cylinderGeometry args={[0.38, 0.38, 8.6, 12]} />
      </mesh>

      {/* Solder Fillet Cones on PCB pads */}
      <mesh position={[-2.54, 0.15, 0]} material={materials.solderFillet}>
        <cylinderGeometry args={[0.55, 0.85, 0.3, 12]} />
      </mesh>
      <mesh position={[2.54, 0.15, 0]} material={materials.solderFillet}>
        <cylinderGeometry args={[0.55, 0.85, 0.3, 12]} />
      </mesh>

      {/* Interactive Raycast Hitboxes (Studio only) */}
      {renderContext === 'studio' &&
        [-2.54, 2.54].map((px, i) => {
          const pinId = i === 0 ? '+' : '-';
          const isHovered = hoveredPin === pinId;
          return (
            <group key={pinId} position={[px, 0, 0]}>
              <mesh material={isHovered ? materials.pinHover : materials.leadMetal}>
                <cylinderGeometry args={[isHovered ? 0.55 : 0.4, 0.4, 1.2, 12]} />
              </mesh>
              <mesh
                renderOrder={100}
                onClick={(e) => {
                  e.stopPropagation();
                  const w = new THREE.Vector3();
                  e.object.getWorldPosition(w);
                  onPinClick?.(pinId, w);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  onHoverPin?.(pinId);
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
