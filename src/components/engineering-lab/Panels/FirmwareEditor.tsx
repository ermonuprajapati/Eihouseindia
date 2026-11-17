'use client';

import React, { useState } from 'react';
import { FirmwareState } from '@/modules/engineering-lab/types';
import { Code2, Play, Terminal, RefreshCw, Send } from 'lucide-react';

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
  const [serialInput, setSerialInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialInput.trim()) return;
    onSendSerialCommand(serialInput.trim());
    setSerialInput('');
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-[#070D18] text-slate-200 select-none overflow-hidden h-full">
      {/* Code Editor Column */}
      <div className="flex-1 flex flex-col border-r border-slate-800">
        {/* IDE Toolbar */}
        <div className="h-11 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-300">
              <Code2 className="w-4 h-4 text-purple-400" />
              <span>firmware.ino</span>
            </div>
            <select
              value={firmware.targetMcu}
              onChange={(e) => onUpdateFirmware({ ...firmware, targetMcu: e.target.value as 'ATmega328P' | 'ESP32' | 'RP2040' })}
              className="bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 px-2 py-1 rounded focus:outline-none"
            >
              <option value="ATmega328P">Arduino Uno (ATmega328P)</option>
              <option value="ESP32">ESP32 Dual-Core (Xtensa 240MHz)</option>
              <option value="RP2040">Raspberry Pi Pico (RP2040 ARM)</option>
            </select>
          </div>

          <button
            onClick={onFlashFirmware}
            disabled={isFlashing}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isFlashing
                ? 'bg-purple-800 text-purple-200 cursor-wait'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow'
            }`}
          >
            {isFlashing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Compiling & Flashing...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Compile & Flash MCU
              </>
            )}
          </button>
        </div>

        {/* Code Input */}
        <div className="flex-1 relative bg-[#050B14]">
          <textarea
            value={firmware.code}
            onChange={(e) => onUpdateFirmware({ ...firmware, code: e.target.value })}
            spellCheck={false}
            className="w-full h-full bg-transparent p-4 font-mono text-xs text-slate-200 resize-none focus:outline-none leading-relaxed selection:bg-purple-900 selection:text-white"
          />
        </div>
      </div>

      {/* Serial Monitor & GPIO Pinout Column */}
      <div className="w-full lg:w-96 flex flex-col bg-slate-950">
        {/* Serial Monitor Header */}
        <div className="h-11 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3">
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-300">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Virtual Serial Monitor (UART)</span>
          </div>
          <button
            onClick={onClearSerial}
            className="text-[10px] font-mono text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800"
          >
            Clear
          </button>
        </div>

        {/* Live Serial Logs */}
        <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-emerald-400/90 space-y-1 bg-black/40">
          {firmware.serialLog.length === 0 ? (
            <div className="text-slate-600 text-[11px] italic">No UART output. Flash firmware to begin execution.</div>
          ) : (
            firmware.serialLog.map((log, idx) => <div key={idx}>{log}</div>)
          )}
        </div>

        {/* Serial Send Bar */}
        <form onSubmit={handleSend} className="p-2 border-t border-slate-800 flex gap-1.5 bg-slate-900/60">
          <input
            type="text"
            value={serialInput}
            onChange={(e) => setSerialInput(e.target.value)}
            placeholder="Send UART string..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
          />
          <button
            type="submit"
            className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
            title="Send UART Data"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* GPIO Register States */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/80">
          <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold mb-2 flex items-center justify-between">
            <span>GPIO Register State</span>
            <span className="text-emerald-400">16MHz Clock OK</span>
          </div>

          <div className="grid grid-cols-7 gap-1 font-mono text-[9px] text-center">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((pin) => {
              const state = firmware.gpioStates[pin];
              const isHigh = state?.value === 1;

              return (
                <div
                  key={pin}
                  className={`p-1 rounded border ${
                    isHigh
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  <div>D{pin}</div>
                  <div className="text-[8px]">{isHigh ? 'HIGH' : 'LOW'}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
