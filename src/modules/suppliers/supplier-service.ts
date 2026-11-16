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
import type { TrustedSupplier, UserProfile, UserRole } from '@/types';

function toIso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as Timestamp).toDate().toISOString();
  }
  return new Date().toISOString();
}

export const DEFAULT_TRUSTED_SUPPLIERS: TrustedSupplier[] = [
  {
    id: 'sup_robu',
    name: 'Robu.in',
    logoUrl: 'https://images.seeklogo.com/logo-png/43/1/robu-in-logo-png_seeklogo-434057.png',
    url: 'https://robu.in/',
    category: 'Electronics, Robotics, Embedded Systems',
    badge: 'Fast Shipping in India',
    description:
      'Electronics components, Arduino, ESP32, Raspberry Pi, sensors, motors, robotics, development boards and 3D printing products.',
    tags: [
      'Electronics & Components',
      'Robotics & Automation',
      'Embedded Systems & IoT',
      'Sensors & Motors',
      '3D Printing & Manufacturing',
    ],
    order: 1,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_quartz',
    name: 'Quartz Components',
    logoUrl: 'https://quartzcomponents.com/cdn/shop/files/Quartz_Logo_New-01_180x.png',
    url: 'https://quartzcomponents.com',
    category: 'Sensors & Discrete ICs',
    badge: 'Verified Silicon',
    description:
      'Trusted supplier for environmental sensors, microcontrollers, passive components, and practical STEM learning kits.',
    tags: [
      'Electronics & Components',
      'Sensors & Motors',
      'Semiconductors',
      'Embedded Systems & IoT',
    ],
    order: 2,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_robocraze',
    name: 'Robocraze',
    logoUrl: 'https://robocraze.com/cdn/shop/files/robocraze_logo_new_small.png?v=1614338944',
    url: 'https://robocraze.com/',
    category: 'Robotics, IoT, AI Hardware',
    badge: 'Official Raspberry Pi Reseller',
    description:
      'Robotics, IoT, AI hardware, development boards, STEM kits, electronic modules and 3D printers.',
    tags: [
      'Robotics & Automation',
      'Embedded Systems & IoT',
      'Electronics & Components',
      '3D Printing & Manufacturing',
    ],
    order: 3,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_probots',
    name: 'Probots',
    logoUrl: '',
    url: 'https://probots.co.in/',
    category: 'Electronics, Embedded Systems, R&D',
    badge: 'Microcontrollers & Sensors',
    description:
      'Electronic components, microcontroller boards, sensors, motors, embedded systems, robotics accessories and test equipment.',
    tags: [
      'Electronics & Components',
      'Embedded Systems & IoT',
      'Sensors & Motors',
      'Test & Measurement',
    ],
    order: 4,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_thingbits',
    name: 'Thingbits',
    logoUrl: '',
    url: 'https://www.thingbits.in/',
    category: 'Electronics, Maker Hardware, 3D Printing',
    badge: 'Adafruit & Maker Hardware',
    description:
      'Raspberry Pi, Arduino, Adafruit products, sensors, maker electronics, 3D printers and custom 3D printing services.',
    tags: [
      'Electronics & Components',
      'Embedded Systems & IoT',
      '3D Printing & Manufacturing',
    ],
    order: 5,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_robodium',
    name: 'Robodium',
    logoUrl: '',
    url: 'https://robodium.com/',
    category: 'Robotics, Electronics, Prototyping',
    badge: 'Robotics & 3D Prototyping',
    description:
      'Electronic components, Arduino, ESP32, sensors, motors, robotics parts and custom 3D printing.',
    tags: [
      'Robotics & Automation',
      'Electronics & Components',
      'Sensors & Motors',
      'Mechanical & Prototyping',
      '3D Printing & Manufacturing',
    ],
    order: 6,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_mouser',
    name: 'Mouser Electronics',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Mouser_Electronics_logo.svg',
    url: 'https://www.mouser.in/',
    category: 'Semiconductors, Electronic Components',
    badge: 'Global Authorized Reseller',
    description:
      'Semiconductors, integrated circuits, transistors, MOSFETs, microcontrollers, connectors and professional electronic components.',
    tags: [
      'Semiconductors',
      'Electronics & Components',
      'Embedded Systems & IoT',
      'Test & Measurement',
    ],
    order: 7,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_element14',
    name: 'element14 India',
    logoUrl: '',
    url: 'https://in.element14.com/',
    category: 'Electronics, Test Equipment, Engineering',
    badge: 'Authorized Global Distributor',
    description:
      'Electronic components, development boards, test and measurement equipment, connectors and engineering products.',
    tags: [
      'Electronics & Components',
      'Semiconductors',
      'Embedded Systems & IoT',
      'Test & Measurement',
    ],
    order: 8,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_digikey',
    name: 'DigiKey',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Digi-Key_logo.svg',
    url: 'https://www.digikey.in/',
    category: 'Semiconductors, Embedded Systems, Industrial Electronics',
    badge: 'Authorized OEM Silicon',
    description:
      'Semiconductors, integrated circuits, embedded components, industrial electronics and engineering development products.',
    tags: [
      'Semiconductors',
      'Embedded Systems & IoT',
      'Electronics & Components',
      'Test & Measurement',
    ],
    order: 9,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_electronicscomp',
    name: 'ElectronicsComp',
    logoUrl: 'https://www.electronicscomp.com/image/catalog/logo.png',
    url: 'https://www.electronicscomp.com',
    category: 'Components & Hardware',
    badge: 'Budget Friendly',
    description:
      'Extensive inventory of discrete electronics, SMD ICs, headers, relays, soldering irons, and measurement instruments.',
    tags: [
      'Electronics & Components',
      'Sensors & Motors',
      'Test & Measurement',
      'Mechanical & Prototyping',
    ],
    order: 10,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_bambulab',
    name: 'Bambu Lab',
    logoUrl: '',
    url: 'https://bambulab.com/',
    category: '3D Printing, Manufacturing',
    badge: 'High-Speed 3D Printers',
    description:
      '3D printers, filaments, printer accessories, replacement components and 3D printing solutions.',
    tags: [
      '3D Printing & Manufacturing',
      'Mechanical & Prototyping',
    ],
    order: 11,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_creality',
    name: 'Creality',
    logoUrl: '',
    url: 'https://www.creality.com/',
    category: '3D Printing, Manufacturing',
    badge: '3D Printing Solutions',
    description:
      '3D printers, filaments, hotends, extruders, printer accessories and replacement parts.',
    tags: [
      '3D Printing & Manufacturing',
      'Mechanical & Prototyping',
    ],
    order: 12,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_jlcpcb',
    name: 'JLCPCB',
    logoUrl: 'https://jlcpcb.com/favicon.ico',
    url: 'https://jlcpcb.com',
    category: 'PCB Manufacturing',
    badge: 'PCB & SMT Assembly',
    description:
      'Rapid prototype PCB manufacturing, high-precision multilayer boards, stencil laser cutting, and turnkey SMT parts assembly.',
    tags: [
      'Mechanical & Prototyping',
      'Electronics & Components',
      '3D Printing & Manufacturing',
    ],
    order: 13,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_amazon',
    name: 'Amazon India Electronics',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
    url: 'https://amazon.in',
    category: 'Tools & Lab Accessories',
    badge: 'Prime 1-Day Delivery',
    description:
      'Fast doorstep delivery for multimeters, lab bench power supplies, soldering stations, wire cutters, and maker tools.',
    tags: [
      'Test & Measurement',
      'Mechanical & Prototyping',
      'Electronics & Components',
    ],
    order: 14,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function fetchSuppliers(): Promise<TrustedSupplier[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'suppliers'), orderBy('order', 'asc'))
    );
    if (snap.empty) {
      return DEFAULT_TRUSTED_SUPPLIERS;
    }
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: String(data.name || ''),
        logoUrl: data.logoUrl ? String(data.logoUrl) : '',
        url: String(data.url || ''),
        category: data.category ? String(data.category) : 'General Hardware',
        badge: data.badge ? String(data.badge) : undefined,
        description: data.description ? String(data.description) : undefined,
        tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
        order: typeof data.order === 'number' ? data.order : 0,
        featured: Boolean(data.featured),
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    });
  } catch {
    try {
      const snap = await getDocs(collection(db, 'suppliers'));
      if (snap.empty) return DEFAULT_TRUSTED_SUPPLIERS;
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: String(data.name || ''),
          logoUrl: data.logoUrl ? String(data.logoUrl) : '',
          url: String(data.url || ''),
          category: data.category ? String(data.category) : 'General Hardware',
          badge: data.badge ? String(data.badge) : undefined,
          description: data.description ? String(data.description) : undefined,
          tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
          order: typeof data.order === 'number' ? data.order : 0,
          featured: Boolean(data.featured),
          createdAt: toIso(data.createdAt),
          updatedAt: toIso(data.updatedAt),
        };
      });
      return list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } catch {
      return DEFAULT_TRUSTED_SUPPLIERS;
    }
  }
}

export async function seedInitialSuppliers(
  actor: UserProfile,
  actorRole: UserRole
): Promise<void> {
  const batch = writeBatch(db);
  for (const sup of DEFAULT_TRUSTED_SUPPLIERS) {
    batch.set(
      doc(db, 'suppliers', sup.id),
      {
        ...sup,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
  const logId = `log_${Date.now()}_seedsup`;
  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole,
    action: 'MANAGE_SUPPLIER',
    targetType: 'SUPPLIER',
    targetId: 'initial-seed',
    reason: 'Seeded default trusted suppliers in Firestore',
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/products' }),
    }).catch(() => undefined);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'suppliers');
  }
}

export async function saveSupplierAdmin(
  supplier: Omit<TrustedSupplier, 'createdAt' | 'updatedAt' | 'id'> & { id?: string },
  isNew: boolean,
  actor: UserProfile,
  actorRole: UserRole
): Promise<string> {
  const supplierId = isNew
    ? `sup_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    : supplier.id || `sup_${Date.now()}`;

  const batch = writeBatch(db);
  const logId = `log_${Date.now()}_sup`;

  const payload: Record<string, unknown> = {
    id: supplierId,
    name: supplier.name.trim(),
    logoUrl: supplier.logoUrl?.trim() || '',
    url: supplier.url.trim(),
    category: supplier.category?.trim() || 'General Hardware',
    badge: supplier.badge?.trim() || '',
    description: supplier.description?.trim() || '',
    order: typeof supplier.order === 'number' ? supplier.order : 1,
    featured: Boolean(supplier.featured),
    updatedAt: serverTimestamp(),
  };

  // Check if Firestore suppliers collection is currently empty
  const suppliersSnap = await getDocs(collection(db, 'suppliers'));

  if (suppliersSnap.empty) {
    // Collection in Firestore is empty: seed all defaults so they don't disappear,
    // and include the current supplier with updated details
    for (const def of DEFAULT_TRUSTED_SUPPLIERS) {
      if (def.id === supplierId) {
        batch.set(doc(db, 'suppliers', def.id), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      } else {
        batch.set(doc(db, 'suppliers', def.id), {
          ...def,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
    // If it's a completely new supplier not in defaults
    if (!DEFAULT_TRUSTED_SUPPLIERS.some((d) => d.id === supplierId)) {
      batch.set(doc(db, 'suppliers', supplierId), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
  } else {
    // Firestore already has suppliers collection initialized
    const docRef = doc(db, 'suppliers', supplierId);
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
    action: 'MANAGE_SUPPLIER',
    targetType: 'SUPPLIER',
    targetId: supplierId,
    reason: `${isNew ? 'Added new' : 'Updated'} supplier: ${supplier.name}`,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();

    // Trigger cache revalidation for store page
    fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/products' }),
    }).catch(() => undefined);
  } catch (error) {
    handleFirestoreError(
      error,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      `suppliers/${supplierId}`
    );
  }

  return supplierId;
}

export async function deleteSupplierAdmin(
  supplierId: string,
  actor: UserProfile,
  actorRole: UserRole,
  reason?: string
): Promise<void> {
  const batch = writeBatch(db);
  const logId = `log_${Date.now()}_delsup`;

  const suppliersSnap = await getDocs(collection(db, 'suppliers'));
  if (suppliersSnap.empty) {
    // If Firestore was empty, seed all defaults EXCEPT the one being deleted
    for (const def of DEFAULT_TRUSTED_SUPPLIERS) {
      if (def.id !== supplierId) {
        batch.set(doc(db, 'suppliers', def.id), {
          ...def,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } else {
    batch.delete(doc(db, 'suppliers', supplierId));
  }

  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole,
    action: 'DELETE_SUPPLIER',
    targetType: 'SUPPLIER',
    targetId: supplierId,
    reason: reason?.trim() || 'Deleted verified supplier from directory',
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();

    // Trigger cache revalidation for store page
    fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/products' }),
    }).catch(() => undefined);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `suppliers/${supplierId}`);
  }
}
