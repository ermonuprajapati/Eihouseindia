import React from 'react';

/**
 * SiliconCircuitMatrixAnimation -> Clean Static Blueprint Grid
 * Stripped of heavy GPU blurs, keyframe loops, and continuous SVG paths.
 * Renders an ultra-fast, zero-overhead technical dot-grid for the homepage hero.
 */
export function SiliconCircuitMatrixAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute inset-0 bg-[radial-gradient(#0B1528_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.035]" />
    </div>
  );
}
