'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShoppingBag,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  AlertCircle,
  BookOpen,
  ArrowRight,
  Search,
  X,
  Globe,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/config/site';
import { useOptionalAuth } from '@/modules/auth/auth-context';
import { fetchProducts, DEFAULT_HARDWARE_PRODUCTS } from '@/modules/products/product-service';
import { fetchSuppliers, DEFAULT_TRUSTED_SUPPLIERS } from '@/modules/suppliers/supplier-service';
import { ProductOrderModal } from '@/components/store/ProductOrderModal';
import { ProductDetailModal } from '@/components/store/ProductDetailModal';
import { normalizeImageUrl } from '@/lib/image-utils';
import type { Product, TrustedSupplier, Post } from '@/types';

const SUPPLIER_FILTER_CATEGORIES = [
  'All Categories',
  'Electronics & Components',
  'Semiconductors',
  'Embedded Systems & IoT',
  'Robotics & Automation',
  'Sensors & Motors',
  'Mechanical & Prototyping',
  '3D Printing & Manufacturing',
  'Test & Measurement',
] as const;

function ProductCardGallery({ item }: { item: Product }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    setActiveIndex(0);
    setFailedUrls(new Set());
  }, [item.id]);

  const images = useMemo(() => {
    const rawList = Array.isArray(item.images) && item.images.length > 0
      ? item.images
      : (item.imageUrl ? [item.imageUrl] : []);
    
    return rawList
      .map((url) => normalizeImageUrl(url))
      .filter((url) => Boolean(url) && !failedUrls.has(url));
  }, [item.images, item.imageUrl, failedUrls]);

  if (images.length === 0) {
    return (
      <div className="h-40 w-full rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-slate-400 border border-slate-100 relative overflow-hidden">
        <ShoppingBag className="h-8 w-8 text-slate-300" />
      </div>
    );
  }

  const currentSrc = images[activeIndex] || images[0];

  return (
    <div className="group/gallery relative h-40 w-full rounded-xl bg-slate-50/80 overflow-hidden border border-slate-100 flex items-center justify-center p-2">
      <Image
        src={currentSrc}
        alt={`${item.name} - photo ${activeIndex + 1}`}
        fill
        unoptimized
        onError={() => {
          setFailedUrls((prev) => new Set(prev).add(currentSrc));
        }}
        className="object-contain p-2.5 transition-transform duration-300 group-hover/card:scale-105"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
      />

      {/* Quick View Hover Pill */}
      <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-[#0B1528]/85 px-2.5 py-1 text-[10px] font-semibold text-white opacity-0 group-hover/card:opacity-100 transition-opacity shadow-sm z-10 whitespace-nowrap">
        <Eye className="h-3 w-3 text-[#F59E0B]" />
        <span>Click for Full Details</span>
      </span>

      {images.length > 1 && (
        <>
          {/* Arrow navigation buttons */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
            }}
            aria-label="Previous photo"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-white/90 shadow-md border border-slate-200 flex items-center justify-center text-slate-700 opacity-0 group-hover/gallery:opacity-100 transition-opacity hover:bg-white z-20 cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
            }}
            aria-label="Next photo"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-white/90 shadow-md border border-slate-200 flex items-center justify-center text-slate-700 opacity-0 group-hover/gallery:opacity-100 transition-opacity hover:bg-white z-20 cursor-pointer"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {/* Photo count indicator */}
          <span className="absolute bottom-1.5 right-1.5 text-[9px] font-mono font-semibold bg-white/90 backdrop-blur-xs text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs z-10">
            {activeIndex + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  );
}

export function ProductsCatalogClient() {
  const auth = useOptionalAuth();
  const isEditor = Boolean(auth?.isEditor);
  const [products, setProducts] = useState<Product[]>(DEFAULT_HARDWARE_PRODUCTS);
  const [suppliers, setSuppliers] = useState<TrustedSupplier[]>(DEFAULT_TRUSTED_SUPPLIERS);
  const [publishedPosts, setPublishedPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Hardware');
  const [productSearch, setProductSearch] = useState<string>('');
  const [productSort, setProductSort] = useState<'featured' | 'price-asc' | 'price-desc' | 'in-stock'>('featured');
  const [detailModalProduct, setDetailModalProduct] = useState<Product | null>(null);
  const [orderModalProduct, setOrderModalProduct] = useState<Product | null>(null);

  // External Suppliers Sourcing State
  const [supplierSearch, setSupplierSearch] = useState<string>('');
  const [selectedSupplierCategory, setSelectedSupplierCategory] = useState<string>('All Categories');
  const [failedLogoIds, setFailedLogoIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;
    fetchProducts()
      .then((data) => {
        if (isMounted && data.length > 0) {
          setProducts(data);
        }
      })
      .catch((err) => console.warn('Could not load products:', err));

    fetchSuppliers()
      .then((data) => {
        if (isMounted && data.length > 0) {
          setSuppliers(data);
        }
      })
      .catch((err) => console.warn('Could not load suppliers:', err));

    fetch('/api/articles?limit=50')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.posts && Array.isArray(data.posts)) {
          setPublishedPosts(data.posts);
        }
      })
      .catch((err) => console.warn('Could not load blog posts:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(['All Hardware']);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const parsePrice = (priceStr: string) => parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;

    const list = products.filter((p) => {
      if (selectedCategory !== 'All Hardware' && p.category !== selectedCategory) {
        return false;
      }
      if (productSort === 'in-stock' && !p.inStock) {
        return false;
      }
      if (!productSearch.trim()) return true;
      const q = productSearch.toLowerCase().trim();
      const haystack = `${p.name} ${p.category} ${p.badge || ''} ${p.description || ''} ${(p.features || []).join(' ')}`.toLowerCase();
      return haystack.includes(q);
    });

    if (productSort === 'price-asc') {
      return [...list].sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    }
    if (productSort === 'price-desc') {
      return [...list].sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    }
    return list;
  }, [products, selectedCategory, productSearch, productSort]);

  // Critical Duplicate Prevention & Normalization for External Suppliers
  const deduplicatedSuppliers = useMemo(() => {
    const seenDomains = new Set<string>();
    const seenNames = new Set<string>();
    const result: TrustedSupplier[] = [];

    for (const sup of suppliers) {
      // Normalize domain
      let domain = '';
      try {
        const u = new URL(sup.url);
        domain = u.hostname.replace(/^www\./i, '').toLowerCase();
      } catch {
        domain = sup.url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
      }
      const normName = sup.name.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (domain && seenDomains.has(domain)) continue;
      if (normName && seenNames.has(normName)) continue;

      if (domain) seenDomains.add(domain);
      if (normName) seenNames.add(normName);
      result.push(sup);
    }
    return result;
  }, [suppliers]);

  // Only display categories that actually have matching supplier records
  const availableSupplierCategories = useMemo(() => {
    const active = new Set<string>(['All Categories']);
    for (const cat of SUPPLIER_FILTER_CATEGORIES) {
      if (cat === 'All Categories') continue;
      const hasMatch = deduplicatedSuppliers.some((sup) => {
        return (
          (sup.tags && sup.tags.includes(cat)) ||
          (sup.category && sup.category.toLowerCase().includes(cat.toLowerCase()))
        );
      });
      if (hasMatch) {
        active.add(cat);
      }
    }
    return Array.from(active);
  }, [deduplicatedSuppliers]);

  // Filtered suppliers based on selected category and search input
  const filteredSuppliers = useMemo(() => {
    return deduplicatedSuppliers.filter((sup) => {
      // Category match
      const matchesCat =
        selectedSupplierCategory === 'All Categories' ||
        (sup.tags && sup.tags.includes(selectedSupplierCategory)) ||
        (sup.category && sup.category.toLowerCase().includes(selectedSupplierCategory.toLowerCase()));

      if (!matchesCat) return false;

      // Search query match
      if (!supplierSearch.trim()) return true;
      const q = supplierSearch.toLowerCase().trim();
      return (
        sup.name.toLowerCase().includes(q) ||
        (sup.category && sup.category.toLowerCase().includes(q)) ||
        (sup.description && sup.description.toLowerCase().includes(q)) ||
        (sup.badge && sup.badge.toLowerCase().includes(q)) ||
        (sup.tags && sup.tags.some((t) => t.toLowerCase().includes(q)))
      );
    });
  }, [deduplicatedSuppliers, selectedSupplierCategory, supplierSearch]);

  const getSupplierMonogram = (name: string): string => {
    const clean = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const words = clean.split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return clean.slice(0, 3).toUpperCase();
  };

  const resolveRelatedBlog = (item: Product) => {
    // Only resolve if published posts are available
    if (!publishedPosts || publishedPosts.length === 0) return null;

    // 1. Explicit relatedBlogSlug configured on product
    if (item.relatedBlogSlug) {
      const direct = publishedPosts.find(
        (p) => p.slug === item.relatedBlogSlug || p.id === item.relatedBlogSlug
      );
      if (direct) {
        return {
          slug: direct.slug,
          title: item.relatedBlogTitle?.trim() || direct.title,
        };
      }
      // Blog specified by slug is not currently published -> hide link to avoid 404
      return null;
    }

    // 2. Smart automatic matching from published articles on website
    const productWords = `${item.name} ${item.slug} ${item.category}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter(
        (w) =>
          w.length >= 3 &&
          !['the', 'and', 'for', 'pro', 'kit', 'board', 'module', 'with', 'house', 'development', 'sensor'].includes(w)
      );

    const matched = publishedPosts.find((post) => {
      const postText = `${post.title} ${post.slug} ${(post.tags || []).join(' ')}`.toLowerCase();
      return productWords.some((word) => postText.includes(word));
    });

    if (matched) {
      return { slug: matched.slug, title: matched.title };
    }

    return null;
  };

  return (
    <section id="products-catalog" className="py-12 sm:py-16 border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Commercial Store Filter, Search & Sort Header */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search boards, sensors, kits, or specifications..."
                aria-label="Search store products"
                className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-8 text-xs sm:text-sm text-[#0B1528] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#172D4D] transition-all"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch('')}
                  aria-label="Clear product search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sort & Results Count */}
            <div className="flex items-center justify-between sm:justify-end gap-3">
              <span className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-[#0B1528]">{filteredProducts.length}</strong> products
              </span>
              <select
                aria-label="Sort products"
                value={productSort}
                onChange={(e) =>
                  setProductSort(e.target.value as 'featured' | 'price-asc' | 'price-desc' | 'in-stock')
                }
                className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#172D4D]"
              >
                <option value="featured">Sort: Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="in-stock">In Stock Only</option>
              </select>
            </div>
          </div>

          {/* Category tabs with counts */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
            {categories.map((c) => {
              const count =
                c === 'All Hardware'
                  ? products.length
                  : products.filter((p) => p.category === c).length;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCategory(c)}
                  className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedCategory === c
                      ? 'bg-[#172D4D] text-white border-[#172D4D] shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{c}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      selectedCategory === c ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Compact Commercial Products Grid (4 per row on desktop, click product for full details) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map((item) => {
            const whatsappText = encodeURIComponent(
              `Hello EI House India, I want to order:\n\n*Product:* ${item.name}\n*Price:* ${item.price}\n\nPlease share delivery and payment details.`
            );
            const whatsappLink = `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${whatsappText}`;
            const relatedBlog = resolveRelatedBlog(item);

            const priceNum = parseInt(item.price.replace(/[^0-9]/g, ''), 10);
            const mrpNum = item.mrp ? parseInt(item.mrp.replace(/[^0-9]/g, ''), 10) : 0;
            const discount =
              mrpNum > priceNum && priceNum > 0
                ? Math.round(((mrpNum - priceNum) / mrpNum) * 100)
                : 0;

            return (
              <div
                key={item.id}
                onClick={() => setDetailModalProduct(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDetailModalProduct(item);
                  }
                }}
                className="group/card rounded-2xl border border-slate-200/90 bg-white p-4 flex flex-col justify-between space-y-3.5 shadow-2xs hover:shadow-lg hover:border-[#172D4D]/30 transition-all relative overflow-hidden cursor-pointer text-left"
              >
                {/* Upper Clickable Product Summary (Compact Commercial Layout) */}
                <div className="space-y-2.5">
                  {/* Top Row: Badge & Stock Status */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1 min-w-0">
                      {discount > 0 && (
                        <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow-2xs shrink-0">
                          {discount}% OFF
                        </span>
                      )}
                      {item.badge && (
                        <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded truncate">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    {item.inStock ? (
                      <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        In Stock
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                        <AlertCircle className="h-2.5 w-2.5" />
                        Out of Stock
                      </span>
                    )}
                  </div>

                  {/* Product Image Showcase */}
                  <ProductCardGallery item={item} />

                  {/* Category, Title & Commercial Price */}
                  <div className="space-y-1 pt-0.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider truncate">
                        {item.category}
                      </p>
                      {isEditor && (
                        <Link
                          href={`/admin?section=products&editProduct=${encodeURIComponent(item.id)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 hover:bg-[#0B1528] hover:text-white px-1.5 py-0.2 text-[10px] font-semibold text-slate-700 transition-colors shrink-0"
                          title={`Edit ${item.name}`}
                        >
                          <Edit3 className="h-2.5 w-2.5" />
                          <span>Edit</span>
                        </Link>
                      )}
                    </div>
                    <h3 className="font-display text-sm sm:text-[15px] font-bold text-[#0B1528] group-hover/card:text-[#0090FF] transition-colors leading-snug line-clamp-2 min-h-[2.5rem]">
                      {item.name}
                    </h3>

                    <div className="flex items-baseline gap-1.5 pt-1 flex-wrap">
                      <span className="text-lg font-extrabold text-[#0B1528]">{item.price}</span>
                      {item.mrp && (
                        <span className="text-xs text-slate-400 line-through">{item.mrp}</span>
                      )}
                      <span className="text-[10px] font-medium text-emerald-600 ml-auto">
                        Incl. taxes
                      </span>
                    </div>

                    {/* Subtle cue that clicking opens full description & specifications */}
                    <div className="pt-1 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover/card:text-[#172D4D] transition-colors">
                      <span>
                        View Full Details
                        {item.features && item.features.length > 0
                          ? ` & ${item.features.length} Specs`
                          : ''}
                      </span>
                      <ArrowRight className="h-3 w-3 group-hover/card:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>

                {/* Bottom Pinned Section: Blog Read Link + Inquiry / Order Buttons (Always Visible) */}
                <div
                  className="space-y-2 pt-2.5 border-t border-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Related Blog / Tutorial Guide Link */}
                  {relatedBlog && (
                    <Link
                      href={`/blog/${relatedBlog.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/blog flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-amber-50/80 hover:bg-amber-100 border border-amber-200/80 transition-all text-[11px] text-amber-950"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <BookOpen className="h-3.5 w-3.5 text-[#B45309] shrink-0" />
                        <span className="truncate font-semibold text-slate-800 group-hover/blog:text-[#0B1528]">
                          Read Blog: {relatedBlog.title}
                        </span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-[#B45309] shrink-0 group-hover/blog:translate-x-0.5 transition-transform" />
                    </Link>
                  )}

                  {/* Direct Inquiry / Order + WhatsApp Buttons */}
                  {item.inStock ? (
                    <div className="grid grid-cols-5 gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => setOrderModalProduct(item)}
                        className="col-span-3 h-8 bg-[#172D4D] hover:bg-[#0B1528] text-white font-semibold text-[11px] px-2 shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Order / Inquiry</span>
                      </Button>

                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="col-span-2 h-8 border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold text-[11px] px-2 flex items-center justify-center gap-1"
                      >
                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">WhatsApp</span>
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setOrderModalProduct(item)}
                        className="col-span-3 h-8 text-[11px] border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 px-2 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Pre-Order Inquiry</span>
                      </Button>

                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="col-span-2 h-8 border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold text-[11px] px-2 flex items-center justify-center gap-1"
                      >
                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">WhatsApp</span>
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dedicated Full-Width External Suppliers Directory */}
        <div id="trusted-suppliers" className="pt-16 mt-16 border-t-2 border-slate-200/80 space-y-8">
          {/* Section Hero Banner */}
          <div className="bg-gradient-to-r from-[#070E1A] via-[#0B1528] to-[#172D4D] text-white rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden border border-slate-800">
            <div className="max-w-3xl space-y-3 relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                <Globe className="h-4 w-4" />
                External Sourcing Directory
              </span>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                External Suppliers
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Can&apos;t find what you&apos;re looking for? Explore trusted external sourcing websites for electronic components, robotics, embedded systems, engineering hardware and 3D printing products.
              </p>
              <div className="pt-2">
                <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>External sourcing directory: Purchases are completed directly on the external supplier&apos;s official website.</span>
                </p>
              </div>
            </div>
            {/* Ambient Background Glow */}
            <div className="absolute -right-12 -bottom-12 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-12 -top-12 w-80 h-80 bg-[#F59E0B]/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Search & Category Filter Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              {/* Search Field */}
              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  placeholder="Search suppliers by name, components, or domain..."
                  aria-label="Search external suppliers"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-10 pr-9 text-xs sm:text-sm text-[#0B1528] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0090FF] focus:bg-white transition-all"
                />
                {supplierSearch && (
                  <button
                    onClick={() => setSupplierSearch('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status Counter */}
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium self-end sm:self-auto">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#0090FF]" />
                <span>
                  Showing <strong>{filteredSuppliers.length}</strong> of {deduplicatedSuppliers.length} suppliers
                </span>
              </div>
            </div>

            {/* Category Filter Pills (Only categories with matching records) */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              {availableSupplierCategories.map((cat) => {
                const isActive = selectedSupplierCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedSupplierCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#0B1528] text-white shadow-xs'
                        : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/80'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Suppliers Grid Layout */}
          {filteredSuppliers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredSuppliers.map((sup) => (
                <div
                  key={sup.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-lg hover:border-blue-400/50 transition-all group"
                >
                  <div className="space-y-3.5">
                    {/* Top Identity & Badge Bar */}
                    <div className="flex items-center justify-between gap-3">
                      {/* Logo or High-Grade Monogram Identity */}
                      <div className="h-12 w-28 relative rounded-xl bg-slate-50 p-2 border border-slate-200/70 flex items-center justify-center shrink-0 overflow-hidden">
                        {sup.logoUrl && sup.logoUrl.trim().length > 0 && !failedLogoIds.has(sup.id) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={sup.logoUrl}
                            alt={`${sup.name} logo`}
                            className="max-h-full max-w-full object-contain"
                            onError={() => {
                              setFailedLogoIds((prev) => new Set(prev).add(sup.id));
                            }}
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 font-display font-extrabold text-[#0B1528] text-xs tracking-wider">
                            <span className="h-2 w-2 rounded-full bg-[#0090FF]" />
                            <span>{getSupplierMonogram(sup.name)}</span>
                          </div>
                        )}
                      </div>

                      {/* External Supplier & Custom Badges */}
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ExternalLink className="h-2.5 w-2.5 text-slate-400" />
                          External Supplier
                        </span>
                        {sup.badge && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-right">
                            {sup.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Supplier Name & Category Header */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-base font-bold text-[#0B1528] group-hover:text-[#0090FF] transition-colors leading-snug">
                          {sup.name}
                        </h3>
                        {isEditor && (
                          <Link
                            href={`/admin?section=suppliers&editSupplier=${encodeURIComponent(sup.id)}`}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 hover:bg-[#0B1528] hover:text-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 transition-colors shrink-0"
                            title={`Edit ${sup.name}`}
                          >
                            <Edit3 className="h-2.5 w-2.5" />
                            <span>Edit</span>
                          </Link>
                        )}
                      </div>
                      {sup.category && (
                        <p className="text-xs font-semibold text-[#0090FF] mt-0.5">
                          {sup.category}
                        </p>
                      )}
                    </div>

                    {/* Short Professional Description */}
                    {sup.description && (
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {sup.description}
                      </p>
                    )}

                    {/* Granular Product Category Tags */}
                    {sup.tags && sup.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {sup.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {sup.tags.length > 3 && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1 py-0.5 rounded">
                            +{sup.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Visit External Supplier CTA Button */}
                  <div className="pt-3 border-t border-slate-100">
                    <Button
                      asChild
                      size="sm"
                      className="w-full bg-[#0B1528] hover:bg-[#172D4D] text-white font-semibold text-xs shadow-xs transition-colors"
                    >
                      <a
                        href={sup.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Visit official website of ${sup.name} (opens in new tab)`}
                      >
                        <span>Visit Supplier</span>
                        <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search className="h-5 w-5" />
              </div>
              <h4 className="font-display text-lg font-bold text-[#0B1528]">
                No external suppliers found
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No external suppliers match your current filter or search query. Try searching for a different component or category.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSupplierSearch('');
                  setSelectedSupplierCategory('All Categories');
                }}
                className="text-xs"
              >
                Reset Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Commercial Product Full Details Dialog (Opens when clicking a product card) */}
      <ProductDetailModal
        product={detailModalProduct}
        relatedBlog={detailModalProduct ? resolveRelatedBlog(detailModalProduct) : null}
        open={Boolean(detailModalProduct)}
        onOpenChange={(open) => !open && setDetailModalProduct(null)}
        onOrderClick={(prod) => setOrderModalProduct(prod)}
      />

      {/* Order Inquiry Dialog */}
      <ProductOrderModal
        product={orderModalProduct}
        open={Boolean(orderModalProduct)}
        onOpenChange={(open) => !open && setOrderModalProduct(null)}
      />
    </section>
  );
}
