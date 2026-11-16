import React from 'react';

/**
 * SiliconCircuitMatrixAnimation
 * Pure background engineering ambient animation for EI House Homepage:
 * - 100% clean background layer (z-0, pointer-events-none)
 * - Zero SVG text elements (ensures 100% readability of page words and tagline)
 * - Subtle blueprint dot matrix and high-speed PCB trace pulses in brand colors (#0090FF & #F59E0B)
 */
export function SiliconCircuitMatrixAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      {/* Soft Ambient Corner Glows (Logo Brand Colors) */}
      <div className="absolute -top-20 -left-10 w-[500px] h-[350px] rounded-full bg-blue-500/10 blur-[100px]" />
      <div className="absolute top-10 -right-10 w-[480px] h-[360px] rounded-full bg-amber-500/10 blur-[100px]" />
      <div className="absolute -bottom-10 left-1/3 w-[450px] h-[300px] rounded-full bg-sky-500/8 blur-[90px]" />

      {/* Responsive Background Vector Canvas */}
      <svg
        className="absolute inset-0 h-full w-full opacity-35"
        viewBox="0 0 1440 640"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle Blueprint Dot Grid */}
          <pattern id="cleanCadGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#0B1528" fillOpacity="0.08" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#cleanCadGrid)" />

        {/* ------------------------------------------------------------- */}
        {/* SUBTLE BACKGROUND CIRCUIT TRACES (Routed around text margins) */}
        {/* ------------------------------------------------------------- */}

        {/* Top Peripheral Signal Bus (Cyber Blue) */}
        <path
          d="M -20 60 L 260 60 L 320 120 L 620 120 L 680 60 L 1120 60 L 1180 120 L 1460 120"
          fill="none"
          stroke="#0090FF"
          strokeWidth="1.5"
          className="animate-pcb-trace"
        />

        {/* Companion Trace */}
        <path
          d="M -20 72 L 255 72 L 315 132 L 615 132 L 675 72 L 1115 72 L 1175 132 L 1460 132"
          fill="none"
          stroke="#0284C7"
          strokeWidth="1"
          strokeOpacity="0.5"
        />

        {/* Lower Peripheral Power & Telemetry Bus (Solar Amber) */}
        <path
          d="M 60 580 L 320 580 L 400 500 L 780 500 L 860 580 L 1400 580"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="1.5"
          className="animate-pcb-trace-fast"
        />
        <path
          d="M 60 592 L 315 592 L 395 512 L 775 512 L 855 592 L 1400 592"
          fill="none"
          stroke="#FF8C00"
          strokeWidth="1"
          strokeOpacity="0.4"
        />

        {/* Subtle Test Solder Vias with Rings (in corners / margins) */}
        <g transform="translate(320, 120)">
          <circle cx="0" cy="0" r="8" fill="none" stroke="#0090FF" strokeWidth="0.8" className="animate-radar-ring-1" />
          <circle cx="0" cy="0" r="3" fill="#0090FF" fillOpacity="0.3" stroke="#0284C7" strokeWidth="1" />
        </g>

        <g transform="translate(680, 60)">
          <circle cx="0" cy="0" r="3" fill="#F59E0B" fillOpacity="0.3" stroke="#F59E0B" strokeWidth="1" />
        </g>

        <g transform="translate(1180, 120)">
          <circle cx="0" cy="0" r="8" fill="none" stroke="#F59E0B" strokeWidth="0.8" className="animate-radar-ring-2" />
          <circle cx="0" cy="0" r="3" fill="#F59E0B" fillOpacity="0.3" stroke="#F59E0B" strokeWidth="1" />
        </g>

        <g transform="translate(400, 500)">
          <circle cx="0" cy="0" r="3" fill="#10B981" fillOpacity="0.3" stroke="#059669" strokeWidth="1" />
        </g>

        <g transform="translate(780, 500)">
          <circle cx="0" cy="0" r="3" fill="#0284C7" fillOpacity="0.3" stroke="#0284C7" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
}
