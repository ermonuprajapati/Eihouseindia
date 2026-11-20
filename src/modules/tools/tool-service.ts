import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import type {
  EngineeringDomain,
  EngineeringTool,
  ToolCategory,
  ToolLicenseType,
  UserProfile,
  UserRole,
} from '@/types';

function toIso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as Timestamp).toDate().toISOString();
  }
  return new Date().toISOString();
}

export const ENGINEERING_DOMAINS: EngineeringDomain[] = [
  'Electronics & Embedded',
  'Mechanical & Robotics',
  'Computer Science & IT',
  'Networking & IoT',
  '3D Printing & CAD',
  'General Engineering',
];

export const TOOL_CATEGORIES: ToolCategory[] = [
  'Electronics',
  'Mechanical',
  '3D Printing',
  'Programming',
  'IT & Networking',
  'Simulation',
  'Calculators',
];

export const TOOL_LICENSES: ToolLicenseType[] = [
  'Open Source',
  'Free',
  'Freemium',
  'Commercial / Paid',
  'Student License',
];

function makeToolBrandSvg(monogram: string, bg: string, fg = '#ffffff'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="14" fill="${bg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="${fg}" font-family="system-ui,-apple-system,sans-serif" font-weight="800" font-size="${monogram.length > 2 ? 18 : 24}" letter-spacing="-0.5">${monogram}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const TOOL_OFFICIAL_LOGOS: Record<string, string> = {
  kicad: 'https://cdn.simpleicons.org/kicad/314CB0',
  'autodesk-fusion': 'https://www.google.com/s2/favicons?domain=autodesk.com&sz=128',
  fusion360: 'https://www.google.com/s2/favicons?domain=autodesk.com&sz=128',
  'eihouse-virtual-lab': '/logo.png',
  freecad: 'https://cdn.simpleicons.org/freecad/CB333B',
  ansys: 'https://cdn.simpleicons.org/ansys/FFB71B',
  vscode: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vscode/vscode-original.svg',
  'vs-code': 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vscode/vscode-original.svg',
  'visual-studio-code': 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vscode/vscode-original.svg',
  ltspice: 'https://www.google.com/s2/favicons?domain=analog.com&sz=128',
  solidworks: 'https://www.google.com/s2/favicons?domain=solidworks.com&sz=128',
  matlab: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/matlab/matlab-original.svg',
  'matlab-simulink': 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/matlab/matlab-original.svg',
  simulink: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/matlab/matlab-original.svg',
  cisco: 'https://cdn.simpleicons.org/cisco/1BA0D7',
  'cisco-packet-tracer': 'https://cdn.simpleicons.org/cisco/1BA0D7',
  packettracer: 'https://cdn.simpleicons.org/cisco/1BA0D7',
  blender: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/blender/blender-original.svg',
  docker: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg',
  tinkercad: 'https://www.google.com/s2/favicons?domain=tinkercad.com&sz=128',
  easyeda: 'https://www.google.com/s2/favicons?domain=easyeda.com&sz=128',
  proteus: 'https://www.google.com/s2/favicons?domain=labcenter.com&sz=128',
  altium: 'https://cdn.simpleicons.org/altiumdesigner/A5915F',
  'altium-designer': 'https://cdn.simpleicons.org/altiumdesigner/A5915F',
  qelectrotech: 'https://www.google.com/s2/favicons?domain=qelectrotech.org&sz=128',
  'factory-io': 'https://www.google.com/s2/favicons?domain=factoryio.com&sz=128',
  arduino: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/arduino/arduino-original.svg',
  'arduino-ide': 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/arduino/arduino-original.svg',
  stm32: 'https://cdn.simpleicons.org/stmicroelectronics/03234B',
  stm32cubeide: 'https://cdn.simpleicons.org/stmicroelectronics/03234B',
  onshape: 'https://www.google.com/s2/favicons?domain=onshape.com&sz=128',
  autocad: 'https://cdn.simpleicons.org/autocad/E51050',
  openscad: 'https://cdn.simpleicons.org/openscad/F9D72C',
  simscale: 'https://www.google.com/s2/favicons?domain=simscale.com&sz=128',
  openfoam: 'https://www.google.com/s2/favicons?domain=openfoam.com&sz=128',
  cura: 'https://cdn.simpleicons.org/ultimaker/0000EE',
  'ultimaker-cura': 'https://cdn.simpleicons.org/ultimaker/0000EE',
  prusaslicer: 'https://cdn.simpleicons.org/prusa/FA6831',
  'bambu-studio': 'https://www.google.com/s2/favicons?domain=bambulab.com&sz=128',
  github: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/github/github-original.svg',
  python: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg',
  jupyter: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/jupyter/jupyter-original.svg',
  colab: 'https://cdn.simpleicons.org/googlecolab/F9AB00',
  'google-colab': 'https://cdn.simpleicons.org/googlecolab/F9AB00',
  git: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/git/git-original.svg',
  wireshark: 'https://cdn.simpleicons.org/wireshark/1679A7',
  virtualbox: 'https://cdn.simpleicons.org/virtualbox/183A61',
  'oracle-virtualbox': 'https://cdn.simpleicons.org/virtualbox/183A61',
  ubuntu: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/ubuntu/ubuntu-original.svg',
  nmap: 'https://www.google.com/s2/favicons?domain=nmap.org&sz=128',
  postman: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postman/postman-original.svg',
  digikey: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Digi-Key_logo.svg',
  'digikey-calculators': 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Digi-Key_logo.svg',
  wolframalpha: 'https://cdn.simpleicons.org/wolfram/DD1100',
  'wolfram-alpha': 'https://cdn.simpleicons.org/wolfram/DD1100',
};

function escSvg(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Generates an authentic, tool-specific 16:9 software interface visual
 * representing the actual workspace of the engineering tool or EI House calculator.
 */
function buildToolInterfaceSvg(tool: Partial<EngineeringTool>): string {
  const slug = (tool.slug || '').toLowerCase();
  const name = escSvg(tool.name || 'Engineering Tool');
  const subtitle = escSvg((tool.mainApplication || tool.category || 'Workspace').slice(0, 48));

  // 1. EI House Interactive Calculators — Authentic Calculator UI Representation
  if (tool.toolType === 'interactive' || tool.category === 'Calculators') {
    const calcFormulas: Record<string, { eq: string; in1: string; in2: string; out: string }> = {
      'ohms-law': { eq: 'V = I × R   |   P = V × I', in1: 'Voltage (V): 12.0 V', in2: 'Resistance (R): 100 Ω', out: 'I = 0.12 A  |  P = 1.44 W' },
      'resistor-color-code': { eq: '4-Band / 5-Band IEC 60062 Decoder', in1: 'Bands: Brown · Black · Red · Gold', in2: 'Multiplier: ×100 Ω (±5%)', out: '1.0 kΩ ±5% (950–1050 Ω)' },
      'voltage-divider': { eq: 'Vout = Vin × [ R2 / (R1 + R2) ]', in1: 'Vin: 5.0 V  |  R1: 10 kΩ', in2: 'R2: 20 kΩ (ADC Input)', out: 'Vout = 3.333 V (Ratio 0.67)' },
      'led-resistor': { eq: 'R = (Vs − Vf) / If', in1: 'Supply Vs: 5.0V | LED Vf: 2.1V', in2: 'Target Current If: 15 mA', out: 'R = 193.3 Ω → Use 220 Ω (0.04W)' },
      '555-timer': { eq: 'f = 1.44 / ((R1 + 2·R2) × C)', in1: 'R1: 1 kΩ | R2: 10 kΩ', in2: 'Capacitor C: 0.1 µF', out: 'f = 685.7 Hz | Duty: 52.4%' },
      'pcb-trace': { eq: 'IPC-2221 External Layer Trace Sizing', in1: 'Current: 3.0 A | Temp Rise: 10°C', in2: 'Copper Weight: 1.0 oz/ft²', out: 'Min Width: 52.8 mil (1.34 mm)' },
      'motor-torque': { eq: 'P (W) = (2π × RPM × T) / 60', in1: 'Speed: 300 RPM', in2: 'Torque: 1.50 N·m', out: 'Power = 47.1 W (0.063 HP)' },
      'gear-ratio': { eq: 'GR = N_driven / N_driver', in1: 'Driver T1: 16T | Driven T2: 64T', in2: 'Input: 1200 RPM @ 0.4 N·m', out: 'Ratio 4.0:1 → 300 RPM @ 1.52 N·m' },
      'cylinder-force': { eq: 'F = P × π × (D/2)²', in1: 'Bore: 50 mm | Rod: 20 mm', in2: 'Pressure: 6.0 bar (0.6 MPa)', out: 'Push: 1178 N | Pull: 989 N' },
      'base64-encoder': { eq: 'UTF-8 ⇄ Base64 & RFC-3986 URL Codec', in1: 'Input: EI_HOUSE_IOT_NODE_01', in2: 'Mode: Bidirectional Live Encode', out: 'RUlfSE9VU0VfSU9UX05PREVfMDE=' },
      'number-converter': { eq: 'DEC ⇄ HEX (0x) ⇄ BIN (0b) ⇄ OCT', in1: 'DEC: 255   |   HEX: 0xFF', in2: 'OCT: 0o377 |   ASCII: ÿ', out: 'BIN: 1111 1111 (8-bit Register)' },
      'subnet-calculator': { eq: 'IPv4 CIDR Block & Host Mask Solver', in1: 'IP: 192.168.10.1 / 24', in2: 'Mask: 255.255.255.0', out: 'Hosts: .1 – .254 (254 Usable)' },
      '3d-print-cost': { eq: 'Total = Material + Energy + Machine', in1: 'Weight: 85g PLA @ ₹1200/kg', in2: 'Time: 4.5 hrs @ 150W', out: 'Estimated Job Cost: ₹148.50' },
      'stepper-calibration': { eq: 'Steps/mm = (Steps × Micro) / Pitch', in1: '1.8° Motor (200) | 1/16 Step', in2: 'GT2 Belt (2mm) | 20T Pulley', out: '80.00 steps/mm (Marlin/Klipper)' },
    };
    const spec = calcFormulas[tool.calculatorKey || ''] || {
      eq: 'f(x) = Engineering Solver Engine',
      in1: 'Parameter A: Verified Input',
      in2: 'Parameter B: SI Units',
      out: 'Live Computed Engineering Output',
    };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
      <rect width="480" height="270" fill="#0B1528"/>
      <rect x="14" y="12" width="452" height="246" rx="10" fill="#111F38" stroke="#243B61" stroke-width="1.5"/>
      <rect x="14" y="12" width="452" height="32" rx="10" fill="#172D4D"/>
      <circle cx="30" cy="28" r="4.5" fill="#EF4444"/><circle cx="44" cy="28" r="4.5" fill="#F59E0B"/><circle cx="58" cy="28" r="4.5" fill="#10B981"/>
      <text x="74" y="32" fill="#E2E8F0" font-family="monospace" font-size="11" font-weight="bold">EI HOUSE SOLVER // ${name}</text>
      <rect x="28" y="56" width="424" height="34" rx="6" fill="#091224" stroke="#F59E0B" stroke-width="1" stroke-opacity="0.5"/>
      <text x="40" y="77" fill="#F59E0B" font-family="monospace" font-size="12" font-weight="bold">${escSvg(spec.eq)}</text>
      <rect x="28" y="102" width="204" height="52" rx="6" fill="#162847" stroke="#2D4A77" stroke-width="1"/>
      <text x="38" y="120" fill="#94A3B8" font-family="sans-serif" font-size="9" font-weight="bold">INPUT PARAMETER 01</text>
      <text x="38" y="140" fill="#F8FAFC" font-family="monospace" font-size="11" font-weight="bold">${escSvg(spec.in1)}</text>
      <rect x="248" y="102" width="204" height="52" rx="6" fill="#162847" stroke="#2D4A77" stroke-width="1"/>
      <text x="258" y="120" fill="#94A3B8" font-family="sans-serif" font-size="9" font-weight="bold">INPUT PARAMETER 02</text>
      <text x="258" y="140" fill="#F8FAFC" font-family="monospace" font-size="11" font-weight="bold">${escSvg(spec.in2)}</text>
      <rect x="28" y="168" width="424" height="62" rx="8" fill="#06392F" stroke="#10B981" stroke-width="1.5"/>
      <text x="42" y="188" fill="#6EE7B7" font-family="sans-serif" font-size="9" font-weight="bold">COMPUTED ENGINEERING RESULT</text>
      <text x="42" y="213" fill="#ECFDF5" font-family="monospace" font-size="14" font-weight="bold">${escSvg(spec.out)}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // 2. PCB Layout & Schematic EDA Suite (KiCad, EasyEDA, Altium Designer)
  if (slug.includes('kicad') || slug.includes('easyeda') || slug.includes('altium')) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
      <rect width="480" height="270" fill="#09131C"/>
      <rect x="0" y="0" width="480" height="28" fill="#16222F"/>
      <circle cx="16" cy="14" r="4" fill="#EF4444"/><circle cx="28" cy="14" r="4" fill="#F59E0B"/><circle cx="40" cy="14" r="4" fill="#10B981"/>
      <text x="56" y="18" fill="#E2E8F0" font-family="monospace" font-size="11" font-weight="bold">${name} — Multi-Layer PCB Layout &amp; DRC Editor</text>
      <g stroke="#132A38" stroke-width="1">
        <line x1="0" y1="60" x2="400" y2="60"/><line x1="0" y1="100" x2="400" y2="100"/><line x1="0" y1="140" x2="400" y2="140"/><line x1="0" y1="180" x2="400" y2="180"/><line x1="0" y1="220" x2="400" y2="220"/>
        <line x1="60" y1="28" x2="60" y2="270"/><line x1="120" y1="28" x2="120" y2="270"/><line x1="180" y1="28" x2="180" y2="270"/><line x1="240" y1="28" x2="240" y2="270"/><line x1="300" y1="28" x2="300" y2="270"/><line x1="360" y1="28" x2="360" y2="270"/>
      </g>
      <rect x="34" y="46" width="336" height="202" rx="6" fill="#082018" stroke="#F59E0B" stroke-width="1.5"/>
      <path d="M 60 80 L 110 80 L 135 105 L 185 105" fill="none" stroke="#EF4444" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M 60 100 L 100 100 L 125 125 L 185 125" fill="none" stroke="#EF4444" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M 255 110 L 300 110 L 325 80 L 350 80" fill="none" stroke="#3B82F6" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M 255 130 L 290 130 L 320 165 L 350 165" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round"/>
      <path d="M 140 210 L 210 210 L 210 165" fill="none" stroke="#EF4444" stroke-width="4" stroke-linecap="round"/>
      <rect x="182" y="92" width="74" height="74" rx="4" fill="#1E293B" stroke="#94A3B8" stroke-width="1.5"/>
      <text x="219" y="126" text-anchor="middle" fill="#38BDF8" font-family="monospace" font-size="10" font-weight="bold">U1: MCU</text>
      <text x="219" y="140" text-anchor="middle" fill="#94A3B8" font-family="monospace" font-size="8">QFP-48</text>
      <g fill="#F59E0B">
        <rect x="174" y="100" width="8" height="4"/><rect x="174" y="110" width="8" height="4"/><rect x="174" y="120" width="8" height="4"/><rect x="174" y="130" width="8" height="4"/><rect x="174" y="140" width="8" height="4"/><rect x="174" y="150" width="8" height="4"/>
        <rect x="256" y="100" width="8" height="4"/><rect x="256" y="110" width="8" height="4"/><rect x="256" y="120" width="8" height="4"/><rect x="256" y="130" width="8" height="4"/><rect x="256" y="140" width="8" height="4"/><rect x="256" y="150" width="8" height="4"/>
      </g>
      <circle cx="135" cy="105" r="5" fill="#F59E0B" stroke="#082018" stroke-width="2"/>
      <circle cx="125" cy="125" r="5" fill="#F59E0B" stroke="#082018" stroke-width="2"/>
      <circle cx="300" cy="110" r="5" fill="#F59E0B" stroke="#082018" stroke-width="2"/>
      <rect x="392" y="28" width="88" height="242" fill="#111C28" stroke="#1E293B" stroke-width="1"/>
      <text x="402" y="48" fill="#94A3B8" font-family="sans-serif" font-size="9" font-weight="bold">LAYERS</text>
      <rect x="402" y="58" width="10" height="10" fill="#EF4444"/><text x="418" y="67" fill="#E2E8F0" font-family="monospace" font-size="9">F.Cu (Top)</text>
      <rect x="402" y="76" width="10" height="10" fill="#3B82F6"/><text x="418" y="85" fill="#E2E8F0" font-family="monospace" font-size="9">B.Cu (Bot)</text>
      <rect x="402" y="94" width="10" height="10" fill="#10B981"/><text x="418" y="103" fill="#E2E8F0" font-family="monospace" font-size="9">In1.GND</text>
      <rect x="402" y="112" width="10" height="10" fill="#F59E0B"/><text x="418" y="121" fill="#E2E8F0" font-family="monospace" font-size="9">Edge.Cuts</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // 3. Microcontroller & Circuit Simulators (EI House Virtual Lab, Tinkercad, Proteus, Factory I/O)
  if (slug.includes('eihouse') || slug.includes('tinkercad') || slug.includes('proteus') || slug.includes('factory')) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
      <rect width="480" height="270" fill="#0F172A"/>
      <rect x="0" y="0" width="480" height="28" fill="#1E293B"/>
      <circle cx="16" cy="14" r="4" fill="#EF4444"/><circle cx="28" cy="14" r="4" fill="#F59E0B"/><circle cx="40" cy="14" r="4" fill="#10B981"/>
      <text x="56" y="18" fill="#F8FAFC" font-family="monospace" font-size="11" font-weight="bold">${name} — Interactive Hardware &amp; MCU Simulator</text>
      <rect x="16" y="40" width="210" height="214" rx="8" fill="#090D16" stroke="#334155"/>
      <text x="28" y="60" fill="#38BDF8" font-family="monospace" font-size="10">#include &lt;WiFi.h&gt;</text>
      <text x="28" y="78" fill="#F472B6" font-family="monospace" font-size="10">void setup() {</text>
      <text x="38" y="94" fill="#E2E8F0" font-family="monospace" font-size="10">Serial.begin(115200);</text>
      <text x="38" y="110" fill="#E2E8F0" font-family="monospace" font-size="10">pinMode(2, OUTPUT);</text>
      <text x="28" y="126" fill="#F472B6" font-family="monospace" font-size="10">}</text>
      <text x="28" y="146" fill="#F472B6" font-family="monospace" font-size="10">void loop() {</text>
      <text x="38" y="162" fill="#A7F3D0" font-family="monospace" font-size="10">digitalWrite(2, HIGH);</text>
      <text x="38" y="178" fill="#94A3B8" font-family="monospace" font-size="10">delay(500);</text>
      <text x="28" y="194" fill="#F472B6" font-family="monospace" font-size="10">}</text>
      <rect x="28" y="212" width="186" height="28" rx="5" fill="#064E3B"/>
      <text x="40" y="230" fill="#34D399" font-family="monospace" font-size="10">▶ SIMULATION RUNNING: 100%</text>
      <rect x="240" y="40" width="224" height="214" rx="8" fill="#1E293B" stroke="#475569"/>
      <rect x="268" y="65" width="90" height="150" rx="6" fill="#047857" stroke="#10B981" stroke-width="2"/>
      <rect x="286" y="76" width="54" height="42" rx="3" fill="#94A3B8"/>
      <text x="313" y="101" text-anchor="middle" fill="#0F172A" font-family="monospace" font-size="9" font-weight="bold">ESP32-S3</text>
      <circle cx="313" cy="175" r="5" fill="#10B981"/>
      <path d="M 358 140 L 405 140 L 405 105" fill="none" stroke="#38BDF8" stroke-width="3"/>
      <path d="M 358 158 L 425 158 L 425 105" fill="none" stroke="#F59E0B" stroke-width="3"/>
      <rect x="385" y="64" width="62" height="44" rx="4" fill="#090D16" stroke="#38BDF8" stroke-width="1.5"/>
      <text x="416" y="84" text-anchor="middle" fill="#38BDF8" font-family="monospace" font-size="8">OLED 128x64</text>
      <text x="416" y="98" text-anchor="middle" fill="#10B981" font-family="monospace" font-size="9">TEMP: 26.4C</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // 4. SPICE Analog & Electrical Schematic Simulation (LTspice, QElectroTech)
  if (slug.includes('ltspice') || slug.includes('qelectrotech')) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
      <rect width="480" height="270" fill="#0B1320"/>
      <rect x="0" y="0" width="480" height="28" fill="#162336"/>
      <circle cx="16" cy="14" r="4" fill="#EF4444"/><circle cx="28" cy="14" r="4" fill="#F59E0B"/><circle cx="40" cy="14" r="4" fill="#10B981"/>
      <text x="56" y="18" fill="#F8FAFC" font-family="monospace" font-size="11" font-weight="bold">${name} — SPICE Waveform &amp; Schematic Capture</text>
      <rect x="14" y="38" width="452" height="106" rx="6" fill="#060B12" stroke="#1E293B"/>
      <text x="26" y="54" fill="#10B981" font-family="monospace" font-size="9">V(vout) [dB] — Transient &amp; AC Bode Response</text>
      <path d="M 26 115 Q 50 60, 74 115 T 122 115 T 170 115 T 218 115 T 266 115 T 314 115 T 362 115 T 410 115 T 450 115" fill="none" stroke="#10B981" stroke-width="2"/>
      <path d="M 26 105 Q 50 135, 74 105 T 122 105 T 170 105 T 218 105 T 266 105 T 314 105 T 362 105 T 410 105 T 450 105" fill="none" stroke="#38BDF8" stroke-width="1.8" stroke-dasharray="4 2"/>
      <rect x="14" y="152" width="452" height="104" rx="6" fill="#131F31" stroke="#334155"/>
      <g stroke="#E2E8F0" stroke-width="2" fill="none">
        <circle cx="70" cy="204" r="18"/>
        <line x1="70" y1="168" x2="70" y2="186"/><line x1="70" y1="222" x2="70" y2="240"/>
        <line x1="70" y1="168" x2="150" y2="168"/>
        <polyline points="150,168 158,158 168,178 178,158 188,178 198,158 206,168"/>
        <line x1="206" y1="168" x2="340" y2="168"/>
        <line x1="270" y1="168" x2="270" y2="196"/><line x1="254" y1="196" x2="286" y2="196"/><line x1="254" y1="206" x2="286" y2="206"/><line x1="270" y1="206" x2="270" y2="240"/>
        <line x1="70" y1="240" x2="340" y2="240"/>
      </g>
      <text x="165" y="152" fill="#F59E0B" font-family="monospace" font-size="10">R1 = 4.7kΩ</text>
      <text x="294" y="205" fill="#38BDF8" font-family="monospace" font-size="10">C1 = 100nF</text>
      <text x="355" y="198" fill="#94A3B8" font-family="monospace" font-size="10">.tran 0 10ms</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // 5. 3D Parametric CAD & Mechanical Design (Fusion, FreeCAD, SOLIDWORKS, Onshape, AutoCAD, OpenSCAD)
  if (
    slug.includes('fusion') ||
    slug.includes('freecad') ||
    slug.includes('solidworks') ||
    slug.includes('onshape') ||
    slug.includes('autocad') ||
    slug.includes('openscad')
  ) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
      <rect width="480" height="270" fill="#111827"/>
      <rect x="0" y="0" width="480" height="28" fill="#1F2937"/>
      <circle cx="16" cy="14" r="4" fill="#EF4444"/><circle cx="28" cy="14" r="4" fill="#F59E0B"/><circle cx="40" cy="14" r="4" fill="#10B981"/>
      <text x="56" y="18" fill="#F9FAFB" font-family="monospace" font-size="11" font-weight="bold">${name} — 3D Parametric CAD Viewport</text>
      <rect x="12" y="38" width="110" height="218" rx="6" fill="#1E293B" stroke="#334155"/>
      <text x="22" y="56" fill="#94A3B8" font-family="sans-serif" font-size="9" font-weight="bold">FEATURE TREE</text>
      <text x="22" y="76" fill="#38BDF8" font-family="monospace" font-size="9">▾ Origin (XYZ)</text>
      <text x="22" y="94" fill="#E2E8F0" font-family="monospace" font-size="9">├─ Sketch1 (2D)</text>
      <text x="22" y="112" fill="#E2E8F0" font-family="monospace" font-size="9">├─ Extrude1 (25mm)</text>
      <text x="22" y="130" fill="#E2E8F0" font-family="monospace" font-size="9">├─ Fillet (R3.0)</text>
      <text x="22" y="148" fill="#10B981" font-family="monospace" font-size="9">└─ Hole M4x0.7</text>
      <g transform="translate(290, 148)" stroke="#38BDF8" stroke-width="2" fill="#1D4ED8" fill-opacity="0.25">
        <polygon points="0,-65 95,-20 95,45 0,90 -95,45 -95,-20"/>
        <line x1="0" y1="-65" x2="0" y2="25" stroke="#93C5FD"/>
        <line x1="0" y1="25" x2="95" y2="-20" stroke="#93C5FD"/>
        <line x1="0" y1="25" x2="-95" y2="-20" stroke="#93C5FD"/>
        <ellipse cx="0" cy="-20" rx="28" ry="14" fill="#0F172A" stroke="#F59E0B" stroke-width="2"/>
      </g>
      <text x="290" y="64" text-anchor="middle" fill="#F59E0B" font-family="monospace" font-size="10">⌀ 24.00 mm ±0.05</text>
      <g transform="translate(435, 225)" stroke-width="2">
        <line x1="0" y1="0" x2="22" y2="0" stroke="#EF4444"/><text x="25" y="3" fill="#EF4444" font-family="monospace" font-size="8">X</text>
        <line x1="0" y1="0" x2="0" y2="-22" stroke="#10B981"/><text x="-3" y="-25" fill="#10B981" font-family="monospace" font-size="8">Z</text>
        <line x1="0" y1="0" x2="-15" y2="12" stroke="#3B82F6"/><text x="-24" y="18" fill="#3B82F6" font-family="monospace" font-size="8">Y</text>
      </g>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // 6. FEA / CFD Multipysics Simulation (Ansys, SimScale, OpenFOAM)
  if (slug.includes('ansys') || slug.includes('simscale') || slug.includes('openfoam')) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
      <defs>
        <linearGradient id="feaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#2563EB"/>
          <stop offset="35%" stop-color="#10B981"/>
          <stop offset="70%" stop-color="#F59E0B"/>
          <stop offset="100%" stop-color="#EF4444"/>
        </linearGradient>
      </defs>
      <rect width="480" height="270" fill="#0B1324"/>
      <rect x="0" y="0" width="480" height="28" fill="#162238"/>
      <circle cx="16" cy="14" r="4" fill="#EF4444"/><circle cx="28" cy="14" r="4" fill="#F59E0B"/><circle cx="40" cy="14" r="4" fill="#10B981"/>
      <text x="56" y="18" fill="#F8FAFC" font-family="monospace" font-size="11" font-weight="bold">${name} — FEA / CFD Mesh &amp; Von Mises Stress Contour</text>
      <rect x="24" y="46" width="22" height="190" rx="3" fill="url(#feaGrad)" transform="rotate(90 120 120)" opacity="0"/>
      <rect x="95" y="105" width="290" height="68" rx="12" fill="url(#feaGrad)" stroke="#E2E8F0" stroke-width="1.5"/>
      <g stroke="#0F172A" stroke-width="0.8" opacity="0.55">
        <line x1="135" y1="105" x2="135" y2="173"/><line x1="175" y1="105" x2="175" y2="173"/><line x1="215" y1="105" x2="215" y2="173"/><line x1="255" y1="105" x2="255" y2="173"/><line x1="295" y1="105" x2="295" y2="173"/><line x1="335" y1="105" x2="335" y2="173"/>
        <line x1="95" y1="128" x2="385" y2="128"/><line x1="95" y1="150" x2="385" y2="150"/>
      </g>
      <circle cx="135" cy="139" r="16" fill="#0B1324" stroke="#E2E8F0" stroke-width="1.5"/>
      <circle cx="345" cy="139" r="16" fill="#0B1324" stroke="#EF4444" stroke-width="2"/>
      <text x="240" y="76" text-anchor="middle" fill="#38BDF8" font-family="monospace" font-size="11" font-weight="bold">Max Von Mises Stress: 248.6 MPa (Nodes: 42,810)</text>
      <rect x="95" y="210" width="290" height="14" rx="4" fill="url(#feaGrad)"/>
      <text x="95" y="238" fill="#60A5FA" font-family="monospace" font-size="9">0.0 MPa (Min)</text>
      <text x="385" y="238" text-anchor="end" fill="#F87171" font-family="monospace" font-size="9">250.0 MPa (Max)</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // 7. 3D Printing Slicers & 3D Rendering (Cura, PrusaSlicer, Bambu Studio, Blender)
  if (slug.includes('cura') || slug.includes('prusa') || slug.includes('bambu') || slug.includes('blender')) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
      <rect width="480" height="270" fill="#12161F"/>
      <rect x="0" y="0" width="480" height="28" fill="#1E2433"/>
      <circle cx="16" cy="14" r="4" fill="#EF4444"/><circle cx="28" cy="14" r="4" fill="#F59E0B"/><circle cx="40" cy="14" r="4" fill="#10B981"/>
      <text x="56" y="18" fill="#F8FAFC" font-family="monospace" font-size="11" font-weight="bold">${name} — 3D Build Plate &amp; Toolpath Preview</text>
      <polygon points="240,85 370,145 240,215 110,145" fill="#1E293B" stroke="#475569" stroke-width="1.5"/>
      <g stroke="#F97316" stroke-width="2.2" fill="none">
        <polygon points="240,115 295,142 240,170 185,142" fill="#EA580C" fill-opacity="0.25"/>
        <polygon points="240,98 295,125 240,153 185,125" fill="#F97316" fill-opacity="0.3"/>
        <polygon points="240,82 295,109 240,137 185,109" fill="#FB923C" fill-opacity="0.4" stroke="#FDBA74"/>
      </g>
      <rect x="348" y="42" width="118" height="84" rx="6" fill="#0F172A" stroke="#334155"/>
      <text x="358" y="60" fill="#F59E0B" font-family="monospace" font-size="9" font-weight="bold">SLICE SETTINGS</text>
      <text x="358" y="76" fill="#E2E8F0" font-family="monospace" font-size="9">Layer: 0.20 mm</text>
      <text x="358" y="92" fill="#E2E8F0" font-family="monospace" font-size="9">Infill: 25% Gyroid</text>
      <text x="358" y="108" fill="#34D399" font-family="monospace" font-size="9">Time: 2h 14m (42g)</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // 8. Code Editors, Embedded IDEs & Scientific Computing
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
    <rect width="480" height="270" fill="#0D1117"/>
    <rect x="0" y="0" width="480" height="28" fill="#161B22"/>
    <circle cx="16" cy="14" r="4" fill="#EF4444"/><circle cx="28" cy="14" r="4" fill="#F59E0B"/><circle cx="40" cy="14" r="4" fill="#10B981"/>
    <text x="56" y="18" fill="#E6EDF3" font-family="monospace" font-size="11" font-weight="bold">${name} — Engineering Workspace</text>
    <rect x="12" y="38" width="112" height="218" rx="6" fill="#161B22" stroke="#30363D"/>
    <text x="22" y="56" fill="#8B949E" font-family="sans-serif" font-size="9" font-weight="bold">EXPLORER</text>
    <text x="22" y="76" fill="#58A6FF" font-family="monospace" font-size="9">▾ src/firmware</text>
    <text x="28" y="94" fill="#C9D1D9" font-family="monospace" font-size="9">main.cpp</text>
    <text x="28" y="112" fill="#C9D1D9" font-family="monospace" font-size="9">config.h</text>
    <text x="28" y="130" fill="#3FB950" font-family="monospace" font-size="9">Makefile</text>
    <rect x="134" y="38" width="334" height="150" rx="6" fill="#0D1117" stroke="#30363D"/>
    <text x="148" y="60" fill="#FF7B72" font-family="monospace" font-size="10">// ${name}</text>
    <text x="148" y="78" fill="#79C0FF" font-family="monospace" font-size="10">${subtitle}</text>
    <text x="148" y="102" fill="#D2A8FF" font-family="monospace" font-size="10">int main(void) {</text>
    <text x="164" y="120" fill="#C9D1D9" font-family="monospace" font-size="10">SystemClock_Config();</text>
    <text x="164" y="138" fill="#A5D6FF" font-family="monospace" font-size="10">HAL_Init(); /* Verified */</text>
    <text x="164" y="156" fill="#3FB950" font-family="monospace" font-size="10">return 0;</text>
    <text x="148" y="172" fill="#D2A8FF" font-family="monospace" font-size="10">}</text>
    <rect x="134" y="196" width="334" height="60" rx="6" fill="#161B22" stroke="#30363D"/>
    <text x="148" y="216" fill="#8B949E" font-family="monospace" font-size="9">TERMINAL // BUILD OUTPUT</text>
    <text x="148" y="236" fill="#3FB950" font-family="monospace" font-size="10">✓ Build succeeded — 0 errors, 0 warnings</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getToolLogoUrl(tool: Partial<EngineeringTool>): string {
  if (tool.icon?.trim()) return tool.icon.trim();
  if (tool.officialLogoUrl?.trim()) return tool.officialLogoUrl.trim();
  if (tool.toolType === 'interactive' || tool.category === 'Calculators') {
    if (!tool.officialWebsite) return '/images/logo.png';
  }
  const slug = (tool.slug || '').toLowerCase().trim();
  const name = (tool.name || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (TOOL_OFFICIAL_LOGOS[slug]) return TOOL_OFFICIAL_LOGOS[slug];
  for (const [key, url] of Object.entries(TOOL_OFFICIAL_LOGOS)) {
    if (slug.includes(key) || name.includes(key)) return url;
  }
  if (tool.officialWebsite) {
    try {
      const host = new URL(tool.officialWebsite).hostname;
      if (host) return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
    } catch {
      // ignore invalid URL
    }
  }
  const initials = (tool.name || 'ET').slice(0, 2).toUpperCase();
  return makeToolBrandSvg(initials, '#172D4D');
}

export function getToolHeroImageUrl(tool: Partial<EngineeringTool>): string {
  const customUrl = tool.imageUrl?.trim() || tool.screenshotSourceUrl?.trim();
  if (customUrl && !customUrl.includes('images.unsplash.com')) {
    return customUrl;
  }
  return buildToolInterfaceSvg(tool);
}

export const DEFAULT_ENGINEERING_TOOLS: EngineeringTool[] = [
  // ==========================================
  // TOP 12 FEATURED TOOLS
  // ==========================================
  {
    id: 'tool_kicad',
    name: 'KiCad',
    slug: 'kicad',
    domain: 'Electronics & Embedded',
    category: 'Electronics',
    badge: 'Open Source',
    mainApplication: 'Professional schematic capture & PCB layout design',
    officialWebsite: 'https://www.kicad.org/',
    licenseType: 'Open Source',
    platform: 'Desktop (Windows / Mac / Linux)',
    summary: 'A Cross Platform and Open Source Electronics Design Automation Suite.',
    description: 'KiCad is an open source software suite for Electronic Design Automation (EDA). It facilitates the design and simulation of electronic hardware and complex multi-layer PCBs.',
    toolType: 'software',
    featured: true,
    order: 1,
    tags: ['PCB Design', 'Schematic', 'EDA', 'Open Source', 'Hardware'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_autodesk_fusion',
    name: 'Autodesk Fusion',
    slug: 'autodesk-fusion',
    domain: 'Mechanical & Robotics',
    category: 'Mechanical',
    badge: 'Industry Standard',
    mainApplication: '3D CAD, CAM, product design & manufacturing',
    officialWebsite: 'https://www.autodesk.com/products/fusion-360',
    licenseType: 'Student License',
    platform: 'Desktop (Windows / Mac)',
    summary: 'Cloud-powered 3D CAD, CAM, CAE, and PCB software platform for professional product design.',
    description: 'Autodesk Fusion connects your entire product development process in a unified cloud software tool integrating 3D modeling, generative design, simulation, and CNC machining.',
    toolType: 'software',
    featured: true,
    order: 2,
    tags: ['CAD', 'CAM', '3D Design', 'Manufacturing', 'Autodesk'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_eihouse_lab',
    name: 'EI House Virtual Lab',
    slug: 'eihouse-virtual-lab',
    domain: 'Electronics & Embedded',
    category: 'Electronics',
    badge: 'Interactive Studio',
    mainApplication: 'Arduino, ESP32, 555 Timer & SPICE-grade circuit simulation',
    officialWebsite: '/engineering-lab',
    licenseType: 'Free',
    platform: 'Web Browser',
    summary: 'Simulate microcontrollers, sensors, and electronic parts directly in your browser with 3D breadboard.',
    description: 'EI House Virtual Lab is an online electronics and embedded simulator designed for makers, students, and engineers. Simulate real-time circuits, MNA mathematics, and IoT code.',
    toolType: 'software',
    featured: true,
    order: 3,
    tags: ['EI House', 'Arduino', 'ESP32', 'Circuits', 'Simulator'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_freecad',
    name: 'FreeCAD',
    slug: 'freecad',
    domain: 'Mechanical & Robotics',
    category: 'Mechanical',
    badge: 'Open Source',
    mainApplication: 'Free, open-source parametric 3D CAD modeler',
    officialWebsite: 'https://www.freecad.org/',
    licenseType: 'Open Source',
    platform: 'Desktop (Windows / Mac / Linux)',
    summary: 'An open-source parametric 3D modeler made primarily to design real-life objects of any size.',
    description: 'Parametric modeling allows you to easily modify your design by going back into your model history and changing its parameters. Highly modular with Python scripting.',
    toolType: 'software',
    featured: true,
    order: 4,
    tags: ['Parametric CAD', '3D Modeling', 'Open Source', 'FEM'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_ansys',
    name: 'Ansys',
    slug: 'ansys',
    domain: 'Mechanical & Robotics',
    category: 'Simulation',
    badge: 'Simulation Leader',
    mainApplication: 'Structural, thermal, fluid and electromagnetic simulation',
    officialWebsite: 'https://www.ansys.com/',
    licenseType: 'Commercial / Paid',
    platform: 'Desktop (Windows / Linux)',
    summary: 'World-renowned engineering simulation software for finite element analysis and CFD.',
    description: 'Ansys provides comprehensive simulation software spanning structures, fluids, electromagnetics, and optical physics. Free student editions are available for academic learning.',
    toolType: 'software',
    featured: true,
    order: 5,
    tags: ['FEA', 'CFD', 'Thermal', 'Stress Analysis', 'Simulation'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_vscode',
    name: 'Visual Studio Code',
    slug: 'vs-code',
    domain: 'Computer Science & IT',
    category: 'Programming',
    badge: 'Top Code Editor',
    mainApplication: 'Programming, code editing, extensions & debugging',
    officialWebsite: 'https://code.visualstudio.com/',
    licenseType: 'Free',
    platform: 'Desktop (Windows / Mac / Linux)',
    summary: 'Streamlined code editor with support for development operations like debugging, task running, and version control.',
    description: 'VS Code is the gold standard lightweight code editor featuring built-in Git, rich extension ecosystem for C/C++, Python, Rust, PlatformIO for embedded devices, and web technologies.',
    toolType: 'software',
    featured: true,
    order: 6,
    tags: ['Code Editor', 'Debugging', 'PlatformIO', 'C++', 'Python'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_ltspice',
    name: 'LTspice',
    slug: 'ltspice',
    domain: 'Electronics & Embedded',
    category: 'Simulation',
    badge: 'Analog SPICE',
    mainApplication: 'Analog, transistor, MOSFET & power circuit simulation',
    officialWebsite: 'https://www.analog.com/en/resources/design-tools-and-calculators/ltspice-simulator.html',
    licenseType: 'Free',
    platform: 'Desktop (Windows / Mac)',
    summary: 'High-performance SPICE simulation software, schematic capture, and waveform viewer with enhancements for switching regulators.',
    description: 'LTspice is a powerful, fast, and free SPICE simulator developed by Analog Devices for simulating analog circuits, power converters, audio stages, and semiconductor models.',
    toolType: 'software',
    featured: true,
    order: 7,
    tags: ['SPICE', 'Analog', 'Simulation', 'Power Circuits', 'MOSFET'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_solidworks',
    name: 'SOLIDWORKS',
    slug: 'solidworks',
    domain: 'Mechanical & Robotics',
    category: 'Mechanical',
    badge: 'Industry Benchmark',
    mainApplication: 'Mechanical design, complex parts & assemblies',
    officialWebsite: 'https://www.solidworks.com/',
    licenseType: 'Commercial / Paid',
    platform: 'Desktop (Windows)',
    summary: 'Industry-leading 3D CAD design, simulation, and product data management software.',
    description: 'Dassault Systèmes SOLIDWORKS delivers intuitive 3D design and engineering solutions to create, simulate, publish, and manage engineering data across global manufacturing teams.',
    toolType: 'software',
    featured: true,
    order: 8,
    tags: ['Mechanical CAD', 'Assemblies', 'Drawings', 'Manufacturing'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_matlab_simulink',
    name: 'MATLAB & Simulink',
    slug: 'matlab-simulink',
    domain: 'Computer Science & IT',
    category: 'Simulation',
    badge: 'Scientific Computing',
    mainApplication: 'Mathematical modelling, control systems & simulation',
    officialWebsite: 'https://www.mathworks.com/products/matlab.html',
    licenseType: 'Commercial / Paid',
    platform: 'Desktop & Cloud',
    summary: 'The leading programming platform designed specifically for engineers and scientists to analyze data, develop algorithms, and create models.',
    description: 'MATLAB combines a desktop environment tuned for iterative analysis and design with a programming language that expresses matrix and array mathematics directly. Simulink enables block-diagram simulation of dynamic systems.',
    toolType: 'software',
    featured: true,
    order: 9,
    tags: ['MathWorks', 'DSP', 'Control Systems', 'Simulation', 'Algorithms'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_cisco_packet_tracer',
    name: 'Cisco Packet Tracer',
    slug: 'cisco-packet-tracer',
    domain: 'Networking & IoT',
    category: 'IT & Networking',
    badge: 'Network Simulation',
    mainApplication: 'Network design, routing, switching & protocol simulation',
    officialWebsite: 'https://www.netacad.com/courses/packet-tracer',
    licenseType: 'Free',
    platform: 'Desktop (Windows / Mac / Linux)',
    summary: 'Interactive network simulation and visualization tool developed by Cisco Networking Academy.',
    description: 'Packet Tracer enables students and engineers to simulate modern computer networks, configure routers, switches, access points, and IoT smart cities with real packet inspections.',
    toolType: 'software',
    featured: true,
    order: 10,
    tags: ['Networking', 'Cisco', 'CCNA', 'Routing', 'Switching', 'IoT'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_blender',
    name: 'Blender',
    slug: 'blender',
    domain: 'Mechanical & Robotics',
    category: 'Mechanical',
    badge: 'Open Source',
    mainApplication: '3D modelling, rendering, animation and visualization',
    officialWebsite: 'https://www.blender.org/',
    licenseType: 'Open Source',
    platform: 'Desktop (Windows / Mac / Linux)',
    summary: 'The free and open-source 3D creation suite supporting the entire 3D pipeline.',
    description: 'Blender supports modeling, rigging, animation, simulation, rendering, compositing and motion tracking, video editing and 2D animation pipeline. Great for engineering product renders.',
    toolType: 'software',
    featured: true,
    order: 11,
    tags: ['3D Modeling', 'Rendering', 'Raytracing', 'Animation'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_docker',
    name: 'Docker',
    slug: 'docker',
    domain: 'Computer Science & IT',
    category: 'Programming',
    badge: 'DevOps & Containers',
    mainApplication: 'Application containers and reproducible dev environments',
    officialWebsite: 'https://www.docker.com/',
    licenseType: 'Freemium',
    platform: 'Desktop & Server',
    summary: 'Accelerate how you build, share, and run modern applications across development and production.',
    description: 'Docker isolates software into lightweight, self-contained containers containing code, runtime, system tools, and libraries, ensuring identical behavior across any workstation or cloud host.',
    toolType: 'software',
    featured: true,
    order: 12,
    tags: ['Containers', 'DevOps', 'Microservices', 'Deployment'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ==========================================
  // 1. ELECTRONICS, ELECTRICAL & EMBEDDED
  // ==========================================
  {
    id: 'tool_tinkercad',
    name: 'Tinkercad',
    slug: 'tinkercad',
    domain: 'Electronics & Embedded',
    category: 'Electronics',
    badge: 'Beginner Friendly',
    mainApplication: 'Beginner electronics, Arduino & 3D design',
    officialWebsite: 'https://www.tinkercad.com/',
    licenseType: 'Free',
    platform: 'Web Browser',
    summary: 'Free web-based tool for learning circuits, Arduino coding, and introductory 3D design.',
    description: 'Autodesk Tinkercad circuits simulator lets beginners visually wire breadboards, LEDs, microcontrollers, and test virtual code with zero physical risk.',
    toolType: 'software',
    featured: false,
    order: 13,
    tags: ['Arduino', 'Breadboard', 'Beginner', 'Autodesk', 'Circuits'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_easyeda',
    name: 'EasyEDA',
    slug: 'easyeda',
    domain: 'Electronics & Embedded',
    category: 'Electronics',
    badge: 'Web & Desktop',
    mainApplication: 'Circuit design, simulation & PCB layout',
    officialWebsite: 'https://easyeda.com/',
    licenseType: 'Free',
    platform: 'Web Browser',
    summary: 'An easier and powerful online PCB design tool integrated with LCSC electronic components.',
    description: 'EasyEDA provides schematic capture, SPICE simulation, and PCB layout directly in the web browser, seamlessly linked with JLCPCB manufacturing and SMT assembly services.',
    toolType: 'software',
    featured: false,
    order: 14,
    tags: ['PCB Design', 'Schematics', 'JLCPCB', 'Cloud EDA'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_proteus',
    name: 'Proteus Design Suite',
    slug: 'proteus',
    domain: 'Electronics & Embedded',
    category: 'Electronics',
    badge: 'Microcontroller Sim',
    mainApplication: 'Electronics & microcontroller interactive simulation',
    officialWebsite: 'https://www.labcenter.com/',
    licenseType: 'Commercial / Paid',
    platform: 'Desktop (Windows)',
    summary: 'Combines schematic capture, VSM microcontroller simulation, and PCB design in one cohesive tool.',
    description: 'Proteus VSM allows interactive real-time simulation of microcontrollers (PIC, 8051, AVR, ARM) running actual compiled firmware connected to realistic peripherals.',
    toolType: 'software',
    featured: false,
    order: 15,
    tags: ['Proteus', 'Microcontroller', 'Simulation', 'PIC', '8051'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_altium',
    name: 'Altium Designer',
    slug: 'altium-designer',
    domain: 'Electronics & Embedded',
    category: 'Electronics',
    badge: 'High-Speed PCB',
    mainApplication: 'Advanced multi-layer PCB design and development',
    officialWebsite: 'https://www.altium.com/',
    licenseType: 'Commercial / Paid',
    platform: 'Desktop (Windows)',
    summary: 'World standard high-end electronic design automation software for enterprise PCB development.',
    description: 'Altium Designer unifies schematic, PCB layout, FPGA design, signal integrity analysis, high-speed routing, and MCAD co-design into a single cohesive platform.',
    toolType: 'software',
    featured: false,
    order: 16,
    tags: ['High-Speed PCB', 'Differential Pairs', 'Altium 365', 'EDA'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_qelectrotech',
    name: 'QElectroTech',
    slug: 'qelectrotech',
    domain: 'Electronics & Embedded',
    category: 'Electronics',
    badge: 'Open Source',
    mainApplication: 'Electrical wiring and control panel diagrams',
    officialWebsite: 'https://qelectrotech.org/',
    licenseType: 'Open Source',
    platform: 'Desktop (Windows / Mac / Linux)',
    summary: 'Open source application designed to create electrical, pneumatic, hydraulic, and electronic schematics.',
    description: 'QElectroTech provides rich element libraries for industrial control cabinets, automation single-line diagrams, and terminal block management.',
    toolType: 'software',
    featured: false,
    order: 17,
    tags: ['Electrical Wiring', 'Control Panel', 'Pneumatics', 'Open Source'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_factory_io',
    name: 'Factory I/O',
    slug: 'factory-io',
    domain: 'Electronics & Embedded',
    category: 'Simulation',
    badge: 'PLC Automation',
    mainApplication: 'Industrial automation and PLC 3D simulation',
    officialWebsite: 'https://factoryio.com/',
    licenseType: 'Commercial / Paid',
    platform: 'Desktop (Windows)',
    summary: 'Real-time 3D factory simulation for learning automation and PLC programming.',
    description: 'Factory I/O turns your PC into a virtual automation plant with industrial parts (conveyors, elevators, sensors, pick-and-place) controllable via Siemens, Allen-Bradley, or Modbus PLCs.',
    toolType: 'software',
    featured: false,
    order: 18,
    tags: ['PLC', 'Automation', 'Siemens', 'Modbus', 'Industrial 3D'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_arduino_ide',
    name: 'Arduino IDE',
    slug: 'arduino-ide',
    domain: 'Electronics & Embedded',
    category: 'Electronics',
    badge: 'Open Source',
    mainApplication: 'Embedded programming and Arduino development',
    officialWebsite: 'https://www.arduino.cc/en/software',
    licenseType: 'Open Source',
    platform: 'Desktop (Windows / Mac / Linux)',
    summary: 'The open-source Arduino Software (IDE) makes it easy to write code and upload it to the board.',
    description: 'Arduino IDE 2.x features autocompletion, code navigation, integrated debugger, and serial plotter for prototyping on hundreds of supported microcontrollers.',
    toolType: 'software',
    featured: false,
    order: 19,
    tags: ['Arduino', 'C++', 'Microcontrollers', 'Firmware', 'Open Source'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_stm32cubeide',
    name: 'STM32CubeIDE',
    slug: 'stm32cubeide',
    domain: 'Electronics & Embedded',
    category: 'Electronics',
    badge: 'ARM Cortex-M',
    mainApplication: 'STM32 microcontroller development & debugging',
    officialWebsite: 'https://www.st.com/en/development-tools/stm32cubeide.html',
    licenseType: 'Free',
    platform: 'Desktop (Windows / Mac / Linux)',
    summary: 'All-in-one multi-OS development tool for STM32 microcontrollers and microprocessors.',
    description: 'Integrated development environment based on Eclipse and GNU C/C++ toolchains, including STM32CubeMX peripheral configuration, pinout mapping, and advanced hardware tracing.',
    toolType: 'software',
    featured: false,
    order: 20,
    tags: ['STM32', 'ARM Cortex', 'Embedded C', 'HAL Drivers', 'STMicroelectronics'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ==========================================
  // 2. MECHANICAL ENGINEERING, CAD & 3D DESIGN
  // ==========================================
  {
    id: 'tool_onshape',
    name: 'Onshape',
    slug: 'onshape',
    domain: 'Mechanical & Robotics',
    category: 'Mechanical',
    badge: 'Cloud CAD',
    mainApplication: 'Browser-based 3D CAD and multi-user collaboration',
    officialWebsite: 'https://www.onshape.com/',
    licenseType: 'Freemium',
    platform: 'Web Browser',
    summary: 'The only complete cloud-native product development platform uniting CAD, data management, and real-time collaboration.',
    description: 'Runs entirely in any web browser without installation. Provides parametric part studios, assemblies, sheet metal tools, and version control for mechanical design teams.',
    toolType: 'software',
    featured: false,
    order: 21,
    tags: ['Cloud CAD', 'Browser CAD', 'Collaboration', 'PTC'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_autocad',
    name: 'AutoCAD',
    slug: 'autocad',
    domain: 'Mechanical & Robotics',
    category: 'Mechanical',
    badge: '2D/3D Drafting',
    mainApplication: '2D drafting and precise engineering drawings',
    officialWebsite: 'https://www.autodesk.com/products/autocad',
    licenseType: 'Commercial / Paid',
    platform: 'Desktop (Windows / Mac)',
    summary: 'Computer-aided design (CAD) software trusted by architects, engineers, and construction professionals.',
    description: 'AutoCAD is the industry benchmark for generating 2D geometry, fabrication blueprints, architectural elevations, and DWG/DXF drawings with automated documentation tools.',
    toolType: 'software',
    featured: false,
    order: 22,
    tags: ['2D Drafting', 'Blueprints', 'DWG', 'Autodesk'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_openscad',
    name: 'OpenSCAD',
    slug: 'openscad',
    domain: 'Mechanical & Robotics',
    category: 'Mechanical',
    badge: 'Code CAD',
    mainApplication: 'Code-based parametric 3D CAD modeling',
    officialWebsite: 'https://openscad.org/',
    licenseType: 'Open Source',
    platform: 'Desktop (Windows / Mac / Linux)',
    summary: 'The programmers solid 3D CAD modeler that uses a script file to describe the object.',
    description: 'Instead of an interactive artistic editor, OpenSCAD reads textual code describing constructive solid geometry (CSG). Ideal for parametric 3D printable mechanical parts.',
    toolType: 'software',
    featured: false,
    order: 23,
    tags: ['Scripted CAD', 'Code-based 3D', '3D Printing', 'Open Source'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_simscale',
    name: 'SimScale',
    slug: 'simscale',
    domain: 'Mechanical & Robotics',
    category: 'Simulation',
    badge: 'Cloud CFD & FEA',
    mainApplication: 'Cloud-based CFD, FEA and thermal simulation',
    officialWebsite: 'https://www.simscale.com/',
    licenseType: 'Freemium',
    platform: 'Cloud / SaaS',
    summary: 'Cloud-based CAE platform that delivers instant access to CFD, FEA, and thermal analysis.',
    description: 'Perform complex aerodynamic flow simulations, thermal heat-sink analysis, and structural stresses completely in the cloud powered by parallel supercomputing clusters.',
    toolType: 'software',
    featured: false,
    order: 24,
    tags: ['CFD', 'FEA', 'Cloud Simulation', 'Thermodynamics'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_openfoam',
    name: 'OpenFOAM',
    slug: 'openfoam',
    domain: 'Mechanical & Robotics',
    category: 'Simulation',
    badge: 'Open Source CFD',
    mainApplication: 'Computational Fluid Dynamics (CFD) simulation',
    officialWebsite: 'https://www.openfoam.com/',
    licenseType: 'Open Source',
    platform: 'Desktop (Windows / Mac / Linux)',
    summary: 'The leading free, open source computational fluid dynamics (CFD) software package.',
    description: 'OpenFOAM has an extensive range of features to solve anything from complex fluid flows involving chemical reactions, turbulence, and heat transfer, to acoustics and solid mechanics.',
    toolType: 'software',
    featured: false,
    order: 25,
    tags: ['CFD', 'Fluid Dynamics', 'Aerodynamics', 'Open Source'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ==========================================
  // 3. 3D PRINTING & MANUFACTURING
  // ==========================================
  {
    id: 'tool_ultimaker_cura',
    name: 'UltiMaker Cura',
    slug: 'ultimaker-cura',
    domain: '3D Printing & CAD',
    category: '3D Printing',
    badge: 'Open Source Slicer',
    mainApplication: '3D printing preparation and G-code slicing',
    officialWebsite: 'https://ultimaker.com/software/ultimaker-cura/',
    licenseType: 'Open Source',
    platform: 'Desktop (Windows / Mac / Linux)',
    summary: 'Trusted by millions of users, UltiMaker Cura is the worlds most popular 3D printing slicing software.',
    description: 'Transform your 3D CAD models into optimized G-code toolpaths with over 400 granular slicing parameters, dynamic infill, tree supports, and integration with hundreds of 3D printers.',
    toolType: 'software',
    featured: false,
    order: 26,
    tags: ['Slicer', 'G-code', '3D Printing', 'FDM', 'UltiMaker'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_prusaslicer',
    name: 'PrusaSlicer',
    slug: 'prusaslicer',
    domain: '3D Printing & CAD',
    category: '3D Printing',
    badge: 'High Performance',
    mainApplication: '3D printing preparation and multi-material slicing',
    officialWebsite: 'https://www.prusa3d.com/page/prusaslicer_424/',
    licenseType: 'Open Source',
    platform: 'Desktop (Windows / Mac / Linux)',
    summary: 'Feature-rich, frequently updated open-source slicing tool for FDM and SLA 3D printers.',
    description: 'PrusaSlicer offers advanced support painting, seam customization, organic tree supports, variable layer heights, and multi-material color printing optimizations.',
    toolType: 'software',
    featured: false,
    order: 27,
    tags: ['Prusa', 'Slicer', 'FDM', 'SLA', 'Open Source'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_bambu_studio',
    name: 'Bambu Studio',
    slug: 'bambu-studio',
    domain: '3D Printing & CAD',
    category: '3D Printing',
    badge: 'Modern Slicer',
    mainApplication: 'High-speed 3D printing and multi-color printer preparation',
    officialWebsite: 'https://bambulab.com/en/download/studio',
    licenseType: 'Open Source',
    platform: 'Desktop (Windows / Mac)',
    summary: 'All-in-one slicing software designed for high-speed multi-color 3D printing workflows.',
    description: 'Bambu Studio brings project-based workflows, multi-plate management, remote camera monitoring, and smart automatic calibration routines for high-speed modern 3D printers.',
    toolType: 'software',
    featured: false,
    order: 28,
    tags: ['Bambu Lab', 'High-Speed 3D', 'Multi-color', 'AMS'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ==========================================
  // 4. COMPUTER SCIENCE & PROGRAMMING
  // ==========================================
  {
    id: 'tool_github',
    name: 'GitHub',
    slug: 'github',
    domain: 'Computer Science & IT',
    category: 'Programming',
    badge: 'Collaboration',
    mainApplication: 'Code hosting, version control & team collaboration',
    officialWebsite: 'https://github.com/',
    licenseType: 'Freemium',
    platform: 'Cloud / SaaS',
    summary: 'The world’s largest platform for software development, code hosting, and open-source collaboration.',
    description: 'GitHub provides distributed Git version control, pull request code reviews, GitHub Actions CI/CD pipelines, issue tracking, and GitHub Codespaces for developer teams.',
    toolType: 'software',
    featured: false,
    order: 29,
    tags: ['Git', 'CI/CD', 'Open Source', 'Collaboration', 'Cloud'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_python',
    name: 'Python',
    slug: 'python',
    domain: 'Computer Science & IT',
    category: 'Programming',
    badge: 'Essential Language',
    mainApplication: 'Programming, automation, AI, robotics & data science',
    officialWebsite: 'https://www.python.org/',
    licenseType: 'Open Source',
    platform: 'Cross-Platform',
    summary: 'High-level programming language that lets you work quickly and integrate systems more effectively.',
    description: 'Python is ubiquitous across modern engineering, scientific computing (NumPy, SciPy), machine learning (TensorFlow, PyTorch), hardware scripting (MicroPython), and automation.',
    toolType: 'software',
    featured: false,
    order: 30,
    tags: ['Python', 'AI', 'Automation', 'Data Science', 'MicroPython'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_jupyter',
    name: 'JupyterLab & Notebooks',
    slug: 'jupyter',
    domain: 'Computer Science & IT',
    category: 'Programming',
    badge: 'Interactive Data',
    mainApplication: 'Interactive programming and data analysis',
    officialWebsite: 'https://jupyter.org/',
    licenseType: 'Open Source',
    platform: 'Web Browser',
    summary: 'Web-based interactive development environment for notebooks, code, and data visualizations.',
    description: 'Project Jupyter creates open-source software, open standards, and services for interactive computing across dozens of programming languages like Python, Julia, and R.',
    toolType: 'software',
    featured: false,
    order: 31,
    tags: ['Jupyter', 'Notebooks', 'Data Analysis', 'Interactive Python'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_google_colab',
    name: 'Google Colab',
    slug: 'google-colab',
    domain: 'Computer Science & IT',
    category: 'Programming',
    badge: 'Free Cloud GPU',
    mainApplication: 'Cloud-based Python and machine learning with GPU access',
    officialWebsite: 'https://colab.research.google.com/',
    licenseType: 'Free',
    platform: 'Web Browser',
    summary: 'Hosted Jupyter notebook service that requires no setup and provides free access to computing resources including GPUs.',
    description: 'Google Colaboratory allows anybody to write and execute arbitrary Python code through the browser, especially suited to machine learning, deep neural nets, and data analysis.',
    toolType: 'software',
    featured: false,
    order: 32,
    tags: ['Google', 'Cloud GPU', 'Machine Learning', 'Deep Learning'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_git',
    name: 'Git',
    slug: 'git',
    domain: 'Computer Science & IT',
    category: 'Programming',
    badge: 'Version Control',
    mainApplication: 'Distributed source code version control',
    officialWebsite: 'https://git-scm.com/',
    licenseType: 'Open Source',
    platform: 'Cross-Platform',
    summary: 'Fast, scalable, distributed revision control system with an unusually rich command set.',
    description: 'Git is the foundational revision control system designed to handle everything from small to very large projects with speed, integrity, and non-linear branching workflows.',
    toolType: 'software',
    featured: false,
    order: 33,
    tags: ['Git', 'CLI', 'Version Control', 'Open Source'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ==========================================
  // 5. IT, NETWORKING & CYBERSECURITY
  // ==========================================
  {
    id: 'tool_wireshark',
    name: 'Wireshark',
    slug: 'wireshark',
    domain: 'Networking & IoT',
    category: 'IT & Networking',
    badge: 'Packet Inspection',
    mainApplication: 'Network traffic analysis and protocol troubleshooting',
    officialWebsite: 'https://www.wireshark.org/',
    licenseType: 'Open Source',
    platform: 'Desktop (Windows / Mac / Linux)',
    summary: 'The world’s foremost and widely-used network protocol analyzer for deep packet inspection.',
    description: 'Capture and browse network traffic running on a computer network. Indispensable for debugging Ethernet, WiFi, TCP/IP, MQTT, and industrial communication protocols.',
    toolType: 'software',
    featured: false,
    order: 34,
    tags: ['Wireshark', 'Packet Sniffer', 'Networking', 'Cybersecurity'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_virtualbox',
    name: 'Oracle VM VirtualBox',
    slug: 'virtualbox',
    domain: 'Computer Science & IT',
    category: 'IT & Networking',
    badge: 'Open Hypervisor',
    mainApplication: 'Virtual machines and multi-operating system testing',
    officialWebsite: 'https://www.virtualbox.org/',
    licenseType: 'Open Source',
    platform: 'Desktop (Windows / Mac / Linux)',
    summary: 'Powerful x86 and AMD64/Intel64 virtualization software for enterprise as well as home use.',
    description: 'VirtualBox runs multiple operating systems (Linux, Windows, BSD) concurrently on a single host machine, allowing isolated testing, malware sandboxing, and legacy OS compatibility.',
    toolType: 'software',
    featured: false,
    order: 35,
    tags: ['Virtualization', 'VM', 'Linux on Windows', 'Hypervisor'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_ubuntu',
    name: 'Ubuntu Linux',
    slug: 'ubuntu',
    domain: 'Computer Science & IT',
    category: 'IT & Networking',
    badge: 'Linux Benchmark',
    mainApplication: 'Linux operating system and engineering development environment',
    officialWebsite: 'https://ubuntu.com/',
    licenseType: 'Open Source',
    platform: 'Desktop (Windows / Mac / Linux)',
    summary: 'The open-source operating system that powers millions of desktops, cloud servers, and robotics ROS stacks worldwide.',
    description: 'Ubuntu is the premier Linux distribution for engineering, robotics (ROS2), artificial intelligence, container clusters, and embedded Linux system development.',
    toolType: 'software',
    featured: false,
    order: 36,
    tags: ['Linux', 'Ubuntu', 'OS', 'ROS', 'Server'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_nmap',
    name: 'Nmap',
    slug: 'nmap',
    domain: 'Networking & IoT',
    category: 'IT & Networking',
    badge: 'Security Scanner',
    mainApplication: 'Network discovery and security auditing',
    officialWebsite: 'https://nmap.org/',
    licenseType: 'Open Source',
    platform: 'Cross-Platform',
    summary: 'Network exploration tool and security / port scanner used by security professionals worldwide.',
    description: 'Nmap uses raw IP packets to discover active hosts on a network, open ports, running services (application name and version), operating systems, and firewall configurations.',
    toolType: 'software',
    featured: false,
    order: 37,
    tags: ['Port Scanner', 'Cybersecurity', 'Network Audit', 'Nmap'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_postman',
    name: 'Postman',
    slug: 'postman',
    domain: 'Computer Science & IT',
    category: 'IT & Networking',
    badge: 'API Testing',
    mainApplication: 'API development, automated testing & documentation',
    officialWebsite: 'https://www.postman.com/',
    licenseType: 'Freemium',
    platform: 'Desktop & Web',
    summary: 'An API platform for building and using APIs, simplifying each step of the API lifecycle.',
    description: 'Postman accelerates REST, GraphQL, and WebSocket API design, automated test script writing, mock server creation, and environment variable synchronization.',
    toolType: 'software',
    featured: false,
    order: 38,
    tags: ['API', 'REST', 'Testing', 'Endpoints', 'Postman'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ==========================================
  // 6. ENGINEERING CALCULATORS & EXTERNAL RESOURCES
  // ==========================================
  {
    id: 'tool_digikey_calc',
    name: 'DigiKey Conversion Calculators',
    slug: 'digikey-calculators',
    domain: 'Electronics & Embedded',
    category: 'Calculators',
    badge: 'Component Formulas',
    mainApplication: 'Electronics component calculations & conversions',
    officialWebsite: 'https://www.digikey.in/en/resources/conversion-calculators',
    licenseType: 'Free',
    platform: 'Web Browser',
    summary: 'Extensive suite of online calculators for electrical and electronic components and equations.',
    description: 'Free engineering calculators from DigiKey covering battery life, trace width, SMD resistor codes, capacitance, attenuator pads, and unit conversions.',
    toolType: 'external',
    featured: false,
    order: 39,
    tags: ['DigiKey', 'Calculators', 'Electronics', 'Conversions'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_wolfram_alpha',
    name: 'WolframAlpha',
    slug: 'wolfram-alpha',
    domain: 'General Engineering',
    category: 'Calculators',
    badge: 'Computational Engine',
    mainApplication: 'Mathematics and engineering computational intelligence',
    officialWebsite: 'https://www.wolframalpha.com/',
    licenseType: 'Freemium',
    platform: 'Web Browser',
    summary: 'Compute expert-level answers using Wolframs breakthrough algorithms, knowledgebase, and AI technology.',
    description: 'Compute differential equations, Laplace transforms, structural beam deflections, fluid dynamics formulas, thermodynamics, and chemical reactions step-by-step.',
    toolType: 'external',
    featured: false,
    order: 40,
    tags: ['Calculus', 'Math', 'Physics', 'Engineering Math', 'Wolfram'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ==========================================
  // BUILT-IN INTERACTIVE SOLVERS (UNDER CALCULATORS)
  // ==========================================
  {
    id: 'tool_ohms_law',
    name: "Ohm's Law & DC Power Solver",
    slug: 'ohms-law-calculator',
    domain: 'Electronics & Embedded',
    category: 'Calculators',
    badge: 'Interactive Solver',
    mainApplication: 'Calculate V, I, R, and Power with step-by-step formulas',
    officialWebsite: '',
    licenseType: 'Free',
    platform: 'Web Browser',
    summary: 'Instantly calculate Voltage (V), Current (I), Resistance (R), and Power (P) with step-by-step formulas.',
    description: 'Fundamental calculation tool for electrical circuits. Enter any two known parameters to compute the remaining values.',
    toolType: 'interactive',
    calculatorKey: 'ohms-law',
    featured: false,
    order: 41,
    tags: ['Voltage', 'Current', 'Resistance', 'Power', 'Ohm'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_resistor_color',
    name: 'Resistor Color Code Decoder',
    slug: 'resistor-color-code',
    domain: 'Electronics & Embedded',
    category: 'Calculators',
    badge: 'Interactive Solver',
    mainApplication: '4-band and 5-band color ring visual value decoder',
    officialWebsite: '',
    licenseType: 'Free',
    platform: 'Web Browser',
    summary: '4-band and 5-band color ring decoder with visual color bands, nominal values, and tolerance ranges.',
    description: 'Quickly decode color-band markings on through-hole carbon film and metal film resistors to find exact resistance values, multiplier, and tolerance percentage.',
    toolType: 'interactive',
    calculatorKey: 'resistor-color-code',
    featured: false,
    order: 42,
    tags: ['Resistor', 'Color Code', '4-Band', '5-Band', 'Tolerance'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_voltage_divider',
    name: 'Voltage Divider Calculator',
    slug: 'voltage-divider-calculator',
    domain: 'Electronics & Embedded',
    category: 'Calculators',
    badge: 'Interactive Solver',
    mainApplication: 'Calculate output voltage, resistor ratios & ADC scaling',
    officialWebsite: '',
    licenseType: 'Free',
    platform: 'Web Browser',
    summary: 'Calculate output voltage, resistor ratios, and loaded divider voltages for ADC level shifting.',
    description: 'Design resistive voltage divider networks for sensor interfacing, ADC reference scaling, and level-shifting between 5V and 3.3V logic systems.',
    toolType: 'interactive',
    calculatorKey: 'voltage-divider',
    featured: false,
    order: 43,
    tags: ['Voltage Divider', 'ADC', 'Sensors', 'Level Shift'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_led_resistor',
    name: 'LED Series Current Limiting Resistor',
    slug: 'led-series-resistor',
    domain: 'Electronics & Embedded',
    category: 'Calculators',
    badge: 'Interactive Solver',
    mainApplication: 'Determine required series resistor & wattage for LEDs',
    officialWebsite: '',
    licenseType: 'Free',
    platform: 'Web Browser',
    summary: 'Determine required series resistor and wattage for single or series LEDs based on forward voltage and current.',
    description: 'Calculates the ideal current-limiting resistor to protect LEDs from over-current destruction, with recommended E12/E24 standard values.',
    toolType: 'interactive',
    calculatorKey: 'led-resistor',
    featured: false,
    order: 44,
    tags: ['LED', 'Resistor', 'Optoelectronics', 'Wattage'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_555_timer',
    name: '555 Timer Astable Multivibrator Calculator',
    slug: '555-timer-astable',
    domain: 'Electronics & Embedded',
    category: 'Calculators',
    badge: 'Interactive Solver',
    mainApplication: 'Frequency, Duty Cycle, T_high, and T_low generator',
    officialWebsite: '',
    licenseType: 'Free',
    platform: 'Web Browser',
    summary: 'Calculate oscillation frequency, duty cycle, high/low times for standard NE555 astable timer circuits.',
    description: 'Enter R1, R2, and capacitor C to compute oscillation frequency in Hertz, high time (Th), low time (Tl), and duty cycle percentage.',
    toolType: 'interactive',
    calculatorKey: '555-timer',
    featured: false,
    order: 45,
    tags: ['555 Timer', 'Oscillator', 'PWM', 'Clock Generator'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_pcb_trace',
    name: 'PCB Trace Width & Current Capacity (IPC-2221)',
    slug: 'pcb-trace-width',
    domain: 'Electronics & Embedded',
    category: 'Calculators',
    badge: 'Interactive Solver',
    mainApplication: 'IPC-2221 trace width, temperature rise & copper ounce sizing',
    officialWebsite: '',
    licenseType: 'Free',
    platform: 'Web Browser',
    summary: 'Compute required PCB copper trace width for internal and external layers to safely carry target current.',
    description: 'Based on the IPC-2221 standard equations, calculate copper cross-sectional area and minimum trace width given target current, allowed temperature rise, and copper thickness.',
    toolType: 'interactive',
    calculatorKey: 'pcb-trace',
    featured: false,
    order: 46,
    tags: ['PCB', 'Trace Width', 'IPC-2221', 'Current Capacity', 'Hardware'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_motor_torque',
    name: 'Motor Torque, Speed & Mechanical Power',
    slug: 'motor-torque-power',
    domain: 'Mechanical & Robotics',
    category: 'Calculators',
    badge: 'Interactive Solver',
    mainApplication: 'Compute RPM, Torque (Nm), Watts and Horsepower (HP)',
    officialWebsite: '',
    licenseType: 'Free',
    platform: 'Web Browser',
    summary: 'Convert and solve rotational mechanical power, torque in Newton-meters (N·m), RPM, and horsepower (HP).',
    description: 'Essential for robotics motor sizing, conveyor drives, and CNC spindle selection. Uses standard angular velocity relationships P = (2π * N * T) / 60.',
    toolType: 'interactive',
    calculatorKey: 'motor-torque',
    featured: false,
    order: 47,
    tags: ['Torque', 'RPM', 'Motor Sizing', 'Horsepower', 'Robotics'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_gear_ratio',
    name: 'Gear Ratio, Output RPM & Torque Multiplier',
    slug: 'gear-ratio-calculator',
    domain: 'Mechanical & Robotics',
    category: 'Calculators',
    badge: 'Interactive Solver',
    mainApplication: 'Calculate gear reduction, output speed, and output torque',
    officialWebsite: '',
    licenseType: 'Free',
    platform: 'Web Browser',
    summary: 'Calculate transmission gear ratios, final output RPM, and multiplied output torque taking gearbox efficiency into account.',
    description: 'Compute speed reduction and torque amplification across spur gear pairs, planetary gearboxes, or timing belt pulley drives.',
    toolType: 'interactive',
    calculatorKey: 'gear-ratio',
    featured: false,
    order: 48,
    tags: ['Gear Ratio', 'Transmission', 'Torque Multiplication', 'Mechanisms'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_cylinder_force',
    name: 'Pneumatic & Hydraulic Cylinder Push/Pull Force',
    slug: 'cylinder-force-calculator',
    domain: 'Mechanical & Robotics',
    category: 'Calculators',
    badge: 'Interactive Solver',
    mainApplication: 'Cylinder bore, rod diameter and operating pressure force',
    officialWebsite: '',
    licenseType: 'Free',
    platform: 'Web Browser',
    summary: 'Calculate extend (push) and retract (pull) forces in Newtons and Kilograms-force based on bore size and line pressure.',
    description: 'Calculates active piston face area for extension and net annular area (piston area minus rod area) for retraction under operating pressure.',
    toolType: 'interactive',
    calculatorKey: 'cylinder-force',
    featured: false,
    order: 49,
    tags: ['Pneumatics', 'Hydraulics', 'Actuators', 'Cylinder Force'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_base64_url',
    name: 'Base64 & URL String Encoder / Decoder',
    slug: 'base64-url-encoder',
    domain: 'Computer Science & IT',
    category: 'Calculators',
    badge: 'Interactive Solver',
    mainApplication: 'Encode and decode UTF-8 text, Base64 strings & URL query components',
    officialWebsite: '',
    licenseType: 'Free',
    platform: 'Web Browser',
    summary: 'Bidirectional converter for Base64 and URL encoding with instant live updates.',
    description: 'Quickly encode payloads, API authentication headers, and URL query strings, or decode incoming API responses in your browser.',
    toolType: 'interactive',
    calculatorKey: 'base64-encoder',
    featured: false,
    order: 50,
    tags: ['Base64', 'URL Encode', 'UTF-8', 'Developer Utility'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_number_converter',
    name: 'Number Base Converter (Dec, Hex, Bin, Oct, ASCII)',
    slug: 'number-base-converter',
    domain: 'Computer Science & IT',
    category: 'Calculators',
    badge: 'Interactive Solver',
    mainApplication: 'Synchronized live conversion across Decimal, Hex, Binary, and Octal',
    officialWebsite: '',
    licenseType: 'Free',
    platform: 'Web Browser',
    summary: 'Instant synchronized multi-base converter for embedded systems firmware debugging and low-level protocol development.',
    description: 'Type into any base field to instantly view corresponding decimal, hexadecimal (0x), binary (0b), octal, and printable ASCII representation.',
    toolType: 'interactive',
    calculatorKey: 'number-converter',
    featured: false,
    order: 51,
    tags: ['Binary', 'Hexadecimal', 'Decimal', 'Octal', 'Bitwise'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_subnet_calc',
    name: 'IPv4 Subnet & CIDR Calculator',
    slug: 'ipv4-subnet-calculator',
    domain: 'Networking & IoT',
    category: 'Calculators',
    badge: 'Interactive Solver',
    mainApplication: 'CIDR prefix, subnet mask, usable IP ranges, and broadcast address',
    officialWebsite: '',
    licenseType: 'Free',
    platform: 'Web Browser',
    summary: 'Calculate subnet masks, wildcard masks, usable host ranges, and broadcast addresses from an IP and CIDR prefix.',
    description: 'Crucial for network engineers, IoT gateway setups, and server cluster provisioning. Input an IPv4 address and CIDR prefix (/8 to /30) for instant breakdown.',
    toolType: 'interactive',
    calculatorKey: 'subnet-calculator',
    featured: false,
    order: 52,
    tags: ['Subnet', 'CIDR', 'IPv4', 'Networking', 'Gateway'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_3d_print_cost',
    name: '3D Print Cost & Filament Usage Estimator',
    slug: '3d-print-cost-estimator',
    domain: '3D Printing & CAD',
    category: 'Calculators',
    badge: 'Interactive Solver',
    mainApplication: 'Calculate total production cost (₹) including filament, electricity & wear',
    officialWebsite: '',
    licenseType: 'Free',
    platform: 'Web Browser',
    summary: 'Estimate realistic job production costs for FDM 3D printing jobs including filament material, electricity, machine depreciation, and labor.',
    description: 'Calculates the real unit cost for 3D printing services and rapid prototyping. Enter print duration in hours, consumed filament weight in grams, spool price, and power consumption.',
    toolType: 'interactive',
    calculatorKey: '3d-print-cost',
    featured: false,
    order: 53,
    tags: ['3D Printing', 'Cost Estimator', 'Filament', 'Production', 'FDM'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_stepper_calibration',
    name: 'Stepper Motor Steps/mm Calibrator',
    slug: 'stepper-steps-calculator',
    domain: '3D Printing & CAD',
    category: 'Calculators',
    badge: 'Interactive Solver',
    mainApplication: 'Compute firmware steps/mm for GT2 belts and leadscrew axes',
    officialWebsite: '',
    licenseType: 'Free',
    platform: 'Web Browser',
    summary: 'Calculate exact Marlin, Klipper, or RepRap firmware steps-per-millimeter for belt-driven axes and leadscrew Z-axes.',
    description: 'Calculate steps/mm values for 3D printers and CNC machines based on motor step angle, driver microstepping (1/16, 1/32), belt pitch, pulley tooth count, or leadscrew pitch.',
    toolType: 'interactive',
    calculatorKey: 'stepper-calibration',
    featured: false,
    order: 54,
    tags: ['Stepper Motor', 'Steps/mm', 'Marlin', 'Klipper', 'CNC', '3D Printer'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function mergeToolsWithDefaults(firestoreList: EngineeringTool[]): EngineeringTool[] {
  if (firestoreList.length === 0) return DEFAULT_ENGINEERING_TOOLS;

  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const merged: EngineeringTool[] = [];

  for (const item of firestoreList) {
    seenIds.add(item.id);
    if (item.slug) seenSlugs.add(item.slug.toLowerCase());
    merged.push(item);
  }

  for (const def of DEFAULT_ENGINEERING_TOOLS) {
    if (!seenIds.has(def.id) && !seenSlugs.has(def.slug.toLowerCase())) {
      seenIds.add(def.id);
      seenSlugs.add(def.slug.toLowerCase());
      merged.push(def);
    }
  }

  return merged.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export async function fetchTools(): Promise<EngineeringTool[]> {
  try {
    const q = query(collection(db, 'tools'), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return DEFAULT_ENGINEERING_TOOLS;
    }

    const list = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const defMatch = DEFAULT_ENGINEERING_TOOLS.find((d) => d.id === docSnap.id || d.slug === data.slug);
      return {
        id: docSnap.id,
        name: String(data.name || defMatch?.name || 'Untitled Tool'),
        slug: String(data.slug || defMatch?.slug || docSnap.id),
        domain: (data.domain as EngineeringDomain) || defMatch?.domain || 'General Engineering',
        category: (data.category as ToolCategory) || defMatch?.category || 'Electronics',
        mainApplication: data.mainApplication ? String(data.mainApplication) : defMatch?.mainApplication,
        officialWebsite: data.officialWebsite ? String(data.officialWebsite) : defMatch?.officialWebsite,
        licenseType: data.licenseType ? String(data.licenseType) : defMatch?.licenseType,
        platform: data.platform ? String(data.platform) : defMatch?.platform,
        badge: data.badge ? String(data.badge) : defMatch?.badge,
        summary: String(data.summary || defMatch?.summary || ''),
        description: String(data.description || defMatch?.description || ''),
        icon: data.icon ? String(data.icon) : undefined,
        imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
        officialLogoUrl: data.officialLogoUrl ? String(data.officialLogoUrl) : undefined,
        screenshotSourceUrl: data.screenshotSourceUrl ? String(data.screenshotSourceUrl) : undefined,
        imageAlt: data.imageAlt ? String(data.imageAlt) : undefined,
        toolType: (data.toolType as 'built-in' | 'external' | 'interactive' | 'software') || defMatch?.toolType || 'software',
        externalUrl: data.externalUrl ? String(data.externalUrl) : defMatch?.externalUrl,
        calculatorKey: data.calculatorKey ? String(data.calculatorKey) : defMatch?.calculatorKey,
        featured: Boolean(data.featured ?? defMatch?.featured),
        order: typeof data.order === 'number' ? data.order : defMatch?.order ?? 0,
        tags: Array.isArray(data.tags) && data.tags.length > 0 ? data.tags.map(String) : defMatch?.tags || [],
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    });
    return mergeToolsWithDefaults(list);
  } catch {
    return DEFAULT_ENGINEERING_TOOLS;
  }
}

export async function saveToolAdmin(
  tool: Omit<EngineeringTool, 'createdAt' | 'updatedAt' | 'id'> & { id?: string },
  isNew: boolean,
  actor: UserProfile,
  actorRole: UserRole
): Promise<string> {
  const toolId = isNew
    ? `tool_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    : tool.id || `tool_${Date.now()}`;

  const batch = writeBatch(db);
  const logId = `log_${Date.now()}_tool`;

  const payload: Record<string, unknown> = {
    id: toolId,
    name: tool.name.trim(),
    slug: tool.slug.trim(),
    domain: tool.domain,
    category: tool.category || 'Electronics',
    mainApplication: tool.mainApplication?.trim() || '',
    officialWebsite: tool.officialWebsite?.trim() || '',
    licenseType: tool.licenseType || 'Free',
    platform: tool.platform || 'Desktop (Windows / Mac / Linux)',
    badge: tool.badge?.trim() || '',
    summary: tool.summary.trim(),
    description: tool.description.trim(),
    icon: tool.icon?.trim() || '',
    imageUrl: tool.imageUrl?.trim() || '',
    officialLogoUrl: tool.officialLogoUrl?.trim() || '',
    screenshotSourceUrl: tool.screenshotSourceUrl?.trim() || '',
    imageAlt: tool.imageAlt?.trim() || '',
    toolType: tool.toolType || 'software',
    externalUrl: tool.externalUrl?.trim() || tool.officialWebsite?.trim() || '',
    calculatorKey: tool.calculatorKey?.trim() || '',
    featured: Boolean(tool.featured),
    order: typeof tool.order === 'number' ? tool.order : 1,
    tags: tool.tags || [],
    updatedAt: serverTimestamp(),
  };

  const toolsSnap = await getDocs(collection(db, 'tools'));

  if (toolsSnap.empty) {
    for (const def of DEFAULT_ENGINEERING_TOOLS) {
      if (def.id === toolId) {
        batch.set(doc(db, 'tools', def.id), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      } else {
        batch.set(doc(db, 'tools', def.id), {
          ...def,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
    if (!DEFAULT_ENGINEERING_TOOLS.some((d) => d.id === toolId)) {
      batch.set(doc(db, 'tools', toolId), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
  } else {
    const docRef = doc(db, 'tools', toolId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      payload.createdAt = serverTimestamp();
    }
    batch.set(docRef, payload, { merge: true });
  }

  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole,
    action: 'MANAGE_TOOL',
    targetType: 'TOOL',
    targetId: toolId,
    reason: `${isNew ? 'Added new' : 'Updated'} engineering tool/software: ${tool.name}`,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();

    fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/tools' }),
    }).catch(() => undefined);
  } catch (error) {
    handleFirestoreError(
      error,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      `tools/${toolId}`
    );
  }

  return toolId;
}

export async function deleteToolAdmin(
  toolId: string,
  actor: UserProfile,
  actorRole: UserRole,
  reason?: string
): Promise<void> {
  const batch = writeBatch(db);
  const logId = `log_${Date.now()}_deltool`;

  const toolsSnap = await getDocs(collection(db, 'tools'));
  if (toolsSnap.empty) {
    for (const def of DEFAULT_ENGINEERING_TOOLS) {
      if (def.id !== toolId) {
        batch.set(doc(db, 'tools', def.id), {
          ...def,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } else {
    batch.delete(doc(db, 'tools', toolId));
  }

  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole,
    action: 'DELETE_TOOL',
    targetType: 'TOOL',
    targetId: toolId,
    reason: reason?.trim() || 'Deleted engineering tool/software from directory',
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();

    fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/tools' }),
    }).catch(() => undefined);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tools/${toolId}`);
  }
}
