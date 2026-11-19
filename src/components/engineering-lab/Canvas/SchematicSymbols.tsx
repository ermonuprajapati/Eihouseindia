'use client';

import React from 'react';
import { CircuitComponent } from '@/modules/engineering-lab/types';

interface SchematicSymbolProps {
  component: CircuitComponent;
  isSelected: boolean;
  isSimulating: boolean;
  simState?: { voltage: number; current: number; on?: boolean; digitalOut?: number; onRed?: boolean; onGreen?: boolean; onBlue?: boolean };
}

/**
 * Standard IEEE / IEC Electrical Schematic Symbols
 * Renders professional vector schematic symbols with proper pins, reference designators, and values.
 */
export function SchematicSymbol({
  component,
  isSelected,
  isSimulating,
  simState,
}: SchematicSymbolProps) {
  const { type, value, rotation, mirrored } = component;
  const designator = component.designator || component.label.split(' ')[0] || component.type.slice(0, 3);
  const strokeColor = isSelected ? '#34D399' : '#94A3B8';
  const fillColor = '#0B1528';

  // Render symbol-specific vector graphics
  const renderSymbolGraphic = () => {
    switch (type) {
      case 'RESISTOR':
        return (
          <g>
            {/* Standard IEEE Zigzag Waveform */}
            <path
              d="M -30,0 L -18,0 L -14,-7 L -8,7 L -2,-7 L 4,7 L 10,-7 L 14,7 L 18,0 L 30,0"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        );

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

      case 'CAPACITOR': {
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
          </g>
        );

      case 'LED': {
        const isConducting = Boolean(simState?.on);
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

        return (
          <g>
            {/* Active Luminescence Glow Aura */}
            {isSimulating && isConducting && (
              <circle cx="0" cy="0" r="24" fill={ledHex} opacity="0.5" filter="blur(3px)" />
            )}
            {/* Anode lead */}
            <line x1="-25" y1="0" x2="-10" y2="0" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            {/* Diode Triangle - dynamically displays selected color at all times */}
            <polygon
              points="-10,-10 10,0 -10,10"
              fill={ledHex}
              fillOpacity={isConducting ? 1.0 : 0.35}
              stroke={ledHex}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Cathode Bar */}
            <line x1="10" y1="-10" x2="10" y2="10" stroke={ledHex} strokeWidth="2.5" strokeLinecap="round" />
            {/* Cathode lead */}
            <line x1="10" y1="0" x2="25" y2="0" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            {/* Emitted Photon Arrows in active LED color */}
            <path
              d="M 2,-8 L 10,-16 M 8,-16 L 10,-16 L 10,-14 M 8,-4 L 16,-12 M 14,-12 L 16,-12 L 16,-10"
              stroke={ledHex}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      }

      case 'BJT_NPN':
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
          </g>
        );

      case 'MOSFET_N':
        return (
          <g>
            <circle cx="0" cy="0" r="20" stroke={strokeColor} strokeWidth="1.5" fill={fillColor} />
            {/* Gate */}
            <line x1="-25" y1="10" x2="-8" y2="10" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="-8" y1="-8" x2="-8" y2="12" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
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
          </g>
        );

      case 'TIMER_555':
        return (
          <g>
            {/* Professional DIP-8 IC Body */}
            <rect
              x="-40"
              y="-45"
              width="80"
              height="90"
              rx="4"
              stroke={strokeColor}
              strokeWidth="2"
              fill={fillColor}
            />
            {/* Top Alignment Notch */}
            <path
              d="M -8,-45 A 8,8 0 0,0 8,-45"
              stroke={strokeColor}
              strokeWidth="1.5"
              fill="none"
            />
            {/* IC Identifier */}
            <text
              x="0"
              y="-28"
              fill="#F8FAFC"
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

      case 'SENSOR_ULTRASONIC':
        return (
          <g>
            {/* Sensor PCB Body */}
            <rect x="-35" y="-25" width="70" height="50" rx="4" stroke="#0284C7" strokeWidth="2" fill="#0C4A6E" />
            {/* Left Transducer (TX) */}
            <circle cx="-16" cy="0" r="12" stroke="#94A3B8" strokeWidth="2" fill="#020617" />
            <circle cx="-16" cy="0" r="6" stroke="#38BDF8" strokeWidth="1" fill="#0369A1" />
            {/* Right Transducer (RX) */}
            <circle cx="16" cy="0" r="12" stroke="#94A3B8" strokeWidth="2" fill="#020617" />
            <circle cx="16" cy="0" r="6" stroke="#38BDF8" strokeWidth="1" fill="#0369A1" />
            <text x="0" y="-16" fill="#F8FAFC" fontSize="7" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              HC-SR04
            </text>
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
        return (
          <g>
            <rect x="-45" y="-25" width="90" height="50" rx="3" stroke="#047857" strokeWidth="2" fill="#064E3B" />
            <rect x="-38" y="-16" width="76" height="26" rx="2" fill="#022C22" stroke="#059669" />
            <text x="0" y="-2" fill="#34D399" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              EI HOUSE LAB
            </text>
            <text x="0" y="7" fill="#6EE7B7" fontSize="7" fontFamily="monospace" textAnchor="middle">
              LCD 16x2 I2C
            </text>
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
        return (
          <g>
            <rect x="-30" y="-22" width="60" height="44" rx="4" stroke="#0284C7" strokeWidth="2" fill="#0284C7" />
            <circle cx="12" cy="0" r="10" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
            <line x1="12" y1="-14" x2="12" y2="14" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
            <text x="-12" y="3" fill="#FFFFFF" fontSize="7" fontWeight="bold" fontFamily="monospace">
              SG90
            </text>
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
        return (
          <g>
            <circle cx="0" cy="0" r="18" stroke={strokeColor} strokeWidth="2" fill="#0F172A" />
            <circle cx="0" cy="0" r="5" fill="#334155" />
            <text x="0" y="-8" fill="#F59E0B" fontSize="6.5" fontFamily="monospace" textAnchor="middle">
              BUZZER
            </text>
          </g>
        );

      case 'ACTUATOR_RGB_LED': {
        const onR = Boolean(simState?.onRed);
        const onG = Boolean(simState?.onGreen);
        const onB = Boolean(simState?.onBlue);
        const anyOn = onR || onG || onB;

        // Compute blended synthesized color
        let glowColor = '#38BDF8';
        if (onR && onG && onB) glowColor = '#F8FAFC'; // White
        else if (onR && onG) glowColor = '#FBBF24'; // Yellow
        else if (onR && onB) glowColor = '#F472B6'; // Magenta
        else if (onG && onB) glowColor = '#22D3EE'; // Cyan
        else if (onR) glowColor = '#EF4444'; // Red
        else if (onG) glowColor = '#10B981'; // Green
        else if (onB) glowColor = '#3B82F6'; // Blue

        return (
          <g>
            {/* Active Blended Optical Glow */}
            {isSimulating && anyOn && (
              <circle cx="0" cy="-2" r="26" fill={glowColor} opacity="0.45" filter="blur(4px)" />
            )}

            {/* Diffused Lens Boundary */}
            <circle cx="0" cy="-2" r="22" stroke={strokeColor} strokeWidth="1.8" fill="#070E1B" />

            {/* Channel Leads */}
            <line x1="-30" y1="-20" x2="-14" y2="-10" stroke={strokeColor} strokeWidth="1.5" />
            <line x1="10" y1="-20" x2="0" y2="-10" stroke={strokeColor} strokeWidth="1.5" />
            <line x1="30" y1="-20" x2="14" y2="-10" stroke={strokeColor} strokeWidth="1.5" />
            <line x1="-10" y1="20" x2="-10" y2="4" stroke={strokeColor} strokeWidth="1.5" />

            {/* Red Channel Diode */}
            <polygon
              points="-18,-9 -10,-9 -14,-2"
              fill={onR ? '#EF4444' : '#7F1D1D'}
              fillOpacity={onR ? 1 : 0.4}
              stroke="#EF4444"
              strokeWidth="1.2"
            />
            {onR && <circle cx="-14" cy="-5" r="7" fill="#EF4444" opacity="0.6" />}

            {/* Green Channel Diode */}
            <polygon
              points="-4,-9 4,-9 0,-2"
              fill={onG ? '#10B981' : '#064E3B'}
              fillOpacity={onG ? 1 : 0.4}
              stroke="#10B981"
              strokeWidth="1.2"
            />
            {onG && <circle cx="0" cy="-5" r="7" fill="#10B981" opacity="0.6" />}

            {/* Blue Channel Diode */}
            <polygon
              points="10,-9 18,-9 14,-2"
              fill={onB ? '#3B82F6' : '#1E3A8A'}
              fillOpacity={onB ? 1 : 0.4}
              stroke="#3B82F6"
              strokeWidth="1.2"
            />
            {onB && <circle cx="14" cy="-5" r="7" fill="#3B82F6" opacity="0.6" />}

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
        const pin13High = isSimulating && simState && (simState.on || simState.voltage > 2.5);
        const leftPins = [
          { label: 'RESET', y: -80 },
          { label: '3.3V', y: -70 },
          { label: '5V', y: -60 },
          { label: 'GND', y: -50 },
          { label: 'GND', y: -40 },
          { label: 'VIN', y: -30 },
          { label: 'A0', y: 0 },
          { label: 'A1', y: 10 },
          { label: 'A2', y: 20 },
          { label: 'A3', y: 30 },
          { label: 'A4/SDA', y: 40 },
          { label: 'A5/SCL', y: 50 },
        ];
        const rightPins = [
          { label: 'AREF', y: -80 },
          { label: 'GND', y: -70 },
          { label: '13', y: -60 },
          { label: '12', y: -50 },
          { label: '~11', y: -40 },
          { label: '~10', y: -30 },
          { label: '~9', y: -20 },
          { label: '8', y: -10 },
          { label: '7', y: 0 },
          { label: '~6', y: 10 },
          { label: '~5', y: 20 },
          { label: '4', y: 30 },
          { label: '~3', y: 40 },
          { label: '2', y: 50 },
          { label: 'TX>1', y: 60 },
          { label: 'RX<0', y: 70 },
        ];
        return (
          <g>
            {/* Real Arduino Uno R3 Italian Turquoise Blue PCB */}
            <rect x="-65" y="-90" width="130" height="180" rx="8" fill="#00878F" stroke="#005B60" strokeWidth="2.5" />
            <rect x="-61" y="-86" width="122" height="172" rx="6" fill="none" stroke="#00979C" strokeWidth="1" opacity="0.6" />

            {/* Silver Metallic USB-B Socket */}
            <rect x="-68" y="-70" width="16" height="24" rx="2" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.5" />
            <rect x="-66" y="-64" width="10" height="12" rx="1" fill="#334155" />

            {/* Black DC Power Barrel Jack */}
            <rect x="-68" y="-15" width="18" height="22" rx="3" fill="#1E293B" stroke="#0F172A" strokeWidth="1.5" />
            <circle cx="-58" cy="-4" r="3.5" fill="#F59E0B" />

            {/* ATmega328P DIP-28 IC Socket & Microcontroller Chip */}
            <rect x="-18" y="-20" width="36" height="52" rx="2" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
            <path d="M -4,-20 C -4,-16 4,-16 4,-20" fill="#1E293B" stroke="#334155" />
            <text x="0" y="8" fill="#E2E8F0" fontSize="5.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              ATmega328P
            </text>

            {/* 16MHz Crystal Resonator */}
            <rect x="-28" y="-6" width="7" height="18" rx="3" fill="#94A3B8" stroke="#64748B" strokeWidth="1" />
            <text x="-24.5" y="6" fill="#1E293B" fontSize="4.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">16.0</text>

            {/* Left Header Strip (Power & Analog) */}
            <rect x="-64" y="-86" width="10" height="145" rx="2" fill="#0F172A" stroke="#1E293B" strokeWidth="1" />
            {leftPins.map((lp, idx) => (
              <g key={idx}>
                <circle cx="-59" cy={lp.y} r="2" fill="#F59E0B" />
                <text x="-52" y={lp.y + 2} fill="#FFFFFF" fontSize="4.5" fontFamily="monospace" fontWeight="bold" textAnchor="start">
                  {lp.label}
                </text>
              </g>
            ))}

            {/* Right Header Strip (Digital PWM) */}
            <rect x="54" y="-86" width="10" height="165" rx="2" fill="#0F172A" stroke="#1E293B" strokeWidth="1" />
            {rightPins.map((rp, idx) => (
              <g key={idx}>
                <circle cx="59" cy={rp.y} r="2" fill="#F59E0B" />
                <text x="52" y={rp.y + 2} fill="#FFFFFF" fontSize="4.5" fontFamily="monospace" fontWeight="bold" textAnchor="end">
                  {rp.label}
                </text>
              </g>
            ))}

            {/* Active Pin 13 LED (L) & Power LED (ON) */}
            <circle cx="2" cy="-45" r="2.5" fill="#10B981" />
            <circle cx="10" cy="-45" r="2.5" fill={pin13High ? '#F59E0B' : '#78350F'} />
            {pin13High && <circle cx="10" cy="-45" r="7" fill="rgba(245,158,11,0.4)" />}
            <text x="2" y="-49" fill="#A7F3D0" fontSize="4" fontFamily="monospace" textAnchor="middle">ON</text>
            <text x="10" y="-49" fill="#FDE68A" fontSize="4" fontFamily="monospace" textAnchor="middle">L</text>

            {/* Arduino White Silkscreen Branding */}
            <text x="0" y="-60" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
              ARDUINO
            </text>
            <text x="0" y="55" fill="#FFFFFF" fontSize="7" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              UNO R3
            </text>
          </g>
        );
      }

      case 'ARDUINO_NANO': {
        const leftNano = [
          { label: 'TX1', y: -70 }, { label: 'RX0', y: -60 }, { label: 'RST', y: -50 }, { label: 'GND', y: -40 },
          { label: 'D2', y: -30 }, { label: 'D3~', y: -20 }, { label: 'D4', y: -10 }, { label: 'D5~', y: 0 },
          { label: 'D6~', y: 10 }, { label: 'D7', y: 20 }, { label: 'D8', y: 30 }, { label: 'D9~', y: 40 },
          { label: 'D10~', y: 50 }, { label: 'D11~', y: 60 }, { label: 'D12', y: 70 },
        ];
        const rightNano = [
          { label: 'VIN', y: -70 }, { label: 'GND', y: -60 }, { label: 'RST', y: -50 }, { label: '5V', y: -40 },
          { label: 'A7', y: -30 }, { label: 'A6', y: -20 }, { label: 'A5', y: -10 }, { label: 'A4', y: 0 },
          { label: 'A3', y: 10 }, { label: 'A2', y: 20 }, { label: 'A1', y: 30 }, { label: 'A0', y: 40 },
          { label: 'REF', y: 50 }, { label: '3V3', y: 60 }, { label: 'D13', y: 70 },
        ];
        return (
          <g>
            <rect x="-45" y="-80" width="90" height="160" rx="5" fill="#0284C7" stroke="#0369A1" strokeWidth="2" />
            {/* Mini-USB on Top */}
            <rect x="-10" y="-83" width="20" height="10" rx="1.5" fill="#CBD5E1" stroke="#94A3B8" />
            {/* ATmega328P TQFP Square Chip rotated 45 deg */}
            <g transform="translate(0, -6) rotate(45)">
              <rect x="-10" y="-10" width="20" height="20" rx="1" fill="#0F172A" stroke="#334155" />
              <circle cx="-6" cy="-6" r="1.5" fill="#94A3B8" />
            </g>
            {/* Left Header Strip & Silkscreen text */}
            <rect x="-44" y="-76" width="8" height="152" fill="#0F172A" />
            {leftNano.map((lp, idx) => (
              <g key={idx}>
                <circle cx="-40" cy={lp.y} r="1.8" fill="#F59E0B" />
                <text x="-34" y={lp.y + 2} fill="#FFFFFF" fontSize="4" fontFamily="monospace" fontWeight="bold">
                  {lp.label}
                </text>
              </g>
            ))}
            {/* Right Header Strip & Silkscreen text */}
            <rect x="36" y="-76" width="8" height="152" fill="#0F172A" />
            {rightNano.map((rp, idx) => (
              <g key={idx}>
                <circle cx="40" cy={rp.y} r="1.8" fill="#F59E0B" />
                <text x="34" y={rp.y + 2} fill="#FFFFFF" fontSize="4" fontFamily="monospace" fontWeight="bold" textAnchor="end">
                  {rp.label}
                </text>
              </g>
            ))}
            <text x="0" y="38" fill="#FFFFFF" fontSize="6.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              NANO V3
            </text>
          </g>
        );
      }

      case 'ARDUINO_MEGA': {
        const leftPins = [
          { name: 'VIN', y: -180 }, { name: '5V', y: -165 }, { name: '3V3', y: -150 },
          { name: 'GND', y: -135 }, { name: 'RESET', y: -120 }, { name: 'IOREF', y: -105 },
          { name: 'A0', y: -80 }, { name: 'A1', y: -65 }, { name: 'A2', y: -50 }, { name: 'A3', y: -35 },
          { name: 'A4', y: -20 }, { name: 'A5', y: -5 }, { name: 'A6', y: 10 }, { name: 'A7', y: 25 },
          { name: 'A8', y: 40 }, { name: 'A9', y: 55 }, { name: 'A10', y: 70 }, { name: 'A11', y: 85 },
          { name: 'A12', y: 100 }, { name: 'A13', y: 115 }, { name: 'A14', y: 130 }, { name: 'A15', y: 145 },
        ];

        const rightPins = [
          { name: 'D0 (RX0)', y: -180 }, { name: 'D1 (TX0)', y: -165 }, { name: 'D2 (PWM)', y: -150 },
          { name: 'D3 (PWM)', y: -135 }, { name: 'D4 (PWM)', y: -120 }, { name: 'D5 (PWM)', y: -105 },
          { name: 'D6 (PWM)', y: -90 }, { name: 'D7 (PWM)', y: -75 }, { name: 'D8 (PWM)', y: -60 },
          { name: 'D9 (PWM)', y: -45 }, { name: 'D10 (PWM)', y: -30 }, { name: 'D11 (PWM)', y: -15 },
          { name: 'D12 (PWM)', y: 0 }, { name: 'D13 (LED)', y: 15 }, { name: 'D14 (TX3)', y: 35 },
          { name: 'D15 (RX3)', y: 50 }, { name: 'D16 (TX2)', y: 65 }, { name: 'D17 (RX2)', y: 80 },
          { name: 'D18 (TX1)', y: 95 }, { name: 'D19 (RX1)', y: 110 }, { name: 'D20 (SDA)', y: 125 },
          { name: 'D21 (SCL)', y: 140 }, { name: 'AREF', y: 155 },
        ];

        return (
          <g>
            {/* Main PCB Chassis */}
            <rect x="-85" y="-195" width="170" height="430" rx="8" fill="#04121A" stroke="#00878F" strokeWidth="2.5" />

            {/* Top Connectors: USB-B & DC Jack */}
            <rect x="-35" y="-203" width="22" height="14" rx="2" fill="#94A3B8" stroke="#475569" strokeWidth="1" />
            <rect x="15" y="-203" width="20" height="15" rx="2" fill="#1E293B" stroke="#0F172A" strokeWidth="1" />

            {/* Header Titles */}
            <text x="0" y="-184" fill="#00C4CC" fontSize="8.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              ARDUINO MEGA 2560 R3
            </text>
            <text x="0" y="-174" fill="#64748B" fontSize="5.5" fontFamily="sans-serif" textAnchor="middle">
              ATmega2560 • 54 DIGITAL I/O • 16 ADC • 4 UART
            </text>

            {/* Left Header Strip (Power & Analog) */}
            <rect x="-84" y="-186" width="8" height="340" fill="#0B1320" stroke="#1E293B" strokeWidth="0.5" />
            {leftPins.map((lp, i) => (
              <g key={`lp-${i}`}>
                <circle cx="-80" cy={lp.y} r="2" fill="#F59E0B" />
                <text x="-74" y={lp.y + 2.5} fill="#CBD5E1" fontSize="4.5" fontFamily="monospace" fontWeight="bold">
                  {lp.name}
                </text>
              </g>
            ))}

            {/* Right Header Strip (Digital & Comm) */}
            <rect x="76" y="-186" width="8" height="350" fill="#0B1320" stroke="#1E293B" strokeWidth="0.5" />
            {rightPins.map((rp, i) => (
              <g key={`rp-${i}`}>
                <circle cx="80" cy={rp.y} r="2" fill="#38BDF8" />
                <text x="73" y={rp.y + 2.5} fill="#CBD5E1" fontSize="4.5" fontFamily="monospace" fontWeight="bold" textAnchor="end">
                  {rp.name}
                </text>
              </g>
            ))}

            {/* Center: ATmega2560 TQFP IC Package */}
            <g transform="translate(0, -20) rotate(45)">
              <rect x="-18" y="-18" width="36" height="36" rx="3" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
              <circle cx="-13" cy="-13" r="1.5" fill="#64748B" />
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
            <text x="0" y="224" fill="#64748B" fontSize="4.5" fontFamily="monospace" textAnchor="middle">
              D50(MISO) • D51(MOSI) • D52(SCK) • D53(SS)
            </text>
          </g>
        );
      }

      case 'ESP32_DEVKIT':
      case 'ESP32_S3':
      case 'ESP32_C3': {
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
            <rect x="-55" y="-80" width="110" height="160" rx="5" fill="#0F172A" stroke="#1E293B" strokeWidth="2" />
            <rect x="-26" y="-35" width="52" height="45" rx="3" fill="#94A3B8" stroke="#64748B" strokeWidth="1.5" />
            <path d="M -18,-45 L 18,-45 L 18,-40 L -12,-40 L -12,-37 L 18,-37" fill="none" stroke="#F59E0B" strokeWidth="1.8" />
            <text x="0" y="-18" fill="#1E293B" fontSize="5.5" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
              ESP-WROOM-32
            </text>
            <rect x="-54" y="-76" width="8" height="152" fill="#0F172A" stroke="#F59E0B" strokeWidth="0.5" />
            {leftEsp.map((lp, idx) => (
              <g key={idx}>
                <circle cx="-50" cy={lp.y} r="1.8" fill="#F59E0B" />
                <text x="-44" y={lp.y + 2} fill="#FFFFFF" fontSize="4" fontFamily="monospace" fontWeight="bold">
                  {lp.label}
                </text>
              </g>
            ))}
            <rect x="46" y="-76" width="8" height="152" fill="#0F172A" stroke="#F59E0B" strokeWidth="0.5" />
            {rightEsp.map((rp, idx) => (
              <g key={idx}>
                <circle cx="50" cy={rp.y} r="1.8" fill="#F59E0B" />
                <text x="44" y={rp.y + 2} fill="#FFFFFF" fontSize="4" fontFamily="monospace" fontWeight="bold" textAnchor="end">
                  {rp.label}
                </text>
              </g>
            ))}
            <text x="0" y="45" fill="#38BDF8" fontSize="7" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              ESP32 DEVKIT
            </text>
          </g>
        );
      }

      case 'RASPBERRY_PI_PICO':
      case 'RASPBERRY_PI_PICO2': {
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
            <rect x="-50" y="-85" width="100" height="172" rx="5" fill="#005930" stroke="#004324" strokeWidth="2" />
            <rect x="-9" y="-88" width="18" height="9" rx="1.5" fill="#CBD5E1" stroke="#94A3B8" />
            <g transform="translate(0, -6) rotate(45)">
              <rect x="-10" y="-10" width="20" height="20" rx="1" fill="#0F172A" stroke="#334155" />
            </g>
            <text x="0" y="2" fill="#FFFFFF" fontSize="5.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              {type === 'RASPBERRY_PI_PICO2' ? 'RP2350' : 'RP2040'}
            </text>
            <rect x="-49" y="-80" width="8" height="162" fill="#004324" />
            {leftPico.map((label, idx) => {
              const py = -75 + idx * 8;
              return (
                <g key={idx}>
                  <circle cx="-45" cy={py} r="1.5" fill="#F59E0B" />
                  <text x="-40" y={py + 1.8} fill="#FFFFFF" fontSize="3.5" fontFamily="monospace" fontWeight="bold">
                    {label}
                  </text>
                </g>
              );
            })}
            <rect x="41" y="-80" width="8" height="162" fill="#004324" />
            {rightPico.map((label, idx) => {
              const py = -75 + idx * 8;
              return (
                <g key={idx}>
                  <circle cx="45" cy={py} r="1.5" fill="#F59E0B" />
                  <text x="40" y={py + 1.8} fill="#FFFFFF" fontSize="3.5" fontFamily="monospace" fontWeight="bold" textAnchor="end">
                    {label}
                  </text>
                </g>
              );
            })}
            <text x="0" y="45" fill="#A7F3D0" fontSize="5" fontFamily="monospace" textAnchor="middle">
              PICO RP2040
            </text>
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

  // Tight label offset right next to the component body without floating into empty space
  const labelOffsetY = isMcu ? -(halfH + 8) : -(Math.min(halfH, 22) + 6);

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

      {/* Standard Reference Designator & Nominal Value Labels (Tight to body, counter-rotated to stay readable) */}
      <div
        className="absolute left-1/2 top-1/2 flex flex-col items-center pointer-events-none whitespace-nowrap z-20"
        style={{
          transform: `translate(-50%, calc(-50% + ${labelOffsetY}px)) rotate(${-rotation}deg)`,
        }}
      >
        <span className="font-mono text-[11px] font-bold text-emerald-400 tracking-wide drop-shadow-sm leading-tight">
          {designator}
        </span>
        <span className="font-mono text-[10px] text-slate-200 font-semibold bg-slate-950/85 px-1 py-0.5 rounded border border-slate-800 leading-tight">
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
