'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { BurnSmokeFX } from './BurnSmokeFX';

export interface CapacitorCeramic3DProps {
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
 * Hardware-grade Ceramic Disc Capacitor 3D Model
 * Upright tan disc, laser-etched "104" capacitance marking, solid metallic leads with elbow joints,
 * and shiny solder fillets.
 */
export function CapacitorCeramic3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isBurned = false,
  isSelected = false,
  renderContext = 'studio',
  onPinClick,
  hoveredPin,
  onHoverPin,
}: CapacitorCeramic3DProps) {
  const materials = useMemo(() => {
    return {
      discBody: new THREE.MeshStandardMaterial({
        color: isBurned ? '#18181B' : isSelected ? '#38BDF8' : '#D97706',
        roughness: isBurned ? 0.95 : 0.6,
        metalness: 0.1,
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

  // Laser-etched "104" or value text decal
  const laserTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 128, 64);
    ctx.fillStyle = isBurned ? '#3F3F46' : '#78350F';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('104', 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [isBurned]);

  return (
    <group position={position} rotation={rotation}>
      {/* 3D Burnout Overheat FX & Smoke Particles */}
      {isBurned && <BurnSmokeFX position={[0, 4.5, 0]} heightOffset={1} />}

      {/* Tan Ceramic Disc Body (Upright along XZ, flat circular face along Z) */}
      <mesh position={[0, 4.5, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.discBody} castShadow>
        <cylinderGeometry args={[2.5, 2.5, 1.2, 28]} />
      </mesh>

      {/* Laser-etched "104" stamp on front face */}
      {laserTexture && (
        <mesh position={[0, 4.5, 0.62]}>
          <planeGeometry args={[3.2, 1.8]} />
          <meshBasicMaterial map={laserTexture} transparent depthWrite={false} />
        </mesh>
      )}

      {/* Solid Angled Lead Stems with Seamless Elbow Spheres (radius 0.38mm) */}
      {/* Pin 1 at x = -2.54: angled from disc body at x = -1.0 down to x = -2.54 at y = 1.6 */}
      <mesh position={[-1.77, 2.4, 0]} rotation={[0, 0, -Math.atan2(1.54, 1.6)]} material={materials.leadMetal}>
        <cylinderGeometry args={[0.35, 0.35, 2.22, 10]} />
      </mesh>
      <mesh position={[-2.54, 1.6, 0]} material={materials.leadMetal}>
        <sphereGeometry args={[0.35, 8, 8]} />
      </mesh>
      {/* Pin 1 vertical leg extending through PCB/breadboard hole down to y = -5.3mm */}
      <mesh position={[-2.54, -1.8, 0]} material={materials.leadMetal}>
        <cylinderGeometry args={[0.35, 0.35, 7.0, 10]} />
      </mesh>

      {/* Pin 2 at x = 2.54: angled from disc body at x = 1.0 down to x = 2.54 at y = 1.6 */}
      <mesh position={[1.77, 2.4, 0]} rotation={[0, 0, Math.atan2(1.54, 1.6)]} material={materials.leadMetal}>
        <cylinderGeometry args={[0.35, 0.35, 2.22, 10]} />
      </mesh>
      <mesh position={[2.54, 1.6, 0]} material={materials.leadMetal}>
        <sphereGeometry args={[0.35, 8, 8]} />
      </mesh>
      {/* Pin 2 vertical leg extending through PCB/breadboard hole down to y = -5.3mm */}
      <mesh position={[2.54, -1.8, 0]} material={materials.leadMetal}>
        <cylinderGeometry args={[0.35, 0.35, 7.0, 10]} />
      </mesh>

      {/* Solder Fillet Cones on PCB pads */}
      <mesh position={[-2.54, 0.15, 0]} material={materials.solderFillet}>
        <cylinderGeometry args={[0.5, 0.75, 0.3, 12]} />
      </mesh>
      <mesh position={[2.54, 0.15, 0]} material={materials.solderFillet}>
        <cylinderGeometry args={[0.5, 0.75, 0.3, 12]} />
      </mesh>

      {/* Interactive Hitboxes (Studio only) */}
      {renderContext === 'studio' &&
        [-2.54, 2.54].map((px, i) => {
          const pinId = String(i + 1);
          const isHovered = hoveredPin === pinId;
          return (
            <group key={pinId} position={[px, 0, 0]}>
              <mesh material={isHovered ? materials.pinHover : materials.leadMetal}>
                <cylinderGeometry args={[isHovered ? 0.5 : 0.35, 0.35, 1.2, 10]} />
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
                <sphereGeometry args={[1.6, 10, 10]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            </group>
          );
        })}
    </group>
  );
}
