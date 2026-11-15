import React from 'react';

/**
 * CommunityNetworkAnimation
 * Themed for Engineering Community & Franchise Labs:
 * - Pan-India interconnected tech network
 * - Pulsing communication nodes between student innovators, engineers, and franchise labs
 */
export function CommunityNetworkAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute top-10 right-1/3 w-[500px] h-[320px] rounded-full bg-emerald-500/10 blur-[90px]" />
      <div className="absolute -bottom-10 left-10 w-[420px] h-[280px] rounded-full bg-blue-500/10 blur-[85px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-40"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Network Connection Web Lines */}
        <line x1="160" y1="120" x2="340" y2="70" stroke="#059669" strokeWidth="1.2" strokeDasharray="3 3" />
        <line x1="340" y1="70" x2="520" y2="130" stroke="#059669" strokeWidth="1.2" strokeDasharray="3 3" />
        <line x1="520" y1="130" x2="720" y2="80" stroke="#0284C7" strokeWidth="1.2" strokeDasharray="3 3" />
        <line x1="720" y1="80" x2="880" y2="140" stroke="#0284C7" strokeWidth="1.2" strokeDasharray="3 3" />
        <line x1="340" y1="70" x2="520" y2="200" stroke="#0D9488" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="520" y1="130" x2="520" y2="200" stroke="#0D9488" strokeWidth="1" strokeDasharray="4 4" />

        {/* Network Nodes */}
        <g transform="translate(160, 120)">
          <circle cx="0" cy="0" r="16" fill="#1E293B" stroke="#10B981" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="6" fill="#10B981" className="animate-pulse" />
          <text x="0" y="26" textAnchor="middle" fill="#047857" fontSize="8" fontFamily="monospace" fontWeight="bold">DELHI·NCR</text>
        </g>

        <g transform="translate(340, 70)">
          <circle cx="0" cy="0" r="20" fill="#1E293B" stroke="#059669" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="8" fill="#34D399" className="animate-pulse" style={{ animationDelay: '0.6s' }} />
          <text x="0" y="32" textAnchor="middle" fill="#065F46" fontSize="8" fontFamily="monospace" fontWeight="bold">BENGALURU</text>
        </g>

        <g transform="translate(520, 130)">
          <circle cx="0" cy="0" r="22" fill="#0B1528" stroke="#F59E0B" strokeWidth="2" />
          <circle cx="0" cy="0" r="9" fill="#F59E0B" className="animate-ping" style={{ animationDuration: '3s' }} />
          <text x="0" y="34" textAnchor="middle" fill="#B45309" fontSize="8" fontFamily="monospace" fontWeight="bold">EI·CENTRAL</text>
        </g>

        <g transform="translate(720, 80)">
          <circle cx="0" cy="0" r="18" fill="#1E293B" stroke="#0284C7" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="7" fill="#38BDF8" className="animate-pulse" style={{ animationDelay: '1.2s' }} />
          <text x="0" y="28" textAnchor="middle" fill="#0369A1" fontSize="8" fontFamily="monospace" fontWeight="bold">PUNE·HUB</text>
        </g>

        <g transform="translate(880, 140)">
          <circle cx="0" cy="0" r="16" fill="#1E293B" stroke="#0284C7" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="6" fill="#38BDF8" className="animate-pulse" style={{ animationDelay: '1.8s' }} />
          <text x="0" y="26" textAnchor="middle" fill="#0369A1" fontSize="8" fontFamily="monospace" fontWeight="bold">HYDERABAD</text>
        </g>
      </svg>
    </div>
  );
}
