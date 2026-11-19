import { CircuitComponent, CircuitWire, PcbLayout, PcbPad, PcbTrack, PcbComponentPlacement } from '../types';
import { PcbAutoRouter } from './autorouter';

export class PcbGenerator {
  /**
   * Generates a default 2D PCB layout from schematic components and wires
   */
  public static generatePcbFromSchematic(
    components: CircuitComponent[],
    wires: CircuitWire[],
    boardWidthMm: number = 80,
    boardHeightMm: number = 60
  ): PcbLayout {
    const pads: PcbPad[] = [];
    const placedComponents: PcbComponentPlacement[] = [];

    // Scale schematic coordinates down to PCB millimeter space
    // Center of schematic maps to center of board
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    components.forEach((c) => {
      if (c.x < minX) minX = c.x;
      if (c.x > maxX) maxX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.y > maxY) maxY = c.y;
    });

    const spanX = Math.max(maxX - minX, 100);
    const spanY = Math.max(maxY - minY, 100);

    const padLookup: Map<string, { x: number; y: number }> = new Map();

    components.forEach((comp) => {
      // Normalize to 10mm margin inside PCB board boundary
      const normX = Math.round((10 + ((comp.x - minX) / spanX) * (boardWidthMm - 20)) * 10) / 10;
      const normY = Math.round((10 + ((comp.y - minY) / spanY) * (boardHeightMm - 20)) * 10) / 10;

      placedComponents.push({
        componentId: comp.id,
        designator: comp.designator || comp.label,
        type: comp.type,
        label: comp.label,
        value: comp.value,
        footprint: comp.footprint,
        x: normX,
        y: normY,
        rotation: comp.rotation || 0,
        parameters: comp.parameters,
      });

      // Compute physical IPC-7351 footprint pads strictly aligned with package geometry
      const footprintPads = PcbGenerator.calculateFootprintPads(comp, normX, normY, comp.rotation || 0);
      footprintPads.forEach((pad) => {
        pads.push(pad);
        padLookup.set(`${comp.id}:${pad.pinId}`, { x: pad.x, y: pad.y });
      });
    });

    // Auto-route traces using pro 45-chamfered router
    const { tracks: routedTracks, vias } = PcbAutoRouter.route(
      pads,
      wires,
      boardWidthMm,
      boardHeightMm,
      { defaultSignalWidthMm: 0.35, powerTrackWidthMm: 0.8 },
      components
    );

    // If auto-router returned vias, add them to pads array
    if (vias.length > 0) {
      pads.push(...vias);
    }

    // Run Design Rule Checks
    const drcErrors = this.runDrc(pads, routedTracks, boardWidthMm, boardHeightMm);

    return {
      widthMm: boardWidthMm,
      heightMm: boardHeightMm,
      boardThicknessMm: 1.6,
      copperLayers: 2,
      pads,
      tracks: routedTracks,
      components: placedComponents,
      drcErrors,
    };
  }

  /**
   * Computes standard IPC-7351 physical footprint pads strictly matching real component packages
   * (DIP-8, DIP-14/16, Axial Resistors, Radial Caps, LEDs, Transistors, Terminals)
   */
  public static calculateFootprintPads(
    comp: CircuitComponent,
    normX: number,
    normY: number,
    rotationDeg: number = 0
  ): PcbPad[] {
    const pads: PcbPad[] = [];
    const upperType = comp.type.toUpperCase();
    const upperFootprint = (comp.footprint || '').toUpperCase();
    const rad = ((rotationDeg || 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const transformCoord = (ox: number, oy: number) => {
      const rx = ox * cos - oy * sin;
      const ry = ox * sin + oy * cos;
      return {
        x: Math.round((normX + rx) * 10) / 10,
        y: Math.round((normY + ry) * 10) / 10,
      };
    };

    // 1. DIP-8 ICs (NE555 Timer, LM358 Op-Amp, DIP-8 IC packages)
    if (
      upperType.includes('555') ||
      upperType.includes('TIMER') ||
      (upperType.includes('IC') && !upperFootprint.includes('DIP-14') && !upperFootprint.includes('DIP-16')) ||
      upperFootprint.includes('DIP-8') ||
      (comp.pins.length <= 8 && (upperType.includes('OPAMP') || upperType.includes('AMPLIFIER')))
    ) {
      // Standard DIP-8: 7.62mm row spacing (Y: +/- 3.81mm), 2.54mm pitch (X: -3.81, -1.27, +1.27, +3.81)
      const pinMap: Record<string, { ox: number; oy: number }> = {
        '1': { ox: -3.81, oy: -3.81 },
        '2': { ox: -1.27, oy: -3.81 },
        '3': { ox: 1.27, oy: -3.81 },
        '4': { ox: 3.81, oy: -3.81 },
        '5': { ox: 3.81, oy: 3.81 },
        '6': { ox: 1.27, oy: 3.81 },
        '7': { ox: -1.27, oy: 3.81 },
        '8': { ox: -3.81, oy: 3.81 },
      };

      const namedPinMap: Record<string, { ox: number; oy: number }> = {
        out: { ox: -3.81, oy: -3.81 },
        in_neg: { ox: -1.27, oy: -3.81 },
        in_pos: { ox: 1.27, oy: -3.81 },
        vee: { ox: 3.81, oy: -3.81 },
        gnd: { ox: 3.81, oy: -3.81 },
        vcc: { ox: -3.81, oy: 3.81 },
      };

      comp.pins.forEach((pin, idx) => {
        const offset = pinMap[pin.id] || namedPinMap[pin.id.toLowerCase()] || (
          idx < 4
            ? { ox: -3.81 + idx * 2.54, oy: -3.81 }
            : { ox: 3.81 - (idx - 4) * 2.54, oy: 3.81 }
        );
        const pt = transformCoord(offset.ox, offset.oy);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: pin.id === '1' || idx === 0 ? 'rect' : 'round',
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 2. DIP-14 or DIP-16
    if (upperFootprint.includes('DIP-14') || upperFootprint.includes('DIP-16')) {
      const pinCount = upperFootprint.includes('DIP-16') ? 16 : 14;
      const pinsPerSide = pinCount / 2;
      const startX = -((pinsPerSide - 1) * 2.54) / 2;

      comp.pins.forEach((pin, idx) => {
        let ox = 0;
        let oy = -3.81;
        if (idx < pinsPerSide) {
          ox = startX + idx * 2.54;
          oy = -3.81;
        } else {
          ox = -startX - (idx - pinsPerSide) * 2.54;
          oy = 3.81;
        }
        const pt = transformCoord(ox, oy);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: idx === 0 ? 'rect' : 'round',
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 3. Resistors / Potentiometers / LDRs
    if (upperType.includes('RESISTOR') || upperType.includes('POTENTIOMETER') || upperType.includes('LDR')) {
      if (comp.pins.length === 3) {
        const offsets = [
          { ox: -2.54, oy: 0 },
          { ox: 0, oy: 2.54 },
          { ox: 2.54, oy: 0 },
        ];
        comp.pins.forEach((pin, idx) => {
          const off = offsets[idx] || { ox: (idx - 1) * 2.54, oy: 0 };
          const pt = transformCoord(off.ox, off.oy);
          pads.push({
            id: `pad_${comp.id}_${pin.id}`,
            componentId: comp.id,
            pinId: pin.id,
            x: pt.x,
            y: pt.y,
            shape: idx === 0 ? 'rect' : 'round',
            diameterMm: 1.8,
            holeMm: 0.9,
            layer: 'all',
          });
        });
      } else {
        comp.pins.forEach((pin, idx) => {
          const ox = idx === 0 ? -3.81 : 3.81;
          const pt = transformCoord(ox, 0);
          pads.push({
            id: `pad_${comp.id}_${pin.id}`,
            componentId: comp.id,
            pinId: pin.id,
            x: pt.x,
            y: pt.y,
            shape: idx === 0 ? 'rect' : 'round',
            diameterMm: 1.8,
            holeMm: 0.9,
            layer: 'all',
          });
        });
      }
      return pads;
    }

    // 4. LEDs / Diodes
    if (upperType.includes('LED') || upperType.includes('DIODE')) {
      comp.pins.forEach((pin, idx) => {
        const ox = idx === 0 ? -1.27 : 1.27;
        const pt = transformCoord(ox, 0);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: idx === 0 ? 'rect' : 'round',
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 5. Capacitors
    if (upperType.includes('CAPACITOR')) {
      comp.pins.forEach((pin, idx) => {
        const ox = idx === 0 ? -1.27 : 1.27;
        const pt = transformCoord(ox, 0);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: idx === 0 ? 'rect' : 'round',
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 6. Batteries / Power Terminals
    if (
      upperType.includes('BATTERY') ||
      upperType.includes('VOLTAGE') ||
      upperType.includes('POWER') ||
      upperType.includes('TERMINAL')
    ) {
      comp.pins.forEach((pin, idx) => {
        const ox = idx === 0 ? -2.54 : 2.54;
        const pt = transformCoord(ox, 0);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: idx === 0 ? 'rect' : 'round',
          diameterMm: 2.2,
          holeMm: 1.2,
          layer: 'all',
        });
      });
      return pads;
    }

    // 7. Transistors
    if (upperType.includes('TRANSISTOR') || upperType.includes('BJT') || upperType.includes('MOSFET')) {
      comp.pins.forEach((pin, idx) => {
        const ox = idx === 0 ? -2.54 : idx === 1 ? 0 : 2.54;
        const pt = transformCoord(ox, 0);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: idx === 0 ? 'rect' : 'round',
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 8. Generic fallback
    comp.pins.forEach((pin, idx) => {
      let ox = 0;
      let oy = 0;
      if (comp.pins.length === 2) {
        ox = idx === 0 ? -2.54 : 2.54;
      } else {
        const half = Math.ceil(comp.pins.length / 2);
        if (idx < half) {
          ox = -((half - 1) * 2.54) / 2 + idx * 2.54;
          oy = -3.81;
        } else {
          ox = ((half - 1) * 2.54) / 2 - (idx - half) * 2.54;
          oy = 3.81;
        }
      }
      const pt = transformCoord(ox, oy);
      pads.push({
        id: `pad_${comp.id}_${pin.id}`,
        componentId: comp.id,
        pinId: pin.id,
        x: pt.x,
        y: pt.y,
        shape: idx === 0 ? 'rect' : 'round',
        diameterMm: 1.8,
        holeMm: 0.9,
        layer: 'all',
      });
    });

    return pads;
  }

  /**
   * Run automated Design Rule Check (DRC)
   */
  public static runDrc(
    pads: PcbPad[],
    tracks: PcbTrack[],
    boardWidthMm: number,
    boardHeightMm: number
  ): { id: string; message: string; severity: 'error' | 'warning' }[] {
    const errors: { id: string; message: string; severity: 'error' | 'warning' }[] = [];

    // 1. Boundary check: ensure no pads are off-board
    pads.forEach((pad) => {
      if (pad.x < 1.5 || pad.x > boardWidthMm - 1.5 || pad.y < 1.5 || pad.y > boardHeightMm - 1.5) {
        errors.push({
          id: `drc_bound_${pad.id}`,
          message: `Pad ${pad.pinId} on ${pad.componentId} is too close to the board edge (< 1.5mm).`,
          severity: 'warning',
        });
      }
    });

    // 2. Minimum Track Width Check
    tracks.forEach((track) => {
      if (track.widthMm < 0.2) {
        errors.push({
          id: `drc_width_${track.id}`,
          message: `Track ${track.id} width (${track.widthMm}mm) is below minimum fab capability (0.2mm).`,
          severity: 'error',
        });
      }
    });

    // 3. Track Clearance Check
    for (let i = 0; i < tracks.length; i++) {
      for (let j = i + 1; j < tracks.length; j++) {
        if (tracks[i].layer === tracks[j].layer) {
          const dist = Math.hypot(
            (tracks[i].from.x + tracks[i].to.x) / 2 - (tracks[j].from.x + tracks[j].to.x) / 2,
            (tracks[i].from.y + tracks[i].to.y) / 2 - (tracks[j].from.y + tracks[j].to.y) / 2
          );
          if (dist < 0.2) {
            errors.push({
              id: `drc_clear_${tracks[i].id}_${tracks[j].id}`,
              message: `Clearance between track ${tracks[i].id} and track ${tracks[j].id} is below 0.2mm.`,
              severity: 'warning',
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Generates a Bill of Materials (BOM) summary grouped by component type and value
   */
  public static generateBom(components: CircuitComponent[]): {
    componentType: string;
    value: string;
    footprint: string;
    quantity: number;
    designators: string[];
  }[] {
    const map = new Map<string, { componentType: string; value: string; footprint: string; quantity: number; designators: string[] }>();

    for (const comp of components) {
      const key = `${comp.type}__${comp.value}__${comp.footprint}`;
      const des = comp.designator || comp.label;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += 1;
        existing.designators.push(des);
      } else {
        map.set(key, {
          componentType: comp.type,
          value: comp.value,
          footprint: comp.footprint,
          quantity: 1,
          designators: [des],
        });
      }
    }

    return Array.from(map.values());
  }

  /**
   * Generates standard RS-274X Gerber Top Copper file content
   */
  public static exportGerberTopCopper(pcb: PcbLayout): string {
    const dateStr = new Date().toISOString();
    let gerber = `%TF.GenerationSoftware,EI-House-Universal-Engineering-Lab,1.0*%\n`;
    gerber += `%TF.CreationDate,${dateStr}*%\n`;
    gerber += `%FSLAX35Y35*%\n`;
    gerber += `%MOMM*%\n`;
    gerber += `%LPD*%\n`;
    gerber += `%ADD10C,0.350000*%\n`; // 0.35mm round aperture for signal tracks
    gerber += `%ADD11C,1.800000*%\n`; // 1.8mm round pad aperture
    gerber += `G04 Layer: Top Copper*\n`;
    gerber += `D10*\n`;

    // Write Top Copper Tracks
    pcb.tracks
      .filter((t) => t.layer === 'top_copper')
      .forEach((t) => {
        const x1 = Math.round(t.from.x * 100000);
        const y1 = Math.round(t.from.y * 100000);
        const x2 = Math.round(t.to.x * 100000);
        const y2 = Math.round(t.to.y * 100000);
        gerber += `X${x1}Y${y1}D02*\n`; // Move to start
        gerber += `X${x2}Y${y2}D01*\n`; // Interpolate to end
      });

    // Write Pads
    gerber += `D11*\n`;
    pcb.pads.forEach((p) => {
      const px = Math.round(p.x * 100000);
      const py = Math.round(p.y * 100000);
      gerber += `X${px}Y${py}D03*\n`; // Flash pad
    });

    gerber += `M02*\n`;
    return gerber;
  }

  /**
   * Generates standard RS-274X Gerber Bottom Copper (.gbl) file content
   */
  public static exportGerberBottomCopper(pcb: PcbLayout): string {
    const dateStr = new Date().toISOString();
    let gerber = `%TF.GenerationSoftware,EI-House-Universal-Engineering-Lab,1.0*%\n`;
    gerber += `%TF.CreationDate,${dateStr}*%\n`;
    gerber += `%FSLAX35Y35*%\n`;
    gerber += `%MOMM*%\n`;
    gerber += `%LPD*%\n`;
    gerber += `%ADD10C,0.350000*%\n`; // 0.35mm round aperture for signal tracks
    gerber += `%ADD11C,1.800000*%\n`; // 1.8mm round pad aperture
    gerber += `G04 Layer: Bottom Copper*\n`;
    gerber += `D10*\n`;

    // Write Bottom Copper Tracks
    pcb.tracks
      .filter((t) => t.layer === 'bottom_copper')
      .forEach((t) => {
        const x1 = Math.round(t.from.x * 100000);
        const y1 = Math.round(t.from.y * 100000);
        const x2 = Math.round(t.to.x * 100000);
        const y2 = Math.round(t.to.y * 100000);
        gerber += `X${x1}Y${y1}D02*\n`; // Move to start
        gerber += `X${x2}Y${y2}D01*\n`; // Interpolate to end
      });

    // Write Through-hole & Bottom Pads
    gerber += `D11*\n`;
    pcb.pads
      .filter((p) => p.layer === 'all' || p.layer === 'bottom')
      .forEach((p) => {
        const px = Math.round(p.x * 100000);
        const py = Math.round(p.y * 100000);
        gerber += `X${px}Y${py}D03*\n`; // Flash pad
      });

    gerber += `M02*\n`;
    return gerber;
  }

  /**
   * Generates standard Excellon NC Drill file format
   */
  public static exportExcellonDrill(pcb: PcbLayout): string {
    let drill = `M48\n`;
    drill += `METRIC,TZ\n`;
    drill += `FMAT,2\n`;
    drill += `T01C0.900\n`; // Tool 1: 0.9mm drill
    drill += `%\n`;
    drill += `G05\n`;
    drill += `G90\n`;
    drill += `T01\n`;

    pcb.pads.forEach((p) => {
      const x = (p.x).toFixed(3);
      const y = (p.y).toFixed(3);
      drill += `X${x}Y${y}\n`;
    });

    drill += `M30\n`;
    return drill;
  }
}
