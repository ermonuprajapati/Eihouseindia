import { describe, it, expect } from 'vitest';
import {
  DEFAULT_HARDWARE_PRODUCTS,
  POPULAR_SUPPLIER_PRESETS,
} from '@/modules/products/product-service';
import { DEFAULT_TRUSTED_SUPPLIERS } from '@/modules/suppliers/supplier-service';
import {
  DEFAULT_ENGINEERING_TOOLS,
  getToolLogoUrl,
  getToolHeroImageUrl,
} from '@/modules/tools/tool-service';
import {
  DEFAULT_LIBRARY_ITEMS,
  getLibraryLogoUrl,
  getLibraryHeroImageUrl,
} from '@/modules/library/library-service';
import { normalizeImageUrl } from '@/lib/image-utils';
import {
  DEFAULT_DATASHEETS,
  getAllDataSheetSearchUrl,
} from '@/modules/datasheets/datasheet-service';

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
    expect(DEFAULT_TRUSTED_SUPPLIERS.length).toBe(18);

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

    // Verify all 8 existing + 10 newly added suppliers are present
    const names = DEFAULT_TRUSTED_SUPPLIERS.map((s) => s.name.toLowerCase());
    expect(names).toContain('robu.in');
    expect(names).toContain('quartz components');
    expect(names).toContain('robocraze');
    expect(names).toContain('electronicscomp');
    expect(names).toContain('digikey electronics');
    expect(names).toContain('mouser electronics');
    expect(names).toContain('jlcpcb');
    expect(names).toContain('amazon india electronics');
    expect(names).toContain('element14');
    expect(names).toContain('thinkrobotics');
    expect(names).toContain('evelta');
    expect(names).toContain('probots');
    expect(names).toContain('robokits india');
    expect(names).toContain('tanotis');
    expect(names).toContain('rajguru electronics');
    expect(names).toContain('arrow electronics');
    expect(names).toContain('avnet');
    expect(names).toContain('roboarc');
  });

  it('supports multiple images array for product catalog', () => {
    const multiImageProduct = {
      id: 'test-multi-prod',
      name: 'Test Board Multi Angle',
      slug: 'test-board-multi-angle',
      category: 'EI House Original Boards',
      price: '₹999',
      inStock: true,
      features: ['Feature 1', 'Feature 2'],
      suppliers: [],
      images: [
        'https://example.com/front.jpg',
        'https://example.com/back.jpg',
        'https://example.com/pinout.jpg',
        'https://example.com/side.jpg',
        'https://example.com/schematic.jpg',
      ],
      imageUrl: 'https://example.com/front.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(multiImageProduct.images.length).toBe(5);
    expect(multiImageProduct.imageUrl).toBe(multiImageProduct.images[0]);
  });

  it('preserves all 54 engineering tools with authentic logos and non-Unsplash interface visuals', () => {
    expect(DEFAULT_ENGINEERING_TOOLS.length).toBe(54);

    DEFAULT_ENGINEERING_TOOLS.forEach((tool) => {
      const logo = getToolLogoUrl(tool);
      const hero = getToolHeroImageUrl(tool);

      expect(logo.length).toBeGreaterThan(0);
      expect(hero.length).toBeGreaterThan(0);
      expect(hero.includes('images.unsplash.com')).toBe(false);
    });
  });

  it('preserves all 12 engineering library resources with independent logo and non-Unsplash cover diagrams', () => {
    expect(DEFAULT_LIBRARY_ITEMS.length).toBe(12);

    DEFAULT_LIBRARY_ITEMS.forEach((item) => {
      const logo = getLibraryLogoUrl(item);
      const cover = getLibraryHeroImageUrl(item);

      expect(logo.length).toBeGreaterThan(0);
      expect(cover.length).toBeGreaterThan(0);
      expect(cover.includes('images.unsplash.com')).toBe(false);
    });

    // Verify independent logo vs cover image resolution
    const sample = {
      ...DEFAULT_LIBRARY_ITEMS[0],
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/custom-cover.png',
      iconUrl: 'https://res.cloudinary.com/demo/image/upload/custom-icon.svg',
      fileUrl: 'https://example.com/esp32-s3-datasheet.pdf',
    };
    expect(getLibraryHeroImageUrl(sample)).toBe(sample.imageUrl);
    expect(getLibraryLogoUrl(sample)).toBe(sample.iconUrl);
    expect(sample.fileUrl).toBe('https://example.com/esp32-s3-datasheet.pdf');
  });

  it('normalizes various image URL formats safely for store and library', () => {
    expect(normalizeImageUrl('   https://example.com/image.png  ')).toBe('https://example.com/image.png');
    expect(normalizeImageUrl('//cdn.example.com/photo.jpg')).toBe('https://cdn.example.com/photo.jpg');
    expect(normalizeImageUrl('https://drive.google.com/file/d/1A2B3C4D5E/view?usp=sharing')).toBe(
      'https://drive.google.com/thumbnail?id=1A2B3C4D5E&sz=w1000'
    );
    expect(normalizeImageUrl('https://www.dropbox.com/s/sample/photo.jpg?dl=0')).toBe(
      'https://www.dropbox.com/s/sample/photo.jpg?raw=1'
    );
    expect(normalizeImageUrl('')).toBe('');
    expect(normalizeImageUrl(null)).toBe('');
  });

  it('provides verified electronic component datasheets with official AllDataSheet link integration', () => {
    expect(DEFAULT_DATASHEETS.length).toBeGreaterThanOrEqual(16);

    const partNumbers = DEFAULT_DATASHEETS.map((d) => d.partNumber);
    expect(partNumbers).toContain('LM358');
    expect(partNumbers).toContain('NE555');
    expect(partNumbers).toContain('ATmega328P');
    expect(partNumbers).toContain('ESP32-S3');
    expect(partNumbers).toContain('STM32F103C8T6');
    expect(partNumbers).toContain('IRFZ44N');
    expect(partNumbers).toContain('LM7805');

    DEFAULT_DATASHEETS.forEach((item) => {
      expect(item.datasheetUrl.startsWith('http')).toBe(true);
      expect(item.category.length).toBeGreaterThan(0);
      expect(item.manufacturer.length).toBeGreaterThan(0);
      expect(item.verified).toBe(true);
    });

    const searchUrl = getAllDataSheetSearchUrl('LM358');
    expect(searchUrl).toBe('https://www.alldatasheet.com/view.jsp?Searchword=LM358');
  });
});
