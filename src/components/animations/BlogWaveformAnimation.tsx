import React from 'react';

/**
 * BlogWaveformAnimation
 * Themed for Technical Blog & Publications:
 * - Oscilloscope waveform frequency stream
 * - Floating technical & engineering mathematics symbols (∑, Ω, ∫, Δ, σ)
 */
export function BlogWaveformAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute top-5 right-1/4 w-[480px] h-[300px] rounded-full bg-indigo-500/10 blur-[85px]" />
      <div className="absolute bottom-5 left-10 w-[380px] h-[250px] rounded-full bg-blue-500/10 blur-[80px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-35"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Continuous Flowing Oscilloscope Sine Wave */}
        <path
          d="M 0 100 Q 60 40 120 100 T 240 100 T 360 100 T 480 100 T 600 100 T 720 100 T 840 100 T 960 100 T 1080 100 T 1200 100"
          fill="none"
          stroke="#6366F1"
          strokeWidth="1.8"
          strokeDasharray="6 3"
          className="animate-pcb-trace"
        />

        {/* Square Pulse Clock Signal Wave */}
        <path
          d="M 50 140 L 110 140 L 110 80 L 170 80 L 170 140 L 230 140 L 230 80 L 290 80 L 290 140 L 350 140 L 350 80 L 410 80 L 410 140 L 470 140 L 470 80 L 530 80 L 530 140 L 590 140"
          fill="none"
          stroke="#3B82F6"
          strokeWidth="1.2"
          opacity="0.6"
        />

        {/* Floating Technical & LaTeX Mathematical Symbols */}
        <text x="140" y="60" fill="#6366F1" fontSize="24" fontFamily="serif" fontWeight="bold" opacity="0.4" className="animate-float-slow">
          ∑
        </text>
        <text x="320" y="50" fill="#3B82F6" fontSize="22" fontFamily="serif" fontWeight="bold" opacity="0.4" className="animate-float-slow" style={{ animationDelay: '1s' }}>
          Ω
        </text>
        <text x="520" y="65" fill="#8B5CF6" fontSize="24" fontFamily="serif" fontWeight="bold" opacity="0.35" className="animate-float-slow" style={{ animationDelay: '1.8s' }}>
          ∫
        </text>
        <text x="740" y="55" fill="#3B82F6" fontSize="20" fontFamily="sans-serif" fontWeight="bold" opacity="0.35" className="animate-float-slow" style={{ animationDelay: '2.5s' }}>
          ΔV
        </text>
        <text x="880" y="60" fill="#6366F1" fontSize="22" fontFamily="serif" fontWeight="bold" opacity="0.4" className="animate-float-slow" style={{ animationDelay: '0.5s' }}>
          λ
        </text>
      </svg>
    </div>
  );
}
