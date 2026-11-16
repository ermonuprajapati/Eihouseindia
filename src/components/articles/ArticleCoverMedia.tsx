'use client';

import React, { useState } from 'react';
import { Cpu } from 'lucide-react';

const DEFAULT_FALLBACK_IMAGES = [
  '/images/pcb-workbench.jpg',
  '/images/robotics-actuator.jpg',
  '/images/embedded-sensors.jpg',
  '/images/hero-semiconductor.jpg',
];

export function ArticleCoverMedia({
  src,
  alt,
  aspectClass = 'aspect-[4/3]',
}: {
  src?: string;
  alt: string;
  aspectClass?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = src && src.trim().length > 0 ? src : DEFAULT_FALLBACK_IMAGES[0];

  if (failed) {
    return (
      <div
        className={`${aspectClass} w-full rounded-md border border-slate-200 bg-gradient-to-br from-[#0B1528] to-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-300`}
      >
        <Cpu className="h-8 w-8 text-slate-400 mb-2" />
        <span className="text-xs font-medium text-slate-300 line-clamp-2 max-w-[220px]">{alt}</span>
      </div>
    );
  }

  return (
    <div className={`${aspectClass} w-full overflow-hidden rounded-md border border-slate-200 bg-slate-100`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedSrc}
        alt={alt}
        width={600}
        height={450}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        loading="lazy"
      />
    </div>
  );
}
