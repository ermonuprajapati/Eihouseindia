'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { InstrumentPanel } from './Panels/InstrumentPanel';
import { FirmwareEditor } from './Panels/FirmwareEditor';
import { PcbView } from './Panels/PcbView';
import { LabExperimentsModal } from './Panels/LabExperimentsModal';
import { LabStatusBar } from './StatusBar/LabStatusBar';
import { toast } from 'sonner';

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

  // Side Panel Open States
  const [isBrowserOpen, setIsBrowserOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isExperimentsModalOpen, setIsExperimentsModalOpen] = useState(false);

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(true);
  const [simTime, setSimTime] = useState(0);
  const [simStates, setSimStates] = useState<Record<string, { voltage: number; current: number; on?: boolean }>>({});
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
  // Real-Time Simulation Master Loop
  // ----------------------------------------------------------------
  useEffect(() => {
    let animId: number;

    const loop = () => {

      if (isSimulating) {
        // Step Circuit MNA Solver
        const solver = solverRef.current;
        const result: SolverStepResult = solver.step(project.components, project.wires, 0.001, 1.0);

        setSimStates(result.componentStates);
        setWaveformData(result.waveformData);
        setSimTime((t) => t + 0.001);

        // Execute MCU slice if Arduino is running
        if (project.firmware.isRunning) {
          const mcuRes = mcuRef.current.executeCycle(project.firmware);
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
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${project.title.replace(/\s+/g, '_')}_${dateStr}.json`);
      downloadAnchor.click();
      toast.success('Project exported as JSON.');
    } else if (format === 'gerber') {
      const gerberStr = PcbGenerator.exportGerberTopCopper(project.pcb);
      const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(gerberStr);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${project.title.replace(/\s+/g, '_')}_TopCopper.gtl`);
      downloadAnchor.click();
      toast.success('RS-274X Gerber Top Copper exported.');
    } else if (format === 'bom') {
      let csv = 'Index,Designator,Component Type,Value,Footprint Package,Quantity\n';
      project.components.forEach((c, idx) => {
        csv += `${idx + 1},${c.label},${c.type},"${c.value}",${c.footprint},1\n`;
      });
      const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${project.title.replace(/\s+/g, '_')}_BOM.csv`);
      downloadAnchor.click();
      toast.success('Bill of Materials (BOM) exported.');
    } else if (format === 'firmware') {
      const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(project.firmware.code);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${project.title.replace(/\s+/g, '_')}_firmware.ino`);
      downloadAnchor.click();
      toast.success('Arduino firmware exported.');
    }
  };

  const handleLoadExperiment = (exp: GuidedExperiment) => {
    recordHistory();
    setProject(exp.initialProject);
    setSelectedCompId(null);
    solverRef.current.reset();
    toast.success(`Loaded Experiment: ${exp.title}`);
  };

  // ----------------------------------------------------------------
  // Firmware Compilation & Execution
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
            `[AVR-GCC] Compilation successful: 1,428 bytes flash used (4.4%)`,
            `[AVR-DUDE] Flashing ATmega328P at 115200 baud... Verified 100% OK.`,
            `[Core] Running firmware...`,
          ],
        },
      }));
      toast.success('Firmware compiled & flashed to Virtual MCU!');
    }, 900);
  };

  // ----------------------------------------------------------------
  // Global Keyboard Shortcuts
  // ----------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger canvas shortcuts while typing in inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsSimulating((s) => !s);
      } else if (e.key === 'r' || e.key === 'R') {
        if (selectedCompId) handleRotateComponent(selectedCompId);
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
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Schematic Mode */}
        {activeMode === 'schematic' && (
          <>
            <ComponentBrowser
              onAddComponent={handleAddComponent}
              isOpen={isBrowserOpen}
              onToggleOpen={() => setIsBrowserOpen(!isBrowserOpen)}
            />

            <main className="flex-1 h-full relative overflow-hidden">
              <SchematicCanvas
                components={project.components}
                wires={project.wires}
                selectedCompId={selectedCompId}
                onSelectComponent={setSelectedCompId}
                onUpdateComponentPosition={handleUpdateComponentPosition}
                onRotateComponent={handleRotateComponent}
                onDeleteComponent={handleDeleteComponent}
                onAddWire={handleAddWire}
                onDeleteWire={handleDeleteWire}
                isSimulating={isSimulating}
                simulationStates={simStates}
              />
            </main>

            {isInspectorOpen && (
              <PropertiesInspector
                component={selectedComponent}
                onUpdateComponent={handleUpdateComponent}
                onRotateComponent={handleRotateComponent}
                onDeleteComponent={handleDeleteComponent}
                onClose={() => setIsInspectorOpen(false)}
                simState={selectedCompId ? simStates[selectedCompId] : undefined}
              />
            )}
          </>
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
            is3DMode={false}
          />
        )}

        {/* 3D Photorealistic PCB WebGL Mode */}
        {activeMode === 'pcb3d' && (
          <PcbView
            pcb={project.pcb}
            onExportGerber={() => handleExportProject('gerber')}
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
