import type { ComponentTemplate } from './component-catalog';

export interface MasterCategory25 {
  id: string;
  number: string;
  name: string;
  label: string;
}

export const MASTER_25_CATEGORIES: MasterCategory25[] = [
  { id: 'resistors', number: '01', name: 'Resistors', label: '01. Resistors' },
  { id: 'capacitors', number: '02', name: 'Capacitors', label: '02. Capacitors' },
  { id: 'inductors_transformers', number: '03', name: 'Inductors & Transformers', label: '03. Inductors & Transformers' },
  { id: 'diodes', number: '04', name: 'Diodes', label: '04. Diodes' },
  { id: 'transistors', number: '05', name: 'Transistors', label: '05. Transistors' },
  { id: 'thyristors_power_semis', number: '06', name: 'Thyristors & Power Semiconductors', label: '06. Thyristors & Power Semiconductors' },
  { id: 'integrated_circuits', number: '07', name: 'Integrated Circuits', label: '07. Integrated Circuits' },
  { id: 'microcontrollers_processors', number: '08', name: 'Microcontrollers & Processors', label: '08. Microcontrollers & Processors' },
  { id: 'optoelectronics_displays', number: '09', name: 'Optoelectronics & Displays', label: '09. Optoelectronics & Displays' },
  { id: 'sensors_transducers', number: '10', name: 'Sensors & Transducers', label: '10. Sensors & Transducers' },
  { id: 'switches_relays_electromechanical', number: '11', name: 'Switches, Relays & Electromechanical', label: '11. Switches, Relays & Electromechanical' },
  { id: 'connectors_wiring', number: '12', name: 'Connectors & Wiring', label: '12. Connectors & Wiring' },
  { id: 'batteries_power_sources', number: '13', name: 'Batteries & Power Sources', label: '13. Batteries & Power Sources' },
  { id: 'protection_devices', number: '14', name: 'Protection Devices', label: '14. Protection Devices' },
  { id: 'switchgear_controlgear', number: '15', name: 'Switchgear & Controlgear', label: '15. Switchgear & Controlgear' },
  { id: 'measuring_instruments', number: '16', name: 'Electrical Measuring Instruments', label: '16. Electrical Measuring Instruments' },
  { id: 'motors_drives', number: '17', name: 'Electric Motors & Drives', label: '17. Electric Motors & Drives' },
  { id: 'generators_power_conversion', number: '18', name: 'Generators & Power Conversion', label: '18. Generators & Power Conversion' },
  { id: 'electrical_installation', number: '19', name: 'Electrical Installation', label: '19. Electrical Installation' },
  { id: 'industrial_automation', number: '20', name: 'Industrial Automation', label: '20. Industrial Automation' },
  { id: 'lighting_electrical_loads', number: '21', name: 'Lighting & Electrical Loads', label: '21. Lighting & Electrical Loads' },
  { id: 'earthing_safety', number: '22', name: 'Earthing & Safety', label: '22. Earthing & Safety' },
  { id: 'rf_wireless', number: '23', name: 'RF & Wireless', label: '23. RF & Wireless' },
  { id: 'audio_components', number: '24', name: 'Audio Components', label: '24. Audio Components' },
  { id: 'mechanical_thermal', number: '25', name: 'Mechanical & Thermal Accessories', label: '25. Mechanical & Thermal Accessories' },
];

const categoryObjectCache = new WeakMap<object, MasterCategory25>();
const categoryStringCache = new Map<string, MasterCategory25>();

/**
 * Maps any component to its exact 25-category engineering classification
 */
export function getCategory25ForComponent(comp: {
  type: string;
  name?: string;
  category?: string;
  subCategory?: string;
}): MasterCategory25 {
  if (comp && typeof comp === 'object') {
    const cached = categoryObjectCache.get(comp);
    if (cached) return cached;
  }
  const key = `${comp.type}|${comp.name || ''}|${comp.category || ''}|${comp.subCategory || ''}`;
  const strCached = categoryStringCache.get(key);
  if (strCached) {
    if (comp && typeof comp === 'object') categoryObjectCache.set(comp, strCached);
    return strCached;
  }

  const result = computeCategory25Raw(comp);
  categoryStringCache.set(key, result);
  if (comp && typeof comp === 'object') categoryObjectCache.set(comp, result);
  return result;
}

function computeCategory25Raw(comp: {
  type: string;
  name?: string;
  category?: string;
  subCategory?: string;
}): MasterCategory25 {
  const t = (comp.type || '').toUpperCase();
  const cat = (comp.category || '').toLowerCase();
  const sub = (comp.subCategory || '').toLowerCase();

  // 01. Resistors
  if (t === 'RESISTOR' || t === 'POTENTIOMETER' || t === 'SENSOR_LDR' || sub.includes('resistor') || sub.includes('thermistor') || sub.includes('variable')) {
    return MASTER_25_CATEGORIES[0];
  }

  // 02. Capacitors
  if (t.includes('CAPACITOR') || sub.includes('capacitor')) {
    return MASTER_25_CATEGORIES[1];
  }

  // 03. Inductors & Transformers
  if (t.includes('INDUCTOR') || t.includes('TRANSFORMER') || sub.includes('inductor') || sub.includes('choke')) {
    return MASTER_25_CATEGORIES[2];
  }

  // 04. Diodes
  if (
    (t.includes('DIODE') && !t.includes('PHOTODIODE')) ||
    t.includes('BRIDGE_RECTIFIER') ||
    sub.includes('diode') ||
    sub.includes('rectifier')
  ) {
    return MASTER_25_CATEGORIES[3];
  }

  // 05. Transistors
  if (
    t.includes('BJT') ||
    t.includes('MOSFET') ||
    t.includes('JFET') ||
    t.includes('IGBT') ||
    t.includes('TRANSISTOR') ||
    sub.includes('bjt') ||
    sub.includes('mosfet')
  ) {
    return MASTER_25_CATEGORIES[4];
  }

  // 06. Thyristors & Power Semiconductors
  if (t.includes('THYRISTOR') || t.includes('TRIAC') || t.includes('DIAC') || t.includes('SCR') || sub.includes('thyristor')) {
    return MASTER_25_CATEGORIES[5];
  }

  // 07. Integrated Circuits
  if (
    t.includes('555') ||
    t.includes('OPAMP') ||
    t.includes('COMPARATOR') ||
    t.includes('LOGIC_') ||
    t.includes('74HC') ||
    t.includes('DRIVER_IR2104') ||
    t.includes('OPTOCOUPLER') ||
    cat === 'analog_ics' ||
    cat === 'digital_logic' ||
    cat === 'logic'
  ) {
    return MASTER_25_CATEGORIES[6];
  }

  // 08. Microcontrollers & Processors
  if (
    cat === 'microcontrollers' ||
    t.includes('ARDUINO') ||
    t.includes('ATMEGA') ||
    t.includes('ESP32') ||
    t.includes('ESP8266') ||
    t.includes('STM32') ||
    t.includes('PICO') ||
    t.includes('RP2040') ||
    sub.includes('mcu')
  ) {
    return MASTER_25_CATEGORIES[7];
  }

  // 09. Optoelectronics & Displays
  if (
    t.includes('LED') ||
    t.includes('DISPLAY') ||
    t.includes('OLED') ||
    t.includes('LCD') ||
    t.includes('7SEG') ||
    t.includes('PHOTODIODE') ||
    cat === 'displays' ||
    sub.includes('display') ||
    sub.includes('optocoupler')
  ) {
    return MASTER_25_CATEGORIES[8];
  }

  // 10. Sensors & Transducers
  if (
    t.startsWith('SENSOR_') ||
    t.includes('ULTRASONIC') ||
    t.includes('HC_SR04') ||
    t.includes('DHT') ||
    t.includes('MPU') ||
    t.includes('MQ2') ||
    t.includes('HALL') ||
    t.includes('LOAD_CELL') ||
    t.includes('ENCODER') ||
    t.includes('PROXIMITY') ||
    t.includes('KEYPAD') ||
    cat === 'sensors'
  ) {
    return MASTER_25_CATEGORIES[9];
  }

  // 11. Switches, Relays & Electromechanical
  if (
    (t.includes('SWITCH') && !t.includes('ISOLATOR') && !t.includes('CHANGEOVER') && !t.includes('KSD301')) ||
    t.includes('PUSHBUTTON') ||
    t.includes('BUTTON') ||
    (t.includes('RELAY') && !t.includes('THERMAL') && !t.includes('SAFETY')) ||
    t.includes('SOLENOID') ||
    cat === 'switches'
  ) {
    return MASTER_25_CATEGORIES[10];
  }

  // 19. Electrical Installation (Priority over generic connectors/terminals)
  if (
    t.includes('DIN_RAIL') ||
    t.includes('TERMINAL_PE_N') ||
    t.includes('CONDUIT') ||
    sub.includes('installation')
  ) {
    return MASTER_25_CATEGORIES[18];
  }

  // 18. Generators & Power Conversion (Priority over generic sources)
  if (
    t.includes('REGULATOR') ||
    t.includes('7805') ||
    t.includes('LM317') ||
    t.includes('BUCK') ||
    t.includes('BOOST') ||
    t.includes('CONVERTER') ||
    t.includes('INVERTER') ||
    t.includes('GENERATOR') ||
    t.includes('ALTERNATOR') ||
    sub.includes('conversion') ||
    sub.includes('regulator')
  ) {
    return MASTER_25_CATEGORIES[17];
  }

  // 12. Connectors & Wiring
  if (
    t.includes('CONNECTOR') ||
    t.includes('TERMINAL') ||
    t.includes('BARREL') ||
    t.includes('USBC') ||
    t.includes('HEADER') ||
    cat === 'connectors'
  ) {
    return MASTER_25_CATEGORIES[11];
  }

  // 13. Batteries & Power Sources
  if (
    t.includes('BATTERY') ||
    t.includes('DC_VOLTAGE') ||
    t.includes('DC_SUPPLY') ||
    t.includes('AC_MAINS') ||
    t.includes('SOLAR') ||
    t.includes('POWER_SUPPLY') ||
    cat === 'sources'
  ) {
    return MASTER_25_CATEGORIES[12];
  }

  // 14. Protection Devices
  if (
    t.includes('FUSE') ||
    t.includes('MCB') ||
    t.includes('MCCB') ||
    t.includes('RCCB') ||
    t.includes('MPCB') ||
    t.includes('SPD') ||
    t.includes('SAFETY_RELAY') ||
    t.includes('RELAY_THERMAL') ||
    t.includes('OVERLOAD') ||
    cat === 'protection'
  ) {
    return MASTER_25_CATEGORIES[13];
  }

  // 15. Switchgear & Controlgear
  if (
    t.includes('CONTACTOR') ||
    t.includes('AUXILIARY_CONTACT') ||
    t.includes('SWITCH_ISOLATOR') ||
    t.includes('SWITCH_CHANGEOVER') ||
    t.includes('SWITCH_SELECTOR') ||
    t.includes('SWITCH_ROTARY') ||
    cat === 'relays_contactors'
  ) {
    return MASTER_25_CATEGORIES[14];
  }

  // 16. Electrical Measuring Instruments
  if (t.includes('METER_') || t.includes('MULTIMETER') || t.includes('VOLTMETER') || t.includes('AMMETER') || t.includes('OSCILLOSCOPE') || t.includes('FUNCTION_GENERATOR') || cat === 'instruments') {
    return MASTER_25_CATEGORIES[15];
  }

  // 17. Electric Motors & Drives
  if (t.includes('MOTOR') || t.includes('STEPPER') || t.includes('SERVO') || t.includes('DRIVER_L298N') || t.includes('VFD') || t.includes('SOFT_STARTER') || cat === 'motor_control') {
    return MASTER_25_CATEGORIES[16];
  }

  // 20. Industrial Automation
  if (t.includes('PLC') || t.includes('EMERGENCY_STOP') || t.includes('ESTOP') || t.includes('LIMIT') || t.includes('FOOT') || cat === 'industrial' || cat === 'plc_automation') {
    return MASTER_25_CATEGORIES[19];
  }

  // 21. Lighting & Electrical Loads
  if (t.includes('PILOT_LAMP') || t.includes('FAN') || t.includes('HEATER') || t.includes('LOAD')) {
    return MASTER_25_CATEGORIES[20];
  }

  // 22. Earthing & Safety
  if (t.includes('GROUND') || t.includes('EARTH') || t.includes('PE') || sub.includes('earth')) {
    return MASTER_25_CATEGORIES[21];
  }

  // 23. RF & Wireless
  if (t.includes('NRF24') || t.includes('BLUETOOTH') || t.includes('HC05') || t.includes('LORA') || t.includes('ANTENNA') || t.includes('WIFI') || cat === 'communication') {
    return MASTER_25_CATEGORIES[22];
  }

  // 24. Audio Components
  if (t.includes('BUZZER') || t.includes('SPEAKER') || t.includes('MIC') || t.includes('PAM8403') || t.includes('AUDIO') || sub.includes('audio')) {
    return MASTER_25_CATEGORIES[23];
  }

  // 25. Mechanical & Thermal Accessories
  if (t.includes('THERMAL') || t.includes('HEATSINK') || t.includes('PELTIER') || t.includes('KSD301') || sub.includes('thermal') || sub.includes('mechanical')) {
    return MASTER_25_CATEGORIES[24];
  }

  // Fallback to passives or components category
  return MASTER_25_CATEGORIES[0];
}

/**
 * Filter helper for 3 Database Tiers: 'all' | 'generic' | 'real' | 'industrial'
 */
export function filterComponentsByTier(
  components: ComponentTemplate[],
  tier: 'all' | 'generic' | 'real' | 'industrial'
): ComponentTemplate[] {
  if (tier === 'all') return components;
  return components.filter((c) => (c.libraryTier || 'generic') === tier);
}

/**
 * Simulation Status Badge Descriptor
 */
export function getSimulationBadgeInfo(status?: string): {
  label: 'Sim' | 'Partial' | 'Catalog';
  badgeClass: string;
} {
  if (status === 'full_mna' || status === 'supported') {
    return {
      label: 'Sim',
      badgeClass: 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60',
    };
  }
  if (status === 'behavioral' || status === 'transpiled_mcu' || status === 'partial') {
    return {
      label: 'Partial',
      badgeClass: 'bg-amber-950/80 text-amber-400 border border-amber-800/60',
    };
  }
  return {
    label: 'Catalog',
    badgeClass: 'bg-slate-900 text-slate-400 border border-slate-700/60',
  };
}
