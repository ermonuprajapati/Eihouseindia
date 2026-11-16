import React from 'react';

/**
 * SiliconCircuitMatrixAnimation
 * Expert-grade engineering & hardware aesthetic for EI House Homepage:
 * - Precision EDA/CAD dot matrix blueprint
 * - Multi-layer PCB routing buses (SPI, I2C, Clock, Power) with 45° standard IPC angles
 * - Active animated electron/signal packets travelling through copper traces
 * - Central Silicon Microcontroller / SoC architecture footprint with glowing core pulse
 * - Gold-plated solder vias & test pads (TP1..TP4) in authentic brand colors (#0090FF & #F59E0B)
 */
export function SiliconCircuitMatrixAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      {/* 1. Atmospheric Ambient Lighting in EI House Brand Colors */}
      <div className="absolute -top-24 left-1/4 w-[600px] h-[400px] rounded-full bg-gradient-to-tr from-[#0090FF]/15 via-[#2563EB]/10 to-transparent blur-[100px]" />
      <div className="absolute top-1/4 -right-16 w-[550px] h-[450px] rounded-full bg-gradient-to-bl from-[#FF8C00]/12 via-[#F59E0B]/8 to-transparent blur-[110px]" />
      <div className="absolute -bottom-20 left-10 w-[500px] h-[350px] rounded-full bg-emerald-500/8 blur-[100px]" />

      {/* 2. Responsive Vector Masterboard Canvas */}
      <svg
        className="absolute inset-0 h-full w-full opacity-60"
        viewBox="0 0 1440 640"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Engineering Dot Matrix Blueprint Grid */}
          <pattern id="homeCadDots" width="36" height="36" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#0B1528" fillOpacity="0.12" />
          </pattern>

          {/* Linear Gradients for PCB Bus Traces */}
          <linearGradient id="traceBlueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284C7" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#0090FF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.2" />
          </linearGradient>

          <linearGradient id="traceAmberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#FF8C00" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.1" />
          </linearGradient>

          {/* Microcontroller Silicon Core Glow */}
          <radialGradient id="chipCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0090FF" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#1E40AF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#0B1528" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Blueprint Dot Matrix Grid Background */}
        <rect width="100%" height="100%" fill="url(#homeCadDots)" />

        {/* ----------------------------------------------------------- */}
        {/* BUS ROUTING LAYER: High-Speed Digital Signal Traces         */}
        {/* ----------------------------------------------------------- */}

        {/* Trace 1: Top-Left Primary Clock Bus (CLK 160MHz) */}
        <path
          d="M -40 90 L 220 90 L 310 180 L 520 180 L 560 220 L 720 220"
          fill="none"
          stroke="#0090FF"
          strokeWidth="1.75"
          className="animate-pcb-trace"
        />
        {/* Differential Pair Companion */}
        <path
          d="M -40 102 L 215 102 L 305 192 L 515 192 L 555 232 L 720 232"
          fill="none"
          stroke="#0284C7"
          strokeWidth="1.2"
          strokeOpacity="0.6"
        />

        {/* Trace 2: Amber Power & PWM Rail (Right to Left) */}
        <path
          d="M 1480 140 L 1260 140 L 1170 230 L 980 230 L 930 180 L 720 180"
          fill="none"
          stroke="url(#traceAmberGrad)"
          strokeWidth="2"
          className="animate-pcb-trace-fast"
        />
        <path
          d="M 1480 152 L 1265 152 L 1175 242 L 985 242 L 935 192 L 720 192"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="1"
          strokeOpacity="0.5"
        />

        {/* Trace 3: Lower Hardware Bus (UART / I2C / SPI) */}
        <path
          d="M 80 580 L 260 580 L 380 460 L 640 460 L 700 400 L 920 400 L 980 460 L 1380 460"
          fill="none"
          stroke="#0D9488"
          strokeWidth="1.5"
          className="animate-pcb-trace"
          style={{ animationDuration: '3.2s' }}
        />

        {/* Trace 4: Diagonal Silicon Ground Pour Channel */}
        <path
          d="M 420 -20 L 420 120 L 480 180 L 480 340 L 540 400 L 540 660"
          fill="none"
          stroke="#38BDF8"
          strokeWidth="1"
          strokeOpacity="0.4"
          strokeDasharray="4 4"
        />

        {/* ----------------------------------------------------------- */}
        {/* SILICON MICROCONTROLLER / SoC CHIP FOOTPRINT (Upper Center) */}
        {/* ----------------------------------------------------------- */}
        <g transform="translate(720, 210)" className="select-none">
          {/* Chip Aura & Pulsing Heat Dissipation Core */}
          <rect
            x="-75"
            y="-75"
            width="150"
            height="150"
            rx="16"
            fill="url(#chipCoreGlow)"
            className="animate-chip-heartbeat"
          />

          {/* IC Ceramic/Silicon Package Body */}
          <rect
            x="-60"
            y="-60"
            width="120"
            height="120"
            rx="8"
            fill="#070E1A"
            stroke="#1E3A8A"
            strokeWidth="1.75"
          />

          {/* Pin 1 Index Mark & Chamfer */}
          <circle cx="-46" cy="-46" r="3" fill="#F59E0B" />
          <path d="M -60 -44 L -44 -60" stroke="#0090FF" strokeWidth="1.5" />

          {/* Internal Die Window & Active Logic Matrix */}
          <rect
            x="-36"
            y="-36"
            width="72"
            height="72"
            rx="4"
            fill="#0B1528"
            stroke="#0284C7"
            strokeWidth="1"
            strokeDasharray="4 2"
          />

          {/* Silicon Core Center LED Heartbeat */}
          <circle cx="0" cy="0" r="8" fill="#0090FF" fillOpacity="0.25" />
          <circle cx="0" cy="0" r="4" fill="#38BDF8" className="animate-ping" style={{ animationDuration: '2.5s' }} />
          <circle cx="0" cy="0" r="2.5" fill="#FFFFFF" />

          {/* Silicon Laser Engraving Text */}
          <text
            x="0"
            y="-8"
            textAnchor="middle"
            fill="#93C5FD"
            fontSize="7"
            fontFamily="monospace"
            fontWeight="bold"
            letterSpacing="1"
          >
            EI-SOC CORTEX
          </text>
          <text
            x="0"
            y="4"
            textAnchor="middle"
            fill="#F59E0B"
            fontSize="6"
            fontFamily="monospace"
            letterSpacing="0.8"
          >
            240MHz · DUAL-CORE
          </text>
          <text
            x="0"
            y="14"
            textAnchor="middle"
            fill="#64748B"
            fontSize="5.5"
            fontFamily="monospace"
          >
            ARM HARDWARE SECURE
          </text>

          {/* QFP Pin Headers: Top / Bottom / Left / Right */}
          {[-45, -30, -15, 0, 15, 30, 45].map((pos, idx) => (
            <g key={`pin-${idx}`}>
              {/* Top Pins */}
              <line x1={pos} y1="-60" x2={pos} y2="-72" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
              {/* Bottom Pins */}
              <line x1={pos} y1="60" x2={pos} y2="72" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" />
              {/* Left Pins */}
              <line x1="-60" y1={pos} x2="-72" y2={pos} stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" />
              {/* Right Pins */}
              <line x1="60" y1={pos} x2="72" y2={pos} stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          ))}
        </g>

        {/* ----------------------------------------------------------- */}
        {/* GOLD-PLATED TEST POINTS (TP) & SOLDER VIAS WITH PULSING RINGS */}
        {/* ----------------------------------------------------------- */}

        {/* TP1: 3.3V System Rail */}
        <g transform="translate(310, 180)">
          <circle cx="0" cy="0" r="10" fill="none" stroke="#0090FF" strokeWidth="1" className="animate-radar-ring-1" />
          <circle cx="0" cy="0" r="5" fill="#0090FF" fillOpacity="0.2" stroke="#0284C7" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="1.75" fill="#FFFFFF" />
          <text x="8" y="-6" fill="#0284C7" fontSize="7.5" fontFamily="monospace" fontWeight="bold">TP1 · 3.3V</text>
        </g>

        {/* TP2: Clock Signal In */}
        <g transform="translate(520, 180)">
          <circle cx="0" cy="0" r="4.5" fill="#F59E0B" fillOpacity="0.25" stroke="#F59E0B" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="1.5" fill="#FBBF24" />
          <text x="-6" y="-8" fill="#B45309" fontSize="7.5" fontFamily="monospace" fontWeight="bold">CLK_IN</text>
        </g>

        {/* TP3: Power Telemetry */}
        <g transform="translate(980, 230)">
          <circle cx="0" cy="0" r="12" fill="none" stroke="#F59E0B" strokeWidth="0.8" className="animate-radar-ring-2" />
          <circle cx="0" cy="0" r="5" fill="#FF8C00" fillOpacity="0.2" stroke="#F59E0B" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="1.75" fill="#FFFFFF" />
          <text x="8" y="14" fill="#B45309" fontSize="7.5" fontFamily="monospace" fontWeight="bold">TP3 · VBUS</text>
        </g>

        {/* TP4: High-Speed CAN / I2C Bus */}
        <g transform="translate(380, 460)">
          <circle cx="0" cy="0" r="5" fill="#10B981" fillOpacity="0.2" stroke="#059669" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="1.5" fill="#34D399" />
          <text x="8" y="12" fill="#047857" fontSize="7.5" fontFamily="monospace" fontWeight="bold">I2C_SDA</text>
        </g>

        <g transform="translate(920, 400)">
          <circle cx="0" cy="0" r="5" fill="#0284C7" fillOpacity="0.2" stroke="#0284C7" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="1.5" fill="#38BDF8" />
          <text x="8" y="-6" fill="#0369A1" fontSize="7.5" fontFamily="monospace" fontWeight="bold">SPI_MOSI</text>
        </g>

        {/* ----------------------------------------------------------- */}
        {/* CAD DIMENSION & FIDUCIAL ALIGNMENT CROSSHAIRS               */}
        {/* ----------------------------------------------------------- */}
        {/* Fiducial Mark A (Top Left) */}
        <g transform="translate(80, 80)">
          <circle cx="0" cy="0" r="9" fill="none" stroke="#64748B" strokeWidth="0.75" strokeDasharray="3 3" />
          <circle cx="0" cy="0" r="3.5" fill="#0B1528" stroke="#334155" strokeWidth="1" />
          <circle cx="0" cy="0" r="1" fill="#FFFFFF" />
          <line x1="-12" y1="0" x2="12" y2="0" stroke="#64748B" strokeWidth="0.75" />
          <line x1="0" y1="-12" x2="0" y2="12" stroke="#64748B" strokeWidth="0.75" />
          <text x="14" y="4" fill="#64748B" fontSize="6.5" fontFamily="monospace">FID_1</text>
        </g>

        {/* Fiducial Mark B (Bottom Right) */}
        <g transform="translate(1360, 560)">
          <circle cx="0" cy="0" r="9" fill="none" stroke="#64748B" strokeWidth="0.75" strokeDasharray="3 3" />
          <circle cx="0" cy="0" r="3.5" fill="#0B1528" stroke="#334155" strokeWidth="1" />
          <circle cx="0" cy="0" r="1" fill="#FFFFFF" />
          <line x1="-12" y1="0" x2="12" y2="0" stroke="#64748B" strokeWidth="0.75" />
          <line x1="0" y1="-12" x2="0" y2="12" stroke="#64748B" strokeWidth="0.75" />
          <text x="-42" y="4" fill="#64748B" fontSize="6.5" fontFamily="monospace">FID_2</text>
        </g>

        {/* Logic Level Telemetry Readouts */}
        <text x="90" y="240" fill="#64748B" fontSize="8" fontFamily="monospace" opacity="0.6">
          SYS_STATUS: ACTIVE · LOGIC: 3.3V CMOS · BAUD: 115200 · LAYER: TOP_COPPER_L1
        </text>
        <text x="1040" y="380" fill="#64748B" fontSize="8" fontFamily="monospace" opacity="0.6">
          MEM_BUS: 0x2000_0000 · DMA_STREAM: ENABLED · FREQ: 160.00 MHz
        </text>
      </svg>
    </div>
  );
}
