'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BurnSmokeFX } from './BurnSmokeFX';

export interface Led3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  color?: string; // e.g. '#EF4444', 'Red', 'Blue', etc.
  isPowered?: boolean;
  brightness?: number;
  isBurned?: boolean;
  isSelected?: boolean;
  renderContext?: 'studio' | '3d-view';
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

export function getLedColorPalette(colorInput?: string): {
  hex: string;
  offColor: string;
  onColor: string;
  onEmissive: string;
} {
  const col = (colorInput || 'Red').trim();
  const lower = col.toLowerCase();

  // 1. All 7 presets supported with authentic physical jewel-tone OFF optics and vivid emission ON
  if (lower === 'white' || lower.includes('white') || lower === '#ffffff' || lower === '#f8fafc') {
    return { hex: '#ffffff', offColor: '#d8e2ea', onColor: '#ffffff', onEmissive: '#ffffff' };
  }
  if (lower === 'cyan' || lower.includes('cyan') || lower === '#00e5ff' || lower === '#06b6d4') {
    return { hex: '#00e5ff', offColor: '#0a5c66', onColor: '#00e5ff', onEmissive: '#00e5ff' };
  }
  if (lower === 'purple' || lower.includes('purple') || lower.includes('violet') || lower === '#b026ff' || lower === '#a855f7') {
    return { hex: '#b026ff', offColor: '#3e1166', onColor: '#b026ff', onEmissive: '#b026ff' };
  }
  if (lower === 'green' || lower.includes('green') || lower === '#10b981') {
    return { hex: '#10B981', offColor: '#064e3b', onColor: '#10B981', onEmissive: '#34d399' };
  }
  if (lower === 'blue' || lower.includes('blue') || lower === '#3b82f6') {
    return { hex: '#3B82F6', offColor: '#0c4a6e', onColor: '#3B82F6', onEmissive: '#60a5fa' };
  }
  if (lower === 'amber' || lower === 'yellow' || lower.includes('amber') || lower.includes('yellow') || lower === '#f59e0b') {
    return { hex: '#F59E0B', offColor: '#78350f', onColor: '#F59E0B', onEmissive: '#fbbf24' };
  }
  if (lower === 'red' || lower.includes('red') || lower === '#ef4444' || lower === '#ff1a1a') {
    return { hex: '#ff1a1a', offColor: '#6b0f0f', onColor: '#ff1a1a', onEmissive: '#ff1a1a' };
  }

  // 2. Custom Hex String (#RRGGBB) or CSS color
  try {
    const c = new THREE.Color(col);
    const hex = '#' + c.getHexString();
    const off = c.clone().multiplyScalar(0.25);
    return {
      hex,
      offColor: '#' + off.getHexString(),
      onColor: hex,
      onEmissive: hex,
    };
  } catch {
    return { hex: '#ff1a1a', offColor: '#6b0f0f', onColor: '#ff1a1a', onEmissive: '#ff1a1a' };
  }
}

export function parseHexColor(colStr?: string): string {
  return getLedColorPalette(colStr).hex;
}

export function Led3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color = '#EF4444',
  isPowered = false,
  brightness,
  isBurned = false,
  isSelected = false,
  renderContext = 'studio',
  onPinClick,
  hoveredPin,
  onHoverPin,
}: Led3DProps) {
  const { offColor, onColor, onEmissive } = useMemo(() => getLedColorPalette(color), [color]);
  // Strict OFF state: when burned OR !isPowered, effectiveBrightness is strictly 0
  const effectiveBrightness = isBurned || !isPowered ? 0 : (brightness !== undefined ? brightness : 1.0);
  const isIlluminated = effectiveBrightness > 0;

  // Stable Three.js materials - Avoid recreating shader programs on every animation frame
  const materials = useMemo(() => {
    if (isBurned) {
      return {
        lens: new THREE.MeshStandardMaterial({
          color: '#18181B',
          roughness: 0.95,
          metalness: 0.05,
        }),
        silverLead: new THREE.MeshStandardMaterial({
          color: '#71717A',
          metalness: 0.4,
          roughness: 0.6,
        }),
        leadHover: new THREE.MeshBasicMaterial({
          color: '#EF4444',
        }),
        anodeHover: new THREE.MeshBasicMaterial({
          color: '#10B981',
        }),
        cathodeHover: new THREE.MeshBasicMaterial({
          color: '#38BDF8',
        }),
      };
    }

    return {
      lens: new THREE.MeshPhysicalMaterial({
        color: isIlluminated ? onColor : offColor,
        emissive: isIlluminated ? onEmissive : '#000000',
        emissiveIntensity: isIlluminated ? Math.min(3.5, Math.max(0.6, effectiveBrightness * 3.5)) : 0,
        transparent: true,
        opacity: isIlluminated ? 0.92 : 0.88,
        depthWrite: true,
        roughness: 0.15,
        metalness: 0.05,
        transmission: 0.45,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      }),
      silverLead: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.95,
        roughness: 0.15,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      solderFillet: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.95,
        roughness: 0.18,
      }),
      leadHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
      anodeHover: new THREE.MeshBasicMaterial({
        color: '#10B981',
      }),
      cathodeHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, [isIlluminated, onColor, offColor, onEmissive, effectiveBrightness, isBurned]);

  const lensMeshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // Real-time render loop direct subscription: maps solver output every tick
  useFrame((state) => {
    if (lensMeshRef.current && lensMeshRef.current.material instanceof THREE.MeshPhysicalMaterial) {
      const mat = lensMeshRef.current.material;
      if (isBurned) {
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0;
        mat.color.set('#18181B');
        mat.opacity = 0.95;
      } else if (isIlluminated) {
        const pulse = 0.92 + 0.08 * Math.sin(state.clock.elapsedTime * 10);
        mat.color.set(onColor);
        mat.emissive.set(onEmissive);
        mat.emissiveIntensity = Math.min(3.5, Math.max(0.6, effectiveBrightness * 3.5)) * pulse;
        mat.opacity = Math.min(0.95, 0.7 + effectiveBrightness * 0.25);
      } else {
        mat.color.set(offColor);
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0;
        mat.opacity = 0.75;
      }
    }
    if (lightRef.current) {
      if (isBurned || !isIlluminated) {
        lightRef.current.intensity = 0;
        lightRef.current.visible = false;
      } else {
        const pulse = 0.92 + 0.08 * Math.sin(state.clock.elapsedTime * 10);
        lightRef.current.color.set(onEmissive);
        lightRef.current.intensity = Math.min(4.5, Math.max(1.0, effectiveBrightness * 4.2)) * pulse;
        lightRef.current.visible = true;
      }
    }
  });

  // Smooth real-time update of optical parameters without WebGL shader compilation lag
  useEffect(() => {
    if (materials.lens instanceof THREE.MeshPhysicalMaterial) {
      materials.lens.color.set(isIlluminated ? onColor : offColor);
      materials.lens.emissive.set(isIlluminated ? onEmissive : '#000000');
      materials.lens.emissiveIntensity = isIlluminated ? Math.max(0.6, effectiveBrightness * 3.5) : 0;
      materials.lens.opacity = isIlluminated ? Math.min(0.95, 0.7 + effectiveBrightness * 0.25) : 0.75;
      materials.lens.needsUpdate = true;
    }
    if (lightRef.current) {
      lightRef.current.color.set(onEmissive);
      lightRef.current.intensity = isIlluminated ? Math.min(4.5, Math.max(1.0, effectiveBrightness * 4.2)) : 0;
      lightRef.current.visible = isIlluminated;
    }
  }, [materials, isIlluminated, effectiveBrightness, onColor, offColor, onEmissive]);

  // Lead spacing: Exactly 5.08mm (2 x 2.54mm breadboard pitch) centered at x = 0
  // Anode at x = -2.54 (Column N-1), Cathode at x = +2.54 (Column N+1)
  const P_ANODE: [number, number, number] = [-2.54, 0, 0];
  const P_CATHODE: [number, number, number] = [2.54, 0, 0];

  return (
    <group position={position} rotation={rotation}>
      {/* 3D Burnout Overheat FX & Smoke Particles */}
      {isBurned && <BurnSmokeFX position={[0, 5, 0]} heightOffset={2} />}

      {/* Selection Ring */}
      {isSelected && (
        <mesh position={[0, 0, 0]}>
          <ringGeometry args={[4.5, 5.0, 32]} />
          <meshBasicMaterial color="#38BDF8" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 5mm LED Cylindrical Body */}
      <mesh ref={lensMeshRef} position={[0, 5, 0]} material={materials.lens} castShadow>
        <cylinderGeometry args={[2.5, 2.5, 5, 24]} />
      </mesh>

      {/* Flange Collar at Base (5.6mm diameter) */}
      <mesh position={[0, 2.2, 0]} material={materials.lens}>
        <cylinderGeometry args={[2.8, 2.8, 0.8, 24]} />
      </mesh>

      {/* Authentic Physical Cathode Flat Notch on Collar (+X rim) */}
      <mesh position={[2.7, 2.2, 0]} material={materials.lens}>
        <boxGeometry args={[0.3, 0.82, 2.2]} />
      </mesh>

      {/* Visible Polarity Embossed Badges on Collar */}
      {/* Anode (+) Symbol on -X side */}
      <group position={[-3.1, 2.2, 0]}>
        <mesh>
          <boxGeometry args={[0.6, 0.15, 0.1]} />
          <meshBasicMaterial color="#10B981" />
        </mesh>
        <mesh>
          <boxGeometry args={[0.15, 0.6, 0.1]} />
          <meshBasicMaterial color="#10B981" />
        </mesh>
      </group>
      {/* Cathode (-) Symbol on +X side */}
      <group position={[3.1, 2.2, 0]}>
        <mesh>
          <boxGeometry args={[0.6, 0.15, 0.1]} />
          <meshBasicMaterial color="#38BDF8" />
        </mesh>
      </group>

      {/* Domed Top Hemisphere */}
      <mesh position={[0, 7.5, 0]} material={materials.lens} castShadow>
        <sphereGeometry args={[2.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>

      {/* Internal Reflective Cup & Post (Anode Post & Cathode Anvil) */}
      <mesh position={[-0.4, 4.5, 0]} material={materials.silverLead}>
        <coneGeometry args={[0.4, 1.2, 12]} />
      </mesh>
      <mesh position={[0.4, 4.5, 0]} material={materials.silverLead}>
        <boxGeometry args={[0.7, 1.2, 0.2]} />
      </mesh>

      {/* Vivid Glowing Semiconductor Die Core inside Lens */}
      <mesh position={[0, 4.7, 0]}>
        <sphereGeometry args={[0.42, 12, 12]} />
        <meshBasicMaterial color={isIlluminated ? onEmissive : offColor} />
      </mesh>

      {/* Point Light when Illuminated with proportional intensity */}
      <pointLight
        ref={lightRef}
        color={onEmissive}
        intensity={isIlluminated ? Math.max(0.6, effectiveBrightness * 4.0) : 0}
        distance={25 + 25 * effectiveBrightness}
        decay={2}
        position={[0, 7, 0]}
        visible={isIlluminated}
      />

      {/* Realistic Thin Metallic Leads Firmly Seated Into Breadboard Holes (radius 0.38mm, 12mm length) */}
      {/* 1. Longer Anode Lead (Left, +): Emerges from inside lens at y = 4.0, bends at y = 2.0 to x = -2.54, extends down to y = -8.0 */}
      <mesh position={[-1.0, 3.0, 0]} material={materials.silverLead}>
        <cylinderGeometry args={[0.38, 0.38, 2.0, 12]} />
      </mesh>
      <mesh position={[-1.77, 2.0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.silverLead}>
        <cylinderGeometry args={[0.38, 0.38, 1.54, 12]} />
      </mesh>
      <mesh position={[-1.0, 2.0, 0]} material={materials.silverLead}>
        <sphereGeometry args={[0.38, 10, 10]} />
      </mesh>
      <mesh position={[-2.54, 2.0, 0]} material={materials.silverLead}>
        <sphereGeometry args={[0.38, 10, 10]} />
      </mesh>
      <mesh position={[-2.54, -3.0, 0]} material={materials.silverLead}>
        <cylinderGeometry args={[0.38, 0.38, 10.0, 12]} />
      </mesh>

      {/* 2. Shorter Cathode Lead (Right, -): Emerges from inside lens at y = 4.0, bends at y = 2.0 to x = 2.54, extends down to y = -7.5 */}
      <mesh position={[1.0, 3.0, 0]} material={materials.silverLead}>
        <cylinderGeometry args={[0.38, 0.38, 2.0, 12]} />
      </mesh>
      <mesh position={[1.77, 2.0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.silverLead}>
        <cylinderGeometry args={[0.38, 0.38, 1.54, 12]} />
      </mesh>
      <mesh position={[1.0, 2.0, 0]} material={materials.silverLead}>
        <sphereGeometry args={[0.38, 10, 10]} />
      </mesh>
      <mesh position={[2.54, 2.0, 0]} material={materials.silverLead}>
        <sphereGeometry args={[0.38, 10, 10]} />
      </mesh>
      <mesh position={[2.54, -2.75, 0]} material={materials.silverLead}>
        <cylinderGeometry args={[0.38, 0.38, 9.5, 12]} />
      </mesh>

      {/* Solder Fillet cones on PCB pads (3D View mode) */}
      {renderContext === '3d-view' && (
        <>
          <mesh position={[-2.54, 0.15, 0]} material={materials.solderFillet}>
            <cylinderGeometry args={[0.5, 0.75, 0.3, 12]} />
          </mesh>
          <mesh position={[2.54, 0.15, 0]} material={materials.solderFillet}>
            <cylinderGeometry args={[0.5, 0.75, 0.3, 12]} />
          </mesh>
        </>
      )}

      {/* Anode Terminal Pin Anchor with Generous Hit-Sphere and Hover Ring */}
      {renderContext === 'studio' && (
        <group position={P_ANODE}>
          <mesh material={hoveredPin === 'anode' ? materials.anodeHover : materials.silverLead}>
            <cylinderGeometry args={[hoveredPin === 'anode' ? 0.55 : 0.4, 0.4, 1.2, 12]} />
          </mesh>
          {hoveredPin === 'anode' && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
              <ringGeometry args={[0.6, 1.4, 24]} />
              <meshBasicMaterial color="#10B981" side={THREE.DoubleSide} />
            </mesh>
          )}
          <mesh
            renderOrder={100}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              const w = new THREE.Vector3();
              e.object.getWorldPosition(w);
              onPinClick?.('anode', w);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHoverPin?.('anode');
            }}
            onPointerOut={() => onHoverPin?.(null)}
          >
            <sphereGeometry args={[1.8, 12, 12]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* Cathode Terminal Pin Anchor with Generous Hit-Sphere and Hover Ring */}
      {renderContext === 'studio' && (
        <group position={P_CATHODE}>
          <mesh material={hoveredPin === 'cathode' ? materials.cathodeHover : materials.silverLead}>
            <cylinderGeometry args={[hoveredPin === 'cathode' ? 0.55 : 0.4, 0.4, 1.2, 12]} />
          </mesh>
          {hoveredPin === 'cathode' && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
              <ringGeometry args={[0.6, 1.4, 24]} />
              <meshBasicMaterial color="#38BDF8" side={THREE.DoubleSide} />
            </mesh>
          )}
          <mesh
            renderOrder={100}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              const w = new THREE.Vector3();
              e.object.getWorldPosition(w);
              onPinClick?.('cathode', w);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHoverPin?.('cathode');
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
