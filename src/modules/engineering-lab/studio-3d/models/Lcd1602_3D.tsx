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
        color: isSelected ? '#059669' : '#14532D', // Industrial green PCB
        roughness: 0.4,
      }),
      bezel: new THREE.MeshStandardMaterial({
        color: '#0F172A', // Matte black stamped metal bezel
        roughness: 0.3,
        metalness: 0.6,
      }),
      headerInsulator: new THREE.MeshStandardMaterial({
        color: '#18181B', // Black plastic header insulator
        roughness: 0.8,
      }),
      pinGold: new THREE.MeshStandardMaterial({
        color: '#F59E0B', // Gold-plated square header pin
        metalness: 0.85,
        roughness: 0.2,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
      padBrass: new THREE.MeshStandardMaterial({
        color: '#D97706',
        metalness: 0.85,
        roughness: 0.25,
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

    // Header total width 41.5mm, pins from -19.05 to +19.05
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

    // Background LCD glass
    ctx.fillStyle = isPowered ? '#0284C7' : '#082F49';
    ctx.fillRect(0, 0, 1024, 256);

    // Subtle bezel border inner glow
    ctx.strokeStyle = isPowered ? '#38BDF8' : '#0E7490';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 1018, 250);

    const rawLines = (displayText || 'EI HOUSE LAB 16x2\nSYSTEM READY OK').split('\n');
    const lines = [
      (rawLines[0] || '').padEnd(16, ' ').slice(0, 16),
      (rawLines[1] || '').padEnd(16, ' ').slice(0, 16),
    ];

    // Draw 2 rows x 16 character cells with 5x7 dot-matrix style
    for (let r = 0; r < 2; r++) {
      const lineText = lines[r];
      for (let c = 0; c < 16; c++) {
        const cellX = 32 + c * 59.5;
        const cellY = 28 + r * 106;
        const char = lineText[c] || ' ';

        // Faint 5x7 inactive dot matrix background in each cell
        ctx.fillStyle = isPowered ? 'rgba(3, 105, 161, 0.45)' : 'rgba(2, 44, 70, 0.45)';
        for (let dx = 0; dx < 5; dx++) {
          for (let dy = 0; dy < 7; dy++) {
            ctx.fillRect(cellX + dx * 9.5 + 4, cellY + dy * 11.5 + 6, 7.5, 9);
          }
        }

        // Active character glyph in bright contrast cyan/white
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

  // Corner mounting holes at 4 corners of PCB (80 x 36 mm)
  const mountingHoles = useMemo(() => [
    { x: -37.0, y: 3.0 },
    { x: 37.0, y: 3.0 },
    { x: -37.0, y: 33.0 },
    { x: 37.0, y: 33.0 },
  ], []);

  return (
    <group position={position} rotation={rotation}>
      {/* 1. Industrial Green FR4 PCB (80mm x 36mm x 1.6mm) */}
      <mesh position={[0, 18.0, 0]} material={materials.pcb} castShadow receiveShadow>
        <boxGeometry args={[80.0, 36.0, 1.6]} />
      </mesh>

      {/* 2. 4 Corner Mounting Holes with Brass Ring Pads */}
      {mountingHoles.map((h, i) => (
        <group key={i} position={[h.x, h.y, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.padBrass}>
            <cylinderGeometry args={[2.5, 2.5, 1.62, 16]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.holeDark}>
            <cylinderGeometry args={[1.5, 1.5, 1.64, 16]} />
          </mesh>
        </group>
      ))}

      {/* 3. Stamped Black Metal Bezel Frame */}
      <mesh position={[0, 18.0, 2.5]} material={materials.bezel}>
        <boxGeometry args={[71.0, 24.0, 3.5]} />
      </mesh>

      {/* 4. Glowing 16x2 Backlit Display Glass with Dot-Matrix Texture */}
      <mesh position={[0, 18.0, 4.3]}>
        <boxGeometry args={[64.5, 16.0, 0.4]} />
        {lcdTextTexture ? (
          <meshBasicMaterial map={lcdTextTexture} />
        ) : (
          <meshStandardMaterial color={isPowered ? '#0284C7' : '#0C4A6E'} roughness={0.2} />
        )}
      </mesh>

      {/* Backlight glow */}
      {isPowered && (
        <pointLight position={[0, 18.0, 8.0]} color="#38BDF8" intensity={0.4} distance={30} />
      )}

      {/* 5. Crisp Silkscreen Pin Legend Strip below 16-pin Header */}
      {silkscreenTexture && (
        <mesh position={[-16.0, 31.0, 0.82]}>
          <planeGeometry args={[41.5, 3.0]} />
          <meshBasicMaterial map={silkscreenTexture} transparent />
        </mesh>
      )}

      {/* 6. 16-Pin Header moved cleanly to [-16.0, 33.5, 0] */}
      {/* Pin 1 (VSS) is at -35.05mm (5mm inside -40mm left edge), Pin 16 (K) at +3.05mm */}
      <group position={[-16.0, 33.5, 0]}>
        {/* Black plastic 16-pin header insulator strip */}
        <mesh position={[0, 0, 0]} material={materials.headerInsulator}>
          <boxGeometry args={[41.5, 2.5, 2.5]} />
        </mesh>

        {/* 16 Gold-plated Square Header Pins with Pin Targets */}
        {LCD_PINS.map((pinName, i) => {
          const isHovered = hoveredPin === pinName;
          const px = -19.05 + i * 2.54;
          return (
            <group key={pinName} position={[px, 0, 0]}>
              {/* Gold square pin extending out of insulator */}
              <mesh position={[0, 1.25, 0]} material={materials.pinGold}>
                <boxGeometry args={[0.64, 5.0, 0.64]} />
              </mesh>

              {/* Interactive Target for Wire Routing */}
              <mesh
                position={[0, 3.2, 0]}
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
