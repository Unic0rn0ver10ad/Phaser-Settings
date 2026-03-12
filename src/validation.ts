/**
 * Pure helpers for schema and validation.
 */
import type { SettingDefinition, SettingOption, SettingsSchema, SliderSettingDefinition } from './types.js';

/** Get default value for a definition (for persistence and coercion). */
export function getDefaultForDefinition(def: SettingDefinition): string | number | boolean {
  if (def.type === 'slider') return (def as SliderSettingDefinition).default;
  if (def.type === 'select' || def.type === 'segmented') return def.default;
  if (def.type === 'toggle') return def.default;
  if (def.type === 'section' || def.type === 'action') return false;
  return false;
}

/** Get all option values for select/segmented (for validation). */
export function getOptionValues(def: SettingDefinition): (string | number | boolean)[] {
  if (def.type !== 'select' && def.type !== 'segmented') return [];
  return (def.options as SettingOption[]).map((o) => o.value);
}

/** Run in dev to fail fast on malformed schema. Ids must be unique; definitions must have required fields. */
export function validateSchema(schema: SettingsSchema): void {
  const ids = new Set<string>();
  for (const def of schema.definitions) {
    if (!def.id || typeof def.id !== 'string') {
      throw new Error('SettingsSchema: definition missing id');
    }
    if (ids.has(def.id)) {
      throw new Error(`SettingsSchema: duplicate id "${def.id}"`);
    }
    ids.add(def.id);
    if (!def.label || typeof def.label !== 'string') {
      throw new Error(`SettingsSchema: definition "${def.id}" missing label`);
    }
    if (!def.category || typeof def.category !== 'string') {
      throw new Error(`SettingsSchema: definition "${def.id}" missing category`);
    }
    if (def.type === 'slider' && !def.slider) {
      throw new Error(`SettingsSchema: definition "${def.id}" (slider) missing slider constraints`);
    }
    if ((def.type === 'select' || def.type === 'segmented') && (!def.options || !Array.isArray(def.options))) {
      throw new Error(`SettingsSchema: definition "${def.id}" (select/segmented) missing options`);
    }
    if (def.type === 'action' && !def.actionLabel) {
      throw new Error(`SettingsSchema: definition "${def.id}" (action) missing actionLabel`);
    }
  }
}
