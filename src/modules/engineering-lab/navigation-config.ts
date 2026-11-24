import { WorkspaceMode } from './types';

export interface VirtualLabNavItem {
  id: string;
  mode: WorkspaceMode;
  name: string;
  label: string;
  title: string;
  tooltip: string;
  slug: string;
  iconName: 'Cpu' | 'Layers' | 'FileCode2' | 'Grid' | 'Box' | 'Activity' | 'Code2';
}

/**
 * Canonical 7-Tab Navigation configuration for Virtual Engineering Lab.
 * Order and exact short names strictly enforced:
 * 1. Schematic
 * 2. 3D Studio
 * 3. Schematic Editor
 * 4. PCB Layout
 * 5. 3D PCB
 * 6. Instruments
 * 7. MCU
 */
export const VIRTUAL_LAB_NAV_ITEMS: VirtualLabNavItem[] = [
  {
    id: 'schematic',
    mode: 'schematic',
    name: 'Schematic',
    label: 'Schematic',
    title: '2D Real-Time Circuit Simulation',
    tooltip: '2D Real-Time Circuit Simulation',
    slug: 'schematic',
    iconName: 'Cpu',
  },
  {
    id: 'studio3d',
    mode: 'studio3d',
    name: '3D Studio',
    label: '3D Studio',
    title: '3D Real-Time Circuit Simulation',
    tooltip: '3D Real-Time Circuit Simulation',
    slug: '3d-studio',
    iconName: 'Layers',
  },
  {
    id: 'schematicEditor',
    mode: 'schematicEditor',
    name: 'Schematic Editor',
    label: 'Schematic Editor',
    title: 'Professional Schematic Capture & Design',
    tooltip: 'Professional Schematic Capture & Design',
    slug: 'schematic-editor',
    iconName: 'FileCode2',
  },
  {
    id: 'pcb2d',
    mode: 'pcb2d',
    name: 'PCB Layout',
    label: 'PCB Layout',
    title: '2D PCB Design & Routing',
    tooltip: '2D PCB Design & Routing',
    slug: 'pcb-2d',
    iconName: 'Grid',
  },
  {
    id: 'pcb3d',
    mode: 'pcb3d',
    name: '3D PCB',
    label: '3D PCB',
    title: '3D Photorealistic PCB Visualization',
    tooltip: '3D Photorealistic PCB Visualization',
    slug: 'pcb-3d',
    iconName: 'Box',
  },
  {
    id: 'instruments',
    mode: 'instruments',
    name: 'Instruments',
    label: 'Instruments',
    title: 'Benchtop Virtual Instruments',
    tooltip: 'Benchtop Virtual Instruments',
    slug: 'instruments',
    iconName: 'Activity',
  },
  {
    id: 'mcu',
    mode: 'mcu',
    name: 'MCU',
    label: 'MCU',
    title: 'Embedded Microcontroller Development',
    tooltip: 'Embedded Microcontroller Development',
    slug: 'mcu',
    iconName: 'Code2',
  },
];
