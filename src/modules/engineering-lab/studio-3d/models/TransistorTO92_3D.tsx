'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface TransistorTO92_3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  partName?: string; // e.g. '2N2222', 'BC547', '2N2907'
  isNpn?: boolean;
  isSelected?: boolean;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

/**
 * Hardware-grade TO-92 Transistor 3D Model
 * Solid epoxy semi-cylindrical body with flat front face, laser-etched silkscreen,
 * and 3 metallic pins (E, B, C) seated into breadboard at 2.54mm pitch (zero air gap).
 */
export function TransistorTO92_3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  partName = '2N2222A',
  isNpn = true,
  isSelected = false,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: TransistorTO92_3DProps) {
  const materials = useMemo(() => {
    return {
      bodyBlack: new THREE.MeshStandardMaterial({
        color: isSelected ? '#38BDF8' : '#18181B', // Matte black molded epoxy TO-92 body
        roughness: 0.6,
        metalness: 0.1,
      }),
      silverLead: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.95,
        roughness: 0.15,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, [isSelected]);

  // Crisp silkscreen on flat front face showing part number and pinout (E B C)
  const silkscreenTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#18181B';
    ctx.fillRect(0, 0, 512, 512);

    // Border line
    ctx.strokeStyle = '#27272A';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 500);

    // Manufacturer logo & Part Name
    ctx.fillStyle = '#E2E8F0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 56px monospace';
    ctx.fillText(partName.toUpperCase(), 256, 160);

    ctx.font = '36px monospace';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(isNpn ? 'NPN SILICON' : 'PNP SILICON', 256, 250);

    // Pinout legend aligned with 3 pins: E, B, C
    ctx.font = 'bold 54px monospace';
    ctx.fillStyle = '#38BDF8';
    ctx.fillText('E', 100, 410);
    ctx.fillStyle = '#F59E0B';
    ctx.fillText('B', 256, 410);
    ctx.fillStyle = '#10B981';
    ctx.fillText('C', 412, 410);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [partName, isNpn]);

  // 3 Pins at standard 2.54mm breadboard pitch: Emitter at -2.54, Base at 0, Collector at +2.54
  // Standard TO-92 package dimensions: 4.8mm wide x 4.8mm high x 3.8mm deep
  // Body center at y = 5.0 (height 4.8mm spans from y = 2.6 to y = 7.4)
  const pins = [
    { name: 'e', alias: 'Emitter', x: -2.54, innerX: -1.27 },
    { name: 'b', alias: 'Base', x: 0, innerX: 0 },
    { name: 'c', alias: 'Collector', x: 2.54, innerX: 1.27 },
  ];

  return (
    <group position={position} rotation={rotation}>
      {/* 1. TO-92 Semi-Cylindrical Body (Half Cylinder + Flat Front Face) */}
      {/* Curved back half */}
      <mesh position={[0, 5.0, -0.6]} rotation={[0, 0, 0]} material={materials.bodyBlack} castShadow>
        <cylinderGeometry args={[2.4, 2.4, 4.8, 24, 1, false, Math.PI / 2, Math.PI]} />
      </mesh>
      {/* Front flat block */}
      <mesh position={[0, 5.0, 0.6]} material={materials.bodyBlack} castShadow>
        <boxGeometry args={[4.8, 4.8, 1.2]} />
      </mesh>

      {/* 2. Flat Front Silkscreen Plate */}
      {silkscreenTexture && (
        <mesh position={[0, 5.0, 1.22]}>
          <planeGeometry args={[4.6, 4.6]} />
          <meshBasicMaterial map={silkscreenTexture} />
        </mesh>
      )}

      {/* 3. 3 Metallic Leads entering body at y = 3.2mm and extending down into breadboard holes (y = -4.0mm) */}
      {pins.map((p) => {
        const isHovered = hoveredPin === p.name || hoveredPin === p.alias || (hoveredPin && hoveredPin.toLowerCase() === p.name);
        const stemHypot = Math.hypot(p.x - p.innerX, 1.6);
        const stemAngle = -Math.atan2(p.x - p.innerX, 1.6);

        return (
          <group key={p.name}>
            {/* Upper stem penetrating inside TO-92 body at y = 3.2 down to y = 1.6 */}
            <mesh
              position={[(p.innerX + p.x) / 2, 2.4, 0]}
              rotation={[0, 0, stemAngle]}
              material={materials.silverLead}
            >
              <cylinderGeometry args={[0.3, 0.3, stemHypot, 8]} />
            </mesh>

            {/* Vertical shank extending from y = 1.6 down into breadboard holes (y = -7.0) */}
            <mesh position={[p.x, -2.7, 0]} material={materials.silverLead}>
              <cylinderGeometry args={[0.3, 0.3, 8.6, 8]} />
            </mesh>

            {/* Interactive Pin Click/Hover Target at breadboard surface (y = 0) */}
            <mesh
              position={[p.x, 0, 0]}
              material={isHovered ? materials.pinHover : materials.silverLead}
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
              <sphereGeometry args={[isHovered ? 0.95 : 0.55, 12, 12]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
