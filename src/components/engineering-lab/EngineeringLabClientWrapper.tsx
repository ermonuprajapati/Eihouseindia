'use client';

import React, { Component, ErrorInfo, ReactNode, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class EngineeringLabErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
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
      localStorage.removeItem('ei_lab_workspace_layout_prefs');
      localStorage.removeItem('ei_lab_active_tab');
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
                The graphics engine or circuit workspace encountered an interruption (such as GPU driver reset, chunk loading failure, or canvas context loss).
              </p>
            </div>

            {this.state.errorMessage && (
              <div className="text-[11px] text-rose-300 bg-rose-950/30 border border-rose-900/50 rounded p-2.5 text-left break-words">
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

function LabLoadingFallback({ errorMessage }: { errorMessage?: string | null }) {
  const [tookLong, setTookLong] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTookLong(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleReload = () => {
    window.location.reload();
  };

  const handleReset = () => {
    try {
      localStorage.removeItem('ei_house_virtual3d_project');
      localStorage.removeItem('engineering_lab_current_project');
      localStorage.removeItem('ei_lab_workspace_layout_prefs');
      localStorage.removeItem('ei_lab_active_tab');
    } catch {
      // Ignore
    }
    window.location.reload();
  };

  return (
    <div className="flex h-screen h-[100dvh] w-full max-w-full flex-col items-center justify-center bg-[#070D18] text-slate-300 font-mono px-4 select-none">
      <div className="flex flex-col items-center max-w-md w-full text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        <div className="mt-4 text-sm font-semibold tracking-wider text-cyan-400">
          INITIALIZING UNIVERSAL ENGINEERING LAB...
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Loading SPICE Simulation, 3D WebGL Studio &amp; PCB Engines
        </p>

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-950/40 border border-rose-500/50 rounded-lg text-rose-300 text-xs text-left w-full break-words">
            <span className="font-bold text-rose-400">Initialization Error: </span>
            {errorMessage}
          </div>
        )}

        {tookLong && (
          <div className="mt-6 p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 text-xs text-amber-200/90 space-y-3 w-full animate-fade-in">
            <p>
              Loading is taking longer than expected. This can happen if network chunks were interrupted or browser cache is stale.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={handleReload}
                className="py-1.5 px-3 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer transition-colors"
              >
                Reload
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 text-xs cursor-pointer transition-colors"
              >
                Reset Cache
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const EngineeringLabApp = dynamic(
  () =>
    import('./EngineeringLabApp')
      .then((mod) => mod.EngineeringLabApp)
      .catch((err) => {
        console.error('Failed to dynamically load EngineeringLabApp bundle:', err);
        return function DynamicLoadError() {
          throw new Error(
            err?.message ||
              'Failed to download or initialize Engineering Lab modules. Please check your network and refresh.'
          );
        };
      }),
  {
    ssr: false,
    loading: () => <LabLoadingFallback />,
  }
);

export function EngineeringLabClientWrapper() {
  return (
    <EngineeringLabErrorBoundary>
      <EngineeringLabApp />
    </EngineeringLabErrorBoundary>
  );
}
