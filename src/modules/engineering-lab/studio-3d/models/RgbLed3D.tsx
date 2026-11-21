'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface RgbLed3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  isPowered?: boolean;
  color?: string; // e.g. '#EF4444', '#10B981', '#3B82F6', or '#A855F7'
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

export function RgbLed3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  isPowered = true,
  color = '#EC4899', // Default magenta mix
  onPinClick,
  hoveredPin,
  onHoverPin,
}: RgbLed3DProps) {
  const materials = useMemo(() => {
    return {
      lensActive: new THREE.MeshStandardMaterial({
        color: color,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0.85,
        roughness: 0.15,
      }),
      lensOff: new THREE.MeshStandardMaterial({
        color: isSelected ? '#BAE6FD' : '#E2E8F0',
        transparent: false,
        opacity: 0.92,
        depthWrite: true,
        roughness: 0.25,
      }),
      pinSilver: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.9,
        roughness: 0.2,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
      darkCollar: new THREE.MeshStandardMaterial({
        color: '#0F172A',
        roughness: 0.6,
      }),
    };
  }, [color, isSelected]);

  // Crisp silkscreen texture showing R - G B aligned with the 4 pins
  const silkscreenTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 504, 120);

    ctx.font = 'bold 58px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 4 pins mapped across span from -5.0mm to +5.0mm
    const labels = [
      { text: 'R', color: '#EF4444', x: ((-3.81 + 5.0) / 10.0) * 512 },
      { text: '-', color: '#94A3B8', x: ((-1.27 + 5.0) / 10.0) * 512 },
      { text: 'G', color: '#10B981', x: ((1.27 + 5.0) / 10.0) * 512 },
      { text: 'B', color: '#3B82F6', x: ((3.81 + 5.0) / 10.0) * 512 },
    ];

    labels.forEach((l) => {
      ctx.fillStyle = l.color;
      ctx.fillText(l.text, l.x, 64);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  // 4 Pins: R (Anode 1), C (Common Cathode / GND), G (Anode 2), B (Anode 3)
  // Inner stems emerge inside base (y = 2.0) at innerX and angle down to p.x at y = 0.6
  const pins = [
    { name: 'R', x: -3.81, innerX: -1.65, label: 'Red Anode' },
    { name: 'C', x: -1.27, innerX: -0.55, label: 'Cathode (GND)' },
    { name: 'G', x: 1.27, innerX: 0.55, label: 'Green Anode' },
    { name: 'B', x: 3.81, innerX: 1.65, label: 'Blue Anode' },
  ];

  return (
    <group position={position} rotation={rotation}>
      {/* 5mm Domed Epoxy Lens (Solid frosted milky epoxy when unpowered) */}
      <mesh position={[0, 4.5, 0]} material={isPowered ? materials.lensActive : materials.lensOff}>
        <cylinderGeometry args={[2.5, 2.5, 5.0, 24]} />
      </mesh>
      <mesh position={[0, 7.0, 0]} material={isPowered ? materials.lensActive : materials.lensOff}>
        <sphereGeometry args={[2.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>

      {/* Flange Collar at Base */}
      <mesh position={[0, 1.8, 0]} material={isPowered ? materials.lensActive : materials.lensOff}>
        <cylinderGeometry args={[2.9, 2.9, 0.6, 24]} />
      </mesh>

      {/* Crisp Dark Base Collar Silkscreen Strip showing R - G B */}
      {silkscreenTexture && (
        <mesh position={[0, 1.8, 2.92]}>
          <planeGeometry args={[9.2, 1.8]} />
          <meshBasicMaterial map={silkscreenTexture} />
        </mesh>
      )}

      {/* Emissive Point Light */}
      {isPowered && (
        <pointLight position={[0, 6.0, 0]} color={color} intensity={0.8} distance={25} />
      )}

      {/* 4 Connected Lead Wires with Zero Air Gap into LED Base */}
      {pins.map((p) => {
        const isHovered = hoveredPin === p.name;
        const stemHypot = Math.hypot(p.x - p.innerX, 1.4);
        const stemAngle = -Math.atan2(p.x - p.innerX, 1.4);

        return (
          <group key={p.name}>
            {/* 1. Upper Angled Stem: Emerging inside base at [innerX, 2.0, 0] down to [p.x, 0.6, 0] */}
            <mesh
              position={[(p.innerX + p.x) / 2, 1.3, 0]}
              rotation={[0, 0, stemAngle]}
              material={materials.pinSilver}
            >
              <cylinderGeometry args={[0.3, 0.3, stemHypot, 8]} />
            </mesh>

            {/* 2. Lower Vertical Leg: From [p.x, 0.6, 0] down to [p.x, -4.0, 0] */}
            <mesh position={[p.x, -1.7, 0]} material={materials.pinSilver}>
              <cylinderGeometry args={[0.3, 0.3, 4.6, 8]} />
            </mesh>

            {/* 3. Interactive Target at Breadboard Surface (y = 0) */}
            <mesh
              position={[p.x, 0, 0]}
              material={isHovered ? materials.pinHover : materials.pinSilver}
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
              <sphereGeometry args={[isHovered ? 1.0 : 0.55, 12, 12]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
