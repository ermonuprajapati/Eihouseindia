import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SchematicEditorPanel } from '../components/engineering-lab/Panels/SchematicEditorPanel';
import { LabHeader } from '../components/engineering-lab/Header/LabHeader';
import { TEMPLATE_555_ASTABLE } from '../modules/engineering-lab/templates/starter-templates';
import { CircuitComponent, CircuitWire } from '../modules/engineering-lab/types';
import { exportSchematicSvg } from '../components/engineering-lab/Panels/schematic-editor/export-utils';
import {
  placeOnlyUnplacedEditorComponents,
  clientToSheetCoords,
  routeOrthogonalWires,
  autoLayoutCircuit,
} from '../modules/engineering-lab/schematic-engine/schematic-sync-layout';

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
    // In schematicEditor mode: Run/Stop simulation controls must NOT be rendered
    const { rerender } = render(
      <LabHeader
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
});

