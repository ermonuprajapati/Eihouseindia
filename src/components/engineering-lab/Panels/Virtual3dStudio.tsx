'use client';

import React, { useMemo, useCallback } from 'react';
import { CircuitComponent, CircuitWire, Component3D, Wire3D } from '@/modules/engineering-lab/types';
import { Studio3DCanvas } from '@/modules/engineering-lab/studio-3d/Studio3DCanvas';
import { createComponentInstance, COMPONENT_CATALOG } from '@/modules/engineering-lab/circuit-engine/component-catalog';

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
  // Convert 2D/generic components to 3D representation
  const components3d: Component3D[] = useMemo(() => {
    return components.map((comp, idx) => {
      // Default 3D position if not set
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

  // Convert 2D wires to 3D jumper wires
  const wires3d: Wire3D[] = useMemo(() => {
    return wires.map((w) => ({
      id: w.id,
      fromPin: { compId: w.fromCompId, pinId: w.fromPinId },
      toPin: { compId: w.toCompId, pinId: w.toPinId },
      color: w.color || '#EF4444',
      current: w.current,
    }));
  }, [wires]);

  // Add component handler from 3D Add Drawer
  const handleAddComponent3D = useCallback((c3d: Component3D) => {
    let catalogType = 'RESISTOR';
    if (c3d.type === 'ARDUINO_UNO') catalogType = 'MCU_ARDUINO_UNO';
    else if (c3d.type === 'LED') catalogType = 'LED';
    else if (c3d.type === 'BATTERY_9V') catalogType = 'BATTERY';
    else if (c3d.type === 'PUSHBUTTON') catalogType = 'SWITCH_PUSH';

    const tmpl = COMPONENT_CATALOG.find((t) => t.type === catalogType) || COMPONENT_CATALOG[0];
    const newComp = createComponentInstance(tmpl, 300, 200);
    newComp.id = c3d.id;
    newComp.label = c3d.label;
    if (c3d.value) newComp.value = c3d.value;
    newComp.x3d = c3d.x3d;
    newComp.y3d = c3d.y3d;
    newComp.z3d = c3d.z3d;
    newComp.rot3d = c3d.rotY;
    if (c3d.parameters) newComp.parameters = { ...newComp.parameters, ...c3d.parameters };

    onAddComponent(newComp);
  }, [onAddComponent]);

  // Update component handler
  const handleUpdateComponent3D = useCallback((c3d: Component3D) => {
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
  }, [components, onUpdateComponent, onUpdateComponent3DPosition]);

  // Add 3D Wire handler
  const handleAddWire3D = useCallback((w3d: Wire3D) => {
    onAddWire({
      fromCompId: w3d.fromPin.compId,
      fromPinId: w3d.fromPin.pinId,
      toCompId: w3d.toPin.compId,
      toPinId: w3d.toPin.pinId,
      color: w3d.color,
    });
  }, [onAddWire]);

  // Update 3D Wire handler (e.g. color change)
  const handleUpdateWire3D = useCallback((w3d: Wire3D) => {
    // Re-create wire with new color
    onDeleteWire(w3d.id);
    onAddWire({
      fromCompId: w3d.fromPin.compId,
      fromPinId: w3d.fromPin.pinId,
      toCompId: w3d.toPin.compId,
      toPinId: w3d.toPin.pinId,
      color: w3d.color,
    });
  }, [onDeleteWire, onAddWire]);

  return (
    <div className="relative w-full h-full">
      <Studio3DCanvas
        hasBreadboard={true}
        components3d={components3d}
        wires3d={wires3d}
        selectedCompId={selectedCompId}
        selectedWireId={selectedWireId}
        onSelectComponent={onSelectComponent}
        onSelectWire={onSelectWire}
        onAddComponent3D={handleAddComponent3D}
        onUpdateComponent3D={handleUpdateComponent3D}
        onDeleteComponent3D={onDeleteComponent}
        onAddWire3D={handleAddWire3D}
        onDeleteWire3D={onDeleteWire}
        onUpdateWire3D={handleUpdateWire3D}
        isSimulating={isSimulating}
        simulationStates={simulationStates}
      />
    </div>
  );
}
