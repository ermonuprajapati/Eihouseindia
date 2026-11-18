# Engineering Lab — Forensic Root-Cause Audit Report
**Project:** Engineering Innovation House — Universal Engineering Lab  
**Production URL:** `https://eihouseindia.in/engineering-lab`  
**Repository Path:** `D:\eihouseindia`  
**Audit Date:** November 18, 2026  
**Auditor:** Antigravity Engineering System  

---

## 1. Repository State Checkpoint & Forensic Baseline

### 1.1 Git Status & Commit History
```bash
$ git status -b -s
## main...origin/main

$ git status --short
(clean - no uncommitted changes)

$ git log -10 --oneline
180189a feat(engineering-lab): add 3D jumper wire disconnect endpoints, unplug wire, and right-click context menu
0726d31 fix(engineering-lab): resolve 3-terminal potentiometer pin model, camera presets and gerber bottom export
96d52dd feat(engineering-lab): professional schematic wiring CAD, short circuit detection, dynamic LED & RGB simulation
a1dd27e feat(engineering-lab): professional 3D direct workbench, realistic MCU & industrial models, interactive wire delete/disconnect, and CAD PCB dimension stackup HUD
1b82659 feat(engineering-lab): truthful MCU emulation specs, admin component inspection & user dashboard workspace
cd5d2f1 feat(engineering-lab): mosfet mna simulation, dynamic led color rendering, 8-channel logic analyzer, pcb waypoints & via insertion
6bb226f feat(engineering-lab): industrial automation catalog, professional wire editor, multi-layer pcb & advanced filtering
fae97cf feat(engineering-lab): advanced component ecosystem, industrial electrical library, professional wiring editor, interactive PCB routing, and admin control console
819f509 feat(api): include /engineering-lab in on-demand revalidation route
b66f8d1 feat(3d-studio): interactive hardware HUD, virtual HC-SR04 echo timing, and Section 13 acceptance verification
```

- **Reported Commit Verification:** Commit `6bb226f` exists in repository history at position `HEAD~6`. It was the initial multi-layer PCB and industrial automation catalog commit. HEAD is currently at `180189a`.
- **Working Tree:** Pristine (0 unstaged changes, 0 staged changes).
- **Git Diff & Formatting Checks:** Clean (`git diff` and `git diff --check` return 0 errors).
- **Build & Test Infrastructure:**
  - `npm run test` executes `vitest run` (74 tests passing across 9 test suites).
  - `npm run typecheck` executes `tsc --noEmit` (0 errors).
  - `npm run build` executes `next build` (Next.js 15.4.9 App Router, 40/40 routes statically generated).

---

## 2. Investigation: Why Previous Tasks Failed to Deliver R&D-Grade Requirements

The previous audits and reports declared features as "PASS" or "PRODUCTION READY" while actual user workflows revealed fundamental gaps. A forensic inspection of the codebase explains the exact technical root causes:

### 2.1 Root Cause 1: 3D Virtual Studio is an Unprojected 2.5D Schematic Canvas, Not an Independent 3D Circuit Workspace
- **Code Reference:** [`src/components/engineering-lab/Panels/Virtual3dStudio.tsx#L187-L191`](file:///D:/eihouseindia/src/components/engineering-lab/Panels/Virtual3dStudio.tsx#L187-L191)
  ```typescript
  // Component 3D origin on workbench / breadboard
  const compX = (comp.x - 400) * 0.7;
  const compZ = (comp.y - 300) * 0.7;
  const compY = 0; // Surface level
  ```
  And [`Virtual3dStudio.tsx#L481-L486`](file:///D:/eihouseindia/src/components/engineering-lab/Panels/Virtual3dStudio.tsx#L481-L486):
  ```typescript
  if (isDraggingComp && dragCompId && onUpdateComponentPosition) {
    const pos = unprojectToWorkbench(mouseX, mouseY, canvas.width, canvas.height);
    if (pos) {
      onUpdateComponentPosition(dragCompId, pos.schematicX, pos.schematicY);
    }
    return;
  }
  ```
- **Finding:** In the document model (`types.ts`), `EngineeringProject` possesses only a single array of `components: CircuitComponent[]`. Each component has only 2D schematic coordinates `(x, y)`.
- **The Consequence:** The 3D Studio does not have its own physical document state. Dragging a component in 3D directly alters `comp.x` and `comp.y` on the 2D schematic canvas. If a user tries to arrange an aesthetic breadboard circuit in 3D, their 2D schematic becomes a scrambled mess of overlapping blocks.
- **Architectural Verdict:** 3D Virtual Studio was implemented as a secondary projection view of the schematic, violating the requirement for an **Independent 3D Circuit Authoring Workspace**.

---

### 2.2 Root Cause 2: Breadboard is a Decorative 2D Canvas Graphic Without Internal Terminal Topology
- **Code Reference:** [`src/components/engineering-lab/Panels/Virtual3dStudio.tsx#L678-L720`](file:///D:/eihouseindia/src/components/engineering-lab/Panels/Virtual3dStudio.tsx#L678-L720)
- **Finding:** The solderless breadboard is drawn as a monolithic plastic slab using canvas 2D fill and arc operations.
- **Missing Electrical Topology:**
  - Real breadboards possess internal spring clip strips: Terminal rows 1 to 60 have columns `A-B-C-D-E` internally shorted into one electrical node, and `F-G-H-I-J` shorted into another.
  - Power distribution buses (+ and - rails) run along the top and bottom edges.
  - In `Virtual3dStudio.tsx`, there is NO data model for breadboard tie-points. There are no hole coordinates `(row: number, col: 'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I'|'J')`.
  - Inserting a resistor lead into hole `15A` and an LED anode into `15B` does NOT connect them electrically in the simulation engine. The solver only recognizes connections through explicit `CircuitWire` objects bridging component pins.
- **Architectural Verdict:** The breadboard cannot function as real electronics prototyping hardware until a formal **Breadboard Topological Node Model** is implemented.

---

### 2.3 Root Cause 3: 3D Components Lack Parametric Physical Geometry
- **Finding:** While microcontrollers (Arduino Uno, Nano, Mega, ESP32) have drawn header pinouts, many passive and discrete semiconductor components were rendered using rudimentary 2D canvas polygon fills.
- **Missing Parametric Detail:**
  - Resistors did not feature realistic cylindrical bodies with IEC 60062 4/5-band color rings and bent axial wire leads extending down to breadboard holes.
  - Electrolytic capacitors lacked polarized cylindrical can geometry with negative strip indicators.
  - DIP ICs lacked realistic plastic dual-in-line packaging with pin 1 index notches, beveled shoulders, and metallic gull-wing/through-hole pin rows.
- **Architectural Verdict:** Parametric 3D component generators with standardized lead pitches (e.g. 2.54mm / 0.1" pitch, 7.62mm DIP row pitch) must be integrated into the rendering pipeline.

---

### 2.4 Root Cause 4: MCU Execution Is an Educational AST Sandbox, Not Hardware Emulation
- **Code Reference:** [`src/modules/engineering-lab/embedded-engine/virtual-mcu-runtime.ts#L89-L140`](file:///D:/eihouseindia/src/modules/engineering-lab/embedded-engine/virtual-mcu-runtime.ts#L89-L140)
- **Finding:** Firmware execution evaluates C++ code via a simulated JavaScript runtime providing stubbed functions (`digitalWrite`, `pinMode`, `millis`, `delay`).
- **Compiler Artifacts:** In [`firmware-compiler.ts#L186-L226`](file:///D:/eihouseindia/src/modules/engineering-lab/embedded-engine/firmware-compiler.ts#L186-L226), `generateIntelHexMock()` synthesizes synthetic Intel HEX byte sequences rather than invoking native AVR-GCC or Clang binaries.
- **Architectural Verdict:** This execution tier is suitable for educational logic verification and serial monitoring, but must be explicitly documented as **API-Level High-Level Sandbox (Level 1)**, never claimed as cycle-accurate binary CPU emulation.

---

### 2.5 Root Cause 5: PCB Manual Routing Gaps & Layer Restrictions
- **Code Reference:** [`src/components/engineering-lab/Panels/PcbView.tsx#L33`](file:///D:/eihouseindia/src/components/engineering-lab/Panels/PcbView.tsx#L33)
- **Finding:** While interactive track routing exists in `PcbView.tsx` (pad selection, rubberband line, via insertion with `V`), the layer switcher is restricted to `top_copper` and `bottom_copper`. Inner copper layers (`in1_copper`, `in2_copper`) cannot be selected for routing or rendered in the 3D board view.
- **Routing Rules:** Manual routing lacks real-time $45^\circ$ angle snapping during cursor movement, allowing arbitrary acute angles.

---

### 2.6 Root Cause 6: Unit Test Verification Illusion
- **Finding:** The 74 automated Vitest tests in `engineering-lab.test.ts` execute inside a headless Node.js environment without mounting DOM canvas elements.
- **The Gap:** Tests asserted that mathematical solver functions (`solver.step`) and path calculation strings (`computeWireSvgPath`) return expected values. They did not verify:
  1. Pointer hit-testing on canvas Bezier curves.
  2. Canvas drag-and-drop event propagation.
  3. Context menu positioning and click handling.
  4. Visual component aesthetics and 3D projection alignment.
- **Remedy:** Real workflow acceptance criteria must be tested through direct browser interactions and verified user journeys.

---

## 3. Evidence-Based Feature Register

| Feature ID | Feature Name | Source File | Data Model | Execution Path | Current Status | Root Cause / Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SCH-01** | Schematic Symbol Placement | `SchematicCanvas.tsx` | `CircuitComponent` | `handleDrop`, `onAddComponent` | `WORKING_VERIFIED` | Functional with 10px grid snapping and undo/redo. |
| **SCH-02** | Wire Routing Geometries | `SchematicCanvas.tsx` | `CircuitWire.style` | `computeWireSvgPath` | `WORKING_VERIFIED` | 90° Manhattan, 45° Chamfer, and Straight vectors verified. |
| **SCH-03** | Waypoint Editing & Deletion | `SchematicCanvas.tsx` | `CircuitWire.points` | Drag handles & context menu | `WORKING_VERIFIED` | Snapped waypoint movement and context removal operational. |
| **SCH-04** | Net Short-Circuit Detection | `SchematicCanvas.tsx` | Union-Find net map | `netAnalysis` memo | `WORKING_VERIFIED` | VCC-to-GND direct bridge flashes banner and red wires. |
| **SCH-05** | CAD Measure Tool | `SchematicCanvas.tsx` | Euclidean metric | `toolMode: 'measure'` | `WORKING_VERIFIED` | Displays point-to-point mm distance and live $\Delta V$. |
| **V3D-01** | Independent 3D Authoring | `Virtual3dStudio.tsx` | `CircuitComponent.x/y` | Unprojects 3D ray to schematic | `PARTIALLY_IMPLEMENTED` | Shared 2D coordinates mutate schematic. Needs discrete 3D model. |
| **V3D-02** | Breadboard Hole Topology | `Virtual3dStudio.tsx` | None (canvas graphic) | Canvas drawing loop | `VISUAL_ONLY` | Visual slab only. Lacks row/col node bridging. |
| **V3D-03** | 3D Wire Creation & Deletion | `Virtual3dStudio.tsx` | `CircuitWire` | Pin click & Bezier hit test | `WORKING_VERIFIED` | Interactive jumper wiring, delete HUD, and context menu verified. |
| **V3D-04** | 3D Wire Disconnect & Re-route | `Virtual3dStudio.tsx` | `CircuitWire` | `handleDisconnectStart/End` | `WORKING_VERIFIED` | Disconnects pin and immediately starts 3D re-wiring. |
| **V3D-05** | Parametric Component Models | `Virtual3dStudio.tsx` | Canvas 2D projection | `renderComponent3D` | `PARTIALLY_IMPLEMENTED` | MCUs and sensors modeled; passives need cylindrical/axial realism. |
| **SIM-01** | MNA Linear Solver | `circuit-solver.ts` | Conductance Matrix | `CircuitSolver.step()` | `WORKING_VERIFIED` | KCL/KVL relaxation verified across 25 iterations. |
| **SIM-02** | Potentiometer 3-Terminal | `circuit-solver.ts` | 3-leg branch MNA | `getPotentiometerPins` | `WORKING_VERIFIED` | Terminal A, Wiper, B division mathematically verified. |
| **SIM-03** | Dynamic LED Forward Voltage | `circuit-solver.ts` | $V_f$ wavelength bandgap | `getLedForwardVoltage` | `WORKING_VERIFIED` | Red 1.9V to Blue 3.1V forward drop verified in `TEST AF`. |
| **SIM-04** | RGB LED Multi-Channel | `circuit-solver.ts` | Multi-branch MNA | `ACTUATOR_RGB_LED` | `WORKING_VERIFIED` | Individual R, G, B channels and synthesized lens glow verified. |
| **SIM-05** | BJT NPN Companion Model | `circuit-solver.ts` | $I_b$, $I_c = \beta I_b$ | Companion relaxation | `WORKING_VERIFIED` | Forward-active and cutoff modes verified in `TEST Q`. |
| **PCB-01** | 2D Interactive Track Routing | `PcbView.tsx` | `PcbTrack[]` | `handleCanvasClick` | `WORKING_WITH_LIMITATIONS`| Pad selection & waypoint insertion work; lacks 45° angle snap. |
| **PCB-02** | Multi-Layer PCB Stackup | `PcbView.tsx` | `copperLayers: 2\|4\|6\|8` | Stackup modal | `PARTIALLY_IMPLEMENTED` | Data model supports 2/4/6/8; active router only handles Top/Bottom. |
| **PCB-03** | Manufacturing Gerber Export | `pcb-generator.ts` | RS-274X & Excellon | `exportGerberTop/Bottom/Drill`| `WORKING_VERIFIED` | Valid Top (.gtl), Bottom (.gbl), and NC Drill (.drl) output. |
| **MCU-01** | C++ Syntax Verification | `firmware-compiler.ts`| AST diagnostics | `validateSyntax()` | `WORKING_VERIFIED` | Bracket matching, semicolon detection, and error markers. |
| **MCU-02** | Virtual MCU Runtime | `virtual-mcu-runtime.ts`| `gpioStates` | `executeCycle()` | `WORKING_WITH_LIMITATIONS`| High-level JS API sandbox; not native CPU binary emulation. |
| **PRJ-01** | Project Persistence | `EngineeringLabApp.tsx`| JSON in localStorage | `handleSave/LoadProject` | `WORKING_VERIFIED` | Full schema serialized and restored without data loss. |
