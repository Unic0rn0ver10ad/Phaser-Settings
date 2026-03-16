/**
 * SettingsManager: loads, saves, validates, and exposes settings.
 * Initialized once with schema and storage adapter; singleton access via getInstance().
 */
import type { SettingValue, SettingDefinition, SettingCondition, SettingsSchema } from './types.js';
import type { SettingsStorageAdapter } from './storage.js';
import { getDefaultForDefinition, getOptionValues } from './validation.js';
import { validateSchema } from './validation.js';

export type SettingChangeCallback = (id: string, value: SettingValue) => void;
export type ApplyCallback = (id: string, value: SettingValue) => void;

const NOT_INITIALIZED = 'SettingsManager not initialized. Call SettingsManager.create() first.';
const ALREADY_INITIALIZED = 'SettingsManager already initialized. Do not call create() more than once.';

export interface SettingsManagerCreateOptions {
  schema: SettingsSchema;
  storage: SettingsStorageAdapter;
  /** Run in dev to throw on malformed schema. */
  validateSchemaInDev?: boolean;
  beforeSet?: (id: string, value: SettingValue) => SettingValue | void;
  afterSet?: (id: string, value: SettingValue) => void;
  onValidationError?: (id: string, raw: unknown, reason: string) => void;
  onPersistenceError?: (error: unknown) => void;
  /** Called after load when schema.version exists and stored version differs. */
  migrate?: (loaded: Record<string, unknown>, fromVersion: number, toVersion: number) => Record<string, unknown>;
}

function resolveCondition(
  cond: SettingCondition | undefined,
  getValue: (id: string) => SettingValue | undefined
): boolean {
  if (cond === undefined) return true;
  if (typeof cond === 'string') return Boolean(getValue(cond));
  return cond(getValue);
}

export class SettingsManager {
  private static instance: SettingsManager | null = null;

  private readonly schema: SettingsSchema;
  private readonly storage: SettingsStorageAdapter;
  private readonly opts: SettingsManagerCreateOptions;
  private cache: Record<string, unknown> | null = null;
  private changeListeners: Set<SettingChangeCallback> = new Set();
  private applyCallbacks: Map<string, ApplyCallback> = new Map();
  private globalApplyCallback: ((id: string, value: SettingValue) => void) | null = null;

  private constructor(schema: SettingsSchema, storage: SettingsStorageAdapter, opts: SettingsManagerCreateOptions) {
    this.schema = schema;
    this.storage = storage;
    this.opts = opts;
    this.loadFromStorage();
  }

  /** Call once at app bootstrap. Second call throws. */
  static create(options: SettingsManagerCreateOptions): SettingsManager {
    if (SettingsManager.instance !== null) {
      throw new Error(ALREADY_INITIALIZED);
    }
    if (options.validateSchemaInDev !== false) {
      validateSchema(options.schema);
    }
    SettingsManager.instance = new SettingsManager(options.schema, options.storage, options);
    return SettingsManager.instance;
  }

  /** Returns the singleton. Throws if create() has not been called. */
  static getInstance(): SettingsManager {
    if (SettingsManager.instance === null) {
      throw new Error(NOT_INITIALIZED);
    }
    return SettingsManager.instance;
  }

  /** Clear singleton for tests. Do not use in production. */
  static resetForTests(): void {
    SettingsManager.instance = null;
  }

  static isInitialized(): boolean {
    return SettingsManager.instance !== null;
  }

  getSchema(): SettingsSchema {
    return this.schema;
  }

  private loadFromStorage(): void {
    let raw: Record<string, unknown>;
    try {
      raw = this.storage.load();
    } catch (e) {
      this.opts.onPersistenceError?.(e);
      raw = {};
    }
    if (!raw || typeof raw !== 'object') raw = {};

    const fromVersion = typeof raw.__version === 'number' ? raw.__version : 0;
    const toVersion = this.schema.version ?? 0;
    if (this.opts.migrate && toVersion > 0 && fromVersion !== toVersion) {
      raw = this.opts.migrate({ ...raw }, fromVersion, toVersion);
    }

    this.cache = {};
    for (const def of this.schema.definitions) {
      if (def.type === 'section' || def.type === 'action') continue;
      const key = def.id;
      const value = key in raw ? this.validateAndCoerce(def, raw[key]) : getDefaultForDefinition(def);
      this.cache[key] = value;
    }
  }

  private validateAndCoerce(def: SettingDefinition, raw: unknown): SettingValue {
    if (def.type === 'section' || def.type === 'action') return getDefaultForDefinition(def) as SettingValue;

    if (def.type === 'toggle') {
      if (typeof raw === 'boolean') return raw;
      if (raw === 'true' || raw === 1) return true;
      if (raw === 'false' || raw === 0 || raw === '') return false;
      this.opts.onValidationError?.(def.id, raw, 'toggle: expected boolean');
      return def.default as boolean;
    }

    if (def.type === 'slider') {
      const n = Number(raw);
      if (Number.isNaN(n)) {
        this.opts.onValidationError?.(def.id, raw, 'slider: not a number');
        return def.default as number;
      }
      const { min, max, step } = def.slider;
      const stepped = min + Math.round((n - min) / step) * step;
      return Math.max(min, Math.min(max, stepped)) as SettingValue;
    }

    if (def.type === 'select' || def.type === 'segmented') {
      const allowed = getOptionValues(def);
      if (allowed.includes(raw as SettingValue)) return raw as SettingValue;
      this.opts.onValidationError?.(def.id, raw, 'select/segmented: invalid option');
      return def.default;
    }

    return (def as SettingDefinition).default as SettingValue;
  }

  private persist(): void {
    const data: Record<string, unknown> = {};
    if (this.schema.version !== undefined) {
      data.__version = this.schema.version;
    }
    for (const def of this.schema.definitions) {
      if (def.type === 'section' || def.type === 'action') continue;
      const key = def.id;
      if (this.cache && key in this.cache) {
        data[key] = this.cache[key];
      }
    }
    try {
      this.storage.save(data);
    } catch (e) {
      this.opts.onPersistenceError?.(e);
    }
  }

  get(id: string): SettingValue | undefined {
    const def = this.schema.definitions.find((d) => d.id === id);
    if (!def || def.type === 'section') return undefined;
    if (this.cache && id in this.cache) return this.cache[id] as SettingValue;
    return getDefaultForDefinition(def) as SettingValue;
  }

  getOrDefault(id: string): SettingValue {
    const def = this.schema.definitions.find((d) => d.id === id);
    if (!def) return false;
    const v = this.get(id);
    if (v !== undefined) return v;
    return getDefaultForDefinition(def) as SettingValue;
  }

  set(id: string, value: SettingValue): void {
    const def = this.schema.definitions.find((d) => d.id === id);
    if (!def || def.type === 'section' || def.type === 'action') return;

    let validated = this.validateAndCoerce(def, value);
    if (this.opts.beforeSet) {
      const out = this.opts.beforeSet(id, validated);
      if (out !== undefined) validated = out;
    }

    if (!this.cache) this.cache = {};
    this.cache[id] = validated;
    this.persist();
    this.notifyChange(id, validated);
    this.opts.afterSet?.(id, validated);
    if (def.applyImmediately) {
      this.globalApplyCallback?.(id, validated);
      this.applyCallbacks.get(id)?.(id, validated);
    }
  }

  resetToDefaults(): void {
    this.cache = {};
    for (const def of this.schema.definitions) {
      if (def.type !== 'section' && def.type !== 'action') {
        (this.cache as Record<string, unknown>)[def.id] = getDefaultForDefinition(def);
      }
    }
    this.persist();
    for (const [id, value] of Object.entries(this.cache)) {
      this.notifyChange(id, value as SettingValue);
    }
  }

  isVisible(def: SettingDefinition): boolean {
    const getVal = (sid: string) => this.get(sid);
    return resolveCondition(def.visibleWhen, getVal);
  }

  isEnabled(def: SettingDefinition): boolean {
    const getVal = (sid: string) => this.get(sid);
    return resolveCondition(def.enabledWhen, getVal);
  }

  subscribe(cb: SettingChangeCallback): () => void {
    this.changeListeners.add(cb);
    return () => this.changeListeners.delete(cb);
  }

  onApply(cb: (id: string, value: SettingValue) => void): void {
    this.globalApplyCallback = cb;
  }

  onApplySetting(id: string, cb: ApplyCallback): void {
    this.applyCallbacks.set(id, cb);
  }

  private notifyChange(id: string, value: SettingValue): void {
    this.changeListeners.forEach((cb) => cb(id, value));
  }
}
