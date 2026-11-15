import React from 'react';

/**
 * ServicesPcbRoutingAnimation
 * Themed for Technical Services & Turnkey PCB Engineering:
 * - High-speed dynamic vector circuit trace routing
 * - Test points with soldering / electronic flare
 * - Industrial manufacturing bus
 */
export function ServicesPcbRoutingAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute top-10 right-10 w-[480px] h-[320px] rounded-full bg-blue-500/10 blur-[90px]" />
      <div className="absolute -bottom-10 left-20 w-[420px] h-[260px] rounded-full bg-teal-500/10 blur-[85px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-40"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Differential Pair Bus Lines */}
        <path
          d="M 60 70 L 180 70 L 230 120 L 450 120 L 500 70 L 680 70"
          fill="none"
          stroke="#0284C7"
          strokeWidth="2"
          className="animate-pcb-trace"
        />
        <path
          d="M 60 82 L 175 82 L 225 132 L 455 132 L 505 82 L 680 82"
          fill="none"
          stroke="#0284C7"
          strokeWidth="2"
          className="animate-pcb-trace"
        />

        {/* Industrial Service Bus Route B */}
        <path
          d="M 280 170 L 360 170 L 420 110 L 600 110 L 640 150 L 780 150"
          fill="none"
          stroke="#14B8A6"
          strokeWidth="1.5"
          className="animate-pcb-trace"
          style={{ animationDuration: '2.4s' }}
        />

        {/* Solder Test Pads with Electronic Pulse */}
        <g transform="translate(180, 70)">
          <circle cx="0" cy="0" r="5" fill="#38BDF8" fillOpacity="0.4" stroke="#0284C7" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="1.5" fill="#FFFFFF" />
        </g>
        <g transform="translate(450, 120)">
          <circle cx="0" cy="0" r="5" fill="#38BDF8" fillOpacity="0.4" stroke="#0284C7" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="1.5" fill="#FFFFFF" />
        </g>
        <g transform="translate(420, 110)">
          <circle cx="0" cy="0" r="6" fill="#2DD4BF" fillOpacity="0.4" stroke="#0D9488" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="2" fill="#FFFFFF" className="animate-ping" />
        </g>
        <g transform="translate(640, 150)">
          <circle cx="0" cy="0" r="5" fill="#2DD4BF" fillOpacity="0.4" stroke="#0D9488" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="1.5" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
}
