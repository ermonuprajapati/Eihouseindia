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
 * Prevents multiple users on the same machine from overwriting each other's projects.
 */
export function getUserStorageKey(userId: string | null | undefined, baseKey: string): string {
  const safeUid = userId && typeof userId === 'string' && userId.trim() ? userId.trim() : 'guest';
  return `ei_lab_${safeUid}_${baseKey}`;
}

/**
 * Persists the user's active workspace project snapshot with multi-user isolation.
 */
export function saveUserActiveProject(userId: string | null | undefined, project: EngineeringProject): void {
  if (typeof window === 'undefined') return;
  try {
    const jsonStr = JSON.stringify(project);
    const userActiveKey = getUserStorageKey(userId, 'active_project');
    const userProjKey = getUserStorageKey(userId, `project_${project.id}`);

    localStorage.setItem(userActiveKey, jsonStr);
    localStorage.setItem(userProjKey, jsonStr);

    // Also persist under direct project ID for shared links
    localStorage.setItem(`ei_lab_${project.id}`, jsonStr);

    // Update the user's isolated project index
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

    // Legacy sync for guest/unauthenticated users
    if (!userId || userId === 'guest') {
      localStorage.setItem('ei_lab_active_project', jsonStr);
      localStorage.setItem('ei_lab_projects_index', JSON.stringify(indexList));
    }
  } catch (err) {
    console.warn('[Storage] Failed to save project locally:', err);
  }
}

/**
 * Restores the active project for the specified user with backward compatibility.
 */
export function loadUserActiveProject(userId: string | null | undefined): EngineeringProject | null {
  if (typeof window === 'undefined') return null;
  try {
    const userActiveKey = getUserStorageKey(userId, 'active_project');
    let raw = localStorage.getItem(userActiveKey);

    // Fallback to legacy unnamespaced key if user is guest or first time migrating
    if (!raw) {
      raw = localStorage.getItem('ei_lab_active_project');
    }

    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.components) && Array.isArray(parsed.wires)) {
      return parsed;
    }
  } catch (err) {
    console.warn('[Storage] Failed to parse active project:', err);
  }
  return null;
}

/**
 * Restores a specific project by ID for the specified user or global direct link.
 */
export function loadUserProjectById(userId: string | null | undefined, projectId: string): EngineeringProject | null {
  if (typeof window === 'undefined') return null;
  try {
    // 1. Try user-isolated project key
    const userProjKey = getUserStorageKey(userId, `project_${projectId}`);
    let raw = localStorage.getItem(userProjKey);

    // 2. Try global/legacy project key
    if (!raw) {
      raw = localStorage.getItem(`ei_lab_${projectId}`);
    }

    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.components) && Array.isArray(parsed.wires)) {
      return parsed;
    }
  } catch (err) {
    console.warn('[Storage] Failed to parse project by ID:', err);
  }
  return null;
}

/**
 * Retrieves the project index list for the specified user.
 */
export function getUserProjectsIndex(userId: string | null | undefined): LabProjectIndexEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const userIndexKey = getUserStorageKey(userId, 'projects_index');
    let indexRaw = localStorage.getItem(userIndexKey);

    // Fallback to legacy global index if guest or first load
    if (!indexRaw && (!userId || userId === 'guest')) {
      indexRaw = localStorage.getItem('ei_lab_projects_index');
    }

    if (indexRaw) {
      const parsed = JSON.parse(indexRaw);
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
    const userIndexKey = getUserStorageKey(userId, 'projects_index');
    const jsonStr = JSON.stringify(list);
    localStorage.setItem(userIndexKey, jsonStr);

    if (!userId || userId === 'guest') {
      localStorage.setItem('ei_lab_projects_index', jsonStr);
    }
  } catch {}
}

/**
 * Deletes a project for the specified user.
 */
export function deleteUserProject(userId: string | null | undefined, projectId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const userProjKey = getUserStorageKey(userId, `project_${projectId}`);
    localStorage.removeItem(userProjKey);
    localStorage.removeItem(`ei_lab_${projectId}`);

    const indexList = getUserProjectsIndex(userId);
    const updated = indexList.filter((p) => p.id !== projectId);
    saveUserProjectsIndex(userId, updated);
  } catch {}
}

/**
 * Clears the active project snapshot for the specified user (e.g. for Reset / New Blank Project).
 */
export function clearUserActiveProject(userId: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    const userActiveKey = getUserStorageKey(userId, 'active_project');
    localStorage.removeItem(userActiveKey);
    if (!userId || userId === 'guest') {
      localStorage.removeItem('ei_lab_active_project');
    }
  } catch {}
}
