import React from 'react';

/**
 * ProductsHardwareAnimation
 * Themed for Hardware Store, Development Boards & Electronic Components:
 * - SMD Silicon Package & Gold-Plated Solder Footprints
 * - 2.54mm Standard Pin Headers & Power Delivery Bus
 * - Microcontroller Dev-Board Blueprint with Component Markings
 */
export function ProductsHardwareAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute top-0 right-1/4 w-[500px] h-[340px] rounded-full bg-amber-500/10 blur-[90px]" />
      <div className="absolute -bottom-10 left-10 w-[420px] h-[280px] rounded-full bg-blue-500/10 blur-[85px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-55"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="hardwareGrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="#0B1528" fillOpacity="0.1" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#hardwareGrid)" />

        {/* -------------------------------------------------------- */}
        {/* HARDWARE BOARD SILICON PLATFORM (Center)                 */}
        {/* -------------------------------------------------------- */}
        <g transform="translate(720, 210)">
          {/* Main Hardware PCB Carrier */}
          <rect
            x="-220"
            y="-110"
            width="440"
            height="220"
            rx="12"
            fill="#070E1A"
            stroke="#1E3A8A"
            strokeWidth="1.5"
          />

          {/* Golden Corner Mounting Holes */}
          {[[-200, -90], [200, -90], [-200, 90], [200, 90]].map(([hx, hy], i) => (
            <g key={`hole-${i}`} transform={`translate(${hx}, ${hy})`}>
              <circle cx="0" cy="0" r="7" fill="none" stroke="#F59E0B" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="3.5" fill="#070E1A" stroke="#0090FF" strokeWidth="1" />
            </g>
          ))}

          {/* Central Microcontroller IC (LQFP-64) */}
          <rect
            x="-50"
            y="-50"
            width="100"
            height="100"
            rx="6"
            fill="#0B1528"
            stroke="#F59E0B"
            strokeWidth="1.5"
          />
          {/* Silicon Core Logo Marking */}
          <circle cx="0" cy="0" r="12" fill="#0090FF" fillOpacity="0.2" className="animate-chip-heartbeat" />
          <circle cx="0" cy="0" r="3" fill="#F59E0B" />
          <text x="0" y="-12" textAnchor="middle" fill="#FFFFFF" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
            EI-CORE
          </text>
          <text x="0" y="18" textAnchor="middle" fill="#93C5FD" fontSize="6" fontFamily="monospace">
            GENUINE MCU
          </text>

          {/* Surrounding Gold Pin Leads */}
          {[-35, -20, -5, 10, 25, 40].map((p, idx) => (
            <g key={`lead-${idx}`}>
              <line x1={p - 5} y1="-50" x2={p - 5} y2="-62" stroke="#F59E0B" strokeWidth="1.5" />
              <line x1={p - 5} y1="50" x2={p - 5} y2="62" stroke="#F59E0B" strokeWidth="1.5" />
              <line x1="-50" y1={p - 5} x2="-62" y2={p - 5} stroke="#F59E0B" strokeWidth="1.5" />
              <line x1="50" y1={p - 5} x2="62" y2={p - 5} stroke="#F59E0B" strokeWidth="1.5" />
            </g>
          ))}

          {/* Left Standard 2.54mm GPIO Header Strip */}
          <rect x="-180" y="-70" width="16" height="140" rx="3" fill="#0B1528" stroke="#334155" strokeWidth="1" />
          {[-50, -30, -10, 10, 30, 50].map((py, idx) => (
            <circle key={`gpio-l-${idx}`} cx="-172" cy={py} r="3" fill="#F59E0B" stroke="#0090FF" strokeWidth="0.8" />
          ))}

          {/* Right Standard 2.54mm GPIO Header Strip */}
          <rect x="164" y="-70" width="16" height="140" rx="3" fill="#0B1528" stroke="#334155" strokeWidth="1" />
          {[-50, -30, -10, 10, 30, 50].map((py, idx) => (
            <circle key={`gpio-r-${idx}`} cx="172" cy={py} r="3" fill="#F59E0B" stroke="#0090FF" strokeWidth="0.8" />
          ))}

          {/* USB Type-C Connector Receptacle */}
          <rect x="-218" y="-18" width="12" height="36" rx="3" fill="#334155" stroke="#94A3B8" strokeWidth="1" />
          <text x="-160" y="-80" fill="#64748B" fontSize="6.5" fontFamily="monospace">USB-C PD</text>

          {/* Active Data Bus Traces */}
          <path
            d="M -160 0 L -50 0 M 50 0 L 150 0"
            fill="none"
            stroke="#0090FF"
            strokeWidth="1.5"
            className="animate-pcb-trace"
          />
        </g>

        {/* Board Verification Callouts */}
        <text x="80" y="80" fill="#64748B" fontSize="8" fontFamily="monospace">
          HARDWARE_STATUS: VERIFIED_HARDWARE · ROHS_COMPLIANT · CE/FCC_READY
        </text>
      </svg>
    </div>
  );
}
