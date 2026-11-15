import React from 'react';

/**
 * CosmicSpaceHeroAnimation
 * Cosmic Deep-Space & Aerospace Engineering aura matching the exact EI House Logo colors:
 * - Electric Cyber Blue: #0090FF / #2563EB
 * - Solar Amber / Golden Flare: #FF8C00 / #F59E0B
 * - Deep Cosmic Space Void: #0B1528 / #050B14
 */
export function CosmicSpaceHeroAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      {/* 1. Deep Space Cosmic Void Gradient */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#0B1528]/3 to-[#050B14]/8" />

      {/* 2. Dual Logo-Color Cosmic Nebulae */}
      {/* Electric Cyber Blue Nebula (Left / Upper) */}
      <div className="absolute -top-20 -left-20 w-[550px] h-[450px] rounded-full bg-gradient-to-tr from-[#0090FF]/20 via-[#2563EB]/15 to-transparent blur-[90px] animate-nebula-blue" />
      
      {/* Solar Orange / Amber Stellar Nebula (Right / Lower) */}
      <div className="absolute top-10 -right-20 w-[600px] h-[500px] rounded-full bg-gradient-to-bl from-[#FF8C00]/20 via-[#F59E0B]/15 to-transparent blur-[95px] animate-nebula-amber" />

      {/* Central Horizon Fusion Glow (Connecting Blue & Solar Amber) */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[260px] bg-gradient-to-r from-[#0090FF]/10 via-[#F59E0B]/12 to-[#0090FF]/10 rounded-full blur-[80px] animate-pulse-glow" />

      {/* 3. Celestial Orbital Trajectory Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[780px] h-[780px] rounded-full border border-sky-400/15 animate-orbit-slow">
        {/* Orbital Satellite Node 1 (Cyber Blue) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <div className="h-3 w-3 rounded-full bg-[#0090FF] shadow-[0_0_12px_#0090FF]" />
          <div className="absolute h-6 w-6 rounded-full border border-[#0090FF]/50 animate-ping" />
        </div>
        {/* Orbital Node 2 (Solar Amber) */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
          <div className="h-2.5 w-2.5 rounded-full bg-[#FF8C00] shadow-[0_0_10px_#FF8C00]" />
        </div>
      </div>

      {/* Counter-Rotating Elliptical Orbit */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[980px] h-[520px] rounded-[50%] border border-amber-400/10 rotate-12 animate-orbit-reverse">
        {/* Orbit Node 3 (Solar Amber) */}
        <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2">
          <div className="h-3 w-3 rounded-full bg-[#F59E0B] shadow-[0_0_12px_#F59E0B]" />
        </div>
        {/* Orbit Node 4 (Cyan/Blue) */}
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-2 w-2 rounded-full bg-[#38BDF8] shadow-[0_0_8px_#38BDF8]" />
        </div>
      </div>

      {/* 4. Twinkling Stars & Constellation Points */}
      <svg
        className="absolute inset-0 h-full w-full opacity-60"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="starGlowBlue" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0090FF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0090FF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="starGlowAmber" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF8C00" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FF8C00" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Constellation Connector Lines */}
        <line x1="12%" y1="20%" x2="22%" y2="28%" stroke="#0090FF" strokeOpacity="0.18" strokeDasharray="3 3" />
        <line x1="22%" y1="28%" x2="35%" y2="18%" stroke="#0090FF" strokeOpacity="0.18" strokeDasharray="3 3" />
        <line x1="72%" y1="18%" x2="85%" y2="25%" stroke="#FF8C00" strokeOpacity="0.18" strokeDasharray="3 3" />
        <line x1="85%" y1="25%" x2="92%" y2="40%" stroke="#FF8C00" strokeOpacity="0.18" strokeDasharray="3 3" />

        {/* Stars Set A (Twinkling) */}
        <circle cx="12%" cy="20%" r="2.5" fill="#38BDF8" className="animate-star-twinkle" />
        <circle cx="22%" cy="28%" r="3" fill="#0090FF" className="animate-star-twinkle" />
        <circle cx="35%" cy="18%" r="2" fill="#60A5FA" className="animate-star-twinkle" />
        <circle cx="18%" cy="58%" r="2.5" fill="#38BDF8" className="animate-star-twinkle" />
        <circle cx="8%" cy="75%" r="2" fill="#0090FF" className="animate-star-twinkle" />

        {/* Stars Set B (Solar Amber / Delayed Twinkle) */}
        <circle cx="72%" cy="18%" r="3" fill="#F59E0B" className="animate-star-twinkle-delay" />
        <circle cx="85%" cy="25%" r="3.5" fill="#FF8C00" className="animate-star-twinkle-delay" />
        <circle cx="92%" cy="40%" r="2" fill="#FBBF24" className="animate-star-twinkle-delay" />
        <circle cx="80%" cy="65%" r="2.5" fill="#FF8C00" className="animate-star-twinkle-delay" />
        <circle cx="90%" cy="80%" r="2" fill="#F59E0B" className="animate-star-twinkle-delay" />

        {/* Subtle Micro-Stars */}
        <circle cx="48%" cy="12%" r="1.5" fill="#CBD5E1" opacity="0.5" />
        <circle cx="58%" cy="22%" r="1.5" fill="#CBD5E1" opacity="0.4" />
        <circle cx="40%" cy="70%" r="1.5" fill="#CBD5E1" opacity="0.5" />
        <circle cx="62%" cy="68%" r="1.5" fill="#CBD5E1" opacity="0.4" />
      </svg>
    </div>
  );
}
