import React from 'react';

/**
 * ContactRadarAnimation
 * Themed for Contact Desk, Technical Consultations & Direct Inquiries:
 * - Radio Frequency (RF) & Microwave Transceiver Array
 * - Concentric Electromagnetic Telemetry Radiation Waves (animate-radar-ring)
 * - Live Transmission Channel connecting clients to EI House engineering lab
 * - Right-dominant layout (x: 860-1420) so left-side hero text is 100% crisp and readable
 */
export function ContactRadarAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      {/* Soft Ambient Contact Glows (Right-Dominant) */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[340px] rounded-full bg-blue-600/10 blur-[90px]" />
      <div className="absolute -bottom-10 right-10 w-[440px] h-[300px] rounded-full bg-emerald-600/10 blur-[85px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-60"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="contactCadGrid" width="45" height="45" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#0B1528" fillOpacity="0.08" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#contactCadGrid)" />

        {/* ------------------------------------------------------------- */}
        {/* TOP MARGIN BUS                                                */}
        {/* ------------------------------------------------------------- */}
        <path
          d="M 60 65 L 680 65 L 740 120 L 1400 120"
          fill="none"
          stroke="#0090FF"
          strokeWidth="1.5"
          className="animate-pcb-trace"
        />

        {/* ------------------------------------------------------------- */}
        {/* RIGHT PLATFORM: RF TELEMETRY RADAR STATION (x: 1100, y: 220)  */}
        {/* ------------------------------------------------------------- */}
        <g transform="translate(1100, 220)">
          {/* Main Transceiver Chassis */}
          <rect
            x="-210"
            y="-135"
            width="420"
            height="270"
            rx="12"
            fill="#050B14"
            fillOpacity="0.94"
            stroke="#1E3A8A"
            strokeWidth="1.75"
          />

          {/* Header */}
          <rect x="-195" y="-123" width="160" height="20" rx="4" fill="#0B1528" stroke="#0090FF" strokeWidth="1" />
          <text x="-115" y="-109" textAnchor="middle" fill="#38BDF8" fontSize="8" fontFamily="monospace" fontWeight="bold">
            RF TELEMETRY BEACON
          </text>

          {/* Central Transmitter Antenna & Concentric Radar Waves */}
          <g transform="translate(40, -10)">
            <circle cx="0" cy="0" r="35" fill="none" stroke="#0090FF" strokeWidth="1.2" className="animate-radar-ring-1" />
            <circle cx="0" cy="0" r="70" fill="none" stroke="#0090FF" strokeWidth="1" className="animate-radar-ring-2" />
            <circle cx="0" cy="0" r="110" fill="none" stroke="#0090FF" strokeWidth="0.8" className="animate-radar-ring-3" />

            <circle cx="0" cy="0" r="18" fill="#070E1A" stroke="#0090FF" strokeWidth="2" />
            <circle cx="0" cy="0" r="8" fill="#0090FF" fillOpacity="0.3" className="animate-chip-heartbeat" />
            <circle cx="0" cy="0" r="3.5" fill="#38BDF8" />
          </g>

          {/* Client Inquiry Gateway Node */}
          <g transform="translate(-130, -10)">
            <rect x="-55" y="-45" width="110" height="90" rx="8" fill="#0A1322" stroke="#10B981" strokeWidth="1.5" />
            <circle cx="0" cy="-18" r="10" fill="#10B981" fillOpacity="0.2" />
            <circle cx="0" cy="-18" r="3" fill="#34D399" />
            <text x="0" y="2" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontFamily="monospace" fontWeight="bold">
              INQUIRY DESK
            </text>
            <text x="0" y="15" textAnchor="middle" fill="#6EE7B7" fontSize="6.5" fontFamily="monospace">
              FAST DISPATCH
            </text>
            <text x="0" y="27" textAnchor="middle" fill="#93C5FD" fontSize="6.5" fontFamily="monospace">
              DIRECT TO LAB
            </text>
          </g>

          {/* Active Flowing RF Link */}
          <path
            d="M -75 -10 L 22 -10"
            fill="none"
            stroke="#10B981"
            strokeWidth="2.5"
            className="animate-pcb-trace"
          />

          {/* Link Status Readouts */}
          <g transform="translate(-190, 65)">
            <rect x="0" y="0" width="380" height="40" rx="4" fill="#0B1528" stroke="#334155" strokeWidth="1" />
            <text x="12" y="16" fill="#38BDF8" fontSize="7" fontFamily="monospace" fontWeight="bold">
              CARRIER FREQ: 2.400 GHz · BANDWIDTH: 20 MHz · LINK MARGIN: +28 dBm
            </text>
            <text x="12" y="30" fill="#64748B" fontSize="6.5" fontFamily="monospace">
              RESPONSE TIME: &lt; 24 HOURS · NDA PRIVACY GUARANTEED · SENIOR ENG REVIEW
            </text>
          </g>

          {/* Bottom Status Bar */}
          <text x="-190" y="122" fill="#64748B" fontSize="7" fontFamily="monospace">DIRECT CHANNELS: EMAIL · WHATSAPP · CONSULTATION DESK · VARANASI LAB</text>
          <text x="190" y="122" textAnchor="end" fill="#10B981" fontSize="7" fontFamily="monospace" fontWeight="bold">ONLINE 24/7</text>
        </g>

        {/* Clean Header Line */}
        <text x="80" y="48" fill="#64748B" fontSize="8" fontFamily="monospace">
          CONTACT_DESK: DIRECT_ENGINEERING_ACCESS · NDA_PROTECTED · FAST_TURNAROUND
        </text>
      </svg>
    </div>
  );
}
