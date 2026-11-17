'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Upload,
  Trash2,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/modules/auth/auth-context';
import {
  uploadEditorialImage,
  uploadResourceDocument,
  validateImageFile,
} from '@/modules/storage/storage-service';
import {
  saveLibraryItemAdmin,
  LIBRARY_CATEGORIES,
  getLibraryLogoUrl,
  getLibraryHeroImageUrl,
} from '@/modules/library/library-service';
import { ENGINEERING_DOMAINS } from '@/modules/tools/tool-service';
import { slugify } from '@/lib/validation';
import type { EngineeringDomain, LibraryCategory, LibraryItem } from '@/types';

interface LibraryAdminModalProps {
  item: Partial<LibraryItem> | null;
  isNew?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  defaultOrder?: number;
}

export function LibraryAdminModal({
  item,
  isNew = false,
  open,
  onOpenChange,
  onSaved,
  defaultOrder = 1,
}: LibraryAdminModalProps) {
  const { profile, effectiveRole, isEditor } = useAuth();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [domain, setDomain] = useState<EngineeringDomain>('Electronics & Embedded');
  const [category, setCategory] = useState<LibraryCategory>('Datasheet & Pinout');
  const [badge, setBadge] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');

  // Separate Media Fields (Cover Image vs Icon/Logo vs Downloadable Document)
  const [imageUrl, setImageUrl] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageSource, setImageSource] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');

  const [fileFormat, setFileFormat] = useState('PDF Reference');
  const [fileSize, setFileSize] = useState('');
  const [version, setVersion] = useState('');
  const [authorOrSource, setAuthorOrSource] = useState('');
  const [tags, setTags] = useState('');
  const [featured, setFeatured] = useState(false);
  const [order, setOrder] = useState(defaultOrder);

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item && open) {
      setTitle(item.title || '');
      setSlug(item.slug || '');
      setDomain(item.domain || 'Electronics & Embedded');
      setCategory(item.category || 'Datasheet & Pinout');
      setBadge(item.badge || '');
      setSummary(item.summary || '');
      setDescription(item.description || '');
      setImageUrl(
        item.imageUrl && !item.imageUrl.includes('images.unsplash.com') ? item.imageUrl : ''
      );
      setIconUrl(item.iconUrl || '');
      setImageAlt(item.imageAlt || `${item.title || 'Resource'} technical diagram`);
      setImageSource(item.imageSource || item.authorOrSource || '');
      setFileUrl(item.fileUrl || '');
      setExternalUrl(item.externalUrl || '');
      setFileFormat(item.fileFormat || 'PDF Reference');
      setFileSize(item.fileSize || '');
      setVersion(item.version || '');
      setAuthorOrSource(item.authorOrSource || '');
      setTags(Array.isArray(item.tags) ? item.tags.join(', ') : '');
      setFeatured(Boolean(item.featured));
      setOrder(item.order ?? defaultOrder);
      setMediaError(null);
    }
  }, [item, open, defaultOrder]);

  if (!open || !item || !isEditor) return null;

  const previewIconUrl = getLibraryLogoUrl({
    id: item.id,
    title,
    slug: slug || slugify(title),
    iconUrl,
  });

  const previewCoverUrl = getLibraryHeroImageUrl({
    id: item.id,
    title,
    slug: slug || slugify(title),
    category,
    imageUrl,
  });

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setMediaError(null);
    const check = validateImageFile(file);
    if (!check.valid) {
      setMediaError(check.error || 'Invalid cover image file.');
      toast.error(check.error || 'Invalid cover image file.');
      e.target.value = '';
      return;
    }
    setUploadingCover(true);
    try {
      const uploaded = await uploadEditorialImage(file, profile.uid);
      setImageUrl(uploaded.url);
      toast.success('Resource cover image uploaded.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Cover image upload failed.';
      setMediaError(msg);
      toast.error(msg);
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setMediaError(null);
    const check = validateImageFile(file);
    if (!check.valid) {
      setMediaError(check.error || 'Invalid icon file.');
      toast.error(check.error || 'Invalid icon file.');
      e.target.value = '';
      return;
    }
    setUploadingIcon(true);
    try {
      const uploaded = await uploadEditorialImage(file, profile.uid);
      setIconUrl(uploaded.url);
      toast.success('Resource icon/logo uploaded.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Icon upload failed.';
      setMediaError(msg);
      toast.error(msg);
    } finally {
      setUploadingIcon(false);
      e.target.value = '';
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setMediaError(null);
    setUploadingDoc(true);
    try {
      const uploaded = await uploadResourceDocument(file, profile.uid);
      setFileUrl(uploaded.url);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setFileSize(`${sizeMb} MB`);
      toast.success('Technical PDF document uploaded.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Document upload failed.';
      setMediaError(msg);
      toast.error(msg);
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!title.trim()) {
      toast.error('Resource title is required.');
      return;
    }
    setSaving(true);
    try {
      await saveLibraryItemAdmin(
        {
          id: item.id,
          title: title.trim(),
          slug: slug.trim() || slugify(title),
          domain,
          category,
          badge: badge.trim(),
          summary: summary.trim(),
          description: description.trim(),
          imageUrl: imageUrl.trim(),
          iconUrl: iconUrl.trim(),
          imageAlt: imageAlt.trim() || `${title.trim()} technical diagram`,
          imageSource: imageSource.trim(),
          fileUrl: fileUrl.trim(),
          externalUrl: externalUrl.trim(),
          fileFormat: fileFormat.trim() || 'PDF Reference',
          fileSize: fileSize.trim(),
          version: version.trim(),
          authorOrSource: authorOrSource.trim(),
          featured,
          order: Number(order) || 1,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        },
        isNew,
        profile,
        effectiveRole
      );
      toast.success(isNew ? 'New library resource added!' : `Updated "${title.trim()}".`);
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save library resource.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        <form onSubmit={handleSubmit}>
          {/* Sticky Top Action Bar */}
          <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 backdrop-blur-sm px-6 py-4">
            <DialogHeader className="space-y-0.5 text-left">
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-[#0B1528]">
                <BookOpen className="h-5 w-5 text-[#172D4D]" />
                <span>
                  {isNew ? 'Add Engineering Resource' : `Edit Resource: ${title || item.title}`}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Manage resource cover diagram, optional icon/logo, downloadable PDF/files, and technical metadata independently.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={saving || uploadingCover || uploadingIcon || uploadingDoc}
              >
                {saving ? 'Saving...' : isNew ? 'Create Resource' : 'Save Changes'}
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {mediaError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{mediaError}</span>
              </div>
            )}

            {/* ===================================================== */}
            {/* SEPARATE LOGO/ICON & COVER IMAGE MANAGEMENT */}
            {/* ===================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              {/* 1. Resource Icon / Logo (Optional) */}
              <div className="md:col-span-5 space-y-3 border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 md:pr-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#0B1528]">
                    Resource Icon / Logo (Optional)
                  </Label>
                  {iconUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setIconUrl('');
                        toast.info('Custom icon removed.');
                      }}
                      className="text-[11px] font-semibold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="h-14 w-14 rounded-xl border border-slate-200 bg-white p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewIconUrl}
                      alt={title || 'Resource icon'}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {iconUrl ? 'Custom Uploaded Icon' : 'Verified Standard Icon'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Separate from cover image &amp; PDF file.
                    </p>
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[#172D4D] hover:bg-[#0B1528] px-2.5 py-1 rounded-md cursor-pointer transition-colors">
                      <Upload className="h-3 w-3" />
                      <span>{uploadingIcon ? 'Uploading...' : iconUrl ? 'Replace Icon' : 'Upload Icon'}</span>
                      <input
                        type="file"
                        accept="image/svg+xml,image/png,image/jpeg,image/webp,image/avif"
                        onChange={handleIconUpload}
                        disabled={uploadingIcon}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="libIconUrl" className="text-[11px] text-slate-600">
                    Icon / Logo URL (Optional)
                  </Label>
                  <Input
                    id="libIconUrl"
                    value={iconUrl}
                    onChange={(e) => setIconUrl(e.target.value)}
                    placeholder="https://.../icon.svg or .png"
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>

              {/* 2. Resource Thumbnail / Cover Image (16:9) */}
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#0B1528] flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-[#0090FF]" />
                    <span>Resource Thumbnail / Cover Image (16:9)</span>
                  </Label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl('');
                        toast.info('Custom cover image removed.');
                      }}
                      className="text-[11px] font-semibold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" /> Remove Cover
                    </button>
                  )}
                </div>

                <div className="relative aspect-[16/9] w-full rounded-xl border border-slate-200 bg-[#0B1528] overflow-hidden shadow-2xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewCoverUrl}
                    alt={imageAlt || `${title || 'Resource'} cover diagram`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[#0B1528]/90 hover:bg-[#0B1528] border border-white/20 px-3 py-1.5 rounded-lg cursor-pointer shadow-md backdrop-blur-xs">
                      <Upload className="h-3.5 w-3.5 text-[#F59E0B]" />
                      <span>
                        {uploadingCover
                          ? 'Uploading Cover...'
                          : imageUrl
                          ? 'Replace Cover Image'
                          : 'Upload Cover Image'}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
                        onChange={handleCoverUpload}
                        disabled={uploadingCover}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  {imageUrl && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-emerald-600/95 px-2 py-0.5 text-[10px] font-semibold text-white">
                      <CheckCircle2 className="h-3 w-3" /> Custom Cover Active
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="libCoverUrl" className="text-[11px] text-slate-600">
                    Cover Image URL (Optional)
                  </Label>
                  <Input
                    id="libCoverUrl"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://.../schematic-or-pinout-cover.png"
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label htmlFor="libImageAlt" className="text-[11px] text-slate-600">
                      Image Alt Text
                    </Label>
                    <Input
                      id="libImageAlt"
                      value={imageAlt}
                      onChange={(e) => setImageAlt(e.target.value)}
                      placeholder="e.g. ESP32-S3 complete pinout diagram"
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="libImageSource" className="text-[11px] text-slate-600">
                      Image Source / Attribution
                    </Label>
                    <Input
                      id="libImageSource"
                      value={imageSource}
                      onChange={(e) => setImageSource(e.target.value)}
                      placeholder="e.g. Espressif Systems / EI House Lab"
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ===================================================== */}
            {/* SEPARATE RESOURCE DOCUMENT / DOWNLOAD FILE SECTION */}
            {/* ===================================================== */}
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-sky-950 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-sky-600" />
                    <span>Resource Document / Downloadable File (Independent of Cover Image)</span>
                  </Label>
                  <p className="text-[11px] text-slate-600">
                    Upload a PDF document or specify a direct download URL / official specification link.
                  </p>
                </div>

                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 px-3 py-1.5 rounded-lg cursor-pointer transition-colors shrink-0">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploadingDoc ? 'Uploading PDF...' : fileUrl ? 'Replace PDF File' : 'Upload PDF File'}</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleDocumentUpload}
                    disabled={uploadingDoc}
                    className="sr-only"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="libFileUrl" className="text-xs">
                    Direct File Download URL (PDF / CAD / ZIP)
                  </Label>
                  <Input
                    id="libFileUrl"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://.../resource.pdf"
                    className="bg-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="libExtUrl" className="text-xs">
                    External Official Specs / Docs URL
                  </Label>
                  <Input
                    id="libExtUrl"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://www.espressif.com/..."
                    className="bg-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* ===================================================== */}
            {/* CORE RESOURCE METADATA */}
            {/* ===================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="libTitle">Resource Title *</Label>
                <Input
                  id="libTitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. ESP32-S3 Complete Pinout Matrix"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="libSlug">URL Slug</Label>
                <Input
                  id="libSlug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. esp32-s3-pinout"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="libDomain">Engineering Domain *</Label>
                <select
                  id="libDomain"
                  className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value as EngineeringDomain)}
                >
                  {ENGINEERING_DOMAINS.map((dom) => (
                    <option key={dom} value={dom}>
                      {dom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="libCategory">Resource Category *</Label>
                <select
                  id="libCategory"
                  className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as LibraryCategory)}
                >
                  {LIBRARY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="libBadge">Highlight Badge</Label>
                <Input
                  id="libBadge"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g. Popular Reference"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="libSummary">Summary Description *</Label>
              <Textarea
                id="libSummary"
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Summary shown on resource card..."
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="libDescription">Extended Technical Notes (Optional)</Label>
              <Textarea
                id="libDescription"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of schematic/pinout usage..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="libFormat">File Format</Label>
                <Input
                  id="libFormat"
                  value={fileFormat}
                  onChange={(e) => setFileFormat(e.target.value)}
                  placeholder="e.g. PDF, KiCad, STEP"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="libSize">File Size</Label>
                <Input
                  id="libSize"
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  placeholder="e.g. 2.4 MB"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="libVersion">Version / Standard</Label>
                <Input
                  id="libVersion"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g. v2.1, ISO 261"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="libAuthor">Author / Source Organization</Label>
                <Input
                  id="libAuthor"
                  value={authorOrSource}
                  onChange={(e) => setAuthorOrSource(e.target.value)}
                  placeholder="e.g. EI House Hardware Lab, STMicroelectronics"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="libOrder">Display Order</Label>
                <Input
                  id="libOrder"
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  min={1}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="libTags">Tags (Comma-separated)</Label>
              <Input
                id="libTags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. ESP32, Pinout, GPIO, IoT"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
              <Switch id="libFeatured" checked={featured} onCheckedChange={setFeatured} />
              <Label htmlFor="libFeatured" className="text-xs font-semibold text-slate-800 cursor-pointer">
                Mark as Featured Engineering Resource
              </Label>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-6 py-3.5 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving || uploadingCover || uploadingIcon || uploadingDoc}
            >
              {saving ? 'Saving Resource...' : isNew ? 'Create Resource' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
