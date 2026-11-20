'use client';

import React, { useState, useEffect } from 'react';
import { Wrench, Upload, Trash2, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
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
import { uploadEditorialImage, validateImageFile } from '@/modules/storage/storage-service';
import {
  saveToolAdmin,
  deleteToolAdmin,
  ENGINEERING_DOMAINS,
  TOOL_CATEGORIES,
  TOOL_LICENSES,
  getToolLogoUrl,
  getToolHeroImageUrl,
} from '@/modules/tools/tool-service';
import { slugify } from '@/lib/validation';
import type {
  EngineeringDomain,
  EngineeringTool,
  ToolCategory,
  ToolLicenseType,
} from '@/types';

interface ToolAdminModalProps {
  tool: Partial<EngineeringTool> | null;
  isNew?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  defaultOrder?: number;
}

export function ToolAdminModal({
  tool,
  isNew = false,
  open,
  onOpenChange,
  onSaved,
  defaultOrder = 1,
}: ToolAdminModalProps) {
  const { profile, effectiveRole, isEditor } = useAuth();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [domain, setDomain] = useState<EngineeringDomain>('Electronics & Embedded');
  const [category, setCategory] = useState<ToolCategory | string>('Electronics');
  const [mainApplication, setMainApplication] = useState('');
  const [officialWebsite, setOfficialWebsite] = useState('');
  const [licenseType, setLicenseType] = useState<ToolLicenseType | string>('Free');
  const [platform, setPlatform] = useState('Desktop (Windows / Mac / Linux)');
  const [badge, setBadge] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [toolType, setToolType] = useState<'built-in' | 'external' | 'interactive' | 'software'>('software');
  const [externalUrl, setExternalUrl] = useState('');
  const [calculatorKey, setCalculatorKey] = useState('');
  const [featured, setFeatured] = useState(false);
  const [order, setOrder] = useState(defaultOrder);
  const [tags, setTags] = useState('');

  // Dual Media Management State
  const [icon, setIcon] = useState('');
  const [officialLogoUrl, setOfficialLogoUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [screenshotSourceUrl, setScreenshotSourceUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (tool && open) {
      setName(tool.name || '');
      setSlug(tool.slug || '');
      setDomain(tool.domain || 'Electronics & Embedded');
      setCategory(tool.category || 'Electronics');
      setMainApplication(tool.mainApplication || '');
      setOfficialWebsite(tool.officialWebsite || tool.externalUrl || '');
      setLicenseType(tool.licenseType || 'Free');
      setPlatform(tool.platform || 'Desktop (Windows / Mac / Linux)');
      setBadge(tool.badge || '');
      setSummary(tool.summary || '');
      setDescription(tool.description || '');
      setToolType(tool.toolType || 'software');
      setExternalUrl(tool.externalUrl || '');
      setCalculatorKey(tool.calculatorKey || '');
      setFeatured(Boolean(tool.featured));
      setOrder(tool.order ?? defaultOrder);
      setTags(Array.isArray(tool.tags) ? tool.tags.join(', ') : '');
      setIcon(tool.icon || '');
      setOfficialLogoUrl(tool.officialLogoUrl || '');
      setImageUrl(tool.imageUrl && !tool.imageUrl.includes('images.unsplash.com') ? tool.imageUrl : '');
      setScreenshotSourceUrl(tool.screenshotSourceUrl || '');
      setImageAlt(tool.imageAlt || `${tool.name || 'Software'} interface screenshot`);
      setMediaError(null);
    }
  }, [tool, open, defaultOrder]);

  if (!open || !tool || !isEditor) return null;

  const previewLogoUrl = getToolLogoUrl({
    name,
    slug: slug || slugify(name),
    icon,
    officialLogoUrl,
    officialWebsite,
    toolType,
    category,
  });

  const previewScreenshotUrl = getToolHeroImageUrl({
    name,
    slug: slug || slugify(name),
    category,
    mainApplication,
    imageUrl,
    screenshotSourceUrl,
    toolType,
    calculatorKey,
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setMediaError(null);
    const check = validateImageFile(file);
    if (!check.valid) {
      setMediaError(check.error || 'Invalid logo file.');
      toast.error(check.error || 'Invalid logo file.');
      e.target.value = '';
      return;
    }
    setUploadingLogo(true);
    try {
      const uploaded = await uploadEditorialImage(file, profile.uid);
      setIcon(uploaded.url);
      toast.success('Official software logo uploaded.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Logo upload failed.';
      setMediaError(msg);
      toast.error(msg);
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setMediaError(null);
    const check = validateImageFile(file);
    if (!check.valid) {
      setMediaError(check.error || 'Invalid screenshot file.');
      toast.error(check.error || 'Invalid screenshot file.');
      e.target.value = '';
      return;
    }
    setUploadingScreenshot(true);
    try {
      const uploaded = await uploadEditorialImage(file, profile.uid);
      setImageUrl(uploaded.url);
      toast.success('Software interface screenshot uploaded.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Screenshot upload failed.';
      setMediaError(msg);
      toast.error(msg);
    } finally {
      setUploadingScreenshot(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!name.trim()) {
      toast.error('Software / Tool name is required.');
      return;
    }
    setSaving(true);
    try {
      await saveToolAdmin(
        {
          id: tool.id,
          name: name.trim(),
          slug: slug.trim() || slugify(name),
          domain,
          category: category as ToolCategory,
          mainApplication: mainApplication.trim(),
          officialWebsite: officialWebsite.trim(),
          licenseType: licenseType as ToolLicenseType,
          platform: platform.trim(),
          badge: badge.trim(),
          summary: summary.trim(),
          description: description.trim(),
          icon: icon.trim(),
          officialLogoUrl: officialLogoUrl.trim(),
          imageUrl: imageUrl.trim(),
          screenshotSourceUrl: screenshotSourceUrl.trim(),
          imageAlt: imageAlt.trim() || `${name.trim()} interface screenshot`,
          toolType: calculatorKey.trim() ? 'interactive' : toolType,
          externalUrl: officialWebsite.trim() || externalUrl.trim(),
          calculatorKey: calculatorKey.trim(),
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
      toast.success(isNew ? 'New engineering tool created!' : `Saved changes to "${name.trim()}".`);
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save tool.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tool?.id || !profile || !isEditor) return;
    if (!confirm(`Are you sure you want to permanently delete "${name || tool.name}" from tools?`)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteToolAdmin(tool.id, profile, effectiveRole);
      toast.success(`Tool "${name || tool.name}" deleted.`);
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete tool.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto touch-scroll p-0 gap-0">
        <form onSubmit={handleSubmit}>
          {/* Sticky Top Action Bar (Reference: Blog Editor Experience) */}
          <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 backdrop-blur-sm px-6 py-4">
            <DialogHeader className="space-y-0.5 text-left">
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-[#0B1528]">
                <Wrench className="h-5 w-5 text-[#172D4D]" />
                <span>{isNew ? 'Add Engineering Software / Tool' : `Edit Tool: ${name || tool.name}`}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Manage official software logo, actual interface screenshot, licensing, and directory metadata.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2">
              {!isNew && tool?.id && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={saving || deleting}
                  className="text-xs font-semibold h-8 gap-1 mr-1"
                  title="Delete this tool"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{deleting ? 'Deleting...' : 'Delete'}</span>
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={saving || deleting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={saving || deleting || uploadingLogo || uploadingScreenshot}
              >
                {saving ? 'Saving...' : isNew ? 'Create Tool' : 'Save Changes'}
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
            {/* DUAL MEDIA MANAGEMENT: A. LOGO & B. INTERFACE IMAGE */}
            {/* ===================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              {/* A. Official Software Logo */}
              <div className="md:col-span-5 space-y-3 border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 md:pr-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#0B1528]">
                    A. Software Logo
                  </Label>
                  {(icon || officialLogoUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        setIcon('');
                        setOfficialLogoUrl('');
                        toast.info('Custom logo cleared; using verified brand default.');
                      }}
                      className="text-[11px] font-semibold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  )}
                </div>

                {/* Live Logo Preview Box */}
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="h-14 w-14 rounded-xl border border-slate-200 bg-white p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewLogoUrl}
                      alt={name || 'Logo preview'}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {icon ? 'Uploaded Custom Logo' : officialLogoUrl ? 'External Logo URL' : 'Verified Official Logo'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Preserves original aspect ratio (SVG, PNG, WebP).
                    </p>
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[#172D4D] hover:bg-[#0B1528] px-2.5 py-1 rounded-md cursor-pointer transition-colors">
                      <Upload className="h-3 w-3" />
                      <span>{uploadingLogo ? 'Uploading...' : icon ? 'Replace Logo' : 'Upload Logo'}</span>
                      <input
                        type="file"
                        accept="image/svg+xml,image/png,image/jpeg,image/webp,image/avif"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="toolOfficialLogoUrl" className="text-[11px] text-slate-600">
                    Official Logo URL (Optional)
                  </Label>
                  <Input
                    id="toolOfficialLogoUrl"
                    value={officialLogoUrl || icon}
                    onChange={(e) => {
                      setOfficialLogoUrl(e.target.value);
                      setIcon(e.target.value);
                    }}
                    placeholder="https://.../logo.svg or .png"
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>

              {/* B. Actual Software Interface / Product Image */}
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#0B1528] flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-[#0090FF]" />
                    <span>B. Actual Software Interface / Product Image (16:9)</span>
                  </Label>
                  {(imageUrl || screenshotSourceUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl('');
                        setScreenshotSourceUrl('');
                        toast.info('Custom screenshot removed.');
                      }}
                      className="text-[11px] font-semibold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" /> Remove Screenshot
                    </button>
                  )}
                </div>

                {/* 16:9 Landscape Interface Preview */}
                <div className="relative aspect-[16/9] w-full rounded-xl border border-slate-200 bg-[#0B1528] overflow-hidden shadow-2xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewScreenshotUrl}
                    alt={imageAlt || `${name || 'Software'} interface`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[#0B1528]/90 hover:bg-[#0B1528] border border-white/20 px-3 py-1.5 rounded-lg cursor-pointer shadow-md backdrop-blur-xs">
                      <Upload className="h-3.5 w-3.5 text-[#F59E0B]" />
                      <span>
                        {uploadingScreenshot
                          ? 'Uploading Screenshot...'
                          : imageUrl
                          ? 'Replace Screenshot'
                          : 'Upload Interface Screenshot'}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
                        onChange={handleScreenshotUpload}
                        disabled={uploadingScreenshot}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  {imageUrl && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-emerald-600/95 px-2 py-0.5 text-[10px] font-semibold text-white">
                      <CheckCircle2 className="h-3 w-3" /> Custom Interface Image Active
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label htmlFor="toolScreenshotUrl" className="text-[11px] text-slate-600">
                      Official Screenshot Source URL (Optional)
                    </Label>
                    <Input
                      id="toolScreenshotUrl"
                      value={imageUrl || screenshotSourceUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        setScreenshotSourceUrl(e.target.value);
                      }}
                      placeholder="https://.../interface-screenshot.png"
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="toolImageAlt" className="text-[11px] text-slate-600">
                      Image Alt Text
                    </Label>
                    <Input
                      id="toolImageAlt"
                      value={imageAlt}
                      onChange={(e) => setImageAlt(e.target.value)}
                      placeholder="e.g. KiCad PCB layout and schematic editor interface"
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ===================================================== */}
            {/* CORE TOOL METADATA FIELDS */}
            {/* ===================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="toolName">Software / Tool Name *</Label>
                <Input
                  id="toolName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. KiCad, Autodesk Fusion, EI House Lab"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="toolSlug">URL Slug</Label>
                <Input
                  id="toolSlug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. kicad, autodesk-fusion"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="toolCategory">Category *</Label>
                <select
                  id="toolCategory"
                  className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ToolCategory)}
                >
                  {TOOL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="toolDomain">Engineering Domain *</Label>
                <select
                  id="toolDomain"
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
            </div>

            <div className="space-y-1">
              <Label htmlFor="toolMainApp">Main Application *</Label>
              <Input
                id="toolMainApp"
                value={mainApplication}
                onChange={(e) => setMainApplication(e.target.value)}
                placeholder="e.g. Professional schematic capture & PCB layout design"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="toolWebsite">Official Website URL</Label>
                <Input
                  id="toolWebsite"
                  value={officialWebsite}
                  onChange={(e) => setOfficialWebsite(e.target.value)}
                  placeholder="https://www.kicad.org/"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="toolLicense">License / Pricing Model *</Label>
                <select
                  id="toolLicense"
                  className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                  value={licenseType}
                  onChange={(e) => setLicenseType(e.target.value as ToolLicenseType)}
                >
                  {TOOL_LICENSES.map((lic) => (
                    <option key={lic} value={lic}>
                      {lic}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="toolPlatform">Platform / Installation</Label>
                <Input
                  id="toolPlatform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="e.g. Desktop (Windows / Mac / Linux) or Web Browser"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="toolBadge">Trust / Highlight Badge</Label>
                <Input
                  id="toolBadge"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g. Open Source, Industry Standard"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="toolSummary">Short Summary *</Label>
              <Textarea
                id="toolSummary"
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="One or two sentences describing what the software is best for..."
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="toolDescription">Extended Details / Usage Notes</Label>
              <Textarea
                id="toolDescription"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Full technical details, system requirements, licensing specifics..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="toolCalcKey">Interactive Calculator Key (Optional)</Label>
                <select
                  id="toolCalcKey"
                  className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs font-mono"
                  value={calculatorKey}
                  onChange={(e) => setCalculatorKey(e.target.value)}
                >
                  <option value="">None / External Software</option>
                  <option value="ohms-law">ohms-law (V, I, R, P)</option>
                  <option value="resistor-color-code">resistor-color-code (4/5 Band)</option>
                  <option value="voltage-divider">voltage-divider (Vin, R1, R2)</option>
                  <option value="led-resistor">led-resistor (Vs, Vf, If)</option>
                  <option value="555-timer">555-timer (R1, R2, C)</option>
                  <option value="pcb-trace">pcb-trace (IPC-2221 Track Width)</option>
                  <option value="motor-torque">motor-torque (RPM, Torque, Watts)</option>
                  <option value="gear-ratio">gear-ratio (Teeth T1, T2, Speed)</option>
                  <option value="cylinder-force">cylinder-force (Pneumatic/Hydraulic)</option>
                  <option value="base64-encoder">base64-encoder (Base64/URL)</option>
                  <option value="number-converter">number-converter (Dec, Hex, Bin, ASCII)</option>
                  <option value="subnet-calculator">subnet-calculator (IPv4 CIDR)</option>
                  <option value="3d-print-cost">3d-print-cost (Grams, Electricity)</option>
                  <option value="stepper-calibration">stepper-calibration (Steps/mm)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="toolOrder">Display Order</Label>
                <Input
                  id="toolOrder"
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  min={1}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="toolTags">Tags (Comma-separated)</Label>
              <Input
                id="toolTags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. PCB Design, Open Source, CAD, Simulation"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
              <Switch id="toolFeatured" checked={featured} onCheckedChange={setFeatured} />
              <Label htmlFor="toolFeatured" className="text-xs font-semibold text-slate-800 cursor-pointer">
                Feature in &ldquo;Top 12 Featured Tools&rdquo; Showcase on Directory
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
              disabled={saving || uploadingLogo || uploadingScreenshot}
            >
              {saving ? 'Saving Tool...' : isNew ? 'Create Tool' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
