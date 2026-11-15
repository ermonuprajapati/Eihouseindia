import React from 'react';

/**
 * LibrarySiliconAnimation
 * Themed for Engineering Library & Technical Datasheets:
 * - Central Silicon Microcontroller / IC Package
 * - Pulsing PCB bus lines carrying streaming data
 * - Hexadecimal & binary address markers
 */
export function LibrarySiliconAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute top-0 right-1/4 w-[450px] h-[300px] rounded-full bg-emerald-500/10 blur-[85px]" />
      <div className="absolute -bottom-10 left-10 w-[380px] h-[250px] rounded-full bg-indigo-500/10 blur-[80px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-40"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* PCB Circuit Traces with Animated Signal Dashes */}
        <path
          d="M 50 120 L 160 120 L 220 60 L 380 60 L 420 100 L 580 100"
          fill="none"
          stroke="#10B981"
          strokeWidth="1.5"
          className="animate-pcb-trace"
        />
        <path
          d="M 120 160 L 200 160 L 250 210 L 450 210 L 490 170 L 680 170"
          fill="none"
          stroke="#6366F1"
          strokeWidth="1.5"
          className="animate-pcb-trace"
          style={{ animationDuration: '2.5s' }}
        />
        <path
          d="M 720 40 L 780 40 L 830 90 L 980 90"
          fill="none"
          stroke="#10B981"
          strokeWidth="1.2"
          className="animate-pcb-trace"
        />

        {/* Central Silicon Microchip Die */}
        <g transform="translate(420, 100)">
          {/* IC Body */}
          <rect x="-35" y="-35" width="70" height="70" rx="8" fill="#0B1528" stroke="#10B981" strokeWidth="1.5" />
          <circle cx="-25" cy="-25" r="3" fill="#10B981" />
          <text x="0" y="4" textAnchor="middle" fill="#34D399" fontSize="10" fontFamily="monospace" fontWeight="bold">
            MCU·32
          </text>
          {/* Chip Pins */}
          {[-20, -10, 0, 10, 20].map((offset) => (
            <React.Fragment key={offset}>
              <rect x="-42" y={offset - 2} width="7" height="4" fill="#10B981" opacity="0.8" />
              <rect x="35" y={offset - 2} width="7" height="4" fill="#10B981" opacity="0.8" />
              <rect x={offset - 2} y="-42" width="4" height="7" fill="#10B981" opacity="0.8" />
              <rect x={offset - 2} y="35" width="4" height="7" fill="#10B981" opacity="0.8" />
            </React.Fragment>
          ))}
        </g>

        {/* Binary / Hexadecimal Memory Nodes */}
        <g transform="translate(180, 50)" fill="#6366F1" opacity="0.5" fontSize="8" fontFamily="monospace">
          <text x="0" y="0">0x08000000 // FLASH</text>
          <text x="0" y="14">0x20000000 // SRAM</text>
        </g>

        {/* Via Test Points */}
        <circle cx="160" cy="120" r="4" fill="#10B981" fillOpacity="0.3" stroke="#10B981" strokeWidth="1.2" />
        <circle cx="220" cy="60" r="4" fill="#10B981" fillOpacity="0.3" stroke="#10B981" strokeWidth="1.2" />
        <circle cx="250" cy="210" r="4" fill="#6366F1" fillOpacity="0.3" stroke="#6366F1" strokeWidth="1.2" />
        <circle cx="490" cy="170" r="4" fill="#6366F1" fillOpacity="0.3" stroke="#6366F1" strokeWidth="1.2" />
      </svg>
    </div>
  );
}
