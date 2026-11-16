import React from 'react';

/**
 * ProjectsLaserMeshAnimation
 * Themed for Hardware Projects, Verified Builds, Prototyping & Capstones:
 * - Precision CAD Mechanical & Electronic Drafting Schematic (mm dimensions & datum lines)
 * - Hardware Sub-assemblies: Microcontroller Core, High-Efficiency Power Converter, RF Transceiver
 * - Optical Sweeping Laser Verification Plane inspecting fabrication tolerances
 * - Right-dominant layout (x: 860-1420) so left-side hero text is 100% crisp and readable
 */
export function ProjectsLaserMeshAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      {/* Soft Ambient Laboratory Glows (Right-Dominant) */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[340px] rounded-full bg-cyan-600/10 blur-[90px]" />
      <div className="absolute -bottom-10 right-10 w-[440px] h-[300px] rounded-full bg-blue-600/10 blur-[85px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-60"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="projectsCadGrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#0B1528" strokeWidth="0.5" strokeOpacity="0.08" />
            <circle cx="0" cy="0" r="1" fill="#0284C7" fillOpacity="0.2" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#projectsCadGrid)" />

        {/* ------------------------------------------------------------- */}
        {/* TOP MARGIN BUS                                                */}
        {/* ------------------------------------------------------------- */}
        <path
          d="M 60 65 L 680 65 L 740 120 L 1400 120"
          fill="none"
          stroke="#0284C7"
          strokeWidth="1.5"
          className="animate-pcb-trace"
        />

        {/* ------------------------------------------------------------- */}
        {/* RIGHT PLATFORM: CAD SCHEMATIC & HARDWARE BLUEPRINT (x: 1100, y: 220) */}
        {/* ------------------------------------------------------------- */}
        <g transform="translate(1100, 220)">
          {/* Main Prototyping Board Enclosure (360 x 260) */}
          <rect
            x="-210"
            y="-135"
            width="420"
            height="270"
            rx="12"
            fill="#050B14"
            fillOpacity="0.92"
            stroke="#0284C7"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />

          {/* Width Dimension Callout Line */}
          <line x1="-210" y1="-150" x2="210" y2="-150" stroke="#38BDF8" strokeWidth="1" />
          <line x1="-210" y1="-156" x2="-210" y2="-144" stroke="#38BDF8" strokeWidth="1" />
          <line x1="210" y1="-156" x2="210" y2="-144" stroke="#38BDF8" strokeWidth="1" />
          <text x="0" y="-155" textAnchor="middle" fill="#38BDF8" fontSize="8" fontFamily="monospace">
            CHASSIS_W: 165.00mm ± 0.05
          </text>

          {/* Height Dimension Callout Line */}
          <line x1="-225" y1="-135" x2="-225" y2="135" stroke="#38BDF8" strokeWidth="1" />
          <line x1="-231" y1="-135" x2="-219" y2="-135" stroke="#38BDF8" strokeWidth="1" />
          <line x1="-231" y1="135" x2="-219" y2="135" stroke="#38BDF8" strokeWidth="1" />
          <text x="-233" y="0" textAnchor="middle" fill="#38BDF8" fontSize="8" fontFamily="monospace" transform="rotate(-90 -233 0)">
            CHASSIS_H: 95.00mm
          </text>

          {/* Corner Datum Mounting Holes */}
          {[[-190, -115], [190, -115], [-190, 115], [190, 115]].map(([mx, my], i) => (
            <g key={`datum-hole-${i}`} transform={`translate(${mx}, ${my})`}>
              <circle cx="0" cy="0" r="7" fill="none" stroke="#F59E0B" strokeWidth="1.2" />
              <circle cx="0" cy="0" r="2.5" fill="#0090FF" />
              <line x1="-10" y1="0" x2="10" y2="0" stroke="#F59E0B" strokeWidth="0.5" strokeOpacity="0.7" />
              <line x1="0" y1="-10" x2="0" y2="10" stroke="#F59E0B" strokeWidth="0.5" strokeOpacity="0.7" />
            </g>
          ))}

          {/* Sub-Assembly 1: STM32 Microcontroller Core */}
          <g transform="translate(-110, -35)">
            <rect x="-65" y="-55" width="130" height="110" rx="8" fill="#0A1322" stroke="#0090FF" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="12" fill="#0090FF" fillOpacity="0.2" className="animate-chip-heartbeat" />
            <circle cx="0" cy="0" r="3" fill="#38BDF8" />
            <text x="0" y="-30" textAnchor="middle" fill="#FFFFFF" fontSize="8.5" fontFamily="monospace" fontWeight="bold">STM32 MCU</text>
            <text x="0" y="-16" textAnchor="middle" fill="#38BDF8" fontSize="7" fontFamily="monospace">CORTEX-M4F</text>
            <text x="0" y="24" textAnchor="middle" fill="#93C5FD" fontSize="6.5" fontFamily="monospace">168 MHz · DSP+FPU</text>
            <text x="0" y="38" textAnchor="middle" fill="#64748B" fontSize="6.5" fontFamily="monospace">1MB FLASH · 192KB</text>
          </g>

          {/* Sub-Assembly 2: Synchronous Power Supply */}
          <g transform="translate(60, -60)">
            <rect x="-70" y="-30" width="140" height="60" rx="6" fill="#0A1322" stroke="#F59E0B" strokeWidth="1.2" />
            <text x="-60" y="-12" fill="#FCD34D" fontSize="7.5" fontFamily="monospace" fontWeight="bold">DC-DC BUCK REGULATOR</text>
            <text x="-60" y="2" fill="#64748B" fontSize="6.5" fontFamily="monospace">VIN: 12V-24V · VOUT: 5V 3A</text>
            <text x="-60" y="16" fill="#10B981" fontSize="6.5" fontFamily="monospace">EFFICIENCY: 94.6% · 400kHz</text>
          </g>

          {/* Sub-Assembly 3: RF Telemetry Module (ESP32-S3 / LoRa) */}
          <g transform="translate(60, 45)">
            <rect x="-70" y="-35" width="140" height="70" rx="6" fill="#0A1322" stroke="#10B981" strokeWidth="1.2" />
            <circle cx="50" cy="-15" r="10" fill="none" stroke="#10B981" strokeWidth="0.8" className="animate-radar-ring-1" />
            <circle cx="50" cy="-15" r="3" fill="#34D399" />
            <text x="-60" y="-15" fill="#34D399" fontSize="8" fontFamily="monospace" fontWeight="bold">WIRELESS TELEMETRY</text>
            <text x="-60" y="0" fill="#64748B" fontSize="6.5" fontFamily="monospace">SX1262 LoRa + BLE 5.0</text>
            <text x="-60" y="14" fill="#38BDF8" fontSize="6.5" fontFamily="monospace">RANGE: 15km · AES-128</text>
          </g>

          {/* Circuit Interconnect Buses */}
          <path
            d="M -45 -35 L -10 -35 L -10 -60 M -45 10 L -10 10 L -10 45"
            fill="none"
            stroke="#0090FF"
            strokeWidth="1.5"
            className="animate-pcb-trace"
          />

          {/* Sweeping Laser Measurement & Inspection Plane */}
          <line
            x1="-200"
            y1="0"
            x2="200"
            y2="0"
            stroke="#0090FF"
            strokeWidth="1.75"
            strokeOpacity="0.85"
            className="animate-laser-scan"
          />

          {/* Status Bar */}
          <text x="-190" y="122" fill="#64748B" fontSize="7" fontFamily="monospace">CAD ENGINE: KICAD 8 · GERBERS VERIFIED</text>
          <text x="190" y="122" textAnchor="end" fill="#10B981" fontSize="7" fontFamily="monospace" fontWeight="bold">FULL BOM INCLUDED</text>
        </g>

        {/* Clean Header Line */}
        <text x="80" y="48" fill="#64748B" fontSize="8" fontFamily="monospace">
          PROJECT_STANDARDS: HARDWARE_VALIDATED · SCHEMATICS · CODE_REPOS · CAPSTONES
        </text>
      </svg>
    </div>
  );
}
