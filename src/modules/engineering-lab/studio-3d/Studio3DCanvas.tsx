'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import {
  Trash2,
  Plus,
  X,
  Compass,
} from 'lucide-react';
import { Component3D, Wire3D } from '@/modules/engineering-lab/types';
import { Breadboard3D } from './Breadboard3D';
import { BreadboardHole3D, HOLE_BY_ID } from './breadboard-topology';
import { ArduinoUno3D, ARDUINO_PINS } from './models/ArduinoUno3D';
import { Led3D } from './models/Led3D';
import { Resistor3D } from './models/Resistor3D';
import { Battery9V3D } from './models/Battery9V3D';
import { Pushbutton3D } from './models/Pushbutton3D';
import { Wire3DTube } from './Wire3DTube';

export interface Studio3DCanvasProps {
  hasBreadboard?: boolean;
  components3d: Component3D[];
  wires3d: Wire3D[];
  selectedCompId: string | null;
  selectedWireId: string | null;
  onSelectComponent: (id: string | null) => void;
  onSelectWire: (id: string | null) => void;
  onAddComponent3D: (comp: Component3D) => void;
  onUpdateComponent3D: (comp: Component3D) => void;
  onDeleteComponent3D: (id: string) => void;
  onAddWire3D: (wire: Wire3D) => void;
  onDeleteWire3D: (id: string) => void;
  onUpdateWire3D: (wire: Wire3D) => void;
  isSimulating?: boolean;
  simulationStates?: Record<string, { voltage: number; current: number; on?: boolean }>;
}

export function Studio3DCanvas({
  hasBreadboard = true,
  components3d,
  wires3d,
  selectedCompId,
  selectedWireId,
  onSelectComponent,
  onSelectWire,
  onAddComponent3D,
  onUpdateComponent3D,
  onDeleteComponent3D,
  onAddWire3D,
  onDeleteWire3D,
  onUpdateWire3D,
  isSimulating = false,
  simulationStates = {},
}: Studio3DCanvasProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [activeWireStart, setActiveWireStart] = useState<{
    compId: string;
    pinId: string;
    pos: THREE.Vector3;
  } | null>(null);
  const [activeWireColor, setActiveWireColor] = useState('#EF4444');
  const [hoveredHole, setHoveredHole] = useState<BreadboardHole3D | null>(null);
  const [hoveredPinInfo, setHoveredPinInfo] = useState<{ compId: string; pinName: string } | null>(null);

  // Keyboard shortcut listener (R to rotate, Delete to remove, Esc to cancel wire)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'r' || e.key === 'R') {
        if (selectedCompId) {
          const comp = components3d.find((c) => c.id === selectedCompId);
          if (comp) {
            e.preventDefault();
            onUpdateComponent3D({
              ...comp,
              rotY: ((comp.rotY || 0) + 90) % 360,
            });
          }
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedWireId) {
          e.preventDefault();
          onDeleteWire3D(selectedWireId);
          onSelectWire(null);
        } else if (selectedCompId) {
          e.preventDefault();
          onDeleteComponent3D(selectedCompId);
          onSelectComponent(null);
        }
      } else if (e.key === 'Escape') {
        setActiveWireStart(null);
        onSelectWire(null);
        onSelectComponent(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCompId, selectedWireId, components3d, onUpdateComponent3D, onDeleteWire3D, onDeleteComponent3D, onSelectWire, onSelectComponent]);

  // Camera presets
  const setCameraView = (view: 'iso' | 'top' | 'front' | 'side') => {
    if (!controlsRef.current) return;
    const ctrl = controlsRef.current;
    if (view === 'iso') {
      ctrl.object.position.set(0, 140, 160);
      ctrl.target.set(0, 0, 0);
    } else if (view === 'top') {
      ctrl.object.position.set(0, 200, 0.1);
      ctrl.target.set(0, 0, 0);
    } else if (view === 'front') {
      ctrl.object.position.set(0, 20, 180);
      ctrl.target.set(0, 0, 0);
    } else if (view === 'side') {
      ctrl.object.position.set(200, 20, 0);
      ctrl.target.set(0, 0, 0);
    }
    ctrl.update();
  };

  // Helper to compute world position for any pin
  const getPinWorld3D = useCallback((compId: string, pinId: string): THREE.Vector3 => {
    if (compId === 'breadboard') {
      const hole = HOLE_BY_ID.get(pinId);
      if (hole) return new THREE.Vector3(hole.x, hole.y + 0.5, hole.z);
      return new THREE.Vector3(0, 0, 0);
    }

    const comp = components3d.find((c) => c.id === compId);
    if (!comp) return new THREE.Vector3(0, 0, 0);

    const rad = ((comp.rotY || 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    let lx = 0;
    let ly = 0;
    let lz = 0;

    if (comp.type === 'ARDUINO_UNO') {
      const ap = ARDUINO_PINS.find((p) => p.name === pinId);
      if (ap) {
        lx = ap.localPos[0];
        ly = ap.localPos[1] + 4.2;
        lz = ap.localPos[2];
      }
    } else if (comp.type === 'LED') {
      if (pinId === 'anode') lx = -1.27;
      else lx = 1.27;
      ly = -5;
    } else if (comp.type === 'RESISTOR') {
      if (pinId === '1') lx = -5.08;
      else lx = 5.08;
      ly = -5;
    } else if (comp.type === 'BATTERY_9V') {
      if (pinId === '+') lx = -6.5;
      else lx = 6.5;
      ly = 27;
    } else if (comp.type === 'PUSHBUTTON') {
      if (pinId === '1A') { lx = -2.54; lz = -2.54; }
      else if (pinId === '1B') { lx = 2.54; lz = -2.54; }
      else if (pinId === '2A') { lx = -2.54; lz = 2.54; }
      else { lx = 2.54; lz = 2.54; }
      ly = -4;
    }

    const rx = lx * cos - lz * sin;
    const rz = lx * sin + lz * cos;

    return new THREE.Vector3(comp.x3d + rx, comp.y3d + ly, comp.z3d + rz);
  }, [components3d]);

  // Terminal Pin Click Handler (Starts or Completes Wire)
  const handlePinClick = (compId: string, pinId: string, worldPos: THREE.Vector3) => {
    if (!activeWireStart) {
      // Start wire
      setActiveWireStart({ compId, pinId, pos: worldPos });
    } else {
      // Prevent connecting to self pin
      if (activeWireStart.compId === compId && activeWireStart.pinId === pinId) {
        setActiveWireStart(null);
        return;
      }

      // Complete wire connection
      const newWire: Wire3D = {
        id: `wire3d_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        fromPin: { compId: activeWireStart.compId, pinId: activeWireStart.pinId },
        toPin: { compId, pinId },
        color: activeWireColor,
      };

      onAddWire3D(newWire);
      setActiveWireStart(null);
    }
  };

  const selectedWire = wires3d.find((w) => w.id === selectedWireId);

  return (
    <div className="relative w-full h-full bg-[#050B14] select-none overflow-hidden">
      {/* 3D WebGL Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 130, 150], fov: 45, near: 0.1, far: 2000 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onContextMenu={(e) => {
          if (activeWireStart) {
            e.preventDefault();
            setActiveWireStart(null);
          }
        }}
      >
        <color attach="background" args={['#070E1A']} />

        {/* Ambient & Studio Directional Lights */}
        <ambientLight intensity={1.2} />
        <directionalLight
          position={[60, 150, 80]}
          intensity={2.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-80, 80, -60]} intensity={0.8} color="#94A3B8" />

        {/* Workbench Grid Plane */}
        <Grid
          infiniteGrid
          position={[0, -0.05, 0]}
          cellSize={10}
          sectionSize={50}
          fadeDistance={400}
          cellColor="#1E293B"
          sectionColor="#334155"
        />

        {/* Orbit Camera Controls */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={10}
          maxDistance={600}
        />

        {/* 830-Point Solderless Breadboard */}
        {hasBreadboard && (
          <Breadboard3D
            position={[0, 0, 0]}
            hoveredHole={hoveredHole}
            onHoverHole={setHoveredHole}
            onHoleClick={(hole, wPos) => {
              handlePinClick('breadboard', hole.id, wPos);
            }}
          />
        )}

        {/* 3D Components */}
        {components3d.map((comp) => {
          const isSelected = selectedCompId === comp.id;
          const pos: [number, number, number] = [comp.x3d, comp.y3d, comp.z3d];
          const rot: [number, number, number] = [0, ((comp.rotY || 0) * Math.PI) / 180, 0];
          const simState = simulationStates[comp.id];

          if (comp.type === 'ARDUINO_UNO') {
            return (
              <group
                key={comp.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                <ArduinoUno3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'LED') {
            const isPowered = Boolean(simState?.on || (simState?.current && Math.abs(simState.current) > 0.001));
            return (
              <group
                key={comp.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                <Led3D
                  position={pos}
                  rotation={rot}
                  color={String(comp.parameters?.color || comp.value || '#EF4444')}
                  isPowered={isPowered}
                  isSelected={isSelected}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'RESISTOR') {
            return (
              <group
                key={comp.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                <Resistor3D
                  position={pos}
                  rotation={rot}
                  value={comp.value || '1kΩ'}
                  isSelected={isSelected}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'BATTERY_9V') {
            return (
              <group
                key={comp.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                <Battery9V3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'PUSHBUTTON') {
            return (
              <group
                key={comp.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                <Pushbutton3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          return null;
        })}

        {/* 3D Jumper Wires */}
        {wires3d.map((w) => {
          const p1 = getPinWorld3D(w.fromPin.compId, w.fromPin.pinId);
          const p2 = getPinWorld3D(w.toPin.compId, w.toPin.pinId);
          const isSelected = selectedWireId === w.id;

          return (
            <Wire3DTube
              key={w.id}
              id={w.id}
              start={p1}
              end={p2}
              color={w.color}
              isSelected={isSelected}
              isSimulating={isSimulating}
              onClick={(id) => {
                onSelectWire(id);
                onSelectComponent(null);
              }}
            />
          );
        })}
      </Canvas>

      {/* Top Floating View Controls & Wire Colors */}
      <div className="absolute top-3 left-4 flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-lg p-1.5 shadow-xl backdrop-blur z-20">
        <button
          onClick={() => setCameraView('iso')}
          className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-mono flex items-center gap-1 cursor-pointer"
          title="Isometric View"
        >
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>Iso</span>
        </button>
        <button
          onClick={() => setCameraView('top')}
          className="px-2 py-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-mono cursor-pointer"
          title="Top Down View"
        >
          Top
        </button>
        <button
          onClick={() => setCameraView('front')}
          className="px-2 py-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-mono cursor-pointer"
          title="Front View"
        >
          Front
        </button>
        <button
          onClick={() => setCameraView('side')}
          className="px-2 py-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-mono cursor-pointer"
          title="Side View"
        >
          Side
        </button>

        <div className="h-4 w-px bg-slate-700 mx-1" />

        {/* Wire Color Chooser */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 uppercase font-mono">Wire:</span>
          {[
            { hex: '#EF4444', label: 'Red' },
            { hex: '#3B82F6', label: 'Blue' },
            { hex: '#10B981', label: 'Green' },
            { hex: '#F59E0B', label: 'Yellow' },
            { hex: '#1E293B', label: 'Black' },
          ].map((c) => (
            <button
              key={c.hex}
              onClick={() => setActiveWireColor(c.hex)}
              className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                activeWireColor === c.hex
                  ? 'ring-2 ring-cyan-400 scale-110 border-white'
                  : 'border-slate-600 hover:scale-105'
              }`}
              style={{ backgroundColor: c.hex }}
              title={`Wire Color: ${c.label}`}
            />
          ))}
        </div>
      </div>

      {/* Top Right Add Component Drawer Trigger */}
      <div className="absolute top-3 right-4 flex items-center gap-2 z-20">
        <button
          onClick={() => setIsAddDrawerOpen((o) => !o)}
          className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add 3D Part</span>
        </button>
      </div>

      {/* Add Component Drawer Dropdown */}
      {isAddDrawerOpen && (
        <div className="absolute top-14 right-4 w-64 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl z-30 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-300 font-bold uppercase text-[10px]">
            <span>3D Component Library</span>
            <button onClick={() => setIsAddDrawerOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {[
              { type: 'ARDUINO_UNO', label: 'Arduino Uno Rev3', value: 'ATmega328P', desc: 'Turquoise PCB & headers' },
              { type: 'LED', label: '5mm LED', value: 'Red', desc: 'Translucent dome & pins' },
              { type: 'RESISTOR', label: 'Resistor 1/4W', value: '220Ω', desc: 'Axial EIA 4-band rings' },
              { type: 'BATTERY_9V', label: '9V Battery Block', value: '9V', desc: 'Metallic top snaps' },
              { type: 'PUSHBUTTON', label: 'Tactile Switch 6mm', value: 'NO', desc: '4-Pin pushbutton' },
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => {
                  const newComp: Component3D = {
                    id: `comp3d_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    type: item.type,
                    label: item.label,
                    value: item.value,
                    parameters: item.type === 'LED' ? { color: 'Red', forwardVoltage: 1.9 } : {},
                    x3d: (Math.random() - 0.5) * 40,
                    y3d: 0,
                    z3d: (Math.random() - 0.5) * 30,
                    rotY: 0,
                  };
                  onAddComponent3D(newComp);
                  setIsAddDrawerOpen(false);
                  onSelectComponent(newComp.id);
                }}
                className="w-full text-left p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-colors cursor-pointer group"
              >
                <div className="font-semibold text-white group-hover:text-cyan-400">{item.label}</div>
                <div className="text-[10px] text-slate-400">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating Wire HUD when wire is selected */}
      {selectedWire && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-amber-500/80 rounded-xl px-4 py-2.5 shadow-2xl z-30 font-mono text-xs flex items-center gap-4 text-slate-200 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold uppercase text-[10px]">3D Wire:</span>
            <span className="text-[11px] text-slate-300">
              {selectedWire.fromPin.compId} ({selectedWire.fromPin.pinId}) ➔ {selectedWire.toPin.compId} ({selectedWire.toPin.pinId})
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Color picker */}
          <div className="flex items-center gap-1">
            {['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#1E293B'].map((hex) => (
              <button
                key={hex}
                onClick={() => onUpdateWire3D({ ...selectedWire, color: hex })}
                className="w-4 h-4 rounded-full border border-slate-600 hover:scale-125 transition-transform cursor-pointer"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Delete Wire */}
          <button
            onClick={() => {
              onDeleteWire3D(selectedWire.id);
              onSelectWire(null);
            }}
            className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* Wire in progress helper tooltip */}
      {activeWireStart && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-amber-500/90 text-slate-950 font-mono font-bold text-xs px-3 py-1.5 rounded-full shadow-lg z-30 flex items-center gap-2 animate-bounce">
          <span>Routing Wire from {activeWireStart.compId} [{activeWireStart.pinId}] ➔ Click destination pin/hole (Esc to cancel)</span>
        </div>
      )}

      {/* Breadboard Hole Hover Overlay */}
      {hoveredHole && (
        <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-700 rounded px-2.5 py-1 text-[11px] font-mono text-cyan-300 pointer-events-none z-20">
          📍 {hoveredHole.name} ({hoveredHole.tieGroup})
        </div>
      )}
    </div>
  );
}
