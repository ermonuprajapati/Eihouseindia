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
  // --- 8 Existing Suppliers (Preserved Unchanged) ---
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
    order: 4,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_digikey',
    name: 'DigiKey Electronics',
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
    order: 5,
    featured: true,
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
    order: 6,
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
    order: 7,
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
    order: 8,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // --- 10 New Suppliers Added ---
  {
    id: 'sup_element14',
    name: 'element14',
    logoUrl: 'https://www.google.com/s2/favicons?domain=in.element14.com&sz=128',
    url: 'https://in.element14.com/',
    category: 'Electronic Components & Semiconductors',
    badge: 'Authorized Reseller Network',
    description:
      'Electronic components, semiconductors, development boards, test equipment and engineering solutions from leading manufacturers.',
    tags: [
      'Electronics & Components',
      'Semiconductors',
      'Embedded Systems & IoT',
      'Test & Measurement',
    ],
    order: 9,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_thinkrobotics',
    name: 'ThinkRobotics',
    logoUrl: 'https://www.google.com/s2/favicons?domain=thinkrobotics.com&sz=128',
    url: 'https://thinkrobotics.com/',
    category: 'Robotics & Embedded Systems',
    badge: 'Robotics & AI Hardware',
    description:
      'Robotics hardware, AI development platforms, embedded systems, sensors, motors, automation components and prototyping products.',
    tags: [
      'Robotics & Automation',
      'Embedded Systems & IoT',
      'Sensors & Motors',
      'Mechanical & Prototyping',
    ],
    order: 10,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_evelta',
    name: 'Evelta',
    logoUrl: 'https://www.google.com/s2/favicons?domain=evelta.com&sz=128',
    url: 'https://www.evelta.com/',
    category: 'Semiconductors & Sensors',
    badge: 'Electronics Components',
    description:
      'Electronic components, semiconductor devices, sensors, wireless modules, development boards and embedded electronics.',
    tags: [
      'Semiconductors',
      'Sensors & Motors',
      'Electronics & Components',
      'Embedded Systems & IoT',
    ],
    order: 11,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_probots',
    name: 'Probots',
    logoUrl: 'https://www.google.com/s2/favicons?domain=probots.co.in&sz=128',
    url: 'https://probots.co.in/',
    category: 'Electronics & Robotics',
    badge: 'Engineering & Prototyping',
    description:
      'Arduino, Raspberry Pi, ESP32, STM32, IoT sensors, robotics components, motors, electronic components and engineering tools.',
    tags: [
      'Electronics & Components',
      'Robotics & Automation',
      'Embedded Systems & IoT',
      'Sensors & Motors',
      'Mechanical & Prototyping',
    ],
    order: 12,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_robokits',
    name: 'Robokits India',
    logoUrl: 'https://www.google.com/s2/favicons?domain=robokits.co.in&sz=128',
    url: 'https://robokits.co.in/',
    category: 'Robotics & Automation',
    badge: 'Robotics Hardware',
    description:
      'Robotics kits, motors, motor drivers, controllers, sensors, automation hardware and DIY engineering components.',
    tags: [
      'Robotics & Automation',
      'Sensors & Motors',
      'Mechanical & Prototyping',
      'Electronics & Components',
    ],
    order: 13,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_tanotis',
    name: 'Tanotis',
    logoUrl: 'https://www.google.com/s2/favicons?domain=tanotis.com&sz=128',
    url: 'https://www.tanotis.com/',
    category: 'Electronics & Development Tools',
    badge: 'Engineering Tools',
    description:
      'Electronic components, development boards, engineering tools, test equipment and products for electronics prototyping.',
    tags: [
      'Electronics & Components',
      'Test & Measurement',
      'Embedded Systems & IoT',
      'Mechanical & Prototyping',
    ],
    order: 14,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_rajguru',
    name: 'Rajguru Electronics',
    logoUrl: 'https://www.google.com/s2/favicons?domain=rajguruelectronics.com&sz=128',
    url: 'https://www.rajguruelectronics.com/',
    category: 'Electronic Components & IoT',
    badge: 'Electronics Distribution',
    description:
      'Electronic components, sensors, wireless modules, displays, motors and IoT development products.',
    tags: [
      'Electronics & Components',
      'Embedded Systems & IoT',
      'Sensors & Motors',
    ],
    order: 15,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_arrow',
    name: 'Arrow Electronics',
    logoUrl: 'https://www.google.com/s2/favicons?domain=arrow.com&sz=128',
    url: 'https://www.arrow.com/',
    category: 'Semiconductors & Industrial Electronics',
    badge: 'Global Electronics Distributor',
    description:
      'Global electronic component sourcing, semiconductors, industrial electronics, embedded technology and engineering solutions.',
    tags: [
      'Semiconductors',
      'Electronics & Components',
      'Embedded Systems & IoT',
    ],
    order: 16,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_avnet',
    name: 'Avnet',
    logoUrl: 'https://www.google.com/s2/favicons?domain=avnet.com&sz=128',
    url: 'https://www.avnet.com/',
    category: 'Semiconductors & Embedded Systems',
    badge: 'Global Technology Distributor',
    description:
      'Semiconductor components, embedded computing platforms, electronic design solutions and advanced technology products.',
    tags: [
      'Semiconductors',
      'Embedded Systems & IoT',
      'Electronics & Components',
    ],
    order: 17,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_roboarc',
    name: 'Roboarc',
    logoUrl: 'https://www.google.com/s2/favicons?domain=roboarc.in&sz=128',
    url: 'https://www.roboarc.in/',
    category: 'Robotics & 3D Printing',
    badge: 'Engineering & Maker Hardware',
    description:
      'Robotics components, Arduino, ESP32, Raspberry Pi, sensors, motors, 3D printers, batteries and prototyping hardware.',
    tags: [
      'Robotics & Automation',
      '3D Printing & Manufacturing',
      'Embedded Systems & IoT',
      'Sensors & Motors',
      'Mechanical & Prototyping',
    ],
    order: 18,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function normalizeDomainKey(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

function mergeWithDefaults(firestoreDocs: TrustedSupplier[]): TrustedSupplier[] {
  if (firestoreDocs.length === 0) return DEFAULT_TRUSTED_SUPPLIERS;

  const seenIds = new Set<string>();
  const seenDomains = new Set<string>();
  const merged: TrustedSupplier[] = [];

  for (const item of firestoreDocs) {
    const dom = normalizeDomainKey(item.url);
    seenIds.add(item.id);
    if (dom) seenDomains.add(dom);
    merged.push(item);
  }

  for (const def of DEFAULT_TRUSTED_SUPPLIERS) {
    const dom = normalizeDomainKey(def.url);
    if (!seenIds.has(def.id) && (!dom || !seenDomains.has(dom))) {
      seenIds.add(def.id);
      if (dom) seenDomains.add(dom);
      merged.push(def);
    }
  }

  return merged.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export async function fetchSuppliers(): Promise<TrustedSupplier[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'suppliers'), orderBy('order', 'asc'))
    );
    if (snap.empty) {
      return DEFAULT_TRUSTED_SUPPLIERS;
    }
    const firestoreList = snap.docs.map((d) => {
      const data = d.data();
      const defMatch = DEFAULT_TRUSTED_SUPPLIERS.find((def) => def.id === d.id);
      return {
        id: d.id,
        name: String(data.name || defMatch?.name || ''),
        logoUrl: data.logoUrl ? String(data.logoUrl) : defMatch?.logoUrl || '',
        url: String(data.url || defMatch?.url || ''),
        category: data.category ? String(data.category) : defMatch?.category || 'General Hardware',
        badge: data.badge ? String(data.badge) : defMatch?.badge,
        description: data.description ? String(data.description) : defMatch?.description,
        tags: Array.isArray(data.tags) && data.tags.length > 0 ? data.tags.map(String) : defMatch?.tags,
        order: typeof data.order === 'number' ? data.order : defMatch?.order ?? 0,
        featured: Boolean(data.featured ?? defMatch?.featured),
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    });
    return mergeWithDefaults(firestoreList);
  } catch {
    try {
      const snap = await getDocs(collection(db, 'suppliers'));
      if (snap.empty) return DEFAULT_TRUSTED_SUPPLIERS;
      const list = snap.docs.map((d) => {
        const data = d.data();
        const defMatch = DEFAULT_TRUSTED_SUPPLIERS.find((def) => def.id === d.id);
        return {
          id: d.id,
          name: String(data.name || defMatch?.name || ''),
          logoUrl: data.logoUrl ? String(data.logoUrl) : defMatch?.logoUrl || '',
          url: String(data.url || defMatch?.url || ''),
          category: data.category ? String(data.category) : defMatch?.category || 'General Hardware',
          badge: data.badge ? String(data.badge) : defMatch?.badge,
          description: data.description ? String(data.description) : defMatch?.description,
          tags: Array.isArray(data.tags) && data.tags.length > 0 ? data.tags.map(String) : defMatch?.tags,
          order: typeof data.order === 'number' ? data.order : defMatch?.order ?? 0,
          featured: Boolean(data.featured ?? defMatch?.featured),
          createdAt: toIso(data.createdAt),
          updatedAt: toIso(data.updatedAt),
        };
      });
      return mergeWithDefaults(list);
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
