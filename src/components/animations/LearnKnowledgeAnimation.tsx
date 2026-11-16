import React from 'react';

/**
 * LearnKnowledgeAnimation
 * Themed for Engineering Education, 45-Day Immersion, and Firmware Learning:
 * - Embedded Firmware & Logic Compilation Pipeline:
 *   [C/C++ Source] ➔ [GCC Compiler] ➔ [Flash Memory] ➔ [MCU Core Execution] ➔ [Peripherals]
 * - Logic gate symbols (AND, OR, BUFFER) routing live binary clock pulses
 * - Interactive milestone nodes representing hands-on skill mastery
 */
export function LearnKnowledgeAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute -top-16 left-1/4 w-[500px] h-[340px] rounded-full bg-blue-600/10 blur-[90px]" />
      <div className="absolute top-10 right-1/4 w-[450px] h-[300px] rounded-full bg-amber-500/10 blur-[85px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-55"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="learnGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#0B1528" fillOpacity="0.08" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#learnGrid)" />

        {/* -------------------------------------------------------- */}
        {/* PIPELINE DATA BUS (Left to Right through Learning Stages) */}
        {/* -------------------------------------------------------- */}
        <path
          d="M 60 210 L 260 210 L 320 150 L 520 150 L 580 210 L 860 210 L 920 270 L 1140 270 L 1200 210 L 1380 210"
          fill="none"
          stroke="#0090FF"
          strokeWidth="2"
          className="animate-pcb-trace"
        />

        {/* Parallel Secondary Bus: Feedback & Practical Verification */}
        <path
          d="M 260 222 L 315 162 L 525 162 L 575 222 L 865 222 L 915 282 L 1135 282 L 1195 222 L 1380 222"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="1.2"
          strokeOpacity="0.6"
        />

        {/* -------------------------------------------------------- */}
        {/* STAGE 01: C/C++ CODE ARCHITECTURE                        */}
        {/* -------------------------------------------------------- */}
        <g transform="translate(180, 210)">
          <rect x="-55" y="-35" width="110" height="70" rx="8" fill="#0B1528" stroke="#0090FF" strokeWidth="1.5" />
          <circle cx="-38" cy="-22" r="3" fill="#EF4444" />
          <circle cx="-28" cy="-22" r="3" fill="#F59E0B" />
          <circle cx="-18" cy="-22" r="3" fill="#10B981" />
          <text x="0" y="2" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontFamily="monospace" fontWeight="bold">01. FIRMWARE</text>
          <text x="0" y="16" textAnchor="middle" fill="#93C5FD" fontSize="7.5" fontFamily="monospace">C / Embedded C</text>
        </g>

        {/* -------------------------------------------------------- */}
        {/* STAGE 02: ARM GCC COMPILATION & TOOLCHAIN                */}
        {/* -------------------------------------------------------- */}
        <g transform="translate(450, 150)">
          <rect x="-55" y="-35" width="110" height="70" rx="8" fill="#0B1528" stroke="#F59E0B" strokeWidth="1.5" />
          <circle cx="0" cy="-14" r="8" fill="#F59E0B" fillOpacity="0.2" />
          <circle cx="0" cy="-14" r="3.5" fill="#FBBF24" className="animate-ping" style={{ animationDuration: '2s' }} />
          <text x="0" y="6" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontFamily="monospace" fontWeight="bold">02. COMPILER</text>
          <text x="0" y="20" textAnchor="middle" fill="#FCD34D" fontSize="7.5" fontFamily="monospace">ELF ➔ BIN / HEX</text>
        </g>

        {/* -------------------------------------------------------- */}
        {/* STAGE 03: FLASH MEMORY & REGISTER REGISTRATION           */}
        {/* -------------------------------------------------------- */}
        <g transform="translate(740, 210)">
          <rect x="-60" y="-38" width="120" height="76" rx="8" fill="#070E1A" stroke="#0284C7" strokeWidth="1.75" />
          <rect x="-48" y="-26" width="96" height="24" rx="4" fill="#0B1528" stroke="#1E40AF" strokeWidth="1" />
          <text x="0" y="-10" textAnchor="middle" fill="#60A5FA" fontSize="8" fontFamily="monospace" fontWeight="bold">0x0800_0000</text>
          <text x="0" y="14" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontFamily="monospace" fontWeight="bold">03. STM32 FLASH</text>
          <text x="0" y="26" textAnchor="middle" fill="#38BDF8" fontSize="7" fontFamily="monospace">DMA · NVIC · TIMERS</text>
        </g>

        {/* -------------------------------------------------------- */}
        {/* STAGE 04: HARDWARE CIRCUITS & SENSORS                    */}
        {/* -------------------------------------------------------- */}
        <g transform="translate(1040, 270)">
          <rect x="-55" y="-35" width="110" height="70" rx="8" fill="#0B1528" stroke="#10B981" strokeWidth="1.5" />
          <circle cx="0" cy="-14" r="8" fill="#10B981" fillOpacity="0.2" />
          <circle cx="0" cy="-14" r="3.5" fill="#34D399" className="animate-ping" style={{ animationDuration: '2.4s' }} />
          <text x="0" y="6" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontFamily="monospace" fontWeight="bold">04. HARDWARE</text>
          <text x="0" y="20" textAnchor="middle" fill="#6EE7B7" fontSize="7.5" fontFamily="monospace">Sensors · Actuators</text>
        </g>

        {/* -------------------------------------------------------- */}
        {/* STAGE 05: INDUSTRY CAPSTONE DEPLOYMENT                   */}
        {/* -------------------------------------------------------- */}
        <g transform="translate(1300, 210)">
          <circle cx="0" cy="0" r="32" fill="#070E1A" stroke="#FF8C00" strokeWidth="1.75" />
          <circle cx="0" cy="0" r="10" fill="#F59E0B" fillOpacity="0.25" className="animate-chip-heartbeat" />
          <circle cx="0" cy="0" r="3.5" fill="#FFFFFF" />
          <text x="0" y="-8" textAnchor="middle" fill="#FBBF24" fontSize="8" fontFamily="monospace" fontWeight="bold">VERIFIED</text>
          <text x="0" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontFamily="monospace">ENGINEER</text>
        </g>

        {/* Signal Branch Flow Ticks */}
        <text x="180" y="320" fill="#64748B" fontSize="8" fontFamily="monospace">
          SYSTICK_HZ: 1000 · ARCHITECTURE: ARM CORTEX-M4F · HAL_DRIVER: READY
        </text>
      </svg>
    </div>
  );
}
