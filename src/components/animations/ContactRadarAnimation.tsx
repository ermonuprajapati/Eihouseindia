import React from 'react';

/**
 * ContactRadarAnimation
 * Themed for Contact Us & Communications Desk:
 * - Radio frequency radar beacon
 * - Animated concentric RF signal rings expanding outwards
 * - Telemetry transmission waves
 */
export function ContactRadarAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute top-10 right-1/4 w-[460px] h-[320px] rounded-full bg-blue-500/10 blur-[85px]" />
      <div className="absolute -bottom-10 left-10 w-[380px] h-[250px] rounded-full bg-emerald-500/10 blur-[80px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-40"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Central Communications Transmitter Beacon */}
        <g transform="translate(680, 110)">
          {/* Concentric Expanding Radar Signal Waves */}
          <circle cx="0" cy="0" r="25" fill="none" stroke="#0284C7" strokeWidth="1.5" className="animate-radar-ring-1" />
          <circle cx="0" cy="0" r="45" fill="none" stroke="#0284C7" strokeWidth="1.2" className="animate-radar-ring-2" />
          <circle cx="0" cy="0" r="65" fill="none" stroke="#0284C7" strokeWidth="0.8" className="animate-radar-ring-3" />

          {/* Central Transmitter Core */}
          <circle cx="0" cy="0" r="10" fill="#0B1528" stroke="#0284C7" strokeWidth="2" />
          <circle cx="0" cy="0" r="4" fill="#38BDF8" className="animate-ping" style={{ animationDuration: '1.8s' }} />

          {/* Radio Waves Arc */}
          <path d="M -30 -30 A 42 42 0 0 1 30 -30" fill="none" stroke="#0284C7" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M -45 -45 A 64 64 0 0 1 45 -45" fill="none" stroke="#0284C7" strokeWidth="1.2" strokeDasharray="3 3" />

          <text x="0" y="32" textAnchor="middle" fill="#0369A1" fontSize="9" fontFamily="monospace" fontWeight="bold">
            RF·SIGNAL // 2.4GHz
          </text>
        </g>
      </svg>
    </div>
  );
}
