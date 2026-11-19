import React from 'react';

/**
 * AboutOrbitAnimation
 * Themed for About Us, EI House Mission, and "Where Ideas Become Things":
 * - 4-Phase Hardware Innovation Pipeline:
 *   [01. Applied Research] ➔ [02. EDA & Simulation] ➔ [03. Physical Prototype] ➔ [04. Scale Deployment]
 * - Precision engineering interconnects with gold-plated milestone gates
 * - Right-dominant layout (x: 860-1420) so left-side hero text is 100% crisp and readable
 */
export function AboutOrbitAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      {/* Soft Ambient About Glows (Hardware Accelerated & Desktop-only for Max Mobile Speed) */}
      <div className="hidden sm:block absolute top-0 right-1/4 w-[500px] h-[340px] rounded-full bg-blue-600/10 blur-[80px] transform-gpu pointer-events-none" />
      <div className="hidden sm:block absolute -bottom-10 right-10 w-[440px] h-[300px] rounded-full bg-amber-500/10 blur-[75px] transform-gpu pointer-events-none" />

      <svg
        className="absolute inset-0 h-full w-full opacity-60"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="aboutCadGrid" width="45" height="45" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#0B1528" fillOpacity="0.08" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#aboutCadGrid)" />

        {/* ------------------------------------------------------------- */}
        {/* TOP MARGIN BUS                                                */}
        {/* ------------------------------------------------------------- */}
        <path
          d="M 60 65 L 680 65 L 740 120 L 1400 120"
          fill="none"
          stroke="#0090FF"
          strokeWidth="1.5"
          className="animate-pcb-trace"
        />

        {/* ------------------------------------------------------------- */}
        {/* RIGHT PLATFORM: INNOVATION LIFECYCLE ENGINE (x: 1100, y: 220)  */}
        {/* ------------------------------------------------------------- */}
        <g transform="translate(1100, 220)">
          {/* Main Lifecycle Blueprint Chassis */}
          <rect
            x="-210"
            y="-135"
            width="420"
            height="270"
            rx="12"
            fill="#050B14"
            fillOpacity="0.94"
            stroke="#1E3A8A"
            strokeWidth="1.75"
          />

          {/* Header */}
          <rect x="-195" y="-123" width="170" height="20" rx="4" fill="#0B1528" stroke="#0090FF" strokeWidth="1" />
          <text x="-110" y="-109" textAnchor="middle" fill="#38BDF8" fontSize="8" fontFamily="monospace" fontWeight="bold">
            THE HARDWARE INNOVATION LOOP
          </text>

          {/* Flowing Pipeline Trace connecting the 4 phases */}
          <path
            d="M -150 -40 L -50 -40 L 50 -40 L 150 -40 M 150 40 L 50 40 L -50 40 L -150 40"
            fill="none"
            stroke="#0090FF"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            strokeOpacity="0.4"
          />
          <path
            d="M -150 -40 L 150 -40 L 150 40 L -150 40"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            className="animate-pcb-trace"
          />

          {/* PHASE 01: RESEARCH & MATH (x: -110, y: -40) */}
          <g transform="translate(-110, -40)">
            <rect x="-42" y="-30" width="84" height="60" rx="6" fill="#0B1528" stroke="#0090FF" strokeWidth="1.2" />
            <circle cx="0" cy="-10" r="7" fill="#0090FF" fillOpacity="0.2" />
            <circle cx="0" cy="-10" r="2.5" fill="#38BDF8" />
            <text x="0" y="8" textAnchor="middle" fill="#FFFFFF" fontSize="7.5" fontFamily="monospace" fontWeight="bold">01. RESEARCH</text>
            <text x="0" y="19" textAnchor="middle" fill="#93C5FD" fontSize="6" fontFamily="monospace">Core Problem</text>
          </g>

          {/* PHASE 02: EDA & SIMULATION (x: 110, y: -40) */}
          <g transform="translate(110, -40)">
            <rect x="-42" y="-30" width="84" height="60" rx="6" fill="#0B1528" stroke="#F59E0B" strokeWidth="1.2" />
            <circle cx="0" cy="-10" r="7" fill="#F59E0B" fillOpacity="0.2" />
            <circle cx="0" cy="-10" r="2.5" fill="#FBBF24" />
            <text x="0" y="8" textAnchor="middle" fill="#FFFFFF" fontSize="7.5" fontFamily="monospace" fontWeight="bold">02. EDA CAD</text>
            <text x="0" y="19" textAnchor="middle" fill="#FCD34D" fontSize="6" fontFamily="monospace">KiCad 8 &amp; SPICE</text>
          </g>

          {/* PHASE 03: HARDWARE PROTOTYPING (x: 110, y: 40) */}
          <g transform="translate(110, 40)">
            <rect x="-42" y="-30" width="84" height="60" rx="6" fill="#0B1528" stroke="#10B981" strokeWidth="1.2" />
            <circle cx="0" cy="-10" r="7" fill="#10B981" fillOpacity="0.2" />
            <circle cx="0" cy="-10" r="2.5" fill="#34D399" />
            <text x="0" y="8" textAnchor="middle" fill="#FFFFFF" fontSize="7.5" fontFamily="monospace" fontWeight="bold">03. PROTOTYPE</text>
            <text x="0" y="19" textAnchor="middle" fill="#6EE7B7" fontSize="6" fontFamily="monospace">SMD Soldering</text>
          </g>

          {/* PHASE 04: SCALE DEPLOYMENT (x: -110, y: 40) */}
          <g transform="translate(-110, 40)">
            <rect x="-42" y="-30" width="84" height="60" rx="6" fill="#0B1528" stroke="#FF8C00" strokeWidth="1.5" />
            <circle cx="0" cy="-10" r="8" fill="#FF8C00" fillOpacity="0.25" className="animate-chip-heartbeat" />
            <circle cx="0" cy="-10" r="3" fill="#FFFFFF" />
            <text x="0" y="8" textAnchor="middle" fill="#FBBF24" fontSize="7.5" fontFamily="monospace" fontWeight="bold">04. DEPLOY</text>
            <text x="0" y="19" textAnchor="middle" fill="#FFFFFF" fontSize="6" fontFamily="monospace">Make In India</text>
          </g>

          {/* Center Brand Philosophy Aura */}
          <g transform="translate(0, 0)">
            <circle cx="0" cy="0" r="16" fill="#0B1528" stroke="#334155" strokeWidth="1" />
            <circle cx="0" cy="0" r="4" fill="#0090FF" className="animate-pulse" />
            <text x="0" y="2" textAnchor="middle" fill="#93C5FD" fontSize="5" fontFamily="monospace">LOOP</text>
          </g>

          {/* Bottom Status Bar */}
          <text x="-190" y="122" fill="#64748B" fontSize="7" fontFamily="monospace">FOUNDED BY: ER. MONU PRAJAPATI · PHILOSOPHY: WHERE IDEAS BECOME THINGS</text>
          <text x="190" y="122" textAnchor="end" fill="#F59E0B" fontSize="7" fontFamily="monospace" fontWeight="bold">HARDWARE NATION</text>
        </g>

        {/* Clean Header Line */}
        <text x="80" y="48" fill="#64748B" fontSize="8" fontFamily="monospace">
          EI_HOUSE_MISSION: WHERE_IDEAS_BECOME_THINGS · HARDWARE_INNOVATION · MAKE_IN_INDIA
        </text>
      </svg>
    </div>
  );
}
