'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getResistorColorBands } from '@/modules/engineering-lab/virtual3d-engine/breadboard-model';
import { BurnSmokeFX } from './BurnSmokeFX';

export interface Resistor3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  value?: string; // e.g. '220Ω', '10kΩ'
  isBurned?: boolean;
  isSelected?: boolean;
  renderContext?: 'studio' | '3d-view';
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

export function Resistor3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  value = '1kΩ',
  isBurned = false,
  isSelected = false,
  renderContext = 'studio',
  onPinClick,
  hoveredPin,
  onHoverPin,
}: Resistor3DProps) {
  const bands = useMemo(() => getResistorColorBands(value), [value]);

  const materials = useMemo(() => {
    return {
      body: new THREE.MeshStandardMaterial({
        color: isBurned ? '#18181B' : '#D4A373', // Charred black or light beige ceramic body
        roughness: isBurned ? 0.95 : 0.5,
        metalness: isBurned ? 0.05 : 0.1,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      silverLead: new THREE.MeshStandardMaterial({
        color: isBurned ? '#71717A' : '#E2E8F0',
        metalness: isBurned ? 0.4 : 0.95,
        roughness: isBurned ? 0.6 : 0.15,
        transparent: false,
        opacity: 1,
        depthWrite: true,
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
  }, [isBurned]);

  const P_PIN1: [number, number, number] = [-5.08, 0, 0];
  const P_PIN2: [number, number, number] = [5.08, 0, 0];

  return (
    <group position={position} rotation={rotation}>
      {/* 3D Burnout Overheat FX & Smoke Particles */}
      {isBurned && <BurnSmokeFX position={[0, 4, 0]} heightOffset={1} />}

      {/* Selection Box */}
      {isSelected && (
        <mesh position={[0, 4.5, 0]}>
          <boxGeometry args={[13, 6, 6]} />
          <meshBasicMaterial color="#38BDF8" wireframe />
        </mesh>
      )}

      {/* Main Ceramic Cylindrical Body (Horizontal along X, raised cleanly at y = 4.5mm) */}
      <mesh position={[0, 4.5, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.body} castShadow>
        <cylinderGeometry args={[1.5, 1.5, 7, 24]} />
      </mesh>

      {/* 4 Color Rings */}
      {bands.map((bandHex, idx) => {
        // Spaced along body: [-2.0, -0.8, 0.4, 1.8]
        const ringX = -2.0 + idx * 1.3;
        return (
          <mesh key={idx} position={[ringX, 4.5, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[1.53, 1.53, 0.6, 24]} />
            <meshBasicMaterial color={isBurned ? '#27272A' : bandHex} />
          </mesh>
        );
      })}

      {/* Realistic Thin Silver/Tinned-Copper Cylindrical Wire Leads (radius 0.38mm, 12.5mm length) */}
      {/* Left horizontal stem penetrating body at x = -3.5 out to x = -5.08 */}
      <mesh position={[-4.29, 4.5, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.silverLead}>
        <cylinderGeometry args={[0.38, 0.38, 1.58, 12]} />
      </mesh>
      {/* Left seamless elbow sphere */}
      <mesh position={[-5.08, 4.5, 0]} material={materials.silverLead}>
        <sphereGeometry args={[0.38, 12, 12]} />
      </mesh>
      {/* Left bent leg entering straight into exact center of breadboard hole down to y = -8.0 */}
      <mesh position={[-5.08, -1.75, 0]} material={materials.silverLead}>
        <cylinderGeometry args={[0.38, 0.38, 12.5, 12]} />
      </mesh>

      {/* Right horizontal stem penetrating body at x = 3.5 out to x = 5.08 */}
      <mesh position={[4.29, 4.5, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.silverLead}>
        <cylinderGeometry args={[0.38, 0.38, 1.58, 12]} />
      </mesh>
      {/* Right seamless elbow sphere */}
      <mesh position={[5.08, 4.5, 0]} material={materials.silverLead}>
        <sphereGeometry args={[0.38, 12, 12]} />
      </mesh>
      {/* Right bent leg entering straight into exact center of breadboard hole down to y = -8.0 */}
      <mesh position={[5.08, -1.75, 0]} material={materials.silverLead}>
        <cylinderGeometry args={[0.38, 0.38, 12.5, 12]} />
      </mesh>

      {/* Solder Fillet cones on PCB pads (3D View mode) */}
      {renderContext === '3d-view' && (
        <>
          <mesh position={[-5.08, 0.15, 0]} material={materials.solderFillet}>
            <cylinderGeometry args={[0.55, 0.85, 0.3, 12]} />
          </mesh>
          <mesh position={[5.08, 0.15, 0]} material={materials.solderFillet}>
            <cylinderGeometry args={[0.55, 0.85, 0.3, 12]} />
          </mesh>
        </>
      )}

      {/* Pin 1: Generous Invisible Hit-Sphere & Crisp Hover Highlight Ring */}
      {renderContext === 'studio' && (
        <group position={P_PIN1}>
          <mesh material={hoveredPin === '1' ? materials.pinHover : materials.silverLead}>
            <cylinderGeometry args={[hoveredPin === '1' ? 0.5 : 0.35, 0.35, 1.2, 12]} />
          </mesh>
          {hoveredPin === '1' && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
              <ringGeometry args={[0.6, 1.4, 24]} />
              <meshBasicMaterial color="#38BDF8" side={THREE.DoubleSide} />
            </mesh>
          )}
          {/* Generous Raycast Hit-Sphere */}
          <mesh
            renderOrder={100}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              const w = new THREE.Vector3();
              e.object.getWorldPosition(w);
              onPinClick?.('1', w);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHoverPin?.('1');
            }}
            onPointerOut={() => onHoverPin?.(null)}
          >
            <sphereGeometry args={[1.8, 12, 12]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* Pin 2: Generous Invisible Hit-Sphere & Crisp Hover Highlight Ring */}
      {renderContext === 'studio' && (
        <group position={P_PIN2}>
          <mesh material={hoveredPin === '2' ? materials.pinHover : materials.silverLead}>
            <cylinderGeometry args={[hoveredPin === '2' ? 0.5 : 0.35, 0.35, 1.2, 12]} />
          </mesh>
          {hoveredPin === '2' && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
              <ringGeometry args={[0.6, 1.4, 24]} />
              <meshBasicMaterial color="#38BDF8" side={THREE.DoubleSide} />
            </mesh>
          )}
          {/* Generous Raycast Hit-Sphere */}
          <mesh
            renderOrder={100}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              const w = new THREE.Vector3();
              e.object.getWorldPosition(w);
              onPinClick?.('2', w);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHoverPin?.('2');
            }}
            onPointerOut={() => onHoverPin?.(null)}
          >
            <sphereGeometry args={[1.8, 12, 12]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      )}
    </group>
  );
}
