'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface RgbLed3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  isPowered?: boolean;
  color?: string; // e.g. '#EF4444', '#10B981', '#3B82F6', or '#A855F7'
  rLevel?: number; // 0..1 independent Red channel
  gLevel?: number; // 0..1 independent Green channel
  bLevel?: number; // 0..1 independent Blue channel
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

export function RgbLed3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  isPowered = true,
  color = '#EC4899', // Default fallback
  rLevel,
  gLevel,
  bLevel,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: RgbLed3DProps) {
  // 1. Independent 3-Channel Color Mixing (rLevel, gLevel, bLevel in 0..1)
  const { effectiveColor, hasEmission, intensity } = useMemo(() => {
    let r = 0;
    let g = 0;
    let b = 0;

    if (rLevel !== undefined || gLevel !== undefined || bLevel !== undefined) {
      r = Math.min(1, Math.max(0, rLevel ?? 0));
      g = Math.min(1, Math.max(0, gLevel ?? 0));
      b = Math.min(1, Math.max(0, bLevel ?? 0));
    } else {
      // Parse static hex color
      const parsed = new THREE.Color(color || '#EC4899');
      r = parsed.r;
      g = parsed.g;
      b = parsed.b;
    }

    const maxChan = Math.max(r, g, b);
    const emitting = isPowered && maxChan > 0.01;
    const finalColor = new THREE.Color(r, g, b);

    return {
      effectiveColor: finalColor,
      hasEmission: emitting,
      intensity: maxChan,
    };
  }, [rLevel, gLevel, bLevel, color, isPowered]);

  const materials = useMemo(() => {
    return {
      lensActive: new THREE.MeshStandardMaterial({
        color: effectiveColor,
        emissive: effectiveColor,
        emissiveIntensity: Math.max(0.65, intensity * 1.3),
        transparent: true,
        opacity: 0.90,
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
  }, [effectiveColor, intensity, isSelected]);

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
    { name: 'R', aliases: ['r', 'R', '1', 'red'], x: -3.81, innerX: -1.65, label: 'Red Anode (R)' },
    { name: 'C', aliases: ['c', 'C', 'cc', '2', 'com', 'gnd', '-'], x: -1.27, innerX: -0.55, label: 'Cathode (GND)' },
    { name: 'G', aliases: ['g', 'G', '3', 'green'], x: 1.27, innerX: 0.55, label: 'Green Anode (G)' },
    { name: 'B', aliases: ['b', 'B', '4', 'blue'], x: 3.81, innerX: 1.65, label: 'Blue Anode (B)' },
  ];

  return (
    <group position={position} rotation={rotation}>
      {/* 5mm Domed Epoxy Lens (Frosted milky epoxy when unpowered, glowing mixed RGB when powered) */}
      <mesh position={[0, 4.5, 0]} material={hasEmission ? materials.lensActive : materials.lensOff}>
        <cylinderGeometry args={[2.5, 2.5, 5.0, 24]} />
      </mesh>
      <mesh position={[0, 7.0, 0]} material={hasEmission ? materials.lensActive : materials.lensOff}>
        <sphereGeometry args={[2.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>

      {/* Flange Collar at Base */}
      <mesh position={[0, 1.8, 0]} material={hasEmission ? materials.lensActive : materials.lensOff}>
        <cylinderGeometry args={[2.9, 2.9, 0.6, 24]} />
      </mesh>

      {/* Crisp Dark Base Collar Silkscreen Strip showing R - G B */}
      {silkscreenTexture && (
        <mesh position={[0, 1.8, 2.92]}>
          <planeGeometry args={[9.2, 1.8]} />
          <meshBasicMaterial map={silkscreenTexture} />
        </mesh>
      )}

      {/* Emissive Point Light casting the mixed color into the scene */}
      {hasEmission && (
        <pointLight position={[0, 6.0, 0]} color={effectiveColor} intensity={Math.max(0.8, intensity * 1.8)} distance={28} />
      )}

      {/* 4 Connected Lead Wires with Zero Air Gap into LED Base */}
      {pins.map((p) => {
        const isHovered = hoveredPin === p.name || (hoveredPin && p.aliases.includes(hoveredPin.toLowerCase()));
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

            {/* 2. Lower Vertical Leg: From [p.x, 0.6, 0] down into breadboard holes (y = -8.0) */}
            <mesh position={[p.x, -3.7, 0]} material={materials.pinSilver}>
              <cylinderGeometry args={[0.3, 0.3, 8.6, 8]} />
            </mesh>

            {/* 3. Interactive Target with Generous Hit-Sphere & Hover Ring */}
            <group position={[p.x, 0, 0]}>
              <mesh material={isHovered ? materials.pinHover : materials.pinSilver}>
                <cylinderGeometry args={[isHovered ? 0.45 : 0.35, 0.35, 1.2, 12]} />
              </mesh>
              {isHovered && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
                  <ringGeometry args={[0.5, 1.3, 24]} />
                  <meshBasicMaterial color="#38BDF8" side={THREE.DoubleSide} />
                </mesh>
              )}
              {/* Invisible Hit-Sphere */}
              <mesh
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
