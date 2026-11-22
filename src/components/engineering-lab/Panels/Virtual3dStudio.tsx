'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CircuitComponent, CircuitWire, Component3D, Wire3D } from '@/modules/engineering-lab/types';
import { Studio3DCanvas } from '@/modules/engineering-lab/studio-3d/Studio3DCanvas';
import {
  BreadboardOccupancyMap,
  getTieGroupForHole,
  START_X,
  PITCH_X,
  computeComponentGroundElevation,
} from '@/modules/engineering-lab/studio-3d/breadboard-topology';
import { createComponentInstance, COMPONENT_CATALOG } from '@/modules/engineering-lab/circuit-engine/component-catalog';
import { TEMPLATE_555_ASTABLE } from '@/modules/engineering-lab/templates/starter-templates';
import { Box, FilePlus, RefreshCw, Save, RotateCcw, RotateCw, Sliders, FlipHorizontal } from 'lucide-react';

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
  onAddWire: (wire: Omit<CircuitWire, 'id'> & { id?: string }) => void;
  onDeleteWire?: (wireId: string) => void;
  onDisconnectWire?: (wireId: string) => void;
  isSimulating: boolean;
  simulationStates: Record<
    string,
    {
      voltage: number;
      current: number;
      on?: boolean;
      brightness?: number;
      status?: 'NORMAL' | 'WARNING' | 'BURNED';
      faultState?: 'NORMAL' | 'WARNING' | 'BURNED';
      burned?: boolean;
      isBurnedOut?: boolean;
      thermalStress?: number;
      fault?: string;
      onRed?: boolean;
      onGreen?: boolean;
      onBlue?: boolean;
    }
  >;
  wireCurrents?: Record<string, number>;
  gpioStates?: Record<number | string, { mode: 'INPUT' | 'OUTPUT'; value: 0 | 1; analogVal: number }>;
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
  onSaveWorkspace?: () => void;
}

interface Studio3DHistoryState {
  components: Component3D[];
  wires: Wire3D[];
}

/**
 * Consolidated canonical 3D type mapping helper reused across 3D generation and 2-way sync
 */
export function mapCircuitCompTo3DType(comp: CircuitComponent): string {
  const type = comp.type || '';
  const model3d = comp.model3d || '';

  if (type.includes('MEGA') || model3d.includes('mega')) return 'ARDUINO_MEGA';
  if (type.includes('ARDUINO_NANO') || model3d.includes('nano')) return 'ARDUINO_NANO';
  if (type.includes('ARDUINO') || type === 'MCU_ARDUINO_UNO' || model3d.includes('uno')) return 'ARDUINO_UNO';
  if (type.includes('ESP32') || model3d.includes('esp32')) return 'ESP32_DEVKIT';
  if (type.includes('PICO') || model3d.includes('pico')) return 'RASPBERRY_PI_PICO';
  if (type.includes('BATTERY') || type === 'DC_VOLTAGE') return 'BATTERY_9V';
  if (type.includes('LED_RGB') || type.includes('RGB')) return 'LED_RGB';
  if (type.includes('LED')) return 'LED';
  if (type.includes('RESISTOR')) return 'RESISTOR';
  if (type.includes('BUTTON') || type.includes('SWITCH')) {
    return type.includes('SLIDE') ? 'SLIDE_SWITCH' : 'PUSHBUTTON';
  }
  if (type.includes('POTENTIOMETER')) return 'POTENTIOMETER';
  if (type.includes('TIMER') || type.includes('555')) return 'TIMER_555';
  if (type.includes('CAPACITOR')) {
    return type.includes('ELECTROLYTIC') || model3d.includes('can') || model3d.includes('radial') || Boolean(comp.parameters?.polarized)
      ? 'CAPACITOR_ELECTROLYTIC'
      : 'CAPACITOR';
  }
  if (type.includes('ULTRASONIC') || type.includes('SR04')) return 'HC_SR04';
  if (
    type.includes('BLUETOOTH') ||
    type.includes('HC05') ||
    type.includes('HC06') ||
    type.includes('RF_BLUETOOTH') ||
    model3d.includes('bluetooth') ||
    model3d.includes('hc05')
  ) {
    return 'MODULE_BLUETOOTH_HC05';
  }
  if (type.includes('SERVO')) return 'SERVO_SG90';
  if (type.includes('LCD') || type.includes('1602')) return 'LCD_1602';
  if (type.includes('BUZZER')) return 'BUZZER_ACTIVE';
  if (type.includes('DIODE')) return 'DIODE';
  if (type.includes('LDR')) return 'SENSOR_LDR';

  return type;
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
  wireCurrents,
  isInspectorOpen,
  onToggleInspector,
  onSaveWorkspace,
}: Virtual3dStudioProps) {
  // Independent 3D Studio document state (Decoupled from 2D Schematic)
  const [independentComponents, setIndependentComponents] = useState<Component3D[] | null>(null);
  const [independentWires, setIndependentWires] = useState<Wire3D[] | null>(null);
  const [undoStack3D, setUndoStack3D] = useState<Studio3DHistoryState[]>([]);
  const [redoStack3D, setRedoStack3D] = useState<Studio3DHistoryState[]>([]);
  const [hasBreadboard, setHasBreadboard] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ei_house_virtual3d_has_breadboard');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  const handleToggleBreadboard = useCallback(() => {
    setHasBreadboard((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ei_house_virtual3d_has_breadboard', String(next));
      } catch {}
      toast.info(next ? 'Added 830-Point Solderless Breadboard.' : 'Removed Solderless Breadboard from workbench.');
      return next;
    });
  }, []);


  // Helper: Strip undefined fields so parameters matches Record<string, string | number | boolean>
  const cleanParams = (
    params?: Record<string, string | number | boolean>,
    model3d?: string,
    footprint?: string,
    packageType?: string,
    mirrored?: boolean
  ): Record<string, string | number | boolean> => {
    const res: Record<string, string | number | boolean> = { ...(params || {}) };
    if (model3d) res.model3d = model3d;
    if (footprint) res.footprint = footprint;
    if (packageType) res.packageType = packageType;
    if (mirrored !== undefined) res.mirrored = mirrored;
    return res;
  };

  // Forensically synchronize changes made to components externally (e.g. Inspector MCU Physical Representation, Power switch, values, rotation, footprint)
  useEffect(() => {
    if (independentComponents === null) return;
    setIndependentComponents((prev) => {
      if (!prev) return prev;
      let changed = false;
      const next = prev.map((c3d) => {
        const matching = components.find((c) => c.id === c3d.id);
        if (!matching) return c3d;

        const mappedType = mapCircuitCompTo3DType(matching);
        const targetRot = matching.rot3d !== undefined ? matching.rot3d : (matching.rotation ?? 0);
        const rotChanged = (c3d.rotY ?? 0) !== targetRot;
        const rotXChanged = (c3d.rotX ?? 0) !== (matching.parameters?.rotX ?? 0);
        const rotZChanged = (c3d.rotZ ?? 0) !== (matching.parameters?.rotZ ?? 0);
        const paramsChanged = JSON.stringify(c3d.parameters || {}) !== JSON.stringify(matching.parameters || {});
        const model3dChanged = c3d.parameters?.model3d !== matching.model3d;
        const footprintChanged = c3d.parameters?.footprint !== matching.footprint;
        const packageChanged = c3d.parameters?.packageType !== matching.packageType;

        if (
          c3d.type !== mappedType ||
          c3d.value !== matching.value ||
          c3d.label !== matching.label ||
          paramsChanged ||
          rotChanged ||
          rotXChanged ||
          rotZChanged ||
          model3dChanged ||
          footprintChanged ||
          packageChanged
        ) {
          changed = true;
          return {
            ...c3d,
            type: mappedType,
            value: matching.value,
            label: matching.label,
            rotY: targetRot,
            rotX: typeof matching.parameters?.rotX === 'number' ? matching.parameters.rotX : (c3d.rotX || 0),
            rotZ: typeof matching.parameters?.rotZ === 'number' ? matching.parameters.rotZ : (c3d.rotZ || 0),
            parameters: {
              ...(matching.parameters || {}),
              ...(matching.model3d ? { model3d: matching.model3d } : {}),
              ...(matching.footprint ? { footprint: matching.footprint } : {}),
              ...(matching.packageType ? { packageType: matching.packageType } : {}),
              ...(matching.mirrored !== undefined ? { mirrored: matching.mirrored } : {}),
            },
          };
        }
        return c3d;
      });

      // Synchronize newly added components from schematic library into active 3D view
      const existingIds = new Set(prev.map((c) => c.id));
      const newlyAdded = components
        .filter((c) => c.type !== 'GROUND' && c.type !== 'VCC' && !c.id.toLowerCase().startsWith('gnd') && !existingIds.has(c.id))
        .map((comp) => {
          const mapped = mapCircuitCompTo3DType(comp);
          return {
            id: comp.id,
            type: mapped,
            label: comp.label,
            value: comp.value,
            parameters: {
              ...(comp.parameters || {}),
              ...(comp.model3d ? { model3d: comp.model3d } : {}),
              ...(comp.footprint ? { footprint: comp.footprint } : {}),
              ...(comp.packageType ? { packageType: comp.packageType } : {}),
              ...(comp.mirrored !== undefined ? { mirrored: comp.mirrored } : {}),
            },
            x3d: comp.x3d ?? -20,
            y3d: comp.y3d ?? 8.5,
            z3d: comp.z3d ?? 8.42,
            rotY: comp.rot3d !== undefined ? comp.rot3d : (comp.rotation ?? 0),
            rotX: typeof comp.parameters?.rotX === 'number' ? comp.parameters.rotX : 0,
            rotZ: typeof comp.parameters?.rotZ === 'number' ? comp.parameters.rotZ : 0,
          };
        });

      if (newlyAdded.length > 0) {
        return [...next, ...newlyAdded];
      }
      return changed ? next : prev;
    });
  }, [components, independentComponents]);

  // Convert 2D schematic components to 3D representation without placing any parts floating in air
  const schematicTo3DComponents = useCallback((forceAutoLayout = false, compsList: CircuitComponent[] = components): Component3D[] => {
    let mcuIdx = 0;
    let batteryIdx = 0;
    let sensorIdx = 0;
    let passiveIdx = 0;

    // Filter out virtual schematic rails (GND / VCC) - they are physically routed via breadboard power rails
    const physicalComponents = compsList.filter(
      (c) => c.type !== 'GROUND' && c.type !== 'VCC' && !c.id.toLowerCase().startsWith('gnd')
    );

    return physicalComponents.map((comp) => {
      const mappedType = mapCircuitCompTo3DType(comp);

      // Preserve previously saved 3D coordinates if valid (unless forceAutoLayout is true)
      if (!forceAutoLayout && comp.x3d !== undefined && comp.y3d !== undefined && comp.z3d !== undefined) {
        return {
          id: comp.id,
          type: mappedType,
          label: comp.label,
          value: comp.value,
          parameters: comp.parameters || {},
          x3d: comp.x3d,
          y3d: comp.y3d,
          z3d: comp.z3d,
          rotY: typeof comp.parameters?.rotY === 'number' ? comp.parameters.rotY : (comp.rot3d !== undefined ? comp.rot3d : (comp.rotation || 0)),
          rotX: typeof comp.parameters?.rotX === 'number' ? comp.parameters.rotX : 0,
          rotZ: typeof comp.parameters?.rotZ === 'number' ? comp.parameters.rotZ : 0,
        };
      }

      // Grounding & Snapping Rules (Never floating in air)
      // A. Main Microcontrollers: Place flat on workbench table (y = 0) in front of breadboard
      if (['ARDUINO_UNO', 'ARDUINO_MEGA'].includes(mappedType)) {
        const x3d = (mcuIdx % 2 === 0 ? 1 : -1) * Math.floor((mcuIdx + 1) / 2) * 85;
        const z3d = 65; // In front of breadboard
        mcuIdx++;
        return {
          id: comp.id,
          type: mappedType,
          label: comp.label,
          value: comp.value,
          parameters: cleanParams(comp.parameters, comp.model3d, comp.footprint, comp.packageType, comp.mirrored),
          x3d,
          y3d: computeComponentGroundElevation(mappedType, x3d, z3d, false),
          z3d,
          rotY: 0,
          rotX: 0,
          rotZ: 0,
        };
      }

      // B. Batteries: Place flat on workbench table to the left (y = 0)
      if (mappedType === 'BATTERY_9V') {
        const x3d = -95 - batteryIdx * 35;
        const z3d = 0;
        batteryIdx++;
        return {
          id: comp.id,
          type: mappedType,
          label: comp.label,
          value: comp.value,
          parameters: cleanParams(comp.parameters, comp.model3d, comp.footprint, comp.packageType, comp.mirrored),
          x3d,
          y3d: computeComponentGroundElevation(mappedType, x3d, z3d, false),
          z3d,
          rotY: 0,
          rotX: 0,
          rotZ: 0,
        };
      }

      // C. Heavy Modules / Displays: Place flat on workbench table to the right (y = 0)
      if (['HC_SR04', 'SERVO_SG90', 'LCD_1602', 'MODULE_BLUETOOTH_HC05'].includes(mappedType)) {
        const x3d = 95 + (sensorIdx % 2) * 35;
        const z3d = -35 + Math.floor(sensorIdx / 2) * 45;
        sensorIdx++;
        return {
          id: comp.id,
          type: mappedType,
          label: comp.label,
          value: comp.value,
          parameters: cleanParams(comp.parameters, comp.model3d, comp.footprint, comp.packageType, comp.mirrored),
          x3d,
          y3d: computeComponentGroundElevation(mappedType, x3d, z3d, false),
          z3d,
          rotY: typeof comp.parameters?.rotY === 'number' ? comp.parameters.rotY : (comp.rot3d !== undefined ? comp.rot3d : (comp.rotation || 0)),
          rotX: typeof comp.parameters?.rotX === 'number' ? comp.parameters.rotX : 0,
          rotZ: typeof comp.parameters?.rotZ === 'number' ? comp.parameters.rotZ : 0,
        };
      }

      // D. Compact DIP Microcontrollers & ICs (Nano, ESP32, Pico, NE555):
      // Straddle breadboard center isolation trench directly seated with pin insertion clearance
      // For DIP-8 (NE555), center is at -3.81mm (START_X + 29.5 * PITCH_X) to seat pins 1..4 in cols 29..32 (Row E) and pins 5..8 in cols 32..29 (Row F)
      if (['ARDUINO_NANO', 'ESP32_DEVKIT', 'RASPBERRY_PI_PICO', 'TIMER_555'].includes(mappedType)) {
        const colX = mappedType === 'TIMER_555' ? -3.81 : -5.08;
        const z3d = 0;
        return {
          id: comp.id,
          type: mappedType,
          label: comp.label,
          value: comp.value,
          parameters: cleanParams(comp.parameters, comp.model3d, comp.footprint, comp.packageType, comp.mirrored),
          x3d: colX,
          y3d: computeComponentGroundElevation(mappedType, colX, z3d, true),
          z3d, // Straddling center isolation trench (pins in rows E and F)
          rotY: typeof comp.parameters?.rotY === 'number' ? comp.parameters.rotY : (comp.rot3d !== undefined ? comp.rot3d : (comp.rotation || 0)),
          rotX: typeof comp.parameters?.rotX === 'number' ? comp.parameters.rotX : 0,
          rotZ: typeof comp.parameters?.rotZ === 'number' ? comp.parameters.rotZ : 0,
        };
      }

      // E. Through-Hole Passives (Resistors, LEDs, Capacitors, Diodes, Buttons, Trimmers, LDRs, RGB LED, Buzzer):
      // Assign non-overlapping, dedicated breadboard columns separated by multiple empty rows/cols:
      // Left of IC: Cols 10, 16, 22. Right of IC: Cols 38, 44, 50, 56.
      const DEDICATED_COLS = [10, 16, 22, 38, 44, 50, 56];
      const assignedCol = DEDICATED_COLS[passiveIdx % DEDICATED_COLS.length];
      const colX = -78.74 + (assignedCol - 1) * 2.54;
      const isTopStrip = passiveIdx % 2 === 0;
      const z3d = isTopStrip ? -8.42 : 8.42;
      passiveIdx++;
      return {
        id: comp.id,
        type: mappedType,
        label: comp.label,
        value: comp.value,
        parameters: cleanParams(comp.parameters, comp.model3d, comp.footprint, comp.packageType, comp.mirrored),
        x3d: colX,
        y3d: computeComponentGroundElevation(mappedType, colX, z3d, true),
        z3d, // Seated in terminal rows
        rotY: typeof comp.parameters?.rotY === 'number' ? comp.parameters.rotY : (comp.rot3d !== undefined ? comp.rot3d : (comp.rotation || 0)),
        rotX: typeof comp.parameters?.rotX === 'number' ? comp.parameters.rotX : 0,
        rotZ: typeof comp.parameters?.rotZ === 'number' ? comp.parameters.rotZ : 0,
      };
    });
  }, [components]);

  // Helper: Resolve exact breadboard hole for a component's lead pin
  const getBreadboardHoleForComponentPin = useCallback((comp: Component3D, pinId: string): string | null => {
    const isDip = comp.type === 'TIMER_555' || comp.type === 'DIP_IC' || comp.type.includes('DIP') || comp.type.includes('555');
    if (isDip) {
      const centerCol = Math.round((comp.x3d - START_X) / PITCH_X - 0.5) + 1;
      const pinNum = parseInt(pinId, 10);
      if (!isNaN(pinNum) && pinNum >= 1 && pinNum <= 8) {
        if (pinNum <= 4) {
          const col = Math.max(1, Math.min(63, centerCol - 1 + (pinNum - 1)));
          return `bb_col_${col}_E`;
        } else {
          const col = Math.max(1, Math.min(63, centerCol - 1 + (8 - pinNum)));
          return `bb_col_${col}_F`;
        }
      }
    }

    const centerCol = Math.round((comp.x3d - START_X) / PITCH_X) + 1;
    const isTop = (comp.z3d ?? 0) <= 0;
    const row = isTop ? 'C' : 'H';

    if (comp.type === 'RESISTOR') {
      const col = pinId === '1' ? centerCol - 2 : centerCol + 2;
      return `bb_col_${Math.max(1, Math.min(63, col))}_${row}`;
    }

    if (comp.type === 'CAPACITOR' || comp.type === 'CAPACITOR_ELECTROLYTIC') {
      const isPin1 = pinId === '1' || pinId === '+' || pinId.toLowerCase().includes('pos') || pinId.toLowerCase().includes('anode');
      const col = isPin1 ? centerCol - 1 : centerCol + 1;
      return `bb_col_${Math.max(1, Math.min(63, col))}_${row}`;
    }

    if (comp.type === 'LED') {
      const p = pinId.toLowerCase();
      const isAnode = p === 'anode' || p === 'a' || p === '1' || p === '+';
      const col = isAnode ? centerCol - 1 : centerCol + 1;
      return `bb_col_${Math.max(1, Math.min(63, col))}_${row}`;
    }

    if (comp.type === 'DIODE' || comp.type === 'DIODE_1N4007') {
      const isAnode = pinId === '1' || pinId === 'anode' || pinId === 'a';
      const col = isAnode ? centerCol - 2 : centerCol + 2;
      return `bb_col_${Math.max(1, Math.min(63, col))}_${row}`;
    }

    if (comp.type === 'LED_RGB' || comp.type === 'ACTUATOR_RGB_LED' || comp.parameters?.model3d === 'led_rgb_5mm') {
      const p = (pinId || '').trim().toLowerCase();
      let colOffset = 0;
      if (p === 'r' || p === '1' || p === 'red') colOffset = -1;
      else if (p === 'c' || p === 'cc' || p === 'com' || p === 'gnd' || p === '-' || p === '2') colOffset = 0;
      else if (p === 'g' || p === '3' || p === 'green') colOffset = 1;
      else if (p === 'b' || p === '4' || p === 'blue') colOffset = 2;
      const col = centerCol + colOffset;
      return `bb_col_${Math.max(1, Math.min(63, col))}_${row}`;
    }

    if (
      comp.type === 'BUZZER_ACTIVE' ||
      comp.type === 'ACTUATOR_BUZZER_ACTIVE' ||
      comp.type === 'BUZZER' ||
      comp.type === 'ACTUATOR_BUZZER_PIEZO' ||
      comp.parameters?.model3d === 'buzzer_active_piezo'
    ) {
      const p = (pinId || '').trim().toLowerCase();
      const isPos = p === '+' || p === '1' || p === 'pos' || p === 'p' || p === 'anode';
      const col = isPos ? centerCol - 1 : centerCol + 1;
      return `bb_col_${Math.max(1, Math.min(63, col))}_${row}`;
    }

    if (comp.type === 'HC_SR04' || comp.type === 'SENSOR_ULTRASONIC') {
      const p = (pinId || '').trim().toLowerCase();
      let colOffset = 0;
      if (p === 'vcc' || p === '1' || p === '5v') colOffset = -1;
      else if (p === 'trig' || p === '2') colOffset = 0;
      else if (p === 'echo' || p === '3') colOffset = 1;
      else if (p === 'gnd' || p === '4' || p === '-') colOffset = 2;
      const col = centerCol + colOffset;
      return `bb_col_${Math.max(1, Math.min(63, col))}_${row}`;
    }

    if (
      comp.type === 'MODULE_BLUETOOTH_HC05' ||
      comp.type === 'BLUETOOTH' ||
      comp.type === 'HC05' ||
      comp.type === 'HC06' ||
      comp.type.includes('BLUETOOTH') ||
      comp.parameters?.model3d === 'module_bluetooth_hc05'
    ) {
      const p = (pinId || '').trim().toLowerCase();
      let colOffset = 0;
      if (p === 'state' || p === '1') colOffset = -2;
      else if (p === 'rxd' || p === 'rx' || p === '2') colOffset = -1;
      else if (p === 'txd' || p === 'tx' || p === '3') colOffset = 0;
      else if (p === 'gnd' || p === '4' || p === '-') colOffset = 1;
      else if (p === 'vcc' || p === '5v' || p === '5' || p === '+') colOffset = 2;
      else if (p === 'en' || p === 'key' || p === '6') colOffset = 3;
      const col = centerCol + colOffset;
      return `bb_col_${Math.max(1, Math.min(63, col))}_${row}`;
    }

    if (comp.type === 'BJT_NPN' || comp.type === 'BJT_PNP' || comp.type === 'TRANSISTOR_NPN' || comp.type === 'TRANSISTOR_PNP') {
      const p = (pinId || '').trim().toLowerCase();
      let colOffset = 0;
      if (p === 'e' || p === 'emitter' || p === '1') colOffset = -1;
      else if (p === 'b' || p === 'base' || p === '2') colOffset = 0;
      else if (p === 'c' || p === 'collector' || p === '3') colOffset = 1;
      const col = centerCol + colOffset;
      return `bb_col_${Math.max(1, Math.min(63, col))}_${row}`;
    }

    return `bb_col_${Math.max(1, Math.min(63, centerCol))}_${row}`;
  }, []);

  // Authentic Breadboard Power Rail Routing & Strict Zero-Shared-Holes Allocation
  const schematicTo3DWires = useCallback((srcWires: CircuitWire[] = wires, srcComps: CircuitComponent[] = components): Wire3D[] => {
    const comps3d = independentComponents !== null ? independentComponents : schematicTo3DComponents();
    const battery = srcComps.find(
      (c) => c.type === 'BATTERY' || c.type === 'BATTERY_9V' || c.id.toLowerCase().startsWith('bat')
    );
    const gndCompIds = new Set(
      srcComps
        .filter((c) => c.type === 'GROUND' || c.id.toLowerCase().startsWith('gnd'))
        .map((c) => c.id)
    );

    const outWires: Wire3D[] = [];
    const occupancy = new BreadboardOccupancyMap();

    // PHASE 1: Reserve exact hole coordinates for ALL component leads on the breadboard
    for (const c3d of comps3d) {
      if (['ARDUINO_UNO', 'ARDUINO_MEGA', 'BATTERY_9V'].includes(c3d.type)) continue;

      if (c3d.type === 'TIMER_555' || c3d.type === 'DIP_IC') {
        for (let p = 1; p <= 8; p++) {
          const holeId = getBreadboardHoleForComponentPin(c3d, String(p));
          if (holeId) {
            occupancy.occupy(holeId, { type: 'component_pin', ownerId: c3d.id, pinId: String(p) });
          }
        }
      } else if (c3d.type === 'RESISTOR') {
        ['1', '2'].forEach((p) => {
          const holeId = getBreadboardHoleForComponentPin(c3d, p);
          if (holeId) occupancy.occupy(holeId, { type: 'component_pin', ownerId: c3d.id, pinId: p });
        });
      } else if (c3d.type === 'CAPACITOR' || c3d.type === 'CAPACITOR_ELECTROLYTIC') {
        ['1', '2'].forEach((p) => {
          const holeId = getBreadboardHoleForComponentPin(c3d, p);
          if (holeId) occupancy.occupy(holeId, { type: 'component_pin', ownerId: c3d.id, pinId: p });
        });
      } else if (c3d.type === 'LED') {
        ['anode', 'cathode'].forEach((p) => {
          const holeId = getBreadboardHoleForComponentPin(c3d, p);
          if (holeId) occupancy.occupy(holeId, { type: 'component_pin', ownerId: c3d.id, pinId: p });
        });
      } else if (c3d.type === 'LED_RGB' || c3d.type === 'ACTUATOR_RGB_LED' || c3d.parameters?.model3d === 'led_rgb_5mm') {
        ['r', 'cc', 'g', 'b'].forEach((p) => {
          const holeId = getBreadboardHoleForComponentPin(c3d, p);
          if (holeId) occupancy.occupy(holeId, { type: 'component_pin', ownerId: c3d.id, pinId: p });
        });
      } else if (
        c3d.type === 'BUZZER_ACTIVE' ||
        c3d.type === 'ACTUATOR_BUZZER_ACTIVE' ||
        c3d.type === 'BUZZER' ||
        c3d.type === 'ACTUATOR_BUZZER_PIEZO' ||
        c3d.parameters?.model3d === 'buzzer_active_piezo'
      ) {
        ['+', '-'].forEach((p) => {
          const holeId = getBreadboardHoleForComponentPin(c3d, p);
          if (holeId) occupancy.occupy(holeId, { type: 'component_pin', ownerId: c3d.id, pinId: p });
        });
      } else if (c3d.type === 'HC_SR04' || c3d.type === 'SENSOR_ULTRASONIC') {
        ['vcc', 'trig', 'echo', 'gnd'].forEach((p) => {
          const holeId = getBreadboardHoleForComponentPin(c3d, p);
          if (holeId) occupancy.occupy(holeId, { type: 'component_pin', ownerId: c3d.id, pinId: p });
        });
      } else if (
        c3d.type === 'MODULE_BLUETOOTH_HC05' ||
        c3d.type === 'BLUETOOTH' ||
        c3d.type === 'HC05' ||
        c3d.type.includes('BLUETOOTH') ||
        c3d.parameters?.model3d === 'module_bluetooth_hc05'
      ) {
        ['state', 'rxd', 'txd', 'gnd', 'vcc', 'en'].forEach((p) => {
          const holeId = getBreadboardHoleForComponentPin(c3d, p);
          if (holeId) occupancy.occupy(holeId, { type: 'component_pin', ownerId: c3d.id, pinId: p });
        });
      } else if (c3d.type === 'DIODE' || c3d.type === 'DIODE_1N4007') {
        ['1', '2'].forEach((p) => {
          const holeId = getBreadboardHoleForComponentPin(c3d, p);
          if (holeId) occupancy.occupy(holeId, { type: 'component_pin', ownerId: c3d.id, pinId: p });
        });
      } else if (c3d.type === 'BJT_NPN' || c3d.type === 'BJT_PNP' || c3d.type === 'TRANSISTOR_NPN' || c3d.type === 'TRANSISTOR_PNP') {
        ['e', 'b', 'c'].forEach((p) => {
          const holeId = getBreadboardHoleForComponentPin(c3d, p);
          if (holeId) occupancy.occupy(holeId, { type: 'component_pin', ownerId: c3d.id, pinId: p });
        });
      }
    }

    // PHASE 2: Route Power Rails & Zero-Collision Jumper Wires
    const SIGNAL_COLORS = ['#3B82F6', '#10B981', '#EAB308', '#F97316'];
    let sigColorIdx = 0;

    // 1. Battery Connections to Top Rails at Col 1
    if (battery) {
      const batPosHole = 'bb_rail_top_pos_1';
      const batNegHole = 'bb_rail_top_neg_1';
      occupancy.occupy(batPosHole, { type: 'wire_end', ownerId: battery.id });
      occupancy.occupy(batNegHole, { type: 'wire_end', ownerId: battery.id });

      outWires.push({
        id: `wire_bat_pos_${battery.id}`,
        fromPin: { compId: battery.id, pinId: '+' },
        toPin: { compId: 'breadboard', pinId: batPosHole },
        color: '#EF4444',
      });
      outWires.push({
        id: `wire_bat_neg_${battery.id}`,
        fromPin: { compId: battery.id, pinId: '-' },
        toPin: { compId: 'breadboard', pinId: batNegHole },
        color: '#1E293B',
      });

      // 2. Power Rail Bridges connecting Top <-> Bottom Rails on far left (Col 2) and far right (Col 50)
      const bridgePosLeft = 'bb_rail_top_pos_2';
      const bridgePosLeftBot = 'bb_rail_bottom_pos_2';
      const bridgeNegLeft = 'bb_rail_top_neg_2';
      const bridgeNegLeftBot = 'bb_rail_bottom_neg_2';

      occupancy.occupy(bridgePosLeft, { type: 'wire_end', ownerId: 'rail_bridge_pos_l' });
      occupancy.occupy(bridgePosLeftBot, { type: 'wire_end', ownerId: 'rail_bridge_pos_l' });
      occupancy.occupy(bridgeNegLeft, { type: 'wire_end', ownerId: 'rail_bridge_neg_l' });
      occupancy.occupy(bridgeNegLeftBot, { type: 'wire_end', ownerId: 'rail_bridge_neg_l' });

      outWires.push({
        id: 'wire_rail_bridge_pos_left',
        fromPin: { compId: 'breadboard', pinId: bridgePosLeft },
        toPin: { compId: 'breadboard', pinId: bridgePosLeftBot },
        color: '#EF4444',
      });
      outWires.push({
        id: 'wire_rail_bridge_neg_left',
        fromPin: { compId: 'breadboard', pinId: bridgeNegLeft },
        toPin: { compId: 'breadboard', pinId: bridgeNegLeftBot },
        color: '#1E293B',
      });

      const bridgePosRight = 'bb_rail_top_pos_50';
      const bridgePosRightBot = 'bb_rail_bottom_pos_50';
      const bridgeNegRight = 'bb_rail_top_neg_50';
      const bridgeNegRightBot = 'bb_rail_bottom_neg_50';

      occupancy.occupy(bridgePosRight, { type: 'wire_end', ownerId: 'rail_bridge_pos_r' });
      occupancy.occupy(bridgePosRightBot, { type: 'wire_end', ownerId: 'rail_bridge_pos_r' });
      occupancy.occupy(bridgeNegRight, { type: 'wire_end', ownerId: 'rail_bridge_neg_r' });
      occupancy.occupy(bridgeNegRightBot, { type: 'wire_end', ownerId: 'rail_bridge_neg_r' });

      outWires.push({
        id: 'wire_rail_bridge_pos_right',
        fromPin: { compId: 'breadboard', pinId: bridgePosRight },
        toPin: { compId: 'breadboard', pinId: bridgePosRightBot },
        color: '#EF4444',
      });
      outWires.push({
        id: 'wire_rail_bridge_neg_right',
        fromPin: { compId: 'breadboard', pinId: bridgeNegRight },
        toPin: { compId: 'breadboard', pinId: bridgeNegRightBot },
        color: '#1E293B',
      });
    }

    // 3. Circuit Jumper Wires & Power Drops
    srcWires.forEach((w) => {
      const fromIsBat = battery && w.fromCompId === battery.id;
      const toIsBat = battery && w.toCompId === battery.id;
      const fromIsGnd = gndCompIds.has(w.fromCompId);
      const toIsGnd = gndCompIds.has(w.toCompId);

      const fPin = (w.fromPinId || '').toLowerCase();
      const tPin = (w.toPinId || '').toLowerCase();

      // Skip direct battery-to-gnd wires since battery - is already connected to blue rail
      if ((fromIsBat && toIsGnd) || (toIsBat && fromIsGnd)) return;
      if ((fromIsBat && (fPin === 'n' || fPin === '-')) || (toIsBat && (tPin === 'n' || tPin === '-'))) return;

      // Positive Power Drop from closest unoccupied Red (+) rail hole
      if (fromIsBat && (fPin === 'p' || fPin === '+')) {
        const toComp = comps3d.find((c) => c.id === w.toCompId);
        if (!toComp) return;
        const compHole = getBreadboardHoleForComponentPin(toComp, w.toPinId);
        const tieGroup = compHole ? getTieGroupForHole(compHole) : undefined;
        const freeHole = tieGroup ? occupancy.findFreeHoleInTieGroup(tieGroup) : null;
        const col = toComp.x3d !== undefined ? Math.max(1, Math.min(63, Math.round((toComp.x3d - START_X) / PITCH_X) + 1)) : 25;
        const isTop = (toComp.z3d ?? -8) <= 0;
        const railHole = occupancy.findFreeRailHole(col, isTop ? 'rail_top_pos' : 'rail_bottom_pos');
        if (freeHole && railHole) {
          occupancy.occupy(freeHole.id, { type: 'wire_end', ownerId: w.id });
          occupancy.occupy(railHole.id, { type: 'wire_end', ownerId: w.id });
          outWires.push({
            id: w.id,
            fromPin: { compId: 'breadboard', pinId: railHole.id },
            toPin: { compId: 'breadboard', pinId: freeHole.id },
            color: '#EF4444',
            current: w.current,
          });
        }
        return;
      }
      if (toIsBat && (tPin === 'p' || tPin === '+')) {
        const fromComp = comps3d.find((c) => c.id === w.fromCompId);
        if (!fromComp) return;
        const compHole = getBreadboardHoleForComponentPin(fromComp, w.fromPinId);
        const tieGroup = compHole ? getTieGroupForHole(compHole) : undefined;
        const freeHole = tieGroup ? occupancy.findFreeHoleInTieGroup(tieGroup) : null;
        const col = fromComp.x3d !== undefined ? Math.max(1, Math.min(63, Math.round((fromComp.x3d - START_X) / PITCH_X) + 1)) : 25;
        const isTop = (fromComp.z3d ?? -8) <= 0;
        const railHole = occupancy.findFreeRailHole(col, isTop ? 'rail_top_pos' : 'rail_bottom_pos');
        if (freeHole && railHole) {
          occupancy.occupy(freeHole.id, { type: 'wire_end', ownerId: w.id });
          occupancy.occupy(railHole.id, { type: 'wire_end', ownerId: w.id });
          outWires.push({
            id: w.id,
            fromPin: { compId: 'breadboard', pinId: railHole.id },
            toPin: { compId: 'breadboard', pinId: freeHole.id },
            color: '#EF4444',
            current: w.current,
          });
        }
        return;
      }

      // Ground Drop from closest unoccupied Blue (-) ground rail hole
      if (fromIsGnd) {
        const toComp = comps3d.find((c) => c.id === w.toCompId);
        if (!toComp) return;
        const compHole = getBreadboardHoleForComponentPin(toComp, w.toPinId);
        const tieGroup = compHole ? getTieGroupForHole(compHole) : undefined;
        const freeHole = tieGroup ? occupancy.findFreeHoleInTieGroup(tieGroup) : null;
        const col = toComp.x3d !== undefined ? Math.max(1, Math.min(63, Math.round((toComp.x3d - START_X) / PITCH_X) + 1)) : 25;
        const isTop = (toComp.z3d ?? -8) <= 0;
        const railHole = occupancy.findFreeRailHole(col, isTop ? 'rail_top_neg' : 'rail_bottom_neg');
        if (freeHole && railHole) {
          occupancy.occupy(freeHole.id, { type: 'wire_end', ownerId: w.id });
          occupancy.occupy(railHole.id, { type: 'wire_end', ownerId: w.id });
          outWires.push({
            id: w.id,
            fromPin: { compId: 'breadboard', pinId: railHole.id },
            toPin: { compId: 'breadboard', pinId: freeHole.id },
            color: '#1E293B',
            current: w.current,
          });
        }
        return;
      }
      if (toIsGnd) {
        const fromComp = comps3d.find((c) => c.id === w.fromCompId);
        if (!fromComp) return;
        const compHole = getBreadboardHoleForComponentPin(fromComp, w.fromPinId);
        const tieGroup = compHole ? getTieGroupForHole(compHole) : undefined;
        const freeHole = tieGroup ? occupancy.findFreeHoleInTieGroup(tieGroup) : null;
        const col = fromComp.x3d !== undefined ? Math.max(1, Math.min(63, Math.round((fromComp.x3d - START_X) / PITCH_X) + 1)) : 25;
        const isTop = (fromComp.z3d ?? -8) <= 0;
        const railHole = occupancy.findFreeRailHole(col, isTop ? 'rail_top_neg' : 'rail_bottom_neg');
        if (freeHole && railHole) {
          occupancy.occupy(freeHole.id, { type: 'wire_end', ownerId: w.id });
          occupancy.occupy(railHole.id, { type: 'wire_end', ownerId: w.id });
          outWires.push({
            id: w.id,
            fromPin: { compId: 'breadboard', pinId: railHole.id },
            toPin: { compId: 'breadboard', pinId: freeHole.id },
            color: '#1E293B',
            current: w.current,
          });
        }
        return;
      }

      // Signal Jumper between two circuit components
      let wireColor = w.color;
      if (!wireColor || wireColor === '#EF4444') {
        if (fPin.includes('gnd') || tPin.includes('gnd') || fPin === '-' || tPin === '-') {
          wireColor = '#1E293B';
        } else if (
          fPin.includes('vcc') || tPin.includes('vcc') ||
          fPin.includes('5v') || tPin.includes('5v') ||
          fPin.includes('3v3') || tPin.includes('3v3') ||
          fPin.includes('vin') || tPin.includes('vin') ||
          fPin === '+' || tPin === '+'
        ) {
          wireColor = '#EF4444';
        } else if ((fPin === '2' && tPin === '6') || (fPin === '6' && tPin === '2')) {
          wireColor = '#EAB308';
        } else if ((fPin === '4' && tPin === '8') || (fPin === '8' && tPin === '4')) {
          wireColor = '#EF4444';
        } else {
          wireColor = SIGNAL_COLORS[sigColorIdx % SIGNAL_COLORS.length];
          sigColorIdx++;
        }
      }

      const compA = comps3d.find((c) => c.id === w.fromCompId);
      const compB = comps3d.find((c) => c.id === w.toCompId);

      const isA_Breadboard = compA && !['ARDUINO_UNO', 'ARDUINO_MEGA', 'BATTERY_9V'].includes(compA.type);
      const isB_Breadboard = compB && !['ARDUINO_UNO', 'ARDUINO_MEGA', 'BATTERY_9V'].includes(compB.type);

      let fromEnd: { compId: string; pinId: string } = { compId: w.fromCompId, pinId: w.fromPinId };
      let toEnd: { compId: string; pinId: string } = { compId: w.toCompId, pinId: w.toPinId };

      if (isA_Breadboard && compA) {
        const compHole = getBreadboardHoleForComponentPin(compA, w.fromPinId);
        const tieGroup = compHole ? getTieGroupForHole(compHole) : undefined;
        const freeHole = tieGroup ? occupancy.findFreeHoleInTieGroup(tieGroup) : null;
        if (freeHole) {
          occupancy.occupy(freeHole.id, { type: 'wire_end', ownerId: w.id });
          fromEnd = { compId: 'breadboard', pinId: freeHole.id };
        }
      }

      if (isB_Breadboard && compB) {
        const compHole = getBreadboardHoleForComponentPin(compB, w.toPinId);
        const tieGroup = compHole ? getTieGroupForHole(compHole) : undefined;
        const freeHole = tieGroup ? occupancy.findFreeHoleInTieGroup(tieGroup) : null;
        if (freeHole) {
          occupancy.occupy(freeHole.id, { type: 'wire_end', ownerId: w.id });
          toEnd = { compId: 'breadboard', pinId: freeHole.id };
        }
      }

      outWires.push({
        id: w.id,
        fromPin: fromEnd,
        toPin: toEnd,
        color: wireColor,
        current: w.current,
      });
    });

    return outWires;
  }, [wires, components, independentComponents, schematicTo3DComponents, getBreadboardHoleForComponentPin]);

  // Active 3D components and wires in the workbench
  const activeComponents3d: Component3D[] = useMemo(() => {
    if (independentComponents !== null) return independentComponents;
    return schematicTo3DComponents();
  }, [independentComponents, schematicTo3DComponents]);

  const activeWires3d: Wire3D[] = useMemo(() => {
    if (independentWires !== null) return independentWires;
    return schematicTo3DWires();
  }, [independentWires, schematicTo3DWires]);

  // Record an immutable snapshot to 3D undo history
  const record3DHistory = useCallback((currentComps: Component3D[], currentWires: Wire3D[]) => {
    setUndoStack3D((prev) => [...prev.slice(-25), { components: currentComps, wires: currentWires }]);
    setRedoStack3D([]);
  }, []);

  // 3D Undo Handler
  const handleUndo3D = useCallback(() => {
    if (undoStack3D.length === 0) return;
    const previous = undoStack3D[undoStack3D.length - 1];
    setUndoStack3D((prev) => prev.slice(0, -1));
    setRedoStack3D((prev) => [...prev, { components: activeComponents3d, wires: activeWires3d }]);
    setIndependentComponents(previous.components);
    setIndependentWires(previous.wires);
    onSelectComponent(null);
    onSelectWire(null);
    toast.info('Undo 3D Action');
  }, [undoStack3D, activeComponents3d, activeWires3d, onSelectComponent, onSelectWire]);

  // 3D Redo Handler
  const handleRedo3D = useCallback(() => {
    if (redoStack3D.length === 0) return;
    const next = redoStack3D[redoStack3D.length - 1];
    setRedoStack3D((prev) => prev.slice(0, -1));
    setUndoStack3D((prev) => [...prev, { components: activeComponents3d, wires: activeWires3d }]);
    setIndependentComponents(next.components);
    setIndependentWires(next.wires);
    onSelectComponent(null);
    onSelectWire(null);
    toast.info('Redo 3D Action');
  }, [redoStack3D, activeComponents3d, activeWires3d, onSelectComponent, onSelectWire]);

  // Global Keyboard Shortcuts for 3D Studio Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        handleUndo3D();
      } else if (
        ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        e.preventDefault();
        handleRedo3D();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo3D, handleRedo3D]);

  // Top Bar Action: New Blank 3D Workbench
  const handleNewBlank3D = () => {
    record3DHistory(activeComponents3d, activeWires3d);
    setIndependentComponents([]);
    setIndependentWires([]);
    onSelectComponent(null);
    onSelectWire(null);
    toast.success('Initialized clean 3D Virtual Studio with empty 830-point breadboard.');
  };

  // Top Bar Action: Import from 2D Schematic
  const handleImportFromSchematic = useCallback(() => {
    record3DHistory(activeComponents3d, activeWires3d);
    try {
      localStorage.removeItem('ei_house_virtual3d_project');
    } catch {}

    const hasPhysicalComps = components.some(
      (c) => c.type !== 'GROUND' && c.type !== 'VCC' && !c.id.toLowerCase().startsWith('gnd')
    );

    let srcComps = components;
    let srcWires = wires;

    // If schematic is blank, seed the starter NE555 astable flasher circuit
    if (!hasPhysicalComps) {
      TEMPLATE_555_ASTABLE.components.forEach((c) => onAddComponent(c));
      TEMPLATE_555_ASTABLE.wires.forEach((w) => onAddWire(w));
      srcComps = TEMPLATE_555_ASTABLE.components;
      srcWires = TEMPLATE_555_ASTABLE.wires;
    }

    const comps = schematicTo3DComponents(true, srcComps);
    const w = schematicTo3DWires(srcWires, srcComps);

    // Sync generated 3D coordinates back to schematic components
    comps.forEach((c3d) => {
      const orig = srcComps.find((c) => c.id === c3d.id);
      if (orig && onUpdateComponent) {
        onUpdateComponent({
          ...orig,
          x3d: c3d.x3d,
          y3d: c3d.y3d,
          z3d: c3d.z3d,
          rot3d: c3d.rotY,
        });
      }
    });

    setIndependentComponents(comps);
    setIndependentWires(w);
    onSelectComponent(null);
    onSelectWire(null);
    toast.success(`Imported ${comps.length} components and ${w.length} wires from Schematic to 3D Breadboard.`);
  }, [activeComponents3d, activeWires3d, components, wires, onAddComponent, onAddWire, onSelectComponent, onSelectWire, onUpdateComponent, record3DHistory, schematicTo3DComponents, schematicTo3DWires]);

  // Top Bar Action: Save 3D Project / Export JSON
  const handleSave3DProject = () => {
    if (onSaveWorkspace) {
      onSaveWorkspace();
      return;
    }

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

  // Toggle MCU USB Power Plug without resetting coordinates or component position
  const handleToggleMcuUsb = useCallback((compId: string) => {
    let nextState = false;
    setIndependentComponents((prev) => {
      const current = prev !== null ? prev : activeComponents3d;
      return current.map((c) => {
        if (c.id === compId) {
          nextState = !(c.parameters?.usbPlugged !== false);
          return {
            ...c,
            parameters: { ...c.parameters, usbPlugged: nextState },
          };
        }
        return c;
      });
    });

    const comp = components.find((c) => c.id === compId);
    const active = activeComponents3d.find((c) => c.id === compId);
    if (comp && onUpdateComponent) {
      toast.success(
        nextState
          ? `🔌 Connected USB Power to ${comp.label} (5.0V Active)`
          : `⚡ Unplugged USB Cable from ${comp.label}`
      );
      onUpdateComponent({
        ...comp,
        x3d: active?.x3d ?? comp.x3d,
        y3d: active?.y3d ?? comp.y3d,
        z3d: active?.z3d ?? comp.z3d,
        rot3d: active?.rotY ?? comp.rot3d,
        parameters: { ...comp.parameters, usbPlugged: nextState },
      });
    }
  }, [activeComponents3d, components, onUpdateComponent]);

  // Add component handler from 3D Add Drawer
  const handleAddComponent3D = useCallback((c3d: Component3D) => {
    record3DHistory(activeComponents3d, activeWires3d);
    // Correctly map 3D component types to catalog templates without falling back to Resistor
    let catalogType = c3d.type;
    if (c3d.type === 'ARDUINO_MEGA') catalogType = 'ARDUINO_MEGA';
    else if (c3d.type === 'ARDUINO_UNO') catalogType = 'ARDUINO_UNO';
    else if (c3d.type === 'ARDUINO_NANO') catalogType = 'ARDUINO_NANO';
    else if (c3d.type === 'ESP32_DEVKIT') catalogType = 'ESP32_DEVKIT';
    else if (c3d.type === 'RASPBERRY_PI_PICO') catalogType = 'RASPBERRY_PI_PICO';
    else if (c3d.type === 'LED') catalogType = 'LED';
    else if (c3d.type === 'LED_RGB') catalogType = 'ACTUATOR_RGB_LED';
    else if (c3d.type === 'RESISTOR') catalogType = 'RESISTOR';
    else if (c3d.type === 'POTENTIOMETER') catalogType = 'POTENTIOMETER';
    else if (c3d.type === 'CAPACITOR') catalogType = 'CAPACITOR';
    else if (c3d.type === 'CAPACITOR_ELECTROLYTIC') catalogType = 'CAPACITOR';
    else if (c3d.type === 'TIMER_555') catalogType = 'TIMER_555';
    else if (c3d.type === 'BATTERY_9V') catalogType = 'BATTERY';
    else if (c3d.type === 'PUSHBUTTON') catalogType = 'PUSHBUTTON_NO';
    else if (c3d.type === 'HC_SR04') catalogType = 'SENSOR_ULTRASONIC';
    else if (c3d.type === 'SERVO_SG90') catalogType = 'ACTUATOR_SERVO_SG90';
    else if (c3d.type === 'LCD_1602') catalogType = 'DISPLAY_LCD1602';
    else if (c3d.type === 'BUZZER_ACTIVE') catalogType = 'ACTUATOR_BUZZER_ACTIVE';
    else if (c3d.type === 'DIODE') catalogType = 'DIODE';
    else if (c3d.type === 'SENSOR_LDR') catalogType = 'SENSOR_LDR';
    else if (c3d.type === 'SLIDE_SWITCH') catalogType = 'SWITCH_SPST';

    const tmpl =
      COMPONENT_CATALOG.find((t) => t.type === catalogType) ||
      (catalogType === 'RASPBERRY_PI_PICO' ? COMPONENT_CATALOG.find((t) => t.type === 'ARDUINO_UNO') : undefined) ||
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
  }, [components, activeComponents3d, activeWires3d, onAddComponent, record3DHistory]);

  // Update component position/rotation handler
  const handleUpdateComponent3D = useCallback((c3d: Component3D) => {
    setIndependentComponents((prev) => {
      const current = prev !== null ? prev : activeComponents3d;
      return current.map((c) => (c.id === c3d.id ? { ...c, ...c3d } : c));
    });

    if (onUpdateComponent3DPosition) {
      onUpdateComponent3DPosition(c3d.id, c3d.x3d, c3d.y3d, c3d.z3d);
    }
    const comp = components.find((c) => c.id === c3d.id);
    if (comp && onUpdateComponent) {
      const nextRot = ((((c3d.rotY % 360) + 360) % 360)) as 0 | 90 | 180 | 270;
      onUpdateComponent({
        ...comp,
        x3d: c3d.x3d,
        y3d: c3d.y3d,
        z3d: c3d.z3d,
        rot3d: c3d.rotY,
        rotation: [0, 90, 180, 270].includes(nextRot) ? nextRot : comp.rotation,
        parameters: {
          ...comp.parameters,
          ...c3d.parameters,
          rotX: c3d.rotX ?? comp.parameters?.rotX ?? 0,
          rotY: c3d.rotY ?? comp.parameters?.rotY ?? 0,
          rotZ: c3d.rotZ ?? comp.parameters?.rotZ ?? 0,
        },
      });
    }
  }, [activeComponents3d, components, onUpdateComponent, onUpdateComponent3DPosition]);

  const handleMirrorSelected = useCallback(() => {
    if (!selectedCompId) return;
    const comp = components.find((c) => c.id === selectedCompId);
    const c3d = activeComponents3d.find((c) => c.id === selectedCompId);
    if (!comp || !c3d) return;
    const nextMirrored = !comp.mirrored;
    if (onUpdateComponent) {
      onUpdateComponent({
        ...comp,
        mirrored: nextMirrored,
        parameters: { ...comp.parameters, mirrored: nextMirrored },
      });
    }
    handleUpdateComponent3D({
      ...c3d,
      parameters: { ...c3d.parameters, mirrored: nextMirrored },
    });
    toast.info(`Flipped ${comp.label} ${nextMirrored ? 'mirrored' : 'normal'}`);
  }, [selectedCompId, components, activeComponents3d, onUpdateComponent, handleUpdateComponent3D]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'f' || e.key === 'F') {
        if (selectedCompId) {
          e.preventDefault();
          handleMirrorSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCompId, handleMirrorSelected]);

  // Delete component from 3D studio
  const handleDeleteComponent3D = useCallback((id: string) => {
    record3DHistory(activeComponents3d, activeWires3d);
    setIndependentComponents((prev) => {
      const current = prev !== null ? prev : activeComponents3d;
      return current.filter((c) => c.id !== id);
    });
    setIndependentWires((prev) => {
      const current = prev !== null ? prev : activeWires3d;
      return current.filter((w) => w.fromPin.compId !== id && w.toPin.compId !== id);
    });
    onDeleteComponent(id);
    onSelectComponent(null);
    toast.info('Deleted 3D component and attached wires.');
  }, [activeComponents3d, activeWires3d, onDeleteComponent, onSelectComponent, record3DHistory]);

  // Add 3D Wire handler
  const handleAddWire3D = useCallback((w3d: Wire3D) => {
    record3DHistory(activeComponents3d, activeWires3d);
    setIndependentWires((prev) => {
      const current = prev !== null ? prev : activeWires3d;
      return [...current, w3d];
    });

    onAddWire({
      id: w3d.id,
      fromCompId: w3d.fromPin.compId,
      fromPinId: w3d.fromPin.pinId,
      toCompId: w3d.toPin.compId,
      toPinId: w3d.toPin.pinId,
      color: w3d.color,
    });
    toast.success('Connected 3D Dupont jumper wire.');
  }, [activeComponents3d, activeWires3d, onAddWire, record3DHistory]);

  // Delete 3D wire handler
  const handleDeleteWire3D = useCallback((wireId: string) => {
    record3DHistory(activeComponents3d, activeWires3d);
    setIndependentWires((prev) => {
      const current = prev !== null ? prev : activeWires3d;
      return current.filter((w) => w.id !== wireId);
    });
    onDeleteWire(wireId);
  }, [activeComponents3d, activeWires3d, onDeleteWire, record3DHistory]);

  // Update 3D Wire handler (e.g. color change)
  const handleUpdateWire3D = useCallback((w3d: Wire3D) => {
    record3DHistory(activeComponents3d, activeWires3d);
    setIndependentWires((prev) => {
      const current = prev !== null ? prev : activeWires3d;
      return current.map((w) => (w.id === w3d.id ? w3d : w));
    });

    onDeleteWire(w3d.id);
    onAddWire({
      id: w3d.id,
      fromCompId: w3d.fromPin.compId,
      fromPinId: w3d.fromPin.pinId,
      toCompId: w3d.toPin.compId,
      toPinId: w3d.toPin.pinId,
      color: w3d.color,
    });
  }, [activeComponents3d, activeWires3d, onDeleteWire, onAddWire, record3DHistory]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#070D18] select-none overflow-hidden">
      {/* Top 3D Studio Toolbar */}
      <div className="h-11 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-2 sm:px-4 z-10 shrink-0 overflow-x-auto overflow-y-hidden min-w-0 max-w-full no-scrollbar touch-scroll gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <Box className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider hidden sm:inline">
            3D Virtual Studio
          </span>
          <button
            type="button"
            onClick={handleToggleBreadboard}
            className={`text-[10px] px-2 py-0.5 rounded border font-mono transition-colors cursor-pointer flex items-center gap-1 ${
              hasBreadboard
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400 hover:bg-emerald-900/80'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title={hasBreadboard ? 'Click to Remove 830-Point Solderless Breadboard' : 'Click to Add 830-Point Breadboard to Workbench'}
          >
            <span>{hasBreadboard ? '✓ 830-Pt Board' : '+ Breadboard'}</span>
          </button>
        </div>

        {/* Independent 3D Studio Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-xs shrink-0">
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 border-r border-slate-700/60 pr-1.5">
            <button
              type="button"
              onClick={handleUndo3D}
              disabled={undoStack3D.length === 0}
              className={`p-1.5 rounded transition-colors ${
                undoStack3D.length > 0
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed opacity-50'
              }`}
              title="Undo 3D Action (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo3D}
              disabled={redoStack3D.length === 0}
              className={`p-1.5 rounded transition-colors ${
                redoStack3D.length > 0
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed opacity-50'
              }`}
              title="Redo 3D Action (Ctrl+Y)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Flip / Invert Component in 3D */}
          {selectedCompId && (
            <div className="flex items-center gap-1 border-r border-slate-700/60 pr-1.5">
              <button
                type="button"
                onClick={handleMirrorSelected}
                className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold rounded text-xs transition-colors cursor-pointer"
                title="Flip / Mirror 3D Component (F key)"
              >
                <FlipHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Flip (F)</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleNewBlank3D}
            className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors cursor-pointer shrink-0"
            title="Start a fresh blank 3D circuit on breadboard"
          >
            <FilePlus className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">New Blank 3D</span>
          </button>

          <button
            type="button"
            onClick={handleImportFromSchematic}
            className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors cursor-pointer shrink-0"
            title="Import all components and connections from 2D Schematic"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Import from Schematic</span>
            <span className="md:hidden hidden sm:inline">Import</span>
          </button>

          <button
            type="button"
            onClick={handleSave3DProject}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow transition-colors cursor-pointer shrink-0"
            title="Save 3D circuit locally and export as JSON"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save 3D</span>
            <span className="sm:hidden">Save</span>
          </button>

          {onToggleInspector && (
            <button
              type="button"
              onClick={onToggleInspector}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors cursor-pointer shrink-0 border ${
                isInspectorOpen
                  ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              title="Toggle Right Property Inspector"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Inspector</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        <Studio3DCanvas
          hasBreadboard={hasBreadboard}
          onToggleBreadboard={handleToggleBreadboard}
          onToggleMcuUsb={handleToggleMcuUsb}
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
          onMirrorComponent={handleMirrorSelected}
          isSimulating={isSimulating}
          simulationStates={simulationStates}
          wireCurrents={wireCurrents}
          circuitWires={wires}
          circuitComponents={components}
        />
      </div>
    </div>
  );
}
