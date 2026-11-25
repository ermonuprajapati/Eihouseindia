'use client';

import React from 'react';
import {
  SchematicGraphicShape,
  SchematicTextNote,
  SchematicAttachedImage,
  SchematicNoConnect,
  SchematicManualJunction,
  SchematicNetLabel,
  SchematicPowerPort,
} from '@/modules/engineering-lab/types';
import { Lock, Unlock, Trash2 } from 'lucide-react';

interface SchematicDrawingLayerProps {
  shapes?: SchematicGraphicShape[];
  textNotes?: SchematicTextNote[];
  images?: SchematicAttachedImage[];
  noConnects?: SchematicNoConnect[];
  manualJunctions?: SchematicManualJunction[];
  netLabels?: SchematicNetLabel[];
  powerPorts?: SchematicPowerPort[];
  theme?: 'dark' | 'light';
  selectedItemId?: string | null;
  onSelectItem?: (id: string | null) => void;
  onDoubleClickItem?: (item: { type: string; id: string; data: unknown }) => void;
  onUpdateImage?: (image: SchematicAttachedImage) => void;
  onDeleteImage?: (id: string) => void;
  onItemMouseDown?: (e: React.MouseEvent, type: string, id: string) => void;
  onImageHandleMouseDown?: (e: React.MouseEvent, imageId: string, handle: string) => void;
}

/**
 * Pure SVG Rendering Layer for User Engineering Annotations:
 * Shapes (lines/rects/circles), Text Notes, Embedded Images, Net Labels, Power Ports, No-Connects.
 * Fully interactive with selection, dragging, and image controls.
 */
export function SchematicDrawingLayer({
  shapes = [],
  textNotes = [],
  images = [],
  noConnects = [],
  manualJunctions = [],
  netLabels = [],
  powerPorts = [],
  theme = 'dark',
  selectedItemId,
  onSelectItem,
  onDoubleClickItem,
  onUpdateImage,
  onDeleteImage,
  onItemMouseDown,
  onImageHandleMouseDown,
}: SchematicDrawingLayerProps) {
  return (
    <g className="sch-drawing-layer">
      {/* 1. Graphic Shapes (Lines, Rectangles, Circles) */}
      {shapes.map((s) => {
        const isSelected = selectedItemId === s.id;
        const stroke = s.stroke || (theme === 'dark' ? '#38BDF8' : '#0284C7');
        const fill = s.fill || 'none';
        const strokeDasharray =
          s.strokeDash === 'dashed' ? '6 4' : s.strokeDash === 'dotted' ? '2 3' : undefined;

        if (s.type === 'rect') {
          const x = Math.min(s.x1, s.x2);
          const y = Math.min(s.y1, s.y2);
          const w = Math.abs(s.x2 - s.x1);
          const h = Math.abs(s.y2 - s.y1);
          return (
            <rect
              key={s.id}
              data-testid={`sch-shape-${s.id}`}
              x={x}
              y={y}
              width={w}
              height={h}
              rx="3"
              stroke={isSelected ? '#10B981' : stroke}
              strokeWidth={s.strokeWidth || 1.5}
              strokeDasharray={strokeDasharray}
              fill={fill}
              className="cursor-pointer"
              onMouseDown={(e) => {
                e.stopPropagation();
                onSelectItem?.(s.id);
                onItemMouseDown?.(e, 'shape', s.id);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectItem?.(s.id);
              }}
            />
          );
        } else if (s.type === 'circle') {
          const cx = (s.x1 + s.x2) / 2;
          const cy = (s.y1 + s.y2) / 2;
          const r = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) / 2;
          return (
            <circle
              key={s.id}
              data-testid={`sch-shape-${s.id}`}
              cx={cx}
              cy={cy}
              r={r}
              stroke={isSelected ? '#10B981' : stroke}
              strokeWidth={s.strokeWidth || 1.5}
              strokeDasharray={strokeDasharray}
              fill={fill}
              className="cursor-pointer"
              onMouseDown={(e) => {
                e.stopPropagation();
                onSelectItem?.(s.id);
                onItemMouseDown?.(e, 'shape', s.id);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectItem?.(s.id);
              }}
            />
          );
        } else {
          // line
          return (
            <line
              key={s.id}
              data-testid={`sch-shape-${s.id}`}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke={isSelected ? '#10B981' : stroke}
              strokeWidth={s.strokeWidth || 1.8}
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              className="cursor-pointer"
              onMouseDown={(e) => {
                e.stopPropagation();
                onSelectItem?.(s.id);
                onItemMouseDown?.(e, 'shape', s.id);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectItem?.(s.id);
              }}
            />
          );
        }
      })}

      {/* 2. Embedded Images (with corner handles, opacity, drag) */}
      {images.map((img) => {
        const isSelected = selectedItemId === img.id;
        return (
          <g
            key={img.id}
            data-testid={`sch-image-${img.id}`}
            transform={`translate(${img.x}, ${img.y})`}
            className="cursor-move select-none"
            onMouseDown={(e) => {
              e.stopPropagation();
              onSelectItem?.(img.id);
              onItemMouseDown?.(e, 'image', img.id);
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem?.(img.id);
            }}
          >
            <image
              href={img.dataUrl}
              width={img.width}
              height={img.height}
              opacity={img.opacity ?? 1.0}
              preserveAspectRatio="none"
              className="rounded"
            />
            {isSelected && (
              <g className="image-handles">
                <rect
                  x="0"
                  y="0"
                  width={img.width}
                  height={img.height}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  pointerEvents="none"
                />
                {/* 4 Interactive Resize Handles */}
                <circle
                  cx="0"
                  cy="0"
                  r="5"
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  className="cursor-nwse-resize"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onImageHandleMouseDown?.(e, img.id, 'nw');
                  }}
                />
                <circle
                  cx={img.width}
                  cy="0"
                  r="5"
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  className="cursor-nesw-resize"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onImageHandleMouseDown?.(e, img.id, 'ne');
                  }}
                />
                <circle
                  cx="0"
                  cy={img.height}
                  r="5"
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  className="cursor-nesw-resize"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onImageHandleMouseDown?.(e, img.id, 'sw');
                  }}
                />
                <circle
                  cx={img.width}
                  cy={img.height}
                  r="5"
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  className="cursor-nwse-resize"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onImageHandleMouseDown?.(e, img.id, 'se');
                  }}
                />
              </g>
            )}
          </g>
        );
      })}

      {/* 3. Text Notes & Engineering Labels */}
      {textNotes.map((note) => {
        const isSelected = selectedItemId === note.id;
        const color = note.color || (theme === 'dark' ? '#F8FAFC' : '#0F172A');
        const fontSize = note.fontSize || 12;

        return (
          <g
            key={note.id}
            data-testid={`sch-text-${note.id}`}
            transform={`translate(${note.x}, ${note.y})`}
            className="cursor-pointer select-none"
            onMouseDown={(e) => {
              e.stopPropagation();
              onSelectItem?.(note.id);
              onItemMouseDown?.(e, 'text', note.id);
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem?.(note.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onDoubleClickItem?.({ type: 'text', id: note.id, data: note });
            }}
          >
            {isSelected && (
              <rect
                x="-4"
                y={-fontSize - 2}
                width={note.text.length * (fontSize * 0.65) + 12}
                height={fontSize + 8}
                rx="3"
                fill="rgba(16, 185, 129, 0.15)"
                stroke="#10B981"
                strokeWidth="1"
              />
            )}
            <text
              x="0"
              y="0"
              fill={color}
              fontSize={fontSize}
              fontWeight={note.bold ? 'bold' : 'normal'}
              fontFamily="sans-serif"
            >
              {note.text}
            </text>
          </g>
        );
      })}

      {/* 4. Net Labels (VCC, GND, CLK, OUT, SDA, SCL) */}
      {netLabels.map((nl) => {
        const isSelected = selectedItemId === nl.id;
        const labelW = Math.max(36, nl.name.length * 7 + 16);
        return (
          <g
            key={nl.id}
            data-testid={`sch-netlabel-${nl.id}`}
            transform={`translate(${nl.x}, ${nl.y})`}
            className="cursor-pointer select-none"
            onMouseDown={(e) => {
              e.stopPropagation();
              onSelectItem?.(nl.id);
              onItemMouseDown?.(e, 'netlabel', nl.id);
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem?.(nl.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onDoubleClickItem?.({ type: 'netlabel', id: nl.id, data: nl });
            }}
          >
            {/* KiCad/Altium style net flag polygon */}
            <polygon
              points={`0,0 8,-8 ${labelW},-8 ${labelW},8 8,8`}
              fill={theme === 'dark' ? '#0F172A' : '#F1F5F9'}
              stroke={isSelected ? '#10B981' : '#38BDF8'}
              strokeWidth="1.6"
            />
            <text
              x={12}
              y="3"
              fill={theme === 'dark' ? '#38BDF8' : '#0369A1'}
              fontSize="9"
              fontWeight="bold"
              fontFamily="monospace"
            >
              {nl.name}
            </text>
          </g>
        );
      })}

      {/* 5. Power & GND Ports (VCC, +3.3V, +5V, +9V, +12V, GND) */}
      {powerPorts.map((pp) => {
        const isSelected = selectedItemId === pp.id;
        const isGnd = pp.portType === 'GND';
        return (
          <g
            key={pp.id}
            data-testid={`sch-powerport-${pp.id}`}
            transform={`translate(${pp.x}, ${pp.y}) rotate(${pp.rotation || 0})`}
            className="cursor-pointer select-none"
            onMouseDown={(e) => {
              e.stopPropagation();
              onSelectItem?.(pp.id);
              onItemMouseDown?.(e, 'powerport', pp.id);
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem?.(pp.id);
            }}
          >
            {isGnd ? (
              // KiCad style GND port symbol
              <g>
                <line x1="0" y1="0" x2="0" y2="10" stroke="#38BDF8" strokeWidth="2" />
                <line x1="-10" y1="10" x2="10" y2="10" stroke="#38BDF8" strokeWidth="2.5" />
                <line x1="-6" y1="14" x2="6" y2="14" stroke="#38BDF8" strokeWidth="2" />
                <line x1="-2" y1="18" x2="2" y2="18" stroke="#38BDF8" strokeWidth="1.5" />
                <text
                  x="0"
                  y="27"
                  textAnchor="middle"
                  fill="#38BDF8"
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  GND
                </text>
              </g>
            ) : (
              // KiCad style VCC / Power arrow symbol
              <g>
                <line x1="0" y1="0" x2="0" y2="-10" stroke="#EF4444" strokeWidth="2" />
                <polygon points="0,-16 -6,-10 6,-10" fill="#EF4444" stroke="#EF4444" />
                <text
                  x="0"
                  y="-19"
                  textAnchor="middle"
                  fill="#EF4444"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {pp.portType}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* 6. KiCad No-Connect 'X' Flags */}
      {noConnects.map((nc) => (
        <g
          key={nc.id}
          data-testid={`sch-noconnect-${nc.id}`}
          transform={`translate(${nc.x}, ${nc.y})`}
          className="cursor-pointer select-none"
          onMouseDown={(e) => {
            e.stopPropagation();
            onSelectItem?.(nc.id);
            onItemMouseDown?.(e, 'noconnect', nc.id);
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectItem?.(nc.id);
          }}
        >
          <line x1="-5" y1="-5" x2="5" y2="5" stroke="#06B6D4" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="-5" y1="5" x2="5" y2="-5" stroke="#06B6D4" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      ))}

      {/* 7. Manual Electrical Junction Dots */}
      {manualJunctions.map((mj) => (
        <circle
          key={mj.id}
          data-testid={`sch-manual-junction-${mj.id}`}
          cx={mj.x}
          cy={mj.y}
          r="4"
          fill="#38BDF8"
          stroke="#0284C7"
          strokeWidth="1.2"
          className="cursor-pointer"
          onMouseDown={(e) => {
            e.stopPropagation();
            onSelectItem?.(mj.id);
            onItemMouseDown?.(e, 'junction', mj.id);
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectItem?.(mj.id);
          }}
        />
      ))}
    </g>
  );
}
