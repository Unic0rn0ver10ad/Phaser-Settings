/**
 * phaser-settings — data-driven Phaser 3 settings system.
 * @see docs/API.md for contract and lifecycle.
 */
export { VERSION } from './version.js';
export * from './types.js';
export type { SettingsStorageAdapter } from './storage.js';
export { getDefaultForDefinition, getOptionValues, validateSchema } from './validation.js';
export {
  SettingsManager,
  type SettingChangeCallback,
  type ApplyCallback,
  type SettingsManagerCreateOptions,
} from './SettingsManager.js';
export { defaultSettingsTheme } from './ui/SettingsTheme.js';
export {
  renderSettingsList,
  type SettingsListRendererOptions,
  type RenderedRow,
} from './ui/SettingsListRenderer.js';
export {
  createSettingsModalScene,
  type CreateSettingsModalSceneOptions,
} from './createSettingsModalScene.js';
