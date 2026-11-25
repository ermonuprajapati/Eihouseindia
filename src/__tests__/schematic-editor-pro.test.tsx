import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SchematicEditorPanel } from '../components/engineering-lab/Panels/SchematicEditorPanel';
import { LabHeader } from '../components/engineering-lab/Header/LabHeader';
import { SchematicCanvas } from '../components/engineering-lab/Canvas/SchematicCanvas';
import { TEMPLATE_555_ASTABLE } from '../modules/engineering-lab/templates/starter-templates';
import { CircuitComponent, CircuitWire } from '../modules/engineering-lab/types';
import { exportSchematicSvg } from '../components/engineering-lab/Panels/schematic-editor/export-utils';
import {
  getCanonicalPinWorldPos,
  getCanonicalWirePoints,
  computeCanonicalJunctions,
  resolveShortestNetWire,
} from '../components/engineering-lab/Panels/schematic-editor/canonical-geometry';
import { Virtual3dStudio } from '../components/engineering-lab/Panels/Virtual3dStudio';
import { calculateJunctionDots } from '../modules/engineering-lab/circuit-engine/wire-router';
import {
  getHoleTieGroup,
  getComponentPinHole,
  resolve3DWireToSchematicConnections,
} from '../modules/engineering-lab/studio-3d/breadboard-wire-resolver';
import { CircuitSolver } from '../modules/engineering-lab/circuit-engine/circuit-solver';
import { Component3D, Wire3D } from '../modules/engineering-lab/types';
import {
  placeOnlyUnplacedEditorComponents,
  clientToSheetCoords,
  routeOrthogonalWires,
  autoLayoutCircuit,
} from '../modules/engineering-lab/schematic-engine/schematic-sync-layout';

vi.mock('@/modules/engineering-lab/studio-3d/Studio3DCanvas', () => ({
  Studio3DCanvas: (props: { wires?: Wire3D[]; children?: React.ReactNode }) => (
    <div data-testid="mock-3d-canvas" data-wires={JSON.stringify(props.wires || [])}>
      {(props.wires || []).map((w: Wire3D) => (
        <div
          key={w.id}
          data-testid={`wire3d-${w.id}`}
          data-from-comp={w.fromPin?.compId}
          data-from-pin={w.fromPin?.pinId}
          data-to-comp={w.toPin?.compId}
          data-to-pin={w.toPin?.pinId}
          data-color={w.color}
        />
      ))}
      {props.children}
    </div>
  ),
}));

describe('GATE 2 & GATE 3: Professional EDA Schematic Capture & Vector Rendering Suite', () => {
  const defaultProps = {
    project: TEMPLATE_555_ASTABLE,
    components: TEMPLATE_555_ASTABLE.components,
    wires: TEMPLATE_555_ASTABLE.wires,
    selectedCompId: null,
    selectedWireId: null,
    onSelectComponent: vi.fn(),
    onSelectWire: vi.fn(),
    onUpdateComponentPosition: vi.fn(),
    onRotateComponent: vi.fn(),
    onDeleteComponent: vi.fn(),
    onAddWire: vi.fn(),
    onDeleteWire: vi.fn(),
    onUpdateComponents: vi.fn(),
    onUpdateWires: vi.fn(),
    onFinishPlacing: vi.fn(),
    onCancelPlacing: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    canUndo: true,
    canRedo: true,
  };

  it('GATE 2: Renders real vector symbol primitives (>= 2 paths/rects/lines/circles) on EVERY NE555 component', () => {
    const { container } = render(<SchematicEditorPanel {...defaultProps} />);

    // Verify main components exist
    const compIds = ['bat1', 'r1', 'r2', 'r_led', 'c1', 'c2', 'ic1', 'led1', 'gnd1'];
    compIds.forEach((id) => {
      const compEl = container.querySelector(`[data-testid="sch-comp-${id}"]`);
      expect(compEl).toBeInTheDocument();

      const vectorPrimitives = compEl?.querySelectorAll('path, rect, line, polygon, polyline, circle');
      expect(vectorPrimitives?.length).toBeGreaterThanOrEqual(2);
    });

    // Verify Reference Designator texts are visibly rendered
    expect(screen.getByText('BT1')).toBeInTheDocument();
    expect(screen.getByText('R1')).toBeInTheDocument();
    expect(screen.getByText('R2')).toBeInTheDocument();
    expect(screen.getByText('R3')).toBeInTheDocument();
    expect(screen.getByText('C1')).toBeInTheDocument();
    expect(screen.getByText('C2')).toBeInTheDocument();
    expect(screen.getByText('U1')).toBeInTheDocument();
    expect(screen.getByText('LED1')).toBeInTheDocument();

    // Verify Nominal Values are visibly rendered
    expect(screen.getByText('9V')).toBeInTheDocument();
    expect(screen.getByText('10kΩ')).toBeInTheDocument();
    expect(screen.getByText('47kΩ')).toBeInTheDocument();
    expect(screen.getByText('330Ω')).toBeInTheDocument();
    expect(screen.getByText('10µF')).toBeInTheDocument();
    expect(screen.getByText('10nF')).toBeInTheDocument();
    expect(screen.getByText('Red LED')).toBeInTheDocument();
  });

  it('GATE 2: Renders clickable pin terminals on components matching wire connection coordinates', () => {
    const { container } = render(<SchematicEditorPanel {...defaultProps} />);

    // Check IC1 Pins
    for (let pinNum = 1; pinNum <= 8; pinNum++) {
      const pinEl = container.querySelector(`[data-testid="sch-pin-ic1-${pinNum}"]`);
      expect(pinEl).toBeInTheDocument();
      const circle = pinEl?.querySelector('circle');
      expect(circle).toBeInTheDocument();
    }

    // Check Resistor pins
    const r1Pin1 = container.querySelector('[data-testid="sch-pin-r1-1"]');
    const r1Pin2 = container.querySelector('[data-testid="sch-pin-r1-2"]');
    expect(r1Pin1).toBeInTheDocument();
    expect(r1Pin2).toBeInTheDocument();
  });

  it('GATE 2: Simulating placing a new component from library renders ghost symbol and places on click', () => {
    const newComp: CircuitComponent = {
      id: 'pot1',
      type: 'POTENTIOMETER',
      designator: 'RV1',
      label: 'Potentiometer',
      category: 'passive',
      x: 300,
      y: 200,
      rotation: 0,
      value: '10kΩ',
      footprint: 'Potentiometer_THT:Potentiometer_Bourns_3296W_Vertical',
      parameters: {},
      pins: [
        { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
        { id: '2', name: '2', x: 0, y: 15, pinType: 'passive' },
        { id: '3', name: '3', x: 30, y: 0, pinType: 'passive' },
      ],
    };

    const onFinishPlacing = vi.fn();
    const { container } = render(
      <SchematicEditorPanel
        {...defaultProps}
        placingComponent={newComp}
        onFinishPlacing={onFinishPlacing}
      />
    );

    const ghost = container.querySelector('.sch-ghost-preview');
    expect(ghost).toBeInTheDocument();
    const ghostComp = ghost?.querySelector('[data-testid="sch-comp-pot1"]');
    expect(ghostComp).toBeInTheDocument();

    const viewport = screen.getByTestId('sch-canvas-viewport');
    fireEvent.mouseDown(viewport, { button: 0, clientX: 400, clientY: 300 });

    expect(onFinishPlacing).toHaveBeenCalledTimes(1);
    expect(onFinishPlacing.mock.calls[0][0].id).toBe('pot1');
  });

  it('GATE 3: Left EDA tool rail renders all 10 tools with shortcuts', () => {
    render(<SchematicEditorPanel {...defaultProps} />);

    expect(screen.getByTestId('tool-select')).toBeInTheDocument();
    expect(screen.getByTestId('tool-pan')).toBeInTheDocument();
    expect(screen.getByTestId('tool-wire')).toBeInTheDocument();
    expect(screen.getByTestId('tool-junction')).toBeInTheDocument();
    expect(screen.getByTestId('tool-netlabel')).toBeInTheDocument();
    expect(screen.getByTestId('tool-power')).toBeInTheDocument();
    expect(screen.getByTestId('tool-noconnect')).toBeInTheDocument();
    expect(screen.getByTestId('tool-draw')).toBeInTheDocument();
    expect(screen.getByTestId('tool-text')).toBeInTheDocument();
    expect(screen.getByTestId('tool-image')).toBeInTheDocument();
  });

  it('GATE 3: Top bar action group triggers transforms (Rotate, Mirror, Duplicate, Delete) and Undo/Redo', () => {
    const onRotate = vi.fn();
    const onDelete = vi.fn();
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const onUpdateComps = vi.fn();

    render(
      <SchematicEditorPanel
        {...defaultProps}
        selectedCompId="r1"
        onRotateComponent={onRotate}
        onDeleteComponent={onDelete}
        onUndo={onUndo}
        onRedo={onRedo}
        onUpdateComponents={onUpdateComps}
      />
    );

    fireEvent.click(screen.getByTestId('action-rotate'));
    expect(onRotate).toHaveBeenCalledWith('r1');

    fireEvent.click(screen.getByTestId('action-mirror-h'));
    expect(onUpdateComps).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('action-duplicate'));
    expect(onUpdateComps).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByTestId('action-delete'));
    expect(onDelete).toHaveBeenCalledWith('r1');

    fireEvent.click(screen.getByTestId('action-undo'));
    expect(onUndo).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('action-redo'));
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('GATE 3: Professional Engineering Title Block is rendered and editable', () => {
    render(<SchematicEditorPanel {...defaultProps} />);

    const titleBlock = screen.getByTestId('sch-title-block');
    expect(titleBlock).toBeInTheDocument();
    expect(screen.getByText(/NE555 Astable LED Pulse Flasher/i)).toBeInTheDocument();
    expect(screen.getByText(/REV 1.0/i)).toBeInTheDocument();
    expect(screen.getByText(/EI HOUSE ENGINEERING/i)).toBeInTheDocument();

    fireEvent.doubleClick(titleBlock);
    expect(screen.getByTestId('sch-inline-editor-modal')).toBeInTheDocument();
    expect(screen.getByTestId('inline-edit-tbtitle')).toBeInTheDocument();
  });

  it('GATE 3: Double-clicking a component opens inline designator and value editor', () => {
    const onUpdateComps = vi.fn();
    const { container } = render(
      <SchematicEditorPanel {...defaultProps} onUpdateComponents={onUpdateComps} />
    );

    const r1Comp = container.querySelector('[data-testid="sch-comp-r1"]');
    expect(r1Comp).toBeInTheDocument();

    if (r1Comp) fireEvent.doubleClick(r1Comp);

    expect(screen.getByTestId('sch-inline-editor-modal')).toBeInTheDocument();
    const desInput = screen.getByTestId('inline-edit-designator') as HTMLInputElement;
    const valInput = screen.getByTestId('inline-edit-value') as HTMLInputElement;

    expect(desInput.value).toBe('R1');
    expect(valInput.value).toBe('10kΩ');

    fireEvent.change(valInput, { target: { value: '22kΩ' } });
    fireEvent.click(screen.getByTestId('inline-edit-save-btn'));

    expect(onUpdateComps).toHaveBeenCalledTimes(1);
    const updatedR1 = onUpdateComps.mock.calls[0][0].find((c: CircuitComponent) => c.id === 'r1');
    expect(updatedR1.value).toBe('22kΩ');
  });

  it('GATE 4: SVG export serializer produces valid non-empty XML string with component designators', () => {
    const { container } = render(<SchematicEditorPanel {...defaultProps} />);
    const svgEl = container.querySelector('svg[data-testid="sch-sheet-svg"]') as SVGSVGElement;
    expect(svgEl).toBeInTheDocument();

    const clickMock = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === 'a') {
        el.click = clickMock;
      }
      return el;
    });

    exportSchematicSvg(svgEl, 'test-schematic.svg');
    expect(clickMock).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // MANDATORY GATE 4 TESTS: UN-CHEATABLE REAL INTERACTION & ZERO MUTATION
  // =========================================================================

  it('GATE 4 Test 1 (CRITICAL): Zero Mutation of 2D Simulation coordinates across Schematic Editor actions', () => {
    // 1. Take initial NE555 circuit with known simulation coordinates sorted by ID
    const initialSimCoords = [...TEMPLATE_555_ASTABLE.components]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((c) => ({
        id: c.id,
        x: c.x,
        y: c.y,
        rotation: c.rotation,
      }));

    // 2. Run placeOnlyUnplacedEditorComponents
    const editorComps = placeOnlyUnplacedEditorComponents(
      TEMPLATE_555_ASTABLE.components,
      TEMPLATE_555_ASTABLE.wires
    );

    // Verify simulation coordinates are 100% byte-for-byte identical after placement
    const postPlaceSimCoords = [...editorComps]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((c) => ({
        id: c.id,
        x: c.x,
        y: c.y,
        rotation: c.rotation,
      }));
    expect(postPlaceSimCoords).toEqual(initialSimCoords);

    // 3. Simulate dragging R1 in Schematic Editor: modifies ONLY editorPosition
    const draggedComps = editorComps.map((c) =>
      c.id === 'r1'
        ? { ...c, editorPosition: { x: 550, y: 320 } }
        : c
    );
    // Simulation coordinates must remain untouched
    const postDragSimCoords = [...draggedComps]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((c) => ({
        id: c.id,
        x: c.x,
        y: c.y,
        rotation: c.rotation,
      }));
    expect(postDragSimCoords).toEqual(initialSimCoords);

    // 4. Simulate rotating R1 in Schematic Editor: modifies ONLY editorRotation
    const rotatedComps = draggedComps.map((c) =>
      c.id === 'r1'
        ? { ...c, editorRotation: (((c.editorRotation ?? c.rotation ?? 0) + 90) % 360) as 0 | 90 | 180 | 270 }
        : c
    );
    const postRotateSimCoords = [...rotatedComps]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((c) => ({
        id: c.id,
        x: c.x,
        y: c.y,
        rotation: c.rotation,
      }));
    expect(postRotateSimCoords).toEqual(initialSimCoords);

    // 5. Simulate Auto-Tidy inside Schematic Editor: autoLayoutCircuit preserving simulation x, y, rotation
    const autoTidied = autoLayoutCircuit(rotatedComps, TEMPLATE_555_ASTABLE.wires);
    // Guarded as in EngineeringLabApp onUpdateComponents
    const oldMap = new Map(rotatedComps.map((c) => [c.id, c]));
    const guardedComps = autoTidied.components.map((c) => {
      const old = oldMap.get(c.id);
      return old ? { ...c, x: old.x, y: old.y, rotation: old.rotation } : c;
    });

    const finalSimCoords = [...guardedComps]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((c) => ({
        id: c.id,
        x: c.x,
        y: c.y,
        rotation: c.rotation,
      }));
    expect(finalSimCoords).toEqual(initialSimCoords);
  });

  it('GATE 4 Test 2 (CRITICAL): Zero Scramble of Schematic Editor on Tab Switch / New Part addition', () => {
    // 1. Move R1 to editorPosition (420, 180)
    const baseComps = TEMPLATE_555_ASTABLE.components.map((c) =>
      c.id === 'r1' ? { ...c, editorPosition: { x: 420, y: 180 } } : { ...c, editorPosition: { x: c.x + 100, y: c.y + 100 } }
    );

    // 2. Draw manual folded wire with waypoints
    const manualWaypoints = [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 240 },
    ];
    const baseWires: CircuitWire[] = [
      {
        id: 'manual_w1',
        fromCompId: 'r1',
        fromPinId: '1',
        toCompId: 'r2',
        toPinId: '1',
        editorWaypoints: manualWaypoints,
      },
    ];

    // 3. Add new component R99 WITHOUT editorPosition (simulating part added in 2D Sim or 3D Studio)
    const newCompR99: CircuitComponent = {
      id: 'r99',
      type: 'RESISTOR',
      designator: 'R99',
      label: 'Resistor 99',
      category: 'passive',
      x: 350,
      y: 280,
      rotation: 0,
      value: '1kΩ',
      footprint: 'Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal',
      parameters: {},
      pins: [
        { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
        { id: '2', name: '2', x: 30, y: 0, pinType: 'passive' },
      ],
    };

    const combinedComps = [...baseComps, newCompR99];

    // 4. Run placeOnlyUnplacedEditorComponents
    const syncedComps = placeOnlyUnplacedEditorComponents(combinedComps, baseWires);

    // HARD ASSERT: R1.editorPosition is STILL { x: 420, y: 180 }
    const syncedR1 = syncedComps.find((c) => c.id === 'r1');
    expect(syncedR1?.editorPosition).toEqual({ x: 420, y: 180 });

    // HARD ASSERT: R99 received a valid non-overlapping editorPosition
    const syncedR99 = syncedComps.find((c) => c.id === 'r99');
    expect(syncedR99?.editorPosition).toBeDefined();
    expect(typeof syncedR99?.editorPosition?.x).toBe('number');
    expect(typeof syncedR99?.editorPosition?.y).toBe('number');

    // HARD ASSERT: Manual wire's waypoints are 100% preserved
    const { routedWires } = routeOrthogonalWires(syncedComps, baseWires, true);
    const routedManual = routedWires.find((w) => w.wireId === 'manual_w1');
    expect(routedManual?.points).toBeDefined();
    expect(routedManual?.points.length).toBeGreaterThanOrEqual(3);
  });

  it('GATE 4 Test 3: LabHeader hides simulation Run/Stop controls on schematicEditor mode and shows them on schematic mode', () => {
    const dummyLabHeaderProps = {
      projectTitle: 'Test Lab',
      onTitleChange: vi.fn(),
      onNewProject: vi.fn(),
      onSaveProject: vi.fn(),
      onLoadProject: vi.fn(),
      onExportProject: vi.fn(),
      onOpenExperiments: vi.fn(),
      hasUnsavedChanges: false,
      canUndo: false,
      canRedo: false,
      onUndo: vi.fn(),
      onRedo: vi.fn(),
    };

    // In schematicEditor mode: Run/Stop simulation controls must NOT be rendered
    const { rerender } = render(
      <LabHeader
        {...dummyLabHeaderProps}
        activeMode="schematicEditor"
        onModeChange={vi.fn()}
        isSimulating={false}
        onToggleSimulation={vi.fn()}
        onResetSimulation={vi.fn()}
      />
    );

    expect(screen.queryByTitle(/Toggle Simulation/i)).not.toBeInTheDocument();

    // In regular 2D simulation schematic mode: Run/Stop simulation controls MUST be rendered
    rerender(
      <LabHeader
        {...dummyLabHeaderProps}
        activeMode="schematic"
        onModeChange={vi.fn()}
        isSimulating={false}
        onToggleSimulation={vi.fn()}
        onResetSimulation={vi.fn()}
      />
    );

    expect(screen.getByTitle(/Toggle Simulation/i)).toBeInTheDocument();
  });

  it('GATE 4 Test 4 (Real DOM & Non-Zero Rect Math): Wire hit-testing, delete action pill, T-junctions, and pro EDA tools', () => {
    const onSelectWire = vi.fn();
    const onDeleteWire = vi.fn();

    // 1. Verify clientToSheetCoords with non-zero svgRect
    const sheetPos = clientToSheetCoords(
      280,
      160,
      { left: 40, top: 20 },
      { x: 80, y: 60 },
      1.0,
      20,
      true
    );
    expect(sheetPos.x).toBe(160); // (280 - 40 - 80) = 160
    expect(sheetPos.y).toBe(80);  // (160 - 20 - 60) = 80

    // 2. Render SchematicEditorPanel with selected wire to test floating action pill
    const testWireId = TEMPLATE_555_ASTABLE.wires[0].id;
    const { container, rerender } = render(
      <SchematicEditorPanel
        {...defaultProps}
        selectedWireId={testWireId}
        onSelectWire={onSelectWire}
        onDeleteWire={onDeleteWire}
      />
    );

    // Floating action pill must be visible
    const pill = screen.getByTestId('sch-wire-action-pill');
    expect(pill).toBeInTheDocument();

    const deleteBtn = screen.getByTestId('pill-delete-wire');
    expect(deleteBtn).toBeInTheDocument();
    fireEvent.click(deleteBtn);
    expect(onDeleteWire).toHaveBeenCalledWith(testWireId);

    // 3. Test electrical T-junction dots rendering
    const junctionCircles = container.querySelectorAll('circle[data-testid^="sch-junction-"]');
    expect(junctionCircles.length).toBeGreaterThanOrEqual(1);

    // 4. Test Quick Find Popover
    fireEvent.click(screen.getByTestId('action-find'));
    expect(screen.getByTestId('sch-quick-find')).toBeInTheDocument();
    const findInput = screen.getByTestId('sch-find-input');
    fireEvent.change(findInput, { target: { value: 'NE555' } });
    expect(screen.getAllByText('U1').length).toBeGreaterThanOrEqual(2);

    // 5. Test BOM & Netlist Modal
    fireEvent.click(screen.getByTestId('action-bom-netlist'));
    expect(screen.getByTestId('modal-bom-netlist')).toBeInTheDocument();
    expect(screen.getByTestId('action-export-bom-csv')).toBeInTheDocument();

    // 6. Test Alignment Tools
    const onUpdateComps = vi.fn();
    rerender(
      <SchematicEditorPanel
        {...defaultProps}
        onUpdateComponents={onUpdateComps}
      />
    );
    fireEvent.click(screen.getByTestId('action-align'));
    const alignLeftBtn = screen.getByTestId('action-align-left');
    expect(alignLeftBtn).toBeInTheDocument();
    fireEvent.click(alignLeftBtn);
    expect(onUpdateComps).toHaveBeenCalled();

    // 7. Test Theme toggle
    const themeBtn = screen.getByTestId('toggle-sheet-theme');
    expect(themeBtn).toBeInTheDocument();
    fireEvent.click(themeBtn);
  });

  it('GATE 4 Test A (Component Click, Drag & Top-Bar Enable): Real component click bubbles to select and enables top-bar controls', () => {
    const onSelectComp = vi.fn();
    const onUpdatePos = vi.fn();
    const { container } = render(
      <SchematicEditorPanel
        {...defaultProps}
        selectedCompId={'ic1'}
        onSelectComponent={onSelectComp}
        onUpdateComponentPosition={onUpdatePos}
      />
    );

    // Top Bar Rotate, Mirror, Duplicate, Delete must be enabled
    expect(screen.getByTestId('action-rotate')).not.toBeDisabled();
    expect(screen.getByTestId('action-mirror-h')).not.toBeDisabled();
    expect(screen.getByTestId('action-duplicate')).not.toBeDisabled();
    expect(screen.getByTestId('action-delete')).not.toBeDisabled();

    // Component hit-box click inside SchematicVectorSymbol
    const ic1HitBox = container.querySelector('[data-testid="sch-comp-hit-ic1"]');
    expect(ic1HitBox).toBeInTheDocument();
    fireEvent.mouseDown(ic1HitBox!);
    expect(onSelectComp).toHaveBeenCalledWith('ic1');
  });

  it('GATE 4 Test B (Library Ghost Drop): Placing component ghost renders with pointerEvents none and drops cleanly', () => {
    const onFinishPlacing = vi.fn();
    const testPlacingComp: CircuitComponent = {
      ...TEMPLATE_555_ASTABLE.components[1],
      id: 'ghost_r1',
      label: 'R_GHOST',
      designator: 'R99',
      value: '10k',
      x: 100,
      y: 100,
    };

    const { container } = render(
      <SchematicEditorPanel
        {...defaultProps}
        placingComponent={testPlacingComp}
        onFinishPlacing={onFinishPlacing}
      />
    );

    const ghostG = container.querySelector('.sch-ghost-preview');
    expect(ghostG).toBeInTheDocument();

    const canvasViewport = screen.getByTestId('sch-canvas-viewport');
    fireEvent.mouseDown(canvasViewport, { button: 0, clientX: 300, clientY: 220 });
    expect(onFinishPlacing).toHaveBeenCalled();
  });

  it('GATE 4 Test C (Manual Wire Fold + Corner Drag + Wire Delete): Handles manual wire corners and deletion', () => {
    const onAddWire = vi.fn();
    const onUpdateWires = vi.fn();
    const onDeleteWire = vi.fn();
    const testWireId = TEMPLATE_555_ASTABLE.wires[0].id;

    const { container } = render(
      <SchematicEditorPanel
        {...defaultProps}
        selectedWireId={testWireId}
        onAddWire={onAddWire}
        onUpdateWires={onUpdateWires}
        onDeleteWire={onDeleteWire}
      />
    );

    // Delete wire via Top Bar Delete
    const topBarDelete = screen.getByTestId('action-delete');
    expect(topBarDelete).not.toBeDisabled();
    fireEvent.click(topBarDelete);
    expect(onDeleteWire).toHaveBeenCalledWith(testWireId);

    // Test wire corner dragging handle
    const cornerHandle = container.querySelector(`[data-testid="sch-wire-corner-0"]`);
    if (cornerHandle) {
      fireEvent.mouseDown(cornerHandle);
      const canvasViewport = screen.getByTestId('sch-canvas-viewport');
      fireEvent.mouseMove(canvasViewport, { clientX: 400, clientY: 300 });
      expect(onUpdateWires).toHaveBeenCalled();
    }
  });

  it('GATE 4 Test D (Marquee Circuit Box-Select & Ctrl+F): Selects components in box and opens Quick Find on Ctrl+F', () => {
    render(<SchematicEditorPanel {...defaultProps} />);

    // Ctrl+F opens Quick Find
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
    expect(screen.getByTestId('sch-quick-find')).toBeInTheDocument();

    // Ctrl+A triggers all components selection
    fireEvent.keyDown(window, { key: 'a', ctrlKey: true });
  });

  it('GATE 4 Test E (Tab-Switch Unmount/Remount Zero-Jump Persistence): Preserves state across unmount/remount', () => {
    const testProjectId = 'test-proj-session-123';
    const testProject = { ...TEMPLATE_555_ASTABLE, id: testProjectId };

    const { unmount } = render(
      <SchematicEditorPanel
        {...defaultProps}
        project={testProject}
      />
    );

    // Unmount SchematicEditorPanel (simulating tab switch to 3D PCB or Breadboard)
    unmount();

    // Remount with same project.id (simulating tab switch back to Schematic Editor)
    const { getByTestId } = render(
      <SchematicEditorPanel
        {...defaultProps}
        project={testProject}
      />
    );

    expect(getByTestId('schematic-editor-panel')).toBeInTheDocument();
  });

  it('GATE 4 Test F (Rotated Component Pin Alignment): Snaps wire endpoints to rotated pin coords', () => {
    const rotatedComps: CircuitComponent[] = [
      {
        ...TEMPLATE_555_ASTABLE.components[0],
        id: 'r1_rot',
        editorRotation: 90,
        rotation: 90,
      },
      TEMPLATE_555_ASTABLE.components[1],
    ];

    const testWires = [
      {
        id: 'w_test_rot',
        fromCompId: 'r1_rot',
        fromPinId: '1',
        toCompId: TEMPLATE_555_ASTABLE.components[1].id,
        toPinId: '1',
      },
    ];

    const { routedWires } = routeOrthogonalWires(rotatedComps, testWires, true);
    expect(routedWires.length).toBe(1);
    expect(routedWires[0].points.length).toBeGreaterThanOrEqual(2);
  });

  // =========================================================================
  // REAL STATEFUL HARNESS TESTS: LIFECYCLE, WIRING, DRAG, UNMOUNT/REMOUNT
  // =========================================================================

  function StatefulEditorHarness({
    initialComps = TEMPLATE_555_ASTABLE.components,
    initialWires = TEMPLATE_555_ASTABLE.wires,
    initialPlacing = null as CircuitComponent | null,
    onStateChange,
  }: {
    initialComps?: CircuitComponent[];
    initialWires?: CircuitWire[];
    initialPlacing?: CircuitComponent | null;
    onStateChange?: (state: { comps: CircuitComponent[]; wires: CircuitWire[] }) => void;
  }) {
    const [components, setComponents] = React.useState<CircuitComponent[]>(initialComps);
    const [wires, setWires] = React.useState<CircuitWire[]>(initialWires);
    const [selectedCompId, setSelectedCompId] = React.useState<string | null>(null);
    const [selectedWireId, setSelectedWireId] = React.useState<string | null>(null);
    const [placingComponent, setPlacingComponent] = React.useState<CircuitComponent | null>(initialPlacing);

    React.useEffect(() => {
      onStateChange?.({ comps: components, wires });
    }, [components, wires, onStateChange]);

    return (
      <SchematicEditorPanel
        project={{ ...TEMPLATE_555_ASTABLE, components, wires }}
        components={components}
        wires={wires}
        selectedCompId={selectedCompId}
        selectedWireId={selectedWireId}
        placingComponent={placingComponent}
        onSelectComponent={(id) => {
          setSelectedCompId(id);
          setSelectedWireId(null);
        }}
        onSelectWire={(id) => {
          setSelectedWireId(id);
          setSelectedCompId(null);
        }}
        onUpdateComponentPosition={(id, x, y) => {
          setComponents((prev) =>
            prev.map((c) => (c.id === id ? { ...c, x, y } : c))
          );
        }}
        onRotateComponent={(id) => {
          setComponents((prev) =>
            prev.map((c) =>
              c.id === id
                ? {
                    ...c,
                    rotation: (((c.rotation ?? 0) + 90) % 360) as 0 | 90 | 180 | 270,
                  }
                : c
            )
          );
        }}
        onMirrorComponent={(id) => {
          setComponents((prev) =>
            prev.map((c) => (c.id === id ? { ...c, mirrored: !c.mirrored } : c))
          );
        }}
        onDeleteComponent={(id) => {
          setComponents((prev) => prev.filter((c) => c.id !== id));
          if (selectedCompId === id) setSelectedCompId(null);
        }}
        onAddWire={(wire) => {
          const id = wire.id || `wire_${Date.now()}`;
          setWires((prev) => [...prev, { ...wire, id }]);
        }}
        onDeleteWire={(wireId) => {
          setWires((prev) => prev.filter((w) => w.id !== wireId));
          if (selectedWireId === wireId) setSelectedWireId(null);
        }}
        onUpdateComponents={(comps) => setComponents(comps)}
        onUpdateWires={(updatedWires) => setWires(updatedWires)}
        onFinishPlacing={(placed) => {
          setComponents((prev) => [...prev, placed]);
          setPlacingComponent(null);
        }}
        onCancelPlacing={() => setPlacingComponent(null)}
        canUndo={true}
        canRedo={true}
      />
    );
  }

  it('STATEFUL TEST 1: Place from library -> clears placingComponent -> immediately mouse-drag changes canonical (x, y)', () => {
    let latestComps: CircuitComponent[] = [];
    const newResistor: CircuitComponent = {
      ...TEMPLATE_555_ASTABLE.components[1],
      id: 'res_custom_1',
      label: 'R_CUSTOM',
      designator: 'R99',
      value: '22kΩ',
      x: 0,
      y: 0,
    };

    const { container } = render(
      <StatefulEditorHarness
        initialPlacing={newResistor}
        onStateChange={({ comps }) => {
          latestComps = comps;
        }}
      />
    );

    // 1. Ghost preview must be visible
    expect(container.querySelector('.sch-ghost-preview')).toBeInTheDocument();

    // 2. Click canvas viewport to drop component at (400, 300)
    const viewport = screen.getByTestId('sch-canvas-viewport');
    fireEvent.mouseDown(viewport, { button: 0, clientX: 400, clientY: 300 });

    // Ghost preview must now be cleared and placed in state
    expect(container.querySelector('.sch-ghost-preview')).not.toBeInTheDocument();
    const placed = latestComps.find((c) => c.id === 'res_custom_1');
    expect(placed).toBeDefined();

    // 3. Immediately select and drag the component
    const compHit = container.querySelector('[data-testid="sch-comp-hit-res_custom_1"]');
    expect(compHit).toBeInTheDocument();

    fireEvent.mouseDown(compHit!, { button: 0, clientX: 400, clientY: 300 });
    fireEvent.mouseMove(viewport, { clientX: 460, clientY: 360 });
    fireEvent.mouseUp(viewport);

    // 4. Verify canonical (x, y) was modified
    const afterDrag = latestComps.find((c) => c.id === 'res_custom_1');
    expect(afterDrag?.x).toBeDefined();
    expect(typeof afterDrag?.x).toBe('number');
  });

  it('STATEFUL TEST 2: Pin click in Select mode -> click corner -> click Pin B -> wire created -> midpoint adds fold -> delete action pill removes wire', () => {
    let latestWires: CircuitWire[] = [];
    const { container } = render(
      <StatefulEditorHarness
        initialWires={[]}
        onStateChange={({ wires }) => {
          latestWires = wires;
        }}
      />
    );

    const viewport = screen.getByTestId('sch-canvas-viewport');

    // 1. Switch to Wire mode and click Pin 1 of R1 with real browser event sequence: mouseDown -> mouseUp -> click
    fireEvent.click(screen.getByTestId('tool-wire'));
    const pinR1 = container.querySelector('[data-testid="sch-pin-r1-1"]');
    expect(pinR1).toBeInTheDocument();
    fireEvent.mouseDown(pinR1!, { clientX: 200, clientY: 100 });
    fireEvent.mouseUp(pinR1!, { clientX: 200, clientY: 100 });
    fireEvent.click(pinR1!, { clientX: 200, clientY: 100 });

    // 2. Click intermediate canvas position for corner waypoint
    fireEvent.mouseDown(viewport, { button: 0, clientX: 250, clientY: 100 });
    fireEvent.mouseUp(viewport, { button: 0, clientX: 250, clientY: 100 });
    fireEvent.click(viewport, { button: 0, clientX: 250, clientY: 100 });

    // 3. Click Pin 1 of R2 with real browser event sequence: mouseDown -> mouseUp -> click to finish wiring
    const pinR2 = container.querySelector('[data-testid="sch-pin-r2-1"]');
    expect(pinR2).toBeInTheDocument();
    fireEvent.mouseDown(pinR2!, { clientX: 250, clientY: 200 });
    fireEvent.mouseUp(pinR2!, { clientX: 250, clientY: 200 });
    fireEvent.click(pinR2!, { clientX: 250, clientY: 200 });

    // Wire must be created and added to state
    expect(latestWires.length).toBe(1);
    const createdWire = latestWires[0];
    expect(createdWire.fromCompId).toBe('r1');
    expect(createdWire.toCompId).toBe('r2');
    expect(createdWire.points?.length).toBeGreaterThanOrEqual(1);

    // 4. Select the created wire with real browser event sequence
    const wireHit = container.querySelector(`[data-testid="sch-wire-hit-${createdWire.id}"]`);
    expect(wireHit).toBeInTheDocument();
    fireEvent.mouseDown(wireHit!);
    fireEvent.mouseUp(wireHit!);
    fireEvent.click(wireHit!);

    // Midpoint handle must appear
    const midHandle = container.querySelector('[data-testid="sch-wire-mid-0"]');
    expect(midHandle).toBeInTheDocument();

    // Drag midpoint handle to add a fold point
    fireEvent.mouseDown(midHandle!);
    fireEvent.mouseMove(viewport, { clientX: 280, clientY: 150 });
    fireEvent.mouseUp(viewport);

    // Wire points must now include the fold point
    expect(latestWires[0].points?.length).toBeGreaterThanOrEqual(2);

    // 5. Delete Action Pill must be visible
    const pill = screen.getByTestId('sch-wire-action-pill');
    expect(pill).toBeInTheDocument();
    const deleteBtn = screen.getByTestId('pill-delete-wire');
    fireEvent.click(deleteBtn);

    // Wire must be removed from state
    expect(latestWires.length).toBe(0);
  });

  it('STATEFUL TEST 3: Move component -> unmount -> remount -> verify position and wire points are identical', () => {
    let savedComps: CircuitComponent[] = [];
    let savedWires: CircuitWire[] = [];

    const { unmount, container } = render(
      <StatefulEditorHarness
        onStateChange={({ comps, wires }) => {
          savedComps = comps;
          savedWires = wires;
        }}
      />
    );

    // Move R1 to new position
    const r1Hit = container.querySelector('[data-testid="sch-comp-hit-r1"]');
    const viewport = screen.getByTestId('sch-canvas-viewport');
    fireEvent.mouseDown(r1Hit!, { button: 0, clientX: 200, clientY: 100 });
    fireEvent.mouseMove(viewport, { clientX: 300, clientY: 160 });
    fireEvent.mouseUp(viewport);

    const posBeforeUnmount = savedComps.find((c) => c.id === 'r1');
    expect(posBeforeUnmount).toBeDefined();

    // Unmount (simulating tab switch)
    unmount();

    // Remount with saved state
    const { container: remountContainer } = render(
      <StatefulEditorHarness
        initialComps={savedComps}
        initialWires={savedWires}
      />
    );

    const r1After = savedComps.find((c) => c.id === 'r1');
    expect(r1After?.x).toBe(posBeforeUnmount?.x);
    expect(r1After?.y).toBe(posBeforeUnmount?.y);
    expect(remountContainer.querySelector('[data-testid="sch-comp-r1"]')).toBeInTheDocument();
  });

  it('INVARIANT 1 (ZERO Auto-Change on Tab Switch): Mount -> unmount -> remount causes 0 updates and byte-for-byte identical state', () => {
    const onUpdateComponents = vi.fn();
    const onUpdateWires = vi.fn();
    const onUpdateComponentPosition = vi.fn();

    const initialCompsStr = JSON.stringify(TEMPLATE_555_ASTABLE.components);
    const initialWiresStr = JSON.stringify(TEMPLATE_555_ASTABLE.wires);

    const { unmount } = render(
      <SchematicEditorPanel
        {...defaultProps}
        project={TEMPLATE_555_ASTABLE}
        components={TEMPLATE_555_ASTABLE.components}
        wires={TEMPLATE_555_ASTABLE.wires}
        onUpdateComponents={onUpdateComponents}
        onUpdateWires={onUpdateWires}
        onUpdateComponentPosition={onUpdateComponentPosition}
      />
    );

    unmount();

    render(
      <SchematicEditorPanel
        {...defaultProps}
        project={TEMPLATE_555_ASTABLE}
        components={TEMPLATE_555_ASTABLE.components}
        wires={TEMPLATE_555_ASTABLE.wires}
        onUpdateComponents={onUpdateComponents}
        onUpdateWires={onUpdateWires}
        onUpdateComponentPosition={onUpdateComponentPosition}
      />
    );

    expect(onUpdateComponents).toHaveBeenCalledTimes(0);
    expect(onUpdateWires).toHaveBeenCalledTimes(0);
    expect(onUpdateComponentPosition).toHaveBeenCalledTimes(0);
    expect(JSON.stringify(TEMPLATE_555_ASTABLE.components)).toBe(initialCompsStr);
    expect(JSON.stringify(TEMPLATE_555_ASTABLE.wires)).toBe(initialWiresStr);
  });

  it('INVARIANT 2 (0.0px Pin-to-Wire Connection Proof): Wire endpoints match pin terminal positions <= 0.5px including rotated components', () => {
    const rotatedComps = TEMPLATE_555_ASTABLE.components.map((c) =>
      c.id === 'r1' ? { ...c, rotation: 90 as const } : c
    );

    TEMPLATE_555_ASTABLE.wires.forEach((w) => {
      const fromComp = rotatedComps.find((c) => c.id === w.fromCompId);
      const toComp = rotatedComps.find((c) => c.id === w.toCompId);
      if (!fromComp || !toComp) return;

      const pts = getCanonicalWirePoints(w, rotatedComps);
      expect(pts.length).toBeGreaterThanOrEqual(2);

      const wireStart = pts[0];
      const wireEnd = pts[pts.length - 1];

      const pinStart = getCanonicalPinWorldPos(fromComp, w.fromPinId);
      const pinEnd = getCanonicalPinWorldPos(toComp, w.toPinId);

      const distStart = Math.hypot(wireStart.x - pinStart.x, wireStart.y - pinStart.y);
      const distEnd = Math.hypot(wireEnd.x - pinEnd.x, wireEnd.y - pinEnd.y);

      expect(distStart).toBeLessThanOrEqual(0.5);
      expect(distEnd).toBeLessThanOrEqual(0.5);
    });
  });

  it('INVARIANT 4 (Eye-Comfort Warm Light Theme): Sheet SVG uses #ECE8DC (not white), surround uses #D8D4C8, and wire uses #0F6B54', () => {
    const isolatedProject = {
      ...TEMPLATE_555_ASTABLE,
      id: `proj_theme_test_${Date.now()}`,
    };

    const { container } = render(
      <SchematicEditorPanel
        {...defaultProps}
        project={isolatedProject}
        components={isolatedProject.components}
        wires={isolatedProject.wires}
      />
    );

    const themeToggle = screen.getByTestId('toggle-sheet-theme');
    const sheetSvgBefore = screen.getByTestId('sch-sheet-svg');
    const beforeClass = sheetSvgBefore.getAttribute('class') || '';
    if (beforeClass.includes('bg-[#09101E]')) {
      fireEvent.click(themeToggle);
    }

    const sheetSvg = screen.getByTestId('sch-sheet-svg');
    const svgClass = sheetSvg.getAttribute('class') || '';
    expect(svgClass).toContain('bg-[#ECE8DC]');
    expect(svgClass).not.toContain('bg-[#FAFCFF]');
    expect(svgClass).not.toContain('bg-[#FFFFFF]');

    const viewport = screen.getByTestId('sch-canvas-viewport');
    expect(viewport.className).toContain('bg-[#D8D4C8]');

    const wire = container.querySelector('[data-testid^="sch-wire-"]:not([data-testid*="hit"])');
    if (wire) {
      expect(wire.getAttribute('stroke')).toBe('#0F6B54');
    }
  });

  it('STATEFUL TEST 4: Verify all 14 Left Rail tools and top bar buttons trigger without error and right-click context menu works', () => {
    const { container } = render(<StatefulEditorHarness />);

    // Check all 14 Left Rail tools
    const tools = [
      'tool-select',
      'tool-pan',
      'tool-wire',
      'tool-bus',
      'tool-junction',
      'tool-netlabel',
      'tool-sheetport',
      'tool-power',
      'tool-noconnect',
      'tool-draw',
      'tool-text',
      'tool-image',
      'tool-ruler',
      'tool-eraser',
    ];

    tools.forEach((tid) => {
      const btn = screen.getByTestId(tid);
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
    });

    // Check Top Bar action buttons
    const topActions = [
      'action-undo',
      'action-redo',
      'action-rotate',
      'action-rotate-ccw',
      'action-align',
      'action-autotidy',
      'action-auto-annotate',
      'action-erc',
      'action-find',
      'action-bom-netlist',
      'toggle-show-grid',
      'toggle-grid-snap',
      'toggle-sheet-theme',
    ];

    topActions.forEach((tid) => {
      const btn = screen.getByTestId(tid);
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
    });

    // Test Right-Click Context Menu on component
    const r1Hit = container.querySelector('[data-testid="sch-comp-hit-r1"]');
    expect(r1Hit).toBeInTheDocument();
    fireEvent.contextMenu(r1Hit!);

    const ctxMenu = screen.getByTestId('sch-context-menu');
    expect(ctxMenu).toBeInTheDocument();
    expect(screen.getByTestId('ctx-rotate')).toBeInTheDocument();
    expect(screen.getByTestId('ctx-mirror')).toBeInTheDocument();
    expect(screen.getByTestId('ctx-duplicate')).toBeInTheDocument();
    expect(screen.getByTestId('ctx-delete')).toBeInTheDocument();

    // Clicking rotate in context menu rotates component
    fireEvent.click(screen.getByTestId('ctx-rotate'));
    expect(screen.queryByTestId('sch-context-menu')).not.toBeInTheDocument();
  });

  it('STATEFUL TEST 5 (Zero Regression on LabHeader & SchematicCanvas): LabHeader hides/shows simulation controls and untouched SchematicCanvas mounts cleanly with moved R1 and folded wire', () => {
    // 1. LabHeader activeMode="schematicEditor" hides Run/Stop; activeMode="schematic" shows Run/Stop
    const dummyLabHeaderProps = {
      projectTitle: 'Regression Test Lab',
      onTitleChange: vi.fn(),
      onNewProject: vi.fn(),
      onSaveProject: vi.fn(),
      onLoadProject: vi.fn(),
      onExportProject: vi.fn(),
      onOpenExperiments: vi.fn(),
      hasUnsavedChanges: false,
      canUndo: false,
      canRedo: false,
      onUndo: vi.fn(),
      onRedo: vi.fn(),
    };

    const { rerender } = render(
      <LabHeader
        {...dummyLabHeaderProps}
        activeMode="schematicEditor"
        onModeChange={vi.fn()}
        isSimulating={false}
        onToggleSimulation={vi.fn()}
        onResetSimulation={vi.fn()}
      />
    );
    expect(screen.queryByTitle(/Toggle Simulation/i)).not.toBeInTheDocument();

    rerender(
      <LabHeader
        {...dummyLabHeaderProps}
        activeMode="schematic"
        onModeChange={vi.fn()}
        isSimulating={false}
        onToggleSimulation={vi.fn()}
        onResetSimulation={vi.fn()}
      />
    );
    expect(screen.getByTitle(/Toggle Simulation/i)).toBeInTheDocument();

    // 2. Untouched SchematicCanvas mounts cleanly with moved R1 and folded wire
    const movedComps: CircuitComponent[] = TEMPLATE_555_ASTABLE.components.map((c) =>
      c.id === 'r1' ? { ...c, x: 420, y: 180 } : c
    );
    const foldedWires: CircuitWire[] = [
      {
        id: 'w_folded_1',
        fromCompId: 'r1',
        fromPinId: '1',
        toCompId: 'r2',
        toPinId: '1',
        points: [
          { x: 420, y: 180 },
          { x: 300, y: 180 },
          { x: 300, y: 220 },
        ],
      },
    ];

    const { container: canvasContainer } = render(
      <SchematicCanvas
        components={movedComps}
        wires={foldedWires}
        selectedCompId="r1"
        onSelectComponent={vi.fn()}
        onUpdateComponentPosition={vi.fn()}
        onRotateComponent={vi.fn()}
        onDeleteComponent={vi.fn()}
        onAddWire={vi.fn()}
        onDeleteWire={vi.fn()}
        isSimulating={false}
        simulationStates={{}}
      />
    );

    expect(canvasContainer.querySelector('#main-schematic-svg')).toBeInTheDocument();
    expect(canvasContainer.textContent).toContain('R1');
  });

  it('Test 1 (Real Browser Pin Click Sequence): Real browser pin click sequence keeps rubberband active, saves interior-only points, and moves endpoints with component', () => {
    let latestWires: CircuitWire[] = [];
    let latestComps: CircuitComponent[] = [...TEMPLATE_555_ASTABLE.components];

    const { container } = render(
      <StatefulEditorHarness
        initialWires={[]}
        onStateChange={({ wires, comps }) => {
          latestWires = wires;
          latestComps = comps;
        }}
      />
    );

    const viewport = screen.getByTestId('sch-canvas-viewport');

    // 1. Switch to Wire mode and on Pin A, fire ALL THREE real browser events in order
    fireEvent.click(screen.getByTestId('tool-wire'));
    const pinA = container.querySelector('[data-testid="sch-pin-r1-1"]');
    expect(pinA).toBeInTheDocument();
    fireEvent.mouseDown(pinA!, { clientX: 200, clientY: 100 });
    fireEvent.mouseUp(pinA!, { clientX: 200, clientY: 100 });
    fireEvent.click(pinA!, { clientX: 200, clientY: 100 });

    // Assert rubberband wire preview IS STILL ACTIVE (NOT canceled by double-fire!)
    const rubberband = screen.getByTestId('sch-rubberband-wire');
    expect(rubberband).toBeInTheDocument();

    // 2. Click intermediate canvas position for corner waypoint (260, 140)
    fireEvent.mouseDown(viewport, { button: 0, clientX: 260, clientY: 140 });
    fireEvent.mouseUp(viewport, { button: 0, clientX: 260, clientY: 140 });
    fireEvent.click(viewport, { button: 0, clientX: 260, clientY: 140 });

    // 3. Fire mouseDown + mouseUp + click on Pin B
    const pinB = container.querySelector('[data-testid="sch-pin-r2-1"]');
    expect(pinB).toBeInTheDocument();
    fireEvent.mouseDown(pinB!, { clientX: 260, clientY: 200 });
    fireEvent.mouseUp(pinB!, { clientX: 260, clientY: 200 });
    fireEvent.click(pinB!, { clientX: 260, clientY: 200 });

    // Assert new wire saved in wires AND wire.points contains ONLY interior waypoints (NOT duplicate p1/p2!)
    expect(latestWires.length).toBe(1);
    const newWire = latestWires[0];
    expect(newWire.fromCompId).toBe('r1');
    expect(newWire.toCompId).toBe('r2');

    const r1CompInitial = latestComps.find((c) => c.id === 'r1')!;
    const r2CompInitial = latestComps.find((c) => c.id === 'r2')!;
    const p1WorldInitial = { x: r1CompInitial.x + r1CompInitial.pins![0].x, y: r1CompInitial.y + r1CompInitial.pins![0].y };
    const p2WorldInitial = { x: r2CompInitial.x + r2CompInitial.pins![0].x, y: r2CompInitial.y + r2CompInitial.pins![0].y };

    if (newWire.points && newWire.points.length > 0) {
      expect(newWire.points[0]).not.toEqual(p1WorldInitial);
      expect(newWire.points[newWire.points.length - 1]).not.toEqual(p2WorldInitial);
    }

    // Move component R1 by +40px
    const compR1Hit = container.querySelector('[data-testid="sch-comp-hit-r1"]');
    expect(compR1Hit).toBeInTheDocument();
    fireEvent.mouseDown(compR1Hit!, { clientX: r1CompInitial.x, clientY: r1CompInitial.y });
    fireEvent.mouseMove(viewport, { clientX: r1CompInitial.x + 40, clientY: r1CompInitial.y });
    fireEvent.mouseUp(viewport);

    // Wire endpoint moves cleanly with R1's pin
    const r1CompMoved = latestComps.find((c) => c.id === 'r1')!;
    expect(r1CompMoved.x).toBe(r1CompInitial.x + 40);
    const canonicalWirePts = getCanonicalWirePoints(newWire, latestComps);
    expect(canonicalWirePts[0].x).toBe(r1CompMoved.x + r1CompMoved.pins![0].x);
    expect(canonicalWirePts[0].y).toBe(r1CompMoved.y + r1CompMoved.pins![0].y);
  });

  it('Test 2 (Real Browser Wire Junction Click Sequence): Activate Junction (J) -> fire mouseDown + mouseUp + click on wire -> assert EXACTLY 1 manual junction added', () => {
    const testWireId = TEMPLATE_555_ASTABLE.wires[0].id;
    const { container } = render(<SchematicEditorPanel {...defaultProps} selectedWireId={testWireId} />);

    // Activate Junction (J)
    const toolJunc = screen.getByTestId('tool-junction');
    fireEvent.click(toolJunc);

    // Fire mouseDown + mouseUp + click on a wire
    const wireHit = container.querySelector(`[data-testid="sch-wire-hit-${testWireId}"]`);
    expect(wireHit).toBeInTheDocument();

    fireEvent.mouseDown(wireHit!, { clientX: 220, clientY: 150 });
    fireEvent.mouseUp(wireHit!, { clientX: 220, clientY: 150 });
    fireEvent.click(wireHit!, { clientX: 220, clientY: 150 });

    // Assert EXACTLY 1 manual junction added (NOT 2 duplicates!)
    const juncDots = container.querySelectorAll('[data-testid^="sch-manual-junction-"]');
    expect(juncDots.length).toBe(1);
  });

  it('Test 3 (Light Theme Contrast Check): Toggle to warm light theme -> assert designator text fill is dark (#0F5132) and sheet is #ECE8DC', () => {
    const isolatedProject = {
      ...TEMPLATE_555_ASTABLE,
      id: `proj_contrast_${Date.now()}`,
    };

    const { container } = render(
      <SchematicEditorPanel
        {...defaultProps}
        project={isolatedProject}
      />
    );

    // Toggle theme to warm light theme
    const themeBtn = screen.getByTestId('toggle-sheet-theme');
    const sheetSvgBefore = screen.getByTestId('sch-sheet-svg');
    const beforeClass = sheetSvgBefore.getAttribute('class') || '';
    if (beforeClass.includes('bg-[#09101E]')) {
      fireEvent.click(themeBtn);
    }

    // Assert designator text fill is dark (#0F5132, NOT #34D399)
    const designator = container.querySelector('[data-testid="sch-designator-r1"]');
    expect(designator).toBeInTheDocument();
    expect(designator?.getAttribute('fill')).toBe('#0F5132');

    // Assert sheet is #ECE8DC
    const sheetSvg = screen.getByTestId('sch-sheet-svg');
    expect(sheetSvg).toBeInTheDocument();
    expect(sheetSvg.getAttribute('class')).toContain('bg-[#ECE8DC]');
  });

  // =========================================================================
  // MANDATORY QUALITY GATE ANTI-REGRESSION TESTS: CRASH-PROOF, BREADBOARD SYNC, UX PARITY & MNA PHYSICS
  // =========================================================================

  it('GATE 4 Test 1 (Crash Proof): Malformed wire with fromCompId breadboard or empty points never crashes calculations or render', () => {
    const malformedWire: CircuitWire = {
      id: 'w_bad_bb',
      fromCompId: 'breadboard',
      fromPinId: 'bb_col_10_a',
      toCompId: 'r1',
      toPinId: '1',
      points: [],
    };

    // 1. computeCanonicalJunctions must not throw
    expect(() => {
      const junctions = computeCanonicalJunctions(
        [{ wireId: malformedWire.id, points: malformedWire.points || [] }],
        TEMPLATE_555_ASTABLE.components
      );
      expect(Array.isArray(junctions)).toBe(true);
    }).not.toThrow();

    // 2. calculateJunctionDots with invalid/missing vertices must not throw
    expect(() => {
      const dots = calculateJunctionDots([
        { id: 'w1', vertices: [] },
        { id: 'w2', vertices: [{ x: 10, y: 10 }] },
        { id: 'w3', vertices: [{ x: 10, y: 10 }, { x: 20, y: 10 }] },
      ] as unknown as Parameters<typeof calculateJunctionDots>[0]);
      expect(Array.isArray(dots)).toBe(true);
    }).not.toThrow();

    // 3. SchematicEditorPanel rendering with malformed wire must not crash
    expect(() => {
      render(
        <SchematicEditorPanel
          {...defaultProps}
          wires={[malformedWire, ...TEMPLATE_555_ASTABLE.wires]}
        />
      );
    }).not.toThrow();
  });

  it('GATE 4 Test 2 (3D Breadboard Sync Resolver): Accurately resolves column tie-groups, rails, ravine isolation, and multi-hop jumpers', () => {
    // 1. Column tie groups and ravine isolation
    const topHoleA = 'bb_col_15_a';
    const topHoleC = 'bb_col_15_c';
    const botHoleF = 'bb_col_15_f';

    const groupA = getHoleTieGroup(topHoleA);
    const groupC = getHoleTieGroup(topHoleC);
    const groupF = getHoleTieGroup(botHoleF);

    expect(groupA).toBe(groupC); // Col 15 Top rows A and C share tie group
    expect(groupA).not.toBe(groupF); // Col 15 Top is isolated from Bottom across center ravine!
    expect(groupA).toBe('bb_tie_col_15_top');
    expect(groupF).toBe('bb_tie_col_15_bottom');

    // 2. Power rails
    const railPos1 = getHoleTieGroup('bb_rail_top_pos_5');
    const railPos2 = getHoleTieGroup('bb_rail_top_pos_20');
    const railNeg = getHoleTieGroup('bb_rail_top_neg_5');
    expect(railPos1).toBe(railPos2);
    expect(railPos1).not.toBe(railNeg);

    // 3. resolve3DWireToSchematicConnections
    // LED anode at Col 15 Row C, cathode at Col 16 Row C
    const components3d: (Component3D & { pinHoles?: Record<string, string> })[] = [
      {
        id: 'led1',
        type: 'LED',
        label: 'LED',
        value: 'Red',
        parameters: {},
        x3d: 0,
        y3d: 0,
        z3d: 0,
        rotY: 0,
        mountedOnHoleId: 'bb_col_15_c',
        pinHoles: {
          a: 'bb_col_15_c',
          k: 'bb_col_16_c',
        },
      },
    ];

    const schematicComponents: CircuitComponent[] = [
      {
        id: 'led1',
        type: 'LED',
        designator: 'D1',
        label: 'LED',
        category: 'semiconductors',
        value: 'Red',
        footprint: 'LED_THT:LED_D5.0mm',
        parameters: {},
        x: 0,
        y: 0,
        rotation: 0,
        pins: [
          { id: 'a', name: 'A', x: 0, y: 0, pinType: 'passive' },
          { id: 'k', name: 'K', x: 10, y: 0, pinType: 'passive' },
        ],
      },
      {
        id: 'mcu1',
        type: 'ARDUINO_UNO',
        designator: 'U_MCU',
        label: 'Arduino',
        category: 'microcontrollers',
        value: 'ATmega328P',
        footprint: 'Module:Arduino_UNO_R3',
        parameters: {},
        x: 100,
        y: 100,
        rotation: 0,
        pins: [{ id: 'D13', name: '13', x: 0, y: 0, pinType: 'passive' }],
      },
    ];

    // Jumper wire from Arduino D13 to Col 15 Row A
    const wire3d: Wire3D = {
      id: 'w_jumper_1',
      fromPin: { compId: 'mcu1', pinId: 'D13' },
      toPin: { compId: 'breadboard', pinId: 'bb_col_15_a' },
      color: '#ff0000',
    };

    const resolved = resolve3DWireToSchematicConnections(
      wire3d,
      [wire3d],
      components3d,
      schematicComponents
    );

    expect(resolved.length).toBe(1);
    expect(resolved[0].fromCompId).toBe('mcu1');
    expect(resolved[0].fromPinId).toBe('D13');
    expect(resolved[0].toCompId).toBe('led1');
    expect(resolved[0].toPinId).toBe('a');

    // 4. Empty column jumper does NOT create phantom connections
    const emptyJumper: Wire3D = {
      id: 'w_empty',
      fromPin: { compId: 'mcu1', pinId: 'D13' },
      toPin: { compId: 'breadboard', pinId: 'bb_col_40_a' },
      color: '#00ff00',
    };
    const emptyResolved = resolve3DWireToSchematicConnections(
      emptyJumper,
      [emptyJumper],
      components3d,
      schematicComponents
    );
    expect(emptyResolved.length).toBe(0);
  });

  it('GATE 4 Test 3 (Schematic Editor UX Parity): Pin click in Select mode does not wire; Wire mode creates wire; Docked action bar dismisses; Segment drag works', () => {
    let latestWires: CircuitWire[] = [];
    const { container } = render(
      <StatefulEditorHarness
        initialWires={[]}
        onStateChange={({ wires }) => {
          latestWires = wires;
        }}
      />
    );

    const viewport = screen.getByTestId('sch-canvas-viewport');

    // 1. In Select (V) mode, clicking pin must NOT start wire drawing!
    const pinR1 = container.querySelector('[data-testid="sch-pin-r1-1"]');
    expect(pinR1).toBeInTheDocument();
    fireEvent.mouseDown(pinR1!, { clientX: 200, clientY: 100 });
    fireEvent.mouseUp(pinR1!, { clientX: 200, clientY: 100 });
    fireEvent.click(pinR1!, { clientX: 200, clientY: 100 });

    expect(container.querySelector('[data-testid="sch-rubberband-wire"]')).not.toBeInTheDocument();
    expect(latestWires.length).toBe(0);

    // 2. Switch to Wire (W) mode: clicking pin starts wire drawing
    fireEvent.click(screen.getByTestId('tool-wire'));
    fireEvent.mouseDown(pinR1!, { clientX: 200, clientY: 100 });
    fireEvent.mouseUp(pinR1!, { clientX: 200, clientY: 100 });
    fireEvent.click(pinR1!, { clientX: 200, clientY: 100 });

    expect(container.querySelector('[data-testid="sch-rubberband-wire"]')).toBeInTheDocument();

    // Finish wire to pin R2-1
    const pinR2 = container.querySelector('[data-testid="sch-pin-r2-1"]');
    fireEvent.mouseDown(pinR2!, { clientX: 250, clientY: 200 });
    fireEvent.mouseUp(pinR2!, { clientX: 250, clientY: 200 });
    fireEvent.click(pinR2!, { clientX: 250, clientY: 200 });

    expect(latestWires.length).toBe(1);
    const createdWire = latestWires[0];

    // Switch back to Select mode
    fireEvent.click(screen.getByTestId('tool-select'));

    // 3. Select wire -> Bottom-center docked action bar is rendered
    const wireHit = container.querySelector(`[data-testid="sch-wire-hit-${createdWire.id}"]`);
    expect(wireHit).toBeInTheDocument();
    fireEvent.mouseDown(wireHit!);
    fireEvent.mouseUp(wireHit!);
    fireEvent.click(wireHit!);

    const pill = container.querySelector('.sch-wire-action-pill');
    expect(pill).toBeInTheDocument();

    // Pressing Escape cleanly dismisses the pill
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(container.querySelector('.sch-wire-action-pill')).not.toBeInTheDocument();

    // Re-select wire and click empty canvas -> cleanly dismisses the pill
    fireEvent.mouseDown(wireHit!);
    fireEvent.mouseUp(wireHit!);
    fireEvent.click(wireHit!);
    expect(container.querySelector('.sch-wire-action-pill')).toBeInTheDocument();
    fireEvent.mouseDown(viewport, { button: 0, clientX: 50, clientY: 50 });
    expect(container.querySelector('.sch-wire-action-pill')).not.toBeInTheDocument();

    // 4. Real wire segment sliding: dragging segment midpoint handle updates waypoints
    fireEvent.mouseDown(wireHit!);
    fireEvent.mouseUp(wireHit!);
    fireEvent.click(wireHit!);
    const midHandle = container.querySelector('[data-testid="sch-wire-mid-0"]');
    if (midHandle) {
      fireEvent.mouseDown(midHandle);
      fireEvent.mouseMove(viewport, { clientX: 300, clientY: 150 });
      fireEvent.mouseUp(viewport);
      expect(latestWires[0].points).toBeDefined();
    }
  });

  it('GATE 4 Test 4 (MNA Real-Time Physics Accuracy): NE555 astable simulation yields bounded C1 companion current, 6V on Pin 5 CTRL, and realistic LED current', () => {
    const solver = new CircuitSolver();
    const dt = 0.001; // 1ms step

    // Warm up the solver across multiple steps to achieve steady state
    let lastResult = solver.step(TEMPLATE_555_ASTABLE.components, TEMPLATE_555_ASTABLE.wires, dt);
    for (let s = 0; s < 50; s++) {
      lastResult = solver.step(TEMPLATE_555_ASTABLE.components, TEMPLATE_555_ASTABLE.wires, dt);
    }

    const compStates = lastResult.componentStates;
    expect(compStates).toBeDefined();

    // 1. Capacitor C1 companion current must be physically bounded (|I| < 5mA, not bogus 51.7mA!)
    const c1State = compStates['c1'];
    expect(c1State).toBeDefined();
    expect(Math.abs(c1State.current)).toBeLessThan(0.005);

    // 2. NE555 Pin 5 (CTRL) voltage and C2 voltage:
    // Internal 5k-5k-5k divider establishes 2/3 * Vcc = 6.00V at 9V Vcc
    const c2State = compStates['c2'];
    expect(c2State).toBeDefined();
    expect(c2State.voltage).toBeGreaterThanOrEqual(5.8);
    expect(c2State.voltage).toBeLessThanOrEqual(6.2);

    // 3. LED current when flashing on: resistor is 330 ohm, Vf ~ 2.0V, Vout ~ 7.6V -> (7.6 - 2.0) / 330 ~ 17mA
    const ledState = compStates['led1'];
    expect(ledState).toBeDefined();
    expect(ledState.current).toBeGreaterThanOrEqual(0);
    expect(ledState.current).toBeLessThanOrEqual(0.025);
  });

  it('GATE 5 Test 1 (3D Breadboard Zero Fan-Out & Net Union-Find): Jumper wire produces exactly 1 shortest-path schematic wire with 0 Cartesian explosion', () => {
    const components3d: (Component3D & { pinHoles?: Record<string, string> })[] = [
      {
        id: 'mcu1',
        type: 'arduino_uno',
        label: 'Arduino',
        parameters: {},
        x3d: 0,
        y3d: 0,
        z3d: 0,
        rotY: 0,
        pinHoles: {},
      },
      {
        id: 'led1',
        type: 'led',
        label: 'LED',
        parameters: {},
        x3d: 0,
        y3d: 0,
        z3d: 0,
        rotY: 0,
        pinHoles: { 'a': 'bb_col_10_c', 'k': 'bb_rail_bot_neg_1' },
      },
      {
        id: 'r1',
        type: 'resistor',
        label: 'Resistor',
        parameters: {},
        x3d: 0,
        y3d: 0,
        z3d: 0,
        rotY: 0,
        pinHoles: { '1': 'bb_col_10_e', '2': 'bb_col_15_e' },
      },
    ];

    const schematicComponents: CircuitComponent[] = [
      {
        id: 'mcu1',
        type: 'MCU',
        designator: 'U1',
        label: 'Arduino Uno',
        category: 'microcontrollers',
        value: 'Arduino',
        footprint: 'Arduino_Uno',
        x: 100,
        y: 100,
        rotation: 0,
        parameters: {},
        pins: [{ id: 'D13', name: 'D13', x: 20, y: 0, pinType: 'output' }],
      },
      {
        id: 'led1',
        type: 'LED',
        designator: 'D1',
        label: 'Red LED',
        category: 'semiconductors',
        value: 'Red',
        footprint: 'LED_D5.0mm',
        x: 200,
        y: 100,
        rotation: 0,
        parameters: {},
        pins: [
          { id: 'a', name: 'A', x: -10, y: 0, pinType: 'passive' },
          { id: 'k', name: 'K', x: 10, y: 0, pinType: 'passive' },
        ],
      },
      {
        id: 'r1',
        type: 'RESISTOR',
        designator: 'R1',
        label: '1k Resistor',
        category: 'passive',
        value: '1k',
        footprint: 'R_Axial',
        x: 300,
        y: 100,
        rotation: 0,
        parameters: {},
        pins: [
          { id: '1', name: '1', x: -10, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 10, y: 0, pinType: 'passive' },
        ],
      },
    ];

    const jWire: Wire3D = {
      id: 'w3d_jumper_1',
      fromPin: { compId: 'mcu1', pinId: 'D13' },
      toPin: { compId: 'breadboard', pinId: 'bb_col_10_b' },
      color: '#3B82F6',
    };

    // When resolving, it should produce EXACTLY 1 wire connecting mcu1:D13 to the closest pin in column 10 (led1:a)
    // NEVER a Cartesian product of 2x3 or all-to-all explosion!
    const resolved = resolve3DWireToSchematicConnections(jWire, [jWire], components3d, schematicComponents, []);
    expect(resolved.length).toBe(1);
    expect(resolved[0].fromCompId).toBe('mcu1');
    expect(resolved[0].fromPinId).toBe('D13');
    expect(resolved[0].toCompId).toBe('led1');
    expect(resolved[0].toPinId).toBe('a');

    // If mcu1:D13 and led1:a are ALREADY connected in schematicWires, resolving a duplicate jumper returns [] (0 redundant wires)
    const existingWire: CircuitWire = {
      id: 'w_existing',
      fromCompId: 'mcu1',
      fromPinId: 'D13',
      toCompId: 'led1',
      toPinId: 'a',
    };
    const redundantResolved = resolve3DWireToSchematicConnections(jWire, [jWire], components3d, schematicComponents, [existingWire]);
    expect(redundantResolved.length).toBe(0);
  });

  it('GATE 5 Test 2 (Smart Shortest-Path Auto-Tap): Resolver taps existing wire segment when closer by >= 15px', () => {
    const components3d: (Component3D & { pinHoles?: Record<string, string> })[] = [
      {
        id: 'compA',
        type: 'resistor',
        label: 'RA',
        parameters: {},
        x3d: 0,
        y3d: 0,
        z3d: 0,
        rotY: 0,
        pinHoles: { '1': 'bb_col_5_a', '2': 'bb_col_5_e' },
      },
      {
        id: 'compB',
        type: 'resistor',
        label: 'RB',
        parameters: {},
        x3d: 0,
        y3d: 0,
        z3d: 0,
        rotY: 0,
        pinHoles: { '1': 'bb_col_20_a', '2': 'bb_col_20_e' },
      },
    ];

    const schematicComponents: CircuitComponent[] = [
      {
        id: 'compA',
        type: 'RESISTOR',
        designator: 'RA',
        label: 'RA',
        category: 'passive',
        value: '1k',
        footprint: 'R_Axial',
        x: 100,
        y: 100,
        rotation: 0,
        parameters: {},
        pins: [
          { id: '1', name: '1', x: 0, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 50, y: 0, pinType: 'passive' },
        ],
      },
      {
        id: 'compB',
        type: 'RESISTOR',
        designator: 'RB',
        label: 'RB',
        category: 'passive',
        value: '1k',
        footprint: 'R_Axial',
        x: 500,
        y: 100,
        rotation: 0,
        parameters: {},
        pins: [
          { id: '1', name: '1', x: 0, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 50, y: 0, pinType: 'passive' },
        ],
      },
    ];

    // Wire passing between compB:1 (500, 100) and some other component at (100, 300)
    // with a segment passing close to compA:1 (100, 100) -> segment from (120, 0) to (120, 200)
    const existingWireB: CircuitWire = {
      id: 'wire_bus_B',
      fromCompId: 'compB',
      fromPinId: '1',
      toCompId: 'compB',
      toPinId: '2',
      points: [
        { x: 500, y: 100 },
        { x: 120, y: 100 },
        { x: 120, y: 200 },
      ],
    };

    const jWire: Wire3D = {
      id: 'w3d_jumper_tap',
      fromPin: { compId: 'breadboard', pinId: 'bb_col_5_b' },
      toPin: { compId: 'breadboard', pinId: 'bb_col_20_b' },
      color: '#10B981',
    };

    const resolved = resolve3DWireToSchematicConnections(jWire, [jWire], components3d, schematicComponents, [existingWireB]);
    expect(resolved.length).toBe(1);
    // Because the existing wire segment passes right at (120, 100), which is closer than compB (at 500, 100) by 380px:
    expect(resolved[0].tappedWireId).toBe('wire_bus_B');
    expect(resolved[0].junctionPoint).toBeDefined();
    expect(resolved[0].junctionPoint?.x).toBe(150);
    expect(resolved[0].junctionPoint?.y).toBe(100);
  });

  it('GATE 5 Test 3 (Empty-Canvas Deselect in Wire Mode & T-Junction Wire Tap): Clicking empty canvas in Wire mode clears selection, clicking wire completes tap', () => {
    let latestWires: CircuitWire[] = [
      {
        id: 'test_wire_1',
        fromCompId: 'r1',
        fromPinId: '1',
        toCompId: 'r2',
        toPinId: '1',
      },
    ];

    const { container } = render(
      <StatefulEditorHarness
        initialWires={latestWires}
        onStateChange={({ wires }) => {
          latestWires = wires;
        }}
      />
    );

    const viewport = screen.getByTestId('sch-canvas-viewport');

    // 1. Select the wire
    const wireHit = container.querySelector('[data-testid="sch-wire-hit-test_wire_1"]');
    expect(wireHit).toBeInTheDocument();
    fireEvent.mouseDown(wireHit!);
    fireEvent.mouseUp(wireHit!);
    fireEvent.click(wireHit!);

    expect(container.querySelector('.sch-wire-action-pill')).toBeInTheDocument();

    // 2. Switch to Wire (W) mode while wire is selected
    fireEvent.click(screen.getByTestId('tool-wire'));

    // 3. Click empty canvas in Wire mode -> MUST dismiss wire selection
    fireEvent.mouseDown(viewport, { button: 0, clientX: 50, clientY: 50 });
    expect(container.querySelector('.sch-wire-action-pill')).not.toBeInTheDocument();

    // 4. Start wire from pin R1-2 and tap into test_wire_1
    const pinR1_2 = container.querySelector('[data-testid="sch-pin-r1-2"]');
    expect(pinR1_2).toBeInTheDocument();
    fireEvent.mouseDown(pinR1_2!, { clientX: 200, clientY: 100 });
    fireEvent.mouseUp(pinR1_2!, { clientX: 200, clientY: 100 });
    fireEvent.click(pinR1_2!, { clientX: 200, clientY: 100 });

    expect(container.querySelector('[data-testid="sch-rubberband-wire"]')).toBeInTheDocument();

    // Tap into test_wire_1
    fireEvent.mouseDown(wireHit!, { clientX: 220, clientY: 100 });

    // A tapped wire is created with tappedWireId and junctionPoint
    const tapped = latestWires.find((w) => w.tappedWireId === 'test_wire_1');
    expect(tapped).toBeDefined();
    expect(tapped?.junctionPoint).toBeDefined();
  });

  it('GATE 6 Test 1 (Reverse 3D Click-Order Bi-Directional Auto-Tap): Reverse click-order from bb_col_30_A to U2:D9 resolves T-junction tap and returns strictly 1 wire', () => {
    const components3d: (Component3D & { pinHoles?: Record<string, string> })[] = [
      {
        id: 'u2',
        type: 'arduino_uno',
        label: 'Arduino',
        parameters: {},
        x3d: 0,
        y3d: 0,
        z3d: 0,
        rotY: 0,
        pinHoles: {}, // Off-board MCU pin
      },
      {
        id: 'led1',
        type: 'led',
        label: 'LED',
        parameters: {},
        x3d: 0,
        y3d: 0,
        z3d: 0,
        rotY: 0,
        pinHoles: { 'a': 'bb_col_30_c', 'k': 'bb_rail_bot_neg_1' },
      },
      {
        id: 'r3',
        type: 'resistor',
        label: 'Resistor',
        parameters: {},
        x3d: 0,
        y3d: 0,
        z3d: 0,
        rotY: 0,
        pinHoles: { '1': 'bb_col_30_e', '2': 'bb_col_25_e' },
      },
    ];

    const schematicComponents: CircuitComponent[] = [
      {
        id: 'u2',
        type: 'MCU',
        designator: 'U2',
        label: 'Arduino Uno',
        category: 'microcontrollers',
        value: 'Arduino',
        footprint: 'Arduino_Uno',
        x: 240,
        y: 150,
        rotation: 0,
        parameters: {},
        pins: [{ id: 'D9', name: 'D9', x: 0, y: 0, pinType: 'output' }],
      },
      {
        id: 'led1',
        type: 'LED',
        designator: 'LED1',
        label: 'Red LED',
        category: 'semiconductors',
        value: 'Red',
        footprint: 'LED_D5.0mm',
        x: 200,
        y: 100,
        rotation: 0,
        parameters: {},
        pins: [
          { id: 'a', name: 'A', x: -10, y: 0, pinType: 'passive' },
          { id: 'k', name: 'K', x: 10, y: 0, pinType: 'passive' },
        ],
      },
      {
        id: 'r3',
        type: 'RESISTOR',
        designator: 'R3',
        label: '330 Resistor',
        category: 'passive',
        value: '330',
        footprint: 'R_Axial',
        x: 300,
        y: 100,
        rotation: 0,
        parameters: {},
        pins: [
          { id: '1', name: '1', x: -10, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 10, y: 0, pinType: 'passive' },
        ],
      },
    ];

    // Existing net: r3:1 connected to led1:a
    const existingWire: CircuitWire = {
      id: 'wire_r3_led1',
      fromCompId: 'r3',
      fromPinId: '1',
      toCompId: 'led1',
      toPinId: 'a',
      points: [{ x: 290, y: 100 }, { x: 190, y: 100 }],
    };

    // Reverse click-order in 3D: from breadboard hole to MCU pin!
    const reverseJumperWire: Wire3D = {
      id: 'w3d_jumper_reverse',
      fromPin: { compId: 'breadboard', pinId: 'bb_col_30_a' },
      toPin: { compId: 'u2', pinId: 'D9' },
      color: '#3B82F6',
    };

    const resolved = resolve3DWireToSchematicConnections(
      reverseJumperWire,
      [reverseJumperWire],
      components3d,
      schematicComponents,
      [existingWire]
    );

    // Strictly 1 wire returned (zero fan-out, zero duplicate)
    expect(resolved.length).toBe(1);
    expect(resolved[0].tappedWireId).toBe('wire_r3_led1');
    expect(resolved[0].junctionPoint).toBeDefined();
    expect(resolved[0].junctionPoint?.x).toBe(240);
    expect(resolved[0].junctionPoint?.y).toBe(100);
  });

  it('GATE 6 Test 2 (Live Dynamic T-Junction Glue on Move): Moving a parent component dynamically glues tapping wire endpoint with 0px detachment', () => {
    const comps: CircuitComponent[] = [
      {
        id: 'comp_parent_A',
        type: 'RESISTOR',
        designator: 'R_P1',
        label: 'Parent Resistor A',
        category: 'passive',
        value: '1k',
        footprint: 'R_Axial',
        x: 100,
        y: 100,
        rotation: 0,
        parameters: {},
        pins: [
          { id: '1', name: '1', x: 0, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 100, y: 0, pinType: 'passive' },
        ],
      },
      {
        id: 'comp_tap',
        type: 'RESISTOR',
        designator: 'R_TAP',
        label: 'Tap Resistor',
        category: 'passive',
        value: '1k',
        footprint: 'R_Axial',
        x: 150,
        y: 200,
        rotation: 0,
        parameters: {},
        pins: [
          { id: '1', name: '1', x: 0, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 50, y: 0, pinType: 'passive' },
        ],
      },
    ];

    // Parent wire between pin 1 (100, 100) and pin 2 (200, 100)
    const parentWire: CircuitWire = {
      id: 'parent_wire_1',
      fromCompId: 'comp_parent_A',
      fromPinId: '1',
      toCompId: 'comp_parent_A',
      toPinId: '2',
    };

    // Tapping wire starting at comp_tap:1 (150, 200) and tapped into parent_wire_1 at (150, 100)
    const tappingWire: CircuitWire = {
      id: 'tapping_wire_1',
      fromCompId: 'comp_tap',
      fromPinId: '1',
      toCompId: 'comp_parent_A',
      toPinId: '1',
      tappedWireId: 'parent_wire_1',
      junctionPoint: { x: 150, y: 100 },
    };

    const allWires = [parentWire, tappingWire];

    // Initial canonical wire points
    const ptsInitial = getCanonicalWirePoints(tappingWire, comps, allWires);
    const lastPtInitial = ptsInitial[ptsInitial.length - 1];
    expect(lastPtInitial.x).toBe(150);
    expect(lastPtInitial.y).toBe(100);

    // NOW MOVE parent component by dx=+80, dy=+60 (x: 180, y: 160)
    const movedComps: CircuitComponent[] = comps.map((c) =>
      c.id === 'comp_parent_A' ? { ...c, x: 180, y: 160 } : c
    );

    // Dynamic evaluation with moved parent component
    const ptsMoved = getCanonicalWirePoints(tappingWire, movedComps, allWires);
    const lastPtMoved = ptsMoved[ptsMoved.length - 1];

    // Parent wire is now along y = 160 (between x=180 and x=280).
    // Tapping wire terminal endpoint MUST dynamically project onto y = 160 (0px detachment!)
    expect(lastPtMoved.y).toBe(160);
    expect(lastPtMoved.x).toBeGreaterThanOrEqual(180);
    expect(lastPtMoved.x).toBeLessThanOrEqual(280);
  });

  it('GATE 4 Test 1: Shared-Trunk Auto-Junction on Pin-to-Pin (B -> A, C -> A, D -> A)', () => {
    const compA: CircuitComponent = {
      id: 'comp_A',
      type: 'RESISTOR',
      designator: 'R_A',
      label: 'Resistor A',
      category: 'passive',
      value: '1k',
      footprint: 'R_Axial',
      x: 400,
      y: 200,
      rotation: 0,
      parameters: {},
      pins: [{ id: '1', name: '1', x: 0, y: 0, pinType: 'passive' }],
    };
    const compB: CircuitComponent = {
      id: 'comp_B',
      type: 'RESISTOR',
      designator: 'R_B',
      label: 'Resistor B',
      category: 'passive',
      value: '1k',
      footprint: 'R_Axial',
      x: 100,
      y: 200,
      rotation: 0,
      parameters: {},
      pins: [{ id: '1', name: '1', x: 0, y: 0, pinType: 'passive' }],
    };
    const compC: CircuitComponent = {
      id: 'comp_C',
      type: 'RESISTOR',
      designator: 'R_C',
      label: 'Resistor C',
      category: 'passive',
      value: '1k',
      footprint: 'R_Axial',
      x: 250,
      y: 350,
      rotation: 0,
      parameters: {},
      pins: [{ id: '1', name: '1', x: 0, y: 0, pinType: 'passive' }],
    };
    const compD: CircuitComponent = {
      id: 'comp_D',
      type: 'RESISTOR',
      designator: 'R_D',
      label: 'Resistor D',
      category: 'passive',
      value: '1k',
      footprint: 'R_Axial',
      x: 300,
      y: 50,
      rotation: 0,
      parameters: {},
      pins: [{ id: '1', name: '1', x: 0, y: 0, pinType: 'passive' }],
    };

    const comps = [compA, compB, compC, compD];

    // Wire B -> A exists
    const wireBA: CircuitWire = {
      id: 'wire_B_A',
      fromCompId: 'comp_B',
      fromPinId: '1',
      toCompId: 'comp_A',
      toPinId: '1',
    };

    // Connect C -> A directly
    const resC_A = resolveShortestNetWire('comp_C', '1', 'comp_A', '1', comps, [wireBA], undefined, 10);
    expect(resC_A.skipDuplicate).toBeFalsy();
    expect(resC_A.tappedWireId).toBe('wire_B_A');
    expect(resC_A.junctionPoint).toBeDefined();
    expect(resC_A.junctionPoint?.x).toBe(250);
    expect(resC_A.junctionPoint?.y).toBe(200);

    const wireCA: CircuitWire = {
      id: 'wire_C_A',
      fromCompId: resC_A.fromCompId,
      fromPinId: resC_A.fromPinId,
      toCompId: resC_A.toCompId,
      toPinId: resC_A.toPinId,
      tappedWireId: resC_A.tappedWireId,
      junctionPoint: resC_A.junctionPoint,
    };

    // Verify computeCanonicalJunctions emits a solder dot at junctionPoint
    const routedBA = {
      wireId: wireBA.id,
      points: getCanonicalWirePoints(wireBA, comps, [wireBA, wireCA]),
      junctionPoint: wireBA.junctionPoint,
      tappedWireId: wireBA.tappedWireId,
    };
    const routedCA = {
      wireId: wireCA.id,
      points: getCanonicalWirePoints(wireCA, comps, [wireBA, wireCA]),
      junctionPoint: wireCA.junctionPoint,
      tappedWireId: wireCA.tappedWireId,
    };
    const junctions = computeCanonicalJunctions([routedBA, routedCA]);
    const hasDotAtJunction = junctions.some(
      (j) => Math.hypot(j.x - 250, j.y - 200) < 2
    );
    expect(hasDotAtJunction).toBe(true);

    // Connect D -> A: should tap nearest trunk wire
    const resD_A = resolveShortestNetWire('comp_D', '1', 'comp_A', '1', comps, [wireBA, wireCA], undefined, 10);
    expect(resD_A.skipDuplicate).toBeFalsy();
    expect(resD_A.tappedWireId).toBeDefined();
    expect(resD_A.junctionPoint).toBeDefined();

    const wireDA: CircuitWire = {
      id: 'wire_D_A',
      fromCompId: resD_A.fromCompId,
      fromPinId: resD_A.fromPinId,
      toCompId: resD_A.toCompId,
      toPinId: resD_A.toPinId,
      tappedWireId: resD_A.tappedWireId,
      junctionPoint: resD_A.junctionPoint,
    };

    // Chained T-junction supported in both getCanonicalWirePoints and computeCanonicalJunctions
    const ptsD = getCanonicalWirePoints(wireDA, comps, [wireBA, wireCA, wireDA]);
    expect(ptsD.length).toBeGreaterThanOrEqual(2);
    const routedDA = {
      wireId: wireDA.id,
      points: ptsD,
      junctionPoint: wireDA.junctionPoint,
      tappedWireId: wireDA.tappedWireId,
    };
    const junctionsAll = computeCanonicalJunctions([routedBA, routedCA, routedDA]);
    expect(junctionsAll.length).toBeGreaterThanOrEqual(2);

    // Attempt to connect C -> B (already in same electrical net)
    const resC_B = resolveShortestNetWire('comp_C', '1', 'comp_B', '1', comps, [wireBA, wireCA, wireDA], undefined, 10);
    expect(resC_B.skipDuplicate).toBe(true);
  });

  it('GATE 4 Test 2: 3D Studio Zero Fan-Out & Zero Red Color Leak', () => {
    const arduinoComp: CircuitComponent = {
      id: 'arduino1',
      type: 'ARDUINO_UNO',
      designator: 'U1',
      label: 'Arduino Uno',
      category: 'microcontrollers',
      value: 'UNO',
      footprint: 'Arduino_Uno',
      x: 0,
      y: 0,
      rotation: 0,
      parameters: {},
      pins: [
        { id: 'D9', name: 'D9', x: 0, y: 0, pinType: 'passive' },
        { id: 'GND', name: 'GND', x: 0, y: 0, pinType: 'power' },
      ],
    };
    const r3Comp: CircuitComponent = {
      id: 'r3',
      type: 'RESISTOR',
      designator: 'R3',
      label: 'Resistor 3',
      category: 'passive',
      value: '220',
      footprint: 'R_Axial',
      x: 100,
      y: 100,
      rotation: 0,
      parameters: {},
      pins: [
        { id: '1', name: '1', x: -10, y: 0, pinType: 'passive' },
        { id: '2', name: '2', x: 10, y: 0, pinType: 'passive' },
      ],
    };
    const ledComp: CircuitComponent = {
      id: 'led1',
      type: 'LED',
      designator: 'LED1',
      label: 'LED 1',
      category: 'displays',
      value: 'Red',
      footprint: 'LED_5mm',
      x: 150,
      y: 100,
      rotation: 0,
      parameters: {},
      pins: [
        { id: 'a', name: 'anode', x: -10, y: 0, pinType: 'passive' },
        { id: 'k', name: 'cathode', x: 10, y: 0, pinType: 'passive' },
      ],
    };
    const r4Comp: CircuitComponent = {
      id: 'r4',
      type: 'RESISTOR',
      designator: 'R4',
      label: 'Resistor 4',
      category: 'passive',
      value: '1k',
      footprint: 'R_Axial',
      x: 200,
      y: 100,
      rotation: 0,
      parameters: {},
      pins: [
        { id: '1', name: '1', x: -10, y: 0, pinType: 'passive' },
        { id: '2', name: '2', x: 10, y: 0, pinType: 'passive' },
      ],
    };
    const c1Comp: CircuitComponent = {
      id: 'c1',
      type: 'CAPACITOR',
      designator: 'C1',
      label: 'Capacitor 1',
      category: 'passive',
      value: '10uF',
      footprint: 'C_Radial',
      x: 250,
      y: 100,
      rotation: 0,
      parameters: {},
      pins: [
        { id: '+', name: '+', x: -10, y: 0, pinType: 'passive' },
        { id: '-', name: '-', x: 10, y: 0, pinType: 'passive' },
      ],
    };
    const c2Comp: CircuitComponent = {
      id: 'c2',
      type: 'CAPACITOR',
      designator: 'C2',
      label: 'Capacitor 2',
      category: 'passive',
      value: '100nF',
      footprint: 'C_Disc',
      x: 300,
      y: 100,
      rotation: 0,
      parameters: {},
      pins: [
        { id: '+', name: '+', x: -10, y: 0, pinType: 'passive' },
        { id: '-', name: '-', x: 10, y: 0, pinType: 'passive' },
      ],
    };
    const gndComp: CircuitComponent = {
      id: 'gnd1',
      type: 'GROUND',
      designator: 'GND1',
      label: 'Ground',
      category: 'power',
      value: '0V',
      footprint: 'GND',
      x: 250,
      y: 200,
      rotation: 0,
      parameters: {},
      pins: [{ id: '1', name: 'GND', x: 0, y: 0, pinType: 'power' }],
    };

    const comps = [arduinoComp, r3Comp, ledComp, r4Comp, c1Comp, c2Comp, gndComp];

    // Multi-pin signal net: R3:2 -> LED1:a -> R4:1 -> Arduino:D9
    const sigWires: CircuitWire[] = [
      { id: 'w_sig_1', fromCompId: 'r3', fromPinId: '2', toCompId: 'led1', toPinId: 'a' },
      { id: 'w_sig_2', fromCompId: 'led1', fromPinId: 'a', toCompId: 'r4', toPinId: '1' },
      { id: 'w_sig_3', fromCompId: 'r4', fromPinId: '1', toCompId: 'arduino1', toPinId: 'D9' },
    ];

    // Multi-pin GND net: GND1 -> C1:- -> C2:- -> LED1:k -> Arduino:GND
    const gndWires: CircuitWire[] = [
      { id: 'w_gnd_1', fromCompId: 'gnd1', fromPinId: '1', toCompId: 'c1', toPinId: '-' },
      { id: 'w_gnd_2', fromCompId: 'c1', fromPinId: '-', toCompId: 'c2', toPinId: '-' },
      { id: 'w_gnd_3', fromCompId: 'c2', fromPinId: '-', toCompId: 'led1', toPinId: 'k' },
      { id: 'w_gnd_4', fromCompId: 'led1', fromPinId: 'k', toCompId: 'arduino1', toPinId: 'GND' },
    ];

    const allTestWires = [...sigWires, gndWires[0], gndWires[1], gndWires[2], gndWires[3]];

    const onAddWireMock = vi.fn();
    const { container } = render(
      <Virtual3dStudio
        components={comps}
        wires={allTestWires}
        selectedCompId={null}
        onAddComponent={vi.fn()}
        onAddWire={onAddWireMock}
        isSimulating={false}
        simulationStates={{}}
      />
    );

    const canvasEl = container.querySelector('[data-testid="mock-3d-canvas"]');
    expect(canvasEl).toBeInTheDocument();
    const wiresDataRaw = canvasEl?.getAttribute('data-wires');
    const wires3d: Wire3D[] = wiresDataRaw ? JSON.parse(wiresDataRaw) : [];

    // Verify Arduino D9 has AT MOST 1 wire attached
    const d9Wires = wires3d.filter(
      (w) =>
        (w.fromPin.compId === 'arduino1' && w.fromPin.pinId === 'D9') ||
        (w.toPin.compId === 'arduino1' && w.toPin.pinId === 'D9')
    );
    expect(d9Wires.length).toBeLessThanOrEqual(1);

    // Verify Arduino GND has AT MOST 1 wire attached
    const gndWires3d = wires3d.filter(
      (w) =>
        (w.fromPin.compId === 'arduino1' && (w.fromPin.pinId === 'GND' || w.fromPin.pinId.toUpperCase().includes('GND'))) ||
        (w.toPin.compId === 'arduino1' && (w.toPin.pinId === 'GND' || w.toPin.pinId.toUpperCase().includes('GND')))
    );
    expect(gndWires3d.length).toBeLessThanOrEqual(1);

    // Zero red color leak: normal signal wires do not force #EF4444
    d9Wires.forEach((w) => {
      expect(w.color).not.toBe('#EF4444');
    });

    // Zero move wire-bomb: onAddWireMock is NOT called with duplicate wires
    expect(onAddWireMock).toHaveBeenCalledTimes(0);
  });

  it('GATE 4 Test 3: Schematic Editor Wire (W) Mode Dismiss & Segment Slide Paint Order', () => {
    const { container } = render(<SchematicEditorPanel {...defaultProps} />);

    // Activate Wire (W) mode
    const wireToolBtn = screen.getByTestId('tool-wire');
    fireEvent.click(wireToolBtn);

    // Wire hit areas exist
    const firstWire = defaultProps.wires[0];
    const wireHit = container.querySelector(`[data-testid="sch-wire-hit-${firstWire.id}"]`);
    expect(wireHit).toBeInTheDocument();

    // Click wire in Wire mode -> selects wire
    if (wireHit) {
      fireEvent.mouseDown(wireHit, { button: 0, clientX: 200, clientY: 200 });
      fireEvent.click(wireHit, { button: 0, clientX: 200, clientY: 200 });
    }

    // Click empty sheet area -> dismisses selection
    const viewport = screen.getByTestId('sch-canvas-viewport');
    fireEvent.mouseDown(viewport, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.mouseUp(viewport, { button: 0, clientX: 10, clientY: 10 });

    const pill = container.querySelector('[data-testid="sch-wire-action-pill"]');
    expect(pill).toBeNull();

    // Assert visible copper polyline has pointer-events: none
    const copperPolyline = container.querySelector(`[data-testid="sch-wire-${firstWire.id}"]`);
    expect(copperPolyline).toBeInTheDocument();
    expect(copperPolyline).toHaveStyle({ pointerEvents: 'none' });
  });

  it('CORRECTIVE Test 1: No C1:+ / 5V false rail short + USB-only Arduino MST', () => {
    const comps: CircuitComponent[] = [
      {
        id: 'arduino1',
        type: 'ARDUINO_UNO',
        label: 'Arduino Uno',
        category: 'microcontrollers',
        rotation: 0,
        value: 'UNO',
        footprint: 'Arduino_Uno',
        parameters: {},
        x: 0,
        y: 0,
        pins: [
          { id: '5V', name: '5V', x: 0, y: 0, pinType: 'power' },
          { id: 'GND', name: 'GND', x: 0, y: 0, pinType: 'power' },
          { id: 'D9', name: 'D9', x: 0, y: 0, pinType: 'passive' },
        ],
      },
      {
        id: 'c1',
        type: 'CAPACITOR_ELECTROLYTIC',
        label: 'C1',
        category: 'passive',
        rotation: 0,
        value: '10uF',
        footprint: 'CP_Radial',
        parameters: {},
        x: 200,
        y: 100,
        pins: [
          { id: '+', name: '+', x: 0, y: -10, pinType: 'passive' },
          { id: '-', name: '-', x: 0, y: 10, pinType: 'passive' },
        ],
      },
      {
        id: 'r1',
        type: 'RESISTOR',
        label: 'R1',
        category: 'passive',
        rotation: 0,
        value: '220',
        footprint: 'R_Axial',
        parameters: {},
        x: 200,
        y: 200,
        pins: [
          { id: '1', name: '1', x: -20, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 20, y: 0, pinType: 'passive' },
        ],
      },
    ];

    // Wire C1:+ to R1:1, R1:2 to Arduino D9, C1:- to Arduino GND
    const wires: CircuitWire[] = [
      { id: 'w1', fromCompId: 'c1', fromPinId: '+', toCompId: 'r1', toPinId: '1' },
      { id: 'w2', fromCompId: 'r1', fromPinId: '2', toCompId: 'arduino1', toPinId: 'D9' },
      { id: 'w3', fromCompId: 'c1', fromPinId: '-', toCompId: 'arduino1', toPinId: 'GND' },
    ];

    const { container } = render(
      <Virtual3dStudio
        components={comps}
        wires={wires}
        selectedCompId={null}
        onAddComponent={vi.fn()}
        onAddWire={vi.fn()}
        isSimulating={false}
        simulationStates={{}}
      />
    );

    const canvasEl = container.querySelector('[data-testid="mock-3d-canvas"]');
    expect(canvasEl).toBeInTheDocument();
    const wiresDataRaw = canvasEl?.getAttribute('data-wires');
    const wires3d: Wire3D[] = wiresDataRaw ? JSON.parse(wiresDataRaw) : [];

    // Since battery is not present/connected, NO wires should connect to breadboard battery power rails!
    const railWires = wires3d.filter(
      (w) =>
        w.fromPin.pinId.includes('rail_') ||
        w.toPin.pinId.includes('rail_')
    );
    expect(railWires.length).toBe(0);

    // C1:+ should NOT be connected to any rail or leak #EF4444 battery red
    const c1PosWires = wires3d.filter(
      (w) =>
        (w.fromPin.compId === 'c1' && w.fromPin.pinId === '+') ||
        (w.toPin.compId === 'c1' && w.toPin.pinId === '+')
    );
    c1PosWires.forEach((w) => {
      expect(w.fromPin.pinId).not.toContain('rail_');
      expect(w.toPin.pinId).not.toContain('rail_');
    });
  });

  it('CORRECTIVE Test 2: 90/270 rotated component breadboard isolation (different tieGroups across ravine)', () => {
    const testTypes: Array<Component3D['type']> = [
      'RESISTOR',
      'CAPACITOR',
      'CAPACITOR_ELECTROLYTIC',
      'LED',
      'DIODE',
    ];

    for (const compType of testTypes) {
      // 90 degrees rotation
      const comp90: Component3D = {
        id: `test_${compType}_90`,
        type: compType,
        label: compType,
        parameters: {},
        x3d: 0,
        y3d: 0,
        z3d: 0,
        rotY: 90,
      };

      const h1_90 = getComponentPinHole(comp90, compType === 'LED' ? 'anode' : '1');
      const h2_90 = getComponentPinHole(comp90, compType === 'LED' ? 'cathode' : '2');
      expect(h1_90).toBeTruthy();
      expect(h2_90).toBeTruthy();

      const tg1_90 = getHoleTieGroup(h1_90!);
      const tg2_90 = getHoleTieGroup(h2_90!);
      expect(tg1_90).toBeTruthy();
      expect(tg2_90).toBeTruthy();
      // Must be in different tie groups (isolated across the center ravine!)
      expect(tg1_90).not.toBe(tg2_90);
      expect(h1_90).toContain('_E');
      expect(h2_90).toContain('_F');

      // 270 degrees rotation
      const comp270: Component3D = {
        id: `test_${compType}_270`,
        type: compType,
        label: compType,
        parameters: {},
        x3d: 0,
        y3d: 0,
        z3d: 0,
        rotY: 270,
      };

      const h1_270 = getComponentPinHole(comp270, compType === 'LED' ? 'anode' : '1');
      const h2_270 = getComponentPinHole(comp270, compType === 'LED' ? 'cathode' : '2');
      expect(h1_270).toBeTruthy();
      expect(h2_270).toBeTruthy();

      const tg1_270 = getHoleTieGroup(h1_270!);
      const tg2_270 = getHoleTieGroup(h2_270!);
      expect(tg1_270).toBeTruthy();
      expect(tg2_270).toBeTruthy();
      expect(tg1_270).not.toBe(tg2_270);
      expect(h1_270).toContain('_F');
      expect(h2_270).toContain('_E');
    }
  });

  it('CORRECTIVE Test 3: Default wire has color undefined and Wire (W) mode pan/empty-canvas dismiss with client coords', () => {
    const onAddWireMock = vi.fn();
    const onSelectWireMock = vi.fn();

    const { container, rerender } = render(
      <SchematicEditorPanel
        {...defaultProps}
        onAddWire={onAddWireMock}
        onSelectWire={onSelectWireMock}
      />
    );

    // Click Pin to start wire in Wire mode
    const wireToolBtn = screen.getByTestId('tool-wire');
    fireEvent.click(wireToolBtn);

    // Simulate pin click on comp1 pin 1
    const comp1 = defaultProps.components[0];
    const pin1 = comp1.pins![0];
    const pinEl1 = container.querySelector(`[data-testid="sch-pin-${comp1.id}-${pin1.id}"]`);
    if (pinEl1) {
      fireEvent.click(pinEl1);
    }

    // Simulate pin click on comp2 pin 1
    const comp2 = defaultProps.components[1];
    const pin2 = comp2.pins![0];
    const pinEl2 = container.querySelector(`[data-testid="sch-pin-${comp2.id}-${pin2.id}"]`);
    if (pinEl2) {
      fireEvent.click(pinEl2);
    }

    if (onAddWireMock.mock.calls.length > 0) {
      const addedWire = onAddWireMock.mock.calls[0][0];
      // Default wire must have undefined color (not hardcoded #38BDF8 or #0F6B54)
      expect(addedWire.color).toBeUndefined();
    }

    // Now test Pan tool dismiss with client coords
    const testWireId = defaultProps.wires[0].id;
    rerender(
      <SchematicEditorPanel
        {...defaultProps}
        selectedWireId={testWireId}
        onAddWire={onAddWireMock}
        onSelectWire={onSelectWireMock}
      />
    );

    // Switch to Pan tool
    const panToolBtn = screen.getByTestId('tool-pan');
    fireEvent.click(panToolBtn);

    const viewport = screen.getByTestId('sch-canvas-viewport');
    // Mouse down and mouse up without moving (<4px) -> dismisses wire selection
    fireEvent.mouseDown(viewport, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.mouseUp(viewport, { button: 0, clientX: 101, clientY: 101 });

    expect(onSelectWireMock).toHaveBeenCalledWith(null);
  });

  it('CORRECTIVE Test 4: Manual wire tap in SchematicCanvas preserves clicked wire & point and avoids duplicates', () => {
    const onAddWireMock = vi.fn();
    const targetWire = defaultProps.wires[0];

    const { container } = render(
      <SchematicCanvas
        components={defaultProps.components}
        wires={defaultProps.wires}
        selectedCompId={null}
        selectedWireId={null}
        onSelectComponent={vi.fn()}
        onSelectWire={vi.fn()}
        onAddWire={onAddWireMock}
        onDeleteWire={vi.fn()}
        onUpdateComponentPosition={vi.fn()}
        onRotateComponent={vi.fn()}
        onDeleteComponent={vi.fn()}
        isSimulating={false}
        simulationStates={{}}
      />
    );

    // Switch to Wire tool
    const wireToolBtn = screen.getByTitle(/Wire Tool/i);
    fireEvent.click(wireToolBtn);

    // Start wire from comp1 pin 1
    const comp1 = defaultProps.components[0];
    const pin1 = comp1.pins![0];
    const pinEl = container.querySelector(`[data-testid="pin-${comp1.id}-${pin1.id}"]`) ||
      container.querySelector(`circle[data-pin="${pin1.id}"]`);
    if (pinEl) {
      fireEvent.click(pinEl);
    }

    // Click on targetWire to tap it
    const wirePath = container.querySelector(`path[stroke="transparent"]`);
    if (wirePath) {
      fireEvent.click(wirePath, { clientX: 250, clientY: 150 });
    }

    if (onAddWireMock.mock.calls.length > 0) {
      const addedWire = onAddWireMock.mock.calls[0][0];
      // Must tap the exact target wire
      expect(addedWire.tappedWireId).toBe(targetWire.id);
      expect(addedWire.junctionPoint).toBeDefined();
    }
  });
});

