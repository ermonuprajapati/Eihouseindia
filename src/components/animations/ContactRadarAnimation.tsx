import React from 'react';

/**
 * ContactRadarAnimation
 * Themed for Contact Desk, Technical Consultations & Inquiries:
 * - Radio Frequency (RF) & Microwave Transceiver Array
 * - Concentric Electromagnetic Telemetry Radiation Waves
 * - Live Transmission Channel connecting clients to EI House engineering lab
 */
export function ContactRadarAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute top-0 right-1/4 w-[480px] h-[340px] rounded-full bg-blue-600/10 blur-[90px]" />
      <div className="absolute -bottom-10 left-10 w-[420px] h-[280px] rounded-full bg-emerald-600/10 blur-[85px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-55"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="contactGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#0B1528" fillOpacity="0.08" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#contactGrid)" />

        {/* -------------------------------------------------------- */}
        {/* RF MICROWAVE TRANSCEIVER BEACON (Right-Dominant Platform) */}
        {/* -------------------------------------------------------- */}
        <g transform="translate(1080, 210)">
          {/* Concentric Expanding RF Waves */}
          <circle cx="0" cy="0" r="45" fill="none" stroke="#0090FF" strokeWidth="1.5" className="animate-radar-ring-1" />
          <circle cx="0" cy="0" r="90" fill="none" stroke="#0090FF" strokeWidth="1.2" className="animate-radar-ring-2" />
          <circle cx="0" cy="0" r="140" fill="none" stroke="#0090FF" strokeWidth="0.8" className="animate-radar-ring-3" />

          {/* Transmitter Tower Mast Head */}
          <circle cx="0" cy="0" r="24" fill="#070E1A" stroke="#0090FF" strokeWidth="2" />
          <circle cx="0" cy="0" r="10" fill="#0090FF" fillOpacity="0.25" className="animate-chip-heartbeat" />
          <circle cx="0" cy="0" r="4" fill="#38BDF8" />

          <text x="0" y="44" textAnchor="middle" fill="#0284C7" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
            RF TELEMETRY BEACON
          </text>
          <text x="0" y="58" textAnchor="middle" fill="#64748B" fontSize="7" fontFamily="monospace">
            FREQ: 2.400 GHz · STATUS: ONLINE
          </text>
        </g>

        {/* -------------------------------------------------------- */}
        {/* TRANSMISSION CARRIER WAVE LINK TO CLIENT (Right to Left)  */}
        {/* -------------------------------------------------------- */}
        <path
          d="M 120 210 L 380 210 L 460 140 L 780 140 L 860 210 L 1080 210"
          fill="none"
          stroke="#10B981"
          strokeWidth="2.2"
          className="animate-pcb-trace"
        />

        {/* Client Side Terminal Receiver */}
        <g transform="translate(240, 210)">
          <rect x="-60" y="-36" width="120" height="72" rx="8" fill="#070E1A" stroke="#10B981" strokeWidth="1.75" />
          <circle cx="0" cy="-12" r="8" fill="#10B981" fillOpacity="0.2" />
          <circle cx="0" cy="-12" r="3.5" fill="#34D399" />
          <text x="0" y="8" textAnchor="middle" fill="#FFFFFF" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
            CLIENT TERMINAL
          </text>
          <text x="0" y="22" textAnchor="middle" fill="#6EE7B7" fontSize="7" fontFamily="monospace">
            DIRECT INQUIRY CHANNEL
          </text>
        </g>

        {/* Technical Calibration Watermarks */}
        <text x="80" y="60" fill="#64748B" fontSize="8" fontFamily="monospace">
          RESPONSE_SLA: &lt; 24 HOURS · CONFIDENTIALITY: NDA PROTECTED · DIRECT ENG CONSULTATION
        </text>
      </svg>
    </div>
  );
}
