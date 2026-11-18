'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  EngineeringProject,
  WorkspaceMode,
  CircuitComponent,
  CircuitWire,
  GuidedExperiment,
  SimulationWaveformPoint,
} from '@/modules/engineering-lab/types';
import { TEMPLATE_555_ASTABLE } from '@/modules/engineering-lab/templates/starter-templates';
import { CircuitSolver, SolverStepResult } from '@/modules/engineering-lab/circuit-engine/circuit-solver';
import { VirtualMcuRuntime } from '@/modules/engineering-lab/embedded-engine/virtual-mcu-runtime';
import { PcbGenerator } from '@/modules/engineering-lab/pcb-engine/pcb-generator';

import { LabHeader } from './Header/LabHeader';
import { SchematicCanvas } from './Canvas/SchematicCanvas';
import { ComponentBrowser } from './Panels/ComponentBrowser';
import { PropertiesInspector } from './Panels/PropertiesInspector';
import { LabStatusBar } from './StatusBar/LabStatusBar';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

// DYNAMIC LAZY-LOADING OF HEAVY MODULES FOR SECTION 12 PERFORMANCE OPTIMIZATION
const PcbView = dynamic(
  () => import('./Panels/PcbView').then((m) => m.PcbView),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#070D18] text-slate-400 font-mono text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-emerald-400" />
        Initializing 2D/3D PCB CAD Engine...
      </div>
    ),
  }
);

const FirmwareEditor = dynamic(
  () => import('./Panels/FirmwareEditor').then((m) => m.FirmwareEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#070D18] text-slate-400 font-mono text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-purple-400" />
        Loading Firmware Development Environment & Toolchain...
      </div>
    ),
  }
);

const InstrumentPanel = dynamic(
  () => import('./Panels/InstrumentPanel').then((m) => m.InstrumentPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#070D18] text-slate-400 font-mono text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-sky-400" />
        Loading Virtual Instruments Bench...
      </div>
    ),
  }
);

const CalculatorsPanel = dynamic(
  () => import('./Panels/CalculatorsPanel').then((m) => m.CalculatorsPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#070D18] text-slate-400 font-mono text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-amber-400" />
        Loading Engineering Calculators...
      </div>
    ),
  }
);

const Virtual3dStudio = dynamic(
  () => import('./Panels/Virtual3dStudio').then((m) => m.Virtual3dStudio),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#060B14] text-slate-400 font-mono text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-emerald-400" />
        Launching 3D Virtual Electronics Studio...
      </div>
    ),
  }
);

const LabExperimentsModal = dynamic(
  () => import('./Panels/LabExperimentsModal').then((m) => m.LabExperimentsModal),
  { ssr: false }
);

export function EngineeringLabApp() {
  // Project State
  const [project, setProject] = useState<EngineeringProject>(TEMPLATE_555_ASTABLE);
  const [activeMode, setActiveMode] = useState<WorkspaceMode>('schematic');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState<EngineeringProject[]>([]);
  const [redoStack, setRedoStack] = useState<EngineeringProject[]>([]);

  // Selection
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);

  // SECTION 11: WORKSPACE PERSISTENCE & LAYOUT PREFERENCES
  const [isBrowserOpen, setIsBrowserOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [browserWidth, setBrowserWidth] = useState(288);
  const [inspectorWidth, setInspectorWidth] = useState(320);
  const [isExperimentsModalOpen, setIsExperimentsModalOpen] = useState(false);

  // Load layout preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ei_lab_workspace_layout_prefs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.isBrowserOpen === 'boolean') setIsBrowserOpen(parsed.isBrowserOpen);
        if (typeof parsed.isInspectorOpen === 'boolean') setIsInspectorOpen(parsed.isInspectorOpen);
        if (typeof parsed.browserWidth === 'number' && parsed.browserWidth >= 200) setBrowserWidth(parsed.browserWidth);
        if (typeof parsed.inspectorWidth === 'number' && parsed.inspectorWidth >= 200) setInspectorWidth(parsed.inspectorWidth);
      }
    } catch {}
  }, []);

  // Save layout preferences on change
  useEffect(() => {
    try {
      localStorage.setItem(
        'ei_lab_workspace_layout_prefs',
        JSON.stringify({ isBrowserOpen, isInspectorOpen, browserWidth, inspectorWidth })
      );
    } catch {}
  }, [isBrowserOpen, isInspectorOpen, browserWidth, inspectorWidth]);

  // Reset workspace layout
  const handleResetLayout = () => {
    setIsBrowserOpen(true);
    setIsInspectorOpen(true);
    setBrowserWidth(288);
    setInspectorWidth(320);
    try {
      localStorage.removeItem('ei_lab_workspace_layout_prefs');
    } catch {}
    toast.success('Workspace layout reset to defaults');
  };

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(true);
  const [simTime, setSimTime] = useState(0);
  const [simStates, setSimStates] = useState<Record<string, { voltage: number; current: number; on?: boolean }>>({});
  const [wireCurrents, setWireCurrents] = useState<Record<string, number>>({});
  const [waveformData, setWaveformData] = useState<Record<string, SimulationWaveformPoint[]>>({});

  // Firmware & MCU State
  const [isFlashing, setIsFlashing] = useState(false);

  // Engines
  const solverRef = useRef<CircuitSolver>(new CircuitSolver());
  const mcuRef = useRef<VirtualMcuRuntime>(new VirtualMcuRuntime());

  // Save current project state to Undo stack before changes
  const recordHistory = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-20), JSON.parse(JSON.stringify(project))]);
    setRedoStack([]);
    setHasUnsavedChanges(true);
  }, [project]);

  // Undo action
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, JSON.parse(JSON.stringify(project))]);
    setProject(previous);
  };

  // Redo action
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(project))]);
    setProject(next);
  };

  // ----------------------------------------------------------------
  // SECTION 12: DECOUPLED & THROTTLED SIMULATION LOOP
  // ----------------------------------------------------------------
  useEffect(() => {
    let animId: number;
    let lastUiUpdate = Date.now();

    const loop = () => {
      if (isSimulating && typeof document !== 'undefined' && document.visibilityState !== 'hidden') {
        // Step Circuit MNA Solver
        const solver = solverRef.current;
        const result: SolverStepResult = solver.step(project.components, project.wires, 0.001, 1.0);

        const now = Date.now();
        // Throttle UI commits to ~30 FPS to prevent memory churn and high CPU usage
        if (now - lastUiUpdate >= 33) {
          lastUiUpdate = now;
          setSimStates(result.componentStates);
          setWireCurrents(result.wireCurrents || {});
          setWaveformData(result.waveformData);
          setSimTime((t) => t + 0.033);
        }

        // Execute MCU slice if MCU is running
        if (project.firmware.isRunning) {
          const sonarComp = project.components.find((c) => c.type === 'SENSOR_ULTRASONIC');
          const dhtComp = project.components.find((c) => c.type === 'SENSOR_DHT11');
          const ldrComp = project.components.find((c) => c.type === 'SENSOR_LDR');

          const mcuRes = mcuRef.current.executeCycle(project.firmware, {
            distanceCm: Number(sonarComp?.parameters?.distanceCm ?? 45.0),
            temperatureC: Number(dhtComp?.parameters?.temperatureC ?? 24.0),
            humidityPercent: Number(dhtComp?.parameters?.humidityPercent ?? 45.0),
            lightLux: Number(ldrComp?.parameters?.lightLux ?? 350.0),
          });
          if (mcuRes.serialLines.length > 0) {
            setProject((prev) => ({
              ...prev,
              firmware: {
                ...prev.firmware,
                serialLog: [...prev.firmware.serialLog, ...mcuRes.serialLines].slice(-100),
                gpioStates: mcuRes.gpioUpdates,
              },
            }));
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isSimulating, project.components, project.wires, project.firmware]);

  // Sync PCB whenever components or wires change
  useEffect(() => {
    const updatedPcb = PcbGenerator.generatePcbFromSchematic(project.components, project.wires);
    setProject((prev) => ({ ...prev, pcb: updatedPcb }));
  }, [project.components, project.wires]);

  // ----------------------------------------------------------------
  // Component Actions
  // ----------------------------------------------------------------
  const handleAddComponent = (newComp: CircuitComponent) => {
    recordHistory();
    setProject((prev) => ({
      ...prev,
      components: [...prev.components, newComp],
    }));
    setSelectedCompId(newComp.id);
    toast.success(`Added ${newComp.label}`);
  };

  const handleUpdateComponent = (updated: CircuitComponent) => {
    recordHistory();
    setProject((prev) => ({
      ...prev,
      components: prev.components.map((c) => (c.id === updated.id ? updated : c)),
    }));
  };

  const handleUpdateComponentPosition = (id: string, x: number, y: number) => {
    setProject((prev) => ({
      ...prev,
      components: prev.components.map((c) => (c.id === id ? { ...c, x, y } : c)),
    }));
  };

  const handleRotateComponent = (id: string) => {
    recordHistory();
    setProject((prev) => ({
      ...prev,
      components: prev.components.map((c) => {
        if (c.id !== id) return c;
        const nextRot = ((c.rotation + 90) % 360) as 0 | 90 | 180 | 270;
        return { ...c, rotation: nextRot };
      }),
    }));
  };

  const handleMirrorComponent = (id: string) => {
    recordHistory();
    setProject((prev) => ({
      ...prev,
      components: prev.components.map((c) => {
        if (c.id !== id) return c;
        return { ...c, mirrored: !c.mirrored };
      }),
    }));
  };

  const handleDeleteComponent = (id: string) => {
    recordHistory();
    setProject((prev) => ({
      ...prev,
      components: prev.components.filter((c) => c.id !== id),
      wires: prev.wires.filter((w) => w.fromCompId !== id && w.toCompId !== id),
    }));
    if (selectedCompId === id) setSelectedCompId(null);
    toast.info('Component deleted');
  };

  // Component Clipboard state for Copy/Paste & Duplicate
  const [componentClipboard, setComponentClipboard] = useState<CircuitComponent | null>(null);

  const handleDuplicateComponent = (id: string) => {
    const target = project.components.find((c) => c.id === id);
    if (!target) return;
    recordHistory();
    const prefix = (target.designator || 'COMP1').replace(/[0-9]/g, '') || 'COMP';
    const samePrefixCount = project.components.filter((c) => (c.designator || '').startsWith(prefix)).length;
    const newDesignator = `${prefix}${samePrefixCount + 1}`;
    const newComp: CircuitComponent = {
      ...JSON.parse(JSON.stringify(target)),
      id: `c_${Math.random().toString(36).substring(2, 9)}`,
      designator: newDesignator,
      label: newDesignator,
      x: target.x + 30,
      y: target.y + 30,
    };
    setProject((prev) => ({
      ...prev,
      components: [...prev.components, newComp],
    }));
    setSelectedCompId(newComp.id);
    toast.success(`Duplicated ${target.designator || 'Component'} as ${newDesignator}`);
  };

  const handleCopyComponent = (id: string) => {
    const target = project.components.find((c) => c.id === id);
    if (!target) return;
    setComponentClipboard(JSON.parse(JSON.stringify(target)));
    toast.info(`Copied ${target.designator || 'Component'} to clipboard`);
  };

  const handlePasteComponent = (atX?: number, atY?: number) => {
    if (!componentClipboard) {
      toast.error('Clipboard is empty. Select a component and press Ctrl+C first.');
      return;
    }
    recordHistory();
    const prefix = (componentClipboard.designator || 'COMP1').replace(/[0-9]/g, '') || 'COMP';
    const samePrefixCount = project.components.filter((c) => (c.designator || '').startsWith(prefix)).length;
    const newDesignator = `${prefix}${samePrefixCount + 1}`;
    const newComp: CircuitComponent = {
      ...JSON.parse(JSON.stringify(componentClipboard)),
      id: `c_${Math.random().toString(36).substring(2, 9)}`,
      designator: newDesignator,
      label: newDesignator,
      x: typeof atX === 'number' ? Math.round(atX / 10) * 10 : componentClipboard.x + 40,
      y: typeof atY === 'number' ? Math.round(atY / 10) * 10 : componentClipboard.y + 40,
    };
    setProject((prev) => ({
      ...prev,
      components: [...prev.components, newComp],
    }));
    setSelectedCompId(newComp.id);
    toast.success(`Pasted ${newDesignator}`);
  };

  // ----------------------------------------------------------------
  // Wire Actions
  // ----------------------------------------------------------------
  const handleAddWire = (wire: Omit<CircuitWire, 'id'>) => {
    recordHistory();
    const newWire: CircuitWire = {
      ...wire,
      id: `w_${Math.random().toString(36).substring(2, 9)}`,
    };
    setProject((prev) => ({
      ...prev,
      wires: [...prev.wires, newWire],
    }));
  };

  const handleDeleteWire = (wireId: string) => {
    recordHistory();
    setProject((prev) => ({
      ...prev,
      wires: prev.wires.filter((w) => w.id !== wireId),
    }));
    toast.info('Wire disconnected');
  };

  // ----------------------------------------------------------------
  // Project & File Operations
  // ----------------------------------------------------------------
  const handleSaveProject = () => {
    try {
      localStorage.setItem(`ei_lab_${project.id}`, JSON.stringify(project));
      setHasUnsavedChanges(false);
      toast.success('Project saved successfully to local storage.');
    } catch {
      toast.error('Failed to save project locally.');
    }
  };

  const handleLoadProjectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const loaded: EngineeringProject = JSON.parse(event.target?.result as string);
        if (loaded.components && loaded.wires) {
          setProject(loaded);
          setSelectedCompId(null);
          solverRef.current.reset();
          setHasUnsavedChanges(false);
          toast.success(`Loaded "${loaded.title}"`);
        }
      } catch {
        toast.error('Invalid EI House Engineering Lab project file.');
      }
    };
    reader.readAsText(file);
  };

  const handleExportProject = (format: 'json' | 'gerber' | 'bom' | 'firmware') => {
    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${project.title.toLowerCase().replace(/\s+/g, '_')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success('Project JSON exported');
    } else if (format === 'gerber') {
      const gtl = PcbGenerator.exportGerberTopCopper(project.pcb);
      const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(gtl);
      const a = document.createElement('a');
      a.href = dataStr;
      a.download = `${project.title.toLowerCase().replace(/\s+/g, '_')}_top.gtl`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('RS-274X Gerber file generated');
    } else if (format === 'bom') {
      const bom = PcbGenerator.generateBom(project.components);
      let csv = 'Designator,Component Type,Value,Footprint,Quantity\n';
      bom.forEach((b) => {
        csv += `"${b.designators.join(' ')}","${b.componentType}","${b.value}","${b.footprint}",${b.quantity}\n`;
      });
      const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      const a = document.createElement('a');
      a.href = dataStr;
      a.download = `${project.title.toLowerCase().replace(/\s+/g, '_')}_BOM.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Bill of Materials exported');
    } else if (format === 'firmware') {
      const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(project.firmware.code);
      const a = document.createElement('a');
      a.href = dataStr;
      a.download = `${project.title.toLowerCase().replace(/\s+/g, '_')}.ino`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Arduino firmware exported');
    }
  };

  const handleLoadExperiment = (exp: GuidedExperiment) => {
    recordHistory();
    setProject(exp.initialProject);
    setSelectedCompId(null);
    solverRef.current.reset();
    mcuRef.current.resetGpio();
    toast.success(`Loaded Experiment: "${exp.title}"`);
  };

  // ----------------------------------------------------------------
  // Firmware Actions
  // ----------------------------------------------------------------
  const handleFlashFirmware = () => {
    setIsFlashing(true);
    setTimeout(() => {
      setIsFlashing(false);
      mcuRef.current.resetGpio();
      setProject((prev) => ({
        ...prev,
        firmware: {
          ...prev.firmware,
          isRunning: true,
          serialLog: [
            ...prev.firmware.serialLog,
            `[BUILD] Invoking compiler for ${prev.firmware.targetMcu}...`,
            `[VERIFIED] 100% flashed to Virtual MCU runtime.`,
            `[Core] Virtual MCU Online and executing instructions.`,
          ],
        },
      }));
      toast.success('Firmware compiled & running on Virtual MCU!');
    }, 700);
  };

  // ----------------------------------------------------------------
  // SECTION 11: KEYBOARD SHORTCUTS
  // ----------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger canvas shortcuts while typing in inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsSimulating((s) => !s);
      } else if (e.key === 'b' || e.key === 'B') {
        setIsBrowserOpen((o) => !o);
      } else if (e.key === 'i' || e.key === 'I') {
        setIsInspectorOpen((o) => !o);
      } else if (e.key === 'r' || e.key === 'R') {
        if (selectedCompId) handleRotateComponent(selectedCompId);
      } else if (e.key === 'm' || e.key === 'M') {
        if (selectedCompId) handleMirrorComponent(selectedCompId);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedCompId) handleDeleteComponent(selectedCompId);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveProject();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompId, undoStack, redoStack]);

  const selectedComponent = project.components.find((c) => c.id === selectedCompId) || null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#070D18]">
      {/* Top Application Header */}
      <LabHeader
        projectTitle={project.title}
        onTitleChange={(title) => {
          setProject((p) => ({ ...p, title }));
          setHasUnsavedChanges(true);
        }}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        isSimulating={isSimulating}
        onToggleSimulation={() => setIsSimulating((s) => !s)}
        onResetSimulation={() => {
          solverRef.current.reset();
          mcuRef.current.resetGpio();
          setSimTime(0);
          toast.info('Simulation reset');
        }}
        onNewProject={() => {
          recordHistory();
          setProject(TEMPLATE_555_ASTABLE);
          setSelectedCompId(null);
          toast.success('Created new project');
        }}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProjectFile}
        onExportProject={handleExportProject}
        onOpenExperiments={() => setIsExperimentsModalOpen(true)}
        hasUnsavedChanges={hasUnsavedChanges}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isBrowserOpen={isBrowserOpen}
        onToggleBrowser={() => setIsBrowserOpen((o) => !o)}
        isInspectorOpen={isInspectorOpen}
        onToggleInspector={() => setIsInspectorOpen((o) => !o)}
        onResetLayout={handleResetLayout}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Schematic Mode */}
        {activeMode === 'schematic' && (
          <>
            <ComponentBrowser
              onAddComponent={handleAddComponent}
              existingComponents={project.components}
              isOpen={isBrowserOpen}
              onToggleOpen={() => setIsBrowserOpen(!isBrowserOpen)}
              width={browserWidth}
              onWidthChange={setBrowserWidth}
            />

            <main className="flex-1 h-full relative overflow-hidden">
              <SchematicCanvas
                components={project.components}
                wires={project.wires}
                selectedCompId={selectedCompId}
                onSelectComponent={setSelectedCompId}
                onUpdateComponentPosition={handleUpdateComponentPosition}
                onRotateComponent={handleRotateComponent}
                onMirrorComponent={handleMirrorComponent}
                onDeleteComponent={handleDeleteComponent}
                onAddWire={handleAddWire}
                onDeleteWire={handleDeleteWire}
                onUpdateWire={(updatedWire) => {
                  recordHistory();
                  setProject((prev) => ({
                    ...prev,
                    wires: prev.wires.map((w) => (w.id === updatedWire.id ? updatedWire : w)),
                  }));
                }}
                onClearSheet={() => {
                  recordHistory();
                  setProject((prev) => ({
                    ...prev,
                    components: [],
                    wires: [],
                  }));
                  setSelectedCompId(null);
                  toast.success('Schematic sheet cleared (Undo with Ctrl+Z)');
                }}
                isSimulating={isSimulating}
                simulationStates={simStates}
                wireCurrents={wireCurrents}
                onDuplicateComponent={handleDuplicateComponent}
                onCopyComponent={handleCopyComponent}
                onPasteComponent={handlePasteComponent}
              />
            </main>

            <PropertiesInspector
              component={selectedComponent}
              onUpdateComponent={handleUpdateComponent}
              onRotateComponent={handleRotateComponent}
              onMirrorComponent={handleMirrorComponent}
              onDeleteComponent={handleDeleteComponent}
              onDuplicateComponent={handleDuplicateComponent}
              onClose={() => setIsInspectorOpen(false)}
              isOpen={isInspectorOpen}
              onToggleOpen={() => setIsInspectorOpen(!isInspectorOpen)}
              width={inspectorWidth}
              onWidthChange={setInspectorWidth}
              simState={selectedCompId ? simStates[selectedCompId] : undefined}
            />
          </>
        )}

        {/* 3D Virtual Electronics Studio (Direct 3D-First Electronics Design) */}
        {activeMode === 'virtual3d' && (
          <div className="flex-1 flex overflow-hidden relative w-full h-full">
            <Virtual3dStudio
              components={project.components}
              wires={project.wires}
              selectedCompId={selectedCompId}
              onSelectComponent={setSelectedCompId}
              onAddComponent={handleAddComponent}
              onUpdateComponent={handleUpdateComponent}
              onUpdateComponentPosition={handleUpdateComponentPosition}
              onDeleteComponent={handleDeleteComponent}
              onAddWire={handleAddWire}
              onDeleteWire={handleDeleteWire}
              isSimulating={isSimulating}
              simulationStates={simStates}
              wireCurrents={wireCurrents}
              gpioStates={project.firmware.gpioStates}
            />

            <PropertiesInspector
              component={selectedComponent}
              onUpdateComponent={handleUpdateComponent}
              onRotateComponent={handleRotateComponent}
              onMirrorComponent={handleMirrorComponent}
              onDeleteComponent={handleDeleteComponent}
              onClose={() => setIsInspectorOpen(false)}
              isOpen={isInspectorOpen}
              onToggleOpen={() => setIsInspectorOpen(!isInspectorOpen)}
              width={inspectorWidth}
              onWidthChange={setInspectorWidth}
              simState={selectedCompId ? simStates[selectedCompId] : undefined}
            />
          </div>
        )}

        {/* Virtual Instruments Mode */}
        {activeMode === 'instruments' && (
          <InstrumentPanel
            instruments={project.instruments}
            onUpdateInstruments={(instruments) => setProject((p) => ({ ...p, instruments }))}
            waveformData={waveformData}
            isSimulating={isSimulating}
          />
        )}

        {/* 2D PCB Layout Mode */}
        {activeMode === 'pcb2d' && (
          <PcbView
            pcb={project.pcb}
            onExportGerber={() => handleExportProject('gerber')}
            onUpdateDimensions={(widthMm, heightMm) => {
              setProject((p) => ({
                ...p,
                pcb: { ...p.pcb, widthMm, heightMm },
              }));
              toast.info(`Updated PCB dimensions to ${widthMm}x${heightMm} mm`);
            }}
            onUpdatePcb={(updatedPcb) => {
              setProject((p) => ({ ...p, pcb: updatedPcb }));
            }}
            is3DMode={false}
          />
        )}

        {/* 3D Photorealistic PCB WebGL Mode */}
        {activeMode === 'pcb3d' && (
          <PcbView
            pcb={project.pcb}
            onExportGerber={() => handleExportProject('gerber')}
            onUpdateDimensions={(widthMm, heightMm) => {
              setProject((p) => ({
                ...p,
                pcb: { ...p.pcb, widthMm, heightMm },
              }));
            }}
            onUpdatePcb={(updatedPcb) => {
              setProject((p) => ({ ...p, pcb: updatedPcb }));
            }}
            is3DMode={true}
          />
        )}

        {/* Embedded Firmware IDE Mode */}
        {activeMode === 'firmware' && (
          <FirmwareEditor
            firmware={project.firmware}
            onUpdateFirmware={(firmware) => {
              setProject((p) => ({ ...p, firmware }));
              setHasUnsavedChanges(true);
            }}
            onFlashFirmware={handleFlashFirmware}
            isFlashing={isFlashing}
            onSendSerialCommand={(cmd) => {
              setProject((p) => ({
                ...p,
                firmware: {
                  ...p.firmware,
                  serialLog: [...p.firmware.serialLog, `> ${cmd}`, `[ECHO] Received: ${cmd}`],
                },
              }));
            }}
            onClearSerial={() => {
              setProject((p) => ({
                ...p,
                firmware: { ...p.firmware, serialLog: [] },
              }));
            }}
          />
        )}

        {/* R&D Engineering Calculators Mode */}
        {activeMode === 'calculators' && <CalculatorsPanel />}
      </div>

      {/* Guided Experiments Modal */}
      <LabExperimentsModal
        isOpen={isExperimentsModalOpen}
        onClose={() => setIsExperimentsModalOpen(false)}
        onLoadExperiment={handleLoadExperiment}
      />

      {/* Bottom Status Bar */}
      <LabStatusBar
        isSimulating={isSimulating}
        simTime={simTime}
        compCount={project.components.length}
        wireCount={project.wires.length}
        selectedCompLabel={selectedComponent?.label}
      />
    </div>
  );
}
