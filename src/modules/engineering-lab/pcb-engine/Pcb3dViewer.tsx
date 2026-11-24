'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { Box, Layers, Hand } from 'lucide-react';
import { PcbLayout, CircuitComponent } from '../types';
import { SharedComponent3D } from '../studio-3d/SharedComponent3D';
import { isVirtualSchematicSymbol } from './pcb-generator';
import { FootprintRenderer } from './footprint-renderer';

export interface SolderMaskTheme {
  name: string;
  board: string;
  trackTop: string;
  trackBottom: string;
  silkscreen: string;
  metalness: number;
  roughness: number;
}

/**
 * Standard IPC / Manufacturing Solder Mask and Copper Track Themes
 * In real PCBs, traces run beneath the solder mask and match its resin tint
 */
export function getSolderMaskTheme(solderMaskColor: string): SolderMaskTheme {
  const c = (solderMaskColor || '').toLowerCase();
  if (c.includes('black') || c === '#0f172a' || c === '#141619') {
    return {
      name: 'Matte Black',
      board: '#141619',
      trackTop: '#2A2E35',
      trackBottom: '#22262C',
      silkscreen: '#E2E8F0',
      metalness: 0.35,
      roughness: 0.35,
    };
  }
  if (c.includes('blue') || c === '#1e40af' || c === '#0e3a75') {
    return {
      name: 'Royal Blue',
      board: '#0E3A75',
      trackTop: '#1D5BB0',
      trackBottom: '#17498C',
      silkscreen: '#FFFFFF',
      metalness: 0.35,
      roughness: 0.35,
    };
  }
  if (c.includes('red') || c === '#991b1b' || c === '#7a1216') {
    return {
      name: 'Signal Red',
      board: '#7A1216',
      trackTop: '#A82026',
      trackBottom: '#8A171D',
      silkscreen: '#FFFFFF',
      metalness: 0.35,
      roughness: 0.35,
    };
  }
  if (c.includes('white') || c === '#eaecef' || c === '#ffffff') {
    return {
      name: 'Gloss White',
      board: '#EAECEF',
      trackTop: '#D2D6DC',
      trackBottom: '#C5C9D0',
      silkscreen: '#1E293B',
      metalness: 0.35,
      roughness: 0.35,
    };
  }
  // Default: Official Emerald-Green FR-4 Solder Mask
  return {
    name: 'FR-4 Green',
    board: '#115E32', // Deep emerald PCB green (#115e32 / #146c3a)
    trackTop: '#1F8A4C', // authentic slightly raised lighter emerald-green copper-under-mask relief
    trackBottom: '#176B3C',
    silkscreen: '#F8FAFC',
    metalness: 0.08,
    roughness: 0.36,
  };
}

export interface Pcb3dViewerProps {
  pcb: PcbLayout;
  components?: CircuitComponent[];
  solderMaskColor?: string; // e.g. '#0B4F28' (Green), '#141619' (Black), '#0E3A75' (Blue), '#7A1216' (Red), '#EAECEF' (White)
  cameraPreset?: 'iso' | 'top' | 'bot' | 'front' | 'reset' | null;
  show3dComponents?: boolean;
  isSimulating?: boolean;
  simulationStates?: Record<
    string,
    {
      voltage?: number;
      current?: number;
      on?: boolean;
      brightness?: number;
      status?: 'NORMAL' | 'WARNING' | 'BURNED';
      burned?: boolean;
      onRed?: boolean;
      onGreen?: boolean;
      onBlue?: boolean;
      redBrightness?: number;
      greenBrightness?: number;
      blueBrightness?: number;
      rLevel?: number;
      gLevel?: number;
      bLevel?: number;
    }
  >;
}

function WebGlResourceDisposer() {
  const { gl, scene } = useThree();
  useEffect(() => {
    return () => {
      scene.traverse((obj) => {
        const mesh = obj as unknown as {
          geometry?: { dispose: () => void };
          material?:
            | {
                dispose: () => void;
                map?: { dispose: () => void };
                normalMap?: { dispose: () => void };
                roughnessMap?: { dispose: () => void };
                metalnessMap?: { dispose: () => void };
                emissiveMap?: { dispose: () => void };
                alphaMap?: { dispose: () => void };
              }
            | {
                dispose: () => void;
                map?: { dispose: () => void };
                normalMap?: { dispose: () => void };
                roughnessMap?: { dispose: () => void };
                metalnessMap?: { dispose: () => void };
                emissiveMap?: { dispose: () => void };
                alphaMap?: { dispose: () => void };
              }[];
        };
        if (mesh.geometry) {
          try {
            mesh.geometry.dispose();
          } catch {}
        }
        if (mesh.material) {
          try {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((mat) => {
              mat.map?.dispose?.();
              mat.normalMap?.dispose?.();
              mat.roughnessMap?.dispose?.();
              mat.metalnessMap?.dispose?.();
              mat.emissiveMap?.dispose?.();
              mat.alphaMap?.dispose?.();
              mat.dispose();
            });
          } catch {}
        }
      });
      try {
        gl.dispose();
      } catch {}
    };
  }, [gl, scene]);
  return null;
}

/**
 * Precision Chamfered Square Pad with Authentic Round Inner Drill Hole (True Annular Ring)
 */
function SquarePadMesh({
  position,
  rotation,
  size,
  holeR,
  material,
  renderOrder,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  size: number;
  holeR: number;
  material: THREE.Material;
  renderOrder?: number;
}) {
  const geom = useMemo(() => {
    const shape = new THREE.Shape();
    const half = size / 2;
    shape.moveTo(-half, -half);
    shape.lineTo(half, -half);
    shape.lineTo(half, half);
    shape.lineTo(-half, half);
    shape.closePath();
    const safeHoleR = Math.max(0, Math.min(holeR, half - 0.1));
    if (safeHoleR > 0) {
      const hole = new THREE.Path();
      hole.absarc(0, 0, safeHoleR, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
    return new THREE.ShapeGeometry(shape);
  }, [size, holeR]);

  useEffect(() => {
    return () => {
      geom.dispose();
    };
  }, [geom]);

  return <mesh position={position} rotation={rotation} geometry={geom} material={material} renderOrder={renderOrder} />;
}

/**
 * Precision Circular Annular Ring with Authentic Round Inner Drill Hole
 */
function RoundPadMesh({
  position,
  rotation,
  innerR,
  outerR,
  material,
  renderOrder,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  innerR: number;
  outerR: number;
  material: THREE.Material;
  renderOrder?: number;
}) {
  const geom = useMemo(() => {
    return new THREE.RingGeometry(Math.max(0.01, innerR), Math.max(innerR + 0.05, outerR), 24);
  }, [innerR, outerR]);

  useEffect(() => {
    return () => {
      geom.dispose();
    };
  }, [geom]);

  return <mesh position={position} rotation={rotation} geometry={geom} material={material} renderOrder={renderOrder} />;
}

export interface HoleSpec {
  x?: number;
  y?: number;
  xMm?: number;
  yMm?: number;
  holeMm?: number;
  drillMm?: number;
  diameterMm?: number;
  outerMm?: number;
}

export interface SanitizedHole {
  x: number;
  z: number;
  r: number;
  type: 'mount' | 'pad' | 'via';
}

/**
 * Robust hole sanitizer enforcing boundary margins and strict pairwise non-intersection
 * to completely eliminate Earcut triangulation failures and missing triangular faces in 3D PCB meshes.
 */
export function sanitizePcbHoles(
  widthMm: number,
  heightMm: number,
  pads: HoleSpec[] = [],
  mountingHoles: HoleSpec[] = []
): SanitizedHole[] {
  const halfW = widthMm / 2;
  const halfH = heightMm / 2;
  const accepted: SanitizedHole[] = [];

  // 1. M3 Mounting holes (priority 1)
  const effectiveMountHoles = mountingHoles && mountingHoles.length > 0 ? mountingHoles : [
    { x: 5.0, y: 5.0, diameterMm: 3.2, drillMm: 3.2, outerMm: 6.0 },
    { x: widthMm - 5.0, y: 5.0, diameterMm: 3.2, drillMm: 3.2, outerMm: 6.0 },
    { x: 5.0, y: heightMm - 5.0, diameterMm: 3.2, drillMm: 3.2, outerMm: 6.0 },
    { x: widthMm - 5.0, y: heightMm - 5.0, diameterMm: 3.2, drillMm: 3.2, outerMm: 6.0 },
  ];

  for (const m of effectiveMountHoles) {
    const drill = m.drillMm ?? m.diameterMm ?? m.holeMm ?? 3.2;
    if (drill <= 0) continue;
    const r = Math.max(0.1, drill / 2);
    const minX = -halfW + r + 0.5;
    const maxX = halfW - r - 0.5;
    const minZ = -halfH + r + 0.5;
    const maxZ = halfH - r - 0.5;
    if (minX > maxX || minZ > maxZ) continue;
    const rawX = m.xMm ?? m.x ?? 0;
    const rawY = m.yMm ?? m.y ?? 0;
    const x = Math.max(minX, Math.min(maxX, rawX - halfW));
    const z = Math.max(minZ, Math.min(maxZ, rawY - halfH));
    accepted.push({ x, z, r, type: 'mount' });
  }

  // 2. Component Pads (priority 2) & Vias (priority 3)
  const sortedPads = [...pads].sort((a, b) => {
    const aIsVia = (a as { componentId?: string; id?: string }).componentId === 'VIA' || String((a as { id?: string }).id || '').startsWith('via_');
    const bIsVia = (b as { componentId?: string; id?: string }).componentId === 'VIA' || String((b as { id?: string }).id || '').startsWith('via_');
    if (aIsVia && !bIsVia) return 1;
    if (!aIsVia && bIsVia) return -1;
    return 0;
  });

  for (const p of sortedPads) {
    const drill = p.holeMm ?? p.drillMm ?? p.diameterMm ?? 0;
    if (drill <= 0) continue;
    const r = Math.max(0.1, drill / 2);
    const minX = -halfW + r + 0.5;
    const maxX = halfW - r - 0.5;
    const minZ = -halfH + r + 0.5;
    const maxZ = halfH - r - 0.5;
    if (minX > maxX || minZ > maxZ) continue;
    const rawPx = p.xMm ?? p.x ?? 0;
    const rawPy = p.yMm ?? p.y ?? 0;
    const x = rawPx - halfW;
    const z = rawPy - halfH;
    if (x < minX || x > maxX || z < minZ || z > maxZ) continue;

    // Strict non-intersection and tangent avoidance check (minimum 0.15mm gap)
    let collides = false;
    for (const ah of accepted) {
      const dist = Math.hypot(x - ah.x, z - ah.z);
      if (dist < r + ah.r + 0.15) {
        collides = true;
        break;
      }
    }
    if (!collides) {
      const isVia = (p as { componentId?: string; id?: string }).componentId === 'VIA' || String((p as { id?: string }).id || '').startsWith('via_');
      accepted.push({ x, z, r, type: isVia ? 'via' : 'pad' });
    }
  }

  return accepted;
}

/**
 * Pure Factory PCB Geometry Helper:
 * Constructs a continuous planar THREE.Shape with real see-through circular punched holes
 * for every PTH component pad, via, and M3 mounting hole with zero Earcut triangulation errors.
 */
export function createPcbBoardShape(
  widthMm: number,
  heightMm: number,
  pads: HoleSpec[] = [],
  mountingHoles: HoleSpec[] = [
    { x: 4.0, y: 4.0, diameterMm: 3.2 },
    { x: widthMm - 4.0, y: 4.0, diameterMm: 3.2 },
    { x: 4.0, y: heightMm - 4.0, diameterMm: 3.2 },
    { x: widthMm - 4.0, y: heightMm - 4.0, diameterMm: 3.2 },
  ]
): THREE.Shape {
  const halfW = widthMm / 2;
  const halfH = heightMm / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-halfW, -halfH);
  shape.lineTo(halfW, -halfH);
  shape.lineTo(halfW, halfH);
  shape.lineTo(-halfW, halfH);
  shape.closePath();

  const sanitized = sanitizePcbHoles(widthMm, heightMm, pads, mountingHoles);
  for (const h of sanitized) {
    const hole = new THREE.Path();
    hole.absarc(h.x, h.z, h.r, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  return shape;
}

export function Pcb3dViewer({
  pcb,
  components = [],
  solderMaskColor = '#0B4F28',
  cameraPreset,
  show3dComponents = true,
  isSimulating: _isSimulating = false,
  simulationStates: _simulationStates = {},
}: Pcb3dViewerProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const thickness = pcb.boardThicknessMm || 1.6;
  const halfW = pcb.widthMm / 2;
  const halfH = pcb.heightMm / 2;

  // Populated vs Bare PCB State
  const [showComponents, setShowComponents] = useState<boolean>(show3dComponents);
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  const [hoveredItem, setHoveredItem] = useState<{
    designator: string;
    pin: string;
    name: string;
    net: string;
    x: number;
    y: number;
    layer: string;
    drill: number;
    diameter: number;
  } | null>(null);

  useEffect(() => {
    if (show3dComponents !== undefined) {
      setShowComponents(show3dComponents);
    }
  }, [show3dComponents]);

  // Solder mask theme
  const theme = useMemo(() => getSolderMaskTheme(solderMaskColor), [solderMaskColor]);

  // Keyboard shortcut listener for Pan Tool (H / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'h' || e.key === 'H') {
        setIsPanMode((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsPanMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Camera preset handler triggered from toolbar
  useEffect(() => {
    if (!cameraPreset || !controlsRef.current) return;
    const ctrl = controlsRef.current;
    const maxDim = Math.max(pcb.widthMm, pcb.heightMm);
    const topDist = Math.max(130, maxDim * 1.55);
    const isoDist = Math.max(100, maxDim * 1.35);
    if (cameraPreset === 'iso' || cameraPreset === 'reset') {
      ctrl.object.position.set(0, isoDist * 0.8, isoDist);
      ctrl.target.set(0, 0, 0);
    } else if (cameraPreset === 'top') {
      ctrl.object.position.set(0, topDist, 0.1);
      ctrl.target.set(0, 0, 0);
    } else if (cameraPreset === 'bot') {
      ctrl.object.position.set(0, -topDist, 0.1);
      ctrl.target.set(0, 0, 0);
    } else if (cameraPreset === 'front') {
      ctrl.object.position.set(0, 0, topDist);
      ctrl.target.set(0, 0, 0);
    }
    ctrl.update();
  }, [cameraPreset, pcb.widthMm, pcb.heightMm]);

  // High-Resolution Crisp Silkscreen Texture Decal (High-DPI >= 24 px/mm)
  const silkscreenTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    const dpiScale = 24; // 24 px per mm for crisp manufacturing silkscreen
    const baseW = Math.max(2048, Math.round(pcb.widthMm * dpiScale));
    canvas.width = Math.min(4096, baseW);
    canvas.height = Math.min(4096, Math.max(1024, Math.round((canvas.width * pcb.heightMm) / pcb.widthMm)));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = canvas.width / pcb.widthMm;
    const silkColor = theme.silkscreen;

    // Outer border silkscreen
    ctx.strokeStyle = silkColor;
    ctx.lineWidth = Math.max(2, Math.round(0.25 * scale));
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

    // Board branding & metadata cleanly offset from top edge, avoiding component collisions
    ctx.fillStyle = silkColor;
    ctx.font = `bold ${Math.max(14, Math.round(2.2 * scale))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const topCollides = pcb.components?.some((c) => Math.abs(c.x - pcb.widthMm / 2) < 25 && c.y < 12);
    const titleY = topCollides ? canvas.height - 4 * scale : 4 * scale;
    ctx.fillText('EI HOUSE ENG LAB', (pcb.widthMm / 2) * scale, titleY);

    ctx.font = `${Math.max(11, Math.round(1.6 * scale))}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`REV 2.0 (${pcb.widthMm}x${pcb.heightMm}mm)`, 14 * scale, canvas.height - 4 * scale);

    // Component Silkscreen reference designators & IPC-7351 outlines via FootprintRenderer
    pcb.components?.forEach((comp) => {
      if (isVirtualSchematicSymbol(comp.type)) return;
      const cx = comp.x * scale;
      const cy = comp.y * scale;

      ctx.save();
      ctx.translate(cx, cy);
      if (comp.rotation) {
        ctx.rotate(((comp.rotation || 0) * Math.PI) / 180);
      }

      FootprintRenderer.renderSilkscreen(ctx, comp, {
        scale,
        isSelected: false,
        silkColor,
        is3dDecal: true,
      });

      ctx.restore();
    });

    // Custom user silkscreen text labels
    if (pcb.texts && pcb.texts.length > 0) {
      pcb.texts.forEach((txt) => {
        if (txt.layer === 'F.SilkS' || !txt.layer) {
          const tx = txt.xMm * scale;
          const ty = txt.yMm * scale;
          ctx.save();
          ctx.translate(tx, ty);
          if (txt.rotation) {
            ctx.rotate((txt.rotation * Math.PI) / 180);
          }
          const fontPx = Math.max(10, Math.round((txt.fontSizeMm || 2.0) * scale));
          ctx.font = `bold ${fontPx}px monospace`;
          ctx.fillStyle = silkColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(txt.text, 0, 0);
          ctx.restore();
        }
      });
    }

    // Real punched-out transparent holes on silkscreen decal matching physical drill holes
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const decalHoles = sanitizePcbHoles(
      pcb.widthMm,
      pcb.heightMm,
      pcb.pads?.filter((p) => (p.holeMm ?? 0) > 0) || [],
      pcb.mountingHoles
    );
    for (const h of decalHoles) {
      const cx = (h.x + halfW) * scale;
      const cy = (h.z + halfH) * scale;
      ctx.beginPath();
      ctx.arc(cx, cy, h.r * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 16;
    texture.needsUpdate = true;
    return texture;
  }, [pcb, theme]);

  useEffect(() => {
    return () => {
      silkscreenTexture?.dispose();
    };
  }, [silkscreenTexture]);

  // High-Resolution Top Copper + Solder Mask Relief Texture (F.Cu)
  const topCopperTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    const dpiScale = 24; // 24 px per mm for high-DPI crisp manufacturing copper
    canvas.width = Math.min(4096, Math.max(1024, Math.round(pcb.widthMm * dpiScale)));
    canvas.height = Math.min(4096, Math.max(1024, Math.round((canvas.width * pcb.heightMm) / pcb.widthMm)));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = canvas.width / pcb.widthMm;

    // Draw all Top Copper Tracks (F.Cu) with smooth rounded caps and joins
    ctx.strokeStyle = theme.trackTop;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    pcb.tracks?.forEach((track) => {
      if (track.layer !== 'top_copper') return;
      ctx.lineWidth = Math.max(2, (track.widthMm || 0.35) * scale);
      ctx.beginPath();
      ctx.moveTo(track.from.x * scale, track.from.y * scale);
      ctx.lineTo(track.to.x * scale, track.to.y * scale);
      ctx.stroke();
    });

    // Draw copper annular base rings under solder mask for all top pads & vias
    ctx.fillStyle = theme.trackTop;
    pcb.pads?.forEach((pad) => {
      if (pad.layer === 'bottom') return;
      const r = ((pad.diameterMm || 1.8) / 2) * scale;
      ctx.beginPath();
      if (pad.shape === 'rect') {
        ctx.fillRect(pad.x * scale - r, pad.y * scale - r, r * 2, r * 2);
      } else {
        ctx.arc(pad.x * scale, pad.y * scale, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // CRITICAL: PUNCH EVERY DRILL HOLE OUT OF TOP COPPER TEXTURE (ZERO HANGING COPPER!)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const decalHoles = sanitizePcbHoles(
      pcb.widthMm,
      pcb.heightMm,
      pcb.pads?.filter((p) => (p.holeMm ?? 0) > 0) || [],
      pcb.mountingHoles
    );
    for (const h of decalHoles) {
      const cx = (h.x + halfW) * scale;
      const cy = (h.z + halfH) * scale;
      ctx.beginPath();
      ctx.arc(cx, cy, h.r * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 16;
    texture.needsUpdate = true;
    return texture;
  }, [pcb.tracks, pcb.pads, pcb.mountingHoles, pcb.widthMm, pcb.heightMm, theme.trackTop, halfW, halfH]);

  useEffect(() => {
    return () => {
      topCopperTexture?.dispose();
    };
  }, [topCopperTexture]);

  // High-Resolution Bottom Copper + Solder Mask Relief Texture (B.Cu)
  const bottomCopperTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    const dpiScale = 24; // 24 px per mm for high-DPI crisp manufacturing copper
    canvas.width = Math.min(4096, Math.max(1024, Math.round(pcb.widthMm * dpiScale)));
    canvas.height = Math.min(4096, Math.max(1024, Math.round((canvas.width * pcb.heightMm) / pcb.widthMm)));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = canvas.width / pcb.widthMm;

    // Optional Bottom Ground Pour Plane
    const gndPourActive = (pcb as { gndPourLayer?: string }).gndPourLayer !== 'off';
    if (gndPourActive) {
      const margin = 1.5 * scale;
      ctx.fillStyle = theme.trackBottom;
      ctx.fillRect(margin, margin, canvas.width - margin * 2, canvas.height - margin * 2);

      // Clearances around non-GND through-hole pads on ground pour
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      pcb.pads?.forEach((pad) => {
        if (pad.netId !== 'GND' && (pad.holeMm ?? 0) > 0) {
          const clearR = ((pad.diameterMm || 1.8) / 2 + 0.35) * scale;
          ctx.beginPath();
          ctx.arc(pad.x * scale, pad.y * scale, clearR, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      // Clearances around mounting holes
      pcb.mountingHoles?.forEach((h) => {
        const hx = (h.xMm ?? 5.0) * scale;
        const hy = (h.yMm ?? 5.0) * scale;
        const hr = ((h.outerMm || 6.0) / 2 + 0.40) * scale;
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // Draw all Bottom Copper Tracks (B.Cu) with smooth rounded caps and joins
    ctx.strokeStyle = theme.trackBottom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    pcb.tracks?.forEach((track) => {
      if (track.layer !== 'bottom_copper') return;
      ctx.lineWidth = Math.max(2, (track.widthMm || 0.35) * scale);
      ctx.beginPath();
      ctx.moveTo(track.from.x * scale, track.from.y * scale);
      ctx.lineTo(track.to.x * scale, track.to.y * scale);
      ctx.stroke();
    });

    // Draw copper annular base rings under solder mask for all bottom pads & vias
    ctx.fillStyle = theme.trackBottom;
    pcb.pads?.forEach((pad) => {
      if (pad.layer === 'top') return;
      const r = ((pad.diameterMm || 1.8) / 2) * scale;
      ctx.beginPath();
      if (pad.shape === 'rect') {
        ctx.fillRect(pad.x * scale - r, pad.y * scale - r, r * 2, r * 2);
      } else {
        ctx.arc(pad.x * scale, pad.y * scale, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // CRITICAL: PUNCH EVERY DRILL HOLE OUT OF BOTTOM COPPER TEXTURE (ZERO HANGING COPPER!)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const decalHoles = sanitizePcbHoles(
      pcb.widthMm,
      pcb.heightMm,
      pcb.pads?.filter((p) => (p.holeMm ?? 0) > 0) || [],
      pcb.mountingHoles
    );
    for (const h of decalHoles) {
      const cx = (h.x + halfW) * scale;
      const cy = (h.z + halfH) * scale;
      ctx.beginPath();
      ctx.arc(cx, cy, h.r * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 16;
    texture.needsUpdate = true;
    return texture;
  }, [pcb.tracks, pcb.pads, pcb.mountingHoles, pcb.widthMm, pcb.heightMm, theme.trackBottom, halfW, halfH, (pcb as { gndPourLayer?: string }).gndPourLayer]);

  useEffect(() => {
    return () => {
      bottomCopperTexture?.dispose();
    };
  }, [bottomCopperTexture]);

  const materials = useMemo(() => {
    return {
      fr4Core: new THREE.MeshPhysicalMaterial({
        color: theme.board,
        roughness: 0.36,
        metalness: 0.08,
        clearcoat: 0.25,
        clearcoatRoughness: 0.3,
      }),
      solderMaskTop: new THREE.MeshPhysicalMaterial({
        color: theme.board,
        roughness: 0.36,
        metalness: 0.08,
        clearcoat: 0.25,
        clearcoatRoughness: 0.3,
      }),
      solderMaskBottom: new THREE.MeshPhysicalMaterial({
        color: theme.board,
        roughness: 0.36,
        metalness: 0.08,
        clearcoat: 0.25,
        clearcoatRoughness: 0.3,
      }),
      fr4Edge: new THREE.MeshStandardMaterial({
        color: '#9E9368', // realistic tan FR-4 fiberglass core board edge thickness
        roughness: 0.75,
        metalness: 0.05,
      }),
      copperTop: new THREE.MeshPhysicalMaterial({
        color: theme.trackTop, // #1F8A4C slightly raised lighter emerald-green copper-under-mask relief
        metalness: 0.15,
        roughness: 0.32,
        clearcoat: 0.35,
      }),
      copperBottom: new THREE.MeshPhysicalMaterial({
        color: theme.trackBottom, // #176B3C
        metalness: 0.15,
        roughness: 0.32,
        clearcoat: 0.35,
      }),
      bottomGroundPour: new THREE.MeshStandardMaterial({
        color: '#135831', // bottom copper-under-green-mask relief
        metalness: 0.2,
        roughness: 0.34,
        side: THREE.DoubleSide,
      }),
      copperPour: new THREE.MeshStandardMaterial({
        color: '#135831',
        metalness: 0.2,
        roughness: 0.34,
        side: THREE.DoubleSide,
      }),
      goldPad: new THREE.MeshStandardMaterial({
        color: '#D4AF37', // Official ENIG Gold (Electroless Nickel Immersion Gold)
        metalness: 0.85,
        roughness: 0.2,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
      copperBarrel: new THREE.MeshStandardMaterial({
        color: '#C87D55', // Authentic Copper Barrel Plating
        metalness: 0.88,
        roughness: 0.25,
        side: THREE.DoubleSide,
      }),
      drillHole: new THREE.MeshBasicMaterial({
        color: '#020617',
      }),
      icPlastic: new THREE.MeshStandardMaterial({
        color: '#18181B',
        roughness: 0.5,
        metalness: 0.1,
      }),
      icLead: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.95,
        roughness: 0.15,
      }),
      resistorBody: new THREE.MeshStandardMaterial({
        color: '#D4A373',
        roughness: 0.45,
      }),
      resistorBandBrown: new THREE.MeshStandardMaterial({ color: '#78350F' }),
      resistorBandBlack: new THREE.MeshStandardMaterial({ color: '#09090B' }),
      resistorBandRed: new THREE.MeshStandardMaterial({ color: '#DC2626' }),
      resistorBandGold: new THREE.MeshStandardMaterial({ color: '#F59E0B', metalness: 0.8 }),
      capRadialBlue: new THREE.MeshStandardMaterial({
        color: '#1E3A8A',
        roughness: 0.3,
      }),
      capCeramicTan: new THREE.MeshStandardMaterial({
        color: '#D97706',
        roughness: 0.6,
      }),
      capStripeWhite: new THREE.MeshStandardMaterial({
        color: '#F8FAFC',
      }),
      terminalGreen: new THREE.MeshStandardMaterial({
        color: '#15803D',
        roughness: 0.4,
      }),
      screwBrass: new THREE.MeshStandardMaterial({
        color: '#EAB308',
        metalness: 0.9,
        roughness: 0.2,
      }),
      mcuBoardBlue: new THREE.MeshStandardMaterial({
        color: '#005C8A',
        roughness: 0.4,
      }),
      usbMetal: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.95,
        roughness: 0.15,
      }),
      leadMetal: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.9,
        roughness: 0.2,
      }),
      solderFillet: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.95,
        roughness: 0.18,
      }),
      diodeGlass: new THREE.MeshPhysicalMaterial({
        color: '#1C1917',
        roughness: 0.2,
        clearcoat: 0.8,
      }),
      diodeBandSilver: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.85,
        roughness: 0.2,
      }),
      transistorPlastic: new THREE.MeshStandardMaterial({
        color: '#18181B',
        roughness: 0.45,
        metalness: 0.1,
      }),
    };
  }, [theme]);

  // 1. Punched FR-4 Substrate with Real See-Through Factory Drill Holes
  const boardGeometry = useMemo(() => {
    const shape = createPcbBoardShape(
      pcb.widthMm,
      pcb.heightMm,
      pcb.pads?.filter((p) => (p.holeMm ?? 0) > 0) || [],
      pcb.mountingHoles
    );

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: thickness,
      bevelEnabled: false,
      curveSegments: 20,
    };
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.translate(0, 0, -thickness / 2);
    geom.rotateX(Math.PI / 2);
    geom.computeVertexNormals();
    return geom;
  }, [pcb.widthMm, pcb.heightMm, pcb.pads, pcb.mountingHoles, thickness]);

  useEffect(() => {
    return () => {
      boardGeometry.dispose();
    };
  }, [boardGeometry]);



  return (
    <div className={`relative w-full h-full bg-[#070D18] select-none overflow-hidden touch-none ${isPanMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}>
      {/* Three.js Canvas */}
      <Canvas
        id="pcb-3d-webgl-canvas"
        shadows
        gl={{
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
          preserveDrawingBuffer: true,
          logarithmicDepthBuffer: true,
          antialias: true,
        }}
        camera={{ position: [0, 80, 100], fov: 40, near: 0.1, far: 2000 }}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
      >
        <color attach="background" args={['#070E1A']} />
        <WebGlResourceDisposer />

        {/* Balanced Key, Fill, Rim & Specular Environment Lighting */}
        <ambientLight intensity={1.2} />
        <directionalLight
          position={[60, 150, 80]}
          intensity={2.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0001}
        />
        <directionalLight position={[-80, 80, -60]} intensity={0.9} color="#94A3B8" />
        <directionalLight position={[0, -50, 50]} intensity={0.5} color="#CBD5E1" />
        <hemisphereLight args={['#F8FAFC', '#0F172A', 0.6]} />

        <Grid
          infiniteGrid
          position={[0, -20, 0]}
          cellSize={10}
          sectionSize={50}
          fadeDistance={300}
          cellColor="#1E293B"
          sectionColor="#334155"
        />

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={500}
          enableRotate={!isPanMode}
          enablePan={true}
          screenSpacePanning={true}
          mouseButtons={
            isPanMode
              ? {
                  LEFT: THREE.MOUSE.PAN,
                  MIDDLE: THREE.MOUSE.DOLLY,
                  RIGHT: THREE.MOUSE.ROTATE,
                }
              : {
                  LEFT: THREE.MOUSE.ROTATE,
                  MIDDLE: THREE.MOUSE.DOLLY,
                  RIGHT: THREE.MOUSE.PAN,
                }
          }
        />

        {/* 1. FR-4 Substrate Core Slab with Realistic Tan Fiberglass Edges and Real Punched Through-Holes */}
        <mesh
          geometry={boardGeometry}
          material={[materials.solderMaskTop, materials.fr4Edge]}
          castShadow
          receiveShadow
        />

        {/* 2. Top (F.Cu) Solder Mask Relief & Smooth Copper Tracks */}
        {topCopperTexture && (
          <mesh position={[0, thickness / 2 + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
            <planeGeometry args={[pcb.widthMm, pcb.heightMm]} />
            <meshPhysicalMaterial
              map={topCopperTexture}
              transparent
              opacity={0.96}
              metalness={0.25}
              roughness={0.32}
              clearcoat={0.35}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>
        )}

        {/* 3. Bottom (B.Cu) Solder Mask Relief, Ground Pour & Smooth Copper Tracks */}
        {bottomCopperTexture && (
          <mesh position={[0, -thickness / 2 - 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
            <planeGeometry args={[pcb.widthMm, pcb.heightMm]} />
            <meshPhysicalMaterial
              map={bottomCopperTexture}
              transparent
              opacity={0.96}
              metalness={0.25}
              roughness={0.32}
              clearcoat={0.35}
              depthWrite={false}
              side={THREE.DoubleSide}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>
        )}

        {/* 4. Crisp White Silkscreen Layer (F.SilkS) strictly ABOVE top copper tracks & solder mask */}
        {silkscreenTexture && (
          <mesh position={[0, thickness / 2 + 0.024, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
            <planeGeometry args={[pcb.widthMm, pcb.heightMm]} />
            <meshBasicMaterial map={silkscreenTexture} transparent opacity={0.98} depthWrite={false} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
        )}

        {/* 5. Exposed Metallic Pads, Thermal Relief Spokes & Plated Through Holes / Vias */}
        {pcb.pads.map((pad) => {
          const px = pad.x - halfW;
          const pz = pad.y - halfH;
          const r = pad.diameterMm / 2;
          const isVia = pad.componentId === 'VIA' || pad.id.startsWith('via_');
          const matchingComp = pcb.components?.find((c) => c.componentId === pad.componentId);
          const upperType = matchingComp ? (matchingComp.type || '').toUpperCase() : '';
          const upperVal = matchingComp ? (matchingComp.value || '').toUpperCase() : '';
          const isCeramicCap =
            upperType.includes('CAPACITOR') &&
            !upperType.includes('ELECTROLYTIC') &&
            !upperType.includes('RADIAL') &&
            !upperType.includes('TANTALUM') &&
            !upperVal.includes('UF') &&
            !upperVal.includes('µF');
          const isPlainResistor = upperType.includes('RESISTOR') && !upperType.includes('POT') && !upperType.includes('TRIMMER');
          const isNonPolarizedPassive = isCeramicCap || isPlainResistor;
          const isPin1 =
            !isNonPolarizedPassive &&
            (pad.pinId === '1' || pad.pinId.toLowerCase() === 'k' || pad.pinId.toLowerCase() === 'c' || pad.shape === 'rect');
          const isRect = !isVia && (pad.shape === 'rect' || isPin1);

          return (
            <group
              key={pad.id}
              position={[px, 0, pz]}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredItem({
                  designator: isVia ? 'Through-Hole Via' : (matchingComp?.designator || pad.componentId),
                  pin: isVia ? 'N/A' : pad.pinId,
                  name: isVia ? 'Layer Transition' : pad.pinId,
                  net: pad.netId || 'Connected Net',
                  x: pad.x,
                  y: pad.y,
                  layer: isVia
                    ? 'Through-Hole (All Layers)'
                    : pad.layer === 'all'
                    ? 'Through-Hole (Multi-Layer)'
                    : pad.layer === 'top'
                    ? 'F.Cu (Top)'
                    : 'B.Cu (Bottom)',
                  drill: pad.holeMm,
                  diameter: pad.diameterMm,
                });
              }}
              onPointerOut={() => setHoveredItem(null)}
            >
              {/* Top Pad / Annular Ring */}
              {isRect ? (
                <SquarePadMesh
                  position={[0, thickness / 2 + 0.036, 0]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  size={pad.diameterMm}
                  holeR={pad.holeMm / 2}
                  material={materials.goldPad}
                  renderOrder={10}
                />
              ) : (
                <RoundPadMesh
                  position={[0, thickness / 2 + 0.036, 0]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  innerR={pad.holeMm / 2}
                  outerR={r}
                  material={materials.goldPad}
                  renderOrder={10}
                />
              )}

              {/* Bottom Pad / Annular Ring */}
              {isRect ? (
                <SquarePadMesh
                  position={[0, -thickness / 2 - 0.036, 0]}
                  rotation={[Math.PI / 2, 0, 0]}
                  size={pad.diameterMm}
                  holeR={pad.holeMm / 2}
                  material={materials.goldPad}
                  renderOrder={10}
                />
              ) : (
                <RoundPadMesh
                  position={[0, -thickness / 2 - 0.036, 0]}
                  rotation={[Math.PI / 2, 0, 0]}
                  innerR={pad.holeMm / 2}
                  outerR={r}
                  material={materials.goldPad}
                  renderOrder={10}
                />
              )}

              {/* Plated Through Hole Copper Inner Barrel (hollow cylinder with open ends) */}
              <mesh position={[0, 0, 0]} material={materials.copperBarrel}>
                <cylinderGeometry args={[pad.holeMm / 2, pad.holeMm / 2, thickness + 0.02, 20, 1, true]} />
              </mesh>
            </group>
          );
        })}

        {/* 5.1 Plated M3 Corner Mounting Holes (ENIG Gold Ring, Plated Barrel, Bore) */}
        {(pcb.mountingHoles && pcb.mountingHoles.length > 0
          ? pcb.mountingHoles
          : [
              { id: 'm3_tl', x: 5.0, y: 5.0, xMm: 5.0, yMm: 5.0, drillMm: 3.2, diameterMm: 3.2, outerMm: 6.0 },
              { id: 'm3_tr', x: pcb.widthMm - 5.0, y: 5.0, xMm: pcb.widthMm - 5.0, yMm: 5.0, drillMm: 3.2, diameterMm: 3.2, outerMm: 6.0 },
              { id: 'm3_bl', x: 5.0, y: pcb.heightMm - 5.0, xMm: 5.0, yMm: pcb.heightMm - 5.0, drillMm: 3.2, diameterMm: 3.2, outerMm: 6.0 },
              { id: 'm3_br', x: pcb.widthMm - 5.0, y: pcb.heightMm - 5.0, xMm: pcb.widthMm - 5.0, yMm: pcb.heightMm - 5.0, drillMm: 3.2, diameterMm: 3.2, outerMm: 6.0 },
            ]
        ).map((hole, hIdx) => {
          const posX = hole.xMm ?? hole.x ?? 0;
          const posY = hole.yMm ?? hole.y ?? 0;
          const hx = posX - halfW;
          const hz = posY - halfH;
          const drill = hole.drillMm ?? hole.diameterMm ?? 3.2;
          const holeR = drill / 2;
          const padR = hole.outerMm ? hole.outerMm / 2 : holeR + 1.4; // 6.0mm annular ring
          return (
            <group
              key={hole.id || `m3_mount_${hIdx}`}
              position={[hx, 0, hz]}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredItem({
                  designator: 'M3 Mounting Hole',
                  pin: 'CHASSIS_GND',
                  name: 'M3 Screw Hole',
                  net: 'Chassis Ground / Mechanical',
                  x: posX,
                  y: posY,
                  layer: 'Through-Hole (All Layers)',
                  drill,
                  diameter: hole.outerMm || drill + 2.8,
                });
              }}
              onPointerOut={() => setHoveredItem(null)}
            >
              {/* Top Gold Annular Ring */}
              <RoundPadMesh
                position={[0, thickness / 2 + 0.036, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                innerR={holeR}
                outerR={padR}
                material={materials.goldPad}
                renderOrder={10}
              />
              {/* Bottom Gold Annular Ring */}
              <RoundPadMesh
                position={[0, -thickness / 2 - 0.036, 0]}
                rotation={[Math.PI / 2, 0, 0]}
                innerR={holeR}
                outerR={padR}
                material={materials.goldPad}
                renderOrder={10}
              />
              {/* Plated Through Hole Copper Inner Barrel (hollow cylinder with open ends) */}
              <mesh position={[0, 0, 0]} material={materials.copperBarrel}>
                <cylinderGeometry args={[holeR, holeR, thickness + 0.02, 24, 1, true]} />
              </mesh>
            </group>
          );
        })}

        {/* Authentic 3D CAD Component Models Shared from Studio-3D (Virtual power/GND symbols filtered out) */}
        {showComponents && pcb.components?.filter((c) => !isVirtualSchematicSymbol(c.type)).map((pComp) => {
          const cx = pComp.x - halfW;
          const cz = pComp.y - halfH;
          const rotY = ((pComp.rotation || 0) * Math.PI) / 180;
          const isBottom =
            (pComp as { layer?: string; side?: string }).layer === 'bottom' ||
            (pComp as { layer?: string; side?: string }).side === 'bottom' ||
            pComp.parameters?.layer === 'bottom' ||
            pComp.parameters?.side === 'bottom';
          const compY = isBottom ? -thickness / 2 : thickness / 2;
          const compRot: [number, number, number] = isBottom ? [Math.PI, -rotY, 0] : [0, -rotY, 0];

          // Lookup matching circuit component for telemetry and values if available
          const circuitComp = components?.find((c) => c.id === pComp.componentId);

          return (
            <SharedComponent3D
              key={pComp.componentId}
              componentId={pComp.componentId}
              type={circuitComp?.type || pComp.type}
              footprint={pComp.footprint}
              position={[cx, compY, cz]}
              rotation={compRot}
              value={circuitComp?.value || pComp.value}
              label={circuitComp?.label || pComp.label || pComp.designator}
              parameters={{
                ...circuitComp?.parameters,
                ...pComp.parameters,
                usbPlugged: false,
                isUsbPlugged: false,
                rLevel: 0,
                gLevel: 0,
                bLevel: 0,
                r: 0,
                g: 0,
                b: 0,
              }}
              renderContext="3d-view"
              isPcbAssemblyMode={true}
              hideExternalCables={true}
              usbConnected={false}
              isSelected={false}
              isSimulating={false}
              simState={{
                on: false,
                brightness: 0,
                current: 0,
                voltage: 0,
                onRed: false,
                onGreen: false,
                onBlue: false,
                redBrightness: 0,
                greenBrightness: 0,
                blueBrightness: 0,
                rLevel: 0,
                gLevel: 0,
                bLevel: 0,
                status: 'NORMAL',
                burned: false,
              }}
            />
          );
        })}
      </Canvas>

      {/* 3D Interactive Hover HUD Tooltip for Pads / Vias */}
      {hoveredItem && (
        <div className="pointer-events-none absolute top-4 right-4 z-30 bg-[#0B1528]/95 backdrop-blur-md border border-cyan-500/70 rounded-xl p-3 shadow-2xl font-mono text-xs min-w-[220px] animate-in fade-in duration-100">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-700/80">
            <span className="font-bold text-cyan-400 text-[13px]">{hoveredItem.designator}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-600/70 text-amber-300 font-bold">
              {hoveredItem.layer}
            </span>
          </div>
          <div className="space-y-1 text-[11px] text-slate-300">
            {hoveredItem.pin && hoveredItem.pin !== 'N/A' && (
              <div className="flex justify-between text-slate-400">
                <span>Pin:</span>
                <span className="text-white font-semibold">Pin {hoveredItem.pin}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-400">
              <span>Net:</span>
              <span className="text-emerald-400 font-bold">{hoveredItem.net}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Position:</span>
              <span className="text-slate-200">{hoveredItem.x.toFixed(2)}, {hoveredItem.y.toFixed(2)} mm</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Pad / Drill:</span>
              <span className="text-cyan-300">Ø {hoveredItem.diameter} mm / Ø {hoveredItem.drill} mm</span>
            </div>
          </div>
        </div>
      )}

      {/* Populated vs Bare Board Floating Mode Switcher */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-[#0B1528]/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-1 shadow-2xl font-mono text-[11px] pointer-events-auto">
        <button
          type="button"
          onClick={() => setShowComponents(true)}
          className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
            showComponents
              ? 'bg-emerald-600 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Display board with all 3D components placed"
        >
          <Box className="w-3.5 h-3.5" />
          <span>Populated (With 3D Parts)</span>
        </button>
        <button
          type="button"
          onClick={() => setShowComponents(false)}
          className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
            !showComponents
              ? 'bg-cyan-600 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Display bare manufactured PCB (tracks, pads and silkscreen only)"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Bare PCB (Tracks &amp; Pads Only)</span>
        </button>

        <div className="h-4 w-px bg-slate-700 mx-0.5" />

        {/* Pan Tool Toggle Button */}
        <button
          type="button"
          onClick={() => setIsPanMode((prev) => !prev)}
          className={`w-7 h-7 flex items-center justify-center rounded transition-all cursor-pointer ${
            isPanMode
              ? 'bg-amber-600 text-white font-bold shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title={isPanMode ? "Pan Tool Active (H) — Left-drag to pan 3D PCB" : "Pan Tool (H) — Left-drag to pan 3D PCB"}
        >
          <Hand className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
