import { FirmwareState } from '../types';
import { TARGET_BOARDS } from './board-definitions';

export interface GpioState {
  mode: 'INPUT' | 'OUTPUT';
  value: 0 | 1;
  analogVal: number;
}

export interface McuExecutionResult {
  serialLines: string[];
  gpioUpdates: Record<string | number, GpioState>;
  executionError?: string;
}

export interface SensorContext {
  distanceCm?: number;
  temperatureC?: number;
  humidityPercent?: number;
  lightLux?: number;
  isPowered?: boolean;
  pinVoltages?: Record<string, number>;
}

export class VirtualMcuRuntime {
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private stepCount: number = 0;
  private setupExecuted: boolean = false;
  private serialBuffer: string[] = [];
  private gpio: Record<string | number, GpioState> = {};
  private millisClock: number = 0;
  private lastTickMs: number = Date.now();

  // PASS 4 Closed-Loop, Generator Delay & Program Cache
  private pullupPins: Set<string> = new Set();
  private delayUntilMs: number = 0;
  private activeLoopGen: Generator<number, void, unknown> | null = null;
  private cachedCode: string = '';
  private compiledProgram: {
    runSetup: () => void;
    runLoop: () => Generator<number, void, unknown>;
  } | null = null;

  // Active execution cycle context shared with sandbox delegates
  private activePendingGpio: Record<string | number, GpioState> = {};
  private activeSerialOut: string[] = [];
  private activeSensorContext?: SensorContext;
  private activeLogicV: number = 5.0;
  private activeAdcMax: number = 1023;

  constructor() {
    this.resetGpio();
  }

  public resetGpio() {
    this.gpio = {};
    for (let p = 0; p <= 13; p++) {
      this.gpio[p] = { mode: 'INPUT', value: 0, analogVal: 0 };
    }
    // Analog pins
    for (let a = 0; a <= 7; a++) {
      this.gpio[`A${a}`] = { mode: 'INPUT', value: 0, analogVal: 0 };
    }
    this.serialBuffer = [];
    this.millisClock = 0;
    this.setupExecuted = false;
    this.stepCount = 0;
    this.pullupPins.clear();
    this.delayUntilMs = 0;
    this.activeLoopGen = null;
    this.cachedCode = '';
    this.compiledProgram = null;
  }

  public stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.activeLoopGen = null;
    this.delayUntilMs = 0;
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    this.isPaused = false;
  }

  public getGpioState(): Record<string | number, GpioState> {
    return { ...this.gpio };
  }

  public getSerialBuffer(): string[] {
    return [...this.serialBuffer];
  }

  private stripCommentsAndStrings(code: string): string {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/[^\n]*/g, ' ')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``');
  }

  private extractVoidFunction(code: string, name: 'setup' | 'loop'): { body: string; start: number; end: number } | null {
    const headerRegex = new RegExp(`\\bvoid\\s+${name}\\s*\\(\\s*\\)\\s*\\{`, 'g');
    let match: RegExpExecArray | null = null;
    while ((match = headerRegex.exec(code)) !== null) {
      const braceStart = match.index + match[0].length - 1;
      let depth = 1;
      let i = braceStart + 1;
      let inLineComment = false;
      let inBlockComment = false;
      let inString: string | null = null;

      while (i < code.length && depth > 0) {
        const ch = code[i];
        const next = code[i + 1];

        if (inLineComment) {
          if (ch === '\n') inLineComment = false;
        } else if (inBlockComment) {
          if (ch === '*' && next === '/') {
            inBlockComment = false;
            i++;
          }
        } else if (inString) {
          if (ch === '\\') {
            i++;
          } else if (ch === inString) {
            inString = null;
          }
        } else {
          if (ch === '/' && next === '/') {
            inLineComment = true;
            i++;
          } else if (ch === '/' && next === '*') {
            inBlockComment = true;
            i++;
          } else if (ch === '"' || ch === "'" || ch === '`') {
            inString = ch;
          } else if (ch === '{') {
            depth++;
          } else if (ch === '}') {
            depth--;
            if (depth === 0) {
              return {
                body: code.slice(braceStart + 1, i),
                start: match.index,
                end: i + 1,
              };
            }
          }
        }
        i++;
      }
    }
    return null;
  }

  private transpileArduinoToJs(cCode: string): string {
    const cleanParams = (paramsStr: string) => {
      return paramsStr.replace(
        /\b(void|int|float|double|char|bool|boolean|long|byte|size_t|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|String)\s+([A-Za-z0-9_]+)/g,
        '$2'
      );
    };

    let code = cCode
      .replace(/#define\s+([A-Za-z0-9_]+)\s+([^\n]+)/g, 'const $1 = $2;')
      .replace(/#include\s+[<"][^>"]+[>"]/g, '// include')
      .replace(/\b(\d+(\.\d+)?)f\b/g, '$1');

    // Typed helper functions outside setup/loop: returnType fnName(params) { -> function fnName(params) {
    code = code.replace(
      /\b(void|int|float|double|char|bool|boolean|long|byte|size_t|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|String)\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*\{/g,
      (_, _ret, fnName, params) => `function ${fnName}(${cleanParams(params)}) {`
    );

    // Initialized C++ arrays: int leds[] = {1, 2, 3}; -> var leds = [1, 2, 3];
    code = code.replace(
      /\b(const\s+)?(unsigned\s+)?(uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|String|long|int|short|char|byte|float|double|bool|boolean)\s+([A-Za-z0-9_]+)\s*\[\s*\d*\s*\]\s*=\s*\{([^}]+)\};/g,
      (_, isConst, _unsigned, _type, arrName, elements) => `${isConst ? 'const' : 'var'} ${arrName} = [${elements}];`
    );

    // Uninitialized C++ arrays: int buf[16]; -> var buf = new Array(16).fill(0);
    code = code.replace(
      /\b(const\s+)?(unsigned\s+)?(uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|String|long|int|short|char|byte|float|double|bool|boolean)\s+([A-Za-z0-9_]+)\s*\[\s*(\d+)\s*\]\s*;/g,
      (_, isConst, _unsigned, _type, arrName, size) => `${isConst ? 'const' : 'var'} ${arrName} = new Array(${size}).fill(0);`
    );

    // Variable declaration types
    code = code
      .replace(/\bconst\s+(volatile\s+)?(unsigned\s+)?(uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|String|long|int|short|char|byte|float|double|bool|boolean)\s+/g, 'const ')
      .replace(/\b(volatile\s+)?(unsigned\s+)?(uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|String|long|int|short|char|byte|float|double|bool|boolean)\s+/g, 'var ')
      .replace(/Serial\.println\s*\(/g, 'Serial.println(')
      .replace(/Serial\.print\s*\(/g, 'Serial.print(');

    // Loop watchdog guard injection
    const GUARD_STMT = ' if (++__ops > 50000) throw new Error("Execution halted: Infinite loop or excessive CPU cycles detected"); ';
    code = code
      .replace(/\bwhile\s*\(([^)]+)\)\s*\{/g, `while ($1) {${GUARD_STMT}`)
      .replace(/\bfor\s*\(([^)]+)\)\s*\{/g, `for ($1) {${GUARD_STMT}`)
      .replace(/\bdo\s*\{/g, `do {${GUARD_STMT}`);

    return code;
  }

  private createSandboxDelegates() {
    return {
      HIGH: 1,
      LOW: 0,
      INPUT: 'INPUT' as const,
      OUTPUT: 'OUTPUT' as const,
      INPUT_PULLUP: 'INPUT_PULLUP' as const,
      LED_BUILTIN: 13,
      A0: 'A0',
      A1: 'A1',
      A2: 'A2',
      A3: 'A3',
      A4: 'A4',
      A5: 'A5',
      millis: () => this.millisClock,
      micros: () => this.millisClock * 1000,
      delay: (ms: number) => {
        this.millisClock += Math.max(0, Number(ms) || 0);
      },
      delayMicroseconds: (us: number) => {
        this.millisClock += Math.max(0, (Number(us) || 0) / 1000);
      },
      pinMode: (pin: number | string, mode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP') => {
        const key = String(pin);
        const isPullup = mode === 'INPUT_PULLUP';
        if (isPullup) {
          this.pullupPins.add(key);
        } else {
          this.pullupPins.delete(key);
        }
        const effectiveMode: 'INPUT' | 'OUTPUT' = mode === 'OUTPUT' ? 'OUTPUT' : 'INPUT';
        if (!this.activePendingGpio[key]) {
          this.activePendingGpio[key] = { mode: effectiveMode, value: isPullup ? 1 : 0, analogVal: 0 };
        } else {
          this.activePendingGpio[key].mode = effectiveMode;
          if (isPullup) this.activePendingGpio[key].value = 1;
        }
      },
      digitalWrite: (pin: number | string, val: 0 | 1 | boolean | number) => {
        const key = String(pin);
        if (!this.activePendingGpio[key]) {
          this.activePendingGpio[key] = { mode: 'OUTPUT', value: 0, analogVal: 0 };
        }
        this.activePendingGpio[key].value = val === 1 || Boolean(val) ? 1 : 0;
        this.activePendingGpio[key].analogVal = 0;
      },
      digitalRead: (pin: number | string): number => {
        const key = String(pin);
        if (this.activePendingGpio[key]?.mode !== 'OUTPUT') {
          const pinVoltages = this.activeSensorContext?.pinVoltages;
          if (pinVoltages) {
            const stripped = key.replace(/^[D|GP|GPIO]/i, '');
            const candidates = [key, `D${key}`, `GP${key}`, `GPIO${key}`, stripped];
            for (const c of candidates) {
              if (pinVoltages[c] !== undefined) {
                return pinVoltages[c] >= this.activeLogicV * 0.6 ? 1 : 0;
              }
            }
          }
          if (this.pullupPins.has(key) || this.pullupPins.has(key.replace(/^[D|GP|GPIO]/i, ''))) {
            return 1;
          }
        }
        return this.activePendingGpio[key] ? this.activePendingGpio[key].value : 0;
      },
      analogRead: (pin: number | string): number => {
        const key = String(pin);
        const pinVoltages = this.activeSensorContext?.pinVoltages;
        if (pinVoltages) {
          const stripped = key.replace(/^[A|pin_A|pin]/i, '');
          const candidates = [key, `A${key}`, `A${stripped}`, stripped, `pin_${key}`, `pin${key}`];
          for (const c of candidates) {
            if (pinVoltages[c] !== undefined) {
              const v = pinVoltages[c];
              return Math.round((Math.max(0, Math.min(this.activeLogicV, v)) / this.activeLogicV) * this.activeAdcMax);
            }
          }
        }
        return this.activePendingGpio[key] ? this.activePendingGpio[key].analogVal : 0;
      },
      analogWrite: (pin: number | string, val: number) => {
        const key = String(pin);
        if (!this.activePendingGpio[key]) {
          this.activePendingGpio[key] = { mode: 'OUTPUT', value: 0, analogVal: 0 };
        }
        const clamped = Math.max(0, Math.min(255, Number(val) || 0));
        this.activePendingGpio[key].analogVal = clamped;
        this.activePendingGpio[key].value = clamped > 127 ? 1 : 0;
      },
      pulseIn: () => {
        const currentDistance = this.activeSensorContext?.distanceCm ?? 45.0;
        return Math.round(currentDistance * 58.82);
      },
      map: (x: number, in_min: number, in_max: number, out_min: number, out_max: number) => {
        if (in_max === in_min) return out_min;
        return Math.round(((x - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min);
      },
      constrain: (amt: number, low: number, high: number) => {
        return Math.max(low, Math.min(high, amt));
      },
      Serial: {
        begin: (baud: number) => {
          this.activeSerialOut.push(`[UART] Initialized Serial at ${baud} baud`);
        },
        println: (val: unknown) => {
          this.activeSerialOut.push(`[${Math.floor(this.millisClock)}ms] ${String(val)}`);
        },
        print: (val: unknown) => {
          this.activeSerialOut.push(`[${Math.floor(this.millisClock)}ms] ${String(val)}`);
        },
        available: () => 0,
        read: () => -1,
      },
      Math,
    };
  }

  private compileProgram(code: string): {
    runSetup: () => void;
    runLoop: () => Generator<number, void, unknown>;
  } {
    const setupMatch = this.extractVoidFunction(code, 'setup');
    const loopMatch = this.extractVoidFunction(code, 'loop');

    let globalsCode = code;
    let setupBody = '';
    let loopBody = '';

    if (setupMatch || loopMatch) {
      const ranges: { start: number; end: number }[] = [];
      if (setupMatch) ranges.push({ start: setupMatch.start, end: setupMatch.end });
      if (loopMatch) ranges.push({ start: loopMatch.start, end: loopMatch.end });
      ranges.sort((a, b) => b.start - a.start);

      for (const r of ranges) {
        globalsCode = globalsCode.slice(0, r.start) + '\n' + globalsCode.slice(r.end);
      }

      setupBody = setupMatch ? this.transpileArduinoToJs(setupMatch.body) : '';
      loopBody = loopMatch
        ? this.transpileArduinoToJs(loopMatch.body)
            .replace(/\bdelay\s*\(([^)]+)\)\s*;?/g, 'yield (Number($1) || 0);')
            .replace(/\bdelayMicroseconds\s*\(([^)]+)\)\s*;?/g, 'yield Math.max(0, (Number($1) || 0) / 1000);')
        : '';
    } else {
      globalsCode = '';
      setupBody = '';
      loopBody = this.transpileArduinoToJs(code)
        .replace(/\bdelay\s*\(([^)]+)\)\s*;?/g, 'yield (Number($1) || 0);')
        .replace(/\bdelayMicroseconds\s*\(([^)]+)\)\s*;?/g, 'yield Math.max(0, (Number($1) || 0) / 1000);');
    }

    const transpiledGlobals = this.transpileArduinoToJs(globalsCode);

    const SHADOWED_GLOBALS = [
      'window', 'document', 'globalThis', 'self',
      'localStorage', 'sessionStorage', 'fetch',
      'XMLHttpRequest', 'WebSocket', 'Function',
    ];

    const SANDBOX_PARAMS = [
      'pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'pulseIn', 'map', 'constrain',
      'delay', 'delayMicroseconds', 'millis', 'micros', 'Serial', 'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP',
      'LED_BUILTIN', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'Math',
    ];

    const factoryBody = `
      "use strict";
      let __ops = 0;
      ${transpiledGlobals}

      function __runSetup() {
        let __ops = 0;
        ${setupBody}
      }

      function* __runLoop() {
        let __ops = 0;
        ${loopBody}
      }

      return {
        runSetup: __runSetup,
        runLoop: __runLoop,
      };
    `;

    const factoryFn = new Function(
      ...SANDBOX_PARAMS,
      ...SHADOWED_GLOBALS,
      factoryBody
    );

    const sandbox = this.createSandboxDelegates();
    const shadowedArgs = new Array(SHADOWED_GLOBALS.length).fill(undefined);

    const program = factoryFn(
      sandbox.pinMode, sandbox.digitalWrite, sandbox.digitalRead, sandbox.analogRead, sandbox.analogWrite, sandbox.pulseIn, sandbox.map, sandbox.constrain,
      sandbox.delay, sandbox.delayMicroseconds, sandbox.millis, sandbox.micros, sandbox.Serial,
      sandbox.HIGH, sandbox.LOW, sandbox.INPUT, sandbox.OUTPUT, sandbox.INPUT_PULLUP,
      sandbox.LED_BUILTIN, sandbox.A0, sandbox.A1, sandbox.A2, sandbox.A3, sandbox.A4, sandbox.A5, sandbox.Math,
      ...shadowedArgs
    );

    return program;
  }

  /**
   * Executes a single evaluation cycle of the firmware code.
   */
  public executeCycle(
    firmware: FirmwareState,
    sensorContext?: { distanceCm?: number; temperatureC?: number; humidityPercent?: number; lightLux?: number; isPowered?: boolean; pinVoltages?: Record<string, number> }
  ): McuExecutionResult {
    // Check board executability
    const boardId = firmware.boardId || 'arduino-uno';
    const boardSpec = TARGET_BOARDS.find((b) => b.id === boardId);

    if (boardSpec && !boardSpec.isExecutable) {
      return {
        serialLines: [`[ERROR] Execution halted: ${boardSpec.name} is marked non-executable in browser.`],
        gpioUpdates: this.gpio,
        executionError: `Simulation is disabled for ${boardSpec.name}. Target does not have a verified in-browser cycle-accurate simulation engine. Use this board for code generation, syntax diagnostics, and downloadable ${boardSpec.buildFormat} firmware flashing.`,
      };
    }

    // EI House Lab MCU power verification: halt firmware if unpowered
    if (sensorContext?.isPowered === false) {
      return {
        serialLines: ['[PWR] Board unpowered: Plug in USB Cable or DC Barrel Jack to start firmware execution.'],
        gpioUpdates: this.gpio,
      };
    }

    // Hard Security Sandbox Seal
    const rawCode = firmware.code || '';
    const codeNoCommentsOrStrings = this.stripCommentsAndStrings(rawCode);
    const securityMatch = codeNoCommentsOrStrings.match(
      /\b(window|document|globalThis|self|localStorage|sessionStorage|indexedDB|cookie|fetch|XMLHttpRequest|WebSocket|EventSource|navigator|location|history|eval|Function|constructor|__proto__|prototype|import|require|process)\b/
    );
    if (securityMatch) {
      const token = securityMatch[0];
      const errMsg = `[SECURITY] Blocked disallowed browser/JS API in firmware code: ${token}`;
      return {
        serialLines: [errMsg],
        gpioUpdates: this.gpio,
        executionError: errMsg,
      };
    }

    const now = Date.now();
    const dt = Math.min(50, Math.max(1, now - this.lastTickMs));
    this.lastTickMs = now;
    this.millisClock += dt;
    this.stepCount++;

    const is3v3 = /esp32|rp2040|rp2350|pico|stm32/i.test(boardId);
    this.activeLogicV = is3v3 ? 3.3 : 5.0;
    this.activeAdcMax = is3v3 ? 4095 : 1023;
    this.activePendingGpio = { ...this.gpio };
    this.activeSerialOut = [];
    this.activeSensorContext = sensorContext;

    try {
      // Non-blocking delay check: hold state while delay timer has not elapsed
      if (this.millisClock < this.delayUntilMs) {
        return {
          serialLines: [],
          gpioUpdates: this.gpio,
        };
      }

      // Compile/instantiate program if changed or uninitialized
      if (!this.compiledProgram || this.cachedCode !== firmware.code) {
        this.cachedCode = firmware.code;
        this.compiledProgram = null;
        this.activeLoopGen = null;
        this.delayUntilMs = 0;
        this.setupExecuted = false;
        this.compiledProgram = this.compileProgram(firmware.code);
      }

      if (!this.setupExecuted) {
        this.compiledProgram.runSetup();
        this.setupExecuted = true;
      }

      if (!this.activeLoopGen) {
        this.activeLoopGen = this.compiledProgram.runLoop();
      }

      const step = this.activeLoopGen.next();
      if (step.done) {
        this.activeLoopGen = null;
      } else if (typeof step.value === 'number' && step.value > 0) {
        this.delayUntilMs = this.millisClock + step.value;
      }

      this.gpio = this.activePendingGpio;
      if (this.activeSerialOut.length > 0) {
        this.serialBuffer.push(...this.activeSerialOut);
        if (this.serialBuffer.length > 200) {
          this.serialBuffer = this.serialBuffer.slice(-200);
        }
      }

      return {
        serialLines: this.activeSerialOut,
        gpioUpdates: this.gpio,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Firmware execution runtime fault';
      const serialErr = `[RUNTIME ERROR] ${errMsg}`;
      this.activeSerialOut.push(serialErr);
      this.serialBuffer.push(serialErr);
      this.activeLoopGen = null;
      return {
        serialLines: this.activeSerialOut,
        gpioUpdates: this.gpio,
        executionError: errMsg,
      };
    }
  }
}
