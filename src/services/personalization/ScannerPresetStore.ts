/**
 * ScannerPresetStore — save/load/delete personal scanner presets.
 *
 * Follows the same localStorage-first pattern as other personalization stores.
 * Each preset captures a named scanner configuration (filters, thresholds, sorts)
 * so users can save and reuse custom scanner setups.
 */
import { loadAuthSession } from "../auth/sessionStore";
import { authenticatedFetchOnlyIfSignedIn } from "../auth/authenticatedFetch";
import type { SavedScannerPreset } from "../../research/contracts/productContracts.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PresetStoreState {
  presets: SavedScannerPreset[];
}

// ── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = "stockstory_scanner_presets_v1";
const PRESET_EVENT = "scannerpresetchange";
const MAX_PRESETS = 50;

function dispatchChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PRESET_EVENT));
}

export function subscribePresets(fn: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(PRESET_EVENT, fn);
  return () => window.removeEventListener(PRESET_EVENT, fn);
}

function storageKey(): string {
  const uid = loadAuthSession().uid ?? "anonymous";
  return `${STORAGE_KEY_PREFIX}_${uid}`;
}

function load(): PresetStoreState {
  if (typeof window === "undefined") return { presets: [] };
  try {
    const raw = localStorage.getItem(storageKey());
    return raw ? JSON.parse(raw) : { presets: [] };
  } catch {
    return { presets: [] };
  }
}

function save(state: PresetStoreState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(), JSON.stringify(state));
  } catch {
    // localStorage full
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeId(): string {
  return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Save a new scanner preset. Returns the created preset with id + createdAt.
 */
export function savePreset(
  name: string,
  description: string,
  filters: Record<string, unknown>
): SavedScannerPreset {
  const state = load();
  const preset: SavedScannerPreset = {
    id: makeId(),
    name,
    description,
    filters,
    createdAt: new Date().toISOString(),
  };

  state.presets.push(preset);

  // Trim to max
  if (state.presets.length > MAX_PRESETS) {
    state.presets = state.presets.slice(-MAX_PRESETS);
  }

  save(state);
  dispatchChange();
  return preset;
}

/**
 * Overwrite an existing preset by ID. Returns updated preset or null if not found.
 */
export function updatePreset(
  id: string,
  updates: { name?: string; description?: string; filters?: Record<string, unknown> }
): SavedScannerPreset | null {
  const state = load();
  const idx = state.presets.findIndex((p) => p.id === id);
  if (idx < 0) return null;

  const preset = state.presets[idx];
  if (updates.name !== undefined) preset.name = updates.name;
  if (updates.description !== undefined) preset.description = updates.description;
  if (updates.filters !== undefined) preset.filters = updates.filters;

  save(state);
  dispatchChange();
  return { ...preset };
}

/**
 * Get all saved presets (most recent first).
 */
export function getPresets(): SavedScannerPreset[] {
  return [...load().presets].reverse();
}

/**
 * Get a single preset by ID.
 */
export function getPreset(id: string): SavedScannerPreset | null {
  return load().presets.find((p) => p.id === id) ?? null;
}

/**
 * Delete a preset by ID. Returns true if deleted, false if not found.
 */
export function deletePreset(id: string): boolean {
  const state = load();
  const before = state.presets.length;
  state.presets = state.presets.filter((p) => p.id !== id);
  if (state.presets.length === before) return false;

  save(state);
  dispatchChange();
  return true;
}

/**
 * Clear all presets.
 */
export function clearAllPresets(): void {
  save({ presets: [] });
  dispatchChange();
}

/**
 * Sync presets to remote (Bearer token).
 * Remote failure never erases local cache.
 */
export async function syncPresetsToRemote(): Promise<void> {
  const uid = loadAuthSession().uid;
  if (!uid) return;

  const state = load();
  try {
    await authenticatedFetchOnlyIfSignedIn("/api/scanner-presets", {
      method: "PUT",
      body: JSON.stringify(state.presets),
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Remote sync failure — local data preserved
  }
}

/**
 * Pull presets from remote. Merges with local (remote wins on ID conflict).
 */
export async function pullPresetsFromRemote(): Promise<void> {
  const uid = loadAuthSession().uid;
  if (!uid) return;

  try {
    const resp = await authenticatedFetchOnlyIfSignedIn("/api/scanner-presets");
    if (!resp) return;
    const remote: SavedScannerPreset[] = await resp.json();
    if (!Array.isArray(remote)) return;

    const state = load();
    const remoteIds = new Set(remote.map((p) => p.id));
    // Keep local presets that don't conflict with remote
    const localOnly = state.presets.filter((p) => !remoteIds.has(p.id));
    state.presets = [...localOnly, ...remote].slice(0, MAX_PRESETS);
    save(state);
    dispatchChange();
  } catch {
    // Remote fetch failure — local data preserved
  }
}

export type { SavedScannerPreset };
