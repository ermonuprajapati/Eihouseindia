import React from 'react';

/**
 * AboutOrbitAnimation
 * Themed for About Us, EI House Mission, and "Where Ideas Become Things":
 * - 4-Phase Hardware Innovation Pipeline:
 *   [01. Concept & R&D] ➔ [02. CAD & EDA Simulation] ➔ [03. PCB Prototyping] ➔ [04. Industrial Scale Deployment]
 * - Precision engineering interconnects with gold-plated milestone gates
 * - Authentic brand colors representing national hardware transformation
 */
export function AboutOrbitAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute top-0 left-1/4 w-[500px] h-[340px] rounded-full bg-blue-600/10 blur-[90px]" />
      <div className="absolute -bottom-10 right-1/4 w-[450px] h-[300px] rounded-full bg-amber-500/10 blur-[85px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-55"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="aboutGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#0B1528" fillOpacity="0.08" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#aboutGrid)" />

        {/* -------------------------------------------------------- */}
        {/* INNOVATION LIFECYCLE BUS (Connecting 4 Major Milestones)  */}
        {/* -------------------------------------------------------- */}
        <path
          d="M 120 210 L 320 210 L 380 150 L 680 150 L 740 210 L 1020 210 L 1080 150 L 1320 150"
          fill="none"
          stroke="#0090FF"
          strokeWidth="2.5"
          className="animate-pcb-trace"
        />

        {/* Supporting Feedback & Iteration Bus */}
        <path
          d="M 120 224 L 315 224 L 375 164 L 685 164 L 745 224 L 1015 224 L 1075 164 L 1320 164"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="1.5"
          strokeOpacity="0.6"
        />

        {/* -------------------------------------------------------- */}
        {/* MILESTONE 01: CONCEPT & APPLIED RESEARCH                 */}
        {/* -------------------------------------------------------- */}
        <g transform="translate(240, 210)">
          <rect x="-65" y="-40" width="130" height="80" rx="10" fill="#070E1A" stroke="#0090FF" strokeWidth="1.75" />
          <circle cx="0" cy="-14" r="10" fill="#0090FF" fillOpacity="0.2" />
          <circle cx="0" cy="-14" r="3.5" fill="#38BDF8" />
          <text x="0" y="8" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontFamily="monospace" fontWeight="bold">01. RESEARCH</text>
          <text x="0" y="22" textAnchor="middle" fill="#93C5FD" fontSize="7" fontFamily="monospace">Core Problem & Math</text>
        </g>

        {/* -------------------------------------------------------- */}
        {/* MILESTONE 02: SCHEMATIC & EDA CAD DESIGN                 */}
        {/* -------------------------------------------------------- */}
        <g transform="translate(560, 150)">
          <rect x="-65" y="-40" width="130" height="80" rx="10" fill="#070E1A" stroke="#F59E0B" strokeWidth="1.75" />
          <circle cx="0" cy="-14" r="10" fill="#F59E0B" fillOpacity="0.2" />
          <circle cx="0" cy="-14" r="3.5" fill="#FBBF24" className="animate-ping" style={{ animationDuration: '2.5s' }} />
          <text x="0" y="8" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontFamily="monospace" fontWeight="bold">02. EDA & CAD</text>
          <text x="0" y="22" textAnchor="middle" fill="#FCD34D" fontSize="7" fontFamily="monospace">KiCad 8 & SPICE</text>
        </g>

        {/* -------------------------------------------------------- */}
        {/* MILESTONE 03: PHYSICAL HARDWARE PROTOTYPING              */}
        {/* -------------------------------------------------------- */}
        <g transform="translate(880, 210)">
          <rect x="-65" y="-40" width="130" height="80" rx="10" fill="#070E1A" stroke="#10B981" strokeWidth="1.75" />
          <circle cx="0" cy="-14" r="10" fill="#10B981" fillOpacity="0.2" />
          <circle cx="0" cy="-14" r="3.5" fill="#34D399" />
          <text x="0" y="8" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontFamily="monospace" fontWeight="bold">03. PROTOTYPE</text>
          <text x="0" y="22" textAnchor="middle" fill="#6EE7B7" fontSize="7" fontFamily="monospace">SMD Soldering & Lab</text>
        </g>

        {/* -------------------------------------------------------- */}
        {/* MILESTONE 04: MASS PRODUCTION & DEPLOYMENT IN INDIA      */}
        {/* -------------------------------------------------------- */}
        <g transform="translate(1200, 150)">
          <rect x="-65" y="-40" width="130" height="80" rx="10" fill="#070E1A" stroke="#FF8C00" strokeWidth="2" />
          <circle cx="0" cy="-14" r="14" fill="#FF8C00" fillOpacity="0.25" className="animate-chip-heartbeat" />
          <circle cx="0" cy="-14" r="4" fill="#FFFFFF" />
          <text x="0" y="8" textAnchor="middle" fill="#FBBF24" fontSize="9" fontFamily="monospace" fontWeight="bold">04. DEPLOY</text>
          <text x="0" y="22" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontFamily="monospace">Make in India · Scale</text>
        </g>

        {/* Technical Calibration Watermarks */}
        <text x="80" y="60" fill="#64748B" fontSize="8" fontFamily="monospace">
          FOUNDED_BY: ER. MONU PRAJAPATI · PHILOSOPHY: WHERE IDEAS BECOME THINGS · VISION: HARDWARE NATION
        </text>
      </svg>
    </div>
  );
}
