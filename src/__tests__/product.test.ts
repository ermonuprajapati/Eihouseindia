import { describe, it, expect } from 'vitest';
import {
  DEFAULT_HARDWARE_PRODUCTS,
  POPULAR_SUPPLIER_PRESETS,
} from '@/modules/products/product-service';
import { DEFAULT_TRUSTED_SUPPLIERS } from '@/modules/suppliers/supplier-service';

describe('Products & Hardware Store Service', () => {
  it('provides default hardware products with valid supplier structures', () => {
    expect(DEFAULT_HARDWARE_PRODUCTS.length).toBeGreaterThan(0);

    DEFAULT_HARDWARE_PRODUCTS.forEach((product) => {
      expect(product.id).toBeDefined();
      expect(product.name.length).toBeGreaterThan(0);
      expect(product.price.startsWith('₹')).toBe(true);
      expect(product.features.length).toBeGreaterThan(0);
      expect(Array.isArray(product.suppliers)).toBe(true);

      product.suppliers.forEach((sup) => {
        expect(sup.name.length).toBeGreaterThan(0);
        expect(sup.url.startsWith('http')).toBe(true);
      });
    });
  });

  it('contains verified popular supplier presets with logos', () => {
    expect(POPULAR_SUPPLIER_PRESETS.length).toBeGreaterThan(3);

    const robu = POPULAR_SUPPLIER_PRESETS.find((p) => p.name === 'Robu.in');
    expect(robu).toBeDefined();
    expect(robu?.logoUrl.startsWith('http')).toBe(true);

    const amazon = POPULAR_SUPPLIER_PRESETS.find((p) => p.name === 'Amazon India');
    expect(amazon).toBeDefined();
    expect(amazon?.logoUrl.startsWith('http')).toBe(true);
  });

  it('contains external sourcing suppliers without duplicates and with valid secure URLs', () => {
    expect(DEFAULT_TRUSTED_SUPPLIERS.length).toBeGreaterThanOrEqual(10);

    const seenDomains = new Set<string>();
    const seenNames = new Set<string>();

    DEFAULT_TRUSTED_SUPPLIERS.forEach((sup) => {
      expect(sup.name.length).toBeGreaterThan(0);
      expect(sup.url.startsWith('https://') || sup.url.startsWith('http://')).toBe(true);

      const domain = new URL(sup.url).hostname.replace(/^www\./i, '').toLowerCase();
      const normName = sup.name.toLowerCase().replace(/[^a-z0-9]/g, '');

      expect(seenDomains.has(domain)).toBe(false);
      expect(seenNames.has(normName)).toBe(false);

      seenDomains.add(domain);
      seenNames.add(normName);
    });

    // Check specific required suppliers are present
    const names = DEFAULT_TRUSTED_SUPPLIERS.map((s) => s.name.toLowerCase());
    expect(names).toContain('robu.in');
    expect(names).toContain('robocraze');
    expect(names).toContain('probots');
    expect(names).toContain('thingbits');
    expect(names).toContain('robodium');
    expect(names).toContain('mouser electronics');
    expect(names).toContain('element14 india');
    expect(names).toContain('digikey');
    expect(names).toContain('bambu lab');
    expect(names).toContain('creality');
  });
});
