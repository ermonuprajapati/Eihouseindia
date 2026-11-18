'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CircuitComponent, CircuitWire, Component3D, Wire3D } from '@/modules/engineering-lab/types';
import { Studio3DCanvas } from '@/modules/engineering-lab/studio-3d/Studio3DCanvas';
import { createComponentInstance, COMPONENT_CATALOG } from '@/modules/engineering-lab/circuit-engine/component-catalog';
import { Box, FilePlus, RefreshCw, Save } from 'lucide-react';

interface Virtual3dStudioProps {
  components: CircuitComponent[];
  wires: CircuitWire[];
  selectedCompId: string | null;
  selectedWireId?: string | null;
  onSelectComponent?: (id: string | null) => void;
  onSelectWire?: (id: string | null) => void;
  onAddComponent: (comp: CircuitComponent) => void;
  onUpdateComponent?: (updated: CircuitComponent) => void;
  onUpdateComponentPosition?: (id: string, x: number, y: number) => void;
  onUpdateComponent3DPosition?: (id: string, x3d: number, y3d: number, z3d: number) => void;
  onDeleteComponent?: (id: string) => void;
  onAddWire: (wire: Omit<CircuitWire, 'id'>) => void;
  onDeleteWire?: (wireId: string) => void;
  onDisconnectWire?: (wireId: string) => void;
  isSimulating: boolean;
  simulationStates: Record<string, { voltage: number; current: number; on?: boolean; onRed?: boolean; onGreen?: boolean; onBlue?: boolean }>;
  wireCurrents?: Record<string, number>;
  gpioStates?: Record<number | string, { mode: 'INPUT' | 'OUTPUT'; value: 0 | 1; analogVal: number }>;
}

export function Virtual3dStudio({
  components,
  wires,
  selectedCompId,
  selectedWireId = null,
  onSelectComponent = () => {},
  onSelectWire = () => {},
  onAddComponent,
  onUpdateComponent,
  onUpdateComponent3DPosition,
  onDeleteComponent = () => {},
  onAddWire,
  onDeleteWire = () => {},
  isSimulating,
  simulationStates,
}: Virtual3dStudioProps) {
  // Independent 3D Studio document state (Decoupled from 2D Schematic)
  const [independentComponents, setIndependentComponents] = useState<Component3D[] | null>(null);
  const [independentWires, setIndependentWires] = useState<Wire3D[] | null>(null);

  // Restore saved 3D project from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ei_house_virtual3d_project');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.components3d) && Array.isArray(parsed.wires3d)) {
          setIndependentComponents(parsed.components3d);
          setIndependentWires(parsed.wires3d);
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }, []);

  // Convert 2D schematic components to 3D representation (used for initial state or explicit import)
  const schematicTo3DComponents = useCallback((): Component3D[] => {
    return components.map((comp, idx) => {
      const defaultX = (idx - (components.length - 1) / 2) * 22;
      const defaultZ = -38;

      let mappedType = comp.type;
      if (comp.type.includes('ARDUINO') || comp.type === 'MCU_ARDUINO_UNO') {
        mappedType = 'ARDUINO_UNO';
      } else if (comp.type.includes('LED')) {
        mappedType = 'LED';
      } else if (comp.type.includes('RESISTOR')) {
        mappedType = 'RESISTOR';
      } else if (comp.type.includes('BATTERY') || comp.type === 'DC_VOLTAGE') {
        mappedType = 'BATTERY_9V';
      } else if (comp.type.includes('BUTTON') || comp.type.includes('SWITCH')) {
        mappedType = 'PUSHBUTTON';
      } else if (comp.type.includes('POTENTIOMETER')) {
        mappedType = 'POTENTIOMETER';
      } else if (comp.type.includes('TIMER') || comp.type.includes('555')) {
        mappedType = 'TIMER_555';
      } else if (comp.type.includes('CAPACITOR')) {
        mappedType = comp.type.includes('ELECTROLYTIC') ? 'CAPACITOR_ELECTROLYTIC' : 'CAPACITOR';
      }

      return {
        id: comp.id,
        type: mappedType,
        label: comp.label,
        value: comp.value,
        parameters: comp.parameters || {},
        x3d: comp.x3d !== undefined ? comp.x3d : defaultX,
        y3d: comp.y3d !== undefined ? comp.y3d : 0,
        z3d: comp.z3d !== undefined ? comp.z3d : defaultZ,
        rotY: comp.rot3d !== undefined ? comp.rot3d : (comp.rotation || 0),
      };
    });
  }, [components]);

  const schematicTo3DWires = useCallback((): Wire3D[] => {
    return wires.map((w) => ({
      id: w.id,
      fromPin: { compId: w.fromCompId, pinId: w.fromPinId },
      toPin: { compId: w.toCompId, pinId: w.toPinId },
      color: w.color || '#EF4444',
      current: w.current,
    }));
  }, [wires]);

  // Active 3D components and wires in the workbench
  const activeComponents3d: Component3D[] = useMemo(() => {
    if (independentComponents !== null) return independentComponents;
    return schematicTo3DComponents();
  }, [independentComponents, schematicTo3DComponents]);

  const activeWires3d: Wire3D[] = useMemo(() => {
    if (independentWires !== null) return independentWires;
    return schematicTo3DWires();
  }, [independentWires, schematicTo3DWires]);

  // Top Bar Action: New Blank 3D Workbench
  const handleNewBlank3D = () => {
    setIndependentComponents([]);
    setIndependentWires([]);
    onSelectComponent(null);
    onSelectWire(null);
    toast.success('Initialized clean 3D Virtual Studio with empty 830-point breadboard.');
  };

  // Top Bar Action: Import from 2D Schematic
  const handleImportFromSchematic = () => {
    const comps = schematicTo3DComponents();
    const w = schematicTo3DWires();
    setIndependentComponents(comps);
    setIndependentWires(w);
    toast.success(`Imported ${comps.length} components and ${w.length} wires from Schematic.`);
  };

  // Top Bar Action: Save 3D Project / Export JSON
  const handleSave3DProject = () => {
    const projectPayload = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      components3d: activeComponents3d,
      wires3d: activeWires3d,
    };
    try {
      localStorage.setItem('ei_house_virtual3d_project', JSON.stringify(projectPayload));
    } catch {
      // Ignore localStorage errors
    }

    // Download JSON backup
    const blob = new Blob([JSON.stringify(projectPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ei-house-3d-circuit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('3D Project saved to local storage & exported as JSON.');
  };

  // Add component handler from 3D Add Drawer
  const handleAddComponent3D = useCallback((c3d: Component3D) => {
    // Correctly map 3D component types to catalog templates without falling back to Resistor
    let catalogType = c3d.type;
    if (c3d.type === 'ARDUINO_UNO') catalogType = 'ARDUINO_UNO';
    else if (c3d.type === 'ARDUINO_NANO') catalogType = 'ARDUINO_NANO';
    else if (c3d.type === 'ESP32_DEVKIT') catalogType = 'ESP32_DEVKIT';
    else if (c3d.type === 'LED') catalogType = 'LED';
    else if (c3d.type === 'LED_RGB') catalogType = 'LED_RGB';
    else if (c3d.type === 'RESISTOR') catalogType = 'RESISTOR';
    else if (c3d.type === 'POTENTIOMETER') catalogType = 'POTENTIOMETER';
    else if (c3d.type === 'CAPACITOR') catalogType = 'CAPACITOR';
    else if (c3d.type === 'CAPACITOR_ELECTROLYTIC') catalogType = 'CAPACITOR_ELECTROLYTIC';
    else if (c3d.type === 'TIMER_555') catalogType = 'TIMER_555';
    else if (c3d.type === 'BATTERY_9V') catalogType = 'BATTERY';
    else if (c3d.type === 'PUSHBUTTON') catalogType = 'SWITCH_PUSH';
    else if (c3d.type === 'HC_SR04') catalogType = 'SENSOR_ULTRASONIC';
    else if (c3d.type === 'SERVO_SG90') catalogType = 'SERVO_MOTOR';
    else if (c3d.type === 'LCD_1602') catalogType = 'DISPLAY_LCD1602';

    const tmpl =
      COMPONENT_CATALOG.find((t) => t.type === catalogType) ||
      COMPONENT_CATALOG.find((t) => t.type === 'RESISTOR') ||
      COMPONENT_CATALOG[0];

    const newComp = createComponentInstance(tmpl, 300, 200, components);
    newComp.id = c3d.id;
    newComp.label = c3d.label;
    if (c3d.value) newComp.value = c3d.value;
    newComp.x3d = c3d.x3d;
    newComp.y3d = c3d.y3d;
    newComp.z3d = c3d.z3d;
    newComp.rot3d = c3d.rotY;
    if (c3d.parameters) newComp.parameters = { ...newComp.parameters, ...c3d.parameters };

    // Update local independent 3D state
    setIndependentComponents((prev) => {
      const current = prev !== null ? prev : activeComponents3d;
      return [...current, c3d];
    });

    onAddComponent(newComp);
    toast.success(`Spawned ${c3d.label} in 3D workbench.`);
  }, [components, activeComponents3d, onAddComponent]);

  // Update component position/rotation handler
  const handleUpdateComponent3D = useCallback((c3d: Component3D) => {
    setIndependentComponents((prev) => {
      const current = prev !== null ? prev : activeComponents3d;
      return current.map((c) => (c.id === c3d.id ? c3d : c));
    });

    if (onUpdateComponent3DPosition) {
      onUpdateComponent3DPosition(c3d.id, c3d.x3d, c3d.y3d, c3d.z3d);
    }
    const comp = components.find((c) => c.id === c3d.id);
    if (comp && onUpdateComponent) {
      onUpdateComponent({
        ...comp,
        x3d: c3d.x3d,
        y3d: c3d.y3d,
        z3d: c3d.z3d,
        rot3d: c3d.rotY,
        parameters: { ...comp.parameters, ...c3d.parameters },
      });
    }
  }, [activeComponents3d, components, onUpdateComponent, onUpdateComponent3DPosition]);

  // Delete component from 3D studio
  const handleDeleteComponent3D = useCallback((id: string) => {
    setIndependentComponents((prev) => {
      const current = prev !== null ? prev : activeComponents3d;
      return current.filter((c) => c.id !== id);
    });
    setIndependentWires((prev) => {
      const current = prev !== null ? prev : activeWires3d;
      return current.filter((w) => w.fromPin.compId !== id && w.toPin.compId !== id);
    });
    onDeleteComponent(id);
    toast.info('Deleted 3D component.');
  }, [activeComponents3d, activeWires3d, onDeleteComponent]);

  // Add 3D Wire handler
  const handleAddWire3D = useCallback((w3d: Wire3D) => {
    setIndependentWires((prev) => {
      const current = prev !== null ? prev : activeWires3d;
      return [...current, w3d];
    });

    onAddWire({
      fromCompId: w3d.fromPin.compId,
      fromPinId: w3d.fromPin.pinId,
      toCompId: w3d.toPin.compId,
      toPinId: w3d.toPin.pinId,
      color: w3d.color,
    });
    toast.success('Connected 3D Dupont jumper wire.');
  }, [activeWires3d, onAddWire]);

  // Delete 3D wire handler
  const handleDeleteWire3D = useCallback((wireId: string) => {
    setIndependentWires((prev) => {
      const current = prev !== null ? prev : activeWires3d;
      return current.filter((w) => w.id !== wireId);
    });
    onDeleteWire(wireId);
  }, [activeWires3d, onDeleteWire]);

  // Update 3D Wire handler (e.g. color change)
  const handleUpdateWire3D = useCallback((w3d: Wire3D) => {
    setIndependentWires((prev) => {
      const current = prev !== null ? prev : activeWires3d;
      return current.map((w) => (w.id === w3d.id ? w3d : w));
    });

    onDeleteWire(w3d.id);
    onAddWire({
      fromCompId: w3d.fromPin.compId,
      fromPinId: w3d.fromPin.pinId,
      toCompId: w3d.toPin.compId,
      toPinId: w3d.toPin.pinId,
      color: w3d.color,
    });
  }, [activeWires3d, onDeleteWire, onAddWire]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#070D18] select-none overflow-hidden">
      {/* Top 3D Studio Toolbar */}
      <div className="h-11 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
            3D Virtual Studio
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 font-mono">
            830-Point Breadboard
          </span>
        </div>

        {/* Independent 3D Studio Action Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={handleNewBlank3D}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
            title="Start a fresh blank 3D circuit on breadboard"
          >
            <FilePlus className="w-3.5 h-3.5 text-cyan-400" />
            <span>New Blank 3D</span>
          </button>

          <button
            type="button"
            onClick={handleImportFromSchematic}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
            title="Import all components and connections from 2D Schematic"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Import from Schematic</span>
          </button>

          <button
            type="button"
            onClick={handleSave3DProject}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow transition-colors cursor-pointer"
            title="Save 3D circuit locally and export as JSON"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save 3D / Export JSON</span>
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        <Studio3DCanvas
          hasBreadboard={true}
          components3d={activeComponents3d}
          wires3d={activeWires3d}
          selectedCompId={selectedCompId}
          selectedWireId={selectedWireId}
          onSelectComponent={onSelectComponent}
          onSelectWire={onSelectWire}
          onAddComponent3D={handleAddComponent3D}
          onUpdateComponent3D={handleUpdateComponent3D}
          onDeleteComponent3D={handleDeleteComponent3D}
          onAddWire3D={handleAddWire3D}
          onDeleteWire3D={handleDeleteWire3D}
          onUpdateWire3D={handleUpdateWire3D}
          isSimulating={isSimulating}
          simulationStates={simulationStates}
        />
      </div>
    </div>
  );
}
