# Schematic Editor Pause Checkpoint & Resume Handoff

## Git & Branch State
- Live Production Branch: `main` at `a1668bf` (100% untouched & live website safe — DO NOT merge/push until Schematic Editor is fully verified in browser).
- Active Feature Branch: `feat/schematic-editor-nav-sync` (base code commit `64ea01d`, 228/228 Vitest tests, 41/41 Next.js routes).

## Verified Working & STRICTLY LOCKED (0 Lines Allowed To Touch On Resume)
- 7-Tab Compact Navigation (`Schematic` -> `3D Studio` -> `Schematic Editor` -> `PCB Layout` -> `3D PCB` -> `Instruments` -> `MCU`)
- `Schematic` (2D Real-Time Circuit Simulation — restored & working properly!)
- `3D Studio`, `PCB Layout`, `3D PCB`, `Instruments`, `MCU`
- `LabHeader.tsx` (Run/Stop already hidden on `Schematic Editor`), `EngineeringLabApp.tsx` (simulation `x, y, rotation` already decoupled), `SchematicCanvas.tsx`, `circuit-solver.ts`, `studio-3d/**`, `pcb-engine/**`, `Pcb2dEditor.tsx`, `src/app/layout.tsx`.

## Exact Broken Items ONLY Inside `Schematic Editor` (Fix When Resuming)
1. **Tab-Switch Scramble Still Happening:** Switching `Schematic Editor -> Schematic Simulation -> Schematic Editor` still changes/scrambles the Schematic Editor circuit without any user update.
2. **Component Placement Broken:** Selecting a part from Component Library shows the mouse-following ghost, but clicking on the Schematic Editor canvas does NOT place it.
3. **Buttons Non-Functional:** Left-rail and top-bar buttons are rendered visually, but clicking them does not perform working EDA actions.
4. **Wire Add / Delete / Manual Fold Broken:** Adding wires does not work, wire delete button does not appear/work, and users cannot hold, move, or manually fold wires to their own corners.
5. **Goal on Resume:** Build a real, fully working professional Schematic Editor (KiCad / EasyEDA / Altium level) touching ONLY `SchematicEditorPanel.tsx`, `Panels/schematic-editor/**`, `schematic-sync-layout.ts`, and its tests — ZERO edits to any other page!

## Mandatory First Step When Resuming
- DO NOT write blind patches. First read the raw event handlers (`onMouseDown`, `onClick`, `onMouseMove`, `useEffect`, SVG/DOM overlay layering) in `SchematicEditorPanel.tsx` and print the exact lines blocking clicks/placement/tab persistence before fixing one feature at a time.
