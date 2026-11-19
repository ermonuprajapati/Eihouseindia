import React from 'react';

/**
 * LearnKnowledgeAnimation
 * Themed for Engineering Education, 45-Day Hardware Immersion, and Firmware Learning:
 * - ARM Cortex-M Microcontroller Execution Engine & Register Architecture
 * - Live Serial Bus Timing Logic Analyzer (CLK, DATA, SYNC)
 * - 4-Stage Learning Progression: [Registers] ➔ [HAL Drivers] ➔ [Peripherals] ➔ [Production Capstone]
 * - Right-dominant layout (x: 860-1420) so left-side hero text is 100% crisp and unhindered
 */
export function LearnKnowledgeAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      {/* Soft Ambient Corner Glows (Hardware Accelerated & Desktop-only for Max Mobile Speed) */}
      <div className="hidden sm:block absolute top-0 right-1/4 w-[500px] h-[340px] rounded-full bg-blue-600/10 blur-[80px] transform-gpu pointer-events-none" />
      <div className="hidden sm:block absolute -bottom-10 right-10 w-[440px] h-[300px] rounded-full bg-amber-500/10 blur-[75px] transform-gpu pointer-events-none" />

      <svg
        className="absolute inset-0 h-full w-full opacity-60"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="learnCadGrid" width="45" height="45" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.9" fill="#0B1528" fillOpacity="0.08" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#learnCadGrid)" />

        {/* ------------------------------------------------------------- */}
        {/* TOP INTERCONNECTING BUS (Routes safely along upper margin)    */}
        {/* ------------------------------------------------------------- */}
        <path
          d="M 60 65 L 680 65 L 740 120 L 1400 120"
          fill="none"
          stroke="#0090FF"
          strokeWidth="1.5"
          className="animate-pcb-trace"
        />

        {/* ------------------------------------------------------------- */}
        {/* RIGHT PLATFORM: ARM CORTEX-M MCU ARCHITECTURE (x: 950, y: 230) */}
        {/* ------------------------------------------------------------- */}
        <g transform="translate(950, 230)">
          {/* Main Silicon Architectural Frame */}
          <rect
            x="-140"
            y="-140"
            width="280"
            height="270"
            rx="12"
            fill="#050B14"
            fillOpacity="0.92"
            stroke="#1E3A8A"
            strokeWidth="1.5"
          />

          {/* Module Header */}
          <rect x="-125" y="-126" width="130" height="20" rx="4" fill="#0B1528" stroke="#0090FF" strokeWidth="1" />
          <text x="-60" y="-112" textAnchor="middle" fill="#38BDF8" fontSize="8" fontFamily="monospace" fontWeight="bold">
            ARM CORTEX-M CORE
          </text>
          <circle cx="115" cy="-116" r="3" fill="#10B981" className="animate-pulse" />

          {/* Core Register File */}
          <rect x="-120" y="-95" width="115" height="75" rx="6" fill="#0A1322" stroke="#0284C7" strokeWidth="1" />
          <text x="-110" y="-80" fill="#93C5FD" fontSize="7.5" fontFamily="monospace" fontWeight="bold">REGISTERS (R0-R15)</text>
          <text x="-110" y="-66" fill="#64748B" fontSize="6.5" fontFamily="monospace">PC: 0x0800_0140</text>
          <text x="-110" y="-54" fill="#64748B" fontSize="6.5" fontFamily="monospace">SP: 0x2000_1000</text>
          <text x="-110" y="-42" fill="#34D399" fontSize="6.5" fontFamily="monospace">LR: 0x0800_02A8</text>
          <text x="-110" y="-30" fill="#F59E0B" fontSize="6.5" fontFamily="monospace">PSR: THUMB MODE</text>

          {/* NVIC & Interrupt Vector Block */}
          <rect x="5" y="-95" width="115" height="75" rx="6" fill="#0A1322" stroke="#F59E0B" strokeWidth="1" />
          <text x="15" y="-80" fill="#FCD34D" fontSize="7.5" fontFamily="monospace" fontWeight="bold">NVIC &amp; SYSTICK</text>
          <text x="15" y="-66" fill="#64748B" fontSize="6.5" fontFamily="monospace">IRQ 0: EXTI_LINE</text>
          <text x="15" y="-54" fill="#64748B" fontSize="6.5" fontFamily="monospace">IRQ 1: USART1_RX</text>
          <text x="15" y="-42" fill="#10B981" fontSize="6.5" fontFamily="monospace">IRQ 2: DMA1_STRM</text>
          <text x="15" y="-30" fill="#38BDF8" fontSize="6.5" fontFamily="monospace">TICK: 1.000 ms</text>

          {/* AHB / APB High-Speed Bus Matrix */}
          <rect x="-120" y="-10" width="240" height="26" rx="4" fill="#0B1528" stroke="#334155" strokeWidth="1" />
          <text x="0" y="7" textAnchor="middle" fill="#38BDF8" fontSize="8" fontFamily="monospace" fontWeight="bold">
            AHB / APB SYSTEM BUS MATRIX · 168 MHz
          </text>

          {/* Embedded Firmware Execution Milestone Blocks */}
          <g transform="translate(-120, 26)">
            {/* Step 1 */}
            <rect x="0" y="0" width="55" height="60" rx="4" fill="#070E1A" stroke="#0090FF" strokeWidth="1" />
            <text x="27" y="18" textAnchor="middle" fill="#38BDF8" fontSize="7" fontFamily="monospace" fontWeight="bold">PHASE 1</text>
            <text x="27" y="32" textAnchor="middle" fill="#64748B" fontSize="6.5" fontFamily="monospace">C Basics</text>
            <text x="27" y="44" textAnchor="middle" fill="#93C5FD" fontSize="6" fontFamily="monospace">&amp; Logic</text>

            {/* Step 2 */}
            <rect x="62" y="0" width="55" height="60" rx="4" fill="#070E1A" stroke="#F59E0B" strokeWidth="1" />
            <text x="89" y="18" textAnchor="middle" fill="#FCD34D" fontSize="7" fontFamily="monospace" fontWeight="bold">PHASE 2</text>
            <text x="89" y="32" textAnchor="middle" fill="#64748B" fontSize="6.5" fontFamily="monospace">Registers</text>
            <text x="89" y="44" textAnchor="middle" fill="#FCD34D" fontSize="6" fontFamily="monospace">&amp; Timers</text>

            {/* Step 3 */}
            <rect x="124" y="0" width="55" height="60" rx="4" fill="#070E1A" stroke="#10B981" strokeWidth="1" />
            <text x="151" y="18" textAnchor="middle" fill="#34D399" fontSize="7" fontFamily="monospace" fontWeight="bold">PHASE 3</text>
            <text x="151" y="32" textAnchor="middle" fill="#64748B" fontSize="6.5" fontFamily="monospace">I2C / SPI</text>
            <text x="151" y="44" textAnchor="middle" fill="#6EE7B7" fontSize="6" fontFamily="monospace">Drivers</text>

            {/* Step 4 */}
            <rect x="185" y="0" width="55" height="60" rx="4" fill="#070E1A" stroke="#FF8C00" strokeWidth="1" />
            <text x="212" y="18" textAnchor="middle" fill="#FBBF24" fontSize="7" fontFamily="monospace" fontWeight="bold">PHASE 4</text>
            <text x="212" y="32" textAnchor="middle" fill="#64748B" fontSize="6.5" fontFamily="monospace">Hardware</text>
            <text x="212" y="44" textAnchor="middle" fill="#FBBF24" fontSize="6" fontFamily="monospace">Capstone</text>
          </g>

          <text x="-120" y="105" fill="#64748B" fontSize="7" fontFamily="monospace">CURRICULUM: 45-DAY INTENSIVE EMBEDDED IMMERSION</text>
          <text x="120" y="105" textAnchor="end" fill="#10B981" fontSize="7" fontFamily="monospace" fontWeight="bold">HANDS-ON KITS</text>
        </g>

        {/* ------------------------------------------------------------- */}
        {/* RIGHT SECONDARY: BUS TIMING LOGIC ANALYZER (x: 1260, y: 230)  */}
        {/* ------------------------------------------------------------- */}
        <g transform="translate(1260, 230)">
          <rect
            x="-120"
            y="-140"
            width="240"
            height="270"
            rx="12"
            fill="#050B14"
            fillOpacity="0.92"
            stroke="#0284C7"
            strokeWidth="1.5"
          />

          <rect x="-105" y="-126" width="140" height="20" rx="4" fill="#0B1528" stroke="#F59E0B" strokeWidth="1" />
          <text x="-35" y="-112" textAnchor="middle" fill="#FCD34D" fontSize="8" fontFamily="monospace" fontWeight="bold">
            BUS LOGIC ANALYZER
          </text>

          {/* Channel 1: SPI SCK Clock Pulse */}
          <text x="-105" y="-85" fill="#38BDF8" fontSize="7.5" fontFamily="monospace" fontWeight="bold">CH1: SCK (10 MHz)</text>
          <path
            d="M -105 -70 L -90 -70 L -90 -80 L -75 -80 L -75 -70 L -60 -70 L -60 -80 L -45 -80 L -45 -70 L -30 -70 L -30 -80 L -15 -80 L -15 -70 L 0 -70 L 0 -80 L 15 -80 L 15 -70 L 30 -70 L 30 -80 L 45 -80 L 45 -70 L 60 -70 L 60 -80 L 75 -80 L 75 -70 L 90 -70 L 90 -80 L 105 -80"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="1.5"
            className="animate-pcb-trace"
          />

          {/* Channel 2: MOSI Data Packet Stream */}
          <text x="-105" y="-45" fill="#F59E0B" fontSize="7.5" fontFamily="monospace" fontWeight="bold">CH2: MOSI (TX DATA)</text>
          <path
            d="M -105 -30 L -75 -30 L -75 -40 L -45 -40 L -45 -30 L -15 -30 L -15 -40 L 30 -40 L 30 -30 L 60 -30 L 60 -40 L 105 -40"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="1.5"
            className="animate-pcb-trace-fast"
          />

          {/* Channel 3: MISO Sensor In Stream */}
          <text x="-105" y="-5" fill="#10B981" fontSize="7.5" fontFamily="monospace" fontWeight="bold">CH3: MISO (RX SENSOR)</text>
          <path
            d="M -105 10 L -60 10 L -60 0 L -30 0 L -30 10 L 15 10 L 15 0 L 75 0 L 75 10 L 105 10"
            fill="none"
            stroke="#10B981"
            strokeWidth="1.5"
            className="animate-pcb-trace"
          />

          {/* Telemetry packet decode table */}
          <rect x="-105" y="30" width="210" height="70" rx="6" fill="#070E1A" stroke="#334155" strokeWidth="1" />
          <text x="-95" y="48" fill="#93C5FD" fontSize="7.5" fontFamily="monospace" fontWeight="bold">PACKET: 0xA5 0x3F 0x12 0x88</text>
          <text x="-95" y="64" fill="#64748B" fontSize="7" fontFamily="monospace">CRC16: 0x8C12 · PARITY: VALID</text>
          <text x="-95" y="80" fill="#34D399" fontSize="7" fontFamily="monospace">DECODED: ACCEL_X = +1.024g</text>

          <text x="-105" y="116" fill="#64748B" fontSize="7" fontFamily="monospace">SAMPLING: 100 MSa/s · 8 CHANNELS</text>
        </g>

        {/* Clean Header Line */}
        <text x="80" y="48" fill="#64748B" fontSize="8" fontFamily="monospace">
          LEARN_ENVIRONMENT: EMBEDDED_FIRMWARE · ARM_CORTEX · HARDWARE_REGISTERS · PROTOCOLS
        </text>
      </svg>
    </div>
  );
}
