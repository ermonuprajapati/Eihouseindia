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
import type { ComponentDatasheet, DatasheetCategory, UserProfile, UserRole } from '@/types';

export const DATASHEET_CATEGORIES: DatasheetCategory[] = [
  {
    slug: 'all',
    name: 'All Categories',
    description: 'Browse complete electronic component datasheet index.',
  },
  {
    slug: 'microcontrollers',
    name: 'Microcontrollers & MCUs',
    description: 'AVR, ARM Cortex, ESP32, PIC, and embedded microprocessors.',
  },
  {
    slug: 'op-amps',
    name: 'Operational Amplifiers',
    description: 'Precision, low-noise, instrumentation, and dual/quad op-amps.',
  },
  {
    slug: 'voltage-regulators',
    name: 'Voltage Regulators & PMIC',
    description: 'Linear LDO regulators, buck/boost controllers, and power ICs.',
  },
  {
    slug: 'mosfets',
    name: 'MOSFETs & Power Switching',
    description: 'N-channel, P-channel, power trench, and logic-level MOSFETs.',
  },
  {
    slug: 'transistors',
    name: 'Bipolar Transistors & BJTs',
    description: 'General-purpose NPN/PNP small signal and high current switches.',
  },
  {
    slug: 'diodes',
    name: 'Diodes & Rectifiers',
    description: 'Schottky, Zener, fast-recovery, and bridge rectifiers.',
  },
  {
    slug: 'timers-clocks',
    name: 'Timers, Clocks & Logic ICs',
    description: '555 precision timers, RTC real-time clocks, and counter ICs.',
  },
  {
    slug: 'sensors-communication',
    name: 'Sensors & Interface ICs',
    description: 'IMU sensors, RS-485 transceivers, optocouplers, and motor drivers.',
  },
];

export function getAllDataSheetSearchUrl(queryStr: string): string {
  const clean = queryStr.trim().replace(/\s+/g, '+');
  return `https://www.alldatasheet.com/view.jsp?Searchword=${encodeURIComponent(clean)}`;
}

export function getDigiKeySearchUrl(queryStr: string): string {
  return `https://www.digikey.in/en/products/result?keywords=${encodeURIComponent(queryStr.trim())}`;
}

export function getMouserSearchUrl(queryStr: string): string {
  return `https://www.mouser.in/c/?q=${encodeURIComponent(queryStr.trim())}`;
}

export const DEFAULT_DATASHEETS: ComponentDatasheet[] = [
  {
    id: 'ds-lm358',
    partNumber: 'LM358',
    normalizedPartNumber: 'LM358',
    manufacturer: 'Texas Instruments',
    category: 'Operational Amplifiers',
    description: 'Industry standard dual, 30V, 700kHz operational amplifier with wide supply range from single 3V to 32V.',
    package: 'DIP-8, SOIC-8, TSSOP-8',
    pinCount: 8,
    mountingType: 'Through Hole',
    datasheetUrl: 'https://www.ti.com/lit/ds/symlink/lm358.pdf',
    manufacturerUrl: 'https://www.ti.com/product/LM358',
    allDataSheetUrl: 'https://www.alldatasheet.com/view.jsp?Searchword=LM358',
    verified: true,
    featured: true,
    specs: {
      'Supply Voltage': '3V to 32V (or ±1.5V to ±16V)',
      'Gain Bandwidth': '700 kHz',
      'Channels': 'Dual (2 Op-Amps)',
      'Input Offset Voltage': '2 mV (typical)',
      'Output Current': '20 mA',
    },
  },
  {
    id: 'ds-ne555',
    partNumber: 'NE555',
    normalizedPartNumber: 'NE555',
    manufacturer: 'Texas Instruments',
    category: 'Timers, Clocks & Logic ICs',
    description: 'High-precision monolithic timing circuit capable of producing accurate time delays or oscillation frequencies up to 500 kHz.',
    package: 'DIP-8, SOIC-8',
    pinCount: 8,
    mountingType: 'Through Hole',
    datasheetUrl: 'https://www.ti.com/lit/ds/symlink/ne555.pdf',
    manufacturerUrl: 'https://www.ti.com/product/NE555',
    allDataSheetUrl: 'https://www.alldatasheet.com/view.jsp?Searchword=NE555',
    verified: true,
    featured: true,
    specs: {
      'Operating Voltage': '4.5V to 16V',
      'Max Frequency': '500 kHz',
      'Timing Range': 'Microseconds to Hours',
      'Sink/Source Current': '200 mA',
      'Operating Temperature': '0°C to 70°C',
    },
  },
  {
    id: 'ds-atmega328p',
    partNumber: 'ATmega328P',
    normalizedPartNumber: 'ATMEGA328P',
    manufacturer: 'Microchip Technology',
    category: 'Microcontrollers & MCUs',
    description: 'High-performance 8-bit AVR RISC-based microcontroller with 32KB ISP flash, 2KB SRAM, 1KB EEPROM, 23 I/O lines, and 10-bit ADC.',
    package: 'DIP-28, TQFP-32, QFN-32',
    pinCount: 28,
    mountingType: 'Through Hole',
    datasheetUrl: 'https://ww1.microchip.com/downloads/en/DeviceDoc/Atmel-7810-Automotive-Microcontrollers-ATmega328P_Datasheet.pdf',
    manufacturerUrl: 'https://www.microchip.com/en-us/product/ATmega328P',
    allDataSheetUrl: 'https://www.alldatasheet.com/view.jsp?Searchword=ATmega328P',
    verified: true,
    featured: true,
    specs: {
      'Core Architecture': '8-bit AVR RISC (Up to 20 MHz)',
      'Flash Memory': '32 KB (with Read-While-Write)',
      'SRAM': '2 KB',
      'EEPROM': '1 KB',
      'Operating Voltage': '1.8V to 5.5V',
    },
  },
  {
    id: 'ds-esp32-s3',
    partNumber: 'ESP32-S3',
    normalizedPartNumber: 'ESP32S3',
    manufacturer: 'Espressif Systems',
    category: 'Microcontrollers & MCUs',
    description: 'Dual-core Xtensa 32-bit LX7 MCU running at 240 MHz with 2.4 GHz Wi-Fi 4 (802.11 b/g/n) and Bluetooth 5 (LE) for AI and IoT edge computing.',
    package: 'QFN-56, WROOM/WROVER Modules',
    pinCount: 56,
    mountingType: 'SMD',
    datasheetUrl: 'https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf',
    manufacturerUrl: 'https://www.espressif.com/en/products/socs/esp32-s3',
    allDataSheetUrl: 'https://www.alldatasheet.com/view.jsp?Searchword=ESP32-S3',
    verified: true,
    featured: true,
    specs: {
      'CPU': 'Xtensa 32-bit Dual-Core LX7 up to 240MHz',
      'Wireless': 'Wi-Fi 802.11 b/g/n + BLE 5.0 Mesh',
      'SRAM': '512 KB internal + PSRAM support',
      'Vector Instructions': 'Accelerated AI / DSP workloads',
      'Operating Voltage': '3.0V to 3.6V',
    },
  },
  {
    id: 'ds-stm32f103c8t6',
    partNumber: 'STM32F103C8T6',
    normalizedPartNumber: 'STM32F103C8T6',
    manufacturer: 'STMicroelectronics',
    category: 'Microcontrollers & MCUs',
    description: 'ARM Cortex-M3 32-bit microcontroller running at 72 MHz, 64 KB Flash memory, 20 KB SRAM, USB 2.0 full speed, and dual CAN/USART peripherals.',
    package: 'LQFP-48',
    pinCount: 48,
    mountingType: 'SMD',
    datasheetUrl: 'https://www.st.com/resource/en/datasheet/stm32f103c8.pdf',
    manufacturerUrl: 'https://www.st.com/en/microcontrollers-microprocessors/stm32f103c8.html',
    allDataSheetUrl: 'https://www.alldatasheet.com/view.jsp?Searchword=STM32F103C8T6',
    verified: true,
    featured: true,
    specs: {
      'Core': 'ARM 32-bit Cortex-M3 (72 MHz max)',
      'Flash Memory': '64 KB',
      'SRAM': '20 KB',
      'Timers': '4 x 16-bit timers with PWM',
      'Interfaces': '2x I2C, 3x USART, 2x SPI, USB, CAN',
    },
  },
  {
    id: 'ds-irfz44n',
    partNumber: 'IRFZ44N',
    normalizedPartNumber: 'IRFZ44N',
    manufacturer: 'Infineon Technologies',
    category: 'MOSFETs & Power Switching',
    description: 'Fifth-generation HEXFET power MOSFET designed for fast switching, extremely low on-resistance (17.5mΩ), and 55V 49A continuous drain rating.',
    package: 'TO-220AB',
    pinCount: 3,
    mountingType: 'Through Hole',
    datasheetUrl: 'https://www.infineon.com/dgdl/irfz44n.pdf?fileId=5546d462533600a40153563b3a9f220d',
    manufacturerUrl: 'https://www.infineon.com/cms/en/product/power/mosfet/n-channel/irfz44n/',
    allDataSheetUrl: 'https://www.alldatasheet.com/view.jsp?Searchword=IRFZ44N',
    verified: true,
    featured: true,
    specs: {
      'Drain-Source Voltage (Vdss)': '55V',
      'Continuous Drain Current (Id)': '49A (at 25°C)',
      'RDS(on) Max': '17.5 mΩ (at Vgs=10V)',
      'Total Gate Charge (Qg)': '63 nC',
      'Operating Temperature': '-55°C to 175°C',
    },
  },
  {
    id: 'ds-lm7805',
    partNumber: 'LM7805',
    normalizedPartNumber: 'LM7805',
    manufacturer: 'STMicroelectronics',
    category: 'Voltage Regulators & PMIC',
    description: 'Three-terminal positive fixed voltage regulator providing local on-card regulation with internal current-limiting and thermal overload shutdown.',
    package: 'TO-220, D2PAK',
    pinCount: 3,
    mountingType: 'Through Hole',
    datasheetUrl: 'https://www.st.com/resource/en/datasheet/l78.pdf',
    manufacturerUrl: 'https://www.st.com/en/power-management/l78.html',
    allDataSheetUrl: 'https://www.alldatasheet.com/view.jsp?Searchword=LM7805',
    verified: true,
    featured: true,
    specs: {
      'Output Voltage': '5.0V (±4% tolerance)',
      'Output Current': 'Up to 1.5A',
      'Input Voltage Range': '7V to 35V',
      'Dropout Voltage': '2.0V (typical at 1A)',
      'Protection': 'Internal thermal shutdown & safe area',
    },
  },
  {
    id: 'ds-2n2222',
    partNumber: '2N2222',
    normalizedPartNumber: '2N2222',
    manufacturer: 'onsemi',
    category: 'Bipolar Transistors & BJTs',
    description: 'Classic NPN silicon epitaxial planar transistor designed for high-speed switching and DC to VHF amplifier applications up to 800 mA.',
    package: 'TO-92 (PN2222), TO-18',
    pinCount: 3,
    mountingType: 'Through Hole',
    datasheetUrl: 'https://www.onsemi.com/pdf/datasheet/p2n2222a-d.pdf',
    manufacturerUrl: 'https://www.onsemi.com/products/discrete-power-modules/general-purpose-and-low-vcesat-transistors/pn2222a',
    allDataSheetUrl: 'https://www.alldatasheet.com/view.jsp?Searchword=2N2222',
    verified: true,
    featured: false,
    specs: {
      'Collector-Emitter Voltage (Vceo)': '40V',
      'Collector Current (Ic)': '800 mA (Continuous)',
      'DC Current Gain (hFE)': '100 to 300 (at 150mA)',
      'Transition Frequency (fT)': '300 MHz',
      'Total Device Dissipation': '625 mW',
    },
  },
  {
    id: 'ds-bc547',
    partNumber: 'BC547',
    normalizedPartNumber: 'BC547',
    manufacturer: 'onsemi',
    category: 'Bipolar Transistors & BJTs',
    description: 'NPN general purpose small-signal transistor with high voltage rating (45V) and low noise figure, ideal for preamp and switching stages.',
    package: 'TO-92',
    pinCount: 3,
    mountingType: 'Through Hole',
    datasheetUrl: 'https://www.onsemi.com/pdf/datasheet/bc546-d.pdf',
    manufacturerUrl: 'https://www.onsemi.com/products/discrete-power-modules/general-purpose-and-low-vcesat-transistors/bc547',
    allDataSheetUrl: 'https://www.alldatasheet.com/view.jsp?Searchword=BC547',
    verified: true,
    featured: false,
    specs: {
      'Collector-Emitter Voltage (Vceo)': '45V',
      'Collector Current (Ic)': '100 mA',
      'DC Current Gain (hFE)': '110 to 800 (A/B/C bins)',
      'Transition Frequency (fT)': '300 MHz',
      'Noise Figure': '2 dB typical',
    },
  },
  {
    id: 'ds-1n4007',
    partNumber: '1N4007',
    normalizedPartNumber: '1N4007',
    manufacturer: 'Vishay Intertechnology',
    category: 'Diodes & Rectifiers',
    description: 'General purpose 1000V 1A silicon rectifier diode with diffused junction and low forward voltage drop for power supply rectification.',
    package: 'DO-41 (DO-204AL)',
    pinCount: 2,
    mountingType: 'Through Hole',
    datasheetUrl: 'https://www.vishay.com/docs/88503/1n4001.pdf',
    manufacturerUrl: 'https://www.vishay.com/diodes/rectifiers/general-purpose/',
    allDataSheetUrl: 'https://www.alldatasheet.com/view.jsp?Searchword=1N4007',
    verified: true,
    featured: false,
    specs: {
      'Peak Repetitive Reverse Voltage': '1000V',
      'Average Rectified Forward Current': '1.0A',
      'Non-Repetitive Peak Surge Current': '30A (8.3ms half sine)',
      'Forward Voltage Drop (Vf)': '1.1V (at 1.0A)',
      'Operating Temperature': '-55°C to 150°C',
    },
  },
  {
    id: 'ds-tl431',
    partNumber: 'TL431',
    normalizedPartNumber: 'TL431',
    manufacturer: 'Texas Instruments',
    category: 'Voltage Regulators & PMIC',
    description: 'Three-terminal adjustable shunt voltage regulator with guaranteed thermal stability, 2.5V to 36V reference, and sharp turn-on characteristics.',
    package: 'TO-92, SOT-23-3, SOIC-8',
    pinCount: 3,
    mountingType: 'Through Hole',
    datasheetUrl: 'https://www.ti.com/lit/ds/symlink/tl431.pdf',
    manufacturerUrl: 'https://www.ti.com/product/TL431',
    allDataSheetUrl: 'https://www.alldatasheet.com/view.jsp?Searchword=TL431',
    verified: true,
    featured: false,
    specs: {
      'Programmable Output Voltage': '2.495V to 36V',
      'Sink Current Capability': '1 mA to 100 mA',
      'Reference Voltage Tolerance': '0.5%, 1%, or 2%',
      'Dynamic Impedance': '0.2 Ω typical',
      'Temperature Range': '-40°C to 125°C (A/B/Q grades)',
    },
  },
  {
    id: 'ds-ams1117-33',
    partNumber: 'AMS1117-3.3',
    normalizedPartNumber: 'AMS111733',
    manufacturer: 'Advanced Monolithic Systems',
    category: 'Voltage Regulators & PMIC',
    description: 'Low-dropout positive fixed 3.3V voltage regulator capable of providing up to 1A output with maximum 1.3V dropout at full current.',
    package: 'SOT-223, TO-252',
    pinCount: 3,
    mountingType: 'SMD',
    datasheetUrl: 'http://www.advanced-monolithic.com/pdf/ds1117.pdf',
    manufacturerUrl: 'http://www.advanced-monolithic.com',
    allDataSheetUrl: 'https://www.alldatasheet.com/view.jsp?Searchword=AMS1117-3.3',
    verified: true,
    featured: false,
    specs: {
      'Output Voltage': '3.3V (±1.5%)',
      'Maximum Output Current': '1.0A',
      'Dropout Voltage': '1.1V at 500mA (1.3V max at 1A)',
      'Input Voltage Range': '4.5V to 15V',
      'Current Limit & Thermal Protection': 'Built-in',
    },
  },
  {
    id: 'ds-l298n',
    partNumber: 'L298N',
    normalizedPartNumber: 'L298N',
    manufacturer: 'STMicroelectronics',
    category: 'Sensors & Interface ICs',
    description: 'Dual full-bridge high-voltage, high-current driver IC designed to accept standard TTL logic levels and drive inductive loads like relays, solenoids, DC and stepping motors.',
    package: 'Multiwatt15, PowerSO20',
    pinCount: 15,
    mountingType: 'Through Hole',
    datasheetUrl: 'https://www.st.com/resource/en/datasheet/l298.pdf',
    manufacturerUrl: 'https://www.st.com/en/motor-drivers/l298.html',
    allDataSheetUrl: 'https://www.alldatasheet.com/view.jsp?Searchword=L298N',
    verified: true,
    featured: false,
    specs: {
      'Operating Supply Voltage (Vs)': 'Up to 46V',
      'Total DC Current (Io)': '4A (2A per channel peak)',
      'Logic Supply Voltage (Vss)': '4.5V to 7V',
      'Overtemperature Protection': 'Integrated shutdown',
      'Channels': 'Dual H-Bridge',
    },
  },
  {
    id: 'ds-pc817',
    partNumber: 'PC817',
    normalizedPartNumber: 'PC817',
    manufacturer: 'Sharp Microelectronics',
    category: 'Sensors & Interface ICs',
    description: 'High-density 4-pin phototransistor optocoupler providing 5,000 Vrms isolation voltage between input LED and output NPN phototransistor.',
    package: 'DIP-4, SMD-4',
    pinCount: 4,
    mountingType: 'Through Hole',
    datasheetUrl: 'https://global.sharp/products/device/lineup/data/pdf/datasheet/pc817xnnsz_e.pdf',
    manufacturerUrl: 'https://global.sharp/products/device/',
    allDataSheetUrl: 'https://www.alldatasheet.com/view.jsp?Searchword=PC817',
    verified: true,
    featured: false,
    specs: {
      'Isolation Voltage': '5,000 Vrms (Viso)',
      'Current Transfer Ratio (CTR)': '50% to 600% (Rank A to D)',
      'Collector-Emitter Voltage': '80V (Vceo)',
      'Forward Current (If)': '50 mA',
      'Response Time': '4 μs typical',
    },
  },
  {
    id: 'ds-max485',
    partNumber: 'MAX485',
    normalizedPartNumber: 'MAX485',
    manufacturer: 'Analog Devices / Maxim',
    category: 'Sensors & Interface ICs',
    description: 'Low-power transceiver for RS-485 and RS-422 communications featuring one driver and one receiver with slew-rate limiting up to 2.5 Mbps.',
    package: 'DIP-8, SOIC-8',
    pinCount: 8,
    mountingType: 'Through Hole',
    datasheetUrl: 'https://www.analog.com/media/en/technical-documentation/data-sheets/MAX1487-MAX491.pdf',
    manufacturerUrl: 'https://www.analog.com/en/products/max485.html',
    allDataSheetUrl: 'https://www.alldatasheet.com/view.jsp?Searchword=MAX485',
    verified: true,
    featured: false,
    specs: {
      'Operating Voltage': '5.0V (±5%)',
      'Data Rate': 'Up to 2.5 Mbps',
      'Quiescent Current': '300 μA (low power)',
      'Common-Mode Range': '-7V to +12V',
      'Bus Protection': 'Thermal shutdown & short-circuit protection',
    },
  },
  {
    id: 'ds-lm317',
    partNumber: 'LM317',
    normalizedPartNumber: 'LM317',
    manufacturer: 'Texas Instruments',
    category: 'Voltage Regulators & PMIC',
    description: 'Adjustable 3-terminal positive voltage regulator capable of supplying over 1.5A over a 1.25V to 37V output range with 0.1% line/load regulation.',
    package: 'TO-220, SOT-223, TO-263',
    pinCount: 3,
    mountingType: 'Through Hole',
    datasheetUrl: 'https://www.ti.com/lit/ds/symlink/lm317.pdf',
    manufacturerUrl: 'https://www.ti.com/product/LM317',
    allDataSheetUrl: 'https://www.alldatasheet.com/view.jsp?Searchword=LM317',
    verified: true,
    featured: false,
    specs: {
      'Adjustable Output': '1.25V to 37V',
      'Output Current': 'Excess of 1.5A',
      'Line Regulation': '0.01%/V typical',
      'Load Regulation': '0.1% typical',
      'Protection': 'Internal thermal overload & safe area compensation',
    },
  },
];

function serializeTimestamp(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as Timestamp).toDate === 'function') {
    return (ts as Timestamp).toDate().toISOString();
  }
  return String(ts);
}

/**
 * Fetches all component datasheets from Firestore, merged with the curated verified catalog
 */
export async function fetchDatasheets(): Promise<ComponentDatasheet[]> {
  try {
    const colRef = collection(db, 'datasheets');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    if (snap.empty) {
      return DEFAULT_DATASHEETS;
    }

    const firestoreList: ComponentDatasheet[] = snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        partNumber: String(data.partNumber || ''),
        normalizedPartNumber: String(data.normalizedPartNumber || (data.partNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '')),
        manufacturer: String(data.manufacturer || 'Generic / Multiple'),
        category: String(data.category || 'General Components'),
        description: String(data.description || ''),
        package: data.package ? String(data.package) : undefined,
        pinCount: data.pinCount ? Number(data.pinCount) : undefined,
        mountingType: data.mountingType as ComponentDatasheet['mountingType'],
        datasheetUrl: String(data.datasheetUrl || ''),
        manufacturerUrl: data.manufacturerUrl ? String(data.manufacturerUrl) : undefined,
        allDataSheetUrl: data.allDataSheetUrl ? String(data.allDataSheetUrl) : getAllDataSheetSearchUrl(String(data.partNumber || '')),
        verified: Boolean(data.verified),
        featured: Boolean(data.featured),
        specs: (data.specs && typeof data.specs === 'object') ? (data.specs as Record<string, string>) : undefined,
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
      };
    });

    // Merge Firestore items ahead of defaults (by normalizedPartNumber)
    const seenMap = new Map<string, ComponentDatasheet>();
    for (const item of firestoreList) {
      seenMap.set(item.normalizedPartNumber, item);
    }
    for (const item of DEFAULT_DATASHEETS) {
      if (!seenMap.has(item.normalizedPartNumber)) {
        seenMap.set(item.normalizedPartNumber, item);
      }
    }

    return Array.from(seenMap.values());
  } catch (error) {
    console.warn('Failed to fetch datasheets from Firestore, serving default verified catalog:', error);
    return DEFAULT_DATASHEETS;
  }
}

/**
 * Admin action: Save or update a component datasheet record
 */
export async function saveDatasheetAdmin(
  datasheetData: Omit<ComponentDatasheet, 'createdAt' | 'updatedAt' | 'id'> & { id?: string },
  actor: UserProfile,
  actorRole: UserRole
): Promise<ComponentDatasheet> {
  if (actorRole !== 'ADMIN' && actorRole !== 'EDITOR') {
    throw new Error('Unauthorized: Admin or Editor role required.');
  }

  const dsId =
    datasheetData.id && datasheetData.id.trim().length > 0
      ? datasheetData.id
      : `ds_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const batch = writeBatch(db);
  const dsRef = doc(db, 'datasheets', dsId);
  const logId = `log_${Date.now()}_ds`;

  const normalized = datasheetData.partNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const allDataSheet = datasheetData.allDataSheetUrl?.trim() || getAllDataSheetSearchUrl(datasheetData.partNumber);

  const payload = {
    id: dsId,
    partNumber: datasheetData.partNumber.trim(),
    normalizedPartNumber: normalized,
    manufacturer: datasheetData.manufacturer.trim(),
    category: datasheetData.category.trim(),
    description: datasheetData.description.trim(),
    package: datasheetData.package?.trim() || null,
    pinCount: datasheetData.pinCount ? Number(datasheetData.pinCount) : null,
    mountingType: datasheetData.mountingType || null,
    datasheetUrl: datasheetData.datasheetUrl.trim(),
    manufacturerUrl: datasheetData.manufacturerUrl?.trim() || null,
    allDataSheetUrl: allDataSheet,
    verified: Boolean(datasheetData.verified),
    featured: Boolean(datasheetData.featured),
    specs: datasheetData.specs || null,
    updatedAt: serverTimestamp(),
  };

  batch.set(
    dsRef,
    {
      ...payload,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorName: actor.displayName,
    actorRole,
    action: datasheetData.id ? 'UPDATE_DATASHEET' : 'CREATE_DATASHEET',
    targetType: 'DATASHEET',
    targetId: dsId,
    details: `Saved component datasheet for "${datasheetData.partNumber}".`,
    timestamp: serverTimestamp(),
  });

  try {
    await batch.commit();
    return {
      ...datasheetData,
      id: dsId,
      normalizedPartNumber: normalized,
      allDataSheetUrl: allDataSheet,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(handleFirestoreError(error, OperationType.WRITE, 'datasheets'));
  }
}

/**
 * Admin action: Delete a datasheet record
 */
export async function deleteDatasheetAdmin(
  datasheetId: string,
  partNumber: string,
  actor: UserProfile,
  actorRole: UserRole
): Promise<void> {
  if (actorRole !== 'ADMIN' && actorRole !== 'EDITOR') {
    throw new Error('Unauthorized: Admin or Editor role required.');
  }

  const batch = writeBatch(db);
  batch.delete(doc(db, 'datasheets', datasheetId));

  const logId = `log_${Date.now()}_del_ds`;
  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorName: actor.displayName,
    actorRole,
    action: 'DELETE_DATASHEET',
    targetType: 'DATASHEET',
    targetId: datasheetId,
    details: `Deleted component datasheet "${partNumber}".`,
    timestamp: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    throw new Error(handleFirestoreError(error, OperationType.DELETE, 'datasheets'));
  }
}
