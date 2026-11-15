import { describe, it, expect } from 'vitest';
import {
  DEFAULT_HARDWARE_PRODUCTS,
  POPULAR_SUPPLIER_PRESETS,
} from '@/modules/products/product-service';

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
});
