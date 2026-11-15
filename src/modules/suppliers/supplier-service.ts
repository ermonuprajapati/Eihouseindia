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
    url: 'https://robu.in',
    category: 'Robotics & Dev Boards',
    badge: 'Fast Shipping in India',
    description:
      'India’s leading online store for Arduino, Raspberry Pi, drone components, LiPo batteries, and DIY robotics kits.',
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
    order: 2,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_robocraze',
    name: 'Robocraze',
    logoUrl: 'https://robocraze.com/cdn/shop/files/robocraze_logo_new_small.png?v=1614338944',
    url: 'https://robocraze.com',
    category: 'Single Board Computers',
    badge: 'Official Raspberry Pi Reseller',
    description:
      'Authorized distributor of genuine Raspberry Pi boards, NVIDIA Jetson, industrial IoT gateways, and robotic accessories.',
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
    order: 4,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_digikey',
    name: 'DigiKey Electronics',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Digi-Key_logo.svg',
    url: 'https://www.digikey.in',
    category: 'Global Silicon Distributor',
    badge: 'Authorized OEM Silicon',
    description:
      'Millions of in-stock electronic components, genuine microchips, automotive-grade passives, and developer tools.',
    order: 5,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_mouser',
    name: 'Mouser Electronics',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Mouser_Electronics_logo.svg',
    url: 'https://www.mouser.in',
    category: 'Semiconductors & ICs',
    badge: 'Global Authorized Reseller',
    description:
      'Global leader in authorized distribution of new semiconductor technology, STMicroelectronics, Texas Instruments, and dev tools.',
    order: 6,
    featured: false,
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
    order: 8,
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
