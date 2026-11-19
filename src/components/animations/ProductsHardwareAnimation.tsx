import React from 'react';

/**
 * ProductsHardwareAnimation
 * Themed for Hardware Store, Development Boards & Electronic Components:
 * - Multi-Layer Prototyping Board with LQFP-64 Silicon Core Package
 * - Dual 2.54mm GPIO Gold Pin Headers, USB Type-C Receptacle & Crystal Resonator
 * - 100% Bench-Tested Silicon Validation Callouts
 * - Right-dominant layout (x: 880-1420) so left-side hero text is 100% crisp and readable
 */
export function ProductsHardwareAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      {/* Soft Ambient Store Glows (Hardware Accelerated & Desktop-only for Max Mobile Speed) */}
      <div className="hidden sm:block absolute top-0 right-1/4 w-[500px] h-[340px] rounded-full bg-amber-500/10 blur-[80px] transform-gpu pointer-events-none" />
      <div className="hidden sm:block absolute -bottom-10 right-10 w-[440px] h-[300px] rounded-full bg-blue-500/10 blur-[75px] transform-gpu pointer-events-none" />

      <svg
        className="absolute inset-0 h-full w-full opacity-60"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="hardwareStoreGrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#0B1528" fillOpacity="0.08" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#hardwareStoreGrid)" />

        {/* ------------------------------------------------------------- */}
        {/* TOP MARGIN SIGNAL TRACE                                       */}
        {/* ------------------------------------------------------------- */}
        <path
          d="M 60 65 L 680 65 L 740 120 L 1400 120"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="1.5"
          className="animate-pcb-trace"
        />

        {/* ------------------------------------------------------------- */}
        {/* RIGHT PLATFORM: DEVELOPMENT BOARD BLUEPRINT (x: 1120, y: 220) */}
        {/* ------------------------------------------------------------- */}
        <g transform="translate(1120, 220)">
          {/* Main PCB Carrier Board */}
          <rect
            x="-200"
            y="-130"
            width="400"
            height="260"
            rx="14"
            fill="#050B14"
            fillOpacity="0.94"
            stroke="#1E3A8A"
            strokeWidth="1.75"
          />

          {/* Golden Corner Mounting Vias */}
          {[[-180, -110], [180, -110], [-180, 110], [180, 110]].map(([hx, hy], i) => (
            <g key={`hole-${i}`} transform={`translate(${hx}, ${hy})`}>
              <circle cx="0" cy="0" r="7.5" fill="none" stroke="#F59E0B" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="3.5" fill="#070E1A" stroke="#0090FF" strokeWidth="1" />
            </g>
          ))}

          {/* Central Microcontroller IC (LQFP-64 Package) */}
          <g transform="translate(0, -10)">
            <rect
              x="-55"
              y="-55"
              width="110"
              height="110"
              rx="6"
              fill="#0B1528"
              stroke="#F59E0B"
              strokeWidth="1.5"
            />
            {/* Silicon Die Logo Marking */}
            <circle cx="0" cy="0" r="14" fill="#0090FF" fillOpacity="0.2" className="animate-chip-heartbeat" />
            <circle cx="0" cy="0" r="4" fill="#F59E0B" />
            <text x="0" y="-16" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontFamily="monospace" fontWeight="bold">
              STM32 / ESP32
            </text>
            <text x="0" y="18" textAnchor="middle" fill="#93C5FD" fontSize="6.5" fontFamily="monospace">
              GENUINE SILICON
            </text>
            <text x="0" y="30" textAnchor="middle" fill="#34D399" fontSize="6" fontFamily="monospace">
              PRE-TESTED ✓
            </text>

            {/* Surrounding Gold Pin Leads */}
            {[-40, -25, -10, 5, 20, 35].map((p, idx) => (
              <g key={`lead-${idx}`}>
                <line x1={p} y1="-55" x2={p} y2="-68" stroke="#F59E0B" strokeWidth="1.5" />
                <line x1={p} y1="55" x2={p} y2="68" stroke="#F59E0B" strokeWidth="1.5" />
                <line x1="-55" y1={p} x2="-68" y2={p} stroke="#F59E0B" strokeWidth="1.5" />
                <line x1="55" y1={p} x2="68" y2={p} stroke="#F59E0B" strokeWidth="1.5" />
              </g>
            ))}
          </g>

          {/* Left Standard 2.54mm GPIO Header Strip */}
          <g transform="translate(-150, -10)">
            <rect x="-10" y="-90" width="20" height="180" rx="4" fill="#0B1528" stroke="#334155" strokeWidth="1" />
            {[-75, -55, -35, -15, 5, 25, 45, 65].map((py, idx) => (
              <g key={`gpio-l-${idx}`}>
                <circle cx="0" cy={py} r="3" fill="#F59E0B" stroke="#0090FF" strokeWidth="0.8" />
              </g>
            ))}
            <text x="-16" y="0" textAnchor="middle" fill="#64748B" fontSize="6.5" fontFamily="monospace" transform="rotate(-90 -16 0)">
              GPIO BANK A (3.3V)
            </text>
          </g>

          {/* Right Standard 2.54mm GPIO Header Strip */}
          <g transform="translate(150, -10)">
            <rect x="-10" y="-90" width="20" height="180" rx="4" fill="#0B1528" stroke="#334155" strokeWidth="1" />
            {[-75, -55, -35, -15, 5, 25, 45, 65].map((py, idx) => (
              <g key={`gpio-r-${idx}`}>
                <circle cx="0" cy={py} r="3" fill="#F59E0B" stroke="#0090FF" strokeWidth="0.8" />
              </g>
            ))}
            <text x="18" y="0" textAnchor="middle" fill="#64748B" fontSize="6.5" fontFamily="monospace" transform="rotate(90 18 0)">
              GPIO BANK B (5V TOLERANT)
            </text>
          </g>

          {/* USB Type-C Receptacle on Top Edge */}
          <g transform="translate(0, -130)">
            <rect x="-24" y="-8" width="48" height="16" rx="4" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.2" />
            <text x="0" y="4" textAnchor="middle" fill="#38BDF8" fontSize="6" fontFamily="monospace">USB-C</text>
          </g>

          {/* 16.000 MHz Crystal Resonator */}
          <g transform="translate(-80, 60)">
            <rect x="-16" y="-8" width="32" height="16" rx="3" fill="#0A1322" stroke="#64748B" strokeWidth="1" />
            <text x="0" y="3" textAnchor="middle" fill="#F59E0B" fontSize="6" fontFamily="monospace">16.0 MHz</text>
          </g>

          {/* LDO 3.3V Power Regulator */}
          <g transform="translate(80, 60)">
            <rect x="-16" y="-8" width="32" height="16" rx="3" fill="#0A1322" stroke="#10B981" strokeWidth="1" />
            <text x="0" y="3" textAnchor="middle" fill="#34D399" fontSize="6" fontFamily="monospace">3.3V LDO</text>
          </g>

          {/* Active Power Bus Traces */}
          <path
            d="M 0 -68 L 0 -122 M -135 -10 L -68 -10 M 68 -10 L 135 -10"
            fill="none"
            stroke="#0090FF"
            strokeWidth="1.5"
            className="animate-pcb-trace"
          />

          {/* Bottom Telemetry Bar */}
          <text x="-180" y="118" fill="#64748B" fontSize="7" fontFamily="monospace">CERTIFIED QUALITY: BENCH TESTED · ZERO DEFECTS</text>
          <text x="180" y="118" textAnchor="end" fill="#F59E0B" fontSize="7" fontFamily="monospace" fontWeight="bold">FAST DISPATCH</text>
        </g>

        {/* Clean Header Line */}
        <text x="80" y="48" fill="#64748B" fontSize="8" fontFamily="monospace">
          STORE_CATALOG: GENUINE_COMPONENTS · DEV_BOARDS · ROBOTICS · TEST_INSTRUMENTS · 3D_PRINTING
        </text>
      </svg>
    </div>
  );
}
