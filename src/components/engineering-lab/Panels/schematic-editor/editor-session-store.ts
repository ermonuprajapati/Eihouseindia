/**
 * Schematic Editor Viewport & Session State Persistence
 * Ensures smooth tab switching without viewport scramble or reset.
 * Keyed by project ID so multiple projects or tab switches are cleanly isolated.
 */

import {
  SchematicGraphicShape,
  SchematicTextNote,
  SchematicAttachedImage,
  SchematicNoConnect,
  SchematicManualJunction,
  SchematicNetLabel,
  SchematicPowerPort,
  SchematicTitleBlock,
  SchematicEditorSheetConfig,
} from '@/modules/engineering-lab/types';

export interface EditorViewportState {
  pan: { x: number; y: number };
  zoom: number;
  sheetConfig?: SchematicEditorSheetConfig;
  shapes?: SchematicGraphicShape[];
  textNotes?: SchematicTextNote[];
  images?: SchematicAttachedImage[];
  noConnects?: SchematicNoConnect[];
  manualJunctions?: SchematicManualJunction[];
  netLabels?: SchematicNetLabel[];
  powerPorts?: SchematicPowerPort[];
  titleBlock?: SchematicTitleBlock;
}

const inMemoryStore = new Map<string, EditorViewportState>();
const STORAGE_PREFIX = 'ei_lab_schematic_session_';

export function loadEditorViewport(projectId?: string): EditorViewportState {
  const key = projectId || 'default';
  if (inMemoryStore.has(key)) {
    return { ...inMemoryStore.get(key)! };
  }

  if (typeof window !== 'undefined') {
    try {
      const storageKey = `${STORAGE_PREFIX}${key}`;
      const raw = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          parsed.pan &&
          typeof parsed.pan.x === 'number' &&
          typeof parsed.pan.y === 'number' &&
          typeof parsed.zoom === 'number'
        ) {
          const loaded: EditorViewportState = {
            pan: { x: parsed.pan.x, y: parsed.pan.y },
            zoom: Math.min(2.5, Math.max(0.4, parsed.zoom)),
            sheetConfig: parsed.sheetConfig,
            shapes: parsed.shapes,
            textNotes: parsed.textNotes,
            images: parsed.images,
            noConnects: parsed.noConnects,
            manualJunctions: parsed.manualJunctions,
            netLabels: parsed.netLabels,
            powerPorts: parsed.powerPorts,
            titleBlock: parsed.titleBlock,
          };
          inMemoryStore.set(key, loaded);
          return loaded;
        }
      }
    } catch {}
  }

  return { pan: { x: 80, y: 60 }, zoom: 1 };
}

export function saveEditorViewport(state: EditorViewportState, projectId?: string): void {
  const key = projectId || 'default';
  inMemoryStore.set(key, { ...state });

  if (typeof window !== 'undefined') {
    try {
      const storageKey = `${STORAGE_PREFIX}${key}`;
      const serialized = JSON.stringify({
        ...state,
        updatedAt: Date.now(),
      });
      sessionStorage.setItem(storageKey, serialized);
      localStorage.setItem(storageKey, serialized);
    } catch {}
  }
}
