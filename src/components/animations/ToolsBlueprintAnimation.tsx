import React from 'react';

/**
 * ToolsBlueprintAnimation
 * Themed for Engineering Software & Tools Directory:
 * - Technical CAD Blueprint Grid
 * - Interlocking rotating precision CAD gears
 * - Engineering crosshair drafting markers & caliper lines
 */
export function ToolsBlueprintAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      {/* Blueprint Ambient Tone Glow */}
      <div className="absolute -top-10 right-10 w-[420px] h-[320px] rounded-full bg-blue-500/10 blur-[80px]" />
      <div className="absolute top-20 left-10 w-[350px] h-[280px] rounded-full bg-cyan-500/10 blur-[70px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-35"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Technical Blueprint Grid Pattern */}
          <pattern id="blueprintGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2563EB" strokeWidth="0.5" strokeOpacity="0.25" />
            <circle cx="0" cy="0" r="1" fill="#2563EB" fillOpacity="0.4" />
          </pattern>
        </defs>

        {/* Grid Background */}
        <rect width="100%" height="100%" fill="url(#blueprintGrid)" />

        {/* Large CAD Precision Gear 1 (Clockwise) */}
        <g transform="translate(100, 90)" className="animate-orbit-gear origin-center">
          <circle cx="0" cy="0" r="45" fill="none" stroke="#1D4ED8" strokeWidth="1.5" strokeDasharray="4 2" />
          <circle cx="0" cy="0" r="32" fill="none" stroke="#3B82F6" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="10" fill="#2563EB" fillOpacity="0.2" stroke="#1D4ED8" strokeWidth="1.5" />
          {/* Gear Teeth */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <rect
              key={deg}
              x="-4"
              y="-52"
              width="8"
              height="10"
              rx="1.5"
              fill="#2563EB"
              fillOpacity="0.6"
              transform={`rotate(${deg})`}
            />
          ))}
          {/* Spokes */}
          <line x1="0" y1="-32" x2="0" y2="32" stroke="#3B82F6" strokeWidth="1" />
          <line x1="-32" y1="0" x2="32" y2="0" stroke="#3B82F6" strokeWidth="1" />
        </g>

        {/* Smaller Interlocking Precision Gear 2 (Counter-Clockwise) */}
        <g transform="translate(182, 90)" className="animate-orbit-gear-reverse origin-center">
          <circle cx="0" cy="0" r="28" fill="none" stroke="#0284C7" strokeWidth="1.5" strokeDasharray="3 2" />
          <circle cx="0" cy="0" r="18" fill="none" stroke="#38BDF8" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="6" fill="#0284C7" fillOpacity="0.25" stroke="#0284C7" strokeWidth="1.5" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <rect
              key={deg}
              x="-3"
              y="-34"
              width="6"
              height="8"
              rx="1"
              fill="#0284C7"
              fillOpacity="0.6"
              transform={`rotate(${deg})`}
            />
          ))}
        </g>

        {/* Technical Coordinate Crosshairs (Right Side) */}
        <g transform="translate(850, 70)" opacity="0.6">
          <circle cx="0" cy="0" r="40" fill="none" stroke="#60A5FA" strokeWidth="1" strokeDasharray="2 3" />
          <line x1="-60" y1="0" x2="60" y2="0" stroke="#60A5FA" strokeWidth="0.8" />
          <line x1="0" y1="-60" x2="0" y2="60" stroke="#60A5FA" strokeWidth="0.8" />
          <circle cx="0" cy="0" r="2" fill="#2563EB" />
          <text x="10" y="-10" fill="#3B82F6" fontSize="9" fontFamily="monospace">CAD // 4-AXIS</text>
        </g>
      </svg>
    </div>
  );
}
