'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Full-screen applications like engineering lab manage their own top bars and fill the entire viewport
  const isFullScreenApp = pathname?.startsWith('/engineering-lab');

  return (
    <div
      className={
        isFullScreenApp
          ? 'fixed inset-0 h-screen h-[100dvh] w-full max-w-full overflow-hidden flex flex-col bg-[#070D18] select-none z-50'
          : 'pt-16 min-h-screen flex flex-col'
      }
    >
      {children}
    </div>
  );
}
