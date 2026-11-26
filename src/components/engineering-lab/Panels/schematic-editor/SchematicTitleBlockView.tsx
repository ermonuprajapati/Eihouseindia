'use client';

import React from 'react';
import { SchematicTitleBlock } from '@/modules/engineering-lab/types';

interface SchematicTitleBlockViewProps {
  sheetWidth: number;
  sheetHeight: number;
  titleBlock?: SchematicTitleBlock;
  projectTitle: string;
  componentCount: number;
  netCount: number;
  theme?: 'dark' | 'light';
  onDoubleClick?: () => void;
}

/**
 * KiCad / Altium Standard Engineering Sheet Border & Bottom-Right Title Block
 * Renders crisp zone coordinates (A-D, 1-6) and organization metadata.
 */
export function SchematicTitleBlockView({
  sheetWidth,
  sheetHeight,
  titleBlock,
  projectTitle,
  componentCount,
  netCount,
  theme = 'dark',
  onDoubleClick,
}: SchematicTitleBlockViewProps) {
  const isDark = theme === 'dark';
  const blockW = 320;
  const blockH = 90;
  const x = sheetWidth - blockW - 10;
  const y = sheetHeight - blockH - 10;

  const title = titleBlock?.title || projectTitle || 'Schematic Capture';
  const rev = titleBlock?.revision || '1.0';
  const company = titleBlock?.company || 'EI HOUSE ENGINEERING';
  const author = titleBlock?.author || 'EI House Lab Engineer';
  const date = titleBlock?.date || new Date().toISOString().split('T')[0];
  const sheet = titleBlock?.sheet || '1 / 1';

  return (
    <g className="sch-title-block select-none pointer-events-none">
      {/* Outer Border Frame */}
      <rect
        x="10"
        y="10"
        width={sheetWidth - 20}
        height={sheetHeight - 20}
        fill="none"
        stroke={isDark ? '#334155' : '#6E695C'}
        strokeWidth="2"
        pointerEvents="none"
      />

      {/* Inner Margined Zone Border */}
      <rect
        x="20"
        y="20"
        width={sheetWidth - 40}
        height={sheetHeight - 40}
        fill="none"
        stroke={isDark ? '#1E293B' : '#A8A29E'}
        strokeWidth="1"
        pointerEvents="none"
      />

      {/* Zone Coordinates Top & Bottom (1 - 6) */}
      {[1, 2, 3, 4, 5, 6].map((num, idx) => {
        const stepX = (sheetWidth - 40) / 6;
        const coordX = 20 + stepX * (idx + 0.5);
        return (
          <g key={`num_${num}`}>
            <text x={coordX} y="17" textAnchor="middle" fill={isDark ? '#64748B' : '#78716C'} fontSize="8" fontFamily="monospace">
              {num}
            </text>
            <text x={coordX} y={sheetHeight - 12} textAnchor="middle" fill={isDark ? '#64748B' : '#78716C'} fontSize="8" fontFamily="monospace">
              {num}
            </text>
          </g>
        );
      })}

      {/* Zone Coordinates Left & Right (A - D) */}
      {['A', 'B', 'C', 'D'].map((letter, idx) => {
        const stepY = (sheetHeight - 40) / 4;
        const coordY = 20 + stepY * (idx + 0.5);
        return (
          <g key={`letter_${letter}`}>
            <text x="14" y={coordY} textAnchor="middle" fill={isDark ? '#64748B' : '#78716C'} fontSize="8" fontFamily="monospace">
              {letter}
            </text>
            <text x={sheetWidth - 14} y={coordY} textAnchor="middle" fill={isDark ? '#64748B' : '#78716C'} fontSize="8" fontFamily="monospace">
              {letter}
            </text>
          </g>
        );
      })}

      {/* Title Block Box in Bottom-Right Corner */}
      <g
        data-testid="sch-title-block"
        transform={`translate(${x}, ${y})`}
        className="cursor-pointer pointer-events-auto"
        onDoubleClick={onDoubleClick}
      >
        <rect
          x="0"
          y="0"
          width={blockW}
          height={blockH}
          fill={isDark ? '#09101E' : '#E3DFD2'}
          stroke={isDark ? '#475569' : '#6E695C'}
          strokeWidth="1.6"
          rx="2"
        />

        {/* Top Header Row: Project Title & Revision */}
        <line x1="0" y1="28" x2={blockW} y2="28" stroke={isDark ? '#334155' : '#C7C2B4'} strokeWidth="1" />
        <line x1={blockW - 70} y1="0" x2={blockW - 70} y2="28" stroke={isDark ? '#334155' : '#C7C2B4'} strokeWidth="1" />

        <text x="10" y="18" fill={isDark ? '#F1F5F9' : '#25231D'} fontSize="11" fontWeight="bold" fontFamily="monospace">
          {title.slice(0, 50)}
        </text>
        <text x={blockW - 60} y="18" fill={isDark ? '#10B981' : '#047857'} fontSize="10" fontWeight="bold" fontFamily="monospace">
          REV {rev}
        </text>

        {/* Middle Row: Company & Sheet */}
        <line x1="0" y1="56" x2={blockW} y2="56" stroke={isDark ? '#334155' : '#C7C2B4'} strokeWidth="1" />
        <line x1={blockW - 70} y1="28" x2={blockW - 70} y2="56" stroke={isDark ? '#334155' : '#C7C2B4'} strokeWidth="1" />

        <text x="10" y="44" fill={isDark ? '#94A3B8' : '#44403C'} fontSize="9" fontFamily="monospace">
          COMPANY: <tspan fill={isDark ? '#E2E8F0' : '#25231D'} fontWeight="bold">{company.slice(0, 26)}</tspan>
        </text>
        <text x={blockW - 60} y="44" fill={isDark ? '#94A3B8' : '#44403C'} fontSize="9" fontFamily="monospace">
          SH: {sheet}
        </text>

        {/* Bottom Row: Stats & Author */}
        <text x="10" y="74" fill={isDark ? '#94A3B8' : '#44403C'} fontSize="8" fontFamily="monospace">
          AUTHOR: <tspan fill={isDark ? '#CBD5E1' : '#25231D'}>{author.slice(0, 16)}</tspan> | DATE: {date}
        </text>
        <text x={blockW - 110} y="74" fill={isDark ? '#38BDF8' : '#0F6B54'} fontSize="8" fontWeight="bold" fontFamily="monospace">
          COMPS: {componentCount} | NETS: {netCount}
        </text>
      </g>
    </g>
  );
}
