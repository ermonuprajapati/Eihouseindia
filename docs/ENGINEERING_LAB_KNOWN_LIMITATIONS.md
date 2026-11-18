# EI HOUSE UNIVERSAL ENGINEERING LAB: KNOWN LIMITATIONS & DISCLOSURES
**Document Reference:** `docs/ENGINEERING_LAB_KNOWN_LIMITATIONS.md`  
**Date:** November 18, 2026  
**Auditor/Engine:** Engineering Innovation House Forensic Engineering Team  
**Status:** Phase 0 Baseline Audit  

---

## 1. Purpose & Transparency Statement

To ensure uncompromising engineering integrity, this document explicitly records the exact operational boundaries, mathematical approximations, and current execution limits of the Universal Engineering Lab (`/engineering-lab`). In compliance with the **Production Quality Program**, no educational approximation may be represented or labeled as binary hardware emulation or enterprise SPICE/CAD capability.

---

## 2. Microcontroller Simulation & Execution Limitations

### 2.1 Execution Engine Reality
- **Implementation:** The MCU simulation engine (`src/modules/engineering-lab/virtual-mcu-runtime.ts`) is an **Interpreted JavaScript / AST-Level Educational Sandbox**, **NOT** a binary hardware CPU emulator (such as AVR8js, QEMU, or cycle-accurate RTL cores).
- **Firmware Compilation:** `firmware-compiler.ts` executes high-level C++/Arduino syntax validation and tokenization. It outputs structured AST representations and a **synthetic Intel HEX mock** (`generateIntelHexMock`) formatted for UI visualization and educational download.
- **Cycle Timing:** Execution is tick-based via browser `setInterval` / `requestAnimationFrame`. It does **not** provide cycle-accurate clock timing, pipeline stall modeling, or hardware interrupt latency emulation.

### 2.2 Board-by-Board Support Matrix

| Board Model | Compiler Support | Executable Format | Runtime Engine | CPU Emulation Level | Supported Peripherals | Unsupported Peripherals | Physical Upload |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Arduino Uno (ATmega328P)** | High-level C++/Arduino AST parser | Synthetic Intel HEX | JavaScript Sandbox | Level 1: API / Function Mock | GPIO, `pinMode`, `digitalWrite`, `digitalRead`, `analogRead`, `delay`, `Serial.print` | Timers (Timer0/1/2 registers), Watchdog, EEPROM, direct port manipulation (`PORTB`, `DDRD`), SPI/I2C hardware registers | WebSerial (Chromium only) |
| **Arduino Nano** | High-level C++/Arduino AST parser | Synthetic Intel HEX | JavaScript Sandbox | Level 1: API / Function Mock | GPIO, `analogRead` (A0–A7), Serial | Hardware interrupts, PWM phase-correct registers | WebSerial (Chromium only) |
| **ESP32 Dev Module** | Syntax validator + AST tokenizer | Synthetic Intel HEX | JavaScript Sandbox | Level 1: API / Function Mock | Basic GPIO, Serial | Dual Xtensa cores, FreeRTOS tasks, Wi-Fi/BLE radio stack, hardware crypto | WebSerial (Chromium only) |
| **Raspberry Pi Pico (RP2040)** | Python/C++ syntax validator | Synthetic Intel HEX / UF2 mock | JavaScript Sandbox | Level 1: API / Function Mock | Basic GPIO, Serial | Dual ARM Cortex-M0+, PIO state machines, DMA controller | WebSerial / UF2 drag-drop mock |

> [!WARNING]
> Under no circumstances may marketing or UI labels claim hardware-level ESP32-S3, STM32, or RP2040 binary CPU emulation. The UI must clearly display: **"Educational Sandbox (AST/API Level)"**.

---

## 3. PCB Layout & Routing Limitations

1. **Active Routing Layers:**
   - The interactive PCB manual routing engine currently supports **2 active copper layers** (`top_copper` and `bottom_copper`).
   - While stackups can be configured for 4, 6, or 8 layers in project settings, inner plane/signal layers (`inner_1`, `inner_2`, etc.) are currently non-routable in the interactive canvas and are exported as blank or pre-defined copper fills in Gerber files.
2. **Auto-Router Capabilities:**
   - The built-in auto-router is a single-pass orthogonal Manhattan maze router suitable for simple educational boards. Complex high-density BGA escape routing, differential pair length tuning, and curved trace routing are not supported.
3. **DRC Scope:**
   - Clearance checks, pad-to-trace spacing, and board boundary violations are active. High-speed signal integrity checks (controlled impedance, crosstalk, reflection) are not simulated.

---

## 4. 3D Virtual Electronics Studio Limitations (Baseline vs. Phase 1 Fix)

1. **Current Baseline State (Pre-Fix):**
   - In the historical commit baseline, the 3D studio coupled component positions directly to the 2D schematic coordinates (`(comp.x - 400) * 0.7`), causing 3D movements to alter the 2D schematic layout.
   - The breadboard was an inert graphical representation without internal row/column spring-clip node resolution.
2. **Phase 1 Remediation Boundary:**
   - In Phase 1, an independent `Virtual3dCircuitDocument` is decoupled from the schematic.
   - **Tie-strip Node Synthesis:** Connecting two component pins to the same breadboard row (e.g. Row 12, Pins A & C) automatically merges their electrical nets.
   - **Sync Boundary:** Schematic components synchronize into the 3D toolbox, but 3D physical coordinate placement, breadboard row insertion, and custom 3D jumper paths remain preserved in the 3D workspace to avoid corrupting clean 2D schematic diagrams.

---

## 5. SPICE / Electrical Simulation Solver Limitations

1. **Transient Companion Models:**
   - Reactive elements (capacitors, inductors) utilize backward-Euler and trapezoidal numerical approximations with fixed time steps ($\Delta t = 10\mu\text{s}$ to $1\text{ms}$). Variable step-size Gear integration is not implemented.
2. **Non-Linear Semiconductor Equations:**
   - Diodes and BJT junctions utilize standard Shockley diode equations solved via iterative Newton-Raphson approximation. Conductance is clamped at $G_{\min} = 1\times 10^{-12}\text{ S}$ to prevent matrix singularity.
   - Reverse breakdown (Zener breakdown), parasitic junction capacitance ($C_{je}, C_{jc}$), and high-frequency RF transit-time effects are simplified or not modeled.
3. **Op-Amp Behavioral Models:**
   - Operational amplifiers (LM741, LM358) operate as linearized high-gain differential macro-models with rail clipping. Common-mode rejection ratio (CMRR), slew rate limiting, and power-supply rejection ratio (PSRR) are modeled only in macro-level approximation.

---

## 6. Physical Hardware Flashing & WebSerial

- Direct MCU flashing over USB requires the **WebSerial API**, which is exclusively supported on modern Chromium-based browsers (Google Chrome, Microsoft Edge, Opera).
- Firefox and Safari do not support the WebSerial API; users on these browsers are offered binary HEX file download for external flashing tools (e.g., AVRDUDE, Arduino IDE).
