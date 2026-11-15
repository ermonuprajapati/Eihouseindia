import React from 'react';

/**
 * ProductsHardwareAnimation
 * Themed for Hardware Store & Electronic Products:
 * - Floating electronic components (SMD packages, capacitors, crystal oscillator)
 * - Cybernetic hardware workbench aura
 */
export function ProductsHardwareAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute top-0 right-10 w-[480px] h-[340px] rounded-full bg-amber-500/10 blur-[90px]" />
      <div className="absolute bottom-0 left-10 w-[400px] h-[280px] rounded-full bg-blue-500/10 blur-[80px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-35"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Floating Component A: SMD Chip Package (Left) */}
        <g transform="translate(140, 110)" className="animate-float-slow">
          <rect x="-24" y="-24" width="48" height="48" rx="6" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="10" fill="none" stroke="#F59E0B" strokeWidth="1" strokeDasharray="3 2" />
          <circle cx="-16" cy="-16" r="2.5" fill="#F59E0B" />
          {/* Solder Terminals */}
          {[-14, 0, 14].map((y) => (
            <React.Fragment key={y}>
              <rect x="-30" y={y - 2.5} width="6" height="5" fill="#94A3B8" />
              <rect x="24" y={y - 2.5} width="6" height="5" fill="#94A3B8" />
            </React.Fragment>
          ))}
          <text x="0" y="36" textAnchor="middle" fill="#F59E0B" fontSize="9" fontFamily="monospace">SMD·SOIC</text>
        </g>

        {/* Floating Component B: Cylindrical Capacitor (Right) */}
        <g transform="translate(860, 120)" className="animate-float-slow" style={{ animationDelay: '1.2s' }}>
          <ellipse cx="0" cy="-20" rx="18" ry="8" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.2" />
          <path d="M -18 -20 L -18 20 A 18 8 0 0 0 18 20 L 18 -20 Z" fill="#1E3A8A" stroke="#1D4ED8" strokeWidth="1.2" />
          <ellipse cx="0" cy="20" rx="18" ry="8" fill="#2563EB" stroke="#1D4ED8" strokeWidth="1.2" />
          {/* Stripe Indicator */}
          <line x1="-12" y1="-20" x2="-12" y2="20" stroke="#93C5FD" strokeWidth="3" />
          <text x="0" y="42" textAnchor="middle" fill="#60A5FA" fontSize="9" fontFamily="monospace">1000μF 25V</text>
        </g>

        {/* Component C: Resistor Bands (Center) */}
        <g transform="translate(520, 70)" className="animate-float-slow" style={{ animationDelay: '2s' }}>
          <path d="M -40 0 L -25 0 Q -20 -8 -15 -8 L 15 -8 Q 20 0 25 0 L 40 0" fill="none" stroke="#94A3B8" strokeWidth="1.5" />
          <rect x="-20" y="-7" width="40" height="14" rx="4" fill="#FDE68A" stroke="#D97706" strokeWidth="1" />
          {/* Color code stripes */}
          <rect x="-14" y="-7" width="3" height="14" fill="#92400E" />
          <rect x="-6" y="-7" width="3" height="14" fill="#000000" />
          <rect x="2" y="-7" width="3" height="14" fill="#DC2626" />
          <rect x="10" y="-7" width="3" height="14" fill="#D97706" />
        </g>
      </svg>
    </div>
  );
}
