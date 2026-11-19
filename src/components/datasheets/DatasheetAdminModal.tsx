'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Save,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/modules/auth/auth-context';
import {
  saveDatasheetAdmin,
  deleteDatasheetAdmin,
  DATASHEET_CATEGORIES,
  getAllDataSheetSearchUrl,
} from '@/modules/datasheets/datasheet-service';
import type { ComponentDatasheet } from '@/types';

interface DatasheetAdminModalProps {
  item: Partial<ComponentDatasheet> | null;
  isNew?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function DatasheetAdminModal({
  item,
  isNew = false,
  open,
  onOpenChange,
  onSaved,
}: DatasheetAdminModalProps) {
  const { profile, effectiveRole, isEditor } = useAuth();

  const [partNumber, setPartNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [category, setCategory] = useState('Operational Amplifiers');
  const [description, setDescription] = useState('');
  const [pkg, setPkg] = useState('');
  const [pinCount, setPinCount] = useState<string>('');
  const [mountingType, setMountingType] = useState<ComponentDatasheet['mountingType']>('Through Hole');
  const [datasheetUrl, setDatasheetUrl] = useState('');
  const [manufacturerUrl, setManufacturerUrl] = useState('');
  const [verified, setVerified] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [specsText, setSpecsText] = useState('');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (item) {
      setPartNumber(item.partNumber || '');
      setManufacturer(item.manufacturer || '');
      setCategory(item.category || 'Operational Amplifiers');
      setDescription(item.description || '');
      setPkg(item.package || '');
      setPinCount(item.pinCount ? String(item.pinCount) : '');
      setMountingType(item.mountingType || 'Through Hole');
      setDatasheetUrl(item.datasheetUrl || '');
      setManufacturerUrl(item.manufacturerUrl || '');
      setVerified(item.verified !== false);
      setFeatured(Boolean(item.featured));

      if (item.specs) {
        const lines = Object.entries(item.specs).map(([k, v]) => `${k}: ${v}`);
        setSpecsText(lines.join('\n'));
      } else {
        setSpecsText('');
      }
    } else {
      setPartNumber('');
      setManufacturer('');
      setCategory('Operational Amplifiers');
      setDescription('');
      setPkg('');
      setPinCount('');
      setMountingType('Through Hole');
      setDatasheetUrl('');
      setManufacturerUrl('');
      setVerified(true);
      setFeatured(false);
      setSpecsText('');
    }
  }, [item, open]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile || !isEditor) {
      toast.error('Only authorized editors and administrators can modify datasheets.');
      return;
    }

    if (!partNumber.trim()) {
      toast.error('Component part number is required.');
      return;
    }

    if (!datasheetUrl.trim()) {
      toast.error('Datasheet PDF or documentation URL is required.');
      return;
    }

    // Parse specs
    const specsObj: Record<string, string> = {};
    const lines = specsText.split('\n');
    for (const line of lines) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim();
        if (key && val) {
          specsObj[key] = val;
        }
      }
    }

    setSaving(true);
    try {
      await saveDatasheetAdmin(
        {
          id: item?.id,
          partNumber: partNumber.trim(),
          normalizedPartNumber: partNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''),
          manufacturer: manufacturer.trim() || 'Generic / Multiple',
          category,
          description: description.trim() || `${partNumber} technical component datasheet reference.`,
          package: pkg.trim() || undefined,
          pinCount: pinCount ? parseInt(pinCount, 10) : undefined,
          mountingType,
          datasheetUrl: datasheetUrl.trim(),
          manufacturerUrl: manufacturerUrl.trim() || undefined,
          allDataSheetUrl: getAllDataSheetSearchUrl(partNumber.trim()),
          verified,
          featured,
          specs: Object.keys(specsObj).length > 0 ? specsObj : undefined,
        },
        profile,
        effectiveRole
      );

      toast.success(
        isNew
          ? `Datasheet for "${partNumber}" added successfully.`
          : `Datasheet for "${partNumber}" updated.`
      );
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save datasheet record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item?.id || !profile || !isEditor) return;
    if (!confirm(`Are you sure you want to permanently delete datasheet for "${partNumber}"?`)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteDatasheetAdmin(item.id, partNumber, profile, effectiveRole);
      toast.success(`Datasheet for "${partNumber}" deleted.`);
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete datasheet.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto touch-scroll p-0 gap-0 border-slate-200">
        {/* Sticky Action Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-3.5 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-[#172D4D]" />
            <span className="font-display text-base font-bold text-[#0B1528]">
              {isNew ? 'Add Component Datasheet' : `Edit: ${partNumber || 'Datasheet'}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isNew && item?.id && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={saving || deleting}
                className="text-xs font-semibold h-8 gap-1 mr-1"
                title="Delete this datasheet"
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
              className="text-xs font-semibold h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSave()}
              disabled={saving || deleting}
              className="bg-[#172D4D] hover:bg-[#0B1528] text-white text-xs font-semibold h-8 gap-1 shadow-2xs"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? 'Saving...' : 'Save Record'}</span>
            </Button>
          </div>
        </div>

        <DialogHeader className="px-6 pt-5 pb-2">
          <DialogTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Electronic Component Datasheet Metadata
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Provide technical specifications, manufacturer details, and official PDF links.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Row 1: Part Number & Manufacturer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="part-num" className="text-xs font-bold text-slate-700">
                Part Number *
              </Label>
              <Input
                id="part-num"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="e.g. LM358, ESP32-S3, NE555"
                required
                className="font-mono text-sm h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="part-mfr" className="text-xs font-bold text-slate-700">
                Manufacturer
              </Label>
              <Input
                id="part-mfr"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Texas Instruments, STMicroelectronics"
                className="text-sm h-9"
              />
            </div>
          </div>

          {/* Row 2: Category & Mounting Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="part-cat" className="text-xs font-bold text-slate-700">
                Component Category
              </Label>
              <select
                id="part-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#172D4D]"
              >
                {DATASHEET_CATEGORIES.filter((c) => c.slug !== 'all').map((cat) => (
                  <option key={cat.slug} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="part-mounting" className="text-xs font-bold text-slate-700">
                Mounting Type
              </Label>
              <select
                id="part-mounting"
                value={mountingType}
                onChange={(e) => setMountingType(e.target.value as ComponentDatasheet['mountingType'])}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#172D4D]"
              >
                <option value="Through Hole">Through Hole (THT)</option>
                <option value="SMD">Surface Mount (SMD / SMT)</option>
                <option value="Module">Integrated Module</option>
                <option value="Chassis">Chassis Mount</option>
              </select>
            </div>
          </div>

          {/* Row 3: Package & Pin Count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="part-pkg" className="text-xs font-bold text-slate-700">
                Package Variants
              </Label>
              <Input
                id="part-pkg"
                value={pkg}
                onChange={(e) => setPkg(e.target.value)}
                placeholder="e.g. DIP-8, SOIC-8, TO-220"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="part-pins" className="text-xs font-bold text-slate-700">
                Pin Count
              </Label>
              <Input
                id="part-pins"
                type="number"
                value={pinCount}
                onChange={(e) => setPinCount(e.target.value)}
                placeholder="e.g. 8"
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="part-desc" className="text-xs font-bold text-slate-700">
              Technical Description
            </Label>
            <Textarea
              id="part-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Concise engineering description of the component functionality and operating scope..."
              rows={2}
              className="text-xs"
            />
          </div>

          {/* URLs */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="part-ds-url" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Official Datasheet PDF URL *</span>
                {datasheetUrl && (
                  <a
                    href={datasheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span>Test Link</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </Label>
              <Input
                id="part-ds-url"
                type="url"
                value={datasheetUrl}
                onChange={(e) => setDatasheetUrl(e.target.value)}
                placeholder="https://www.ti.com/lit/ds/symlink/lm358.pdf"
                required
                className="text-xs h-9 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="part-mfr-url" className="text-xs font-bold text-slate-700">
                Official Manufacturer Product Page URL (Optional)
              </Label>
              <Input
                id="part-mfr-url"
                type="url"
                value={manufacturerUrl}
                onChange={(e) => setManufacturerUrl(e.target.value)}
                placeholder="https://www.ti.com/product/LM358"
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

          {/* Key Electrical Specifications */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="part-specs" className="text-xs font-bold text-slate-700">
                Key Electrical Specifications (Format: Key: Value, one per line)
              </Label>
              <span className="text-[10px] text-slate-400 font-mono">e.g. Supply Voltage: 3V to 32V</span>
            </div>
            <Textarea
              id="part-specs"
              value={specsText}
              onChange={(e) => setSpecsText(e.target.value)}
              placeholder="Supply Voltage: 3V to 32V&#10;Gain Bandwidth: 700 kHz&#10;Output Current: 20 mA"
              rows={3}
              className="text-xs font-mono"
            />
          </div>

          {/* Switches: Verified & Featured */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Switch
                id="part-verified"
                checked={verified}
                onCheckedChange={setVerified}
              />
              <Label htmlFor="part-verified" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Verified Technical Record (Shows green badge)
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="part-featured"
                checked={featured}
                onCheckedChange={setFeatured}
              />
              <Label htmlFor="part-featured" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Featured Component
              </Label>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
