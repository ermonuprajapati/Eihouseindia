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
  supportedPeripherals: string[];
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
    supportedPeripherals: ['14 Digital GPIO (6 PWM)', '6 Analog Inputs (10-bit ADC)', 'UART (Serial)', 'SPI', 'I2C/Wire', 'Timers 0/1/2'],
    simulationEngine: 'AVR8 Virtual Machine (Cycle-accurate instruction & peripheral core)',
    isExecutable: true,
    limitations: 'EEPROM write cycles limited to virtual persistence; external watchdog timer emulation is approximated.',
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
    supportedPeripherals: ['54 Digital GPIO (15 PWM)', '16 Analog Inputs (10-bit ADC)', '4 Hardware UARTs', 'SPI', 'I2C/TWI', '6 Hardware Timers'],
    simulationEngine: 'AVR8 Mega Virtual Engine (High-capacity register bank & multi-UART)',
    isExecutable: true,
    limitations: 'Extended 16-bit timer capture modes approximate simulated frequency; external XMEM interface unsupported.',
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
    supportedPeripherals: ['14 Digital GPIO (6 PWM)', '8 Analog Inputs (A0-A7)', 'UART', 'SPI', 'I2C'],
    simulationEngine: 'AVR8 Virtual Machine (Full instruction execution)',
    isExecutable: true,
    limitations: 'Pins A6 and A7 are analog-only inputs without digital GPIO pullup support.',
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
    supportedPeripherals: ['Wi-Fi 802.11 b/g/n', 'Bluetooth 4.2 BR/EDR & BLE', '36 GPIOs', '2x 8-bit DAC', '18x 12-bit ADC', '3x UART', '4x SPI', '2x I2C', '16x PWM (LEDC)'],
    simulationEngine: 'High-Level C/C++ API Virtual Runtime (Wokwi-compatible API)',
    isExecutable: true,
    limitations: 'WiFi/BLE RF physics layer is virtualized; FreeRTOS dual-core task scheduling runs cooperatively in the browser JS event loop.',
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
    supportedPeripherals: ['Wi-Fi & BLE 5.0 Mesh', 'USB-OTG Full Speed', 'AI Vector Instructions', '45 Programmable GPIOs', '14x Capacitive Touch', 'LCD & Camera Interface'],
    simulationEngine: 'High-Level C/C++ API Virtual Runtime',
    isExecutable: true,
    limitations: 'Hardware AI Vector instructions and native USB-OTG PHY are simulated via high-level API emulators; physical flashing supports Web Serial.',
    defaultSketch: `// ESP32-S3 AI & Edge Computing Firmware
#define RGB_LED 48

void setup() {
  Serial.begin(115200);
  pinMode(RGB_LED, OUTPUT);
  Serial.println("[ESP32-S3] LX7 Vector AI Core Ready");
}

void loop() {
  digitalWrite(RGB_LED, HIGH);
  Serial.println("S3 Tensor Inference: Output=[0.942, 0.031, 0.027]");
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
    supportedPeripherals: ['Wi-Fi 802.11 b/g/n', 'Bluetooth 5 (LE)', '22 GPIOs', '6x 12-bit ADC', '3x SPI', '2x UART', '1x I2C', '6x PWM'],
    simulationEngine: 'High-Level RISC-V C/C++ Virtual Runtime',
    isExecutable: true,
    limitations: 'Hardware crypto accelerator (AES-128/256, SHA-2) simulated through JS crypto primitives.',
    defaultSketch: `// ESP32-C3 Open RISC-V Architecture
#define STATUS_PIN 8

void setup() {
  Serial.begin(115200);
  pinMode(STATUS_PIN, OUTPUT);
  Serial.println("[RISC-V] ESP32-C3 RV32IMC Single-Core Started");
}

void loop() {
  digitalWrite(STATUS_PIN, HIGH);
  delay(500);
  digitalWrite(STATUS_PIN, LOW);
  delay(500);
  Serial.println("[C3] RISC-V Core Active");
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
    supportedPeripherals: ['37 GPIOs (5V tolerant)', '2x 12-bit ADC (16 channels)', '7 Timers', '3x USART', '2x SPI', '2x I2C', 'USB 2.0 FS Device', 'CAN 2.0B'],
    simulationEngine: 'ARM Cortex-M Virtual Runtime (Thumb-2 High-Level API)',
    isExecutable: true,
    limitations: 'USB direct PHY pullup resistor needs manual toggle in hardware; SWD hardware debugging simulated through virtual registers.',
    defaultSketch: `// STM32F103 Blue Pill - ARM Cortex-M3
#define LED_PIN PC13

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(115200);
  Serial.println("[ARM Cortex-M3] STM32F103 @ 72MHz Online");
}

void loop() {
  digitalWrite(LED_PIN, LOW); // Active Low onboard LED
  delay(100);
  digitalWrite(LED_PIN, HIGH);
  delay(900);
  Serial.println("SysTick 1000ms Event Triggered");
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
    supportedPeripherals: ['Arduino Uno v3 Connector Headers', 'ST Morpho Extension Headers', 'On-board ST-LINK/V2-1 Debugger', '12-bit ADC 2.4 MSPS', 'USB OTG FS'],
    simulationEngine: 'ARM Cortex-M Virtual Runtime with FPU emulation',
    isExecutable: true,
    limitations: 'ST-LINK virtual COM port and drag-and-drop programming replicated via browser download and Web Serial.',
    defaultSketch: `// STM32 Nucleo-F401RE High-Performance ARM
#define USER_BUTTON PC13
#define GREEN_LED PA5

void setup() {
  pinMode(GREEN_LED, OUTPUT);
  pinMode(USER_BUTTON, INPUT);
  Serial.begin(115200);
  Serial.println("[NUCLEO] STM32F401RE DSP/FPU Engine Online");
}

void loop() {
  digitalWrite(GREEN_LED, HIGH);
  delay(500);
  digitalWrite(GREEN_LED, LOW);
  delay(500);
  Serial.println("Nucleo Heartbeat: 84MHz PLL Locked");
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
    supportedPeripherals: ['2x Programmable I/O (PIO) Blocks (8 state machines)', '2x UART', '2x SPI', '2x I2C', '16x PWM Channels', '4x 12-bit ADC (3 external)'],
    simulationEngine: 'RP2040 Virtual Runtime (PIO Instruction Emulation)',
    isExecutable: true,
    limitations: 'PIO state machine timing is cycle-approximated in JavaScript runtime; UF2 export formatted for standard USB bootloader drag-and-drop.',
    defaultSketch: `// Raspberry Pi Pico (RP2040 Dual ARM Core)
#define PICO_LED 25

void setup() {
  Serial.begin(115200);
  pinMode(PICO_LED, OUTPUT);
  Serial.println("[RP2040] Dual ARM Cortex-M0+ Pico Initialized");
}

void loop() {
  digitalWrite(PICO_LED, HIGH);
  Serial.println("Pico Core0: Running / PIO State Machines Active");
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
    supportedPeripherals: ['Arm TrustZone for Cortex-M', '3x PIO blocks (12 state machines)', 'Hardware SHA-256 accelerator', 'TRNG', '8KB OTP Storage'],
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
