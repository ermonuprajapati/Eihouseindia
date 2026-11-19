'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface Battery9V3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

export function Battery9V3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: Battery9V3DProps) {
  const materials = useMemo(() => {
    return {
      body: new THREE.MeshStandardMaterial({
        color: '#1E293B',
        roughness: 0.4,
      }),
      goldLabel: new THREE.MeshStandardMaterial({
        color: '#D97706',
        roughness: 0.3,
        metalness: 0.3,
      }),
      snapMetal: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.95,
        roughness: 0.15,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, []);

  const silkscreenTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Dark background with metallic gold upper band
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 512, 1024);

    // Golden brand band
    ctx.fillStyle = '#D97706';
    ctx.fillRect(0, 0, 512, 340);

    // Gold highlight line
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(0, 340, 512, 16);

    // Typography
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';

    // 9V Bold
    ctx.font = 'bold 120px sans-serif';
    ctx.fillText('9V', 256, 180);

    ctx.font = 'bold 36px monospace';
    ctx.fillText('HEAVY DUTY', 256, 260);

    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('ALKALINE', 256, 500);

    ctx.font = '28px monospace';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('6LR61 / 1604A', 256, 580);
    ctx.fillText('0% MERCURY & CADMIUM', 256, 640);

    // Polarity labels
    ctx.font = 'bold 72px sans-serif';
    ctx.fillStyle = '#EF4444';
    ctx.fillText('+', 120, 850);
    ctx.fillStyle = '#38BDF8';
    ctx.fillText('-', 392, 850);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  const P_POS: [number, number, number] = [-6.5, 27, 0];
  const P_NEG: [number, number, number] = [6.5, 27, 0];

  return (
    <group position={position} rotation={rotation}>
      {/* Selection Box */}
      {isSelected && (
        <mesh position={[0, 12, 0]}>
          <boxGeometry args={[28, 52, 20]} />
          <meshBasicMaterial color="#38BDF8" wireframe />
        </mesh>
      )}

      {/* Main 9V Rectangular Block Casing */}
      <mesh position={[0, 12, 0]} material={materials.body} castShadow>
        <boxGeometry args={[25, 46, 17]} />
      </mesh>

      {/* Front Label Accent with 9V Alkaline Silkscreen */}
      <mesh position={[0, 12, 8.6]}>
        <planeGeometry args={[22, 40]} />
        {silkscreenTexture ? (
          <meshBasicMaterial map={silkscreenTexture} />
        ) : (
          <meshStandardMaterial color="#D97706" roughness={0.3} />
        )}
      </mesh>

      {/* Top Insulator Cap */}
      <mesh position={[0, 25.2, 0]} material={materials.body}>
        <boxGeometry args={[24, 0.6, 16]} />
      </mesh>

      {/* Positive Terminal (+) Octagonal Snap Socket */}
      <mesh position={[-6.5, 26, 0]} material={materials.snapMetal}>
        <cylinderGeometry args={[2.5, 2.5, 2, 8]} />
      </mesh>

      {/* Negative Terminal (-) Circular Stud */}
      <mesh position={[6.5, 26, 0]} material={materials.snapMetal}>
        <cylinderGeometry args={[2.0, 2.0, 2.4, 16]} />
      </mesh>

      {/* Positive Pin Anchor Target */}
      <mesh
        position={P_POS}
        material={hoveredPin === '+' ? materials.pinHover : materials.snapMetal}
        onClick={(e) => {
          e.stopPropagation();
          const w = new THREE.Vector3();
          e.object.getWorldPosition(w);
          onPinClick?.('+', w);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverPin?.('+');
        }}
        onPointerOut={() => onHoverPin?.(null)}
      >
        <sphereGeometry args={[1.2, 12, 12]} />
      </mesh>

      {/* Negative Pin Anchor Target */}
      <mesh
        position={P_NEG}
        material={hoveredPin === '-' ? materials.pinHover : materials.snapMetal}
        onClick={(e) => {
          e.stopPropagation();
          const w = new THREE.Vector3();
          e.object.getWorldPosition(w);
          onPinClick?.('-', w);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverPin?.('-');
        }}
        onPointerOut={() => onHoverPin?.(null)}
      >
        <sphereGeometry args={[1.2, 12, 12]} />
      </mesh>
    </group>
  );
}
