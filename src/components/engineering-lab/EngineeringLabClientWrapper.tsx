'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const EngineeringLabApp = dynamic(
  () => import('./EngineeringLabApp').then((mod) => mod.EngineeringLabApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#070D18] text-slate-300 font-mono">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        <div className="mt-4 text-sm font-semibold tracking-wider text-cyan-400">
          INITIALIZING UNIVERSAL ENGINEERING LAB...
        </div>
        <p className="mt-1 text-xs text-slate-500">Loading SPICE Simulation, 3D WebGL Studio &amp; PCB Engines</p>
      </div>
    ),
  }
);

export function EngineeringLabClientWrapper() {
  return <EngineeringLabApp />;
}
