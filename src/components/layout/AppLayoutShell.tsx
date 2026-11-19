'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Full-screen applications like engineering lab manage their own top bars
  const isFullScreenApp = pathname?.startsWith('/engineering-lab');

  return (
    <div className={isFullScreenApp ? 'min-h-screen' : 'pt-16 min-h-screen flex flex-col'}>
      {children}
    </div>
  );
}
