'use client';

import React from 'react';
import { CircuitComponent, CircuitWire } from '@/modules/engineering-lab/types';

interface SchematicSymbolProps {
  component: CircuitComponent;
  isSelected?: boolean;
  isSimulating?: boolean;
  wires?: CircuitWire[];
  wireCurrents?: Record<string, number>;
  simState?: {
    voltage: number;
    current: number;
    on?: boolean;
    brightness?: number;
    status?: 'NORMAL' | 'WARNING' | 'BURNED';
    burned?: boolean;
    fault?: string;
    digitalOut?: number;
    pwrLed?: boolean;
    channels?: { r: number; g: number; b: number };
    onRed?: boolean;
    onGreen?: boolean;
    onBlue?: boolean;
    redBrightness?: number;
    greenBrightness?: number;
    blueBrightness?: number;
    [key: string]: unknown;
  };
  simulationState?: {
    voltage: number;
    current: number;
    on?: boolean;
    brightness?: number;
    status?: 'NORMAL' | 'WARNING' | 'BURNED';
    burned?: boolean;
    fault?: string;
    digitalOut?: number;
    pwrLed?: boolean;
    channels?: { r: number; g: number; b: number };
    onRed?: boolean;
    onGreen?: boolean;
    onBlue?: boolean;
    redBrightness?: number;
    greenBrightness?: number;
    blueBrightness?: number;
    [key: string]: unknown;
  };
}

/**
 * Standard IEEE / IEC Electrical Schematic Symbols
 * Renders professional vector schematic symbols with proper pins, reference designators, and values.
 */
export function SchematicSymbol({
  component,
  isSelected,
  isSimulating,
  wires,
  wireCurrents,
  simState: incomingSimState,
  simulationState,
}: SchematicSymbolProps) {
  const simState = incomingSimState || simulationState;
  const { type, value, rotation, mirrored } = component;
  const designator = component.designator || component.label.split(' ')[0] || component.type.slice(0, 3);
  const strokeColor = isSelected ? '#34D399' : '#94A3B8';
  const fillColor = '#0B1528';

  // Render symbol-specific vector graphics
  const renderSymbolGraphic = () => {
    switch (type) {
      case 'RESISTOR': {
        const isBurned = simState?.status === 'BURNED' || Boolean(simState?.burned);
        return (
          <g>
            {isBurned && (
              <text x="0" y="-12" fill="#EF4444" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                💥 BURNED
              </text>
            )}
            {/* Standard IEEE Zigzag Waveform */}
            <path
              d="M -30,0 L -18,0 L -14,-7 L -8,7 L -2,-7 L 4,7 L 10,-7 L 14,7 L 18,0 L 30,0"
              stroke={isBurned ? '#EF4444' : strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={isBurned ? '4 2' : undefined}
              fill="none"
            />
          </g>
        );
      }

      case 'POTENTIOMETER':
        return (
          <g>
            {/* Resistor Body */}
            <path
              d="M -30,0 L -18,0 L -14,-7 L -8,7 L -2,-7 L 4,7 L 10,-7 L 14,7 L 18,0 L 30,0"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Wiper Arrow pointing from top-center */}
            <path
              d="M 0,20 L 0,8 M -4,12 L 0,8 L 4,12"
              stroke="#F59E0B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        );

      case 'CAPACITOR':
      case 'CAPACITOR_ELECTROLYTIC': {
        const isPolarized = (component.parameters?.polarized as boolean) ?? (value.includes('µ') || value.includes('u'));
        return (
          <g>
            {/* Left Lead & Plate */}
            <line x1="-25" y1="0" x2="-7" y2="0" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="-7" y1="-14" x2="-7" y2="14" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            
            {/* Right Plate (Curved if polarized, straight if non-polarized) */}
            {isPolarized ? (
              <path
                d="M 7,-14 Q 3,0 7,14"
                stroke={strokeColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            ) : (
              <line x1="7" y1="-14" x2="7" y2="14" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            )}
            <line x1="7" y1="0" x2="25" y2="0" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />

            {/* Positive (+) indicator for electrolytic */}
            {isPolarized && (
              <text x="-16" y="-8" fill="#10B981" fontSize="10" fontWeight="bold" fontFamily="monospace">
                +
              </text>
            )}
          </g>
        );
      }

      case 'INDUCTOR':
        return (
          <g>
            {/* 4 Choke Loops */}
            <path
              d="M -30,0 L -20,0 A 5,5 0 0,1 -10,0 A 5,5 0 0,1 0,0 A 5,5 0 0,1 10,0 A 5,5 0 0,1 20,0 L 30,0"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        );

      case 'DC_VOLTAGE':
      case 'BATTERY':
        return (
          <g>
            {/* Top Positive Lead */}
            <line x1="0" y1="-25" x2="0" y2="-9" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            {/* Long thin Positive Plate */}
            <line x1="-16" y1="-9" x2="16" y2="-9" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
            {/* Short thick Negative Plate */}
            <line x1="-8" y1="-1" x2="8" y2="-1" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" />
            {/* Second cell (Long +) */}
            <line x1="-16" y1="7" x2="16" y2="7" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            {/* Second cell (Short -) */}
            <line x1="-8" y1="15" x2="8" y2="15" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" />
            {/* Bottom Negative Lead */}
            <line x1="0" y1="15" x2="0" y2="25" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />

            {/* Polarity Markers */}
            <text x="14" y="-12" fill="#10B981" fontSize="12" fontWeight="bold" fontFamily="monospace">
              +
            </text>
            <text x="14" y="22" fill="#64748B" fontSize="12" fontWeight="bold" fontFamily="monospace">
              -
            </text>
          </g>
        );

      case 'AC_SOURCE':
      case 'FUNCTION_GENERATOR':
        return (
          <g>
            {/* Top/Bottom Leads */}
            <line x1="0" y1="-25" x2="0" y2="-16" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="16" x2="0" y2="25" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            {/* Center Circular Generator Body */}
            <circle cx="0" cy="0" r="16" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            {/* Sine Wave Glyph inside */}
            <path
              d="M -10,0 Q -5,-8 0,0 T 10,0"
              stroke="#38BDF8"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        );

      case 'GROUND':
      case 'GND':
        return (
          <g>
            {/* Vertical Stem */}
            <line x1="0" y1="-15" x2="0" y2="0" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            {/* 3 Descending Earth Bars */}
            <line x1="-14" y1="0" x2="14" y2="0" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="-9" y1="5" x2="9" y2="5" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="-4" y1="10" x2="4" y2="10" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          </g>
        );

      case 'DIODE':
      case 'DIODE_1N4007':
        return (
          <g>
            {/* Anode lead */}
            <line x1="-25" y1="0" x2="-10" y2="0" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            {/* Diode Triangle */}
            <polygon
              points="-10,-10 10,0 -10,10"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Cathode Bar */}
            <line x1="10" y1="-10" x2="10" y2="10" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            {/* Cathode lead */}
            <line x1="10" y1="0" x2="25" y2="0" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            {/* Terminal Silkscreen Labels */}
            <text x="-20" y="-4" fill="#94A3B8" fontSize="6.5" fontWeight="bold">A</text>
            <text x="16" y="-4" fill="#94A3B8" fontSize="6.5" fontWeight="bold">K</text>
          </g>
        );

      case 'LED': {
        const isBurned = simState?.status === 'BURNED' || Boolean(simState?.burned);
        const brightness = simState?.brightness !== undefined ? simState.brightness : (simState?.on ? 1.0 : 0);
        const isConducting = !isBurned && brightness > 0;
        const ledParamColor = String(component.parameters?.color || 'Red');
        const colorLower = ledParamColor.toLowerCase();
        let ledHex = '#EF4444'; // Red default
        if (ledParamColor.startsWith('#')) {
          ledHex = ledParamColor;
        } else if (colorLower.includes('blue')) {
          ledHex = '#3B82F6';
        } else if (colorLower.includes('green')) {
          ledHex = '#10B981';
        } else if (colorLower.includes('amber') || colorLower.includes('yellow')) {
          ledHex = '#F59E0B';
        } else if (colorLower.includes('white')) {
          ledHex = '#F8FAFC';
        } else if (colorLower.includes('purple') || colorLower.includes('violet')) {
          ledHex = '#A855F7';
        } else if (colorLower.includes('cyan')) {
          ledHex = '#06B6D4';
        }

        const glowRadius = Math.round(12 + 16 * brightness);
        const glowOpacity = Math.max(0.15, Math.min(0.85, 0.15 + 0.7 * brightness));

        return (
          <g>
            {/* Active Proportional Luminescence Glow Aura */}
            {isSimulating && isConducting && (
              <circle cx="0" cy="0" r={glowRadius} fill={ledHex} opacity={glowOpacity} filter="blur(3px)" />
            )}
            {/* Burned Fault Text */}
            {isBurned && (
              <text x="0" y="-14" fill="#EF4444" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                💥 BURNED
              </text>
            )}
            {/* Anode lead */}
            <line x1="-25" y1="0" x2="-10" y2="0" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            {/* Diode Triangle */}
            <polygon
              points="-10,-10 10,0 -10,10"
              fill={isBurned ? '#262626' : ledHex}
              fillOpacity={isBurned ? 0.9 : isConducting ? 0.35 + 0.65 * brightness : 0.35}
              stroke={isBurned ? '#7F1D1D' : ledHex}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Cathode Bar */}
            <line x1="10" y1="-10" x2="10" y2="10" stroke={isBurned ? '#7F1D1D' : ledHex} strokeWidth="2.5" strokeLinecap="round" />
            {/* Cathode lead */}
            <line x1="10" y1="0" x2="25" y2="0" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            {/* Emitted Photon Arrows in active LED color */}
            {!isBurned && (
              <path
                d="M 2,-8 L 10,-16 M 8,-16 L 10,-16 L 10,-14 M 8,-4 L 16,-12 M 14,-12 L 16,-12 L 16,-10"
                stroke={ledHex}
                strokeWidth="1.5"
                opacity={isConducting ? 0.4 + 0.6 * brightness : 0.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </g>
        );
      }

      case 'BJT_NPN':
      case 'TRANSISTOR_NPN':
        return (
          <g>
            {/* Transistor Circle */}
            <circle cx="0" cy="0" r="18" stroke={strokeColor} strokeWidth="1.5" fill={fillColor} />
            {/* Base Lead & Vertical Bar */}
            <line x1="-25" y1="0" x2="-8" y2="0" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="-8" y1="-12" x2="-8" y2="12" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            {/* Collector Branch (Up) */}
            <line x1="-8" y1="-6" x2="12" y2="-16" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="-16" x2="12" y2="-25" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            {/* Emitter Branch (Down with arrow) */}
            <line x1="-8" y1="6" x2="12" y2="16" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="16" x2="12" y2="25" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            {/* Outgoing Arrow on Emitter for NPN */}
            <polygon points="12,16 6,12 8,17" fill={strokeColor} />
            {/* Pin Labels */}
            <text x="-21" y="-4" fill="#94A3B8" fontSize="6.5" fontWeight="bold">B</text>
            <text x="15" y="-17" fill="#94A3B8" fontSize="6.5" fontWeight="bold">C</text>
            <text x="15" y="21" fill="#94A3B8" fontSize="6.5" fontWeight="bold">E</text>
          </g>
        );

      case 'BJT_PNP':
      case 'TRANSISTOR_PNP':
        return (
          <g>
            {/* Transistor Circle */}
            <circle cx="0" cy="0" r="18" stroke={strokeColor} strokeWidth="1.5" fill={fillColor} />
            {/* Base Lead & Vertical Bar */}
            <line x1="-25" y1="0" x2="-8" y2="0" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="-8" y1="-12" x2="-8" y2="12" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            {/* Collector Branch (Up) */}
            <line x1="-8" y1="-6" x2="12" y2="-16" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="-16" x2="12" y2="-25" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            {/* Emitter Branch (Down) */}
            <line x1="-8" y1="6" x2="12" y2="16" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="16" x2="12" y2="25" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            {/* Inward Arrow on Emitter pointing toward Base for PNP */}
            <polygon points="-5,7 1,12 2,6" fill={strokeColor} />
            {/* Pin Labels */}
            <text x="-21" y="-4" fill="#94A3B8" fontSize="6.5" fontWeight="bold">B</text>
            <text x="15" y="-17" fill="#94A3B8" fontSize="6.5" fontWeight="bold">C</text>
            <text x="15" y="21" fill="#94A3B8" fontSize="6.5" fontWeight="bold">E</text>
          </g>
        );

      case 'MOSFET_N':
        return (
          <g>
            <circle cx="0" cy="0" r="20" stroke={strokeColor} strokeWidth="1.5" fill={fillColor} />
            {/* Gate at y=0 matching catalog pin */}
            <line x1="-25" y1="0" x2="-8" y2="0" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="-8" y1="-12" x2="-8" y2="12" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            {/* Dielectric Gap & Channel */}
            <line x1="-3" y1="-12" x2="-3" y2="-6" stroke={strokeColor} strokeWidth="2" />
            <line x1="-3" y1="-3" x2="-3" y2="3" stroke={strokeColor} strokeWidth="2" />
            <line x1="-3" y1="6" x2="-3" y2="12" stroke={strokeColor} strokeWidth="2" />
            {/* Drain & Source */}
            <path d="M -3,-10 L 12,-10 L 12,-25" stroke={strokeColor} strokeWidth="2" fill="none" />
            <path d="M -3,10 L 12,10 L 12,25" stroke={strokeColor} strokeWidth="2" fill="none" />
            <path d="M -3,0 L 6,0 L 6,10" stroke={strokeColor} strokeWidth="1.5" fill="none" />
            {/* Inward Arrow for N-Channel */}
            <polygon points="-3,0 4,-3 4,3" fill={strokeColor} />
            {/* Pin Labels */}
            <text x="-21" y="-4" fill="#94A3B8" fontSize="6.5" fontWeight="bold">G</text>
            <text x="15" y="-17" fill="#94A3B8" fontSize="6.5" fontWeight="bold">D</text>
            <text x="15" y="21" fill="#94A3B8" fontSize="6.5" fontWeight="bold">S</text>
          </g>
        );

      case 'MOSFET_P':
        return (
          <g>
            <circle cx="0" cy="0" r="20" stroke={strokeColor} strokeWidth="1.5" fill={fillColor} />
            {/* Gate at y=0 matching catalog pin */}
            <line x1="-25" y1="0" x2="-8" y2="0" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="-8" y1="-12" x2="-8" y2="12" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            {/* Dielectric Gap & Channel */}
            <line x1="-3" y1="-12" x2="-3" y2="-6" stroke={strokeColor} strokeWidth="2" />
            <line x1="-3" y1="-3" x2="-3" y2="3" stroke={strokeColor} strokeWidth="2" />
            <line x1="-3" y1="6" x2="-3" y2="12" stroke={strokeColor} strokeWidth="2" />
            {/* Drain & Source */}
            <path d="M -3,-10 L 12,-10 L 12,-25" stroke={strokeColor} strokeWidth="2" fill="none" />
            <path d="M -3,10 L 12,10 L 12,25" stroke={strokeColor} strokeWidth="2" fill="none" />
            <path d="M -3,0 L 6,0 L 6,10" stroke={strokeColor} strokeWidth="1.5" fill="none" />
            {/* Outward Arrow for P-Channel */}
            <polygon points="4,0 -3,-3 -3,3" fill={strokeColor} />
            {/* Pin Labels */}
            <text x="-21" y="-4" fill="#94A3B8" fontSize="6.5" fontWeight="bold">G</text>
            <text x="15" y="-17" fill="#94A3B8" fontSize="6.5" fontWeight="bold">D</text>
            <text x="15" y="21" fill="#94A3B8" fontSize="6.5" fontWeight="bold">S</text>
          </g>
        );

      case 'TIMER_555': {
        const isBurned = simState?.status === 'BURNED' || Boolean(simState?.burned);
        return (
          <g>
            {/* Professional DIP-8 IC Body */}
            <rect
              x="-40"
              y="-45"
              width="80"
              height="90"
              rx="4"
              stroke={isBurned ? '#EF4444' : strokeColor}
              strokeWidth="2"
              fill={isBurned ? '#1C1917' : fillColor}
            />
            {isBurned && (
              <text
                x="0"
                y="-14"
                fill="#EF4444"
                fontSize="8"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="middle"
              >
                💥 OVERVOLT
              </text>
            )}
            {/* Top Alignment Notch */}
            <path
              d="M -8,-45 A 8,8 0 0,0 8,-45"
              stroke={isBurned ? '#EF4444' : strokeColor}
              strokeWidth="1.5"
              fill="none"
            />
            {/* IC Identifier */}
            <text
              x="0"
              y="-28"
              fill={isBurned ? '#EF4444' : '#F8FAFC'}
              fontSize="11"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
            >
              NE555
            </text>

            {/* Left Pins: 1 GND, 2 TRIG, 4 RESET, 6 THRESH */}
            <g fontSize="8" fontFamily="monospace" fontWeight="bold">
              <text x="-34" y="-27" fill="#64748B">GND (1)</text>
              <text x="-34" y="-7" fill="#38BDF8">TRG (2)</text>
              <text x="-34" y="13" fill="#F59E0B">RST (4)</text>
              <text x="-34" y="33" fill="#38BDF8">THR (6)</text>
            </g>

            {/* Right Pins: 7 DISCH, 3 OUT, 5 CTRL, 8 VCC */}
            <g fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="end">
              <text x="34" y="-27" fill="#A855F7">DIS (7)</text>
              <text x="34" y="-7" fill="#10B981">OUT (3)</text>
              <text x="34" y="13" fill="#64748B">CV (5)</text>
              <text x="34" y="33" fill="#EF4444">VCC (8)</text>
            </g>

            {/* Output State Indicator */}
            {isSimulating && (
              <circle
                cx="0"
                cy="18"
                r="6"
                fill={simState?.on ? '#10B981' : '#334155'}
                stroke="#64748B"
                strokeWidth="1"
              />
            )}
          </g>
        );
      }

      case 'SWITCH_SPST': {
        const isClosed = Boolean(component.parameters?.closed);
        return (
          <g>
            <circle cx="-25" cy="0" r="3" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <circle cx="25" cy="0" r="3" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            {isClosed ? (
              <line x1="-22" y1="0" x2="22" y2="0" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
            ) : (
              <line x1="-22" y1="0" x2="16" y2="-15" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            )}
          </g>
        );
      }

      case 'PUSHBUTTON':
        return (
          <g>
            <circle cx="-25" cy="0" r="3" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <circle cx="25" cy="0" r="3" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            {/* Plunger */}
            <line x1="-22" y1="-8" x2="22" y2="-8" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="0" y1="-8" x2="0" y2="-20" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="-8" y1="-20" x2="8" y2="-20" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
          </g>
        );

      case 'METER_VOLTMETER': {
        const measuredV = simState ? simState.voltage : 0;
        return (
          <g>
            <circle cx="0" cy="0" r="24" stroke={isSelected ? '#34D399' : '#38BDF8'} strokeWidth="2.5" fill="#0B1E36" />
            <line x1="0" y1="-28" x2="0" y2="-24" stroke="#38BDF8" strokeWidth="2" />
            <line x1="0" y1="24" x2="0" y2="28" stroke="#38BDF8" strokeWidth="2" />
            <text x="0" y="-7" fill="#38BDF8" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              V (DC)
            </text>
            <rect x="-20" y="2" width="40" height="15" rx="3" fill="#030712" stroke="#1E293B" />
            <text x="0" y="13" fill="#34D399" fontSize="9.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              {measuredV.toFixed(2)}V
            </text>
          </g>
        );
      }

      case 'METER_AMMETER': {
        const measuredI = simState ? simState.current : 0;
        const dispCurrent = Math.abs(measuredI) >= 1 ? `${measuredI.toFixed(2)}A` : `${(measuredI * 1000).toFixed(1)}mA`;
        return (
          <g>
            <circle cx="0" cy="0" r="22" stroke={isSelected ? '#34D399' : '#F59E0B'} strokeWidth="2.5" fill="#1C1917" />
            <line x1="-30" y1="0" x2="-22" y2="0" stroke="#F59E0B" strokeWidth="2" />
            <line x1="22" y1="0" x2="30" y2="0" stroke="#F59E0B" strokeWidth="2" />
            <text x="0" y="-6" fill="#F59E0B" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              A (DC)
            </text>
            <rect x="-18" y="2" width="36" height="14" rx="2" fill="#0C0A09" stroke="#292524" />
            <text x="0" y="12" fill="#FCD34D" fontSize="8.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              {dispCurrent}
            </text>
          </g>
        );
      }

      case 'METER_MULTIMETER': {
        const measuredV = simState ? simState.voltage : 0;
        return (
          <g>
            {/* DMM Body */}
            <rect x="-35" y="-30" width="70" height="60" rx="6" stroke="#F59E0B" strokeWidth="2" fill="#1E293B" />
            {/* LCD Display */}
            <rect x="-28" y="-22" width="56" height="20" rx="2" fill="#020617" stroke="#334155" />
            <text x="0" y="-8" fill="#38BDF8" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              {measuredV.toFixed(2)} V
            </text>
            {/* Mode Switch Dial */}
            <circle cx="0" cy="10" r="8" fill="#0F172A" stroke="#F59E0B" strokeWidth="1.5" />
            <line x1="0" y1="10" x2="0" y2="3" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
            {/* Terminals */}
            <circle cx="-15" cy="24" r="3" fill="#EF4444" />
            <circle cx="15" cy="24" r="3" fill="#000000" stroke="#64748B" />
          </g>
        );
      }

      case 'OPAMP_LM358':
        return (
          <g>
            {/* OpAmp Triangle */}
            <polygon points="-30,-25 25,0 -30,25" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            {/* Inverting (-) symbol */}
            <line x1="-24" y1="-12" x2="-16" y2="-12" stroke="#94A3B8" strokeWidth="2" />
            {/* Non-inverting (+) symbol */}
            <line x1="-24" y1="12" x2="-16" y2="12" stroke="#94A3B8" strokeWidth="2" />
            <line x1="-20" y1="8" x2="-20" y2="16" stroke="#94A3B8" strokeWidth="2" />
            {/* Input / Output Leads */}
            <line x1="-35" y1="-12" x2="-30" y2="-12" stroke={strokeColor} strokeWidth="2" />
            <line x1="-35" y1="12" x2="-30" y2="12" stroke={strokeColor} strokeWidth="2" />
            <line x1="25" y1="0" x2="35" y2="0" stroke={strokeColor} strokeWidth="2" />
            {/* Power rails VCC & VEE */}
            <line x1="0" y1="-30" x2="0" y2="-14" stroke={strokeColor} strokeWidth="1.5" />
            <line x1="0" y1="14" x2="0" y2="30" stroke={strokeColor} strokeWidth="1.5" />
            <text x="5" y="-18" fill="#10B981" fontSize="7" fontFamily="monospace">V+</text>
            <text x="5" y="24" fill="#64748B" fontSize="7" fontFamily="monospace">V-</text>
          </g>
        );

      case 'LOGIC_AND':
      case 'LOGIC_OR':
      case 'LOGIC_NOT':
      case 'LOGIC_NAND':
      case 'LOGIC_NOR':
      case 'LOGIC_XOR':
      case 'LOGIC_XNOR': {
        const isNot = type === 'LOGIC_NOT';
        const isAnd = type === 'LOGIC_AND' || type === 'LOGIC_NAND';
        const isOr = type === 'LOGIC_OR' || type === 'LOGIC_NOR';
        const isXor = type === 'LOGIC_XOR' || type === 'LOGIC_XNOR';
        const hasBubble = type === 'LOGIC_NAND' || type === 'LOGIC_NOR' || type === 'LOGIC_XNOR' || isNot;

        return (
          <g>
            {isAnd && (
              <path
                d="M -20,-16 L -2,-16 A 16,16 0 0,1 -2,16 L -20,16 Z"
                stroke={strokeColor}
                strokeWidth="2"
                fill={fillColor}
              />
            )}
            {isOr && (
              <path
                d="M -20,-16 Q -10,0 -20,16 Q 0,16 16,0 Q 0,-16 -20,-16 Z"
                stroke={strokeColor}
                strokeWidth="2"
                fill={fillColor}
              />
            )}
            {isXor && (
              <g>
                <path d="M -25,-16 Q -15,0 -25,16" stroke={strokeColor} strokeWidth="2" fill="none" />
                <path
                  d="M -20,-16 Q -10,0 -20,16 Q 0,16 16,0 Q 0,-16 -20,-16 Z"
                  stroke={strokeColor}
                  strokeWidth="2"
                  fill={fillColor}
                />
              </g>
            )}
            {isNot && (
              <polygon points="-20,-14 8,0 -20,14" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            )}
            {/* Inversion Bubble if applicable */}
            {hasBubble && (
              <circle cx={isNot ? 12 : 19} cy="0" r="3" stroke={strokeColor} strokeWidth="1.5" fill={fillColor} />
            )}
            {/* Input & Output leads */}
            <line x1="-30" y1="-8" x2={isXor ? -25 : -20} y2="-8" stroke={strokeColor} strokeWidth="2" />
            {!isNot && (
              <line x1="-30" y1="8" x2={isXor ? -25 : -20} y2="8" stroke={strokeColor} strokeWidth="2" />
            )}
            <line x1={hasBubble ? (isNot ? 15 : 22) : 16} y1="0" x2="30" y2="0" stroke={strokeColor} strokeWidth="2" />
          </g>
        );
      }

      case 'MODULE_BLUETOOTH_HC05':
      case 'BLUETOOTH':
      case 'HC05':
      case 'HC06':
      case 'RF_BLUETOOTH':
        return (
          <g>
            {/* Bluetooth Breakout PCB Body */}
            <rect x="-30" y="-25" width="60" height="50" rx="3" stroke="#0284C7" strokeWidth="2" fill="#0C4A6E" />
            {/* Meander Antenna Trace Area */}
            <rect x="-14" y="-23" width="28" height="6" rx="1" fill="#F59E0B" opacity="0.8" />
            {/* Shield / RF Can */}
            <rect x="-16" y="-12" width="32" height="20" rx="2" stroke="#64748B" strokeWidth="1" fill="#1E293B" />
            <text x="0" y="1" fill="#38BDF8" fontSize="6.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              HC-05
            </text>
            <text x="0" y="21" fill="#94A3B8" fontSize="5.5" fontFamily="monospace" textAnchor="middle">
              BLUETOOTH
            </text>
            {/* Left Pin Labels: VCC (-20), GND (-7), TXD (7), RXD (20) */}
            <g fontSize="5.5" fontFamily="monospace" fill="#E2E8F0" fontWeight="bold" textAnchor="start">
              <text x="-26" y="-18" fill="#EF4444">VCC</text>
              <text x="-26" y="-5" fill="#94A3B8">GND</text>
              <text x="-26" y="9" fill="#10B981">TXD</text>
              <text x="-26" y="22" fill="#38BDF8">RXD</text>
            </g>
            {/* Right Pin Labels: STATE (-10), EN (10) */}
            <g fontSize="5.5" fontFamily="monospace" fill="#E2E8F0" fontWeight="bold" textAnchor="end">
              <text x="26" y="-8" fill="#F59E0B">STATE</text>
              <text x="26" y="12" fill="#A855F7">EN</text>
            </g>
          </g>
        );

      case 'SENSOR_ULTRASONIC':
      case 'HC_SR04':
        return (
          <g>
            {/* Sensor PCB Body */}
            <rect x="-35" y="-25" width="70" height="50" rx="4" stroke="#0284C7" strokeWidth="2" fill="#0C4A6E" />
            {/* Left Transducer (TX) */}
            <circle cx="-16" cy="0" r="12" stroke="#94A3B8" strokeWidth="2" fill="#020617" />
            <circle cx="-16" cy="0" r="6" stroke="#38BDF8" strokeWidth="1" fill="#0369A1" />
            <text x="-16" y="2" fill="#38BDF8" fontSize="6" fontWeight="bold" fontFamily="monospace" textAnchor="middle">T</text>
            {/* Right Transducer (RX) */}
            <circle cx="16" cy="0" r="12" stroke="#94A3B8" strokeWidth="2" fill="#020617" />
            <circle cx="16" cy="0" r="6" stroke="#38BDF8" strokeWidth="1" fill="#0369A1" />
            <text x="16" y="2" fill="#38BDF8" fontSize="6" fontWeight="bold" fontFamily="monospace" textAnchor="middle">R</text>
            <text x="0" y="-16" fill="#F8FAFC" fontSize="7" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              HC-SR04
            </text>
            {/* Pin markings */}
            <g fontSize="6" fontFamily="monospace" fill="#38BDF8" fontWeight="bold" textAnchor="middle">
              <text x="-30" y="-17">VCC</text>
              <text x="-10" y="23">TRIG</text>
              <text x="10" y="23">ECHO</text>
              <text x="30" y="-17">GND</text>
            </g>
          </g>
        );

      case 'SENSOR_DHT11':
        return (
          <g>
            <rect x="-25" y="-22" width="50" height="44" rx="4" stroke="#0284C7" strokeWidth="2" fill="#0C4A6E" />
            <rect x="-18" y="-14" width="36" height="12" rx="2" fill="#0369A1" />
            <text x="0" y="-5" fill="#38BDF8" fontSize="7.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              DHT11
            </text>
            <text x="0" y="10" fill="#E2E8F0" fontSize="7" fontFamily="monospace" textAnchor="middle">
              T/H%
            </text>
          </g>
        );

      case 'SENSOR_PIR':
        return (
          <g>
            <rect x="-25" y="-20" width="50" height="40" rx="4" stroke="#E2E8F0" strokeWidth="2" fill="#F8FAFC" />
            <circle cx="0" cy="0" r="12" stroke="#94A3B8" strokeWidth="1.5" fill="#E2E8F0" />
            <text x="0" y="3" fill="#0F172A" fontSize="7" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              PIR
            </text>
          </g>
        );

      case 'SENSOR_LDR':
        return (
          <g>
            <circle cx="0" cy="0" r="18" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <path d="M -12,0 L -8,-4 L -4,4 L 0,-4 L 4,4 L 8,-4 L 12,0" stroke={strokeColor} strokeWidth="2" fill="none" />
            <path d="M -12,-18 L -6,-10 M -8,-10 L -6,-10 L -6,-12" stroke="#F59E0B" strokeWidth="1.5" fill="none" />
            <path d="M -6,-18 L 0,-10 M -2,-10 L 0,-10 L 0,-12" stroke="#F59E0B" strokeWidth="1.5" fill="none" />
          </g>
        );

      case 'SENSOR_MQ2':
        return (
          <g>
            <circle cx="0" cy="0" r="22" stroke="#0284C7" strokeWidth="2" fill="#0F172A" />
            <circle cx="0" cy="0" r="14" stroke="#94A3B8" strokeWidth="1.5" fill="#334155" strokeDasharray="3,2" />
            <text x="0" y="3" fill="#38BDF8" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              MQ-2
            </text>
            <text x="0" y="11" fill="#94A3B8" fontSize="6" fontFamily="monospace" textAnchor="middle">
              GAS
            </text>
          </g>
        );

      case 'SENSOR_IR_OBSTACLE':
        return (
          <g>
            <rect x="-25" y="-18" width="50" height="36" rx="4" stroke="#475569" strokeWidth="2" fill="#1E293B" />
            <circle cx="-10" cy="-4" r="5" fill="#38BDF8" />
            <circle cx="10" cy="-4" r="5" fill="#18181B" stroke="#64748B" strokeWidth="1" />
            <text x="0" y="10" fill="#E2E8F0" fontSize="7" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              IR PROX
            </text>
          </g>
        );

      case 'SENSOR_SOIL':
        return (
          <g>
            <path d="M -20,-15 L 20,-15 L 20,5 L 10,25 L -10,25 L -20,5 Z" stroke="#059669" strokeWidth="2" fill="#064E3B" />
            <line x1="0" y1="-10" x2="0" y2="18" stroke="#10B981" strokeWidth="2" />
            <text x="0" y="-3" fill="#6EE7B7" fontSize="7" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              SOIL
            </text>
          </g>
        );

      case 'KEYPAD_4X4':
        return (
          <g>
            <rect x="-35" y="-30" width="70" height="60" rx="4" stroke="#475569" strokeWidth="2" fill="#0F172A" />
            {[-20, -7, 6, 19].map((kx, ci) =>
              [-18, -6, 6, 18].map((ky, ri) => (
                <rect
                  key={`${ci}-${ri}`}
                  x={kx - 4}
                  y={ky - 4}
                  width="8"
                  height="8"
                  rx="1.5"
                  fill="#1E293B"
                  stroke="#334155"
                  strokeWidth="0.8"
                />
              ))
            )}
            <text x="0" y="27" fill="#38BDF8" fontSize="6.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              4x4 KEYPAD
            </text>
          </g>
        );

      case 'DISPLAY_LCD1602':
      case 'LCD_1602':
        return (
          <g>
            <rect x="-48" y="-28" width="96" height="56" rx="3" stroke="#047857" strokeWidth="2" fill="#064E3B" />
            <rect x="-38" y="-14" width="76" height="24" rx="2" fill="#022C22" stroke="#059669" />
            <text x="0" y="-2" fill="#34D399" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              EI HOUSE LAB
            </text>
            <text x="0" y="6" fill="#6EE7B7" fontSize="6.5" fontFamily="monospace" textAnchor="middle">
              LCD 16x2 (HD44780)
            </text>
            {/* Full 16 Hardware Pins: Left side (Power & Control: VSS, VDD, V0, RS, RW, E, A, K) */}
            <g fontSize="5.5" fontFamily="monospace" fill="#A7F3D0" fontWeight="bold">
              <text x="-45" y="-20">1:VSS</text>
              <text x="-45" y="-14">2:VDD</text>
              <text x="-45" y="-8">3:V0</text>
              <text x="-45" y="-2">4:RS</text>
              <text x="-45" y="4">5:RW</text>
              <text x="-45" y="10">6:E</text>
              <text x="-45" y="16">15:A</text>
              <text x="-45" y="22">16:K</text>
            </g>
            {/* Full 16 Hardware Pins: Right side (8-bit Data Bus: D0..D7) */}
            <g fontSize="5.5" fontFamily="monospace" fill="#A7F3D0" fontWeight="bold" textAnchor="end">
              <text x="45" y="-20">7:D0</text>
              <text x="45" y="-14">8:D1</text>
              <text x="45" y="-8">9:D2</text>
              <text x="45" y="-2">10:D3</text>
              <text x="45" y="4">11:D4</text>
              <text x="45" y="10">12:D5</text>
              <text x="45" y="16">13:D6</text>
              <text x="45" y="22">14:D7</text>
            </g>
          </g>
        );

      case 'DISPLAY_OLED_SSD1306':
        return (
          <g>
            <rect x="-30" y="-25" width="60" height="50" rx="3" stroke="#1E293B" strokeWidth="2" fill="#0F172A" />
            <rect x="-24" y="-18" width="48" height="32" rx="1" fill="#020617" stroke="#38BDF8" />
            <text x="0" y="2" fill="#38BDF8" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              OLED 0.96
            </text>
          </g>
        );

      case 'ACTUATOR_SERVO_SG90':
      case 'SERVO_SG90':
      case 'SERVO':
        return (
          <g>
            <rect x="-30" y="-22" width="60" height="44" rx="4" stroke="#0284C7" strokeWidth="2" fill="#0284C7" />
            <circle cx="12" cy="-4" r="10" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
            <line x1="12" y1="-18" x2="12" y2="10" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
            <text x="-12" y="-2" fill="#FFFFFF" fontSize="7" fontWeight="bold" fontFamily="monospace">
              SG90
            </text>
            {/* Pin markings along bottom (y=20): GND, 5V, SIG */}
            <g fontSize="6" fontFamily="monospace" fill="#F8FAFC" fontWeight="bold" textAnchor="middle">
              <text x="-20" y="17">GND</text>
              <text x="0" y="17">5V</text>
              <text x="20" y="17">SIG</text>
            </g>
          </g>
        );

      case 'ACTUATOR_DC_MOTOR':
        return (
          <g>
            <circle cx="0" cy="0" r="22" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <text x="0" y="5" fill="#38BDF8" fontSize="12" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              M
            </text>
            <path d="M 0,-26 L 0,-22 M 0,22 L 0,26" stroke={strokeColor} strokeWidth="2" />
          </g>
        );

      case 'ACTUATOR_RELAY_5V':
        return (
          <g>
            <rect x="-35" y="-25" width="70" height="50" rx="3" stroke="#1D4ED8" strokeWidth="2" fill="#1E40AF" />
            <text x="0" y="-5" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              RELAY 5V
            </text>
            <text x="0" y="10" fill="#93C5FD" fontSize="7" fontFamily="monospace" textAnchor="middle">
              10A 250VAC
            </text>
          </g>
        );

      case 'ACTUATOR_BUZZER_ACTIVE':
      case 'BUZZER_ACTIVE':
      case 'BUZZER':
        return (
          <g>
            <circle cx="0" cy="0" r="18" stroke={strokeColor} strokeWidth="2" fill="#0F172A" />
            <circle cx="0" cy="0" r="5" fill="#334155" />
            <text x="0" y="-8" fill="#F59E0B" fontSize="6.5" fontFamily="monospace" textAnchor="middle">
              BUZZER
            </text>
            {/* Terminals at -25 and +25 */}
            <line x1="-25" y1="0" x2="-18" y2="0" stroke={strokeColor} strokeWidth="2" />
            <line x1="18" y1="0" x2="25" y2="0" stroke={strokeColor} strokeWidth="2" />
            <text x="-21" y="-4" fill="#EF4444" fontSize="7" fontWeight="bold">+</text>
            <text x="18" y="-4" fill="#38BDF8" fontSize="7" fontWeight="bold">-</text>
          </g>
        );

      case 'ACTUATOR_RGB_LED':
      case 'LED_RGB':
      case 'RGB_LED':
      case 'rgb-led':
      case 'rgb_led': {
        const isBurned = simState?.status === 'BURNED' || Boolean(simState?.burned);
        
        // 1. Resolve multi-channel levels (rLevel, gLevel, bLevel in 0..1)
        let rLevel = 0;
        let gLevel = 0;
        let bLevel = 0;

        if (isSimulating && simState && typeof simState === 'object') {
          const sAny = simState as Record<string, unknown>;
          if (sAny.onRed) rLevel = Math.max(rLevel, typeof sAny.redBrightness === 'number' ? sAny.redBrightness : 1.0);
          if (sAny.onGreen) gLevel = Math.max(gLevel, typeof sAny.greenBrightness === 'number' ? sAny.greenBrightness : 1.0);
          if (sAny.onBlue) bLevel = Math.max(bLevel, typeof sAny.blueBrightness === 'number' ? sAny.blueBrightness : 1.0);
          if (typeof sAny.rLevel === 'number') rLevel = Math.max(rLevel, sAny.rLevel);
          if (typeof sAny.gLevel === 'number') gLevel = Math.max(gLevel, sAny.gLevel);
          if (typeof sAny.bLevel === 'number') bLevel = Math.max(bLevel, sAny.bLevel);
          if (typeof sAny.redBrightness === 'number' && sAny.redBrightness > 0) rLevel = Math.max(rLevel, sAny.redBrightness);
          if (typeof sAny.greenBrightness === 'number' && sAny.greenBrightness > 0) gLevel = Math.max(gLevel, sAny.greenBrightness);
          if (typeof sAny.blueBrightness === 'number' && sAny.blueBrightness > 0) bLevel = Math.max(bLevel, sAny.blueBrightness);
          if (sAny.channels && typeof sAny.channels === 'object') {
            const ch = sAny.channels as Record<string, number>;
            if (typeof ch.r === 'number') rLevel = Math.max(rLevel, ch.r);
            if (typeof ch.g === 'number') gLevel = Math.max(gLevel, ch.g);
            if (typeof ch.b === 'number') bLevel = Math.max(bLevel, ch.b);
          }
          if (sAny.on && rLevel === 0 && gLevel === 0 && bLevel === 0) {
            const b = typeof sAny.brightness === 'number' ? sAny.brightness : 1.0;
            rLevel = b;
            gLevel = b;
            bLevel = b;
          }
        }

        // Check if COM pin has a connected wire in schematic
        const isComPin = (p: string) => {
          const pl = (p || '').toLowerCase();
          return pl === 'cc' || pl === 'com' || pl === 'c' || pl === '2' || pl === 'cathode' || pl === 'anode' || pl === 'gnd' || pl === '-';
        };

        const hasComWire = Boolean(
          wires &&
          wires.some((cw) => {
            return (
              (cw.fromCompId === component.id && isComPin(cw.fromPinId)) ||
              (cw.toCompId === component.id && isComPin(cw.toPinId))
            );
          })
        );

        // 2. Wire conduction tracing (ONLY if COM is connected and wire carries real forward current >= 0.5mA)
        if (isSimulating && wires && hasComWire) {
          wires.forEach((cw) => {
            let pin = '';
            if (cw.fromCompId === component.id) {
              pin = cw.fromPinId || '';
            } else if (cw.toCompId === component.id) {
              pin = cw.toPinId || '';
            }
            if (!pin) return;

            const pLower = pin.toLowerCase();
            const currentA = wireCurrents?.[cw.id] ?? cw.current ?? 0;
            const hasConductingCurrent = Math.abs(currentA) >= 0.0005;
            if (!hasConductingCurrent) return;

            const channelLevel = Math.min(1.0, Math.max(0.7, Math.abs(currentA) / 0.02));

            if (pLower === 'r' || pLower === '1' || pLower === 'red') {
              rLevel = Math.max(rLevel, channelLevel);
            } else if (pLower === 'g' || pLower === '3' || pLower === 'green') {
              gLevel = Math.max(gLevel, channelLevel);
            } else if (pLower === 'b' || pLower === '4' || pLower === 'blue') {
              bLevel = Math.max(bLevel, channelLevel);
            }
          });
        }

        // 3. Explicit component parameter overrides from Inspector (applied when simulating/conducting)
        if (isSimulating && (hasComWire || (simState && (simState.on || ((simState as Record<string, unknown>).current as number) > 0.0005)))) {
          if (component.parameters?.r !== undefined) rLevel = Math.max(rLevel, Number(component.parameters.r));
          if (component.parameters?.g !== undefined) gLevel = Math.max(gLevel, Number(component.parameters.g));
          if (component.parameters?.b !== undefined) bLevel = Math.max(bLevel, Number(component.parameters.b));
        }

        // STRICT OPEN-CIRCUIT CHECK: If wires are present but COM has no wire, and simState is unlit/0mA:
        if (wires && wires.length > 0 && !hasComWire && (!simState || !simState.on)) {
          rLevel = 0;
          gLevel = 0;
          bLevel = 0;
        }

        const rBright = isBurned || !isSimulating ? 0 : Math.max(0, Math.min(1, rLevel));
        const gBright = isBurned || !isSimulating ? 0 : Math.max(0, Math.min(1, gLevel));
        const bBright = isBurned || !isSimulating ? 0 : Math.max(0, Math.min(1, bLevel));

        const onR = rBright > 0.02;
        const onG = gBright > 0.02;
        const onB = bBright > 0.02;
        const anyOn = onR || onG || onB;

        // Continuous additive optical color synthesis rgb(r, g, b)
        const rByte = Math.round(rBright * 255);
        const gByte = Math.round(gBright * 255);
        const bByte = Math.round(bBright * 255);
        const glowColor = `rgb(${rByte}, ${gByte}, ${bByte})`;
        const maxBright = Math.max(rBright, gBright, bBright);

        return (
          <g>
            {isBurned && (
              <text x="0" y="-28" fill="#EF4444" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                💥 BURNED
              </text>
            )}

            {/* Active Blended Optical Additive Glow Halo (Red+Green=Yellow, Green+Blue=Cyan, Red+Blue=Magenta, R+G+B=White) */}
            {anyOn && (
              <circle
                cx="0"
                cy="-2"
                r="30"
                fill={glowColor}
                opacity={Math.max(0.4, maxBright * 0.85)}
                filter="blur(6px)"
              />
            )}

            {/* Diffused 5mm Epoxy Lens Boundary */}
            <circle cx="0" cy="-2" r="22" stroke={isBurned ? '#EF4444' : strokeColor} strokeWidth="1.8" fill="#070E1B" />

            {/* Channel Leads */}
            <line x1="-30" y1="-20" x2="-14" y2="-10" stroke={strokeColor} strokeWidth="1.5" />
            <line x1="10" y1="-20" x2="0" y2="-10" stroke={strokeColor} strokeWidth="1.5" />
            <line x1="30" y1="-20" x2="14" y2="-10" stroke={strokeColor} strokeWidth="1.5" />
            <line x1="-10" y1="20" x2="-10" y2="4" stroke={strokeColor} strokeWidth="1.5" />

            {/* Red Channel Diode */}
            <polygon
              points="-18,-9 -10,-9 -14,-2"
              fill={onR ? '#EF4444' : '#7F1D1D'}
              fillOpacity={onR ? Math.max(0.7, rBright) : 0.35}
              stroke="#EF4444"
              strokeWidth="1.2"
            />
            {onR && (
              <circle cx="-14" cy="-5" r={5 + rBright * 3} fill="#EF4444" opacity={0.7 * rBright} filter="blur(2px)" />
            )}

            {/* Green Channel Diode */}
            <polygon
              points="-4,-9 4,-9 0,-2"
              fill={onG ? '#10B981' : '#064E3B'}
              fillOpacity={onG ? Math.max(0.7, gBright) : 0.35}
              stroke="#10B981"
              strokeWidth="1.2"
            />
            {onG && (
              <circle cx="0" cy="-5" r={5 + gBright * 3} fill="#10B981" opacity={0.7 * gBright} filter="blur(2px)" />
            )}

            {/* Blue Channel Diode */}
            <polygon
              points="10,-9 18,-9 14,-2"
              fill={onB ? '#3B82F6' : '#1E3A8A'}
              fillOpacity={onB ? Math.max(0.7, bBright) : 0.35}
              stroke="#3B82F6"
              strokeWidth="1.2"
            />
            {onB && (
              <circle cx="14" cy="-5" r={5 + bBright * 3} fill="#3B82F6" opacity={0.7 * bBright} filter="blur(2px)" />
            )}

            {/* Common Cathode/Anode Bus Bar */}
            <line x1="-16" y1="-2" x2="16" y2="-2" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="-2" x2="-10" y2="4" stroke={strokeColor} strokeWidth="1.5" />

            {/* Pin Identification Labels */}
            <text x="-26" y="-22" fill="#EF4444" fontSize="6.5" fontWeight="bold" fontFamily="monospace">R</text>
            <text x="7" y="-22" fill="#10B981" fontSize="6.5" fontWeight="bold" fontFamily="monospace">G</text>
            <text x="24" y="-22" fill="#3B82F6" fontSize="6.5" fontWeight="bold" fontFamily="monospace">B</text>
            <text x="-16" y="24" fill="#94A3B8" fontSize="6.5" fontWeight="bold" fontFamily="monospace">COM</text>
          </g>
        );
      }

      case 'DISPLAY_7SEG':
        return (
          <g>
            <rect x="-24" y="-30" width="48" height="60" rx="3" stroke={strokeColor} strokeWidth="2" fill="#030712" />
            {/* 7-Segment segments in faint red */}
            <line x1="-12" y1="-20" x2="12" y2="-20" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
            <line x1="-14" y1="-18" x2="-14" y2="-4" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
            <line x1="14" y1="-18" x2="14" y2="-4" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
            <line x1="-12" y1="-2" x2="12" y2="-2" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
            <line x1="-14" y1="0" x2="-14" y2="14" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
            <line x1="14" y1="0" x2="14" y2="14" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
            <line x1="-12" y1="16" x2="12" y2="16" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
            <circle cx="18" cy="18" r="2" fill="#EF4444" />
          </g>
        );

      case 'REGULATOR_7805':
      case 'REGULATOR_7812':
      case 'REGULATOR_LM317':
        return (
          <g>
            <rect x="-35" y="-22" width="70" height="44" rx="3" stroke="#0284C7" strokeWidth="2" fill="#0B1E36" />
            <text x="0" y="-4" fill="#38BDF8" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              {type.replace('REGULATOR_', '')}
            </text>
            <text x="0" y="9" fill="#94A3B8" fontSize="7" fontFamily="monospace" textAnchor="middle">
              LDO REG
            </text>
            <text x="-28" y="-12" fill="#10B981" fontSize="6" fontFamily="monospace">IN</text>
            <text x="18" y="-12" fill="#38BDF8" fontSize="6" fontFamily="monospace">OUT</text>
            <text x="-8" y="18" fill="#64748B" fontSize="6" fontFamily="monospace">GND</text>
          </g>
        );

      case 'ARDUINO_UNO': {
        const isUsbPlugged = component.parameters?.usbPlugged !== false;
        const isDcJackPlugged = Boolean(component.parameters?.dcJackPlugged);
        const isBoardPowered = (isUsbPlugged || isDcJackPlugged) && (simState?.pwrLed ?? (simState?.on ?? isSimulating));
        const pin13High = isBoardPowered && isSimulating && simState && (simState.on || simState.voltage > 2.5);
        const leftPins = [
          { label: 'RESET', y: -80, type: 'pwr' },
          { label: '3.3V', y: -70, type: 'pwr' },
          { label: '5V', y: -60, type: 'pwr' },
          { label: 'GND', y: -50, type: 'pwr' },
          { label: 'GND', y: -40, type: 'pwr' },
          { label: 'VIN', y: -30, type: 'pwr' },
          { label: 'A0', y: 0, type: 'ana' },
          { label: 'A1', y: 10, type: 'ana' },
          { label: 'A2', y: 20, type: 'ana' },
          { label: 'A3', y: 30, type: 'ana' },
          { label: 'A4 (SDA)', y: 40, type: 'ana' },
          { label: 'A5 (SCL)', y: 50, type: 'ana' },
        ];
        const rightPins = [
          { label: 'AREF', y: -80, type: 'pwr' },
          { label: 'GND', y: -70, type: 'pwr' },
          { label: 'D13', y: -60, type: 'dig' },
          { label: 'D12', y: -50, type: 'dig' },
          { label: '~D11', y: -40, type: 'pwm' },
          { label: '~D10', y: -30, type: 'pwm' },
          { label: '~D9', y: -20, type: 'pwm' },
          { label: 'D8', y: -10, type: 'dig' },
          { label: 'D7', y: 0, type: 'dig' },
          { label: '~D6', y: 10, type: 'pwm' },
          { label: '~D5', y: 20, type: 'pwm' },
          { label: 'D4', y: 30, type: 'dig' },
          { label: '~D3', y: 40, type: 'pwm' },
          { label: 'D2', y: 50, type: 'dig' },
          { label: 'TX>1', y: 60, type: 'comm' },
          { label: 'RX<0', y: 70, type: 'comm' },
        ];
        return (
          <g>
            {/* IEEE/KiCad Standard Schematic Block Substrate */}
            <rect x="-65" y="-90" width="130" height="180" rx="4" fill="#04121F" stroke="#00979C" strokeWidth="2" />
            <rect x="-61" y="-86" width="122" height="172" rx="2" fill="none" stroke="#005B60" strokeWidth="0.8" opacity="0.6" />

            {/* Header Title & Chip Silkscreen */}
            <text x="0" y="-76" fill="#00C4CC" fontSize="7.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              ARDUINO UNO R3
            </text>
            <text x="0" y="-68" fill="#64748B" fontSize="4.5" fontFamily="sans-serif" textAnchor="middle">
              ATmega328P • 16MHz
            </text>

            {/* Interactive USB Connection Status Badge */}
            <g transform="translate(0, -58)">
              <rect
                x="-36"
                y="-6"
                width="72"
                height="12"
                rx="3"
                fill={isUsbPlugged ? '#082F49' : '#1E293B'}
                stroke={isUsbPlugged ? '#0284C7' : '#475569'}
                strokeWidth="1"
              />
              <circle cx="-28" cy="0" r="2.2" fill={isUsbPlugged ? '#38BDF8' : '#64748B'} />
              <text x="-21" y="3" fill={isUsbPlugged ? '#38BDF8' : '#94A3B8'} fontSize="5" fontFamily="monospace" fontWeight="bold">
                {isUsbPlugged ? 'USB: 5.0V ON' : 'USB: UNPLUGGED'}
              </text>
            </g>

            {/* Functional Status LEDs: PWR (Green) and Builtin L / D13 (Amber) */}
            {/* 1. PWR (ON) LED */}
            <circle cx="-14" cy="-44" r="2.8" fill={isBoardPowered ? '#10B981' : '#064E3B'} stroke="#047857" strokeWidth="0.8" />
            {isBoardPowered && <circle cx="-14" cy="-44" r="6.5" fill="rgba(16,185,129,0.45)" filter="blur(1px)" />}
            <text x="-14" y="-49" fill={isBoardPowered ? '#A7F3D0' : '#4B5563'} fontSize="4" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              PWR
            </text>

            {/* 2. L (D13) LED */}
            <circle cx="14" cy="-44" r="2.8" fill={pin13High ? '#F59E0B' : '#78350F'} stroke="#B45309" strokeWidth="0.8" />
            {pin13High && <circle cx="14" cy="-44" r="6.5" fill="rgba(245,158,11,0.45)" filter="blur(1px)" />}
            <text x="14" y="-49" fill={pin13High ? '#FDE68A' : '#4B5563'} fontSize="4" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              L (D13)
            </text>

            {/* Section Divider Labels inside block */}
            <text x="-52" y="-83" fill="#38BDF8" fontSize="4" fontFamily="monospace" fontWeight="bold">
              [POWER]
            </text>
            <text x="-52" y="-8" fill="#34D399" fontSize="4" fontFamily="monospace" fontWeight="bold">
              [ANALOG]
            </text>
            <text x="52" y="-83" fill="#FBBF24" fontSize="4" fontFamily="monospace" fontWeight="bold" textAnchor="end">
              [DIGITAL PWM~]
            </text>

            {/* Left Header Pins */}
            {leftPins.map((lp, idx) => (
              <g key={idx}>
                {/* Pin terminal stub line on schematic grid */}
                <line x1="-65" y1={lp.y} x2="-58" y2={lp.y} stroke={lp.type === 'pwr' ? '#38BDF8' : '#34D399'} strokeWidth="1.2" />
                <circle cx="-65" cy={lp.y} r="1.8" fill={lp.type === 'pwr' ? '#38BDF8' : '#34D399'} />
                <text x="-54" y={lp.y + 2.5} fill="#E2E8F0" fontSize="4.5" fontFamily="monospace" fontWeight="bold">
                  {lp.label}
                </text>
              </g>
            ))}

            {/* Right Header Pins */}
            {rightPins.map((rp, idx) => (
              <g key={idx}>
                {/* Pin terminal stub line on schematic grid */}
                <line x1="58" y1={rp.y} x2="65" y2={rp.y} stroke={rp.type === 'pwm' ? '#F59E0B' : rp.type === 'comm' ? '#A78BFA' : rp.type === 'pwr' ? '#38BDF8' : '#94A3B8'} strokeWidth="1.2" />
                <circle cx="65" cy={rp.y} r="1.8" fill={rp.type === 'pwm' ? '#F59E0B' : rp.type === 'comm' ? '#A78BFA' : rp.type === 'pwr' ? '#38BDF8' : '#94A3B8'} />
                <text x="54" y={rp.y + 2.5} fill="#E2E8F0" fontSize="4.5" fontFamily="monospace" fontWeight="bold" textAnchor="end">
                  {rp.label}
                </text>
              </g>
            ))}

            {/* Center Chip Silhouette & KiCad Designator */}
            <rect x="-24" y="-30" width="48" height="60" rx="3" fill="#0B132B" stroke="#1E293B" strokeWidth="1" />
            <path d="M -6,-30 C -6,-26 6,-26 6,-30" fill="#04121F" stroke="#1E293B" />
            <text x="0" y="2" fill="#94A3B8" fontSize="5.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              ATmega328P
            </text>
            <text x="0" y="12" fill="#0284C7" fontSize="4.5" fontFamily="monospace" textAnchor="middle">
              28-DIP IC
            </text>
          </g>
        );
      }

      case 'ARDUINO_NANO': {
        const isUsbPlugged = component.parameters?.usbPlugged !== false;
        const isBoardPowered = isUsbPlugged && (simState?.pwrLed ?? (simState?.on ?? isSimulating));
        const pin13High = isBoardPowered && isSimulating && simState && (simState.on || simState.voltage > 2.5);
        const leftNano = [
          { label: 'TX1', y: -70 }, { label: 'RX0', y: -60 }, { label: 'RST', y: -50 }, { label: 'GND', y: -40 },
          { label: 'D2', y: -30 }, { label: '~D3', y: -20 }, { label: 'D4', y: -10 }, { label: '~D5', y: 0 },
          { label: '~D6', y: 10 }, { label: 'D7', y: 20 }, { label: 'D8', y: 30 }, { label: '~D9', y: 40 },
          { label: '~D10', y: 50 }, { label: '~D11', y: 60 }, { label: 'D12', y: 70 },
        ];
        const rightNano = [
          { label: 'VIN', y: -70 }, { label: 'GND', y: -60 }, { label: 'RST', y: -50 }, { label: '5V', y: -40 },
          { label: 'A7', y: -30 }, { label: 'A6', y: -20 }, { label: 'A5', y: -10 }, { label: 'A4', y: 0 },
          { label: 'A3', y: 10 }, { label: 'A2', y: 20 }, { label: 'A1', y: 30 }, { label: 'A0', y: 40 },
          { label: 'REF', y: 50 }, { label: '3V3', y: 60 }, { label: 'D13', y: 70 },
        ];
        return (
          <g>
            <rect x="-45" y="-80" width="90" height="160" rx="4" fill="#031E33" stroke="#0284C7" strokeWidth="2" />
            <text x="0" y="-72" fill="#38BDF8" fontSize="6.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              ARDUINO NANO
            </text>

            {/* USB Status Badge */}
            <g transform="translate(0, -62)">
              <rect x="-26" y="-5" width="52" height="10" rx="2" fill={isUsbPlugged ? '#082F49' : '#1E293B'} stroke={isUsbPlugged ? '#0284C7' : '#475569'} strokeWidth="0.8" />
              <text x="0" y="2.5" fill={isUsbPlugged ? '#38BDF8' : '#94A3B8'} fontSize="4" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                {isUsbPlugged ? 'USB: 5V ON' : 'USB: OFF'}
              </text>
            </g>

            {/* PWR and L LEDs */}
            <circle cx="-10" cy="-48" r="2.2" fill={isBoardPowered ? '#10B981' : '#064E3B'} />
            {isBoardPowered && <circle cx="-10" cy="-48" r="5" fill="rgba(16,185,129,0.4)" />}
            <text x="-10" y="-52" fill={isBoardPowered ? '#A7F3D0' : '#4B5563'} fontSize="3.5" fontFamily="monospace" textAnchor="middle">PWR</text>

            <circle cx="10" cy="-48" r="2.2" fill={pin13High ? '#F59E0B' : '#78350F'} />
            {pin13High && <circle cx="10" cy="-48" r="5" fill="rgba(245,158,11,0.4)" />}
            <text x="10" y="-52" fill={pin13High ? '#FDE68A' : '#4B5563'} fontSize="3.5" fontFamily="monospace" textAnchor="middle">L</text>

            {/* Left Header Pins */}
            {leftNano.map((lp, idx) => (
              <g key={idx}>
                <line x1="-45" y1={lp.y} x2="-40" y2={lp.y} stroke="#0284C7" strokeWidth="1" />
                <circle cx="-45" cy={lp.y} r="1.5" fill="#38BDF8" />
                <text x="-37" y={lp.y + 2} fill="#FFFFFF" fontSize="4" fontFamily="monospace" fontWeight="bold">
                  {lp.label}
                </text>
              </g>
            ))}

            {/* Right Header Pins */}
            {rightNano.map((rp, idx) => (
              <g key={idx}>
                <line x1="40" y1={rp.y} x2="45" y2={rp.y} stroke="#0284C7" strokeWidth="1" />
                <circle cx="45" cy={rp.y} r="1.5" fill="#38BDF8" />
                <text x="37" y={rp.y + 2} fill="#FFFFFF" fontSize="4" fontFamily="monospace" fontWeight="bold" textAnchor="end">
                  {rp.label}
                </text>
              </g>
            ))}

            <g transform="translate(0, 0) rotate(45)">
              <rect x="-9" y="-9" width="18" height="18" rx="1.5" fill="#0F172A" stroke="#334155" />
            </g>
            <text x="0" y="24" fill="#94A3B8" fontSize="4.5" fontFamily="monospace" textAnchor="middle">ATmega328P</text>
          </g>
        );
      }

      case 'ARDUINO_MEGA': {
        const isUsbPlugged = component.parameters?.usbPlugged !== false;
        const isDcJackPlugged = Boolean(component.parameters?.dcJackPlugged);
        const isBoardPowered = (isUsbPlugged || isDcJackPlugged) && (simState?.pwrLed ?? (simState?.on ?? isSimulating));
        const pin13High = isBoardPowered && isSimulating && simState && (simState.on || simState.voltage > 2.5);

        const leftPins = [
          { name: 'VIN', y: -180 }, { name: '5V', y: -165 }, { name: '3V3', y: -150 },
          { name: 'GND', y: -135 }, { name: 'RESET', y: -120 }, { name: 'IOREF', y: -105 },
          { name: 'A0', y: -80 }, { name: 'A1', y: -65 }, { name: 'A2', y: -50 }, { name: 'A3', y: -35 },
          { name: 'A4', y: -20 }, { name: 'A5', y: -5 }, { name: 'A6', y: 10 }, { name: 'A7', y: 25 },
          { name: 'A8', y: 40 }, { name: 'A9', y: 55 }, { name: 'A10', y: 70 }, { name: 'A11', y: 85 },
          { name: 'A12', y: 100 }, { name: 'A13', y: 115 }, { name: 'A14', y: 130 }, { name: 'A15', y: 145 },
        ];

        const rightPins = [
          { name: 'D0 (RX0)', y: -180 }, { name: 'D1 (TX0)', y: -165 }, { name: '~D2', y: -150 },
          { name: '~D3', y: -135 }, { name: '~D4', y: -120 }, { name: '~D5', y: -105 },
          { name: '~D6', y: -90 }, { name: '~D7', y: -75 }, { name: '~D8', y: -60 },
          { name: '~D9', y: -45 }, { name: '~D10', y: -30 }, { name: '~D11', y: -15 },
          { name: '~D12', y: 0 }, { name: 'D13', y: 15 }, { name: 'D14 (TX3)', y: 35 },
          { name: 'D15 (RX3)', y: 50 }, { name: 'D16 (TX2)', y: 65 }, { name: 'D17 (RX2)', y: 80 },
          { name: 'D18 (TX1)', y: 95 }, { name: 'D19 (RX1)', y: 110 }, { name: 'D20 (SDA)', y: 125 },
          { name: 'D21 (SCL)', y: 140 }, { name: 'AREF', y: 155 },
        ];

        return (
          <g>
            <rect x="-85" y="-195" width="170" height="430" rx="8" fill="#04121A" stroke="#00878F" strokeWidth="2.5" />

            {/* Header Titles */}
            <text x="0" y="-184" fill="#00C4CC" fontSize="8.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              ARDUINO MEGA 2560 R3
            </text>
            <text x="0" y="-174" fill="#64748B" fontSize="5.5" fontFamily="sans-serif" textAnchor="middle">
              ATmega2560 • 54 DIGITAL I/O • 16 ADC • 4 UART
            </text>

            {/* USB Status Badge */}
            <g transform="translate(0, -162)">
              <rect x="-38" y="-6" width="76" height="12" rx="3" fill={isUsbPlugged ? '#082F49' : '#1E293B'} stroke={isUsbPlugged ? '#0284C7' : '#475569'} strokeWidth="1" />
              <text x="0" y="3" fill={isUsbPlugged ? '#38BDF8' : '#94A3B8'} fontSize="4.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                {isUsbPlugged ? 'USB: 5.0V ON' : 'USB: UNPLUGGED'}
              </text>
            </g>

            {/* Live PWR and L LEDs */}
            <circle cx="-16" cy="-148" r="2.8" fill={isBoardPowered ? '#10B981' : '#064E3B'} />
            {isBoardPowered && <circle cx="-16" cy="-148" r="6" fill="rgba(16,185,129,0.4)" />}
            <text x="-16" y="-153" fill={isBoardPowered ? '#A7F3D0' : '#4B5563'} fontSize="4" fontFamily="monospace" textAnchor="middle">PWR</text>

            <circle cx="16" cy="-148" r="2.8" fill={pin13High ? '#F59E0B' : '#78350F'} />
            {pin13High && <circle cx="16" cy="-148" r="6" fill="rgba(245,158,11,0.4)" />}
            <text x="16" y="-153" fill={pin13High ? '#FDE68A' : '#4B5563'} fontSize="4" fontFamily="monospace" textAnchor="middle">L</text>

            {/* Left Header Strip (Power & Analog) */}
            {leftPins.map((lp, i) => (
              <g key={`lp-${i}`}>
                <line x1="-85" y1={lp.y} x2="-80" y2={lp.y} stroke="#00878F" strokeWidth="1" />
                <circle cx="-85" cy={lp.y} r="2" fill="#F59E0B" />
                <text x="-76" y={lp.y + 2.5} fill="#CBD5E1" fontSize="4.5" fontFamily="monospace" fontWeight="bold">
                  {lp.name}
                </text>
              </g>
            ))}

            {/* Right Header Strip (Digital & Comm) */}
            {rightPins.map((rp, i) => (
              <g key={`rp-${i}`}>
                <line x1="80" y1={rp.y} x2="85" y2={rp.y} stroke="#00878F" strokeWidth="1" />
                <circle cx="85" cy={rp.y} r="2" fill="#38BDF8" />
                <text x="76" y={rp.y + 2.5} fill="#CBD5E1" fontSize="4.5" fontFamily="monospace" fontWeight="bold" textAnchor="end">
                  {rp.name}
                </text>
              </g>
            ))}

            {/* Center: ATmega2560 TQFP IC Package */}
            <g transform="translate(0, -20) rotate(45)">
              <rect x="-18" y="-18" width="36" height="36" rx="3" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
            </g>
            <text x="0" y="-17" fill="#E2E8F0" fontSize="6.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              ATmega2560
            </text>
            <text x="0" y="-9" fill="#00878F" fontSize="4.5" fontFamily="monospace" textAnchor="middle">
              16.000 MHz
            </text>

            {/* Bottom: Extended Digital I/O Header (D22 - D53) */}
            <rect x="-72" y="166" width="144" height="62" rx="4" fill="#0B1320" stroke="#334155" strokeWidth="1" />
            <text x="0" y="174" fill="#F59E0B" fontSize="5.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              EXTENDED DIGITAL I/O (D22 - D53)
            </text>
          </g>
        );
      }

      case 'ESP32_DEVKIT':
      case 'ESP32_S3':
      case 'ESP32_C3': {
        const isUsbPlugged = component.parameters?.usbPlugged !== false;
        const isBoardPowered = isUsbPlugged && (simState?.pwrLed ?? (simState?.on ?? isSimulating));
        const leftEsp = [
          { label: 'EN', y: -70 }, { label: 'VP', y: -60 }, { label: 'VN', y: -50 }, { label: '34', y: -40 },
          { label: '35', y: -30 }, { label: '32', y: -20 }, { label: '33', y: -10 }, { label: '25', y: 0 },
          { label: '26', y: 10 }, { label: '27', y: 20 }, { label: '14', y: 30 }, { label: '12', y: 40 },
          { label: '13', y: 50 }, { label: 'GND', y: 60 }, { label: 'VIN', y: 70 },
        ];
        const rightEsp = [
          { label: '3V3', y: -70 }, { label: 'GND', y: -60 }, { label: '15', y: -50 }, { label: 'D2', y: -40 },
          { label: 'D4', y: -30 }, { label: 'RX2', y: -20 }, { label: 'TX2', y: -10 }, { label: 'D5', y: 0 },
          { label: '18', y: 10 }, { label: '19', y: 20 }, { label: '21', y: 30 }, { label: 'RX0', y: 40 },
          { label: 'TX0', y: 50 }, { label: '22', y: 60 }, { label: '23', y: 70 },
        ];
        return (
          <g>
            <rect x="-55" y="-80" width="110" height="160" rx="4" fill="#0C1322" stroke="#334155" strokeWidth="2" />
            <text x="0" y="-72" fill="#38BDF8" fontSize="6.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              ESP32 DEVKIT V1
            </text>

            {/* USB Status Badge */}
            <g transform="translate(0, -62)">
              <rect x="-28" y="-5" width="56" height="10" rx="2" fill={isUsbPlugged ? '#082F49' : '#1E293B'} stroke={isUsbPlugged ? '#0284C7' : '#475569'} strokeWidth="0.8" />
              <text x="0" y="2.5" fill={isUsbPlugged ? '#38BDF8' : '#94A3B8'} fontSize="4" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                {isUsbPlugged ? 'USB: 3.3V ON' : 'USB: OFF'}
              </text>
            </g>

            {/* Red Power LED on ESP32 */}
            <circle cx="0" cy="-48" r="2.2" fill={isBoardPowered ? '#EF4444' : '#7F1D1D'} />
            {isBoardPowered && <circle cx="0" cy="-48" r="5" fill="rgba(239,68,68,0.4)" />}
            <text x="0" y="-52" fill={isBoardPowered ? '#FCA5A5' : '#4B5563'} fontSize="3.5" fontFamily="monospace" textAnchor="middle">PWR</text>

            {/* RF Shield */}
            <rect x="-24" y="-32" width="48" height="38" rx="2" fill="#1E293B" stroke="#475569" strokeWidth="1" />
            <text x="0" y="-12" fill="#E2E8F0" fontSize="5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              ESP-WROOM-32
            </text>

            {/* Left Header Pins */}
            {leftEsp.map((lp, idx) => (
              <g key={idx}>
                <line x1="-55" y1={lp.y} x2="-50" y2={lp.y} stroke="#475569" strokeWidth="1" />
                <circle cx="-55" cy={lp.y} r="1.5" fill="#F59E0B" />
                <text x="-47" y={lp.y + 2} fill="#FFFFFF" fontSize="4" fontFamily="monospace" fontWeight="bold">
                  {lp.label}
                </text>
              </g>
            ))}

            {/* Right Header Pins */}
            {rightEsp.map((rp, idx) => (
              <g key={idx}>
                <line x1="50" y1={rp.y} x2="55" y2={rp.y} stroke="#475569" strokeWidth="1" />
                <circle cx="55" cy={rp.y} r="1.5" fill="#F59E0B" />
                <text x="47" y={rp.y + 2} fill="#FFFFFF" fontSize="4" fontFamily="monospace" fontWeight="bold" textAnchor="end">
                  {rp.label}
                </text>
              </g>
            ))}
          </g>
        );
      }

      case 'RASPBERRY_PI_PICO':
      case 'RASPBERRY_PI_PICO2': {
        const isUsbPlugged = component.parameters?.usbPlugged !== false;
        const isBoardPowered = isUsbPlugged && (simState?.pwrLed ?? (simState?.on ?? isSimulating));
        const leftPico = [
          'GP0', 'GP1', 'GND', 'GP2', 'GP3', 'GP4', 'GP5', 'GND', 'GP6', 'GP7',
          'GP8', 'GP9', 'GND', 'GP10', 'GP11', 'GP12', 'GP13', 'GND', 'GP14', 'GP15'
        ];
        const rightPico = [
          'VBUS', 'VSYS', 'GND', '3V3E', '3V3', 'VREF', 'GP28', 'GND', 'GP27', 'GP26',
          'RUN', 'GP22', 'GND', 'GP21', 'GP20', 'GP19', 'GP18', 'GND', 'GP17', 'GP16'
        ];
        return (
          <g>
            <rect x="-50" y="-85" width="100" height="172" rx="4" fill="#003B20" stroke="#005930" strokeWidth="2" />
            <text x="0" y="-76" fill="#4ADE80" fontSize="6.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              {type === 'RASPBERRY_PI_PICO2' ? 'PICO RP2350' : 'PICO RP2040'}
            </text>

            {/* USB Status Badge */}
            <g transform="translate(0, -66)">
              <rect x="-26" y="-5" width="52" height="10" rx="2" fill={isUsbPlugged ? '#064E3B' : '#1E293B'} stroke={isUsbPlugged ? '#10B981' : '#475569'} strokeWidth="0.8" />
              <text x="0" y="2.5" fill={isUsbPlugged ? '#4ADE80' : '#94A3B8'} fontSize="4" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                {isUsbPlugged ? 'USB: 3.3V ON' : 'USB: OFF'}
              </text>
            </g>

            {/* Green Power LED */}
            <circle cx="0" cy="-52" r="2.2" fill={isBoardPowered ? '#10B981' : '#064E3B'} />
            {isBoardPowered && <circle cx="0" cy="-52" r="5" fill="rgba(16,185,129,0.4)" />}
            <text x="0" y="-56" fill={isBoardPowered ? '#A7F3D0' : '#4B5563'} fontSize="3.5" fontFamily="monospace" textAnchor="middle">PWR</text>

            {/* Left Header Pins */}
            {leftPico.map((label, idx) => {
              const py = -45 + idx * 6;
              return (
                <g key={idx}>
                  <line x1="-50" y1={py} x2="-45" y2={py} stroke="#005930" strokeWidth="0.8" />
                  <circle cx="-50" cy={py} r="1.3" fill="#F59E0B" />
                  <text x="-42" y={py + 1.6} fill="#FFFFFF" fontSize="3.2" fontFamily="monospace" fontWeight="bold">
                    {label}
                  </text>
                </g>
              );
            })}

            {/* Right Header Pins */}
            {rightPico.map((label, idx) => {
              const py = -45 + idx * 6;
              return (
                <g key={idx}>
                  <line x1="45" y1={py} x2="50" y2={py} stroke="#005930" strokeWidth="0.8" />
                  <circle cx="50" cy={py} r="1.3" fill="#F59E0B" />
                  <text x="42" y={py + 1.6} fill="#FFFFFF" fontSize="3.2" fontFamily="monospace" fontWeight="bold" textAnchor="end">
                    {label}
                  </text>
                </g>
              );
            })}
          </g>
        );
      }

      case 'STM32F103':
      case 'STM32_NUCLEO': {
        return (
          <g>
            <rect x="-32" y="-50" width="64" height="100" rx="4" fill="#1D4ED8" stroke="#1E40AF" strokeWidth="2" />
            <rect x="-8" y="-53" width="16" height="8" rx="1" fill="#CBD5E1" />
            <rect x="-12" y="-12" width="24" height="24" rx="2" fill="#0F172A" stroke="#334155" />
            <text x="0" y="3" fill="#E2E8F0" fontSize="5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">CORTEX-M</text>
            {/* Yellow Jumpers (BOOT0, BOOT1) */}
            <rect x="-10" y="20" width="7" height="10" fill="#F59E0B" stroke="#B45309" />
            <rect x="3" y="20" width="7" height="10" fill="#F59E0B" stroke="#B45309" />
            <text x="0" y="44" fill="#FFFFFF" fontSize="6.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              {type === 'STM32_NUCLEO' ? 'NUCLEO' : 'STM32 BLUE'}
            </text>
          </g>
        );
      }

      case 'FUSE':
        return (
          <g>
            <rect x="-18" y="-7" width="36" height="14" rx="2" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <line x1="-30" y1="0" x2="30" y2="0" stroke={strokeColor} strokeWidth="2" />
            <text x="0" y="3.5" fill="#E2E8F0" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">FUSE</text>
          </g>
        );

      case 'TRANSFORMER':
      case 'CONTROL_TRANSFORMER':
        return (
          <g>
            {/* Primary Coil Arcs */}
            <path d="M -25,-20 L -12,-20 C -7,-20 -7,-12 -12,-12 C -7,-12 -7,-4 -12,-4 C -7,-4 -7,4 -12,4 C -7,4 -7,12 -12,12 C -7,12 -7,20 -12,20 L -25,20" fill="none" stroke={strokeColor} strokeWidth="2" />
            {/* Dual Magnetic Iron Core Lines */}
            <line x1="-3" y1="-22" x2="-3" y2="22" stroke="#94A3B8" strokeWidth="1.8" />
            <line x1="3" y1="-22" x2="3" y2="22" stroke="#94A3B8" strokeWidth="1.8" />
            {/* Secondary Coil Arcs */}
            <path d="M 25,-20 L 12,-20 C 7,-20 7,-12 12,-12 C 7,-12 7,-4 12,-4 C 7,-4 7,4 12,4 C 7,4 7,12 12,12 C 7,12 7,20 12,20 L 25,20" fill="none" stroke="#38BDF8" strokeWidth="2" />
            <text x="0" y="-25" fill="#94A3B8" fontSize="7" fontFamily="monospace" textAnchor="middle">XFRMR</text>
          </g>
        );

      case 'CRYSTAL':
        return (
          <g>
            <line x1="-25" y1="0" x2="-8" y2="0" stroke={strokeColor} strokeWidth="2" />
            <line x1="8" y1="0" x2="25" y2="0" stroke={strokeColor} strokeWidth="2" />
            {/* Capacitor Electrodes */}
            <line x1="-8" y1="-14" x2="-8" y2="14" stroke={strokeColor} strokeWidth="2.5" />
            <line x1="8" y1="-14" x2="8" y2="14" stroke={strokeColor} strokeWidth="2.5" />
            {/* Quartz Crystal Body */}
            <rect x="-4" y="-12" width="8" height="24" rx="1" fill="#94A3B8" stroke="#64748B" strokeWidth="1.5" />
            <text x="0" y="22" fill="#E2E8F0" fontSize="7" fontFamily="monospace" textAnchor="middle">XTAL</text>
          </g>
        );

      case 'OPTOCOUPLER':
        return (
          <g>
            <rect x="-24" y="-20" width="48" height="40" rx="3" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            {/* Internal LED */}
            <path d="M -16,-10 L -16,10 M -16,-4 L -8,0 L -16,4 Z M -8,-8 L -8,8" stroke="#10B981" strokeWidth="1.5" fill="#10B981" />
            {/* Optical Emission Arrows */}
            <path d="M -6,-5 L -2,-2 M -3,-6 L -2,-2 L -6,-2" stroke="#10B981" strokeWidth="1.2" fill="none" />
            <path d="M -6,2 L -2,5 M -3,1 L -2,5 L -6,5" stroke="#10B981" strokeWidth="1.2" fill="none" />
            {/* Phototransistor */}
            <path d="M 6,-10 L 6,10 M 6,-4 L 14,-10 M 6,4 L 14,10" stroke="#38BDF8" strokeWidth="1.5" />
            <path d="M 10,8 L 14,10 L 13,6" fill="#38BDF8" />
            <text x="0" y="27" fill="#94A3B8" fontSize="7" fontFamily="monospace" textAnchor="middle">OPTO</text>
          </g>
        );

      case 'POWER_SUPPLY_24V':
        return (
          <g>
            <rect x="-32" y="-24" width="64" height="48" rx="4" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <text x="-16" y="-8" fill="#F59E0B" fontSize="8" fontFamily="monospace" fontWeight="bold">AC IN</text>
            <text x="14" y="-8" fill="#10B981" fontSize="8" fontFamily="monospace" fontWeight="bold">24V DC</text>
            <path d="M -6,0 L 6,0 M 0,-6 L 6,0 L 0,6" stroke="#38BDF8" strokeWidth="1.5" fill="none" />
            <text x="0" y="16" fill="#E2E8F0" fontSize="7" fontFamily="monospace" textAnchor="middle">SMPS 24V</text>
          </g>
        );

      case 'VFD_DRIVE':
        return (
          <g>
            <rect x="-35" y="-28" width="70" height="56" rx="4" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <text x="0" y="-14" fill="#38BDF8" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">VFD INVERTER</text>
            <path d="M -20,2 C -15,10 -10,-6 -5,2" fill="none" stroke="#F59E0B" strokeWidth="1.5" />
            <path d="M 0,2 L 8,2 L 8,-4 L 16,-4 L 16,2" fill="none" stroke="#10B981" strokeWidth="1.5" />
            <text x="0" y="20" fill="#94A3B8" fontSize="7" fontFamily="monospace" textAnchor="middle">0 - 50 Hz PWM</text>
          </g>
        );

      case 'PLC_CPU':
        return (
          <g>
            <rect x="-38" y="-30" width="76" height="60" rx="4" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <rect x="-34" y="-26" width="68" height="12" rx="2" fill="#1E293B" />
            <text x="0" y="-18" fill="#38BDF8" fontSize="7" fontFamily="monospace" textAnchor="middle">INPUTS: X0 - X7</text>
            <text x="0" y="3" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">PLC CPU</text>
            <rect x="-34" y="14" width="68" height="12" rx="2" fill="#1E293B" />
            <text x="0" y="22" fill="#10B981" fontSize="7" fontFamily="monospace" textAnchor="middle">OUTPUTS: Y0 - Y5</text>
          </g>
        );

      case 'SOFT_STARTER':
        return (
          <g>
            <rect x="-30" y="-24" width="60" height="48" rx="4" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <path d="M -15,-6 L -5,6 M -5,-6 L -15,6" stroke="#F59E0B" strokeWidth="1.8" />
            <text x="0" y="-10" fill="#38BDF8" fontSize="7.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">SOFT START</text>
            <path d="M -18,12 L -6,12 L 6,4 L 18,4" fill="none" stroke="#10B981" strokeWidth="1.5" />
            <text x="0" y="20" fill="#94A3B8" fontSize="6.5" fontFamily="monospace" textAnchor="middle">SCR BYPASS</text>
          </g>
        );

      case 'RELAY_THERMAL_OVERLOAD':
        return (
          <g>
            <rect x="-35" y="-24" width="70" height="48" rx="3" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            {/* 3 Thermal Bimetal Elements */}
            {[-18, 0, 18].map((px, idx) => (
              <g key={idx}>
                <line x1={px} y1="-20" x2={px} y2="-8" stroke="#F59E0B" strokeWidth="1.8" />
                <rect x={px - 3} y="-8" width="6" height="8" stroke="#EF4444" strokeWidth="1.2" fill="#7F1D1D" />
                <line x1={px} y1="0" x2={px} y2="20" stroke="#F59E0B" strokeWidth="1.8" />
              </g>
            ))}
            <text x="0" y="16" fill="#EF4444" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">OLR (95-96 / 97-98)</text>
          </g>
        );

      case 'RELAY_TIMER':
        return (
          <g>
            <rect x="-26" y="-22" width="52" height="44" rx="3" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <circle cx="0" cy="-2" r="12" fill="none" stroke="#F59E0B" strokeWidth="1.5" />
            <line x1="0" y1="-2" x2="0" y2="-9" stroke="#F59E0B" strokeWidth="1.5" />
            <line x1="0" y1="-2" x2="6" y2="-2" stroke="#F59E0B" strokeWidth="1.5" />
            <text x="0" y="17" fill="#E2E8F0" fontSize="7" fontFamily="monospace" textAnchor="middle">TIMER (TON)</text>
          </g>
        );

      case 'RELAY_SSR':
        return (
          <g>
            <rect x="-28" y="-22" width="56" height="44" rx="3" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <text x="-14" y="-8" fill="#10B981" fontSize="7" fontFamily="monospace" fontWeight="bold">DC IN</text>
            <text x="14" y="-8" fill="#EF4444" fontSize="7" fontFamily="monospace" fontWeight="bold">AC LOAD</text>
            <text x="0" y="4" fill="#38BDF8" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">SSR</text>
            <text x="0" y="16" fill="#94A3B8" fontSize="6.5" fontFamily="monospace" textAnchor="middle">SOLID STATE</text>
          </g>
        );

      case 'SAFETY_RELAY':
        return (
          <g>
            <rect x="-35" y="-25" width="70" height="50" rx="4" stroke="#EF4444" strokeWidth="2" fill={fillColor} />
            <rect x="-31" y="-21" width="62" height="42" rx="2" fill="#450A0A" opacity="0.4" />
            <text x="0" y="-6" fill="#EF4444" fontSize="8" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">SAFETY RELAY</text>
            <text x="0" y="6" fill="#FCA5A5" fontSize="7" fontFamily="monospace" textAnchor="middle">DUAL CH REDUNDANT</text>
            <text x="0" y="17" fill="#94A3B8" fontSize="6" fontFamily="monospace" textAnchor="middle">SIL 3 / Cat 4</text>
          </g>
        );

      case 'RELAY_ELECTROMECHANICAL':
      case 'INDUSTRIAL_RELAY_24V':
        return (
          <g>
            <rect x="-28" y="-22" width="56" height="44" rx="3" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <rect x="-24" y="-12" width="14" height="24" stroke="#F59E0B" strokeWidth="1.5" fill="#1E293B" />
            <text x="-17" y="3" fill="#F59E0B" fontSize="6.5" fontFamily="monospace" textAnchor="middle">COIL</text>
            {/* SPDT Contacts */}
            <line x1="2" y1="0" x2="14" y2="0" stroke={strokeColor} strokeWidth="1.8" />
            <line x1="14" y1="0" x2="22" y2="-8" stroke="#38BDF8" strokeWidth="1.8" />
            <circle cx="22" cy="-8" r="1.5" fill="#38BDF8" />
            <circle cx="22" cy="8" r="1.5" fill="#38BDF8" />
            <text x="6" y="16" fill="#94A3B8" fontSize="6.5" fontFamily="monospace">COM/NO/NC</text>
          </g>
        );

      case 'AUXILIARY_CONTACT_BLOCK':
        return (
          <g>
            <rect x="-26" y="-20" width="52" height="40" rx="3" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            {/* 13-14 NO */}
            <path d="M -16,-12 L -16,12 M -16,-4 L -8,4" stroke="#10B981" strokeWidth="1.8" />
            <text x="-16" y="-14" fill="#10B981" fontSize="6" fontFamily="monospace">13-14 NO</text>
            {/* 21-22 NC */}
            <path d="M 12,-12 L 12,12 M 12,-4 L 12,4" stroke="#EF4444" strokeWidth="1.8" />
            <text x="12" y="-14" fill="#EF4444" fontSize="6" fontFamily="monospace">21-22 NC</text>
          </g>
        );

      case 'SWITCH_DPST':
        return (
          <g>
            {/* Pole 1 */}
            <line x1="-25" y1="-12" x2="-10" y2="-12" stroke={strokeColor} strokeWidth="2" />
            <line x1="10" y1="-12" x2="25" y2="-12" stroke={strokeColor} strokeWidth="2" />
            <line x1="-10" y1="-12" x2="8" y2="-22" stroke="#38BDF8" strokeWidth="2" />
            {/* Pole 2 */}
            <line x1="-25" y1="12" x2="-10" y2="12" stroke={strokeColor} strokeWidth="2" />
            <line x1="10" y1="12" x2="25" y2="12" stroke={strokeColor} strokeWidth="2" />
            <line x1="-10" y1="12" x2="8" y2="2" stroke="#38BDF8" strokeWidth="2" />
            {/* Mechanical Ganging Dashed Line */}
            <line x1="0" y1="-16" x2="0" y2="8" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3,3" />
            <text x="0" y="24" fill="#94A3B8" fontSize="7" fontFamily="monospace" textAnchor="middle">DPST</text>
          </g>
        );

      case 'SWITCH_DPDT':
        return (
          <g>
            <line x1="-25" y1="-10" x2="-8" y2="-10" stroke={strokeColor} strokeWidth="2" />
            <line x1="-8" y1="-10" x2="12" y2="-18" stroke="#38BDF8" strokeWidth="2" />
            <line x1="-25" y1="10" x2="-8" y2="10" stroke={strokeColor} strokeWidth="2" />
            <line x1="-8" y1="10" x2="12" y2="2" stroke="#38BDF8" strokeWidth="2" />
            <line x1="2" y1="-14" x2="2" y2="6" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3,3" />
            <text x="0" y="25" fill="#94A3B8" fontSize="7" fontFamily="monospace" textAnchor="middle">DPDT</text>
          </g>
        );

      case 'SWITCH_SELECTOR':
      case 'SWITCH_ROTARY':
        return (
          <g>
            <circle cx="0" cy="0" r="18" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <line x1="0" y1="0" x2="10" y2="-10" stroke="#F59E0B" strokeWidth="2.5" />
            <circle cx="0" cy="0" r="3" fill="#F59E0B" />
            <text x="-10" y="-10" fill="#94A3B8" fontSize="6" fontFamily="monospace">1</text>
            <text x="0" y="-12" fill="#94A3B8" fontSize="6" fontFamily="monospace">0</text>
            <text x="10" y="-10" fill="#94A3B8" fontSize="6" fontFamily="monospace">2</text>
            <text x="0" y="26" fill="#E2E8F0" fontSize="7" fontFamily="monospace" textAnchor="middle">SELECTOR</text>
          </g>
        );

      case 'SWITCH_LIMIT':
        return (
          <g>
            <line x1="-25" y1="0" x2="-10" y2="0" stroke={strokeColor} strokeWidth="2" />
            <line x1="10" y1="0" x2="25" y2="0" stroke={strokeColor} strokeWidth="2" />
            <line x1="-10" y1="0" x2="8" y2="-12" stroke="#38BDF8" strokeWidth="2" />
            {/* Roller Wheel Symbol */}
            <circle cx="10" cy="-14" r="3.5" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
            <text x="0" y="16" fill="#E2E8F0" fontSize="7" fontFamily="monospace" textAnchor="middle">LIMIT SW</text>
          </g>
        );

      case 'SWITCH_MICRO':
        return (
          <g>
            <rect x="-20" y="-12" width="40" height="24" rx="2" stroke={strokeColor} strokeWidth="1.5" fill={fillColor} />
            <path d="M -12,-12 C -6,-20 6,-20 12,-12" stroke="#F59E0B" strokeWidth="2" fill="none" />
            <circle cx="0" cy="-18" r="2" fill="#F59E0B" />
            <text x="0" y="4" fill="#E2E8F0" fontSize="7" fontFamily="monospace" textAnchor="middle">MICRO</text>
          </g>
        );

      case 'SWITCH_FOOT':
        return (
          <g>
            <line x1="-25" y1="0" x2="25" y2="0" stroke={strokeColor} strokeWidth="2" />
            <path d="M -15,-8 L 15,-8 L 20,0 L -15,-8" stroke="#F59E0B" strokeWidth="1.8" fill="#78350F" />
            <text x="0" y="14" fill="#E2E8F0" fontSize="7" fontFamily="monospace" textAnchor="middle">FOOT PEDAL</text>
          </g>
        );

      case 'SWITCH_KEY':
        return (
          <g>
            <circle cx="0" cy="0" r="16" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <path d="M -4,-2 L 4,-2 L 4,6 L 2,8 L -2,8 L -4,6 Z" fill="#F59E0B" />
            <circle cx="0" cy="-6" r="2" fill="#1E293B" />
            <text x="0" y="24" fill="#E2E8F0" fontSize="7" fontFamily="monospace" textAnchor="middle">KEY SWITCH</text>
          </g>
        );

      case 'SWITCH_CHANGEOVER':
      case 'SWITCH_ISOLATOR':
        return (
          <g>
            <line x1="-25" y1="0" x2="-8" y2="0" stroke={strokeColor} strokeWidth="2" />
            <line x1="8" y1="-12" x2="25" y2="-12" stroke={strokeColor} strokeWidth="2" />
            <line x1="8" y1="12" x2="25" y2="12" stroke={strokeColor} strokeWidth="2" />
            <line x1="-8" y1="0" x2="10" y2="-14" stroke="#EF4444" strokeWidth="2.5" />
            <text x="0" y="24" fill="#EF4444" fontSize="7" fontFamily="monospace" textAnchor="middle">ISOLATOR</text>
          </g>
        );

      case 'PROTECTION_MCCB':
      case 'PROTECTION_MPCB':
        return (
          <g>
            <rect x="-24" y="-30" width="48" height="60" rx="3" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <text x="0" y="-14" fill="#F59E0B" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              {type === 'PROTECTION_MPCB' ? 'MPCB' : 'MCCB'}
            </text>
            <circle cx="0" cy="4" r="8" stroke="#38BDF8" strokeWidth="1.5" fill="#0F172A" />
            <line x1="0" y1="4" x2="5" y2="-1" stroke="#38BDF8" strokeWidth="2" />
            <text x="0" y="22" fill="#94A3B8" fontSize="6.5" fontFamily="monospace" textAnchor="middle">TRIP ADJ</text>
          </g>
        );

      case 'PROTECTION_RCCB':
        return (
          <g>
            <rect x="-26" y="-28" width="52" height="56" rx="3" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <circle cx="0" cy="-6" r="11" stroke="#38BDF8" strokeWidth="2" fill="none" />
            <line x1="-6" y1="-6" x2="6" y2="-6" stroke="#38BDF8" strokeWidth="1.5" />
            <rect x="-6" y="10" width="12" height="6" rx="1" fill="#EF4444" />
            <text x="0" y="15" fill="#FFFFFF" fontSize="5" fontFamily="monospace" textAnchor="middle">TEST</text>
            <text x="0" y="-20" fill="#E2E8F0" fontSize="7" fontFamily="monospace" textAnchor="middle">RCCB 30mA</text>
          </g>
        );

      case 'PROTECTION_SPD':
        return (
          <g>
            <rect x="-20" y="-24" width="40" height="48" rx="3" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            {/* Spark Gap / MOV Varistor Symbol */}
            <path d="M -8,-10 L 8,10 M -12,-10 L -8,-10 M 8,10 L 12,10" stroke="#F59E0B" strokeWidth="2" />
            <text x="0" y="2" fill="#38BDF8" fontSize="7" fontWeight="bold" fontFamily="monospace" textAnchor="middle">MOV</text>
            <text x="0" y="16" fill="#E2E8F0" fontSize="6.5" fontFamily="monospace" textAnchor="middle">SPD</text>
          </g>
        );

      case 'TERMINAL_PE_N':
      case 'DIN_RAIL_TERMINAL':
        return (
          <g>
            <circle cx="0" cy="0" r="14" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            {/* Earth Symbol */}
            <line x1="-9" y1="2" x2="9" y2="2" stroke="#10B981" strokeWidth="2" />
            <line x1="-6" y1="6" x2="6" y2="6" stroke="#10B981" strokeWidth="2" />
            <line x1="-3" y1="10" x2="3" y2="10" stroke="#10B981" strokeWidth="2" />
            <text x="0" y="-3" fill="#10B981" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">PE / N</text>
          </g>
        );

      case 'INDUSTRIAL_PILOT_LAMP': {
        const isLit = isSimulating && simState && (simState.on || simState.voltage > 12);
        return (
          <g>
            {/* Circle with Cross */}
            <circle cx="0" cy="0" r="18" stroke={isLit ? '#10B981' : strokeColor} strokeWidth="2" fill={isLit ? '#064E3B' : fillColor} />
            {isLit && <circle cx="0" cy="0" r="24" fill="rgba(16,185,129,0.3)" />}
            <line x1="-12" y1="-12" x2="12" y2="12" stroke={isLit ? '#34D399' : strokeColor} strokeWidth="2" />
            <line x1="12" y1="-12" x2="-12" y2="12" stroke={isLit ? '#34D399' : strokeColor} strokeWidth="2" />
            <text x="0" y="26" fill="#E2E8F0" fontSize="7" fontFamily="monospace" textAnchor="middle">PILOT LAMP</text>
          </g>
        );
      }

      case 'LOGIC_74HC595':
        return (
          <g>
            <rect x="-35" y="-25" width="70" height="50" rx="3" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <text x="0" y="-12" fill="#38BDF8" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">74HC595</text>
            <text x="0" y="0" fill="#E2E8F0" fontSize="6.5" fontFamily="monospace" textAnchor="middle">8-BIT SHIFT REG</text>
            <text x="0" y="14" fill="#94A3B8" fontSize="6" fontFamily="monospace" textAnchor="middle">SER ➔ Q0-Q7</text>
          </g>
        );

      case 'SENSOR_MPU6050':
        return (
          <g>
            <rect x="-26" y="-22" width="52" height="44" rx="3" stroke={strokeColor} strokeWidth="2" fill="#0F172A" />
            <path d="M 0,0 L 12,0 M 0,0 L 0,-12 M 0,0 L -8,8" stroke="#38BDF8" strokeWidth="1.8" />
            <text x="14" y="2" fill="#38BDF8" fontSize="6" fontFamily="monospace">X</text>
            <text x="2" y="-13" fill="#38BDF8" fontSize="6" fontFamily="monospace">Y</text>
            <text x="-12" y="10" fill="#38BDF8" fontSize="6" fontFamily="monospace">Z</text>
            <text x="0" y="16" fill="#E2E8F0" fontSize="6.5" fontFamily="monospace" textAnchor="middle">MPU6050 6-DOF</text>
          </g>
        );

      case 'SENSOR_PROXIMITY_INDUCTIVE':
        return (
          <g>
            <rect x="-24" y="-14" width="48" height="28" rx="2" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <path d="M -16,-8 L -16,8 M -16,-4 L -8,0 L -16,4" stroke="#F59E0B" strokeWidth="1.5" />
            <path d="M 0,-8 L 8,0 L 0,8 L -8,0 Z" stroke="#38BDF8" strokeWidth="1.5" fill="none" />
            <text x="0" y="22" fill="#E2E8F0" fontSize="6.5" fontFamily="monospace" textAnchor="middle">PROX INDUCTIVE</text>
          </g>
        );

      case 'ENCODER_OPTICAL':
        return (
          <g>
            <circle cx="0" cy="0" r="18" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <circle cx="0" cy="0" r="10" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3,3" fill="none" />
            <text x="0" y="3" fill="#38BDF8" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">ENC</text>
            <text x="0" y="26" fill="#E2E8F0" fontSize="6.5" fontFamily="monospace" textAnchor="middle">PULSE A/B/Z</text>
          </g>
        );

      case 'OPAMP_LM741':
        return (
          <g>
            {/* Standard OpAmp Triangle */}
            <path d="M -22,-24 L 24,0 L -22,24 Z" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <text x="-14" y="-10" fill="#94A3B8" fontSize="10" fontWeight="bold">-</text>
            <text x="-14" y="16" fill="#94A3B8" fontSize="10" fontWeight="bold">+</text>
            <text x="4" y="3" fill="#38BDF8" fontSize="7" fontFamily="monospace" fontWeight="bold">741</text>
          </g>
        );

      case 'COMPARATOR_LM393':
        return (
          <g>
            <path d="M -22,-24 L 24,0 L -22,24 Z" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <text x="-14" y="-10" fill="#94A3B8" fontSize="10" fontWeight="bold">-</text>
            <text x="-14" y="16" fill="#94A3B8" fontSize="10" fontWeight="bold">+</text>
            <text x="2" y="3" fill="#F59E0B" fontSize="6.5" fontFamily="monospace" fontWeight="bold">LM393</text>
          </g>
        );

      case 'CONTACTOR_MAIN':
        return (
          <g>
            <rect x="-40" y="-30" width="80" height="60" rx="4" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            {/* Coil A1-A2 block */}
            <rect x="-35" y="-12" width="16" height="24" stroke="#F59E0B" strokeWidth="1.5" fill="#1E293B" />
            <text x="-27" y="3" fill="#F59E0B" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">A1/A2</text>
            {/* 3 Main Power Contacts */}
            <path d="M -15,-20 L -15,-8 M -15,8 L -15,20 M -18,-8 L -12,4" stroke="#34D399" strokeWidth="1.8" />
            <path d="M 5,-20 L 5,-8 M 5,8 L 5,20 M 2,-8 L 8,4" stroke="#34D399" strokeWidth="1.8" />
            <path d="M 25,-20 L 25,-8 M 25,8 L 25,20 M 22,-8 L 28,4" stroke="#34D399" strokeWidth="1.8" />
            <text x="5" y="-2" fill="#94A3B8" fontSize="7" fontFamily="monospace" textAnchor="middle">KM 3P</text>
          </g>
        );

      case 'PUSHBUTTON_NO':
        return (
          <g>
            <path d="M -25,0 L -10,0 M 10,0 L 25,0" stroke={strokeColor} strokeWidth="2" />
            <circle cx="-10" cy="0" r="2.5" fill="none" stroke={strokeColor} strokeWidth="1.5" />
            <circle cx="10" cy="0" r="2.5" fill="none" stroke={strokeColor} strokeWidth="1.5" />
            {/* Disconnected Open Plate */}
            <path d="M -10,-8 L 10,-8 M 0,-8 L 0,-15 M -6,-15 L 6,-15" stroke="#10B981" strokeWidth="2.5" />
            <text x="0" y="14" fill="#10B981" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">START (NO)</text>
          </g>
        );

      case 'PUSHBUTTON_NC':
        return (
          <g>
            <path d="M -25,0 L -10,0 M 10,0 L 25,0" stroke={strokeColor} strokeWidth="2" />
            <circle cx="-10" cy="0" r="2.5" fill="none" stroke={strokeColor} strokeWidth="1.5" />
            <circle cx="10" cy="0" r="2.5" fill="none" stroke={strokeColor} strokeWidth="1.5" />
            {/* Bridged Closed Plate */}
            <path d="M -10,0 L 10,0 M 0,0 L 0,-10 M -6,-10 L 6,-10" stroke="#EF4444" strokeWidth="2.5" />
            <text x="0" y="14" fill="#EF4444" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">STOP (NC)</text>
          </g>
        );

      case 'EMERGENCY_STOP':
        return (
          <g>
            <path d="M -25,0 L -10,0 M 10,0 L 25,0" stroke={strokeColor} strokeWidth="2" />
            <circle cx="-10" cy="0" r="2.5" fill="none" stroke={strokeColor} strokeWidth="1.5" />
            <circle cx="10" cy="0" r="2.5" fill="none" stroke={strokeColor} strokeWidth="1.5" />
            {/* Mushroom Head Cap */}
            <path d="M -10,0 L 10,0 M 0,0 L 0,-10" stroke="#EF4444" strokeWidth="2" />
            <path d="M -12,-10 C -12,-18 12,-18 12,-10 Z" fill="#EF4444" stroke="#DC2626" strokeWidth="1.5" />
            <text x="0" y="14" fill="#EF4444" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">E-STOP</text>
          </g>
        );

      case 'PROTECTION_MCB_1P':
      case 'PROTECTION_MCB_3P':
        return (
          <g>
            <rect x="-22" y="-28" width="44" height="56" rx="3" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <path d="M 0,-25 L 0,-10 M 0,10 L 0,25" stroke={strokeColor} strokeWidth="2" />
            {/* Bimetal Thermal & Magnetic Symbol */}
            <rect x="-5" y="-10" width="10" height="8" stroke="#F59E0B" strokeWidth="1.5" fill="none" />
            <path d="M 0,-2 L -4,4 M -4,4 L -2,8" stroke="#38BDF8" strokeWidth="1.5" fill="none" />
            <text x="0" y="2" fill="#E2E8F0" fontSize="7" fontFamily="monospace" textAnchor="middle">MCB</text>
          </g>
        );

      case 'MOTOR_3PHASE':
        return (
          <g>
            <circle cx="0" cy="0" r="26" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <text x="0" y="2" fill="#38BDF8" fontSize="13" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">M</text>
            <text x="0" y="14" fill="#94A3B8" fontSize="9" fontFamily="monospace" textAnchor="middle">3 ~</text>
          </g>
        );

      default:
        // Generic Integrated Circuit block
        return (
          <g>
            <rect
              x="-30"
              y="-20"
              width="60"
              height="40"
              rx="3"
              stroke={strokeColor}
              strokeWidth="2"
              fill={fillColor}
            />
            <text
              x="0"
              y="4"
              fill="#F8FAFC"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              {type}
            </text>
          </g>
        );
    }
  };

  const isMcu = [
    'ARDUINO_UNO',
    'ARDUINO_NANO',
    'ARDUINO_MEGA',
    'ESP32_DEVKIT',
    'ESP32_S3',
    'ESP32_C3',
    'RASPBERRY_PI_PICO',
    'RASPBERRY_PI_PICO2',
    'STM32F103',
    'STM32_NUCLEO',
  ].includes(type) || component.category === 'microcontrollers';

  const compW = component.width ? Math.max(isMcu ? 130 : 60, component.width + 10) : (isMcu ? 130 : 60);
  const compH = component.height ? Math.max(isMcu ? 180 : 40, component.height + 10) : (isMcu ? 180 : 40);
  const halfW = compW / 2;
  const halfH = compH / 2;

  // Professional EDA standard label clearance: never overlaps component body or terminal pins
  const labelOffsetY = isMcu ? -(halfH + 12) : -(Math.max(halfH, 18) + 9);

  return (
    <div
      className={`relative select-none cursor-pointer transition-transform ${
        isSelected ? 'drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]' : ''
      }`}
      style={{
        transform: `rotate(${rotation}deg) ${mirrored ? 'scaleX(-1)' : ''}`,
      }}
    >
      {/* Precision Selection Reticle */}
      {isSelected && (
        <div
          className="absolute -inset-3.5 border border-dashed border-emerald-400/80 rounded-md pointer-events-none z-10"
          style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
        >
          {/* Corner alignment crosshairs */}
          <span className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-emerald-400" />
          <span className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-emerald-400" />
          <span className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-emerald-400" />
          <span className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-emerald-400" />
        </div>
      )}

      {/* SVG Canvas for Schematic Symbol */}
      <svg
        width={compW}
        height={compH}
        viewBox={`-${halfW} -${halfH} ${compW} ${compH}`}
        className="overflow-visible"
      >
        {renderSymbolGraphic()}
      </svg>

      {/* 1. Component Reference Designator (Cleanly ABOVE symbol bounding box, zero overlap) */}
      <div
        className="absolute left-1/2 top-1/2 flex items-center justify-center pointer-events-none whitespace-nowrap z-20"
        style={{
          transform: `translate(-50%, calc(-50% - ${halfH + 12}px)) rotate(${-rotation}deg)`,
        }}
      >
        <span className="font-mono text-[11px] font-bold text-emerald-400 tracking-wide drop-shadow-sm leading-tight bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
          {designator}
        </span>
      </div>

      {/* 2. Component Nominal Value (Cleanly BELOW symbol bounding box, zero overlap) */}
      <div
        className="absolute left-1/2 top-1/2 flex items-center justify-center pointer-events-none whitespace-nowrap z-20"
        style={{
          transform: `translate(-50%, calc(-50% + ${halfH + 14}px)) rotate(${-rotation}deg)`,
        }}
      >
        <span className="font-mono text-[10px] text-slate-200 font-semibold bg-slate-950/90 px-1.5 py-0.5 rounded border border-slate-800 shadow-sm leading-tight">
          {value}
        </span>
      </div>

      {/* Live Electrical Telemetry Badge (Displayed when actively simulating) */}
      {isSimulating && simState && (
        <div
          className="absolute left-1/2 top-1/2 flex items-center gap-1 font-mono text-[9px] font-bold text-cyan-300 bg-slate-950/90 px-1.5 py-0.5 rounded border border-cyan-800/60 shadow-lg pointer-events-none whitespace-nowrap z-20"
          style={{
            transform: `translate(-50%, calc(-50% + ${Math.abs(labelOffsetY)}px)) rotate(${-rotation}deg)`,
          }}
        >
          <span>{simState.voltage.toFixed(2)}V</span>
          <span className="text-slate-600">|</span>
          <span>{(simState.current * 1000).toFixed(1)}mA</span>
        </div>
      )}
    </div>
  );
}
