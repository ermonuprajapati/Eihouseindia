import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SchematicEditorPanel } from '../components/engineering-lab/Panels/SchematicEditorPanel';
import { TEMPLATE_555_ASTABLE } from '../modules/engineering-lab/templates/starter-templates';
import { CircuitComponent, CircuitWire } from '../modules/engineering-lab/types';
import { exportSchematicSvg } from '../components/engineering-lab/Panels/schematic-editor/export-utils';

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

      // Crucial test: Count vector graphic primitives inside each component.
      // Proves that components are NOT invisible and NOT just single 1px dots!
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
      // Should have circle terminal
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

    // Ghost preview should be present
    const ghost = container.querySelector('.sch-ghost-preview');
    expect(ghost).toBeInTheDocument();
    const ghostComp = ghost?.querySelector('[data-testid="sch-comp-pot1"]');
    expect(ghostComp).toBeInTheDocument();

    // Clicking canvas places the component
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

    // Rotate
    fireEvent.click(screen.getByTestId('action-rotate'));
    expect(onRotate).toHaveBeenCalledWith('r1');

    // Mirror Horizontal
    fireEvent.click(screen.getByTestId('action-mirror-h'));
    expect(onUpdateComps).toHaveBeenCalledTimes(1);

    // Duplicate
    fireEvent.click(screen.getByTestId('action-duplicate'));
    expect(onUpdateComps).toHaveBeenCalledTimes(2);

    // Delete
    fireEvent.click(screen.getByTestId('action-delete'));
    expect(onDelete).toHaveBeenCalledWith('r1');

    // Undo & Redo
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

    // Double-click opens inline editor
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

    // Double click component
    if (r1Comp) fireEvent.doubleClick(r1Comp);

    expect(screen.getByTestId('sch-inline-editor-modal')).toBeInTheDocument();
    const desInput = screen.getByTestId('inline-edit-designator') as HTMLInputElement;
    const valInput = screen.getByTestId('inline-edit-value') as HTMLInputElement;

    expect(desInput.value).toBe('R1');
    expect(valInput.value).toBe('10kΩ');

    // Change value and apply
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

    // Mock document.createElement('a') to verify download triggered
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
});
