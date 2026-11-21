'use client';

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';

export interface Buzzer3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  isSounding?: boolean;
  frequency?: number;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

export function Buzzer3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  isSounding = false,
  frequency = 2300,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: Buzzer3DProps) {
  const materials = useMemo(() => {
    return {
      body: new THREE.MeshStandardMaterial({
        color: isSelected ? '#38BDF8' : '#18181B', // Black cylindrical housing
        roughness: 0.35,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      pinSilver: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.9,
        roughness: 0.2,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
      acousticAperture: new THREE.MeshBasicMaterial({
        color: '#09090B',
      }),
      polarityMark: new THREE.MeshBasicMaterial({
        color: '#EF4444',
      }),
    };
  }, [isSelected]);

  // Real Web Audio API Synthesizer for Piezo Buzzer Acoustic Output
  useEffect(() => {
    if (!isSounding || typeof window === 'undefined') return;

    let audioCtx: AudioContext | null = null;
    let osc: OscillatorNode | null = null;
    let gain: GainNode | null = null;

    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      audioCtx = new AudioCtxClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      osc = audioCtx.createOscillator();
      gain = audioCtx.createGain();

      // Square wave models physical resonant ceramic diaphragm vibration
      osc.type = 'square';
      const toneFreq = frequency && frequency > 100 ? frequency : 2300;
      osc.frequency.setValueAtTime(toneFreq, audioCtx.currentTime);

      // Controlled volume level (0.08) prevents clipping and distortion
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
    } catch {
      // Graceful fallback if audio permissions are blocked
    }

    return () => {
      try {
        if (osc) {
          osc.stop();
          osc.disconnect();
        }
        if (gain) {
          gain.disconnect();
        }
        if (audioCtx && audioCtx.state !== 'closed') {
          audioCtx.close();
        }
      } catch {
        // Safe disposal
      }
    };
  }, [isSounding, frequency]);

  return (
    <group position={position} rotation={rotation}>
      {/* Black Piezo Transducer Cylinder Body (12mm dia x 9.5mm height) */}
      <mesh position={[0, 4.75, 0]} material={materials.body} castShadow>
        <cylinderGeometry args={[6.0, 6.0, 9.5, 32]} />
      </mesh>

      {/* Top Acoustic Hole Aperture */}
      <mesh position={[0, 9.55, 0]} material={materials.acousticAperture}>
        <cylinderGeometry args={[1.5, 1.5, 0.2, 24]} />
      </mesh>

      {/* Plus (+) Polarity Mark */}
      <mesh position={[-3.5, 9.55, 0]} material={materials.polarityMark}>
        <boxGeometry args={[1.6, 0.1, 0.4]} />
      </mesh>
      <mesh position={[-3.5, 9.55, 0]} material={materials.polarityMark}>
        <boxGeometry args={[0.4, 0.1, 1.6]} />
      </mesh>

      {/* Visual Acoustic Sound Wave Pulse Indicators */}
      {isSounding && (
        <group position={[0, 10.5, 0]}>
          <mesh position={[0, 1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.0, 3.5, 24]} />
            <meshBasicMaterial color="#38BDF8" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 3.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[3.8, 5.5, 24]} />
            <meshBasicMaterial color="#38BDF8" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 5.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[5.8, 7.8, 24]} />
            <meshBasicMaterial color="#38BDF8" transparent opacity={0.2} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* 2 Pins: + (Positive) at -2.54, - (Negative/GND) at 2.54 */}
      {[
        { name: '+', aliases: ['+', 'pos', 'positive', '1', 'anode'], x: -2.54 },
        { name: '-', aliases: ['-', 'neg', 'negative', '2', 'cathode', 'gnd'], x: 2.54 },
      ].map((p) => {
        const isHovered =
          hoveredPin === p.name || (hoveredPin && p.aliases.includes(hoveredPin.toLowerCase()));
        return (
          <group key={p.name} position={[p.x, 0, 0]}>
            {/* Lead entering housing and penetrating into breadboard (y = -4.0) */}
            <mesh position={[0, -2.5, 0]} material={materials.pinSilver}>
              <cylinderGeometry args={[0.35, 0.35, 6.0, 12]} />
            </mesh>

            {/* Click target at breadboard surface (y = 0) */}
            <mesh
              position={[0, 0, 0]}
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
              <sphereGeometry args={[isHovered ? 1.4 : 0.8, 12, 12]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
