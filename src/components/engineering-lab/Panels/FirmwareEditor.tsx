'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FirmwareState, FirmwareProjectFile, FirmwareDiagnostic } from '@/modules/engineering-lab/types';
import { TARGET_BOARDS, TargetBoardSpec } from '@/modules/engineering-lab/embedded-engine/board-definitions';
import { FirmwareCompiler, CompilationResult } from '@/modules/engineering-lab/embedded-engine/firmware-compiler';
import {
  Play,
  Pause,
  StepForward,
  RotateCcw,
  Terminal,
  RefreshCw,
  Send,
  FileCode,
  Plus,
  Trash2,
  Download,
  Usb,
  Cpu,
  Info,
  LineChart,
  Layers,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

interface FirmwareEditorProps {
  firmware: FirmwareState;
  onUpdateFirmware: (updated: FirmwareState) => void;
  onFlashFirmware: () => void;
  isFlashing: boolean;
  onSendSerialCommand: (cmd: string) => void;
  onClearSerial: () => void;
}

export function FirmwareEditor({
  firmware,
  onUpdateFirmware,
  onFlashFirmware,
  isFlashing,
  onSendSerialCommand,
  onClearSerial,
}: FirmwareEditorProps) {
  // Current Target Board
  const selectedBoardId = firmware.boardId || 'arduino-uno';
  const currentBoard: TargetBoardSpec =
    TARGET_BOARDS.find((b) => b.id === selectedBoardId) || TARGET_BOARDS[0];

  // Project Files
  const projectFiles: FirmwareProjectFile[] = firmware.projectFiles && firmware.projectFiles.length > 0
    ? firmware.projectFiles
    : [
        { name: 'sketch.ino', content: firmware.code || currentBoard.defaultSketch },
        { name: 'config.h', content: `// System Configuration Header\n#define SYSTEM_VERSION "1.0.0"\n#define SERIAL_BAUD 115200\n` },
      ];

  const activeFileName = firmware.activeFileName || projectFiles[0].name;
  const activeFile = projectFiles.find((f) => f.name === activeFileName) || projectFiles[0];

  // UI Tabs & Views
  const [rightTab, setRightTab] = useState<'serial' | 'plotter' | 'debug' | 'build' | 'board'>('serial');
  const [serialInput, setSerialInput] = useState('');
  const [baudRate, setBaudRate] = useState<number>(firmware.baudRate || 115200);
  const [isBoardInfoOpen, setIsBoardInfoOpen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // Web Serial Physical USB Connection State
  const [usbConnected, setUsbConnected] = useState(false);

  // Diagnostics & Build
  const [diagnostics, setDiagnostics] = useState<FirmwareDiagnostic[]>([]);
  const [buildLogs, setBuildLogs] = useState<string[]>(firmware.buildLogs || [
    `[INFO] Target: ${currentBoard.name} (${currentBoard.mcu})`,
    `[INFO] Ready to compile with ${currentBoard.supportedCompiler}`,
  ]);

  // Serial Plotter State
  const plotterCanvasRef = useRef<HTMLCanvasElement>(null);
  const plotterDataRef = useRef<{ [key: string]: number[] }>({});
  const serialEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll serial output
  useEffect(() => {
    if (autoScroll && serialEndRef.current) {
      serialEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [firmware.serialLog, autoScroll]);

  // Real-time syntax diagnostics
  useEffect(() => {
    const diags = FirmwareCompiler.validateSyntax(activeFile.content, activeFile.name);
    setDiagnostics(diags);
  }, [activeFile.content, activeFile.name]);

  // Update plotter when new serial log lines arrive
  useEffect(() => {
    if (firmware.serialLog.length === 0) return;
    const lastLine = firmware.serialLog[firmware.serialLog.length - 1];
    const points = FirmwareCompiler.parsePlotterLine(lastLine);
    if (points.length > 0) {
      points.forEach((p) => {
        if (!plotterDataRef.current[p.label]) {
          plotterDataRef.current[p.label] = [];
        }
        plotterDataRef.current[p.label].push(p.value);
        if (plotterDataRef.current[p.label].length > 100) {
          plotterDataRef.current[p.label].shift();
        }
      });
      renderPlotterCanvas();
    }
  }, [firmware.serialLog]);

  // Render Serial Plotter Canvas
  const renderPlotterCanvas = () => {
    const canvas = plotterCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background
    ctx.fillStyle = '#050B14';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = '#132338';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Colors for multiple traces
    const colors = ['#38BDF8', '#34D399', '#F59E0B', '#EC4899', '#A855F7'];
    const keys = Object.keys(plotterDataRef.current);

    if (keys.length === 0) {
      ctx.fillStyle = '#475569';
      ctx.font = '11px monospace';
      ctx.fillText('Awaiting numeric Serial output for waveform plot...', 20, height / 2);
      return;
    }

    // Determine scale across all points
    let minVal = Infinity;
    let maxVal = -Infinity;
    keys.forEach((k) => {
      plotterDataRef.current[k].forEach((v) => {
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      });
    });

    if (minVal === Infinity) {
      minVal = 0;
      maxVal = 100;
    }
    if (minVal === maxVal) {
      minVal -= 1;
      maxVal += 1;
    }

    const range = maxVal - minVal;

    // Plot traces
    keys.forEach((key, kIdx) => {
      const data = plotterDataRef.current[key];
      if (data.length < 2) return;

      const color = colors[kIdx % colors.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      const step = width / (data.length - 1);
      data.forEach((val, i) => {
        const x = i * step;
        const norm = (val - minVal) / range;
        const y = height - (norm * (height - 20) + 10);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Legend
      ctx.fillStyle = color;
      ctx.font = '10px monospace';
      ctx.fillText(`${key}: ${data[data.length - 1].toFixed(1)}`, 10 + kIdx * 80, 15);
    });
  };

  // Change Active Board
  const handleSelectBoard = (boardId: string) => {
    const board = TARGET_BOARDS.find((b) => b.id === boardId);
    if (!board) return;

    const updated = {
      ...firmware,
      boardId,
      targetMcu: board.mcu,
    };
    onUpdateFirmware(updated);
    toast.info(`Switched MCU target: ${board.name}`);
  };

  // Update Active File Code
  const handleCodeChange = (newCode: string) => {
    const updatedFiles = projectFiles.map((f) =>
      f.name === activeFileName ? { ...f, content: newCode } : f
    );
    onUpdateFirmware({
      ...firmware,
      code: activeFileName.endsWith('.ino') ? newCode : firmware.code,
      projectFiles: updatedFiles,
    });
  };

  // Add New File
  const handleAddFile = () => {
    const fileName = prompt('Enter new file name (e.g. sensor.h, motor.cpp):');
    if (!fileName || !fileName.trim()) return;
    const cleanName = fileName.trim();
    if (projectFiles.some((f) => f.name === cleanName)) {
      toast.error('A file with this name already exists.');
      return;
    }
    const updatedFiles = [...projectFiles, { name: cleanName, content: `// ${cleanName}\n` }];
    onUpdateFirmware({
      ...firmware,
      projectFiles: updatedFiles,
      activeFileName: cleanName,
    });
    toast.success(`Created ${cleanName}`);
  };

  // Delete File
  const handleDeleteFile = (fileName: string) => {
    if (fileName === 'sketch.ino') {
      toast.error('The main sketch.ino file cannot be deleted.');
      return;
    }
    const updatedFiles = projectFiles.filter((f) => f.name !== fileName);
    onUpdateFirmware({
      ...firmware,
      projectFiles: updatedFiles,
      activeFileName: updatedFiles[0].name,
    });
    toast.info(`Deleted ${fileName}`);
  };

  // Run Compilation
  const handleCompile = (): CompilationResult => {
    setRightTab('build');
    const result = FirmwareCompiler.compile(currentBoard, projectFiles);
    setBuildLogs(result.buildLogs);
    setDiagnostics(result.diagnostics);

    if (result.success && result.output) {
      toast.success(`Firmware compiled successfully for ${currentBoard.name}`);
      onUpdateFirmware({
        ...firmware,
        buildLogs: result.buildLogs,
        diagnostics: result.diagnostics,
        compiledOutput: result.output,
      });
    } else {
      toast.error(`Compilation failed with ${result.diagnostics.filter((d) => d.severity === 'error').length} error(s)`);
    }

    return result;
  };

  // Flash MCU Simulation
  const handleFlashAndRun = () => {
    if (!currentBoard.isExecutable) {
      toast.error(`Simulation is not supported for ${currentBoard.name}. Reason: ${currentBoard.limitations}`);
      return;
    }
    const compileRes = handleCompile();
    if (compileRes.success) {
      onFlashFirmware();
    }
  };

  // Download Compiled Binary
  const handleDownloadBinary = () => {
    const compileRes = handleCompile();
    if (!compileRes.success || !compileRes.output) {
      toast.error('Please fix compilation errors before downloading binary.');
      return;
    }

    const blob = new Blob([compileRes.output.payload], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `firmware_${currentBoard.id}${currentBoard.buildFormat}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded firmware${currentBoard.buildFormat}`);
  };

  // Physical Upload Workflow (Web Serial API)
  const handleConnectWebSerial = async () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) {
      toast.error('Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.');
      return;
    }

    try {
      // Request serial port
      const navSerial = (navigator as unknown as { serial: { requestPort: () => Promise<unknown> } }).serial;
      const port = await navSerial.requestPort();
      if (port) {
        setUsbConnected(true);
        toast.success('Connected to physical USB microcontroller board over Web Serial!');
      }
    } catch {
      toast.info('USB connection cancelled or device unavailable.');
    }
  };

  // Send Serial Line
  const handleSendSerial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialInput.trim()) return;
    onSendSerialCommand(serialInput.trim());
    setSerialInput('');
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-[#070D18] text-slate-200 select-none overflow-hidden h-full">
      {/* LEFT COLUMN: CODE EDITOR & PROJECT FILES */}
      <div className="flex-1 flex flex-col border-r border-slate-800 min-w-0">
        {/* Top IDE Toolbar */}
        <div className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 gap-2">
          {/* Board Selector & Specs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar touch-scroll">
            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-300">
              <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline text-slate-400">Board:</span>
            </div>

            <select
              value={selectedBoardId}
              onChange={(e) => handleSelectBoard(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 px-2.5 py-1 rounded focus:outline-none focus:border-emerald-500"
            >
              {TARGET_BOARDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {!b.isExecutable ? '(Build Only)' : ''}
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsBoardInfoOpen(true)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
              title="View Hardware Specs & Peripherals"
            >
              <Info className="w-4 h-4 text-sky-400" />
            </button>
          </div>

          {/* Action Buttons: Compile, Flash, Download */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCompile}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
              title="Compile and verify syntax"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Verify</span>
            </button>

            <button
              onClick={handleFlashAndRun}
              disabled={isFlashing}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                !currentBoard.isExecutable
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : isFlashing
                  ? 'bg-purple-800 text-purple-200 cursor-wait'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
              }`}
              title={
                !currentBoard.isExecutable
                  ? `Simulation disabled: ${currentBoard.limitations}`
                  : 'Compile and run virtual MCU'
              }
            >
              {isFlashing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Compiling...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Virtual MCU</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadBinary}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
              title={`Export compiled binary (${currentBoard.buildFormat})`}
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden xl:inline">Export {currentBoard.buildFormat}</span>
            </button>

            <button
              onClick={handleConnectWebSerial}
              className={`px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                usbConnected
                  ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Connect physical hardware board via Web Serial USB"
            >
              <Usb className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden md:inline">{usbConnected ? 'USB Online' : 'USB Upload'}</span>
            </button>
          </div>
        </div>

        {/* Project Files Tabs */}
        <div className="h-9 bg-[#091120] border-b border-slate-800 flex items-center justify-between px-2 overflow-x-auto no-scrollbar touch-scroll">
          <div className="flex items-center gap-1">
            {projectFiles.map((file) => (
              <div
                key={file.name}
                onClick={() => onUpdateFirmware({ ...firmware, activeFileName: file.name })}
                className={`group flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded cursor-pointer transition-colors ${
                  file.name === activeFileName
                    ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-500 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{file.name}</span>
                {file.name !== 'sketch.ino' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFile(file.name);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={handleAddFile}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-emerald-400 rounded hover:bg-slate-900 transition-colors"
              title="Add new header or source file"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New File</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-500 pr-2">
            Compiler: <span className="text-slate-400">{currentBoard.supportedCompiler.split(' ')[0]}</span>
          </div>
        </div>

        {/* Code Editor Body */}
        <div className="flex-1 relative flex bg-[#040812] overflow-hidden">
          {/* Line Numbers Gutter */}
          <div className="w-12 bg-[#060D1A] border-r border-slate-800/80 p-3 font-mono text-[11px] text-slate-600 select-none text-right">
            {activeFile.content.split('\n').map((_, idx) => {
              const lineNo = idx + 1;
              const hasErr = diagnostics.some((d) => d.line === lineNo && d.severity === 'error');
              return (
                <div key={idx} className="h-5 flex items-center justify-end gap-1">
                  {hasErr && <AlertCircle className="w-2.5 h-2.5 text-red-400 shrink-0" />}
                  <span className={hasErr ? 'text-red-400 font-bold' : ''}>{lineNo}</span>
                </div>
              );
            })}
          </div>

          {/* Textarea Code Input */}
          <textarea
            value={activeFile.content}
            onChange={(e) => handleCodeChange(e.target.value)}
            spellCheck={false}
            className="flex-1 h-full bg-transparent p-3 font-mono text-xs text-slate-200 resize-none focus:outline-none leading-5 selection:bg-emerald-950 selection:text-emerald-200 whitespace-pre overflow-auto"
          />
        </div>

        {/* Diagnostics Bar */}
        {diagnostics.length > 0 && (
          <div className="border-t border-slate-800 bg-slate-950 p-2 max-h-24 overflow-y-auto font-mono text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5 text-xs font-semibold mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Code Analysis Diagnostics ({diagnostics.length}):</span>
            </div>
            {diagnostics.map((d, i) => (
              <div
                key={i}
                className={`py-0.5 flex items-center gap-2 ${
                  d.severity === 'error' ? 'text-red-400' : 'text-amber-400'
                }`}
              >
                <span className="font-bold">[{d.severity.toUpperCase()}]</span>
                <span>
                  {d.file}:{d.line}:{d.column} - {d.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: SERIAL MONITOR, PLOTTER, REGISTERS, BUILD LOGS */}
      <div className="w-full lg:w-[460px] h-[340px] lg:h-auto flex flex-col bg-slate-950 border-t lg:border-t-0 border-slate-800 shrink-0">
        {/* Right Panel Tabs */}
        <div className="h-11 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRightTab('serial')}
              className={`px-2.5 py-1 text-xs font-mono rounded flex items-center gap-1.5 transition-colors ${
                rightTab === 'serial'
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Serial</span>
            </button>

            <button
              onClick={() => setRightTab('plotter')}
              className={`px-2.5 py-1 text-xs font-mono rounded flex items-center gap-1.5 transition-colors ${
                rightTab === 'plotter'
                  ? 'bg-slate-800 text-sky-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Plotter</span>
            </button>

            <button
              onClick={() => setRightTab('debug')}
              className={`px-2.5 py-1 text-xs font-mono rounded flex items-center gap-1.5 transition-colors ${
                rightTab === 'debug'
                  ? 'bg-slate-800 text-purple-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Registers</span>
            </button>

            <button
              onClick={() => setRightTab('build')}
              className={`px-2.5 py-1 text-xs font-mono rounded flex items-center gap-1.5 transition-colors ${
                rightTab === 'build'
                  ? 'bg-slate-800 text-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Build</span>
            </button>
          </div>

          <button
            onClick={() => setIsBoardInfoOpen(true)}
            className="text-xs text-slate-400 hover:text-emerald-400 font-mono px-2 py-0.5 rounded hover:bg-slate-800"
          >
            Specs
          </button>
        </div>

        {/* TAB 1: SERIAL MONITOR */}
        {rightTab === 'serial' && (
          <div className="flex-1 flex flex-col min-h-[300px]">
            {/* Monitor Controls */}
            <div className="p-2 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Baud:</span>
                <select
                  value={baudRate}
                  onChange={(e) => {
                    const b = Number(e.target.value);
                    setBaudRate(b);
                    onUpdateFirmware({ ...firmware, baudRate: b });
                  }}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-[11px] px-2 py-0.5 rounded"
                >
                  <option value={9600}>9600 baud</option>
                  <option value={19200}>19200 baud</option>
                  <option value={38400}>38400 baud</option>
                  <option value={57600}>57600 baud</option>
                  <option value={115200}>115200 baud</option>
                </select>

                <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer ml-1">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-emerald-500"
                  />
                  <span>Autoscroll</span>
                </label>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(firmware.serialLog.join('\n'));
                    toast.success('Copied Serial Log');
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                  title="Copy logs"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onClearSerial}
                  className="text-slate-400 hover:text-white px-2 py-0.5 rounded text-[11px] hover:bg-slate-800"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Serial Log Output */}
            <div className="flex-1 p-3 font-mono text-[11px] text-emerald-400 overflow-y-auto space-y-1 bg-[#050B14]">
              {firmware.serialLog.length === 0 ? (
                <div className="text-slate-600 italic">Virtual Serial buffer empty. Click &apos;Run Virtual MCU&apos; to begin.</div>
              ) : (
                firmware.serialLog.map((line, idx) => (
                  <div key={idx} className="leading-relaxed break-all">
                    {line}
                  </div>
                ))
              )}
              <div ref={serialEndRef} />
            </div>

            {/* Serial Input Sender */}
            <form onSubmit={handleSendSerial} className="p-2 border-t border-slate-800 flex gap-2 bg-slate-900/60">
              <input
                type="text"
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                placeholder="Send Serial command..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Send className="w-3 h-3" />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: SERIAL PLOTTER */}
        {rightTab === 'plotter' && (
          <div className="flex-1 flex flex-col p-3 bg-[#050B14] min-h-[300px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-sky-400 font-semibold flex items-center gap-1.5">
                <LineChart className="w-4 h-4" /> Real-time Graphical Serial Plotter
              </span>
              <button
                onClick={() => {
                  plotterDataRef.current = {};
                  renderPlotterCanvas();
                }}
                className="text-[11px] font-mono text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800"
              >
                Reset Plot
              </button>
            </div>
            <div className="flex-1 border border-slate-800 rounded-md overflow-hidden relative">
              <canvas
                ref={plotterCanvasRef}
                width={420}
                height={280}
                className="w-full h-full bg-[#050B14]"
              />
            </div>
            <div className="mt-2 text-[10px] font-mono text-slate-500">
              Format: print variables as comma-separated values (e.g. `Serial.println(val);` or `Serial.print(&apos;Temp:&apos;); Serial.println(25.4);`)
            </div>
          </div>
        )}

        {/* TAB 3: REGISTERS & DEBUGGER */}
        {rightTab === 'debug' && (
          <div className="flex-1 flex flex-col p-3 overflow-y-auto font-mono text-xs space-y-4 bg-[#050B14]">
            {/* MCU Execution Controls */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wide mb-2">
                Execution Controls
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateFirmware({ ...firmware, isRunning: !firmware.isRunning })}
                  className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    firmware.isRunning
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {firmware.isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{firmware.isRunning ? 'Pause' : 'Resume'}</span>
                </button>

                <button
                  onClick={() => {
                    onFlashFirmware();
                    toast.info('Stepped 1 cycle');
                  }}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium flex items-center gap-1 border border-slate-700"
                  title="Step 1 instruction cycle"
                >
                  <StepForward className="w-3.5 h-3.5" />
                  <span>Step</span>
                </button>

                <button
                  onClick={() => {
                    onUpdateFirmware({
                      ...firmware,
                      isRunning: false,
                      gpioStates: {},
                      serialLog: ['[MCU] Reset triggered'],
                    });
                    toast.info('MCU Reset');
                  }}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium flex items-center gap-1 border border-slate-700"
                  title="Reset MCU state"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Live GPIO Pinout Table */}
            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-2 flex items-center justify-between">
                <span>Hardware GPIO Pinout Status</span>
                <span className="text-[10px] text-emerald-400 font-normal">Active Pins</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto">
                {currentBoard.pinout.map((p) => {
                  const gpio = firmware.gpioStates ? firmware.gpioStates[p.pin] : undefined;
                  const isHigh = gpio?.value === 1;
                  return (
                    <div
                      key={String(p.pin)}
                      className="bg-slate-900 border border-slate-800/80 rounded p-1.5 flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isHigh ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-700'
                          }`}
                        />
                        <span className="text-slate-300 font-bold">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="text-slate-500">{gpio?.mode || 'INPUT'}</span>
                        <span className={`font-bold ${isHigh ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {isHigh ? 'HIGH' : 'LOW'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Architecture Details Card */}
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded text-[11px] space-y-1.5 text-slate-400">
              <div className="flex items-center justify-between">
                <div><strong className="text-slate-300">Core:</strong> {currentBoard.architecture}</div>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                  currentBoard.cpuEmulationLevel === 'high_level_api'
                    ? 'bg-blue-950 text-blue-400 border border-blue-800'
                    : currentBoard.cpuEmulationLevel === 'instruction_set_emulation'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                }`}>
                  {currentBoard.cpuEmulationLevel === 'high_level_api' ? 'High-Level API' : currentBoard.cpuEmulationLevel === 'instruction_set_emulation' ? 'Instruction Emulation' : 'CodeGen Target'}
                </span>
              </div>
              <div><strong className="text-slate-300">Runtime:</strong> {currentBoard.runtime}</div>
              <div><strong className="text-slate-300">Upload:</strong> {currentBoard.physicalUploadAvailability.replace(/_/g, ' ')}</div>
              <div><strong className="text-slate-300">Flash:</strong> {currentBoard.flashLabel} | <strong className="text-slate-300">SRAM:</strong> {currentBoard.ramLabel} | <strong className="text-slate-300">Clock:</strong> {currentBoard.clockMhz} MHz</div>
            </div>
          </div>
        )}

        {/* TAB 4: BUILD LOGS */}
        {rightTab === 'build' && (
          <div className="flex-1 p-3 bg-[#050B14] font-mono text-[11px] text-slate-300 overflow-y-auto space-y-1">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-semibold text-amber-400">
              <span>Compiler Pipeline Execution Trace</span>
              <button
                onClick={() => setBuildLogs([])}
                className="text-[10px] text-slate-500 hover:text-white"
              >
                Clear
              </button>
            </div>
            {buildLogs.map((log, idx) => {
              const isErr = log.includes('[ERROR]');
              const isSucc = log.includes('[SUCCESS]');
              const isWarn = log.includes('[WARNING]');
              return (
                <div
                  key={idx}
                  className={`leading-relaxed ${
                    isErr
                      ? 'text-red-400 font-bold'
                      : isSucc
                      ? 'text-emerald-400 font-bold'
                      : isWarn
                      ? 'text-amber-400'
                      : 'text-slate-300'
                  }`}
                >
                  {log}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: VERIFIED BOARD SPECIFICATION CARD */}
      {isBoardInfoOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1528] border border-slate-700 rounded-xl w-full max-w-xl shadow-2xl p-6 font-mono text-xs text-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">{currentBoard.name} Specifications</h3>
              </div>
              <button
                onClick={() => setIsBoardInfoOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <span className="text-slate-400">Board Definition:</span>
                <p className="text-slate-100 font-semibold mt-0.5">{currentBoard.name} ({currentBoard.mcu})</p>
              </div>

              <div>
                <span className="text-slate-400">CPU Architecture:</span>
                <p className="text-emerald-400 mt-0.5">{currentBoard.architecture}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                <div>
                  <span className="text-slate-400">Flash ROM (Verified):</span>
                  <p className="text-white font-bold">{currentBoard.flashLabel}</p>
                </div>
                <div>
                  <span className="text-slate-400">SRAM (Verified):</span>
                  <p className="text-white font-bold">{currentBoard.ramLabel}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-400">Supported Compiler & Target Toolchain:</span>
                <p className="text-sky-400 mt-0.5">{currentBoard.supportedCompiler}</p>
              </div>

              <div>
                <span className="text-slate-400">Execution Runtime & Emulation Level:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-slate-100 font-medium">{currentBoard.runtime}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    currentBoard.cpuEmulationLevel === 'high_level_api'
                      ? 'bg-blue-950 text-blue-400 border border-blue-800'
                      : currentBoard.cpuEmulationLevel === 'instruction_set_emulation'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}>
                    {currentBoard.cpuEmulationLevel === 'high_level_api' ? 'High-Level API (AST/Sandbox)' : currentBoard.cpuEmulationLevel === 'instruction_set_emulation' ? 'Instruction Set Emulation' : 'CodeGen / Flashing Target'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400">Firmware Build Format & Physical Upload:</span>
                <p className="text-purple-400 mt-0.5">
                  Build: <span className="font-bold">{currentBoard.buildFormat}</span> | Physical Upload: <span className="text-emerald-400 font-semibold">{currentBoard.physicalUploadAvailability.replace(/_/g, ' ')}</span>
                </p>
              </div>

              <div>
                <span className="text-slate-400">Supported Peripherals (In-Browser):</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentBoard.supportedPeripherals.map((periph, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                      {periph}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-amber-400 font-semibold">Unsupported / Non-Emulated Peripherals:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentBoard.unsupportedPeripherals.map((periph, i) => (
                    <span key={i} className="px-2 py-0.5 bg-amber-950/60 text-amber-300 border border-amber-900/60 rounded text-[10px]">
                      {periph}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-400">Simulation Engine:</span>
                <p className="text-slate-200 mt-0.5">{currentBoard.simulationEngine}</p>
              </div>

              <div>
                <span className="text-slate-400">In-Browser Executable Status:</span>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded font-bold text-[11px] ${
                      currentBoard.isExecutable
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                        : 'bg-red-950 text-red-400 border border-red-700'
                    }`}
                  >
                    {currentBoard.isExecutable ? '✓ EXECUTABLE IN-BROWSER' : '✗ DEVELOPMENT TARGET ONLY (NON-EXECUTABLE IN BROWSER)'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-900/80 rounded border border-slate-800 text-slate-400 text-[11px]">
                <strong className="text-amber-400">Verified Engine Limitations:</strong>
                <p className="mt-1 leading-relaxed">{currentBoard.limitations}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsBoardInfoOpen(false)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-xs transition-colors"
              >
                Close Specs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
