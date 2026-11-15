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

export async function fetchLibraryItems(): Promise<LibraryItem[]> {
  try {
    const q = query(collection(db, 'library'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (snap.empty) {
      return DEFAULT_LIBRARY_ITEMS;
    }
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: String(data.title || ''),
        slug: String(data.slug || ''),
        domain: (data.domain as EngineeringDomain) || 'General Engineering',
        category: (data.category as LibraryCategory) || 'Datasheet & Pinout',
        badge: data.badge ? String(data.badge) : undefined,
        summary: String(data.summary || ''),
        description: data.description ? String(data.description) : undefined,
        imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
        fileUrl: data.fileUrl ? String(data.fileUrl) : undefined,
        externalUrl: data.externalUrl ? String(data.externalUrl) : undefined,
        fileFormat: data.fileFormat ? String(data.fileFormat) : undefined,
        fileSize: data.fileSize ? String(data.fileSize) : undefined,
        version: data.version ? String(data.version) : undefined,
        authorOrSource: data.authorOrSource ? String(data.authorOrSource) : undefined,
        featured: Boolean(data.featured),
        downloadCount: typeof data.downloadCount === 'number' ? data.downloadCount : 0,
        order: typeof data.order === 'number' ? data.order : 0,
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    });
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
