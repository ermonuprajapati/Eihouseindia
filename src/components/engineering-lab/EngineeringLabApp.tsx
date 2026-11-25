'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { VirtualMcuRuntime, GpioState } from '@/modules/engineering-lab/embedded-engine/virtual-mcu-runtime';
import { PcbGenerator } from '@/modules/engineering-lab/pcb-engine/pcb-generator';
import { autoAnnotateComponents } from '@/modules/engineering-lab/circuit-engine/schematic-erc';

import { LabHeader, ExportFormat } from './Header/LabHeader';
import { SchematicCanvas } from './Canvas/SchematicCanvas';
import { ComponentBrowser } from './Panels/ComponentBrowser';
import { PropertiesInspector } from './Panels/PropertiesInspector';
import { LabStatusBar } from './StatusBar/LabStatusBar';
import { toast } from 'sonner';
import { RefreshCw, Crosshair } from 'lucide-react';
import { QuickProbeOverlay } from './Panels/VirtualInstruments/QuickProbeOverlay';
import {
  downloadBlob,
  createEihouseProjectPayload,
  parseEihouseProject,
  exportCanvasToPng,
  exportSvgElementToPng,
} from '@/modules/engineering-lab/utils/export-helpers';
import { useOptionalAuth } from '@/modules/auth/auth-context';
import {
  saveUserExplicitProject,
  loadUserExplicitProject,
  clearUserExplicitProject,
} from '@/modules/engineering-lab/utils/storage-persistence';

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

const CommunityProjectsModal = dynamic(
  () => import('./Panels/CommunityProjectsModal').then((m) => m.CommunityProjectsModal),
  { ssr: false }
);

const ShareProjectModal = dynamic(
  () => import('./Panels/ShareProjectModal').then((m) => m.ShareProjectModal),
  { ssr: false }
);

const SchematicEditorPanel = dynamic(
  () => import('./Panels/SchematicEditorPanel').then((m) => m.SchematicEditorPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#060B14] text-slate-400 font-mono text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-cyan-400" />
        Loading Professional Schematic Editor...
      </div>
    ),
  }
);

const TAB_PARAM_MAP: Record<string, WorkspaceMode> = {
  'schematic': 'schematic',
  '3d-studio': 'virtual3d',
  'virtual3d': 'virtual3d',
  'studio3d': 'virtual3d',
  'schematic-editor': 'schematicEditor',
  'schematicEditor': 'schematicEditor',
  'instruments': 'instruments',
  'pcb-2d': 'pcb2d',
  'pcb2d': 'pcb2d',
  'pcb-3d': 'pcb3d',
  'pcb3d': 'pcb3d',
  'mcu': 'firmware',
  'firmware': 'firmware',
  'calculators': 'calculators',
  'experiments': 'schematic',
};

const MODE_TO_PARAM: Record<WorkspaceMode, string> = {
  'schematic': 'schematic',
  'virtual3d': '3d-studio',
  'studio3d': '3d-studio',
  'schematicEditor': 'schematic-editor',
  'instruments': 'instruments',
  'pcb2d': 'pcb-2d',
  'pcb3d': 'pcb-3d',
  'firmware': 'mcu',
  'mcu': 'mcu',
  'calculators': 'calculators',
  'experiments': 'experiments',
  'simulation': 'schematic',
};

export function EngineeringLabApp() {
  const auth = useOptionalAuth();
  const currentUserId = auth?.firebaseUser?.uid || auth?.profile?.uid || null;
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  // Project State
  const [project, setProject] = useState<EngineeringProject>(TEMPLATE_555_ASTABLE);
  const [activeMode, setActiveMode] = useState<WorkspaceMode>('schematic');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Synchronized Project Ref to prevent stale closures in history/save
  const projectRef = useRef<EngineeringProject>(project);
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  // Per-User Account Switch Detection & Memory Cleanup (Strict Multi-User Isolation)
  useEffect(() => {
    if (prevUserIdRef.current === undefined) {
      prevUserIdRef.current = currentUserId;
      return;
    }
    if (prevUserIdRef.current !== currentUserId) {
      prevUserIdRef.current = currentUserId;
      // Discard in-memory unsaved edits and reload this user's explicitly saved project
      const savedUserProject = loadUserExplicitProject(currentUserId);
      if (savedUserProject) {
        setProject(savedUserProject);
        toast.info(`Switched to user workspace: "${savedUserProject.title}"`);
      } else {
        setProject(TEMPLATE_555_ASTABLE);
        toast.info('Switched account: loaded fresh default NE555 circuit');
      }
      setHasUnsavedChanges(false);
      setSelectedCompId(null);
      setSelectedWireId(null);
      solverRef.current.reset();
      mcuRef.current.resetGpio();
    }
  }, [currentUserId]);

  // Synchronize Tab with URL query parameter and localStorage
  const handleModeChange = useCallback((newMode: WorkspaceMode) => {
    const normalizedMode: WorkspaceMode =
      newMode === 'studio3d' ? 'virtual3d' :
      newMode === 'mcu' ? 'firmware' : newMode;
    setActiveMode(normalizedMode);

    if (newMode === 'pcb2d' || newMode === 'pcb3d') {
      setProject((prev) => {
        if (!prev.pcb) {
          const updatedPcb = PcbGenerator.generatePcbFromSchematic(
            prev.components,
            prev.wires,
            80,
            60
          );
          return { ...prev, pcb: updatedPcb };
        }
        // Preserve 2D edits: only regenerate if schematic components genuinely changed
        const schematicRealCompIds = new Set(
          prev.components
            .filter((c) => !c.type?.toUpperCase().includes('GND') && !c.type?.toUpperCase().includes('VCC'))
            .map((c) => c.id)
        );
        const pcbCompIds = new Set((prev.pcb.components || []).map((c) => c.componentId));
        const idsMatch =
          schematicRealCompIds.size === pcbCompIds.size &&
          [...schematicRealCompIds].every((id) => pcbCompIds.has(id));

        if (!idsMatch) {
          const updatedPcb = PcbGenerator.generatePcbFromSchematic(
            prev.components,
            prev.wires,
            prev.pcb.widthMm || 80,
            prev.pcb.heightMm || 60,
            prev.pcb
          );
          return { ...prev, pcb: updatedPcb };
        }
        return prev;
      });
    }
    if (typeof window !== 'undefined') {
      const slug = MODE_TO_PARAM[newMode] || newMode;
      try {
        localStorage.setItem('ei_lab_active_tab', slug);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', slug);
        window.history.replaceState(null, '', url.toString());
      } catch {}
    }
  }, []);

  // Undo / Redo Stacks (Capped at 50 steps)
  const [undoStack, setUndoStack] = useState<EngineeringProject[]>([]);
  const [redoStack, setRedoStack] = useState<EngineeringProject[]>([]);

  // Selection
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);

  // SECTION 11: WORKSPACE PERSISTENCE & LAYOUT PREFERENCES
  const [isBrowserOpen, setIsBrowserOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [browserWidth, setBrowserWidth] = useState(288);
  const [inspectorWidth, setInspectorWidth] = useState(320);
  const [isExperimentsModalOpen, setIsExperimentsModalOpen] = useState(false);
  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isQuickProbeOpen, setIsQuickProbeOpen] = useState(false);

  // Load layout preferences, sync active tab, and restore saved project from localStorage on mount
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

      // Responsive auto-collapse on screens < 1024px (Mobile, Tablet, Laptop mini)
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setIsBrowserOpen(false);
        setIsInspectorOpen(false);
      }

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const queryTab = params.get('tab');
        const savedTab = localStorage.getItem('ei_lab_active_tab');
        const targetTab = queryTab || savedTab;

        // Restore exact tab from URL query or localStorage (zero forced redirect to Schematic)
        if (targetTab && TAB_PARAM_MAP[targetTab]) {
          const mode = TAB_PARAM_MAP[targetTab];
          setActiveMode(mode);
          if (targetTab === 'experiments') {
            setIsExperimentsModalOpen(true);
          }
          const currentSlug = MODE_TO_PARAM[mode] || mode;
          if (!queryTab) {
            params.set('tab', currentSlug);
            window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
          }
        }

        const shareParam = params.get('share') || params.get('data');
        const loadId = params.get('load') || params.get('project');

        // Check if direct share payload is in URL
        if (shareParam) {
          try {
            let jsonStr = '';
            try {
              jsonStr = decodeURIComponent(escape(atob(shareParam)));
            } catch {
              jsonStr = decodeURIComponent(shareParam);
            }
            const decoded: EngineeringProject = JSON.parse(jsonStr);
            if (decoded && Array.isArray(decoded.components) && Array.isArray(decoded.wires)) {
              setProject(decoded);
              toast.success(`Loaded shared project "${decoded.title}"`);
              return;
            }
          } catch {
            console.warn('Could not parse share payload from URL');
          }
        }

        // Check if project ID is provided in URL
        if (loadId) {
          const raw = localStorage.getItem(`ei_lab_${loadId}`);
          if (raw) {
            const parsedProject: EngineeringProject = JSON.parse(raw);
            if (parsedProject && Array.isArray(parsedProject.components) && Array.isArray(parsedProject.wires)) {
              setProject(parsedProject);
              toast.success(`Loaded project "${parsedProject.title}"`);
              return;
            }
          }

          // Fetch from cloud API if not in local storage
          fetch(`/api/engineering-lab/projects?id=${encodeURIComponent(loadId)}`)
            .then((r) => r.json())
            .then((res) => {
              if (res.project && Array.isArray(res.project.components)) {
                setProject(res.project);
                toast.success(`Loaded community project "${res.project.title}"`);
              }
            })
            .catch(() => {});
          return;
        }

        // Explicit-Save Hydration with Strict Multi-User Isolation
        // If neither shareParam nor loadId, hydrate from the last explicitly saved project for this user
        const savedActive = loadUserExplicitProject(currentUserId);
        if (savedActive) {
          setProject(savedActive);
          setHasUnsavedChanges(false);
          toast.success(`Restored saved workspace: "${savedActive.title}"`, { duration: 2500 });
        } else {
          // If never saved or guest, ensure pristine starter presentation circuit
          setProject(TEMPLATE_555_ASTABLE);
          setHasUnsavedChanges(false);
        }
      }
    } catch {}
  }, [currentUserId]);

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
  const [simStates, setSimStates] = useState<SolverStepResult['componentStates']>({});
  const [wireCurrents, setWireCurrents] = useState<Record<string, number>>({});
  const [waveformData, setWaveformData] = useState<Record<string, SimulationWaveformPoint[]>>({});
  const [activeFaults, setActiveFaults] = useState<SolverStepResult['faults']>([]);

  // Schematic Editor Interactive Placement Ghost State
  const [editorPlacingComponent, setEditorPlacingComponent] = useState<CircuitComponent | null>(null);

  // Firmware & MCU State
  const [isFlashing, setIsFlashing] = useState(false);

  // Engines & References
  const solverRef = useRef<CircuitSolver>(new CircuitSolver());
  const mcuRef = useRef<VirtualMcuRuntime>(new VirtualMcuRuntime());
  const firmwareRef = useRef(project.firmware);
  const notifiedFaultsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    firmwareRef.current = project.firmware;
  }, [project.firmware]);

  // Reset all component electrical faults, burned states, and thermal stress
  const handleResetFaults = useCallback(() => {
    solverRef.current.resetBurntComponents();
    notifiedFaultsRef.current.clear();
    setActiveFaults([]);
    setSimStates((prevStates) => {
      const resetStates = { ...prevStates };
      Object.keys(resetStates).forEach((k) => {
        if (resetStates[k]) {
          resetStates[k] = {
            ...resetStates[k],
            status: 'NORMAL',
            faultState: 'NORMAL',
            burned: false,
            isBurnedOut: false,
            thermalStress: 0,
            fault: undefined,
          };
        }
      });
      return resetStates;
    });
    setProject((prev) => ({
      ...prev,
      components: prev.components.map((c) => {
        if (!c.state) return c;
        return {
          ...c,
          state: {
            ...c.state,
            faultState: 'NORMAL',
            status: 'NORMAL',
            burned: false,
            isBurnedOut: false,
            thermalStress: 0,
            fault: undefined,
          },
        };
      }),
    }));
    toast.success('Faults cleared & circuit components restored to normal');
  }, []);

  // Toggle simulation with automatic fault reset on simulation start/restart
  const handleToggleSimulation = useCallback(() => {
    setIsSimulating((prev) => {
      const next = !prev;
      if (next) {
        // Automatically reset faultState, isBurnedOut, and thermalStress for ALL components on simulation restart
        solverRef.current.resetBurntComponents();
        notifiedFaultsRef.current.clear();
        setSimStates((prevStates) => {
          const resetStates = { ...prevStates };
          Object.keys(resetStates).forEach((k) => {
            if (resetStates[k]) {
              resetStates[k] = {
                ...resetStates[k],
                status: 'NORMAL',
                faultState: 'NORMAL',
                burned: false,
                isBurnedOut: false,
                thermalStress: 0,
                fault: undefined,
              };
            }
          });
          return resetStates;
        });
        setProject((prev) => ({
          ...prev,
          components: prev.components.map((c) => {
            if (!c.state) return c;
            return {
              ...c,
              state: {
                ...c.state,
                faultState: 'NORMAL',
                status: 'NORMAL',
                burned: false,
                isBurnedOut: false,
                thermalStress: 0,
                fault: undefined,
              },
            };
          }),
        }));
      } else {
        // Complete turn-OFF reset on Stop simulation: zero voltage, current, brightness, and ON states
        setSimStates((prevStates) => {
          const resetStates = { ...prevStates };
          Object.keys(resetStates).forEach((k) => {
            if (resetStates[k]) {
              resetStates[k] = {
                ...resetStates[k],
                voltage: 0,
                current: 0,
                on: false,
                brightness: 0,
              };
            }
          });
          return resetStates;
        });
      }
      return next;
    });
  }, []);

  // Save current project state to Undo stack before changes (capped at 50 steps)
  const recordHistory = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-49), JSON.parse(JSON.stringify(projectRef.current))]);
    setRedoStack([]);
    setHasUnsavedChanges(true);
  }, []);

  // Reliable Undo action
  const handleUndo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) return prevUndo;
      const previous = prevUndo[prevUndo.length - 1];
      const newUndo = prevUndo.slice(0, prevUndo.length - 1);
      setRedoStack((prevRedo) => [...prevRedo.slice(-49), JSON.parse(JSON.stringify(projectRef.current))]);
      setProject(previous);
      setHasUnsavedChanges(true);
      setSelectedCompId(null);
      setSelectedWireId(null);
      toast.info('Reverted previous change (Undo)');
      return newUndo;
    });
  }, []);

  // Reliable Redo action
  const handleRedo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;
      const next = prevRedo[prevRedo.length - 1];
      const newRedo = prevRedo.slice(0, prevRedo.length - 1);
      setUndoStack((prevUndo) => [...prevUndo.slice(-49), JSON.parse(JSON.stringify(projectRef.current))]);
      setProject(next);
      setHasUnsavedChanges(true);
      setSelectedCompId(null);
      setSelectedWireId(null);
      toast.info('Re-applied change (Redo)');
      return newRedo;
    });
  }, []);

  // Reset to Blank Project
  const handleNewBlankProject = useCallback(() => {
    recordHistory();
    const blankProject: EngineeringProject = {
      ...TEMPLATE_555_ASTABLE,
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: 'New Blank Circuit',
      description: 'Empty schematic workspace ready for custom component placement.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      components: [],
      wires: [],
      pcb: {
        ...TEMPLATE_555_ASTABLE.pcb,
        pads: [],
        tracks: [],
        drcErrors: [],
      },
      firmware: {
        ...TEMPLATE_555_ASTABLE.firmware,
        code: '// EI House Virtual Lab Blank Sketch\nvoid setup() {\n  // Initialize pins here\n}\n\nvoid loop() {\n  // Main loop\n}\n',
        serialLog: [],
        isRunning: false,
        gpioStates: {},
      },
      instruments: TEMPLATE_555_ASTABLE.instruments,
    };
    setProject(blankProject);
    setSelectedCompId(null);
    setSelectedWireId(null);
    solverRef.current.reset();
    mcuRef.current.resetGpio();
    clearUserExplicitProject(currentUserId);
    setHasUnsavedChanges(false);
    toast.success('Started fresh with a new blank project');
  }, [recordHistory, currentUserId]);

  // Load Sample NE555 Astable Template
  const handleLoadTemplate = useCallback(() => {
    recordHistory();
    setProject(TEMPLATE_555_ASTABLE);
    setSelectedCompId(null);
    setSelectedWireId(null);
    solverRef.current.reset();
    mcuRef.current.resetGpio();
    setHasUnsavedChanges(true);
    toast.success('Loaded NE555 Astable Demo Template');
  }, [recordHistory]);

  // ----------------------------------------------------------------
  // SECTION 12: 1:1 REAL-TIME SIMULATION TIMESTEP ACCUMULATOR
  // ----------------------------------------------------------------
  useEffect(() => {
    let animId: number;
    let lastUiUpdate = performance.now();
    let lastSerialFlush = performance.now();
    let lastFrameTime = performance.now();
    let simAccumulator = 0;
    let lastNodeVoltages: Record<string, number> = {};
    const pendingSerialLines: string[] = [];

    const loop = () => {
      const now = performance.now();
      const realDt = Math.min((now - lastFrameTime) / 1000, 0.05); // Cap at 50ms to prevent spiral of death
      lastFrameTime = now;

      if (isSimulating && typeof document !== 'undefined' && document.visibilityState !== 'hidden') {
        const curFirmware = firmwareRef.current;
        let currentGpioStates: Record<string | number, GpioState> | undefined = undefined;

        // Execute MCU slice if MCU is running
        if (curFirmware.isRunning) {
          const sonarComp = project.components.find((c) => c.type === 'SENSOR_ULTRASONIC');
          const dhtComp = project.components.find((c) => c.type === 'SENSOR_DHT11');
          const ldrComp = project.components.find((c) => c.type === 'SENSOR_LDR');

          const mcuComp = project.components.find((c) =>
            c.type.startsWith('ARDUINO_') ||
            c.type.startsWith('ESP32') ||
            c.type.startsWith('STM32') ||
            c.type.startsWith('RASPBERRY_PI_PICO') ||
            c.type === 'MCU_ARDUINO_UNO' ||
            c.type.includes('MCU')
          );

          const pinVoltages: Record<string, number> = {};
          if (mcuComp && mcuComp.pins && solverRef.current) {
            for (const pin of mcuComp.pins) {
              if (solverRef.current.getNetForPin(mcuComp.id, pin.id)) {
                const v = solverRef.current.getPinVoltage(mcuComp.id, pin.id, lastNodeVoltages);
                pinVoltages[pin.id] = v;
                const stripped = pin.id.replace(/^[D|GP|GPIO]/, '');
                if (stripped && stripped !== pin.id) {
                  pinVoltages[stripped] = v;
                }
              }
            }
          }

          const mcuRes = mcuRef.current.executeCycle(curFirmware, {
            distanceCm: Number(sonarComp?.parameters?.distanceCm ?? 45.0),
            temperatureC: Number(dhtComp?.parameters?.temperatureC ?? 24.0),
            humidityPercent: Number(dhtComp?.parameters?.humidityPercent ?? 45.0),
            lightLux: Number(ldrComp?.parameters?.lightLux ?? 350.0),
            isPowered: Boolean(mcuComp?.parameters?.usbPlugged !== false || mcuComp?.parameters?.dcJackPlugged === true),
            pinVoltages,
          });

          currentGpioStates = mcuRes.gpioUpdates;

          if (mcuRes.serialLines.length > 0) {
            pendingSerialLines.push(...mcuRes.serialLines);
          }
        }

        // 1:1 Real-Time Simulation Speed: Accumulate realDt and step in fixed sub-steps (1ms)
        const solver = solverRef.current;
        simAccumulator += realDt;
        const SUB_STEP = 0.001;
        let result: SolverStepResult | null = null;
        let stepCount = 0;

        while (simAccumulator >= SUB_STEP && stepCount < 50) {
          const stepRes = solver.step(
            project.components,
            project.wires,
            SUB_STEP,
            1.0,
            project.instruments,
            currentGpioStates || mcuRef.current.getGpioState()
          );
          if (!result) {
            result = stepRes;
          } else {
            result = {
              ...stepRes,
              faults: stepRes.faults && stepRes.faults.length > 0
                ? [...(result.faults || []), ...stepRes.faults]
                : result.faults,
            };
          }
          if (stepRes && stepRes.nodeVoltages) {
            lastNodeVoltages = stepRes.nodeVoltages;
          }
          simAccumulator -= SUB_STEP;
          stepCount++;
        }

        // Fire toast alerts for new component electrical burnout / damage faults
        if (result && result.faults && result.faults.length > 0) {
          setActiveFaults(result.faults);
          result.faults.forEach((fault) => {
            const faultKey = `${fault.compId}:${fault.type}`;
            if (!notifiedFaultsRef.current.has(faultKey)) {
              notifiedFaultsRef.current.add(faultKey);
              toast.error(fault.message, {
                id: 'fault-' + fault.compId,
                duration: 6000,
                action: {
                  label: 'Reset Faults',
                  onClick: handleResetFaults,
                },
              });
            }
          });
        }

        // Throttle UI commits to ~30 FPS to prevent memory churn and high CPU usage
        if (result && now - lastUiUpdate >= 33) {
          lastUiUpdate = now;
          setSimStates(result.componentStates);
          setWireCurrents(result.wireCurrents || {});
          setWaveformData(result.waveformData);
          setSimTime(solver.getCurrentTime());
        }

        // Throttle serial log update to every 150ms to keep 60 FPS buttery smooth
        if (pendingSerialLines.length > 0 && now - lastSerialFlush >= 150) {
          lastSerialFlush = now;
          const linesToCommit = pendingSerialLines.splice(0, pendingSerialLines.length);
          setProject((prev) => ({
            ...prev,
            firmware: {
              ...prev.firmware,
              serialLog: [...prev.firmware.serialLog, ...linesToCommit].slice(-100),
              gpioStates: currentGpioStates || mcuRef.current.getGpioState(),
            },
          }));
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isSimulating, project.components, project.wires, project.instruments, handleResetFaults]);

  // Schematic topology signature to only trigger PCB re-sync when schematic netlist truly changes
  const lastSchematicSigRef = useRef<string>('');
  const currentSchematicSig = useMemo(() => {
    const cSig = project.components.map((c) => `${c.id}:${c.type}:${c.x}:${c.y}`).join(';');
    const wSig = project.wires.map((w) => `${w.id}:${w.fromCompId}:${w.fromPinId}-${w.toCompId}:${w.toPinId}`).join(';');
    return `${cSig}#${wSig}`;
  }, [project.components, project.wires]);

  useEffect(() => {
    if (lastSchematicSigRef.current === '') {
      lastSchematicSigRef.current = currentSchematicSig;
      return;
    }
    if (lastSchematicSigRef.current === currentSchematicSig) {
      return;
    }
    lastSchematicSigRef.current = currentSchematicSig;

    setProject((prev) => {
      const updatedPcb = PcbGenerator.generatePcbFromSchematic(
        prev.components,
        prev.wires,
        prev.pcb?.widthMm || 80,
        prev.pcb?.heightMm || 60,
        prev.pcb
      );
      return { ...prev, pcb: updatedPcb };
    });
  }, [currentSchematicSig]);

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

  const handleUpdateComponent3DPosition = (id: string, x3d: number, y3d: number, z3d: number) => {
    setProject((prev) => ({
      ...prev,
      components: prev.components.map((c) => (c.id === id ? { ...c, x3d, y3d, z3d } : c)),
    }));
  };

  const handleRotateComponent = useCallback((id: string) => {
    recordHistory();
    setProject((prev) => ({
      ...prev,
      components: prev.components.map((c) => {
        if (c.id !== id) return c;
        const nextRot = ((c.rotation + 90) % 360) as 0 | 90 | 180 | 270;
        return { ...c, rotation: nextRot };
      }),
    }));
  }, [recordHistory]);

  const handleMirrorComponent = useCallback((id: string) => {
    recordHistory();
    setProject((prev) => ({
      ...prev,
      components: prev.components.map((c) => {
        if (c.id !== id) return c;
        return { ...c, mirrored: !c.mirrored };
      }),
    }));
  }, [recordHistory]);

  const handleDeleteComponent = useCallback((id: string) => {
    recordHistory();
    setProject((prev) => ({
      ...prev,
      components: prev.components.filter((c) => c.id !== id),
      wires: prev.wires.filter((w) => w.fromCompId !== id && w.toCompId !== id),
    }));
    setSelectedCompId((prev) => (prev === id ? null : prev));
    toast.info('Component deleted');
  }, [recordHistory]);

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

  const handleBatchUpdatePositions = (updates: { id: string; x: number; y: number }[]) => {
    const updateMap = new Map(updates.map((u) => [u.id, { x: u.x, y: u.y }]));
    setProject((prev) => ({
      ...prev,
      components: prev.components.map((c) => {
        const pos = updateMap.get(c.id);
        return pos ? { ...c, x: pos.x, y: pos.y } : c;
      }),
    }));
  };

  const handleBatchDelete = (compIds: string[], wireIds: string[]) => {
    recordHistory();
    const compIdSet = new Set(compIds);
    const wireIdSet = new Set(wireIds);
    setProject((prev) => ({
      ...prev,
      components: prev.components.filter((c) => !compIdSet.has(c.id)),
      wires: prev.wires.filter(
        (w) => !wireIdSet.has(w.id) && !compIdSet.has(w.fromCompId) && !compIdSet.has(w.toCompId)
      ),
    }));
    setSelectedCompId(null);
    setSelectedWireId(null);
    toast.info(`Deleted ${compIds.length + wireIds.length} items`);
  };

  const handleAutoAnnotate = () => {
    recordHistory();
    setProject((prev) => ({
      ...prev,
      components: autoAnnotateComponents(prev.components),
    }));
    toast.success('Schematic auto-annotated sequentially');
  };

  // ----------------------------------------------------------------
  // Wire Actions
  // ----------------------------------------------------------------
  const handleAddWire = (wire: Omit<CircuitWire, 'id'> & { id?: string }) => {
    recordHistory();
    const newWire: CircuitWire = {
      ...wire,
      id: wire.id || `w_${Math.random().toString(36).substring(2, 9)}`,
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
    if (selectedWireId === wireId) {
      setSelectedWireId(null);
    }
    toast.info('Wire deleted');
  };

  const handleDisconnectWire = (wireId: string) => {
    recordHistory();
    setProject((prev) => ({
      ...prev,
      wires: prev.wires.filter((w) => w.id !== wireId),
    }));
    if (selectedWireId === wireId) {
      setSelectedWireId(null);
    }
    toast.info('Wire disconnected');
  };

  const handleDisconnectWireEndpoint = (wireId: string, endpoint: 'start' | 'end') => {
    recordHistory();
    setProject((prev) => ({
      ...prev,
      wires: prev.wires.filter((w) => w.id !== wireId),
    }));
    if (selectedWireId === wireId) {
      setSelectedWireId(null);
    }
    toast.info(`Wire ${endpoint === 'start' ? 'Start' : 'End'} pin disconnected`);
  };

  // ----------------------------------------------------------------
  // Project & File Operations
  // ----------------------------------------------------------------
  const handleSaveProject = useCallback(() => {
    try {
      const curProject = projectRef.current;
      saveUserExplicitProject(currentUserId, curProject);
      setHasUnsavedChanges(false);
      toast.success(`Project "${curProject.title}" saved! Changes will persist on refresh.`);
    } catch {
      toast.error('Failed to save project locally.');
    }
  }, [currentUserId]);

  const handleLoadProjectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawText = event.target?.result as string;
        const loaded = parseEihouseProject(rawText);
        if (loaded && Array.isArray(loaded.components) && Array.isArray(loaded.wires)) {
          recordHistory();
          setProject(loaded);
          setSelectedCompId(null);
          setSelectedWireId(null);
          solverRef.current.reset();
          mcuRef.current.resetGpio();
          setHasUnsavedChanges(false);
          saveUserExplicitProject(currentUserId, loaded);
          toast.success(`Imported project "${loaded.title || file.name}"`);
        } else {
          toast.error('Invalid file format. Please select a valid .eihouse.json or .json project.');
        }
      } catch {
        toast.error('Failed to parse EI House project file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportProject = async (format: ExportFormat) => {
    const curProject = projectRef.current;
    const slug = curProject.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'circuit';

    if (format === 'eihouse') {
      const payload = createEihouseProjectPayload(curProject);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `${slug}.eihouse.json`);
      toast.success('Exported EI House project file (.eihouse.json)');
    } else if (format === 'json') {
      const blob = new Blob([JSON.stringify(curProject, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `${slug}.json`);
      toast.success('Exported standard project JSON');
    } else if (format === 'bom') {
      const bom = PcbGenerator.generateBom(curProject.components);
      let csv = 'Designator,Component Type,Value,Package/Footprint,Quantity\n';
      bom.forEach((b) => {
        csv += `"${b.designators.join(' ')}","${b.componentType}","${b.value}","${b.footprint}",${b.quantity}\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      downloadBlob(blob, `${slug}_BOM.csv`);
      toast.success('Bill of Materials exported (.csv)');
    } else if (format === 'gerber') {
      const { GerberExporter } = await import('@/modules/engineering-lab/pcb-engine/gerber-exporter');
      GerberExporter.exportGerberZip(curProject.pcb, curProject.components, curProject.title);
      toast.success('RS-274X Gerber & Excellon Drill ZIP package generated');
    } else if (format === 'firmware') {
      const blob = new Blob([curProject.firmware.code || ''], { type: 'text/plain;charset=utf-8' });
      downloadBlob(blob, `${slug}.ino`);
      toast.success('Arduino firmware exported (.ino)');
    } else if (format === 'cpp') {
      const blob = new Blob([curProject.firmware.code || ''], { type: 'text/plain;charset=utf-8' });
      downloadBlob(blob, `${slug}.cpp`);
      toast.success('C++ source file exported (.cpp)');
    } else if (format === 'netlist') {
      const { generateSpiceNetlist, downloadSpiceNetlist } = await import(
        '@/modules/engineering-lab/circuit-engine/spice-netlist-generator'
      );
      const netlist = generateSpiceNetlist(curProject.title, curProject.components, curProject.wires);
      downloadSpiceNetlist(curProject.title, netlist);
      toast.success('SPICE Netlist exported (.cir)');
    } else if (format === 'netlist-json') {
      const jsonNetlist = {
        title: curProject.title,
        exportedAt: new Date().toISOString(),
        components: curProject.components.map((c) => ({
          id: c.id,
          label: c.label,
          designator: c.designator,
          type: c.type,
          value: c.value,
          pins: c.pins.map((p) => p.id),
        })),
        wires: curProject.wires.map((w) => ({
          id: w.id,
          from: `${w.fromCompId}:${w.fromPinId}`,
          to: `${w.toCompId}:${w.toPinId}`,
          net: w.netName || 'NET',
        })),
      };
      const blob = new Blob([JSON.stringify(jsonNetlist, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `${slug}_netlist.json`);
      toast.success('JSON Netlist exported');
    } else if (format === 'svg') {
      if (activeMode === 'pcb2d') {
        const { GerberExporter } = await import('@/modules/engineering-lab/pcb-engine/gerber-exporter');
        const pcbSvg = GerberExporter.exportBlueprintSvg(curProject.pcb);
        const blob = new Blob([pcbSvg], { type: 'image/svg+xml;charset=utf-8' });
        downloadBlob(blob, `${slug}_pcb.svg`);
        toast.success('PCB 2D vector blueprint exported (.svg)');
      } else {
        const svgEl = document.getElementById('main-schematic-svg') as SVGElement | null;
        if (svgEl) {
          const serializer = new XMLSerializer();
          let svgStr = serializer.serializeToString(svgEl);
          if (!svgStr.includes('xmlns="http://www.w3.org/2000/svg"')) {
            svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
          }
          const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
          downloadBlob(blob, `${slug}_schematic.svg`);
          toast.success('Schematic vector drawing exported (.svg)');
        } else {
          toast.error('Schematic SVG could not be found.');
        }
      }
    } else if (format === 'png') {
      if (activeMode === 'virtual3d') {
        const canvas = (document.getElementById('virtual-3d-webgl-canvas') ||
          document.querySelector('.virtual-3d-canvas canvas') ||
          document.querySelector('canvas')) as HTMLCanvasElement | null;
        if (canvas) {
          exportCanvasToPng(canvas, `${slug}_3d_studio.png`);
          toast.success('3D Virtual Studio snapshot exported (.png)');
        } else {
          toast.error('3D canvas not ready for snapshot.');
        }
      } else if (activeMode === 'pcb3d') {
        const canvas = (document.getElementById('pcb-3d-webgl-canvas') ||
          document.querySelector('canvas')) as HTMLCanvasElement | null;
        if (canvas) {
          exportCanvasToPng(canvas, `${slug}_pcb3d.png`);
          toast.success('PCB 3D inspection snapshot exported (.png)');
        } else {
          toast.error('PCB 3D canvas not ready for snapshot.');
        }
      } else if (activeMode === 'pcb2d') {
        const { GerberExporter } = await import('@/modules/engineering-lab/pcb-engine/gerber-exporter');
        const pcbSvg = GerberExporter.exportBlueprintSvg(curProject.pcb);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = pcbSvg;
        const svgEl = tempDiv.querySelector('svg');
        if (svgEl) {
          const ok = await exportSvgElementToPng(svgEl, `${slug}_pcb2d.png`, 3);
          if (ok) toast.success('PCB 2D layout exported (.png)');
          else toast.error('Failed to export PCB 2D PNG.');
        }
      } else {
        const svgEl = document.getElementById('main-schematic-svg') as SVGElement | null;
        if (svgEl) {
          const ok = await exportSvgElementToPng(svgEl, `${slug}_schematic.png`, 2);
          if (ok) toast.success('Schematic snapshot exported (.png)');
          else toast.error('Failed to export schematic PNG.');
        } else {
          toast.error('Schematic drawing not found.');
        }
      }
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
      // Save: Ctrl+S / Cmd+S universally (even when inside inputs)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSaveProject();
        return;
      }

      // Don't trigger canvas shortcuts while typing in inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      // Undo: Ctrl+Z / Cmd+Z (without Shift)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y / Cmd+Y OR Ctrl+Shift+Z / Cmd+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleToggleSimulation();
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedCompId,
    handleSaveProject,
    handleUndo,
    handleRedo,
    handleToggleSimulation,
    handleRotateComponent,
    handleMirrorComponent,
    handleDeleteComponent,
  ]);

  const selectedComponent = project.components.find((c) => c.id === selectedCompId) || null;
  const selectedWire = project.wires.find((w) => w.id === selectedWireId) || null;

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-[#070D18]">
      {/* Top Application Header */}
      <LabHeader
        projectTitle={project.title}
        onTitleChange={(title) => {
          recordHistory();
          setProject((p) => ({ ...p, title }));
          setHasUnsavedChanges(true);
        }}
        activeMode={activeMode}
        onModeChange={handleModeChange}
        isSimulating={isSimulating}
        onToggleSimulation={handleToggleSimulation}
        onResetSimulation={() => {
          handleResetFaults();
          mcuRef.current.resetGpio();
          setSimTime(0);
        }}
        onNewProject={handleNewBlankProject}
        onNewBlankProject={handleNewBlankProject}
        onLoadTemplate={handleLoadTemplate}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProjectFile}
        onExportProject={handleExportProject}
        onOpenExperiments={() => setIsExperimentsModalOpen(true)}
        onOpenCommunityProjects={() => setIsCommunityModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
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
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* Schematic Mode */}
        {activeMode === 'schematic' && (
          <>
            {isBrowserOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                onClick={() => setIsBrowserOpen(false)}
              />
            )}
            <ComponentBrowser
              onAddComponent={handleAddComponent}
              existingComponents={project.components}
              isOpen={isBrowserOpen}
              onToggleOpen={() => setIsBrowserOpen(!isBrowserOpen)}
              width={browserWidth}
              onWidthChange={setBrowserWidth}
            />

            <main className="flex-1 min-h-0 min-w-0 h-full relative overflow-hidden">
              {/* Circuit Overload / Component Burnout Alert Banner (Positioned Below Floating Toolbar) */}
              {Object.values(simStates).some((s) => s.status === 'BURNED' || s.burned || s.isBurnedOut) && (
                <div className="absolute top-[72px] left-1/2 -translate-x-1/2 z-40 bg-rose-950/95 border border-rose-500 text-rose-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 font-mono text-xs backdrop-blur animate-in fade-in slide-in-from-top-2 duration-200 max-w-2xl w-[calc(100%-1.5rem)]">
                  <span className="font-bold text-rose-400 flex items-center gap-1.5 shrink-0">
                    <span>💥</span>
                    <span>CIRCUIT FAULT:</span>
                  </span>
                  <span
                    className="text-rose-100 flex-1 truncate"
                    title={Object.values(simStates).find((s) => (s.status === 'BURNED' || s.burned || s.isBurnedOut) && s.fault)?.fault}
                  >
                    {Object.values(simStates).find((s) => (s.status === 'BURNED' || s.burned || s.isBurnedOut) && s.fault)?.fault ||
                      'Component burned out due to electrical overload!'}
                  </span>
                  <button
                    type="button"
                    onClick={handleResetFaults}
                    className="px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer transition-colors shrink-0 shadow flex items-center gap-1.5"
                  >
                    <span>↺</span>
                    <span>Reset Faults</span>
                  </button>
                </div>
              )}

              <SchematicCanvas
                components={project.components}
                wires={project.wires}
                selectedCompId={selectedCompId}
                selectedWireId={selectedWireId}
                onSelectComponent={(id) => {
                  setSelectedCompId(id);
                  if (id) setSelectedWireId(null);
                }}
                onSelectWire={(id) => {
                  setSelectedWireId(id);
                  if (id) setSelectedCompId(null);
                }}
                onUpdateComponentPosition={handleUpdateComponentPosition}
                onRotateComponent={handleRotateComponent}
                onMirrorComponent={handleMirrorComponent}
                onDeleteComponent={handleDeleteComponent}
                onAddWire={handleAddWire}
                onDeleteWire={handleDeleteWire}
                onDisconnectWire={handleDisconnectWire}
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
                  setSelectedWireId(null);
                  toast.success('Schematic sheet cleared (Undo with Ctrl+Z)');
                }}
                isSimulating={isSimulating}
                simulationStates={simStates}
                wireCurrents={wireCurrents}
                onDuplicateComponent={handleDuplicateComponent}
                onCopyComponent={handleCopyComponent}
                onPasteComponent={handlePasteComponent}
                projectTitle={project.title}
                onAddComponent={handleAddComponent}
                onBatchUpdatePositions={handleBatchUpdatePositions}
                onBatchDelete={handleBatchDelete}
                onAutoAnnotate={handleAutoAnnotate}
              />

              {/* Quick-Probe Trigger Button & Overlay */}
              <button
                type="button"
                onClick={() => setIsQuickProbeOpen((o) => !o)}
                className={`absolute bottom-4 left-3 sm:left-56 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold cursor-pointer transition-all shadow-xl backdrop-blur ${
                  isQuickProbeOpen
                    ? 'bg-cyan-600 text-white border border-cyan-400'
                    : 'bg-slate-900/90 text-cyan-300 border border-slate-700 hover:bg-slate-800'
                }`}
                title="Toggle Live Circuit Quick-Probe Tool"
              >
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isQuickProbeOpen ? 'Close Quick-Probe' : 'Quick-Probe'}</span>
              </button>

              <QuickProbeOverlay
                isOpen={isQuickProbeOpen}
                onClose={() => setIsQuickProbeOpen(false)}
                components={project.components}
                wires={project.wires}
                simStates={simStates}
                wireCurrents={wireCurrents}
                waveformData={waveformData}
              />
            </main>

            {isInspectorOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                onClick={() => setIsInspectorOpen(false)}
              />
            )}
            <PropertiesInspector
              component={selectedComponent}
              selectedWire={selectedWire}
              components={project.components}
              wires={project.wires}
              onUpdateComponent={handleUpdateComponent}
              onUpdateWire={(updatedWire) => {
                recordHistory();
                setProject((prev) => ({
                  ...prev,
                  wires: prev.wires.map((w) => (w.id === updatedWire.id ? updatedWire : w)),
                }));
              }}
              onRotateComponent={handleRotateComponent}
              onMirrorComponent={handleMirrorComponent}
              onDeleteComponent={handleDeleteComponent}
              onDeleteWire={handleDeleteWire}
              onDisconnectWire={handleDisconnectWire}
              onDisconnectWireEndpoint={handleDisconnectWireEndpoint}
              onDuplicateComponent={handleDuplicateComponent}
              onClose={() => setIsInspectorOpen(false)}
              isOpen={isInspectorOpen}
              onToggleOpen={() => setIsInspectorOpen(!isInspectorOpen)}
              width={inspectorWidth}
              onWidthChange={setInspectorWidth}
              simState={selectedCompId ? simStates[selectedCompId] : undefined}
              wireCurrent={selectedWireId ? wireCurrents[selectedWireId] : undefined}
            />
          </>
        )}

        {/* 3D Virtual Electronics Studio (Direct 3D-First Electronics Design) */}
        {activeMode === 'virtual3d' && (
          <div className="flex-1 flex overflow-hidden relative w-full h-full min-w-0">
            {/* Quick-Probe Trigger Button & Overlay */}
            <button
              type="button"
              onClick={() => setIsQuickProbeOpen((o) => !o)}
              className={`absolute bottom-4 left-3 sm:left-64 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold cursor-pointer transition-all shadow-xl backdrop-blur ${
                isQuickProbeOpen
                  ? 'bg-cyan-600 text-white border border-cyan-400'
                  : 'bg-slate-900/90 text-cyan-300 border border-slate-700 hover:bg-slate-800'
              }`}
              title="Toggle Live Circuit Quick-Probe Tool"
            >
              <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isQuickProbeOpen ? 'Close Quick-Probe' : 'Quick-Probe'}</span>
            </button>

            <QuickProbeOverlay
              isOpen={isQuickProbeOpen}
              onClose={() => setIsQuickProbeOpen(false)}
              components={project.components}
              wires={project.wires}
              simStates={simStates}
              wireCurrents={wireCurrents}
              waveformData={waveformData}
            />

            <div className="flex-1 h-full w-full relative overflow-hidden min-w-0">
              {/* Circuit Overload / Electrical Fault Alert Banner (3D Studio) */}
              {(Object.values(simStates).some((s) => s.status === 'BURNED' || s.burned || s.isBurnedOut) || (activeFaults && activeFaults.length > 0)) && (
                <div className="absolute top-[72px] left-1/2 -translate-x-1/2 z-40 bg-rose-950/95 border border-rose-500 text-rose-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 font-mono text-xs backdrop-blur animate-in fade-in slide-in-from-top-2 duration-200 max-w-2xl w-[calc(100%-1.5rem)]">
                  <span className="font-bold text-rose-400 flex items-center gap-1.5 shrink-0">
                    <span>💥</span>
                    <span>CIRCUIT FAULT:</span>
                  </span>
                  <span
                    className="text-rose-100 flex-1 truncate"
                    title={
                      Object.values(simStates).find((s) => (s.status === 'BURNED' || s.burned || s.isBurnedOut) && s.fault)?.fault ||
                      (activeFaults && activeFaults.length > 0 ? activeFaults[0].message : undefined)
                    }
                  >
                    {Object.values(simStates).find((s) => (s.status === 'BURNED' || s.burned || s.isBurnedOut) && s.fault)?.fault ||
                      (activeFaults && activeFaults.length > 0 ? activeFaults[0].message : 'Component burned out due to electrical overload!')}
                  </span>
                  <button
                    type="button"
                    onClick={handleResetFaults}
                    className="px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer transition-colors shrink-0 shadow flex items-center gap-1.5"
                  >
                    <span>↺</span>
                    <span>Reset Faults</span>
                  </button>
                </div>
              )}

              <Virtual3dStudio
                components={project.components}
                wires={project.wires}
                selectedCompId={selectedCompId}
                selectedWireId={selectedWireId}
                onSelectComponent={(id) => {
                  setSelectedCompId(id);
                  if (id) {
                    setSelectedWireId(null);
                  }
                }}
                onSelectWire={(id) => {
                  setSelectedWireId(id);
                  if (id) setSelectedCompId(null);
                }}
                onAddComponent={handleAddComponent}
                onUpdateComponent={handleUpdateComponent}
                onUpdateComponentPosition={handleUpdateComponentPosition}
                onUpdateComponent3DPosition={handleUpdateComponent3DPosition}
                onDeleteComponent={handleDeleteComponent}
                onAddWire={handleAddWire}
                onDeleteWire={handleDeleteWire}
                onDisconnectWire={handleDisconnectWire}
                isSimulating={isSimulating}
                simulationStates={simStates}
                wireCurrents={wireCurrents}
                gpioStates={project.firmware.gpioStates}
                isInspectorOpen={isInspectorOpen}
                onToggleInspector={() => setIsInspectorOpen((o) => !o)}
                onSaveWorkspace={handleSaveProject}
              />
            </div>

            {isInspectorOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                onClick={() => setIsInspectorOpen(false)}
              />
            )}
            <PropertiesInspector
              component={selectedComponent}
              selectedWire={selectedWire}
              components={project.components}
              wires={project.wires}
              onUpdateComponent={handleUpdateComponent}
              onUpdateWire={(updatedWire) => {
                recordHistory();
                setProject((prev) => ({
                  ...prev,
                  wires: prev.wires.map((w) => (w.id === updatedWire.id ? updatedWire : w)),
                }));
              }}
              onRotateComponent={handleRotateComponent}
              onMirrorComponent={handleMirrorComponent}
              onDeleteComponent={handleDeleteComponent}
              onDeleteWire={handleDeleteWire}
              onDisconnectWire={handleDisconnectWire}
              onDisconnectWireEndpoint={handleDisconnectWireEndpoint}
              onDuplicateComponent={handleDuplicateComponent}
              onClose={() => setIsInspectorOpen(false)}
              isOpen={isInspectorOpen}
              onToggleOpen={() => setIsInspectorOpen(!isInspectorOpen)}
              width={inspectorWidth}
              onWidthChange={setInspectorWidth}
              simState={selectedCompId ? simStates[selectedCompId] : undefined}
              wireCurrent={selectedWireId ? wireCurrents[selectedWireId] : undefined}
            />
          </div>
        )}

        {/* Professional Schematic Capture & Design Mode */}
        {activeMode === 'schematicEditor' && (
          <div className="flex-1 flex overflow-hidden relative w-full h-full min-w-0">
            {isBrowserOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                onClick={() => setIsBrowserOpen(false)}
              />
            )}
            <ComponentBrowser
              onAddComponent={(comp) => {
                setEditorPlacingComponent(comp);
              }}
              existingComponents={project.components}
              isOpen={isBrowserOpen}
              onToggleOpen={() => setIsBrowserOpen(!isBrowserOpen)}
              width={browserWidth}
              onWidthChange={setBrowserWidth}
            />

            <main className="flex-1 min-h-0 min-w-0 h-full relative overflow-hidden">
              <SchematicEditorPanel
                project={project}
                components={project.components}
                wires={project.wires}
                selectedCompId={selectedCompId}
                selectedWireId={selectedWireId}
                placingComponent={editorPlacingComponent}
                onFinishPlacing={(placedComp) => {
                  handleAddComponent(placedComp);
                  setEditorPlacingComponent(null);
                }}
                onCancelPlacing={() => setEditorPlacingComponent(null)}
                onSelectComponent={(id) => {
                  setSelectedCompId(id);
                  setSelectedWireId(null);
                }}
                onSelectWire={(id) => {
                  setSelectedWireId(id);
                  setSelectedCompId(null);
                }}
                onUpdateComponentPosition={handleUpdateComponentPosition}
                onRotateComponent={handleRotateComponent}
                onMirrorComponent={handleMirrorComponent}
                onDeleteComponent={handleDeleteComponent}
                onAddWire={handleAddWire}
                onDeleteWire={handleDeleteWire}
                onUpdateComponents={(comps) => {
                  recordHistory();
                  setProject((prev) => ({ ...prev, components: comps }));
                  setHasUnsavedChanges(true);
                }}
                onUpdateWires={(wires) => {
                  recordHistory();
                  setProject((prev) => ({ ...prev, wires }));
                  setHasUnsavedChanges(true);
                }}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
              />
            </main>

            <PropertiesInspector
              component={selectedComponent}
              selectedWire={selectedWire}
              components={project.components}
              wires={project.wires}
              onUpdateComponent={handleUpdateComponent}
              onRotateComponent={handleRotateComponent}
              onDeleteComponent={handleDeleteComponent}
              onUpdateWire={(updatedWire) => {
                setProject((prev) => ({
                  ...prev,
                  wires: prev.wires.map((w) => (w.id === updatedWire.id ? updatedWire : w)),
                }));
                setHasUnsavedChanges(true);
              }}
              onDuplicateComponent={handleDuplicateComponent}
              onClose={() => setIsInspectorOpen(false)}
              isOpen={isInspectorOpen}
              onToggleOpen={() => setIsInspectorOpen(!isInspectorOpen)}
              width={inspectorWidth}
              onWidthChange={setInspectorWidth}
              simState={selectedCompId ? simStates[selectedCompId] : undefined}
              wireCurrent={selectedWireId ? wireCurrents[selectedWireId] : undefined}
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
            components={project.components}
            wires={project.wires}
            simStates={simStates}
            wireCurrents={wireCurrents}
            onToggleSimulation={handleToggleSimulation}
          />
        )}

        {/* 2D PCB Layout Mode */}
        {activeMode === 'pcb2d' && (
          <PcbView
            pcb={project.pcb}
            components={project.components}
            wires={project.wires}
            projectTitle={project.title}
            onExportGerber={() => handleExportProject('gerber')}
            onUpdateDimensions={(widthMm, heightMm) => {
              recordHistory();
              setProject((p) => ({
                ...p,
                pcb: { ...p.pcb, widthMm, heightMm },
              }));
              toast.info(`Updated PCB dimensions to ${widthMm}x${heightMm} mm`);
            }}
            onUpdatePcb={(updatedPcb) => {
              recordHistory();
              setProject((p) => ({ ...p, pcb: updatedPcb }));
            }}
            is3DMode={false}
          />
        )}

        {/* 3D Photorealistic PCB WebGL Mode */}
        {activeMode === 'pcb3d' && (
          <PcbView
            pcb={project.pcb}
            components={project.components}
            wires={project.wires}
            projectTitle={project.title}
            onExportGerber={() => handleExportProject('gerber')}
            onUpdateDimensions={(widthMm, heightMm) => {
              recordHistory();
              setProject((p) => ({
                ...p,
                pcb: { ...p.pcb, widthMm, heightMm },
              }));
            }}
            onUpdatePcb={(updatedPcb) => {
              recordHistory();
              setProject((p) => ({ ...p, pcb: updatedPcb }));
            }}
            is3DMode={true}
            isSimulating={isSimulating}
            simulationStates={simStates}
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

      {/* EI House Community Projects Showcase & Discovery Hub */}
      <CommunityProjectsModal
        isOpen={isCommunityModalOpen}
        onClose={() => setIsCommunityModalOpen(false)}
        onLoadProject={(proj) => {
          recordHistory();
          setProject(proj);
          setSelectedCompId(null);
          solverRef.current.reset();
          mcuRef.current.resetGpio();
          toast.success(`Loaded "${proj.title}"`);
        }}
        onOpenPublishModal={() => setIsShareModalOpen(true)}
        onForkProject={(proj: EngineeringProject) => {
          recordHistory();
          const forkedProj = {
            ...proj,
            id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            title: `${proj.title} (Fork)`,
          };
          setProject(forkedProj);
          setSelectedCompId(null);
          solverRef.current.reset();
          mcuRef.current.resetGpio();
          toast.success(`Forked "${proj.title}" to your workspace!`);
        }}
      />

      {/* Share, Direct Link & Web Publishing Modal */}
      <ShareProjectModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        project={project}
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
