'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { BurnSmokeFX } from './BurnSmokeFX';

export interface DipPinInfo {
  id: string;
  name: string;
  num: number;
}

export interface DipPackage3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  pinCount?: number;
  partName?: string;
  pinNames?: Record<number, string>;
  isBurned?: boolean;
  isSelected?: boolean;
  onPinClick?: (pinId: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinId: string | null) => void;
}

const DEFAULT_555_PINS: Record<number, string> = {
  1: 'GND',
  2: 'TRIG',
  3: 'OUT',
  4: 'RESET',
  5: 'CTRL',
  6: 'THRES',
  7: 'DISCH',
  8: 'VCC',
};

export function DipPackage3D({
  position = [0, 5, 0],
  rotation = [0, 0, 0],
  pinCount = 8,
  partName = 'NE555P',
  pinNames = DEFAULT_555_PINS,
  isBurned = false,
  isSelected = false,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: DipPackage3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const halfPins = Math.floor(pinCount / 2);
  const pitch = 2.54;
  const chipLength = Math.max(9.5, (halfPins + 0.5) * pitch);
  const chipWidth = 6.4;
  const chipHeight = 3.6;

  // Silkscreen top texture with Pin-1 notch, white dot, and crisp part text
  const topTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background matte molded epoxy black
    ctx.fillStyle = '#18181B';
    ctx.fillRect(0, 0, 512, 256);

    // Pin 1 Index Notch (semicircle on left edge)
    ctx.beginPath();
    ctx.arc(0, 128, 40, -Math.PI / 2, Math.PI / 2);
    ctx.fillStyle = '#09090B';
    ctx.fill();
    ctx.strokeStyle = '#27272A';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Pin 1 Indicator Dot (crisp white indent next to Pin 1)
    ctx.beginPath();
    ctx.arc(60, 200, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#F8FAFC';
    ctx.fill();

    // Silkscreen Laser-etched Part Markings
    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 38px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(partName.toUpperCase(), 270, 105);

    // Secondary line: Manufacturer / Datecode
    ctx.font = '22px monospace';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('TI  2412M  e3', 270, 165);

    // Edge Pin Number Indicators on top surface silkscreen
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#38BDF8';
    ctx.fillText('1', 50, 230);
    ctx.fillText(String(halfPins), 460, 230);
    ctx.fillText(String(halfPins + 1), 460, 30);
    ctx.fillText(String(pinCount), 50, 30);

    // Bevel boundary lines
    ctx.strokeStyle = '#27272A';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 492, 236);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [partName, halfPins, pinCount]);

  useEffect(() => {
    return () => {
      topTexture?.dispose();
    };
  }, [topTexture]);

  const materials = useMemo(() => {
    return {
      icBody: new THREE.MeshStandardMaterial({
        color: isBurned ? '#0F0E0E' : isSelected ? '#38BDF8' : '#18181B',
        roughness: isBurned ? 0.95 : 0.6,
        metalness: isBurned ? 0.05 : 0.1,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      leadSilver: new THREE.MeshStandardMaterial({
        color: isBurned ? '#71717A' : '#E2E8F0',
        metalness: isBurned ? 0.4 : 0.95,
        roughness: isBurned ? 0.6 : 0.2,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
      pin1Highlight: new THREE.MeshBasicMaterial({
        color: '#F59E0B',
      }),
    };
  }, [isSelected, isBurned]);

  // Compute pin positions relative to DIP package center
  const pins = useMemo(() => {
    const list: { id: string; num: number; name: string; pos: [number, number, number] }[] = [];
    const startX = -((halfPins - 1) * pitch) / 2;

    // Bottom row (Pins 1..halfPins, along row E: Z = -3.34)
    for (let i = 0; i < halfPins; i++) {
      const pinNum = i + 1;
      const px = startX + i * pitch;
      list.push({
        id: String(pinNum),
        num: pinNum,
        name: pinNames[pinNum] || `P${pinNum}`,
        pos: [px, -0.6, -3.34],
      });
    }

    // Top row (Pins pinCount..halfPins+1, along row F: Z = 3.34)
    for (let i = 0; i < halfPins; i++) {
      const pinNum = pinCount - i;
      const px = startX + i * pitch;
      list.push({
        id: String(pinNum),
        num: pinNum,
        name: pinNames[pinNum] || `P${pinNum}`,
        pos: [px, -0.6, 3.34],
      });
    }

    return list;
  }, [halfPins, pitch, pinCount, pinNames]);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* 3D Burnout Overheat FX & Smoke Particles */}
      {isBurned && <BurnSmokeFX position={[0, chipHeight, 0]} heightOffset={1} />}

      {/* Molded Epoxy DIP Body */}
      <mesh position={[0, chipHeight / 2, 0]} material={materials.icBody} castShadow>
        <boxGeometry args={[chipLength, chipHeight, chipWidth]} />
      </mesh>

      {/* Silkscreen Top Face with Notch, Dot, and Part Number */}
      {topTexture && (
        <mesh position={[0, chipHeight + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[chipLength * 0.96, chipWidth * 0.96]} />
          <meshBasicMaterial map={topTexture} />
        </mesh>
      )}

      {/* Physical Pin 1 Notch Cutout Indent */}
      <mesh position={[-chipLength / 2 + 0.2, chipHeight, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.6, 16, 1, false, -Math.PI / 2, Math.PI]} />
        <meshBasicMaterial color="#09090B" />
      </mesh>

      {/* Metallic Bent DIP Leads on both sides */}
      {pins.map((pin) => {
        const isHovered = hoveredPin === pin.id;
        const isPin1 = pin.num === 1;

        return (
          <group
            key={pin.id}
            position={pin.pos}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onPinClick && groupRef.current) {
                const wPos = new THREE.Vector3();
                wPos.set(pin.pos[0], pin.pos[1], pin.pos[2]);
                wPos.applyMatrix4(groupRef.current.matrixWorld);
                onPinClick(pin.id, wPos);
              }
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHoverPin?.(pin.id);
            }}
            onPointerOut={() => onHoverPin?.(null)}
          >
            {/* Horizontal shoulder lead protruding from body */}
            <mesh position={[0, 1.2, pin.pos[2] < 0 ? 0.7 : -0.7]} material={materials.leadSilver}>
              <boxGeometry args={[0.7, 0.3, 1.4]} />
            </mesh>

            {/* Vertical pin shank dipping into breadboard spring clips (extended 6.2mm length) */}
            <mesh
              position={[0, -1.9, 0]}
              material={
                isHovered
                  ? materials.pinHover
                  : isPin1
                  ? materials.pin1Highlight
                  : materials.leadSilver
              }
            >
              <boxGeometry args={[0.65, 6.2, 0.45]} />
            </mesh>

            {/* Crisp Hover Highlight Ring */}
            {isHovered && (
              <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.5, 1.3, 24]} />
                <meshBasicMaterial color="#38BDF8" side={THREE.DoubleSide} />
              </mesh>
            )}

            {/* Generous Raycast Hit-Sphere for Effortless Clicking */}
            <mesh
              position={[0, 0, 0]}
              renderOrder={100}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (onPinClick && groupRef.current) {
                  const wPos = new THREE.Vector3();
                  wPos.set(pin.pos[0], pin.pos[1], pin.pos[2]);
                  wPos.applyMatrix4(groupRef.current.matrixWorld);
                  onPinClick(pin.id, wPos);
                }
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                onHoverPin?.(pin.id);
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
