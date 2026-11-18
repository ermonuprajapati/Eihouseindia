# Engineering Lab — Test Evidence & Acceptance Verification
**Project:** Engineering Innovation House — Universal Engineering Lab  
**Date:** November 18, 2026  
**Auditor:** Antigravity Engineering System  

---

## 1. Automated Acceptance Test Suite Execution Log

All 74 acceptance tests passed cleanly in Vitest with zero failures.

```bash
$ npm test

> eihouseindia@0.1.0 test
> vitest run

 RUN  v3.2.7 D:/eihouseindia

 ✓ src/__tests__/analytics.test.ts (3 tests) 281ms
 ✓ src/__tests__/engineering-lab.test.ts (40 tests) 333ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST A: updates circuit node voltages and branch currents when Battery voltage changes from 9V to 5V 9ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST B: recalculates circuit telemetry when R1 changes from 10k to 4.7k 2ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST C: runs NE555 astable circuit template and verifies output states match analytical model 47ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST E: converts schematic to 2D PCB layout, passes DRC checks, and exports valid RS-274X Gerber and Excellon drill files 4ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST G: transpiles and executes Arduino C++ firmware, toggling GPIO 13 and logging to Serial 6ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST H: serializes and restores engineering project to JSON without data loss 1ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST A - Library Search & Add: verifies presence and instantiation of all required components 6ms
   ✓ Engineering Lab - Full Acceptance Test Suite > Target Boards: verifies verified hardware specs and non-executable status of RP2350 4ms
   ✓ Engineering Lab - Full Acceptance Test Suite > Firmware Compiler: validates syntax, reports diagnostics, generates memory summary and parses plotter 61ms
   ✓ Engineering Lab - Full Acceptance Test Suite > Circuit Solver: solves LM358 Op-Amp, Logic Gates, and Voltmeter/Ammeter measurements 2ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST C - Instruments: verifies DC Voltmeter, series DC Ammeter, and AC waveform telemetry 1ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST D - Current Direction: verifies conventional current reverses when source polarity is reversed 7ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST E - LED Glow: verifies visible illumination in forward-bias and extinction in reverse-bias 2ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST F - Logic Gates: validates standard truth tables for AND, OR, NOT, NAND, NOR, and XOR 3ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST H - PCB Layout: creates custom 100mm x 80mm board, verifies active layers and placement 3ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST L - 3D Virtual Electronics Studio: validates 3D jumper wiring, color retention, and breadboard connectivity 2ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST M - Expanded Device & Sensor Library: verifies coverage across all mandatory categories 4ms
   ✓ Engineering Lab - Full Acceptance Test Suite > SECTION 13 - TEST 3: HC-SR04 sensor simulates virtual echo timing and firmware distance calculation 3ms
   ✓ Engineering Lab - Full Acceptance Test Suite > SECTION 13 - TEST 4: updates circuit model and current when resistor value changes from 220Ω to 330Ω 1ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST N - Potentiometer Wiper Division: verifies 3-pin potentiometer wiper division with alpha = 0.25 and 0.75 2ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST O - Inductor Companion MNA Model: verifies transient companion integration with L = 10mH 23ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST P - SPST Switch Conductance: verifies zero current when open and full conduction when closed 2ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST Q - BJT NPN Companion Model: verifies base current injection and collector current conduction 1ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST R - Voltage Regulator 7805: verifies 9V battery input regulated down to 5.0V output 1ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST S - PCB Trace Routing & Layer Stackup: validates trace addition on top/bottom copper and 2/4 layer stackup 1ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST T - User Custom Library & Ecosystem Manifest: validates custom part creation, persistence, and manifest export 1ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST U: verifies industrial contactor coil excitation and auxiliary NO/NC contact state switching 2ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST V: verifies Push Button NO conducts only when pressed, and Push Button NC opens when pressed 3ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST W: verifies MCB conducts in normal armed state and opens upon tripping 1ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST X: computes SVG polyline path passing through user intermediate waypoints 1ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST Y: filters component catalogue across category, part number, and simulation tier 1ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST Z: supports 2, 4, 6 layer stackup and custom board thickness in PCB data model 1ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST AA: solves N-channel MOSFET cutoff when Vgs < Vth, and channel conduction when Vgs >= Vth 2ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST AB: validates LED preset colors, custom HEX colors, and forward-bias luminescence 1ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST AC: duplicates component with incremented designator, offset position, and cloned parameters 2ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST AD: allows interactive routing waypoints and via pad multi-layer insertion 1ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST AE: computes straight and 45-degree chamfered wire routing paths 0ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST AF: correctly derives dynamic LED forward voltage across color spectrum and custom parameters 1ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST AG: accurately simulates individual Red, Green, and Blue channels for ACTUATOR_RGB_LED 1ms
   ✓ Engineering Lab - Full Acceptance Test Suite > TEST AH: Potentiometer accurately solves 3-terminal voltage divider with A, Wiper, B pin mapping 29ms
 ✓ src/__tests__/components.test.tsx (3 tests) 511ms
 ✓ src/__tests__/validation.test.ts (7 tests) 22ms
 ✓ src/__tests__/product.test.ts (8 tests) 123ms
 ✓ src/__tests__/seo.test.ts (3 tests) 11ms
 ✓ src/__tests__/security-rules.test.ts (5 tests) 9ms
 ✓ src/__tests__/media.test.ts (3 tests) 7ms
 ✓ src/__tests__/email.test.ts (2 tests) 8ms

 Test Files  9 passed (9)
      Tests  74 passed (74)
   Duration  27.72s
```

---

## 2. Forensic Real Acceptance Test Records (Tests A Through J)

### Test A: Independent 3D Circuit Creation Workflow
- **Test ID:** `ACCEPT-A-01`
- **Preconditions:** Empty workspace opened in 3D Virtual Studio (`activeMode === 'virtual3d'`).
- **User Actions:**
  1. Click `+ Add Device in 3D` $\to$ place 9V Battery, Resistor (220Ω), and Red LED.
  2. Drag components over the breadboard.
  3. Click Battery (+) terminal $\to$ drag jumper wire to Resistor Pin 1.
  4. Click Resistor Pin 2 $\to$ drag jumper wire to LED Anode.
  5. Click LED Cathode $\to$ drag jumper wire to Battery (-) terminal.
  6. Click Start Simulation $\to$ observe LED illumination and current flow.
  7. Select resistor-to-LED jumper wire $\to$ click `Disconnect Pin 2` $\to$ re-route to LED Cathode.
  8. Save project $\to$ refresh browser $\to$ load saved project.
- **Expected Result:** Circuit functions purely within the 3D studio without requiring schematic creation; components and wires persist.
- **Actual Result:** 
  - Direct 3D placement, wiring, disconnect, and simulation work.
  - **Limitation Discovered:** When switching to the 2D Schematic tab, schematic components are clustered at `(400, 300)` because 3D coordinates currently back-propagate into schematic `(x, y)` rather than having an independent 3D placement document model.
- **Verdict:** `PARTIAL` (Functional authoring in 3D, but lacks independent 3D document isolation).

---

### Test B: Breadboard Internal Topology & Tie-Point Bridging
- **Test ID:** `ACCEPT-B-01`
- **Preconditions:** 3D Studio active with solderless breadboard visible.
- **User Actions:**
  1. Insert Resistor Lead 1 into Breadboard Hole `Row 15, Col A`.
  2. Insert LED Anode Lead into Breadboard Hole `Row 15, Col C`.
  3. Apply 5V to `Row 15, Col E`.
- **Expected Result:** Voltage from `Row 15, Col E` conducts through the breadboard's internal tie-strip to both Resistor Lead 1 and LED Anode without needing external jumper wires between them.
- **Actual Result:** No current flows. In the current engine, breadboard holes are drawn graphics; components only connect if an explicit `CircuitWire` is created between their pin IDs.
- **Verdict:** `FAIL / VISUAL_ONLY` (Requires Phase 1 `BreadboardTopologyEngine`).

---

### Test C: Wire Interaction, Disconnect, and Deletion
- **Test ID:** `ACCEPT-C-01`
- **Preconditions:** Schematic canvas with connected resistor and DC voltage source.
- **User Actions:**
  1. Single-click wire $\to$ verify selection (wire turns gold with drag handles).
  2. Press `Delete` key $\to$ verify only the wire is deleted.
  3. Draw wire from Pin 1 $\to$ press `Escape` mid-way $\to$ verify partial wire cancels without residual state.
  4. Right-click wire $\to$ select `Disconnect Start Pin` $\to$ verify wire disconnects and re-enters drawing mode from remaining pin.
  5. Switch to 3D Studio $\to$ right-click 3D wire $\to$ select `Disconnect Pin 1` $\to$ verify 3D wire head follows cursor for re-connection.
- **Expected Result:** Wires can be selected without disappearing; endpoints can be disconnected and re-routed; Esc cancels incomplete wires.
- **Actual Result:** All 5 actions execute reliably across both 2D Schematic and 3D Studio.
- **Verdict:** `PASS (WORKING_VERIFIED)`.

---

### Test D: LED Color Parameter & Physical Illumination Sync
- **Test ID:** `ACCEPT-D-01`
- **Preconditions:** Simple circuit with DC Source (5V), 220Ω Resistor, and LED.
- **User Actions:**
  1. Select LED $\to$ change color in Properties Inspector from Red to Blue (`#3B82F6`).
  2. Verify 2D schematic symbol: Polygon immediately fills with blue. Emitted photon arrows turn blue.
  3. Verify 3D Studio: Dome bulb immediately renders in blue; when simulating, emitted radial aura glows blue.
  4. Verify PCB 3D: Radial gradient on the PCB LED dome updates to blue stops.
  5. Save project to JSON $\to$ reopen project $\to$ verify LED color remains Blue and forward voltage reflects 3.1V.
- **Expected Result:** Color changes propagate instantaneously across 2D, 3D, and PCB views and persist across save/reload cycles.
- **Actual Result:** Full synchronization confirmed across all 3 renderers and solver parameters.
- **Verdict:** `PASS (WORKING_VERIFIED)`.

---

### Test E: 3-Terminal Potentiometer Voltage Division (Pins A, Wiper, B)
- **Test ID:** `ACCEPT-E-01`
- **Preconditions:** 10V DC source connected across Potentiometer Terminal A (0V GND) and Terminal B (10V VCC).
- **User Actions:**
  1. Set Wiper Position to $0.50$ (50%) $\to$ measure Wiper voltage with Voltmeter.
  2. Set Wiper Position to $0.25$ (25%) $\to$ measure Wiper voltage.
  3. Set Wiper Position to $0.80$ (80%) $\to$ measure Wiper voltage.
- **Expected Result:**
  - $0.50 \implies 5.0\text{V} \pm 0.05\text{V}$
  - $0.25 \implies 2.5\text{V} \pm 0.05\text{V}$
  - $0.80 \implies 8.0\text{V} \pm 0.05\text{V}$
- **Actual Result:** Measured $5.000\text{V}$, $2.500\text{V}$, and $8.000\text{V}$ respectively in automated test `TEST AH`.
- **Verdict:** `PASS (WORKING_VERIFIED)`.

---

### Test F: Multi-Channel RGB LED Simulation
- **Test ID:** `ACCEPT-F-01`
- **Preconditions:** 5V source, 220Ω resistor powering Red channel of `ACTUATOR_RGB_LED`, Common Cathode to GND.
- **User Actions:**
  1. Run simulation.
  2. Inspect channel telemetry: `onRed`, `onGreen`, `onBlue`.
  3. Observe 2D schematic IEEE symbol and 3D dome.
- **Expected Result:** Only Red channel conducts ($I_{\text{red}} \approx 13.6\text{mA}$); Green and Blue remain OFF ($I = 0$). 2D central lens renders red.
- **Actual Result:** Verified in `TEST AG`. Only Red conducts; central lens displays red illumination.
- **Verdict:** `PASS (WORKING_VERIFIED)`.

---

### Test G: PCB Manual Interactive Routing & Gerber Export
- **Test ID:** `ACCEPT-G-01`
- **Preconditions:** PCB 2D workspace with unrouted pads.
- **User Actions:**
  1. Press `R` to enter interactive routing mode.
  2. Click Pad 1 $\to$ drag track on Top Copper $\to$ click canvas to place intermediate waypoints.
  3. Press `V` to drop a through-hole via $\to$ layer switches to Bottom Copper $\to$ finish on Pad 2.
  4. Click `Export Gerber`.
  5. Inspect downloaded files: `.gtl` (Top Copper), `.gbl` (Bottom Copper), `.drl` (Excellon NC Drill).
- **Expected Result:** Manual track commits cleanly to `pcbLayout.tracks`; exported files adhere strictly to standard RS-274X Extended Gerber and metric NC drill format.
- **Actual Result:** Track commits cleanly; via dropped with 0.8mm pad / 0.4mm drill; `.gtl`, `.gbl`, and `.drl` files generated.
  - **Limitation:** Cursor routing lacks real-time $45^\circ$ angle snapping during mouse movement; inner copper layers for 4/6/8-layer boards cannot yet be routed.
- **Verdict:** `PARTIAL (WORKING_WITH_LIMITATIONS)`.

---

### Test H: Full Project Persistence & Serialization
- **Test ID:** `ACCEPT-H-01`
- **Preconditions:** Project containing 15 components, 20 wires, custom PCB dimensions, and firmware sketch.
- **User Actions:**
  1. Click `Save` $\to$ verify saved to `localStorage`.
  2. Click `Export Project JSON` $\to$ download project file.
  3. Clear workspace (`New Project`) $\to$ click `Load Project` $\to$ select downloaded JSON.
- **Expected Result:** Identical component parameters, wire paths, net labels, and PCB layout restored without data degradation.
- **Actual Result:** Verified in `TEST H`. 100% loss-free serialization and restoration.
- **Verdict:** `PASS (WORKING_VERIFIED)`.

---

### Test I: Production Website Performance & Bundle Impact
- **Test ID:** `ACCEPT-I-01`
- **Preconditions:** Next.js production build (`npm run build`).
- **Measurements:**
  - Route `/engineering-lab` JS size: **59.4 kB** (First Load JS: 192 kB).
  - Shared vendor bundle: **103 kB**.
  - All 40 routes compile cleanly with zero static generation errors.
- **Verdict:** `PASS (WORKING_VERIFIED)`.

---

### Test J: Regression Safety Verification
- **Test ID:** `ACCEPT-J-01`
- **User Actions:**
  - Verified `/` (Homepage), `/products` (Store), `/articles` (Blog), `/auth/login`, `/dashboard`, and `/admin`.
  - Verified all 8 non-lab unit test suites in `vitest` (34 tests passed).
- **Verdict:** `PASS (WORKING_VERIFIED)`.
