import React from 'react';

/**
 * LearnKnowledgeAnimation
 * Themed for Engineering Education & 45-Day Training:
 * - Interconnected STEM Knowledge Constellation
 * - Branching engineering disciplines (Embedded, IoT, Robotics, AI, PCB)
 * - Pulsing neural knowledge flow
 */
export function LearnKnowledgeAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute -top-10 left-1/3 w-[500px] h-[320px] rounded-full bg-amber-500/10 blur-[85px]" />
      <div className="absolute top-20 right-10 w-[380px] h-[260px] rounded-full bg-sky-500/10 blur-[75px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-40"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Knowledge Pathway Lines */}
        <path
          d="M 120 180 Q 240 100 360 140 T 600 90 T 820 150"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path
          d="M 180 80 Q 320 170 480 120 T 750 170"
          fill="none"
          stroke="#38BDF8"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />

        {/* Node 1: Embedded Systems */}
        <g transform="translate(180, 80)">
          <circle cx="0" cy="0" r="18" fill="#1E293B" stroke="#38BDF8" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="8" fill="#38BDF8" className="animate-pulse" />
          <text x="0" y="30" textAnchor="middle" fill="#0284C7" fontSize="9" fontFamily="sans-serif" fontWeight="bold">Embedded</text>
        </g>

        {/* Node 2: IoT & Wireless */}
        <g transform="translate(360, 140)">
          <circle cx="0" cy="0" r="22" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="10" fill="#F59E0B" className="animate-pulse" style={{ animationDelay: '0.8s' }} />
          <text x="0" y="34" textAnchor="middle" fill="#D97706" fontSize="9" fontFamily="sans-serif" fontWeight="bold">IoT·Cloud</text>
        </g>

        {/* Node 3: Robotics & ROS2 */}
        <g transform="translate(600, 90)">
          <circle cx="0" cy="0" r="20" fill="#1E293B" stroke="#10B981" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="9" fill="#10B981" className="animate-pulse" style={{ animationDelay: '1.4s' }} />
          <text x="0" y="32" textAnchor="middle" fill="#059669" fontSize="9" fontFamily="sans-serif" fontWeight="bold">Robotics</text>
        </g>

        {/* Node 4: PCB Design & Fabrication */}
        <g transform="translate(820, 150)">
          <circle cx="0" cy="0" r="18" fill="#1E293B" stroke="#8B5CF6" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="7" fill="#8B5CF6" className="animate-pulse" style={{ animationDelay: '2s' }} />
          <text x="0" y="30" textAnchor="middle" fill="#7C3AED" fontSize="9" fontFamily="sans-serif" fontWeight="bold">PCB Design</text>
        </g>
      </svg>
    </div>
  );
}
