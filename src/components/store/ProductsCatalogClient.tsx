'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import {
  ShoppingBag,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/config/site';
import { fetchProducts, DEFAULT_HARDWARE_PRODUCTS } from '@/modules/products/product-service';
import { ProductOrderModal } from '@/components/store/ProductOrderModal';
import type { Product } from '@/types';

export function ProductsCatalogClient() {
  const [products, setProducts] = useState<Product[]>(DEFAULT_HARDWARE_PRODUCTS);
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
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-200">
                  {/* Direct Buy from EI House Buttons */}
                  {item.inStock ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {/* WhatsApp Buy */}
                        <Button
                          asChild
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm w-full text-xs"
                        >
                          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="h-3.5 w-3.5 mr-1 text-white" />
                            <span>WhatsApp</span>
                          </a>
                        </Button>

                        {/* Order Inquiry Form */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOrderModalProduct(item)}
                          className="border-[#172D4D] text-[#172D4D] hover:bg-[#172D4D]/5 font-semibold w-full text-xs"
                        >
                          <ShoppingBag className="h-3.5 w-3.5 mr-1" />
                          <span>Order Form</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-2.5 text-center">
                      <p className="text-xs font-semibold text-rose-800">
                        Temporarily out of stock in EI House lab.
                      </p>
                      <p className="text-[11px] text-rose-600">
                        You can purchase directly from verified suppliers below:
                      </p>
                    </div>
                  )}

                  {/* Trusted Suppliers Section */}
                  {item.suppliers && item.suppliers.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Verified Suppliers:</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Official Links</span>
                      </div>

                      <div className="space-y-1.5">
                        {item.suppliers.map((sup) => (
                          <div
                            key={sup.id}
                            className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-slate-200/80 hover:border-slate-300 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {sup.logoUrl ? (
                                <div className="h-5 w-5 relative shrink-0 rounded bg-white p-0.5 border border-slate-100 flex items-center justify-center">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={sup.logoUrl}
                                    alt={sup.name}
                                    className="max-h-full max-w-full object-contain"
                                  />
                                </div>
                              ) : (
                                <span className="h-5 w-5 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                                  {sup.name.slice(0, 1)}
                                </span>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 truncate">
                                  {sup.name}
                                </p>
                                {sup.badge && (
                                  <p className="text-[9px] text-emerald-600 font-medium truncate">
                                    {sup.badge}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {sup.price && (
                                <span className="text-xs font-mono font-bold text-slate-700">
                                  {sup.price}
                                </span>
                              )}
                              <Button
                                asChild
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-[11px] font-semibold text-[#1D4ED8] hover:text-[#1E40AF] hover:bg-blue-50"
                              >
                                <a
                                  href={sup.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={`Open ${sup.name}`}
                                >
                                  <span>Buy</span>
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
