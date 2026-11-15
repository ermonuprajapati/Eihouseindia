import React from 'react';

/**
 * ProjectsLaserMeshAnimation
 * Themed for Hardware Projects & Prototyping:
 * - Isometric 3D wireframe prototype box
 * - Sweeping vertical laser scanner / 3D printing slicing plane
 * - Coordinate calibration crosshairs
 */
export function ProjectsLaserMeshAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute top-10 right-1/4 w-[460px] h-[300px] rounded-full bg-cyan-500/10 blur-[85px]" />
      <div className="absolute -bottom-10 left-10 w-[380px] h-[250px] rounded-full bg-purple-500/10 blur-[80px]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-35"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Isometric 3D Wireframe Chassis (Center-Right) */}
        <g transform="translate(680, 110)">
          {/* Top Face */}
          <polygon points="0,-40 60,-10 0,20 -60,-10" fill="none" stroke="#06B6D4" strokeWidth="1.5" />
          {/* Left Face */}
          <polygon points="-60,-10 0,20 0,75 -60,45" fill="none" stroke="#0891B2" strokeWidth="1.2" />
          {/* Right Face */}
          <polygon points="0,20 60,-10 60,45 0,75" fill="none" stroke="#0891B2" strokeWidth="1.2" />
          
          {/* Internal Hidden Wireframe */}
          <line x1="0" y1="-40" x2="0" y2="20" stroke="#06B6D4" strokeWidth="1" strokeDasharray="3 3" />
          
          {/* Sweeping Slicing Plane / Laser Line */}
          <line x1="-75" y1="20" x2="75" y2="20" stroke="#A855F7" strokeWidth="2" className="animate-laser-scan" />
          
          <text x="0" y="95" textAnchor="middle" fill="#0891B2" fontSize="9" fontFamily="monospace">
            PROTO·3D // ISO-MESH
          </text>
        </g>

        {/* Prototype Grid Lines & Crosshairs */}
        <g transform="translate(180, 90)" opacity="0.6">
          <circle cx="0" cy="0" r="35" fill="none" stroke="#8B5CF6" strokeWidth="1" strokeDasharray="4 2" />
          <circle cx="0" cy="0" r="2" fill="#8B5CF6" />
          <line x1="-45" y1="0" x2="45" y2="0" stroke="#8B5CF6" strokeWidth="0.8" />
          <line x1="0" y1="-45" x2="0" y2="45" stroke="#8B5CF6" strokeWidth="0.8" />
          <text x="10" y="-12" fill="#7C3AED" fontSize="8" fontFamily="monospace">R&D LAB</text>
        </g>
      </svg>
    </div>
  );
}
