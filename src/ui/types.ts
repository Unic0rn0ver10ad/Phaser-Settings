import type Phaser from 'phaser';
import type { SettingValue, SettingDefinition, SettingsTheme } from '../types.js';

export interface ControlContext {
  scene: Phaser.Scene;
  theme: SettingsTheme;
  controlWidth: number;
  /** Total width of the list (for section header background). */
  listWidth: number;
}

export interface SettingControlProps<T extends SettingDefinition = SettingDefinition> {
  definition: T;
  value: SettingValue;
  disabled: boolean;
  onChange: (value: SettingValue) => void;
  onAction?: () => void;
}

export interface ControlResult {
  container: Phaser.GameObjects.Container;
}
