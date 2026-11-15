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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/config/site';
import { fetchProducts, DEFAULT_HARDWARE_PRODUCTS } from '@/modules/products/product-service';
import { fetchSuppliers, DEFAULT_TRUSTED_SUPPLIERS } from '@/modules/suppliers/supplier-service';
import { ProductOrderModal } from '@/components/store/ProductOrderModal';
import type { Product, TrustedSupplier, Post } from '@/types';

export function ProductsCatalogClient() {
  const [products, setProducts] = useState<Product[]>(DEFAULT_HARDWARE_PRODUCTS);
  const [suppliers, setSuppliers] = useState<TrustedSupplier[]>(DEFAULT_TRUSTED_SUPPLIERS);
  const [publishedPosts, setPublishedPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Hardware');
  const [orderModalProduct, setOrderModalProduct] = useState<Product | null>(null);

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
    if (selectedCategory === 'All Hardware') return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

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
    <section id="products-catalog" className="py-16 sm:py-20 border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Category tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCategory(c)}
              className={`text-xs font-semibold px-4 py-2 rounded-full border whitespace-nowrap transition-colors ${
                selectedCategory === c
                  ? 'bg-[#172D4D] text-white border-[#172D4D] shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((item) => {
            const whatsappText = encodeURIComponent(
              `Hello EI House India, I want to order:\n\n*Product:* ${item.name}\n*Price:* ${item.price}\n\nPlease share delivery and payment details.`
            );
            const whatsappLink = `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${whatsappText}`;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
              >
                <div className="space-y-4">
                  {/* Category & Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#F59E0B] uppercase tracking-wider">
                      {item.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span className="text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                          {item.badge}
                        </span>
                      )}
                      {item.inStock ? (
                        <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          In Stock
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Out of Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Product Image */}
                  {item.imageUrl ? (
                    <div className="relative h-44 w-full rounded-xl bg-slate-50 overflow-hidden border border-slate-100 flex items-center justify-center p-2">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-contain p-2"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="h-28 w-full rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-slate-400 border border-slate-100">
                      <ShoppingBag className="h-8 w-8 text-slate-300" />
                    </div>
                  )}

                  {/* Title & Price */}
                  <div className="space-y-1">
                    <h3 className="font-display text-lg font-bold text-[#0B1528] leading-snug">
                      {item.name}
                    </h3>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-xl font-extrabold text-[#0B1528]">{item.price}</span>
                      {item.mrp && (
                        <span className="text-xs text-slate-400 line-through">{item.mrp}</span>
                      )}
                      <span className="text-[11px] font-semibold text-emerald-600">Inclusive of Taxes</span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-500 pt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Key Specifications */}
                  {item.features && item.features.length > 0 && (
                    <div className="space-y-1.5 pt-3 border-t border-slate-100">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Key Specifications:
                      </p>
                      <ul className="space-y-1 text-xs text-slate-600">
                        {item.features.map((f, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#172D4D] mt-1.5 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Related Blog / Tutorial Guide Link (Only displayed if available) */}
                  {(() => {
                    const relatedBlog = resolveRelatedBlog(item);
                    if (!relatedBlog) return null;

                    return (
                      <div className="pt-3 border-t border-slate-100">
                        <Link
                          href={`/blog/${relatedBlog.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/blog flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-50/70 hover:bg-amber-100/90 border border-amber-200/80 transition-all text-xs text-amber-950 shadow-2xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="p-1 rounded-md bg-[#F59E0B]/20 text-[#B45309] shrink-0">
                              <BookOpen className="h-3.5 w-3.5" />
                            </span>
                            <div className="truncate text-left">
                              <span className="text-[10px] uppercase font-bold text-[#B45309] tracking-wider block leading-none">
                                Read Blog of this Product
                              </span>
                              <span className="truncate block font-semibold text-slate-800 group-hover/blog:text-[#0B1528] mt-0.5">
                                Read Blog: {relatedBlog.title}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-[#B45309] shrink-0 group-hover/blog:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-4 border-t border-slate-200">
                  {/* Direct Buy / Order from EI House */}
                  {item.inStock ? (
                    <div className="space-y-2">
                      {/* Order from EI House Modal Form */}
                      <Button
                        size="sm"
                        onClick={() => setOrderModalProduct(item)}
                        className="w-full bg-[#172D4D] hover:bg-[#0B1528] text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-1.5 py-2.5"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        <span>Order from EI House</span>
                      </Button>

                      {/* WhatsApp Buy */}
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold text-xs flex items-center justify-center gap-1.5"
                      >
                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Quick Order via WhatsApp</span>
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-2.5 text-center">
                        <p className="text-xs font-semibold text-rose-800">
                          Temporarily Out of Stock in EI House Lab
                        </p>
                        <p className="text-[11px] text-rose-600">
                          Pre-orders open for next batch dispatch.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setOrderModalProduct(item)}
                        className="w-full text-xs border-slate-300 font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                        <span>Pre-Order from EI House</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dedicated Full-Width Trusted Suppliers Directory */}
        <div id="trusted-suppliers" className="pt-16 mt-16 border-t-2 border-slate-200/80 space-y-8">
          <div className="bg-gradient-to-r from-[#0B1528] via-[#172D4D] to-[#0B1528] text-white rounded-3xl p-8 sm:p-12 shadow-lg relative overflow-hidden">
            <div className="max-w-3xl space-y-3 relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                <ShieldCheck className="h-4 w-4" />
                Verified Component Ecosystem &amp; Suppliers Network
              </span>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                Looking for Components Not Available in Our Store?
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Is website par jo product ya specialized component currently available nahi hai, use aap hamare verified &amp; trusted supplier partners se directly khareed sakte hain. All suppliers below are genuine, verified, and trusted by makers and engineers across India and globally.
              </p>
            </div>
            {/* Background subtle glow */}
            <div className="absolute -right-12 -bottom-12 w-80 h-80 bg-[#F59E0B]/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Suppliers Grid (Prominent & Big Screen Layout) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {suppliers.map((sup) => (
              <div
                key={sup.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md hover:border-slate-300 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    {/* Logo container */}
                    <div className="h-12 w-28 relative rounded-lg bg-slate-50 p-2 border border-slate-100 flex items-center justify-center shrink-0">
                      {sup.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sup.logoUrl}
                          alt={sup.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-700">
                          {sup.name}
                        </span>
                      )}
                    </div>

                    {sup.badge && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-right">
                        {sup.badge}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-display text-base font-bold text-[#0B1528] group-hover:text-primary transition-colors">
                      {sup.name}
                    </h4>
                    {sup.category && (
                      <p className="text-xs font-medium text-slate-500 mt-0.5">
                        {sup.category}
                      </p>
                    )}
                  </div>

                  {sup.description && (
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {sup.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <Button
                    asChild
                    size="sm"
                    className="w-full bg-[#172D4D] hover:bg-[#0B1528] text-white font-semibold text-xs shadow-xs"
                  >
                    <a href={sup.url} target="_blank" rel="noopener noreferrer">
                      <span>Visit {sup.name}</span>
                      <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order Inquiry Dialog */}
      <ProductOrderModal
        product={orderModalProduct}
        open={Boolean(orderModalProduct)}
        onOpenChange={(open) => !open && setOrderModalProduct(null)}
      />
    </section>
  );
}
