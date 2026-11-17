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
  LibraryCategory,
  LibraryItem,
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

export const LIBRARY_CATEGORIES: LibraryCategory[] = [
  'Datasheet & Pinout',
  'Firmware Library & Driver',
  'Schematic & Reference Circuit',
  'Mechanical & 3D CAD Standard',
  'Programming Cheat Sheet',
  'Networking Protocol & Spec',
];

export const LIBRARY_OFFICIAL_LOGOS: Record<string, string> = {
  esp32: 'https://cdn.simpleicons.org/espressif/E7352C',
  stm32: 'https://cdn.simpleicons.org/stmicroelectronics/03234B',
  arduino: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/arduino/arduino-original.svg',
  pico: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/raspberrypi/raspberrypi-original.svg',
  linux: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/linux/linux-original.svg',
  freertos: 'https://www.google.com/s2/favicons?domain=freertos.org&sz=128',
  mqtt: 'https://cdn.simpleicons.org/mqtt/660066',
  resistor: '/images/logo.png',
  i2c: '/images/logo.png',
  fastener: 'https://cdn.simpleicons.org/freecad/CB333B',
  nema: '/images/logo.png',
  vslot: '/images/logo.png',
  '3d-print': '/images/logo.png',
};

function escLibSvg(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildLibraryDiagramSvg(item: Partial<LibraryItem>): string {
  const id = (item.id || item.slug || '').toLowerCase();
  const title = escLibSvg((item.title || 'Engineering Reference').slice(0, 52));

  // 1. ESP32-S3 Pinout & GPIO Matrix
  if (id.includes('esp32')) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
      <rect width="480" height="270" fill="#0A1424"/>
      <text x="20" y="24" fill="#F59E0B" font-family="monospace" font-size="11" font-weight="bold">ESP32-S3-WROOM-1 // HARDWARE PINOUT &amp; GPIO MATRIX</text>
      <rect x="175" y="42" width="130" height="206" rx="8" fill="#1E293B" stroke="#64748B" stroke-width="2"/>
      <rect x="193" y="54" width="94" height="72" rx="4" fill="#94A3B8"/>
      <text x="240" y="88" text-anchor="middle" fill="#0F172A" font-family="monospace" font-size="11" font-weight="bold">ESP32-S3</text>
      <text x="240" y="104" text-anchor="middle" fill="#1E293B" font-family="monospace" font-size="8">Xtensa LX7 240MHz</text>
      <g font-family="monospace" font-size="8.5" font-weight="bold">
        <rect x="92" y="58" width="76" height="15" rx="3" fill="#EF4444"/><text x="130" y="69" text-anchor="middle" fill="#FFF">3V3 / VDD</text>
        <rect x="92" y="78" width="76" height="15" rx="3" fill="#F59E0B"/><text x="130" y="89" text-anchor="middle" fill="#0F172A">GPIO0 (BOOT)</text>
        <rect x="92" y="98" width="76" height="15" rx="3" fill="#10B981"/><text x="130" y="109" text-anchor="middle" fill="#06281E">GPIO4 (ADC1_3)</text>
        <rect x="92" y="118" width="76" height="15" rx="3" fill="#10B981"/><text x="130" y="129" text-anchor="middle" fill="#06281E">GPIO5 (ADC1_4)</text>
        <rect x="92" y="138" width="76" height="15" rx="3" fill="#38BDF8"/><text x="130" y="149" text-anchor="middle" fill="#0F172A">GPIO8 (I2C SDA)</text>
        <rect x="92" y="158" width="76" height="15" rx="3" fill="#38BDF8"/><text x="130" y="169" text-anchor="middle" fill="#0F172A">GPIO9 (I2C SCL)</text>
        <rect x="92" y="178" width="76" height="15" rx="3" fill="#A855F7"/><text x="130" y="189" text-anchor="middle" fill="#FFF">GPIO19 (USB D-)</text>
        <rect x="92" y="198" width="76" height="15" rx="3" fill="#A855F7"/><text x="130" y="209" text-anchor="middle" fill="#FFF">GPIO20 (USB D+)</text>
        <rect x="312" y="58" width="76" height="15" rx="3" fill="#334155"/><text x="350" y="69" text-anchor="middle" fill="#E2E8F0">GND</text>
        <rect x="312" y="78" width="76" height="15" rx="3" fill="#F43F5E"/><text x="350" y="89" text-anchor="middle" fill="#FFF">TXD0 (GPIO43)</text>
        <rect x="312" y="98" width="76" height="15" rx="3" fill="#F43F5E"/><text x="350" y="109" text-anchor="middle" fill="#FFF">RXD0 (GPIO44)</text>
        <rect x="312" y="118" width="76" height="15" rx="3" fill="#38BDF8"/><text x="350" y="129" text-anchor="middle" fill="#0F172A">GPIO10 (SPI CS)</text>
        <rect x="312" y="138" width="76" height="15" rx="3" fill="#38BDF8"/><text x="350" y="149" text-anchor="middle" fill="#0F172A">GPIO11 (MOSI)</text>
        <rect x="312" y="158" width="76" height="15" rx="3" fill="#38BDF8"/><text x="350" y="169" text-anchor="middle" fill="#0F172A">GPIO12 (SCLK)</text>
        <rect x="312" y="178" width="76" height="15" rx="3" fill="#38BDF8"/><text x="350" y="189" text-anchor="middle" fill="#0F172A">GPIO13 (MISO)</text>
        <rect x="312" y="198" width="76" height="15" rx="3" fill="#F59E0B"/><text x="350" y="209" text-anchor="middle" fill="#0F172A">GPIO45 (STRAP)</text>
      </g>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // 2. STM32F401 Schematic
  if (id.includes('stm32')) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
      <rect width="480" height="270" fill="#0C1726"/>
      <text x="20" y="24" fill="#38BDF8" font-family="monospace" font-size="11" font-weight="bold">STM32F401CCU6 BLACKPILL // REFERENCE SCHEMATIC</text>
      <rect x="18" y="38" width="444" height="214" rx="6" fill="#08101C" stroke="#1E3A5F" stroke-width="1.5"/>
      <rect x="190" y="68" width="120" height="140" fill="#112236" stroke="#38BDF8" stroke-width="2"/>
      <text x="250" y="128" text-anchor="middle" fill="#F8FAFC" font-family="monospace" font-size="11" font-weight="bold">STM32F401</text>
      <text x="250" y="144" text-anchor="middle" fill="#38BDF8" font-family="monospace" font-size="9">ARM Cortex-M4 84MHz</text>
      <g stroke="#10B981" stroke-width="1.8" fill="none">
        <line x1="80" y1="95" x2="190" y2="95"/><rect x="110" y="85" width="36" height="20" fill="#08101C" stroke="#F59E0B"/>
        <text x="128" y="98" text-anchor="middle" fill="#F59E0B" font-family="monospace" font-size="8" stroke="none">25MHz</text>
        <line x1="80" y1="150" x2="190" y2="150"/>
        <line x1="310" y1="95" x2="415" y2="95"/>
        <line x1="310" y1="125" x2="415" y2="125"/>
        <line x1="310" y1="165" x2="415" y2="165"/>
      </g>
      <text x="45" y="98" fill="#E2E8F0" font-family="monospace" font-size="9">HSE_IN</text>
      <text x="40" y="153" fill="#F59E0B" font-family="monospace" font-size="9">NRST (RC)</text>
      <text x="345" y="88" fill="#34D399" font-family="monospace" font-size="9">PA13 / SWDIO</text>
      <text x="345" y="118" fill="#34D399" font-family="monospace" font-size="9">PA14 / SWCLK</text>
      <text x="345" y="158" fill="#A78BFA" font-family="monospace" font-size="9">PA11/12 USB_OTG</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // 3. Resistor & Decade Reference
  if (id.includes('resistor')) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
      <rect width="480" height="270" fill="#0F172A"/>
      <text x="20" y="26" fill="#F59E0B" font-family="monospace" font-size="11" font-weight="bold">IEC 60063 // E12 · E24 · E96 RESISTOR DECADE CHART</text>
      <line x1="50" y1="82" x2="430" y2="82" stroke="#94A3B8" stroke-width="6"/>
      <rect x="120" y="54" width="240" height="56" rx="16" fill="#FDE68A" stroke="#D97706" stroke-width="2"/>
      <rect x="150" y="54" width="18" height="56" fill="#78350F"/>
      <rect x="190" y="54" width="18" height="56" fill="#111827"/>
      <rect x="230" y="54" width="18" height="56" fill="#DC2626"/>
      <rect x="305" y="54" width="16" height="56" fill="#D97706"/>
      <rect x="24" y="132" width="432" height="116" rx="8" fill="#1E293B" stroke="#334155"/>
      <text x="38" y="154" fill="#38BDF8" font-family="monospace" font-size="10" font-weight="bold">E12 (10%)  |  1.0  1.2  1.5  1.8  2.2  2.7  3.3  3.9  4.7  5.6  6.8  8.2</text>
      <text x="38" y="182" fill="#34D399" font-family="monospace" font-size="10" font-weight="bold">E24 (5%)   |  1.1  1.3  1.6  2.0  2.4  3.0  3.6  4.3  5.1  6.2  7.5  9.1</text>
      <text x="38" y="210" fill="#F8FAFC" font-family="monospace" font-size="10">E96 (1%)   |  1.00 1.02 1.05 1.07 1.10 1.13 1.15 1.18 1.21 1.24 1.27 ...</text>
      <text x="38" y="234" fill="#94A3B8" font-family="monospace" font-size="9">Standard EIA Decade Multipliers: ×1Ω, ×10Ω, ×100Ω, ×1kΩ, ×10kΩ, ×100kΩ, ×1MΩ</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // 4. I2C vs SPI vs UART Protocol Diagram
  if (id.includes('i2c') || id.includes('mqtt')) {
    const isMqtt = id.includes('mqtt');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
      <rect width="480" height="270" fill="#0B1324"/>
      <text x="20" y="26" fill="#38BDF8" font-family="monospace" font-size="11" font-weight="bold">${
        isMqtt ? 'MQTT v5.0 // PUBLISH-SUBSCRIBE BROKER ARCHITECTURE' : 'SERIAL BUSES // I2C vs SPI vs UART TOPOLOGY'
      }</text>
      <rect x="24" y="65" width="115" height="145" rx="8" fill="#16243D" stroke="#38BDF8" stroke-width="1.5"/>
      <text x="81" y="128" text-anchor="middle" fill="#F8FAFC" font-family="monospace" font-size="11" font-weight="bold">${
        isMqtt ? 'EDGE NODE' : 'MCU MASTER'
      }</text>
      <text x="81" y="148" text-anchor="middle" fill="#94A3B8" font-family="monospace" font-size="9">${
        isMqtt ? 'ESP32 / Publisher' : 'STM32 / ESP32'
      }</text>
      <rect x="340" y="65" width="115" height="64" rx="8" fill="#16243D" stroke="#10B981" stroke-width="1.5"/>
      <text x="397" y="101" text-anchor="middle" fill="#34D399" font-family="monospace" font-size="10" font-weight="bold">${
        isMqtt ? 'CLOUD CLIENT' : 'SLAVE 1 (0x76)'
      }</text>
      <rect x="340" y="146" width="115" height="64" rx="8" fill="#16243D" stroke="#F59E0B" stroke-width="1.5"/>
      <text x="397" y="182" text-anchor="middle" fill="#FBBF24" font-family="monospace" font-size="10" font-weight="bold">${
        isMqtt ? 'DASHBOARD' : 'SLAVE 2 (SPI)'
      }</text>
      <line x1="139" y1="95" x2="340" y2="95" stroke="#38BDF8" stroke-width="2"/>
      <line x1="139" y1="125" x2="340" y2="125" stroke="#10B981" stroke-width="2"/>
      <line x1="139" y1="175" x2="340" y2="175" stroke="#F59E0B" stroke-width="2"/>
      <text x="240" y="87" text-anchor="middle" fill="#38BDF8" font-family="monospace" font-size="9">${
        isMqtt ? 'PUBLISH QoS 1 (TLS)' : 'SDA (4.7kΩ Pull-Up)'
      }</text>
      <text x="240" y="118" text-anchor="middle" fill="#10B981" font-family="monospace" font-size="9">${
        isMqtt ? 'SUBSCRIBE topic/#' : 'SCL (100kHz / 400kHz)'
      }</text>
      <text x="240" y="167" text-anchor="middle" fill="#F59E0B" font-family="monospace" font-size="9">${
        isMqtt ? 'LWT / Keep-Alive 60s' : 'SPI MOSI/MISO/SCLK/CS'
      }</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // 5. Mechanical CAD Standards (NEMA, Fasteners, V-Slot, Fits, 3D Print)
  if (
    id.includes('nema') ||
    id.includes('fastener') ||
    id.includes('vslot') ||
    id.includes('3d_print') ||
    id.includes('fits')
  ) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
      <rect width="480" height="270" fill="#0B192C"/>
      <g stroke="#162B49" stroke-width="1">
        <line x1="0" y1="54" x2="480" y2="54"/><line x1="0" y1="108" x2="480" y2="108"/><line x1="0" y1="162" x2="480" y2="162"/><line x1="0" y1="216" x2="480" y2="216"/>
        <line x1="96" y1="0" x2="96" y2="270"/><line x1="192" y1="0" x2="192" y2="270"/><line x1="288" y1="0" x2="288" y2="270"/><line x1="384" y1="0" x2="384" y2="270"/>
      </g>
      <text x="20" y="26" fill="#F59E0B" font-family="monospace" font-size="11" font-weight="bold">CAD MECHANICAL BLUEPRINT // ${title}</text>
      <rect x="65" y="56" width="150" height="150" rx="14" fill="#132743" stroke="#38BDF8" stroke-width="2"/>
      <circle cx="140" cy="131" r="42" fill="none" stroke="#93C5FD" stroke-width="1.5" stroke-dasharray="4 3"/>
      <circle cx="140" cy="131" r="14" fill="#0B192C" stroke="#F59E0B" stroke-width="2"/>
      <circle cx="88" cy="79" r="5" fill="#0B192C" stroke="#38BDF8" stroke-width="1.5"/>
      <circle cx="192" cy="79" r="5" fill="#0B192C" stroke="#38BDF8" stroke-width="1.5"/>
      <circle cx="88" cy="183" r="5" fill="#0B192C" stroke="#38BDF8" stroke-width="1.5"/>
      <circle cx="192" cy="183" r="5" fill="#0B192C" stroke="#38BDF8" stroke-width="1.5"/>
      <text x="140" y="226" text-anchor="middle" fill="#38BDF8" font-family="monospace" font-size="10">42.3×42.3mm (±0.1mm)</text>
      <rect x="248" y="64" width="206" height="142" rx="8" fill="#11223A" stroke="#334155"/>
      <text x="262" y="88" fill="#F59E0B" font-family="monospace" font-size="10" font-weight="bold">DIMENSIONAL SPEC TABLE</text>
      <text x="262" y="112" fill="#E2E8F0" font-family="monospace" font-size="9.5">• M3 Clearance: Ø3.20 mm</text>
      <text x="262" y="132" fill="#E2E8F0" font-family="monospace" font-size="9.5">• M3 Tap Drill: Ø2.50 mm</text>
      <text x="262" y="152" fill="#E2E8F0" font-family="monospace" font-size="9.5">• Press Fit Tol: +0.05 mm</text>
      <text x="262" y="172" fill="#34D399" font-family="monospace" font-size="9.5">• Sliding Fit: +0.20 mm</text>
      <text x="262" y="192" fill="#94A3B8" font-family="monospace" font-size="9">ISO 2768-m / NEMA ICS 16</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // 6. Embedded Linux & FreeRTOS Firmware Reference
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
    <rect width="480" height="270" fill="#0D1117"/>
    <rect x="14" y="14" width="452" height="242" rx="8" fill="#161B22" stroke="#30363D" stroke-width="1.5"/>
    <circle cx="30" cy="30" r="4.5" fill="#EF4444"/><circle cx="44" cy="30" r="4.5" fill="#F59E0B"/><circle cx="58" cy="30" r="4.5" fill="#10B981"/>
    <text x="74" y="34" fill="#E6EDF3" font-family="monospace" font-size="10" font-weight="bold">${title}</text>
    <text x="30" y="68" fill="#3FB950" font-family="monospace" font-size="10.5">root@eihouse-lab:~# i2cdetect -y 1</text>
    <text x="30" y="88" fill="#8B949E" font-family="monospace" font-size="10">     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f</text>
    <text x="30" y="106" fill="#C9D1D9" font-family="monospace" font-size="10">30: -- -- -- -- -- -- -- -- -- -- -- -- 3c -- -- --</text>
    <text x="30" y="124" fill="#C9D1D9" font-family="monospace" font-size="10">70: -- -- -- -- -- -- 76 --</text>
    <text x="30" y="152" fill="#58A6FF" font-family="monospace" font-size="10.5">xTaskCreate(vSensorTask, "Sensor", 2048, NULL, 3, &amp;hTask);</text>
    <text x="30" y="172" fill="#D2A8FF" font-family="monospace" font-size="10.5">xQueueSendFromISR(xTelemetryQueue, &amp;pkt, &amp;xHigherWoken);</text>
    <text x="30" y="202" fill="#F59E0B" font-family="monospace" font-size="10">STATE: [READY] ⇄ [RUNNING] → [BLOCKED / SEMAPHORE]</text>
    <text x="30" y="230" fill="#3FB950" font-family="monospace" font-size="10">✓ Verified EI House Embedded Firmware Reference</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getLibraryLogoUrl(item: Partial<LibraryItem>): string {
  if (item.iconUrl?.trim()) return item.iconUrl.trim();
  const slug = (item.slug || item.id || '').toLowerCase();
  const title = (item.title || '').toLowerCase();
  for (const [key, url] of Object.entries(LIBRARY_OFFICIAL_LOGOS)) {
    if (slug.includes(key) || title.includes(key)) return url;
  }
  return '/images/logo.png';
}

export function getLibraryHeroImageUrl(item: Partial<LibraryItem>): string {
  const customCover = item.imageUrl?.trim();
  if (customCover && !customCover.includes('images.unsplash.com')) {
    return customCover;
  }
  return buildLibraryDiagramSvg(item);
}

export const DEFAULT_LIBRARY_ITEMS: LibraryItem[] = [
  // --- Electronics & Embedded ---
  {
    id: 'lib_esp32_s3_pinout',
    title: 'ESP32-S3 Dual-Core SoC Complete Pinout & GPIO Matrix',
    slug: 'esp32-s3-pinout-reference',
    domain: 'Electronics & Embedded',
    category: 'Datasheet & Pinout',
    badge: 'Popular Reference',
    summary: 'Full hardware pinout mapping of GPIOs, ADC1/ADC2 channels, Strapping Pins, JTAG, and USB-OTG.',
    description: 'Comprehensive pin multiplexing and boot strapping diagram for Espressif ESP32-S3-WROOM modules. Highlights safe pins for pull-up/pull-down and ADC limitations while Wi-Fi is active.',
    fileFormat: 'PDF / Image',
    fileSize: '1.8 MB',
    version: 'v2.4',
    authorOrSource: 'EI House Hardware Lab & Espressif',
    externalUrl: 'https://www.espressif.com/en/products/socs/esp32-s3',
    featured: true,
    order: 1,
    tags: ['ESP32', 'ESP32-S3', 'Pinout', 'GPIO', 'ADC', 'IoT'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lib_stm32f401_schematic',
    title: 'STM32F401 BlackPill Hardware Schematic & Bootloader Reference',
    slug: 'stm32f401-blackpill-schematic',
    domain: 'Electronics & Embedded',
    category: 'Schematic & Reference Circuit',
    badge: 'Hardware Schematic',
    summary: 'Full open-source circuit diagram, power regulation, crystal oscillator circuit, and DFU bootloader jumpers.',
    description: 'Complete open schematic of the STM32F401CCU6 development board. Ideal for custom ARM board bring-up, crystal routing, decoupling capacitor placement, and ST-Link programming.',
    fileFormat: 'PDF & KiCad',
    fileSize: '3.2 MB',
    version: 'v1.2',
    authorOrSource: 'STMicroelectronics & WeAct Studio',
    externalUrl: 'https://www.st.com/en/microcontrollers-microprocessors/stm32f401cc.html',
    featured: true,
    order: 2,
    tags: ['STM32', 'ARM Cortex-M4', 'Schematic', 'KiCad', 'Firmware'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lib_resistor_matrix',
    title: 'Standard E12, E24, E96 Resistor & Capacitor Decade Values',
    slug: 'standard-e12-e24-e96-decade-values',
    domain: 'Electronics & Embedded',
    category: 'Programming Cheat Sheet',
    badge: 'Essential Chart',
    summary: 'Complete nominal value chart for standard 5% (E24) and 1% (E96) tolerance passive components.',
    description: 'Avoid selecting non-existent component values during schematic capture. This reference lists standard decade values across E6, E12, E24, and precision E96 series.',
    fileFormat: 'Quick Reference Table',
    version: 'v1.0',
    authorOrSource: 'EI House Technical Publishing',
    featured: false,
    order: 3,
    tags: ['Resistor Values', 'E12', 'E24', 'E96', 'Components'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lib_i2c_spi_guide',
    title: 'I2C vs SPI vs UART Protocol Specifications & Pull-Up Guidelines',
    slug: 'i2c-spi-uart-hardware-guide',
    domain: 'Electronics & Embedded',
    category: 'Networking Protocol & Spec',
    badge: 'Hardware Buses',
    summary: 'Bus speed limits, maximum wire capacitance, pull-up resistor sizing formulas, and multi-slave topologies.',
    description: 'Practical hardware guide for digital serial buses. Explains open-drain pull-up calculations for I2C (100kHz, 400kHz, 1MHz) and high-speed SPI signal reflection mitigation.',
    fileFormat: 'Technical Guide',
    fileSize: '950 KB',
    version: 'v1.4',
    authorOrSource: 'EI House Embedded Engineering Group',
    featured: true,
    order: 4,
    tags: ['I2C', 'SPI', 'UART', 'Serial Buses', 'Hardware Protocols'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // --- Mechanical & Robotics ---
  {
    id: 'lib_iso_fasteners',
    title: 'Metric Fastener Standards & Tap Drill Hole Clearance Chart',
    slug: 'metric-screw-tap-drill-chart',
    domain: 'Mechanical & Robotics',
    category: 'Mechanical & 3D CAD Standard',
    badge: 'Workshop Standard',
    summary: 'Standard drill sizes for M2, M2.5, M3, M4, M5, M6 internal threads and clearance hole dimensions.',
    description: 'Invaluable chart for mechanical prototype design, 3D printed heat-set threaded inserts, and CNC machining. Covers coarse pitch sizes and tap drill diameters.',
    fileFormat: 'PDF Reference',
    fileSize: '820 KB',
    version: 'ISO 261 / DIN 13',
    authorOrSource: 'ISO Standards & EI House Workshop',
    featured: true,
    order: 5,
    tags: ['Fasteners', 'Metric', 'M3', 'M4', 'CNC', 'Tapping', 'Workshop'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lib_nema_dimensions',
    title: 'NEMA 17 & NEMA 23 Stepper Motor Dimensional & Faceplate Standards',
    slug: 'nema-17-nema-23-stepper-dimensions',
    domain: 'Mechanical & Robotics',
    category: 'Mechanical & 3D CAD Standard',
    badge: 'CAD & Robotics',
    summary: 'Faceplate mounting hole centers, pilot boss diameter, D-shaft flats, and wiring phase color codes.',
    description: 'Mechanical mounting guidelines for standard bipolar stepper motors used across 3D printers, CNC routers, robotic pan-tilts, and industrial conveyors.',
    fileFormat: 'PDF & STEP 3D Model',
    fileSize: '4.5 MB',
    version: 'NEMA Standard',
    authorOrSource: 'National Electrical Manufacturers Association',
    featured: false,
    order: 6,
    tags: ['NEMA 17', 'NEMA 23', 'Stepper Motor', 'Robotics', 'CAD', 'STEP'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lib_vslot_profiles',
    title: '2020 & 2040 Aluminum V-Slot & T-Slot Extrusion System Reference',
    slug: '2020-2040-vslot-aluminum-profiles',
    domain: 'Mechanical & Robotics',
    category: 'Mechanical & 3D CAD Standard',
    badge: 'Chassis Framing',
    summary: 'Cross-sectional profiles, moments of inertia, compatible drop-in T-nuts, and corner bracket sizing.',
    description: 'Structural framing guide for DIY 3D printers, laser cutters, lab test benches, and robotics chassis based on modular 20mm and 40mm aluminum extrusions.',
    fileFormat: 'STEP CAD & PDF',
    fileSize: '2.8 MB',
    version: 'OpenBuilds Standard',
    authorOrSource: 'OpenBuilds & EI House Prototyping',
    featured: true,
    order: 7,
    tags: ['Aluminum Extrusion', '2020 V-Slot', '2040', 'Framing', 'CAD'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // --- Computer Science & IT ---
  {
    id: 'lib_linux_cheatsheet',
    title: 'Embedded Linux & Raspberry Pi Terminal Commands Quick Guide',
    slug: 'embedded-linux-terminal-cheatsheet',
    domain: 'Computer Science & IT',
    category: 'Programming Cheat Sheet',
    badge: 'CLI Mastery',
    summary: 'Essential commands for device tree inspection, GPIO export, systemd service management, and network diagnostics.',
    description: 'Curated terminal command cheat sheet designed specifically for embedded systems developers, robotics software engineers, and IoT developers working on Linux SBCs.',
    fileFormat: 'Markdown / PDF',
    fileSize: '650 KB',
    version: 'v2.0',
    authorOrSource: 'EI House Software Team',
    featured: true,
    order: 8,
    tags: ['Linux', 'Raspberry Pi', 'Bash', 'CLI', 'Embedded Linux', 'systemd'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lib_freertos_api',
    title: 'FreeRTOS API Quick Reference & Kernel Architecture Blueprint',
    slug: 'freertos-api-kernel-reference',
    domain: 'Computer Science & IT',
    category: 'Firmware Library & Driver',
    badge: 'RTOS Firmware',
    summary: 'Task creation, mutexes, binary/counting semaphores, queue management, software timers, and ISR safe functions.',
    description: 'Quick reference sheet for real-time firmware development with FreeRTOS on STM32, ESP32, and RP2040. Shows exact function prototypes and FreeRTOSConfig.h tuning tips.',
    fileFormat: 'PDF Reference',
    fileSize: '1.2 MB',
    version: 'FreeRTOS v10.5+',
    authorOrSource: 'AWS FreeRTOS & EI House Firmware Lab',
    externalUrl: 'https://www.freertos.org',
    featured: true,
    order: 9,
    tags: ['FreeRTOS', 'RTOS', 'Firmware', 'STM32', 'ESP32', 'Multithreading'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // --- Networking & IoT ---
  {
    id: 'lib_mqtt_spec',
    title: 'MQTT v3.1.1 / v5.0 Protocol Specification & Topic Design Best Practices',
    slug: 'mqtt-protocol-topic-architecture',
    domain: 'Networking & IoT',
    category: 'Networking Protocol & Spec',
    badge: 'IoT Cloud Protocol',
    summary: 'QoS 0/1/2 delivery semantics, keep-alive heartbeats, last will and testament (LWT), and multi-tenant topic hierarchies.',
    description: 'Architecture blueprint for designing resilient edge-to-cloud IoT pipelines using MQTT brokers (Mosquitto, EMQX, AWS IoT Core) with authentication and SSL/TLS encryption.',
    fileFormat: 'Technical Specification',
    fileSize: '1.4 MB',
    version: 'OASIS Standard v5.0',
    authorOrSource: 'OASIS Standard & EI House IoT Group',
    featured: true,
    order: 10,
    tags: ['MQTT', 'IoT', 'Telemetry', 'Cloud', 'Mosquitto', 'Networking'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // --- 3D Printing & CAD ---
  {
    id: 'lib_3d_print_troubleshoot',
    title: 'FDM 3D Printing Defect Diagnostic & Troubleshooting Matrix',
    slug: '3d-printing-troubleshooting-matrix',
    domain: '3D Printing & CAD',
    category: 'Mechanical & 3D CAD Standard',
    badge: 'Prototyping Guide',
    summary: 'Visual diagnostic chart resolving stringing, layer shifting, elephant foot, under-extrusion, warping, and z-banding.',
    description: 'Diagnostic visual chart created for university maker labs and prototyping workshops to rapidly identify and eliminate print failures across PLA, PETG, ABS, and TPU.',
    fileFormat: 'High-Res PDF Chart',
    fileSize: '3.6 MB',
    version: 'v2.2',
    authorOrSource: 'EI House Rapid Prototyping Workshop',
    featured: true,
    order: 11,
    tags: ['3D Printing', 'FDM', 'Troubleshooting', 'PLA', 'PETG', 'Warping'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lib_mechanical_fits',
    title: 'Engineering Clearances & Tolerances for 3D Printed Assemblies',
    slug: '3d-printed-mechanical-fits-tolerances',
    domain: '3D Printing & CAD',
    category: 'Mechanical & 3D CAD Standard',
    badge: 'Design for 3D Printing',
    summary: 'Clearance guidelines for press fits, sliding joints, snap fits, and captive nut recesses.',
    description: 'Practical rules of thumb for designing mechanical enclosures and moving linkages in SolidWorks, Fusion 360, and FreeCAD for standard 0.4mm nozzle FDM printers.',
    fileFormat: 'Technical Reference',
    fileSize: '1.1 MB',
    version: 'v1.5',
    authorOrSource: 'EI House Mechanical Design Lab',
    featured: false,
    order: 12,
    tags: ['Tolerances', 'Mechanical Fits', '3D Printing', 'CAD', 'Fusion 360'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function mergeLibraryWithDefaults(firestoreList: LibraryItem[]): LibraryItem[] {
  if (firestoreList.length === 0) return DEFAULT_LIBRARY_ITEMS;

  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const merged: LibraryItem[] = [];

  for (const item of firestoreList) {
    seenIds.add(item.id);
    if (item.slug) seenSlugs.add(item.slug.toLowerCase());
    merged.push(item);
  }

  for (const def of DEFAULT_LIBRARY_ITEMS) {
    if (!seenIds.has(def.id) && !seenSlugs.has(def.slug.toLowerCase())) {
      seenIds.add(def.id);
      seenSlugs.add(def.slug.toLowerCase());
      merged.push(def);
    }
  }

  return merged.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export async function fetchLibraryItems(): Promise<LibraryItem[]> {
  try {
    const q = query(collection(db, 'library'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (snap.empty) {
      return DEFAULT_LIBRARY_ITEMS;
    }
    const list = snap.docs.map((d) => {
      const data = d.data();
      const defMatch = DEFAULT_LIBRARY_ITEMS.find((def) => def.id === d.id || def.slug === data.slug);
      return {
        id: d.id,
        title: String(data.title || defMatch?.title || ''),
        slug: String(data.slug || defMatch?.slug || ''),
        domain: (data.domain as EngineeringDomain) || defMatch?.domain || 'General Engineering',
        category: (data.category as LibraryCategory) || defMatch?.category || 'Datasheet & Pinout',
        badge: data.badge ? String(data.badge) : defMatch?.badge,
        summary: String(data.summary || defMatch?.summary || ''),
        description: data.description ? String(data.description) : defMatch?.description,
        imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
        iconUrl: data.iconUrl ? String(data.iconUrl) : undefined,
        imageAlt: data.imageAlt ? String(data.imageAlt) : undefined,
        imageSource: data.imageSource ? String(data.imageSource) : undefined,
        fileUrl: data.fileUrl ? String(data.fileUrl) : defMatch?.fileUrl,
        externalUrl: data.externalUrl ? String(data.externalUrl) : defMatch?.externalUrl,
        fileFormat: data.fileFormat ? String(data.fileFormat) : defMatch?.fileFormat,
        fileSize: data.fileSize ? String(data.fileSize) : defMatch?.fileSize,
        version: data.version ? String(data.version) : defMatch?.version,
        authorOrSource: data.authorOrSource ? String(data.authorOrSource) : defMatch?.authorOrSource,
        featured: Boolean(data.featured ?? defMatch?.featured),
        downloadCount: typeof data.downloadCount === 'number' ? data.downloadCount : 0,
        order: typeof data.order === 'number' ? data.order : defMatch?.order ?? 0,
        tags: Array.isArray(data.tags) && data.tags.length > 0 ? data.tags.map(String) : defMatch?.tags || [],
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    });
    return mergeLibraryWithDefaults(list);
  } catch {
    return DEFAULT_LIBRARY_ITEMS;
  }
}

export async function saveLibraryItemAdmin(
  item: Omit<LibraryItem, 'createdAt' | 'updatedAt' | 'id'> & { id?: string },
  isNew: boolean,
  actor: UserProfile,
  actorRole: UserRole
): Promise<string> {
  const itemId = isNew
    ? `lib_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    : item.id || `lib_${Date.now()}`;

  const batch = writeBatch(db);
  const logId = `log_${Date.now()}_lib`;

  const payload: Record<string, unknown> = {
    id: itemId,
    title: item.title.trim(),
    slug: item.slug.trim(),
    domain: item.domain,
    category: item.category,
    badge: item.badge?.trim() || '',
    summary: item.summary.trim(),
    description: item.description?.trim() || '',
    imageUrl: item.imageUrl?.trim() || '',
    iconUrl: item.iconUrl?.trim() || '',
    imageAlt: item.imageAlt?.trim() || '',
    imageSource: item.imageSource?.trim() || '',
    fileUrl: item.fileUrl?.trim() || '',
    externalUrl: item.externalUrl?.trim() || '',
    fileFormat: item.fileFormat?.trim() || 'PDF Reference',
    fileSize: item.fileSize?.trim() || '',
    version: item.version?.trim() || '',
    authorOrSource: item.authorOrSource?.trim() || '',
    featured: Boolean(item.featured),
    order: typeof item.order === 'number' ? item.order : 1,
    tags: item.tags || [],
    updatedAt: serverTimestamp(),
  };

  const libSnap = await getDocs(collection(db, 'library'));

  if (libSnap.empty) {
    for (const def of DEFAULT_LIBRARY_ITEMS) {
      if (def.id === itemId) {
        batch.set(doc(db, 'library', def.id), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      } else {
        batch.set(doc(db, 'library', def.id), {
          ...def,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
    if (!DEFAULT_LIBRARY_ITEMS.some((d) => d.id === itemId)) {
      batch.set(doc(db, 'library', itemId), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
  } else {
    const docRef = doc(db, 'library', itemId);
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
    action: 'MANAGE_LIBRARY',
    targetType: 'LIBRARY',
    targetId: itemId,
    reason: `${isNew ? 'Added new' : 'Updated'} library resource: ${item.title}`,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();

    fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/library' }),
    }).catch(() => undefined);
  } catch (error) {
    handleFirestoreError(
      error,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      `library/${itemId}`
    );
  }

  return itemId;
}

export async function deleteLibraryItemAdmin(
  itemId: string,
  actor: UserProfile,
  actorRole: UserRole,
  reason?: string
): Promise<void> {
  const batch = writeBatch(db);
  const logId = `log_${Date.now()}_dellib`;

  const libSnap = await getDocs(collection(db, 'library'));
  if (libSnap.empty) {
    for (const def of DEFAULT_LIBRARY_ITEMS) {
      if (def.id !== itemId) {
        batch.set(doc(db, 'library', def.id), {
          ...def,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } else {
    batch.delete(doc(db, 'library', itemId));
  }

  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole,
    action: 'DELETE_LIBRARY',
    targetType: 'LIBRARY',
    targetId: itemId,
    reason: reason?.trim() || 'Deleted resource from engineering library',
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();

    fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/library' }),
    }).catch(() => undefined);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `library/${itemId}`);
  }
}
