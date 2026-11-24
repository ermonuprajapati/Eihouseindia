export type WorkspaceMode =
  | 'schematic'
  | 'virtual3d'
  | 'studio3d'
  | 'schematicEditor'
  | 'simulation'
  | 'pcb2d'
  | 'pcb3d'
  | 'firmware'
  | 'mcu'
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

export type LibraryTier = 'generic' | 'real' | 'industrial';

export type MountingType =
  | 'THT'
  | 'SMD'
  | 'MODULE_HEADER'
  | 'BOARD_OFFBOARD'
  | 'PANEL_DIN'
  | 'Through-Hole'
  | 'Surface-Mount'
  | 'Socketed'
  | 'Chassis';

export type PlacementClass =
  | 'single-passive'
  | 'single-semiconductor'
  | 'ic-dip'
  | 'module-breadboard'
  | 'dev-board'
  | 'offboard-console'
  | 'industrial-equipment';

export interface PadSpec {
  pinId: string;
  pinNumber: number | string;
  xMm: number;
  yMm: number;
  drillMm: number;
  padDiameterMm: number;
  shape: 'circle' | 'rect' | 'oval';
}

export interface PhysicalSpec {
  packageType?: 'THT' | 'SMD' | 'Module' | 'Chassis';
  packageCode?: string;
  mountingType?: MountingType;
  placementClass?: PlacementClass;
  dimensionsMm: { width: number; height: number; depth?: number };
  bodyDimensionsMm?: { width: number; depth: number; height: number };
  courtyardMm?: { width: number; depth: number; margin: number };
  pinPitchMm: number;
  pads?: PadSpec[];
  padFootprintSvg?: string;
}

export interface CircuitComponent {
  id: string;
  type: string;
  label: string;
  designator?: string;
  category: ComponentCategory;
  subCategory?: string;
  componentName?: string;
  libraryTier?: LibraryTier;
  manufacturer?: string;
  partNumber?: string;
  source?: string;
  simulationModel?: string;
  symbolId?: string;
  footprintId?: string;
  model3dId?: string;
  placementClass?: PlacementClass;
  simulationStatus?: SimulationSupportStatus;
  packageType?: 'THT' | 'SMD' | 'Module' | 'Chassis';
  physicalSpec?: PhysicalSpec;
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
  editorPosition?: { x: number; y: number };
  editorRotation?: 0 | 90 | 180 | 270;
  editorFlipped?: boolean;
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
    pwrLed?: boolean;
    channels?: { r: number; g: number; b: number };
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
  pwrLed?: boolean;
  channels?: { r: number; g: number; b: number };
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
    mathMode?: 'off' | 'CH1+CH2' | 'CH1-CH2' | 'CH1*CH2' | string;
    mathSourceA?: 'CH1' | 'CH2' | 'CH3' | 'CH4';
    mathOp?: '+' | '-' | '×' | '÷' | '*' | '/';
    mathSourceB?: 'CH1' | 'CH2' | 'CH3' | 'CH4';
    mathEnabled?: boolean;
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
      waveform: 'sine' | 'square' | 'triangle' | 'sawtooth' | 'pulse' | 'noise';
      frequencyHz: number;
      amplitudeV: number;
      offsetV: number;
      dutyCycle?: number;
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
  isManual?: boolean;
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
  netId?: string;
  isManual?: boolean;
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
  isCustomMoved?: boolean;
}

export interface PcbSilkscreenText {
  id: string;
  text: string;
  xMm: number;
  yMm: number;
  fontSizeMm: number;
  layer: 'F.SilkS' | 'B.SilkS';
  rotation?: number;
}

export interface PcbMountingHole {
  id: string;
  xMm: number;
  yMm: number;
  drillMm: number;
  outerMm: number;
  isCustomMoved?: boolean;
  x: number;
  y: number;
  diameterMm: number;
}

export interface PcbLayout {
  widthMm: number;
  heightMm: number;
  boardThicknessMm: number;
  copperLayers: 2 | 4 | 6 | 8;
  units?: 'mm' | 'mil';
  gridSizeMm?: number;
  cornerRoundingMm?: number;
  mountingHoles?: PcbMountingHole[];
  edgeClearanceMm?: number;
  tracks: PcbTrack[];
  pads: PcbPad[];
  components?: PcbComponentPlacement[];
  texts?: PcbSilkscreenText[];
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

// -------------------------------------------------------------------------
// Professional EDA Schematic Capture Annotations & Sheet Configuration
// -------------------------------------------------------------------------
export interface SchematicGraphicShape {
  id: string;
  type: 'rect' | 'line' | 'circle';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
  strokeDash?: string;
  fill?: string;
}

export interface SchematicTextNote {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
}

export interface SchematicAttachedImage {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
  opacity: number; // 0.2 to 1.0
  locked?: boolean;
}

export interface SchematicNoConnect {
  id: string;
  compId: string;
  pinId: string;
  x: number;
  y: number;
}

export interface SchematicManualJunction {
  id: string;
  x: number;
  y: number;
  netName?: string;
}

export interface SchematicNetLabel {
  id: string;
  x: number;
  y: number;
  name: string;
  wireId?: string;
}

export interface SchematicPowerPort {
  id: string;
  x: number;
  y: number;
  portType: 'VCC' | 'GND' | '+3.3V' | '+5V' | '+9V' | '+12V';
  rotation?: number;
}

export interface SchematicTitleBlock {
  title: string;
  revision: string;
  company: string;
  author: string;
  date: string;
  sheet: string;
}

export interface SchematicEditorSheetConfig {
  size: 'A4' | 'A3' | 'Letter';
  theme: 'dark' | 'light';
  gridStep: number;
  snapToGrid: boolean;
}

export interface SchematicEditorAnnotations {
  shapes?: SchematicGraphicShape[];
  textNotes?: SchematicTextNote[];
  images?: SchematicAttachedImage[];
  noConnects?: SchematicNoConnect[];
  manualJunctions?: SchematicManualJunction[];
  netLabels?: SchematicNetLabel[];
  powerPorts?: SchematicPowerPort[];
  titleBlock?: SchematicTitleBlock;
  sheet?: SchematicEditorSheetConfig;
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
  // Professional Schematic Editor Layout (Optional & Backward-Compatible)
  schematicEditorLayout?: Record<string, { x: number; y: number; rotation?: number }>;
  schematicEditorAnnotations?: SchematicEditorAnnotations;
  schematicEditorSheet?: SchematicEditorSheetConfig;
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
