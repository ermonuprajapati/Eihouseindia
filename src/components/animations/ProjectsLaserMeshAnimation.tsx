import React from 'react';

/**
 * ProjectsLaserMeshAnimation
 * Themed for Hardware Projects, Verified Builds, and Prototyping:
 * - Technical CAD drafting blueprint with precision dimension lines (mm)
 * - Schematic components: Resistors, Decoupling Capacitors, Op-Amps, Crystal Oscillator
 * - High-speed sweeping laser measurement & optical inspection plane
 * - Coordinate crosshairs for precision fabrication
 */
export function ProjectsLaserMeshAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute top-0 right-1/4 w-[480px] h-[320px] rounded-full bg-cyan-600/10 blur-[85px]" />
      <div className="absolute -bottom-10 left-10 w-[400px] h-[280px] rounded-full bg-blue-600/10 blur-[80px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-55"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="cadMetricGrid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#0B1528" strokeWidth="0.5" strokeOpacity="0.08" />
            <circle cx="0" cy="0" r="1" fill="#0284C7" fillOpacity="0.2" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#cadMetricGrid)" />

        {/* -------------------------------------------------------- */}
        {/* PHYSICAL HARDWARE CHASSIS & SCHEMATIC BOUNDING OUTLINE   */}
        {/* -------------------------------------------------------- */}
        <g transform="translate(720, 210)">
          {/* Main Enclosure Dimensions (380mm x 220mm) */}
          <rect
            x="-280"
            y="-140"
            width="560"
            height="280"
            rx="12"
            fill="#070E1A"
            fillOpacity="0.85"
            stroke="#0284C7"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />

          {/* Dimension Callout Lines & Arrows */}
          <line x1="-280" y1="-155" x2="280" y2="-155" stroke="#38BDF8" strokeWidth="1" />
          <line x1="-280" y1="-162" x2="-280" y2="-148" stroke="#38BDF8" strokeWidth="1" />
          <line x1="280" y1="-162" x2="280" y2="-148" stroke="#38BDF8" strokeWidth="1" />
          <text x="0" y="-162" textAnchor="middle" fill="#38BDF8" fontSize="8" fontFamily="monospace">
            DIM_W: 140.00mm ± 0.05
          </text>

          <line x1="-295" y1="-140" x2="-295" y2="140" stroke="#38BDF8" strokeWidth="1" />
          <line x1="-302" y1="-140" x2="-288" y2="-140" stroke="#38BDF8" strokeWidth="1" />
          <line x1="-302" y1="140" x2="-288" y2="140" stroke="#38BDF8" strokeWidth="1" />
          <text x="-304" y="0" textAnchor="middle" fill="#38BDF8" fontSize="8" fontFamily="monospace" transform="rotate(-90 -304 0)">
            DIM_H: 85.00mm
          </text>

          {/* Schematic Sub-Modules on Prototyping Board */}
          {/* Module 1: Microcontroller Core */}
          <rect x="-180" y="-80" width="100" height="90" rx="6" fill="#0B1528" stroke="#0090FF" strokeWidth="1.2" />
          <text x="-130" y="-30" textAnchor="middle" fill="#93C5FD" fontSize="8" fontFamily="monospace" fontWeight="bold">STM32 MCU</text>
          <text x="-130" y="-15" textAnchor="middle" fill="#F59E0B" fontSize="6.5" fontFamily="monospace">CORTEX-M4</text>

          {/* Module 2: High-Efficiency Power Converter */}
          <rect x="-40" y="-80" width="90" height="60" rx="4" fill="#0B1528" stroke="#F59E0B" strokeWidth="1.2" />
          <text x="5" y="-45" textAnchor="middle" fill="#FCD34D" fontSize="7.5" fontFamily="monospace" fontWeight="bold">BUCK REG</text>
          <text x="5" y="-32" textAnchor="middle" fill="#64748B" fontSize="6.5" fontFamily="monospace">5V ➔ 3.3V 2A</text>

          {/* Module 3: RF / LoRa / Wi-Fi Transceiver */}
          <rect x="90" y="-80" width="110" height="110" rx="6" fill="#0B1528" stroke="#10B981" strokeWidth="1.2" />
          <text x="145" y="-35" textAnchor="middle" fill="#6EE7B7" fontSize="8" fontFamily="monospace" fontWeight="bold">ESP32-WROOM</text>
          <text x="145" y="-20" textAnchor="middle" fill="#34D399" fontSize="6.5" fontFamily="monospace">2.4GHz + BLE 5.0</text>

          {/* Interconnect Circuit Wires */}
          <path
            d="M -80 -35 L -40 -35 M 50 -50 L 90 -50 M -130 10 L -130 50 L 145 50 L 145 30"
            fill="none"
            stroke="#0090FF"
            strokeWidth="1.5"
            className="animate-pcb-trace"
          />

          {/* Sweeping Laser Inspection Plane */}
          <line
            x1="-270"
            y1="0"
            x2="270"
            y2="0"
            stroke="#0090FF"
            strokeWidth="2"
            strokeOpacity="0.8"
            className="animate-laser-scan"
          />
        </g>

        {/* Technical Calibration Watermarks */}
        <text x="80" y="80" fill="#64748B" fontSize="8" fontFamily="monospace">
          CAD_TOOL: KICAD 8.0 · FAB_SPEC: IPC-6012 CLASS 2 · LAYER_COUNT: 4-LAYER
        </text>
      </svg>
    </div>
  );
}
