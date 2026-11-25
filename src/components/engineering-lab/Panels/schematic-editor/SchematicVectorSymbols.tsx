'use client';

import React from 'react';
import { CircuitComponent } from '@/modules/engineering-lab/types';

interface SchematicVectorSymbolProps {
  component: CircuitComponent;
  isSelected?: boolean;
  theme?: 'dark' | 'light';
  isGhost?: boolean;
  isWiringMode?: boolean;
  onPinClick?: (e: React.MouseEvent, compId: string, pinId: string, worldX: number, worldY: number) => void;
  onPinHover?: (pinId: string | null) => void;
  hoveredPinId?: string | null;
  onDoubleClick?: (e: React.MouseEvent, comp: CircuitComponent) => void;
}

/**
 * Pure SVG IEEE / IEC Vector Schematic Symbols
 * Renders authentic vector primitives directly inside SVG <g> elements.
 * 100% vector-safe, zero <div> wrappers inside SVG, compatible with standalone SVG exports & JSDOM.
 */
export function SchematicVectorSymbol({
  component,
  isSelected = false,
  theme = 'dark',
  isGhost = false,
  isWiringMode = true,
  onPinClick,
  onPinHover,
  hoveredPinId,
  onDoubleClick,
}: SchematicVectorSymbolProps) {
  const { type, value } = component;
  const rot = component.rotation ?? 0;
  const flipX = Boolean(component.mirrored);
  const flipY = false;
  const designator = component.designator || component.label?.split(' ')[0] || component.type?.slice(0, 3) || 'U';

  const strokeColor = isSelected ? '#10B981' : theme === 'dark' ? '#94A3B8' : '#7C1D1D';
  const fillColor = theme === 'dark' ? '#0F172A' : '#ECE8DC';
  const pinColor = isSelected ? '#34D399' : theme === 'dark' ? '#38BDF8' : '#9A3412';
  const strokeWidth = isSelected ? 2.2 : 1.8;

  const posX = component.x ?? 0;
  const posY = component.y ?? 0;

  const isMcu = [
    'MCU_ARDUINO_UNO',
    'MCU_ARDUINO_NANO',
    'MCU_ARDUINO_MEGA',
    'MCU_ESP32_WROOM',
    'MCU_ESP8266_NODEMCU',
    'MCU_RASPBERRY_PI_PICO',
    'MCU_STM32_BLUEPILL',
    'MCU_ATTINY85',
  ].includes(type);

  const isGround =
    type === 'GROUND' ||
    type === 'GND' ||
    type === 'POWER_GND' ||
    type.includes('GROUND') ||
    component.label?.toUpperCase().includes('GND') ||
    designator.toUpperCase().startsWith('GND');

  const isIC =
    !isMcu &&
    (type.includes('555') ||
      type.includes('IC_') ||
      type.includes('OPAMP') ||
      type.includes('COMPARATOR') ||
      type.includes('LOGIC') ||
      (component.pins && component.pins.length >= 4));

  // Derive pin boundary coordinates to prevent IC boxes burying pins & ensure 0.0px lead-to-pin stubs
  const pinXs = component.pins && component.pins.length > 0 ? component.pins.map((p) => p.x) : [0];
  const pinYs = component.pins && component.pins.length > 0 ? component.pins.map((p) => p.y) : [0];
  const pinMinX = Math.min(...pinXs);
  const pinMaxX = Math.max(...pinXs);
  const pinMinY = Math.min(...pinYs);
  const pinMaxY = Math.max(...pinYs);
  const pinSpanX = pinMaxX - pinMinX;
  const pinSpanY = pinMaxY - pinMinY;
  const hasPins = Boolean(component.pins && component.pins.length >= 2);

  const baseW = component.width
    ? Math.max(isMcu ? 140 : isIC ? 126 : 60, component.width)
    : isMcu ? 140 : isIC ? 126 : 60;
  const baseH = component.height
    ? Math.max(isMcu ? 180 : isIC ? 90 : 40, component.height)
    : isMcu ? 180 : isIC ? 90 : 40;

  const compW = hasPins ? Math.max(baseW, pinSpanX + 24) : baseW;
  const compH = hasPins ? Math.max(baseH, pinSpanY + 24) : baseH;
  const halfW = compW / 2;
  const halfH = compH / 2;

  // Render symbol-specific vector graphics inside pure SVG
  const renderSymbolGraphic = () => {
    if (isGround) {
      const p = component.pins?.[0] || { x: 0, y: -15 };
      return (
        <g className="sch-symbol-ground">
          <line x1={p.x} y1={p.y} x2={0} y2={0} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <line x1="-16" y1="0" x2="16" y2="0" stroke={strokeColor} strokeWidth={2.4} strokeLinecap="round" />
          <line x1="-10" y1="5" x2="10" y2="5" stroke={strokeColor} strokeWidth={2.0} strokeLinecap="round" />
          <line x1="-4" y1="10" x2="4" y2="10" stroke={strokeColor} strokeWidth={1.8} strokeLinecap="round" />
        </g>
      );
    }

    switch (type) {
      case 'RESISTOR': {
        const p1 = component.pins?.[0] || { x: -30, y: 0 };
        const p2 = component.pins?.[1] || { x: 30, y: 0 };
        const leftX = Math.min(p1.x, p2.x);
        const rightX = Math.max(p1.x, p2.x);
        return (
          <g className="sch-symbol-resistor">
            {/* Left lead to -18 */}
            <line x1={leftX} y1={0} x2={-18} y2={0} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            {/* Standard IEEE Resistor Zigzag */}
            <path
              d="M -18,0 L -14,-7 L -8,7 L -2,-7 L 4,7 L 10,-7 L 14,7 L 18,0"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Right lead from 18 to rightX */}
            <line x1={18} y1={0} x2={rightX} y2={0} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          </g>
        );
      }

      case 'POTENTIOMETER': {
        const p1 = component.pins?.[0] || { x: -30, y: 0 };
        const p2 = component.pins?.[1] || { x: 30, y: 0 };
        const leftX = Math.min(p1.x, p2.x);
        const rightX = Math.max(p1.x, p2.x);
        return (
          <g className="sch-symbol-potentiometer">
            <line x1={leftX} y1={0} x2={-18} y2={0} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            <path
              d="M -18,0 L -14,-7 L -8,7 L -2,-7 L 4,7 L 10,-7 L 14,7 L 18,0"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <line x1={18} y1={0} x2={rightX} y2={0} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            {/* Wiper Arrow */}
            <path
              d="M 0,20 L 0,8 M -4,12 L 0,8 L 4,12"
              stroke="#F59E0B"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        );
      }

      case 'CAPACITOR':
      case 'CAPACITOR_ELECTROLYTIC': {
        const isElectrolytic = type === 'CAPACITOR_ELECTROLYTIC' || Boolean(component.parameters?.polarized);
        const p1 = component.pins?.[0] || { x: -25, y: 0 };
        const p2 = component.pins?.[1] || { x: 25, y: 0 };
        const leftX = Math.min(p1.x, p2.x);
        const rightX = Math.max(p1.x, p2.x);
        return (
          <g className="sch-symbol-capacitor">
            {/* Leads */}
            <line x1={leftX} y1={0} x2={-6} y2={0} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            <line x1={6} y1={0} x2={rightX} y2={0} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            {/* Left Plate */}
            <line x1="-6" y1="-14" x2="-6" y2="14" stroke={strokeColor} strokeWidth={2.4} strokeLinecap="round" />
            {/* Right Plate (Curved for electrolytic, straight for ceramic) */}
            {isElectrolytic ? (
              <path d="M 6,-14 Q 10,0 6,14" stroke={strokeColor} strokeWidth={2.4} fill="none" strokeLinecap="round" />
            ) : (
              <line x1="6" y1="-14" x2="6" y2="14" stroke={strokeColor} strokeWidth={2.4} strokeLinecap="round" />
            )}
            {/* Positive polarity marker */}
            {isElectrolytic && (
              <text x="-12" y="-8" fill="#EF4444" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                +
              </text>
            )}
          </g>
        );
      }

      case 'INDUCTOR': {
        const p1 = component.pins?.[0] || { x: -25, y: 0 };
        const p2 = component.pins?.[1] || { x: 25, y: 0 };
        const leftX = Math.min(p1.x, p2.x);
        const rightX = Math.max(p1.x, p2.x);
        return (
          <g className="sch-symbol-inductor">
            <line x1={leftX} y1={0} x2={-18} y2={0} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            <path
              d="M -18,0 A 4.5,4.5 0 0,1 -9,0 A 4.5,4.5 0 0,1 0,0 A 4.5,4.5 0 0,1 9,0 A 4.5,4.5 0 0,1 18,0"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
            />
            <line x1={18} y1={0} x2={rightX} y2={0} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          </g>
        );
      }

      case 'BATTERY':
      case 'DC_VOLTAGE': {
        const p1 = component.pins?.[0] || { x: 0, y: -25 };
        const p2 = component.pins?.[1] || { x: 0, y: 25 };
        const topY = Math.min(p1.y, p2.y);
        const botY = Math.max(p1.y, p2.y);
        return (
          <g className="sch-symbol-battery">
            {/* Leads connecting body to exact pin coordinates */}
            <line x1={0} y1={topY} x2={0} y2={-12} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            <line x1={0} y1={12} x2={0} y2={botY} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            {/* Positive Long Plate */}
            <line x1="-16" y1="-12" x2="16" y2="-12" stroke={strokeColor} strokeWidth={2.5} strokeLinecap="round" />
            {/* Negative Short Plate */}
            <line x1="-9" y1="-4" x2="9" y2="-4" stroke={strokeColor} strokeWidth={3.5} strokeLinecap="round" />
            {/* Secondary Cell */}
            <line x1="-16" y1="4" x2="16" y2="4" stroke={strokeColor} strokeWidth={2.5} strokeLinecap="round" />
            <line x1="-9" y1="12" x2="9" y2="12" stroke={strokeColor} strokeWidth={3.5} strokeLinecap="round" />
            <text x="14" y="-14" fill="#EF4444" fontSize="9" fontWeight="bold" fontFamily="monospace">
              +
            </text>
          </g>
        );
      }

      case 'GROUND':
      case 'GND': {
        const p = component.pins?.[0] || { x: 0, y: -15 };
        return (
          <g className="sch-symbol-ground">
            <line x1={p.x} y1={p.y} x2={0} y2={0} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            <line x1="-14" y1="0" x2="14" y2="0" stroke={strokeColor} strokeWidth={2.2} strokeLinecap="round" />
            <line x1="-9" y1="5" x2="9" y2="5" stroke={strokeColor} strokeWidth={2.0} strokeLinecap="round" />
            <line x1="-4" y1="10" x2="4" y2="10" stroke={strokeColor} strokeWidth={1.8} strokeLinecap="round" />
          </g>
        );
      }

      case 'DIODE':
      case 'DIODE_1N4007':
      case 'ZENER_DIODE':
      case 'SCHOTTKY_DIODE': {
        const p1 = component.pins?.[0] || { x: -25, y: 0 };
        const p2 = component.pins?.[1] || { x: 25, y: 0 };
        const leftX = Math.min(p1.x, p2.x);
        const rightX = Math.max(p1.x, p2.x);
        return (
          <g className="sch-symbol-diode">
            <line x1={leftX} y1={0} x2={-8} y2={0} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            <polygon points="-8,-8 8,0 -8,8" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
            <line x1="8" y1="-8" x2="8" y2="8" stroke={strokeColor} strokeWidth={2.4} strokeLinecap="round" />
            <line x1="8" y1={0} x2={rightX} y2={0} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          </g>
        );
      }

      case 'LED': {
        const p1 = component.pins?.[0] || { x: -25, y: 0 };
        const p2 = component.pins?.[1] || { x: 25, y: 0 };
        const leftX = Math.min(p1.x, p2.x);
        const rightX = Math.max(p1.x, p2.x);
        return (
          <g className="sch-symbol-led">
            <line x1={leftX} y1={0} x2={-8} y2={0} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            <polygon points="-8,-8 8,0 -8,8" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
            <line x1="8" y1="-8" x2="8" y2="8" stroke={strokeColor} strokeWidth={2.4} strokeLinecap="round" />
            <line x1="8" y1={0} x2={rightX} y2={0} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            {/* Emission Arrows */}
            <path d="M 0,-10 L 6,-16 M 2,-16 L 6,-16 L 6,-12" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <path d="M 6,-6 L 12,-12 M 8,-12 L 12,-12 L 12,-8" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </g>
        );
      }

      case 'BJT_NPN':
      case 'TRANSISTOR_NPN': {
        const basePin = component.pins?.find((p) => p.id === 'B' || p.x < 0) || { x: -25, y: 0 };
        const colPin = component.pins?.find((p) => p.id === 'C' || (p.x > 0 && p.y < 0)) || { x: 10, y: -25 };
        const emPin = component.pins?.find((p) => p.id === 'E' || (p.x > 0 && p.y > 0)) || { x: 10, y: 25 };
        return (
          <g className="sch-symbol-npn">
            <circle cx="0" cy="0" r="18" stroke={strokeColor} strokeWidth="1.4" fill={fillColor} />
            <line x1={basePin.x} y1={basePin.y} x2={-10} y2={0} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            <line x1="-10" y1="-12" x2="-10" y2="12" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            {/* Collector */}
            <line x1="-10" y1="-6" x2={colPin.x} y2="-16" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            <line x1={colPin.x} y1="-16" x2={colPin.x} y2={colPin.y} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            {/* Emitter with Arrow pointing OUT */}
            <line x1="-10" y1="6" x2={emPin.x} y2="16" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            <polygon points={`${emPin.x},16 ${emPin.x - 5},11 ${emPin.x - 2},9`} fill={strokeColor} stroke={strokeColor} />
            <line x1={emPin.x} y1="16" x2={emPin.x} y2={emPin.y} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          </g>
        );
      }

      case 'BJT_PNP':
      case 'TRANSISTOR_PNP': {
        const basePin = component.pins?.find((p) => p.id === 'B' || p.x < 0) || { x: -25, y: 0 };
        const colPin = component.pins?.find((p) => p.id === 'C' || (p.x > 0 && p.y < 0)) || { x: 10, y: -25 };
        const emPin = component.pins?.find((p) => p.id === 'E' || (p.x > 0 && p.y > 0)) || { x: 10, y: 25 };
        return (
          <g className="sch-symbol-pnp">
            <circle cx="0" cy="0" r="18" stroke={strokeColor} strokeWidth="1.4" fill={fillColor} />
            <line x1={basePin.x} y1={basePin.y} x2={-10} y2={0} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            <line x1="-10" y1="-12" x2="-10" y2="12" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            {/* Collector */}
            <line x1="-10" y1="6" x2={colPin.x} y2="16" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            <line x1={colPin.x} y1="16" x2={colPin.x} y2={colPin.y} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            {/* Emitter with Arrow pointing IN */}
            <line x1="-10" y1="-6" x2={emPin.x} y2="-16" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            <polygon points="-8,-5 -3,-10 -2,-7" fill={strokeColor} stroke={strokeColor} />
            <line x1={emPin.x} y1="-16" x2={emPin.x} y2={emPin.y} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          </g>
        );
      }

      case 'TIMER_555':
      case 'OPAMP_LM358':
      case 'OPAMP_LM324':
      case 'OPAMP_LM741':
      case 'COMPARATOR_LM393':
      case 'IC_74HC14':
      case 'IC_74HC04':
      case 'IC_74HC00':
      case 'IC_74HC08':
      case 'IC_74HC32':
      case 'IC_74HC86':
      case 'LOGIC_74HC595':
      case 'LOGIC_CD4017':
      case 'IC_ULN2003':
      case 'IC_L293D':
      default: {
        // Multi-Pin Integrated Circuit or MCU Module
        // Derive package body span from pin coordinates so IC box NEVER grows wider than pinMaxX - pinMinX and buries pins!
        const leadLen = 14;
        const icHalfW = hasPins && pinSpanX > 0
          ? Math.max(22, Math.min(compW / 2, pinSpanX / 2 - leadLen))
          : Math.max(22, compW / 2 - 20);
        const icW = icHalfW * 2;
        const icHalfH = hasPins && pinSpanY > 0
          ? Math.max(28, Math.max(compH / 2, pinSpanY / 2 + 10))
          : compH / 2;
        const icH = icHalfH * 2;

        return (
          <g className="sch-symbol-ic">
            {/* Main IC Package Body */}
            <rect
              x={-icHalfW}
              y={-icHalfH}
              width={icW}
              height={icH}
              rx="4"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              className="drop-shadow-sm"
            />
            {/* Package Alignment U-Notch */}
            <path
              d={`M -7,${-icHalfH} A 7,7 0 0,0 7,${-icHalfH}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.8"
            />
            {/* Center Label for IC or MCU */}
            <text
              x="0"
              y="-4"
              textAnchor="middle"
              fill={theme === 'dark' ? '#E2E8F0' : '#1E293B'}
              fontSize={isMcu ? '11' : '10'}
              fontWeight="bold"
              fontFamily="monospace"
              className="select-none"
            >
              {isMcu ? component.label?.split(' ')[0] || type.replace('MCU_', '') : value || type.replace('IC_', '')}
            </text>

            {/* Pin Stubs & Pin Name Labels extending from IC Body */}
            {component.pins?.map((pin) => {
              const isLeft = pin.x < 0;
              const isRight = pin.x > 0;
              const isTop = pin.y < 0 && Math.abs(pin.y) > icHalfH - 5;
              const isBottom = pin.y > 0 && pin.y > icHalfH - 5;

              // Lead stub connecting package boundary directly to terminal (0.0px gap)
              let stubX1 = 0;
              let stubY1 = pin.y;
              if (isLeft) stubX1 = -icHalfW;
              else if (isRight) stubX1 = icHalfW;
              else if (isTop) {
                stubX1 = pin.x;
                stubY1 = -icHalfH;
              } else if (isBottom) {
                stubX1 = pin.x;
                stubY1 = icHalfH;
              }

              return (
                <g key={`stub_${pin.id}`}>
                  {/* Pin Lead Line */}
                  <line
                    x1={stubX1}
                    y1={stubY1}
                    x2={pin.x}
                    y2={pin.y}
                    stroke={theme === 'dark' ? '#64748B' : '#94A3B8'}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  {/* Pin Name Text Inside Body */}
                  {pin.name && (
                    <text
                      x={isLeft ? -icHalfW + 5 : isRight ? icHalfW - 5 : pin.x}
                      y={pin.y + 3}
                      textAnchor={isLeft ? 'start' : isRight ? 'end' : 'middle'}
                      fill={theme === 'dark' ? '#94A3B8' : '#475569'}
                      fontSize="8"
                      fontFamily="monospace"
                      fontWeight="500"
                    >
                      {pin.name}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      }
    }
  };

  return (
    <g
      data-testid={`sch-comp-${component.id}`}
      data-comp-id={component.id}
      data-comp-type={type}
      transform={`translate(${posX}, ${posY}) rotate(${rot}) scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`}
      className={`sch-component ${isGhost ? 'pointer-events-none' : 'cursor-move'} select-none ${isSelected ? 'sch-selected' : ''}`}
      onDoubleClick={(e) => !isGhost && onDoubleClick && onDoubleClick(e, component)}
    >
      {/* Transparent Click Hit-Box covering entire component footprint */}
      <rect
        data-testid={`sch-comp-hit-${component.id}`}
        x={-halfW - 6}
        y={-halfH - 6}
        width={compW + 12}
        height={compH + 12}
        fill="transparent"
        pointerEvents={isGhost ? 'none' : 'all'}
      />

      {/* Selection Glow / Reticle */}
      {isSelected && !isGhost && (
        <rect
          x={-halfW - 8}
          y={-halfH - 8}
          width={compW + 16}
          height={compH + 16}
          rx="6"
          fill="rgba(16, 185, 129, 0.08)"
          stroke="#10B981"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          className="pointer-events-none"
        />
      )}

      {/* Real Vector Schematic Symbol Graphic */}
      {renderSymbolGraphic()}

      {/* Reference Designator (U1, R1, C1, LED1, BT1) - Keep upright & unmirrored */}
      <g transform={`scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1}) rotate(${-rot})`}>
        <text
          data-testid={`sch-designator-${component.id}`}
          x="0"
          y={-halfH - 8}
          textAnchor="middle"
          fill={theme === 'dark' ? '#34D399' : '#0F5132'}
          fontSize="11"
          fontWeight="bold"
          fontFamily="monospace"
          className="pointer-events-none drop-shadow-sm select-none"
        >
          {designator}
        </text>

        {/* Component Nominal Value (10kΩ, 100nF, NE555) - Placed cleanly below symbol (suppressed for GND/0V) */}
        {!isGround && value && value !== '0V' && (
          <text
            data-testid={`sch-value-${component.id}`}
            x="0"
            y={halfH + 16}
            textAnchor="middle"
            fill={theme === 'dark' ? '#CBD5E1' : '#1E242B'}
            fontSize="10"
            fontWeight="600"
            fontFamily="monospace"
            className="pointer-events-none drop-shadow-sm select-none"
          >
            {value}
          </text>
        )}
      </g>

      {/* Interactive Pin Connection Terminals */}
      {!isGhost &&
        component.pins?.map((pin) => {
          const isHovered = hoveredPinId === `${component.id}:${pin.id}`;
          // Compute rotated & flipped world coordinates
          let px = pin.x;
          const py = pin.y;
          if (flipX) px = -px;
          const rad = (rot * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const wx = Math.round(posX + px * cos - py * sin);
          const wy = Math.round(posY + px * sin + py * cos);

          return (
            <g
              key={pin.id}
              data-testid={`sch-pin-${component.id}-${pin.id}`}
              data-pin-id={pin.id}
              data-comp-id={component.id}
              data-local-x={pin.x}
              data-local-y={pin.y}
              transform={`translate(${pin.x}, ${pin.y})`}
              className={isWiringMode ? "cursor-pointer group/pin" : "group/pin"}
              onMouseDown={(e) => {
                if (isWiringMode && onPinClick) {
                  e.stopPropagation();
                  onPinClick(e, component.id, pin.id, wx, wy);
                }
              }}
              onClick={(e) => {
                if (isWiringMode) {
                  e.stopPropagation();
                }
              }}
              onMouseEnter={() => onPinHover && onPinHover(`${component.id}:${pin.id}`)}
              onMouseLeave={() => onPinHover && onPinHover(null)}
            >
              {/* Transparent Hit Target for Pin (Radius 11 active in wiring mode, none in select mode) */}
              <circle
                r={isWiringMode ? 11 : 0}
                fill="transparent"
                pointerEvents={isWiringMode ? "all" : "none"}
              />
              {/* Visual Snap Target Ring */}
              <circle
                r={isHovered ? 6 : 4}
                fill={isHovered ? '#10B981' : theme === 'dark' ? '#0F172A' : '#ECE8DC'}
                stroke={isHovered ? '#D97706' : pinColor}
                strokeWidth={isHovered ? 2.5 : 1.6}
                pointerEvents={isWiringMode ? "all" : "none"}
                className="transition-all"
              />
              {/* Hover Tooltip Flag */}
              {isHovered && (
                <g transform="translate(0, -14)" className="pointer-events-none">
                  <rect
                    x="-20"
                    y="-10"
                    width="40"
                    height="14"
                    rx="3"
                    fill="#0B1528"
                    stroke="#38BDF8"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    fill="#38BDF8"
                    fontSize="8"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {pin.name || pin.id}
                  </text>
                </g>
              )}
            </g>
          );
        })}
    </g>
  );
}
