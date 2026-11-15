import Image from 'next/image';

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#0B1528] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Background glowing tech radial blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#172D4D]/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#F59E0B]/10 rounded-full blur-2xl pointer-events-none" />

      {/* Center Branding & Animated Engineering Loader */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-md mx-auto">
        {/* Pulsing Emblem with Orbiting Ring */}
        <div className="relative flex items-center justify-center">
          {/* Outer Pulsing Glow Ring */}
          <div className="absolute -inset-4 rounded-full border border-amber-400/20 animate-ping opacity-30" />
          <div className="absolute -inset-2 rounded-full border-2 border-dashed border-[#F59E0B]/40 animate-spin [animation-duration:8s]" />

          {/* Logo Tile */}
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#172D4D] to-[#0B1528] border-2 border-[#F59E0B]/60 p-3 shadow-2xl flex items-center justify-center relative overflow-hidden backdrop-blur-md">
            <Image
              src="/images/logo.png"
              alt="EI House India"
              width={56}
              height={56}
              className="object-contain drop-shadow"
              priority
            />
            {/* Shimmer sweep */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
          </div>
        </div>

        {/* Wordmark & Tagline */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-amber-300 font-mono tracking-wider uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Connecting Innovation Lab</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            EI HOUSE <span className="text-[#F59E0B]">INDIA</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            Where Ideas Become Things · Engineering Ecosystem
          </p>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-64 space-y-2 pt-2">
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
            <div className="h-full bg-gradient-to-r from-[#F59E0B] via-amber-300 to-[#F59E0B] rounded-full w-1/2 animate-[progress_1.6s_ease-in-out_infinite]" />
          </div>
          <p className="text-[11px] font-mono text-slate-400 tracking-wide">
            Loading Engineering Hardware &amp; Tools...
          </p>
        </div>

        {/* Subtle Disciplines Ticker */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[10px] text-slate-400">
          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">Embedded &amp; IoT</span>
          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">Mechanical CAD</span>
          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">Robotics</span>
          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">3D Printing</span>
        </div>
      </div>
    </div>
  );
}
