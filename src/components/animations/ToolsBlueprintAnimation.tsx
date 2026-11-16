import React from 'react';

/**
 * ToolsBlueprintAnimation
 * Themed for Engineering Software & Calculation Tools:
 * - Laboratory Digital Storage Oscilloscope (DSO) Reticle Grid
 * - Dual-Channel Real-Time Signal Streams:
 *   - CH1: Analog Harmonic Sine Wave (Voltage Reference)
 *   - CH2: High-Speed Digital PWM / Clock Pulse Train
 * - Real-time Test Bench Measurement Callouts (Vpp, Frequency, Duty Cycle)
 */
export function ToolsBlueprintAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute top-0 right-1/4 w-[480px] h-[320px] rounded-full bg-blue-600/10 blur-[85px]" />
      <div className="absolute -bottom-10 left-10 w-[420px] h-[280px] rounded-full bg-cyan-600/10 blur-[80px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-55"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Oscilloscope Reticle Division Pattern */}
          <pattern id="scopeGrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#0090FF" strokeWidth="0.5" strokeOpacity="0.12" />
            <circle cx="30" cy="30" r="0.75" fill="#38BDF8" fillOpacity="0.25" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#scopeGrid)" />

        {/* -------------------------------------------------------- */}
        {/* OSCILLOSCOPE SCREEN FRAME (Center-Dominant Viewport)     */}
        {/* -------------------------------------------------------- */}
        <g transform="translate(720, 210)">
          {/* Screen Outer CRT/LCD Border */}
          <rect
            x="-420"
            y="-140"
            width="840"
            height="280"
            rx="12"
            fill="#050B14"
            fillOpacity="0.9"
            stroke="#1E3A8A"
            strokeWidth="1.5"
          />

          {/* Center Crosshairs Graticule */}
          <line x1="-400" y1="0" x2="400" y2="0" stroke="#0090FF" strokeWidth="0.8" strokeOpacity="0.3" strokeDasharray="4 4" />
          <line x1="0" y1="-130" x2="0" y2="130" stroke="#0090FF" strokeWidth="0.8" strokeOpacity="0.3" strokeDasharray="4 4" />

          {/* Sub-division Ticks along Axes */}
          {[-300, -200, -100, 100, 200, 300].map((tx) => (
            <line key={`xtick-${tx}`} x1={tx} y1="-5" x2={tx} y2="5" stroke="#38BDF8" strokeWidth="0.8" strokeOpacity="0.4" />
          ))}
          {[-100, -50, 50, 100].map((ty) => (
            <line key={`ytick-${ty}`} x1="-5" y1={ty} x2="5" y2={ty} stroke="#38BDF8" strokeWidth="0.8" strokeOpacity="0.4" />
          ))}

          {/* CHANNEL 1 (CH1): Dynamic Flowing Sine Wave (Electric Cyan/Blue) */}
          <path
            d="M -400 -30 Q -360 -90 -320 -30 T -240 -30 T -160 -30 T -80 -30 T 0 -30 T 80 -30 T 160 -30 T 240 -30 T 320 -30 T 400 -30"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.2"
            className="animate-pcb-trace"
          />

          {/* CHANNEL 2 (CH2): Digital Pulse Train / PWM Wave (Solar Amber) */}
          <path
            d="M -400 60 L -360 60 L -360 20 L -320 20 L -320 60 L -280 60 L -280 20 L -240 20 L -240 60 L -200 60 L -200 20 L -160 20 L -160 60 L -120 60 L -120 20 L -80 20 L -80 60 L -40 60 L -40 20 L 0 20 L 0 60 L 40 60 L 40 20 L 80 20 L 80 60 L 120 60 L 120 20 L 160 20 L 160 60 L 200 60 L 200 20 L 240 20 L 240 60 L 280 60 L 280 20 L 320 20 L 320 60 L 360 60 L 360 20 L 400 20"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            className="animate-pcb-trace-fast"
          />

          {/* Scope Telemetry Headers */}
          <text x="-400" y="-115" fill="#38BDF8" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
            CH1: 1.00V/div · 3.30Vpp · 1.000 kHz SINE
          </text>
          <text x="-400" y="125" fill="#F59E0B" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
            CH2: 2.00V/div · 20.00 kHz · 50.0% PWM
          </text>
          <text x="240" y="-115" fill="#10B981" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
            TIME: 500µs/div · TRIG: AUTO ↑
          </text>
        </g>

        {/* Technical Calibration Watermarks */}
        <text x="80" y="60" fill="#64748B" fontSize="8" fontFamily="monospace">
          TOOL_SUITE: REAL-TIME CIRCUIT ENGINE · OHM&apos;S LAW · TRACE WIDTH IPC-2152 · TIMER 555
        </text>
      </svg>
    </div>
  );
}
