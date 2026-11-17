import { CircuitComponent, CircuitWire, PcbLayout, PcbPad, PcbTrack } from '../types';

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
    const tracks: PcbTrack[] = [];

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
      const normX = 10 + ((comp.x - minX) / spanX) * (boardWidthMm - 20);
      const normY = 10 + ((comp.y - minY) / spanY) * (boardHeightMm - 20);

      comp.pins.forEach((pin, idx) => {
        // Pin offset scaled to PCB footprint dimensions (~2.54mm pitch)
        const pinOffsetMmX = (pin.x / 20) * 2.54;
        const pinOffsetMmY = (pin.y / 20) * 2.54;
        const padX = Math.round((normX + pinOffsetMmX) * 10) / 10;
        const padY = Math.round((normY + pinOffsetMmY) * 10) / 10;

        const padId = `pad_${comp.id}_${pin.id}`;
        pads.push({
          id: padId,
          componentId: comp.id,
          pinId: pin.id,
          x: padX,
          y: padY,
          shape: idx === 0 ? 'rect' : 'round', // Pin 1 is square pad by standard
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });

        padLookup.set(`${comp.id}:${pin.id}`, { x: padX, y: padY });
      });
    });

    // Generate tracks between connected pads
    wires.forEach((wire, idx) => {
      const fromPos = padLookup.get(`${wire.fromCompId}:${wire.fromPinId}`);
      const toPos = padLookup.get(`${wire.toCompId}:${wire.toPinId}`);

      if (fromPos && toPos) {
        // Alternate between top and bottom copper layer to minimize track collisions
        const layer = idx % 2 === 0 ? 'top_copper' : 'bottom_copper';
        tracks.push({
          id: `trk_${wire.id}`,
          layer,
          from: { x: fromPos.x, y: fromPos.y },
          to: { x: toPos.x, y: toPos.y },
          widthMm: 0.35, // 0.35mm / 14 mil signal trace
        });
      }
    });

    // Run Design Rule Checks
    const drcErrors = this.runDrc(pads, tracks, boardWidthMm, boardHeightMm);

    return {
      widthMm: boardWidthMm,
      heightMm: boardHeightMm,
      boardThicknessMm: 1.6,
      copperLayers: 2,
      pads,
      tracks,
      drcErrors,
    };
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
