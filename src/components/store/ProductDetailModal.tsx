'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShoppingBag,
  MessageCircle,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Truck,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Cpu,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/config/site';
import { normalizeImageUrl } from '@/lib/image-utils';
import type { Product } from '@/types';

interface ProductDetailModalProps {
  product: Product | null;
  relatedBlog: { slug: string; title: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderClick: (product: Product) => void;
}

export function ProductDetailModal({
  product,
  relatedBlog,
  open,
  onOpenChange,
  onOrderClick,
}: ProductDetailModalProps) {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    setActiveImageIdx(0);
    setFailedUrls(new Set());
  }, [product?.id]);

  const images = useMemo(() => {
    if (!product) return [];
    const rawList = Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : (product.imageUrl ? [product.imageUrl] : []);

    return rawList
      .map((url) => normalizeImageUrl(url))
      .filter((url) => Boolean(url) && !failedUrls.has(url));
  }, [product, failedUrls]);

  if (!product) return null;

  const currentSrc = images[activeImageIdx] || images[0] || '';

  const priceNum = parseInt(product.price.replace(/[^0-9]/g, ''), 10);
  const mrpNum = product.mrp ? parseInt(product.mrp.replace(/[^0-9]/g, ''), 10) : 0;
  const discountPercent =
    mrpNum > priceNum && priceNum > 0 ? Math.round(((mrpNum - priceNum) / mrpNum) * 100) : 0;
  const savingsAmount = mrpNum > priceNum && priceNum > 0 ? mrpNum - priceNum : 0;

  const whatsappText = encodeURIComponent(
    `Hello EI House India, I want to inquire/order:\n\n*Product:* ${product.name}\n*Price:* ${product.price}\n\nPlease share delivery timeline and payment details.`
  );
  const whatsappLink = `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${whatsappText}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl border-slate-200">
        <DialogHeader className="sr-only">
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            Full technical specifications, description, and ordering options for {product.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left Column: Commercial Multi-Angle Gallery */}
          <div className="md:col-span-5 bg-slate-50/80 p-5 sm:p-6 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              {/* Top Badges */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {product.badge ? (
                  <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full">
                    {product.badge}
                  </span>
                ) : (
                  <span />
                )}
                {discountPercent > 0 && (
                  <span className="text-[11px] font-extrabold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>

              {/* Main Product Image Showcase */}
              <div className="relative h-64 sm:h-72 w-full rounded-2xl bg-white border border-slate-200/90 flex items-center justify-center p-4 overflow-hidden shadow-2xs">
                {currentSrc ? (
                  <Image
                    src={currentSrc}
                    alt={`${product.name} - photo ${activeImageIdx + 1}`}
                    fill
                    unoptimized
                    onError={() => {
                      setFailedUrls((prev) => new Set(prev).add(currentSrc));
                    }}
                    className="object-contain p-4 transition-all duration-200"
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                ) : (
                  <ShoppingBag className="h-12 w-12 text-slate-300" />
                )}

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1))
                      }
                      aria-label="Previous image"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/95 shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition cursor-pointer z-10"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0))
                      }
                      aria-label="Next image"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/95 shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition cursor-pointer z-10"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <span className="absolute bottom-2 right-2 text-[10px] font-mono font-semibold bg-slate-900/75 text-white px-2 py-0.5 rounded-md">
                      {activeImageIdx + 1} / {images.length}
                    </span>
                  </>
                )}
              </div>

              {/* Thumbnail Strip */}
              {images.length > 1 && (
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      className={`relative h-14 rounded-lg bg-white border overflow-hidden p-1 transition cursor-pointer ${
                        idx === activeImageIdx
                          ? 'border-[#172D4D] ring-2 ring-[#172D4D]/25'
                          : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgUrl}
                        alt={`Thumbnail ${idx + 1}`}
                        className="h-full w-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lab Quality Assurance Micro-Badges */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/80 text-center">
              <div className="rounded-lg bg-white p-2 border border-slate-200/70 space-y-1">
                <ShieldCheck className="h-4 w-4 text-emerald-600 mx-auto" />
                <p className="text-[10px] font-semibold text-slate-700 leading-tight">
                  100% Bench Tested
                </p>
              </div>
              <div className="rounded-lg bg-white p-2 border border-slate-200/70 space-y-1">
                <Truck className="h-4 w-4 text-[#0090FF] mx-auto" />
                <p className="text-[10px] font-semibold text-slate-700 leading-tight">
                  24-48h Lab Dispatch
                </p>
              </div>
              <div className="rounded-lg bg-white p-2 border border-slate-200/70 space-y-1">
                <FileCheck className="h-4 w-4 text-[#F59E0B] mx-auto" />
                <p className="text-[10px] font-semibold text-slate-700 leading-tight">
                  GST Tax Invoice
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Full Product Details, Description, Specifications & Order CTA */}
          <div className="md:col-span-7 p-5 sm:p-7 flex flex-col justify-between space-y-5 bg-white">
            <div className="space-y-4">
              {/* Category & Stock Status */}
              <div className="flex items-center justify-between gap-2 flex-wrap pr-6">
                <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                  {product.category}
                </span>
                {product.inStock ? (
                  <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    In Stock — Ready to Ship
                  </span>
                ) : (
                  <span className="text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Out of Stock (Pre-Order Open)
                  </span>
                )}
              </div>

              {/* Product Name */}
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#0B1528] leading-snug">
                {product.name}
              </h2>

              {/* Commercial Price Block */}
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex flex-wrap items-baseline justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#0B1528]">
                      {product.price}
                    </span>
                    {product.mrp && (
                      <span className="text-sm text-slate-400 line-through font-medium">
                        MRP: {product.mrp}
                      </span>
                    )}
                    {savingsAmount > 0 && (
                      <span className="text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-md">
                        Save ₹{savingsAmount.toLocaleString('en-IN')} ({discountPercent}% OFF)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-emerald-700">
                    Inclusive of all taxes • ESD-safe packaging included
                  </p>
                </div>
              </div>

              {/* Full Description */}
              {product.description && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Product Overview &amp; Description
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Full Key Technical Specifications */}
              {product.features && product.features.length > 0 && (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-[#FAFBFD] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#172D4D] flex items-center gap-1.5">
                    <Cpu className="h-4 w-4 text-[#0090FF]" />
                    <span>Technical Specifications &amp; Highlights</span>
                  </h3>
                  <ul className="grid grid-cols-1 gap-2 pt-1 text-xs sm:text-sm text-slate-700">
                    {product.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Related Blog Tutorial / Guide Link */}
              {relatedBlog && (
                <Link
                  href={`/blog/${relatedBlog.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/blog flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-50/90 hover:bg-amber-100 border border-amber-200 transition-all text-xs text-amber-950 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="p-2 rounded-lg bg-[#F59E0B]/20 text-[#B45309] shrink-0">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 text-left">
                      <span className="text-[10px] uppercase font-bold text-[#B45309] tracking-wider block leading-none">
                        Engineering Tutorial &amp; Pinout Guide
                      </span>
                      <span className="truncate block font-bold text-slate-900 group-hover/blog:text-[#0B1528] mt-1 text-xs sm:text-sm">
                        Read Blog: {relatedBlog.title}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#B45309] shrink-0 group-hover/blog:translate-x-0.5 transition-transform" />
                </Link>
              )}

              {/* Compare / External Suppliers (if available) */}
              {product.suppliers && product.suppliers.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Also Available on Partner Platforms:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.suppliers.map((sup) => (
                      <a
                        key={sup.id}
                        href={sup.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 transition"
                      >
                        <span>{sup.name}</span>
                        {sup.price && <span className="font-bold text-slate-900">({sup.price})</span>}
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Commercial Order & Inquiry Action Bar */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <Button
                size="lg"
                onClick={() => {
                  onOpenChange(false);
                  onOrderClick(product);
                }}
                className="flex-1 bg-[#172D4D] hover:bg-[#0B1528] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>
                  {product.inStock ? 'Order / Send Inquiry' : 'Pre-Order / Send Inquiry'}
                </span>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="flex-1 border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold text-xs sm:text-sm flex items-center justify-center gap-2"
              >
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  <span>Quick Order on WhatsApp</span>
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
