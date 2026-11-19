import React from 'react';

/**
 * BlogWaveformAnimation
 * Themed for Engineering Blog, Editorial Publications & Hardware Research:
 * - Digital Signal Processing (DSP) FFT Spectrum Analyzer
 * - High-speed Carrier Waveform with Frequency Modulation
 * - Technical telemetry stream representing deep hardware teardowns & research
 */
export function BlogWaveformAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="hidden sm:block absolute top-0 right-1/4 w-[480px] h-[320px] rounded-full bg-indigo-600/10 blur-[80px] transform-gpu pointer-events-none" />
      <div className="hidden sm:block absolute -bottom-10 left-10 w-[420px] h-[280px] rounded-full bg-blue-600/10 blur-[75px] transform-gpu pointer-events-none" />

      <svg
        className="absolute inset-0 h-full w-full opacity-55"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="blogGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#0B1528" fillOpacity="0.08" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#blogGrid)" />

        {/* -------------------------------------------------------- */}
        {/* FAST FOURIER TRANSFORM (FFT) SPECTRUM ANALYZER BARS      */}
        {/* -------------------------------------------------------- */}
        <g transform="translate(720, 260)">
          {/* Baseline Zero-Axis Line */}
          <line x1="-320" y1="0" x2="320" y2="0" stroke="#334155" strokeWidth="1.5" />

          {/* Equalizer Frequency Spectrum Bins */}
          {[
            { x: -300, h: 40, cls: 'animate-spectrum-1', col: '#6366F1' },
            { x: -270, h: 65, cls: 'animate-spectrum-2', col: '#6366F1' },
            { x: -240, h: 90, cls: 'animate-spectrum-3', col: '#0090FF' },
            { x: -210, h: 120, cls: 'animate-spectrum-4', col: '#0090FF' },
            { x: -180, h: 75, cls: 'animate-spectrum-5', col: '#38BDF8' },
            { x: -150, h: 110, cls: 'animate-spectrum-2', col: '#38BDF8' },
            { x: -120, h: 140, cls: 'animate-spectrum-1', col: '#F59E0B' },
            { x: -90, h: 85, cls: 'animate-spectrum-3', col: '#F59E0B' },
            { x: -60, h: 160, cls: 'animate-spectrum-4', col: '#FF8C00' },
            { x: -30, h: 95, cls: 'animate-spectrum-2', col: '#FF8C00' },
            { x: 0, h: 180, cls: 'animate-spectrum-1', col: '#0090FF' },
            { x: 30, h: 130, cls: 'animate-spectrum-5', col: '#0090FF' },
            { x: 60, h: 150, cls: 'animate-spectrum-3', col: '#38BDF8' },
            { x: 90, h: 110, cls: 'animate-spectrum-2', col: '#38BDF8' },
            { x: 120, h: 80, cls: 'animate-spectrum-4', col: '#10B981' },
            { x: 150, h: 135, cls: 'animate-spectrum-1', col: '#10B981' },
            { x: 180, h: 90, cls: 'animate-spectrum-5', col: '#6366F1' },
            { x: 210, h: 115, cls: 'animate-spectrum-3', col: '#6366F1' },
            { x: 240, h: 70, cls: 'animate-spectrum-2', col: '#A855F7' },
            { x: 270, h: 50, cls: 'animate-spectrum-4', col: '#A855F7' },
            { x: 300, h: 30, cls: 'animate-spectrum-1', col: '#A855F7' },
          ].map((bar, idx) => (
            <rect
              key={`fft-bar-${idx}`}
              x={bar.x - 8}
              y={-bar.h}
              width="16"
              height={bar.h}
              rx="3"
              fill={bar.col}
              fillOpacity="0.75"
              className={bar.cls}
            />
          ))}

          {/* Spectrum Axis Readout */}
          <text x="-320" y="24" fill="#64748B" fontSize="8" fontFamily="monospace">0 Hz</text>
          <text x="0" y="24" textAnchor="middle" fill="#0090FF" fontSize="8" fontFamily="monospace" fontWeight="bold">CENTER: 2.45 GHz</text>
          <text x="320" y="24" textAnchor="end" fill="#64748B" fontSize="8" fontFamily="monospace">SPAN: 100 MHz</text>
        </g>

        {/* Dynamic Continuous Carrier Wave (Upper Section) */}
        <path
          d="M 40 100 Q 120 40 200 100 T 360 100 T 520 100 T 680 100 T 840 100 T 1000 100 T 1160 100 T 1320 100 T 1440 100"
          fill="none"
          stroke="#0090FF"
          strokeWidth="1.75"
          className="animate-pcb-trace"
        />

        {/* Technical Editorial Header */}
        <text x="80" y="60" fill="#64748B" fontSize="8" fontFamily="monospace">
          EDITORIAL_DSP: 1024-PT FFT · TEARDOWNS · HARDWARE ARCHITECTURE · PEER REVIEWED
        </text>
      </svg>
    </div>
  );
}
