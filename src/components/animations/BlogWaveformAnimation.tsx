import React from 'react';

/**
 * BlogWaveformAnimation -> Clean Technical Accent
 * Ultra-fast, zero-overhead background grid for Articles and Blog headers.
 */
export function BlogWaveformAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.06]" />
    </div>
  );
}
