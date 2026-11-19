import React from 'react';

/**
 * ServicesPcbRoutingAnimation -> Clean Static Technical Grid
 * Ultra-fast, zero-overhead background grid for Engineering Services page.
 */
export function ServicesPcbRoutingAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute inset-0 bg-[radial-gradient(#0B1528_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.035]" />
    </div>
  );
}
