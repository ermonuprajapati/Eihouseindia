'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class EngineeringLabErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || 'Unknown WebGL or CAD render error' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Engineering Lab workspace caught error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  handleResetCircuit = () => {
    try {
      localStorage.removeItem('ei_house_virtual3d_project');
      localStorage.removeItem('engineering_lab_current_project');
    } catch {
      // Ignore
    }
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen h-[100dvh] w-full max-w-full flex-col items-center justify-center bg-[#070D18] text-slate-200 font-mono px-4 select-none">
          <div className="max-w-md w-full rounded-2xl border border-rose-500/40 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-400 text-2xl font-bold">
              ⚡
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-bold text-white tracking-wider uppercase">
                Engineering Lab Recovery
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                The graphics engine or circuit workspace encountered an interruption (such as GPU driver reset or canvas context loss).
              </p>
            </div>

            {this.state.errorMessage && (
              <div className="text-[11px] text-rose-300 bg-rose-950/30 border border-rose-900/50 rounded p-2 text-left truncate">
                {this.state.errorMessage}
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-cyan-900/20"
              >
                Reload Workspace
              </button>
              <button
                type="button"
                onClick={this.handleResetCircuit}
                className="w-full py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer border border-slate-700"
              >
                Reset to Clean Breadboard
              </button>
              <Link
                href="/"
                className="w-full py-2 px-4 rounded-lg text-slate-500 hover:text-slate-300 text-xs transition-colors inline-block"
              >
                Return to Homepage
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const EngineeringLabApp = dynamic(
  () => import('./EngineeringLabApp').then((mod) => mod.EngineeringLabApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen h-[100dvh] w-full max-w-full flex-col items-center justify-center bg-[#070D18] text-slate-300 font-mono">
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
  return (
    <EngineeringLabErrorBoundary>
      <EngineeringLabApp />
    </EngineeringLabErrorBoundary>
  );
}
