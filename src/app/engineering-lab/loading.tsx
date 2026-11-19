import React from 'react';

export default function EngineeringLabLoading() {
  return (
    <div className="flex h-screen h-[100dvh] w-full max-w-full flex-col items-center justify-center bg-[#070D18] text-slate-300 font-mono select-none">
      <div className="relative flex items-center justify-center h-16 w-16 mb-4">
        <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-ping" />
        <div className="h-12 w-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
      </div>

      <div className="flex items-center gap-2 text-cyan-400 font-bold tracking-wider text-sm uppercase">
        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
        <span>Initializing Universal Engineering Lab</span>
      </div>

      <p className="mt-2 text-xs text-slate-500 max-w-md text-center leading-relaxed">
        Mounting SPICE MNA Solver, Procedural Three.js 3D Breadboard &amp; Interactive PCB CAD Engines...
      </p>

      <div className="w-56 h-1 bg-slate-800 rounded-full overflow-hidden mt-5">
        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full w-2/3 animate-pulse" />
      </div>
    </div>
  );
}
