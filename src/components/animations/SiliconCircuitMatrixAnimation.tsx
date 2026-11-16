import React from 'react';

/**
 * SiliconCircuitMatrixAnimation
 * Themed for EI House Homepage Hero:
 * - Represents EI House's overall hardware & engineering ecosystem:
 *   [ROBOTICS & KINEMATICS] · [EMBEDDED MCU & FIRMWARE] · [IOT TELEMETRY] · [MULTILAYER PCB] · [CALCULATION TOOLS]
 * - Placed strategically across the top header margin (y: 20-95) and peripheral zones
 * - 100% clean left text zone (x: 0-780) ensuring headline, tagline, and search bar are perfectly crisp and readable
 * - Authentic brand colors: Cyber Blue (#0090FF), Solar Amber (#F59E0B), Emerald (#10B981)
 */
export function SiliconCircuitMatrixAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      {/* Soft Ambient Peripheral Glows */}
      <div className="absolute -top-24 right-1/4 w-[540px] h-[360px] rounded-full bg-blue-600/10 blur-[100px]" />
      <div className="absolute top-10 right-10 w-[480px] h-[320px] rounded-full bg-amber-500/10 blur-[95px]" />
      <div className="absolute -bottom-10 left-10 w-[420px] h-[280px] rounded-full bg-sky-500/8 blur-[90px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-60"
        viewBox="0 0 1440 640"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Precision Blueprint CAD Grid */}
          <pattern id="homepageCadGrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.9" fill="#0B1528" fillOpacity="0.07" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#homepageCadGrid)" />

        {/* ============================================================= */}
        {/* TOP HIGH-SPEED SIGNAL HIGHWAY (y: 24 to 90)                   */}
        {/* Represents EI House Overall Hardware Disciplines              */}
        {/* ============================================================= */}

        {/* Primary Bus 01: Cyber Blue High-Speed Data Stream */}
        <path
          d="M -20 45 L 360 45 L 420 85 L 820 85 L 880 45 L 1220 45 L 1260 85 L 1460 85"
          fill="none"
          stroke="#0090FF"
          strokeWidth="1.75"
          className="animate-pcb-trace"
        />

        {/* Primary Bus 02: Companion Differential Line */}
        <path
          d="M -20 55 L 355 55 L 415 95 L 825 95 L 885 55 L 1215 55 L 1255 95 L 1460 95"
          fill="none"
          stroke="#38BDF8"
          strokeWidth="1"
          strokeOpacity="0.5"
        />

        {/* Power Rail: Solar Amber Industrial Bus */}
        <path
          d="M 120 28 L 540 28 L 600 68 L 1020 68 L 1080 28 L 1460 28"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="1.5"
          className="animate-pcb-trace-fast"
        />

        {/* Top Discipline Identifiers Along the Header Highway */}
        <g transform="translate(60, 20)">
          <text x="0" y="0" fill="#64748B" fontSize="8" fontFamily="monospace" fontWeight="bold">
            EI_HOUSE_OVERALL_ENGINEERING_ECOSYSTEM:
          </text>
        </g>

        {/* Node 1: Robotics & Kinematics */}
        <g transform="translate(420, 85)">
          <circle cx="0" cy="0" r="10" fill="none" stroke="#0090FF" strokeWidth="0.8" className="animate-radar-ring-1" />
          <circle cx="0" cy="0" r="3.5" fill="#0090FF" />
          <text x="14" y="-8" fill="#0284C7" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
            [01. ROBOTICS &amp; AUTOMATION]
          </text>
        </g>

        {/* Node 2: Embedded Systems & Microcontrollers */}
        <g transform="translate(820, 85)">
          <circle cx="0" cy="0" r="10" fill="none" stroke="#F59E0B" strokeWidth="0.8" className="animate-radar-ring-2" />
          <circle cx="0" cy="0" r="3.5" fill="#F59E0B" />
          <text x="14" y="-8" fill="#B45309" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
            [02. EMBEDDED &amp; FIRMWARE]
          </text>
        </g>

        {/* Node 3: IoT & Telemetry Hub */}
        <g transform="translate(1080, 28)">
          <circle cx="0" cy="0" r="10" fill="none" stroke="#10B981" strokeWidth="0.8" className="animate-radar-ring-3" />
          <circle cx="0" cy="0" r="3.5" fill="#10B981" />
          <text x="14" y="-8" fill="#059669" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
            [03. IOT &amp; SENSORS]
          </text>
        </g>

        {/* Node 4: Multilayer PCB & Turnkey Hardware */}
        <g transform="translate(1260, 85)">
          <circle cx="0" cy="0" r="3.5" fill="#0090FF" />
          <text x="14" y="-8" fill="#0284C7" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
            [04. HARDWARE R&amp;D]
          </text>
        </g>

        {/* ============================================================= */}
        {/* RIGHT PERIPHERAL TELEMETRY MATRIX (x: 1200-1420, y: 150-480)   */}
        {/* Sits safely on the far right edge behind peripheral cards     */}
        {/* ============================================================= */}
        <g transform="translate(1360, 260)">
          {/* Micro Via Array */}
          {[-80, -40, 0, 40, 80].map((vy) => (
            <g key={`r-via-${vy}`} transform={`translate(0, ${vy})`}>
              <circle cx="0" cy="0" r="4" fill="#070E1A" stroke="#0090FF" strokeWidth="1" />
              <circle cx="0" cy="0" r="1.5" fill="#38BDF8" />
            </g>
          ))}
          {/* Signal Bus vertical drop */}
          <line x1="0" y1="-100" x2="0" y2="100" stroke="#0090FF" strokeWidth="1.2" strokeDasharray="4 4" strokeOpacity="0.4" />
        </g>

        {/* ============================================================= */}
        {/* BOTTOM MARGIN BUS (y: 590 to 630)                             */}
        {/* Sits at the bottom of the section away from text & buttons   */}
        {/* ============================================================= */}
        <path
          d="M 40 600 L 420 600 L 480 560 L 980 560 L 1040 600 L 1440 600"
          fill="none"
          stroke="#0090FF"
          strokeWidth="1.5"
          className="animate-pcb-trace"
        />
        <path
          d="M 40 612 L 415 612 L 475 572 L 985 572 L 1045 612 L 1440 612"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="1.2"
          strokeOpacity="0.5"
        />

        {/* Bottom Solder Test Points */}
        <g transform="translate(480, 560)">
          <circle cx="0" cy="0" r="8" fill="none" stroke="#0090FF" strokeWidth="0.8" className="animate-radar-ring-1" />
          <circle cx="0" cy="0" r="3" fill="#0090FF" />
          <text x="12" y="4" fill="#64748B" fontSize="7" fontFamily="monospace">
            CALIBRATION_TP1 · 3.3V REF
          </text>
        </g>

        <g transform="translate(980, 560)">
          <circle cx="0" cy="0" r="8" fill="none" stroke="#F59E0B" strokeWidth="0.8" className="animate-radar-ring-2" />
          <circle cx="0" cy="0" r="3" fill="#F59E0B" />
          <text x="12" y="4" fill="#64748B" fontSize="7" fontFamily="monospace">
            CALIBRATION_TP2 · GND REF
          </text>
        </g>
      </svg>
    </div>
  );
}
