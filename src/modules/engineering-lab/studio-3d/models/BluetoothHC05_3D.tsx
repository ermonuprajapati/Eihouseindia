'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface BluetoothHC05_3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  isPowered?: boolean;
  renderContext?: 'studio' | '3d-view';
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

/**
 * Hardware-grade HC-05 Serial Bluetooth SPP Module 3D Model
 * Deep blue breakout carrier board, daughterboard with meander antenna,
 * stamped nickel RF shield, status LEDs, and 6-pin header at 2.54mm pitch.
 */
export function BluetoothHC05_3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  isPowered = true,
  renderContext = 'studio',
  onPinClick,
  onHoverPin,
}: BluetoothHC05_3DProps) {
  const materials = useMemo(() => {
    return {
      pcbCarrier: new THREE.MeshStandardMaterial({
        color: isSelected ? '#38BDF8' : '#0284C7',
        roughness: 0.35,
        metalness: 0.1,
      }),
      daughterBoard: new THREE.MeshStandardMaterial({
        color: '#0369A1',
        roughness: 0.4,
      }),
      rfShield: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.95,
        roughness: 0.15,
      }),
      headerBlack: new THREE.MeshStandardMaterial({
        color: '#18181B',
        roughness: 0.7,
      }),
      antennaGold: new THREE.MeshStandardMaterial({
        color: '#F59E0B',
        metalness: 0.95,
        roughness: 0.2,
      }),
      pinSilver: new THREE.MeshStandardMaterial({
        color: '#d4dce6',
        metalness: 0.88,
        roughness: 0.22,
      }),
      solderFillet: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.95,
        roughness: 0.18,
      }),
      ledBlue: new THREE.MeshPhysicalMaterial({
        color: isPowered ? '#38BDF8' : '#075985',
        emissive: isPowered ? '#0284C7' : '#000000',
        emissiveIntensity: isPowered ? 1.5 : 0,
        transparent: true,
        opacity: 0.9,
      }),
    };
  }, [isSelected, isPowered]);

  // 6 Header pins at 2.54mm pitch along bottom edge
  const pins = [
    { name: 'STATE', x: -6.35 },
    { name: 'RXD', x: -3.81 },
    { name: 'TXD', x: -1.27 },
    { name: 'GND', x: 1.27 },
    { name: 'VCC', x: 3.81 },
    { name: 'EN', x: 6.35 },
  ];

  const silkscreenTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 1024, 512);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Branding
    ctx.font = 'bold 36px monospace';
    ctx.fillText('HC-05 BLUETOOTH', 512, 120);

    // Pin markings directly beside headers
    ctx.font = 'bold 32px monospace';
    const pinNames = ['STATE', 'RXD', 'TXD', 'GND', 'VCC', 'EN'];
    pinNames.forEach((name, i) => {
      const cx = 170 + i * 136;
      ctx.fillText(name, cx, 430);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  return (
    <group position={position} rotation={rotation}>
      {/* Carrier PCB (27mm x 13mm x 1.6mm) elevated on header pins */}
      <mesh position={[0, 6.0, 0]} material={materials.pcbCarrier} castShadow>
        <boxGeometry args={[27.0, 1.6, 13.0]} />
      </mesh>

      {/* Crisp White Silkscreen Overlay with polygonOffset to prevent z-fighting */}
      {silkscreenTexture && (
        <mesh position={[0, 6.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[26.5, 12.5]} />
          <meshBasicMaterial
            map={silkscreenTexture}
            transparent
            opacity={0.95}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      )}

      {/* Blue Daughterboard module */}
      <mesh position={[0, 7.2, -1.0]} material={materials.daughterBoard}>
        <boxGeometry args={[24.0, 0.8, 10.0]} />
      </mesh>

      {/* Stamped Nickel RF Shield Box */}
      <mesh position={[2.0, 8.2, -1.0]} material={materials.rfShield}>
        <boxGeometry args={[14.0, 1.2, 8.5]} />
      </mesh>

      {/* Gold Meander PCB Antenna at left edge */}
      <mesh position={[-9.5, 7.8, -1.0]} material={materials.antennaGold}>
        <boxGeometry args={[4.0, 0.2, 7.0]} />
      </mesh>

      {/* Status Indicator LEDs */}
      <mesh position={[9.5, 8.0, 2.5]} material={materials.ledBlue}>
        <boxGeometry args={[1.2, 0.6, 0.8]} />
      </mesh>
      {isPowered && (
        <pointLight position={[9.5, 8.5, 2.5]} color="#38BDF8" intensity={0.6} distance={10} />
      )}

      {/* 6-Pin Bottom Header: Insulator and Gold Pins extending into PCB */}
      <mesh position={[0, 2.5, 5.0]} material={materials.headerBlack}>
        <boxGeometry args={[16.0, 2.5, 2.5]} />
      </mesh>

      {pins.map((p) => (
        <group key={p.name}>
          {/* Square metallic pin extending through insulator into PCB pads */}
          <mesh position={[p.x, -1.5, 5.0]} material={materials.pinSilver}>
            <boxGeometry args={[0.64, 6.0, 0.64]} />
          </mesh>

          {/* Solder Fillet on PCB pad */}
          <mesh position={[p.x, 0.15, 5.0]} material={materials.solderFillet}>
            <cylinderGeometry args={[0.55, 0.85, 0.3, 12]} />
          </mesh>

          {/* Interactive Hitbox (Studio only) */}
          {renderContext === 'studio' && (
            <mesh
              position={[p.x, 0, 5.0]}
              renderOrder={100}
              onClick={(e) => {
                e.stopPropagation();
                const w = new THREE.Vector3();
                e.object.getWorldPosition(w);
                onPinClick?.(p.name, w);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                onHoverPin?.(p.name);
              }}
              onPointerOut={() => onHoverPin?.(null)}
            >
              <sphereGeometry args={[1.5, 8, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
