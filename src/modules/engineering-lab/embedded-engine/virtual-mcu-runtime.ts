import { FirmwareState } from '../types';

export interface McuExecutionResult {
  serialLines: string[];
  gpioUpdates: Record<number, { mode: 'INPUT' | 'OUTPUT'; value: 0 | 1; analogVal: number }>;
  executionError?: string;
}

export class VirtualMcuRuntime {
  private isRunning: boolean = false;
  private loopIntervalId: ReturnType<typeof setInterval> | null = null;
  private setupExecuted: boolean = false;
  private serialBuffer: string[] = [];
  private gpio: Record<number, { mode: 'INPUT' | 'OUTPUT'; value: 0 | 1; analogVal: number }> = {};
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
    this.serialBuffer = [];
    this.millisClock = 0;
    this.setupExecuted = false;
  }

  public stop() {
    this.isRunning = false;
    if (this.loopIntervalId) {
      clearInterval(this.loopIntervalId);
      this.loopIntervalId = null;
    }
  }

  public getGpioState(): Record<number, { mode: 'INPUT' | 'OUTPUT'; value: 0 | 1; analogVal: number }> {
    return { ...this.gpio };
  }

  public getSerialBuffer(): string[] {
    return [...this.serialBuffer];
  }

  /**
   * Executes a single evaluation slice of the user's firmware code
   */
  public executeCycle(firmware: FirmwareState): McuExecutionResult {
    const now = Date.now();
    const dt = now - this.lastTickMs;
    this.lastTickMs = now;
    this.millisClock += dt;

    const serialOut: string[] = [];
    const pendingGpio: Record<number, { mode: 'INPUT' | 'OUTPUT'; value: 0 | 1; analogVal: number }> = { ...this.gpio };

    // Built-in sandboxed Arduino execution context
    const sandbox = {
      HIGH: 1,
      LOW: 0,
      INPUT: 'INPUT',
      OUTPUT: 'OUTPUT',
      LED_BUILTIN: 13,
      millis: () => this.millisClock,
      delay: () => {
        // Virtual delay
      },
      pinMode: (pin: number, mode: 'INPUT' | 'OUTPUT') => {
        if (!pendingGpio[pin]) pendingGpio[pin] = { mode, value: 0, analogVal: 0 };
        pendingGpio[pin].mode = mode;
      },
      digitalWrite: (pin: number, val: 0 | 1 | boolean | number) => {
        if (!pendingGpio[pin]) pendingGpio[pin] = { mode: 'OUTPUT', value: 0, analogVal: 0 };
        pendingGpio[pin].value = val === 1 || Boolean(val) ? 1 : 0;
      },
      digitalRead: (pin: number): number => {
        return pendingGpio[pin] ? pendingGpio[pin].value : 0;
      },
      analogRead: (pin: number): number => {
        return pendingGpio[pin] ? pendingGpio[pin].analogVal : 0;
      },
      analogWrite: (pin: number, val: number) => {
        if (!pendingGpio[pin]) pendingGpio[pin] = { mode: 'OUTPUT', value: 0, analogVal: 0 };
        pendingGpio[pin].analogVal = Math.max(0, Math.min(255, val));
        pendingGpio[pin].value = val > 127 ? 1 : 0;
      },
      Serial: {
        begin: (baud: number) => {
          serialOut.push(`[UART] Initialized Serial at ${baud} baud`);
        },
        println: (val: unknown) => {
          const str = String(val);
          serialOut.push(`[${Math.floor(this.millisClock)}ms] ${str}`);
        },
        print: (val: unknown) => {
          const str = String(val);
          serialOut.push(`[${Math.floor(this.millisClock)}ms] ${str}`);
        },
      },
    };

    try {
      // Parse Arduino C-style code into executable JavaScript functions
      // Replaces standard Arduino C constructs (void setup(), void loop(), int, float) with JS syntax
      const jsCode = firmware.code;

      // Extract setup and loop function bodies
      const setupMatch = jsCode.match(/void\s+setup\s*\(\s*\)\s*\{([\s\S]*?)\n\}/);
      const loopMatch = jsCode.match(/void\s+loop\s*\(\s*\)\s*\{([\s\S]*?)\n\}/);

      if (setupMatch || loopMatch) {
        const setupBody = setupMatch ? this.transpileArduinoToJs(setupMatch[1]) : '';
        const loopBody = loopMatch ? this.transpileArduinoToJs(loopMatch[1]) : '';

        if (!this.setupExecuted) {
          const setupFn = new Function(
            'pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite',
            'delay', 'millis', 'Serial', 'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'LED_BUILTIN',
            setupBody
          );
          setupFn(
            sandbox.pinMode, sandbox.digitalWrite, sandbox.digitalRead, sandbox.analogRead, sandbox.analogWrite,
            sandbox.delay, sandbox.millis, sandbox.Serial, sandbox.HIGH, sandbox.LOW, sandbox.INPUT, sandbox.OUTPUT, sandbox.LED_BUILTIN
          );
          this.setupExecuted = true;
        }

        const loopFn = new Function(
          'pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite',
          'delay', 'millis', 'Serial', 'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'LED_BUILTIN',
          loopBody
        );
        loopFn(
          sandbox.pinMode, sandbox.digitalWrite, sandbox.digitalRead, sandbox.analogRead, sandbox.analogWrite,
          sandbox.delay, sandbox.millis, sandbox.Serial, sandbox.HIGH, sandbox.LOW, sandbox.INPUT, sandbox.OUTPUT, sandbox.LED_BUILTIN
        );
      } else {
        // Direct script execution
        const transCode = this.transpileArduinoToJs(jsCode);
        const scriptFn = new Function(
          'pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite',
          'delay', 'millis', 'Serial', 'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'LED_BUILTIN',
          transCode
        );
        scriptFn(
          sandbox.pinMode, sandbox.digitalWrite, sandbox.digitalRead, sandbox.analogRead, sandbox.analogWrite,
          sandbox.delay, sandbox.millis, sandbox.Serial, sandbox.HIGH, sandbox.LOW, sandbox.INPUT, sandbox.OUTPUT, sandbox.LED_BUILTIN
        );
      }

      this.gpio = pendingGpio;
      this.serialBuffer.push(...serialOut);
      if (this.serialBuffer.length > 100) {
        this.serialBuffer = this.serialBuffer.slice(-100);
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
      .replace(/\b(int|float|double|char|long|byte|unsigned int|bool|boolean)\s+/g, 'let ')
      .replace(/\bconst\s+(int|float|double|char|long|byte)\s+/g, 'const ')
      .replace(/Serial\.println\s*\(/g, 'Serial.println(')
      .replace(/Serial\.print\s*\(/g, 'Serial.print(');
  }
}
