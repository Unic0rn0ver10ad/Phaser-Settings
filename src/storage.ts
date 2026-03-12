/**
 * Persistence adapter for settings.
 * Consumer implements this; e.g. bridge to SaveManager or localStorage.
 *
 * Contract:
 * - load(): Return current settings blob. Do not throw for "no data"; return {}.
 *   On corruption, return {} or throw (document adapter behavior).
 * - save(data): Persist. Replace vs merge is adapter's choice (e.g. merge into
 *   app's SaveData.settings). Package passes full current settings object.
 */

export interface SettingsStorageAdapter {
  load(): Record<string, unknown>;
  save(data: Record<string, unknown>): void;
}
