import { CircuitComponent, CircuitWire } from '../types';

/**
 * Generates an industry-standard Berkeley SPICE / Ngspice / LTspice netlist from the schematic.
 */
export function generateSpiceNetlist(
  title: string,
  components: CircuitComponent[],
  wires: CircuitWire[]
): string {
  // Disjoint set for net consolidation
  const parent = new Map<string, string>();
  const find = (i: string): string => {
    if (!parent.has(i)) parent.set(i, i);
    if (parent.get(i) === i) return i;
    const root = find(parent.get(i)!);
    parent.set(i, root);
    return root;
  };
  const union = (i: string, j: string) => {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) parent.set(rootI, rootJ);
  };

  wires.forEach((w) => {
    union(`${w.fromCompId}:${w.fromPinId}`, `${w.toCompId}:${w.toPinId}`);
  });

  // Assign SPICE node names: Ground is always '0'
  const netNodeNames = new Map<string, string>();
  let nextNodeIndex = 1;

  // First pass: identify ground nets
  components.forEach((c) => {
    if (['GND', 'GROUND'].includes(c.type)) {
      c.pins.forEach((p) => {
        const root = find(`${c.id}:${p.id}`);
        netNodeNames.set(root, '0');
      });
    }
  });

  // Second pass: name remaining nets
  components.forEach((c) => {
    c.pins.forEach((p) => {
      const root = find(`${c.id}:${p.id}`);
      if (!netNodeNames.has(root)) {
        netNodeNames.set(root, `N_${nextNodeIndex++}`);
      }
    });
  });

  const getNode = (compId: string, pinId: string): string => {
    const root = find(`${compId}:${pinId}`);
    return netNodeNames.get(root) || '0';
  };

  const sanitizeValue = (val: string, fallback: string): string => {
    if (!val) return fallback;
    return val
      .replace(/Ω/g, '')
      .replace(/k/gi, 'k')
      .replace(/µ/gi, 'u')
      .replace(/V/gi, '')
      .replace(/F/gi, '')
      .trim();
  };

  const lines: string[] = [];
  lines.push(`* EI HOUSE INDIA - VIRTUAL ENGINEERING LAB`);
  lines.push(`* PROJECT: ${title.toUpperCase()}`);
  lines.push(`* DATE: ${new Date().toISOString()}`);
  lines.push(`* SIMULATOR TARGET: NGSPICE / LTSPICE / BERKELEY SPICE 3F5`);
  lines.push(`* =================================================================`);
  lines.push('');

  const modelsNeeded = new Set<string>();

  components.forEach((comp) => {
    const des = (comp.designator || comp.label || comp.type).replace(/\s+/g, '_');
    const type = comp.type;

    switch (type) {
      case 'RESISTOR':
      case 'POTENTIOMETER': {
        const n1 = getNode(comp.id, '1');
        const n2 = getNode(comp.id, '2');
        const rVal = sanitizeValue(comp.value, '10k');
        lines.push(`R_${des} ${n1} ${n2} ${rVal}`);
        break;
      }

      case 'CAPACITOR': {
        const n1 = getNode(comp.id, '1');
        const n2 = getNode(comp.id, '2');
        const cVal = sanitizeValue(comp.value, '100n');
        lines.push(`C_${des} ${n1} ${n2} ${cVal}`);
        break;
      }

      case 'INDUCTOR': {
        const n1 = getNode(comp.id, '1');
        const n2 = getNode(comp.id, '2');
        const lVal = sanitizeValue(comp.value, '10u');
        lines.push(`L_${des} ${n1} ${n2} ${lVal}`);
        break;
      }

      case 'DIODE': {
        const nAnode = getNode(comp.id, '1');
        const nCathode = getNode(comp.id, '2');
        lines.push(`D_${des} ${nAnode} ${nCathode} 1N4148`);
        modelsNeeded.add('1N4148');
        break;
      }

      case 'LED': {
        const nAnode = getNode(comp.id, '1');
        const nCathode = getNode(comp.id, '2');
        lines.push(`D_${des} ${nAnode} ${nCathode} LED_GENERIC`);
        modelsNeeded.add('LED_GENERIC');
        break;
      }

      case 'DC_VOLTAGE':
      case 'BATTERY': {
        const nPos = getNode(comp.id, '1');
        const nNeg = getNode(comp.id, '2');
        const vVal = sanitizeValue(comp.value, '9');
        lines.push(`V_${des} ${nPos} ${nNeg} DC ${vVal}`);
        break;
      }

      case 'AC_SOURCE':
      case 'FUNCTION_GENERATOR': {
        const n1 = getNode(comp.id, '1');
        const n2 = getNode(comp.id, '2');
        lines.push(`V_${des} ${n1} ${n2} SIN(0 5 1000)`);
        break;
      }

      case 'BJT_NPN': {
        const nC = getNode(comp.id, 'c');
        const nB = getNode(comp.id, 'b');
        const nE = getNode(comp.id, 'e');
        lines.push(`Q_${des} ${nC} ${nB} ${nE} 2N2222`);
        modelsNeeded.add('2N2222');
        break;
      }

      case 'BJT_PNP': {
        const nC = getNode(comp.id, 'c');
        const nB = getNode(comp.id, 'b');
        const nE = getNode(comp.id, 'e');
        lines.push(`Q_${des} ${nC} ${nB} ${nE} 2N3906`);
        modelsNeeded.add('2N3906');
        break;
      }

      case 'MOSFET_N': {
        const nD = getNode(comp.id, 'd');
        const nG = getNode(comp.id, 'g');
        const nS = getNode(comp.id, 's');
        lines.push(`M_${des} ${nD} ${nG} ${nS} ${nS} 2N7000`);
        modelsNeeded.add('2N7000');
        break;
      }

      case 'TIMER_555': {
        const gnd = getNode(comp.id, '1');
        const trig = getNode(comp.id, '2');
        const out = getNode(comp.id, '3');
        const rst = getNode(comp.id, '4');
        const ctrl = getNode(comp.id, '5');
        const thres = getNode(comp.id, '6');
        const disch = getNode(comp.id, '7');
        const vcc = getNode(comp.id, '8');
        lines.push(`X_${des} ${gnd} ${trig} ${out} ${rst} ${ctrl} ${thres} ${disch} ${vcc} NE555`);
        modelsNeeded.add('NE555');
        break;
      }

      default:
        break;
    }
  });

  lines.push('');
  lines.push('* SEMICONDUCTOR SPICE MODELS & SUBCIRCUITS');
  if (modelsNeeded.has('1N4148')) {
    lines.push('.model 1N4148 D (Is=2.52n Rs=0.568 N=1.752 Cjo=4p M=0.4 tt=20n)');
  }
  if (modelsNeeded.has('LED_GENERIC')) {
    lines.push('.model LED_GENERIC D (Is=1e-19 Rs=5 N=1.8 Cjo=15p)');
  }
  if (modelsNeeded.has('2N2222')) {
    lines.push('.model 2N2222 NPN (Is=14.34f Xti=3 Eg=1.11 Vaf=74.03 Bf=255.9 Ne=1.307)');
  }
  if (modelsNeeded.has('2N3906')) {
    lines.push('.model 2N3906 PNP (Is=1.41p Xti=3 Eg=1.11 Vaf=18.7 Bf=180.7 Ne=1.5)');
  }
  if (modelsNeeded.has('2N7000')) {
    lines.push('.model 2N7000 NMOS (Vto=2.1 Kp=0.12 Rd=1.2 Rs=1.2 Cgs=50p)');
  }
  if (modelsNeeded.has('NE555')) {
    lines.push('* Simplified Behavioral NE555 Timer Macromodel');
    lines.push('.subckt NE555 1 2 3 4 5 6 7 8');
    lines.push('R1 8 5 5k');
    lines.push('R2 5 9 5k');
    lines.push('R3 9 1 5k');
    lines.push('.ends NE555');
  }

  lines.push('');
  lines.push('* SIMULATION CONTROL CARDS');
  lines.push('.op');
  lines.push('.tran 10us 50ms');
  lines.push('.end');
  lines.push('');

  return lines.join('\n');
}

/**
 * Triggers a client-side download of the generated SPICE netlist (.cir).
 */
export function downloadSpiceNetlist(projectTitle: string, netlistContent: string): void {
  const fileName = `${projectTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.cir`;
  const blob = new Blob([netlistContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
