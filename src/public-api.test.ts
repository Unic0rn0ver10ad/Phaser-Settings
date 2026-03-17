/**
 * Contract test: public API surface. Imports only from 'phaser-settings' and asserts
 * expected exports exist. Do not remove or rename public exports without updating
 * PUBLIC_API.md and this test.
 */
import { describe, it, expect, vi } from 'vitest';

// Phaser expects window; mock it so the full package can load in Node.
vi.mock('phaser', () => ({ default: {} }));
import {
  VERSION,
  SettingsManager,
  createSettingsModalScene,
  validateSchema,
  getDefaultForDefinition,
  getOptionValues,
  defaultSettingsTheme,
  renderSettingsList,
  type SettingsStorageAdapter,
  type SettingsManagerCreateOptions,
  type SettingChangeCallback,
  type ApplyCallback,
  type SettingsListRendererOptions,
  type RenderedRow,
  type CreateSettingsModalSceneOptions,
  type SettingsModalBounds,
  type SettingValue,
  type SettingDefinition,
  type SettingsSchema,
  type SettingCategory,
  type SettingCondition,
  type SettingsTheme,
  type SliderConstraints,
  type SettingOption,
  type SettingDefinitionBase,
  type ToggleSettingDefinition,
  type SliderSettingDefinition,
  type SelectSettingDefinition,
  type SegmentedSettingDefinition,
  type ActionSettingDefinition,
  type SectionSettingDefinition,
} from 'phaser-settings';

describe('public API contract', () => {
  it('exports VERSION string', () => {
    expect(typeof VERSION).toBe('string');
    expect(VERSION.length).toBeGreaterThan(0);
  });

  it('exports SettingsManager class with create and getInstance', () => {
    expect(SettingsManager).toBeDefined();
    expect(typeof SettingsManager.create).toBe('function');
    expect(typeof SettingsManager.getInstance).toBe('function');
    expect(typeof SettingsManager.resetForTests).toBe('function');
    expect(typeof SettingsManager.isInitialized).toBe('function');
  });

  it('exports createSettingsModalScene function', () => {
    expect(typeof createSettingsModalScene).toBe('function');
  });

  it('exports validation helpers', () => {
    expect(typeof validateSchema).toBe('function');
    expect(typeof getDefaultForDefinition).toBe('function');
    expect(typeof getOptionValues).toBe('function');
  });

  it('exports UI helpers', () => {
    expect(defaultSettingsTheme).toBeDefined();
    expect(typeof renderSettingsList).toBe('function');
  });

  describe('defaultSettingsTheme (theme font contract)', () => {
    it('includes fontFamily fallback so merged theme has a safe default', () => {
      expect(defaultSettingsTheme.fontFamily).toBe('monospace');
    });

    it('satisfies SettingsTheme (required layout/size/color fields present)', () => {
      const theme = defaultSettingsTheme as SettingsTheme;
      expect(theme.rowHeight).toBeDefined();
      expect(theme.labelFontSize).toBeDefined();
      expect(theme.controlHeight).toBeDefined();
    });
  });
});
