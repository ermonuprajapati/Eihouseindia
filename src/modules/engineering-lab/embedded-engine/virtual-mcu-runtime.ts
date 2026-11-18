import { FirmwareState } from '../types';
import { TARGET_BOARDS } from './board-definitions';

export interface McuExecutionResult {
  serialLines: string[];
  gpioUpdates: Record<string | number, { mode: 'INPUT' | 'OUTPUT'; value: 0 | 1; analogVal: number }>;
  executionError?: string;
}

export class VirtualMcuRuntime {
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private stepCount: number = 0;
  private setupExecuted: boolean = false;
  private serialBuffer: string[] = [];
  private gpio: Record<string | number, { mode: 'INPUT' | 'OUTPUT'; value: 0 | 1; analogVal: number }> = {};
  private millisClock: number = 0;
  private lastTickMs: number = Date.now();

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
  }

  public stop() {
    this.isRunning = false;
    this.isPaused = false;
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    this.isPaused = false;
  }

  public getGpioState(): Record<string | number, { mode: 'INPUT' | 'OUTPUT'; value: 0 | 1; analogVal: number }> {
    return { ...this.gpio };
  }

  public getSerialBuffer(): string[] {
    return [...this.serialBuffer];
  }

  /**
   * Executes a single evaluation cycle of the firmware code.
   */
  public executeCycle(
    firmware: FirmwareState,
    sensorContext?: { distanceCm?: number; temperatureC?: number; humidityPercent?: number; lightLux?: number; isPowered?: boolean }
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

    // Wokwi-style MCU power verification: halt firmware if unpowered
    if (sensorContext?.isPowered === false) {
      return {
        serialLines: ['[PWR] Board unpowered: Plug in USB Cable or DC Barrel Jack to start firmware execution.'],
        gpioUpdates: this.gpio,
      };
    }

    const now = Date.now();
    const dt = Math.min(50, Math.max(1, now - this.lastTickMs));
    this.lastTickMs = now;
    this.millisClock += dt;
    this.stepCount++;

    const serialOut: string[] = [];
    const pendingGpio = { ...this.gpio };
    const currentDistance = sensorContext?.distanceCm ?? 45.0;

    // Built-in sandboxed Arduino / C++ execution context
    const sandbox = {
      HIGH: 1,
      LOW: 0,
      INPUT: 'INPUT',
      OUTPUT: 'OUTPUT',
      INPUT_PULLUP: 'INPUT',
      LED_BUILTIN: 13,
      A0: 'A0',
      A1: 'A1',
      A2: 'A2',
      A3: 'A3',
      A4: 'A4',
      A5: 'A5',
      millis: () => this.millisClock,
      micros: () => this.millisClock * 1000,
      delay: () => {
        // Virtual delay step
      },
      delayMicroseconds: () => {
        // Virtual delay
      },
      pinMode: (pin: number | string, mode: 'INPUT' | 'OUTPUT') => {
        const key = String(pin);
        if (!pendingGpio[key]) pendingGpio[key] = { mode, value: 0, analogVal: 0 };
        pendingGpio[key].mode = mode;
      },
      digitalWrite: (pin: number | string, val: 0 | 1 | boolean | number) => {
        const key = String(pin);
        if (!pendingGpio[key]) pendingGpio[key] = { mode: 'OUTPUT', value: 0, analogVal: 0 };
        pendingGpio[key].value = val === 1 || Boolean(val) ? 1 : 0;
      },
      digitalRead: (pin: number | string): number => {
        const key = String(pin);
        return pendingGpio[key] ? pendingGpio[key].value : 0;
      },
      analogRead: (pin: number | string): number => {
        const key = String(pin);
        return pendingGpio[key] ? pendingGpio[key].analogVal : 0;
      },
      analogWrite: (pin: number | string, val: number) => {
        const key = String(pin);
        if (!pendingGpio[key]) pendingGpio[key] = { mode: 'OUTPUT', value: 0, analogVal: 0 };
        pendingGpio[key].analogVal = Math.max(0, Math.min(255, val));
        pendingGpio[key].value = val > 127 ? 1 : 0;
      },
      pulseIn: () => {
        // HC-SR04 ultrasonic echo timing: duration (µs) = distance (cm) * 58.82
        return Math.round(currentDistance * 58.82);
      },
      map: (x: number, in_min: number, in_max: number, out_min: number, out_max: number) => {
        return Math.round(((x - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min);
      },
      constrain: (amt: number, low: number, high: number) => {
        return Math.max(low, Math.min(high, amt));
      },
      Serial: {
        begin: (baud: number) => {
          serialOut.push(`[UART] Initialized Serial at ${baud} baud`);
        },
        println: (val: unknown) => {
          serialOut.push(`[${Math.floor(this.millisClock)}ms] ${String(val)}`);
        },
        print: (val: unknown) => {
          serialOut.push(`[${Math.floor(this.millisClock)}ms] ${String(val)}`);
        },
        available: () => 0,
        read: () => -1,
      },
      Math,
    };

    try {
      const jsCode = firmware.code;

      const setupMatch = jsCode.match(/void\s+setup\s*\(\s*\)\s*\{([\s\S]*?)\n\s*\}/);
      const loopMatch = jsCode.match(/void\s+loop\s*\(\s*\)\s*\{([\s\S]*?)\n\s*\}/);

      if (setupMatch || loopMatch) {
        let globalsCode = jsCode
          .replace(/void\s+setup\s*\(\s*\)\s*\{[\s\S]*?\n\s*\}/g, '')
          .replace(/void\s+loop\s*\(\s*\)\s*\{[\s\S]*?\n\s*\}/g, '');
        globalsCode = this.transpileArduinoToJs(globalsCode);

        const setupBody = setupMatch ? this.transpileArduinoToJs(setupMatch[1]) : '';
        const loopBody = loopMatch ? this.transpileArduinoToJs(loopMatch[1]) : '';

        const fullProgram = `
          ${globalsCode}
          if (!__isSetupDone) {
            ${setupBody}
          }
          ${loopBody}
        `;

        const runnerFn = new Function(
          'pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'pulseIn', 'map', 'constrain',
          'delay', 'delayMicroseconds', 'millis', 'micros', 'Serial', 'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP',
          'LED_BUILTIN', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'Math',
          '__isSetupDone',
          fullProgram
        );

        runnerFn(
          sandbox.pinMode, sandbox.digitalWrite, sandbox.digitalRead, sandbox.analogRead, sandbox.analogWrite, sandbox.pulseIn, sandbox.map, sandbox.constrain,
          sandbox.delay, sandbox.delayMicroseconds, sandbox.millis, sandbox.micros, sandbox.Serial,
          sandbox.HIGH, sandbox.LOW, sandbox.INPUT, sandbox.OUTPUT, sandbox.INPUT_PULLUP,
          sandbox.LED_BUILTIN, sandbox.A0, sandbox.A1, sandbox.A2, sandbox.A3, sandbox.A4, sandbox.A5, sandbox.Math,
          this.setupExecuted
        );
        this.setupExecuted = true;
      } else {
        const transCode = this.transpileArduinoToJs(jsCode);
        const scriptFn = new Function(
          'pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'pulseIn', 'map', 'constrain',
          'delay', 'delayMicroseconds', 'millis', 'micros', 'Serial', 'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP',
          'LED_BUILTIN', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'Math',
          transCode
        );
        scriptFn(
          sandbox.pinMode, sandbox.digitalWrite, sandbox.digitalRead, sandbox.analogRead, sandbox.analogWrite, sandbox.pulseIn, sandbox.map, sandbox.constrain,
          sandbox.delay, sandbox.delayMicroseconds, sandbox.millis, sandbox.micros, sandbox.Serial,
          sandbox.HIGH, sandbox.LOW, sandbox.INPUT, sandbox.OUTPUT, sandbox.INPUT_PULLUP,
          sandbox.LED_BUILTIN, sandbox.A0, sandbox.A1, sandbox.A2, sandbox.A3, sandbox.A4, sandbox.A5, sandbox.Math
        );
      }

      this.gpio = pendingGpio;
      this.serialBuffer.push(...serialOut);
      if (this.serialBuffer.length > 200) {
        this.serialBuffer = this.serialBuffer.slice(-200);
      }

      return {
        serialLines: serialOut,
        gpioUpdates: this.gpio,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Firmware execution runtime fault';
      return {
        serialLines: serialOut,
        gpioUpdates: this.gpio,
        executionError: errMsg,
      };
    }
  }

  private transpileArduinoToJs(cCode: string): string {
    return cCode
      .replace(/#define\s+([A-Za-z0-9_]+)\s+([^\n]+)/g, 'const $1 = $2;')
      .replace(/#include\s+<[^>]+>/g, '// include')
      .replace(/#include\s+"[^"]+"/g, '// include')
      .replace(/\bconst\s+(volatile\s+)?(unsigned\s+)?(long|int|short|char|byte|float|double|bool|boolean)\s+/g, 'const ')
      .replace(/\b(volatile\s+)?(unsigned\s+)?(long|int|short|char|byte|float|double|bool|boolean)\s+/g, 'var ')
      .replace(/Serial\.println\s*\(/g, 'Serial.println(')
      .replace(/Serial\.print\s*\(/g, 'Serial.print(');
  }
}
