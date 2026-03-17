import { describe, it, expect, beforeEach, vi } from 'vitest';
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

const schemaWithSelectSegmented: SettingsSchema = {
  categories: [{ id: 'g', label: 'General', order: 0 }],
  definitions: [
    { type: 'section', id: 's1', label: 'General', category: 'g', default: false },
    { type: 'toggle', id: 'flag', label: 'Flag', category: 'g', default: false },
    { type: 'select', id: 'sel', label: 'Sel', category: 'g', default: 'a', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
    { type: 'segmented', id: 'seg', label: 'Seg', category: 'g', default: 1, options: [{ value: 1, label: 'One' }, { value: 2, label: 'Two' }] },
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

  it('slider value is stepped relative to min (min=5, step=2)', () => {
    const schemaWithMin: SettingsSchema = {
      categories: [{ id: 'g', label: 'General', order: 0 }],
      definitions: [
        { type: 'slider', id: 'x', label: 'X', category: 'g', default: 5, slider: { min: 5, max: 15, step: 2 } },
      ],
    };
    const storage = createStorage({ x: 6.4 });
    const manager = SettingsManager.create({ schema: schemaWithMin, storage });
    expect(manager.get('x')).toBe(7);
    manager.set('x', 8.9);
    expect(manager.get('x')).toBe(9);
  });

  it('resetForTests allows create again', () => {
    const storage = createStorage();
    SettingsManager.create({ schema: minimalSchema, storage });
    SettingsManager.resetForTests();
    expect(SettingsManager.isInitialized()).toBe(false);
    const manager2 = SettingsManager.create({ schema: minimalSchema, storage });
    expect(manager2).toBeDefined();
  });

  // --- P0: Extension-point behavior ---

  describe('beforeSet', () => {
    it('persists transformed value when beforeSet returns a value', () => {
      const storage = createStorage();
      const manager = SettingsManager.create({
        schema: minimalSchema,
        storage,
        beforeSet: (id, value) => (id === 'vol' && typeof value === 'number' ? value * 2 : value),
      });
      manager.set('vol', 0.5);
      expect(manager.get('vol')).toBe(1);
      expect(storage.data['vol']).toBe(1);
    });

    it('uses validated value when beforeSet returns undefined', () => {
      const storage = createStorage();
      const manager = SettingsManager.create({
        schema: minimalSchema,
        storage,
        beforeSet: () => undefined,
      });
      manager.set('muted', true);
      expect(manager.get('muted')).toBe(true);
      expect(storage.data['muted']).toBe(true);
    });
  });

  describe('afterSet', () => {
    it('runs after persist and subscribe callback', () => {
      const storage = createStorage();
      const order: string[] = [];
      const saveSpy = vi.fn(() => { order.push('save'); });
      const capturingStorage: SettingsStorageAdapter = {
        load: () => ({}),
        save: saveSpy,
      };
      const manager = SettingsManager.create({
        schema: minimalSchema,
        storage: capturingStorage,
        afterSet: () => order.push('afterSet'),
      });
      manager.subscribe(() => order.push('subscribe'));
      manager.set('muted', true);
      expect(order).toEqual(['save', 'subscribe', 'afterSet']);
    });
  });

  describe('onValidationError', () => {
    it('called for invalid toggle load and coerces to default', () => {
      const storage = createStorage({ flag: 'notabool' });
      const errors: Array<[string, unknown, string]> = [];
      const manager = SettingsManager.create({
        schema: schemaWithSelectSegmented,
        storage,
        onValidationError: (id, raw, reason) => errors.push([id, raw, reason]),
      });
      expect(manager.get('flag')).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0][0]).toBe('flag');
      expect(errors[0][1]).toBe('notabool');
      expect(errors[0][2]).toBe('toggle: expected boolean');
    });

    it('called for invalid slider load and coerces to default', () => {
      const schemaWithSlider: SettingsSchema = {
        categories: [{ id: 'g', label: 'G', order: 0 }],
        definitions: [
          { type: 'section', id: 's', label: 'S', category: 'g', default: false },
          { type: 'slider', id: 'x', label: 'X', category: 'g', default: 10, slider: { min: 0, max: 20, step: 1 } },
        ],
      };
      const storage = createStorage({ x: 'nan' });
      const errors: Array<[string, unknown, string]> = [];
      const manager = SettingsManager.create({
        schema: schemaWithSlider,
        storage,
        onValidationError: (id, raw, reason) => errors.push([id, raw, reason]),
      });
      expect(manager.get('x')).toBe(10);
      expect(errors).toHaveLength(1);
      expect(errors[0][0]).toBe('x');
      expect(errors[0][2]).toBe('slider: not a number');
    });

    it('called for invalid select/segmented load and coerces to default', () => {
      const storage = createStorage({ sel: 'invalid', seg: 99 });
      const errors: Array<[string, unknown, string]> = [];
      const manager = SettingsManager.create({
        schema: schemaWithSelectSegmented,
        storage,
        onValidationError: (id, raw, reason) => errors.push([id, raw, reason]),
      });
      expect(manager.get('sel')).toBe('a');
      expect(manager.get('seg')).toBe(1);
      expect(errors).toHaveLength(2);
      expect(errors.some((e) => e[0] === 'sel' && e[2] === 'select/segmented: invalid option')).toBe(true);
      expect(errors.some((e) => e[0] === 'seg' && e[2] === 'select/segmented: invalid option')).toBe(true);
    });
  });

  describe('onPersistenceError', () => {
    it('called when save() throws and manager does not throw', () => {
      const storage = createStorage();
      const onPersistenceError = vi.fn();
      const manager = SettingsManager.create({
        schema: minimalSchema,
        storage: { load: () => ({}), save: () => { throw new Error('save failed'); } },
        onPersistenceError,
      });
      manager.set('muted', true);
      expect(onPersistenceError).toHaveBeenCalledTimes(1);
      expect(onPersistenceError.mock.calls[0][0]).toBeInstanceOf(Error);
      expect((onPersistenceError.mock.calls[0][0] as Error).message).toBe('save failed');
    });

    it('called when load() throws and manager initializes with defaults', () => {
      const onPersistenceError = vi.fn();
      const manager = SettingsManager.create({
        schema: minimalSchema,
        storage: { load: () => { throw new Error('load failed'); }, save: () => {} },
        onPersistenceError,
      });
      expect(onPersistenceError).toHaveBeenCalledTimes(1);
      expect(manager.get('muted')).toBe(false);
      expect(manager.get('vol')).toBe(0.8);
    });
  });

  describe('migrate', () => {
    it('called when schema.version set and stored __version differs; returned data used', () => {
      const schemaWithVersion: SettingsSchema = {
        version: 2,
        categories: [{ id: 'g', label: 'G', order: 0 }],
        definitions: [
          { type: 'section', id: 's', label: 'S', category: 'g', default: false },
          { type: 'toggle', id: 'x', label: 'X', category: 'g', default: false },
        ],
      };
      const storage = createStorage({ __version: 1, x: false });
      const migrate = vi.fn((loaded: Record<string, unknown>) => ({ ...loaded, __version: 2, x: true }));
      const manager = SettingsManager.create({
        schema: schemaWithVersion,
        storage,
        migrate,
      });
      expect(migrate).toHaveBeenCalledTimes(1);
      expect(migrate).toHaveBeenCalledWith(expect.objectContaining({ __version: 1, x: false }), 1, 2);
      expect(manager.get('x')).toBe(true);
    });

    it('not called when version equal', () => {
      const schemaWithVersion: SettingsSchema = {
        version: 1,
        categories: [{ id: 'g', label: 'G', order: 0 }],
        definitions: [
          { type: 'section', id: 's', label: 'S', category: 'g', default: false },
          { type: 'toggle', id: 'x', label: 'X', category: 'g', default: false },
        ],
      };
      const storage = createStorage({ __version: 1, x: true });
      const migrate = vi.fn((l: Record<string, unknown>) => l);
      SettingsManager.create({ schema: schemaWithVersion, storage, migrate });
      expect(migrate).not.toHaveBeenCalled();
    });

    it('migrated data is validated; invalid value coerced and onValidationError optional', () => {
      const schemaWithVersion: SettingsSchema = {
        version: 2,
        categories: [{ id: 'g', label: 'G', order: 0 }],
        definitions: [
          { type: 'section', id: 's', label: 'S', category: 'g', default: false },
          { type: 'toggle', id: 'x', label: 'X', category: 'g', default: false },
        ],
      };
      const storage = createStorage({ __version: 1 });
      const migrate = vi.fn((loaded: Record<string, unknown>) => {
        loaded.__version = 2;
        loaded.x = 'invalid';
        return loaded;
      });
      const errors: Array<[string, unknown, string]> = [];
      const manager = SettingsManager.create({
        schema: schemaWithVersion,
        storage,
        migrate,
        onValidationError: (id, raw, reason) => errors.push([id, raw, reason]),
      });
      expect(manager.get('x')).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0][0]).toBe('x');
      expect(errors[0][2]).toBe('toggle: expected boolean');
    });
  });

  // --- P0: applyImmediately contract ---

  describe('applyImmediately', () => {
    const schemaWithApply: SettingsSchema = {
      categories: [{ id: 'g', label: 'G', order: 0 }],
      definitions: [
        { type: 'section', id: 's', label: 'S', category: 'g', default: false },
        { type: 'toggle', id: 'immediate', label: 'Immediate', category: 'g', default: false, applyImmediately: true },
        { type: 'toggle', id: 'deferred', label: 'Deferred', category: 'g', default: false },
      ],
    };

    it('onApply global callback invoked only for applyImmediately: true', () => {
      const storage = createStorage();
      const manager = SettingsManager.create({ schema: schemaWithApply, storage });
      const globalApply = vi.fn();
      manager.onApply(globalApply);
      manager.set('immediate', true);
      expect(globalApply).toHaveBeenCalledTimes(1);
      expect(globalApply).toHaveBeenCalledWith('immediate', true);
      globalApply.mockClear();
      manager.set('deferred', true);
      expect(globalApply).not.toHaveBeenCalled();
    });

    it('onApplySetting per-setting callback invoked only for applyImmediately: true', () => {
      const storage = createStorage();
      const manager = SettingsManager.create({ schema: schemaWithApply, storage });
      const immediateCb = vi.fn();
      const deferredCb = vi.fn();
      manager.onApplySetting('immediate', immediateCb);
      manager.onApplySetting('deferred', deferredCb);
      manager.set('immediate', true);
      expect(immediateCb).toHaveBeenCalledWith('immediate', true);
      expect(deferredCb).not.toHaveBeenCalled();
      immediateCb.mockClear();
      deferredCb.mockClear();
      manager.set('deferred', true);
      expect(immediateCb).not.toHaveBeenCalled();
      expect(deferredCb).not.toHaveBeenCalled();
    });

    it('callback order: subscribe then afterSet then onApply/onApplySetting', () => {
      const storage = createStorage();
      const order: string[] = [];
      const manager = SettingsManager.create({
        schema: schemaWithApply,
        storage,
        afterSet: () => order.push('afterSet'),
      });
      manager.subscribe(() => order.push('subscribe'));
      const globalApply = vi.fn(() => order.push('onApply'));
      const perSetting = vi.fn(() => order.push('onApplySetting'));
      manager.onApply(globalApply);
      manager.onApplySetting('immediate', perSetting);
      manager.set('immediate', true);
      expect(order).toEqual(['subscribe', 'afterSet', 'onApply', 'onApplySetting']);
    });
  });

  // --- P0: Subscribe / unsubscribe contract ---

  describe('subscribe / unsubscribe', () => {
    it('subscribe callback fires on set and resetToDefaults', () => {
      const storage = createStorage();
      const manager = SettingsManager.create({ schema: minimalSchema, storage });
      const changes: Array<[string, unknown]> = [];
      manager.subscribe((id, value) => changes.push([id, value]));
      manager.set('muted', true);
      expect(changes).toContainEqual(['muted', true]);
      changes.length = 0;
      manager.resetToDefaults();
      expect(changes.length).toBeGreaterThan(0);
      const ids = changes.map((c) => c[0]);
      expect(ids).toContain('muted');
      expect(ids).toContain('vol');
    });

    it('unsubscribe stops further events', () => {
      const storage = createStorage();
      const manager = SettingsManager.create({ schema: minimalSchema, storage });
      const changes: Array<[string, unknown]> = [];
      const unsub = manager.subscribe((id, value) => changes.push([id, value]));
      manager.set('muted', true);
      expect(changes).toHaveLength(1);
      unsub();
      manager.set('muted', false);
      manager.resetToDefaults();
      expect(changes).toHaveLength(1);
    });
  });

  // --- P1: Visibility / enabled condition resolution ---

  describe('visibleWhen / enabledWhen', () => {
    const schemaWithConditions: SettingsSchema = {
      categories: [{ id: 'g', label: 'G', order: 0 }],
      definitions: [
        { type: 'section', id: 's', label: 'S', category: 'g', default: false },
        { type: 'toggle', id: 'gate', label: 'Gate', category: 'g', default: false },
        { type: 'toggle', id: 'depString', label: 'Dep (string)', category: 'g', default: false, visibleWhen: 'gate' },
        { type: 'slider', id: 'x', label: 'X', category: 'g', default: 0, slider: { min: 0, max: 10, step: 1 }, enabledWhen: 'gate' },
        {
          type: 'toggle',
          id: 'depFn',
          label: 'Dep (fn)',
          category: 'g',
          default: false,
          visibleWhen: (getValue) => getValue('x') === 1,
        },
        {
          type: 'toggle',
          id: 'depFnEnabled',
          label: 'Dep enabled (fn)',
          category: 'g',
          default: false,
          enabledWhen: (getValue) => (getValue('x') as number) === 2,
        },
      ],
    };

    it('visibleWhen string: hidden when dependency falsy, visible when truthy', () => {
      const storage = createStorage();
      const manager = SettingsManager.create({ schema: schemaWithConditions, storage });
      const defString = schemaWithConditions.definitions.find((d) => d.id === 'depString')!;
      expect(manager.isVisible(defString)).toBe(false);
      manager.set('gate', true);
      expect(manager.isVisible(defString)).toBe(true);
    });

    it('visibleWhen function: isVisible follows getValue(x) === 1', () => {
      const storage = createStorage();
      const manager = SettingsManager.create({ schema: schemaWithConditions, storage });
      const defFn = schemaWithConditions.definitions.find((d) => d.id === 'depFn')!;
      expect(manager.isVisible(defFn)).toBe(false);
      manager.set('x', 1);
      expect(manager.isVisible(defFn)).toBe(true);
      manager.set('x', 2);
      expect(manager.isVisible(defFn)).toBe(false);
    });

    it('enabledWhen string: disabled when dependency falsy, enabled when truthy', () => {
      const storage = createStorage();
      const manager = SettingsManager.create({ schema: schemaWithConditions, storage });
      const defX = schemaWithConditions.definitions.find((d) => d.id === 'x')!;
      expect(manager.isEnabled(defX)).toBe(false);
      manager.set('gate', true);
      expect(manager.isEnabled(defX)).toBe(true);
    });

    it('enabledWhen function: isEnabled follows getValue(x) === 2', () => {
      const storage = createStorage();
      const manager = SettingsManager.create({ schema: schemaWithConditions, storage });
      const defFnEnabled = schemaWithConditions.definitions.find((d) => d.id === 'depFnEnabled')!;
      expect(manager.isEnabled(defFnEnabled)).toBe(false);
      manager.set('x', 2);
      expect(manager.isEnabled(defFnEnabled)).toBe(true);
      manager.set('x', 1);
      expect(manager.isEnabled(defFnEnabled)).toBe(false);
    });
  });

  // --- P1: Persistence payload contract ---

  describe('persistence payload', () => {
    it('includes __version when schema.version is set', () => {
      const schemaWithVersion: SettingsSchema = {
        version: 1,
        categories: [{ id: 'g', label: 'G', order: 0 }],
        definitions: [
          { type: 'section', id: 's', label: 'S', category: 'g', default: false },
          { type: 'toggle', id: 'x', label: 'X', category: 'g', default: false },
        ],
      };
      let saved: Record<string, unknown> = {};
      const storage = createStorage();
      const capturingStorage: SettingsStorageAdapter = {
        load: () => ({ ...storage.data }),
        save: (d) => { saved = { ...d }; Object.assign(storage.data, d); },
      };
      const manager = SettingsManager.create({ schema: schemaWithVersion, storage: capturingStorage });
      manager.set('x', true);
      expect(saved).toHaveProperty('__version', 1);
      expect(saved).toHaveProperty('x', true);
    });

    it('omits __version when schema.version is undefined', () => {
      let saved: Record<string, unknown> = {};
      const baseStorage = createStorage();
      const capturingStorage: SettingsStorageAdapter = {
        load: () => ({ ...baseStorage.data }),
        save: (d) => { saved = { ...d }; },
      };
      const manager = SettingsManager.create({ schema: minimalSchema, storage: capturingStorage });
      manager.set('muted', true);
      expect(saved).not.toHaveProperty('__version');
      expect(saved).toHaveProperty('muted', true);
    });

    it('section and action keys never in save payload', () => {
      const schemaWithSectionAction: SettingsSchema = {
        categories: [{ id: 'g', label: 'G', order: 0 }],
        definitions: [
          { type: 'section', id: 's1', label: 'Section', category: 'g', default: false },
          { type: 'action', id: 'act1', label: 'Action', category: 'g', default: false, actionLabel: 'Do it' },
          { type: 'toggle', id: 't', label: 'T', category: 'g', default: false },
        ],
      };
      let saved: Record<string, unknown> = {};
      const capturingStorage: SettingsStorageAdapter = {
        load: () => ({}),
        save: (d) => { saved = { ...d }; },
      };
      const manager = SettingsManager.create({ schema: schemaWithSectionAction, storage: capturingStorage });
      manager.set('t', true);
      expect(saved).not.toHaveProperty('s1');
      expect(saved).not.toHaveProperty('act1');
      expect(saved).toHaveProperty('t', true);
    });

    it('unknown loaded keys not re-persisted on write', () => {
      let saved: Record<string, unknown> = {};
      const capturingStorage: SettingsStorageAdapter = {
        load: () => ({ muted: false, unknownKey: 123 }),
        save: (d) => { saved = { ...d }; },
      };
      const manager = SettingsManager.create({ schema: minimalSchema, storage: capturingStorage });
      manager.set('muted', true);
      expect(saved).not.toHaveProperty('unknownKey');
      expect(saved).toHaveProperty('muted', true);
    });
  });
});
