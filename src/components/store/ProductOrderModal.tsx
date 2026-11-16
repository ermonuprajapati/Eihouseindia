'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { ShoppingBag, Send, CheckCircle2, MessageCircle, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SITE_CONFIG } from '@/config/site';
import { submitContactInquiry } from '@/modules/posts/post-service';
import type { Product } from '@/types';

interface ProductOrderModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductOrderModal({ product, open, onOpenChange }: ProductOrderModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!product) return null;

  const whatsappMessage = encodeURIComponent(
    `Hello EI House India, I want to order:\n\n*Product:* ${product.name}\n*Price:* ${product.price}\n*Quantity:* ${quantity}\n\nPlease share delivery timeline and payment details.`
  );
  const whatsappUrl = `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${whatsappMessage}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Please enter your name and email address.');
      return;
    }

    setSubmitting(true);
    try {
      const subject = `Order Inquiry: ${product.name} (Qty: ${quantity})`;
      const message = `Product: ${product.name}
Price: ${product.price}
Quantity: ${quantity}
Customer Phone: ${phone || 'Not provided'}
Shipping City/Address: ${address || 'Not provided'}`;

      await submitContactInquiry({
        name: name.trim(),
        email: email.trim(),
        subject,
        message,
      });

      // Non-blocking email dispatch
      fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'ADMIN_CONTACT_INQUIRY',
          recipientName: 'Monu Prajapati',
          senderName: name.trim(),
          senderEmail: email.trim(),
          subject,
          message,
        }),
      }).catch(() => undefined);

      setSubmitted(true);
      toast.success('Order inquiry received! We will contact you shortly.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit order inquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSubmitted(false);
      setName('');
      setEmail('');
      setPhone('');
      setQuantity('1');
      setAddress('');
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#172D4D]/10 text-[#172D4D]">
              <ShoppingBag className="h-4 w-4" />
            </span>
            <DialogTitle className="text-xl font-bold text-[#0B1528]">Order from EI House</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Order directly from EI House India lab with verified quality inspection & fast dispatch.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="space-y-4 py-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-[#0B1528]">Order Inquiry Submitted!</h4>
              <p className="text-sm text-slate-600">
                Thank you, <strong>{name}</strong>. Our dispatch desk will contact you via email or phone within 4-8 hours with delivery tracking and payment options.
              </p>
            </div>
            <div className="pt-2">
              <Button onClick={resetAndClose} variant="primary">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Product summary card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {(product.images?.[0] || product.imageUrl) ? (
                  <div className="h-12 w-12 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.images?.[0] || product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-contain"
                    />
                    {product.images && product.images.length > 1 && (
                      <span className="absolute bottom-0 right-0 text-[8px] font-mono bg-[#172D4D] text-white px-1 rounded-tl">
                        {product.images.length}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                )}
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#F59E0B]">
                    {product.category}
                  </span>
                  <p className="font-semibold text-sm text-[#0B1528] line-clamp-1">{product.name}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-base font-extrabold text-[#0B1528]">{product.price}</p>
                <span className="text-[10px] text-emerald-600 font-semibold">Taxes Included</span>
              </div>
            </div>

            {/* Instant WhatsApp Order Option */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <MessageCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-emerald-950">Fastest: Order via WhatsApp</p>
                  <p className="text-emerald-700 text-[11px]">Direct chat with {SITE_CONFIG.whatsappDisplay}</p>
                </div>
              </div>
              <Button
                asChild
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 font-semibold"
              >
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <span>Chat &amp; Order</span>
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-semibold">Or Submit Inquiry Form</span>
              </div>
            </div>

            {/* Online Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="order-name" className="text-xs font-medium">Your Name *</Label>
                  <Input
                    id="order-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="order-email" className="text-xs font-medium">Email Address *</Label>
                  <Input
                    id="order-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul@example.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="order-phone" className="text-xs font-medium">Phone / WhatsApp</Label>
                  <Input
                    id="order-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="order-qty" className="text-xs font-medium">Quantity</Label>
                  <Input
                    id="order-qty"
                    type="number"
                    min={1}
                    max={500}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="order-address" className="text-xs font-medium">Shipping City &amp; Pincode</Label>
                <Textarea
                  id="order-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Pune, Maharashtra - 411001"
                  rows={2}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={resetAndClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                  <Send className="h-3.5 w-3.5 mr-1" />
                  <span>{submitting ? 'Submitting...' : 'Send Order Request'}</span>
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
