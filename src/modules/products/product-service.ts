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
import type { Product, UserProfile, UserRole } from '@/types';

export interface SupplierPreset {
  name: string;
  logoUrl: string;
  defaultBadge?: string;
}

export const POPULAR_SUPPLIER_PRESETS: SupplierPreset[] = [
  {
    name: 'Robu.in',
    logoUrl: 'https://images.seeklogo.com/logo-png/43/1/robu-in-logo-png_seeklogo-434057.png',
    defaultBadge: 'Fast Shipping in India',
  },
  {
    name: 'Amazon India',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
    defaultBadge: 'Prime Delivery',
  },
  {
    name: 'Quartz Components',
    logoUrl: 'https://quartzcomponents.com/cdn/shop/files/Quartz_Logo_New-01_180x.png',
    defaultBadge: 'Verified Sensors',
  },
  {
    name: 'Mouser Electronics',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Mouser_Electronics_logo.svg',
    defaultBadge: 'Global Stock',
  },
  {
    name: 'DigiKey',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Digi-Key_logo.svg',
    defaultBadge: 'Authorized Distributor',
  },
  {
    name: 'JLCPCB',
    logoUrl: 'https://jlcpcb.com/favicon.ico',
    defaultBadge: 'PCB & Stencil',
  },
];

export const DEFAULT_HARDWARE_PRODUCTS: Product[] = [
  {
    id: 'eihouse-esp32-s3-pro',
    name: 'EI House ESP32-S3 Pro IoT Development Board',
    slug: 'eihouse-esp32-s3-pro',
    category: 'EI House Original Boards',
    badge: 'Bestseller',
    price: '₹899',
    mrp: '₹1,299',
    imageUrl: 'https://res.cloudinary.com/cnr3hofy/image/upload/v1794764750/eihouseindia/test_verify_setup.png',
    inStock: true,
    features: [
      'Dual Core 240MHz Xtensa LX7',
      'Built-in 0.96" OLED Display',
      'USB-C Native Debug & OTG',
      'Onboard LiPo Battery Charging & Management',
    ],
    description: 'Flagship engineering development board designed for advanced IoT, edge AI, and telemetry projects.',
    relatedBlogSlug: 'getting-started-with-esp32-s3-iot-projects',
    relatedBlogTitle: 'Getting Started with ESP32-S3 IoT & Edge AI',
    suppliers: [
      {
        id: 'sup_robu_esp32',
        name: 'Robu.in',
        logoUrl: 'https://images.seeklogo.com/logo-png/43/1/robu-in-logo-png_seeklogo-434057.png',
        url: 'https://robu.in',
        price: '₹949',
        badge: 'Fast Dispatch',
      },
      {
        id: 'sup_amazon_esp32',
        name: 'Amazon India',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
        url: 'https://amazon.in',
        price: '₹999',
        badge: 'Prime Delivery',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'eihouse-stm32-starter-kit',
    name: 'STM32 ARM Cortex-M4 Practical Learning Kit',
    slug: 'eihouse-stm32-starter-kit',
    category: 'Robotics & STEM Kits',
    badge: 'Course Kit',
    price: '₹2,499',
    mrp: '₹3,200',
    inStock: true,
    features: [
      'STM32F401 BlackPill Board (84MHz, 256KB Flash)',
      'ST-Link V2 Hardware Debugger',
      '16x2 I2C Display + Sensor Bundle',
      'High-grade Breadboard & 65x Jumper Wire Set',
    ],
    description: 'Comprehensive embedded systems starter kit curated for college students and firmware engineers.',
    relatedBlogSlug: 'stm32-dma-uart-architecture-guide',
    relatedBlogTitle: 'STM32 Architecture, Registers & ST-Link Setup Guide',
    suppliers: [
      {
        id: 'sup_quartz_stm32',
        name: 'Quartz Components',
        logoUrl: 'https://quartzcomponents.com/cdn/shop/files/Quartz_Logo_New-01_180x.png',
        url: 'https://quartzcomponents.com',
        price: '₹2,599',
        badge: 'Verified Silicon',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bme680-environmental-sensor',
    name: 'Bosch BME680 Environmental Sensor Module (I2C/SPI)',
    slug: 'bme680-environmental-sensor',
    category: 'Sensors & Modules',
    badge: 'Verified Silicon',
    price: '₹549',
    mrp: '₹799',
    inStock: true,
    features: [
      'Temperature, Humidity, Pressure & Gas VOC',
      'Ultra-low power operation',
      'Pre-soldered precision pin headers',
      'Dual logic compatibility 3.3V and 5V',
    ],
    description: 'All-in-one indoor air quality sensing module suitable for weather stations and industrial monitors.',
    relatedBlogSlug: 'bme680-sensor-interfacing-air-quality-voc',
    relatedBlogTitle: 'Interfacing BME680 Sensor with Arduino & ESP32',
    suppliers: [
      {
        id: 'sup_robu_bme',
        name: 'Robu.in',
        logoUrl: 'https://images.seeklogo.com/logo-png/43/1/robu-in-logo-png_seeklogo-434057.png',
        url: 'https://robu.in',
        price: '₹579',
        badge: 'In Stock',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'eihouse-petg-cf-filament',
    name: 'High-Strength Carbon Fiber PETG 3D Filament (1kg)',
    slug: 'eihouse-petg-cf-filament',
    category: '3D Printing & Filament',
    badge: 'Engineering Grade',
    price: '₹1,699',
    mrp: '₹2,199',
    inStock: true,
    features: [
      '1.75mm Precision Diameter (±0.02mm)',
      '20% Chopped High-Modulus Carbon Fiber',
      'Extreme Stiffness & Heat Deflection up to 80°C',
      'Ideal for Drone Arms, Robot Brackets & Gear Enclosures',
    ],
    description: 'Industrial-grade composite filament engineered for functional prototypes and structural parts.',
    relatedBlogSlug: 'carbon-fiber-petg-3d-printing-settings-guide',
    relatedBlogTitle: 'Optimizing Carbon Fiber PETG 3D Printing Speeds & Temps',
    suppliers: [
      {
        id: 'sup_amazon_petg',
        name: 'Amazon India',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
        url: 'https://amazon.in',
        price: '₹1,799',
        badge: 'Fast Delivery',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lora-sx1262-node',
    name: 'EI House SX1262 868MHz / 915MHz LoRa Telemetry Node',
    slug: 'lora-sx1262-node',
    category: 'EI House Original Boards',
    badge: 'Long Range',
    price: '₹1,149',
    mrp: '₹1,599',
    inStock: true,
    features: [
      'Up to 15km line-of-sight range',
      '+22dBm transmit power capability',
      'SMA antenna connector & 3dBi antenna included',
      'Ultra-low standby current (1.2µA)',
    ],
    description: 'Long range telemetry module designed for smart agriculture, remote sensors, and drone telemetry.',
    relatedBlogSlug: 'long-range-lora-sx1262-mesh-network-guide',
    relatedBlogTitle: 'Building Long-Range Telemetry with SX1262 LoRa',
    suppliers: [
      {
        id: 'sup_robu_lora',
        name: 'Robu.in',
        logoUrl: 'https://images.seeklogo.com/logo-png/43/1/robu-in-logo-png_seeklogo-434057.png',
        url: 'https://robu.in',
        price: '₹1,199',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'eihouse-smart-rover-chassis',
    name: 'Autonomous 4WD Mecanum Wheel Robotic Platform',
    slug: 'eihouse-smart-rover-chassis',
    category: 'Robotics & STEM Kits',
    badge: 'Popular',
    price: '₹3,299',
    mrp: '₹4,500',
    inStock: false,
    features: [
      'Anodized Aluminum Alloy Chassis',
      '4x Metal Gear Motors with Speed Encoders',
      'Omnidirectional 80mm Mecanum Wheels',
      'Li-Ion 18650 Battery Pack Holder & Mounting Hardware',
    ],
    description: 'Heavy duty omnidirectional mobile base for ROS robots, autonomous SLAM, and AGVs.',
    suppliers: [
      {
        id: 'sup_robu_rover',
        name: 'Robu.in',
        logoUrl: 'https://images.seeklogo.com/logo-png/43/1/robu-in-logo-png_seeklogo-434057.png',
        url: 'https://robu.in',
        price: '₹3,450',
        badge: 'In Stock with Supplier',
      },
      {
        id: 'sup_quartz_rover',
        name: 'Quartz Components',
        logoUrl: 'https://quartzcomponents.com/cdn/shop/files/Quartz_Logo_New-01_180x.png',
        url: 'https://quartzcomponents.com',
        price: '₹3,499',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function serializeTimestamp(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === 'object' && 'toDate' in ts && typeof (ts as Timestamp).toDate === 'function') {
    return (ts as Timestamp).toDate().toISOString();
  }
  return String(ts);
}

/**
 * Fetch all products from Firestore, falling back to curated defaults if collection is empty
 */
export async function fetchProducts(): Promise<Product[]> {
  try {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    if (snap.empty) {
      return DEFAULT_HARDWARE_PRODUCTS;
    }

    return snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: String(data.name || ''),
        slug: String(data.slug || docSnap.id),
        category: String(data.category || 'General Hardware'),
        badge: data.badge ? String(data.badge) : undefined,
        price: String(data.price || '₹0'),
        mrp: data.mrp ? String(data.mrp) : undefined,
        imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
        inStock: data.inStock !== false,
        features: Array.isArray(data.features) ? data.features.map(String) : [],
        description: data.description ? String(data.description) : undefined,
        suppliers: Array.isArray(data.suppliers)
          ? data.suppliers.map((s: Record<string, unknown>) => ({
              id: String(s.id || Math.random().toString(36).slice(2, 8)),
              name: String(s.name || ''),
              logoUrl: s.logoUrl ? String(s.logoUrl) : undefined,
              url: String(s.url || '#'),
              price: s.price ? String(s.price) : undefined,
              badge: s.badge ? String(s.badge) : undefined,
            }))
          : [],
        featured: Boolean(data.featured),
        relatedBlogSlug: data.relatedBlogSlug ? String(data.relatedBlogSlug) : undefined,
        relatedBlogTitle: data.relatedBlogTitle ? String(data.relatedBlogTitle) : undefined,
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
      };
    });
  } catch (error) {
    console.warn('Failed to fetch products from Firestore, using default catalog:', error);
    return DEFAULT_HARDWARE_PRODUCTS;
  }
}

/**
 * Save or update a product from the Admin Console
 */
export async function saveProductAdmin(
  productData: Omit<Product, 'createdAt' | 'updatedAt' | 'id'> & { id?: string },
  actor: UserProfile,
  actorRole: UserRole
): Promise<Product> {
  if (actorRole !== 'ADMIN' && actorRole !== 'EDITOR') {
    throw new Error('Unauthorized: Admin or Editor role required.');
  }

  const productId =
    productData.id && productData.id.trim().length > 0
      ? productData.id
      : `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const batch = writeBatch(db);
  const prodRef = doc(db, 'products', productId);
  const logId = `log_${Date.now()}_prod`;

  const payload = {
    id: productId,
    name: productData.name.trim(),
    slug: productData.slug.trim(),
    category: productData.category.trim(),
    badge: productData.badge?.trim() || null,
    price: productData.price.trim(),
    mrp: productData.mrp?.trim() || null,
    imageUrl: productData.imageUrl?.trim() || null,
    inStock: Boolean(productData.inStock),
    features: productData.features.filter((f) => f.trim().length > 0),
    description: productData.description?.trim() || null,
    relatedBlogSlug: productData.relatedBlogSlug?.trim() || null,
    relatedBlogTitle: productData.relatedBlogTitle?.trim() || null,
    suppliers: productData.suppliers.map((s) => ({
      id: s.id || `sup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: s.name.trim(),
      logoUrl: s.logoUrl?.trim() || null,
      url: s.url.trim(),
      price: s.price?.trim() || null,
      badge: s.badge?.trim() || null,
    })),
    updatedAt: serverTimestamp(),
  };

  batch.set(
    prodRef,
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
    actorRole,
    action: 'MANAGE_PRODUCT',
    targetType: 'PRODUCT',
    targetId: productId,
    reason: `Saved product "${productData.name}"`,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();

    // Trigger on-demand cache revalidation
    fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/products' }),
    }).catch(() => undefined);

    return {
      ...payload,
      badge: payload.badge || undefined,
      mrp: payload.mrp || undefined,
      imageUrl: payload.imageUrl || undefined,
      description: payload.description || undefined,
      relatedBlogSlug: payload.relatedBlogSlug || undefined,
      relatedBlogTitle: payload.relatedBlogTitle || undefined,
      suppliers: payload.suppliers.map((s) => ({
        ...s,
        logoUrl: s.logoUrl || undefined,
        price: s.price || undefined,
        badge: s.badge || undefined,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `products/${productId}`);
    throw error;
  }
}

/**
 * Toggle In-Stock / Out-of-Stock directly from Admin Table
 */
export async function toggleProductStockAdmin(
  productId: string,
  inStock: boolean,
  actor: UserProfile,
  actorRole: UserRole
): Promise<void> {
  if (actorRole !== 'ADMIN' && actorRole !== 'EDITOR') {
    throw new Error('Unauthorized: Admin or Editor role required.');
  }

  const batch = writeBatch(db);
  const prodRef = doc(db, 'products', productId);
  const logId = `log_${Date.now()}_stock`;

  batch.update(prodRef, {
    inStock,
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole,
    action: 'MANAGE_PRODUCT',
    targetType: 'PRODUCT',
    targetId: productId,
    reason: inStock ? 'Marked product In Stock' : 'Marked product Out of Stock',
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
  }
}

/**
 * Delete a product permanently from Admin Console
 */
export async function deleteProductAdmin(
  productId: string,
  productName: string,
  actor: UserProfile,
  actorRole: UserRole
): Promise<void> {
  if (actorRole !== 'ADMIN' && actorRole !== 'EDITOR') {
    throw new Error('Unauthorized: Admin or Editor role required.');
  }

  const batch = writeBatch(db);
  const prodRef = doc(db, 'products', productId);
  const logId = `log_${Date.now()}_delprod`;

  batch.delete(prodRef);

  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole,
    action: 'MANAGE_PRODUCT',
    targetType: 'PRODUCT',
    targetId: productId,
    reason: `Deleted product "${productName}"`,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();

    // Trigger on-demand cache revalidation
    fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/products' }),
    }).catch(() => undefined);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
  }
}
