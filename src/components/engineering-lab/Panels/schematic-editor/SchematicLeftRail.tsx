'use client';

import React, { useState } from 'react';
import {
  MousePointer,
  Hand,
  GitCommit,
  CircleDot,
  Tag,
  Zap,
  XSquare,
  Square,
  Type,
  Image as ImageIcon,
  Minus,
  Circle,
} from 'lucide-react';

export type SchematicTool =
  | 'select'
  | 'pan'
  | 'wire'
  | 'junction'
  | 'netlabel'
  | 'power'
  | 'noconnect'
  | 'draw_rect'
  | 'draw_line'
  | 'draw_circle'
  | 'text'
  | 'image';

interface SchematicLeftRailProps {
  activeTool: SchematicTool;
  onSelectTool: (tool: SchematicTool) => void;
  onAttachImageClick?: () => void;
  onSelectPowerPortType?: (type: 'VCC' | 'GND' | '+3.3V' | '+5V' | '+9V' | '+12V') => void;
  selectedPowerPortType?: 'VCC' | 'GND' | '+3.3V' | '+5V' | '+9V' | '+12V';
}

/**
 * Slim Left Vertical EDA Tool Rail (40px wide, scrollable if short, crisp icons + tooltips with shortcuts).
 * 1. Select / Box-Select (V)
 * 2. Pan (H)
 * 3. Wire (W)
 * 4. Junction (J)
 * 5. Net Label (N)
 * 6. Power / GND Port (P)
 * 7. No-Connect Flag (Q)
 * 8. Draw Graphics (G) [Rect, Line, Circle]
 * 9. Text Note (T)
 * 10. Attach Image (Img)
 */
export function SchematicLeftRail({
  activeTool,
  onSelectTool,
  onAttachImageClick,
  onSelectPowerPortType,
  selectedPowerPortType = 'VCC',
}: SchematicLeftRailProps) {
  const [showPowerMenu, setShowPowerMenu] = useState(false);
  const [showDrawMenu, setShowDrawMenu] = useState(false);

  const isDrawing = ['draw_rect', 'draw_line', 'draw_circle'].includes(activeTool);

  return (
    <div
      data-testid="sch-left-rail"
      className="w-10 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-2 z-50 shrink-0 gap-1 overflow-visible select-none"
    >
      {/* 1. Select / Box-Select (V) */}
      <button
        data-testid="tool-select"
        onClick={() => onSelectTool('select')}
        className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
          activeTool === 'select'
            ? 'bg-emerald-600 text-white shadow-md'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
        title="Select & Move (V) — Single click, Shift+Click multi-select, marquee box-select"
      >
        <MousePointer className="w-4 h-4" />
      </button>

      {/* 2. Pan (H) */}
      <button
        data-testid="tool-pan"
        onClick={() => onSelectTool('pan')}
        className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
          activeTool === 'pan'
            ? 'bg-emerald-600 text-white shadow-md'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
        title="Pan Canvas (H) — Or Middle-click drag, or Space + drag"
      >
        <Hand className="w-4 h-4" />
      </button>

      {/* 3. Wire (W) */}
      <button
        data-testid="tool-wire"
        onClick={() => onSelectTool('wire')}
        className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
          activeTool === 'wire'
            ? 'bg-emerald-600 text-white shadow-md'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
        title="Orthogonal Wire (W) — 90° Manhattan routing, magnetic pin snap, Space flips elbow"
      >
        <GitCommit className="w-4 h-4" />
      </button>

      <div className="w-5 h-[1px] bg-slate-800 my-0.5" />

      {/* 4. Junction (J) */}
      <button
        data-testid="tool-junction"
        onClick={() => onSelectTool('junction')}
        className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
          activeTool === 'junction'
            ? 'bg-emerald-600 text-white shadow-md'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
        title="Junction Dot (J) — Place or remove electrical junction dot on wires"
      >
        <CircleDot className="w-4 h-4" />
      </button>

      {/* 5. Net Label (N) */}
      <button
        data-testid="tool-netlabel"
        onClick={() => onSelectTool('netlabel')}
        className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
          activeTool === 'netlabel'
            ? 'bg-emerald-600 text-white shadow-md'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
        title="Net Label (N) — Attach named net label (VCC, GND, CLK, OUT) to wires"
      >
        <Tag className="w-4 h-4" />
      </button>

      {/* 6. Power / GND Port (P) */}
      <div className="relative">
        <button
          data-testid="tool-power"
          onClick={() => {
            onSelectTool('power');
            setShowPowerMenu((prev) => !prev);
          }}
          className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
            activeTool === 'power'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Power / GND Port (P) — VCC (+5V), +3.3V, +9V, GND symbols"
        >
          <Zap className="w-4 h-4" />
        </button>

        {showPowerMenu && (
          <div className="absolute left-9 top-0 bg-slate-900 border border-slate-700 rounded-md p-1 shadow-2xl z-50 flex flex-col gap-1 w-24 text-[10px] font-mono">
            {(['VCC', '+3.3V', '+5V', '+9V', '+12V', 'GND'] as const).map((pt) => (
              <button
                key={pt}
                onClick={() => {
                  onSelectPowerPortType?.(pt);
                  setShowPowerMenu(false);
                }}
                className={`px-1.5 py-0.5 rounded text-left transition-colors ${
                  selectedPowerPortType === pt
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {pt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 7. No-Connect Flag (Q) */}
      <button
        data-testid="tool-noconnect"
        onClick={() => onSelectTool('noconnect')}
        className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
          activeTool === 'noconnect'
            ? 'bg-emerald-600 text-white shadow-md'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
        title="No-Connect Marker (Q) — Mark intentionally unused pins (suppresses ERC warnings)"
      >
        <XSquare className="w-4 h-4" />
      </button>

      <div className="w-5 h-[1px] bg-slate-800 my-0.5" />

      {/* 8. Draw Graphics (G) */}
      <div className="relative">
        <button
          data-testid="tool-draw"
          onClick={() => {
            if (!isDrawing) onSelectTool('draw_rect');
            setShowDrawMenu((prev) => !prev);
          }}
          className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
            isDrawing
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Draw Graphics (G) — Rectangle, Line, Circle for functional groupings"
        >
          {activeTool === 'draw_line' ? (
            <Minus className="w-4 h-4" />
          ) : activeTool === 'draw_circle' ? (
            <Circle className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>

        {showDrawMenu && (
          <div className="absolute left-9 top-0 bg-slate-900 border border-slate-700 rounded-md p-1 shadow-2xl z-50 flex flex-col gap-1 w-28 text-[10px] font-mono">
            <button
              onClick={() => {
                onSelectTool('draw_rect');
                setShowDrawMenu(false);
              }}
              className="px-1.5 py-0.5 rounded text-left text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5" /> Rectangle
            </button>
            <button
              onClick={() => {
                onSelectTool('draw_line');
                setShowDrawMenu(false);
              }}
              className="px-1.5 py-0.5 rounded text-left text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"
            >
              <Minus className="w-3.5 h-3.5" /> Line
            </button>
            <button
              onClick={() => {
                onSelectTool('draw_circle');
                setShowDrawMenu(false);
              }}
              className="px-1.5 py-0.5 rounded text-left text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"
            >
              <Circle className="w-3.5 h-3.5" /> Circle
            </button>
          </div>
        )}
      </div>

      {/* 9. Text Note (T) */}
      <button
        data-testid="tool-text"
        onClick={() => onSelectTool('text')}
        className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
          activeTool === 'text'
            ? 'bg-emerald-600 text-white shadow-md'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
        title="Text Note (T) — Place resizable engineering notes & block headings"
      >
        <Type className="w-4 h-4" />
      </button>

      {/* 10. Attach Image (Img) */}
      <button
        data-testid="tool-image"
        onClick={() => {
          onSelectTool('image');
          onAttachImageClick?.();
        }}
        className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
          activeTool === 'image'
            ? 'bg-emerald-600 text-white shadow-md'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
        title="Attach Image — Embed reference diagrams, pinouts, or company logos"
      >
        <ImageIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
