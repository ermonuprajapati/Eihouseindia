'use client';

import React from 'react';
import { CircuitComponent } from '@/modules/engineering-lab/types';

interface SchematicSymbolProps {
  component: CircuitComponent;
  isSelected: boolean;
  isSimulating: boolean;
  simState?: { voltage: number; current: number; on?: boolean; digitalOut?: number };
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
              <circle cx="0" cy="0" r="24" fill={ledHex} opacity="0.45" filter="blur(3px)" />
            )}
            {/* Anode lead */}
            <line x1="-25" y1="0" x2="-10" y2="0" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            {/* Diode Triangle */}
            <polygon
              points="-10,-10 10,0 -10,10"
              fill={isConducting ? ledHex : fillColor}
              stroke={isConducting ? ledHex : strokeColor}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Cathode Bar */}
            <line x1="10" y1="-10" x2="10" y2="10" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            {/* Cathode lead */}
            <line x1="10" y1="0" x2="25" y2="0" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            {/* Emitted Photon Arrows in active LED color */}
            <path
              d="M 2,-8 L 10,-16 M 8,-16 L 10,-16 L 10,-14 M 8,-4 L 16,-12 M 14,-12 L 16,-12 L 16,-10"
              stroke={isConducting ? ledHex : '#F59E0B'}
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

      case 'ACTUATOR_RGB_LED':
        return (
          <g>
            <circle cx="0" cy="0" r="18" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
            <circle cx="-6" cy="-4" r="3.5" fill="#EF4444" />
            <circle cx="6" cy="-4" r="3.5" fill="#10B981" />
            <circle cx="0" cy="6" r="3.5" fill="#3B82F6" />
            <text x="0" y="-12" fill="#94A3B8" fontSize="6.5" fontFamily="monospace" textAnchor="middle">
              RGB LED
            </text>
          </g>
        );

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

      case 'ARDUINO_UNO':
      case 'ARDUINO_MEGA':
      case 'ARDUINO_NANO':
      case 'ESP32_DEVKIT':
      case 'ESP32_S3':
      case 'ESP32_C3':
      case 'STM32F103':
      case 'STM32_NUCLEO':
      case 'RASPBERRY_PI_PICO':
      case 'RASPBERRY_PI_PICO2': {
        const boardTitle =
          type === 'ARDUINO_MEGA'
            ? 'MEGA 2560'
            : type === 'ARDUINO_NANO'
            ? 'NANO V3'
            : type === 'ESP32_DEVKIT'
            ? 'ESP32 WROOM'
            : type === 'ESP32_S3'
            ? 'ESP32-S3'
            : type === 'ESP32_C3'
            ? 'ESP32-C3 RISC-V'
            : type === 'STM32F103'
            ? 'STM32F103'
            : type === 'STM32_NUCLEO'
            ? 'NUCLEO-F401RE'
            : type === 'RASPBERRY_PI_PICO2'
            ? 'PICO 2 (RP2350)'
            : type === 'RASPBERRY_PI_PICO'
            ? 'PI PICO'
            : 'ARDUINO UNO';
        const boardColor =
          type.includes('ESP')
            ? '#BE185D'
            : type.includes('STM')
            ? '#2563EB'
            : type.includes('PICO')
            ? '#059669'
            : '#0284C7';
        return (
          <g>
            {/* MCU Board Outline */}
            <rect
              x="-65"
              y="-40"
              width="130"
              height="80"
              rx="5"
              stroke={boardColor}
              strokeWidth="2"
              fill="#082F49"
            />
            {/* USB & Power Jacks */}
            <rect x="-68" y="-30" width="12" height="18" rx="2" fill="#94A3B8" />
            <rect x="-68" y="10" width="16" height="14" rx="2" fill="#1E293B" />
            {/* Main Processor IC */}
            <rect x="-10" y="-12" width="50" height="24" rx="2" fill="#0F172A" stroke="#334155" />
            <text x="15" y="3" fill="#94A3B8" fontSize="7" fontFamily="monospace" textAnchor="middle">
              {component.value.split(' ')[0]}
            </text>
            <text x="0" y="-24" fill="#38BDF8" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              {boardTitle}
            </text>
          </g>
        );
      }

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
        width="110"
        height="90"
        viewBox="-55 -45 110 90"
        className="overflow-visible"
      >
        {renderSymbolGraphic()}
      </svg>

      {/* Standard Reference Designator & Nominal Value Labels (Counter-rotated to stay readable) */}
      <div
        className="absolute left-1/2 -top-5 -translate-x-1/2 flex flex-col items-center pointer-events-none whitespace-nowrap z-20"
        style={{
          transform: `translate(-50%, -100%) rotate(${-rotation}deg)`,
        }}
      >
        <span className="font-mono text-[11px] font-bold text-emerald-400 tracking-wide drop-shadow-sm">
          {designator}
        </span>
        <span className="font-mono text-[10px] text-slate-200 font-semibold bg-slate-950/80 px-1 py-0.2 rounded border border-slate-800">
          {value}
        </span>
      </div>

      {/* Live Electrical Telemetry Badge (Displayed when actively simulating) */}
      {isSimulating && simState && (
        <div
          className="absolute left-1/2 -bottom-5 -translate-x-1/2 flex items-center gap-1 font-mono text-[9px] font-bold text-cyan-300 bg-slate-950/90 px-1.5 py-0.5 rounded border border-cyan-800/60 shadow-lg pointer-events-none whitespace-nowrap z-20"
          style={{
            transform: `translate(-50%, 100%) rotate(${-rotation}deg)`,
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
