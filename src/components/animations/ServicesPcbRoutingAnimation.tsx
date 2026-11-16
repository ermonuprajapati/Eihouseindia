import React from 'react';

/**
 * ServicesPcbRoutingAnimation
 * Themed for Technical Services, Turnkey Hardware R&D, and Multi-Layer PCB Layout:
 * - High-speed controlled-impedance differential pairs (90Ω / 100Ω)
 * - Standard 45° IPC-2221 trace layout geometry
 * - Ground plane via stitching & thermal relief solder pads
 * - Flowing data packets demonstrating high-frequency signal integrity
 */
export function ServicesPcbRoutingAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute top-5 right-1/4 w-[500px] h-[320px] rounded-full bg-blue-600/10 blur-[90px]" />
      <div className="absolute -bottom-10 left-10 w-[420px] h-[280px] rounded-full bg-teal-500/10 blur-[85px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-55"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="pcbServiceGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#0B1528" fillOpacity="0.08" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#pcbServiceGrid)" />

        {/* -------------------------------------------------------- */}
        {/* DIFFERENTIAL PAIR HIGH-SPEED SIGNAL BUS (Bus A)          */}
        {/* -------------------------------------------------------- */}
        <path
          d="M 40 140 L 280 140 L 360 220 L 680 220 L 740 160 L 1080 160 L 1140 220 L 1400 220"
          fill="none"
          stroke="#0284C7"
          strokeWidth="2.5"
          className="animate-pcb-trace"
        />
        {/* Companion Trace 100-Ohm matched */}
        <path
          d="M 40 152 L 275 152 L 355 232 L 685 232 L 745 172 L 1075 172 L 1135 232 L 1400 232"
          fill="none"
          stroke="#38BDF8"
          strokeWidth="2.5"
          className="animate-pcb-trace"
        />

        {/* Secondary Bus B: High-Current Power Plane Route */}
        <path
          d="M 80 320 L 420 320 L 480 260 L 820 260 L 880 320 L 1360 320"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="3"
          strokeOpacity="0.7"
          className="animate-pcb-trace-fast"
        />

        {/* -------------------------------------------------------- */}
        {/* VIA STITCHING ARRAYS (Shielding Ground Planes)            */}
        {/* -------------------------------------------------------- */}
        {[200, 300, 500, 600, 800, 950, 1200].map((vx, i) => (
          <g key={`via-group-${i}`} transform={`translate(${vx}, 110)`}>
            <circle cx="0" cy="0" r="5" fill="#070E1A" stroke="#0090FF" strokeWidth="1.2" />
            <circle cx="0" cy="0" r="1.5" fill="#38BDF8" />
            <circle cx="0" cy="18" r="5" fill="#070E1A" stroke="#0090FF" strokeWidth="1.2" />
            <circle cx="0" cy="18" r="1.5" fill="#38BDF8" />
          </g>
        ))}

        {/* -------------------------------------------------------- */}
        {/* SOLDER TEST PADS & COMPONENT LAND PATTERNS               */}
        {/* -------------------------------------------------------- */}
        {/* Test Node 1 */}
        <g transform="translate(360, 220)">
          <circle cx="0" cy="0" r="10" fill="none" stroke="#0090FF" strokeWidth="1" className="animate-radar-ring-1" />
          <circle cx="0" cy="0" r="5.5" fill="#0284C7" stroke="#38BDF8" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="1.75" fill="#FFFFFF" />
          <text x="12" y="-8" fill="#0284C7" fontSize="8" fontFamily="monospace" fontWeight="bold">TP_DIFF_P</text>
        </g>

        {/* Test Node 2 */}
        <g transform="translate(740, 160)">
          <circle cx="0" cy="0" r="10" fill="none" stroke="#F59E0B" strokeWidth="1" className="animate-radar-ring-2" />
          <circle cx="0" cy="0" r="5.5" fill="#F59E0B" stroke="#FBBF24" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="1.75" fill="#FFFFFF" />
          <text x="12" y="-8" fill="#B45309" fontSize="8" fontFamily="monospace" fontWeight="bold">TP_DIFF_N</text>
        </g>

        {/* Layer Stackup Indicators */}
        <g transform="translate(100, 260)">
          <rect x="0" y="0" width="140" height="60" rx="6" fill="#070E1A" stroke="#334155" strokeWidth="1" />
          <text x="10" y="18" fill="#38BDF8" fontSize="7.5" fontFamily="monospace" fontWeight="bold">L1: TOP (SIGNALS)</text>
          <text x="10" y="32" fill="#64748B" fontSize="7.5" fontFamily="monospace">L2: GND (PLANE)</text>
          <text x="10" y="46" fill="#F59E0B" fontSize="7.5" fontFamily="monospace">L3: PWR (3.3V/5V)</text>
        </g>

        {/* Technical Calibration Watermarks */}
        <text x="80" y="60" fill="#64748B" fontSize="8" fontFamily="monospace">
          SERVICE_MODE: TURNKEY_R&D · FAB_READY: IPC-A-610 CLASS 3 · IMPEDANCE_MATCH: 90Ω USB
        </text>
      </svg>
    </div>
  );
}
