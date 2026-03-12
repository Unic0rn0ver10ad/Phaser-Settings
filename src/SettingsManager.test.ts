import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsManager } from './SettingsManager.js';
import type { SettingsSchema } from './types.js';
import type { SettingsStorageAdapter } from './storage.js';

const minimalSchema: SettingsSchema = {
  categories: [{ id: 'g', label: 'General', order: 0 }],
  definitions: [
    { type: 'section', id: 's1', label: 'General', category: 'g', default: false },
    { type: 'toggle', id: 'muted', label: 'Mute', category: 'g', default: false },
    { type: 'slider', id: 'vol', label: 'Volume', category: 'g', default: 0.8, slider: { min: 0, max: 1, step: 0.1 } },
  ],
};

function createStorage(initial: Record<string, unknown> = {}): SettingsStorageAdapter & { data: Record<string, unknown> } {
  const data = { ...initial };
  return {
    data,
    load: () => ({ ...data }),
    save: (d) => {
      Object.keys(data).length = 0;
      Object.assign(data, d);
    },
  };
}

describe('SettingsManager', () => {
  beforeEach(() => {
    SettingsManager.resetForTests();
  });

  it('throws getInstance() before create()', () => {
    expect(() => SettingsManager.getInstance()).toThrow('SettingsManager not initialized');
    expect(SettingsManager.isInitialized()).toBe(false);
  });

  it('create() initializes and getInstance() returns same instance', () => {
    const storage = createStorage();
    const manager = SettingsManager.create({ schema: minimalSchema, storage });
    expect(SettingsManager.isInitialized()).toBe(true);
    expect(SettingsManager.getInstance()).toBe(manager);
  });

  it('second create() throws', () => {
    const storage = createStorage();
    SettingsManager.create({ schema: minimalSchema, storage });
    expect(() => SettingsManager.create({ schema: minimalSchema, storage })).toThrow('already initialized');
    SettingsManager.resetForTests();
  });

  it('get returns default when nothing stored', () => {
    const storage = createStorage();
    const manager = SettingsManager.create({ schema: minimalSchema, storage });
    expect(manager.get('muted')).toBe(false);
    expect(manager.getOrDefault('vol')).toBe(0.8);
    expect(manager.get('s1')).toBeUndefined();
  });

  it('set persists and get returns value', () => {
    const storage = createStorage();
    const manager = SettingsManager.create({ schema: minimalSchema, storage });
    manager.set('muted', true);
    expect(manager.get('muted')).toBe(true);
    expect(storage.data['muted']).toBe(true);
  });

  it('resetToDefaults clears to schema defaults and persists', () => {
    const storage = createStorage({ muted: true, vol: 0.5 });
    const manager = SettingsManager.create({ schema: minimalSchema, storage });
    manager.resetToDefaults();
    expect(manager.get('muted')).toBe(false);
    expect(manager.get('vol')).toBe(0.8);
    expect(storage.data['muted']).toBe(false);
    expect(storage.data['vol']).toBe(0.8);
  });

  it('invalid value coerces to default', () => {
    const storage = createStorage({ vol: 'invalid' });
    const manager = SettingsManager.create({ schema: minimalSchema, storage });
    expect(manager.get('vol')).toBe(0.8);
  });

  it('resetForTests allows create again', () => {
    const storage = createStorage();
    SettingsManager.create({ schema: minimalSchema, storage });
    SettingsManager.resetForTests();
    expect(SettingsManager.isInitialized()).toBe(false);
    const manager2 = SettingsManager.create({ schema: minimalSchema, storage });
    expect(manager2).toBeDefined();
  });
});
