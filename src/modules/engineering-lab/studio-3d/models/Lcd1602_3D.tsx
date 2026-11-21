'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface Lcd1602_3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  isPowered?: boolean;
  displayText?: string;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

// 16 Standard HD44780 Pins
export const LCD_PINS = [
  'VSS', 'VDD', 'V0', 'RS', 'RW', 'E',
  'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7',
  'A', 'K'
];

/**
 * Hardware-grade 16x2 LCD Character Display Module (HD44780 Standard)
 * Flat Face-Up Workbench Orientation (XZ plane, thickness along Y):
 * - Green FR-4 PCB (80 x 36 x 1.6 mm) resting flat on floor (y = 0.8)
 * - 4 Corner mounting holes with brass ring pads
 * - Matte black stamped metal bezel (71 x 24 mm) at y = 2.6
 * - Backlit 16x2 character LCD glass facing +Y directly toward top-down camera (y = 4.4)
 * - 16-pin gold header along back edge (z = -14.0 mm, y = 2.8 to 7.8 mm)
 * - Silkscreen pin legend "1 VSS..K 16" facing +Y directly in front of header
 */
export function Lcd1602_3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  isPowered = true,
  displayText = 'EI HOUSE LAB 16x2\nSYSTEM READY OK',
  onPinClick,
  hoveredPin,
  onHoverPin,
}: Lcd1602_3DProps) {
  const materials = useMemo(() => {
    return {
      pcb: new THREE.MeshStandardMaterial({
        color: isSelected ? '#059669' : '#14532D', // Industrial green FR-4
        roughness: 0.4,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      bezel: new THREE.MeshStandardMaterial({
        color: '#0F172A', // Matte black stamped metal bezel
        roughness: 0.3,
        metalness: 0.6,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      headerInsulator: new THREE.MeshStandardMaterial({
        color: '#18181B', // Black plastic header insulator
        roughness: 0.8,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      pinGold: new THREE.MeshStandardMaterial({
        color: '#F59E0B', // Gold-plated square header pin
        metalness: 0.85,
        roughness: 0.2,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
      padBrass: new THREE.MeshStandardMaterial({
        color: '#D97706',
        metalness: 0.85,
        roughness: 0.25,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      holeDark: new THREE.MeshBasicMaterial({
        color: '#090D16',
      }),
    };
  }, [isSelected]);

  // Silkscreen strip showing "1 VSS VDD V0 RS RW E D0 D1 D2 D3 D4 D5 D6 D7 A K 16"
  const silkscreenTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 1024, 96);
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F8FAFC';

    const labels = [
      '1 VSS', 'VDD', 'V0', 'RS', 'RW', 'E',
      'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7',
      'A', 'K 16'
    ];

    labels.forEach((label, i) => {
      const px = -19.05 + i * 2.54;
      const cx = ((px + 20.75) / 41.5) * 1024;
      ctx.fillText(label, cx, 48);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  // 16x2 Backlit LCD Glass with 5x7 Dot-Matrix characters
  const lcdTextTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = isPowered ? '#0284C7' : '#082F49';
    ctx.fillRect(0, 0, 1024, 256);

    ctx.strokeStyle = isPowered ? '#38BDF8' : '#0E7490';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 1018, 250);

    const rawLines = (displayText || 'EI HOUSE LAB 16x2\nSYSTEM READY OK').split('\n');
    const lines = [
      (rawLines[0] || '').padEnd(16, ' ').slice(0, 16),
      (rawLines[1] || '').padEnd(16, ' ').slice(0, 16),
    ];

    for (let r = 0; r < 2; r++) {
      const lineText = lines[r];
      for (let c = 0; c < 16; c++) {
        const cellX = 32 + c * 59.5;
        const cellY = 28 + r * 106;
        const char = lineText[c] || ' ';

        ctx.fillStyle = isPowered ? 'rgba(3, 105, 161, 0.45)' : 'rgba(2, 44, 70, 0.45)';
        for (let dx = 0; dx < 5; dx++) {
          for (let dy = 0; dy < 7; dy++) {
            ctx.fillRect(cellX + dx * 9.5 + 4, cellY + dy * 11.5 + 6, 7.5, 9);
          }
        }

        if (char !== ' ' && isPowered) {
          ctx.fillStyle = '#F0F9FF';
          ctx.font = 'bold 54px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(char, cellX + 27, cellY + 45);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [displayText, isPowered]);

  // Corner mounting holes at 4 corners of PCB in XZ plane (80 x 36 mm)
  const mountingHoles = useMemo(() => [
    { x: -37.0, z: -15.0 },
    { x: 37.0, z: -15.0 },
    { x: -37.0, z: 15.0 },
    { x: 37.0, z: 15.0 },
  ], []);

  return (
    <group position={position} rotation={rotation}>
      {/* 1. Industrial Green FR4 PCB (80mm x 1.6mm x 36mm) Lying Flat on Floor (y = 0.8) */}
      <mesh position={[0, 0.8, 0]} material={materials.pcb} castShadow receiveShadow>
        <boxGeometry args={[80.0, 1.6, 36.0]} />
      </mesh>

      {/* 2. 4 Corner Mounting Holes with Brass Ring Pads */}
      {mountingHoles.map((h, i) => (
        <group key={i} position={[h.x, 0.8, h.z]}>
          <mesh material={materials.padBrass}>
            <cylinderGeometry args={[2.5, 2.5, 1.62, 16]} />
          </mesh>
          <mesh material={materials.holeDark}>
            <cylinderGeometry args={[1.5, 1.5, 1.64, 16]} />
          </mesh>
        </group>
      ))}

      {/* 3. Stamped Black Metal Bezel Frame Flat in XZ */}
      <mesh position={[0, 2.6, 2.0]} material={materials.bezel}>
        <boxGeometry args={[71.0, 3.5, 24.0]} />
      </mesh>

      {/* 4. Glowing 16x2 Backlit Display Glass Facing +Y Toward Top-Down Camera */}
      <mesh position={[0, 4.4, 2.0]}>
        <boxGeometry args={[64.5, 0.4, 16.0]} />
        {lcdTextTexture ? (
          <meshBasicMaterial map={lcdTextTexture} />
        ) : (
          <meshStandardMaterial color={isPowered ? '#0284C7' : '#0C4A6E'} roughness={0.2} />
        )}
      </mesh>

      {/* Display Plane Texture on Top Face */}
      {lcdTextTexture && (
        <mesh position={[0, 4.62, 2.0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[64.0, 15.6]} />
          <meshBasicMaterial map={lcdTextTexture} />
        </mesh>
      )}

      {/* Backlight glow */}
      {isPowered && (
        <pointLight position={[0, 8.0, 2.0]} color="#38BDF8" intensity={0.5} distance={35} />
      )}

      {/* 5. Crisp Silkscreen Pin Legend Strip Facing +Y directly in front of header */}
      {silkscreenTexture && (
        <mesh position={[-16.0, 1.62, -11.0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[41.5, 3.0]} />
          <meshBasicMaterial map={silkscreenTexture} transparent />
        </mesh>
      )}

      {/* 6. 16-Pin Header along back edge (z = -14.0mm, x center = -16.0mm) */}
      <group position={[-16.0, 2.8, -14.0]}>
        {/* Black plastic 16-pin header insulator strip */}
        <mesh position={[0, 0, 0]} material={materials.headerInsulator}>
          <boxGeometry args={[41.5, 2.5, 2.5]} />
        </mesh>

        {/* 16 Gold-plated Square Header Pins extending upward (+Y) */}
        {LCD_PINS.map((pinName, i) => {
          const isHovered = hoveredPin === pinName;
          const px = -19.05 + i * 2.54;
          return (
            <group key={pinName} position={[px, 0, 0]}>
              {/* Gold square pin extending out of insulator up to y = 5.0 */}
              <mesh position={[0, 2.5, 0]} material={materials.pinGold}>
                <boxGeometry args={[0.64, 5.0, 0.64]} />
              </mesh>

              {/* Interactive Target for Wire Routing at top of pin (y = 5.0) */}
              <mesh
                position={[0, 5.0, 0]}
                material={isHovered ? materials.pinHover : materials.pinGold}
                onClick={(e) => {
                  e.stopPropagation();
                  const worldPos = new THREE.Vector3();
                  e.object.getWorldPosition(worldPos);
                  onPinClick?.(pinName, worldPos);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  onHoverPin?.(pinName);
                }}
                onPointerOut={() => onHoverPin?.(null)}
              >
                <sphereGeometry args={[isHovered ? 1.2 : 0.65, 8, 8]} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}
