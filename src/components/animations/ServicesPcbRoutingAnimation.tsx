import React from 'react';

/**
 * ServicesPcbRoutingAnimation
 * Themed for Technical Services, Turnkey Hardware R&D, and Multi-Layer PCB Layout:
 * - High-speed controlled-impedance differential pairs (90Ω USB / 100Ω Ethernet)
 * - IPC-2221 standard 45° mitered trace geometry
 * - Ground plane via stitching shielding & thermal relief pads
 * - 4-Layer PCB Stackup Architecture
 * - Right-dominant layout (x: 860-1420) so left-side hero text is 100% crisp and readable
 */
export function ServicesPcbRoutingAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      {/* Soft Ambient Services Glows (Hardware Accelerated & Desktop-only for Max Mobile Speed) */}
      <div className="hidden sm:block absolute top-0 right-1/4 w-[500px] h-[340px] rounded-full bg-blue-600/10 blur-[80px] transform-gpu pointer-events-none" />
      <div className="hidden sm:block absolute -bottom-10 right-10 w-[440px] h-[300px] rounded-full bg-teal-500/10 blur-[75px] transform-gpu pointer-events-none" />

      <svg
        className="absolute inset-0 h-full w-full opacity-60"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="servicesPcbGrid" width="45" height="45" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#0B1528" fillOpacity="0.08" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#servicesPcbGrid)" />

        {/* ------------------------------------------------------------- */}
        {/* TOP MARGIN BUS                                                */}
        {/* ------------------------------------------------------------- */}
        <path
          d="M 60 65 L 680 65 L 740 120 L 1400 120"
          fill="none"
          stroke="#0284C7"
          strokeWidth="1.5"
          className="animate-pcb-trace"
        />

        {/* ------------------------------------------------------------- */}
        {/* RIGHT PLATFORM: HIGH-SPEED MULTI-LAYER PCB ROUTING (x: 1100, y: 220) */}
        {/* ------------------------------------------------------------- */}
        <g transform="translate(1100, 220)">
          {/* Main PCB Routing CAD Canvas */}
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

          {/* Canvas Header */}
          <rect x="-195" y="-123" width="160" height="20" rx="4" fill="#0B1528" stroke="#0090FF" strokeWidth="1" />
          <text x="-115" y="-109" textAnchor="middle" fill="#38BDF8" fontSize="8" fontFamily="monospace" fontWeight="bold">
            IPC-2221 HIGH-SPEED ROUTING
          </text>

          {/* Differential Pair Signal Highway (100Ω Impedance Controlled) */}
          <g>
            {/* Trace D+ (Cyber Blue) */}
            <path
              d="M -180 -40 L -90 -40 L -50 0 L 30 0 L 70 -40 L 180 -40"
              fill="none"
              stroke="#0090FF"
              strokeWidth="2.5"
              className="animate-pcb-trace"
            />
            {/* Trace D- (Electric Cyan Matched Length) */}
            <path
              d="M -180 -28 L -95 -28 L -55 12 L 25 12 L 65 -28 L 180 -28"
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2.5"
              className="animate-pcb-trace"
            />
          </g>

          {/* High-Current Power Bus (+3.3V / +5V) */}
          <path
            d="M -180 60 L -60 60 L -20 20 L 60 20 L 100 60 L 180 60"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="3.5"
            strokeOpacity="0.75"
            className="animate-pcb-trace-fast"
          />

          {/* Shielding Ground Via Fence Arrays */}
          {[-160, -120, -80, -40, 0, 40, 80, 120, 160].map((vx, idx) => (
            <g key={`via-stitch-${idx}`}>
              <circle cx={vx} cy="-60" r="4.5" fill="#070E1A" stroke="#0090FF" strokeWidth="1" />
              <circle cx={vx} cy="-60" r="1.5" fill="#38BDF8" />
              <circle cx={vx} cy="80" r="4.5" fill="#070E1A" stroke="#0090FF" strokeWidth="1" />
              <circle cx={vx} cy="80" r="1.5" fill="#38BDF8" />
            </g>
          ))}

          {/* Test Point Solder Pads */}
          <g transform="translate(-10, 0)">
            <circle cx="0" cy="0" r="10" fill="none" stroke="#0090FF" strokeWidth="0.8" className="animate-radar-ring-1" />
            <circle cx="0" cy="0" r="4" fill="#0090FF" />
            <text x="0" y="-14" textAnchor="middle" fill="#38BDF8" fontSize="7" fontFamily="monospace">TP_DIFF_PAIR</text>
          </g>

          {/* 4-Layer Stackup Schematic Block */}
          <g transform="translate(-185, -90)">
            <rect x="0" y="0" width="130" height="42" rx="4" fill="#0B1528" stroke="#334155" strokeWidth="1" />
            <text x="8" y="12" fill="#38BDF8" fontSize="6.5" fontFamily="monospace" fontWeight="bold">L1: TOP (90Ω USB DIFF)</text>
            <text x="8" y="24" fill="#64748B" fontSize="6.5" fontFamily="monospace">L2: GND (SOLID PLANE)</text>
            <text x="8" y="36" fill="#F59E0B" fontSize="6.5" fontFamily="monospace">L3: PWR / L4: BOT SIGNAL</text>
          </g>

          {/* Turnkey R&D Delivery Metrics */}
          <g transform="translate(55, -90)">
            <rect x="0" y="0" width="130" height="42" rx="4" fill="#0B1528" stroke="#10B981" strokeWidth="1" />
            <text x="8" y="12" fill="#34D399" fontSize="6.5" fontFamily="monospace" fontWeight="bold">TURNKEY R&amp;D SPECS</text>
            <text x="8" y="24" fill="#64748B" fontSize="6.5" fontFamily="monospace">TOLERANCE: IPC CLASS 3</text>
            <text x="8" y="36" fill="#38BDF8" fontSize="6.5" fontFamily="monospace">TURNAROUND: 5-7 DAYS</text>
          </g>

          {/* Bottom Telemetry Bar */}
          <text x="-190" y="122" fill="#64748B" fontSize="7" fontFamily="monospace">SERVICES: SCHEMATIC CAPTURE · 4-12 LAYER PCB · FIRMWARE · LAB BRINGUP</text>
          <text x="190" y="122" textAnchor="end" fill="#10B981" fontSize="7" fontFamily="monospace" fontWeight="bold">DFM / DFT READY</text>
        </g>

        {/* Clean Header Line */}
        <text x="80" y="48" fill="#64748B" fontSize="8" fontFamily="monospace">
          ENGINEERING_SERVICES: TURNKEY_HARDWARE · KICAD_ALTIUM · HIGH_SPEED_SIGNAL_INTEGRITY
        </text>
      </svg>
    </div>
  );
}
