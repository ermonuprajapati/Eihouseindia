import React from 'react';

/**
 * FranchiseLabAnimation
 * Themed for Institutional Partnerships, College Centers of Excellence & STEM Labs:
 * - 6-DOF Industrial Robotic Arm Kinematic Model (Joint angles, Actuator servos, End-effector gripper)
 * - Additive Manufacturing (3D Printer) Cartesian Gantry & Build Platform
 * - IoT Gateway Telemetry Node with Radiating Antenna Wavefronts
 * - Multi-station Institutional Lab Bus connecting all workcells
 * - Right-dominant layout (x: 850-1420) ensuring left-side hero text is 100% crisp and readable
 */
export function FranchiseLabAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      {/* Soft Ambient Laboratory Lighting (Right-Dominant) */}
      <div className="absolute top-0 right-1/4 w-[520px] h-[360px] rounded-full bg-blue-600/10 blur-[90px]" />
      <div className="absolute -bottom-10 right-10 w-[460px] h-[300px] rounded-full bg-amber-500/10 blur-[85px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-60"
        viewBox="0 0 1440 440"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Institutional Engineering Blueprint Grid */}
          <pattern id="franchiseGrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#0B1528" strokeWidth="0.5" strokeOpacity="0.07" />
            <circle cx="24" cy="24" r="0.75" fill="#0090FF" fillOpacity="0.18" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#franchiseGrid)" />

        {/* ------------------------------------------------------------- */}
        {/* INTERCONNECTING INSTITUTIONAL LAB HIGHWAY (Peripheral top/right)*/}
        {/* ------------------------------------------------------------- */}
        <path
          d="M 60 70 L 680 70 L 740 130 L 1400 130"
          fill="none"
          stroke="#0090FF"
          strokeWidth="1.5"
          className="animate-pcb-trace"
        />
        <path
          d="M 680 82 L 735 137 L 1400 137"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="1.2"
          strokeOpacity="0.6"
        />

        {/* ------------------------------------------------------------- */}
        {/* WORKCELL 01: 6-AXIS INDUSTRIAL ROBOTIC ARM (x: 940, y: 240)    */}
        {/* ------------------------------------------------------------- */}
        <g transform="translate(950, 240)">
          {/* Workcell Bounding Stage Reticle */}
          <rect
            x="-140"
            y="-160"
            width="280"
            height="310"
            rx="12"
            fill="#050B14"
            fillOpacity="0.92"
            stroke="#1E3A8A"
            strokeWidth="1.5"
          />

          {/* Workcell Header Badge */}
          <rect x="-125" y="-146" width="120" height="20" rx="4" fill="#0B1528" stroke="#0090FF" strokeWidth="1" />
          <text x="-65" y="-132" textAnchor="middle" fill="#38BDF8" fontSize="8" fontFamily="monospace" fontWeight="bold">
            ROBOTICS CELL · 6-DOF
          </text>

          {/* Kinematic Reach Envelope Arc */}
          <path
            d="M -100 80 A 130 130 0 0 1 100 80"
            fill="none"
            stroke="#0090FF"
            strokeWidth="1"
            strokeDasharray="4 4"
            strokeOpacity="0.35"
          />

          {/* Heavy Turntable Base J1 */}
          <ellipse cx="0" cy="90" rx="60" ry="16" fill="#0B1528" stroke="#38BDF8" strokeWidth="1.75" />
          <ellipse cx="0" cy="85" rx="42" ry="10" fill="#070E1A" stroke="#0090FF" strokeWidth="1.2" />
          <circle cx="0" cy="85" r="5" fill="#F59E0B" />

          {/* Link 1: Shoulder Turret Column (Rotates around J1) */}
          <rect x="-18" y="30" width="36" height="55" rx="5" fill="#0F172A" stroke="#0284C7" strokeWidth="1.5" />
          
          {/* Joint 2: Shoulder Actuator Pivot */}
          <circle cx="0" cy="30" r="14" fill="#0B1528" stroke="#F59E0B" strokeWidth="2" />
          <circle cx="0" cy="30" r="5" fill="#FBBF24" />

          {/* Link 2: Primary Boom Arm */}
          <line x1="0" y1="30" x2="45" y2="-45" stroke="#38BDF8" strokeWidth="8" strokeLinecap="round" />
          <line x1="0" y1="30" x2="45" y2="-45" stroke="#0090FF" strokeWidth="3" strokeLinecap="round" />

          {/* Joint 3: Elbow Pivot Actuator */}
          <circle cx="45" cy="-45" r="12" fill="#0B1528" stroke="#10B981" strokeWidth="2" />
          <circle cx="45" cy="-45" r="4" fill="#34D399" />

          {/* Link 3: Forearm Arm */}
          <line x1="45" y1="-45" x2="10" y2="-100" stroke="#38BDF8" strokeWidth="6" strokeLinecap="round" />
          <line x1="45" y1="-45" x2="10" y2="-100" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />

          {/* Joint 4/5: Wrist Pitch/Roll */}
          <circle cx="10" cy="-100" r="8" fill="#0B1528" stroke="#38BDF8" strokeWidth="1.5" />

          {/* End-Effector Precision 2-Finger Gripper */}
          <path d="M 10 -100 L -5 -118 M 10 -100 L 25 -118" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="-5" cy="-118" r="3" fill="#38BDF8" />
          <circle cx="25" cy="-118" r="3" fill="#38BDF8" />
          {/* Target Payload Object */}
          <rect x="5" y="-128" width="10" height="10" rx="2" fill="#10B981" className="animate-chip-heartbeat" />

          {/* Telemetry Coordinate Readouts */}
          <text x="-120" y="132" fill="#64748B" fontSize="7.5" fontFamily="monospace">J1: 045.0° · J2: 078.2° · J3: -032.5°</text>
          <text x="120" y="132" textAnchor="end" fill="#10B981" fontSize="7.5" fontFamily="monospace" fontWeight="bold">STATUS: RUNNING</text>
        </g>

        {/* ------------------------------------------------------------- */}
        {/* WORKCELL 02: 3D PRINTER / ADDITIVE MANUFACTURING (x: 1250, y: 170) */}
        {/* ------------------------------------------------------------- */}
        <g transform="translate(1250, 160)">
          <rect
            x="-120"
            y="-100"
            width="240"
            height="210"
            rx="12"
            fill="#050B14"
            fillOpacity="0.92"
            stroke="#0284C7"
            strokeWidth="1.5"
          />

          {/* Workcell Header */}
          <rect x="-105" y="-88" width="130" height="18" rx="3" fill="#0B1528" stroke="#F59E0B" strokeWidth="1" />
          <text x="-40" y="-76" textAnchor="middle" fill="#FCD34D" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
            RAPID PROTOTYPE 3D
          </text>

          {/* Z-Axis Uprights & Gantry Rail */}
          <line x1="-80" y1="-55" x2="-80" y2="65" stroke="#334155" strokeWidth="4" />
          <line x1="80" y1="-55" x2="80" y2="65" stroke="#334155" strokeWidth="4" />

          {/* Heated Bed Platform */}
          <rect x="-85" y="65" width="170" height="12" rx="3" fill="#0B1528" stroke="#F59E0B" strokeWidth="1.2" />
          {/* Printed Part on Bed */}
          <path d="M -20 65 L -12 35 L 12 35 L 20 65 Z" fill="#0090FF" fillOpacity="0.4" stroke="#38BDF8" strokeWidth="1" />

          {/* X-Gantry Crossbar */}
          <line x1="-80" y1="20" x2="80" y2="20" stroke="#0284C7" strokeWidth="3" />

          {/* Extruder Hotend Carriage */}
          <rect x="-18" y="8" width="36" height="24" rx="4" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.2" />
          <polygon points="0,32 -6,38 6,38" fill="#F59E0B" />
          {/* Laser Height Alignment Beam */}
          <line x1="0" y1="38" x2="0" y2="48" stroke="#EF4444" strokeWidth="1.5" className="animate-pulse" />

          {/* Telemetry Status */}
          <text x="-105" y="95" fill="#38BDF8" fontSize="7.5" fontFamily="monospace">BED: 60°C · NOZZLE: 215°C</text>
          <text x="105" y="95" textAnchor="end" fill="#F59E0B" fontSize="7.5" fontFamily="monospace" fontWeight="bold">LAYER: 84%</text>
        </g>

        {/* ------------------------------------------------------------- */}
        {/* WORKCELL 03: IOT GATEWAY & TELEMETRY HUB (x: 1250, y: 345)     */}
        {/* ------------------------------------------------------------- */}
        <g transform="translate(1250, 345)">
          <rect
            x="-120"
            y="-45"
            width="240"
            height="85"
            rx="10"
            fill="#050B14"
            fillOpacity="0.92"
            stroke="#10B981"
            strokeWidth="1.5"
          />

          {/* Radiating Wireless Wavefronts */}
          <circle cx="80" cy="-5" r="16" fill="none" stroke="#10B981" strokeWidth="1" className="animate-radar-ring-1" />
          <circle cx="80" cy="-5" r="28" fill="none" stroke="#10B981" strokeWidth="0.8" className="animate-radar-ring-2" />
          <circle cx="80" cy="-5" r="4" fill="#34D399" />

          {/* Hub Status Info */}
          <text x="-100" y="-18" fill="#34D399" fontSize="8" fontFamily="monospace" fontWeight="bold">
            IOT EDGE GATEWAY HUB
          </text>
          <text x="-100" y="-3" fill="#64748B" fontSize="7" fontFamily="monospace">
            PROTOCOLS: MQTT · BLE 5.0 · LORAWAN
          </text>
          <text x="-100" y="15" fill="#38BDF8" fontSize="7" fontFamily="monospace">
            LINK: 42 NODES ONLINE · 0 LATENCY
          </text>
        </g>

        {/* Top Boundary Watermark */}
        <text x="80" y="48" fill="#64748B" fontSize="8" fontFamily="monospace">
          INSTITUTIONAL_LAB_SPEC: CENTER OF EXCELLENCE · ROBOTICS · EMBEDDED IOT · ADDITIVE FABRICATION
        </text>
      </svg>
    </div>
  );
}
