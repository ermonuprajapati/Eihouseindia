import { EngineeringProject, GuidedExperiment } from '../types';

export const TEMPLATE_555_ASTABLE: EngineeringProject = {
  id: 'tmpl_555_astable',
  title: 'NE555 Astable LED Pulse Flasher',
  description: 'Precision timer circuit configured as a free-running astable multivibrator generating square wave clock pulses to blink an indicator LED.',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  components: [
    {
      id: 'bat1',
      type: 'BATTERY',
      designator: 'BT1',
      label: 'Main DC Supply',
      category: 'sources',
      x: 100,
      y: 200,
      rotation: 0,
      value: '9V',
      parameters: { voltage: 9.0, internalResistance: 0.2 },
      pins: [
        { id: 'p', name: '+', x: 0, y: -25, pinType: 'power' },
        { id: 'n', name: '-', x: 0, y: 25, pinType: 'power' },
      ],
      footprint: 'BatteryHolder_Keystone_2460_1xAA',
      model3d: 'battery_9v_block',
    },
    {
      id: 'gnd1',
      type: 'GROUND',
      designator: 'GND1',
      label: 'GND',
      category: 'sources',
      x: 100,
      y: 350,
      rotation: 0,
      value: '0V',
      parameters: { voltage: 0 },
      pins: [{ id: '1', name: 'GND', x: 0, y: -15, pinType: 'power' }],
      footprint: 'TestPoint_Pad_D1.0mm',
    },
    {
      id: 'ic1',
      type: 'TIMER_555',
      designator: 'U1',
      label: 'NE555 Timer IC',
      category: 'active',
      x: 400,
      y: 250,
      rotation: 0,
      value: 'NE555P',
      parameters: { vcc: 9.0 },
      pins: [
        { id: '1', name: 'GND', x: -40, y: -30, pinType: 'power' },
        { id: '2', name: 'TRIG', x: -40, y: -10, pinType: 'input' },
        { id: '3', name: 'OUT', x: 40, y: -10, pinType: 'output' },
        { id: '4', name: 'RESET', x: -40, y: 10, pinType: 'input' },
        { id: '5', name: 'CTRL', x: 40, y: 10, pinType: 'passive' },
        { id: '6', name: 'THRESH', x: -40, y: 30, pinType: 'input' },
        { id: '7', name: 'DISCH', x: 40, y: -30, pinType: 'passive' },
        { id: '8', name: 'VCC', x: 40, y: 30, pinType: 'power' },
      ],
      footprint: 'Package_DIP:DIP-8_W7.62mm',
      model3d: 'dip8_integrated_circuit',
    },
    {
      id: 'r1',
      type: 'RESISTOR',
      designator: 'R1',
      label: 'Timing Resistor',
      category: 'passive',
      x: 280,
      y: 120,
      rotation: 0,
      value: '10kΩ',
      parameters: { resistance: 10000, powerRatingW: 0.25, tolerancePercent: 5 },
      pins: [
        { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
        { id: '2', name: '2', x: 30, y: 0, pinType: 'passive' },
      ],
      footprint: 'Resistor_THT:R_Axial_DIN0207_P7.62mm_Horizontal',
      model3d: 'resistor_axial_horiz',
    },
    {
      id: 'r2',
      type: 'RESISTOR',
      designator: 'R2',
      label: 'Discharge Resistor',
      category: 'passive',
      x: 280,
      y: 220,
      rotation: 0,
      value: '47kΩ',
      parameters: { resistance: 47000, powerRatingW: 0.25, tolerancePercent: 5 },
      pins: [
        { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
        { id: '2', name: '2', x: 30, y: 0, pinType: 'passive' },
      ],
      footprint: 'Resistor_THT:R_Axial_DIN0207_P7.62mm_Horizontal',
      model3d: 'resistor_axial_horiz',
    },
    {
      id: 'c1',
      type: 'CAPACITOR',
      designator: 'C1',
      label: 'Timing Capacitor',
      category: 'passive',
      x: 280,
      y: 340,
      rotation: 0,
      value: '10µF',
      parameters: { capacitance: 0.00001, voltageRatingV: 25, polarized: true },
      pins: [
        { id: '1', name: '+', x: -25, y: 0, pinType: 'passive' },
        { id: '2', name: '-', x: 25, y: 0, pinType: 'passive' },
      ],
      footprint: 'Capacitor_THT:CP_Radial_D6.3mm_P2.50mm',
      model3d: 'capacitor_radial_can',
    },
    {
      id: 'r_led',
      type: 'RESISTOR',
      designator: 'R3',
      label: 'Ballast Resistor',
      category: 'passive',
      x: 550,
      y: 240,
      rotation: 0,
      value: '330Ω',
      parameters: { resistance: 330, powerRatingW: 0.25, tolerancePercent: 5 },
      pins: [
        { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
        { id: '2', name: '2', x: 30, y: 0, pinType: 'passive' },
      ],
      footprint: 'Resistor_THT:R_Axial_DIN0207_P7.62mm_Horizontal',
      model3d: 'resistor_axial_horiz',
    },
    {
      id: 'led1',
      type: 'LED',
      designator: 'LED1',
      label: 'Pulse Indicator',
      category: 'active',
      x: 670,
      y: 240,
      rotation: 0,
      value: 'Red LED',
      parameters: { color: 'Red', forwardVoltageV: 2.0 },
      pins: [
        { id: 'a', name: 'A', x: -25, y: 0, pinType: 'passive' },
        { id: 'k', name: 'K', x: 25, y: 0, pinType: 'passive' },
      ],
      footprint: 'LED_THT:LED_D5.0mm',
      model3d: 'led_5mm_diffused',
    },
  ],
  wires: [
    { id: 'w1', fromCompId: 'bat1', fromPinId: 'n', toCompId: 'gnd1', toPinId: '1' },
    { id: 'w2', fromCompId: 'bat1', fromPinId: 'p', toCompId: 'ic1', toPinId: '8' },
    { id: 'w3', fromCompId: 'ic1', fromPinId: '8', toCompId: 'ic1', toPinId: '4' }, // Tie Reset to Vcc
    { id: 'w4', fromCompId: 'bat1', fromPinId: 'p', toCompId: 'r1', toPinId: '1' },
    { id: 'w5', fromCompId: 'r1', fromPinId: '2', toCompId: 'ic1', toPinId: '7' },
    { id: 'w6', fromCompId: 'ic1', fromPinId: '7', toCompId: 'r2', toPinId: '1' },
    { id: 'w7', fromCompId: 'r2', fromPinId: '2', toCompId: 'ic1', toPinId: '6' },
    { id: 'w8', fromCompId: 'ic1', fromPinId: '6', toCompId: 'ic1', toPinId: '2' }, // Tie Threshold to Trigger
    { id: 'w9', fromCompId: 'ic1', fromPinId: '2', toCompId: 'c1', toPinId: '1' },
    { id: 'w10', fromCompId: 'c1', fromPinId: '2', toCompId: 'gnd1', toPinId: '1' },
    { id: 'w11', fromCompId: 'ic1', fromPinId: '1', toCompId: 'gnd1', toPinId: '1' },
    { id: 'w12', fromCompId: 'ic1', fromPinId: '3', toCompId: 'r_led', toPinId: '1' },
    { id: 'w13', fromCompId: 'r_led', fromPinId: '2', toCompId: 'led1', toPinId: 'a' },
    { id: 'w14', fromCompId: 'led1', fromPinId: 'k', toCompId: 'gnd1', toPinId: '1' },
  ],
  probes: [
    {
      id: 'prb_out',
      targetCompId: 'ic1',
      targetPinId: '3',
      color: '#38BDF8',
      label: 'CH1: 555 Pin 3 Output',
      probeType: 'voltage',
      active: true,
    },
    {
      id: 'prb_cap',
      targetCompId: 'c1',
      targetPinId: '1',
      color: '#F59E0B',
      label: 'CH2: Capacitor Voltage',
      probeType: 'voltage',
      active: true,
    },
  ],
  firmware: {
    code: `// NE555 Hardware Timer Demo
// The 555 generates external clock pulses without software intervention.
// Connect pin 3 to Arduino pin 2 to count external pulse frequency:

volatile unsigned long pulseCount = 0;

void setup() {
  Serial.begin(115200);
  pinMode(2, INPUT);
  Serial.println("NE555 Hardware Pulse Counter Initialized.");
}

void loop() {
  int pinState = digitalRead(2);
  Serial.print("Pin 2 Logic Level: ");
  Serial.println(pinState);
  delay(250);
}`,
    language: 'arduino',
    targetMcu: 'ATmega328P',
    serialLog: ['[System] NE555 Astable Multivibrator ready for simulation'],
    isRunning: false,
    gpioStates: {},
  },
  pcb: {
    widthMm: 70,
    heightMm: 50,
    boardThicknessMm: 1.6,
    copperLayers: 2,
    pads: [],
    tracks: [],
    drcErrors: [],
  },
  instruments: {
    oscilloscope: {
      timebaseMs: 50,
      ch1ScaleV: 2,
      ch2ScaleV: 2,
      ch1Enabled: true,
      ch2Enabled: true,
      triggerLevel: 2.5,
      running: true,
    },
    multimeter: {
      mode: 'DC_V',
      reading: 9.0,
      unit: 'V',
      probesConnected: true,
    },
    functionGenerator: {
      waveform: 'square',
      frequencyHz: 1.5,
      amplitudeV: 9.0,
      offsetV: 0,
      dutyCycle: 0.58,
      enabled: true,
    },
    logicAnalyzer: {
      channels: [
        { id: 'ch_clk', label: 'CLK_OUT', samples: [0, 1, 1, 1, 0, 0, 1, 1, 1, 0] },
      ],
      sampleRateHz: 1000,
      running: true,
    },
  },
};

export const TEMPLATE_ARDUINO_BLINK: EngineeringProject = {
  id: 'tmpl_arduino_blink',
  title: 'Arduino Uno MCU Virtual Lab & Telemetry',
  description: 'ATmega328P virtual development environment running embedded C/C++ firmware with digital GPIO toggling and UART Serial telemetry.',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  components: [
    {
      id: 'mcu1',
      type: 'ARDUINO_UNO',
      designator: 'U1',
      label: 'Arduino Uno',
      category: 'microcontrollers',
      x: 300,
      y: 250,
      rotation: 0,
      value: 'ATmega328P',
      parameters: { clockMhz: 16 },
      pins: [
        { id: '5V', name: '5V', x: -60, y: -45, pinType: 'power' },
        { id: 'GND', name: 'GND', x: -60, y: -25, pinType: 'power' },
        { id: 'A0', name: 'A0', x: -60, y: 0, pinType: 'input' },
        { id: 'D13', name: 'D13', x: 60, y: 40, pinType: 'bidirectional' },
      ],
      footprint: 'Module_Arduino_Uno',
      model3d: 'dip8_integrated_circuit',
    },
    {
      id: 'r_limit',
      type: 'RESISTOR',
      designator: 'R1',
      label: 'Current Limit',
      category: 'passive',
      x: 480,
      y: 290,
      rotation: 0,
      value: '220Ω',
      parameters: { resistance: 220, powerRatingW: 0.25, tolerancePercent: 5 },
      pins: [
        { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
        { id: '2', name: '2', x: 30, y: 0, pinType: 'passive' },
      ],
      footprint: 'Resistor_THT:R_Axial_DIN0207_P7.62mm_Horizontal',
      model3d: 'resistor_axial_horiz',
    },
    {
      id: 'led_blue',
      type: 'LED',
      designator: 'LED1',
      label: 'Status Indicator',
      category: 'active',
      x: 600,
      y: 290,
      rotation: 0,
      value: 'Blue LED',
      parameters: { color: 'Blue', forwardVoltageV: 2.8 },
      pins: [
        { id: 'a', name: 'A', x: -25, y: 0, pinType: 'passive' },
        { id: 'k', name: 'K', x: 25, y: 0, pinType: 'passive' },
      ],
      footprint: 'LED_THT:LED_D5.0mm',
      model3d: 'led_5mm_diffused',
    },
    {
      id: 'gnd_mcu',
      type: 'GROUND',
      designator: 'GND1',
      label: 'GND',
      category: 'sources',
      x: 600,
      y: 400,
      rotation: 0,
      value: '0V',
      parameters: { voltage: 0 },
      pins: [{ id: '1', name: 'GND', x: 0, y: -15, pinType: 'power' }],
      footprint: 'TestPoint_Pad_D1.0mm',
    },
  ],
  wires: [
    { id: 'w_d13', fromCompId: 'mcu1', fromPinId: 'D13', toCompId: 'r_limit', toPinId: '1' },
    { id: 'w_res_led', fromCompId: 'r_limit', fromPinId: '2', toCompId: 'led_blue', toPinId: 'a' },
    { id: 'w_led_gnd', fromCompId: 'led_blue', fromPinId: 'k', toCompId: 'gnd_mcu', toPinId: '1' },
    { id: 'w_mcu_gnd', fromCompId: 'mcu1', fromPinId: 'GND', toCompId: 'gnd_mcu', toPinId: '1' },
  ],
  probes: [
    {
      id: 'prb_d13',
      targetCompId: 'mcu1',
      targetPinId: 'D13',
      color: '#3B82F6',
      label: 'CH1: Pin 13 GPIO',
      probeType: 'voltage',
      active: true,
    },
  ],
  firmware: {
    code: `// EI House Universal Engineering Lab
// Virtual MCU Firmware: Blink & Serial Telemetry

const int LED_PIN = 13;
int cycleCounter = 0;

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("EI House Universal Engineering Lab Virtual MCU Online.");
}

void loop() {
  cycleCounter++;
  digitalWrite(LED_PIN, HIGH);
  Serial.print("LED HIGH — Status Cycle: ");
  Serial.println(cycleCounter);
  delay(500);

  digitalWrite(LED_PIN, LOW);
  Serial.print("LED LOW — Status Cycle: ");
  Serial.println(cycleCounter);
  delay(500);
}`,
    language: 'arduino',
    targetMcu: 'ATmega328P',
    serialLog: [
      '[UART] Initialized Serial at 9600 baud',
      '[System] ATmega328P Virtual Core executing at 16.0 MHz',
    ],
    isRunning: true,
    gpioStates: { 13: { mode: 'OUTPUT', value: 1, analogVal: 255 } },
  },
  pcb: {
    widthMm: 80,
    heightMm: 60,
    boardThicknessMm: 1.6,
    copperLayers: 2,
    pads: [],
    tracks: [],
    drcErrors: [],
  },
  instruments: {
    oscilloscope: {
      timebaseMs: 100,
      ch1ScaleV: 2,
      ch2ScaleV: 2,
      ch1Enabled: true,
      ch2Enabled: false,
      triggerLevel: 2.5,
      running: true,
    },
    multimeter: {
      mode: 'DC_V',
      reading: 5.0,
      unit: 'V',
      probesConnected: true,
    },
    functionGenerator: {
      waveform: 'square',
      frequencyHz: 1.0,
      amplitudeV: 5.0,
      offsetV: 0,
      dutyCycle: 0.5,
      enabled: false,
    },
    logicAnalyzer: {
      channels: [{ id: 'ch_d13', label: 'GPIO_13', samples: [0, 1, 1, 1, 0, 0, 1] }],
      sampleRateHz: 500,
      running: true,
    },
  },
};

export const GUIDED_EXPERIMENTS: GuidedExperiment[] = [
  {
    id: 'exp_ohm_law',
    title: 'Experiment 1: Ohm’s Law & Current Limiting',
    category: 'analog',
    difficulty: 'Beginner',
    description: 'Verify the fundamental relation V = I × R by varying resistance values and measuring the resultant loop current across an LED.',
    learningObjectives: [
      'Understand relationship between voltage, current and resistance',
      'Learn how to prevent semiconductor burn-out using series ballast resistors',
      'Measure forward voltage drop across diodes with the virtual multimeter',
    ],
    initialProject: TEMPLATE_ARDUINO_BLINK,
    guidedSteps: [
      {
        title: 'Step 1: Inspect the Initial Circuit',
        instruction: 'Click on the 220Ω resistor in the schematic canvas to open the Properties Inspector.',
        expectedMeasurement: 'Current through LED ≈ 10mA',
        hint: 'Observe the current reading in the Properties Panel.',
      },
      {
        title: 'Step 2: Increase Ballast Resistance',
        instruction: 'Change the resistor value from 220Ω to 1000Ω (1kΩ).',
        expectedMeasurement: 'Current drops to ≈ 2.2mA',
        hint: 'As resistance increases, current proportionally decreases according to Ohm’s Law.',
      },
      {
        title: 'Step 3: Oscilloscope Verification',
        instruction: 'Switch to the Virtual Instruments tab and enable the Oscilloscope to observe the 5V logic pulses.',
        expectedMeasurement: 'Peak amplitude = 5.0V, Duty cycle = 50%',
        hint: 'Adjust timebase to 100ms/div for clear visualization of the toggling square wave.',
      },
    ],
  },
  {
    id: 'exp_555_timer',
    title: 'Experiment 2: RC Time Constant in 555 Multivibrators',
    category: 'analog',
    difficulty: 'Intermediate',
    description: 'Investigate how timing resistors (R1, R2) and timing capacitor C1 govern the oscillation frequency of the NE555 timer.',
    learningObjectives: [
      'Calculate theoretical frequency f = 1.44 / ((R1 + 2*R2) * C1)',
      'Analyze exponential capacitor charging curve between 1/3 Vcc and 2/3 Vcc',
      'Observe real-time output waveform changes on the oscilloscope',
    ],
    initialProject: TEMPLATE_555_ASTABLE,
    guidedSteps: [
      {
        title: 'Step 1: Measure Default Frequency',
        instruction: 'Start the simulation and view Channel 2 on the Oscilloscope.',
        expectedMeasurement: 'Capacitor charges between 3.0V (1/3) and 6.0V (2/3 of 9V)',
        hint: 'Notice the sawtooth exponential profile across C1.',
      },
      {
        title: 'Step 2: Double Timing Capacitance',
        instruction: 'Select C1 and change capacitance from 10µF to 22µF.',
        expectedMeasurement: 'Oscillation frequency halves (LED blinks at half the speed)',
        hint: 'A larger capacitor takes twice as long to charge and discharge through R2.',
      },
    ],
  },
];
