import React from 'react';

/**
 * CommunityNetworkAnimation
 * Themed for Engineering Community, Maker Hubs, Student Chapters & Collaborative Hardware Labs:
 * - Distributed Maker Mesh Topology across India
 * - Live Interconnected Regional Nodes exchanging Hardware Packets (Delhi, Varanasi HQ, Bengaluru, Pune, Hyderabad)
 * - Wireless Telemetry Emission Rings connecting students, engineers, and researchers
 * - Right-dominant layout (x: 860-1420) so left-side hero text is 100% crisp and readable
 */
export function CommunityNetworkAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      {/* Soft Ambient Community Glows (Right-Dominant) */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[340px] rounded-full bg-emerald-600/10 blur-[90px]" />
      <div className="absolute -bottom-10 right-10 w-[440px] h-[300px] rounded-full bg-blue-600/10 blur-[85px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-60"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="commMeshGrid" width="45" height="45" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#0B1528" fillOpacity="0.08" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#commMeshGrid)" />

        {/* ------------------------------------------------------------- */}
        {/* TOP MARGIN BUS                                                */}
        {/* ------------------------------------------------------------- */}
        <path
          d="M 60 65 L 680 65 L 740 120 L 1400 120"
          fill="none"
          stroke="#10B981"
          strokeWidth="1.5"
          className="animate-pcb-trace"
        />

        {/* ------------------------------------------------------------- */}
        {/* RIGHT PLATFORM: DISTRIBUTED MAKER MESH (x: 1100, y: 220)       */}
        {/* ------------------------------------------------------------- */}
        <g transform="translate(1100, 220)">
          {/* Main Mesh Bounding Frame */}
          <rect
            x="-210"
            y="-135"
            width="420"
            height="270"
            rx="12"
            fill="#050B14"
            fillOpacity="0.94"
            stroke="#10B981"
            strokeWidth="1.75"
          />

          {/* Header */}
          <rect x="-195" y="-123" width="160" height="20" rx="4" fill="#0B1528" stroke="#10B981" strokeWidth="1" />
          <text x="-115" y="-109" textAnchor="middle" fill="#34D399" fontSize="8" fontFamily="monospace" fontWeight="bold">
            PAN-INDIA HARDWARE MESH
          </text>

          {/* Mesh Interconnect Dashed Background Lines */}
          <g stroke="#0284C7" strokeWidth="1.2" strokeOpacity="0.35" strokeDasharray="4 4">
            <line x1="-120" y1="-50" x2="0" y2="0" />
            <line x1="0" y1="0" x2="120" y2="-60" />
            <line x1="-120" y1="-50" x2="-80" y2="60" />
            <line x1="-80" y1="60" x2="0" y2="0" />
            <line x1="0" y1="0" x2="80" y2="70" />
            <line x1="120" y1="-60" x2="80" y2="70" />
          </g>

          {/* Active Flowing Packet Routes */}
          <path
            d="M -120 -50 L 0 0 L 120 -60 M -80 60 L 0 0 L 80 70"
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
            className="animate-pcb-trace"
          />

          {/* NODE 1: DELHI NCR (x: -120, y: -50) */}
          <g transform="translate(-120, -50)">
            <circle cx="0" cy="0" r="14" fill="none" stroke="#0090FF" strokeWidth="0.8" className="animate-radar-ring-1" />
            <circle cx="0" cy="0" r="7" fill="#070E1A" stroke="#0090FF" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="2.5" fill="#38BDF8" />
            <text x="0" y="-14" textAnchor="middle" fill="#38BDF8" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
              DELHI NCR
            </text>
            <text x="0" y="16" textAnchor="middle" fill="#64748B" fontSize="6.5" fontFamily="monospace">
              ROBOTICS HUB
            </text>
          </g>

          {/* NODE 2: CENTRAL HQ VARANASI (x: 0, y: 0) */}
          <g transform="translate(0, 0)">
            <circle cx="0" cy="0" r="24" fill="none" stroke="#F59E0B" strokeWidth="1" className="animate-radar-ring-2" />
            <circle cx="0" cy="0" r="12" fill="#070E1A" stroke="#FF8C00" strokeWidth="2" />
            <circle cx="0" cy="0" r="4" fill="#F59E0B" className="animate-chip-heartbeat" />
            <text x="0" y="-16" textAnchor="middle" fill="#FBBF24" fontSize="8" fontFamily="monospace" fontWeight="bold">
              EI HOUSE HQ · VARANASI
            </text>
            <text x="0" y="22" textAnchor="middle" fill="#FCD34D" fontSize="6.5" fontFamily="monospace">
              R&amp;D COMMAND CENTER
            </text>
          </g>

          {/* NODE 3: BENGALURU SILICON HUB (x: 120, y: -60) */}
          <g transform="translate(120, -60)">
            <circle cx="0" cy="0" r="14" fill="none" stroke="#10B981" strokeWidth="0.8" className="animate-radar-ring-3" />
            <circle cx="0" cy="0" r="7" fill="#070E1A" stroke="#10B981" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="2.5" fill="#34D399" />
            <text x="0" y="-14" textAnchor="middle" fill="#34D399" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
              BENGALURU
            </text>
            <text x="0" y="16" textAnchor="middle" fill="#64748B" fontSize="6.5" fontFamily="monospace">
              SILICON CHAPTER
            </text>
          </g>

          {/* NODE 4: PUNE PROTOTYPING LAB (x: -80, y: 60) */}
          <g transform="translate(-80, 60)">
            <circle cx="0" cy="0" r="6" fill="#070E1A" stroke="#38BDF8" strokeWidth="1.2" />
            <circle cx="0" cy="0" r="2" fill="#38BDF8" />
            <text x="0" y="14" textAnchor="middle" fill="#64748B" fontSize="7" fontFamily="monospace">
              PUNE MAKER LAB
            </text>
          </g>

          {/* NODE 5: HYDERABAD R&D (x: 80, y: 70) */}
          <g transform="translate(80, 70)">
            <circle cx="0" cy="0" r="6" fill="#070E1A" stroke="#F59E0B" strokeWidth="1.2" />
            <circle cx="0" cy="0" r="2" fill="#F59E0B" />
            <text x="0" y="14" textAnchor="middle" fill="#64748B" fontSize="7" fontFamily="monospace">
              HYDERABAD TECH
            </text>
          </g>

          {/* Bottom Status Bar */}
          <text x="-190" y="122" fill="#64748B" fontSize="7" fontFamily="monospace">TELEMETRY: PEER DISCUSSIONS · CODE REVIEW · HARDWARE HACKATHONS</text>
          <text x="190" y="122" textAnchor="end" fill="#10B981" fontSize="7" fontFamily="monospace" fontWeight="bold">ACTIVE NETWORK</text>
        </g>

        {/* Clean Header Line */}
        <text x="80" y="48" fill="#64748B" fontSize="8" fontFamily="monospace">
          COMMUNITY_NETWORK: MAKER_HUBS · STUDENT_INNOVATORS · PEER_HARDWARE_REVIEWS
        </text>
      </svg>
    </div>
  );
}
