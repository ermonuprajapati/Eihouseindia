'use client';

import React, { useState, useMemo } from 'react';
import { CircuitComponent, CircuitWire } from '@/modules/engineering-lab/types';
import { X, Download, Copy, Check, FileSpreadsheet, Network } from 'lucide-react';
import { toast } from 'sonner';

export interface SchematicBomNetlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: CircuitComponent[];
  wires: CircuitWire[];
  projectName?: string;
}

export function SchematicBomNetlistModal({
  isOpen,
  onClose,
  components,
  wires,
  projectName = 'Schematic_Design',
}: SchematicBomNetlistModalProps) {
  const [activeTab, setActiveTab] = useState<'bom' | 'netlist'>('bom');
  const [copied, setCopied] = useState(false);

  // Group components for Bill of Materials (BOM)
  const bomRows = useMemo(() => {
    const map = new Map<string, { value: string; footprint: string; type: string; designators: string[]; count: number }>();
    components.forEach((c) => {
      const des = c.designator || c.label?.split(' ')[0] || c.id;
      const key = `${c.type}__${c.value}__${c.footprint || 'Default'}`;
      const existing = map.get(key);
      if (existing) {
        existing.designators.push(des);
        existing.count++;
      } else {
        map.set(key, {
          value: c.value || 'N/A',
          footprint: c.footprint || 'Default',
          type: c.type,
          designators: [des],
          count: 1,
        });
      }
    });

    return Array.from(map.values()).map((row) => ({
      ...row,
      designatorsList: row.designators.sort().join(', '),
    }));
  }, [components]);

  // Generate standardized KiCad/SPICE style Netlist representation
  const netlistText = useMemo(() => {
    const netPinMap = new Map<string, string[]>();
    wires.forEach((w) => {
      const netName = w.netName || `NET_${w.fromCompId}_${w.fromPinId}`;
      const list = netPinMap.get(netName) || [];
      const p1 = `${w.fromCompId}.${w.fromPinId}`;
      const p2 = `${w.toCompId}.${w.toPinId}`;
      if (!list.includes(p1)) list.push(p1);
      if (!list.includes(p2)) list.push(p2);
      netPinMap.set(netName, list);
    });

    const lines: string[] = [
      `# Electronic Schematic Netlist - ${projectName}`,
      `# Generated: ${new Date().toISOString()}`,
      `# Total Components: ${components.length}`,
      `# Total Nets: ${netPinMap.size}`,
      '',
      '[COMPONENTS]',
    ];

    components.forEach((c) => {
      const des = c.designator || c.label?.split(' ')[0] || c.id;
      lines.push(`  ${des.padEnd(8)} ${c.type.padEnd(20)} ${c.value.padEnd(14)} (${c.footprint || 'THT'})`);
    });

    lines.push('', '[NETS]');
    netPinMap.forEach((pins, net) => {
      lines.push(`  (net "${net}"`);
      pins.forEach((p) => {
        lines.push(`    (node "${p}")`);
      });
      lines.push('  )');
    });

    return lines.join('\n');
  }, [components, wires, projectName]);

  const handleExportCsv = () => {
    const header = 'Item,Designators,Quantity,Value,Type,Footprint\n';
    const body = bomRows
      .map(
        (r, idx) =>
          `${idx + 1},"${r.designatorsList}",${r.count},"${r.value}","${r.type}","${r.footprint}"`
      )
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}_BOM.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('BOM CSV exported successfully!');
  };

  const handleCopyNetlist = async () => {
    try {
      await navigator.clipboard.writeText(netlistText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Netlist copied to clipboard!');
    } catch {
      toast.error('Failed to copy netlist');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="modal-bom-netlist"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-wide text-white">Bill of Materials & Netlist</span>
            <span className="text-xs text-slate-400 font-mono">({components.length} components, {wires.length} wires)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher & Actions */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 text-xs">
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800">
            <button
              onClick={() => setActiveTab('bom')}
              className={`px-3 py-1 rounded flex items-center gap-1.5 font-medium transition-colors ${
                activeTab === 'bom' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Bill of Materials (BOM)</span>
            </button>
            <button
              onClick={() => setActiveTab('netlist')}
              className={`px-3 py-1 rounded flex items-center gap-1.5 font-medium transition-colors ${
                activeTab === 'netlist' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Electrical Netlist</span>
            </button>
          </div>

          <div>
            {activeTab === 'bom' ? (
              <button
                data-testid="action-export-bom-csv"
                onClick={handleExportCsv}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded flex items-center gap-1.5 font-semibold text-xs shadow-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            ) : (
              <button
                data-testid="action-copy-netlist"
                onClick={handleCopyNetlist}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded flex items-center gap-1.5 font-semibold text-xs transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Netlist'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-auto p-4 text-xs font-mono">
          {activeTab === 'bom' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-[11px]">
                    <th className="py-1.5 px-2">#</th>
                    <th className="py-1.5 px-2">Designator(s)</th>
                    <th className="py-1.5 px-2">Qty</th>
                    <th className="py-1.5 px-2">Value</th>
                    <th className="py-1.5 px-2">Type</th>
                    <th className="py-1.5 px-2">Footprint</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {bomRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="py-1.5 px-2 text-slate-500">{idx + 1}</td>
                      <td className="py-1.5 px-2 text-emerald-400 font-bold">{row.designatorsList}</td>
                      <td className="py-1.5 px-2 font-bold">{row.count}</td>
                      <td className="py-1.5 px-2 text-cyan-300">{row.value}</td>
                      <td className="py-1.5 px-2 text-slate-400">{row.type}</td>
                      <td className="py-1.5 px-2 text-slate-500 text-[10px]">{row.footprint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <pre className="p-3 bg-slate-950 rounded border border-slate-800 text-slate-300 leading-relaxed overflow-x-auto whitespace-pre">
              {netlistText}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
