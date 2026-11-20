import { EngineeringProject } from '../types';
import { TEMPLATE_555_ASTABLE } from '../templates/starter-templates';

export interface CommunityProject {
  id: string;
  title: string;
  description: string;
  author: string;
  category: 'mcu' | 'analog' | 'sensors' | 'power' | 'audio' | 'community';
  tags: string[];
  likes: number;
  views: number;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
  projectData: EngineeringProject;
}

// ---------------------------------------------------------------------------
// 1. ARDUINO SMART 3-WAY TRAFFIC LIGHT CONTROLLER
// ---------------------------------------------------------------------------
export const TEMPLATE_ARDUINO_TRAFFIC_LIGHT: EngineeringProject = {
  id: 'tmpl_arduino_traffic_light',
  title: 'Arduino Uno 3-Way Traffic Light with Pedestrian Crosswalk',
  description:
    'Full automated city traffic light intersection running embedded C++ state machine with Red, Yellow, Green indicators, pedestrian crosswalk push button, and UART diagnostic telemetry.',
  version: '1.2.0',
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-15T12:00:00.000Z',
  components: [
    {
      id: 'mcu1',
      type: 'ARDUINO_UNO',
      designator: 'U1',
      label: 'Arduino Uno R3',
      category: 'microcontrollers',
      x: 300,
      y: 260,
      rotation: 0,
      value: 'ATmega328P',
      parameters: { clockMhz: 16, usbPlugged: true },
      pins: [
        { id: '5V', name: '5V', x: -60, y: -45, pinType: 'power' },
        { id: 'GND', name: 'GND', x: -60, y: -25, pinType: 'power' },
        { id: 'D2', name: 'D2', x: 60, y: -30, pinType: 'input' },
        { id: 'D10', name: 'D10', x: 60, y: 0, pinType: 'output' },
        { id: 'D11', name: 'D11', x: 60, y: 20, pinType: 'output' },
        { id: 'D12', name: 'D12', x: 60, y: 40, pinType: 'output' },
      ],
      footprint: 'Module:Arduino_Uno_R3',
      model3d: 'arduino_uno_r3',
    },
    {
      id: 'r_red',
      type: 'RESISTOR',
      designator: 'R1',
      label: 'Ballast Red',
      category: 'passive',
      x: 480,
      y: 180,
      rotation: 0,
      value: '220Ω',
      parameters: { resistance: 220, powerRatingW: 0.25 },
      pins: [
        { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
        { id: '2', name: '2', x: 30, y: 0, pinType: 'passive' },
      ],
      footprint: 'Resistor_THT:R_Axial_DIN0207_P7.62mm_Horizontal',
      model3d: 'resistor_axial_horiz',
    },
    {
      id: 'led_red',
      type: 'LED',
      designator: 'LED_RED',
      label: 'Stop (Red)',
      category: 'active',
      x: 600,
      y: 180,
      rotation: 0,
      value: 'Red LED',
      parameters: { color: '#EF4444', forwardVoltageV: 2.0 },
      pins: [
        { id: 'a', name: 'A', x: -25, y: 0, pinType: 'passive' },
        { id: 'k', name: 'K', x: 25, y: 0, pinType: 'passive' },
      ],
      footprint: 'LED_THT:LED_D5.0mm',
      model3d: 'led_5mm_diffused',
    },
    {
      id: 'r_yellow',
      type: 'RESISTOR',
      designator: 'R2',
      label: 'Ballast Yellow',
      category: 'passive',
      x: 480,
      y: 260,
      rotation: 0,
      value: '220Ω',
      parameters: { resistance: 220, powerRatingW: 0.25 },
      pins: [
        { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
        { id: '2', name: '2', x: 30, y: 0, pinType: 'passive' },
      ],
      footprint: 'Resistor_THT:R_Axial_DIN0207_P7.62mm_Horizontal',
      model3d: 'resistor_axial_horiz',
    },
    {
      id: 'led_yellow',
      type: 'LED',
      designator: 'LED_YEL',
      label: 'Caution (Yellow)',
      category: 'active',
      x: 600,
      y: 260,
      rotation: 0,
      value: 'Yellow LED',
      parameters: { color: '#EAB308', forwardVoltageV: 2.1 },
      pins: [
        { id: 'a', name: 'A', x: -25, y: 0, pinType: 'passive' },
        { id: 'k', name: 'K', x: 25, y: 0, pinType: 'passive' },
      ],
      footprint: 'LED_THT:LED_D5.0mm',
      model3d: 'led_5mm_diffused',
    },
    {
      id: 'r_green',
      type: 'RESISTOR',
      designator: 'R3',
      label: 'Ballast Green',
      category: 'passive',
      x: 480,
      y: 340,
      rotation: 0,
      value: '220Ω',
      parameters: { resistance: 220, powerRatingW: 0.25 },
      pins: [
        { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
        { id: '2', name: '2', x: 30, y: 0, pinType: 'passive' },
      ],
      footprint: 'Resistor_THT:R_Axial_DIN0207_P7.62mm_Horizontal',
      model3d: 'resistor_axial_horiz',
    },
    {
      id: 'led_green',
      type: 'LED',
      designator: 'LED_GRN',
      label: 'Go (Green)',
      category: 'active',
      x: 600,
      y: 340,
      rotation: 0,
      value: 'Green LED',
      parameters: { color: '#10B981', forwardVoltageV: 2.2 },
      pins: [
        { id: 'a', name: 'A', x: -25, y: 0, pinType: 'passive' },
        { id: 'k', name: 'K', x: 25, y: 0, pinType: 'passive' },
      ],
      footprint: 'LED_THT:LED_D5.0mm',
      model3d: 'led_5mm_diffused',
    },
    {
      id: 'btn_pedestrian',
      type: 'PUSHBUTTON',
      designator: 'SW1',
      label: 'Crosswalk Button',
      category: 'passive',
      x: 180,
      y: 360,
      rotation: 0,
      value: 'NO',
      parameters: { switchState: false },
      pins: [
        { id: '1', name: '1', x: -20, y: 0, pinType: 'passive' },
        { id: '2', name: '2', x: 20, y: 0, pinType: 'passive' },
      ],
      footprint: 'Button_Switch_THT:SW_PUSH_6mm_H5mm',
      model3d: 'pushbutton_tactile_6mm',
    },
    {
      id: 'gnd_traffic',
      type: 'GROUND',
      designator: 'GND1',
      label: 'GND',
      category: 'sources',
      x: 700,
      y: 260,
      rotation: 0,
      value: '0V',
      parameters: { voltage: 0 },
      pins: [{ id: '1', name: 'GND', x: 0, y: -15, pinType: 'power' }],
      footprint: 'TestPoint_Pad_D1.0mm',
    },
  ],
  wires: [
    { id: 'w_red_ctrl', fromCompId: 'mcu1', fromPinId: 'D12', toCompId: 'r_red', toPinId: '1', color: '#EF4444' },
    { id: 'w_red_res', fromCompId: 'r_red', fromPinId: '2', toCompId: 'led_red', toPinId: 'a', color: '#EF4444' },
    { id: 'w_yel_ctrl', fromCompId: 'mcu1', fromPinId: 'D11', toCompId: 'r_yellow', toPinId: '1', color: '#EAB308' },
    { id: 'w_yel_res', fromCompId: 'r_yellow', fromPinId: '2', toCompId: 'led_yellow', toPinId: 'a', color: '#EAB308' },
    { id: 'w_grn_ctrl', fromCompId: 'mcu1', fromPinId: 'D10', toCompId: 'r_green', toPinId: '1', color: '#10B981' },
    { id: 'w_grn_res', fromCompId: 'r_green', fromPinId: '2', toCompId: 'led_green', toPinId: 'a', color: '#10B981' },
    { id: 'w_led_red_gnd', fromCompId: 'led_red', fromPinId: 'k', toCompId: 'gnd_traffic', toPinId: '1', color: '#1E293B' },
    { id: 'w_led_yel_gnd', fromCompId: 'led_yellow', fromPinId: 'k', toCompId: 'gnd_traffic', toPinId: '1', color: '#1E293B' },
    { id: 'w_led_grn_gnd', fromCompId: 'led_green', fromPinId: 'k', toCompId: 'gnd_traffic', toPinId: '1', color: '#1E293B' },
    { id: 'w_mcu_gnd', fromCompId: 'mcu1', fromPinId: 'GND', toCompId: 'gnd_traffic', toPinId: '1', color: '#1E293B' },
    { id: 'w_btn_input', fromCompId: 'mcu1', fromPinId: 'D2', toCompId: 'btn_pedestrian', toPinId: '1', color: '#3B82F6' },
    { id: 'w_btn_gnd', fromCompId: 'btn_pedestrian', fromPinId: '2', toCompId: 'mcu1', toPinId: 'GND', color: '#1E293B' },
  ],
  probes: [],
  firmware: {
    code: `// Arduino Uno Smart Intersection Traffic Sequencer
const int RED_PIN = 12;
const int YEL_PIN = 11;
const int GRN_PIN = 10;
const int BTN_PIN = 2;

int cycleCounter = 0;

void setup() {
  Serial.begin(115200);
  pinMode(RED_PIN, OUTPUT);
  pinMode(YEL_PIN, OUTPUT);
  pinMode(GRN_PIN, OUTPUT);
  pinMode(BTN_PIN, INPUT_PULLUP);
  Serial.println("[SYSTEM] Traffic Intersection Controller Online");
}

void loop() {
  cycleCounter++;
  
  // 1. GREEN PHASE: Traffic Flowing
  digitalWrite(RED_PIN, LOW);
  digitalWrite(YEL_PIN, LOW);
  digitalWrite(GRN_PIN, HIGH);
  Serial.print("[TRAFFIC] Phase: GREEN — Traffic moving smoothly. Cycle: ");
  Serial.println(cycleCounter);
  delay(2000);

  // 2. YELLOW PHASE: Slow Down
  digitalWrite(GRN_PIN, LOW);
  digitalWrite(YEL_PIN, HIGH);
  Serial.println("[TRAFFIC] Phase: YELLOW — Prepare to halt.");
  delay(800);

  // 3. RED PHASE: Pedestrians Crossing
  digitalWrite(YEL_PIN, LOW);
  digitalWrite(RED_PIN, HIGH);
  Serial.println("[TRAFFIC] Phase: RED — Pedestrians cross safely.");
  delay(2000);
}`,
    language: 'arduino',
    targetMcu: 'ATmega328P',
    boardId: 'arduino-uno',
    serialLog: [
      '[UART] Initialized Serial at 115200 baud',
      '[SYSTEM] Traffic Intersection Controller Online',
    ],
    isRunning: true,
    gpioStates: {
      10: { mode: 'OUTPUT', value: 1, analogVal: 255 },
      11: { mode: 'OUTPUT', value: 0, analogVal: 0 },
      12: { mode: 'OUTPUT', value: 0, analogVal: 0 },
      2: { mode: 'INPUT', value: 1, analogVal: 1023 },
    },
  },
  pcb: {
    widthMm: 90,
    heightMm: 70,
    boardThicknessMm: 1.6,
    copperLayers: 2,
    pads: [],
    tracks: [],
    drcErrors: [],
  },
  instruments: {
    oscilloscope: {
      timebaseMs: 500,
      ch1ScaleV: 2,
      ch2ScaleV: 2,
      ch1Enabled: true,
      ch2Enabled: true,
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
      channels: [
        { id: 'ch_grn', label: 'D10 (GRN)', samples: [1, 1, 0, 0, 0] },
        { id: 'ch_yel', label: 'D11 (YEL)', samples: [0, 0, 1, 0, 0] },
        { id: 'ch_red', label: 'D12 (RED)', samples: [0, 0, 0, 1, 1] },
      ],
      sampleRateHz: 500,
      running: true,
    },
  },
};

// ---------------------------------------------------------------------------
// 2. ESP32 ULTRASONIC RADAR & PROXIMITY TELEMETRY
// ---------------------------------------------------------------------------
export const TEMPLATE_ESP32_RADAR: EngineeringProject = {
  id: 'tmpl_esp32_sonar_radar',
  title: 'ESP32 HC-SR04 Ultrasonic Sonar with Piezo Alarm',
  description:
    'IoT proximity detection radar measuring echo pulse timing in microseconds, computing metric distance (cm), and triggering an active audio warning when obstacles are detected.',
  version: '1.0.0',
  createdAt: '2026-03-02T14:30:00.000Z',
  updatedAt: '2026-03-16T18:00:00.000Z',
  components: [
    {
      id: 'esp32_mcu',
      type: 'ESP32_DEVKIT',
      designator: 'U1',
      label: 'ESP32-WROOM-32',
      category: 'microcontrollers',
      x: 280,
      y: 250,
      rotation: 0,
      value: 'ESP32',
      parameters: { clockMhz: 240, usbPlugged: true },
      pins: [
        { id: '5V', name: '5V', x: -60, y: -45, pinType: 'power' },
        { id: 'GND', name: 'GND', x: -60, y: -25, pinType: 'power' },
        { id: 'D5', name: 'GPIO 5', x: 60, y: -20, pinType: 'output' },
        { id: 'D18', name: 'GPIO 18', x: 60, y: 0, pinType: 'input' },
        { id: 'D21', name: 'GPIO 21', x: 60, y: 25, pinType: 'output' },
      ],
      footprint: 'Module:ESP32-WROOM-32',
      model3d: 'esp32_wroom_32',
    },
    {
      id: 'sonar1',
      type: 'HC_SR04',
      designator: 'SEN1',
      label: 'HC-SR04 Ultrasonic Sonar',
      category: 'sensors',
      x: 520,
      y: 190,
      rotation: 0,
      value: '2cm - 400cm',
      parameters: { distanceCm: 25.0 },
      pins: [
        { id: 'VCC', name: 'VCC', x: -30, y: -20, pinType: 'power' },
        { id: 'TRIG', name: 'TRIG', x: -30, y: -5, pinType: 'input' },
        { id: 'ECHO', name: 'ECHO', x: -30, y: 10, pinType: 'output' },
        { id: 'GND', name: 'GND', x: -30, y: 25, pinType: 'power' },
      ],
      footprint: 'Sensor:HC-SR04',
      model3d: 'sensor_ultrasonic_hc_sr04',
    },
    {
      id: 'buzzer1',
      type: 'BUZZER_ACTIVE',
      designator: 'BZ1',
      label: 'Piezo Alarm 5V',
      category: 'active',
      x: 520,
      y: 330,
      rotation: 0,
      value: '5V Piezo',
      parameters: { ratedVoltage: 5 },
      pins: [
        { id: '+', name: '+', x: -20, y: 0, pinType: 'power' },
        { id: '-', name: '-', x: 20, y: 0, pinType: 'power' },
      ],
      footprint: 'Buzzer_Beeper:Buzzer_12x9.5RM7.6',
      model3d: 'buzzer_active_5v',
    },
    {
      id: 'gnd_sonar',
      type: 'GROUND',
      designator: 'GND1',
      label: 'GND',
      category: 'sources',
      x: 650,
      y: 280,
      rotation: 0,
      value: '0V',
      parameters: { voltage: 0 },
      pins: [{ id: '1', name: 'GND', x: 0, y: -15, pinType: 'power' }],
      footprint: 'TestPoint_Pad_D1.0mm',
    },
  ],
  wires: [
    { id: 'w_trig', fromCompId: 'esp32_mcu', fromPinId: 'D5', toCompId: 'sonar1', toPinId: 'TRIG', color: '#F97316' },
    { id: 'w_echo', fromCompId: 'esp32_mcu', fromPinId: 'D18', toCompId: 'sonar1', toPinId: 'ECHO', color: '#3B82F6' },
    { id: 'w_buzz_ctrl', fromCompId: 'esp32_mcu', fromPinId: 'D21', toCompId: 'buzzer1', toPinId: '+', color: '#EF4444' },
    { id: 'w_vcc_sonar', fromCompId: 'esp32_mcu', fromPinId: '5V', toCompId: 'sonar1', toPinId: 'VCC', color: '#EF4444' },
    { id: 'w_gnd_sonar', fromCompId: 'sonar1', toPinId: 'GND', toCompId: 'gnd_sonar', fromPinId: 'GND', color: '#1E293B' },
    { id: 'w_gnd_buzz', fromCompId: 'buzzer1', fromPinId: '-', toCompId: 'gnd_sonar', toPinId: '1', color: '#1E293B' },
    { id: 'w_gnd_esp', fromCompId: 'esp32_mcu', fromPinId: 'GND', toCompId: 'gnd_sonar', toPinId: '1', color: '#1E293B' },
  ],
  probes: [],
  firmware: {
    code: `// ESP32 Ultrasonic Sonar Radar Telemetry
const int TRIG_PIN = 5;
const int ECHO_PIN = 18;
const int BUZZ_PIN = 21;

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUZZ_PIN, OUTPUT);
  Serial.println("[RADAR] ESP32 Ultrasonic Proximity Sensor Active");
}

void loop() {
  // Trigger 10us ultrasonic pulse
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // Measure echo pulse roundtrip duration
  long durationUs = pulseIn(ECHO_PIN, HIGH);
  // Speed of sound: 343 m/s = 0.0343 cm/us -> distance = (duration * 0.0343) / 2
  float distanceCm = durationUs * 0.034 / 2.0;

  Serial.print("[SONAR] Distance: ");
  Serial.print(distanceCm);
  Serial.println(" cm");

  // Proximity warning threshold: 20 cm
  if (distanceCm > 0 && distanceCm < 20.0) {
    digitalWrite(BUZZ_PIN, HIGH);
    Serial.println(">>> [ALERT] Obstacle in proximity threshold! <<<");
  } else {
    digitalWrite(BUZZ_PIN, LOW);
  }

  delay(250);
}`,
    language: 'arduino',
    targetMcu: 'ESP32',
    boardId: 'esp32-devkit',
    serialLog: [
      '[UART] Initialized Serial at 115200 baud',
      '[RADAR] ESP32 Ultrasonic Proximity Sensor Active',
    ],
    isRunning: true,
    gpioStates: {
      5: { mode: 'OUTPUT', value: 0, analogVal: 0 },
      18: { mode: 'INPUT', value: 0, analogVal: 0 },
      21: { mode: 'OUTPUT', value: 0, analogVal: 0 },
    },
  },
  pcb: {
    widthMm: 100,
    heightMm: 70,
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
      reading: 3.3,
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
      channels: [
        { id: 'ch_trig', label: 'TRIG (GPIO5)', samples: [0, 1, 0, 0] },
        { id: 'ch_echo', label: 'ECHO (GPIO18)', samples: [0, 0, 1, 1] },
      ],
      sampleRateHz: 1000,
      running: true,
    },
  },
};

// ---------------------------------------------------------------------------
// 3. DARKNESS-ACTIVATED AUTOMATIC NIGHT LIGHT (LDR + TRANSISTOR)
// ---------------------------------------------------------------------------
export const TEMPLATE_LDR_NIGHT_LIGHT: EngineeringProject = {
  id: 'tmpl_ldr_night_light',
  title: 'Automatic Darkness-Activated Night Light (LDR + BJT)',
  description:
    'Cadmium-sulfide photoresistor voltage divider driving an NPN bipolar junction transistor switch to automatically illuminate a 5mm white LED when ambient light drops below threshold.',
  version: '1.0.0',
  createdAt: '2026-03-03T09:00:00.000Z',
  updatedAt: '2026-03-12T15:00:00.000Z',
  components: [
    {
      id: 'bat_9v',
      type: 'BATTERY',
      designator: 'BT1',
      label: '9V DC Supply',
      category: 'sources',
      x: 100,
      y: 240,
      rotation: 0,
      value: '9V',
      parameters: { voltage: 9.0 },
      pins: [
        { id: 'p', name: '+', x: 0, y: -25, pinType: 'power' },
        { id: 'n', name: '-', x: 0, y: 25, pinType: 'power' },
      ],
      footprint: 'BatteryHolder_Keystone_2460_1xAA',
      model3d: 'battery_9v_block',
    },
    {
      id: 'pot_threshold',
      type: 'POTENTIOMETER',
      designator: 'RV1',
      label: 'Sensitivity Trimmer 100k',
      category: 'passive',
      x: 280,
      y: 160,
      rotation: 0,
      value: '100kΩ',
      parameters: { totalResistance: 100000, wiperPosition: 0.6 },
      pins: [
        { id: '1', name: '1', x: -25, y: 0, pinType: 'passive' },
        { id: '2', name: 'WIPER', x: 0, y: 25, pinType: 'passive' },
        { id: '3', name: '3', x: 25, y: 0, pinType: 'passive' },
      ],
      footprint: 'Potentiometer_THT:Potentiometer_Bourns_3386P_Vertical',
      model3d: 'potentiometer_3pin_trimmer',
    },
    {
      id: 'ldr1',
      type: 'SENSOR_LDR',
      designator: 'LDR1',
      label: 'GL5528 Photoresistor',
      category: 'sensors',
      x: 280,
      y: 300,
      rotation: 0,
      value: '10kΩ-1MΩ',
      parameters: { lightResistance: 10000, darkResistance: 1000000, currentResistance: 85000 },
      pins: [
        { id: '1', name: '1', x: -20, y: 0, pinType: 'passive' },
        { id: '2', name: '2', x: 20, y: 0, pinType: 'passive' },
      ],
      footprint: 'OptoDevice:R_LDR_5.0x4.1mm_P3.4mm_Vertical',
      model3d: 'sensor_ldr_gl5528',
    },
    {
      id: 'q_bjt',
      type: 'BJT_NPN',
      designator: 'Q1',
      label: '2N2222A NPN Switch',
      category: 'active',
      x: 440,
      y: 240,
      rotation: 0,
      value: '2N2222',
      parameters: { beta: 150 },
      pins: [
        { id: 'b', name: 'BASE', x: -25, y: 0, pinType: 'input' },
        { id: 'c', name: 'COLLECTOR', x: 0, y: -25, pinType: 'passive' },
        { id: 'e', name: 'EMITTER', x: 0, y: 25, pinType: 'passive' },
      ],
      footprint: 'Package_TO_SOT_THT:TO-92_Inline',
      model3d: 'to92_transistor',
    },
    {
      id: 'r_limit',
      type: 'RESISTOR',
      designator: 'R_LED',
      label: 'LED Current Limit',
      category: 'passive',
      x: 440,
      y: 100,
      rotation: 0,
      value: '330Ω',
      parameters: { resistance: 330, powerRatingW: 0.25 },
      pins: [
        { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
        { id: '2', name: '2', x: 30, y: 0, pinType: 'passive' },
      ],
      footprint: 'Resistor_THT:R_Axial_DIN0207_P7.62mm_Horizontal',
      model3d: 'resistor_axial_horiz',
    },
    {
      id: 'led_night',
      type: 'LED',
      designator: 'LED1',
      label: 'Night Light (White)',
      category: 'active',
      x: 560,
      y: 100,
      rotation: 0,
      value: 'White LED',
      parameters: { color: '#F8FAFC', forwardVoltageV: 3.0 },
      pins: [
        { id: 'a', name: 'A', x: -25, y: 0, pinType: 'passive' },
        { id: 'k', name: 'K', x: 25, y: 0, pinType: 'passive' },
      ],
      footprint: 'LED_THT:LED_D5.0mm',
      model3d: 'led_5mm_diffused',
    },
    {
      id: 'gnd_ldr',
      type: 'GROUND',
      designator: 'GND1',
      label: 'GND',
      category: 'sources',
      x: 280,
      y: 400,
      rotation: 0,
      value: '0V',
      parameters: { voltage: 0 },
      pins: [{ id: '1', name: 'GND', x: 0, y: -15, pinType: 'power' }],
      footprint: 'TestPoint_Pad_D1.0mm',
    },
  ],
  wires: [
    { id: 'w_pwr_pot', fromCompId: 'bat_9v', fromPinId: 'p', toCompId: 'pot_threshold', toPinId: '1', color: '#EF4444' },
    { id: 'w_pot_ldr', fromCompId: 'pot_threshold', fromPinId: '2', toCompId: 'ldr1', toPinId: '1', color: '#EAB308' },
    { id: 'w_base_tap', fromCompId: 'pot_threshold', fromPinId: '2', toCompId: 'q_bjt', toPinId: 'b', color: '#EAB308' },
    { id: 'w_pwr_rled', fromCompId: 'bat_9v', fromPinId: 'p', toCompId: 'r_limit', toPinId: '1', color: '#EF4444' },
    { id: 'w_rled_anode', fromCompId: 'r_limit', fromPinId: '2', toCompId: 'led_night', toPinId: 'a', color: '#EF4444' },
    { id: 'w_cathode_coll', fromCompId: 'led_night', fromPinId: 'k', toCompId: 'q_bjt', toPinId: 'c', color: '#3B82F6' },
    { id: 'w_emit_gnd', fromCompId: 'q_bjt', fromPinId: 'e', toCompId: 'gnd_ldr', toPinId: '1', color: '#1E293B' },
    { id: 'w_ldr_gnd', fromCompId: 'ldr1', fromPinId: '2', toCompId: 'gnd_ldr', toPinId: '1', color: '#1E293B' },
    { id: 'w_bat_gnd', fromCompId: 'bat_9v', fromPinId: 'n', toCompId: 'gnd_ldr', toPinId: '1', color: '#1E293B' },
  ],
  probes: [],
  firmware: {
    code: '// Pure Analog BJT Transistor Circuit — No Microcontroller Firmware Required',
    language: 'arduino',
    targetMcu: 'None',
    serialLog: ['[ANALOG] Photoconductive sensor loop active', '[ANALOG] Ambient LDR resistance: 85kΩ'],
    isRunning: false,
    gpioStates: {},
  },
  pcb: {
    widthMm: 65,
    heightMm: 55,
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
      reading: 0.72,
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
      channels: [],
      sampleRateHz: 500,
      running: false,
    },
  },
};

// ---------------------------------------------------------------------------
// CURATED COMMUNITY SHOWCASE REPOSITORY (EI House Lab Verified)
// ---------------------------------------------------------------------------
export const CURATED_COMMUNITY_PROJECTS: CommunityProject[] = [
  {
    id: 'proj_555_flasher',
    title: 'NE555 Astable LED Pulse Flasher',
    description:
      'Classic 555 astable multivibrator blinking a 5mm LED with real-time waveform graticule, duty cycle, and RC time-constant solver.',
    author: 'Er. Monu Prajapati',
    category: 'analog',
    tags: ['NE555', 'Astable', 'LED Flasher', '3D Breadboard', 'Analog'],
    likes: 142,
    views: 1280,
    featured: true,
    createdAt: '2026-03-01T08:00:00.000Z',
    updatedAt: '2026-03-18T10:00:00.000Z',
    projectData: TEMPLATE_555_ASTABLE,
  },
  {
    id: 'proj_arduino_traffic',
    title: 'Arduino Uno 3-Way Traffic Light with Pedestrian Crosswalk',
    description:
      'Automated intersection with Red, Yellow, Green LEDs, crosswalk button, and C++ digital state-machine firmware with UART telemetry.',
    author: 'EI House R&D Team',
    category: 'mcu',
    tags: ['Arduino', 'Uno', 'Traffic Light', 'Firmware', 'C++'],
    likes: 218,
    views: 2450,
    featured: true,
    createdAt: '2026-03-05T12:00:00.000Z',
    updatedAt: '2026-03-18T11:00:00.000Z',
    projectData: TEMPLATE_ARDUINO_TRAFFIC_LIGHT,
  },
  {
    id: 'proj_esp32_sonar',
    title: 'ESP32 HC-SR04 Ultrasonic Sonar with Piezo Alarm',
    description:
      'Proximity radar measuring echo pulse timing in microseconds, computing metric distance (cm), and sounding an active piezo alarm below 20cm.',
    author: 'Vikram Sharma (Maker)',
    category: 'sensors',
    tags: ['ESP32', 'HC-SR04', 'Sonar', 'Radar', 'IoT', 'Buzzer'],
    likes: 185,
    views: 1940,
    featured: true,
    createdAt: '2026-03-08T15:00:00.000Z',
    updatedAt: '2026-03-18T09:30:00.000Z',
    projectData: TEMPLATE_ESP32_RADAR,
  },
  {
    id: 'proj_ldr_night_light',
    title: 'Automatic Darkness-Activated Night Light (LDR + BJT)',
    description:
      'Photoconductive sensor voltage divider driving a 2N2222 transistor switch to automatically turn on an LED when room light drops.',
    author: 'Priya Patel (Student)',
    category: 'analog',
    tags: ['LDR', 'Photoresistor', 'Transistor', '2N2222', 'Night Light'],
    likes: 96,
    views: 920,
    featured: false,
    createdAt: '2026-03-10T11:20:00.000Z',
    updatedAt: '2026-03-17T16:00:00.000Z',
    projectData: TEMPLATE_LDR_NIGHT_LIGHT,
  },
];
