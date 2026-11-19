'use client';

import React from 'react';

interface SchematicSheetFrameProps {
  projectTitle: string;
  width?: number;
  height?: number;
  showFrame?: boolean;
}

/**
 * Standard IEEE / IEC Schematic Drawing Sheet Frame & Title Block
 * Renders an authentic EDA engineering border with reference coordinate zones (A-D, 1-8)
 * and an executive project title block in the bottom-right corner.
 */
export function SchematicSheetFrame({
  projectTitle,
  width = 1600,
  height = 1100,
  showFrame = true,
}: SchematicSheetFrameProps) {
  if (!showFrame) return null;

  const margin = 24;
  const innerMargin = 32;
  const cols = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const rows = ['A', 'B', 'C', 'D'];

  const colWidth = (width - innerMargin * 2) / cols.length;
  const rowHeight = (height - innerMargin * 2) / rows.length;

  // Title Block dimensions
  const tbW = 340;
  const tbH = 100;
  const tbX = width - innerMargin - tbW;
  const tbY = height - innerMargin - tbH;

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <g className="pointer-events-none select-none">
      {/* Outer Fine Border */}
      <rect
        x={margin}
        y={margin}
        width={width - margin * 2}
        height={height - margin * 2}
        fill="none"
        stroke="#1E293B"
        strokeWidth="1.2"
      />

      {/* Inner Main Border */}
      <rect
        x={innerMargin}
        y={innerMargin}
        width={width - innerMargin * 2}
        height={height - innerMargin * 2}
        fill="none"
        stroke="#334155"
        strokeWidth="1.8"
      />

      {/* Grid Reference Column Ticks & Labels (Top & Bottom) */}
      {cols.map((col, i) => {
        const x = innerMargin + i * colWidth + colWidth / 2;
        return (
          <React.Fragment key={`col-${col}`}>
            {/* Top Label */}
            <text
              x={x}
              y={innerMargin - 4}
              fill="#64748B"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              {col}
            </text>
            {/* Bottom Label */}
            <text
              x={x}
              y={height - margin + 6}
              fill="#64748B"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              {col}
            </text>
            {/* Divider Ticks */}
            {i > 0 && (
              <>
                <line
                  x1={innerMargin + i * colWidth}
                  y1={margin}
                  x2={innerMargin + i * colWidth}
                  y2={innerMargin}
                  stroke="#334155"
                  strokeWidth="1"
                />
                <line
                  x1={innerMargin + i * colWidth}
                  y1={height - innerMargin}
                  x2={innerMargin + i * colWidth}
                  y2={height - margin}
                  stroke="#334155"
                  strokeWidth="1"
                />
              </>
            )}
          </React.Fragment>
        );
      })}

      {/* Grid Reference Row Ticks & Labels (Left & Right) */}
      {rows.map((row, i) => {
        const y = innerMargin + i * rowHeight + rowHeight / 2;
        return (
          <React.Fragment key={`row-${row}`}>
            {/* Left Label */}
            <text
              x={margin - 6}
              y={y + 3}
              fill="#64748B"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              {row}
            </text>
            {/* Right Label */}
            <text
              x={width - margin + 6}
              y={y + 3}
              fill="#64748B"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              {row}
            </text>
            {/* Divider Ticks */}
            {i > 0 && (
              <>
                <line
                  x1={margin}
                  y1={innerMargin + i * rowHeight}
                  x2={innerMargin}
                  y2={innerMargin + i * rowHeight}
                  stroke="#334155"
                  strokeWidth="1"
                />
                <line
                  x1={width - innerMargin}
                  y1={innerMargin + i * rowHeight}
                  x2={width - margin}
                  y2={innerMargin + i * rowHeight}
                  stroke="#334155"
                  strokeWidth="1"
                />
              </>
            )}
          </React.Fragment>
        );
      })}

      {/* Corner Registration Crosshairs */}
      {[
        { cx: margin, cy: margin },
        { cx: width - margin, cy: margin },
        { cx: margin, cy: height - margin },
        { cx: width - margin, cy: height - margin },
      ].map((pt, idx) => (
        <g key={`cross-${idx}`}>
          <line x1={pt.cx - 6} y1={pt.cy} x2={pt.cx + 6} y2={pt.cy} stroke="#475569" strokeWidth="0.8" />
          <line x1={pt.cx} y1={pt.cy - 6} x2={pt.cx} y2={pt.cy + 6} stroke="#475569" strokeWidth="0.8" />
        </g>
      ))}

      {/* ========================================================================= */}
      {/* STANDARD EDA TITLE BLOCK (Altium / KiCad Executive Standard)              */}
      {/* ========================================================================= */}
      <g>
        {/* Background Fill */}
        <rect
          x={tbX}
          y={tbY}
          width={tbW}
          height={tbH}
          fill="#0B1528"
          stroke="#475569"
          strokeWidth="1.5"
        />

        {/* Horizontal Dividers */}
        <line x1={tbX} y1={tbY + 28} x2={tbX + tbW} y2={tbY + 28} stroke="#334155" strokeWidth="1" />
        <line x1={tbX} y1={tbY + 64} x2={tbX + tbW} y2={tbY + 64} stroke="#334155" strokeWidth="1" />

        {/* Vertical Dividers */}
        <line x1={tbX + 220} y1={tbY} x2={tbX + 220} y2={tbY + 28} stroke="#334155" strokeWidth="1" />
        <line x1={tbX + 180} y1={tbY + 64} x2={tbX + 180} y2={tbY + tbH} stroke="#334155" strokeWidth="1" />
        <line x1={tbX + 260} y1={tbY + 64} x2={tbX + 260} y2={tbY + tbH} stroke="#334155" strokeWidth="1" />

        {/* Row 1: Company Logo / Name & Status */}
        <text
          x={tbX + 10}
          y={tbY + 18}
          fill="#10B981"
          fontSize="11"
          fontFamily="monospace"
          fontWeight="bold"
          letterSpacing="1"
        >
          EI HOUSE INDIA
        </text>
        <text
          x={tbX + 105}
          y={tbY + 18}
          fill="#94A3B8"
          fontSize="8"
          fontFamily="monospace"
        >
          VIRTUAL HARDWARE LAB
        </text>
        <text
          x={tbX + 228}
          y={tbY + 18}
          fill="#38BDF8"
          fontSize="9"
          fontFamily="monospace"
          fontWeight="bold"
        >
          REV 1.0 • APPROVED
        </text>

        {/* Row 2: Project Title & Document Number */}
        <text
          x={tbX + 10}
          y={tbY + 42}
          fill="#64748B"
          fontSize="7"
          fontFamily="monospace"
          fontWeight="bold"
        >
          TITLE:
        </text>
        <text
          x={tbX + 10}
          y={tbY + 56}
          fill="#F8FAFC"
          fontSize="11"
          fontFamily="monospace"
          fontWeight="bold"
        >
          {projectTitle.length > 36 ? `${projectTitle.slice(0, 36)}...` : projectTitle}
        </text>

        {/* Row 3: Date, Sheet & Engineer Details */}
        <text
          x={tbX + 10}
          y={tbY + 76}
          fill="#64748B"
          fontSize="7"
          fontFamily="monospace"
        >
          DATE: {todayStr}
        </text>
        <text
          x={tbX + 10}
          y={tbY + 90}
          fill="#94A3B8"
          fontSize="8"
          fontFamily="monospace"
        >
          ENG: LEAD HARDWARE R&D
        </text>

        {/* Sheet Number Box */}
        <text
          x={tbX + 190}
          y={tbY + 76}
          fill="#64748B"
          fontSize="7"
          fontFamily="monospace"
        >
          SIZE / SHEET:
        </text>
        <text
          x={tbX + 190}
          y={tbY + 90}
          fill="#F1F5F9"
          fontSize="9"
          fontFamily="monospace"
          fontWeight="bold"
        >
          A4 / 1 OF 1
        </text>

        {/* Scale Box */}
        <text
          x={tbX + 270}
          y={tbY + 76}
          fill="#64748B"
          fontSize="7"
          fontFamily="monospace"
        >
          SCALE / GRID:
        </text>
        <text
          x={tbX + 270}
          y={tbY + 90}
          fill="#10B981"
          fontSize="9"
          fontFamily="monospace"
          fontWeight="bold"
        >
          1:1 / 10px
        </text>
      </g>
    </g>
  );
}
