import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TEMPLATE_555_ASTABLE } from '../modules/engineering-lab/templates/starter-templates';
import { PcbGenerator } from '../modules/engineering-lab/pcb-engine/pcb-generator';
import { FootprintRenderer } from '../modules/engineering-lab/pcb-engine/footprint-renderer';
import { resolvePhysicalSpec } from '../modules/engineering-lab/circuit-engine/component-physical-registry';
import { CircuitComponent, CircuitWire, PcbLayout, PcbPad, PcbTrack } from '../modules/engineering-lab/types';

export interface PcbAuditResult {
  sameLayerCrossings: number;
  padShortViolations: number;
  unroutedNets: number;
  orphanVias: number;
  deadEndTracks: number;
  courtyardOverlaps: number;
  details: {
    crossings: string[];
    padShorts: string[];
    unrouted: string[];
    orphanVias: string[];
    deadEnds: string[];
    overlaps: string[];
  };
}

function segmentsIntersect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): boolean {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  if (Math.abs(denom) < 1e-6) return false;
  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
  return ua > 0.05 && ua < 0.95 && ub > 0.05 && ub < 0.95;
}

function pointToSegmentDist(
  p: { x: number; y: number },
  s1: { x: number; y: number },
  s2: { x: number; y: number }
): number {
  const dx = s2.x - s1.x;
  const dy = s2.y - s1.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - s1.x, p.y - s1.y);
  const t = Math.max(0, Math.min(1, ((p.x - s1.x) * dx + (p.y - s1.y) * dy) / lenSq));
  const projX = s1.x + t * dx;
  const projY = s1.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

export function auditPcbManufacturing(pcb: PcbLayout): PcbAuditResult {
  const details = {
    crossings: [] as string[],
    padShorts: [] as string[],
    unrouted: [] as string[],
    orphanVias: [] as string[],
    deadEnds: [] as string[],
    overlaps: [] as string[],
  };

  const tracks = pcb.tracks || [];
  const pads = pcb.pads || [];
  const components = pcb.components || [];

  // 1. Same-Layer Crossings
  let sameLayerCrossings = 0;
  for (let i = 0; i < tracks.length; i++) {
    for (let j = i + 1; j < tracks.length; j++) {
      const t1 = tracks[i];
      const t2 = tracks[j];
      if (t1.layer === t2.layer && t1.netId && t2.netId && t1.netId !== t2.netId) {
        if (segmentsIntersect(t1.from, t1.to, t2.from, t2.to)) {
          sameLayerCrossings++;
          details.crossings.push(
            `Crossing on ${t1.layer} between ${t1.netId} and ${t2.netId} at (${t1.from.x},${t1.from.y})->(${t1.to.x},${t1.to.y})`
          );
        }
      }
    }
  }

  // 2. Pad Short Violations
  let padShortViolations = 0;
  tracks.forEach((t) => {
    pads.forEach((p) => {
      if (p.componentId === 'VIA' || p.id.startsWith('via_')) return;
      if (p.netId && t.netId && p.netId !== t.netId) {
        const dist = pointToSegmentDist(p, t.from, t.to);
        const padOuterR = (p.diameterMm || 1.8) / 2;
        const requiredDist = padOuterR + (t.widthMm || 0.35) / 2 + 0.12;
        if (dist < requiredDist) {
          padShortViolations++;
          details.padShorts.push(
            `Track ${t.netId} (${t.layer}) passes pad ${p.componentId}:${p.pinId} (${p.netId}) - dist ${dist.toFixed(2)}mm < ${requiredDist.toFixed(2)}mm`
          );
        }
      }
    });
  });

  // 3. Unrouted Nets
  const netPadsMap = new Map<string, PcbPad[]>();
  pads.forEach((p) => {
    if (p.componentId === 'VIA' || p.id.startsWith('via_')) return;
    if (!p.netId) return;
    if (!netPadsMap.has(p.netId)) netPadsMap.set(p.netId, []);
    netPadsMap.get(p.netId)!.push(p);
  });

  let unroutedNets = 0;
  netPadsMap.forEach((nPads, netId) => {
    if (nPads.length < 2) return;
    const netTracks = tracks.filter((t) => t.netId === netId);
    const netVias = pads.filter((p) => (p.componentId === 'VIA' || p.id.startsWith('via_')) && p.netId === netId);

    const reachable = new Set<string>();
    const queue: { x: number; y: number }[] = [{ x: nPads[0].x, y: nPads[0].y }];
    const visited = new Set<string>();
    const key = (x: number, y: number) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const k = key(curr.x, curr.y);
      if (visited.has(k)) continue;
      visited.add(k);

      nPads.forEach((p) => {
        if (Math.hypot(p.x - curr.x, p.y - curr.y) <= (p.diameterMm || 1.8) / 2 + 0.35) {
          reachable.add(p.id);
        }
      });

      netTracks.forEach((t) => {
        if (Math.hypot(t.from.x - curr.x, t.from.y - curr.y) < 0.35) {
          queue.push(t.to);
        } else if (Math.hypot(t.to.x - curr.x, t.to.y - curr.y) < 0.35) {
          queue.push(t.from);
        } else if (pointToSegmentDist(curr, t.from, t.to) < 0.25) {
          queue.push(t.from);
          queue.push(t.to);
        }
      });

      netVias.forEach((v) => {
        if (Math.hypot(v.x - curr.x, v.y - curr.y) < 0.35) {
          netTracks.forEach((t) => {
            if (Math.hypot(t.from.x - v.x, t.from.y - v.y) < 0.35) queue.push(t.to);
            if (Math.hypot(t.to.x - v.x, t.to.y - v.y) < 0.35) queue.push(t.from);
          });
        }
      });
    }

    if (reachable.size < nPads.length) {
      unroutedNets++;
      details.unrouted.push(
        `Net ${netId}: only ${reachable.size}/${nPads.length} pads reachable`
      );
    }
  });

  // 4. Orphan Vias
  let orphanVias = 0;
  const vias = pads.filter((p) => (p.componentId === 'VIA' || p.id.startsWith('via_')) && !p.isManual);
  vias.forEach((v) => {
    const hasTop = tracks.some(
      (t) =>
        t.layer === 'top_copper' &&
        (!v.netId || !t.netId || t.netId === v.netId) &&
        (Math.hypot(t.from.x - v.x, t.from.y - v.y) <= 0.25 || Math.hypot(t.to.x - v.x, t.to.y - v.y) <= 0.25)
    );
    const hasBottom = tracks.some(
      (t) =>
        t.layer === 'bottom_copper' &&
        (!v.netId || !t.netId || t.netId === v.netId) &&
        (Math.hypot(t.from.x - v.x, t.from.y - v.y) <= 0.25 || Math.hypot(t.to.x - v.x, t.to.y - v.y) <= 0.25)
    );
    if (!hasTop || !hasBottom) {
      orphanVias++;
      details.orphanVias.push(
        `Via ${v.id} at (${v.x}, ${v.y}) net ${v.netId || 'N/A'} missing layer connection (Top: ${hasTop}, Bottom: ${hasBottom})`
      );
    }
  });

  // 5. Dead-End Tracks
  let deadEndTracks = 0;
  tracks.forEach((t) => {
    if (t.isManual) return;
    const checkEndpoint = (pt: { x: number; y: number }) => {
      const nearPad = pads.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < (p.diameterMm || 1.8) / 2 + 0.35);
      const nearVia = vias.some((v) => Math.hypot(v.x - pt.x, v.y - pt.y) < 0.25);
      const nearTrack = tracks.some(
        (ot) =>
          ot.id !== t.id &&
          ot.layer === t.layer &&
          (Math.hypot(ot.from.x - pt.x, ot.from.y - pt.y) < 0.25 ||
            Math.hypot(ot.to.x - pt.x, ot.to.y - pt.y) < 0.25 ||
            pointToSegmentDist(pt, ot.from, ot.to) < 0.25)
      );
      return nearPad || nearVia || nearTrack;
    };

    if (!checkEndpoint(t.from) || !checkEndpoint(t.to)) {
      deadEndTracks++;
      details.deadEnds.push(`Track ${t.id} (${t.layer}, net ${t.netId}) terminates in empty space`);
    }
  });

  // 6. Courtyard Overlaps
  let courtyardOverlaps = 0;
  const boxes = components.map((c) => {
    const spec = resolvePhysicalSpec(c.type, c.footprint);
    const w = spec.courtyardMm?.width || spec.bodyDimensionsMm?.width || 10;
    const d = spec.courtyardMm?.depth || spec.bodyDimensionsMm?.depth || 8;
    return {
      id: c.componentId,
      minX: c.x - w / 2,
      maxX: c.x + w / 2,
      minY: c.y - d / 2,
      maxY: c.y + d / 2,
    };
  });

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const b1 = boxes[i];
      const b2 = boxes[j];
      const overlapX = b1.minX < b2.maxX && b1.maxX > b2.minX;
      const overlapY = b1.minY < b2.maxY && b1.maxY > b2.minY;
      if (overlapX && overlapY) {
        courtyardOverlaps++;
        details.overlaps.push(`Courtyard collision between ${b1.id} and ${b2.id}`);
      }
    }
  }

  return {
    sameLayerCrossings,
    padShortViolations,
    unroutedNets,
    orphanVias,
    deadEndTracks,
    courtyardOverlaps,
    details,
  };
}

describe('GATE 1 & 2: Strict JLCPCB/PCBWay Manufacturing Audit Suite', () => {
  it('Scenario A: Audit Real NE555 Astable Preset Circuit', () => {
    const tmpl = TEMPLATE_555_ASTABLE;
    const pcb = PcbGenerator.generatePcbFromSchematic(tmpl.components, tmpl.wires, 100, 80);

    const audit = auditPcbManufacturing(pcb);
    console.log('--- SCENARIO A (NE555 PRESET) AUDIT ---');
    console.log(JSON.stringify(audit, null, 2));

    expect(pcb.tracks.length).toBeGreaterThan(0);
    expect(audit.sameLayerCrossings).toBe(0);
    expect(audit.padShortViolations).toBe(0);
    expect(audit.unroutedNets).toBe(0);
    expect(audit.orphanVias).toBe(0);
    expect(audit.deadEndTracks).toBe(0);
    expect(audit.courtyardOverlaps).toBe(0);
  });

  it('Scenario B: Audit Incremental Expansion (NE555 + Arduino Uno U2 + HC-05 BT_MOD1)', () => {
    const tmpl = TEMPLATE_555_ASTABLE;
    const pcbA = PcbGenerator.generatePcbFromSchematic(tmpl.components, tmpl.wires, 100, 80);

    // Expand circuit with Arduino Uno (U2) and HC-05 Bluetooth (BT_MOD1)
    const expandedComponents: CircuitComponent[] = [
      ...tmpl.components,
      {
        id: 'u2',
        type: 'ARDUINO_UNO',
        label: 'Arduino Uno R3',
        designator: 'U2',
        category: 'microcontrollers',
        value: 'ATmega328P',
        x: 800,
        y: 200,
        rotation: 0,
        parameters: {},
        footprint: 'DEFAULT',
        pins: [
          { id: '5V', name: '5V', x: 0, y: 0, pinType: 'power' },
          { id: 'GND', name: 'GND', x: 0, y: 2.54, pinType: 'power' },
          { id: 'D0', name: 'RX', x: 0, y: 5.08, pinType: 'input' },
          { id: 'D1', name: 'TX', x: 0, y: 7.62, pinType: 'output' },
          { id: 'D2', name: 'D2', x: 0, y: 10.16, pinType: 'input' },
        ],
      },
      {
        id: 'bt_mod1',
        type: 'MODULE_HC05',
        label: 'HC-05 Bluetooth',
        designator: 'BT_MOD1',
        category: 'modules',
        value: 'HC-05',
        x: 950,
        y: 200,
        rotation: 0,
        parameters: {},
        footprint: 'DEFAULT',
        pins: [
          { id: 'STATE', name: 'STATE', x: -6.35, y: 0, pinType: 'output' },
          { id: 'RXD', name: 'RXD', x: -3.81, y: 0, pinType: 'input' },
          { id: 'TXD', name: 'TXD', x: -1.27, y: 0, pinType: 'output' },
          { id: 'GND', name: 'GND', x: 1.27, y: 0, pinType: 'power' },
          { id: 'VCC', name: 'VCC', x: 3.81, y: 0, pinType: 'power' },
          { id: 'EN', name: 'EN', x: 6.35, y: 0, pinType: 'input' },
        ],
      },
    ];

    const expandedWires: CircuitWire[] = [
      ...tmpl.wires,
      { id: 'w_u2_pwr', fromCompId: 'u2', fromPinId: '5V', toCompId: 'ic1', toPinId: '8' },
      { id: 'w_u2_gnd', fromCompId: 'u2', fromPinId: 'GND', toCompId: 'gnd1', toPinId: '1' },
      { id: 'w_u2_pulse', fromCompId: 'ic1', fromPinId: '3', toCompId: 'u2', toPinId: 'D2' },
      { id: 'w_bt_vcc', fromCompId: 'u2', fromPinId: '5V', toCompId: 'bt_mod1', toPinId: 'VCC' },
      { id: 'w_bt_gnd', fromCompId: 'u2', fromPinId: 'GND', toCompId: 'bt_mod1', toPinId: 'GND' },
      { id: 'w_bt_rx', fromCompId: 'u2', fromPinId: 'D1', toCompId: 'bt_mod1', toPinId: 'RXD' },
      { id: 'w_bt_tx', fromCompId: 'u2', fromPinId: 'D0', toCompId: 'bt_mod1', toPinId: 'TXD' },
    ];

    // Incremental rebuild from existing pcbA
    const pcbB = PcbGenerator.generatePcbFromSchematic(expandedComponents, expandedWires, pcbA.widthMm, pcbA.heightMm, pcbA);

    const audit = auditPcbManufacturing(pcbB);
    console.log('--- SCENARIO B (NE555 + UNO + HC-05) AUDIT ---');
    console.log(JSON.stringify(audit, null, 2));

    expect(pcbB.tracks.length).toBeGreaterThan(0);
    expect(audit.sameLayerCrossings).toBe(0);
    expect(audit.padShortViolations).toBe(0);
    expect(audit.unroutedNets).toBe(0);
    expect(audit.orphanVias).toBe(0);
    expect(audit.deadEndTracks).toBe(0);
    expect(audit.courtyardOverlaps).toBe(0);
  });

  it('GATE 3: 3D Copper Textures & Zero BoxGeometry Track Meshes in Pcb3dViewer', () => {
    const pcb3dPath = path.resolve(__dirname, '../modules/engineering-lab/pcb-engine/Pcb3dViewer.tsx');
    const source = fs.readFileSync(pcb3dPath, 'utf8');

    // Verify 0 BoxGeometry track meshes exist in Pcb3dViewer.tsx
    expect(source).not.toContain('BoxGeometry');

    // Verify destination-out drill punchouts are used for canvas textures
    expect(source).toContain("ctx.globalCompositeOperation = 'destination-out'");
  });

  it('GATE 3: Silkscreen Polarity Distinction - BT1 has +/- marks, BT_MOD1 does not', () => {
    const bt1Desc = FootprintRenderer.getSilkscreenDescriptor({
      type: 'DC_BATTERY',
      designator: 'BT1',
    });
    expect(bt1Desc.family).toBe('battery');
    expect(bt1Desc.hasPlusMark).toBe(true);
    expect(bt1Desc.hasMinusMark).toBe(true);

    const btModDesc = FootprintRenderer.getSilkscreenDescriptor({
      type: 'MODULE_HC05',
      designator: 'BT_MOD1',
    });
    expect(btModDesc.family).not.toBe('battery');
    expect(btModDesc.hasPlusMark).toBe(false);
    expect(btModDesc.hasMinusMark).toBe(false);
  });
});
