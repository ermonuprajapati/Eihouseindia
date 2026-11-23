'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface TransistorTO220_3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  partName?: string; // e.g. 'IRF540N', 'IRF9540N', 'LM7805'
  pinLabels?: [string, string, string]; // e.g. ['G', 'D', 'S'] or ['IN', 'GND', 'OUT']
  isSelected?: boolean;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

/**
 * Hardware-grade TO-220 Power Package 3D Model
 * Metallic heatsink tab with mounting hole, molded black epoxy body,
 * laser-etched silkscreen, and 3 robust metallic leads at 2.54mm pitch.
 */
export function TransistorTO220_3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  partName = 'IRF540N',
  pinLabels = ['G', 'D', 'S'],
  isSelected = false,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: TransistorTO220_3DProps) {
  const materials = useMemo(() => {
    return {
      heatsinkTab: new THREE.MeshStandardMaterial({
        color: '#D1D5DB', // Stamped aluminum / nickel-plated copper tab
        metalness: 0.95,
        roughness: 0.2,
      }),
      bodyBlack: new THREE.MeshStandardMaterial({
        color: isSelected ? '#38BDF8' : '#18181B', // Molded epoxy body
        roughness: 0.6,
        metalness: 0.1,
      }),
      silverLead: new THREE.MeshStandardMaterial({
        color: '#d4dce6',
        metalness: 0.88,
        roughness: 0.22,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, [isSelected]);

  // Silkscreen texture on front face
  const silkscreenTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#18181B';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#27272A';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 500);

    ctx.fillStyle = '#E2E8F0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 54px monospace';
    ctx.fillText(partName.toUpperCase(), 256, 160);

    ctx.font = '32px monospace';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('HEXFET POWER', 256, 250);

    // Pinout labels
    ctx.font = 'bold 56px monospace';
    ctx.fillStyle = '#38BDF8';
    ctx.fillText(pinLabels[0], 95, 410);
    ctx.fillStyle = '#F59E0B';
    ctx.fillText(pinLabels[1], 256, 410);
    ctx.fillStyle = '#10B981';
    ctx.fillText(pinLabels[2], 417, 410);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [partName, pinLabels]);

  // 3 Pins at standard 2.54mm breadboard pitch: Pin 1 at -2.54, Pin 2 at 0, Pin 3 at 2.54
  // Standard TO-220 body: 10mm wide x 9mm high x 4.5mm deep, centered at y = 6.5
  // Tab extends from y = 11.0 to y = 17.0 (height 6mm)
  const pins = [
    { name: pinLabels[0].toLowerCase(), label: pinLabels[0], x: -2.54 },
    { name: pinLabels[1].toLowerCase(), label: pinLabels[1], x: 0 },
    { name: pinLabels[2].toLowerCase(), label: pinLabels[2], x: 2.54 },
  ];

  return (
    <group position={position} rotation={rotation}>
      {/* 1. Metal Heatsink Backplate & Tab (10.2mm x 15mm x 1.3mm) with hole */}
      <mesh position={[0, 9.5, -2.2]} material={materials.heatsinkTab} castShadow>
        <boxGeometry args={[10.2, 15.0, 1.3]} />
      </mesh>
      {/* Tab Mounting Hole (3.6mm dia) */}
      <mesh position={[0, 14.5, -2.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.8, 1.8, 1.35, 24]} />
        <meshBasicMaterial color="#090D16" />
      </mesh>

      {/* 2. Molded Black Epoxy Lower Body (10.0mm x 9.0mm x 3.2mm) */}
      <mesh position={[0, 6.5, 0.0]} material={materials.bodyBlack} castShadow>
        <boxGeometry args={[10.0, 9.0, 3.2]} />
      </mesh>

      {/* 3. Laser-etched Silkscreen on Front Face */}
      {silkscreenTexture && (
        <mesh position={[0, 6.5, 1.62]}>
          <planeGeometry args={[9.4, 8.4]} />
          <meshBasicMaterial map={silkscreenTexture} />
        </mesh>
      )}

      {/* 4. 3 Robust Rectangular Metallic Leads entering body at y = 4.0 and extending into breadboard (z = 0) */}
      {pins.map((p) => {
        const isHovered = hoveredPin === p.name || hoveredPin === p.label || (hoveredPin && hoveredPin.toLowerCase() === p.name);

        return (
          <group key={p.name}>
            {/* Lead shank extending from y = 4.0 down into breadboard to y = -7.0 */}
            <mesh position={[p.x, -1.5, 0.0]} material={materials.silverLead}>
              <boxGeometry args={[0.7, 11.0, 0.5]} />
            </mesh>

            {/* Interactive Pin with Generous Hit-Sphere & Hover Highlight Ring */}
            <group position={[p.x, 0, 0.0]}>
              <mesh material={isHovered ? materials.pinHover : materials.silverLead}>
                <sphereGeometry args={[isHovered ? 0.9 : 0.6, 12, 12]} />
              </mesh>
              {isHovered && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
                  <ringGeometry args={[0.5, 1.3, 24]} />
                  <meshBasicMaterial color="#38BDF8" side={THREE.DoubleSide} />
                </mesh>
              )}
              {/* Invisible Hit-Sphere */}
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
