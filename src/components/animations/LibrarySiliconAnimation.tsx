import React from 'react';

/**
 * LibrarySiliconAnimation
 * Themed for Engineering Library, Datasheets & Component Registry:
 * - Microcontroller Architectural Pinout Breakdown (GPIO, I2C, SPI, UART, ADC)
 * - Memory Register Address Map (APB1, APB2, AHB Bus Matrix)
 * - Data bus activity demonstrating comprehensive hardware documentation
 */
export function LibrarySiliconAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute top-0 right-1/4 w-[480px] h-[320px] rounded-full bg-emerald-600/10 blur-[85px]" />
      <div className="absolute -bottom-10 left-10 w-[420px] h-[280px] rounded-full bg-blue-600/10 blur-[80px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-55"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="libGrid" width="45" height="45" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#0B1528" fillOpacity="0.08" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#libGrid)" />

        {/* -------------------------------------------------------- */}
        {/* SILICON IC PINOUT SCHEMATIC (Center Platform)            */}
        {/* -------------------------------------------------------- */}
        <g transform="translate(720, 210)">
          {/* IC Silicon Package Body */}
          <rect
            x="-160"
            y="-100"
            width="320"
            height="200"
            rx="8"
            fill="#070E1A"
            stroke="#059669"
            strokeWidth="1.75"
          />

          {/* IC Label & Part Number */}
          <text x="0" y="-55" textAnchor="middle" fill="#34D399" fontSize="10" fontFamily="monospace" fontWeight="bold">
            STM32F401RE / ESP32-S3
          </text>
          <text x="0" y="-38" textAnchor="middle" fill="#64748B" fontSize="7.5" fontFamily="monospace">
            64-PIN LQFP ARCHITECTURE PINOUT
          </text>

          {/* Silicon Core Center LED Heartbeat */}
          <circle cx="0" cy="0" r="14" fill="#059669" fillOpacity="0.2" className="animate-chip-heartbeat" />
          <circle cx="0" cy="0" r="3.5" fill="#34D399" />
          <text x="0" y="22" textAnchor="middle" fill="#93C5FD" fontSize="7.5" fontFamily="monospace">
            ARM CORTEX-M4F @ 84MHz
          </text>

          {/* Left Pins (GPIO & Communications) */}
          {[
            { label: 'PA9 (USART1_TX)', color: '#38BDF8' },
            { label: 'PA10 (USART1_RX)', color: '#38BDF8' },
            { label: 'PB6 (I2C1_SCL)', color: '#F59E0B' },
            { label: 'PB7 (I2C1_SDA)', color: '#F59E0B' },
            { label: 'PA5 (SPI1_SCK)', color: '#10B981' },
          ].map((pin, i) => {
            const py = -60 + i * 30;
            return (
              <g key={`lpin-${i}`}>
                <line x1="-160" y1={py} x2="-230" y2={py} stroke={pin.color} strokeWidth="1.5" />
                <circle cx="-230" cy={py} r="3" fill="#070E1A" stroke={pin.color} strokeWidth="1.2" />
                <text x="-240" y={py + 3} textAnchor="end" fill={pin.color} fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                  {pin.label}
                </text>
              </g>
            );
          })}

          {/* Right Pins (Analog, Clocks & Power) */}
          {[
            { label: 'VDD (3.3V POWER)', color: '#EF4444' },
            { label: 'GND (SYSTEM GND)', color: '#64748B' },
            { label: 'PA0 (ADC1_IN0)', color: '#A855F7' },
            { label: 'NRST (SYS_RESET)', color: '#F59E0B' },
            { label: 'OSC_IN (8MHz HSE)', color: '#38BDF8' },
          ].map((pin, i) => {
            const py = -60 + i * 30;
            return (
              <g key={`rpin-${i}`}>
                <line x1="160" y1={py} x2="230" y2={py} stroke={pin.color} strokeWidth="1.5" />
                <circle cx="230" cy={py} r="3" fill="#070E1A" stroke={pin.color} strokeWidth="1.2" />
                <text x="240" y={py + 3} textAnchor="start" fill={pin.color} fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                  {pin.label}
                </text>
              </g>
            );
          })}
        </g>

        {/* Technical Calibration Watermarks */}
        <text x="80" y="60" fill="#64748B" fontSize="8" fontFamily="monospace">
          LIBRARY_REGISTRY: 5,000+ COMPONENT DATASHEETS · FOOTPRINTS & SYMBOLS · 3D STEP MODELS
        </text>
      </svg>
    </div>
  );
}
