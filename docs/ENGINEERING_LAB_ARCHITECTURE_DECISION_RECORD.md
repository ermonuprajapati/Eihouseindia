# Engineering Lab — Architecture Decision Record (ADR)
**Document:** ADR-001: Independent 3D Circuit Authoring Architecture & Breadboard Topological Node Engine  
**Status:** PROPOSED FOR APPROVAL (PHASE 0 GATE)  
**Date:** November 18, 2026  
**Auditor / Architect:** Antigravity Engineering System  

---

## 1. Context & Problem Statement

In the current implementation of the Universal Engineering Lab, `EngineeringProject` defines a single shared array of `components: CircuitComponent[]`. Each component contains only 2D schematic coordinates:
```typescript
export interface CircuitComponent {
  id: string;
  type: string;
  x: number; // 2D Schematic Canvas X
  y: number; // 2D Schematic Canvas Y
  rotation: 0 | 90 | 180 | 270;
  // ...
}
```

When a user switches to the 3D Virtual Studio, component positions are derived by projecting these schematic coordinates onto the 3D ground plane:
$$\text{compX} = (\text{comp.x} - 400) \times 0.7, \quad \text{compZ} = (\text{comp.y} - 300) \times 0.7$$

When a user drags a component in 3D, the 3D ray unprojects back into 2D coordinates and directly mutates `comp.x` and `comp.y`. 

### Key Deficiencies Caused by Current Architecture:
1. **Destructive Coupling:** Moving a component on the breadboard in 3D scrambles and overlaps the 2D schematic diagram.
2. **Missing Breadboard Physicality:** Components float arbitrarily on the canvas rather than plugging into discrete breadboard terminal holes `(Row 1..60, Column A..J)`.
3. **No Automatic Breadboard Net Bridging:** Inserting two component pins into the same 5-hole tie-strip (e.g. Row 12, Columns A & C) does not connect them electrically. Users are forced to draw visual jumper wires even between adjacent holes on the same strip.
4. **Schematic Precondition:** Users cannot author an independent physical circuit directly in 3D without an underlying schematic.

---

## 2. Decision: 3 Distinct, Interoperable Workspace Models

To satisfy the non-negotiable requirement for an **Independent 3D Virtual Electronics Studio**, the architecture is structured into three discrete but interoperable models:

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Workspace A: 2D Schematic   │       │   Workspace C: Independent 3D   │
│  - Symbolic representations     │       │  - Solderless Breadboards       │
│  - IEEE 315 / IEC 60617 symbols │       │  - Discrete Tie-Holes (Row/Col) │
│  - Orthogonal & Chamfer wires   │       │  - Physical package bodies      │
│  - Schematic (X, Y) layout      │       │  - 3D curved jumper wires       │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │                                         │
                 │   ┌─────────────────────────────────┐   │
                 └──>│   Bidirectional Sync Adapter    │<──┘
                     │  - Pin identity preservation    │
                     │  - Netlist reconciliation       │
                     │  - Non-destructive translation  │
                     └────────────────┬────────────────┘
                                      │
                                      ▼
                     ┌─────────────────────────────────┐
                     │   Modified Nodal Analysis (MNA) │
                     │   Circuit Simulation Solver     │
                     └─────────────────────────────────┘
```

---

## 3. Detailed Data Model Specification

### 3.1 The 3D Breadboard Topology Model
A standard full-size solderless breadboard (830 tie-points) possesses an exact physical grid and electrical continuity:
- **Terminal Strips:** 60 rows $\times$ 2 banks (Bank 1: Columns A, B, C, D, E; Bank 2: Columns F, G, H, I, J).
  - Every 5-hole group shares a single internal spring contact clip (1 electrical node).
  - A center $0.3\text{ inch}$ ($7.62\text{mm}$) divider trench isolates Bank 1 from Bank 2 for standard DIP IC insertion.
- **Power Distribution Rails:** 4 rails (Top +, Top -, Bottom +, Bottom -).
  - Each rail is continuous across 50 tie-points (or split at center with 5-hole groups).

```typescript
export interface BreadboardHoleCoord {
  section: 'terminal' | 'power_top' | 'power_bottom';
  row: number; // 1 to 60 for terminal strip; 1 to 50 for power rails
  col: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | '+' | '-';
}

export interface BreadboardInstance {
  id: string;
  type: 'BREADBOARD_FULL_830' | 'BREADBOARD_HALF_400' | 'BREADBOARD_MINI_170';
  xMm: number;
  yMm: number;
  rotation: 0 | 90 | 180 | 270;
}
```

### 3.2 The Independent 3D Component Placement Model
```typescript
export interface Virtual3dComponentPlacement {
  id: string;
  componentId: string; // Links to COMPONENT_CATALOG template
  type: string;
  label: string;
  value: string;
  packageType: 'THT' | 'DIP' | 'TO-92' | 'DEV_BOARD' | 'MODULE';
  model3dId: string;
  worldPos: { x: number; y: number; z: number };
  rotationDeg: { x: number; y: number; z: number };
  // Pin-to-Breadboard Insertion Mapping
  pinInsertions: Record<string, {
    breadboardId: string;
    hole: BreadboardHoleCoord;
  }>;
  parameters: Record<string, unknown>;
}
```

### 3.3 The 3D Jumper Wire Model
```typescript
export interface Virtual3dWire {
  id: string;
  color: string;
  gaugeAwg: number; // e.g. 22 AWG solid-core
  from: {
    type: 'breadboard_hole' | 'component_pin';
    targetId: string; // breadboardId or componentPlacementId
    pinIdOrHole: string | BreadboardHoleCoord;
  };
  to: {
    type: 'breadboard_hole' | 'component_pin';
    targetId: string;
    pinIdOrHole: string | BreadboardHoleCoord;
  };
  controlPoints3d?: { x: number; y: number; z: number }[];
  netName?: string;
}
```

---

## 4. Breadboard Netlist Synthesis Engine

When a circuit is designed in the 3D Studio, electrical connectivity is resolved via a two-stage topological compilation:

1. **Breadboard Node Grouping:**
   - For every breadboard, generate canonical net IDs for each internal tie-strip:
     - Terminal Row $r$, Bank 1: `BB_${bb.id}_T_${r}_ABCDE`
     - Terminal Row $r$, Bank 2: `BB_${bb.id}_T_${r}_FGHIJ`
     - Power Rails: `BB_${bb.id}_PWR_TOP_POS`, `BB_${bb.id}_PWR_TOP_NEG`, etc.
   - Any component pin inserted into hole $(r, A)$ through $(r, E)$ is automatically unified into net `BB_${bb.id}_T_${r}_ABCDE`.

2. **Jumper Wire Bridging:**
   - Any 3D wire connecting terminal hole $H_1$ to $H_2$ unifies the net of $H_1$ with the net of $H_2$ using Union-Find.
   - The compiled netlist is passed directly to `CircuitSolver.step()`.

**Result:** A user can plug an LED into rows 10 & 11, insert a resistor into rows 11 & 15, and insert 5V/GND wires into rows 10 & 15. The circuit simulates immediately based on physical breadboard insertion without requiring manual pin-to-pin wires!

---

## 5. Non-Destructive Bidirectional Synchronization

To prevent edits in 3D from destroying the 2D schematic layout:
1. `EngineeringProject` preserves both representations:
   - `project.schematic`: Dedicated 2D schematic data (`components`, `wires`, `netLabels`).
   - `project.virtual3d`: Dedicated 3D physical data (`breadboards`, `placements`, `wires3d`).
2. **Synchronization Rules:**
   - **Schematic $\to$ 3D:** When schematic changes, supported physical footprints are updated without disturbing existing breadboard placements unless the user chooses *"Auto-Place on Breadboard"*.
   - **3D $\to$ Schematic:** When a 3D circuit is authored from scratch, switching to Schematic synthesizes clean symbolic components with auto-routed Manhattan wires, retaining identical electrical connectivity.

---

## 6. Implementation Status & Rollout Plan

- **Phase 0:** Deliver Audit Report, Feature Matrix, ADR, and Implementation Plan (Current).
- **Phase 1:** Implement Breadboard Topological Grid (`BreadboardTopologyEngine`) and Independent 3D Document Schema.
- **Phase 2:** Upgrade 3D Studio Rendering with Parametric Components (axial resistors with color bands, electrolytic cans, DIP ICs).
- **Phase 3:** Integrate Breadboard Netlist Compiler with `CircuitSolver`.
- **Phase 4:** Expand PCB Multi-Layer Routing (Inner copper layers) and $45^\circ$ angle snapping.
- **Phase 5:** Comprehensive Browser Workflow Acceptance Verification.
