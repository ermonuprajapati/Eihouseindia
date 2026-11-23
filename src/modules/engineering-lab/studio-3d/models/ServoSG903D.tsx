'use client';

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';

export interface ServoSG903DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  angle?: number; // 0 to 180 degrees
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

export function ServoSG903D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  angle = 90,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: ServoSG903DProps) {
  const materials = useMemo(() => {
    return {
      blueCase: new THREE.MeshStandardMaterial({
        color: isSelected ? '#38BDF8' : '#2563EB',
        transparent: false,
        opacity: 1,
        depthWrite: true,
        roughness: 0.3,
      }),
      hornWhite: new THREE.MeshStandardMaterial({
        color: '#F8FAFC',
        roughness: 0.25,
      }),
      brassGear: new THREE.MeshStandardMaterial({
        color: '#F59E0B',
        metalness: 0.8,
        roughness: 0.2,
      }),
      pinBrown: new THREE.MeshStandardMaterial({ color: '#78350F' }), // GND
      pinRed: new THREE.MeshStandardMaterial({ color: '#EF4444' }),   // VCC
      pinOrange: new THREE.MeshStandardMaterial({ color: '#F97316' }),// PWM
      pinSilver: new THREE.MeshStandardMaterial({ color: '#E2E8F0', metalness: 0.9 }),
      pinHover: new THREE.MeshBasicMaterial({ color: '#38BDF8' }),
    };
  }, [isSelected]);

  const labelTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 120);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Tower Pro', 128, 40);
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('SG90  9g', 128, 78);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '16px monospace';
    ctx.fillText('Micro Servo', 128, 106);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useEffect(() => {
    return () => {
      labelTexture?.dispose();
    };
  }, [labelTexture]);

  const dupontSilkscreenTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GND', 85, 64);
    ctx.fillText('5V', 256, 64);
    ctx.fillText('PWM', 427, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useEffect(() => {
    return () => {
      dupontSilkscreenTexture?.dispose();
    };
  }, [dupontSilkscreenTexture]);

  // Convert angle (0..180) to radians
  const hornRotY = ((angle - 90) * Math.PI) / 180;

  return (
    <group position={position} rotation={rotation}>
      {/* Servo Main Body (22.8mm x 12.2mm x 28.5mm) */}
      <mesh position={[0, 14.25, 0]} material={materials.blueCase} castShadow>
        <boxGeometry args={[22.8, 22.8, 12.2]} />
      </mesh>

      {/* Hardware-Grade Brand & Rating Silkscreen Sticker */}
      {labelTexture && (
        <mesh position={[0, 14.25, 6.15]}>
          <planeGeometry args={[18, 9]} />
          <meshBasicMaterial map={labelTexture} />
        </mesh>
      )}

      {/* Top Gear Tower */}
      <mesh position={[5.5, 27.5, 0]} material={materials.blueCase}>
        <cylinderGeometry args={[5.8, 5.8, 4.0, 24]} />
      </mesh>

      {/* Mounting Flanges */}
      <mesh position={[-14.5, 18.0, 0]} material={materials.blueCase}>
        <boxGeometry args={[6.5, 2.0, 12.0]} />
      </mesh>
      <mesh position={[14.5, 18.0, 0]} material={materials.blueCase}>
        <boxGeometry args={[6.5, 2.0, 12.0]} />
      </mesh>

      {/* Spline Output Shaft */}
      <mesh position={[5.5, 30.5, 0]} material={materials.brassGear}>
        <cylinderGeometry args={[2.4, 2.4, 2.5, 16]} />
      </mesh>

      {/* Rotating Servo Horn (Arm) */}
      <group position={[5.5, 32.0, 0]} rotation={[0, hornRotY, 0]}>
        {/* Center Hub */}
        <mesh material={materials.hornWhite}>
          <cylinderGeometry args={[4.2, 4.2, 2.0, 24]} />
        </mesh>
        {/* Long Horn Arm */}
        <mesh position={[8.0, 0, 0]} material={materials.hornWhite}>
          <boxGeometry args={[16.0, 1.8, 4.0]} />
        </mesh>
        {/* Arm Tip */}
        <mesh position={[16.0, 0, 0]} material={materials.hornWhite}>
          <cylinderGeometry args={[2.0, 2.0, 1.8, 16]} />
        </mesh>
      </group>

      {/* 3-Wire Ribbon Cable Header with click targets and crisp silkscreen */}
      <group position={[-16, 5, 0]}>
        {dupontSilkscreenTexture && (
          <mesh position={[0, 1.3, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
            <planeGeometry args={[7.6, 9.8]} />
            <meshBasicMaterial
              map={dupontSilkscreenTexture}
              transparent
              opacity={0.95}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>
        )}
        {[
          { name: 'GND', color: materials.pinBrown, offsetZ: -2.54 },
          { name: 'VCC', color: materials.pinRed, offsetZ: 0 },
          { name: 'PWM', color: materials.pinOrange, offsetZ: 2.54 },
        ].map((pin) => {
          const isHovered = hoveredPin === pin.name;
          return (
            <group key={pin.name} position={[0, 0, pin.offsetZ]}>
              {/* Molded Dupont housing */}
              <mesh material={materials.pinBrown}>
                <boxGeometry args={[10, 2.54, 2.4]} />
              </mesh>
              {/* Header pin */}
              <mesh position={[-6, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.pinSilver}>
                <cylinderGeometry args={[0.4, 0.4, 4.0, 8]} />
              </mesh>
              {/* Click target */}
              <mesh
                position={[-8, 0, 0]}
                material={isHovered ? materials.pinHover : pin.color}
                renderOrder={100}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  const worldPos = new THREE.Vector3();
                  e.object.getWorldPosition(worldPos);
                  onPinClick?.(pin.name, worldPos);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  onHoverPin?.(pin.name);
                }}
                onPointerOut={() => onHoverPin?.(null)}
              >
                <sphereGeometry args={[isHovered ? 1.5 : 1.0, 10, 10]} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}
