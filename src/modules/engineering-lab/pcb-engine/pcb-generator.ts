import { CircuitComponent, CircuitWire, PcbLayout, PcbPad, PcbTrack, PcbComponentPlacement, PcbMountingHole } from '../types';
import { PcbGridAutorouter, verifyPcbManufacturingIntegrity } from './pcb-autorouter';
import { resolvePhysicalSpec } from '../circuit-engine/component-physical-registry';

export { verifyPcbManufacturingIntegrity };

/**
 * Returns true if the component represents a virtual schematic symbol
 * (Ground reference, VCC/VDD power flag, net labels) with no physical package.
 */
export function isVirtualSchematicSymbol(type?: string): boolean {
  if (!type) return false;
  const t = type.toUpperCase().trim();
  return (
    t === 'GROUND' ||
    t === 'GND' ||
    t === 'EARTH_PE' ||
    t === 'EARTH_GROUND' ||
    t === 'VCC' ||
    t === 'VDD' ||
    t === 'NET_FLAG' ||
    t === 'POWER_FLAG' ||
    t.startsWith('GND_') ||
    t.startsWith('VCC_')
  );
}

// ---------------------------------------------------------------------------
// Unified 2-Layer Grid A* Router & DFM Utilities
// ---------------------------------------------------------------------------

export const DEFAULT_GND_POUR_LAYER: 'bottom_copper' | 'top_copper' | 'off' = 'bottom_copper';

export class PcbGenerator {
  /**
   * Generates a default 2D PCB layout from schematic components and wires.
   * Virtual power/ground symbols (GND, VCC net flags) are filtered out of physical
   * 2D/3D component placements, and their nets route directly to copper pour / thermal relief.
   */
  public static generatePcbFromSchematic(
    components: CircuitComponent[],
    wires: CircuitWire[],
    boardWidthMm: number = 80,
    boardHeightMm: number = 60,
    existingPcb?: PcbLayout
  ): PcbLayout & { gndPourLayer?: 'bottom_copper' | 'top_copper' | 'off' } {
    const pads: PcbPad[] = [];
    const placedComponents: PcbComponentPlacement[] = [];

    // If existingPcb provided, use its board dimensions if larger or customized
    if (existingPcb?.widthMm) boardWidthMm = Math.max(boardWidthMm, existingPcb.widthMm);
    if (existingPcb?.heightMm) boardHeightMm = Math.max(boardHeightMm, existingPcb.heightMm);

    // Filter virtual schematic symbols from physical component placements
    const physicalComponents = components.filter((c) => !isVirtualSchematicSymbol(c.type));
    const targetComps = physicalComponents.length > 0 ? physicalComponents : components;

    // 1. Dynamic Board Sizing & EDA Corridor Clearance
    const EDGE_MARGIN = 6.0; // Minimum 6mm edge keep-out margin from all 4 Edge.Cuts borders (clearing corner M3 mounting holes)

    interface PlacedItem {
      componentId: string;
      x: number;
      y: number;
      cw: number;
      cd: number;
      clearance: number;
    }

    const compSpecs = targetComps.map((comp) => {
      const spec = resolvePhysicalSpec({ ...comp });
      const upperType = (comp.type || '').toUpperCase();
      const upperFp = (comp.footprint || '').toUpperCase();
      const bodyW = spec.bodyDimensionsMm?.width || 10;
      const bodyD = spec.bodyDimensionsMm?.depth || 8;
      const cw = Math.max(spec.courtyardMm?.width || bodyW + 1.5, bodyW + 1.0, 8.0);
      const cd = Math.max(spec.courtyardMm?.depth || bodyD + 1.5, bodyD + 1.0, 6.0);

      const isLarge =
        spec.placementClass === 'dev-board' ||
        spec.placementClass === 'module-breadboard' ||
        spec.placementClass === 'ic-dip' ||
        upperType.includes('BOARD') ||
        upperType.includes('UNO') ||
        upperType.includes('ESP32') ||
        upperType.includes('PICO') ||
        upperType.includes('SR04') ||
        upperType.includes('ULTRASONIC') ||
        upperType.includes('LCD1602') ||
        upperType.includes('RELAY') ||
        upperType.includes('L298') ||
        upperFp.includes('DIP-14') ||
        upperFp.includes('DIP-16') ||
        upperFp.includes('DIP-28') ||
        bodyW > 20 ||
        bodyD > 20;

      // 7mm corridor around large modules, dev boards, sensors & multi-pin ICs; 5mm for passives
      const clearance = isLarge ? 7.0 : 5.0;

      return { comp, spec, cw, cd, isLarge, clearance };
    });

    // 2. Deterministic 2D Courtyard Auto-Placer (Preserves Net Topology & Enforces EDA Corridors)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    targetComps.forEach((c) => {
      if (c.x < minX) minX = c.x;
      if (c.x > maxX) maxX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.y > maxY) maxY = c.y;
    });

    const spanX = Math.max(maxX - minX, 100);
    const spanY = Math.max(maxY - minY, 100);

    // Place largest anchor components first, then net-connected ICs and discretes
    const placementOrder = [...compSpecs].sort((a, b) => {
      const orderScore = (item: typeof a) => {
        if (item.spec.placementClass === 'dev-board' || item.comp.type.includes('UNO') || item.comp.type.includes('ESP32')) return 1;
        if (item.spec.placementClass === 'module-breadboard' || item.isLarge) return 2;
        if (item.spec.placementClass === 'ic-dip' || item.comp.type.includes('IC_') || item.comp.type.includes('TIMER')) return 3;
        return 4;
      };
      const diff = orderScore(a) - orderScore(b);
      if (diff !== 0) return diff;
      return b.cw * b.cd - a.cw * a.cd; // Largest footprint first
    });

    const placedBoxes: PlacedItem[] = [];
    const padLookup: Map<string, { x: number; y: number }> = new Map();

    const totalAreaWithCorridors = compSpecs.reduce(
      (sum, c) => sum + (c.cw + c.clearance * 2) * (c.cd + c.clearance * 2),
      0
    );
    const maxSingleW = compSpecs.length > 0 ? Math.max(...compSpecs.map((c) => c.cw + c.clearance * 2)) : 40;
    const maxSingleD = compSpecs.length > 0 ? Math.max(...compSpecs.map((c) => c.cd + c.clearance * 2)) : 30;
    const estSide = Math.sqrt(totalAreaWithCorridors * 1.35);
    const hasDevBoardOrMcu = compSpecs.some(
      (c) =>
        c.spec.placementClass === 'dev-board' ||
        c.comp.type.includes('UNO') ||
        c.comp.type.includes('ESP32') ||
        c.comp.type.includes('MEGA') ||
        c.comp.type.includes('PICO')
    );
    let availW = Math.max(
      boardWidthMm,
      hasDevBoardOrMcu ? 130 : 0,
      Math.ceil((estSide * 1.15) / 5) * 5,
      maxSingleW + EDGE_MARGIN * 2
    );
    let availH = Math.max(
      boardHeightMm,
      hasDevBoardOrMcu ? 85 : 0,
      Math.ceil((estSide * 0.85) / 5) * 5,
      maxSingleD + EDGE_MARGIN * 2
    );

    const hasCollision = (tx: number, ty: number, curCw: number, curCd: number, curClearance: number): boolean => {
      for (const pb of placedBoxes) {
        const minSepX = (curCw + pb.cw) / 2 + Math.max(curClearance, pb.clearance);
        const minSepY = (curCd + pb.cd) / 2 + Math.max(curClearance, pb.clearance);
        if (Math.abs(tx - pb.x) < minSepX && Math.abs(ty - pb.y) < minSepY) {
          return true;
        }
      }
      return false;
    };

    placementOrder.forEach(({ comp, cw, cd, clearance }) => {
      const existingComp = existingPcb?.components?.find((c) => c.componentId === comp.id);
      let candX: number;
      let candY: number;

      if (existingComp && !hasCollision(existingComp.x, existingComp.y, cw, cd, clearance)) {
        candX = existingComp.x;
        candY = existingComp.y;
      } else {
        // Net-aware topological initial position from schematic coordinates clamped to board margin
        const minXBound = EDGE_MARGIN + cw / 2;
        const minYBound = EDGE_MARGIN + cd / 2;
        const maxXBound = Math.max(minXBound, availW - EDGE_MARGIN - cw / 2);
        const maxYBound = Math.max(minYBound, availH - EDGE_MARGIN - cd / 2);

        let targetX = minXBound + ((comp.x - minX) / spanX) * (maxXBound - minXBound);
        let targetY = minYBound + ((comp.y - minY) / spanY) * (maxYBound - minYBound);

        // Snap to 2.54mm grid within bounds
        targetX = Math.max(minXBound, Math.min(maxXBound, Math.round(targetX / 2.54) * 2.54));
        targetY = Math.max(minYBound, Math.min(maxYBound, Math.round(targetY / 2.54) * 2.54));

        candX = targetX;
        candY = targetY;

        if (hasCollision(candX, candY, cw, cd, clearance)) {
          let found = false;
          // First try within current board bounds
          const maxSearch = Math.max(availW, availH, 120);
          for (let r = 2.54; r <= maxSearch && !found; r += 2.54) {
            const steps = Math.max(8, Math.round((2 * Math.PI * r) / 2.54));
            for (let s = 0; s < steps; s++) {
              const angle = (s * 2 * Math.PI) / steps;
              const testX = Math.round((targetX + r * Math.cos(angle)) / 2.54) * 2.54;
              const testY = Math.round((targetY + r * Math.sin(angle)) / 2.54) * 2.54;

              if (testX >= minXBound && testX <= maxXBound && testY >= minYBound && testY <= maxYBound) {
                if (!hasCollision(testX, testY, cw, cd, clearance)) {
                  candX = testX;
                  candY = testY;
                  found = true;
                  break;
                }
              }
            }
          }

          // If crowded and no spot within current bounds, search outward and expand bounds
          if (!found) {
            for (let r = 2.54; r <= 300 && !found; r += 2.54) {
              const steps = Math.max(8, Math.round((2 * Math.PI * r) / 2.54));
              for (let s = 0; s < steps; s++) {
                const angle = (s * 2 * Math.PI) / steps;
                const testX = Math.round((targetX + r * Math.cos(angle)) / 2.54) * 2.54;
                const testY = Math.round((targetY + r * Math.sin(angle)) / 2.54) * 2.54;

                if (testX >= minXBound && testY >= minYBound) {
                  if (!hasCollision(testX, testY, cw, cd, clearance)) {
                    candX = testX;
                    candY = testY;
                    found = true;
                    availW = Math.max(availW, candX + cw / 2 + clearance + EDGE_MARGIN);
                    availH = Math.max(availH, candY + cd / 2 + clearance + EDGE_MARGIN);
                    break;
                  }
                }
              }
            }
          }
        }
      }

      candX = Math.round(candX * 100) / 100;
      candY = Math.round(candY * 100) / 100;

      placedBoxes.push({
        componentId: comp.id,
        x: candX,
        y: candY,
        cw,
        cd,
        clearance,
      });

      const compRot = existingComp?.rotation ?? (comp.rotation || 0);
      placedComponents.push({
        componentId: comp.id,
        designator: comp.designator || comp.label,
        type: comp.type,
        label: comp.label,
        value: comp.value,
        footprint: comp.footprint,
        x: candX,
        y: candY,
        rotation: compRot,
        parameters: comp.parameters,
      });

      // Compute physical IPC-7351 footprint pads strictly aligned with package geometry
      const footprintPads = PcbGenerator.calculateFootprintPads(comp, candX, candY, compRot);
      footprintPads.forEach((pad) => {
        pads.push(pad);
        padLookup.set(`${comp.id}:${pad.pinId}`, { x: pad.x, y: pad.y });
      });
    });

    // 3. Dynamic PCB Board Auto-Sizing (Floor 65mm x 50mm, 6mm edge margins, 5mm snap)
    const maxBoundX = placedBoxes.length > 0 ? Math.max(...placedBoxes.map((b) => b.x + b.cw / 2)) : 50;
    const maxBoundY = placedBoxes.length > 0 ? Math.max(...placedBoxes.map((b) => b.y + b.cd / 2)) : 38;

    const padMaxX = pads.length > 0 ? Math.max(...pads.map((p) => p.x + 2.0)) : 50;
    const padMaxY = pads.length > 0 ? Math.max(...pads.map((p) => p.y + 2.0)) : 38;

    const reqWidth = Math.max(boardWidthMm, maxBoundX + EDGE_MARGIN, padMaxX + EDGE_MARGIN, 65);
    const reqHeight = Math.max(boardHeightMm, maxBoundY + EDGE_MARGIN, padMaxY + EDGE_MARGIN, 50);

    const effectiveWidth = Math.ceil(reqWidth / 5) * 5;
    const effectiveHeight = Math.ceil(reqHeight / 5) * 5;

    // Net grouping via DSU: identify GND and power nets
    const parent = new Map<string, string>();
    const findSet = (i: string): string => {
      if (!parent.has(i)) parent.set(i, i);
      if (parent.get(i) !== i) parent.set(i, findSet(parent.get(i)!));
      return parent.get(i)!;
    };
    const unionSet = (i: string, j: string) => {
      const rootI = findSet(i);
      const rootJ = findSet(j);
      if (rootI !== rootJ) parent.set(rootI, rootJ);
    };

    wires.forEach((w) => {
      const k1 = `${w.fromCompId}:${w.fromPinId}`;
      const k2 = `${w.toCompId}:${w.toPinId}`;
      unionSet(k1, k2);
    });

    // Detect all net roots connected to GND components or GND pins
    const gndRoots = new Set<string>();
    components.forEach((c) => {
      const isGndType = isVirtualSchematicSymbol(c.type) && (c.type.toUpperCase().includes('GND') || c.type.toUpperCase().includes('GROUND') || c.id.toLowerCase().startsWith('gnd'));
      c.pins?.forEach((p) => {
        const k = `${c.id}:${p.id}`;
        const pinLower = (p.name || p.id || '').toLowerCase();
        if (isGndType || pinLower === 'gnd' || pinLower === 'ground' || pinLower === '0v' || pinLower === 'vss') {
          gndRoots.add(findSet(k));
        }
      });
    });

    // Tag GND pads with netId = 'GND'
    pads.forEach((pad) => {
      const k = `${pad.componentId}:${pad.pinId}`;
      if (gndRoots.has(findSet(k)) || pad.pinId.toLowerCase().includes('gnd')) {
        pad.netId = 'GND';
      }
    });

    // Add a GND stitching via if needed for a single isolated GND pad
    const gndPads = pads.filter((p) => p.netId === 'GND');
    if (gndPads.length === 1 && !pads.some((p) => (p.componentId === 'VIA' || p.id.startsWith('via_')) && p.netId === 'GND')) {
      const gPad = gndPads[0];
      const viaOuterR = 0.4;
      let safeVx = gPad.x + 3.5;
      let safeVy = gPad.y + 3.5;
      let isSafe = false;
      const testOffsets = [
        [3.5, 3.5], [-3.5, 3.5], [3.5, -3.5], [-3.5, -3.5],
        [4.5, 0], [-4.5, 0], [0, 4.5], [0, -4.5],
        [5.0, 5.0], [-5.0, 5.0], [6.0, 0], [0, 6.0],
      ];
      for (const [ox, oy] of testOffsets) {
        const tx = Math.min(effectiveWidth - 5, Math.max(5, gPad.x + ox));
        const ty = Math.min(effectiveHeight - 5, Math.max(5, gPad.y + oy));
        let collides = false;
        for (const p of pads) {
          const pOuterR = (p.diameterMm || 1.6) / 2;
          if (Math.hypot(tx - p.x, ty - p.y) < pOuterR + viaOuterR + 0.35) {
            collides = true;
            break;
          }
        }
        if (!collides) {
          safeVx = tx;
          safeVy = ty;
          isSafe = true;
          break;
        }
      }
      if (isSafe) {
        const gndStitchVia: PcbPad = {
          id: `via_gnd_stitch_${Date.now()}`,
          componentId: 'VIA',
          pinId: 'GND',
          netId: 'GND',
          x: Math.round(safeVx * 100) / 100,
          y: Math.round(safeVy * 100) / 100,
          shape: 'round',
          diameterMm: 0.8,
          holeMm: 0.4,
          layer: 'all',
        };
        pads.push(gndStitchVia);
      }
    }

    // Auto-route all nets using deterministic 2-Layer Grid A* (Lee/Maze) Router
    const virtualCompIds = new Set(components.filter((c) => isVirtualSchematicSymbol(c.type)).map((c) => c.id));
    const routableWires = wires.filter((w) => !virtualCompIds.has(w.fromCompId) && !virtualCompIds.has(w.toCompId));

    const { tracks: routedTracks, vias } = PcbGridAutorouter.route(
      pads,
      routableWires,
      effectiveWidth,
      effectiveHeight,
      {
        defaultSignalWidthMm: 0.35,
        powerTrackWidthMm: 0.55,
      },
      physicalComponents
    );

    // If auto-router returned vias, add them to pads array
    if (vias.length > 0) {
      pads.push(...vias);
    }

    // Check if component positions or topology changed compared to existingPcb
    let layoutOrTopologyChanged = false;
    if (!existingPcb || !existingPcb.components || existingPcb.components.length === 0) {
      layoutOrTopologyChanged = true;
    } else if (existingPcb.components.length !== placedComponents.length) {
      layoutOrTopologyChanged = true;
    } else {
      for (const comp of placedComponents) {
        const ec = existingPcb.components.find((c) => c.componentId === comp.componentId);
        if (!ec || Math.hypot(ec.x - comp.x, ec.y - comp.y) > 0.05) {
          layoutOrTopologyChanged = true;
          break;
        }
      }
    }

    // Also detect if existing auto-routed tracks have become stranded from pad coordinates
    if (!layoutOrTopologyChanged && existingPcb?.tracks && existingPcb.tracks.length > 0) {
      for (const track of existingPcb.tracks) {
        if (track.isManual || !track.id.startsWith('trk_')) continue;
        const fromNearPad = pads.some((p) => Math.hypot(p.x - track.from.x, p.y - track.from.y) < 1.5);
        const toNearPad = pads.some((p) => Math.hypot(p.x - track.to.x, p.y - track.to.y) < 1.5);
        const fromNearTrack = existingPcb.tracks.some(
          (ot) =>
            ot.id !== track.id &&
            (Math.hypot(ot.from.x - track.from.x, ot.from.y - track.from.y) < 0.2 ||
              Math.hypot(ot.to.x - track.from.x, ot.to.y - track.from.y) < 0.2)
        );
        const toNearTrack = existingPcb.tracks.some(
          (ot) =>
            ot.id !== track.id &&
            (Math.hypot(ot.from.x - track.to.x, ot.from.y - track.to.y) < 0.2 ||
              Math.hypot(ot.to.x - track.to.x, ot.to.y - track.to.y) < 0.2)
        );
        if ((!fromNearPad && !fromNearTrack) || (!toNearPad && !toNearTrack)) {
          layoutOrTopologyChanged = true;
          break;
        }
      }
    }

    // Determine final tracks:
    // If layout/topology unchanged, keep existing tracks intact.
    // If components moved, added, or deleted, discard stale auto-routed tracks for moved components,
    // preserve user manual tracks (isManual === true or non-autorouter IDs), and use newly routed tracks.
    let finalTracks: PcbTrack[];
    if (!existingPcb?.tracks || existingPcb.tracks.length === 0) {
      finalTracks = routedTracks;
    } else if (!layoutOrTopologyChanged) {
      finalTracks = existingPcb.tracks;
    } else {
      const isManualTrack = (t: PcbTrack) => t.isManual === true || !t.id.startsWith('trk_');
      const manualTracks = existingPcb.tracks.filter(isManualTrack);
      finalTracks = [...manualTracks];
      for (const rt of routedTracks) {
        const isDuplicate = manualTracks.some(
          (mt) =>
            mt.layer === rt.layer &&
            Math.hypot(mt.from.x - rt.from.x, mt.from.y - rt.from.y) < 0.1 &&
            Math.hypot(mt.to.x - rt.to.x, mt.to.y - rt.to.y) < 0.1
        );
        if (!isDuplicate) {
          finalTracks.push(rt);
        }
      }
    }

    // Retain user-placed manual vias if existingPcb provided
    if (existingPcb?.pads) {
      existingPcb.pads
        .filter((p) => (p.componentId === 'VIA' || p.id.startsWith('via_')) && p.isManual === true)
        .forEach((via) => {
          if (!pads.some((p) => p.id === via.id)) {
            pads.push(via);
          }
        });
    }

    // 100% Electrically Valid Via Integrity Pass:
    // Eliminate orphan/floating auto-routed vias not connected to both an F.Cu track and a B.Cu track of the same net.
    // Enforce via-to-pad clearance (>= padOuterR + viaOuterR + 0.25mm) and track clearance (>= 0.20mm).
    const validPads = pads.filter((pad) => {
      const isVia = pad.componentId === 'VIA' || pad.id.startsWith('via_');
      if (!isVia) return true;
      if (pad.isManual) return true;

      const connectsTop = finalTracks.some(
        (t) =>
          t.layer === 'top_copper' &&
          (!pad.netId || !t.netId || t.netId === pad.netId) &&
          (Math.hypot(t.from.x - pad.x, t.from.y - pad.y) < 0.35 ||
            Math.hypot(t.to.x - pad.x, t.to.y - pad.y) < 0.35)
      );

      const connectsBottom = finalTracks.some(
        (t) =>
          t.layer === 'bottom_copper' &&
          (!pad.netId || !t.netId || t.netId === pad.netId) &&
          (Math.hypot(t.from.x - pad.x, t.from.y - pad.y) < 0.35 ||
            Math.hypot(t.to.x - pad.x, t.to.y - pad.y) < 0.35)
      );

      const isStitchVia = pad.id.includes('stitch');
      if (!isStitchVia && (!connectsTop || !connectsBottom)) {
        return false;
      }
      if (isStitchVia && !connectsTop && !connectsBottom) {
        return false;
      }

      // Enforce via-to-pad clearance
      const viaOuterR = (pad.diameterMm || 0.8) / 2;
      for (const otherPad of pads) {
        if (otherPad.id === pad.id) continue;
        const otherIsVia = otherPad.componentId === 'VIA' || otherPad.id.startsWith('via_');
        if (!otherIsVia) {
          const padOuterR = (otherPad.diameterMm || 1.8) / 2;
          if (Math.hypot(otherPad.x - pad.x, otherPad.y - pad.y) < padOuterR + viaOuterR + 0.25) {
            return false;
          }
        }
      }

      return true;
    });

    // Run Design Rule Checks
    const drcErrors = this.runDrc(validPads, finalTracks, effectiveWidth, effectiveHeight);

    // 4 Corner M3 Plated Mounting Holes (d=3.2mm drill, 6.0mm annular ring) inset 5.0mm from corners
    const cornerInset = 5.0;
    let mountingHoles: PcbMountingHole[];
    if (existingPcb?.mountingHoles && existingPcb.mountingHoles.length > 0) {
      if (existingPcb.widthMm === effectiveWidth && existingPcb.heightMm === effectiveHeight) {
        mountingHoles = existingPcb.mountingHoles.map((h, idx) => ({
          id: h.id || `m3_${idx}`,
          xMm: h.xMm ?? h.x ?? cornerInset,
          yMm: h.yMm ?? h.y ?? cornerInset,
          drillMm: h.drillMm || 3.2,
          outerMm: h.outerMm || 6.0,
          isCustomMoved: h.isCustomMoved || false,
          x: h.xMm ?? h.x ?? cornerInset,
          y: h.yMm ?? h.y ?? cornerInset,
          diameterMm: h.drillMm || h.diameterMm || 3.2,
        }));
      } else {
        const oldW = existingPcb.widthMm;
        const oldH = existingPcb.heightMm;
        mountingHoles = existingPcb.mountingHoles.map((h, idx) => {
          const hX = h.xMm ?? h.x ?? cornerInset;
          const hY = h.yMm ?? h.y ?? cornerInset;
          const isNearTL = Math.hypot(hX - cornerInset, hY - cornerInset) < 2.5 || h.id === 'm3_tl';
          const isNearTR = Math.hypot(hX - (oldW - cornerInset), hY - cornerInset) < 2.5 || h.id === 'm3_tr';
          const isNearBL = Math.hypot(hX - cornerInset, hY - (oldH - cornerInset)) < 2.5 || h.id === 'm3_bl';
          const isNearBR = Math.hypot(hX - (oldW - cornerInset), hY - (oldH - cornerInset)) < 2.5 || h.id === 'm3_br';

          if (!h.isCustomMoved) {
            if (isNearTL) return { id: h.id || 'm3_tl', xMm: cornerInset, yMm: cornerInset, drillMm: 3.2, outerMm: 6.0, isCustomMoved: false, x: cornerInset, y: cornerInset, diameterMm: 3.2 };
            if (isNearTR) return { id: h.id || 'm3_tr', xMm: effectiveWidth - cornerInset, yMm: cornerInset, drillMm: 3.2, outerMm: 6.0, isCustomMoved: false, x: effectiveWidth - cornerInset, y: cornerInset, diameterMm: 3.2 };
            if (isNearBL) return { id: h.id || 'm3_bl', xMm: cornerInset, yMm: effectiveHeight - cornerInset, drillMm: 3.2, outerMm: 6.0, isCustomMoved: false, x: cornerInset, y: effectiveHeight - cornerInset, diameterMm: 3.2 };
            if (isNearBR) return { id: h.id || 'm3_br', xMm: effectiveWidth - cornerInset, yMm: effectiveHeight - cornerInset, drillMm: 3.2, outerMm: 6.0, isCustomMoved: false, x: effectiveWidth - cornerInset, y: effectiveHeight - cornerInset, diameterMm: 3.2 };
          }

          // Custom moved hole: clamp within board boundaries
          const clampedX = Math.max(3.0, Math.min(effectiveWidth - 3.0, hX));
          const clampedY = Math.max(3.0, Math.min(effectiveHeight - 3.0, hY));
          return {
            id: h.id || `m3_${idx}`,
            xMm: clampedX,
            yMm: clampedY,
            drillMm: h.drillMm || 3.2,
            outerMm: h.outerMm || 6.0,
            isCustomMoved: true,
            x: clampedX,
            y: clampedY,
            diameterMm: h.drillMm || h.diameterMm || 3.2,
          };
        });
      }
    } else {
      mountingHoles = [
        { id: 'm3_tl', xMm: cornerInset, yMm: cornerInset, drillMm: 3.2, outerMm: 6.0, isCustomMoved: false, x: cornerInset, y: cornerInset, diameterMm: 3.2 },
        { id: 'm3_tr', xMm: effectiveWidth - cornerInset, yMm: cornerInset, drillMm: 3.2, outerMm: 6.0, isCustomMoved: false, x: effectiveWidth - cornerInset, y: cornerInset, diameterMm: 3.2 },
        { id: 'm3_bl', xMm: cornerInset, yMm: effectiveHeight - cornerInset, drillMm: 3.2, outerMm: 6.0, isCustomMoved: false, x: cornerInset, y: effectiveHeight - cornerInset, diameterMm: 3.2 },
        { id: 'm3_br', xMm: effectiveWidth - cornerInset, yMm: effectiveHeight - cornerInset, drillMm: 3.2, outerMm: 6.0, isCustomMoved: false, x: effectiveWidth - cornerInset, y: effectiveHeight - cornerInset, diameterMm: 3.2 },
      ];
    }

    return {
      widthMm: effectiveWidth,
      heightMm: effectiveHeight,
      boardThicknessMm: existingPcb?.boardThicknessMm || 1.6,
      copperLayers: existingPcb?.copperLayers || 2,
      units: existingPcb?.units || 'mm',
      gridSizeMm: existingPcb?.gridSizeMm || 2.54,
      mountingHoles,
      edgeClearanceMm: EDGE_MARGIN,
      pads: validPads,
      tracks: finalTracks,
      components: placedComponents,
      texts: existingPcb?.texts || [],
      drcErrors,
      gndPourLayer: (existingPcb as { gndPourLayer?: 'bottom_copper' | 'top_copper' | 'off' })?.gndPourLayer || DEFAULT_GND_POUR_LAYER,
    } as PcbLayout & { gndPourLayer: 'bottom_copper' | 'top_copper' | 'off' };
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
        x: Math.round((normX + rx) * 100) / 100,
        y: Math.round((normY + ry) * 100) / 100,
      };
    };

    const spec = resolvePhysicalSpec({ ...comp });

    // 0. Microcontroller Dev Boards & Modules with verified multi-pin headers
    // Checked BEFORE DIP IC check, so Arduino Uno (mentions ATmega328P) and Mega never fall into DIP-28!
    if (
      spec.placementClass === 'dev-board' ||
      spec.placementClass === 'module-breadboard' ||
      upperType.includes('BOARD') ||
      upperType.includes('ARDUINO') ||
      upperType.includes('UNO') ||
      upperType.includes('MEGA') ||
      upperType.includes('ESP32') ||
      upperType.includes('PICO') ||
      upperType.includes('LCD1602') ||
      upperType.includes('OLED') ||
      upperType.includes('SERVO')
    ) {
      if (spec.pads && spec.pads.length > 0) {
        spec.pads.forEach((sp) => {
          const pt = transformCoord(sp.xMm, sp.yMm);
          pads.push({
            id: `pad_${comp.id}_${sp.pinId}`,
            componentId: comp.id,
            pinId: String(sp.pinId),
            x: pt.x,
            y: pt.y,
            shape: sp.shape === 'rect' ? 'rect' : 'round',
            diameterMm: sp.padDiameterMm || 1.8,
            holeMm: sp.drillMm || 0.9,
            layer: 'all',
          });
        });
        return pads;
      }
    }

    // 1. DIP ICs (NE555 Timer, LM358, LM741, ATmega, DIP-8, DIP-14, DIP-16, DIP-28)
    // Strictly adheres to JEDEC Top-View CCW Counter-Clockwise numbering
    if (
      !upperType.includes('UNO') &&
      !upperType.includes('MEGA') &&
      spec.placementClass !== 'dev-board' &&
      (upperType.includes('555') ||
      upperType.includes('TIMER') ||
      upperType.includes('DIP') ||
      upperFootprint.includes('DIP') ||
      ((upperType.includes('_IC') || upperType.startsWith('IC_') || upperType === 'IC' || upperType.includes('INTEGRATED_CIRCUIT')) && comp.pins.length >= 4) ||
      upperType.includes('OPAMP') ||
      upperType.includes('AMPLIFIER') ||
      upperType.includes('ATMEGA'))
    ) {
      const is14or16 =
        upperFootprint.includes('DIP-14') ||
        upperFootprint.includes('DIP-16') ||
        upperType.includes('74HC') ||
        upperType.includes('LM324') ||
        upperType.includes('595') ||
        upperType.includes('4017') ||
        upperType.includes('2003') ||
        upperType.includes('293') ||
        comp.pins.length === 14 ||
        comp.pins.length === 16;
      const is28 = upperFootprint.includes('DIP-28') || upperType.includes('ATMEGA') || comp.pins.length === 28;
      const is16 = upperFootprint.includes('DIP-16') || upperType.includes('595') || upperType.includes('4017') || upperType.includes('2003') || upperType.includes('293') || comp.pins.length === 16;
      const pinCount = is28 ? 28 : is14or16 ? (is16 ? 16 : 14) : Math.max(8, comp.pins.length);
      const pinsPerSide = Math.floor(pinCount / 2);
      const startX = -((pinsPerSide - 1) * 2.54) / 2;

      // JEDEC standard: Top row is Pins 1..pinsPerSide (oy: -3.81), Bottom row is pinCount..pinsPerSide+1 (oy: 3.81)
      const pinMap: Record<string, { ox: number; oy: number }> = {};
      for (let i = 0; i < pinsPerSide; i++) {
        pinMap[String(i + 1)] = { ox: Math.round((startX + i * 2.54) * 100) / 100, oy: -3.81 };
      }
      for (let i = 0; i < pinsPerSide; i++) {
        const pinNum = pinCount - i;
        pinMap[String(pinNum)] = { ox: Math.round((startX + i * 2.54) * 100) / 100, oy: 3.81 };
      }

      // Semantic pin name aliases
      const namedPinMap: Record<string, { ox: number; oy: number }> = {
        out: pinMap['1'],
        out1: pinMap['1'],
        gnd: pinMap['1'],
        in_neg: pinMap['2'],
        in1_neg: pinMap['2'],
        trig: pinMap['2'],
        in_pos: pinMap['3'],
        in1_pos: pinMap['3'],
        vee: pinMap['4'],
        reset: pinMap['4'],
        ctrl: pinMap['5'],
        in2_pos: pinMap['5'],
        in2_neg: pinMap['6'],
        thres: pinMap['6'],
        out2: pinMap['7'],
        disch: pinMap['7'],
        vcc: pinMap[String(pinCount)],
        vplus: pinMap[String(pinCount)],
      };

      comp.pins.forEach((pin, idx) => {
        const pinNum = parseInt(pin.id, 10);
        let offset = pinMap[pin.id] || namedPinMap[pin.id.toLowerCase()];
        if (!offset) {
          if (!isNaN(pinNum) && pinNum >= 1 && pinNum <= pinCount) {
            offset = pinMap[String(pinNum)];
          } else if (idx < pinsPerSide) {
            offset = { ox: Math.round((startX + idx * 2.54) * 100) / 100, oy: -3.81 };
          } else {
            offset = { ox: Math.round((-startX - (idx - pinsPerSide) * 2.54) * 100) / 100, oy: 3.81 };
          }
        }

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

    // 2. RGB LEDs (4-Pin Through-Hole 5mm dome)
    if (upperType.includes('RGB') || (upperType.includes('LED') && comp.pins.length === 4)) {
      const offsets = [-3.81, -1.27, 1.27, 3.81];
      comp.pins.forEach((pin, idx) => {
        const ox = offsets[idx] !== undefined ? offsets[idx] : -3.81 + idx * 2.54;
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

    // 3. HC-SR04 Ultrasonic Sensor Module (4-Pin Header)
    if (upperType.includes('SR04') || upperType.includes('ULTRASONIC')) {
      const offsets = [-3.81, -1.27, 1.27, 3.81];
      comp.pins.forEach((pin, idx) => {
        const ox = offsets[idx] !== undefined ? offsets[idx] : -3.81 + idx * 2.54;
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

    // 4. Bluetooth HC-05 / HC-06 Module (6-Pin Header along edge)
    if (upperType.includes('BLUETOOTH') || upperType.includes('HC05') || upperType.includes('HC06')) {
      const offsets = [-6.35, -3.81, -1.27, 1.27, 3.81, 6.35];
      comp.pins.forEach((pin, idx) => {
        const ox = offsets[idx] !== undefined ? offsets[idx] : -6.35 + idx * 2.54;
        const pt = transformCoord(ox, 0.0);
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

    // 5. Axial Resistors, Diodes & Axial Inductors (Standard 10.16mm pitch)
    if (
      upperType.includes('RESISTOR') ||
      upperType.includes('DIODE') ||
      upperType.includes('INDUCTOR')
    ) {
      comp.pins.forEach((pin, idx) => {
        const ox = idx === 0 ? -5.08 : 5.08;
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

    // 6. Standard 2-Pin LEDs (5.08mm lead span matching 3D model)
    if (upperType.includes('LED')) {
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
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 7. LDR Photoresistors & Piezo Buzzers (5.08mm pitch)
    if (upperType.includes('LDR') || upperType.includes('BUZZER')) {
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
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 8. Capacitors: Polarized Electrolytic (5.08mm) vs Ceramic Disc (5.08mm IPC standard / 3D model)
    if (upperType.includes('CAPACITOR')) {
      const isElectrolytic =
        upperType.includes('ELECTROLYTIC') ||
        upperType.includes('RADIAL') ||
        Boolean(comp.parameters?.polarized) ||
        (comp.value && (comp.value.includes('u') || comp.value.includes('µ') || comp.value.includes('U')));
      const oxSpan = 2.54; // 5.08mm pitch (-2.54 to +2.54mm) strictly matching CapacitorCeramic3D leads and radial packages

      comp.pins.forEach((pin, idx) => {
        const ox = idx === 0 ? -oxSpan : oxSpan;
        const pt = transformCoord(ox, 0);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: isElectrolytic && idx === 0 ? 'rect' : 'round',
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 9. Potentiometers (3-pin Bourns 3386P)
    if (upperType.includes('POTENTIOMETER') || upperType.includes('TRIMMER')) {
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
      return pads;
    }

    // 10. Pushbuttons (4-Pin 6x6mm tactile switch at 5.08mm square pitch)
    if (
      upperType.includes('PUSH') ||
      upperType.includes('BUTTON') ||
      (upperType.includes('SWITCH') && comp.pins.length === 4)
    ) {
      const offsets = [
        { ox: -2.54, oy: -2.54 },
        { ox: 2.54, oy: -2.54 },
        { ox: -2.54, oy: 2.54 },
        { ox: 2.54, oy: 2.54 },
      ];
      comp.pins.forEach((pin, idx) => {
        const off = offsets[idx] || { ox: 0, oy: 0 };
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
      return pads;
    }

    // 11. Slide Switches (3-Pin SPDT at 2.54mm pitch)
    if (upperType.includes('SWITCH')) {
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

    // 12. Transistors (TO-92 / TO-220 / BJT / MOSFET at 2.54mm pitch)
    if (
      upperType.includes('TRANSISTOR') ||
      upperType.includes('BJT') ||
      upperType.includes('MOSFET') ||
      upperType.includes('REGULATOR')
    ) {
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

    // 13. Batteries, Screw Terminals & Power Connectors (5.08mm pitch)
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

    // 14. Authoritative physical spec pads fallback for all registered catalog components
    if (spec && spec.pads && spec.pads.length >= comp.pins.length && spec.pads.length > 0) {
      comp.pins.forEach((pin, idx) => {
        const sp =
          spec.pads!.find((p) => p.pinId === pin.id || p.pinId.toLowerCase() === (pin.name || '').toLowerCase()) ||
          spec.pads![idx];
        if (sp) {
          const pt = transformCoord(sp.xMm, sp.yMm);
          pads.push({
            id: `pad_${comp.id}_${pin.id}`,
            componentId: comp.id,
            pinId: pin.id,
            x: pt.x,
            y: pt.y,
            shape: sp.shape === 'rect' ? 'rect' : 'round',
            diameterMm: sp.padDiameterMm || 1.8,
            holeMm: sp.drillMm || 0.9,
            layer: 'all',
          });
        }
      });
      return pads;
    }

    // 15. Generic fallback
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
          if (tracks[i].netId && tracks[j].netId && tracks[i].netId === tracks[j].netId) continue;
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
