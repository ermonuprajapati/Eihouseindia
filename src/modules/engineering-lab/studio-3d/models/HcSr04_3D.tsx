'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

export interface HcSr04_3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  renderContext?: 'studio' | '3d-view';
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

/**
 * Hardware-grade HC-SR04 Ultrasonic Distance Sensor Module
 * Blue FR4 PCB, 2 cylindrical aluminum ultrasonic transducers (T & R),
 * crystal oscillator, silkscreen pinout labels, and 4-pin header at 2.54mm pitch.
 */
export function HcSr04_3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  renderContext = 'studio',
  onPinClick,
  hoveredPin,
  onHoverPin,
}: HcSr04_3DProps) {
  const materials = useMemo(() => {
    return {
      pcbBlue: new THREE.MeshStandardMaterial({
        color: isSelected ? '#38BDF8' : '#0284C7', // Industrial blue PCB
        roughness: 0.35,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      aluminumCan: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.9,
        roughness: 0.2,
      }),
      canMeshDark: new THREE.MeshBasicMaterial({
        color: '#334155', // Mesh grille center
      }),
      crystalCan: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.95,
        roughness: 0.15,
      }),
      headerInsulator: new THREE.MeshStandardMaterial({
        color: '#18181B',
        roughness: 0.8,
      }),
      pinGold: new THREE.MeshStandardMaterial({
        color: '#F59E0B',
        metalness: 0.9,
        roughness: 0.15,
      }),
      solderFillet: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.95,
        roughness: 0.18,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, [isSelected]);

  // Silkscreen texture with "HC-SR04" and pin labels "VCC TRIG ECHO GND"
  const silkscreenTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 1024, 450);

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Module name
    ctx.font = 'bold 36px monospace';
    ctx.fillText('HC-SR04 ULTRASONIC SENSOR', 512, 60);

    // Transducer labels "T" and "R"
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('T', 240, 220);
    ctx.fillText('R', 784, 220);

    // 4 Pin labels directly above header pins (aligned with x = -3.81, -1.27, +1.27, +3.81 mm)
    ctx.font = 'bold 30px monospace';
    ctx.fillText('VCC', 425, 400);
    ctx.fillText('TRIG', 483, 400);
    ctx.fillText('ECHO', 541, 400);
    ctx.fillText('GND', 599, 400);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  const pins = [
    { name: 'VCC', aliases: ['vcc', '1', '5v', 'power'], x: -3.81, label: 'VCC (+5V Power Supply)' },
    { name: 'TRIG', aliases: ['trig', '2', 'trigger'], x: -1.27, label: 'TRIG (10µs Trigger Pulse)' },
    { name: 'ECHO', aliases: ['echo', '3'], x: 1.27, label: 'ECHO (Distance Pulse Width Output)' },
    { name: 'GND', aliases: ['gnd', '4', 'ground', '-'], x: 3.81, label: 'GND (Ground Return 0V)' },
  ];

  return (
    <group position={position} rotation={rotation}>
      {/* 1. Main Blue PCB (45.0mm x 20.0mm x 1.6mm) centered at y = 10.0 */}
      <mesh position={[0, 10.0, 0]} material={materials.pcbBlue} castShadow receiveShadow>
        <boxGeometry args={[45.0, 20.0, 1.6]} />
      </mesh>

      {/* 2. Silkscreen Legend Face on Front */}
      {silkscreenTexture && (
        <mesh position={[0, 10.0, 0.83]}>
          <planeGeometry args={[44.0, 19.0]} />
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

      {/* 3. Transmitter Transducer Can (T, left at x = -12.0mm, dia 16mm, length 12mm) */}
      <group position={[-12.0, 10.0, 6.8]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.aluminumCan}>
          <cylinderGeometry args={[8.0, 8.0, 12.0, 32]} />
        </mesh>
        {/* Front mesh grille */}
        <mesh position={[0, 0, 6.02]}>
          <circleGeometry args={[6.8, 24]} />
          <meshBasicMaterial color="#334155" />
        </mesh>
      </group>

      {/* 4. Receiver Transducer Can (R, right at x = 12.0mm, dia 16mm, length 12mm) */}
      <group position={[12.0, 10.0, 6.8]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.aluminumCan}>
          <cylinderGeometry args={[8.0, 8.0, 12.0, 32]} />
        </mesh>
        {/* Front mesh grille */}
        <mesh position={[0, 0, 6.02]}>
          <circleGeometry args={[6.8, 24]} />
          <meshBasicMaterial color="#334155" />
        </mesh>
      </group>

      {/* 5. Crystal Oscillator Canister (HC-49S) between transducers */}
      <mesh position={[0, 10.0, 3.0]} rotation={[0, 0, Math.PI / 2]} material={materials.crystalCan}>
        <boxGeometry args={[3.2, 10.5, 4.5]} />
      </mesh>

      {/* 4 Corner Mounting Holes (with gold annular pad rings) */}
      {[
        [-20.5, 17.5],
        [20.5, 17.5],
        [-20.5, 2.5],
        [20.5, 2.5],
      ].map(([hx, hy], idx) => (
        <group key={idx} position={[hx, hy, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.headerInsulator}>
            <cylinderGeometry args={[0.9, 0.9, 1.8, 16]} />
          </mesh>
          <mesh position={[0, 0, 0.81]} material={materials.pinGold}>
            <ringGeometry args={[0.9, 1.4, 16]} />
          </mesh>
          <mesh position={[0, 0, -0.81]} rotation={[0, Math.PI, 0]} material={materials.pinGold}>
            <ringGeometry args={[0.9, 1.4, 16]} />
          </mesh>
        </group>
      ))}

      {/* Rear ICs (SOIC Signal Processing & Driver Chips on back of PCB) */}
      <mesh position={[0, 10.0, -1.2]} material={materials.headerInsulator}>
        <boxGeometry args={[9.0, 4.5, 0.8]} />
      </mesh>
      <mesh position={[-12.0, 10.0, -1.2]} material={materials.headerInsulator}>
        <boxGeometry args={[6.0, 4.0, 0.8]} />
      </mesh>
      <mesh position={[12.0, 10.0, -1.2]} material={materials.headerInsulator}>
        <boxGeometry args={[6.0, 4.0, 0.8]} />
      </mesh>

      {/* 6. 4-Pin Header at Bottom Edge: VCC, TRIG, ECHO, GND */}
      <group position={[0, 1.25, 0]}>
        {/* Black insulator strip */}
        <mesh material={materials.headerInsulator}>
          <boxGeometry args={[11.5, 2.5, 2.5]} />
        </mesh>

        {pins.map((p) => {
          const isHovered =
            hoveredPin === p.name ||
            (hoveredPin && (hoveredPin.toUpperCase() === p.name || p.aliases.includes(hoveredPin.toLowerCase())));
          return (
            <group key={p.name} position={[p.x, 0, 0]}>
              {/* Square gold pin extending through insulator into breadboard to y = -5.5 */}
              <mesh position={[0, -3.2, 0]} material={materials.pinGold}>
                <boxGeometry args={[0.64, 7.5, 0.64]} />
              </mesh>

              {/* Solder Fillet cone on PCB pad (3D View mode) */}
              {renderContext === '3d-view' && (
                <mesh position={[0, -1.1, 0]} material={materials.solderFillet}>
                  <cylinderGeometry args={[0.55, 0.85, 0.3, 12]} />
                </mesh>
              )}

              {/* Click target with Generous Hit-Sphere & Hover Ring */}
              <mesh
                position={[0, 0, 0]}
                material={isHovered ? materials.pinHover : materials.pinGold}
              >
                <sphereGeometry args={[isHovered ? 0.9 : 0.6, 12, 12]} />
              </mesh>
              {isHovered && (
                <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.5, 1.3, 24]} />
                  <meshBasicMaterial color="#38BDF8" side={THREE.DoubleSide} />
                </mesh>
              )}
              {renderContext !== '3d-view' && (
                <mesh
                  position={[0, 0, 0]}
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
                  <sphereGeometry args={[2.0, 12, 12]} />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
              )}
            </group>
          );
        })}
      </group>
    </group>
  );
}
