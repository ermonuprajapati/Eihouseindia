export type CpuEmulationLevel =
  | 'high_level_api'
  | 'instruction_set_emulation'
  | 'non_executable_codegen';

export type PhysicalUploadMethod =
  | 'web_serial_bootloader'
  | 'drag_drop_uf2'
  | 'stlink_swd_webusb'
  | 'manual_binary_download';

export interface TargetBoardSpec {
  id: string;
  name: string;
  shortName: string;
  mcu: string;
  architecture: string;
  flashBytes: number;
  flashLabel: string;
  ramBytes: number;
  ramLabel: string;
  clockMhz: number;
  supportedCompiler: string;
  buildFormat: '.hex' | '.bin' | '.uf2' | '.elf';
  runtime: string;
  cpuEmulationLevel: CpuEmulationLevel;
  supportedPeripherals: string[];
  unsupportedPeripherals: string[];
  physicalUploadAvailability: PhysicalUploadMethod;
  simulationEngine: string;
  isExecutable: boolean;
  limitations: string;
  defaultSketch: string;
  pinout: { pin: number | string; name: string; type: 'digital' | 'analog' | 'power' | 'comm' }[];
}

export const TARGET_BOARDS: TargetBoardSpec[] = [
  {
    id: 'arduino-uno',
    name: 'Arduino Uno R3',
    shortName: 'Uno R3',
    mcu: 'ATmega328P',
    architecture: 'AVR 8-bit RISC (16 MHz)',
    flashBytes: 32256,
    flashLabel: '32 KB (0.5 KB used by bootloader)',
    ramBytes: 2048,
    ramLabel: '2 KB SRAM',
    clockMhz: 16,
    supportedCompiler: 'avr-gcc 12.2.0 (C++17 / Arduino Core 1.8.x)',
    buildFormat: '.hex',
    runtime: 'In-Browser Sandboxed C++/Arduino Runtime',
    cpuEmulationLevel: 'high_level_api',
    supportedPeripherals: ['14 Digital GPIO (6 PWM)', '6 Analog Inputs (10-bit ADC)', 'UART (Serial.print/println)', 'millis/micros timer', 'delay/delayMicroseconds'],
    unsupportedPeripherals: ['Direct AVR machine binary opcodes', 'Hardware Watchdog reset', 'Hardware timer interrupt registers (TCCR1A, etc.)', 'EEPROM endurance fatigue'],
    physicalUploadAvailability: 'web_serial_bootloader',
    simulationEngine: 'High-Level C++/Arduino API Behavioral Runtime (AST/Sandbox)',
    isExecutable: true,
    limitations: 'Executes standard Arduino C++ APIs. Does not execute raw compiled .hex AVR machine opcodes or direct hardware register manipulation.',
    defaultSketch: `// Arduino Uno R3 - Virtual Firmware
void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
  Serial.println("[SYSTEM] Arduino Uno R3 initialized");
}

void loop() {
  digitalWrite(13, HIGH);
  Serial.println("LED Built-in: HIGH (5V)");
  delay(1000);
  digitalWrite(13, LOW);
  Serial.println("LED Built-in: LOW (0V)");
  delay(1000);
}`,
    pinout: [
      { pin: 0, name: 'RX0 (D0)', type: 'comm' },
      { pin: 1, name: 'TX0 (D1)', type: 'comm' },
      { pin: 2, name: 'D2 (INT0)', type: 'digital' },
      { pin: 3, name: 'D3 (PWM)', type: 'digital' },
      { pin: 4, name: 'D4', type: 'digital' },
      { pin: 5, name: 'D5 (PWM)', type: 'digital' },
      { pin: 6, name: 'D6 (PWM)', type: 'digital' },
      { pin: 7, name: 'D7', type: 'digital' },
      { pin: 8, name: 'D8', type: 'digital' },
      { pin: 9, name: 'D9 (PWM)', type: 'digital' },
      { pin: 10, name: 'D10 (SS/PWM)', type: 'digital' },
      { pin: 11, name: 'D11 (MOSI/PWM)', type: 'digital' },
      { pin: 12, name: 'D12 (MISO)', type: 'digital' },
      { pin: 13, name: 'D13 (SCK/LED)', type: 'digital' },
      { pin: 'A0', name: 'A0', type: 'analog' },
      { pin: 'A1', name: 'A1', type: 'analog' },
      { pin: 'A2', name: 'A2', type: 'analog' },
      { pin: 'A3', name: 'A3', type: 'analog' },
      { pin: 'A4', name: 'A4 (SDA)', type: 'analog' },
      { pin: 'A5', name: 'A5 (SCL)', type: 'analog' },
    ],
  },
  {
    id: 'arduino-mega',
    name: 'Arduino Mega 2560',
    shortName: 'Mega 2560',
    mcu: 'ATmega2560',
    architecture: 'AVR 8-bit RISC (16 MHz)',
    flashBytes: 262144,
    flashLabel: '256 KB (8 KB used by bootloader)',
    ramBytes: 8192,
    ramLabel: '8 KB SRAM',
    clockMhz: 16,
    supportedCompiler: 'avr-gcc 12.2.0 (Arduino AVR Core)',
    buildFormat: '.hex',
    runtime: 'In-Browser Sandboxed C++/Arduino Runtime',
    cpuEmulationLevel: 'high_level_api',
    supportedPeripherals: ['54 Digital GPIO (15 PWM)', '16 Analog Inputs (A0-A15)', 'Hardware UART0-UART3 APIs', 'GPIO matrix'],
    unsupportedPeripherals: ['External Memory Interface (XMEM)', 'Direct register writes (PORTA-PORTL)', 'Low-level timer capture interrupts'],
    physicalUploadAvailability: 'web_serial_bootloader',
    simulationEngine: 'High-Level C++/Arduino API Behavioral Runtime (AST/Sandbox)',
    isExecutable: true,
    limitations: 'High-level multi-UART and GPIO API execution; hardware bus timing is approximated in JS event loop.',
    defaultSketch: `// Arduino Mega 2560 - Multi-UART Firmware
void setup() {
  Serial.begin(115200);
  pinMode(13, OUTPUT);
  Serial.println("[SYSTEM] Arduino Mega 2560 Ready (54 I/O, 4 UARTs)");
}

void loop() {
  digitalWrite(13, HIGH);
  Serial.println("Mega Tick: HIGH");
  delay(500);
  digitalWrite(13, LOW);
  Serial.println("Mega Tick: LOW");
  delay(500);
}`,
    pinout: [
      { pin: 13, name: 'D13 (LED)', type: 'digital' },
      { pin: 0, name: 'RX0', type: 'comm' },
      { pin: 1, name: 'TX0', type: 'comm' },
      { pin: 18, name: 'TX1', type: 'comm' },
      { pin: 19, name: 'RX1', type: 'comm' },
      { pin: 'A0', name: 'A0', type: 'analog' },
      { pin: 'A15', name: 'A15', type: 'analog' },
    ],
  },
  {
    id: 'arduino-nano',
    name: 'Arduino Nano V3',
    shortName: 'Nano V3',
    mcu: 'ATmega328P',
    architecture: 'AVR 8-bit RISC (16 MHz)',
    flashBytes: 30720,
    flashLabel: '32 KB (2 KB used by bootloader)',
    ramBytes: 2048,
    ramLabel: '2 KB SRAM',
    clockMhz: 16,
    supportedCompiler: 'avr-gcc 12.2.0 (Arduino Nano target)',
    buildFormat: '.hex',
    runtime: 'In-Browser Sandboxed C++/Arduino Runtime',
    cpuEmulationLevel: 'high_level_api',
    supportedPeripherals: ['14 Digital GPIO (6 PWM)', '8 Analog Inputs (A0-A7)', 'UART Serial', 'Basic PWM'],
    unsupportedPeripherals: ['Direct assembly instruction execution', 'Sleep power modes', 'Direct bitwise PORT writes'],
    physicalUploadAvailability: 'web_serial_bootloader',
    simulationEngine: 'High-Level C++/Arduino API Behavioral Runtime (AST/Sandbox)',
    isExecutable: true,
    limitations: 'Behavioral execution of standard sketch functions; pins A6 and A7 lack internal pullups per ATmega328P datasheet.',
    defaultSketch: `// Arduino Nano - Compact Controller
void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
  Serial.println("[NANO] Sub-system online");
}

void loop() {
  digitalWrite(13, HIGH);
  delay(250);
  digitalWrite(13, LOW);
  delay(250);
  Serial.println("Nano Heartbeat Active");
}`,
    pinout: [
      { pin: 13, name: 'D13 (LED)', type: 'digital' },
      { pin: 'A0', name: 'A0', type: 'analog' },
      { pin: 'A7', name: 'A7 (Analog-only)', type: 'analog' },
    ],
  },
  {
    id: 'esp32',
    name: 'ESP32 Dev Module (WROOM-32)',
    shortName: 'ESP32',
    mcu: 'ESP32-D0WDQ6',
    architecture: 'Xtensa Dual-Core 32-bit LX6 (240 MHz)',
    flashBytes: 4194304,
    flashLabel: '4 MB SPI Flash',
    ramBytes: 532480,
    ramLabel: '520 KB SRAM',
    clockMhz: 240,
    supportedCompiler: 'xtensa-esp32-elf-gcc (ESP-IDF / Arduino ESP32 Core)',
    buildFormat: '.bin',
    runtime: 'In-Browser Sandboxed C++/Arduino Runtime',
    cpuEmulationLevel: 'high_level_api',
    supportedPeripherals: ['Digital GPIO', 'ADC Analog Inputs', 'LEDC PWM', 'Serial UART output', 'Basic Virtual Sensor reading'],
    unsupportedPeripherals: ['Hardware 802.11 Wi-Fi baseband & RF physics', 'Bluetooth BLE controller', 'FreeRTOS preemptive dual-core scheduler', 'Hardware crypto acceleration'],
    physicalUploadAvailability: 'web_serial_bootloader',
    simulationEngine: 'High-Level C++/Arduino API Behavioral Runtime (AST/Sandbox)',
    isExecutable: true,
    limitations: 'WiFi/BLE RF physics is virtualized via mock APIs; FreeRTOS dual-core tasks execute cooperatively in the browser event loop.',
    defaultSketch: `// ESP32 Dual-Core DevKit Firmware
#define LED_PIN 2

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("[ESP32] Xtensa Dual-Core 240MHz Booted");
  Serial.println("[WIFI] Scanning SSIDs (Virtual)... 4 APs found");
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  Serial.println("ESP32 Sensor Read: Temperature=24.6C, Pressure=1013hPa");
  delay(1000);
  digitalWrite(LED_PIN, LOW);
  delay(1000);
}`,
    pinout: [
      { pin: 2, name: 'GPIO 2 (LED)', type: 'digital' },
      { pin: 4, name: 'GPIO 4', type: 'digital' },
      { pin: 16, name: 'GPIO 16 (RX2)', type: 'comm' },
      { pin: 17, name: 'GPIO 17 (TX2)', type: 'comm' },
      { pin: 34, name: 'GPIO 34 (ADC1_CH6)', type: 'analog' },
    ],
  },
  {
    id: 'esp32-s3',
    name: 'ESP32-S3 DevKitC-1',
    shortName: 'ESP32-S3',
    mcu: 'ESP32-S3-WROOM-1',
    architecture: 'Xtensa Dual-Core 32-bit LX7 with Vector Extensions (240 MHz)',
    flashBytes: 8388608,
    flashLabel: '8 MB Octal SPI Flash',
    ramBytes: 524288,
    ramLabel: '512 KB SRAM + 2MB PSRAM',
    clockMhz: 240,
    supportedCompiler: 'xtensa-esp32s3-elf-gcc (ESP-IDF v5.x / Arduino Core)',
    buildFormat: '.bin',
    runtime: 'Targeted Native ESP-IDF Toolchain (Compiler Target)',
    cpuEmulationLevel: 'non_executable_codegen',
    supportedPeripherals: ['Syntax Diagnostics', 'Header/Pinout Planning', 'ESP-IDF C/C++ CodeGen', '.bin Firmware Compilation'],
    unsupportedPeripherals: ['Xtensa LX7 Vector Instructions', 'Hardware USB-OTG PHY', 'Octal SPI PSRAM timing', 'Wi-Fi/BLE radio'],
    physicalUploadAvailability: 'web_serial_bootloader',
    simulationEngine: 'Non-executable in browser. Code generator, syntax diagnostics, and downloadable binary compiler target only.',
    isExecutable: false,
    limitations: 'Xtensa LX7 dual-core vector extensions and native USB PHY are not emulated in browser. Provided for pinout planning, syntax validation, and downloadable .bin firmware flashing.',
    defaultSketch: `// ESP32-S3 Target Firmware (Code Generation & Build Only)
#define RGB_LED 48

void setup() {
  Serial.begin(115200);
  pinMode(RGB_LED, OUTPUT);
}

void loop() {
  digitalWrite(RGB_LED, HIGH);
  delay(800);
  digitalWrite(RGB_LED, LOW);
  delay(800);
}`,
    pinout: [
      { pin: 48, name: 'GPIO 48 (RGB LED)', type: 'digital' },
      { pin: 19, name: 'GPIO 19 (USB D-)', type: 'comm' },
      { pin: 20, name: 'GPIO 20 (USB D+)', type: 'comm' },
    ],
  },
  {
    id: 'esp32-c3',
    name: 'ESP32-C3 RISC-V Mini',
    shortName: 'ESP32-C3',
    mcu: 'ESP32-C3FN4',
    architecture: 'RISC-V 32-bit Single-Core RV32IMC (160 MHz)',
    flashBytes: 4194304,
    flashLabel: '4 MB Embedded Flash',
    ramBytes: 409600,
    ramLabel: '400 KB SRAM',
    clockMhz: 160,
    supportedCompiler: 'riscv32-esp-elf-gcc (ESP-IDF v5.x)',
    buildFormat: '.bin',
    runtime: 'Targeted Native RISC-V Toolchain (Compiler Target)',
    cpuEmulationLevel: 'non_executable_codegen',
    supportedPeripherals: ['Syntax Diagnostics', 'Pinout Mapping', 'RISC-V C/C++ CodeGen', '.bin Compilation'],
    unsupportedPeripherals: ['RV32IMC hardware instruction pipeline', 'Hardware crypto accelerator (AES/SHA)', 'Wi-Fi/BLE radio'],
    physicalUploadAvailability: 'web_serial_bootloader',
    simulationEngine: 'Non-executable in browser. Code generator, syntax diagnostics, and downloadable binary compiler target only.',
    isExecutable: false,
    limitations: 'RISC-V single-core hardware instruction pipeline is not emulated in browser. Provided for code generation, syntax diagnostics, and downloadable .bin firmware.',
    defaultSketch: `// ESP32-C3 Open RISC-V Architecture Target
#define STATUS_PIN 8

void setup() {
  Serial.begin(115200);
  pinMode(STATUS_PIN, OUTPUT);
}

void loop() {
  digitalWrite(STATUS_PIN, HIGH);
  delay(500);
  digitalWrite(STATUS_PIN, LOW);
  delay(500);
}`,
    pinout: [
      { pin: 8, name: 'GPIO 8 (LED)', type: 'digital' },
      { pin: 0, name: 'GPIO 0 (ADC1_CH0)', type: 'analog' },
    ],
  },
  {
    id: 'stm32f103',
    name: 'STM32F103C8T6 (Blue Pill)',
    shortName: 'STM32F103',
    mcu: 'STM32F103C8T6',
    architecture: 'ARM 32-bit Cortex-M3 (72 MHz)',
    flashBytes: 65536,
    flashLabel: '64 KB Flash (Up to 128 KB on some batches)',
    ramBytes: 20480,
    ramLabel: '20 KB SRAM',
    clockMhz: 72,
    supportedCompiler: 'arm-none-eabi-gcc (STM32duino / STM32CubeHAL)',
    buildFormat: '.bin',
    runtime: 'Targeted Native ARM GCC Toolchain (Compiler Target)',
    cpuEmulationLevel: 'non_executable_codegen',
    supportedPeripherals: ['Syntax Diagnostics', 'Pinout Planning', 'CMSIS / STM32Cube CodeGen', '.bin Compilation'],
    unsupportedPeripherals: ['ARM Cortex-M3 Thumb-2 binary instruction execution', 'Hardware CAN bus controller', 'DMA controller', 'Hardware USB PHY'],
    physicalUploadAvailability: 'stlink_swd_webusb',
    simulationEngine: 'Non-executable in browser. Code generator, syntax diagnostics, and downloadable binary compiler target only.',
    isExecutable: false,
    limitations: 'ARM Cortex-M3 instruction-set emulation is not implemented in browser. Used for syntax checking, pinout verification, and STM32Cube / .bin compilation.',
    defaultSketch: `// STM32F103 Blue Pill - Target Firmware
#define LED_PIN PC13

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  digitalWrite(LED_PIN, LOW);
  delay(100);
  digitalWrite(LED_PIN, HIGH);
  delay(900);
}`,
    pinout: [
      { pin: 'PC13', name: 'PC13 (User LED, Active-Low)', type: 'digital' },
      { pin: 'PA0', name: 'PA0 (ADC0 / WKUP)', type: 'analog' },
      { pin: 'PA9', name: 'PA9 (USART1 TX)', type: 'comm' },
      { pin: 'PA10', name: 'PA10 (USART1 RX)', type: 'comm' },
    ],
  },
  {
    id: 'stm32-nucleo-f401',
    name: 'STM32 Nucleo-F401RE',
    shortName: 'Nucleo-F401',
    mcu: 'STM32F401RET6',
    architecture: 'ARM 32-bit Cortex-M4 with FPU (84 MHz)',
    flashBytes: 524288,
    flashLabel: '512 KB Flash',
    ramBytes: 98304,
    ramLabel: '96 KB SRAM',
    clockMhz: 84,
    supportedCompiler: 'arm-none-eabi-gcc (Mbed OS / STM32CubeIDE)',
    buildFormat: '.bin',
    runtime: 'Targeted Native ARM GCC Toolchain (Compiler Target)',
    cpuEmulationLevel: 'non_executable_codegen',
    supportedPeripherals: ['Syntax Diagnostics', 'ST Morpho / Arduino Pin Mapping', 'DSP/FPU CodeGen', '.bin Compilation'],
    unsupportedPeripherals: ['ARM Cortex-M4F binary execution', 'Hardware Floating Point Unit (FPU)', 'DMA 2', 'USB OTG FS'],
    physicalUploadAvailability: 'stlink_swd_webusb',
    simulationEngine: 'Non-executable in browser. Code generator, syntax diagnostics, and downloadable binary compiler target only.',
    isExecutable: false,
    limitations: 'ARM Cortex-M4F hardware core and FPU are not emulated in browser. Provided for firmware planning and .bin download for physical Nucleo boards.',
    defaultSketch: `// STM32 Nucleo-F401RE Target Firmware
#define USER_BUTTON PC13
#define GREEN_LED PA5

void setup() {
  pinMode(GREEN_LED, OUTPUT);
  pinMode(USER_BUTTON, INPUT);
  Serial.begin(115200);
}

void loop() {
  digitalWrite(GREEN_LED, HIGH);
  delay(500);
  digitalWrite(GREEN_LED, LOW);
  delay(500);
}`,
    pinout: [
      { pin: 'PA5', name: 'PA5 (Arduino D13 / Green LED)', type: 'digital' },
      { pin: 'PC13', name: 'PC13 (User Push Button)', type: 'digital' },
    ],
  },
  {
    id: 'rp2040-pico',
    name: 'Raspberry Pi Pico (RP2040)',
    shortName: 'Pi Pico',
    mcu: 'RP2040',
    architecture: 'Dual-Core ARM Cortex-M0+ (133 MHz)',
    flashBytes: 2097152,
    flashLabel: '2 MB QSPI Flash',
    ramBytes: 270336,
    ramLabel: '264 KB On-chip SRAM in 6 banks',
    clockMhz: 133,
    supportedCompiler: 'arm-none-eabi-gcc (Raspberry Pi Pico SDK / Arduino Mbed Core)',
    buildFormat: '.uf2',
    runtime: 'In-Browser Sandboxed C++/Arduino Runtime',
    cpuEmulationLevel: 'high_level_api',
    supportedPeripherals: ['26 GPIO Digital I/O', '3x 12-bit ADC', 'PWM slices', 'UART Serial output', 'LED built-in (GP25)'],
    unsupportedPeripherals: ['Programmable I/O (PIO) assembly state machines', 'Hardware Dual-Core multicore_launch_core1', 'DMA channels'],
    physicalUploadAvailability: 'drag_drop_uf2',
    simulationEngine: 'High-Level C++/Arduino API Behavioral Runtime (AST/Sandbox)',
    isExecutable: true,
    limitations: 'Simulates high-level Pico SDK & Arduino C++ APIs. Hardware PIO state machine bytecode and multicore FIFO are not emulated.',
    defaultSketch: `// Raspberry Pi Pico (RP2040 Dual ARM Core)
#define PICO_LED 25

void setup() {
  Serial.begin(115200);
  pinMode(PICO_LED, OUTPUT);
  Serial.println("[RP2040] Dual ARM Cortex-M0+ Pico Initialized");
}

void loop() {
  digitalWrite(PICO_LED, HIGH);
  Serial.println("Pico Core0: Running / High-Level API Active");
  delay(500);
  digitalWrite(PICO_LED, LOW);
  delay(500);
}`,
    pinout: [
      { pin: 25, name: 'GP25 (Onboard LED)', type: 'digital' },
      { pin: 0, name: 'GP0 (UART0 TX)', type: 'comm' },
      { pin: 1, name: 'GP1 (UART0 RX)', type: 'comm' },
      { pin: 26, name: 'GP26 (ADC0)', type: 'analog' },
      { pin: 27, name: 'GP27 (ADC1)', type: 'analog' },
      { pin: 28, name: 'GP28 (ADC2)', type: 'analog' },
    ],
  },
  {
    id: 'rp2350',
    name: 'Raspberry Pi Pico 2 (RP2350)',
    shortName: 'Pi Pico 2',
    mcu: 'RP2350',
    architecture: 'Dual ARM Cortex-M33 / Dual Hazard3 RISC-V (150 MHz selectable)',
    flashBytes: 4194304,
    flashLabel: '4 MB QSPI Flash',
    ramBytes: 532480,
    ramLabel: '520 KB SRAM in 10 banks',
    clockMhz: 150,
    supportedCompiler: 'arm-none-eabi-gcc / riscv32-unknown-elf-gcc (Pico SDK 2.x)',
    buildFormat: '.uf2',
    runtime: 'Targeted Native ARM / RISC-V Toolchain (Compiler Target)',
    cpuEmulationLevel: 'non_executable_codegen',
    supportedPeripherals: ['Syntax Diagnostics', 'Pinout Planning', 'Pico SDK 2.x CodeGen', '.uf2 Compilation'],
    unsupportedPeripherals: ['Arm TrustZone security extensions', 'Hazard3 RISC-V co-processor', 'PIO 2.0 blocks', 'HSTX high-speed serial'],
    physicalUploadAvailability: 'drag_drop_uf2',
    simulationEngine: 'Hardware Compilation & UF2 Export Target Only (Cycle-accurate in-browser simulation pending upstream core)',
    isExecutable: false,
    limitations: 'UNSUPPORTED AS IN-BROWSER EXECUTABLE. RP2350 dual-architecture core does not yet have a verified browser cycle-accurate simulation engine. Use this target for code generation, syntax validation, and downloadable .UF2 firmware flashing to physical boards.',
    defaultSketch: `// Raspberry Pi Pico 2 (RP2350) Target
// Note: This target generates compiled .UF2 binaries for physical hardware flashing.
// In-browser simulation is intentionally disabled until cycle-accurate core is verified.

#define PICO_LED 25

void setup() {
  pinMode(PICO_LED, OUTPUT);
}

void loop() {
  digitalWrite(PICO_LED, HIGH);
  delay(500);
  digitalWrite(PICO_LED, LOW);
  delay(500);
}`,
    pinout: [
      { pin: 25, name: 'GP25 (Onboard LED)', type: 'digital' },
      { pin: 0, name: 'GP0 (UART0 TX)', type: 'comm' },
      { pin: 1, name: 'GP1 (UART0 RX)', type: 'comm' },
    ],
  },
];
