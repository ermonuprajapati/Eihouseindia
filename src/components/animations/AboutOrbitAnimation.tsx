import React from 'react';

/**
 * AboutOrbitAnimation
 * Themed for About Us & EI House Mission:
 * - Orbital trajectory of innovation (Student -> Prototype -> Product -> Ecosystem)
 * - Aerospace propulsion particles in EI House brand colors
 */
export function AboutOrbitAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute -top-10 left-1/4 w-[500px] h-[340px] rounded-full bg-blue-600/10 blur-[90px]" />
      <div className="absolute top-20 right-10 w-[420px] h-[300px] rounded-full bg-amber-500/10 blur-[85px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-40"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Large Elliptical Innovation Trajectory */}
        <ellipse
          cx="50%"
          cy="48%"
          rx="420"
          ry="140"
          fill="none"
          stroke="#2563EB"
          strokeWidth="1.5"
          strokeDasharray="6 4"
          className="animate-orbit-slow"
        />

        {/* Counter Orbit (Solar Amber) */}
        <ellipse
          cx="50%"
          cy="48%"
          rx="320"
          ry="100"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="1.2"
          strokeDasharray="4 4"
          className="animate-orbit-reverse"
        />

        {/* Milestone Mission Nodes */}
        <g transform="translate(240, 110)">
          <circle cx="0" cy="0" r="14" fill="#0B1528" stroke="#3B82F6" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="5" fill="#60A5FA" className="animate-ping" style={{ animationDuration: '2.5s' }} />
          <text x="0" y="26" textAnchor="middle" fill="#1D4ED8" fontSize="8" fontFamily="monospace" fontWeight="bold">FOUNDATION</text>
        </g>

        <g transform="translate(520, 40)">
          <circle cx="0" cy="0" r="16" fill="#0B1528" stroke="#F59E0B" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="6" fill="#FBBF24" className="animate-ping" style={{ animationDuration: '3s' }} />
          <text x="0" y="28" textAnchor="middle" fill="#B45309" fontSize="8" fontFamily="monospace" fontWeight="bold">HARDWARE·R&D</text>
        </g>

        <g transform="translate(800, 110)">
          <circle cx="0" cy="0" r="14" fill="#0B1528" stroke="#10B981" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="5" fill="#34D399" className="animate-ping" style={{ animationDuration: '2.8s' }} />
          <text x="0" y="26" textAnchor="middle" fill="#047857" fontSize="8" fontFamily="monospace" fontWeight="bold">INDIA·SCALE</text>
        </g>
      </svg>
    </div>
  );
}
