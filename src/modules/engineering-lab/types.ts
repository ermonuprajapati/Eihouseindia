export type WorkspaceMode =
  | 'schematic'
  | 'virtual3d'
  | 'simulation'
  | 'pcb2d'
  | 'pcb3d'
  | 'firmware'
  | 'instruments'
  | 'experiments'
  | 'calculators';

export type ComponentCategory =
  | 'passive'
  | 'power'
  | 'sources'
  | 'active'
  | 'semiconductors'
  | 'analog_ics'
  | 'digital_logic'
  | 'logic'
  | 'microcontrollers'
  | 'sensors'
  | 'displays'
  | 'actuators'
  | 'communication'
  | 'connectors'
  | 'instruments'
  | 'industrial'
  | 'protection'
  | 'relays_contactors'
  | 'switches'
  | 'motor_control'
  | 'plc_automation'
  | 'modules';

export type WireInteractionMode =
  | 'select'
  | 'wire'
  | 'pan'
  | 'measure'
  | 'net_highlight'
  | 'delete';

export type SimulationSupportStatus =
  | 'full_mna'
  | 'behavioral'
  | 'transpiled_mcu'
  | 'design_only';

export interface ComponentPin {
  id: string;
  name: string;
  x: number; // offset relative to component origin
  y: number;
  pinType: 'input' | 'output' | 'bidirectional' | 'power' | 'passive';
}

export interface CircuitComponent {
  id: string;
  type: string;
  label: string;
  designator?: string;
  category: ComponentCategory;
  subCategory?: string;
  simulationStatus?: SimulationSupportStatus;
  packageType?: 'THT' | 'SMD' | 'Module' | 'Chassis';
  manufacturerPartNumber?: string;
  datasheetUrl?: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  mirrored?: boolean;
  value: string;
  parameters: Record<string, number | string | boolean>;
  pins: ComponentPin[];
  footprint: string;
  model3d?: string;
  tolerance?: number;
  internalResistance?: number;
  model?: string;
  initialCondition?: number;
  x3d?: number;
  y3d?: number;
  z3d?: number;
  rot3d?: number;
  state?: {
    voltage?: number;
    current?: number;
    on?: boolean;
    digitalOut?: number;
  };
}

export interface CircuitWire {
  id: string;
  fromCompId: string;
  fromPinId: string;
  toCompId: string;
  toPinId: string;
  points?: { x: number; y: number }[];
  current?: number;
  color?: string; // Virtual 3D wire jumper color (e.g. #EF4444, #10B981, #3B82F6)
}

export interface CircuitProbe {
  id: string;
  targetCompId: string;
  targetPinId: string;
  color: string;
  label: string;
  probeType: 'voltage' | 'current';
  active: boolean;
}

export interface SimulationWaveformPoint {
  time: number;
  value: number;
}

export interface VirtualInstrumentState {
  oscilloscope: {
    timebaseMs: number; // ms per div (e.g., 1ms, 5ms, 10ms)
    ch1ScaleV: number;  // V per div (e.g., 1V, 2V, 5V)
    ch2ScaleV: number;
    ch1Enabled: boolean;
    ch2Enabled: boolean;
    triggerLevel: number;
    running: boolean;
  };
  multimeter: {
    mode: 'DC_V' | 'AC_V' | 'RESISTANCE' | 'CONTINUITY' | 'CURRENT_MA';
    reading: number;
    unit: string;
    probesConnected: boolean;
  };
  functionGenerator: {
    waveform: 'sine' | 'square' | 'triangle' | 'sawtooth';
    frequencyHz: number;
    amplitudeV: number;
    offsetV: number;
    dutyCycle: number;
    enabled: boolean;
  };
  logicAnalyzer: {
    channels: { id: string; label: string; samples: number[] }[];
    sampleRateHz: number;
    running: boolean;
  };
}

export interface FirmwareProjectFile {
  name: string;
  content: string;
  readOnly?: boolean;
}

export interface FirmwareDiagnostic {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface FirmwareState {
  code: string;
  language: 'arduino' | 'cpp' | 'micropython';
  targetMcu: string;
  boardId?: string;
  projectFiles?: FirmwareProjectFile[];
  activeFileName?: string;
  buildLogs?: string[];
  diagnostics?: FirmwareDiagnostic[];
  compiledOutput?: {
    format: '.hex' | '.bin' | '.uf2' | '.elf';
    payload: string;
    flashBytesUsed: number;
    ramBytesUsed: number;
  };
  serialLog: string[];
  isRunning: boolean;
  isPaused?: boolean;
  stepCount?: number;
  baudRate?: number;
  gpioStates: Record<number | string, { mode: 'INPUT' | 'OUTPUT'; value: 0 | 1; analogVal: number }>;
}

export interface WorkspaceLayoutPrefs {
  isBrowserOpen: boolean;
  isInspectorOpen: boolean;
  browserWidth: number;
  inspectorWidth: number;
  activeMode: WorkspaceMode;
}

export interface PcbTrack {
  id: string;
  layer: 'top_copper' | 'bottom_copper';
  from: { x: number; y: number };
  to: { x: number; y: number };
  widthMm: number;
  netId?: string;
}

export interface PcbPad {
  id: string;
  componentId: string;
  pinId: string;
  x: number;
  y: number;
  shape: 'round' | 'rect';
  diameterMm: number;
  holeMm: number;
  layer: 'all' | 'top' | 'bottom';
}

export interface PcbComponentPlacement {
  componentId: string;
  designator: string;
  type: string;
  label: string;
  value: string;
  footprint: string;
  x: number; // in mm
  y: number; // in mm
  rotation: number;
}

export interface PcbLayout {
  widthMm: number;
  heightMm: number;
  boardThicknessMm: number;
  copperLayers: 2 | 4 | 6 | 8;
  units?: 'mm' | 'mil';
  gridSizeMm?: number;
  cornerRoundingMm?: number;
  mountingHoles?: { x: number; y: number; diameterMm: number }[];
  edgeClearanceMm?: number;
  tracks: PcbTrack[];
  pads: PcbPad[];
  components?: PcbComponentPlacement[];
  drcErrors: { id: string; message: string; severity: 'error' | 'warning' }[];
}

export interface EngineeringProject {
  id: string;
  title: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  components: CircuitComponent[];
  wires: CircuitWire[];
  probes: CircuitProbe[];
  firmware: FirmwareState;
  pcb: PcbLayout;
  instruments: VirtualInstrumentState;
}

export interface GuidedExperiment {
  id: string;
  title: string;
  category: 'analog' | 'digital' | 'mcu' | 'power' | 'rf';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  learningObjectives: string[];
  initialProject: EngineeringProject;
  guidedSteps: {
    title: string;
    instruction: string;
    expectedMeasurement: string;
    hint: string;
  }[];
}
