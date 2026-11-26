'use client';

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { CircuitComponent, CircuitWire, Component3D, Wire3D } from '@/modules/engineering-lab/types';
import { Studio3DCanvas } from '@/modules/engineering-lab/studio-3d/Studio3DCanvas';
import {
  BreadboardOccupancyMap,
  getTieGroupForHole,
  START_X,
  PITCH_X,
  ROW_Z_MAP,
  computeComponentGroundElevation,
  flipComponent3D,
} from '@/modules/engineering-lab/studio-3d/breadboard-topology';
import { resolve3DWireToSchematicConnections } from '@/modules/engineering-lab/studio-3d/breadboard-wire-resolver';
import { createComponentInstance, COMPONENT_CATALOG } from '@/modules/engineering-lab/circuit-engine/component-catalog';
import { TEMPLATE_555_ASTABLE } from '@/modules/engineering-lab/templates/starter-templates';
import { Box, FilePlus, RefreshCw, Save, RotateCcw, RotateCw, Sliders, FlipHorizontal, Usb } from 'lucide-react';

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

export const uncommittedWires3dCache = new Map<string, Wire3D>();
export function clearUncommittedWires3dCache() {
  uncommittedWires3dCache.clear();
}

export function findFreeSchematicSlot(existingComps: CircuitComponent[]): { x: number; y: number } {
  if (!existingComps || existingComps.length === 0) {
    return { x: 260, y: 200 };
  }
  const snap20 = (v: number) => Math.round(v / 20) * 20;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const c of existingComps) {
    if (c.x < minX) minX = c.x;
    if (c.x > maxX) maxX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.y > maxY) maxY = c.y;
  }
  if (!isFinite(minX)) {
    minX = 260;
    maxX = 260;
    minY = 200;
    maxY = 200;
  }

  const startX = snap20(maxX + 120);
  const baseY = snap20(minY + 40);

  for (let colIdx = 0; colIdx < 10; colIdx++) {
    const cx = startX + colIdx * 140;
    for (let rowIdx = 0; rowIdx < 10; rowIdx++) {
      const cy = baseY + rowIdx * 100;
      const collision = existingComps.some(
        (c) => Math.abs(cx - c.x) < 110 && Math.abs(cy - c.y) < 90
      );
      if (!collision) {
        return { x: cx, y: cy };
      }
    }
  }
  return { x: startX, y: baseY };
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
  const generatedWireSourceMapRef = useRef<Map<string, string[]>>(new Map());
  // Independent 3D Studio document state (Decoupled from 2D Schematic)
  const [independentComponents, setIndependentComponents] = useState<Component3D[] | null>(null);
  const [independentWires, setIndependentWires] = useState<Wire3D[] | null>(null);
  const [undoStack3D, setUndoStack3D] = useState<Studio3DHistoryState[]>([]);
  const [redoStack3D, setRedoStack3D] = useState<Studio3DHistoryState[]>([]);
  const [breadboardCount, setBreadboardCount] = useState<number>(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage) {
      try {
        const savedCount = localStorage.getItem('ei_house_virtual3d_breadboard_count');
        if (savedCount !== null) {
          const parsed = parseInt(savedCount, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 3) return parsed;
        }
        const saved = localStorage.getItem('ei_house_virtual3d_has_breadboard');
        if (saved !== null) return saved === 'true' ? 1 : 0;
      } catch {}
    }
    return 1;
  });

  const hasBreadboard = breadboardCount > 0;

  const handleToggleBreadboard = useCallback(() => {
    setBreadboardCount((prev) => {
      const next = prev >= 3 ? 0 : prev + 1;
      try {
        localStorage.setItem('ei_house_virtual3d_breadboard_count', String(next));
        localStorage.setItem('ei_house_virtual3d_has_breadboard', String(next > 0));
      } catch {}
      if (next === 0) toast.info('Removed Solderless Breadboards from workbench.');
      else if (next === 1) toast.success('Active: 1 Solderless Breadboard (830 tie-points).');
      else toast.success(`Expanded to ${next} Interlocking Solderless Breadboards with rail jumper bridges.`);
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

  // Helper: Get placement priority for a component type:
  // Priority 1: DIP ICs and single passives/discretes (Resistors, Capacitors, LEDs, Diodes, Transistors, Switches)
  // Priority 2: Compact breadboard modules / dev boards (Nano, ESP32, Pico, HC-SR04, HC-05)
  // Priority 3: Large off-board modules & displays (Servos, LCD1602) -> Console right (x >= 95)
  // Priority 4: Batteries -> Console left (x <= -95, z = 0)
  // Priority 5: Large MCU boards (Uno, Mega) -> Console front (z = 65)
  const getComponentPriority = (type: string): number => {
    const t = (type || '').toUpperCase();
    if (t.includes('UNO') || t.includes('MEGA') || t.includes('STM32')) return 5;
    if (t.includes('BATTERY') || t === 'DC_VOLTAGE') return 4;
    if (t.includes('SERVO') || t.includes('LCD') || t.includes('OLED')) return 3;
    if (
      t.includes('NANO') || t.includes('ESP32') || t.includes('PICO') ||
      t === 'HC_SR04' || t === 'SENSOR_ULTRASONIC' || t.includes('BLUETOOTH') || t.includes('HC05')
    ) {
      return 2;
    }
    return 1;
  };

  // Convert 2D schematic components to 3D representation with Priority-Based Breadboard & Multi-Breadboard Auto-Layout
  const schematicTo3DComponents = useCallback((forceAutoLayout = false, compsList: CircuitComponent[] = components): Component3D[] => {
    // Filter out virtual schematic rails (GND / VCC) - they are physically routed via breadboard power rails
    const physicalComponents = compsList.filter(
      (c) => c.type !== 'GROUND' && c.type !== 'VCC' && !c.id.toLowerCase().startsWith('gnd')
    );

    // If not forcing auto-layout, check if all components already have saved valid coordinates
    if (!forceAutoLayout) {
      const allHaveSavedPos = physicalComponents.length > 0 && physicalComponents.every(
        (c) => c.x3d !== undefined && c.y3d !== undefined && c.z3d !== undefined
      );
      if (allHaveSavedPos) {
        return physicalComponents.map((comp) => {
          const mappedType = mapCircuitCompTo3DType(comp);
          return {
            id: comp.id,
            type: mappedType,
            label: comp.label,
            value: comp.value,
            parameters: cleanParams(comp.parameters, comp.model3d, comp.footprint, comp.packageType, comp.mirrored),
            x3d: comp.x3d!,
            y3d: comp.y3d!,
            z3d: comp.z3d!,
            rotY: typeof comp.parameters?.rotY === 'number' ? comp.parameters.rotY : (comp.rot3d !== undefined ? comp.rot3d : (comp.rotation || 0)),
            rotX: typeof comp.parameters?.rotX === 'number' ? comp.parameters.rotX : 0,
            rotZ: typeof comp.parameters?.rotZ === 'number' ? comp.parameters.rotZ : 0,
          };
        });
      }
    }

    const posMap = new Map<string, { x3d: number; y3d: number; z3d: number; rotY: number; rotX: number; rotZ: number }>();

    let mcuIdx = 0;
    let batteryIdx = 0;
    let offboardModuleIdx = 0;
    let consoleOverflowIdx = 0;

    // Track occupied columns per breadboard (0..breadboardCount-1)
    const boardBlockedCols: Array<Set<number>> = Array.from({ length: 3 }, () => new Set<number>());
    const boardTopCols: Array<Set<number>> = Array.from({ length: 3 }, () => new Set<number>());
    const boardBottomCols: Array<Set<number>> = Array.from({ length: 3 }, () => new Set<number>());
    const boardStraddlerCount = [0, 0, 0];

    // Priority-based sorting
    const sortedComps = [...physicalComponents].sort((a, b) => {
      const pA = getComponentPriority(mapCircuitCompTo3DType(a));
      const pB = getComponentPriority(mapCircuitCompTo3DType(b));
      return pA - pB;
    });

    const isRavineStraddler = (t: string) => {
      const upper = t.toUpperCase();
      return (
        upper.includes('NANO') ||
        upper.includes('ESP32') ||
        upper.includes('PICO') ||
        upper.includes('TIMER_555') ||
        upper.includes('555') ||
        upper.includes('74HC') ||
        upper.includes('DIP') ||
        upper.includes('358') ||
        upper.includes('324') ||
        upper.includes('595') ||
        upper.includes('4017') ||
        upper.includes('2003') ||
        upper.includes('293')
      );
    };

    const getStraddlerSpan = (t: string): number => {
      const upper = t.toUpperCase();
      if (upper.includes('PICO')) return 20;
      if (upper.includes('NANO') || upper.includes('ESP32')) return 15;
      if (upper.includes('28') || upper.includes('ATMEGA328P')) return 14;
      if (upper.includes('16') || upper.includes('595') || upper.includes('4017') || upper.includes('2003') || upper.includes('293')) return 8;
      if (upper.includes('14') || upper.includes('74HC') || upper.includes('324')) return 7;
      return 4; // DIP-8, NE555, LM358
    };

    // Ideal centered ravine positions across 63 columns
    const STRADDLER_SLOTS = [
      [32],
      [20, 44],
      [14, 32, 50],
    ];

    const straddlerComps = sortedComps.filter((c) => isRavineStraddler(mapCircuitCompTo3DType(c)));
    const totalStraddlers = straddlerComps.length;
    const straddlersPerBoard = Math.min(3, Math.ceil(totalStraddlers / Math.max(1, breadboardCount)));

    if (!forceAutoLayout) {
      for (const comp of sortedComps) {
        if (comp.x3d !== undefined && comp.y3d !== undefined && comp.z3d !== undefined) {
          posMap.set(comp.id, {
            x3d: comp.x3d,
            y3d: comp.y3d,
            z3d: comp.z3d,
            rotY: typeof comp.parameters?.rotY === 'number' ? comp.parameters.rotY : (comp.rot3d !== undefined ? comp.rot3d : (comp.rotation || 0)),
            rotX: typeof comp.parameters?.rotX === 'number' ? comp.parameters.rotX : 0,
            rotZ: typeof comp.parameters?.rotZ === 'number' ? comp.parameters.rotZ : 0,
          });

          if (breadboardCount > 0) {
            const col = Math.round((comp.x3d - START_X) / PITCH_X) + 1;
            const targetBoard = Math.round(-comp.z3d / 60.0);
            if (targetBoard >= 0 && targetBoard < breadboardCount && col >= 1 && col <= 63) {
              const mappedType = mapCircuitCompTo3DType(comp);
              if (isRavineStraddler(mappedType)) {
                boardStraddlerCount[targetBoard]++;
                const span = getStraddlerSpan(mappedType);
                const halfSpan = Math.ceil(span / 2);
                for (let c = Math.max(1, col - halfSpan - 3); c <= Math.min(63, col + halfSpan + 3); c++) {
                  boardBlockedCols[targetBoard].add(c);
                }
              } else {
                const isTop = (comp.z3d - (-targetBoard * 60.0)) < 0;
                const targetCols = isTop ? boardTopCols[targetBoard] : boardBottomCols[targetBoard];
                for (let oc = col - 2; oc <= col + 2; oc++) {
                  targetCols.add(oc);
                }
              }
            }
          }
        }
      }
    }

    for (const comp of sortedComps) {
      if (posMap.has(comp.id)) {
        continue;
      }

      const mappedType = mapCircuitCompTo3DType(comp);
      const priority = getComponentPriority(mappedType);

      // 1. Large Microcontrollers (Priority 5) -> In front of breadboard (z = 65, y = 0)
      if (['ARDUINO_UNO', 'ARDUINO_MEGA'].includes(mappedType) || priority === 5) {
        const x3d = (mcuIdx % 2 === 0 ? 1 : -1) * Math.floor((mcuIdx + 1) / 2) * 85;
        const z3d = 65;
        mcuIdx++;
        posMap.set(comp.id, {
          x3d,
          y3d: computeComponentGroundElevation(mappedType, x3d, z3d, breadboardCount > 0, 0, breadboardCount),
          z3d,
          rotY: 0,
          rotX: 0,
          rotZ: 0,
        });
        continue;
      }

      // 2. Batteries (Priority 4) -> Table surface to the left of breadboard (x <= -95, z = 0, y = 0)
      if (mappedType === 'BATTERY_9V' || priority === 4) {
        const x3d = -95 - batteryIdx * 40;
        const z3d = 0;
        batteryIdx++;
        posMap.set(comp.id, {
          x3d,
          y3d: computeComponentGroundElevation(mappedType, x3d, z3d, breadboardCount > 0, 0, breadboardCount),
          z3d,
          rotY: 0,
          rotX: 0,
          rotZ: 0,
        });
        continue;
      }

      // 3. Large Off-Board Modules / Displays (Priority 3) -> Table surface to the right (x >= 95)
      if (['SERVO_SG90', 'ACTUATOR_SERVO_SG90', 'LCD_1602', 'DISPLAY_LCD1602'].includes(mappedType) || priority === 3) {
        const x3d = 95 + (offboardModuleIdx % 2) * 45;
        const z3d = -35 + Math.floor(offboardModuleIdx / 2) * 45;
        offboardModuleIdx++;
        posMap.set(comp.id, {
          x3d,
          y3d: computeComponentGroundElevation(mappedType, x3d, z3d, breadboardCount > 0, 0, breadboardCount),
          z3d,
          rotY: typeof comp.parameters?.rotY === 'number' ? comp.parameters.rotY : (comp.rot3d !== undefined ? comp.rot3d : (comp.rotation || 0)),
          rotX: typeof comp.parameters?.rotX === 'number' ? comp.parameters.rotX : 0,
          rotZ: typeof comp.parameters?.rotZ === 'number' ? comp.parameters.rotZ : 0,
        });
        continue;
      }

      // 4. Breadboard Placement (Priority 1 and Priority 2)
      if (breadboardCount > 0) {
        if (isRavineStraddler(mappedType)) {
          let targetBoard = -1;
          for (let b = 0; b < breadboardCount; b++) {
            if (boardStraddlerCount[b] < 3) {
              targetBoard = b;
              break;
            }
          }

          if (targetBoard !== -1) {
            const slotIdx = boardStraddlerCount[targetBoard];
            boardStraddlerCount[targetBoard]++;
            const pattern = STRADDLER_SLOTS[Math.min(2, Math.max(0, straddlersPerBoard - 1))];
            const assignedCol = pattern[slotIdx % pattern.length];
            const span = getStraddlerSpan(mappedType);
            const isDip8or16 = mappedType === 'TIMER_555' || mappedType.includes('358') || mappedType.includes('595') || mappedType.includes('4017') || mappedType.includes('2003') || mappedType.includes('293') || mappedType.includes('16') || mappedType.includes('328') || mappedType.includes('DIP_8') || mappedType.includes('DIP_16') || mappedType.includes('DIP_28');
            const colX = isDip8or16 ? START_X + (assignedCol - 0.5) * PITCH_X : START_X + (assignedCol - 1) * PITCH_X;
            const z3d = -targetBoard * 60.0 + (mappedType.includes('NANO') ? 1.27 : 0);
            const y3d = computeComponentGroundElevation(mappedType, colX, z3d, true, 0, breadboardCount);

            // Block columns occupied by this IC + minimum 3 empty columns margin on each side
            const halfSpan = Math.ceil(span / 2);
            for (let c = Math.max(1, assignedCol - halfSpan - 3); c <= Math.min(63, assignedCol + halfSpan + 3); c++) {
              boardBlockedCols[targetBoard].add(c);
            }

            posMap.set(comp.id, {
              x3d: colX,
              y3d,
              z3d,
              rotY: typeof comp.parameters?.rotY === 'number' ? comp.parameters.rotY : (comp.rot3d !== undefined ? comp.rot3d : (comp.rotation || 0)),
              rotX: typeof comp.parameters?.rotX === 'number' ? comp.parameters.rotX : 0,
              rotZ: typeof comp.parameters?.rotZ === 'number' ? comp.parameters.rotZ : 0,
            });
            continue;
          }
        } else {
          // Passives & Breadboard Modules: spacious allocation with min 3-4 empty columns gap
          let targetBoard = -1;
          let assignedCol = -1;
          let isTopHalf = true;

          const CANDIDATE_COLS = [8, 14, 20, 26, 32, 38, 44, 50, 56];

          for (let b = 0; b < breadboardCount; b++) {
            const topCount = boardTopCols[b].size;
            const botCount = boardBottomCols[b].size;
            const preferTop = topCount <= botCount;
            const halfOrder = preferTop ? [true, false] : [false, true];

            for (const tryTop of halfOrder) {
              const targetCols = tryTop ? boardTopCols[b] : boardBottomCols[b];
              for (const col of CANDIDATE_COLS) {
                if (boardBlockedCols[b].has(col)) continue;
                let hasConflict = false;
                for (let oc = col - 3; oc <= col + 3; oc++) {
                  if (targetCols.has(oc)) {
                    hasConflict = true;
                    break;
                  }
                }
                if (!hasConflict) {
                  targetBoard = b;
                  assignedCol = col;
                  isTopHalf = tryTop;
                  break;
                }
              }
              if (targetBoard !== -1) break;
            }
            if (targetBoard !== -1) break;
          }

          if (targetBoard !== -1) {
            const targetCols = isTopHalf ? boardTopCols[targetBoard] : boardBottomCols[targetBoard];
            for (let oc = assignedCol - 2; oc <= assignedCol + 2; oc++) {
              targetCols.add(oc);
            }

            const isEvenPin = mappedType === 'LED_RGB' || mappedType === 'ACTUATOR_RGB_LED' || mappedType === 'HC_SR04' || mappedType === 'SENSOR_ULTRASONIC' || mappedType.includes('BLUETOOTH') || mappedType.includes('HC05');
            const colX = isEvenPin ? START_X + (assignedCol - 0.5) * PITCH_X : START_X + (assignedCol - 1) * PITCH_X;
            const boardCenterZ = -targetBoard * 60.0;
            const z3d = boardCenterZ + (isTopHalf ? ROW_Z_MAP.C : ROW_Z_MAP.H);
            const y3d = computeComponentGroundElevation(mappedType, colX, z3d, true, 0, breadboardCount);

            posMap.set(comp.id, {
              x3d: colX,
              y3d,
              z3d,
              rotY: typeof comp.parameters?.rotY === 'number' ? comp.parameters.rotY : (comp.rot3d !== undefined ? comp.rot3d : (comp.rotation || 0)),
              rotX: typeof comp.parameters?.rotX === 'number' ? comp.parameters.rotX : 0,
              rotZ: typeof comp.parameters?.rotZ === 'number' ? comp.parameters.rotZ : 0,
            });
            continue;
          }
        }
      }

      // 5. Open Console Fallback (when all boards reach capacity or breadboardCount === 0)
      const row = Math.floor(consoleOverflowIdx / 3);
      const col = consoleOverflowIdx % 3;
      const x3d = 95 + col * 40;
      const z3d = -35 + row * 45;
      consoleOverflowIdx++;
      const y3d = computeComponentGroundElevation(mappedType, x3d, z3d, false, 0, breadboardCount);

      posMap.set(comp.id, {
        x3d,
        y3d,
        z3d,
        rotY: typeof comp.parameters?.rotY === 'number' ? comp.parameters.rotY : (comp.rot3d !== undefined ? comp.rot3d : (comp.rotation || 0)),
        rotX: typeof comp.parameters?.rotX === 'number' ? comp.parameters.rotX : 0,
        rotZ: typeof comp.parameters?.rotZ === 'number' ? comp.parameters.rotZ : 0,
      });
    }

    // Return in original component order
    return physicalComponents.map((comp) => {
      const mappedType = mapCircuitCompTo3DType(comp);
      const pos = posMap.get(comp.id) || {
        x3d: 0,
        y3d: 0,
        z3d: 0,
        rotY: 0,
        rotX: 0,
        rotZ: 0,
      };
      return {
        id: comp.id,
        type: mappedType,
        label: comp.label,
        value: comp.value,
        parameters: cleanParams(comp.parameters, comp.model3d, comp.footprint, comp.packageType, comp.mirrored),
        x3d: pos.x3d,
        y3d: pos.y3d,
        z3d: pos.z3d,
        rotY: pos.rotY,
        rotX: pos.rotX,
        rotZ: pos.rotZ,
      };
    });
  }, [components, breadboardCount]);

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

      // Synchronize newly added components from schematic library into active 3D view with spacious collision-free auto-layout
      const existingIds = new Set(prev.map((c) => c.id));
      const newlyAddedRaw = components.filter(
        (c) => c.type !== 'GROUND' && c.type !== 'VCC' && !c.id.toLowerCase().startsWith('gnd') && !existingIds.has(c.id)
      );

      if (newlyAddedRaw.length > 0) {
        const autoAll = schematicTo3DComponents(true, components);
        const autoPosMap = new Map(autoAll.map((c) => [c.id, c]));

        const newlyAdded = newlyAddedRaw.map((comp) => {
          const mapped = mapCircuitCompTo3DType(comp);
          const autoPos = autoPosMap.get(comp.id);
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
            x3d: comp.x3d ?? autoPos?.x3d ?? 0,
            y3d: comp.y3d ?? autoPos?.y3d ?? 8.5,
            z3d: comp.z3d ?? autoPos?.z3d ?? 8.42,
            rotY: comp.rot3d !== undefined ? comp.rot3d : (comp.rotation ?? 0),
            rotX: typeof comp.parameters?.rotX === 'number' ? comp.parameters.rotX : 0,
            rotZ: typeof comp.parameters?.rotZ === 'number' ? comp.parameters.rotZ : 0,
          };
        });

        return [...next, ...newlyAdded];
      }
      return changed ? next : prev;
    });
  }, [components, independentComponents, schematicTo3DComponents]);

  // Reconcile independent 3D wires when schematic wires change to prevent phantom lingering wires
  useEffect(() => {
    if (independentWires === null) return;
    const validCompIds = new Set(components.map((c) => c.id));
    setIndependentWires((prev) => {
      if (!prev) return prev;
      const valid = prev.filter(
        (w) =>
          (w.fromPin.compId === 'breadboard' || validCompIds.has(w.fromPin.compId)) &&
          (w.toPin.compId === 'breadboard' || validCompIds.has(w.toPin.compId))
      );
      return valid.length !== prev.length ? valid : prev;
    });
  }, [wires, components, independentWires]);

  // Helper: Resolve exact breadboard hole for a component's lead pin (supporting multi-breadboard bb_, bb2_, bb3_)
  const getBreadboardHoleForComponentPin = useCallback((comp: Component3D | null | undefined, pinId: string): string | null => {
    if (!comp || !pinId) return null;
    const isBoard3 = comp.z3d !== undefined && comp.z3d < -90;
    const isBoard2 = comp.z3d !== undefined && comp.z3d < -30 && !isBoard3;
    const boardPrefix = isBoard3 ? 'bb3_' : isBoard2 ? 'bb2_' : 'bb_';
    const boardCenterZ = isBoard3 ? -120.0 : isBoard2 ? -60.0 : 0.0;

    const isDip =
      comp.type === 'TIMER_555' ||
      comp.type === 'DIP_IC' ||
      comp.type.includes('DIP') ||
      comp.type.includes('555') ||
      comp.type.includes('74HC') ||
      comp.type.includes('358') ||
      comp.type.includes('324') ||
      comp.type.includes('595') ||
      comp.type.includes('4017') ||
      comp.type.includes('2003') ||
      comp.type.includes('293');

    if (isDip) {
      const isDip16 = comp.type.includes('16') || comp.type.includes('595') || comp.type.includes('4017') || comp.type.includes('2003') || comp.type.includes('293');
      const isDip14 = !isDip16 && (comp.type.includes('14') || comp.type.includes('74HC') || comp.type.includes('324'));

      if (isDip16) {
        const centerCol = Math.round((comp.x3d - START_X) / PITCH_X) + 1;
        const pinNum = parseInt(pinId, 10);
        if (!isNaN(pinNum) && pinNum >= 1 && pinNum <= 16) {
          if (pinNum <= 8) {
            const col = Math.max(1, Math.min(63, centerCol + (pinNum - 4)));
            return `${boardPrefix}col_${col}_E`;
          } else {
            const col = Math.max(1, Math.min(63, centerCol + (13 - pinNum)));
            return `${boardPrefix}col_${col}_F`;
          }
        }
      } else if (isDip14) {
        const centerCol = Math.round((comp.x3d - START_X) / PITCH_X) + 1;
        const pinNum = parseInt(pinId, 10);
        if (!isNaN(pinNum) && pinNum >= 1 && pinNum <= 14) {
          if (pinNum <= 7) {
            const col = Math.max(1, Math.min(63, centerCol + (pinNum - 4)));
            return `${boardPrefix}col_${col}_E`;
          } else {
            const col = Math.max(1, Math.min(63, centerCol + (11 - pinNum)));
            return `${boardPrefix}col_${col}_F`;
          }
        }
      } else {
        const centerCol = Math.round((comp.x3d - START_X) / PITCH_X - 0.5) + 1;
        const pinNum = parseInt(pinId, 10);
        if (!isNaN(pinNum) && pinNum >= 1 && pinNum <= 8) {
          if (pinNum <= 4) {
            const col = Math.max(1, Math.min(63, centerCol - 1 + (pinNum - 1)));
            return `${boardPrefix}col_${col}_E`;
          } else {
            const col = Math.max(1, Math.min(63, centerCol - 1 + (8 - pinNum)));
            return `${boardPrefix}col_${col}_F`;
          }
        }
      }
    }

    const centerCol = Math.round((comp.x3d - START_X) / PITCH_X) + 1;
    const isTop = (comp.z3d ?? 0) <= boardCenterZ;
    const row = isTop ? 'C' : 'H';
    const rotY = comp.rotY !== undefined ? (((Math.round(comp.rotY) % 360) + 360) % 360) : 0;

    if (comp.type === 'RESISTOR') {
      let colOffset = pinId === '1' ? -2 : 2;
      let rowLetter = row;
      if (rotY === 180) {
        colOffset = -colOffset;
      } else if (rotY === 90) {
        colOffset = 0;
        rowLetter = pinId === '1' ? 'E' : 'F';
      } else if (rotY === 270) {
        colOffset = 0;
        rowLetter = pinId === '1' ? 'F' : 'E';
      }
      const col = centerCol + colOffset;
      return `${boardPrefix}col_${Math.max(1, Math.min(63, col))}_${rowLetter}`;
    }

    if (comp.type === 'CAPACITOR' || comp.type === 'CAPACITOR_ELECTROLYTIC') {
      const isPin1 = pinId === '1' || pinId === '+' || pinId.toLowerCase().includes('pos') || pinId.toLowerCase().includes('anode');
      let colOffset = isPin1 ? -1 : 1;
      let rowLetter = row;
      if (rotY === 180) {
        colOffset = -colOffset;
      } else if (rotY === 90) {
        colOffset = 0;
        rowLetter = isPin1 ? 'E' : 'F';
      } else if (rotY === 270) {
        colOffset = 0;
        rowLetter = isPin1 ? 'F' : 'E';
      }
      const col = centerCol + colOffset;
      return `${boardPrefix}col_${Math.max(1, Math.min(63, col))}_${rowLetter}`;
    }

    if (comp.type === 'LED') {
      const p = pinId.toLowerCase();
      const isAnode = p === 'anode' || p === 'a' || p === '1' || p === '+';
      let colOffset = isAnode ? -1 : 1;
      let rowLetter = row;
      if (rotY === 180) {
        colOffset = -colOffset;
      } else if (rotY === 90) {
        colOffset = 0;
        rowLetter = isAnode ? 'E' : 'F';
      } else if (rotY === 270) {
        colOffset = 0;
        rowLetter = isAnode ? 'F' : 'E';
      }
      const col = centerCol + colOffset;
      return `${boardPrefix}col_${Math.max(1, Math.min(63, col))}_${rowLetter}`;
    }

    if (comp.type === 'DIODE' || comp.type === 'DIODE_1N4007') {
      const isAnode = pinId === '1' || pinId === 'anode' || pinId === 'a';
      let colOffset = isAnode ? -2 : 2;
      let rowLetter = row;
      if (rotY === 180) {
        colOffset = -colOffset;
      } else if (rotY === 90) {
        colOffset = 0;
        rowLetter = isAnode ? 'E' : 'F';
      } else if (rotY === 270) {
        colOffset = 0;
        rowLetter = isAnode ? 'F' : 'E';
      }
      const col = centerCol + colOffset;
      return `${boardPrefix}col_${Math.max(1, Math.min(63, col))}_${rowLetter}`;
    }

    if (comp.type === 'LED_RGB' || comp.type === 'ACTUATOR_RGB_LED' || comp.parameters?.model3d === 'led_rgb_5mm') {
      const p = (pinId || '').trim().toLowerCase();
      let colOffset = 0;
      if (p === 'r' || p === '1' || p === 'red') colOffset = -1;
      else if (p === 'c' || p === 'cc' || p === 'com' || p === 'gnd' || p === '-' || p === '2') colOffset = 0;
      else if (p === 'g' || p === '3' || p === 'green') colOffset = 1;
      else if (p === 'b' || p === '4' || p === 'blue') colOffset = 2;
      const col = centerCol + colOffset;
      return `${boardPrefix}col_${Math.max(1, Math.min(63, col))}_${row}`;
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
      return `${boardPrefix}col_${Math.max(1, Math.min(63, col))}_${row}`;
    }

    if (comp.type === 'HC_SR04' || comp.type === 'SENSOR_ULTRASONIC') {
      const p = (pinId || '').trim().toLowerCase();
      let colOffset = 0;
      if (p === 'vcc' || p === '1' || p === '5v') colOffset = -1;
      else if (p === 'trig' || p === '2') colOffset = 0;
      else if (p === 'echo' || p === '3') colOffset = 1;
      else if (p === 'gnd' || p === '4' || p === '-') colOffset = 2;
      const col = centerCol + colOffset;
      return `${boardPrefix}col_${Math.max(1, Math.min(63, col))}_${row}`;
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
      return `${boardPrefix}col_${Math.max(1, Math.min(63, col))}_${row}`;
    }

    if (comp.type === 'BJT_NPN' || comp.type === 'BJT_PNP' || comp.type === 'TRANSISTOR_NPN' || comp.type === 'TRANSISTOR_PNP') {
      const p = (pinId || '').trim().toLowerCase();
      let colOffset = 0;
      if (p === 'e' || p === 'emitter' || p === '1') colOffset = -1;
      else if (p === 'b' || p === 'base' || p === '2') colOffset = 0;
      else if (p === 'c' || p === 'collector' || p === '3') colOffset = 1;
      const col = centerCol + colOffset;
      return `${boardPrefix}col_${Math.max(1, Math.min(63, col))}_${row}`;
    }

    return `${boardPrefix}col_${Math.max(1, Math.min(63, centerCol))}_${row}`;
  }, []);

  // Authentic Breadboard Power Rail Routing & Strict Zero-Shared-Holes Allocation
  const schematicTo3DWires = useCallback((srcWires: CircuitWire[] = wires, srcComps: CircuitComponent[] = components): Wire3D[] => {
    const comps3d = independentComponents !== null ? independentComponents : schematicTo3DComponents();
    if (srcWires.length === 0) {
      return Array.from(uncommittedWires3dCache.values()).filter((w) => {
        const fromValid = w.fromPin.compId === 'breadboard' || comps3d.some((c) => c.id === w.fromPin.compId);
        const toValid = w.toPin.compId === 'breadboard' || comps3d.some((c) => c.id === w.toPin.compId);
        return fromValid && toValid;
      });
    }

    const battery = srcComps.find(
      (c) => c.type === 'BATTERY' || c.type === 'BATTERY_9V' || c.id.toLowerCase().startsWith('bat')
    );
    const gndCompIds = new Set(
      srcComps
        .filter((c) => c.type === 'GROUND' || c.id.toLowerCase().startsWith('gnd'))
        .map((c) => c.id)
    );

    const outWires: Wire3D[] = [];
    const seen3dPairs = new Set<string>();
    const occupancy = new BreadboardOccupancyMap();

    // PHASE 1: Reserve exact hole coordinates for ALL component leads on the breadboard
    for (const c3d of comps3d) {
      if (['ARDUINO_UNO', 'ARDUINO_MEGA', 'BATTERY_9V'].includes(c3d.type)) continue;

      if (c3d.type.includes('16') || c3d.type.includes('595') || c3d.type.includes('4017') || c3d.type.includes('2003') || c3d.type.includes('293')) {
        for (let p = 1; p <= 16; p++) {
          const holeId = getBreadboardHoleForComponentPin(c3d, String(p));
          if (holeId) {
            occupancy.occupy(holeId, { type: 'component_pin', ownerId: c3d.id, pinId: String(p) });
          }
        }
      } else if (c3d.type.includes('74HC') || c3d.type.includes('DIP14') || c3d.type.includes('DIP_14') || c3d.type.includes('324')) {
        for (let p = 1; p <= 14; p++) {
          const holeId = getBreadboardHoleForComponentPin(c3d, String(p));
          if (holeId) {
            occupancy.occupy(holeId, { type: 'component_pin', ownerId: c3d.id, pinId: String(p) });
          }
        }
      } else if (c3d.type === 'TIMER_555' || c3d.type === 'DIP_IC' || c3d.type.includes('358') || c3d.type.includes('DIP')) {
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

    // Helper to determine if a component attaches wires directly to its pins rather than via breadboard spring clips
    const isDirectWireComponent = (comp?: Component3D) => {
      if (!comp) return false;
      const t = (comp.type || '').toUpperCase();
      return (
        t === 'ARDUINO_UNO' ||
        t === 'ARDUINO_MEGA' ||
        t === 'BATTERY_9V' ||
        t === 'BATTERY' ||
        t === 'HC_SR04' ||
        t === 'SENSOR_ULTRASONIC' ||
        t === 'SERVO_SG90' ||
        t === 'ACTUATOR_SERVO_SG90' ||
        t === 'LCD_1602' ||
        t === 'DISPLAY_LCD1602' ||
        t === 'MODULE_BLUETOOTH_HC05' ||
        t.includes('BLUETOOTH')
      );
    };

    const normalizePinIdForComponent = (comp: Component3D, pin: string) => {
      const t = (comp.type || '').toUpperCase();
      if (t === 'HC_SR04' || t === 'SENSOR_ULTRASONIC') {
        const p = (pin || '').trim().toUpperCase();
        if (p === '1' || p === 'VCC' || p === '5V') return 'VCC';
        if (p === '2' || p === 'TRIG' || p === 'TRIGGER') return 'TRIG';
        if (p === '3' || p === 'ECHO') return 'ECHO';
        if (p === '4' || p === 'GND' || p === 'GROUND' || p === '-') return 'GND';
        return p;
      }
      return pin;
    };

    class NetUnionFind {
      private parent = new Map<string, string>();
      find(x: string): string {
        if (!this.parent.has(x)) this.parent.set(x, x);
        if (this.parent.get(x) !== x) {
          this.parent.set(x, this.find(this.parent.get(x)!));
        }
        return this.parent.get(x)!;
      }
      union(x: string, y: string) {
        const rx = this.find(x);
        const ry = this.find(y);
        if (rx !== ry) this.parent.set(rx, ry);
      }
      connected(x: string, y: string): boolean {
        return this.find(x) === this.find(y);
      }
    }

    const uf = new NetUnionFind();

    const getPinKey = (compId: string, pinId: string): string => {
      if (gndCompIds.has(compId)) return '__GLOBAL_GND__';
      if (battery && compId === battery.id) {
        const p = (pinId || '').trim().toLowerCase();
        if (p === '-' || p === 'n') return '__GLOBAL_GND__';
        if (p === '+' || p === 'p') return '__GLOBAL_VCC__';
      }
      const comp = comps3d.find((c) => c.id === compId);
      const normPin = comp ? normalizePinIdForComponent(comp, pinId) : pinId;
      const pUpper = normPin.trim().toUpperCase();
      if (pUpper === 'GND' || pUpper === 'GROUND' || pUpper.startsWith('GND')) {
        return `${compId}:GND`;
      }
      return `${compId}:${normPin}`;
    };

    const connectedCompIds = new Set<string>();
    srcWires.forEach((w) => {
      connectedCompIds.add(w.fromCompId);
      connectedCompIds.add(w.toCompId);
    });
    const batteryIsConnected = Boolean(battery && connectedCompIds.has(battery.id));

    gndCompIds.forEach((gndId) => {
      uf.union('__GLOBAL_GND__', `${gndId}:1`);
    });

    if (battery && batteryIsConnected) {
      uf.union('__GLOBAL_GND__', `${battery.id}:-`);
      uf.union('__GLOBAL_VCC__', `${battery.id}:+`);
    }

    srcWires.forEach((w) => {
      const k1 = getPinKey(w.fromCompId, w.fromPinId);
      const k2 = getPinKey(w.toCompId, w.toPinId);
      uf.union(k1, k2);
      if (w.tappedWireId) {
        const parent = srcWires.find((sw) => sw.id === w.tappedWireId);
        if (parent) {
          const kp = getPinKey(parent.fromCompId, parent.fromPinId);
          uf.union(k1, kp);
        }
      }
    });

    const gndRoot = uf.find('__GLOBAL_GND__');
    const vccRoot = uf.find('__GLOBAL_VCC__');

    const batPosConnected = Boolean(
      battery &&
        srcWires.some(
          (w) =>
            (w.fromCompId === battery.id && ['p', '+', 'pos'].includes(w.fromPinId.toLowerCase())) ||
            (w.toCompId === battery.id && ['p', '+', 'pos'].includes(w.toPinId.toLowerCase()))
        )
    );
    const batNegConnected = Boolean(
      battery &&
        srcWires.some(
          (w) =>
            (w.fromCompId === battery.id && ['n', '-', 'neg'].includes(w.fromPinId.toLowerCase())) ||
            (w.toCompId === battery.id && ['n', '-', 'neg'].includes(w.toPinId.toLowerCase()))
        )
    );

    let needsPosRailBridge = false;
    let needsNegRailBridge = false;

    if (battery && (batPosConnected || batNegConnected)) {
      let hasTopPos = true;
      let hasBottomPos = false;
      let hasTopNeg = true;
      let hasBottomNeg = false;

      for (const comp of comps3d) {
        if (isDirectWireComponent(comp)) continue;
        const schComp = srcComps.find((sc) => sc.id === comp.id);
        const pinIds = schComp?.pins?.map((p) => p.id) || ['1', '2', 'a', 'k', 'anode', 'cathode'];
        for (const pid of pinIds) {
          const k = getPinKey(comp.id, pid);
          const root = uf.find(k);
          if (root === vccRoot || root === gndRoot) {
            const h = getBreadboardHoleForComponentPin(comp, pid);
            if (h) {
              const isTop = h.includes('_top_') || h.match(/_[A-Ea-e]$/) !== null || h.includes('_top');
              const isBot = h.includes('_bottom_') || h.match(/_[F-Jf-j]$/) !== null || h.includes('_bottom');
              if (root === vccRoot) {
                if (isTop) hasTopPos = true;
                if (isBot) hasBottomPos = true;
              }
              if (root === gndRoot) {
                if (isTop) hasTopNeg = true;
                if (isBot) hasBottomNeg = true;
              }
            }
          }
        }
      }

      needsPosRailBridge = batPosConnected && hasTopPos && hasBottomPos;
      needsNegRailBridge = batNegConnected && hasTopNeg && hasBottomNeg;
    }

    // PHASE 2: Route Power Rails & Zero-Collision Jumper Wires
    const SIGNAL_COLORS = ['#3B82F6', '#10B981', '#EAB308', '#F97316'];
    let sigColorIdx = 0;
    const nextSourceMap = new Map<string, string[]>();

    // 1. Battery Connections to Top Rails at Col 1 ONLY if specific battery terminal has wires in circuit
    if (battery && batPosConnected) {
      const batPosHole = 'bb_rail_top_pos_1';
      occupancy.occupy(batPosHole, { type: 'wire_end', ownerId: battery.id });

      outWires.push({
        id: `wire_bat_pos_${battery.id}`,
        fromPin: { compId: battery.id, pinId: '+' },
        toPin: { compId: 'breadboard', pinId: batPosHole },
        color: '#EF4444',
      });
    }

    if (battery && batNegConnected) {
      const batNegHole = 'bb_rail_top_neg_1';
      occupancy.occupy(batNegHole, { type: 'wire_end', ownerId: battery.id });

      outWires.push({
        id: `wire_bat_neg_${battery.id}`,
        fromPin: { compId: battery.id, pinId: '-' },
        toPin: { compId: 'breadboard', pinId: batNegHole },
        color: '#1E293B',
      });
    }

    // 2. Power Rail Bridges connecting Top <-> Bottom Rails ONLY if components on BOTH top and bottom rails connect
    if (needsPosRailBridge) {
      const bridgePosLeft = 'bb_rail_top_pos_2';
      const bridgePosLeftBot = 'bb_rail_bottom_pos_2';
      occupancy.occupy(bridgePosLeft, { type: 'wire_end', ownerId: 'rail_bridge_pos_l' });
      occupancy.occupy(bridgePosLeftBot, { type: 'wire_end', ownerId: 'rail_bridge_pos_l' });
      outWires.push({
        id: 'wire_rail_bridge_pos_left',
        fromPin: { compId: 'breadboard', pinId: bridgePosLeft },
        toPin: { compId: 'breadboard', pinId: bridgePosLeftBot },
        color: '#EF4444',
      });
    }

    if (needsNegRailBridge) {
      const bridgeNegLeft = 'bb_rail_top_neg_2';
      const bridgeNegLeftBot = 'bb_rail_bottom_neg_2';
      occupancy.occupy(bridgeNegLeft, { type: 'wire_end', ownerId: 'rail_bridge_neg_l' });
      occupancy.occupy(bridgeNegLeftBot, { type: 'wire_end', ownerId: 'rail_bridge_neg_l' });
      outWires.push({
        id: 'wire_rail_bridge_neg_left',
        fromPin: { compId: 'breadboard', pinId: bridgeNegLeft },
        toPin: { compId: 'breadboard', pinId: bridgeNegLeftBot },
        color: '#1E293B',
      });
    }

    // Inter-Breadboard Power Rail Bridges when breadboardCount >= 2 AND battery is connected
    if (breadboardCount >= 2 && batteryIsConnected) {
      let b2HasPos = false;
      let b2HasNeg = false;
      for (const comp of comps3d) {
        if (isDirectWireComponent(comp)) continue;
        const schComp = srcComps.find((sc) => sc.id === comp.id);
        const pinIds = schComp?.pins?.map((p) => p.id) || ['1', '2', 'a', 'k', 'anode', 'cathode'];
        for (const pid of pinIds) {
          const k = getPinKey(comp.id, pid);
          const root = uf.find(k);
          if (root === vccRoot || root === gndRoot) {
            const h = getBreadboardHoleForComponentPin(comp, pid);
            if (h && h.startsWith('bb2_')) {
              if (root === vccRoot) b2HasPos = true;
              if (root === gndRoot) b2HasNeg = true;
            }
          }
        }
      }

      if (b2HasPos && batPosConnected) {
        const b1PosLeft = 'bb_rail_top_pos_4';
        const b2PosLeft = 'bb2_rail_bottom_pos_4';
        occupancy.occupy(b1PosLeft, { type: 'wire_end', ownerId: 'bb1_bb2_rail_bridge_pos_l' });
        occupancy.occupy(b2PosLeft, { type: 'wire_end', ownerId: 'bb1_bb2_rail_bridge_pos_l' });
        outWires.push({
          id: 'wire_bb1_bb2_rail_pos_left',
          fromPin: { compId: 'breadboard', pinId: b1PosLeft },
          toPin: { compId: 'breadboard', pinId: b2PosLeft },
          color: '#EF4444',
        });

        const b1PosRight = 'bb_rail_top_pos_48';
        const b2PosRight = 'bb2_rail_bottom_pos_48';
        occupancy.occupy(b1PosRight, { type: 'wire_end', ownerId: 'bb1_bb2_rail_bridge_pos_r' });
        occupancy.occupy(b2PosRight, { type: 'wire_end', ownerId: 'bb1_bb2_rail_bridge_pos_r' });
        outWires.push({
          id: 'wire_bb1_bb2_rail_pos_right',
          fromPin: { compId: 'breadboard', pinId: b1PosRight },
          toPin: { compId: 'breadboard', pinId: b2PosRight },
          color: '#EF4444',
        });
      }

      if (b2HasNeg && batNegConnected) {
        const b1NegLeft = 'bb_rail_top_neg_4';
        const b2NegLeft = 'bb2_rail_bottom_neg_4';
        occupancy.occupy(b1NegLeft, { type: 'wire_end', ownerId: 'bb1_bb2_rail_bridge_neg_l' });
        occupancy.occupy(b2NegLeft, { type: 'wire_end', ownerId: 'bb1_bb2_rail_bridge_neg_l' });
        outWires.push({
          id: 'wire_bb1_bb2_rail_neg_left',
          fromPin: { compId: 'breadboard', pinId: b1NegLeft },
          toPin: { compId: 'breadboard', pinId: b2NegLeft },
          color: '#1E293B',
        });

        const b1NegRight = 'bb_rail_top_neg_48';
        const b2NegRight = 'bb2_rail_bottom_neg_48';
        occupancy.occupy(b1NegRight, { type: 'wire_end', ownerId: 'bb1_bb2_rail_bridge_neg_r' });
        occupancy.occupy(b2NegRight, { type: 'wire_end', ownerId: 'bb1_bb2_rail_bridge_neg_r' });
        outWires.push({
          id: 'wire_bb1_bb2_rail_neg_right',
          fromPin: { compId: 'breadboard', pinId: b1NegRight },
          toPin: { compId: 'breadboard', pinId: b2NegRight },
          color: '#1E293B',
        });
      }
    }

    if (breadboardCount >= 3) {
      if (batPosConnected) {
        // Connect Board 2 Top Rails <-> Board 3 Bottom Rails
        const b2PosLeft = 'bb2_rail_top_pos_4';
        const b3PosLeft = 'bb3_rail_bottom_pos_4';
        occupancy.occupy(b2PosLeft, { type: 'wire_end', ownerId: 'bb2_bb3_rail_bridge_pos_l' });
        occupancy.occupy(b3PosLeft, { type: 'wire_end', ownerId: 'bb2_bb3_rail_bridge_pos_l' });
        outWires.push({
          id: 'wire_bb2_bb3_rail_pos_left',
          fromPin: { compId: 'breadboard', pinId: b2PosLeft },
          toPin: { compId: 'breadboard', pinId: b3PosLeft },
          color: '#EF4444',
        });
      }

      if (batNegConnected) {
        const b2NegLeft = 'bb2_rail_top_neg_4';
        const b3NegLeft = 'bb3_rail_bottom_neg_4';
        occupancy.occupy(b2NegLeft, { type: 'wire_end', ownerId: 'bb2_bb3_rail_bridge_neg_l' });
        occupancy.occupy(b3NegLeft, { type: 'wire_end', ownerId: 'bb2_bb3_rail_bridge_neg_l' });
        outWires.push({
          id: 'wire_bb2_bb3_rail_neg_left',
          fromPin: { compId: 'breadboard', pinId: b2NegLeft },
          toPin: { compId: 'breadboard', pinId: b3NegLeft },
          color: '#1E293B',
        });
      }
    }

    // 3. Circuit Jumper Wires & Power Drops via True Net-Based Minimum Spanning Tree (MST)

    interface CircuitPinRef {
      compId: string;
      pinId: string;
      rawPinId: string;
      netKey: string;
      comp: Component3D;
    }

    const pinRefs: CircuitPinRef[] = [];
    const seenPins = new Set<string>();

    const registerPin = (compId: string, pinId: string) => {
      if (gndCompIds.has(compId)) return;
      if (battery && compId === battery.id) return;
      const comp = comps3d.find((c) => c.id === compId);
      if (!comp) return;
      const normPin = normalizePinIdForComponent(comp, pinId);
      const key = `${compId}:${normPin}`;
      if (seenPins.has(key)) return;
      seenPins.add(key);
      pinRefs.push({
        compId,
        pinId: normPin,
        rawPinId: pinId,
        netKey: getPinKey(compId, pinId),
        comp,
      });
    };

    srcWires.forEach((w) => {
      registerPin(w.fromCompId, w.fromPinId);
      registerPin(w.toCompId, w.toPinId);
    });

    const netsByRoot = new Map<string, CircuitPinRef[]>();
    pinRefs.forEach((ref) => {
      const root = uf.find(ref.netKey);
      if (!netsByRoot.has(root)) netsByRoot.set(root, []);
      netsByRoot.get(root)!.push(ref);
    });

    const getTgCoord = (tg: string) => {
      let col = 25;
      const m = tg.match(/col_(\d+)/);
      if (m) col = parseInt(m[1], 10);
      const x = START_X + (Math.max(1, Math.min(63, col)) - 1) * PITCH_X;
      const isTop = tg.includes('top');
      let z = isTop ? -8.0 : 8.0;
      if (tg.startsWith('bb3_')) z -= 120.0;
      else if (tg.startsWith('bb2_')) z -= 60.0;
      return { x, z };
    };

    netsByRoot.forEach((netPins, root) => {
      const isGndNet = Boolean(battery && batNegConnected && root === gndRoot);
      const isPosNet = Boolean(battery && batPosConnected && root === vccRoot);

      // Collect unique breadboard tieGroups and MCU leaves for this net
      const tieGroupSet = new Set<string>();
      const mcuLeaves: CircuitPinRef[] = [];

      netPins.forEach((ref) => {
        if (isDirectWireComponent(ref.comp)) {
          mcuLeaves.push(ref);
        } else {
          const compHole = getBreadboardHoleForComponentPin(ref.comp, ref.rawPinId);
          const tg = compHole ? getTieGroupForHole(compHole) : undefined;
          if (tg) {
            tieGroupSet.add(tg);
          }
        }
      });

      const uniqueTieGroups = Array.from(tieGroupSet);

      if (isGndNet || isPosNet) {
        // Power (+) / Ground (-) net: connect each unique tieGroup and each MCU pin to nearest rail hole
        uniqueTieGroups.forEach((tg) => {
          let col = 25;
          const m = tg.match(/col_(\d+)/);
          if (m) col = parseInt(m[1], 10);
          const boardPrefix = tg.startsWith('bb3_') ? 'bb3_' : tg.startsWith('bb2_') ? 'bb2_' : 'bb_';
          const isTop = tg.includes('top');
          const railType = isGndNet
            ? isTop
              ? 'rail_top_neg'
              : 'rail_bottom_neg'
            : isTop
            ? 'rail_top_pos'
            : 'rail_bottom_pos';
          const railHole = occupancy.findFreeRailHole(col, railType, boardPrefix);
          const compHole = occupancy.findFreeHoleInTieGroup(tg);
          if (railHole && compHole) {
            const wireId = `wire_drop_${isGndNet ? 'gnd' : 'pos'}_${tg}`;
            occupancy.occupy(railHole.id, { type: 'wire_end', ownerId: wireId });
            occupancy.occupy(compHole.id, { type: 'wire_end', ownerId: wireId });
            outWires.push({
              id: wireId,
              fromPin: { compId: 'breadboard', pinId: railHole.id },
              toPin: { compId: 'breadboard', pinId: compHole.id },
              color: isGndNet ? '#1E293B' : '#EF4444',
            });
            const dropSrcIds: string[] = [];
            srcWires.forEach((sw) => {
              const k1 = getPinKey(sw.fromCompId, sw.fromPinId);
              const k2 = getPinKey(sw.toCompId, sw.toPinId);
              const inNet = uf.find(k1) === (isGndNet ? gndRoot : vccRoot) || uf.find(k2) === (isGndNet ? gndRoot : vccRoot);
              if (inNet) {
                const hFrom = getBreadboardHoleForComponentPin(comps3d.find((c) => c.id === sw.fromCompId), sw.fromPinId);
                const hTo = getBreadboardHoleForComponentPin(comps3d.find((c) => c.id === sw.toCompId), sw.toPinId);
                const tgFrom = hFrom ? getTieGroupForHole(hFrom) : undefined;
                const tgTo = hTo ? getTieGroupForHole(hTo) : undefined;
                if (tgFrom === tg || (!sw.tappedWireId && tgTo === tg)) {
                  dropSrcIds.push(sw.id);
                }
              }
            });
            if (dropSrcIds.length > 0) {
              nextSourceMap.set(wireId, dropSrcIds);
            }
          }
        });

        mcuLeaves.forEach((leaf) => {
          const col =
            leaf.comp.x3d !== undefined
              ? Math.max(1, Math.min(63, Math.round((leaf.comp.x3d - START_X) / PITCH_X) + 1))
              : 25;
          const boardPrefix =
            leaf.comp.z3d !== undefined && leaf.comp.z3d < -90
              ? 'bb3_'
              : leaf.comp.z3d !== undefined && leaf.comp.z3d < -30
              ? 'bb2_'
              : 'bb_';
          const boardCenterZ =
            leaf.comp.z3d !== undefined && leaf.comp.z3d < -90
              ? -120.0
              : leaf.comp.z3d !== undefined && leaf.comp.z3d < -30
              ? -60.0
              : 0.0;
          const isTop = (leaf.comp.z3d ?? -8) <= boardCenterZ;
          const railType = isGndNet
            ? isTop
              ? 'rail_top_neg'
              : 'rail_bottom_neg'
            : isTop
            ? 'rail_top_pos'
            : 'rail_bottom_pos';
          const railHole = occupancy.findFreeRailHole(col, railType, boardPrefix);
          if (railHole) {
            const wireId = `wire_mcu_${isGndNet ? 'gnd' : 'pos'}_${leaf.compId}_${leaf.pinId}`;
            occupancy.occupy(railHole.id, { type: 'wire_end', ownerId: wireId });
            outWires.push({
              id: wireId,
              fromPin: { compId: 'breadboard', pinId: railHole.id },
              toPin: { compId: leaf.compId, pinId: leaf.pinId },
              color: isGndNet ? '#1E293B' : '#EF4444',
            });
            const mcuSrcIds = srcWires
              .filter((sw) => {
                const k1 = getPinKey(sw.fromCompId, sw.fromPinId);
                const k2 = getPinKey(sw.toCompId, sw.toPinId);
                const inNet = uf.find(k1) === root || uf.find(k2) === root;
                if (!inNet) return false;
                return k1 === leaf.netKey || (!sw.tappedWireId && k2 === leaf.netKey);
              })
              .map((sw) => sw.id);
            if (mcuSrcIds.length > 0) {
              nextSourceMap.set(wireId, mcuSrcIds);
            }
          }
        });
        return;
      }

      // Signal Net: Minimum Spanning Tree
      const totalPhysicalNodes = uniqueTieGroups.length + mcuLeaves.length;
      if (totalPhysicalNodes <= 1) {
        return; // 0 jumpers needed!
      }

      // Pick wire color
      let wireColor: string = SIGNAL_COLORS[sigColorIdx % SIGNAL_COLORS.length];
      const netWires = srcWires.filter((w) => {
        const k1 = getPinKey(w.fromCompId, w.fromPinId);
        const k2 = getPinKey(w.toCompId, w.toPinId);
        return uf.find(k1) === root || uf.find(k2) === root;
      });
      const customColorWire = netWires.find(
        (w) => w.color && w.color !== '#EF4444' && w.color !== '#1E293B'
      );
      if (customColorWire && customColorWire.color) {
        wireColor = customColorWire.color;
      } else {
        sigColorIdx++;
      }

      // 1. Connect all breadboard tieGroup nodes first via shortest column-to-column jumpers (MST)
      if (uniqueTieGroups.length >= 2) {
        interface TgEdge {
          tgA: string;
          tgB: string;
          dist: number;
        }
        const edges: TgEdge[] = [];
        for (let i = 0; i < uniqueTieGroups.length; i++) {
          const posA = getTgCoord(uniqueTieGroups[i]);
          for (let j = i + 1; j < uniqueTieGroups.length; j++) {
            const posB = getTgCoord(uniqueTieGroups[j]);
            edges.push({
              tgA: uniqueTieGroups[i],
              tgB: uniqueTieGroups[j],
              dist: Math.hypot(posA.x - posB.x, posA.z - posB.z),
            });
          }
        }
        edges.sort((a, b) => a.dist - b.dist);

        const tgUf = new NetUnionFind();
        let edgeIdx = 0;
        for (const e of edges) {
          if (!tgUf.connected(e.tgA, e.tgB)) {
            tgUf.union(e.tgA, e.tgB);
            const holeA = occupancy.findFreeHoleInTieGroup(e.tgA);
            const holeB = occupancy.findFreeHoleInTieGroup(e.tgB);
            if (holeA && holeB) {
              const wireId = `wire_jumper_mst_${e.tgA}_${e.tgB}_${edgeIdx++}`;
              occupancy.occupy(holeA.id, { type: 'wire_end', ownerId: wireId });
              occupancy.occupy(holeB.id, { type: 'wire_end', ownerId: wireId });
              outWires.push({
                id: wireId,
                fromPin: { compId: 'breadboard', pinId: holeA.id },
                toPin: { compId: 'breadboard', pinId: holeB.id },
                color: wireColor,
                current: netWires[0]?.current,
              });
              const directMstIds = netWires
                .filter((sw) => {
                  const hFrom = getBreadboardHoleForComponentPin(comps3d.find((c) => c.id === sw.fromCompId), sw.fromPinId);
                  const hTo = getBreadboardHoleForComponentPin(comps3d.find((c) => c.id === sw.toCompId), sw.toPinId);
                  const tgFrom = hFrom ? getTieGroupForHole(hFrom) : undefined;
                  const tgTo = hTo ? getTieGroupForHole(hTo) : undefined;
                  return (tgFrom === e.tgA && tgTo === e.tgB) || (tgFrom === e.tgB && tgTo === e.tgA);
                })
                .map((sw) => sw.id);
              if (directMstIds.length > 0) {
                nextSourceMap.set(wireId, directMstIds);
              } else {
                const touchingIds = netWires
                  .filter((sw) => {
                    const hFrom = getBreadboardHoleForComponentPin(comps3d.find((c) => c.id === sw.fromCompId), sw.fromPinId);
                    const hTo = getBreadboardHoleForComponentPin(comps3d.find((c) => c.id === sw.toCompId), sw.toPinId);
                    const tgFrom = hFrom ? getTieGroupForHole(hFrom) : undefined;
                    const tgTo = hTo ? getTieGroupForHole(hTo) : undefined;
                    return tgFrom === e.tgA || tgTo === e.tgA || tgFrom === e.tgB || tgTo === e.tgB;
                  })
                  .map((sw) => sw.id);
                if (touchingIds.length > 0) {
                  nextSourceMap.set(wireId, [touchingIds[0]]);
                }
              }
            }
          }
        }
      }

      // 2. Attach EACH isMcuLeaf node with EXACTLY ONE single jumper wire
      for (const leaf of mcuLeaves) {
        const leafPos = {
          x: leaf.comp.x3d ?? 0,
          z: leaf.comp.z3d ?? 0,
        };

        if (uniqueTieGroups.length > 0) {
          // Connect to nearest breadboard tieGroup
          let bestTg = uniqueTieGroups[0];
          let bestDist = Math.hypot(
            leafPos.x - getTgCoord(bestTg).x,
            leafPos.z - getTgCoord(bestTg).z
          );
          for (let i = 1; i < uniqueTieGroups.length; i++) {
            const tg = uniqueTieGroups[i];
            const d = Math.hypot(
              leafPos.x - getTgCoord(tg).x,
              leafPos.z - getTgCoord(tg).z
            );
            if (d < bestDist) {
              bestDist = d;
              bestTg = tg;
            }
          }

          const freeHole = occupancy.findFreeHoleInTieGroup(bestTg);
          if (freeHole) {
            const wireId = `wire_mcu_leaf_${leaf.compId}_${leaf.pinId}`;
            occupancy.occupy(freeHole.id, { type: 'wire_end', ownerId: wireId });
            outWires.push({
              id: wireId,
              fromPin: { compId: leaf.compId, pinId: leaf.pinId },
              toPin: { compId: 'breadboard', pinId: freeHole.id },
              color: wireColor,
              current: netWires[0]?.current,
            });
            const mcuLeafIds = netWires
              .filter(
                (sw) =>
                  getPinKey(sw.fromCompId, sw.fromPinId) === leaf.netKey ||
                  (!sw.tappedWireId && getPinKey(sw.toCompId, sw.toPinId) === leaf.netKey)
              )
              .map((sw) => sw.id);
            if (mcuLeafIds.length > 0) {
              nextSourceMap.set(wireId, mcuLeafIds);
            }
          }
        } else {
          // No breadboard tieGroup in this net; connect leaves directly
          let otherLeaf: CircuitPinRef | null = null;
          let bestDist = Infinity;
          for (const ol of mcuLeaves) {
            if (ol.compId === leaf.compId && ol.pinId === leaf.pinId) continue;
            const posOl = { x: ol.comp.x3d ?? 0, z: ol.comp.z3d ?? 0 };
            const d = Math.hypot(leafPos.x - posOl.x, leafPos.z - posOl.z);
            if (d < bestDist) {
              bestDist = d;
              otherLeaf = ol;
            }
          }
          if (otherLeaf) {
            const pairKey1 = `${leaf.compId}:${leaf.pinId}->${otherLeaf.compId}:${otherLeaf.pinId}`;
            const pairKey2 = `${otherLeaf.compId}:${otherLeaf.pinId}->${leaf.compId}:${leaf.pinId}`;
            if (!seen3dPairs.has(pairKey1) && !seen3dPairs.has(pairKey2)) {
              seen3dPairs.add(pairKey1);
              const wireId = `wire_leaf_leaf_${leaf.compId}_${otherLeaf.compId}`;
              outWires.push({
                id: wireId,
                fromPin: { compId: leaf.compId, pinId: leaf.pinId },
                toPin: { compId: otherLeaf.compId, pinId: otherLeaf.pinId },
                color: wireColor,
                current: netWires[0]?.current,
              });
              const leafLeafIds = netWires
                .filter(
                  (sw) =>
                    (sw.fromCompId === leaf.compId && sw.toCompId === otherLeaf.compId) ||
                    (sw.fromCompId === otherLeaf.compId && sw.toCompId === leaf.compId)
                )
                .map((sw) => sw.id);
              if (leafLeafIds.length > 0) {
                nextSourceMap.set(wireId, leafLeafIds);
              }
            }
          }
        }
      }
    });

    generatedWireSourceMapRef.current = nextSourceMap;

    for (const [wId, cw] of Array.from(uncommittedWires3dCache.entries())) {
      const fromIsBb = cw.fromPin.compId === 'breadboard' || cw.fromPin.compId.startsWith('breadboard');
      const toIsBb = cw.toPin.compId === 'breadboard' || cw.toPin.compId.startsWith('breadboard');
      const fromValid = fromIsBb || comps3d.some((c) => c.id === cw.fromPin.compId);
      const toValid = toIsBb || comps3d.some((c) => c.id === cw.toPin.compId);
      if (!fromValid || !toValid) {
        uncommittedWires3dCache.delete(wId);
        continue;
      }
      if (!fromIsBb && !toIsBb) {
        const k1 = getPinKey(cw.fromPin.compId, cw.fromPin.pinId);
        const k2 = getPinKey(cw.toPin.compId, cw.toPin.pinId);
        if (uf.connected(k1, k2)) {
          uncommittedWires3dCache.delete(wId);
          continue;
        }
      }
      if (!outWires.some((w) => w.id === cw.id)) {
        outWires.push(cw);
      }
    }

    // Strict phantom wire filter: Any component with 0 connections in srcWires must have 0 wires attached
    return outWires.filter((w) => {
      if (w.id.startsWith('wire_bat_') || w.id.startsWith('wire_rail_bridge') || w.id.startsWith('wire_bb')) {
        return batteryIsConnected;
      }
      if (uncommittedWires3dCache.has(w.id)) return true;
      if (w.fromPin.compId !== 'breadboard' && !connectedCompIds.has(w.fromPin.compId)) return false;
      if (w.toPin.compId !== 'breadboard' && !connectedCompIds.has(w.toPin.compId)) return false;
      return true;
    });
  }, [wires, components, independentComponents, schematicTo3DComponents, getBreadboardHoleForComponentPin, breadboardCount]);

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
    // 1. Determine current state deterministically from activeComponents3d or components
    const targetComp = activeComponents3d.find((c) => c.id === compId) || components.find((c) => c.id === compId);
    const isCurrentlyPlugged = targetComp?.parameters?.usbPlugged !== false;
    const nextState = !isCurrentlyPlugged;

    setIndependentComponents((prev) => {
      const current = prev !== null ? prev : activeComponents3d;
      return current.map((c) => {
        if (c.id === compId) {
          return {
            ...c,
            parameters: { ...c.parameters, usbPlugged: nextState, dcJackPlugged: false },
          };
        }
        return c;
      });
    });

    const comp = components.find((c) => c.id === compId);
    const active = activeComponents3d.find((c) => c.id === compId);
    const label = comp?.label || targetComp?.label || 'MCU';

    toast.success(
      nextState
        ? `🔌 Connected USB Power to ${label} (5.0V Active)`
        : `⚡ Unplugged USB Cable from ${label} (0V)`
    );

    const compToUpdate: CircuitComponent | null = comp || (targetComp ? {
      id: targetComp.id,
      type: targetComp.type,
      label: targetComp.label,
      value: ('value' in targetComp && targetComp.value) ? targetComp.value : '5V',
      x: 0,
      y: 0,
      rotation: 0,
      pins: [],
      category: 'microcontrollers' as const,
      footprint: '',
      parameters: targetComp.parameters || {},
      x3d: targetComp.x3d,
      y3d: targetComp.y3d,
      z3d: targetComp.z3d,
      rot3d: 'rotY' in targetComp ? (targetComp.rotY ?? 0) : ((targetComp as CircuitComponent).rot3d ?? (targetComp as CircuitComponent).rotation ?? 0),
    } : null);

    if (compToUpdate && onUpdateComponent) {
      onUpdateComponent({
        ...compToUpdate,
        x3d: active?.x3d ?? compToUpdate.x3d,
        y3d: active?.y3d ?? compToUpdate.y3d,
        z3d: active?.z3d ?? compToUpdate.z3d,
        rot3d: active?.rotY ?? compToUpdate.rot3d,
        parameters: { ...compToUpdate.parameters, usbPlugged: nextState, dcJackPlugged: false },
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
      COMPONENT_CATALOG.find((t) => t.type === c3d.type) ||
      COMPONENT_CATALOG.find((t) => t.type === catalogType) ||
      (catalogType === 'RASPBERRY_PI_PICO' ? COMPONENT_CATALOG.find((t) => t.type === 'ARDUINO_UNO') : undefined) ||
      COMPONENT_CATALOG.find((t) => t.type === 'RESISTOR') ||
      COMPONENT_CATALOG[0];

    const slot = findFreeSchematicSlot(components);
    const newComp = createComponentInstance(tmpl, slot.x, slot.y, components);
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

      // When component moves on the breadboard, resolve newly completed connections with plugged-in wires
      const nextComps3d = (independentComponents !== null ? independentComponents : activeComponents3d).map((c) =>
        c.id === c3d.id ? { ...c, ...c3d } : c
      );
      const curWires3d = independentWires !== null ? independentWires : activeWires3d;
      const userWires3d = curWires3d.filter((w) => w.id.startsWith('wire3d_') || uncommittedWires3dCache.has(w.id));
      const runningWires = [...wires];
      for (const w of userWires3d) {
        const isFromBb = w.fromPin.compId === 'breadboard' || w.fromPin.compId.startsWith('breadboard');
        const isToBb = w.toPin.compId === 'breadboard' || w.toPin.compId.startsWith('breadboard');
        if (isFromBb || isToBb) {
          const resolved = resolve3DWireToSchematicConnections(w, curWires3d, nextComps3d, components, runningWires);
          if (resolved.length > 0) {
            uncommittedWires3dCache.delete(w.id);
          }
          for (let idx = 0; idx < resolved.length; idx++) {
            const rw = resolved[idx];
            const resolvedId = `${w.id}_sch_${idx}`;
            const exists = runningWires.some(
              (sw) =>
                sw.id === resolvedId ||
                (sw.fromCompId === rw.fromCompId &&
                  sw.fromPinId === rw.fromPinId &&
                  sw.toCompId === rw.toCompId &&
                  sw.toPinId === rw.toPinId) ||
                (sw.fromCompId === rw.toCompId &&
                  sw.fromPinId === rw.toPinId &&
                  sw.toCompId === rw.fromCompId &&
                  sw.toPinId === rw.fromPinId)
            );
            if (!exists) {
              const newWire: CircuitWire = {
                id: resolvedId,
                fromCompId: rw.fromCompId,
                fromPinId: rw.fromPinId,
                toCompId: rw.toCompId,
                toPinId: rw.toPinId,
                color: rw.color,
                tappedWireId: rw.tappedWireId,
                junctionPoint: rw.junctionPoint,
              };
              runningWires.push(newWire);
              onAddWire(newWire);
            }
          }
        }
      }
    } else if (onUpdateComponent3DPosition) {
      onUpdateComponent3DPosition(c3d.id, c3d.x3d, c3d.y3d, c3d.z3d);
    }
  }, [activeComponents3d, activeWires3d, independentComponents, independentWires, components, wires, onAddWire, onUpdateComponent, onUpdateComponent3DPosition]);

  const handleMirrorSelected = useCallback(() => {
    if (!selectedCompId) return;
    const comp = components.find((c) => c.id === selectedCompId);
    const c3d = activeComponents3d.find((c) => c.id === selectedCompId);
    if (!comp || !c3d) return;
    const flipped = flipComponent3D(c3d);
    const nextMirrored = Boolean(flipped.parameters?.mirrored ?? !comp.mirrored);
    if (onUpdateComponent) {
      onUpdateComponent({
        ...comp,
        mirrored: nextMirrored,
        parameters: { ...comp.parameters, mirrored: nextMirrored, rotY: flipped.rotY },
      });
    }
    handleUpdateComponent3D(flipped);
    toast.info(`Flipped ${comp.label} 180° (Yaw: ${flipped.rotY}°)`);
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
    for (const [wId, cw] of Array.from(uncommittedWires3dCache.entries())) {
      if (cw.fromPin?.compId === id || cw.toPin?.compId === id) {
        uncommittedWires3dCache.delete(wId);
      }
    }
    onDeleteComponent(id);
    onSelectComponent(null);
    toast.info('Deleted 3D component and attached wires.');
  }, [activeComponents3d, activeWires3d, onDeleteComponent, onSelectComponent, record3DHistory]);

  // Add 3D Wire handler
  const handleAddWire3D = useCallback((w3d: Wire3D) => {
    const curWires3d = independentWires !== null ? independentWires : activeWires3d;
    const isDup = curWires3d.some(
      (w) =>
        (w.fromPin.compId === w3d.fromPin.compId &&
          w.fromPin.pinId === w3d.fromPin.pinId &&
          w.toPin.compId === w3d.toPin.compId &&
          w.toPin.pinId === w3d.toPin.pinId) ||
        (w.fromPin.compId === w3d.toPin.compId &&
          w.fromPin.pinId === w3d.toPin.pinId &&
          w.toPin.compId === w3d.fromPin.compId &&
          w.toPin.pinId === w3d.fromPin.pinId)
    );
    if (isDup) {
      toast.info('Wire already connected between these points.');
      return;
    }

    record3DHistory(activeComponents3d, activeWires3d);
    const nextWires3d = [...curWires3d, w3d];
    setIndependentWires(nextWires3d);

    // Route BOTH breadboard wires AND direct component-to-component 3D wires through resolve3DWireToSchematicConnections
    const resolved = resolve3DWireToSchematicConnections(
      w3d,
      nextWires3d,
      activeComponents3d,
      components,
      wires
    );

    if (resolved.length === 0) {
      uncommittedWires3dCache.set(w3d.id, w3d);
    } else {
      uncommittedWires3dCache.delete(w3d.id);
    }

    for (let idx = 0; idx < resolved.length; idx++) {
      const rw = resolved[idx];
      const resolvedId = `${w3d.id}_sch_${idx}`;
      onAddWire({
        id: resolvedId,
        fromCompId: rw.fromCompId,
        fromPinId: rw.fromPinId,
        toCompId: rw.toCompId,
        toPinId: rw.toPinId,
        color: rw.color,
        tappedWireId: rw.tappedWireId,
        junctionPoint: rw.junctionPoint,
      });
    }
    toast.success('Connected 3D Dupont jumper wire.');
  }, [activeComponents3d, activeWires3d, independentWires, components, wires, onAddWire, record3DHistory]);

  // Delete 3D wire handler
  const handleDeleteWire3D = useCallback((wireId: string) => {
    record3DHistory(activeComponents3d, activeWires3d);
    setIndependentWires((prev) => {
      const current = prev !== null ? prev : activeWires3d;
      return current.filter((w) => w.id !== wireId);
    });

    const idsToDelete = new Set<string>();
    if (wires.some((w) => w.id === wireId)) idsToDelete.add(wireId);
    wires.forEach((w) => {
      if (w.id.startsWith(`${wireId}_sch_`)) idsToDelete.add(w.id);
    });
    const mapped = generatedWireSourceMapRef.current.get(wireId);
    if (mapped) {
      mapped.forEach((id) => idsToDelete.add(id));
    }
    uncommittedWires3dCache.delete(wireId);

    if (onDeleteWire) {
      idsToDelete.forEach((id) => onDeleteWire(id));
    }
  }, [activeComponents3d, activeWires3d, wires, onDeleteWire, record3DHistory]);

  // Update 3D Wire handler (e.g. color change)
  const handleUpdateWire3D = useCallback((w3d: Wire3D) => {
    record3DHistory(activeComponents3d, activeWires3d);
    const nextWires3d = (independentWires !== null ? independentWires : activeWires3d).map((w) =>
      w.id === w3d.id ? w3d : w
    );
    setIndependentWires(nextWires3d);

    const deletedIds = new Set<string>();
    if (wires.some((w) => w.id === w3d.id)) deletedIds.add(w3d.id);
    wires.forEach((w) => {
      if (w.id.startsWith(`${w3d.id}_sch_`)) deletedIds.add(w.id);
    });
    const mapped = generatedWireSourceMapRef.current.get(w3d.id);
    if (mapped) {
      mapped.forEach((id) => deletedIds.add(id));
    }
    if (onDeleteWire) {
      deletedIds.forEach((id) => onDeleteWire(id));
    }

    const remainingSchematicWires = wires.filter((sw) => !deletedIds.has(sw.id));
    const resolved = resolve3DWireToSchematicConnections(
      w3d,
      nextWires3d,
      activeComponents3d,
      components,
      remainingSchematicWires
    );

    if (resolved.length === 0) {
      uncommittedWires3dCache.set(w3d.id, w3d);
    } else {
      uncommittedWires3dCache.delete(w3d.id);
    }

    for (let idx = 0; idx < resolved.length; idx++) {
      const rw = resolved[idx];
      const resolvedId = `${w3d.id}_sch_${idx}`;
      onAddWire({
        id: resolvedId,
        fromCompId: rw.fromCompId,
        fromPinId: rw.fromPinId,
        toCompId: rw.toCompId,
        toPinId: rw.toPinId,
        color: rw.color,
        tappedWireId: rw.tappedWireId,
        junctionPoint: rw.junctionPoint,
      });
    }
  }, [activeComponents3d, activeWires3d, independentWires, components, wires, onDeleteWire, onAddWire, record3DHistory]);

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
            title={hasBreadboard ? 'Click to expand / cycle solderless breadboards (1 -> 2 -> 3 -> 0)' : 'Click to Add 830-Point Breadboard to Workbench'}
          >
            <span>
              {breadboardCount === 0
                ? '+ Breadboard'
                : breadboardCount === 1
                ? '✓ 1 Board (+ Board 2)'
                : breadboardCount === 2
                ? '✓ 2 Boards (+ Board 3)'
                : '✓ 3 Boards (Reset)'}
            </span>
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

          {/* Active MCU USB Power Cable Toggle Button */}
          {(() => {
            const selectedComp = activeComponents3d.find((c) => c.id === selectedCompId);
            const isSelectedMcu = selectedComp && (
              selectedComp.type.startsWith('ARDUINO') ||
              selectedComp.type.startsWith('ESP32') ||
              selectedComp.type.startsWith('RASPBERRY_PI') ||
              selectedComp.type.startsWith('STM32') ||
              selectedComp.type.includes('MCU')
            );
            const targetMcu = isSelectedMcu
              ? selectedComp
              : activeComponents3d.find((c) =>
                  c.type.startsWith('ARDUINO') ||
                  c.type.startsWith('ESP32') ||
                  c.type.startsWith('RASPBERRY_PI') ||
                  c.type.startsWith('STM32') ||
                  c.type.includes('MCU')
                );
            if (!targetMcu) return null;
            const isConnected = targetMcu.parameters?.usbPlugged !== false;
            return (
              <div className="flex items-center gap-1 border-r border-slate-700/60 pr-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleMcuUsb(targetMcu.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 border rounded text-xs font-bold transition-all cursor-pointer ${
                    isConnected
                      ? 'bg-cyan-950/80 hover:bg-cyan-900 border-cyan-500/80 text-cyan-300 shadow-sm'
                      : 'bg-amber-950/90 hover:bg-amber-900 border-amber-400 text-amber-300 animate-pulse shadow-lg ring-1 ring-amber-400/50'
                  }`}
                  title={
                    isConnected
                      ? `Click to Unplug USB Cable from ${targetMcu.label} (Power drops to 0V)`
                      : `Click to Connect USB Cable to ${targetMcu.label} (5.0V Active)`
                  }
                >
                  <Usb className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">{isConnected ? 'USB (5V)' : 'Connect USB'}</span>
                  <span className="sm:hidden">{isConnected ? '5V' : 'USB'}</span>
                </button>
              </div>
            );
          })()}

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
          breadboardCount={breadboardCount}
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
