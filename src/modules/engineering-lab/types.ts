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
  | 'place'
  | 'wire'
  | 'edit_wire'
  | 'pan'
  | 'measure'
  | 'net_highlight'
  | 'delete';

export type WireRoutingStyle = 'orthogonal' | 'diagonal45' | 'straight';

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
  width?: number;
  height?: number;
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
    faultState?: 'NORMAL' | 'WARNING' | 'BURNED';
    isBurnedOut?: boolean;
    thermalStress?: number;
    status?: 'NORMAL' | 'WARNING' | 'BURNED';
    burned?: boolean;
    fault?: string;
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
  style?: WireRoutingStyle;
  netName?: string;
}

export interface ComponentSimTelemetry {
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
  digitalOut?: number;
  onRed?: boolean;
  onGreen?: boolean;
  onBlue?: boolean;
  redBrightness?: number;
  greenBrightness?: number;
  blueBrightness?: number;
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
    timebaseMs: number; // ms per div (e.g., 0.001 to 500)
    horizontalPosMs?: number;
    ch1ScaleV: number;  // V per div
    ch2ScaleV: number;
    ch3ScaleV?: number;
    ch4ScaleV?: number;
    ch1OffsetV?: number;
    ch2OffsetV?: number;
    ch3OffsetV?: number;
    ch4OffsetV?: number;
    ch1Enabled: boolean;
    ch2Enabled: boolean;
    ch3Enabled?: boolean;
    ch4Enabled?: boolean;
    ch1Coupling?: 'DC' | 'AC' | 'GND';
    ch2Coupling?: 'DC' | 'AC' | 'GND';
    ch3Coupling?: 'DC' | 'AC' | 'GND';
    ch4Coupling?: 'DC' | 'AC' | 'GND';
    ch1ProbeSource?: string; // compId, compId:pinId, 'net:GND', 'gen:out'
    ch2ProbeSource?: string;
    ch3ProbeSource?: string;
    ch4ProbeSource?: string;
    ch1Attenuation?: '1x' | '10x';
    ch2Attenuation?: '1x' | '10x';
    ch3Attenuation?: '1x' | '10x';
    ch4Attenuation?: '1x' | '10x';
    ch1Invert?: boolean;
    ch2Invert?: boolean;
    ch3Invert?: boolean;
    ch4Invert?: boolean;
    triggerSource?: 'CH1' | 'CH2' | 'CH3' | 'CH4' | 'GEN' | 'EXT';
    triggerEdge?: 'rising' | 'falling';
    triggerMode?: 'auto' | 'normal' | 'single';
    triggerLevel: number;
    mathMode?: 'off' | 'CH1+CH2' | 'CH1-CH2' | 'CH1*CH2';
    cursorsEnabled?: boolean;
    cursorX1?: number; // 0..1 ratio of screen width
    cursorX2?: number;
    cursorY1?: number;
    cursorY2?: number;
    running: boolean;
  };
  multimeter: {
    mode: 'DC_V' | 'AC_V' | 'RESISTANCE' | 'CONTINUITY' | 'CURRENT_MA' | 'DIODE' | 'CAPACITANCE' | 'FREQUENCY';
    range?: 'auto' | 'manual';
    reading: number;
    unit: string;
    probesConnected: boolean;
    probeRed?: string; // compId:pinId or netId
    probeBlack?: string;
    hold?: boolean;
    minReading?: number;
    maxReading?: number;
    relZero?: number;
    relEnabled?: boolean;
  };
  functionGenerator: {
    waveform: 'sine' | 'square' | 'triangle' | 'sawtooth' | 'pulse' | 'noise';
    frequencyHz: number;
    amplitudeV: number;
    offsetV: number;
    dutyCycle: number;
    phaseDeg?: number;
    outputImpedance?: '50' | 'High-Z';
    enabled: boolean;
    outputNet?: string; // target net or pin
    channel2?: {
      waveform: 'sine' | 'square' | 'triangle' | 'sawtooth';
      frequencyHz: number;
      amplitudeV: number;
      offsetV: number;
      enabled: boolean;
      outputNet?: string;
    };
  };
  logicAnalyzer: {
    channels: { id: string; label: string; pinSource?: string; samples: number[] }[];
    sampleRateHz: number;
    running: boolean;
    busDecode?: 'none' | 'hex' | 'dec' | 'bin';
    protocolDecoder?: 'none' | 'uart' | 'i2c' | 'spi';
    baudRate?: number;
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
  parameters?: Record<string, unknown>;
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

export interface Component3D {
  id: string;
  type: string;
  label: string;
  value?: string;
  parameters: Record<string, number | string | boolean>;
  x3d: number;
  y3d: number;
  z3d: number;
  rotY: number;
  mountedOnHoleId?: string;
}

export interface Wire3D {
  id: string;
  fromPin: { compId: string; pinId: string };
  toPin: { compId: string; pinId: string };
  color: string;
  current?: number;
}

export interface Virtual3DProjectState {
  hasBreadboard: boolean;
  components3d: Component3D[];
  wires3d: Wire3D[];
}

export interface EngineeringProject {
  id: string;
  title: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  // Track 1: Schematic + 2D/3D PCB Routing & Gerber
  components: CircuitComponent[];
  wires: CircuitWire[];
  probes: CircuitProbe[];
  firmware: FirmwareState;
  pcb: PcbLayout;
  instruments: VirtualInstrumentState;
  // Track 2: Independent Direct 3D Virtual Electronics Studio
  virtual3d?: Virtual3DProjectState;
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
