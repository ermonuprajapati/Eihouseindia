'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

interface PillarNode {
  id: string;
  short: string;
  theme: 'cyan' | 'gold';
  posClass: string;
  href: string;
  labelTop: string;
  labelBottom: string;
  icon: React.ReactNode;
}

const PILLARS: PillarNode[] = [
  {
    id: 'projects',
    short: 'PROJECTS',
    theme: 'cyan',
    posClass: 'pos-1',
    href: '/projects',
    labelTop: 'Projects &',
    labelBottom: 'Prototypes',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 12 12 17 22 12" />
        <polyline points="2 17 12 22 22 17" />
      </svg>
    ),
  },
  {
    id: 'store',
    short: 'STORE',
    theme: 'gold',
    posClass: 'pos-2',
    href: '/products',
    labelTop: 'Store &',
    labelBottom: 'Hardware',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    id: 'tools',
    short: 'TOOLS',
    theme: 'cyan',
    posClass: 'pos-3',
    href: '/tools',
    labelTop: 'Tools &',
    labelBottom: 'Calculators',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="11" x2="8.01" y2="11" />
        <line x1="12" y1="11" x2="12.01" y2="11" />
        <line x1="16" y1="11" x2="16.01" y2="11" />
        <line x1="8" y1="16" x2="8.01" y2="16" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
        <line x1="16" y1="16" x2="16.01" y2="16" />
      </svg>
    ),
  },
  {
    id: 'library',
    short: 'LIBRARY',
    theme: 'gold',
    posClass: 'pos-4',
    href: '/library',
    labelTop: 'Library &',
    labelBottom: 'Specs',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
  {
    id: 'services',
    short: 'R&D',
    theme: 'cyan',
    posClass: 'pos-5',
    href: '/services',
    labelTop: 'R&D &',
    labelBottom: 'Services',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    id: 'community',
    short: 'COMMUNITY',
    theme: 'gold',
    posClass: 'pos-6',
    href: '/community',
    labelTop: 'Community',
    labelBottom: 'Network',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'engineering-lab',
    short: 'LABS',
    theme: 'cyan',
    posClass: 'pos-7',
    href: '/engineering-lab',
    labelTop: 'Innovation',
    labelBottom: 'Labs',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="6" width="12" height="12" rx="2" />
        <rect x="9.5" y="9.5" width="5" height="5" />
        <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
      </svg>
    ),
  },
  {
    id: 'learn',
    short: 'LEARN',
    theme: 'gold',
    posClass: 'pos-8',
    href: '/learn',
    labelTop: 'Learn &',
    labelBottom: 'Training',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  },
];

export function CoreEcosystemHub() {
  const [activeIndex, setActiveIndex] = useState(7); // Default to "Learn & Training"
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopAutoCycle = useCallback(() => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  const startAutoCycle = useCallback(() => {
    stopAutoCycle();
    autoTimerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % PILLARS.length);
    }, 2800);
  }, [stopAutoCycle]);

  useEffect(() => {
    startAutoCycle();
    return () => stopAutoCycle();
  }, [startAutoCycle, stopAutoCycle]);

  const activePillar = PILLARS[activeIndex];

  return (
    <div className="w-full max-w-5xl mx-auto px-1 sm:px-0">
      <style>{`
        /* 16:10 RESPONSIVE HUB CONTAINER */
        .eih-hub-stage {
          position: relative;
          width: 100%;
          max-width: 1120px;
          aspect-ratio: 16 / 10;
          container-type: inline-size;
          overflow: hidden;
          border-radius: max(16px, 1.5cqw);
          background-color: #050a14;
          background-image:
            radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.12) 0%, rgba(5, 10, 20, 0) 58%),
            radial-gradient(rgba(56, 189, 248, 0.22) 1px, transparent 1px),
            linear-gradient(rgba(56, 189, 248, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56, 189, 248, 0.04) 1px, transparent 1px);
          background-size: 100% 100%, 3.2cqw 3.2cqw, 6.4cqw 6.4cqw, 6.4cqw 6.4cqw;
          border: 1px solid rgba(56, 189, 248, 0.22);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55), inset 0 0 24px rgba(3, 7, 18, 0.7);
          user-select: none;
        }

        /* SVG Orbital Rings & Radial Spokes */
        .eih-hub-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .ring-cw-slow {
          transform-origin: 800px 500px;
          animation: eihSpinCW 48s linear infinite;
        }

        .ring-ccw-med {
          transform-origin: 800px 500px;
          animation: eihSpinCCW 32s linear infinite;
        }

        .ring-cw-fast {
          transform-origin: 800px 500px;
          animation: eihSpinCW 22s linear infinite;
        }

        @keyframes eihSpinCW {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        @keyframes eihSpinCCW {
          from { transform: rotate(360deg); }
          to   { transform: rotate(0deg); }
        }

        /* Animated Light Pulses Traveling Along Spokes */
        .spoke-pulse {
          stroke-dasharray: 42 420;
          stroke-linecap: round;
          animation: eihPulseFlow 3.6s linear infinite;
        }

        .spoke-pulse.delay-1 { animation-delay: -0.9s; }
        .spoke-pulse.delay-2 { animation-delay: -1.8s; }
        .spoke-pulse.delay-3 { animation-delay: -2.7s; }

        @keyframes eihPulseFlow {
          from { stroke-dashoffset: 462; }
          to   { stroke-dashoffset: 0; }
        }

        /* CENTER CORE HUB */
        .eih-core {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 21.5cqw;
          height: 21.5cqw;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 38%, #0f223a 0%, #071120 68%, #040913 100%);
          border: 1.5px solid rgba(56, 189, 248, 0.55);
          box-shadow:
            0 0 3.2cqw rgba(34, 211, 238, 0.28),
            inset 0 0 2.4cqw rgba(34, 211, 238, 0.16);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          z-index: 5;
          transition: box-shadow 0.35s ease, border-color 0.35s ease;
        }

        .eih-core.gold-glow {
          border-color: rgba(251, 191, 36, 0.6);
          box-shadow:
            0 0 3.4cqw rgba(245, 158, 11, 0.28),
            inset 0 0 2.4cqw rgba(245, 158, 11, 0.15);
        }

        .eih-core-eyebrow {
          font-size: max(7.5px, 1.15cqw);
          font-weight: 700;
          letter-spacing: 0.24em;
          color: #f59e0b;
          margin-bottom: 0.7cqw;
        }

        .eih-core-title {
          font-size: max(13px, 2.35cqw);
          font-weight: 800;
          letter-spacing: 0.04em;
          color: #ffffff;
          line-height: 1.1;
        }

        .eih-core-active {
          margin-top: 0.9cqw;
          font-size: max(8px, 1.15cqw);
          font-weight: 700;
          letter-spacing: 0.14em;
          color: #38bdf8;
          text-transform: uppercase;
          transition: color 0.25s ease;
        }

        .eih-core.gold-glow .eih-core-active {
          color: #fbbf24;
        }

        /* 8 PILLAR CARDS */
        .eih-card {
          position: absolute;
          transform: translate(-50%, -50%);
          width: 17cqw;
          padding: 1.55cqw 1.2cqw;
          border-radius: max(8px, 1.25cqw);
          background: rgba(6, 13, 26, 0.92);
          border: 1px solid rgba(56, 189, 248, 0.24);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 0.8cqw;
          z-index: 4;
          cursor: pointer;
          text-decoration: none;
          transition:
            transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
            border-color 0.28s ease,
            box-shadow 0.28s ease,
            background 0.28s ease;
        }

        .eih-card.gold {
          border-color: rgba(245, 158, 11, 0.26);
        }

        .eih-card-icon {
          width: max(20px, 3.4cqw);
          height: max(20px, 3.4cqw);
          border-radius: max(5px, 0.85cqw);
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(14, 165, 233, 0.14);
          color: #38bdf8;
          transition: background 0.28s ease, transform 0.28s ease;
        }

        .eih-card.gold .eih-card-icon {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
        }

        .eih-card-icon svg {
          width: max(12px, 1.85cqw);
          height: max(12px, 1.85cqw);
          stroke-width: 1.9;
        }

        .eih-card-label {
          font-size: max(8.5px, 1.38cqw);
          font-weight: 700;
          line-height: 1.25;
          color: #f1f5f9;
          letter-spacing: 0.01em;
        }

        /* Active & Hover States */
        .eih-card.cyan:hover,
        .eih-card.cyan.is-active {
          background: linear-gradient(180deg, rgba(12, 34, 56, 0.96) 0%, rgba(6, 16, 30, 0.96) 100%);
          border-color: rgba(56, 189, 248, 0.88);
          box-shadow:
            0 0 2.6cqw rgba(56, 189, 248, 0.38),
            inset 0 0 1.4cqw rgba(56, 189, 248, 0.14);
          transform: translate(-50%, -50%) scale(1.045);
          z-index: 6;
        }

        .eih-card.gold:hover,
        .eih-card.gold.is-active {
          background: linear-gradient(180deg, rgba(46, 32, 12, 0.94) 0%, rgba(22, 16, 9, 0.96) 100%);
          border-color: rgba(251, 191, 36, 0.92);
          box-shadow:
            0 0 2.8cqw rgba(245, 158, 11, 0.42),
            inset 0 0 1.4cqw rgba(251, 191, 36, 0.16);
          transform: translate(-50%, -50%) scale(1.045);
          z-index: 6;
        }

        /* Exact 8 Orbital Positions (Locked to SVG 1600x1000 Coordinates) */
        .pos-1 { left: 50%;     top: 13.5%; } /* Projects & Prototypes */
        .pos-2 { left: 70.6%;   top: 24.2%; } /* Store & Hardware */
        .pos-3 { left: 79.5%;   top: 50%;   } /* Tools & Calculators */
        .pos-4 { left: 70.6%;   top: 75.8%; } /* Library & Specs */
        .pos-5 { left: 50%;     top: 86.5%; } /* R&D & Services */
        .pos-6 { left: 29.4%;   top: 75.8%; } /* Community Network */
        .pos-7 { left: 20.5%;   top: 50%;   } /* Innovation Labs */
        .pos-8 { left: 29.4%;   top: 24.2%; } /* Learn & Training */

        @media (prefers-reduced-motion: reduce) {
          .ring-cw-slow, .ring-ccw-med, .ring-cw-fast, .spoke-pulse {
            animation: none;
          }
        }
      `}</style>

      <div
        className="eih-hub-stage"
        onMouseLeave={startAutoCycle}
        role="region"
        aria-label="EI House Core Ecosystem Hub"
      >
        {/* Vector Orbital Rings + Radial Spokes */}
        <svg
          className="eih-hub-svg"
          viewBox="0 0 1600 1000"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Outer Subtle Dotted Orbit */}
          <circle
            cx="800"
            cy="500"
            r="355"
            stroke="#38BDF8"
            strokeOpacity="0.16"
            strokeWidth="1.5"
            strokeDasharray="4 14"
            className="ring-cw-slow"
          />

          {/* Mid Cyan Segmented Orbit */}
          <circle
            cx="800"
            cy="500"
            r="295"
            stroke="#22D3EE"
            strokeOpacity="0.28"
            strokeWidth="2"
            strokeDasharray="70 36 18 28 110 40"
            className="ring-ccw-med"
          />

          {/* Mid Gold Dashed Orbit */}
          <circle
            cx="800"
            cy="500"
            r="252"
            stroke="#F59E0B"
            strokeOpacity="0.34"
            strokeWidth="2"
            strokeDasharray="45 25 14 20 85 32"
            className="ring-cw-fast"
          />

          {/* Inner Cyan Fine Orbit */}
          <circle
            cx="800"
            cy="500"
            r="212"
            stroke="#38BDF8"
            strokeOpacity="0.32"
            strokeWidth="1.5"
            strokeDasharray="16 14"
            className="ring-ccw-med"
          />

          {/* Static Base Spokes (Center to 8 Nodes) */}
          <g strokeWidth="2" strokeOpacity="0.28">
            <line x1="800" y1="500" x2="800" y2="135" stroke="#38BDF8" />
            <line x1="800" y1="500" x2="1130" y2="242" stroke="#F59E0B" />
            <line x1="800" y1="500" x2="1272" y2="500" stroke="#38BDF8" />
            <line x1="800" y1="500" x2="1130" y2="758" stroke="#F59E0B" />
            <line x1="800" y1="500" x2="800" y2="865" stroke="#38BDF8" />
            <line x1="800" y1="500" x2="470" y2="758" stroke="#F59E0B" />
            <line x1="800" y1="500" x2="328" y2="500" stroke="#38BDF8" />
            <line x1="800" y1="500" x2="470" y2="242" stroke="#F59E0B" />
          </g>

          {/* Animated Glowing Data Pulses Along Spokes */}
          <g strokeWidth="3.2">
            <line x1="800" y1="500" x2="800" y2="135" stroke="#38BDF8" className="spoke-pulse" />
            <line x1="800" y1="500" x2="1130" y2="242" stroke="#FBBF24" className="spoke-pulse delay-1" />
            <line x1="800" y1="500" x2="1272" y2="500" stroke="#38BDF8" className="spoke-pulse delay-2" />
            <line x1="800" y1="500" x2="1130" y2="758" stroke="#FBBF24" className="spoke-pulse delay-3" />
            <line x1="800" y1="500" x2="800" y2="865" stroke="#38BDF8" className="spoke-pulse delay-1" />
            <line x1="800" y1="500" x2="470" y2="758" stroke="#FBBF24" className="spoke-pulse delay-2" />
            <line x1="800" y1="500" x2="328" y2="500" stroke="#38BDF8" className="spoke-pulse delay-3" />
            <line x1="800" y1="500" x2="470" y2="242" stroke="#FBBF24" className="spoke-pulse" />
          </g>
        </svg>

        {/* Center Core Hub */}
        <div
          className={`eih-core ${activePillar.theme === 'gold' ? 'gold-glow' : ''}`}
          aria-live="polite"
        >
          <span className="eih-core-eyebrow">CORE HUB</span>
          <span className="eih-core-title">EI HOUSE</span>
          <span className="eih-core-active">{activePillar.short}</span>
        </div>

        {/* 8 Orbital Pillar Cards */}
        {PILLARS.map((pillar, idx) => {
          const isActive = idx === activeIndex;
          return (
            <Link
              key={pillar.id}
              href={pillar.href}
              prefetch={false}
              className={`eih-card ${pillar.theme} ${pillar.posClass} ${isActive ? 'is-active' : ''}`}
              onMouseEnter={() => {
                stopAutoCycle();
                setActiveIndex(idx);
              }}
              onFocus={() => {
                stopAutoCycle();
                setActiveIndex(idx);
              }}
            >
              <div className="eih-card-icon" aria-hidden="true">
                {pillar.icon}
              </div>
              <span className="eih-card-label">
                {pillar.labelTop}
                <br />
                {pillar.labelBottom}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
