'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface Diode3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

export function Diode3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: Diode3DProps) {
  const materials = useMemo(() => {
    return {
      body: new THREE.MeshStandardMaterial({
        color: isSelected ? '#38BDF8' : '#18181B', // Black molded DO-41 body
        roughness: 0.4,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      cathodeBand: new THREE.MeshStandardMaterial({
        color: '#E2E8F0', // Silver cathode band
        roughness: 0.3,
        metalness: 0.8,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      lead: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.9,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, [isSelected]);

  // Silkscreen "1N4007" part marking on DO-41 body
  const silkscreenTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, 256, 128);
    ctx.fillStyle = '#CBD5E1';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1N4007', 128, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  // Anode at -5.08, Cathode at 5.08
  const pins = [
    { name: '1', label: 'Anode (+)', x: -5.08 },
    { name: '2', label: 'Cathode (-)', x: 5.08 },
  ];

  return (
    <group position={position} rotation={rotation}>
      {/* Cylindrical DO-41 Body (approx 4.5mm length x 2.6mm dia) */}
      <mesh position={[0, 4.0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.body}>
        <cylinderGeometry args={[1.3, 1.3, 5.0, 24]} />
      </mesh>

      {/* Cathode Polarity Stripe on the positive X side */}
      <mesh position={[1.6, 4.0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.cathodeBand}>
        <cylinderGeometry args={[1.32, 1.32, 1.0, 24]} />
      </mesh>

      {/* Laser-etched Part Marking "1N4007" */}
      {silkscreenTexture && (
        <mesh position={[-0.4, 4.0, 1.32]}>
          <planeGeometry args={[2.8, 1.4]} />
          <meshBasicMaterial map={silkscreenTexture} transparent />
        </mesh>
      )}

      {/* Bent Wire Leads */}
      {pins.map((p) => {
        const isHovered = hoveredPin === p.name;
        return (
          <group key={p.name}>
            {/* Horizontal lead segment */}
            <mesh position={[p.x / 2, 4.0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.lead}>
              <cylinderGeometry args={[0.3, 0.3, Math.abs(p.x), 8]} />
            </mesh>
            {/* Vertical lead leg extending down through breadboard hole to y = -8.0 */}
            <mesh position={[p.x, -2.0, 0]} material={materials.lead}>
              <cylinderGeometry args={[0.3, 0.3, 12.0, 8]} />
            </mesh>
            {/* Click target with Generous Hit-Sphere & Hover Ring */}
            <group position={[p.x, 0, 0]}>
              <mesh material={isHovered ? materials.pinHover : materials.lead}>
                <sphereGeometry args={[isHovered ? 0.9 : 0.6, 12, 12]} />
              </mesh>
              {isHovered && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
                  <ringGeometry args={[0.6, 1.4, 24]} />
                  <meshBasicMaterial color="#38BDF8" side={THREE.DoubleSide} />
                </mesh>
              )}
              {/* Generous Raycast Hit-Sphere */}
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
          </group>
        );
      })}
    </group>
  );
}
