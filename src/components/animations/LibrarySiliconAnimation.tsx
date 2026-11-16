import React from 'react';

/**
 * LibrarySiliconAnimation
 * Themed for Engineering Library, Datasheets, Pinout Documentation & Architecture:
 * - 64-Pin LQFP Microcontroller Silicon Architectural Pinout Matrix
 * - Pin Multiplexing Callouts (USART, I2C, SPI, PWM, ADC)
 * - Memory-Mapped Peripheral Address Bus (AHB, APB1, APB2)
 * - Right-dominant layout (x: 860-1420) so left-side hero text is 100% crisp and readable
 */
export function LibrarySiliconAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      {/* Soft Ambient Library Glows (Right-Dominant) */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[340px] rounded-full bg-emerald-600/10 blur-[90px]" />
      <div className="absolute -bottom-10 right-10 w-[440px] h-[300px] rounded-full bg-blue-600/10 blur-[85px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-60"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="libraryCadGrid" width="45" height="45" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#0B1528" fillOpacity="0.08" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#libraryCadGrid)" />

        {/* ------------------------------------------------------------- */}
        {/* TOP MARGIN BUS                                                */}
        {/* ------------------------------------------------------------- */}
        <path
          d="M 60 65 L 680 65 L 740 120 L 1400 120"
          fill="none"
          stroke="#059669"
          strokeWidth="1.5"
          className="animate-pcb-trace"
        />

        {/* ------------------------------------------------------------- */}
        {/* RIGHT PLATFORM: SILICON ARCHITECTURAL PINOUT MATRIX (x: 1120, y: 220) */}
        {/* ------------------------------------------------------------- */}
        <g transform="translate(1120, 220)">
          {/* Main Silicon Architectural Chassis */}
          <rect
            x="-210"
            y="-135"
            width="420"
            height="270"
            rx="12"
            fill="#050B14"
            fillOpacity="0.94"
            stroke="#059669"
            strokeWidth="1.75"
          />

          {/* Central IC Silicon Package (LQFP-64) */}
          <rect
            x="-70"
            y="-70"
            width="140"
            height="140"
            rx="8"
            fill="#0B1528"
            stroke="#10B981"
            strokeWidth="1.5"
          />
          {/* Silicon Core Activity Indicator */}
          <circle cx="0" cy="0" r="15" fill="#059669" fillOpacity="0.25" className="animate-chip-heartbeat" />
          <circle cx="0" cy="0" r="4" fill="#34D399" />
          <text x="0" y="-30" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontFamily="monospace" fontWeight="bold">
            STM32 / ESP32
          </text>
          <text x="0" y="-18" textAnchor="middle" fill="#6EE7B7" fontSize="7" fontFamily="monospace">
            ARM CORTEX-M4F
          </text>
          <text x="0" y="24" textAnchor="middle" fill="#93C5FD" fontSize="6.5" fontFamily="monospace">
            64-PIN ARCHITECTURE
          </text>
          <text x="0" y="36" textAnchor="middle" fill="#F59E0B" fontSize="6.5" fontFamily="monospace">
            DATASHEET VERIFIED
          </text>

          {/* Left Multiplexed Pin Array */}
          {[
            { label: 'PA9 (USART1_TX)', col: '#38BDF8' },
            { label: 'PA10 (USART1_RX)', col: '#38BDF8' },
            { label: 'PB6 (I2C1_SCL)', col: '#F59E0B' },
            { label: 'PB7 (I2C1_SDA)', col: '#F59E0B' },
            { label: 'PA5 (SPI1_SCK)', col: '#10B981' },
          ].map((pin, i) => {
            const py = -50 + i * 25;
            return (
              <g key={`lib-lpin-${i}`}>
                <line x1="-70" y1={py} x2="-120" y2={py} stroke={pin.col} strokeWidth="1.5" />
                <circle cx="-120" cy={py} r="2.5" fill="#070E1A" stroke={pin.col} strokeWidth="1.2" />
                <text x="-126" y={py + 3} textAnchor="end" fill={pin.col} fontSize="7" fontFamily="monospace" fontWeight="bold">
                  {pin.label}
                </text>
              </g>
            );
          })}

          {/* Right Multiplexed Pin Array */}
          {[
            { label: 'VDD (3.3V POWER)', col: '#EF4444' },
            { label: 'GND (SYSTEM GND)', col: '#64748B' },
            { label: 'PA0 (ADC1_CH0)', col: '#A855F7' },
            { label: 'PA1 (TIM2_CH2)', col: '#38BDF8' },
            { label: 'NRST (SYS_RESET)', col: '#F59E0B' },
          ].map((pin, i) => {
            const py = -50 + i * 25;
            return (
              <g key={`lib-rpin-${i}`}>
                <line x1="70" y1={py} x2="120" y2={py} stroke={pin.col} strokeWidth="1.5" />
                <circle cx="120" cy={py} r="2.5" fill="#070E1A" stroke={pin.col} strokeWidth="1.2" />
                <text x="126" y={py + 3} textAnchor="start" fill={pin.col} fontSize="7" fontFamily="monospace" fontWeight="bold">
                  {pin.label}
                </text>
              </g>
            );
          })}

          {/* Top Header Information Badge */}
          <g transform="translate(-195, -123)">
            <rect x="0" y="0" width="160" height="20" rx="4" fill="#0B1528" stroke="#059669" strokeWidth="1" />
            <text x="80" y="14" textAnchor="middle" fill="#34D399" fontSize="8" fontFamily="monospace" fontWeight="bold">
              COMPONENT REGISTRY &amp; PINOUT
            </text>
          </g>

          {/* Memory Register Address Map */}
          <g transform="translate(-190, 80)">
            <rect x="0" y="0" width="380" height="32" rx="4" fill="#0A1322" stroke="#334155" strokeWidth="1" />
            <text x="10" y="14" fill="#38BDF8" fontSize="7" fontFamily="monospace">
              APB1: 0x4000_0000 (TIMERS/I2C)
            </text>
            <text x="140" y="14" fill="#F59E0B" fontSize="7" fontFamily="monospace">
              APB2: 0x4001_0000 (SPI/USART/ADC)
            </text>
            <text x="280" y="14" fill="#10B981" fontSize="7" fontFamily="monospace">
              AHB1: 0x4002_0000 (GPIO/DMA)
            </text>
            <text x="10" y="25" fill="#64748B" fontSize="6.5" fontFamily="monospace">
              MEMORY-MAPPED PERIPHERAL REGISTER BUS ARCHITECTURE
            </text>
          </g>

          {/* Bottom Status Bar */}
          <text x="-190" y="124" fill="#64748B" fontSize="7" fontFamily="monospace">LIBRARY: HARDWARE PINOUTS · SCHEMATICS · DATASHEETS · REGISTER MAPS</text>
          <text x="190" y="124" textAnchor="end" fill="#10B981" fontSize="7" fontFamily="monospace" fontWeight="bold">OFFICIAL SPECS</text>
        </g>

        {/* Clean Header Line */}
        <text x="80" y="48" fill="#64748B" fontSize="8" fontFamily="monospace">
          SILICON_LIBRARY: PINOUT_DIAGRAMS · ARCHITECTURAL_BLOCKS · MEMORY_MAPS · DATASHEETS
        </text>
      </svg>
    </div>
  );
}
