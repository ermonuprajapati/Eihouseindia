import { EngineeringProject } from '../types';

export interface LabProjectIndexEntry {
  id: string;
  title: string;
  updatedAt: string;
  componentCount: number;
  wireCount: number;
}

/**
 * Resolves a namespace-isolated localStorage key for the given user.
 * Ensures strict multi-user isolation so different user accounts on the
 * same machine NEVER leak or overwrite each other's circuits.
 */
export function getUserProjectStorageKey(userId: string | null | undefined): string {
  if (userId && typeof userId === 'string' && userId.trim() && userId.trim() !== 'guest') {
    return `eihouse_saved_project_${userId.trim()}`;
  }
  return 'eihouse_saved_project_guest';
}

export function getUserProjectsIndexKey(userId: string | null | undefined): string {
  if (userId && typeof userId === 'string' && userId.trim() && userId.trim() !== 'guest') {
    return `eihouse_projects_index_${userId.trim()}`;
  }
  return 'eihouse_projects_index_guest';
}

/**
 * Persists the user's circuit state ONLY when explicitly saved by the user (Save button / Ctrl+S).
 * Namespaced strictly by the authenticated userId.
 */
export function saveUserExplicitProject(userId: string | null | undefined, project: EngineeringProject): void {
  if (typeof window === 'undefined') return;
  try {
    const jsonStr = JSON.stringify(project);
    const storageKey = getUserProjectStorageKey(userId);
    localStorage.setItem(storageKey, jsonStr);

    // Also persist under direct project ID for explicit share links
    if (project.id) {
      localStorage.setItem(`ei_lab_${project.id}`, jsonStr);
    }

    // Maintain per-user project catalog index
    const indexList = getUserProjectsIndex(userId);
    const existingIdx = indexList.findIndex((item) => item.id === project.id);
    const entry: LabProjectIndexEntry = {
      id: project.id,
      title: project.title,
      updatedAt: new Date().toISOString(),
      componentCount: Array.isArray(project.components) ? project.components.length : 0,
      wireCount: Array.isArray(project.wires) ? project.wires.length : 0,
    };

    if (existingIdx >= 0) {
      indexList[existingIdx] = entry;
    } else {
      indexList.unshift(entry);
    }
    saveUserProjectsIndex(userId, indexList);
  } catch (err) {
    console.warn('[Storage] Failed to explicitly save project locally:', err);
  }
}

/**
 * Loads the last explicitly saved project for the authenticated user.
 * If the user has not explicitly saved a project, returns null so the caller
 * can render the pristine default 1-second NE555 presentation circuit.
 * Guest users NEVER see a logged-in user's saved circuit.
 */
export function loadUserExplicitProject(userId: string | null | undefined): EngineeringProject | null {
  if (typeof window === 'undefined') return null;
  try {
    const storageKey = getUserProjectStorageKey(userId);
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.components) && Array.isArray(parsed.wires)) {
      return parsed;
    }
  } catch (err) {
    console.warn('[Storage] Failed to parse saved project:', err);
  }
  return null;
}

/**
 * Clears the explicitly saved project for the specified user (e.g., on New Project / Reset).
 */
export function clearUserExplicitProject(userId: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    const storageKey = getUserProjectStorageKey(userId);
    localStorage.removeItem(storageKey);
  } catch {}
}

/**
 * Retrieves the project index list for the specified user.
 */
export function getUserProjectsIndex(userId: string | null | undefined): LabProjectIndexEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getUserProjectsIndexKey(userId);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * Saves the project index list for the specified user.
 */
export function saveUserProjectsIndex(userId: string | null | undefined, list: LabProjectIndexEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getUserProjectsIndexKey(userId);
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
}

/**
 * Deletes a project from the specified user's index and storage.
 */
export function deleteUserProject(userId: string | null | undefined, projectId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`ei_lab_${projectId}`);
    const indexList = getUserProjectsIndex(userId);
    const updated = indexList.filter((p) => p.id !== projectId);
    saveUserProjectsIndex(userId, updated);
  } catch {}
}

// Aliases for compatibility
export const saveUserActiveProject = saveUserExplicitProject;
export const loadUserActiveProject = loadUserExplicitProject;
export const clearUserActiveProject = clearUserExplicitProject;
