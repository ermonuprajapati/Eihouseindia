import React from 'react';

/**
 * CommunityNetworkAnimation
 * Themed for Engineering Community, Maker Hubs & Collaborative Hardware Labs:
 * - Distributed Maker Mesh Topology across India
 * - Live Interconnected Regional Nodes exchanging Hardware Packets
 * - Wireless Telemetry Emission Rings connecting students, engineers, and researchers
 */
export function CommunityNetworkAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute top-0 right-1/3 w-[500px] h-[340px] rounded-full bg-emerald-600/10 blur-[90px]" />
      <div className="absolute -bottom-10 left-10 w-[420px] h-[280px] rounded-full bg-blue-600/10 blur-[85px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-55"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="commGrid" width="45" height="45" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#0B1528" fillOpacity="0.08" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#commGrid)" />

        {/* -------------------------------------------------------- */}
        {/* INTERCONNECTING MESH LINKS                               */}
        {/* -------------------------------------------------------- */}
        <g stroke="#0284C7" strokeWidth="1.2" strokeOpacity="0.4" strokeDasharray="4 4">
          <line x1="240" y1="180" x2="480" y2="120" />
          <line x1="480" y1="120" x2="720" y2="200" />
          <line x1="720" y1="200" x2="960" y2="130" />
          <line x1="960" y1="130" x2="1200" y2="210" />
          <line x1="480" y1="120" x2="620" y2="300" />
          <line x1="720" y1="200" x2="620" y2="300" />
          <line x1="720" y1="200" x2="840" y2="310" />
          <line x1="960" y1="130" x2="840" y2="310" />
          <line x1="620" y1="300" x2="840" y2="310" />
        </g>

        {/* Active Animated Primary Data Backbone */}
        <path
          d="M 240 180 L 480 120 L 720 200 L 960 130 L 1200 210"
          fill="none"
          stroke="#10B981"
          strokeWidth="2"
          className="animate-pcb-trace"
        />

        {/* -------------------------------------------------------- */}
        {/* COMMUNITY REGIONAL HARDWARE HUBS & MAKER NODES           */}
        {/* -------------------------------------------------------- */}
        {/* Node 1: Delhi NCR Hub */}
        <g transform="translate(480, 120)">
          <circle cx="0" cy="0" r="18" fill="none" stroke="#0090FF" strokeWidth="1" className="animate-radar-ring-1" />
          <circle cx="0" cy="0" r="8" fill="#070E1A" stroke="#0090FF" strokeWidth="1.75" />
          <circle cx="0" cy="0" r="3" fill="#38BDF8" />
          <text x="0" y="-14" textAnchor="middle" fill="#0284C7" fontSize="8" fontFamily="monospace" fontWeight="bold">DELHI NCR</text>
        </g>

        {/* Node 2: Central Master Hub (EI HOUSE HQ) */}
        <g transform="translate(720, 200)">
          <circle cx="0" cy="0" r="28" fill="none" stroke="#F59E0B" strokeWidth="1.2" className="animate-radar-ring-2" />
          <circle cx="0" cy="0" r="14" fill="#070E1A" stroke="#FF8C00" strokeWidth="2" />
          <circle cx="0" cy="0" r="5" fill="#F59E0B" className="animate-chip-heartbeat" />
          <circle cx="0" cy="0" r="2" fill="#FFFFFF" />
          <text x="0" y="28" textAnchor="middle" fill="#B45309" fontSize="8.5" fontFamily="monospace" fontWeight="bold">EI HOUSE HQ · VARANASI</text>
        </g>

        {/* Node 3: Bengaluru Silicon Hub */}
        <g transform="translate(960, 130)">
          <circle cx="0" cy="0" r="18" fill="none" stroke="#10B981" strokeWidth="1" className="animate-radar-ring-3" />
          <circle cx="0" cy="0" r="8" fill="#070E1A" stroke="#10B981" strokeWidth="1.75" />
          <circle cx="0" cy="0" r="3" fill="#34D399" />
          <text x="0" y="-14" textAnchor="middle" fill="#059669" fontSize="8" fontFamily="monospace" fontWeight="bold">BENGALURU TECH</text>
        </g>

        {/* Node 4: Pune Maker Hub */}
        <g transform="translate(620, 300)">
          <circle cx="0" cy="0" r="6" fill="#070E1A" stroke="#38BDF8" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="2" fill="#38BDF8" />
          <text x="0" y="16" textAnchor="middle" fill="#64748B" fontSize="7.5" fontFamily="monospace">PUNE</text>
        </g>

        {/* Node 5: Hyderabad R&D Hub */}
        <g transform="translate(840, 310)">
          <circle cx="0" cy="0" r="6" fill="#070E1A" stroke="#F59E0B" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="2" fill="#F59E0B" />
          <text x="0" y="16" textAnchor="middle" fill="#64748B" fontSize="7.5" fontFamily="monospace">HYDERABAD</text>
        </g>

        {/* Technical Calibration Watermarks */}
        <text x="80" y="60" fill="#64748B" fontSize="8" fontFamily="monospace">
          NETWORK_MESH: 50+ INSTITUTES · PEER CODE REVIEWS · SHARED LAB HARDWARE · 10,000+ MAKERS
        </text>
      </svg>
    </div>
  );
}
