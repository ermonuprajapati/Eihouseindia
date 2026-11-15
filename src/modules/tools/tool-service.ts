import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import type { EngineeringDomain, EngineeringTool, UserProfile, UserRole } from '@/types';

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

export const DEFAULT_ENGINEERING_TOOLS: EngineeringTool[] = [
  // --- Electronics & Embedded ---
  {
    id: 'tool_ohms_law',
    name: "Ohm's Law & DC Power Calculator",
    slug: 'ohms-law-calculator',
    domain: 'Electronics & Embedded',
    badge: 'Essential',
    summary: 'Instantly calculate Voltage (V), Current (I), Resistance (R), and Power (P) with step-by-step formulas.',
    description: 'Fundamental calculation tool for electrical circuits. Enter any two known parameters among voltage, current, resistance, or power to compute the remaining values.',
    toolType: 'interactive',
    calculatorKey: 'ohms-law',
    featured: true,
    order: 1,
    tags: ['Voltage', 'Current', 'Resistance', 'Power', 'Ohm'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_resistor_color',
    name: 'Resistor Color Code Decoder',
    slug: 'resistor-color-code',
    domain: 'Electronics & Embedded',
    badge: 'Interactive',
    summary: '4-band and 5-band color ring decoder with visual color bands, nominal values, and tolerance ranges.',
    description: 'Quickly decode color-band markings on through-hole carbon film and metal film resistors to find exact resistance values, multiplier, and tolerance percentage.',
    toolType: 'interactive',
    calculatorKey: 'resistor-color-code',
    featured: true,
    order: 2,
    tags: ['Resistor', 'Color Code', '4-Band', '5-Band', 'Tolerance'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_voltage_divider',
    name: 'Voltage Divider Calculator',
    slug: 'voltage-divider-calculator',
    domain: 'Electronics & Embedded',
    badge: 'Hardware Design',
    summary: 'Calculate output voltage, resistor ratios, and loaded divider voltages for ADC level shifting.',
    description: 'Design resistive voltage divider networks for sensor interfacing, ADC reference scaling, and level-shifting between 5V and 3.3V logic systems.',
    toolType: 'interactive',
    calculatorKey: 'voltage-divider',
    featured: true,
    order: 3,
    tags: ['Voltage Divider', 'ADC', 'Sensors', 'Level Shift'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_led_resistor',
    name: 'LED Series Current Limiting Resistor',
    slug: 'led-series-resistor',
    domain: 'Electronics & Embedded',
    badge: 'Circuit Design',
    summary: 'Determine required series resistor and wattage for single or series LEDs based on forward voltage and current.',
    description: 'Calculates the ideal current-limiting resistor to protect LEDs from over-current destruction, with recommended E12/E24 standard values and minimum wattage ratings.',
    toolType: 'interactive',
    calculatorKey: 'led-resistor',
    featured: false,
    order: 4,
    tags: ['LED', 'Resistor', 'Optoelectronics', 'Wattage'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_555_timer',
    name: '555 Timer Frequency & Duty Cycle',
    slug: '555-timer-calculator',
    domain: 'Electronics & Embedded',
    badge: 'Timing & Pulse',
    summary: 'Calculate oscillation frequency, high/low pulse times, and duty cycle for NE555 astable multivibrators.',
    description: 'Design clock generators, PWM pulse circuits, and tone generators using standard NE555/LM555 timer ICs with user-specified R1, R2, and capacitor values.',
    toolType: 'interactive',
    calculatorKey: '555-timer',
    featured: false,
    order: 5,
    tags: ['555 Timer', 'PWM', 'Astable', 'Pulse', 'Frequency'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_pcb_trace',
    name: 'PCB Trace Width & Current Capacity',
    slug: 'pcb-trace-width-ipc2221',
    domain: 'Electronics & Embedded',
    badge: 'IPC-2221 Standard',
    summary: 'Estimate minimum PCB track width for target continuous currents and permissible temperature rise.',
    description: 'Calculate copper trace widths for external and internal PCB layers based on IPC-2221 equations, copper ounce thickness (1oz / 2oz), and allowable temperature rise.',
    toolType: 'interactive',
    calculatorKey: 'pcb-trace',
    featured: true,
    order: 6,
    tags: ['PCB Design', 'Trace Width', 'IPC-2221', 'Current', 'Hardware'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // --- Mechanical & Robotics ---
  {
    id: 'tool_torque_power',
    name: 'Motor Torque, Speed & Power Calculator',
    slug: 'motor-torque-power-calculator',
    domain: 'Mechanical & Robotics',
    badge: 'Actuators & Motors',
    summary: 'Convert between motor RPM, mechanical torque (Nm / kg-cm), and power output (Watts / HP).',
    description: 'Essential calculator for robotics designers and mechanical engineers sizing DC motors, BLDC drives, and gearbox outputs for payload actuation.',
    toolType: 'interactive',
    calculatorKey: 'torque-power',
    featured: true,
    order: 7,
    tags: ['Torque', 'RPM', 'Motor', 'Power', 'Robotics'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_gear_ratio',
    name: 'Gear Train Ratio & Output Speed',
    slug: 'gear-ratio-calculator',
    domain: 'Mechanical & Robotics',
    badge: 'Transmissions',
    summary: 'Compute gear transmission ratios, output shaft RPM, and ideal torque multiplication from driving teeth count.',
    description: 'Calculates velocity ratios and mechanical advantage for spur, helical, or compound gear trains in robotic drives and CNC machinery.',
    toolType: 'interactive',
    calculatorKey: 'gear-ratio',
    featured: false,
    order: 8,
    tags: ['Gears', 'RPM', 'Transmission', 'Mechanical Advantage'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_cylinder_force',
    name: 'Hydraulic & Pneumatic Cylinder Force',
    slug: 'cylinder-force-calculator',
    domain: 'Mechanical & Robotics',
    badge: 'Fluid Power',
    summary: 'Calculate extend and retract push/pull forces (N, kgf, lbf) based on bore diameter, rod size, and operating pressure.',
    description: 'Enables quick sizing of pneumatic and hydraulic actuators in industrial automation setups, robotic presses, and linear positioning fixtures.',
    toolType: 'interactive',
    calculatorKey: 'cylinder-force',
    featured: false,
    order: 9,
    tags: ['Pneumatics', 'Hydraulics', 'Actuators', 'Automation', 'Force'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // --- Computer Science & IT ---
  {
    id: 'tool_base64_encoder',
    name: 'Base64 & URL Encoder / Decoder',
    slug: 'base64-url-encoder-decoder',
    domain: 'Computer Science & IT',
    badge: 'Developer Utility',
    summary: 'Encode and decode plain text, binary payloads, and web URLs with instantaneous live conversion.',
    description: 'Standard utility for software developers, API integrators, and firmware engineers handling authentication tokens, Base64 data URIs, and escaped URI parameters.',
    toolType: 'interactive',
    calculatorKey: 'base64-encoder',
    featured: true,
    order: 10,
    tags: ['Base64', 'URL Encoding', 'Developer Tool', 'Strings', 'API'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_number_converter',
    name: 'Number Base & ASCII Converter',
    slug: 'number-base-ascii-converter',
    domain: 'Computer Science & IT',
    badge: 'Firmware & Logic',
    summary: 'Simultaneous conversion between Decimal, Hexadecimal, Binary, Octal, and ASCII characters.',
    description: 'Essential for firmware developers inspecting MCU register bitmasks, memory addresses, UART byte streams, and hex telemetry packets.',
    toolType: 'interactive',
    calculatorKey: 'number-converter',
    featured: true,
    order: 11,
    tags: ['Binary', 'Hexadecimal', 'Decimal', 'ASCII', 'Bitwise'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_hash_json',
    name: 'Hash Generator & JSON Formatter',
    slug: 'hash-generator-json-formatter',
    domain: 'Computer Science & IT',
    badge: 'Security & Data',
    summary: 'Generate SHA-256 / SHA-1 checksums and format, beautify, and validate complex JSON payloads.',
    description: 'Validate IoT telemetry JSON structures, minify configuration files, and generate cryptographic hashes for integrity checks in distributed systems.',
    toolType: 'interactive',
    calculatorKey: 'hash-json',
    featured: false,
    order: 12,
    tags: ['JSON', 'SHA-256', 'Hash', 'Validation', 'Formatting'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // --- Networking & IoT ---
  {
    id: 'tool_subnet_calculator',
    name: 'IPv4 Subnet & CIDR Mask Calculator',
    slug: 'ipv4-subnet-calculator',
    domain: 'Networking & IoT',
    badge: 'Network Engineering',
    summary: 'Compute network address, broadcast address, subnet mask, wildcard mask, and usable host IP ranges.',
    description: 'Calculates full IPv4 subnet details from any IP address and CIDR prefix (/8 to /32). Crucial for IoT edge gateways, LAN architectures, and cloud VPC setup.',
    toolType: 'interactive',
    calculatorKey: 'subnet-calculator',
    featured: true,
    order: 13,
    tags: ['Subnet', 'CIDR', 'IPv4', 'IP Address', 'Networking', 'IoT'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_bandwidth_calc',
    name: 'Bandwidth & Data Transfer Time Calculator',
    slug: 'bandwidth-transfer-time-calculator',
    domain: 'Networking & IoT',
    badge: 'Telemetry & Cloud',
    summary: 'Estimate file and telemetry upload/download duration across various connection speeds (4G, 5G, Wi-Fi, Ethernet).',
    description: 'Plan OTA firmware distribution, sensor logging telemetry uploads, and media transfers across different network constraints and bandwidth allowances.',
    toolType: 'interactive',
    calculatorKey: 'bandwidth-calc',
    featured: false,
    order: 14,
    tags: ['Bandwidth', 'Transfer Time', 'Data Rate', 'Network', 'OTA'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // --- 3D Printing & CAD ---
  {
    id: 'tool_3d_print_cost',
    name: '3D Print Cost & Filament Usage Estimator',
    slug: '3d-print-cost-filament-calculator',
    domain: '3D Printing & CAD',
    badge: 'Rapid Prototyping',
    summary: 'Calculate exact print cost per part including PLA/PETG/ABS filament weight, spool price, machine wear, and electricity.',
    description: 'Calculates the real manufacturing cost of 3D printed enclosures, robotics brackets, and functional mechanical parts for prototyping and commercial batch pricing.',
    toolType: 'interactive',
    calculatorKey: '3d-print-cost',
    featured: true,
    order: 15,
    tags: ['3D Printing', 'Filament', 'Cost Estimator', 'PLA', 'PETG', 'CAD'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tool_stepper_steps',
    name: '3D Printer Stepper Steps/mm Calibrator',
    slug: 'stepper-steps-per-mm-calculator',
    domain: '3D Printing & CAD',
    badge: 'Calibration & CNC',
    summary: 'Calculate accurate motor steps/mm for belt drives (GT2), lead screws (T8), and direct-drive extruder gears.',
    description: 'Calibrate Marlin, Klipper, or RepRap firmware settings for 3D printers, laser cutters, and CNC routers using motor step angle, microstepping, and pulley teeth.',
    toolType: 'interactive',
    calculatorKey: 'stepper-steps',
    featured: false,
    order: 16,
    tags: ['Stepper Motor', 'Steps/mm', 'Klipper', 'Marlin', '3D Printer', 'CNC'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function fetchTools(): Promise<EngineeringTool[]> {
  try {
    const q = query(collection(db, 'tools'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (snap.empty) {
      return DEFAULT_ENGINEERING_TOOLS;
    }
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: String(data.name || ''),
        slug: String(data.slug || ''),
        domain: (data.domain as EngineeringDomain) || 'General Engineering',
        badge: data.badge ? String(data.badge) : undefined,
        summary: String(data.summary || ''),
        description: String(data.description || ''),
        icon: data.icon ? String(data.icon) : undefined,
        imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
        toolType: (data.toolType as 'built-in' | 'external' | 'interactive') || 'interactive',
        externalUrl: data.externalUrl ? String(data.externalUrl) : undefined,
        calculatorKey: data.calculatorKey ? String(data.calculatorKey) : undefined,
        featured: Boolean(data.featured),
        order: typeof data.order === 'number' ? data.order : 0,
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    });
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
    badge: tool.badge?.trim() || '',
    summary: tool.summary.trim(),
    description: tool.description.trim(),
    icon: tool.icon?.trim() || '',
    imageUrl: tool.imageUrl?.trim() || '',
    toolType: tool.toolType || 'interactive',
    externalUrl: tool.externalUrl?.trim() || '',
    calculatorKey: tool.calculatorKey?.trim() || '',
    featured: Boolean(tool.featured),
    order: typeof tool.order === 'number' ? tool.order : 1,
    tags: tool.tags || [],
    updatedAt: serverTimestamp(),
  };

  if (isNew) {
    payload.createdAt = serverTimestamp();
    batch.set(doc(db, 'tools', toolId), payload);
  } else {
    batch.update(doc(db, 'tools', toolId), payload);
  }

  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole,
    action: 'MANAGE_TOOL',
    targetType: 'TOOL',
    targetId: toolId,
    reason: `${isNew ? 'Added new' : 'Updated'} engineering tool: ${tool.name}`,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
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

  batch.delete(doc(db, 'tools', toolId));

  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole,
    action: 'DELETE_TOOL',
    targetType: 'TOOL',
    targetId: toolId,
    reason: reason?.trim() || 'Deleted engineering tool from catalog',
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tools/${toolId}`);
  }
}
